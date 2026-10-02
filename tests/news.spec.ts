import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const SLUG = 'building-asmitbhardwaj-dev';
const TITLE = 'Building a portfolio inside a 2004 Sidekick';

async function openNews(page: Page) {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.count()) await skip.click();
  await expect(page.locator('.device-stage')).toHaveAttribute('data-phase', 'open');
  await page.getByRole('button', { name: 'Open News', exact: true }).first().click();
  await expect(page.locator('.news-list')).toBeVisible();
  await expect(page.locator('.device-stage')).not.toHaveAttribute('data-zoom', 'enter');
  await expect(page.locator('.device-stage')).not.toHaveAttribute('data-focus', 'enter');
}

test('News lists the post with date, summary and reading time; Enter opens it and Escape returns', async ({ page }) => {
  await openNews(page);
  const item = page.locator('.news-list [role=listitem]').first();
  await expect(item).toContainText(TITLE);
  await expect(item).toContainText('2 Oct 2026');
  await expect(item).toContainText('min read');
  await expect(item).toContainText('forgotten phone that invented the future');
  await page.keyboard.press('ArrowDown'); // first press highlights the first post
  await expect(item).toHaveClass(/is-highlighted/);
  await page.keyboard.press('Enter');
  const article = page.locator('.news-article');
  await expect(article.getByRole('heading', { level: 2, name: TITLE })).toBeVisible();
  await expect(article.getByRole('heading', { level: 3, name: 'The phone that saw the future first' })).toBeAttached();
  await expect(article.getByRole('link', { name: /Read on the web/ })).toHaveAttribute('href', `/news/${SLUG}`);
  await page.keyboard.press('Escape'); // article showing: back to the list, not out of the app
  await expect(page.locator('.news-list')).toBeVisible();
  await expect(item).toHaveClass(/is-highlighted/);
  await page.keyboard.press('Escape'); // list showing: leaves the app
  await expect(page.getByRole('button', { name: 'Open Contact', exact: true }).first()).toBeVisible();
});

test('clicking a post opens it and the in-article Back returns to the list', async ({ page }) => {
  await openNews(page);
  await page.locator('.news-list [role=listitem]').first().click();
  await expect(page.locator('.news-article')).toBeVisible();
  await page.locator('.news-article .inline-back').click();
  await expect(page.locator('.news-list')).toBeVisible();
});

test.describe('JavaScript off', () => {
  // No storageState: seeding localStorage needs a script, and Firefox hangs creating a JS-off context that has any.
  test.use({ javaScriptEnabled: false, storageState: { cookies: [], origins: [] } });

  test('/news/<slug> renders the full article as static HTML', async ({ page }) => {
    await page.goto(`/news/${SLUG}`);
    await expect(page).toHaveTitle(`${TITLE} — Asmit Bhardwaj`);
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
    for (const heading of ['The phone that saw the future first', 'And then, the world forgot', 'Built with']) await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
    await expect(page.getByText('Vite, React and TypeScript')).toBeVisible();
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://asmitbhardwaj.dev/news/${SLUG}`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', TITLE);
    await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /forgotten phone/);
    await expect(page.locator('link[rel=alternate][type="application/rss+xml"]')).toHaveAttribute('href', '/rss.xml');
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(ld).toMatchObject({ '@type': 'Article', headline: TITLE, datePublished: '2026-10-02', author: { name: 'Asmit Bhardwaj' } });
    await expect(page.getByRole('link', { name: /Back to the interactive site/ }).first()).toHaveAttribute('href', '/');
  });

  test('/plain and the noscript block on / list the post', async ({ page }) => {
    await page.goto('/plain');
    await expect(page.getByRole('heading', { level: 2, name: 'News' })).toBeVisible();
    await expect(page.getByRole('link', { name: TITLE })).toHaveAttribute('href', `/news/${SLUG}`);
    await page.goto('/');
    await expect(page.getByRole('link', { name: TITLE })).toHaveAttribute('href', `/news/${SLUG}`);
    await expect(page.locator('link[rel=alternate][type="application/rss+xml"]')).toHaveAttribute('href', '/rss.xml');
  });
});

test.describe('crawler files', () => {
  test('robots.txt allows everyone and the AI crawlers and names the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.headers()['content-type']).toContain('text/plain');
    const robots = await response.text();
    for (const agent of ['*', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) expect(robots).toContain(`User-agent: ${agent}\nAllow: /`);
    expect(robots).toContain('Sitemap: https://asmitbhardwaj.dev/sitemap.xml');
  });

  test('sitemap.xml lists the post with lastmod and the photos with captions', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.headers()['content-type']).toContain('xml');
    const sitemap = await response.text();
    expect(sitemap).toContain(`<loc>https://asmitbhardwaj.dev/news/${SLUG}</loc><lastmod>2026-10-02</lastmod>`);
    expect(sitemap).toMatch(/<image:loc>https:\/\/asmitbhardwaj\.dev\/photos\/[^<]+\.webp<\/image:loc><image:caption>[^<]+<\/image:caption>/);
  });

  test('llms.txt summarises the portfolio and the post in markdown', async ({ request }) => {
    const response = await request.get('/llms.txt');
    expect(response.headers()['content-type']).toContain('text/plain');
    const llms = await response.text();
    expect(llms.startsWith('# Asmit Bhardwaj')).toBe(true);
    for (const heading of ['## About', '## Experience', '## Projects', '## Now', '## Contact', '## News']) expect(llms).toContain(heading);
    expect(llms).toContain(`### [${TITLE}](https://asmitbhardwaj.dev/news/${SLUG})`);
  });

  test('rss.xml is a valid-looking feed with the post', async ({ request }) => {
    const response = await request.get('/rss.xml');
    expect(response.headers()['content-type']).toContain('rss+xml');
    const rss = await response.text();
    expect(rss).toContain('<rss version="2.0"');
    expect(rss).toContain(`<link>https://asmitbhardwaj.dev/news/${SLUG}</link>`);
    expect(rss).toContain(`<title>${TITLE}</title>`);
  });
});
