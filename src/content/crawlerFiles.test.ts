import { describe, expect, it } from 'vitest';
import { portfolio } from './portfolio';
import { buildPosts } from './news';
import { renderPostPage } from './newsPages';
import { renderPlainPage } from './plainPage';
import { AI_CRAWLERS, renderLlmsTxt, renderRobots, renderRss, renderSitemap } from './crawlerFiles';

const posts = buildPosts({
  'content/news/older.md': '---\ntitle: Older & wiser\ndate: 2026-03-01\nsummary: An <older> post.\n---\n\nHello **world**.\n\n## Part\n\nMore.',
  'content/news/newer.md': '---\ntitle: Newer\ndate: 2026-10-02\nsummary: The newest.\n---\n\nText.',
});

describe('crawler files', () => {
  it('robots.txt allows everyone and the AI crawlers by name, and points at the sitemap', () => {
    const robots = renderRobots();
    for (const agent of ['*', ...AI_CRAWLERS]) expect(robots).toContain(`User-agent: ${agent}\nAllow: /`);
    expect(AI_CRAWLERS).toEqual(['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']);
    expect(robots).toContain('Sitemap: https://asmitbhardwaj.dev/sitemap.xml');
  });

  it('sitemap lists every post with lastmod and the photos as captioned image entries', () => {
    const sitemap = renderSitemap(posts, [{ src: '/photos/a.webp', caption: 'Fresh & warm' }, { src: '/photos/b.webp' }]);
    expect(sitemap).toContain('<loc>https://asmitbhardwaj.dev/news/newer</loc><lastmod>2026-10-02</lastmod>');
    expect(sitemap).toContain('<loc>https://asmitbhardwaj.dev/news/older</loc><lastmod>2026-03-01</lastmod>');
    expect(sitemap).toContain('<image:loc>https://asmitbhardwaj.dev/photos/a.webp</image:loc><image:caption>Fresh &amp; warm</image:caption>');
    expect(sitemap).toContain('<image:loc>https://asmitbhardwaj.dev/photos/b.webp</image:loc></image:image>');
    expect(sitemap).toContain('<loc>https://asmitbhardwaj.dev/plain</loc>');
  });

  it('rss has one escaped item per post, newest first, with RFC 822 dates', () => {
    const rss = renderRss(posts, portfolio);
    expect(rss.match(/<item>/g)).toHaveLength(2);
    expect(rss.indexOf('Newer')).toBeLessThan(rss.indexOf('Older'));
    expect(rss).toContain('<title>Older &amp; wiser</title>');
    expect(rss).toContain('<description>An &lt;older&gt; post.</description>');
    expect(rss).toContain('<pubDate>Fri, 02 Oct 2026 00:00:00 GMT</pubDate>');
    expect(rss).toContain('<atom:link href="https://asmitbhardwaj.dev/rss.xml" rel="self"');
  });

  it('llms.txt covers the portfolio sections and a section per post', () => {
    const llms = renderLlmsTxt(portfolio, posts);
    for (const heading of ['# Asmit Bhardwaj', '## About', '## Experience', '## Projects', '## Now', '## Contact', '## News']) expect(llms).toContain(heading);
    expect(llms).toContain('### [Newer](https://asmitbhardwaj.dev/news/newer)');
    expect(llms).toContain('The newest.');
    expect(llms).toContain(portfolio.email);
    expect(renderLlmsTxt(portfolio, [])).not.toContain('## News');
  });

  it('post pages carry title, description, canonical, Open Graph, Article JSON-LD and the full article', () => {
    const html = renderPostPage(posts[1], portfolio);
    expect(html).toContain('<title>Older &amp; wiser — Asmit Bhardwaj</title>');
    expect(html).toContain('<link rel="canonical" href="https://asmitbhardwaj.dev/news/older">');
    expect(html).toContain('<meta property="og:title" content="Older &amp; wiser">');
    expect(html).toContain('<meta name="description" content="An &lt;older&gt; post.">');
    expect(html).toContain('<h2>Part</h2>');
    expect(html).toContain('href="/rss.xml"');
    const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)![1]);
    expect(ld).toMatchObject({ '@type': 'Article', headline: 'Older & wiser', datePublished: '2026-03-01', author: { name: 'Asmit Bhardwaj' } });
    expect(html).toContain('<a href="/">← Back to the interactive site</a>');
  });

  it('/plain lists the posts', () => {
    const html = renderPlainPage(portfolio, posts);
    expect(html).toContain('<h2 id="news">News</h2>');
    expect(html).toContain('<a href="/news/newer">Newer</a>');
    expect(renderPlainPage(portfolio)).not.toContain('id="news"');
  });
});
