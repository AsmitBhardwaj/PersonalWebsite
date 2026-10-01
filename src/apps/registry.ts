import { BriefcaseBusiness, CircleUserRound, Contact, Keyboard, Music, NotebookPen, StickyNote } from 'lucide-react';
import type { AppDefinition, AppId } from './types';
import { AboutApp } from './AboutApp';
import { ContactApp } from './ContactApp';
import { ExperienceApp } from './ExperienceApp';
import { MusicApp } from './MusicApp';
import { NotesApp } from './NotesApp';
import { ProjectsApp } from './ProjectsApp';
import { TypeApp } from './TypeApp';

/**
 * Every app lives here. To add one: create its component file and add an entry.
 * Order is the home screen order. The home grid, d-pad navigation and terminal commands all derive from this list.
 */
export const apps: AppDefinition[] = [
  { id: 'projects', label: 'Projects', icon: BriefcaseBusiness, tone: '#e96853', component: ProjectsApp, presentation: 'read', aliases: ['proj'] },
  { id: 'experience', label: 'Experience', icon: NotebookPen, tone: '#e0af45', component: ExperienceApp, presentation: 'read', aliases: ['exp'] },
  { id: 'about', label: 'About', icon: CircleUserRound, tone: '#6ba7c9', component: AboutApp, presentation: 'read', aliases: ['bio'] },
  { id: 'notes', label: 'Now', icon: StickyNote, tone: '#87a66e', component: NotesApp, presentation: 'read', aliases: ['now'] },
  { id: 'contact', label: 'Contact', icon: Contact, tone: '#ba7a9a', component: ContactApp, presentation: 'read' },
  { id: 'type', label: 'Type', icon: Keyboard, tone: '#8a7bc4', component: TypeApp, presentation: 'play', touchDpad: false, aliases: ['game'] },
  // Music is parked until the player ships: keep the app, hide it everywhere.
  { id: 'music', label: 'Music', icon: Music, tone: '#4d7986', component: MusicApp, presentation: 'read', hidden: true },
];

export const homeApps = apps.filter((app) => !app.hidden);

export const appById = new Map<AppId, AppDefinition>(apps.map((app) => [app.id, app]));
