import { useEffect, useState } from 'react';
import type { InputBus } from '../input/inputBus';
import type { AppDefinition } from './types';

interface AppHostProps { app: AppDefinition; bus: InputBus; close: () => void; }

/** Renders one app inside the screen bounds and drives its lifecycle. */
export function AppHost({ app, bus, close }: AppHostProps) {
  const [paused, setPaused] = useState(() => document.hidden);
  const Component = app.component;

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    app.onOpen?.();
    return () => {
      app.onClose?.();
      bus.reset();
    };
  }, [app, bus]);

  return <div className="app-host" data-app={app.id}><Component input={bus.input} paused={paused} close={close}/></div>;
}
