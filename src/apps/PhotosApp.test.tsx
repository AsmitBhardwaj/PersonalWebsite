import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createInputBus } from '../input/inputBus';
import type { InputBus } from '../input/inputBus';
import type { Photo } from '../content/photos';
import { PhotosApp } from './PhotosApp';

const photos: Photo[] = [0, 1, 2, 3].map((n) => ({
  id: `p${n}`, file: `p${n}.jpg`, src: `/photos/p${n}.webp`, thumb: `/photos/p${n}-thumb.webp`, width: 1080, height: 720,
  ...(n === 0 ? { caption: 'First one', date: '2026-09', place: 'Sevilla' } : {}),
}));

const press = (bus: InputBus, key: string) => act(() => { bus.down(`k-${key}`, key, { repeat: false, source: 'keyboard' }); bus.up(`k-${key}`); });
const setup = () => { const bus = createInputBus(); render(<PhotosApp input={bus.input} photos={photos}/>); return bus; };

describe('PhotosApp', () => {
  it('renders the profile and a lazy-loaded grid', () => {
    setup();
    expect(screen.getByText('Asmit Bhardwaj')).toBeInTheDocument();
    expect(screen.getByText('posts')).toBeInTheDocument();
    const tiles = screen.getAllByRole('listitem');
    expect(tiles).toHaveLength(4);
    tiles.forEach((tile) => expect(tile.querySelector('img')).toHaveAttribute('loading', 'lazy'));
    expect(screen.queryByRole('link', { name: /Instagram/ })).toBeNull(); // INSTAGRAM_URL is empty
  });

  it('moves the highlight with the d-pad over 3 columns and opens it with Enter', () => {
    const bus = setup();
    const tiles = screen.getAllByRole('listitem');
    press(bus, 'ArrowRight'); // first press highlights the first photo
    expect(tiles[0]).toHaveClass('is-highlighted');
    press(bus, 'ArrowRight'); press(bus, 'ArrowRight'); press(bus, 'ArrowDown');
    expect(tiles[3]).toHaveClass('is-highlighted'); // 3 columns: (row 0, col 2) down is the last item
    press(bus, 'ArrowUp'); press(bus, 'ArrowRight'); // up from the last item is the first; then one right
    expect(tiles[1]).toHaveClass('is-highlighted');
    press(bus, 'Enter');
    expect(document.querySelector('.photo-viewer')).toHaveAttribute('data-index', '1');
  });

  it('opens by tap, shows caption/date/place, pages with arrows, and Back returns to the grid', () => {
    const bus = setup();
    fireEvent.click(screen.getAllByRole('listitem')[0]);
    expect(screen.getByText('First one')).toBeInTheDocument();
    expect(screen.getByText('Sep 2026')).toBeInTheDocument();
    expect(screen.getByText(/Sevilla/)).toBeInTheDocument();
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous photo' })).toBeDisabled();

    press(bus, 'ArrowRight'); press(bus, 'ArrowRight');
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    expect(screen.queryByText('First one')).toBeNull(); // later photos have no caption: nothing is shown
    press(bus, 'ArrowLeft');
    expect(screen.getByText('2 / 4')).toBeInTheDocument();

    let handled = false;
    act(() => { handled = bus.handleBack(); });
    expect(handled).toBe(true); // Escape: viewer closes, the app stays
    expect(document.querySelector('.photo-viewer')).toBeNull();
    expect(screen.getAllByRole('listitem')[1]).toHaveClass('is-highlighted'); // the grid highlight follows the viewer
    expect(bus.handleBack()).toBe(false); // with the grid showing, Back closes the app
  });

  it('shows an empty state with no photos', () => {
    render(<PhotosApp input={createInputBus().input} photos={[]}/>);
    expect(screen.getByText('No photos yet.')).toBeInTheDocument();
  });
});
