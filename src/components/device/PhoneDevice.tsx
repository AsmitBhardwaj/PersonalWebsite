import { forwardRef, useState } from 'react';
import type { AppId } from '../../apps/types';
import { DeviceBase, GroundShadow } from './DeviceBase';
import { DisplayAssembly } from './DisplayAssembly';
import { HardwareControlsOverlay } from './HardwareControlsOverlay';
import { useHardwareKeyboard } from './useHardwareKeyboard';

export type IntroPhase = 'closed' | 'wake' | 'swivel' | 'mid-swivel' | 'enter' | 'open';

interface PhoneDeviceProps { ready: boolean; booting: boolean; phase: IntroPhase; }

export const PhoneDevice = forwardRef<HTMLDivElement, PhoneDeviceProps>(function PhoneDevice({ ready, booting, phase }, ref) {
  const compareDevice = import.meta.env.DEV && new URLSearchParams(window.location.search).get('compareDevice') === '1';
  const showKeyMap = import.meta.env.DEV && new URLSearchParams(window.location.search).get('showKeyMap') === '1';
  const comparisonReference = import.meta.env.DEV ? '/src/assets/device/source/sidekickI.png' : '';
  const [activeApp, setActiveApp] = useState<AppId | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const hardwareEnabled = phase === 'open';
  const goHome = () => setActiveApp(null);
  const hardware = useHardwareKeyboard({
    enabled: hardwareEnabled,
    activeApp,
    openApp: setActiveApp,
    goHome,
    highlightedIndex,
    setHighlightedIndex,
  });

  return <div className="device-stage" ref={ref} data-ready={ready} data-phase={phase}>
    <GroundShadow/>
    <section className="phone" aria-label="Interactive Sidekick-inspired portfolio device">
      <DeviceBase/>
      <DisplayAssembly
        ready={ready}
        booting={booting}
        activeApp={activeApp}
        highlightedIndex={highlightedIndex}
        terminal={hardware.terminal}
        bus={hardware.bus}
        openApp={hardware.openApp}
        goHome={goHome}
        closeTerminal={hardware.closeTerminal}
      />
    </section>
    <HardwareControlsOverlay
      enabled={hardwareEnabled}
      debug={showKeyMap}
      pressedIds={hardware.pressedIds}
      onActivate={hardware.activateControl}
      onPress={hardware.pressControl}
      onRelease={hardware.releaseControl}
    />
    {compareDevice && <img className="reference-overlay" src={comparisonReference} alt="" aria-hidden="true" draggable={false}/>}
  </div>;
});
