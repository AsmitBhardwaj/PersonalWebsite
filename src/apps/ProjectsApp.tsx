import { useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { portfolio } from '../content/portfolio';

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
