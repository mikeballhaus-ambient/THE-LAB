import {
  ChatMessage,
  ChatMessageContent,
  ExtendedFileResolved,
  MCPToolInterface,
  MCPToolSchema
} from '../../../../shared/types';
import { z } from "zod";
import type { ChatCompletionMessageParam, ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';
import { ChatCompletionContentPart } from 'openai/resources/index.js';
import { zodToolParamsToJsonSchema } from '../../../../shared/utils/mcp-tool-json-schema';

export { flattenZodObject, convertZodType, zodToolParamsToJsonSchema } from '../../../../shared/utils/mcp-tool-json-schema';


export function toOpenAIToolDefinition<S extends z.ZodTypeAny>(
  tool: MCPToolInterface<S>
) : MCPToolSchema {
  const schema = tool.params ? zodToolParamsToJsonSchema(tool.params) : { type: 'object', properties: {}, required: [] };

  if (!tool?.description) {
    console.log(`No description: ${JSON.stringify(tool)}`)
  }
  return {
    type: "function",
    "function": {
      name: tool.id,
      description: tool.description ? tool.description.trim() : '',
      parameters: schema
    }
  };
}

export function resolveFiles(files: ExtendedFileResolved[] | undefined): ChatMessageContent[] {
  const userContent: ChatMessageContent[] = [];
  userContent.push({ type: 'input_text', text: 'Context images' });
  if (files) {
    files.forEach((item) => {
      if (item.base64) {
        userContent.push({
          type: 'input_image',
          image_url: item.base64
        });
      }
    });
  }
  return userContent;
}

export function toOpenAIMessage(msg: ChatMessage): ChatCompletionMessageParam {
  const resolvedToolCalls: ChatCompletionMessageToolCall[] = [];

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    msg.tool_calls.forEach(toolCall => resolvedToolCalls.push({
      id: toolCall.id,
      type: toolCall.type,
      function: {
        name: toolCall.function.name,
        arguments: toolCall.function.arguments ?? '',
      },
    }));
  }

  // TOOL MESSAGES
  if (msg.role === "tool") {
    return {
      role: "tool",
      tool_call_id: msg.tool_call_id!,
      content: typeof msg.content === "string" ? msg.content : ""
    };
  }

  // SYSTEM MESSAGES
  if (msg.role === "system") {
    return {
      role: "system",
      content: msg.content as string
    };
  }

  // USER MESSAGES
  if (msg.role == "user") {
    return {
      role: "user",
      content: userContent(msg.content)
    };
  }

  // ASSISTANT MESSAGES
  return {
    role: "assistant",
    content: msg.content as string,
    tool_calls: resolvedToolCalls
  };
}

export function userContent(content: string | ChatMessageContent[]): string | ChatCompletionContentPart[] {
  if (typeof content === "string") return [{ type: 'text', text: content }];

  return content.flatMap<ChatCompletionContentPart>(part => {
    if (part.type === "input_text") {
      return [{
        type: "text",
        text: part.text
      }];
    }

    if (part.type === "input_image") {
      return [{
        type: "image_url",
        image_url: { url: part.image_url }
      }];
    }

    return [];
  });
}

