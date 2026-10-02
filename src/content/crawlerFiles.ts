import type { PortfolioContent } from './portfolio';
import type { NewsPost } from './news';
import { formatPostDate } from './news';
import { HOME_URL, PLAIN_URL, postUrl, RSS_URL, SITE_URL } from './seo';

export interface SitemapPhoto { src: string; caption?: string }

const xml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'];

export function renderRobots(): string {
  const blocks = ['*', ...AI_CRAWLERS].map((agent) => `User-agent: ${agent}\nAllow: /`);
  return `${blocks.join('\n\n')}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

/** Home, /plain, every post (with lastmod), and the photos as image entries on the home page that shows them. */
export function renderSitemap(posts: NewsPost[], photos: SitemapPhoto[] = []): string {
  const images = photos.map((p) => `    <image:image><image:loc>${xml(`${SITE_URL}${p.src}`)}</image:loc>${p.caption ? `<image:caption>${xml(p.caption)}</image:caption>` : ''}</image:image>`).join('\n');
  const entries = [
    `  <url>\n    <loc>${HOME_URL}</loc>${images ? `\n${images}` : ''}\n  </url>`,
    `  <url><loc>${PLAIN_URL}</loc></url>`,
    ...posts.map((p) => `  <url><loc>${postUrl(p.slug)}</loc><lastmod>${p.date}</lastmod></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>\n`;
}

const rfc822 = (date: string) => new Date(`${date}T00:00:00Z`).toUTCString();

export function renderRss(posts: NewsPost[], c: PortfolioContent): string {
  const items = posts.map((p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${postUrl(p.slug)}</link>
      <guid isPermaLink="true">${postUrl(p.slug)}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${xml(p.summary)}</description>
    </item>`).join('\n');
  const built = posts[0] ? `\n    <lastBuildDate>${rfc822(posts[0].date)}</lastBuildDate>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(c.name)}: News</title>
    <link>${HOME_URL}</link>
    <description>Writing from ${xml(c.name)} about building products and this portfolio.</description>
    <language>en</language>${built}
    <atom:link href="${RSS_URL}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

/** llms.txt: a plain-markdown summary for language models. */
export function renderLlmsTxt(c: PortfolioContent, posts: NewsPost[]): string {
  const lines: string[] = [`# ${c.name}`, '', `> ${c.tagline} · ${c.location}. Interactive portfolio at ${HOME_URL}; plain HTML version at ${PLAIN_URL}.`, ''];
  lines.push('## About', '', ...c.biography.flatMap((p) => [p, '']));
  lines.push('## Experience', '');
  for (const x of c.experience) lines.push(`### ${x.role}, ${x.company} (${x.period}${x.location ? `, ${x.location}` : ''})`, '', ...x.highlights.map((h) => `- ${h}`), ...(x.technologies.length ? ['', `Technologies: ${x.technologies.join(', ')}`] : []), '');
  lines.push('## Projects', '');
  for (const p of c.projects) {
    lines.push(`### ${p.title}`, '', p.description ?? p.summary, '');
    if (p.highlights?.length) lines.push(...p.highlights.map((h) => `- ${h}`), '');
    lines.push(`Technologies: ${p.technologies.join(', ')}`);
    const links = [p.demoUrl && `Website: ${p.demoUrl}`, p.sourceUrl && `Source: ${p.sourceUrl}`].filter(Boolean);
    lines.push(...links as string[], '');
  }
  lines.push('## Now', '', ...(c.notesIntro ? [c.notesIntro, ''] : []), ...c.notes.map((n) => `- ${n.title}: ${n.excerpt}`), '');
  lines.push('## Contact', '', `- Email: ${c.email}`, `- LinkedIn: ${c.social.linkedin}`, `- GitHub: ${c.social.github}`, '');
  if (posts.length) {
    lines.push('## News', '', `Feed: ${RSS_URL}`, '');
    for (const p of posts) lines.push(`### [${p.title}](${postUrl(p.slug)})`, '', `${formatPostDate(p.date)}. ${p.summary}`, '');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
