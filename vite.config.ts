import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { portfolio } from './src/content/portfolio';
import { renderPlainPage } from './src/content/plainPage';
import { buildPosts } from './src/content/news';
import { renderPostPage } from './src/content/newsPages';
import { renderLlmsTxt, renderRobots, renderRss, renderSitemap } from './src/content/crawlerFiles';
import { escapeHtml } from './src/content/markdown';
import { HOME_URL, jsonLdBody, personJsonLd, PLAIN_PATH, postPath, RSS_PATH } from './src/content/seo';

const NEWS_DIR = path.resolve(__dirname, 'content/news');
const PHOTOS_MANIFEST = path.resolve(__dirname, 'src/content/photos.generated.json');

const readPosts = () => buildPosts(Object.fromEntries(
  (existsSync(NEWS_DIR) ? readdirSync(NEWS_DIR) : []).filter((name) => name.endsWith('.md')).map((name) => [`content/news/${name}`, readFileSync(path.join(NEWS_DIR, name), 'utf8')]),
));
const readPhotos = (): { src: string; caption?: string }[] => (existsSync(PHOTOS_MANIFEST) ? JSON.parse(readFileSync(PHOTOS_MANIFEST, 'utf8')) : []);

interface SiteFile { type: string; body: string }

/** Every generated route, keyed by URL path. Rebuilt from content/news on each call, so a new post needs no other edit. */
function siteFiles(): Map<string, SiteFile> {
  const posts = readPosts();
  const html = 'text/html; charset=utf-8';
  const files = new Map<string, SiteFile>([
    [PLAIN_PATH, { type: html, body: renderPlainPage(portfolio, posts) }],
    ['/robots.txt', { type: 'text/plain; charset=utf-8', body: renderRobots() }],
    ['/sitemap.xml', { type: 'application/xml; charset=utf-8', body: renderSitemap(posts, readPhotos()) }],
    ['/llms.txt', { type: 'text/plain; charset=utf-8', body: renderLlmsTxt(portfolio, posts) }],
    [RSS_PATH, { type: 'application/rss+xml; charset=utf-8', body: renderRss(posts, portfolio) }],
  ]);
  for (const post of posts) files.set(postPath(post.slug), { type: html, body: renderPostPage(post, portfolio) });
  return files;
}

/** Where each route lands in dist: /plain -> plain.html, /news/<slug> -> news/<slug>/index.html, files with an extension as they are. */
const outputName = (route: string) => (route === PLAIN_PATH ? 'plain.html' : path.extname(route) ? route.slice(1) : `${route.slice(1)}/index.html`);

type Middlewares = { use: (handler: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (body: string) => void }, next: () => void) => void) => void };

/**
 * The crawlable side of the site, generated from src/content and content/news so it cannot drift from the phone UI:
 * /plain, /news/<slug>, robots.txt, sitemap.xml, llms.txt and rss.xml (emitted at build, served by middleware in dev and preview),
 * plus the canonical link, Person JSON-LD, feed link and <noscript> fallback injected into the main page.
 */
function sitePages(): Plugin {
  const serve = (middlewares: Middlewares) => middlewares.use((req, res, next) => {
    const route = req.url?.split('?')[0].replace(/(.)\/$/, '$1') ?? '';
    const file = siteFiles().get(route);
    if (!file) return next();
    res.setHeader('Content-Type', file.type);
    res.end(file.body);
  });
  return {
    name: 'site-pages',
    configureServer(server) {
      serve(server.middlewares);
      server.watcher.add(NEWS_DIR);
      server.watcher.on('all', (_event, changed) => { if (changed.startsWith(NEWS_DIR)) server.ws.send({ type: 'full-reload' }); });
    },
    configurePreviewServer(server) { serve(server.middlewares); },
    generateBundle() {
      siteFiles().forEach((file, route) => this.emitFile({ type: 'asset', fileName: outputName(route), source: file.body }));
    },
    transformIndexHtml: () => {
      const posts = readPosts();
      const news = posts.length ? `<h2 style="font-size:1.1em">News</h2><ul>${posts.map((p) => `<li><a href="${postPath(p.slug)}">${escapeHtml(p.title)}</a>: ${escapeHtml(p.summary)}</li>`).join('')}</ul>` : '';
      return [
        { tag: 'link', attrs: { rel: 'canonical', href: HOME_URL }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'alternate', type: 'application/rss+xml', title: 'Asmit Bhardwaj: News', href: RSS_PATH }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:title', content: `${portfolio.name} — Computer Science · Gettysburg College` }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:url', content: HOME_URL }, injectTo: 'head' },
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: jsonLdBody(personJsonLd(portfolio)), injectTo: 'head' },
        { tag: 'noscript', children: `<div style="font:16px/1.5 system-ui,sans-serif;padding:24px;max-width:40em;margin:0 auto"><p style="text-align:center">This portfolio is an interactive device and needs JavaScript. <a href="${PLAIN_PATH}">Read the plain version</a>.</p>${news}</div>`, injectTo: 'body-prepend' },
      ];
    },
  };
}

export default defineConfig({
  plugins: [react(), sitePages()],
});
