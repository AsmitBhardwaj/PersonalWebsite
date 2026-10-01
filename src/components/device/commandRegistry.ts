import type { AppName } from '../apps/PhoneApps';

export type CommandDestination =
  | { type: 'app'; app: AppName }
  | { type: 'external'; destination: 'github' | 'linkedin' | 'email' }
  | { type: 'home' }
  | { type: 'help' }
  | { type: 'clear' };

const commands: Record<string, CommandDestination> = {
  projects: { type: 'app', app: 'projects' },
  experience: { type: 'app', app: 'experience' },
  about: { type: 'app', app: 'about' },
  notes: { type: 'app', app: 'notes' },
  contact: { type: 'app', app: 'contact' },
  github: { type: 'external', destination: 'github' },
  linkedin: { type: 'external', destination: 'linkedin' },
  email: { type: 'external', destination: 'email' },
  home: { type: 'home' },
  help: { type: 'help' },
  clear: { type: 'clear' },
};

const aliases: Record<string, string> = {
  proj: 'projects',
  exp: 'experience',
  bio: 'about',
  mail: 'email',
  gh: 'github',
  li: 'linkedin',
  ls: 'help',
};

export const availableCommands = Object.keys(commands);

export function resolveCommand(input: string): CommandDestination | null {
  const normalized = input.trim().toLowerCase();
  return commands[aliases[normalized] ?? normalized] ?? null;
}
