import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { posts as builtPosts } from '../content/newsStore';
import { formatPostDate } from '../content/news';
import type { NewsPost } from '../content/news';
import { safeHref } from '../content/markdown';
import type { Block, Inline } from '../content/markdown';
import { postPath } from '../content/seo';
import { useAppInput } from '../input/useAppInput';
import type { AppProps } from './types';

const SCROLL_STEP = 40;

const inline = (nodes: Inline[]): ReactNode => nodes.map((node, i) => {
  switch (node.type) {
    case 'text': return <Fragment key={i}>{node.text}</Fragment>;
    case 'code': return <code key={i}>{node.text}</code>;
    case 'strong': return <strong key={i}>{inline(node.children)}</strong>;
    case 'em': return <em key={i}>{inline(node.children)}</em>;
    case 'link': { const href = safeHref(node.href); return href ? <a key={i} href={href} target="_blank" rel="noopener noreferrer">{inline(node.children)}</a> : <Fragment key={i}>{inline(node.children)}</Fragment>; }
  }
});

function Blocks({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((block, i) => {
    switch (block.type) {
      case 'heading': { const Tag = `h${block.level + 1}` as 'h3' | 'h4' | 'h5'; return <Tag key={i}>{inline(block.children)}</Tag>; } // h2 is the post title
      case 'paragraph': return <p key={i}>{inline(block.children)}</p>;
      case 'quote': return <blockquote key={i}><p>{inline(block.children)}</p></blockquote>;
      case 'code': return <pre key={i}><code>{block.text}</code></pre>;
      case 'rule': return <hr key={i}/>;
      case 'list': { const Tag = block.ordered ? 'ol' : 'ul'; return <Tag key={i}>{block.items.map((item, j) => <li key={j}>{inline(item)}</li>)}</Tag>; }
    }
  })}</>;
}

interface NewsAppProps extends Pick<AppProps, 'input'> { posts?: NewsPost[]; }

export function NewsApp({ input, posts = builtPosts }: NewsAppProps) {
  const [highlight, setHighlight] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const page = useRef<HTMLDivElement>(null);
  const count = posts.length;

  const closeArticle = () => { if (open !== null) setHighlight(open); setOpen(null); };
  // Back and Escape return from an article to the list first; with the list showing they close the app as usual.
  const backState = useRef({ open, closeArticle });
  useEffect(() => { backState.current = { open, closeArticle }; });
  useEffect(() => input.setBackHandler(() => {
    if (backState.current.open === null) return false;
    backState.current.closeArticle();
    return true;
  }), [input]);

  useAppInput(input, (event) => {
    if (event.type !== 'keydown' || count === 0) return;
    if (open !== null) {
      // The dispatcher keeps arrow keys from scrolling the page, so the D-pad scrolls the article.
      if (event.key === 'ArrowDown') page.current?.scrollBy({ top: SCROLL_STEP });
      if (event.key === 'ArrowUp') page.current?.scrollBy({ top: -SCROLL_STEP });
      return;
    }
    if (event.key === 'ArrowDown') setHighlight((h) => (h === null ? 0 : Math.min(count - 1, h + 1)));
    if (event.key === 'ArrowUp') setHighlight((h) => (h === null ? 0 : Math.max(0, h - 1)));
    if (event.key === 'Enter' && !event.repeat) { if (highlight === null) setHighlight(0); else setOpen(highlight); }
  });

  useEffect(() => {
    if (open === null) page.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const post = open !== null ? posts[open] : null;
  if (post) return <div className="screen-page scroll-page news-article" ref={page} tabIndex={0}>
    <button className="inline-back" onClick={closeArticle}><ArrowLeft size={13}/> News</button>
    <p className="eyebrow"><time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.readingMinutes} min read</p>
    <h2>{post.title}</h2>
    <Blocks blocks={post.blocks}/>
    <p className="news-web"><a href={postPath(post.slug)} target="_blank" rel="noopener noreferrer">Read on the web <ExternalLink size={11}/></a></p>
  </div>;

  return <div className="screen-page scroll-page news-list" ref={page}>
    <p className="eyebrow">Writing</p>
    <h2>News</h2>
    {count === 0 ? <p>No posts yet.</p> : <div className="notes-list" role="list">
      {posts.map((item, index) => <button key={item.slug} role="listitem" type="button" tabIndex={-1} data-index={index} className={highlight === index ? 'is-highlighted' : undefined}
        onClick={() => { setHighlight(index); setOpen(index); }}>
        <span><b>{item.title}</b><small>{item.summary}</small><small className="news-meta">{item.readingMinutes} min read</small></span>
        <time dateTime={item.date}>{formatPostDate(item.date)}</time>
      </button>)}
    </div>}
  </div>;
}
