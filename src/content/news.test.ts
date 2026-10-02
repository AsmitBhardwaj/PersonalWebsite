import { describe, expect, it } from 'vitest';
import { buildPosts, formatPostDate, parseFrontMatter, parsePost, readingMinutes, slugFromPath } from './news';

const md = (title: string, date: string, extra = '') => `---\ntitle: ${title}\ndate: ${date}\nsummary: About ${title}.\n${extra}---\n\nBody of ${title}.\n`;

describe('news posts', () => {
  it('derives slugs from filenames', () => {
    expect(slugFromPath('content/news/building-asmitbhardwaj-dev.md')).toBe('building-asmitbhardwaj-dev');
    expect(slugFromPath('content/news/My First Post!.md')).toBe('my-first-post');
  });

  it('reads front matter, trimming quotes, and leaves files without it alone', () => {
    expect(parseFrontMatter('---\ntitle: "Hi: there"\ndate: 2026-01-02\n---\nBody')).toEqual({ data: { title: 'Hi: there', date: '2026-01-02' }, body: 'Body' });
    expect(parseFrontMatter('No front matter')).toEqual({ data: {}, body: 'No front matter' });
  });

  it('parses a post with html, reading time and the date kept as written', () => {
    const post = parsePost('content/news/a.md', md('A', '2026-10-02'))!;
    expect(post).toMatchObject({ slug: 'a', title: 'A', date: '2026-10-02', summary: 'About A.', html: '<p>Body of A.</p>', readingMinutes: 1 });
    expect(readingMinutes('word '.repeat(450))).toBe(3);
    expect(formatPostDate('2026-10-02')).toBe('2 Oct 2026');
  });

  it('excludes drafts', () => {
    expect(parsePost('content/news/d.md', md('D', '2026-10-02', 'draft: true\n'))).toBeNull();
    expect(buildPosts({ 'content/news/d.md': md('D', '2026-10-02', 'draft: true\n'), 'content/news/k.md': md('K', '2026-10-03') }).map((p) => p.slug)).toEqual(['k']);
  });

  it('orders newest first, breaking date ties by slug', () => {
    const posts = buildPosts({ 'content/news/b.md': md('B', '2026-01-01'), 'content/news/a.md': md('A', '2026-01-01'), 'content/news/c.md': md('C', '2026-05-01') });
    expect(posts.map((p) => p.slug)).toEqual(['c', 'a', 'b']);
  });

  it('fails loudly, naming the file, on missing fields, bad dates and duplicate slugs', () => {
    expect(() => parsePost('content/news/x.md', '---\ndate: 2026-01-01\nsummary: s\n---\nb')).toThrow('content/news/x.md: front matter needs a title');
    expect(() => parsePost('content/news/x.md', '---\ntitle: t\ndate: 2026-01-01\n---\nb')).toThrow('summary');
    expect(() => parsePost('content/news/x.md', md('X', '2026-02-30'))).toThrow('YYYY-MM-DD');
    expect(() => buildPosts({ 'content/news/a.md': md('A', '2026-01-01'), 'content/news/A.md': md('A2', '2026-01-02') })).toThrow('already used');
  });
});
