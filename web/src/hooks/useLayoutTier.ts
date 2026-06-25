/**
 * Reactive layout tier (phone, tablet, desktop) from breakpoints.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  createElement,
  type ReactNode,
} from 'react';
import { resolveLayoutTier, type LayoutTier } from '../layout/breakpoints';

const LayoutTierContext = createContext<LayoutTier>('desktop');

export function LayoutTierProvider({ children }: { children: ReactNode }) {
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

  return createElement(LayoutTierContext.Provider, { value: tier }, children);
}

export function useLayoutTier(): LayoutTier {
  return useContext(LayoutTierContext);
}
