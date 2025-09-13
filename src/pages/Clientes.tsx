// @ts-nocheck
import React, { useMemo, useState } from "react";
import { fmtDate, fmtMoney, computeTotals } from "../utils";

type ClientesProps = {
  customers: any[];
  albaranes: any[];
  invoices: any[];
  cartaportes: any[];

  // imprimir (ya los tienes en App)
  printAlbaran: (a: any) => void;
  printFactura: (f: any) => void;
  printCP: (cp: any) => void;

  // para fabricar HTML igual que en el resto
  renderDocHTML: (doc: any, type: "albaran" | "factura" | "cp") => string;

};

export default function ClientesPage({
  customers,
  albaranes,
  invoices,
  cartaportes,
  printAlbaran,
  printFactura,
  printCP,
  renderDocHTML,
  loading
}: ClientesProps & {loading:boolean}) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});
  const [rowOpen, setRowOpen] = useState<{ [id: string]: string | null }>({}); // docId abierto por cliente

  const filtered = useMemo(() => {
    if (!q) return customers;
    const k = q.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(k) ||
        c.nif?.toLowerCase().includes(k) ||
        c.email?.toLowerCase().includes(k)
    );
  }, [customers, q]);

  const docsByCustomer = useMemo(() => {
    const albBy = new Map<string, any[]>();
    const facBy = new Map<string, any[]>();
    const cpBy = new Map<string, any[]>();

    // FACTURAS
    (invoices || []).forEach((d) => {
      const cid = d.customerId || d.customer?.id; // fallback por si guardaste objeto
      if (!cid) return;
      if (!facBy.has(cid)) facBy.set(cid, []);
      facBy.get(cid)!.push(d);
    });

    // ALBARANES
    (albaranes || []).forEach((d) => {
      const cid = d.customerId || d.customer?.id;
      if (!cid) return;
      if (!albBy.has(cid)) albBy.set(cid, []);
      albBy.get(cid)!.push(d);
    });

    // CARTAS DE PORTE
    (cartaportes || []).forEach((d) => {
      const key =
        d.consignatarioId ||
        d.customerId ||
        d.consignatario?.id ||
        d.remitenteId ||
        d.remitente?.id;
      if (!key) return;
      if (!cpBy.has(key)) cpBy.set(key, []);
      cpBy.get(key)!.push(d);
    });

    return { albBy, facBy, cpBy };
  }, [albaranes, invoices, cartaportes]);

  function toggleClient(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  async function downloadDoc(doc: any, type: "albaran" | "factura" | "cp") {
    const html = renderDocHTML(doc, type === "cp" ? "cp" : type);
    const n = type === "factura" ? `FACT-${doc.series}-${doc.number || "sn"}`
          : type === "albaran" ? `ALB-${doc.series}-${doc.number || "sn"}`
          : `CP-${doc.numero || doc.id}`;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          className="border rounded p-2 w-80"
          placeholder="Buscar por nombre, NIF o email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-sm text-gray-500">{filtered.length} clientes</span>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Cliente</th>
            <th className="p-2 text-left">NIF</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Teléfono</th>
            <th className="p-2 text-left">Población</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows cols={6} rows={1} />
          ) : (
            <>
          {filtered.map((c) => {
            const alb = docsByCustomer.albBy.get(c.id) || [];
            const fac = docsByCustomer.facBy.get(c.id) || [];
            // Para CP no siempre tienes customerId; si guardas en consignatario, mapea fuera.
            const cp = docsByCustomer.cpBy.get(c.id) || [];

            return (
              <React.Fragment key={c.id}>
                <tr className="border-t">
                  <td className="p-2 font-medium">{c.name}</td>
                  <td className="p-2">{c.nif}</td>
                  <td className="p-2">{c.email}</td>
                  <td className="p-2">{c.phone}</td>
                  <td className="p-2">{c.city}</td>
                  <td className="p-2 text-right">
                    <button
                      className="px-2 py-1 rounded border"
                      onClick={() => toggleClient(c.id)}
                    >
                      {expanded[c.id] ? "⯅ Cerrar" : "⯆ Ver"}
                    </button>
                  </td>
                </tr>

                {expanded[c.id] && (
                  <tr className="bg-gray-50">
                    <td colSpan={6} className="p-2">
                      {/* FICHA */}
                      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div className="border rounded p-2">
                          <b>Dirección</b>
                          <div>{c.address || "-"}</div>
                          <div className="text-gray-600">
                            {c.postalCode || ""} {c.city || ""} {c.country ? `(${c.country})` : ""}
                          </div>
                        </div>
                        <div className="border rounded p-2">
                          <b>Datos fiscales</b>
                          <div>NIF: {c.nif || "-"}</div>
                          <div>RE: {c.re ? "Sí" : "No"}</div>
                          <div>IRPF: {c.irpfpct ? `${c.irpfpct}%` : "0%"}</div>
                        </div>
                        <div className="border rounded p-2">
                          <b>Notas</b>
                          <div className="text-gray-600 whitespace-pre-wrap">
                            {c.notes || <i>—</i>}
                          </div>
                        </div>
                      </div>

                      {/* RESÚMENES */}
                      <div className="grid grid-cols-3 gap-3">
                        {/* FACTURAS */}
                        <div className="border rounded p-2">
                          <div className="flex items-center justify-between">
                            <b>Facturas</b>
                            <span className="text-xs text-gray-500">{fac.length}</span>
                          </div>
                          <div className="divide-y">
                            {fac.length === 0 && (
                              <div className="py-2 text-xs text-gray-500">Sin facturas</div>
                            )}
                            {fac.slice(0, 10).map((f) => {
                              const t = computeTotals(f, c, { isInvoice: true });
                              const open = rowOpen[c.id] === f.id;
                              return (
                                <div key={f.id} className="py-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs">
                                      <div className="font-medium">
                                        {f.series}-{f.number ?? "s/n"} · {fmtDate(f.date)}
                                      </div>
                                      <div className="text-[11px] text-gray-600">
                                        {f.state || ""}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-semibold">{fmtMoney(t.total)}</div>
                                      <div className="flex gap-1 justify-end mt-1">
                                        <button
                                          className="px-1.5 py-0.5 rounded border"
                                          onClick={() =>
                                            setRowOpen((s) => ({ ...s, [c.id]: open ? null : f.id }))
                                          }
                                          title="Ver líneas"
                                        >
                                          {open ? "⯅" : "⯆"}
                                        </button>
                                        <button
                                          className="px-1.5 py-0.5 rounded border"
                                          onClick={() => printFactura(f)}
                                          title="Imprimir"
                                        >
                                          🖨️
                                        </button>
                                        <button
                                          className="px-1.5 py-0.5 rounded border"
                                          onClick={() => downloadDoc(f, "factura")}
                                          title="Descargar PDF"
                                        >
                                          ⬇️
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {open && (
                                    <div className="mt-1">
                                      <LinesMini doc={f} customer={c} isInvoice />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ALBARANES */}
                        <div className="border rounded p-2">
                          <div className="flex items-center justify-between">
                            <b>Albaranes</b>
                            <span className="text-xs text-gray-500">{alb.length}</span>
                          </div>
                          <div className="divide-y">
                            {alb.length === 0 && (
                              <div className="py-2 text-xs text-gray-500">Sin albaranes</div>
                            )}
                            {alb.slice(0, 10).map((a) => {
                              const t = computeTotals(a, c, { isInvoice: false });
                              const open = rowOpen[c.id] === a.id;
                              return (
                                <div key={a.id} className="py-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs">
                                      <div className="font-medium">
                                        {a.series}-{a.number ?? "s/n"} · {fmtDate(a.date)}
                                      </div>
                                      <div className="text-[11px] text-gray-600">
                                        {a.state || ""}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-semibold">{fmtMoney(t.total)}</div>
                                      <div className="flex gap-1 justify-end mt-1">
                                        <button
                                          className="px-1.5 py-0.5 rounded border"
                                          onClick={() =>
                                            setRowOpen((s) => ({ ...s, [c.id]: open ? null : a.id }))
                                          }
                                          title="Ver líneas"
                                        >
                                          {open ? "⯅" : "⯆"}
                                        </button>
                                        <button
                                          className="px-1.5 py-0.5 rounded border"
                                          onClick={() => printAlbaran(a)}
                                          title="Imprimir"
                                        >
                                          🖨️
                                        </button>
                                        <button
                                          className="px-1.5 py-0.5 rounded border"
                                          onClick={() => downloadDoc(a, "albaran")}
                                          title="Descargar PDF"
                                        >
                                          ⬇️
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {open && (
                                    <div className="mt-1">
                                      <LinesMini doc={a} customer={c} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* CARTAS DE PORTE */}
                        <div className="border rounded p-2">
                          <div className="flex items-center justify-between">
                            <b>Cartas de porte</b>
                            <span className="text-xs text-gray-500">{cp.length}</span>
                          </div>
                          <div className="divide-y">
                            {cp.length === 0 && (
                              <div className="py-2 text-xs text-gray-500">Sin cartas de porte</div>
                            )}
                            {cp.slice(0, 10).map((d) => {
                              const open = rowOpen[c.id] === d.id;
                              return (
                                <div key={d.id} className="py-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs">
                                      <div className="font-medium">
                                        CP {d.numero || "s/n"} · {fmtDate(d.date)}
                                      </div>
                                      <div className="text-[11px] text-gray-600">
                                        {d.lugarEntrega || "-"}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="flex gap-1 justify-end">
                                        <button
                                          className="px-1.5 py-0.5 rounded border"
                                          onClick={() =>
                                            setRowOpen((s) => ({ ...s, [c.id]: open ? null : d.id }))
                                          }
                                          title="Ver detalle"
                                        >
                                          {open ? "⯅" : "⯆"}
                                        </button>
                                        <button
                                          className="px-1.5 py-0.5 rounded border"
                                          onClick={() => printCP(d)}
                                          title="Imprimir"
                                        >
                                          🖨️
                                        </button>
                                        <button
                                          className="px-1.5 py-0.5 rounded border"
                                          onClick={() => downloadDoc(d, "cp")}
                                          title="Descargar PDF"
                                        >
                                          ⬇️
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {open && (
                                    <div className="mt-1 text-xs grid grid-cols-2 gap-2">
                                      <div className="border rounded p-2">
                                        <b>Remitente</b>
                                        <div>{d.remitente?.name}</div>
                                        <div className="text-gray-600">{d.remitente?.nif}</div>
                                        <div className="text-gray-600">{d.remitente?.address}</div>
                                      </div>
                                      <div className="border rounded p-2">
                                        <b>Consignatario</b>
                                        <div>{d.consignatario?.name}</div>
                                        <div className="text-gray-600">{d.consignatario?.nif}</div>
                                        <div className="text-gray-600">{d.consignatario?.address}</div>
                                      </div>
                                      <div className="border rounded p-2">
                                        <b>Mercancía</b>
                                        <div>Marcas/nº: {d.marcasNumeros || "-"}</div>
                                        <div>Bultos: {d.numBultos || "-"}</div>
                                        <div>Embalaje: {d.claseEmbalaje || "-"}</div>
                                        <div>Naturaleza: {d.naturalezaMercancia || "-"}</div>
                                        <div>Peso bruto: {d.pesoBrutoKg || "-"}</div>
                                        <div>Volumen: {d.volumenM3 || "-"}</div>
                                      </div>
                                      <div className="border rounded p-2">
                                        <b>Otros</b>
                                        <div>Lugar fecha carga: {d.lugarFechaCarga || "-"}</div>
                                        <div>Docs anexos: {d.documentosAnexos || "-"}</div>
                                        <div>Vehículo: {d.vehiculo || "-"}</div>
                                        <div>Reservas: {d.reservas || "-"}</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td className="p-4 text-center text-gray-500" colSpan={6}>
                No hay clientes
              </td>
            </tr>
          )}
            </>
          )}
        </tbody>
      </table>
    </section>
  );
}

/* ========== tabla de líneas mini (dentro del cliente) ========== */
function LinesMini({ doc, customer, isInvoice = false }) {
  return (
    <table className="w-full text-[11px] border">
      <thead className="bg-white">
        <tr>
          <th className="px-1 py-0.5 text-left">Nombre</th>
          <th className="px-1 py-0.5 text-left">Descripción</th>
          <th className="px-1 py-0.5 text-right">Ud.</th>
          <th className="px-1 py-0.5 text-right">Precio</th>
          <th className="px-1 py-0.5 text-right">IVA</th>
          <th className="px-1 py-0.5 text-right">Importe</th>
        </tr>
      </thead>
      <tbody>
        {(doc.lines || []).map((l, i) => {
          const lt = computeTotals({ lines: [l] }, customer, { isInvoice });
          return (
            <tr key={i} className="border-t">
              <td className="px-1 py-0.5">{l.name || "-"}</td>
              <td className="px-1 py-0.5">{l.desc || "-"}</td>
              <td className="px-1 py-0.5 text-right">{l.qty}</td>
              <td className="px-1 py-0.5 text-right">{fmtMoney(l.price)}</td>
              <td className="px-1 py-0.5 text-right">{l.vat}</td>
              <td className="px-1 py-0.5 text-right">{fmtMoney(lt.total)}</td>
            </tr>
          );
        })}
        {(doc.lines || []).length === 0 && (
          <tr>
            <td colSpan={6} className="px-1 py-1 text-center text-gray-500">
              Sin líneas
            </td>
          </tr>
        )}
      </tbody>
    </table>
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