import { useEffect, useRef } from 'react';

const MODAL_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

interface ModalSurfaceOptions {
  /** Sürekli mount kalan dialoglarda yalnız açıkken yaşam döngüsünü başlatır. */
  active?: boolean;
  /** `false` iken Escape yutulur ama dialog kapanmaz (ilk karşılama gibi). */
  closeOnEscape?: boolean;
}

/**
 * Özel çizilen sheet ve dialogları gerçek bir modal yüzey gibi davranmaya
 * zorlar. Açan denetime odağı geri verir; Escape, Tab tuzağı ve arka planın
 * erişilebilirlik ağacından çıkarılması tek yerde tutulur.
 */
export function useModalSurface<
  DialogElement extends HTMLElement = HTMLElement,
  InitialFocusElement extends HTMLElement = HTMLButtonElement,
>(
  onClose: () => void,
  { active = true, closeOnEscape = true }: ModalSurfaceOptions = {},
) {
  const dialogRef = useRef<DialogElement>(null);
  const initialFocusRef = useRef<InitialFocusElement>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  onCloseRef.current = onClose;
  closeOnEscapeRef.current = closeOnEscape;

  useEffect(() => {
    if (!active) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    initialFocusRef.current?.focus({ preventScroll: true });
    const restoreOutside = isolateModal(dialog);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (closeOnEscapeRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const stops = Array.from(
        dialog.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE),
      ).filter((element) => element.tabIndex >= 0 && !element.closest('[inert]'));

      if (stops.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const activeIndex = stops.indexOf(document.activeElement as HTMLElement);
      const target = event.shiftKey
        ? activeIndex <= 0 ? stops[stops.length - 1] : null
        : activeIndex === -1 || activeIndex === stops.length - 1 ? stops[0] : null;

      if (target) {
        event.preventDefault();
        event.stopPropagation();
        target.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      restoreOutside();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [active]);

  return { dialogRef, initialFocusRef };
}

export function isolateModal(dialog: HTMLElement): () => void {
  const changed: Array<{
    element: HTMLElement;
    inert: boolean;
    ariaHidden: string | null;
  }> = [];
  let branch: HTMLElement = dialog;

  while (branch.parentElement) {
    const parent = branch.parentElement;
    for (const sibling of parent.children) {
      if (sibling === branch || !(sibling instanceof HTMLElement)) continue;
      changed.push({
        element: sibling,
        inert: sibling.inert,
        ariaHidden: sibling.getAttribute('aria-hidden'),
      });
      sibling.inert = true;
      sibling.setAttribute('aria-hidden', 'true');
    }
    if (parent === document.body) break;
    branch = parent;
  }

  return () => {
    for (const { element, inert, ariaHidden } of changed.reverse()) {
      element.inert = inert;
      if (ariaHidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', ariaHidden);
    }
  };
}
