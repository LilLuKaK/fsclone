// @ts-nocheck
import React, { useState } from "react";
import { SERIES, fmtDate, fmtMoney, computeTotals } from "../utils";
import Dialog from "../components/Dialog";
import LinesEditor from "../components/LinesEditor";

export default function AlbaranesPage({
  customers,
  albaranes,
  setAlbaranes,
  seqs,
  setSeqs,
  nextNumber,
  printAlbaran,
  emailAlbaran,
  products,
  onSaveProduct,
  loading
}) {
  const [filters, setFilters] = useState({ q: "", serie: "", from: "", to: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [expanded, setExpanded] = useState({}); // filas desplegadas

  const customerById = (id) => customers.find((c) => c.id === id);
  const matches = (a) => {
    const c = customerById(a.customerId);
    const text = `${c?.name || ""} ${c?.nif || ""}`.toLowerCase();
    if (filters.q && !text.includes(filters.q.toLowerCase())) return false;
    if (filters.serie && a.series !== filters.serie) return false;
    if (filters.from && a.date < filters.from) return false;
    if (filters.to && a.date > filters.to) return false;
    return true;
  };
  const rows = albaranes.filter(matches);

  /* ===== Crear / Editar ===== */
  function newDraft() {
    const today = new Date().toISOString().slice(0, 10);
    const c0 = customers[0] || {};
    return {
      id: `ALB-${Math.random().toString(36).slice(2, 8)}`,
      series: "A",
      number: null,
      date: today,         // emisión
      deliveryDate: today, // entrega
      customerId: c0.id || "",
      deliveryAddress: c0.deliveryAddress || c0.address || "",
      state: "nuevo",
      warehouseId: "MAD",
      lines: [],
      notes: "",
    };
  }

  function openCreate() {
    setDraft(newDraft());
    setCreateOpen(true);
  }

  function saveCreate() {
    // Numerar solo en creación
    const { next, seqs: nseqs } = nextNumber(seqs, draft.series, draft.date);
    const saved = { ...draft, number: next };
    setSeqs(nseqs);
    setAlbaranes((prev) => [saved, ...prev]);
    setCreateOpen(false);
  }

  function openEdit(doc) {
    setDraft({ ...doc }); // clonar para editar
    setEditOpen(true);
  }

  function saveEdit() {
    // Mantener el número existente
    setAlbaranes((prev) => prev.map((a) => (a.id === draft.id ? draft : a)));
    setEditOpen(false);
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="px-3 py-2 bg-emerald-600 text-white rounded-lg"
          onClick={openCreate}
          disabled={!customers.length}
          title={!customers.length ? "Crea un cliente primero" : ""}
        >
          Nuevo albarán
        </button>
        <input
          className="border rounded p-2"
          placeholder="Buscar por cliente/NIF"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select
          className="border rounded p-2"
          value={filters.serie}
          onChange={(e) => setFilters({ ...filters, serie: e.target.value })}
        >
          <option value="">Serie (todas)</option>
          {SERIES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="border rounded p-2"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <input
          type="date"
          className="border rounded p-2"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
        <button
          className="px-3 py-2 border rounded"
          onClick={() => setFilters({ q: "", serie: "", from: "", to: "" })}
        >
          Limpiar
        </button>
      </div>

      <table className="w-full text-sm border mt-2">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2">Serie</th>
            <th className="p-2">Nº</th>
            <th className="p-2">Fecha</th>
            <th className="p-2">Cliente</th>
            <th className="p-2">Total</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows cols={6} rows={1} />
          ) : (
            <>
          {rows.map((a) => {
            const c = customerById(a.customerId);
            const t = computeTotals(a, c, { isInvoice: false });
            return (
              <React.Fragment key={a.id}>
                <tr className="border-t">
                  <td className="p-2">{a.series}</td>
                  <td className="p-2">{a.number}</td>
                  <td className="p-2">{fmtDate(a.date)}</td>
                  <td className="p-2">
                    {c?.name} <span className="text-gray-500">({c?.nif})</span>
                  </td>
                  <td className="p-2 text-right font-medium">
                    {fmtMoney(t.total)}
                  </td>
                  <td className="p-2 space-x-2">
                    <button
                      className="px-2 py-1 rounded border"
                      onClick={() =>
                        setExpanded((ex) => ({ ...ex, [a.id]: !ex[a.id] }))
                      }
                    >
                      {expanded[a.id] ? "⯅" : "⯆"}
                    </button>
                    <button
                      className="px-2 py-1 rounded border"
                      onClick={() => openEdit(a)}
                      title="Editar cabecera y líneas"
                    >
                      ✎
                    </button>
                    <button
                      className="px-2 py-1 rounded border"
                      onClick={() => printAlbaran(a)}
                    >
                      🖨️
                    </button>
                    <button
                      className="px-2 py-1 rounded border"
                      title="Enviar por email (PDF adjunto)"
                      onClick={() => emailAlbaran(a)}
                    >
                      ✉️
                    </button>
                  </td>
                </tr>

                {expanded[a.id] && (
                  <tr className="bg-gray-50">
                    <td colSpan={6} className="p-2">
                      {/* Resumen de líneas */}
                      <table className="w-full text-xs border">
                        <thead>
                          <tr>
                            <th className="p-1 text-left">Desc</th>
                            <th className="p-1">Ud.</th>
                            <th className="p-1">Precio</th>
                            <th className="p-1">Dto%</th>
                            <th className="p-1">IVA</th>
                            <th className="p-1">Total línea</th>
                          </tr>
                        </thead>
                        <tbody>
                          {a.lines.map((l, idx) => {
                            const lt = computeTotals(
                              { lines: [l] },
                              c,
                              { isInvoice: false }
                            );
                            return (
                              <tr key={idx}>
                                <td className="p-1 text-left">{l.desc}</td>
                                <td className="p-1 text-center">{l.qty}</td>
                                <td className="p-1 text-center">
                                  {fmtMoney(l.price)}
                                </td>
                                <td className="p-1 text-center">
                                  {l.dtopct || 0}
                                </td>
                                <td className="p-1 text-center">{l.vat}</td>
                                <td className="p-1 text-center">
                                  {fmtMoney(lt.total)}
                                </td>
                              </tr>
                            );
                          })}
                          {a.lines.length === 0 && (
                            <tr>
                              <td
                                colSpan={6}
                                className="p-1 text-center text-gray-500"
                              >
                                Sin líneas
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Resumen de cabecera */}
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="border rounded p-2">
                          <b>Entrega</b>
                          <div>Fecha entrega: {fmtDate(a.deliveryDate)}</div>
                          <div>Dirección: {a.deliveryAddress || "-"}</div>
                        </div>
                        <div className="border rounded p-2">
                          <b>Notas</b>
                          <div className="text-gray-600">
                            {a.notes || <i>—</i>}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td className="p-2 text-center" colSpan={6}>
                No hay albaranes
              </td>
            </tr>
          )}
              {rows.length === 0 && (
                <tr><td className="p-2 text-center" colSpan={6}>No hay albaranes</td></tr>
              )}
            </>
          )}
        </tbody>
      </table>

      {/* Crear (cabecera + líneas) */}
      {createOpen && draft && (
        <Dialog title="Nuevo albarán" onClose={() => setCreateOpen(false)}>
          <AlbHeader draft={draft} setDraft={setDraft} customers={customers} />
          <LinesEditor
            doc={draft}
            setDoc={setDraft}
            products={products}
            onSaveProduct={onSaveProduct}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              className="px-3 py-2 rounded border"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="px-3 py-2 rounded bg-black text-white"
              onClick={saveCreate}
            >
              Guardar
            </button>
          </div>
        </Dialog>
      )}

      {/* Editar (cabecera + líneas) */}
      {editOpen && draft && (
        <Dialog title="Editar albarán" onClose={() => setEditOpen(false)}>
          <AlbHeader draft={draft} setDraft={setDraft} customers={customers} />
          <LinesEditor
            doc={draft}
            setDoc={setDraft}
            products={products}
            onSaveProduct={onSaveProduct}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              className="px-3 py-2 rounded border"
              onClick={() => setEditOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="px-3 py-2 rounded bg-black text-white"
              onClick={saveEdit}
            >
              Guardar cambios
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}

/* ===== Subformulario cabecera Albarán ===== */
function AlbHeader({ draft, setDraft, customers }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
      <div>
        <label className="block text-gray-600">Serie</label>
        <select
          value={draft.series}
          onChange={(e) => setDraft({ ...draft, series: e.target.value })}
          className="w-full border rounded p-2"
        >
          {SERIES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-gray-600">Fecha emisión</label>
        <input
          type="date"
          value={draft.date}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="block text-gray-600">Fecha entrega</label>
        <input
          type="date"
          value={draft.deliveryDate}
          onChange={(e) =>
            setDraft({ ...draft, deliveryDate: e.target.value })
          }
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="block text-gray-600">Cliente</label>
        <select
          value={draft.customerId}
          onChange={(e) =>
            setDraft({ ...draft, customerId: e.target.value })
          }
          className="w-full border rounded p-2"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.nif})
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <label className="block text-gray-600">Dirección de entrega</label>
        <input
          className="w-full border rounded p-2"
          value={draft.deliveryAddress || ""}
          onChange={(e) =>
            setDraft({ ...draft, deliveryAddress: e.target.value })
          }
        />
      </div>
      <div className="col-span-2">
        <label className="block text-gray-600">Notas</label>
        <textarea
          className="w-full border rounded p-2"
          value={draft.notes || ""}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
      </div>
    </div>
  );
}

function SkeletonRows({ cols, rows=6 }){
  return (
    <>
      {Array.from({length:rows}).map((_,i)=>(
        <tr key={i} className="border-t">
          {Array.from({length:cols}).map((_,j)=>(
            <td key={j} className="p-2"><div className="skeleton h-4 w-full" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}