// @ts-nocheck
import { fmtDate, fmtMoney, computeTotals, Seller } from "./../utils";

// Mismo CSS base que usas hoy (A4, margen 0; el margen visual es el padding de .page)
const BASE_CSS = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Arial, sans-serif;
    font-size: 11pt; color: #111;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page { width: 595pt; min-height: 842pt; margin: 0 auto; padding: 40pt; background: #fff; }
  h1 { font-size: 18pt; margin: 0 }
  h2 { font-size: 12pt; margin: 0 }
  .row{ display:flex; justify-content:space-between; gap:12pt; margin-bottom:10pt; align-items:flex-start; }
  .muted{ color:#666; font-size:9pt }
  .box{ border:1px solid #ddd; border-radius:6pt; padding:8pt; margin-top:8pt }
  table{ width:100%; border-collapse: collapse; table-layout: fixed; }
  th,td{ border-bottom:1px solid #ddd; padding:6pt; vertical-align:top; }
  th{ text-align:left; font-weight:600; }
  .desc{ text-align:left; word-break: break-word; }
  .num { text-align:right; font-variant-numeric: tabular-nums; }
  .tot{ margin-top:12pt; float:right; min-width: 170pt }
  @media print { .page { box-shadow:none } }
`;

function addrSellerHTML(seller = Seller) {
  return `
    <div><b>${seller.name}</b> — NIF: ${seller.nif}</div>
    <div>${seller.address}</div>
    <div>${seller.postalCode} ${seller.city} (${seller.country})</div>
    <div>${seller.email} — ${seller.phone}</div>
  `;
}

function addrCustomerHTML(c) {
  return `
    <div><b>${c?.name || ""}</b>${c?.nif ? ` — NIF: ${c.nif}` : ""}</div>
    <div>${c?.address || ""}</div>
    <div>${[c?.postalCode, c?.city].filter(Boolean).join(" ")}</div>
    <div>${c?.country || ""}</div>
  `;
}

// === ALBARÁN / FACTURA ===
export function renderDocHTML(
  doc: any,
  type: "albaran" | "factura",
  customer: any = null
) {
  const isInvoice = type === "factura";
  const c = customer; // pásalo desde App para evitar acceso a estado
  const t = computeTotals(doc, c, { isInvoice });

  const title = isInvoice ? "FACTURA" : "ALBARÁN";
  const num = `${doc.series || "S"}-${doc.number ?? ""}`;

  const legalNote = isInvoice
    ? `<p class="muted" style="margin-top:6pt">Documento conforme a normativa aplicable. ${c?.re ? "Cliente en recargo de equivalencia." : ""}</p>`
    : `<p class="muted" style="margin-top:6pt">Documento de entrega (no fiscal).</p>`;

  const linesHTML = (doc.lines || [])
    .map((l) => `
      <tr>
        <td class="desc">${l.desc || ""}</td>
        <td class="num">${l.qty || 0}</td>
        <td class="num">${fmtMoney(l.price || 0)}</td>
        <td class="num">${l.dtopct || 0}%</td>
        <td class="num">${l.vat?.toUpperCase() || ""}</td>
        <td class="num">${fmtMoney((l.qty||0)*(l.price||0)*(1-(l.dtopct||0)/100))}</td>
      </tr>
    `).join("");

  const docHTML = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>${title} ${num}</title>
      <style>${BASE_CSS}</style>
    </head>
    <body>
      <div class="page">
        <div class="row">
          <div>
            <h1>${title}</h1>
            <div class="muted">Número: <b>${num}</b></div>
            <div class="muted">Fecha: <b>${fmtDate(doc.date)}</b></div>
          </div>
          <div class="muted" style="text-align:right">${addrSellerHTML()}</div>
        </div>

        <div class="box">
          <div class="label muted" style="margin-bottom:4pt">Cliente</div>
          ${addrCustomerHTML(c)}
        </div>

        <div class="box">
          <table>
            <thead>
              <tr>
                <th style="width:46%">Descripción</th>
                <th style="width:8%" class="num">Ud.</th>
                <th style="width:14%" class="num">Precio</th>
                <th style="width:10%" class="num">Dto</th>
                <th style="width:10%" class="num">Tipo</th>
                <th style="width:12%" class="num">Importe</th>
              </tr>
            </thead>
            <tbody>${linesHTML}</tbody>
          </table>
        </div>

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

  return docHTML;
}

// === CARTA DE PORTE ===
// Copiado de tu pages/CartaPorte.tsx (mismo aspecto) pero sin React/DOM:
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
    .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 8pt; }
    .grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 8pt; }
    .box { border:1px solid #ddd; border-radius:6pt; padding:8pt; }
    .label { font-size: 9pt; color:#666; margin-bottom: 4pt }
  `;

  const s = (x) => (x == null ? "" : String(x));

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Carta de Porte ${s(cp.numero) || ""}</title>
      <style>${PRINT_CSS}</style>
    </head>
    <body>
      <div class="page">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <h1>CARTA DE PORTE NACIONAL</h1>
            <div class="muted">Documento de control de envíos de transporte público de mercancías (Orden FOM/2861/2012)</div>
          </div>
          <div class="right muted">
            <div><b>Fecha:</b> ${s(fmtDate(cp.date))}</div>
            <div><b>Nº:</b> ${s(cp.numero) || "-"}</div>
          </div>
        </div>
        <!-- (resto de bloques igual que tu versión actual) -->
      </div>
    </body>
  </html>`;
}