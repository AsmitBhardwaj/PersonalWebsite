import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { portfolio } from '../content/portfolio';
import type { AppProps } from './types';
import { useAppInput } from '../input/useAppInput';

export function ProjectsApp({ input }: Pick<AppProps, 'input'>) {
  const [index, setIndex] = useState(0);
  const copy = useRef<HTMLDivElement>(null);
  // The D-pad scrolls the project text, since the dispatcher keeps arrow keys from scrolling the page.
  useAppInput(input, (event) => {
    if (event.type !== 'keydown' || !copy.current) return;
    if (event.key === 'ArrowDown') copy.current.scrollBy({ top: 40 });
    if (event.key === 'ArrowUp') copy.current.scrollBy({ top: -40 });
  });
  const project = portfolio.projects[index];
  const move = (offset: number) => setIndex((index + offset + portfolio.projects.length) % portfolio.projects.length);
  return <div className="screen-page projects-page" style={{ '--project-accent': project.accent } as React.CSSProperties}>
    <div className="project-scroll" ref={copy} tabIndex={0}>
      <div className="project-art" aria-hidden="true"><i/><i/><i/><span>{String(index + 1).padStart(2, '0')}</span></div>
      <header className="project-bar"><i className="project-chip" aria-hidden="true"/><h2>{project.title}</h2><p className="eyebrow">Project {index + 1} / {portfolio.projects.length}</p></header>
      <div className="project-body"><p>{project.summary}</p>
        {(project.status || project.role) && <p className="project-meta">{[project.status, project.role].filter(Boolean).join(' · ')}</p>}
        {project.description && <p>{project.description}</p>}
        {project.highlights && <ul className="project-highlights">{project.highlights.map((item) => <li key={item}>{item}</li>)}</ul>}
        <div className="tags">{project.technologies.map((item) => <span key={item}>{item}</span>)}</div>
        <div className="project-links">{project.sourceUrl && <a href={project.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink size={11}/></a>}{project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer">Website <ExternalLink size={11}/></a>}</div>
      </div>
    </div>
    <div className="project-pager"><button onClick={() => move(-1)} aria-label="Previous project"><ArrowLeft/></button><span>{portfolio.projects.map((_, i) => <i key={i} className={i === index ? 'active' : ''}/>)}</span><button onClick={() => move(1)} aria-label="Next project"><ArrowRight/></button></div>
  </div>;
}
