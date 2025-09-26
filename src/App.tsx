// @ts-nocheck
import React, { useEffect, useState } from "react";
import { GoogleDriveProviderFactory, LocalProvider } from "./providers/storage";
import {
  TZ, fmtDate, fmtMoney, initialSequences, dedupeById, computeTotals,
  nextNumber, openPrintWindow, Seller, VAT_RATES, SERIES, PRODUCTS,
  sendEmailWithPDF, updateSeller
} from "./utils";
import ClientesPage from "./pages/Clientes";
import AlbaranesPage from "./pages/Albaranes";
import FacturasPage from "./pages/Facturas";
import CartaPortePage, { renderCPHTML } from "./pages/CartaPorte";
import ResumenFiscal from "./pages/ResumenFiscal";
import Dialog from "./components/Dialog";
import Modal from "./components/Modal";

import "./theme.css";

/* ========= CONFIG ========= */
const GOOGLE_CLIENT_ID = "666550284118-s6ec6np3gc4hbe3gcbb21uplngohbjno.apps.googleusercontent.com";

/* ========= App ========= */
export default function App() {
  const drive = GoogleDriveProviderFactory({ clientId: GOOGLE_CLIENT_ID });
  const [cloud, setCloud] = useState(LocalProvider);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [albaranes, setAlbaranes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [cartaportes, setCartaPortes] = useState([]);
  const [seqs, setSeqs] = useState(initialSequences());
  const [debugOpen, setDebugOpen] = useState(true);

  const [forceDriveModal, setForceDriveModal] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);


  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dups, setDups] = useState({ c: 0, a: 0, f: 0, cp: 0 });
  const [tab, setTab] = useState<"albaranes"|"facturas"|"clientes"|"cp">("albaranes");
  const [showSplash, setShowSplash] = useState(true);

  const [seller, setSeller] = useState({ ...Seller });
  const [sellerOpen, setSellerOpen] = useState(false);
  const [sellerDraft, setSellerDraft] = useState({ ...Seller });
  useEffect(() => {
    if (sellerOpen) setSellerDraft({ ...seller });
    }, [sellerOpen]); // rellenar el formulario al abrir
    useEffect(() => {
    (async () => {
      try {
        const saved = await cloud.readJSON("seller.json", null);
        if (saved) {
          setSeller(saved);
          updateSeller(saved); // actualiza el objeto exportado para impresión
        }
      } catch { /* noop */ }
    })();
  }, [cloud]);
  useEffect(() => {
    updateSeller(seller);
    if (!hydrated) return;
    if (cloud.kind === "drive" && typeof cloud.saveSeller === "function") {
      cloud.saveSeller(seller);        // Drive → usa método específico
    } else if (typeof cloud.saveJSON === "function") {
      cloud.saveJSON("seller.json", seller);  // Local
    }
  }, [seller, hydrated, cloud]);

  useEffect(() => {
    if (localStorage.getItem("driveConnected") === "1") {
      (async () => {
        try {
          setLoading(true);
          await drive.connect();          // intentará restaurar sesión si existe
          setCloud(drive);
        } catch {
          localStorage.removeItem("driveConnected");
          setCloud(LocalProvider);
        } finally { setLoading(false); }
      })();
    }
  }, []);  // solo al montar

  /* Carga / cambio provider */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setHydrated(false);
      await cloud.init();

      if (cloud.kind === "drive" && cloud.loadAll) {
        const { customers: C, albaranes: A, facturas: F, cartaportes: CP, products: P, secuencias: S } = await cloud.loadAll();
        setCustomers(dedupeById(C.items || []));
        setAlbaranes(dedupeById(A.items || []));
        setInvoices(dedupeById(F.items || []));
        setCartaPortes(dedupeById(CP.items || []));
        setProducts(dedupeById(P.items || []));
        setSeqs(S.obj || initialSequences());
        const d = (res) => Math.max(0, (res.files?.length || 1) - 1);
        setDups({ c: d(C), a: d(A), f: d(F), cp: d(CP) });
      } else {
        const [c, a, f, cp, s, p] = await Promise.all([
          cloud.readJSON("customers.json", []),
          cloud.readJSON("albaranes.json", []),
          cloud.readJSON("facturas.json", []),
          cloud.readJSON("cartaportes.json", []),
          cloud.readJSON("secuencias.json", initialSequences()),
          cloud.readJSON("products.json", []),
        ]);
        setCustomers(dedupeById(c));
        setAlbaranes(dedupeById(a));
        setInvoices(dedupeById(f));
        setCartaPortes(dedupeById(cp));
        setProducts(dedupeById(p));
        setSeqs(s);
        setDups({ c: 0, a: 0, f: 0, cp: 0 });
      }

      setHydrated(true);
      setLoading(false);
    })();
  }, [cloud]);

  /* Persistencia */
  useEffect(() => { if (!hydrated) return;
    cloud.kind === "drive" && cloud.saveCustomers ? cloud.saveCustomers(customers) : cloud.saveJSON("customers.json", customers); }, [customers, hydrated, cloud]);
  useEffect(() => { if (!hydrated) return;
    cloud.kind === "drive" && cloud.saveAlbaranes ? cloud.saveAlbaranes(albaranes) : cloud.saveJSON("albaranes.json", albaranes); }, [albaranes, hydrated, cloud]);
  useEffect(() => { if (!hydrated) return;
    cloud.kind === "drive" && cloud.saveFacturas ? cloud.saveFacturas(invoices) : cloud.saveJSON("facturas.json", invoices); }, [invoices, hydrated, cloud]);
  useEffect(() => { if (!hydrated) return;
    cloud.kind === "drive" && cloud.saveCartaPorte ? cloud.saveCartaPorte(cartaportes) : cloud.saveJSON("cartaportes.json", cartaportes); }, [cartaportes, hydrated, cloud]);
  useEffect(() => { if (!hydrated) return;
    cloud.kind === "drive" && cloud.saveSecuencias ? cloud.saveSecuencias(seqs) : cloud.saveJSON("secuencias.json", seqs); }, [seqs, hydrated, cloud]);
  useEffect(() => { if (!hydrated) return; if (cloud.kind === "drive" && cloud.saveProducts) { cloud.saveProducts(products); } else { cloud.saveJSON("products.json", products); }
  }, [products, hydrated, cloud]);
  useEffect(()=>{ const t=setTimeout(()=>setShowSplash(false),1400); return ()=>clearTimeout(t); },[]);

  useEffect(() => {
    if (localStorage.getItem("driveConnected") !== "1") {
      setForceDriveModal(true);         // obligar a conectar
    } else {
      // auto-conectar (tú ya lo tenías)
    }
  }, []);

  const customerById = (id) => customers.find((c) => c.id === id);
  function renderDocHTML(doc: any, type: "albaran" | "factura") {
    const isInvoice = type === "factura";
    const c = customerById(doc.customerId);
    const seller = Seller;

    const PRINT_CSS = `
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Arial, sans-serif;
        font-size: 11pt; color: #111;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .page {
        width: 595pt;            /* A4 en puntos */
        min-height: 842pt;
        margin: 0 auto;
        padding: 40pt;           /* margen interior */
        background: #fff;
      }
      h1{ font-size:16pt; margin:0 0 8pt }
      h2{ font-size:12pt; margin:0 }
      .row{ display:flex; justify-content:space-between; gap:12pt; margin-bottom:10pt; align-items:flex-start; }
      .muted{ color:#666; font-size:9pt }
      .box{ border:1px solid #ddd; border-radius:6pt; padding:8pt; margin-top:8pt }

      /* Tabla con distribución fija */
      table{ width:100%; border-collapse: collapse; table-layout: fixed; }
      th,td{ border-bottom:1px solid #ddd; padding:6pt; vertical-align:top; }
      th{ text-align:left; font-weight:600; }
      .desc{ text-align:left; word-break: break-word; }
      .num { text-align:right; font-variant-numeric: tabular-nums; } /* números monoespaciados */
      .tot{ margin-top:12pt; float:right; min-width: 170pt }
      @media print { .page { box-shadow:none } }
    `;

    const addrSeller = `${seller.address}, ${seller.postalCode} ${seller.city} (${seller.country})`;
    const addrBuyer = `${c?.address || ""}${c?.postalCode ? ", " + c.postalCode : ""}${c?.city ? " " + c.city : ""}${c?.country ? " (" + c.country + ")" : ""}`;

    const COLGROUP = `
      <colgroup>
        <col style="width:42%;"> <!-- Descripción -->
        <col style="width:8%;">  <!-- Ud. -->
        <col style="width:14%;"> <!-- Precio -->
        <col style="width:10%;"> <!-- Dto -->
        <col style="width:12%;"> <!-- Tipo -->
        <col style="width:14%;"> <!-- Importe -->
      </colgroup>
    `;

    const linesHTML = (doc.lines || []).map((l: any) => {
      const vat = VAT_RATES.find((v) => v.id === l.vat) || VAT_RATES[0];
      const applyRE = isInvoice && !!c?.re;
      const reRate =
        applyRE
          ? (l.vat === "iva21" ? 5.2 : l.vat === "iva10" ? 1.4 : l.vat === "iva4" ? 0.5 : 0)
          : 0;
      const total = computeTotals({ lines: [l] }, c, { isInvoice }).total;
      const namePlusDesc = [l.name, l.desc].filter(Boolean).join(" — ");

      return `<tr>
        <td class="desc">${namePlusDesc || ""}</td>
        <td class="num">${l.qty ?? ""}</td>
        <td class="num">${fmtMoney(l.price ?? 0)}</td>
        <td class="num">${l.dtopct || 0}%</td>
        <td class="num">${vat?.name || ""}${applyRE && reRate ? ` + RE ${reRate}%` : ""}</td>
        <td class="num">${fmtMoney(total)}</td>
      </tr>`;
    }).join("");

    const t = computeTotals(doc, c, { isInvoice });
    const title = isInvoice ? "FACTURA" : "ALBARÁN";
    const num = doc.number ? `${doc.series}-${doc.number}` : `${doc.series}-⚙`;

    const deliveryBlock = !isInvoice ? `
      <div class="box">
        <div><b>Dirección de entrega</b></div>
        <div>${doc.deliveryAddress || c?.deliveryAddress || addrBuyer}</div>
        <div class="muted">Fecha de entrega: ${fmtDate(doc.deliveryDate)}</div>
      </div>
    ` : "";

    const legalNote = isInvoice
      ? `<p class="muted" style="margin-top:6pt">Documento conforme a RD 1619/2012.${doc.isExempt && doc.exemptNote ? " " + doc.exemptNote : ""}${c?.re ? " — Cliente en recargo de equivalencia." : ""}</p>`
      : `<p class="muted" style="margin-top:6pt">Documento de entrega (no fiscal).</p>`;

    return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title} ${num}</title>
        <style>${PRINT_CSS}</style>
      </head>
      <body>
        <div class="page">
          <div class="row">
            <div>
              <h2>${seller.name}</h2>
              <div class="muted">NIF: ${seller.nif}</div>
              <div class="muted">${addrSeller}</div>
              <div class="muted">${seller.email} · ${seller.phone}</div>
            </div>
            <div style="text-align:right">
              <h1>${title}</h1>
              <div>Número: <b>${num}</b></div>
              <div>Fecha: <b>${fmtDate(doc.date)}</b></div>
            </div>
          </div>

          <div class="row">
            <div>
              <div><b>Cliente</b></div>
              <div>${c?.name || ""}</div>
              <div class="muted">NIF: ${c?.nif || ""}</div>
              <div class="muted">${addrBuyer}</div>
            </div>
          </div>

          ${deliveryBlock}

          <table style="margin-top:12pt">
            ${COLGROUP}
            <thead>
              <tr>
                <th>Descripción</th>
                <th class="num">Ud.</th>
                <th class="num">Precio</th>
                <th class="num">Dto</th>
                <th class="num">Tipo</th>
                <th class="num">Importe</th>
              </tr>
            </thead>
            <tbody>${linesHTML || `<tr><td colspan="6" class="muted">Sin líneas</td></tr>`}</tbody>
          </table>

          <div class="tot">
            <div>Base imponible: <b>${fmtMoney(t.neto)}</b></div>
            <div>IVA: <b>${fmtMoney(t.totaliva)}</b></div>
            ${t.totalre>0?`<div>Recargo de equivalencia: <b>${fmtMoney(t.totalre)}</b></div>`:""}
            ${t.totalirpf!==0?`<div>IRPF: <b>${fmtMoney(t.totalirpf)}</b></div>`:""}
            <div style="margin-top:8pt">TOTAL: <b>${fmtMoney(t.total)}</b></div>
          </div>
          <div style="clear:both"></div>

          ${legalNote}
        </div>
      </body>
    </html>`;
  }

  const printAlbaran = (a) => {
    const c = customerById(a.customerId);
    const title = `ALB_${slug(c?.name || "sin-cliente")}_${docIdTag(a.series, a.number)}_${dateTag(a.date)}`;
    openPrintWindow(renderDocHTML(a, "albaran"), { title });
  };

  const printFactura = (f) => {
    const c = customerById(f.customerId);
    const title = `FAC_${slug(c?.name || "sin-cliente")}_${docIdTag(f.series, f.number)}_${dateTag(f.date)}`;
    openPrintWindow(renderDocHTML(f, "factura"), { title });
  };

  const printCP = (cp) => {
    // intenta cliente o consignatario
    const cid = cp.customerId || cp.consignatarioId;
    const c = customers.find(x => x.id === cid);
    const title = `CP_${slug(c?.name || "sin-cliente")}_${cp.numero ?? "SN"}_${dateTag(cp.fecha || cp.date)}`;
    openPrintWindow(renderCPHTML(cp), { title });
  };
  // ===== Enviar por email (PDF adjunto) =====
  async function emailFactura(f) {
    const c = customers.find(x => x.id === f.customerId);
    const to = prompt("Enviar factura a (email):", c?.email || "") || "";
    if (!to) return;
    const html = renderDocHTML(f, "factura");
    const filename = `FAC_${slug(c?.name || "sin-cliente")}_${docIdTag(f.series, f.number)}_${dateTag(f.date)}.pdf`;
    try {
      await sendEmailWithPDF({ to, subject: `Factura ${f.series}-${f.number}`, message: `Adjuntamos la factura ${f.series}-${f.number}.`, html, filename });
      alert("✅ Email enviado");
    } catch (e) {
      console.error(e); alert("❌ No se pudo enviar el email: " + (e?.message || e));
    }
  }

  async function emailAlbaran(a) {
    const c = customers.find(x => x.id === a.customerId);
    const to = prompt("Enviar albarán a (email):", c?.email || "") || "";
    if (!to) return;
    const html = renderDocHTML(a, "albaran");
    const filename = `ALB_${slug(c?.name || "sin-cliente")}_${docIdTag(a.series, a.number)}_${dateTag(a.date)}.pdf`;
    try {
      await sendEmailWithPDF({ to, subject: `Albarán ${a.series}-${a.number}`, message: `Adjuntamos el albarán ${a.series}-${a.number}.`, html, filename });
      alert("✅ Email enviado");
    } catch (e) {
      console.error(e); alert("❌ No se pudo enviar el email: " + (e?.message || e));
    }
  }

  async function emailCP(cp) {
    const cid = cp.customerId || cp.consignatarioId;
    const c = customers.find(x => x.id === cid);
    const to = prompt("Enviar Carta de Porte a (email):", c?.email || "") || "";
    if (!to) return;
    const html = renderCPHTML(cp);
    const filename = `CP_${slug(c?.name || "sin-cliente")}_${cp.numero ?? "SN"}_${dateTag(cp.fecha || cp.date)}.pdf`;
    try {
      await sendEmailWithPDF({ to, subject: `Carta de Porte ${cp.numero || ""}`, message: `Adjuntamos la Carta de Porte ${cp.numero || ""}.`, html, filename });
      alert("✅ Email enviado");
    } catch (e) {
      console.error(e); alert("❌ No se pudo enviar el email: " + (e?.message || e));
    }
  }

  function upsertProduct(prod) {
    setProducts((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      map.set(prod.id, { ...map.get(prod.id), ...prod });
      return Array.from(map.values());
    });
  }

  // ==== Helpers para nombres de archivo (PDF) ====
  function slug(s = "") {
    // sin acentos, sin espacios ni símbolos raros
    return s
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }
  function dateTag(d: any) {
    // 2025-09-24 (iso corto); si d no es fecha válida, usa “hoy”
    const dt = new Date(d);
    const iso = isNaN(+dt) ? new Date() : dt;
    return iso.toISOString().slice(0,10); // YYYY-MM-DD
  }
  function docIdTag(series?: string, number?: number | string) {
    return `${series || "S"}-${number ?? "SN"}`; // SN = sin número
  }

  return (
    <div className="app-shell mx-auto max-w-7xl p-4 sm:p-5 md:p-6 space-y-5">
      {/* Modal obligatorio de conexión a Drive */}
      <Modal
        open={forceDriveModal && cloud.kind !== "drive"}
        onClose={() => { /* es obligatorio; si lo quisieras cerrable, quita hideClose */ }}
        hideClose={true}
        title="Conectar con Google Drive"
      >
        <p className="mb-4">
          Necesitamos conectar con tu Drive para guardar y sincronizar clientes, albaranes y facturas.
        </p>

        <button
          disabled={connectingDrive}
          onClick={async () => {
            try {
              setConnectingDrive(true);
              await drive.connect();
              setCloud(drive);
              localStorage.setItem("driveConnected", "1");
              setForceDriveModal(false);
            } catch (e: any) {
              alert(e?.message || "No se pudo conectar con Drive");
            } finally {
              setConnectingDrive(false);
            }
          }}
          className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60"
        >
          {connectingDrive ? "Conectando..." : "Conectar con Google Drive"}
        </button>
      </Modal>
      <div className="flex items-center justify-between rounded-xl border p-3">
        <div className="text-sm">{cloud.kind === "drive" ? <>Conectado a <b>Google Drive</b></> : <>Almacenamiento local</>}</div>
        {cloud.kind !== "drive" && (
          <button className="px-3 py-2 rounded bg-indigo-600 text-white" onClick={async () => {
              try {
                setLoading(true);
                await drive.connect();
                setCloud(drive);
                localStorage.setItem("driveConnected","1");   // 👈 recordar
                setLoading(false);
                alert("Conectado a Drive (fusión duplicados)");
              } catch(e){
                setLoading(false);
                alert(e.message || "Error conectando Google Drive");
              }
            }}>Conectar Google Drive
          </button>
        )}
      </div>

      {(dups.c || dups.a || dups.f || dups.cp) && (
        <div className="rounded-lg border bg-amber-50 text-amber-800 p-3 text-sm">
          Fusión de duplicados detectada (no se borran archivos) → Clientes: <b>{dups.c}</b>, Albaranes: <b>{dups.a}</b>, Facturas: <b>{dups.f}</b>, CP: <b>{dups.cp}</b>.
        </div>
      )}

      <header className="flex flex-wrap items-center gap-2">
        {/* Pestañas */}
        <nav className="nav-tabs w-full sm:w-auto">
          <button className={`btn-tab ${tab==="albaranes"?"btn-tab--active":""}`} onClick={() => setTab("albaranes")}>Albaranes</button>
          <button className={`btn-tab ${tab==="facturas"?"btn-tab--active":""}`} onClick={() => setTab("facturas")}>Facturas</button>
          <button className={`btn-tab ${tab==="cp"?"btn-tab--active":""}`} onClick={() => setTab("cp")}>Carta de Porte</button>
          <button className={`btn-tab ${tab==="clientes"?"btn-tab--active":""}`} onClick={() => setTab("clientes")}>Clientes</button>
          <button className={`btn-tab ${tab==="contabilidad"?"btn-tab--active":""}`} onClick={()=>setTab("contabilidad")}>Contabilidad</button>
        </nav>

        {/* Acciones a la derecha (se van abajo en móvil) */}
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button className="px-3 py-1 border rounded" onClick={() => setSellerOpen(true)}>⚙️ Empresa</button>
        </div>
      </header>

      {tab === "albaranes" && (
        <AlbaranesPage
          customers={customers}
          albaranes={albaranes}
          setAlbaranes={setAlbaranes}
          seqs={seqs}
          setSeqs={setSeqs}
          nextNumber={nextNumber}
          printAlbaran={printAlbaran}
          emailAlbaran={emailAlbaran}
          products={products}
          onSaveProduct={upsertProduct}
          loading={loading}
        />
      )}

      {tab === "facturas" && (
        <FacturasPage
          customers={customers}
          invoices={invoices}
          setInvoices={setInvoices}
          seqs={seqs}
          setSeqs={setSeqs}
          nextNumber={nextNumber}
          printFactura={printFactura}
          emailFactura={emailFactura}
          products={products}
          onSaveProduct={upsertProduct}
          loading={loading}
        />
      )}

      {tab === "cp" && (
        <CartaPortePage
          customers={customers}
          cartaportes={cartaportes}
          setCartaPortes={setCartaPortes}
          printCP={printCP}
          emailCP={emailCP}
          loading={loading}
        />
      )}

      {tab === "clientes" && (
        <ClientesPage
          customers={customers}
          albaranes={albaranes}
          invoices={invoices}
          cartaportes={cartaportes}
          printAlbaran={printAlbaran}
          printFactura={printFactura}
          printCP={printCP}
          loading={loading}
          setCustomers={setCustomers}
        />
      )}

      {tab==="contabilidad" && (
        <ResumenFiscal
          invoices={invoices}
          customers={customers}
        />
      )}
      
      <Modal open={sellerOpen} onClose={() => setSellerOpen(false)} title="Datos fiscales de la empresa">
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2">
            <div className="text-sm text-gray-600 mb-1">Nombre / Razón social</div>
            <input className="w-full" value={sellerDraft.name}
              onChange={e=>setSellerDraft({ ...sellerDraft, name:e.target.value })}/>
          </label>

          <label>
            <div className="text-sm text-gray-600 mb-1">NIF/CIF</div>
            <input className="w-full" value={sellerDraft.nif}
              onChange={e=>setSellerDraft({ ...sellerDraft, nif:e.target.value })}/>
          </label>

          <label>
            <div className="text-sm text-gray-600 mb-1">Teléfono</div>
            <input className="w-full" value={sellerDraft.phone}
              onChange={e=>setSellerDraft({ ...sellerDraft, phone:e.target.value })}/>
          </label>

          <label className="col-span-2">
            <div className="text-sm text-gray-600 mb-1">Dirección</div>
            <input className="w-full" value={sellerDraft.address}
              onChange={e=>setSellerDraft({ ...sellerDraft, address:e.target.value })}/>
          </label>

          <label>
            <div className="text-sm text-gray-600 mb-1">Ciudad</div>
            <input className="w-full" value={sellerDraft.city}
              onChange={e=>setSellerDraft({ ...sellerDraft, city:e.target.value })}/>
          </label>

          <label>
            <div className="text-sm text-gray-600 mb-1">Código Postal</div>
            <input className="w-full" value={sellerDraft.postalCode}
              onChange={e=>setSellerDraft({ ...sellerDraft, postalCode:e.target.value })}/>
          </label>

          <label>
            <div className="text-sm text-gray-600 mb-1">País</div>
            <input className="w-full" value={sellerDraft.country}
              onChange={e=>setSellerDraft({ ...sellerDraft, country:e.target.value })}/>
          </label>

          <label className="col-span-2">
            <div className="text-sm text-gray-600 mb-1">Email</div>
            <input className="w-full" value={sellerDraft.email}
              onChange={e=>setSellerDraft({ ...sellerDraft, email:e.target.value })}/>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-1 border rounded" onClick={()=>setSellerOpen(false)}>Cancelar</button>
          <button className="px-3 py-1 bg-emerald-600 text-white rounded"
            onClick={() => { setSeller(sellerDraft); setSellerOpen(false); }}>
            Guardar
          </button>
        </div>
      </Modal>

      {(loading || connectingDrive) && (
        <div className="screen-blocker">
          <div className="flex flex-col items-center gap-3">
            <div className="dot-spinner">
              <div className="dot-spinner__dot"></div><div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div><div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div><div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div><div className="dot-spinner__dot"></div>
            </div>
            <div className="text-sm text-gray-700">Cargando datos…</div>
          </div>
        </div>
      )}
    </div>
  );
}