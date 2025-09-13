// @ts-nocheck
import React from "react";

export default function Dialog({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-full max-w-3xl shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button className="px-2 py-1 rounded border" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
