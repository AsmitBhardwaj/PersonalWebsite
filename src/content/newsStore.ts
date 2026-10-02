import { buildPosts } from './news';

const files = import.meta.glob<string>('../../content/news/*.md', { query: '?raw', import: 'default', eager: true });

/** Published posts for the News app, newest first. Same parser as the static pages and feeds (see vite.config.ts). */
export const posts = buildPosts(files);
