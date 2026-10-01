import type { LucideIcon } from 'lucide-react';

interface AppIconProps {
  label: string;
  icon: LucideIcon;
  tone: string;
  onClick: () => void;
}

export function AppIcon({ label, icon: Icon, tone, onClick }: AppIconProps) {
  return (
    <button className="app-icon" onClick={onClick} aria-label={`Open ${label}`}>
      <span className="app-icon__tile" style={{ '--icon-tone': tone } as React.CSSProperties}>
        <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span>{label}</span>
    </button>
  );
}
