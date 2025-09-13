// @ts-nocheck
import React, { useState } from "react";
import { VAT_RATES } from "../utils";

/**
 * Props:
 * - doc, setDoc
 * - products: [{id, ref?, name, desc?, price, vat}]
 * - onSaveProduct(product) -> persiste en catálogo (Drive)
 *
 * Cada línea ahora tiene: productId, name, desc, qty, price, dtopct, vat, irpfpct
 */
export default function LinesEditor({
  doc,
  setDoc,
  products = [],
  onSaveProduct,
}) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDraft, setQuickDraft] = useState(null); // {ref,name,desc,price,vat}

  function addLine() {
    setDoc({
      ...doc,
      lines: [
        ...(doc.lines || []),
        {
          id: `L${(doc.lines?.length || 0) + 1}`,
          productId: "",
          name: "",
          desc: "",
          qty: 1,
          price: 0,
          dtopct: 0,
          vat: "iva21",
          irpfpct: 0,
        },
      ],
    });
  }

  function update(idx, key, val) {
    const lines = doc.lines.map((l, i) => (i === idx ? { ...l, [key]: val } : l));
    setDoc({ ...doc, lines });
  }

  function applyProductToLine(idx, productId) {
    const p = products.find((x) => x.id === productId);
    const lines = doc.lines.map((l, i) =>
      i === idx
        ? {
            ...l,
            productId,
            name: p ? p.name : l.name,
            desc: p ? (p.desc || "") : l.desc, // ← ahora también descripción
            price: p ? p.price : l.price,
            vat: p ? p.vat : l.vat,
          }
        : l
    );
    setDoc({ ...doc, lines });
  }

  function remove(idx) {
    const lines = doc.lines.filter((_, i) => i !== idx);
    setDoc({ ...doc, lines });
  }

  function openQuickCreateFromLine(l) {
    setQuickDraft({
      ref: l.productId || "",
      name: l.name || "",
      desc: l.desc || "",
      price: l.price || 0,
      vat: l.vat || "iva21",
    });
    setQuickOpen(true);
  }

  function confirmQuickCreate() {
    if (!onSaveProduct) return setQuickOpen(false);
    const base = (quickDraft?.name || "").trim();
    if (!base) return alert("Pon al menos un nombre para el producto.");
    const prod = {
      id: quickDraft.ref?.trim() || `P${Date.now()}`,
      ref: quickDraft.ref?.trim() || "",
      name: quickDraft.name.trim(),
      desc: (quickDraft.desc || "").trim(), // ← guardar descripción
      price: Number(quickDraft.price || 0),
      vat: quickDraft.vat || "iva21",
    };
    onSaveProduct(prod); // el padre persiste (Drive)
    setQuickOpen(false);
  }

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">Líneas</h4>
        <button className="px-3 py-1.5 rounded border" onClick={addLine}>
          + Línea
        </button>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Producto</th>
            <th className="p-2 text-left">Nombre</th>
            <th className="p-2 text-left">Descripción</th>
            <th className="p-2 text-right">Ud.</th>
            <th className="p-2 text-right">Precio</th>
            <th className="p-2 text-right">Dto.%</th>
            <th className="p-2 text-right">IVA</th>
            <th className="p-2 text-right">IRPF</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {(doc.lines || []).map((l, idx) => (
            <tr key={l.id || idx} className="border-t">
              {/* Producto catálogo */}
              <td className="p-2">
                <div className="flex items-center gap-1">
                  <select
                    className="border rounded p-1 w-44"
                    value={l.productId || ""}
                    onChange={(e) => applyProductToLine(idx, e.target.value)}
                  >
                    <option value="">— (manual)</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.ref ? `${p.ref} · ` : ""}
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {/* Guardar como producto (rápido) */}
                  <button
                    title="Guardar esta línea como producto"
                    className="px-2 py-1 rounded border"
                    onClick={() => openQuickCreateFromLine(l)}
                  >
                    💾
                  </button>
                </div>
              </td>

              {/* Nombre */}
              <td className="p-2">
                <input
                  className="w-full border rounded p-1"
                  placeholder="Nombre del producto/servicio"
                  value={l.name || ""}
                  onChange={(e) => update(idx, "name", e.target.value)}
                />
              </td>

              {/* Descripción (multilínea) */}
              <td className="p-2">
                <textarea
                  rows={2}
                  className="w-full border rounded p-1"
                  placeholder="Descripción (ej. viajes por días)"
                  value={l.desc || ""}
                  onChange={(e) => update(idx, "desc", e.target.value)}
                />
              </td>

              {/* Cantidad */}
              <td className="p-2 text-right">
                <input
                  type="number"
                  className="w-20 border rounded p-1 text-right"
                  value={l.qty}
                  min={0}
                  step="0.01"
                  onChange={(e) => update(idx, "qty", Number(e.target.value))}
                />
              </td>

              {/* Precio */}
              <td className="p-2 text-right">
                <input
                  type="number"
                  className="w-24 border rounded p-1 text-right"
                  value={l.price}
                  step="0.01"
                  onChange={(e) => update(idx, "price", Number(e.target.value))}
                />
              </td>

              {/* Descuento */}
              <td className="p-2 text-right">
                <input
                  type="number"
                  className="w-16 border rounded p-1 text-right"
                  value={l.dtopct || 0}
                  step="0.01"
                  onChange={(e) => update(idx, "dtopct", Number(e.target.value))}
                />
              </td>

              {/* IVA */}
              <td className="p-2 text-right">
                <select
                  className="border rounded p-1"
                  value={l.vat}
                  onChange={(e) => update(idx, "vat", e.target.value)}
                >
                  {VAT_RATES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </td>

              {/* IRPF */}
              <td className="p-2 text-right">
                <input
                  type="number"
                  className="w-16 border rounded p-1 text-right"
                  value={l.irpfpct || 0}
                  step="0.01"
                  onChange={(e) => update(idx, "irpfpct", Number(e.target.value))}
                />
              </td>

              {/* Acciones */}
              <td className="p-2 text-right">
                <button className="px-2 py-1 rounded border" onClick={() => remove(idx)}>
                  ✕
                </button>
              </td>
            </tr>
          ))}

          {(!doc.lines || doc.lines.length === 0) && (
            <tr>
              <td className="p-3 text-center text-gray-500" colSpan={9}>
                Sin líneas — pulsa <b>+ Línea</b> para añadir una.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Mini-modal: Crear producto rápido */}
      {quickOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-4 w-[480px]">
            <h4 className="font-semibold mb-2">Guardar como producto</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="col-span-2">
                <label className="text-gray-600 text-xs">Referencia (opcional)</label>
                <input
                  className="w-full border rounded p-2"
                  value={quickDraft?.ref || ""}
                  onChange={(e) =>
                    setQuickDraft((q) => ({ ...q, ref: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-600 text-xs">Nombre</label>
                <input
                  className="w-full border rounded p-2"
                  value={quickDraft?.name || ""}
                  onChange={(e) =>
                    setQuickDraft((q) => ({ ...q, name: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-600 text-xs">Descripción</label>
                <textarea
                  rows={3}
                  className="w-full border rounded p-2"
                  value={quickDraft?.desc || ""}
                  onChange={(e) =>
                    setQuickDraft((q) => ({ ...q, desc: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-gray-600 text-xs">Precio</label>
                <input
                  type="number"
                  className="w-full border rounded p-2 text-right"
                  value={quickDraft?.price || 0}
                  step="0.01"
                  onChange={(e) =>
                    setQuickDraft((q) => ({ ...q, price: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="text-gray-600 text-xs">IVA</label>
                <select
                  className="w-full border rounded p-2"
                  value={quickDraft?.vat || "iva21"}
                  onChange={(e) =>
                    setQuickDraft((q) => ({ ...q, vat: e.target.value }))
                  }
                >
                  {VAT_RATES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-2 rounded border" onClick={() => setQuickOpen(false)}>
                Cancelar
              </button>
              <button className="px-3 py-2 rounded bg-black text-white" onClick={confirmQuickCreate}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
