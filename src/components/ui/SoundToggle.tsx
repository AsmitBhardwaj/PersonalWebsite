import { Volume2, VolumeX } from 'lucide-react';
import { setMuted, useMuted } from '../../audio/clack';

/** Mutes the device sounds. The choice is remembered in localStorage (see audio/clack.ts). */
export function SoundToggle() {
  const muted = useMuted();
  return <button
    type="button"
    className="sound-toggle"
    aria-pressed={muted}
    aria-label={muted ? 'Unmute device sounds' : 'Mute device sounds'}
    onClick={() => setMuted(!muted)}
  >
    {muted ? <VolumeX size={16} aria-hidden="true"/> : <Volume2 size={16} aria-hidden="true"/>}
  </button>;
}
