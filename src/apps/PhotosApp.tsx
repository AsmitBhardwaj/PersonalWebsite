import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Camera, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import { portfolio } from '../content/portfolio';
import { INSTAGRAM_URL, avatarFor, formatPhotoDate, photos as builtPhotos } from '../content/photos';
import type { Photo } from '../content/photos';
import { navigateGrid } from './gridNav';
import { useAppInput } from '../input/useAppInput';
import type { AppProps } from './types';

export const PHOTO_GRID_COLUMNS = 3;
/** Horizontal travel (px) before a drag counts as a swipe, and how much it must beat the vertical travel by. */
const SWIPE_DISTANCE = 40;

const KEY_DIRECTIONS: Record<string, string> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

/** First sentence of the About copy, for the one-line bio. */
const bio = (portfolio.biography[0] ?? '').split(/(?<=[.!?])\s/)[0];

interface PhotosAppProps extends Pick<AppProps, 'input'> { photos?: Photo[]; }

export function PhotosApp({ input, photos = builtPhotos }: PhotosAppProps) {
  const [highlight, setHighlight] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const scroller = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const count = photos.length;
  const avatar = avatarFor(photos);

  const move = (offset: number) => setOpen((current) => (current === null ? null : Math.min(count - 1, Math.max(0, current + offset))));
  const closeViewer = () => { if (open !== null) setHighlight(open); setOpen(null); };

  // Back and Escape leave the viewer first; with the grid showing they close the app as usual.
  const backState = useRef({ open, closeViewer });
  useEffect(() => { backState.current = { open, closeViewer }; });
  useEffect(() => input.setBackHandler(() => {
    if (backState.current.open === null) return false;
    backState.current.closeViewer();
    return true;
  }), [input]);

  useAppInput(input, (event) => {
    if (event.type !== 'keydown' || count === 0) return;
    if (open !== null) {
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
      return;
    }
    const direction = KEY_DIRECTIONS[event.key];
    if (direction) { setHighlight(navigateGrid(highlight, direction, count, PHOTO_GRID_COLUMNS)); return; }
    if (event.key === 'Enter' && !event.repeat) { if (highlight === null) setHighlight(0); else setOpen(highlight); }
  });

  // Keep the highlighted tile in view as the d-pad moves it.
  useEffect(() => {
    if (open !== null || highlight === null) return;
    scroller.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const onSwipeStart = (event: ReactPointerEvent) => { swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; };
  const onSwipeEnd = (event: ReactPointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.2) move(dx < 0 ? 1 : -1);
  };

  const photo = open !== null ? photos[open] : null;
  return <div className="screen-page photos-page" data-viewer={photo ? 'open' : 'grid'}>
    <div className="photos-scroll" ref={scroller} aria-hidden={photo ? true : undefined}>
      <header className="photos-profile">
        <span className="photos-avatar" aria-hidden="true">{avatar ? <img src={avatar.thumb} alt="" draggable={false}/> : <Camera size="55%" strokeWidth={1.8}/>}</span>
        <div className="photos-ident">
          <h2>{portfolio.name}</h2>
          <p className="photos-count"><b>{count}</b> {count === 1 ? 'post' : 'posts'}</p>
        </div>
        {bio && <p className="photos-bio">{bio}</p>}
        {INSTAGRAM_URL && <a className="photos-follow" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Follow on Instagram</a>}
      </header>
      {count === 0 ? <p className="photos-empty">No photos yet.</p> : <div className="photos-grid" role="list">
        {photos.map((item, index) => <button key={item.id} role="listitem" type="button" tabIndex={-1} data-index={index} data-loaded={loaded.has(item.id) || undefined}
          className={`photos-tile${highlight === index ? ' is-highlighted' : ''}`} aria-label={item.caption ? `Open photo: ${item.caption}` : `Open photo ${index + 1}`}
          onClick={() => { setHighlight(index); setOpen(index); }}>
          <img src={item.thumb} alt="" loading="lazy" decoding="async" draggable={false} onLoad={() => setLoaded((current) => new Set(current).add(item.id))}/>
        </button>)}
      </div>}
    </div>
    {photo && open !== null && <section className="photo-viewer" aria-label="Photo" data-index={open}>
      <div className="photo-viewer__bar">
        <button type="button" className="photo-viewer__back" onClick={closeViewer} aria-label="Back to photos"><X size={14}/></button>
        <span className="photo-viewer__count">{open + 1} / {count}</span>
      </div>
      <div className="photo-viewer__stage" style={{ backgroundImage: `url(${photo.thumb})` }} onPointerDown={onSwipeStart} onPointerUp={onSwipeEnd} onPointerCancel={() => { swipe.current = null; }}>
        <img key={photo.id} src={photo.src} alt={photo.caption ?? ''} width={photo.width} height={photo.height} draggable={false}/>
        <button type="button" className="photo-viewer__nav is-prev" onClick={() => move(-1)} disabled={open === 0} aria-label="Previous photo"><ChevronLeft size={16}/></button>
        <button type="button" className="photo-viewer__nav is-next" onClick={() => move(1)} disabled={open === count - 1} aria-label="Next photo"><ChevronRight size={16}/></button>
      </div>
      {(photo.caption || photo.date || photo.place) && <footer className="photo-viewer__caption">
        {photo.caption && <p>{photo.caption}</p>}
        {(photo.date || photo.place) && <small>{photo.date && <time>{formatPhotoDate(photo.date)}</time>}{photo.date && photo.place && ' · '}{photo.place && <span><MapPin size={10}/> {photo.place}</span>}</small>}
      </footer>}
    </section>}
  </div>;
}
