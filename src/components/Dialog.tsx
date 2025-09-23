// src/components/Dialog.tsx
// Modal con portal + overlay + bloqueo de scroll y z-index alto
import React, { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type Props = {
  open?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  hideClose?: boolean; // para modales “obligatorios”
};

export default function Dialog({
  open = true,
  onClose,
  title,
  children,
  hideClose,
}: Props) {
  // Cerrar con ESC
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && !hideClose) onClose();
  }, [onClose, hideClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onKeyDown]);

  if (!open) return null;

  // z-index altos para ir por encima de cualquier overlay (screen-blocker = 9999)
  const Z_OVERLAY = 10040;
  const Z_DIALOG = 10050;

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 flex items-start sm:items-center justify-center p-4"
      style={{ zIndex: Z_OVERLAY }}
      onMouseDown={(e) => {
        // Clic fuera del cuadro = cerrar (si no es obligatorio)
        if (e.target === e.currentTarget && !hideClose) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border p-5"
        style={{ zIndex: Z_DIALOG }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          {!hideClose && (
            <button
              className="px-2 py-1 rounded border"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
