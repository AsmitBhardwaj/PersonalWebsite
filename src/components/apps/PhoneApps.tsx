import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Mail, MapPin } from 'lucide-react';
import { portfolio } from '../../content/portfolio';

export type AppName = 'projects' | 'experience' | 'about' | 'notes' | 'contact' | 'music';

export function ProjectsApp() {
  const [index, setIndex] = useState(0);
  const project = portfolio.projects[index];
  const move = (offset: number) => setIndex((index + offset + portfolio.projects.length) % portfolio.projects.length);
  return <div className="screen-page projects-page">
    <div className="project-art" style={{ '--project-accent': project.accent } as React.CSSProperties} aria-hidden="true"><i/><i/><i/><span>{String(index + 1).padStart(2, '0')}</span></div>
    <div className="project-copy"><p className="eyebrow">Sample project {index + 1} / {portfolio.projects.length}</p><h2>{project.title}</h2><p>{project.summary}</p>
      <div className="tags">{project.technologies.map((item) => <span key={item}>{item}</span>)}</div>
      <div className="project-links"><a href={project.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink size={11}/></a><a href={project.demoUrl} target="_blank" rel="noreferrer">Live demo <ExternalLink size={11}/></a></div>
    </div>
    <div className="project-pager"><button onClick={() => move(-1)} aria-label="Previous project"><ArrowLeft/></button><span>{portfolio.projects.map((_, i) => <i key={i} className={i === index ? 'active' : ''}/>)}</span><button onClick={() => move(1)} aria-label="Next project"><ArrowRight/></button></div>
  </div>;
}

export function ExperienceApp() {
  return <div className="screen-page scroll-page"><p className="eyebrow">Selected path</p><h2>Experience</h2><div className="timeline">{portfolio.experience.map((item) => <article key={item.period}><span className="timeline-dot"/><div className="timeline-meta"><b>{item.period}</b></div><h3>{item.role}</h3><p className="company">{item.company}</p><ul>{item.highlights.map((point) => <li key={point}>{point}</li>)}</ul><div className="tags">{item.technologies.map((tech) => <span key={tech}>{tech}</span>)}</div></article>)}</div></div>;
}

export function AboutApp() {
  return <div className="screen-page scroll-page about-page"><div className="portrait-placeholder" aria-label="Portrait placeholder"><span>AB</span></div><div><p className="eyebrow">A little about me</p><h2>{portfolio.name}</h2><p>{portfolio.biography}</p><blockquote>{portfolio.currentFocus}</blockquote><p className="location"><MapPin size={12}/> {portfolio.location}</p><h3>Toolkit</h3><div className="tags">{portfolio.technologies.map((tech) => <span key={tech}>{tech}</span>)}</div><h3>Beyond the screen</h3><p>{portfolio.interests.join(' · ')}</p></div></div>;
}

export function NotesApp() {
  const [selected, setSelected] = useState<number | null>(null);
  if (selected !== null) { const note = portfolio.notes[selected]; return <div className="screen-page scroll-page note-detail"><button className="inline-back" onClick={() => setSelected(null)}><ArrowLeft size={13}/> All notes</button><p className="eyebrow">{note.date} · Sample entry</p><h2>{note.title}</h2><p>{note.body}</p></div>; }
  return <div className="screen-page scroll-page"><p className="eyebrow">Field notes</p><h2>Notes</h2><div className="notes-list">{portfolio.notes.map((note, index) => <button key={note.title} onClick={() => setSelected(index)}><span><b>{note.title}</b><small>{note.excerpt}</small></span><time>{note.date}</time></button>)}</div></div>;
}

export function ContactApp() {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(portfolio.email); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <div className="screen-page contact-page"><p className="eyebrow">Open channel</p><h2>Let’s make something good.</h2><p>This address and the social links are placeholders. Replace them in the central content file.</p><a className="contact-email" href={`mailto:${portfolio.email}`}><Mail size={16}/>{portfolio.email}</a><button className="copy-button" onClick={copy}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied to clipboard' : 'Copy email'}</button><div className="contact-social"><a href={portfolio.social.github} target="_blank" rel="noreferrer">GitHub <ExternalLink size={11}/></a><a href={portfolio.social.linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={11}/></a></div></div>;
}

export function MusicApp() {
  const [playing, setPlaying] = useState(false);
  return <div className="screen-page music-page"><div className={`album-art ${playing ? 'is-playing' : ''}`} aria-hidden="true"><span/><i/></div><p className="eyebrow">Now queued</p><h2>{portfolio.music.title}</h2><p>{portfolio.music.artist}</p><div className="waveform" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i}/>)}</div><button className="music-toggle" onClick={() => setPlaying(!playing)} aria-pressed={playing}>{playing ? 'Pause visualizer' : 'Play visualizer'}</button><small>{portfolio.music.note}</small></div>;
}

export function PhoneApp({ app }: { app: AppName }) {
  switch (app) {
    case 'projects': return <ProjectsApp/>;
    case 'experience': return <ExperienceApp/>;
    case 'about': return <AboutApp/>;
    case 'notes': return <NotesApp/>;
    case 'contact': return <ContactApp/>;
    case 'music': return <MusicApp/>;
  }
}
