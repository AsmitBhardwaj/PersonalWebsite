import type { PortfolioContent } from './portfolio';

export const SITE_URL = 'https://asmitbhardwaj.dev';
export const HOME_URL = `${SITE_URL}/`;
export const PLAIN_URL = `${SITE_URL}/plain`;
export const PLAIN_PATH = '/plain';

export const JOB_TITLE = 'Software Engineer';
export const PLAIN_DESCRIPTION = 'Asmit Bhardwaj: Computer Science student at Gettysburg College (class of 2028). About, skills, experience, projects (Platter, The Professor), what he is doing now, and contact. Plain-text version of the interactive portfolio.';

/** schema.org Person, derived from the same content the phone UI reads. */
export function personJsonLd(content: PortfolioContent) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: content.name,
    url: HOME_URL,
    jobTitle: JOB_TITLE,
    sameAs: [content.social.linkedin, content.social.github],
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Gettysburg College' },
  };
}

/** JSON for a JSON-LD <script> body, with `<` escaped so it cannot close the tag early. */
export const jsonLdBody = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
export const jsonLdScript = (data: unknown) => `<script type="application/ld+json">${jsonLdBody(data)}</script>`;

export const NEWS_PATH = '/news';
export const RSS_PATH = '/rss.xml';
export const RSS_URL = `${SITE_URL}${RSS_PATH}`;
export const postPath = (slug: string) => `${NEWS_PATH}/${slug}`;
export const postUrl = (slug: string) => `${SITE_URL}${postPath(slug)}`;

/** The feed link every page carries in its <head>. */
export const RSS_LINK_TAG = `<link rel="alternate" type="application/rss+xml" title="Asmit Bhardwaj: News" href="${RSS_PATH}">`;

/** schema.org Article for one news post. */
export function articleJsonLd(post: { slug: string; title: string; date: string; summary: string }, authorName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.date,
    url: postUrl(post.slug),
    mainEntityOfPage: postUrl(post.slug),
    author: { '@type': 'Person', name: authorName, url: HOME_URL },
  };
}
