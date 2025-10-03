// src/components/Modal.tsx
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  hideClose?: boolean;
};

export default function Modal({ open, onClose, title, children, hideClose }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (!hideClose && e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, hideClose]);

  if (!open) return null;

  // z-index máximo 32-bit
  const Z = 2147483647;

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: Z,
  };

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    backdropFilter: "blur(4px)",
  };

  const panelStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: 900,
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,.25)",
    border: "1px solid rgba(0,0,0,.08)",
    padding: 20,
    zIndex: Z,
    maxHeight: "85vh",
    overflow: "hidden",
    display: "flex",          // 👈 NUEVO
    flexDirection: "column",  // 👈 NUEVO
    minHeight: 0,             // 👈 NUEVO (permite que hijos con overflow:auto se encojan)
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  };

  const closeBtnStyle: React.CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "4px 8px",
    background: "#fff",
    cursor: "pointer",
  };

  return createPortal(
    <div
      style={containerStyle}
      role="dialog"
      aria-modal="true"
    >
      {/* Clic en el overlay => cerrar (si no es obligatorio) */}
      <div
        style={overlayStyle}
        onMouseDown={() => { if (!hideClose) onClose(); }}
      />
      {/* Clic dentro del panel NO cierra */}
      <div
        style={panelStyle}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || !hideClose) && (
          <div style={headerStyle}>
            <div style={{ fontWeight: 600 }}>{title}</div>
            {!hideClose && (
              <button
                type="button"
                style={closeBtnStyle}
                onClick={onClose}
              >
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
