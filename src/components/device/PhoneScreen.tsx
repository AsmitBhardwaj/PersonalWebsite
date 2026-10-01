import { useEffect, useState } from 'react';
import { BriefcaseBusiness, ChevronLeft, CircleUserRound, Contact, Github, Home, Linkedin, Mail, NotebookPen, StickyNote, Wifi } from 'lucide-react';
import { portfolio } from '../../content/portfolio';
import { PhoneApp, type AppName } from '../apps/PhoneApps';
import { AppIcon } from '../ui/AppIcon';
import { DockButton } from '../ui/DockButton';
import { HardwareTerminal } from './HardwareTerminal';
import type { HardwareTerminalState } from './useHardwareKeyboard';

interface PhoneScreenNavigation {
  activeApp: AppName | null;
  highlightedIndex: number | null;
  terminal: HardwareTerminalState;
  openApp: (app: AppName) => void;
  goHome: () => void;
  closeTerminal: () => void;
}

interface PhoneScreenProps { ready: boolean; booting: boolean; navigation?: PhoneScreenNavigation; }

export function PhoneScreen({ ready, booting, navigation }: PhoneScreenProps) {
  const [internalActiveApp, setInternalActiveApp] = useState<AppName | null>(null);
  const activeApp = navigation ? navigation.activeApp : internalActiveApp;
  const openApp = navigation ? navigation.openApp : setInternalActiveApp;
  const home = navigation ? navigation.goHome : () => setInternalActiveApp(null);
  useEffect(() => {
    if (navigation) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setInternalActiveApp(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigation]);

  return <div className="screen-viewport">
    <div className={`boot-screen ${booting ? 'is-visible' : ''}`} aria-hidden={!booting}><span className="boot-mark">AB</span><b>ASMIT BHARDWAJ</b><i/></div>
    <div className={`phone-os ${ready ? 'is-ready' : ''}`} style={{ backgroundImage: `url(${portfolio.wallpaperPath})` }}>
      <header className="status-bar"><span><i className="signal-bars"/>{portfolio.statusName}</span><span><Wifi size={11}/><time>10:21</time><i className="battery"/></span></header>
      <main className={`screen-content ${activeApp ? 'has-app' : ''}`}>
        {!activeApp ? <HomeScreen openApp={openApp} highlightedIndex={navigation?.highlightedIndex ?? null}/> : <PhoneApp app={activeApp}/>}
      </main>
      {activeApp && <nav className="screen-nav" aria-label="Phone navigation"><button onClick={home} aria-label="Back to phone home"><ChevronLeft/><span>Back</span></button><b>{activeApp}</b><button onClick={home} aria-label="Phone home"><Home/><span>Home</span></button></nav>}
      {navigation && <HardwareTerminal terminal={navigation.terminal} onClose={navigation.closeTerminal}/>}
    </div>
  </div>;
}

function HomeScreen({ openApp, highlightedIndex }: { openApp: (app: AppName) => void; highlightedIndex: number | null }) {
  return <div className="home-screen">
    <div className="app-grid">
      <AppIcon label="Projects" icon={BriefcaseBusiness} tone="#e96853" highlighted={highlightedIndex === 0} onClick={() => openApp('projects')}/>
      <AppIcon label="Experience" icon={NotebookPen} tone="#e0af45" highlighted={highlightedIndex === 1} onClick={() => openApp('experience')}/>
      <AppIcon label="About" icon={CircleUserRound} tone="#6ba7c9" highlighted={highlightedIndex === 2} onClick={() => openApp('about')}/>
      <AppIcon label="Notes" icon={StickyNote} tone="#87a66e" highlighted={highlightedIndex === 3} onClick={() => openApp('notes')}/>
      <AppIcon label="Contact" icon={Contact} tone="#ba7a9a" highlighted={highlightedIndex === 4} onClick={() => openApp('contact')}/>
    </div>
    <button className="music-widget" onClick={() => openApp('music')} aria-label={`Open music player: ${portfolio.music.title}`}><span className="disc"><i/></span><span><b>{portfolio.music.title}</b><small>{portfolio.music.artist}</small></span><span className="playing-bars" aria-hidden="true"><i/><i/><i/></span></button>
    <span className="page-dots" aria-hidden="true"><i className="active"/><i/></span>
    <div className="dock" aria-label="Shortcuts"><DockButton label="Open GitHub" icon={Github} onClick={() => window.open(portfolio.social.github, '_blank', 'noopener,noreferrer')}/><DockButton label="Open LinkedIn" icon={Linkedin} onClick={() => window.open(portfolio.social.linkedin, '_blank', 'noopener,noreferrer')}/><DockButton label="Email Asmit" icon={Mail} onClick={() => { window.location.href = `mailto:${portfolio.email}`; }}/></div>
  </div>;
}
