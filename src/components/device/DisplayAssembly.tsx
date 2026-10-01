import type { RefObject } from 'react';
import { PhoneScreen } from './PhoneScreen';
import type { BootState } from './PhoneDevice';
import { TouchKeyboard, type TouchKeyboardProps } from './TouchKeyboard';
import type { AppId } from '../../apps/types';
import type { InputBus } from '../../input/inputBus';
import type { HardwareTerminalState } from './useHardwareKeyboard';

const GENERATED_ROOT = '/assets/device/generated';

interface DisplayAssemblyProps {
  ready: boolean;
  booting: boolean;
  activeApp: AppId | null;
  focused: boolean;
  needsRotate: boolean;
  /** On-screen keys for games in focus mode. Null when the app does not need them. */
  touchKeys: TouchKeyboardProps | null;
  shellRef: RefObject<HTMLDivElement | null>;
  bus: InputBus;
  highlightedIndex: number | null;
  terminal: HardwareTerminalState;
  openApp: (app: AppId) => void;
  goHome: () => void;
  closeTerminal: () => void;
  /** The lid is shut and awake, so a keyboard user can open it. */
  lidOpenable: boolean;
  onOpenRequest: () => void;
  boot: BootState;
  bootReducedMotion: boolean;
  onBootSkip: () => void;
  onBootFinish: () => void;
}

export function DisplayAssembly({ ready, booting, activeApp, focused, needsRotate, touchKeys, shellRef, highlightedIndex, terminal, bus, openApp, goHome, closeTerminal, lidOpenable, onOpenRequest, boot, bootReducedMotion, onBootSkip, onBootFinish }: DisplayAssemblyProps) {
  return <>
    <div className="contact-shadow" aria-hidden="true"/>
    <div className="motion-ghost" aria-hidden="true">
      <img src={`${GENERATED_ROOT}/display-front-frame.png`} alt="" draggable={false}/>
    </div>
    <div className="swivel-shadow-clip" aria-hidden="true">
      <div className="swivel-shadow">
        <i className="swivel-shadow__layer swivel-shadow__layer--tight"/>
        <i className="swivel-shadow__layer swivel-shadow__layer--soft"/>
      </div>
    </div>
    <div className="display-assembly">
      <div className="display-back" aria-hidden="true">
        <img src={`${GENERATED_ROOT}/display-back-closed.png`} alt="" draggable={false}/>
        <span className="back-wake-glow"/>
        <span className="notification-led"/>
      </div>
      <div className="display-front-face">
        <span className="lid-grip" aria-hidden="true"/>
        <div className="screen-shell" ref={shellRef}>
          <PhoneScreen ready={ready} booting={booting} navigation={{ activeApp, focused, needsRotate, highlightedIndex, terminal, bus, openApp, goHome, closeTerminal, boot, bootReducedMotion, onBootSkip, onBootFinish }}/>
          {touchKeys && <TouchKeyboard {...touchKeys}/>}
          <div className="glass-reflection" aria-hidden="true"/>
          <div className="glass-glare" aria-hidden="true"><i/></div>
        </div>
        <img className="display-front-frame" src={`${GENERATED_ROOT}/display-front-frame.png`} alt="" aria-hidden="true" draggable={false}/>
      </div>
      {lidOpenable && <button type="button" className="lid-open" aria-label="Open the device" onClick={onOpenRequest}/>}
    </div>
  </>;
}
