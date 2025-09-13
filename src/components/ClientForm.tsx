// @ts-nocheck
import React from "react";
import { PAYMENT_METHODS } from "../utils";

export default function ClientForm({ draft, setDraft, onSave, onCancel }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
      <div className="col-span-2">
        <label className="block text-gray-600">Nombre / Razón social</label>
        <input className="w-full border rounded p-2" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}/>
      </div>
      <div>
        <label className="block text-gray-600">NIF / VAT</label>
        <input className="w-full border rounded p-2" value={draft.nif} onChange={(e) => setDraft({ ...draft, nif: e.target.value })}/>
      </div>
      <div>
        <label className="block text-gray-600">País</label>
        <input className="w-full border rounded p-2" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })}/>
      </div>
      <div className="col-span-2">
        <label className="block text-gray-600">Dirección fiscal</label>
        <input className="w-full border rounded p-2" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })}/>
      </div>
      <div>
        <label className="block text-gray-600">CP</label>
        <input className="w-full border rounded p-2" value={draft.postalCode} onChange={(e) => setDraft({ ...draft, postalCode: e.target.value })}/>
      </div>
      <div>
        <label className="block text-gray-600">Ciudad</label>
        <input className="w-full border rounded p-2" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })}/>
      </div>
      <div>
        <label className="block text-gray-600">Email</label>
        <input className="w-full border rounded p-2" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })}/>
      </div>
      <div>
        <label className="block text-gray-600">Teléfono</label>
        <input className="w-full border rounded p-2" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })}/>
      </div>

      <div className="col-span-2">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={!!draft.re} onChange={(e) => setDraft({ ...draft, re: e.target.checked })}/>
          Cliente en <b>Régimen de Recargo de Equivalencia</b>
        </label>
      </div>

      <div className="col-span-2">
        <label className="block text-gray-600">Dirección de entrega (opcional)</label>
        <input className="w-full border rounded p-2" value={draft.deliveryAddress || ""} onChange={(e) => setDraft({ ...draft, deliveryAddress: e.target.value })}/>
      </div>

      <div className="col-span-2">
        <label className="block text-gray-600">Forma de pago por defecto</label>
        <select className="w-full border rounded p-2" value={draft.defaultPayment || "CONTADO"} onChange={(e) => setDraft({ ...draft, defaultPayment: e.target.value })}>
          {PAYMENT_METHODS.map((pm) => (<option key={pm.code} value={pm.code}>{pm.name}</option>))}
        </select>
      </div>

      <div className="flex justify-end gap-2 col-span-2">
        <button className="px-3 py-2 rounded border" onClick={onCancel}>Cancelar</button>
        <button className="px-3 py-2 rounded bg-black text-white" onClick={onSave}>Guardar</button>
      </div>
    </div>
  );
}
