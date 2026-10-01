import { apps } from '../../apps/registry';
import type { AppId } from '../../apps/types';

export type CommandDestination =
  | { type: 'app'; app: AppId }
  | { type: 'external'; destination: 'github' | 'linkedin' | 'email' }
  | { type: 'home' }
  | { type: 'help' }
  | { type: 'clear' };

const commands: Record<string, CommandDestination> = {
  ...Object.fromEntries(apps.filter((app) => !app.hidden).map((app) => [app.id, { type: 'app', app: app.id } as CommandDestination])),
  github: { type: 'external', destination: 'github' },
  linkedin: { type: 'external', destination: 'linkedin' },
  email: { type: 'external', destination: 'email' },
  home: { type: 'home' },
  help: { type: 'help' },
  clear: { type: 'clear' },
};

const aliases: Record<string, string> = {
  ...Object.fromEntries(apps.filter((app) => !app.hidden).flatMap((app) => (app.aliases ?? []).map((alias) => [alias, app.id]))),
  mail: 'email',
  gh: 'github',
  li: 'linkedin',
  ls: 'help',
};

/** Names shown by `help`: an app is listed by its label (so "now", not "notes"); its id still resolves. */
const appLabelById = new Map(apps.map((app) => [app.id, app.label.toLowerCase()]));
export const availableCommands = Object.keys(commands).map((name) => appLabelById.get(name) ?? name);

export function resolveCommand(input: string): CommandDestination | null {
  const normalized = input.trim().toLowerCase();
  return commands[aliases[normalized] ?? normalized] ?? null;
}
