import { useEffect, useState } from 'react';

/** A phone held sideways: wider than tall and under 480px of height. Tablets in landscape have room for games. */
export const LANDSCAPE_PHONE_QUERY = '(orientation: landscape) and (max-height: 480px)';

export function useLandscapePhone(): boolean {
  const [matches, setMatches] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia(LANDSCAPE_PHONE_QUERY).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(LANDSCAPE_PHONE_QUERY);
    const onChange = () => setMatches(query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return matches;
}
