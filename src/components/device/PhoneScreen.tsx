import { useEffect, useState } from 'react';
import { ChevronLeft, Github, Home, Linkedin, Mail, Wifi } from 'lucide-react';
import { portfolio } from '../../content/portfolio';
import { AppHost } from '../../apps/AppHost';
import { appById, homeApps } from '../../apps/registry';
import type { AppId } from '../../apps/types';
import { createInputBus, type InputBus } from '../../input/inputBus';
import { AppIcon } from '../ui/AppIcon';
import { DockButton } from '../ui/DockButton';
import { LockScreen } from './LockScreen';
import { RotatePrompt } from './RotatePrompt';
import { HardwareTerminal } from './HardwareTerminal';
import { BootSequence } from '../../boot/BootSequence';
import type { BootState } from './PhoneDevice';
import type { HardwareTerminalState } from './useHardwareKeyboard';

// The now-playing widget is parked until the music player ships. Flip this to bring it back.
const SHOW_NOW_PLAYING: boolean = false;

interface PhoneScreenNavigation {
  activeApp: AppId | null;
  highlightedIndex: number | null;
  terminal: HardwareTerminalState;
  bus: InputBus;
  openApp: (app: AppId) => void;
  goHome: () => void;
  closeTerminal: () => void;
  focused?: boolean;
  needsRotate?: boolean;
  transitioning?: boolean;
  boot?: BootState;
  bootReducedMotion?: boolean;
  onBootStart?: () => void;
  onBootCard?: () => void;
}

const noop = () => undefined;

interface PhoneScreenProps { ready: boolean; navigation?: PhoneScreenNavigation; }

export function PhoneScreen({ ready, navigation }: PhoneScreenProps) {
  const [internalActiveApp, setInternalActiveApp] = useState<AppId | null>(null);
  const [internalBus] = useState(createInputBus);
  const activeApp = navigation ? navigation.activeApp : internalActiveApp;
  const openApp = navigation ? navigation.openApp : setInternalActiveApp;
  const home = navigation ? navigation.goHome : () => setInternalActiveApp(null);
  const bus = navigation ? navigation.bus : internalBus;
  const app = activeApp ? appById.get(activeApp) : undefined;
  useEffect(() => {
    if (navigation) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setInternalActiveApp(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigation]);

  return <div className="screen-viewport">
    <LockScreen on={!ready}/>
    <div className={`phone-os ${ready ? 'is-ready' : ''}`} style={{ backgroundImage: `url(${portfolio.wallpaperPath})` }}>
      <header className="status-bar"><span><i className="signal-bars"/>{portfolio.statusName}</span><span><Wifi size={11}/><time>10:21</time><i className="battery"/></span></header>
      <main className={`screen-content ${app ? 'has-app' : ''}`}>
        {!app ? <HomeScreen openApp={openApp} highlightedIndex={navigation?.highlightedIndex ?? null}/> : <AppHost key={app.id} app={app} bus={bus} close={home} focused={navigation?.focused ?? false} paused={(navigation?.needsRotate ?? false) || (navigation?.transitioning ?? false)}/>}
        {app && navigation?.needsRotate && <RotatePrompt appLabel={app.label}/>}
      </main>
      {app && <nav className="screen-nav" aria-label="Phone navigation"><button onClick={home} aria-label="Back to phone home"><ChevronLeft/><span>Back</span></button><b>{app.label}</b><button onClick={home} aria-label="Phone home"><Home/><span>Home</span></button></nav>}
      {navigation && <HardwareTerminal terminal={navigation.terminal} onClose={navigation.closeTerminal}/>}
    </div>
    {navigation?.boot && navigation.boot !== 'off' && <BootSequence active={navigation.boot === 'playing'} reducedMotion={navigation.bootReducedMotion ?? false} onStart={navigation.onBootStart ?? noop} onCard={navigation.onBootCard ?? noop}/>}
  </div>;
}

function HomeScreen({ openApp, highlightedIndex }: { openApp: (app: AppId) => void; highlightedIndex: number | null }) {
  return <div className="home-screen">
    <div className="app-grid">
      {homeApps.map((app, index) => <AppIcon key={app.id} label={app.label} icon={app.icon} tone={app.tone} highlighted={highlightedIndex === index} onClick={() => openApp(app.id)}/>)}
    </div>
    {SHOW_NOW_PLAYING && <button className="music-widget" onClick={() => openApp('music')} aria-label={`Open music player: ${portfolio.music.title}`}><span className="disc"><i/></span><span><b>{portfolio.music.title}</b><small>{portfolio.music.artist}</small></span><span className="playing-bars" aria-hidden="true"><i/><i/><i/></span></button>}
    <span className="page-dots" aria-hidden="true"><i className="active"/><i/></span>
    <div className="dock" aria-label="Shortcuts"><DockButton label="Open GitHub" icon={Github} onClick={() => window.open(portfolio.social.github, '_blank', 'noopener,noreferrer')}/><DockButton label="Open LinkedIn" icon={Linkedin} onClick={() => window.open(portfolio.social.linkedin, '_blank', 'noopener,noreferrer')}/><DockButton label="Email Asmit" icon={Mail} onClick={() => { window.location.href = `mailto:${portfolio.email}`; }}/></div>
  </div>;
}
