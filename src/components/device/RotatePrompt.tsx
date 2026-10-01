import { Smartphone } from 'lucide-react';

/** Shown over a paused game when a phone is held sideways and there is no room for the play field and keyboard. */
export function RotatePrompt({ appLabel }: { appLabel: string }) {
  return <div className="rotate-prompt" role="status">
    <Smartphone className="rotate-prompt__icon" aria-hidden="true"/>
    <h2>Rotate to portrait to play</h2>
    <p>{appLabel} is paused and will pick up where you left off.</p>
  </div>;
}
