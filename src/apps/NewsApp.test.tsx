import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createInputBus } from '../input/inputBus';
import type { InputBus } from '../input/inputBus';
import { buildPosts } from '../content/news';
import { NewsApp } from './NewsApp';

const posts = buildPosts({
  'content/news/old.md': '---\ntitle: Old post\ndate: 2026-01-01\nsummary: Old summary.\n---\n\nOld body.',
  'content/news/new.md': '---\ntitle: New post\ndate: 2026-09-01\nsummary: New summary.\n---\n\nFirst paragraph with `code`.\n\n## Section\n\n- one\n- two',
});

const press = (bus: InputBus, key: string) => act(() => { bus.down(`k-${key}`, key, { repeat: false, source: 'keyboard' }); bus.up(`k-${key}`); });
const setup = () => { const bus = createInputBus(); render(<NewsApp input={bus.input} posts={posts}/>); return bus; };

describe('NewsApp', () => {
  it('lists posts newest first with date, summary and reading time', () => {
    setup();
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('b')?.textContent)).toEqual(['New post', 'Old post']);
    expect(items[0]).toHaveTextContent('New summary.');
    expect(items[0]).toHaveTextContent('1 min read');
    expect(items[0]).toHaveTextContent('1 Sep 2026');
  });

  it('highlights with the d-pad, opens with Enter, and Back returns to the list', () => {
    const bus = setup();
    press(bus, 'ArrowDown'); // first press highlights the first post
    expect(screen.getAllByRole('listitem')[0]).toHaveClass('is-highlighted');
    press(bus, 'ArrowDown');
    expect(screen.getAllByRole('listitem')[1]).toHaveClass('is-highlighted');
    press(bus, 'ArrowUp');
    press(bus, 'Enter');
    expect(screen.getByRole('heading', { level: 2, name: 'New post' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Section' })).toBeInTheDocument();
    let handled = false;
    act(() => { handled = bus.handleBack(); });
    expect(handled).toBe(true);
    expect(screen.getByRole('heading', { level: 2, name: 'News' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveClass('is-highlighted');
    expect(bus.handleBack()).toBe(false); // list showing: Back closes the app
  });

  it('opens by tap and links to the post on the web', () => {
    setup();
    fireEvent.click(screen.getAllByRole('listitem')[1]);
    expect(screen.getByRole('link', { name: /Read on the web/ })).toHaveAttribute('href', '/news/old');
    fireEvent.click(screen.getByRole('button', { name: /News/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'News' })).toBeInTheDocument();
  });
});
