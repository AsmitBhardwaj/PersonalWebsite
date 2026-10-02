import { describe, expect, it } from 'vitest';
import { blocksHtml, parseInline, parseMarkdown } from './markdown';

describe('markdown', () => {
  it('parses headings, paragraphs (joining wrapped lines), lists, quotes, code and rules', () => {
    const blocks = parseMarkdown('## Title\n\nOne\ntwo.\n\n- a\n- b\n\n1. x\n2. y\n\n> quoted\n\n```\n<b>\n```\n\n---');
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'list', 'quote', 'code', 'rule']);
    expect(blocks[1]).toEqual({ type: 'paragraph', children: [{ type: 'text', text: 'One two.' }] });
    expect(blocks[2]).toMatchObject({ ordered: false, items: [expect.anything(), expect.anything()] });
    expect(blocks[3]).toMatchObject({ ordered: true });
  });

  it('parses inline code, bold, italic and links', () => {
    expect(parseInline('a **b** `c` *d* [e](https://x.dev)')).toEqual([
      { type: 'text', text: 'a ' }, { type: 'strong', children: [{ type: 'text', text: 'b' }] }, { type: 'text', text: ' ' },
      { type: 'code', text: 'c' }, { type: 'text', text: ' ' }, { type: 'em', children: [{ type: 'text', text: 'd' }] }, { type: 'text', text: ' ' },
      { type: 'link', href: 'https://x.dev', children: [{ type: 'text', text: 'e' }] },
    ]);
  });

  it('escapes HTML and drops unsafe link targets', () => {
    expect(blocksHtml(parseMarkdown('<script>alert(1)</script> [x](javascript:void) [ok](/plain)'))).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt; x <a href="/plain">ok</a></p>');
    expect(blocksHtml(parseMarkdown('```\n<b>&\n```'))).toBe('<pre><code>&lt;b&gt;&amp;</code></pre>');
  });
});
