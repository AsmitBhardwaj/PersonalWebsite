import type { LucideIcon } from 'lucide-react';

export function DockButton({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return <button className="dock-button" onClick={onClick} aria-label={label} title={label}><Icon aria-hidden="true" /></button>;
}
