import type { LucideIcon } from 'lucide-react';

interface AppIconProps {
  label: string;
  icon: LucideIcon;
  tone: string;
  onClick: () => void;
  highlighted?: boolean;
}

export function AppIcon({ label, icon: Icon, tone, onClick, highlighted = false }: AppIconProps) {
  return (
    <button className={`app-icon${highlighted ? ' is-hardware-highlighted' : ''}`} onClick={onClick} aria-label={`Open ${label}`} aria-current={highlighted || undefined}>
      <span className="app-icon__tile" style={{ '--icon-tone': tone } as React.CSSProperties}>
        <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span>{label}</span>
    </button>
  );
}
