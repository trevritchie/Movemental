/**
 * Settings flyout open state and focus management for the gear trigger.
 */
import { useCallback, useId, useRef, useState } from 'react';

export function useSettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [openToHelp, setOpenToHelp] = useState(false);
  const [shouldMountModal, setShouldMountModal] = useState(false);
  const openToHelpRef = useRef(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const openMenu = useCallback(() => {
    setShouldMountModal(true);
    openToHelpRef.current = false;
    setOpenToHelp(false);
    setIsOpen(true);
  }, []);

  const openHelp = useCallback(() => {
    setShouldMountModal(true);
    openToHelpRef.current = true;
    setOpenToHelp(true);
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    const wasHelp = openToHelpRef.current;
    openToHelpRef.current = false;
    setOpenToHelp(false);
    setIsOpen(false);
    if (wasHelp) {
      helpTriggerRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, []);

  return {
    isOpen,
    openToHelp,
    shouldMountModal,
    menuId,
    triggerRef,
    helpTriggerRef,
    modalRef,
    openMenu,
    openHelp,
    closeMenu,
  };
};
