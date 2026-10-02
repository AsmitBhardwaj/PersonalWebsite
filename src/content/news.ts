import { blocksHtml, blocksText, parseMarkdown } from './markdown';
import type { Block } from './markdown';

export interface NewsPost {
  slug: string;
  title: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  summary: string;
  body: string;
  blocks: Block[];
  html: string;
  readingMinutes: number;
}

const WORDS_PER_MINUTE = 200;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "content/news/My Post.md" -> "my-post". */
export function slugFromPath(path: string): string {
  const stem = (path.split('/').pop() ?? path).replace(/\.md$/i, '');
  return stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function readingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Splits `---` front matter (flat `key: value` lines) from the body. */
export function parseFrontMatter(source: string): { data: Record<string, string>; body: string } {
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { data: {}, body: text };
  const data: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const pair = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (pair) data[pair[1]] = pair[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  return { data, body: text.slice(match[0].length).trim() };
}

const validDate = (value: string) => ISO_DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

/** Parses one post. Returns null for a draft; throws a message naming the file for anything malformed. */
export function parsePost(path: string, source: string): NewsPost | null {
  const { data, body } = parseFrontMatter(source);
  if (/^(true|yes)$/i.test(data.draft ?? '')) return null;
  const slug = slugFromPath(path);
  const fail = (why: string) => { throw new Error(`${path}: ${why}`); };
  if (!slug) fail('cannot derive a slug from the filename');
  if (!data.title) fail('front matter needs a title');
  if (!data.summary) fail('front matter needs a summary');
  if (!validDate(data.date ?? '')) fail('front matter needs a date as YYYY-MM-DD');
  const blocks = parseMarkdown(body);
  return { slug, title: data.title, date: data.date, summary: data.summary, body, blocks, html: blocksHtml(blocks), readingMinutes: readingMinutes(blocksText(blocks)) };
}

/** Every published post from a { path: markdown } map, newest first (slug order breaks date ties). Drafts are dropped; duplicate slugs throw. */
export function buildPosts(files: Record<string, string>): NewsPost[] {
  const posts: NewsPost[] = [];
  const seen = new Map<string, string>();
  for (const path of Object.keys(files).sort()) {
    const post = parsePost(path, files[path]);
    if (!post) continue;
    const clash = seen.get(post.slug);
    if (clash) throw new Error(`${path}: slug "${post.slug}" is already used by ${clash}`);
    seen.set(post.slug, path);
    posts.push(post);
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-10-02" -> "2 Oct 2026". */
export const formatPostDate = (date: string) => { const [y, m, d] = date.split('-'); return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`; };
