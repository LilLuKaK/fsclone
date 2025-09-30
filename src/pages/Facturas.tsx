// @ts-nocheck
import React, { useState } from "react";
import { SERIES, fmtDate, fmtMoney, computeTotals } from "../utils";
import Dialog from "../components/Dialog";
import LinesEditor from "../components/LinesEditor";
import Modal from "../components/Modal";

export default function FacturasPage({
  customers,
  invoices,
  setInvoices,
  seqs,
  setSeqs,
  nextNumber,
  printFactura,
  emailFactura,
  products,
  onSaveProduct,
  loading
}) {
  const [filters, setFilters] = useState({ q: "", serie: "", from: "", to: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [expanded, setExpanded] = useState({}); // filas desplegadas
  const [createFacOpen, setCreateFacOpen] = useState(false);
  const [facDraft, setFacDraft] = useState<any>(null);

  function newFacturaDraft(){
    const today = new Date().toISOString().slice(0,10);
    return {
      id: `FAC-${Math.random().toString(36).slice(2,8)}`,
      series: "A", number: undefined,
      date: today, codpago: "CONTADO",
      isExempt: false, exemptNote: "",
      state: "emitida",
      customerId: customers[0]?.id || "",
      lines: [], notes: ""
    };
  }
  function openCreateFac(){ setFacDraft(newFacturaDraft()); setCreateFacOpen(true); }
  function saveCreateFac(){
    if (!facDraft?.customerId) return alert("Selecciona un cliente");
    const { seqs: s2, number } = nextNumber(seqs, "factura", facDraft.series || "A");
    setSeqs(s2);
    const ready = { ...facDraft, number };
    setInvoices((prev:any[]) => [ready, ...prev]);
    setCreateFacOpen(false);
  }

  const customerById = (id) => customers.find((c) => c.id === id);
  const matches = (f) => {
    const c = customerById(f.customerId);
    const text = `${c?.name || ""} ${c?.nif || ""}`.toLowerCase();
    if (filters.q && !text.includes(filters.q.toLowerCase())) return false;
    if (filters.serie && f.series !== filters.serie) return false;
    if (filters.from && f.date < filters.from) return false;
    if (filters.to && f.date > filters.to) return false;
    return true;
  };
  const rows = invoices.filter(matches);

  /* ===== Crear / Editar ===== */
  function newDraft() {
    const today = new Date().toISOString().slice(0, 10);
    const c0 = customers[0] || {};
    return {
      id: `FAC-${Math.random().toString(36).slice(2, 8)}`,
      series: "A",
      number: null,
      date: today,
      customerId: c0.id || "",
      codpago: c0.defaultPayment || "CONTADO",
      isExempt: false,
      exemptNote: "",
      state: "borrador",
      lines: [],
      notes: "",
    };
  }

  function openCreate() {
    setDraft(newDraft());
    setCreateOpen(true);
  }

  function saveCreate() {
    const { next, seqs: nseqs } = nextNumber(seqs, draft.series, draft.date);
    const numbered = { ...draft, number: next, state: "emitida" };
    setSeqs(nseqs);
    setInvoices((prev) => [numbered, ...prev]);
    setCreateOpen(false);
  }

  function openEdit(doc) {
    setDraft({ ...doc });
    setEditOpen(true);
  }

  function saveEdit() {
    setInvoices((prev) => prev.map((f) => (f.id === draft.id ? draft : f)));
    setEditOpen(false);
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="px-3 py-2 rounded-lg text-white"
          onClick={() => { setFacDraft(newFacturaDraft()); setCreateFacOpen(true); }}
        >
          Nueva factura
        </button>
        <input
          className="border rounded p-2 w-full sm:w-auto border rounded p-2"
          placeholder="Buscar por cliente/NIF"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select
          className="border rounded p-2 w-full sm:w-auto border rounded p-2"
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
          className="border rounded p-2 w-full sm:w-auto border rounded p-2"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <input
          type="date"
          className="border rounded p-2 w-full sm:w-auto border rounded p-2"
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

      <div className="overflow-x-auto rounded-lg border mt-2">
      <table className="min-w-[720px] w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2">Serie</th>
            <th className="p-2">Nº</th>
            <th className="p-2">Fecha</th>
            <th className="p-2">Cliente</th>
            <th className="p-2">Estado</th>
            <th className="p-2 text-right">Base</th>
            <th className="p-2 text-right">IVA</th>
            <th className="p-2 text-right">RE</th>
            <th className="p-2 text-right">Total</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows cols={10} rows={1} />
          ) : (
            <>
          {rows.map((f) => {
            const c = customerById(f.customerId);
            const t = computeTotals(f, c, { isInvoice: true });
            return (
              <React.Fragment key={f.id}>
                <tr className="border-t">
                  <td className="p-2">{f.series}</td>
                  <td className="p-2">
                    {f.number ?? <i className="text-gray-500">sin nº</i>}
                  </td>
                  <td className="p-2">{fmtDate(f.date)}</td>
                  <td className="p-2">
                    {c?.name} <span className="text-gray-500">({c?.nif})</span>
                  </td>
                  <td className="p-2">{f.state}</td>
                  <td className="p-2 text-right">{fmtMoney(t.neto)}</td>
                  <td className="p-2 text-right">{fmtMoney(t.totaliva)}</td>
                  <td className="p-2 text-right">{fmtMoney(t.totalre)}</td>
                  <td className="p-2 text-right font-medium">
                    {fmtMoney(t.total)}
                  </td>
                  <td className="p-2 space-x-2">
                    <button
                      className="px-2 py-1 rounded border"
                      onClick={() =>
                        setExpanded((ex) => ({ ...ex, [f.id]: !ex[f.id] }))
                      }
                    >
                      {expanded[f.id] ? "⯅" : "⯆"}
                    </button>
                    <button
                      className="px-2 py-1 rounded border"
                      onClick={() => openEdit(f)}
                      title="Editar cabecera y líneas"
                    >
                      ✎
                    </button>
                    <button
                      className="px-2 py-1 rounded border"
                      onClick={() => printFactura(f)}
                    >
                      🖨️
                    </button>
                    <button
                      className="px-2 py-1 rounded border"
                      title="Enviar por email (PDF adjunto)"
                      onClick={() => emailFactura(f)}
                    >
                      ✉️
                    </button>
                  </td>
                </tr>

                {/* Detalles expandibles */}
                {expanded[f.id] && (
                  <tr className="bg-gray-50">
                    <td colSpan={10} className="p-2">
                      <table className="w-full text-xs border">
                        <thead>
                          <tr>
                            <th className="p-1 text-left">Desc</th>
                            <th className="p-1">Ud.</th>
                            <th className="p-1">Precio</th>
                            <th className="p-1">Dto%</th>
                            <th className="p-1">IVA</th>
                            <th className="p-1">IRPF</th>
                            <th className="p-1">Total línea</th>
                          </tr>
                        </thead>
                        <tbody>
                          {f.lines.map((l, idx) => {
                            const lt = computeTotals(
                              { lines: [l] },
                              c,
                              { isInvoice: true }
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
                                  {l.irpfpct || 0}
                                </td>
                                <td className="p-1 text-center">
                                  {fmtMoney(lt.total)}
                                </td>
                              </tr>
                            );
                          })}
                          {f.lines.length === 0 && (
                            <tr>
                              <td
                                colSpan={7}
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
                          <b>Pago</b>
                          <div>Forma de pago: {f.codpago || "-"}</div>
                          <div>Estado: {f.state}</div>
                        </div>
                        <div className="border rounded p-2">
                          <b>IVA/Exención</b>
                          <div>Exenta: {f.isExempt ? "Sí" : "No"}</div>
                          <div>Nota exención: {f.exemptNote || "-"}</div>
                        </div>
                        <div className="col-span-2 border rounded p-2">
                          <b>Notas</b>
                          <div className="text-gray-600">
                            {f.notes || <i>—</i>}
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
              <td className="p-2 text-center" colSpan={10}>
                No hay facturas
              </td>
            </tr>
          )}
                  {rows.length === 0 && (
                <tr><td className="p-2 text-center" colSpan={10}>No hay facturas</td></tr>
              )}
            </>
          )}
        </tbody>
      </table>
      </div>

      {/* Crear (cabecera + líneas) – usa el estado nuevo */}
      <Modal
        open={!!createFacOpen}
        onClose={() => setCreateFacOpen(false)}
        title="Nueva factura"
      >
        <FacHeader draft={facDraft} setDraft={setFacDraft} customers={customers} />
        <LinesEditor
          doc={facDraft}
          setDoc={setFacDraft}
          products={products}
          onSaveProduct={onSaveProduct}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button className="px-3 py-2 rounded border" onClick={() => setCreateFacOpen(false)}>
            Cancelar
          </button>
          <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={saveCreateFac}>
            Guardar
          </button>
        </div>
      </Modal>

      {/* Editar (cabecera + líneas) */}
      <Modal open={editOpen && !!draft} onClose={() => setEditOpen(false)} title="Editar factura">
        <FacHeader draft={draft} setDraft={setDraft} customers={customers} />
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
            className="px-3 py-2 rounded bg-blue text-white"
            onClick={saveEdit}
          >
            Guardar cambios
          </button>
        </div>
      </Modal>
    </section>
  );
}

/* ===== Subformulario cabecera Factura ===== */
function FacHeader({ draft, setDraft, customers, isDocNumberTaken, seqs, }) {
  const taken = draft.series && draft.number != null && draft.number !== "" && isDocNumberTaken?.("factura", draft.series, draft.number, draft.id);
  return (
    <div className="grid grid-cols-2 gap-3">
      <label>
        <div className="text-sm text-gray-600 mb-1">Número</div>
        <div className="flex gap-2">
          <input className="w-28" type="number" placeholder="(auto)" value={draft.number ?? ""}
            onChange={e=>{
              const v = e.target.value;
              setDraft({ ...draft, number: v === "" ? "" : Number(v) });
            }} />
          {typeof seqs !== "undefined" && (
            <button type="button" className="px-3 py-1 border rounded"
              onClick={()=> setDraft(d => ({...d, number: nextNumber(seqs, d.series, "albaran")}))}>
              Auto
            </button>
          )}
        </div>
        {taken && <div className="text-xs text-red-600 mt-1">Ya existe un albarán con esa serie y número.</div>}
      </label>
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
        <label className="block text-gray-600">Fecha de expedición</label>
        <input
          type="date"
          value={draft.date}
          onChange={(e) => 
            setDraft({ ...draft, date: e.target.value })
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

      <div>
        <label className="block text-gray-600">Forma de pago</label>
        <input
          className="w-full border rounded p-2"
          value={draft.codpago || ""}
          onChange={(e) => setDraft({ ...draft, codpago: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-gray-600">Exenta de IVA</label>
        <select
          value={draft.isExempt ? "1" : "0"}
          onChange={(e) =>
            setDraft({ ...draft, isExempt: e.target.value === "1" })
          }
          className="w-full border rounded p-2"
        >
          <option value="0">No</option>
          <option value="1">Sí (añadir motivo)</option>
        </select>
      </div>
      <div>
        <label className="block text-gray-600">Motivo exención / Nota</label>
        <input
          className="w-full border rounded p-2"
          placeholder="p.ej. Exenta art. XX LIVA"
          value={draft.exemptNote || ""}
          onChange={(e) =>
            setDraft({ ...draft, exemptNote: e.target.value })
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
          <td className="p-2" colSpan={cols}>
            <div className="relative flex w-full animate-pulse gap-3 p-2">
              <div className="h-8 w-8 rounded-full bg-slate-200"></div>
              <div className="flex-1">
                <div className="mb-1 h-4 w-3/5 rounded-lg bg-slate-200"></div>
                <div className="h-4 w-[90%] rounded-lg bg-slate-200"></div>
              </div>
              <div className="absolute bottom-2 right-2 h-3 w-3 rounded-full bg-slate-200"></div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}