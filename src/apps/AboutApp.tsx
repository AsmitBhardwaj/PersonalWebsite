import { MapPin } from 'lucide-react';
import { portfolio } from '../content/portfolio';

export function AboutApp() {
  return <div className="screen-page scroll-page about-page"><div className="portrait-placeholder" aria-label="Portrait placeholder"><span>AB</span></div><div><p className="eyebrow">A little about me</p><h2>{portfolio.headline ?? portfolio.name}</h2>{portfolio.biography.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{portfolio.currentFocus && <blockquote>{portfolio.currentFocus}</blockquote>}<p className="location"><MapPin size={12}/> {portfolio.location}</p><h3>Toolkit</h3>{portfolio.skillGroups.map((group) => <div key={group.label}><p className="eyebrow">{group.label}</p><div className="tags">{group.items.map((tech) => <span key={tech}>{tech}</span>)}</div></div>)}<h3>Beyond the screen</h3><p>{portfolio.interests.join(' · ')}</p></div></div>;
}
