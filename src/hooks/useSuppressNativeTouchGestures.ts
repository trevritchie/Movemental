/**
 * Suppress mobile browser long-press UI (text loupe, context menus).
 *
 * React synthetic touch handlers are passive, so preventDefault() there is
 * ignored. Register native listeners with { passive: false, capture: true }.
 */
import { useEffect, type RefObject } from 'react';

const INTERACTIVE_SELECTOR = 'button, select, a, input, textarea';

export function isInteractiveOverlayControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    !!target.closest(INTERACTIVE_SELECTOR)
  );
}

function shouldSuppressGesture(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if (!target.closest('.diagram-container')) {
    return false;
  }
  return !isInteractiveOverlayControl(target);
}

function absorbTouchEvent(event: Event): void {
  if (!shouldSuppressGesture(event.target)) {
    return;
  }
  event.preventDefault();
}

export function useSuppressNativeTouchGestures(
  containerRef: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const touchOptions: AddEventListenerOptions = {
      passive: false,
      capture: true,
    };

    const touchEvents = [
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel',
    ] as const;

    for (const type of touchEvents) {
      container.addEventListener(type, absorbTouchEvent, touchOptions);
    }

    container.addEventListener('contextmenu', absorbTouchEvent, {
      capture: true,
    });
    container.addEventListener('selectstart', absorbTouchEvent, {
      capture: true,
    });

    return () => {
      for (const type of touchEvents) {
        container.removeEventListener(type, absorbTouchEvent, touchOptions);
      }
      container.removeEventListener('contextmenu', absorbTouchEvent, {
        capture: true,
      });
      container.removeEventListener('selectstart', absorbTouchEvent, {
        capture: true,
      });
    };
  }, [containerRef]);
}
