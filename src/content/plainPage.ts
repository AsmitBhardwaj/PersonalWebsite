import type { PortfolioContent } from './portfolio';
import { HOME_URL, jsonLdScript, personJsonLd, PLAIN_DESCRIPTION, PLAIN_URL } from './seo';

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const e = escapeHtml;

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "May 2026" -> "2026-05"; anything else (e.g. "Present") -> null. */
function isoMonth(label: string): string | null {
  const match = /^([A-Za-z]{3})[a-z]* (\d{4})$/.exec(label.trim());
  const month = match ? MONTHS.indexOf(match[1].toLowerCase()) : -1;
  return match && month >= 0 ? `${match[2]}-${String(month + 1).padStart(2, '0')}` : null;
}

/** "May 2026 – Present" as <time> elements for each end that is a real month. */
function period(label: string): string {
  return label.split(/\s[\u2013-]\s/).map((part) => {
    const iso = isoMonth(part);
    return iso ? `<time datetime="${iso}">${e(part)}</time>` : e(part);
  }).join(' \u2013 ');
}

const list = (items: string[]) => `<ul>${items.map((item) => `<li>${e(item)}</li>`).join('')}</ul>`;

const STYLE = `
:root{color-scheme:light dark;--bg:#faf8f4;--fg:#1d1c1a;--muted:#5b5954;--rule:#dcd8cf;--link:#2a5d7c}
@media (prefers-color-scheme:dark){:root{--bg:#161615;--fg:#ecebe7;--muted:#a3a19a;--rule:#34332f;--link:#8cc0dc}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:1.0625rem/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:42rem;margin:0 auto;padding:2.5rem 1.25rem 4rem}
a{color:var(--link);text-underline-offset:.15em}
h1{font-size:2.1rem;line-height:1.2;margin:.25rem 0}
h2{font-size:1.3rem;margin:2.75rem 0 .75rem;padding-top:1.25rem;border-top:1px solid var(--rule)}
h3{font-size:1.08rem;margin:0}
p,ul{margin:.6rem 0}ul{padding-left:1.25rem}li{margin:.3rem 0}
.muted{color:var(--muted)}
.top{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;font-size:.95rem}
article{margin:1.5rem 0}
article header p{margin:.1rem 0}
dl{margin:.6rem 0}dt{font-weight:600;margin-top:.6rem}dd{margin:0}
:focus-visible{outline:2px solid var(--link);outline-offset:2px}
`.replace(/\n\s*/g, '');

/** The whole /plain page as a string: plain semantic HTML from the portfolio content, no scripts. */
export function renderPlainPage(c: PortfolioContent): string {
  const skills = c.skillGroups.map((g) => `<dt>${e(g.label)}</dt><dd>${e(g.items.join(', '))}</dd>`).join('');
  const experience = c.experience.map((x) => `<article>
<header><h3>${e(x.role)}, ${e(x.company)}</h3><p class="muted">${period(x.period)}${x.location ? ` · ${e(x.location)}` : ''}</p></header>
${list(x.highlights)}${x.technologies.length ? `<p class="muted">Technologies: ${e(x.technologies.join(', '))}</p>` : ''}
</article>`).join('\n');
  const projects = c.projects.map((p) => `<article>
<header><h3>${e(p.title)}</h3>${p.status ? `<p class="muted">${p.statusUrl ? `<a href="${e(p.statusUrl)}">${e(p.status)}</a>` : e(p.status)}</p>` : ''}${p.role ? `<p class="muted">Role: ${e(p.role)}</p>` : ''}</header>
<p>${e(p.description ?? p.summary)}</p>
${p.highlights?.length ? list(p.highlights) : ''}
<p class="muted">Technologies: ${e(p.technologies.join(', '))}</p>
${[p.demoUrl && `<a href="${e(p.demoUrl)}">${e(p.demoUrl.replace(/^https?:\/\//, ''))}</a>`, p.sourceUrl && `<a href="${e(p.sourceUrl)}">Source</a>`].filter(Boolean).map((l) => `<p>${l}</p>`).join('')}
</article>`).join('\n');
  const now = c.notes.map((n) => `<li>${e(n.title)}: ${e(n.excerpt)}</li>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(c.name)} — Plain version</title>
<meta name="description" content="${e(PLAIN_DESCRIPTION)}">
<link rel="canonical" href="${PLAIN_URL}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="profile">
<meta property="og:title" content="${e(c.name)}">
<meta property="og:description" content="${e(PLAIN_DESCRIPTION)}">
<meta property="og:url" content="${PLAIN_URL}">
${jsonLdScript(personJsonLd(c))}
<style>${STYLE}</style>
</head>
<body>
<main>
<p class="top"><a href="/">← Back to the interactive site</a><span class="muted">Plain version</span></p>
<header>
<h1>${e(c.name)}</h1>
<p class="muted">${e(c.tagline)} · ${e(c.location)}</p>
</header>
<section aria-labelledby="about"><h2 id="about">About</h2>
${c.biography.map((paragraph) => `<p>${e(paragraph)}</p>`).join('\n')}
</section>
<section aria-labelledby="skills"><h2 id="skills">Skills</h2><dl>${skills}</dl>
<p class="muted">Interests: ${e(c.interests.join(', '))}</p></section>
<section aria-labelledby="experience"><h2 id="experience">Experience</h2>
${experience}
</section>
<section aria-labelledby="projects"><h2 id="projects">Projects</h2>
${projects}
</section>
<section aria-labelledby="now"><h2 id="now">Now</h2>
${c.notesIntro ? `<p>${e(c.notesIntro)}</p>` : ''}<ul>${now}</ul>
</section>
<section aria-labelledby="contact"><h2 id="contact">Contact</h2>
<ul>
<li>Email: <a href="mailto:${e(c.email)}">${e(c.email)}</a></li>
<li>LinkedIn: <a href="${e(c.social.linkedin)}">${e(c.social.linkedin.replace(/^https?:\/\//, ''))}</a></li>
<li>GitHub: <a href="${e(c.social.github)}">${e(c.social.github.replace(/^https?:\/\//, ''))}</a></li>
</ul>
<p><a href="/">← Back to the interactive site</a> (${e(HOME_URL.replace(/^https?:\/\//, ''))})</p>
</section>
</main>
</body>
</html>
`;
}
