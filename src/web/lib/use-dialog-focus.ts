'use client';

import { useEffect, useRef } from 'react';

// Opening a dialog moves focus into it, and closing returns focus to whatever opened it. Done
// once here rather than per dialog, because the call site that forgets it is the one somebody
// navigating by keyboard falls out of (FR-158).
export function useDialogFocus<T extends HTMLElement>() {
  const dialog = useRef<T | null>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = dialog.current;

    const focusable = panel?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? panel)?.focus();

    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return dialog;
}
