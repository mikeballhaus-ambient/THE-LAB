import { ChatPersona, ICommand } from "../../shared/types";
import { FileContext, SlashCommandContext } from "./agent-response-parser";
import { fileHelpers } from "./file-helpers";
import * as path from 'path';

export class Parser {

  public static async parseContextFiles(message: string): Promise<FileContext> {

    const mentionPattern = /\B@[^\s]+/g;

    const foundMentions = [...message.matchAll(mentionPattern)];

    if (foundMentions.length === 0) return { message };

    let enrichedMessage = message;

    for (const match of foundMentions) {
      const matchIndex = match.index!;
      const fileName = match[0].replace(/@/, '');

      const sanitizedPath = fileName.replace(/\\/g, '/');
      if (sanitizedPath.includes('\\..')) {
        continue;
      }

      const normalizedPath = sanitizedPath.replace(process.cwd() + '/', '');
      const forwardPath = fileHelpers.toForwardPath(normalizedPath);

      const absoluteForwardPath = path.resolve(process.cwd(), forwardPath);
      if (!this.isValidPathWithinRoot(absoluteForwardPath)) {
        continue;
      }

      let content = await fileHelpers.readFile(forwardPath);

      const lines = content.split('\n');
      if (lines.length > 5000) {
        content = content.split('\n').slice(0, 5000).join('\n') + '\n\n... (content truncated due to size)';
      }

      const contextBlock = `> @${forwardPath}\n\n${content}`;

      enrichedMessage = enrichedMessage.slice(0, matchIndex + 1) + '\n' + contextBlock + enrichedMessage.slice(matchIndex + 1);
    }

    return { message: enrichedMessage };
  }

  private static isValidPathWithinRoot(resolvedPath: string): boolean {
    try {
      const projectRoot = path.resolve(process.cwd());
      const normalizedPath = path.normalize(resolvedPath);
      const normalizedRoot = path.normalize(projectRoot);

      const resolvedRoot = normalizedRoot.endsWith(path.sep) ? normalizedRoot : normalizedRoot + path.sep;

      return normalizedPath === normalizedRoot || normalizedPath.startsWith(resolvedRoot);
    } catch {
      return false;
    }
  }

  public static async parseSlashCommands(message: string, commandsData: ICommand[]): Promise<SlashCommandContext> {
    const commandPattern = /\B\/([^\s]+)(?:\[[^\]]+\])?\b/g;

    const foundCommands = [...message.matchAll(commandPattern)];

    if (foundCommands.length === 0) return { message };

    let processedFirstCommand = false;
    let firstPersona = '';

    let matchingCommand: ICommand | undefined = undefined
    let enrichedMessage = message;

    for (const match of foundCommands) {

      if (processedFirstCommand) break;

      const matchIndex = match.index!;
      const commandName = match[1];
      const argsHint = match[2];

      matchingCommand = commandsData.find(cmd => cmd.key.toLowerCase() === commandName.toLowerCase());

      if (!matchingCommand) {
        continue;
      }

      const contextBlock = argsHint
        ? `> /${commandName}\n\n` + `${matchingCommand.description}\n` + `Args: ${argsHint}` + `\n\n${matchingCommand.text}\n\n`
        : `> /${commandName}\n\n` + `${matchingCommand.description}\n\n${matchingCommand.text}\n\n`;

      enrichedMessage = enrichedMessage.slice(0, matchIndex + 1) + '\n' + contextBlock + enrichedMessage.slice(matchIndex + 1);

      processedFirstCommand = true;
      firstPersona = matchingCommand.persona
    }

    return {
      message: enrichedMessage,
      persona: firstPersona as ChatPersona,
      command: matchingCommand
    };
  }
}
