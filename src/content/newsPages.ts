import type { PortfolioContent } from './portfolio';
import type { NewsPost } from './news';
import { formatPostDate } from './news';
import { escapeHtml as e } from './markdown';
import { PAGE_STYLE } from './plainPage';
import { articleJsonLd, HOME_URL, jsonLdScript, PLAIN_PATH, postUrl, RSS_LINK_TAG } from './seo';

/** One news post as a complete static HTML page: no scripts besides JSON-LD, readable with JavaScript off. */
export function renderPostPage(post: NewsPost, c: PortfolioContent): string {
  const url = postUrl(post.slug);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(post.title)} — ${e(c.name)}</title>
<meta name="description" content="${e(post.summary)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${RSS_LINK_TAG}
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${e(c.name)}">
<meta property="og:title" content="${e(post.title)}">
<meta property="og:description" content="${e(post.summary)}">
<meta property="og:url" content="${url}">
<meta property="article:published_time" content="${post.date}">
<meta property="article:author" content="${e(c.name)}">
<meta name="twitter:card" content="summary">
${jsonLdScript(articleJsonLd(post, c.name))}
<style>${PAGE_STYLE}</style>
</head>
<body>
<main>
<p class="top"><a href="/">← Back to the interactive site</a><a href="${PLAIN_PATH}">Plain version</a></p>
<article>
<header>
<h1>${e(post.title)}</h1>
<p class="muted"><time datetime="${post.date}">${formatPostDate(post.date)}</time> · ${post.readingMinutes} min read · ${e(c.name)}</p>
</header>
${post.html}
</article>
<p class="muted">Read this inside the device: <a href="/">${e(HOME_URL.replace(/^https?:\/\//, ''))}</a>, News app.</p>
</main>
</body>
</html>
`;
}
