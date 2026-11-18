"use client";

import { useEffect } from "react";

export type ToastData = { id: number; text: string };

/** Aviso pequeno no rodapé da tela, que some sozinho depois de alguns segundos. */
export default function Toast({ toast, onDone, duration = 2600 }: { toast: ToastData | null; onDone: () => void; duration?: number }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [toast, onDone, duration]);

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className="toast">
          <span className="toast-icon" aria-hidden>✓</span>
          <span className="toast-text">{toast.text}</span>
        </div>
      )}
    </div>
  );
}
