import { MapPin } from 'lucide-react';
import { portfolio } from '../content/portfolio';

export function AboutApp() {
  return <div className="screen-page scroll-page about-page"><div className="portrait-placeholder" aria-label="Portrait placeholder"><span>AB</span></div><div><p className="eyebrow">A little about me</p><h2>{portfolio.name}</h2><p>{portfolio.biography}</p><blockquote>{portfolio.currentFocus}</blockquote><p className="location"><MapPin size={12}/> {portfolio.location}</p><h3>Toolkit</h3><div className="tags">{portfolio.technologies.map((tech) => <span key={tech}>{tech}</span>)}</div><h3>Beyond the screen</h3><p>{portfolio.interests.join(' · ')}</p></div></div>;
}
