/**
 * Whether the page is in a state where incidental UI (e.g. borrowing sliders)
 * should trigger live audio preview.
 */
export function isPageInteractiveForAudio(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }
  return document.visibilityState === 'visible';
}
