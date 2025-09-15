// @ts-nocheck
import React from "react";

export default function ClientForm({ draft, setDraft }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <label className="col-span-2">
        <div className="text-gray-600 mb-1">Nombre / Razón social</div>
        <input className="w-full border rounded p-2"
          value={draft.name || ""}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}/>
      </label>

      <label>
        <div className="text-gray-600 mb-1">NIF / VAT</div>
        <input className="w-full border rounded p-2"
          value={draft.nif || ""}
          onChange={(e) => setDraft({ ...draft, nif: e.target.value })}/>
      </label>

      <label>
        <div className="text-gray-600 mb-1">País</div>
        <input className="w-full border rounded p-2"
          value={draft.country || ""}
          onChange={(e) => setDraft({ ...draft, country: e.target.value })}/>
      </label>

      <label className="col-span-2">
        <div className="text-gray-600 mb-1">Dirección fiscal</div>
        <input className="w-full border rounded p-2"
          value={draft.address || ""}
          onChange={(e) => setDraft({ ...draft, address: e.target.value })}/>
      </label>

      <label>
        <div className="text-gray-600 mb-1">CP</div>
        <input className="w-full border rounded p-2"
          value={draft.postalCode || ""}
          onChange={(e) => setDraft({ ...draft, postalCode: e.target.value })}/>
      </label>

      <label>
        <div className="text-gray-600 mb-1">Ciudad</div>
        <input className="w-full border rounded p-2"
          value={draft.city || ""}
          onChange={(e) => setDraft({ ...draft, city: e.target.value })}/>
      </label>

      <label>
        <div className="text-gray-600 mb-1">Email</div>
        <input className="w-full border rounded p-2"
          value={draft.email || ""}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}/>
      </label>

      <label>
        <div className="text-gray-600 mb-1">Teléfono</div>
        <input className="w-full border rounded p-2"
          value={draft.phone || ""}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}/>
      </label>

      <label className="col-span-2 inline-flex items-center gap-2">
        <input type="checkbox"
          checked={!!draft.re}
          onChange={(e) => setDraft({ ...draft, re: e.target.checked })}/>
        <span>Cliente en <b>Régimen de Recargo de Equivalencia</b></span>
      </label>

      <label>
        <div className="text-gray-600 mb-1">IRPF % (0 si no aplica)</div>
        <input type="number" step="0.01" className="w-full border rounded p-2"
          value={draft.irpfpct ?? 0}
          onChange={(e) => setDraft({ ...draft, irpfpct: Number(e.target.value) })}/>
      </label>

      <label className="col-span-2">
        <div className="text-gray-600 mb-1">Dirección de entrega (opcional)</div>
        <input className="w-full border rounded p-2"
          value={draft.deliveryAddress || ""}
          onChange={(e) => setDraft({ ...draft, deliveryAddress: e.target.value })}/>
      </label>

      <label className="col-span-2">
        <div className="text-gray-600 mb-1">Notas</div>
        <textarea rows={3} className="w-full border rounded p-2"
          value={draft.notes || ""}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}/>
      </label>
    </div>
  );
}
