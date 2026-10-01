import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { AppInput } from '../input/inputBus';

export type AppId = string;

export interface AppProps {
  /** Key events routed to this app while it is open. Only the open app receives input. */
  input: AppInput;
  /** True while the page is hidden. Games should pause timers and animation frames. */
  paused: boolean;
  /**
   * True while the screen fills the viewport (small screens). The play field or layout area changes size on
   * entering and exiting, so games should size from their container, not from constants.
   */
  focused: boolean;
  /** Close this app and return to the home screen. */
  close: () => void;
}

export interface AppDefinition {
  id: AppId;
  label: string;
  icon: LucideIcon;
  /** Home screen icon tile colour. */
  tone: string;
  component: ComponentType<AppProps>;
  /**
   * How the app opens on small and large screens.
   * 'read': focus mode on phones/tablets, a camera zoom into the screen on desktop.
   * 'play': stays in-device on desktop so the keyboard stays visible; focus mode with an on-screen keyboard on phones/tablets.
   */
  presentation: 'read' | 'play';
  /** 'play' apps on phones/tablets: show the arrow-key strip above the keyboard. Defaults to true. */
  touchDpad?: boolean;
  /** Not shown on the home screen or reachable from the terminal, but can still be opened by id. */
  hidden?: boolean;
  /** Extra terminal command names that open this app. */
  aliases?: string[];
  /** Called when the app opens. Prefer effect cleanup inside the component for timers and frames. */
  onOpen?: () => void;
  /** Called when the app closes, before it unmounts. */
  onClose?: () => void;
}
