import { useEffect } from 'react';

const SCROLL_LOCK_CLASS = 'scroll-locked';

/**
 * Prevent the document from scrolling while a modal is open.
 *
 * iOS browsers (including Chrome) can still rubber-band the page behind a
 * fixed overlay unless overflow and touchmove are blocked explicitly.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    html.classList.add(SCROLL_LOCK_CLASS);
    body.classList.add(SCROLL_LOCK_CLASS);

    const preventBackgroundTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const modal = document.querySelector('.settings-modal');
      if (modal?.contains(target)) return;
      event.preventDefault();
    };

    document.addEventListener('touchmove', preventBackgroundTouchMove, {
      passive: false,
    });

    return () => {
      document.removeEventListener('touchmove', preventBackgroundTouchMove);
      html.classList.remove(SCROLL_LOCK_CLASS);
      body.classList.remove(SCROLL_LOCK_CLASS);
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
