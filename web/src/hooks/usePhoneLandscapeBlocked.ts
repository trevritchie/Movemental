import { useEffect, useState } from 'react';
import {
  isPhoneLandscapeBlocked,
  PHONE_LANDSCAPE_BLOCK_MEDIA,
} from '../layout/breakpoints';

export function usePhoneLandscapeBlocked(): boolean {
  const [isBlocked, setIsBlocked] = useState(() => isPhoneLandscapeBlocked());

  useEffect(() => {
    const mediaQuery = window.matchMedia(PHONE_LANDSCAPE_BLOCK_MEDIA);
    const update = () => setIsBlocked(isPhoneLandscapeBlocked());    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isBlocked;
}
