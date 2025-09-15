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


  const customerById = (id) => customers.find((c) => c.id === id);
  function renderDocHTML(doc, type) {
    const isInvoice = type === "factura";
    const t = computeTotals(doc, customerById(doc.customerId), { isInvoice });
    const title = isInvoice ? "FACTURA" : "ALBARÁN";
    const num = doc.number ? `${doc.series}-${doc.number}` : `${doc.series}-⚙`;
    const css =
      "body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;padding:28px} h1{font-size:22px;margin:0 0 10px} h2{font-size:14px;margin:0} table{width:100%;border-collapse:collapse} th,td{border-bottom:1px solid #ddd;padding:6px;text-align:right} th:nth-child(1),td:nth-child(1){text-align:left} .tot{margin-top:16px;float:right;min-width:360px} .muted{color:#666;font-size:12px} .row{display:flex;justify-content:space-between;margin-bottom:10px}";
    const seller = Seller;
    const lines = (doc.lines || [])
    .map((l) => {
      const vat = VAT_RATES.find((v) => v.id === l.vat) || VAT_RATES[0];
      const applyRE = isInvoice && !!customerById(doc.customerId)?.re;
      const reRate = applyRE
        ? (l.vat === "iva21" ? 5.2 : l.vat === "iva10" ? 1.4 : l.vat === "iva4" ? 0.5 : 0)
        : 0;
      const total = computeTotals({ lines: [l] }, customerById(doc.customerId), { isInvoice }).total;

      // 👇 nombre + descripción en la misma celda
      const namePlusDesc = [l.name, l.desc].filter(Boolean).join(" — ");

      return `<tr>
        <td>${namePlusDesc || ""}</td>
        <td>${l.qty}</td>
        <td>${fmtMoney(l.price)}</td>
        <td>${l.dtopct || 0}%</td>
        <td>${vat.name}${applyRE && reRate ? ` + RE ${reRate}%` : ""}</td>
        <td>${fmtMoney(total)}</td>
      </tr>`;
    })
    .join("");
    const c = customerById(doc.customerId);
    const addrSeller = `${seller.address}, ${seller.postalCode} ${seller.city} (${seller.country})`;
    const addrBuyer = `${c?.address || ""}${c?.postalCode ? ", " + c.postalCode : ""}${c?.city ? " " + c.city : ""}${c?.country ? " (" + c.country + ")" : ""}`;

    const deliveryBlock = !isInvoice ? `<div style="border:1px solid #ddd;border-radius:8px;padding:10px;margin-top:10px">
      <div><b>Dirección de entrega</b></div><div>${doc.deliveryAddress || c?.deliveryAddress || addrBuyer}</div>
      <div class="muted">Fecha de entrega: ${fmtDate(doc.deliveryDate)}</div></div>` : "";

    const legalNote = isInvoice
      ? `<p class="muted" style="margin-top:6px">Documento conforme a RD 1619/2012.${doc.isExempt && doc.exemptNote ? " " + doc.exemptNote : ""}${c?.re ? " — Cliente en recargo de equivalencia." : ""}</p>`
      : `<p class="muted" style="margin-top:6px">Documento de entrega (no fiscal).</p>`;

    return `<!doctype html><html><head><meta charset="utf-8"><title>${title} ${num}</title><style>${css}</style></head><body>
      <div class="row">
        <div><h2>${seller.name}</h2><div class="muted">NIF: ${seller.nif}</div><div class="muted">${addrSeller}</div><div class="muted">${seller.email} · ${seller.phone}</div></div>
        <div style="text-align:right"><h1>${title}</h1><div>Número: <b>${num}</b></div><div>Fecha: <b>${fmtDate(doc.date)}</b></div></div>
      </div>
      <div class="row">
        <div><div><b>Cliente</b></div><div>${c?.name || ""}</div><div class="muted">NIF: ${c?.nif || ""}</div><div class="muted">${addrBuyer}</div></div>
      </div>
      ${deliveryBlock}
      <table style="margin-top:12px"><thead><tr><th>Descripción</th><th>Ud.</th><th>Precio</th><th>Dto</th><th>Tipo</th><th>Importe</th></tr></thead><tbody>${lines}</tbody></table>
      <div class="tot"><div>Base imponible: <b>${fmtMoney(computeTotals(doc,c,{isInvoice}).neto)}</b></div><div>IVA: <b>${fmtMoney(computeTotals(doc,c,{isInvoice}).totaliva)}</b></div>
      ${computeTotals(doc,c,{isInvoice}).totalre>0?`<div>Recargo de equivalencia: <b>${fmtMoney(computeTotals(doc,c,{isInvoice}).totalre)}</b></div>`:""}
      ${computeTotals(doc,c,{isInvoice}).totalirpf!==0?`<div>IRPF: <b>${fmtMoney(computeTotals(doc,c,{isInvoice}).totalirpf)}</b></div>`:""}
      <div style="margin-top:8px">TOTAL: <b>${fmtMoney(computeTotals(doc,c,{isInvoice}).total)}</b></div></div>
      <div style="clear:both"></div>${legalNote}
    </body></html>`;
  }
  const printAlbaran = (a) => openPrintWindow(renderDocHTML(a, "albaran"));
  const printFactura = (f) => openPrintWindow(renderDocHTML(f, "factura"));
  const printCP = (cp) => openPrintWindow(renderCPHTML(cp));
  // ===== Enviar por email (PDF adjunto) =====
  async function emailFactura(f) {
    const c = customers.find(x => x.id === f.customerId);
    const to = prompt("Enviar factura a (email):", c?.email || "") || "";
    if (!to) return;
    const html = renderDocHTML(f, "factura");
    const filename = `Factura_${f.series || ""}-${f.number || "s-n"}.pdf`;
    try {
      await sendEmailWithPDF({
        to,
        subject: `Factura ${f.series}-${f.number}`,
        message: `Adjuntamos la factura ${f.series}-${f.number}.`,
        html,
        filename,
      });
      alert("✅ Email enviado");
    } catch (e) {
      console.error(e);
      alert("❌ No se pudo enviar el email: " + (e?.message || e));
    }
  }

  async function emailAlbaran(a) {
    const c = customers.find(x => x.id === a.customerId);
    const to = prompt("Enviar albarán a (email):", c?.email || "") || "";
    if (!to) return;
    const html = renderDocHTML(a, "albaran");
    const filename = `Albaran_${a.series || ""}-${a.number || "s-n"}.pdf`;
    try {
      await sendEmailWithPDF({
        to,
        subject: `Albarán ${a.series}-${a.number}`,
        message: `Adjuntamos el albarán ${a.series}-${a.number}.`,
        html,
        filename,
      });
      alert("✅ Email enviado");
    } catch (e) {
      console.error(e);
      alert("❌ No se pudo enviar el email: " + (e?.message || e));
    }
  }

  async function emailCP(cp) {
    // si tu CP tiene customerId o consignatarioId, intenta resolver correo
    const cid = cp.customerId || cp.consignatarioId;
    const c = customers.find(x => x.id === cid);
    const to = prompt("Enviar Carta de Porte a (email):", c?.email || "") || "";
    if (!to) return;
    const html = renderCPHTML(cp);
    const filename = `CartaPorte_${cp.numero || "s-n"}.pdf`;
    try {
      await sendEmailWithPDF({
        to,
        subject: `Carta de Porte ${cp.numero || ""}`,
        message: `Adjuntamos la Carta de Porte ${cp.numero || ""}.`,
        html,
        filename,
      });
      alert("✅ Email enviado");
    } catch (e) {
      console.error(e);
      alert("❌ No se pudo enviar el email: " + (e?.message || e));
    }
  }

  function upsertProduct(prod) {
    setProducts((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      map.set(prod.id, { ...map.get(prod.id), ...prod });
      return Array.from(map.values());
    });
  }


  return (
    <div className="app-shell mx-auto max-w-7xl p-4 sm:p-5 md:p-6 space-y-5">
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

      <header className="flex items-center justify-between">
        <nav className="flex gap-2 p-1 border rounded-full">
          <button className={`px-3 py-1 rounded-lg ${tab==="albaranes"?"bg-black text-white":"bg-gray-100"}`} onClick={() => setTab("albaranes")}>Albaranes</button>
          <button className={`px-3 py-1 rounded-lg ${tab==="facturas"?"bg-black text-white":"bg-gray-100"}`} onClick={() => setTab("facturas")}>Facturas</button>
          <button className={`px-3 py-1 rounded-lg ${tab==="cp"?"bg-black text-white":"bg-gray-100"}`} onClick={() => setTab("cp")}>Carta de Porte</button>
          <button className={`px-3 py-1 rounded-lg ${tab==="clientes"?"bg-black text-white":"bg-gray-100"}`} onClick={() => setTab("clientes")}>Clientes</button>
          <button className={`px-3 py-1 rounded-lg ${tab==="contabilidad"?"bg-black text-white":"bg-gray-100"}`} onClick={()=>setTab("contabilidad")}> Contabilidad </button>
          <button className="px-3 py-1 border rounded" onClick={() => setSellerOpen(true)}>
            ⚙️ Empresa
          </button>

        </nav>
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
        />
      )}

      {tab==="contabilidad" && (
        <ResumenFiscal
          invoices={invoices}
          customers={customers}
        />
      )}
      
      {sellerOpen && (
        <Dialog open={sellerOpen} onClose={() => setSellerOpen(false)} title="Datos fiscales de la empresa">
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
        </Dialog>
      )}

      {loading && (
        <div className="fixed inset-0 bg-white/70 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent border-black"></div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-white/70 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent border-black"></div>
        </div>
      )}
    </div>
  );
}
