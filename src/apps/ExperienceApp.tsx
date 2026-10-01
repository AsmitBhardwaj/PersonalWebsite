import { portfolio } from '../content/portfolio';

export function ExperienceApp() {
  return <div className="screen-page scroll-page"><p className="eyebrow">Selected path</p><h2>Experience</h2><div className="timeline">{portfolio.experience.map((item) => <article key={item.period}><span className="timeline-dot"/><div className="timeline-meta"><b>{item.period}</b></div><h3>{item.role}</h3><p className="company">{item.company}</p><ul>{item.highlights.map((point) => <li key={point}>{point}</li>)}</ul><div className="tags">{item.technologies.map((tech) => <span key={tech}>{tech}</span>)}</div></article>)}</div></div>;
}
