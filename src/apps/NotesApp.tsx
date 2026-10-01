import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { portfolio } from '../content/portfolio';

export function NotesApp() {
  const [selected, setSelected] = useState<number | null>(null);
  if (selected !== null) { const note = portfolio.notes[selected]; return <div className="screen-page scroll-page note-detail"><button className="inline-back" onClick={() => setSelected(null)}><ArrowLeft size={13}/> Now</button><p className="eyebrow">{note.date || 'Right now'}</p><h2>{note.title}</h2><p>{note.body}</p></div>; }
  return <div className="screen-page scroll-page"><p className="eyebrow">Right now</p><h2>Now</h2><div className="notes-list">{portfolio.notes.map((note, index) => <button key={note.title} onClick={() => setSelected(index)}><span><b>{note.title}</b><small>{note.excerpt}</small></span><time>{note.date}</time></button>)}</div></div>;
}
