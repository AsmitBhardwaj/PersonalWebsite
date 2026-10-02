import { describe, expect, it } from 'vitest';
import { portfolio } from './portfolio';
import { renderPlainPage } from './plainPage';
import { personJsonLd, PLAIN_URL } from './seo';

describe('plain page', () => {
  const html = renderPlainPage(portfolio);

  it('is generated from the portfolio content: every paragraph, role, project and contact', () => {
    for (const text of [...portfolio.biography, ...portfolio.experience.flatMap((x) => [x.role, x.company, ...x.highlights]), ...portfolio.projects.flatMap((p) => [p.title, ...(p.highlights ?? [])]), ...portfolio.notes.map((n) => n.title)]) {
      expect(html).toContain(text.replace(/&/g, '&amp;').replace(/"/g, '&quot;'));
    }
    expect(html).toContain(`mailto:${portfolio.email}`);
    expect(html).toContain(portfolio.social.github);
    expect(html).toContain(portfolio.social.linkedin);
  });

  it('is script-free semantic HTML with a canonical URL and Person JSON-LD', () => {
    expect(html).not.toMatch(/<script(?![^>]*ld\+json)/);
    expect(html).toContain(`<link rel="canonical" href="${PLAIN_URL}">`);
    expect(html).toContain('<h1>Asmit Bhardwaj</h1>');
    expect(html).toContain('<time datetime="2026-05">May 2026</time>');
    const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)![1]);
    expect(ld).toEqual(personJsonLd(portfolio));
    expect(ld).toMatchObject({ '@type': 'Person', jobTitle: 'Software Engineer', alumniOf: { name: 'Gettysburg College' } });
    expect(ld.sameAs).toEqual([portfolio.social.linkedin, portfolio.social.github]);
  });

  it('escapes content', () => {
    expect(renderPlainPage({ ...portfolio, name: '<b>x</b>' })).toContain('<h1>&lt;b&gt;x&lt;/b&gt;</h1>');
  });
});
