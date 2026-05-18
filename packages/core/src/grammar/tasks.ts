import type { Vault } from './types.js';

export interface ParseTasksOptions {
  assignMissingIds?: boolean;
}

export function parseTasks(_input: string, _options: ParseTasksOptions = {}): Vault {
  throw new Error('parseTasks: not implemented');
}

export function toMarkdown(_vault: Vault): string {
  throw new Error('toMarkdown: not implemented');
}
