// @ts-nocheck
import React, { useState } from "react";
import Dialog from "../components/Dialog";
import { fmtDate, openPrintWindow, Seller } from "../utils";
import Modal from "../components/Modal";

/*
  Datos de Carta de Porte:
  - numero (opcional)
  - date
  - remitente, cargadorContractual, consignatario
  - operador, porteador, porteadoresSucesivos
  - lugarEntrega, vehiculo, lugarFechaCarga
  - documentosAnexos
  - marcasNumeros, numBultos, claseEmbalaje, naturalezaMercancia, numEstadistico, pesoBrutoKg, volumenM3
  - reservas
*/

export default function CartaPortePage({
  customers,
  cartaportes,
  setCartaPortes,
  printCP,
  emailCP,
  loading
}) {
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [expanded, setExpanded] = useState({});

  const filtered = cartaportes.filter((cp) =>
    `${cp.remitente?.name || ""} ${cp.consignatario?.name || ""}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  function newDraft() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: `CP-${Math.random().toString(36).slice(2, 8)}`,
      date: today,
      numero: "",
      remitente: { name: "", nif: "", address: "", country: "España" },
      cargadorContractual: { name: "", nif: "", address: "" },
      consignatario: { name: "", nif: "", address: "" },
      operador: { name: "", cif: "", address: "" },
      porteador: { name: "", cif: "", address: "" },
      porteadoresSucesivos: "",
      lugarEntrega: "",
      vehiculo: "",
      lugarFechaCarga: "",
      documentosAnexos: "",
      marcasNumeros: "",
      numBultos: "",
      claseEmbalaje: "",
      naturalezaMercancia: "",
      numEstadistico: "",
      pesoBrutoKg: "",
      volumenM3: "",
      reservas: "",
    };
  }

  function openCreate() {
    setDraft(newDraft());
    setCreateOpen(true);
  }
  function saveCreate() {
    setCartaPortes((prev) => [draft, ...prev]);
    setCreateOpen(false);
  }

  function openEdit(doc) {
    setDraft({ ...doc });
    setEditOpen(true);
  }
  function saveEdit() {
    setCartaPortes((prev) => prev.map((cp) => (cp.id === draft.id ? draft : cp)));
    setEditOpen(false);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 rounded-lg text-white"
          onClick={() => { setDraft(newDraft()); setCreateOpen(true); }}
        >
          Nueva Carta de Porte
        </button>
        <input
          className="border rounded p-2"
          placeholder="Buscar remitente/consignatario"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border mt-2">
      <table className="min-w-[720px] w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2">Fecha</th>
            <th className="p-2">Nº</th>
            <th className="p-2">Remitente</th>
            <th className="p-2">Consignatario</th>
            <th className="p-2">Lugar entrega</th>
            <th className="p-2">Vehículo</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows cols={7} rows={1} />
          ) : (
            <>
          {filtered.map((cp) => (
            <React.Fragment key={cp.id}>
              <tr className="border-t">
                <td className="p-2">{fmtDate(cp.date)}</td>
                <td className="p-2">{cp.numero || "-"}</td>
                <td className="p-2">{cp.remitente?.name}</td>
                <td className="p-2">{cp.consignatario?.name}</td>
                <td className="p-2">{cp.lugarEntrega}</td>
                <td className="p-2">{cp.vehiculo}</td>
                <td className="p-2 space-x-2">
                  <button
                    className="px-2 py-1 rounded border"
                    onClick={() =>
                      setExpanded((ex) => ({ ...ex, [cp.id]: !ex[cp.id] }))
                    }
                  >
                    {expanded[cp.id] ? "⯅" : "⯆"}
                  </button>
                  <button
                    className="px-2 py-1 rounded border"
                    onClick={() => openEdit(cp)}
                  >
                    ✎
                  </button>
                  <button
                    className="px-2 py-1 rounded border"
                    onClick={() => printCP(cp)}
                  >
                    🖨️
                  </button>
                  <button
                    className="px-2 py-1 rounded border"
                    title="Enviar por email (PDF adjunto)"
                    onClick={() => emailCP(cp)}
                  >
                    ✉️
                  </button>
                </td>
              </tr>

              {expanded[cp.id] && (
                <tr className="bg-gray-50">
                  <td colSpan={7} className="p-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="border rounded p-2">
                        <b>Remitente</b>
                        <div>{cp.remitente?.name}</div>
                        <div className="text-gray-600">{cp.remitente?.nif}</div>
                        <div className="text-gray-600">{cp.remitente?.address}</div>
                      </div>
                      <div className="border rounded p-2">
                        <b>Consignatario</b>
                        <div>{cp.consignatario?.name}</div>
                        <div className="text-gray-600">{cp.consignatario?.nif}</div>
                        <div className="text-gray-600">{cp.consignatario?.address}</div>
                      </div>
                      <div className="border rounded p-2">
                        <b>Operador transporte</b>
                        <div>{cp.operador?.name}</div>
                        <div className="text-gray-600">{cp.operador?.cif}</div>
                        <div className="text-gray-600">{cp.operador?.address}</div>
                      </div>
                      <div className="border rounded p-2">
                        <b>Porteador</b>
                        <div>{cp.porteador?.name}</div>
                        <div className="text-gray-600">{cp.porteador?.cif}</div>
                        <div className="text-gray-600">{cp.porteador?.address}</div>
                      </div>
                      <div className="border rounded p-2">
                        <b>Mercancía</b>
                        <div>Marcas y nº: {cp.marcasNumeros || "-"}</div>
                        <div>Bultos: {cp.numBultos || "-"}</div>
                        <div>Embalaje: {cp.claseEmbalaje || "-"}</div>
                        <div>Naturaleza: {cp.naturalezaMercancia || "-"}</div>
                        <div>Nº estadístico: {cp.numEstadistico || "-"}</div>
                        <div>Peso bruto (kg): {cp.pesoBrutoKg || "-"}</div>
                        <div>Volumen (m³): {cp.volumenM3 || "-"}</div>
                      </div>
                      <div className="border rounded p-2">
                        <b>Otros</b>
                        <div>Lugar y fecha de carga: {cp.lugarFechaCarga || "-"}</div>
                        <div>Docs anexos: {cp.documentosAnexos || "-"}</div>
                        <div>Porteadores sucesivos: {cp.porteadoresSucesivos || "-"}</div>
                        <div>Reservas: {cp.reservas || "-"}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td className="p-2 text-center" colSpan={7}>
                No hay cartas de porte
              </td>
            </tr>
          )}
            </>
          )}
        </tbody>
      </table>
      </div>

      {/* Crear */}
      {createOpen && draft && (
        <Modal
          open={true}
          onClose={() => setCreateOpen(false)}
          title="Nueva Carta de Porte (Nacional)"
        >
          <CPForm draft={draft} setDraft={setDraft} />
          <div className="flex justify-end gap-2 mt-3">
            <button className="px-3 py-2 rounded border" onClick={() => setCreateOpen(false)}>
              Cancelar
            </button>
            <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={saveCreate}>
              Guardar
            </button>
          </div>
        </Modal>
      )}

      {/* Editar */}
      <Modal open={editOpen && !!draft} onClose={() => setEditOpen(false)} title="Editar Carta de Porte">
        <CPForm draft={draft} setDraft={setDraft} />
        <div className="flex justify-end gap-2 mt-3">
          <button className="px-3 py-2 rounded border" onClick={() => setEditOpen(false)}>
            Cancelar
          </button>
          <button className="px-3 py-2 rounded bg-blue text-white" onClick={saveEdit}>
            Guardar cambios
          </button>
        </div>
      </Modal>
    </section>
  );
}

/* ==== Formulario reusado para crear/editar ==== */
function CPForm({ draft, setDraft }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
      <div>
        <label className="block text-gray-600">Fecha</label>
        <input
          type="date"
          value={draft.date}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="block text-gray-600">Nº (opcional)</label>
        <input
          className="w-full border rounded p-2"
          value={draft.numero}
          onChange={(e) => setDraft({ ...draft, numero: e.target.value })}
        />
      </div>

      {/* Remitente */}
      <div className="col-span-2 border rounded p-3">
        <b>1 · Remitente / Cargador Contractual</b>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input
            className="border rounded p-2"
            placeholder="Remitente: nombre/razón social"
            value={draft.remitente.name}
            onChange={(e) =>
              setDraft({ ...draft, remitente: { ...draft.remitente, name: e.target.value } })
            }
          />
          <input
            className="border rounded p-2"
            placeholder="NIF/CIF"
            value={draft.remitente.nif}
            onChange={(e) =>
              setDraft({ ...draft, remitente: { ...draft.remitente, nif: e.target.value } })
            }
          />
          <input
            className="col-span-2 border rounded p-2"
            placeholder="Domicilio y país"
            value={draft.remitente.address}
            onChange={(e) =>
              setDraft({ ...draft, remitente: { ...draft.remitente, address: e.target.value } })
            }
          />
          <input
            className="col-span-2 border rounded p-2"
            placeholder="Cargador contractual (si distinto): nombre, domicilio, CIF o DNI"
            value={draft.cargadorContractual?.name || ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                cargadorContractual: { ...draft.cargadorContractual, name: e.target.value },
              })
            }
          />
        </div>
      </div>

      {/* Consignatario */}
      <div className="col-span-2 border rounded p-3">
        <b>2 · Consignatario</b>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input
            className="border rounded p-2"
            placeholder="Nombre / Razón social"
            value={draft.consignatario.name}
            onChange={(e) =>
              setDraft({ ...draft, consignatario: { ...draft.consignatario, name: e.target.value } })
            }
          />
          <input
            className="border rounded p-2"
            placeholder="NIF / CIF"
            value={draft.consignatario.nif}
            onChange={(e) =>
              setDraft({ ...draft, consignatario: { ...draft.consignatario, nif: e.target.value } })
            }
          />
          <input
            className="col-span-2 border rounded p-2"
            placeholder="Domicilio, país"
            value={draft.consignatario.address}
            onChange={(e) =>
              setDraft({
                ...draft,
                consignatario: { ...draft.consignatario, address: e.target.value },
              })
            }
          />
        </div>
      </div>

      <div>
        <label className="block text-gray-600">3 · Lugar de entrega (lugar, país)</label>
        <input
          className="w-full border rounded p-2"
          value={draft.lugarEntrega}
          onChange={(e) => setDraft({ ...draft, lugarEntrega: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-gray-600">Vehículo</label>
        <input
          className="w-full border rounded p-2"
          value={draft.vehiculo}
          onChange={(e) => setDraft({ ...draft, vehiculo: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-gray-600">4 · Lugar y fecha de carga</label>
        <input
          className="w-full border rounded p-2"
          value={draft.lugarFechaCarga}
          onChange={(e) => setDraft({ ...draft, lugarFechaCarga: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-gray-600">Documentos anexos</label>
        <input
          className="w-full border rounded p-2"
          value={draft.documentosAnexos}
          onChange={(e) => setDraft({ ...draft, documentosAnexos: e.target.value })}
        />
      </div>

      <div className="col-span-2 border rounded p-3">
        <b>6–12 · Mercancía</b>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <input
            className="border rounded p-2"
            placeholder="Marcas y números"
            value={draft.marcasNumeros}
            onChange={(e) => setDraft({ ...draft, marcasNumeros: e.target.value })}
          />
          <input
            className="border rounded p-2"
            placeholder="Nº de bultos"
            value={draft.numBultos}
            onChange={(e) => setDraft({ ...draft, numBultos: e.target.value })}
          />
          <input
            className="border rounded p-2"
            placeholder="Clase de embalaje"
            value={draft.claseEmbalaje}
            onChange={(e) => setDraft({ ...draft, claseEmbalaje: e.target.value })}
          />
          <input
            className="col-span-2 border rounded p-2"
            placeholder="Naturaleza de la mercancía"
            value={draft.naturalezaMercancia}
            onChange={(e) =>
              setDraft({ ...draft, naturalezaMercancia: e.target.value })
            }
          />
          <input
            className="border rounded p-2"
            placeholder="Nº estadístico"
            value={draft.numEstadistico}
            onChange={(e) => setDraft({ ...draft, numEstadistico: e.target.value })}
          />
          <input
            className="border rounded p-2"
            placeholder="Peso bruto (kg)"
            value={draft.pesoBrutoKg}
            onChange={(e) => setDraft({ ...draft, pesoBrutoKg: e.target.value })}
          />
          <input
            className="border rounded p-2"
            placeholder="Volumen (m³)"
            value={draft.volumenM3}
            onChange={(e) => setDraft({ ...draft, volumenM3: e.target.value })}
          />
        </div>
      </div>

      <div className="col-span-2 border rounded p-3">
        <b>Operadores de transporte</b>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input
            className="border rounded p-2"
            placeholder="Operador transporte: nombre, CIF, domicilio, país"
            value={draft.operador.name}
            onChange={(e) =>
              setDraft({ ...draft, operador: { ...draft.operador, name: e.target.value } })
            }
          />
          <input
            className="border rounded p-2"
            placeholder="Porteador: nombre, CIF, domicilio, país"
            value={draft.porteador.name}
            onChange={(e) =>
              setDraft({ ...draft, porteador: { ...draft.porteador, name: e.target.value } })
            }
          />
          <input
            className="col-span-2 border rounded p-2"
            placeholder="Porteadores sucesivos (lista/observaciones)"
            value={draft.porteadoresSucesivos}
            onChange={(e) =>
              setDraft({ ...draft, porteadoresSucesivos: e.target.value })
            }
          />
        </div>
      </div>

      <div className="col-span-2">
        <label className="block text-gray-600">
          Reservas y observaciones del porteador
        </label>
        <textarea
          className="w-full border rounded p-2"
          value={draft.reservas}
          onChange={(e) => setDraft({ ...draft, reservas: e.target.value })}
        />
      </div>
    </div>
  );
}

/** Impresión robusta CP (A4 en puntos, maquetación 2 columnas) */
export function renderCPHTML(cp: any) {
  const PRINT_CSS = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Arial, sans-serif;
      font-size: 11pt; color: #111;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .page { width: 595pt; min-height: 842pt; margin: 0 auto; padding: 40pt; background: #fff; }

    h1 { font-size: 16pt; margin: 0 0 6pt }
    .muted { color:#555; font-size: 9pt }
    .right { text-align: right }

    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; }
    .box { border: 1px solid #1f2937; border-radius: 4pt; padding: 8pt; }
    .label { font-weight: 600; margin-bottom: 4pt }

    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #1f2937; padding: 6pt; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
  `;

  const s = (v: any) => (v ?? ""); // safe

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Carta de Porte ${s(cp.numero)}</title>
      <style>${PRINT_CSS}</style>
    </head>
    <body>
      <div class="page">
        <!-- Cabecera -->
        <div style="display:flex;justify-content:space-between;gap:12pt;align-items:flex-start;">
          <div>
            <h1>CARTA DE PORTE NACIONAL</h1>
            <div class="muted">Documento de control de envíos de transporte público de mercancías (Orden FOM/2861/2012)</div>
          </div>
          <div class="right muted">
            <div><b>Fecha:</b> ${s(fmtDate(cp.date))}</div>
            <div><b>Nº:</b> ${s(cp.numero) || "-"}</div>
          </div>
        </div>

        <!-- 1 / Operador -->
        <div class="grid2" style="margin-top:10pt">
          <div class="box">
            <div class="label">1 · Remitente / Cargador contractual</div>
            <div><b>${s(cp.remitente?.name)}</b> — ${s(cp.remitente?.nif)}</div>
            <div class="muted">${s(cp.remitente?.address)}</div>
            ${cp.cargadorContractual?.name ? `<div class="muted"><i>Cargador contractual:</i> ${s(cp.cargadorContractual?.name)}</div>` : ""}
          </div>
          <div class="box">
            <div class="label">Operador de transporte</div>
            <div><b>${s(cp.operador?.name)}</b></div>
            <div class="muted">${s(cp.operador?.cif)} ${s(cp.operador?.address)}</div>
          </div>
        </div>

        <!-- 2 / 16 -->
        <div class="grid2" style="margin-top:8pt">
          <div class="box">
            <div class="label">2 · Consignatario</div>
            <div><b>${s(cp.consignatario?.name)}</b> — ${s(cp.consignatario?.nif)}</div>
            <div class="muted">${s(cp.consignatario?.address)}</div>
          </div>
          <div class="box">
            <div class="label">16 · Porteador</div>
            <div><b>${s(cp.porteador?.name)}</b></div>
            <div class="muted">${s(cp.porteador?.cif)} ${s(cp.porteador?.address)}</div>
          </div>
        </div>

        <!-- 3 / Vehículo -->
        <div class="grid2" style="margin-top:8pt">
          <div class="box">
            <div class="label">3 · Lugar de entrega</div>
            <div>${s(cp.lugarEntrega)}</div>
          </div>
          <div class="box">
            <div class="label">Vehículo</div>
            <div>${s(cp.vehiculo)}</div>
          </div>
        </div>

        <!-- 4 / 17 -->
        <div class="grid2" style="margin-top:8pt">
          <div class="box">
            <div class="label">4 · Lugar y fecha de carga</div>
            <div>${s(cp.lugarFechaCarga)}</div>
          </div>
          <div class="box">
            <div class="label">17 · Porteadores sucesivos</div>
            <div>${s(cp.porteadoresSucesivos)}</div>
          </div>
        </div>

        <!-- 5 / 18 -->
        <div class="grid2" style="margin-top:8pt">
          <div class="box">
            <div class="label">5 · Documentos anexos</div>
            <div>${s(cp.documentosAnexos)}</div>
          </div>
          <div class="box">
            <div class="label">18 · Reservas y observaciones del porteador</div>
            <div>${s(cp.reservas)}</div>
          </div>
        </div>

        <!-- 6–12 · Mercancía -->
        <div style="margin-top:10pt">
          <table>
            <thead>
              <tr>
                <th style="width:22%">6 · Marcas y números</th>
                <th style="width:12%">7 · Nº bultos</th>
                <th style="width:16%">8 · Clase embalaje</th>
                <th>9 · Naturaleza de la mercancía</th>
                <th style="width:16%">10 · Nº Estadístico</th>
                <th style="width:14%">11 · Peso bruto (kg)</th>
                <th style="width:14%">12 · Volumen (m³)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${s(cp.marcasNumeros)}</td>
                <td>${s(cp.numBultos)}</td>
                <td>${s(cp.claseEmbalaje)}</td>
                <td>${s(cp.naturalezaMercancia)}</td>
                <td>${s(cp.numEstadistico)}</td>
                <td>${s(cp.pesoBrutoKg)}</td>
                <td>${s(cp.volumenM3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body>
  </html>`;
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
