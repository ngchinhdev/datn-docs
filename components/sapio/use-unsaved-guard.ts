'use client';

import { useEffect, useRef } from 'react';

/**
 * Stops a page from being left with unsaved changes. Closing or reloading the tab gets the
 * browser's own prompt; a click on a link to another page calls `onBlocked` with its address, so
 * the page can ask first and then go there itself.
 */
export function useUnsavedGuard(dirty: boolean, onBlocked: (href: string) => void) {
  const blocked = useRef(onBlocked);
  blocked.current = onBlocked;

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    // Capture phase, so this runs before the router sees the click.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const anchor = (e.target as Element).closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank') return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      blocked.current(url.pathname + url.search + url.hash);
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);
}
