import { useState } from 'react';
import { Check, Copy, ExternalLink, Mail } from 'lucide-react';
import { portfolio } from '../content/portfolio';

export function ContactApp() {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(portfolio.email); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <div className="screen-page contact-page"><p className="eyebrow">Open channel</p><h2>Let’s make something good.</h2><p>This address and the social links are placeholders. Replace them in the central content file.</p><a className="contact-email" href={`mailto:${portfolio.email}`}><Mail size={16}/>{portfolio.email}</a><button className="copy-button" onClick={copy}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied to clipboard' : 'Copy email'}</button><div className="contact-social"><a href={portfolio.social.github} target="_blank" rel="noreferrer">GitHub <ExternalLink size={11}/></a><a href={portfolio.social.linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={11}/></a></div></div>;
}
