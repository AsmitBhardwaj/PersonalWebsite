import { PhoneScreen } from './PhoneScreen';
import type { AppName } from '../apps/PhoneApps';
import type { HardwareTerminalState } from './useHardwareKeyboard';

const GENERATED_ROOT = '/assets/device/generated';

interface DisplayAssemblyProps {
  ready: boolean;
  booting: boolean;
  activeApp: AppName | null;
  highlightedIndex: number | null;
  terminal: HardwareTerminalState;
  openApp: (app: AppName) => void;
  goHome: () => void;
  closeTerminal: () => void;
}

export function DisplayAssembly({ ready, booting, activeApp, highlightedIndex, terminal, openApp, goHome, closeTerminal }: DisplayAssemblyProps) {
  return <>
    <div className="contact-shadow" aria-hidden="true"/>
    <div className="motion-ghost" aria-hidden="true">
      <img src={`${GENERATED_ROOT}/display-front-frame.png`} alt="" draggable={false}/>
    </div>
    <div className="display-assembly">
      <div className="display-back" aria-hidden="true">
        <img src={`${GENERATED_ROOT}/display-back-closed.png`} alt="" draggable={false}/>
        <span className="back-wake-glow"/>
        <span className="notification-led"/>
      </div>
      <div className="display-front-face">
        <div className="screen-shell">
          <PhoneScreen ready={ready} booting={booting} navigation={{ activeApp, highlightedIndex, terminal, openApp, goHome, closeTerminal }}/>
          <div className="glass-reflection" aria-hidden="true"/>
        </div>
        <img className="display-front-frame" src={`${GENERATED_ROOT}/display-front-frame.png`} alt="" aria-hidden="true" draggable={false}/>
      </div>
    </div>
  </>;
}
