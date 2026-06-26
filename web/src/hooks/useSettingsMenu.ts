/**
 * Settings flyout open state and focus management for the gear trigger.
 */
import { useCallback, useId, useRef, useState } from 'react';

export function useSettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const openMenu = useCallback(() => setIsOpen(true), []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  return {
    isOpen,
    menuId,
    triggerRef,
    modalRef,
    openMenu,
    closeMenu,
  };
}
