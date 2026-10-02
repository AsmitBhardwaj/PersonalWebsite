import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { portfolio } from './src/content/portfolio';
import { renderPlainPage } from './src/content/plainPage';
import { HOME_URL, jsonLdBody, personJsonLd, PLAIN_PATH } from './src/content/seo';

/**
 * The crawlable side of the site, generated from src/content so it cannot drift from the phone UI:
 * /plain as static HTML (emitted as plain.html at build, served by middleware in dev and preview), and the canonical
 * link, Person JSON-LD and <noscript> fallback injected into the main page.
 */
function sitePages(): Plugin {
  const html = renderPlainPage(portfolio);
  const serve = (middlewares: { use: (handler: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (body: string) => void }, next: () => void) => void) => void }) =>
    middlewares.use((req, res, next) => {
      if (req.url?.split('?')[0].replace(/\/$/, '') !== PLAIN_PATH) return next();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    });
  return {
    name: 'site-pages',
    configureServer(server) { serve(server.middlewares); },
    configurePreviewServer(server) { serve(server.middlewares); },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'plain.html', source: html });
    },
    transformIndexHtml: () => [
      { tag: 'link', attrs: { rel: 'canonical', href: HOME_URL }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:title', content: `${portfolio.name} — Computer Science · Gettysburg College` }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:url', content: HOME_URL }, injectTo: 'head' },
      { tag: 'script', attrs: { type: 'application/ld+json' }, children: jsonLdBody(personJsonLd(portfolio)), injectTo: 'head' },
      { tag: 'noscript', children: `<p style="font:16px/1.5 system-ui,sans-serif;padding:24px;text-align:center">This portfolio is an interactive device and needs JavaScript. <a href="${PLAIN_PATH}">Read the plain version</a>.</p>`, injectTo: 'body-prepend' },
    ],
  };
}

export default defineConfig({
  plugins: [react(), sitePages()],
});
