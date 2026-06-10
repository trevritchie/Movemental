import { useEffect, useState } from 'react';
import { resolveLayoutTier, type LayoutTier } from '../layout/breakpoints';

export function useLayoutTier(): LayoutTier {
  const [tier, setTier] = useState<LayoutTier>(() => resolveLayoutTier());

  useEffect(() => {
    const update = () => setTier(resolveLayoutTier());
    const mediaQueries = [
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(orientation: portrait)'),
    ];
    mediaQueries.forEach((mq) => mq.addEventListener('change', update));
    window.addEventListener('resize', update);

    return () => {
      mediaQueries.forEach((mq) =>
        mq.removeEventListener('change', update),
      );
      window.removeEventListener('resize', update);
    };
  }, []);

  return tier;
}
