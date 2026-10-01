import { forwardRef, useRef, useState } from 'react';
import { appById } from '../../apps/registry';
import type { AppId } from '../../apps/types';
import { DeviceBase, GroundShadow } from './DeviceBase';
import { DisplayAssembly } from './DisplayAssembly';
import { HardwareControlsOverlay } from './HardwareControlsOverlay';
import { useFocusMode } from './useFocusMode';
import { useLandscapePhone } from './useLandscapePhone';
import { useHardwareKeyboard } from './useHardwareKeyboard';

export type IntroPhase = 'closed' | 'wake' | 'swivel' | 'mid-swivel' | 'enter' | 'open';

export type BootState = 'off' | 'pending' | 'playing';

interface PhoneDeviceProps {
  ready: boolean;
  booting: boolean;
  phase: IntroPhase;
  onOpenRequest: () => void;
  boot: BootState;
  bootReducedMotion: boolean;
  onBootSkip: () => void;
  onBootFinish: () => void;
  onReboot: () => void;
}

export const PhoneDevice = forwardRef<HTMLDivElement, PhoneDeviceProps>(function PhoneDevice({ ready, booting, phase, onOpenRequest, boot, bootReducedMotion, onBootSkip, onBootFinish, onReboot }, ref) {
  const compareDevice = import.meta.env.DEV && new URLSearchParams(window.location.search).get('compareDevice') === '1';
  const showKeyMap = import.meta.env.DEV && new URLSearchParams(window.location.search).get('showKeyMap') === '1';
  const comparisonReference = import.meta.env.DEV ? '/src/assets/device/source/sidekickI.png' : '';
  const [activeApp, setActiveApp] = useState<AppId | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const hardwareEnabled = phase === 'open';
  const shellRef = useRef<HTMLDivElement>(null);
  const app = activeApp ? appById.get(activeApp) : undefined;
  const presentation = app?.presentation ?? 'read';
  const { focused, requestHome: goHome } = useFocusMode({ shellRef, enabled: hardwareEnabled, activeApp, presentation, closeApp: () => setActiveApp(null) });
  const hardware = useHardwareKeyboard({
    enabled: hardwareEnabled,
    activeApp,
    openApp: setActiveApp,
    goHome,
    highlightedIndex,
    setHighlightedIndex,
    bootActive: boot !== 'off',
    onBootSkip,
    onReboot,
  });

  const sideways = useLandscapePhone();
  // A game on a sideways phone has no room for its field and keyboard, so it waits behind a rotate prompt.
  const needsRotate = focused && presentation === 'play' && sideways;
  return <div className="device-stage" ref={ref} data-ready={ready} data-phase={phase} data-presentation={presentation} data-has-app={activeApp ? 'true' : 'false'}>
    <GroundShadow/>
    <section className="phone" aria-label="Interactive Sidekick-inspired portfolio device">
      <DeviceBase/>
      <DisplayAssembly
        ready={ready}
        booting={booting}
        activeApp={activeApp}
        focused={focused}
        needsRotate={needsRotate}
        touchKeys={focused && presentation === 'play' && !needsRotate ? {
          dpad: app?.touchDpad ?? true,
          pressedIds: hardware.pressedIds,
          onActivate: hardware.activateControl,
          onPress: hardware.pressControl,
          onRelease: hardware.releaseControl,
        } : null}
        shellRef={shellRef}
        highlightedIndex={highlightedIndex}
        terminal={hardware.terminal}
        bus={hardware.bus}
        openApp={hardware.openApp}
        goHome={goHome}
        closeTerminal={hardware.closeTerminal}
        lidOpenable={phase === 'closed' || phase === 'wake'}
        onOpenRequest={onOpenRequest}
        boot={boot}
        bootReducedMotion={bootReducedMotion}
        onBootSkip={onBootSkip}
        onBootFinish={onBootFinish}
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
