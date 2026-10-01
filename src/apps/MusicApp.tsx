import { useState } from 'react';
import { portfolio } from '../content/portfolio';

export function MusicApp() {
  const [playing, setPlaying] = useState(false);
  return <div className="screen-page music-page"><div className={`album-art ${playing ? 'is-playing' : ''}`} aria-hidden="true"><span/><i/></div><p className="eyebrow">Now queued</p><h2>{portfolio.music.title}</h2><p>{portfolio.music.artist}</p><div className="waveform" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i}/>)}</div><button className="music-toggle" onClick={() => setPlaying(!playing)} aria-pressed={playing}>{playing ? 'Pause visualizer' : 'Play visualizer'}</button><small>{portfolio.music.note}</small></div>;
}
