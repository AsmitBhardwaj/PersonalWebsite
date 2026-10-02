/** A deliberately small Markdown subset (headings, paragraphs, lists, quotes, code, rules, inline emphasis/code/links), parsed to a tree so React and the static HTML share one source. */
export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong' | 'em'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: Inline[] };

export type Block =
  | { type: 'heading'; level: 2 | 3 | 4; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'quote'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'rule' };

const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])|\[([^\]]+)\]\(([^)\s]+)\)/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  for (let match = INLINE.exec(rest); match; match = INLINE.exec(rest)) {
    if (match.index > 0) out.push({ type: 'text', text: rest.slice(0, match.index) });
    const [, code, strong, em, label, href] = match;
    if (code !== undefined) out.push({ type: 'code', text: code });
    else if (strong !== undefined) out.push({ type: 'strong', children: parseInline(strong) });
    else if (em !== undefined) out.push({ type: 'em', children: parseInline(em) });
    else out.push({ type: 'link', href, children: parseInline(label) });
    rest = rest.slice(match.index + match[0].length);
  }
  if (rest) out.push({ type: 'text', text: rest });
  return out;
}

const HEADING = /^(#{2,4})\s+(.*?)\s*#*$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', children: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { flush(); continue; }
    if (line.startsWith('```')) {
      flush();
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i]);
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) { flush(); blocks.push({ type: 'heading', level: heading[1].length as 2 | 3 | 4, children: parseInline(heading[2]) }); continue; }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { flush(); blocks.push({ type: 'rule' }); continue; }
    if (line.startsWith('>')) {
      flush();
      const quote: string[] = [];
      for (; i < lines.length && lines[i].startsWith('>'); i++) quote.push(lines[i].replace(/^>\s?/, ''));
      i--;
      blocks.push({ type: 'quote', children: parseInline(quote.join(' ')) });
      continue;
    }
    const first = BULLET.exec(line) ?? NUMBERED.exec(line);
    if (first) {
      flush();
      const ordered = !BULLET.test(line);
      const pattern = ordered ? NUMBERED : BULLET;
      const items: Inline[][] = [];
      for (; i < lines.length; i++) {
        const item = pattern.exec(lines[i]);
        if (!item) break;
        items.push(parseInline(item[1]));
      }
      i--;
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

export const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Only http(s), mailto and site-relative links survive; anything else (javascript:, data:) renders as its text. */
export const safeHref = (href: string) => (/^(https?:|mailto:|\/|#)/i.test(href) ? href : null);

export function inlineHtml(nodes: Inline[]): string {
  return nodes.map((node) => {
    switch (node.type) {
      case 'text': return escapeHtml(node.text);
      case 'code': return `<code>${escapeHtml(node.text)}</code>`;
      case 'strong': return `<strong>${inlineHtml(node.children)}</strong>`;
      case 'em': return `<em>${inlineHtml(node.children)}</em>`;
      case 'link': { const href = safeHref(node.href); return href ? `<a href="${escapeHtml(href)}">${inlineHtml(node.children)}</a>` : inlineHtml(node.children); }
    }
  }).join('');
}

export function blocksHtml(blocks: Block[]): string {
  return blocks.map((block) => {
    switch (block.type) {
      case 'heading': return `<h${block.level}>${inlineHtml(block.children)}</h${block.level}>`;
      case 'paragraph': return `<p>${inlineHtml(block.children)}</p>`;
      case 'quote': return `<blockquote><p>${inlineHtml(block.children)}</p></blockquote>`;
      case 'code': return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
      case 'rule': return '<hr>';
      case 'list': { const tag = block.ordered ? 'ol' : 'ul'; return `<${tag}>${block.items.map((item) => `<li>${inlineHtml(item)}</li>`).join('')}</${tag}>`; }
    }
  }).join('\n');
}

/** Plain text of a block list, for word counts. */
export function blocksText(blocks: Block[]): string {
  const inline = (nodes: Inline[]): string => nodes.map((n) => (n.type === 'text' || n.type === 'code' ? n.text : inline(n.children))).join('');
  return blocks.map((b) => {
    switch (b.type) {
      case 'heading': case 'paragraph': case 'quote': return inline(b.children);
      case 'list': return b.items.map(inline).join(' ');
      case 'code': return b.text;
      case 'rule': return '';
    }
  }).join(' ');
}
