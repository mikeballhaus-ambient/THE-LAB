import crypto from 'node:crypto';
import type { ChatPersona } from '@/shared/types';
import type { activatePersonaSchemaFields, responsePersonaSchemaFields } from '@/shared/types';
import type { z } from 'zod';
import { PersonaManagerUtils } from './persona-manager-utils';

type ActivateParams = z.infer<typeof activatePersonaSchemaFields>;
type ResponseParams = z.infer<typeof responsePersonaSchemaFields>;

export async function runActivatePersonaDirect(params: ActivateParams): Promise<{ success: boolean; text: string }> {
  const todos = params.todos?.map((t) => ({
    todoItemId: crypto.randomUUID(),
    todoItem: t.todoItem,
    todoItemData: t.todoItemData ?? t.todoItem,
    todoItemTask: t.todoItemTask ?? undefined,
  }));

  const first = todos?.[0];
  const result = await PersonaManagerUtils.activatePersonaHandler(
    params.userId,
    params.sessionId,
    params.targetPersona as ChatPersona,
    params.message,
    params.message,
    params.todoListId,
    params.todoListName,
    first?.todoItemId,
    first?.todoItem,
    first?.todoItemData,
    first?.todoItemTask ?? null,
    todos?.slice(1),
  );

  return { success: Boolean(result.success), text: result.content ?? JSON.stringify(result) };
}

export async function runResponsePersonaDirect(params: ResponseParams): Promise<{ success: boolean; text: string }> {
  const result = await PersonaManagerUtils.responsePersonaHandler(
    params.userId,
    params.sessionId,
    params.message,
    params.success,
    params.parentSessionId,
    params.parentPersona as ChatPersona,
    params.chatId,
  );
  return { success: Boolean(result.success), text: result.content ?? JSON.stringify(result) };
}
