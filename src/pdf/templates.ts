// @ts-nocheck
import { fmtDate, fmtMoney, computeTotals, Seller } from "../utils";

/** CSS base idéntico para impresión y PDF en servidor */
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
  .muted { color:#555; font-size: 9pt }
  .row { display:flex; justify-content:space-between; align-items:flex-start; gap: 8pt; }
  .box{ border:1px solid #ddd; border-radius:6pt; padding:8pt; margin-top:8pt }
  table{ width:100%; border-collapse: collapse; table-layout: fixed; }
  th,td{ border-bottom:1px solid #ddd; padding:6pt; vertical-align:top; }
  th{ text-align:left; font-weight:600; }
  .desc{ text-align:left; word-break: break-word; }
  .num { text-align:right; font-variant-numeric: tabular-nums; }
  .tot{ margin-top:12pt; float:right; min-width: 170pt }
  @media print { .page { box-shadow:none } }
`;

/** Bloques de dirección */
function addrSellerHTML(seller) {
  if (!seller) return "";
  return `
    <div><b>${seller.name || ""}</b>${seller.nif ? ` — NIF: ${seller.nif}` : ""}</div>
    <div>${seller.address || ""}</div>
    <div>${[seller.postalCode, seller.city].filter(Boolean).join(" ") || ""}${seller.country ? ` (${seller.country})` : ""}</div>
    <div>${[seller.email, seller.phone].filter(Boolean).join(" — ")}</div>
  `;
}
function addrCustomerHTML(c) {
  if (!c) return "";
  return `
    <div><b>${c.name || ""}</b>${c.nif ? ` — NIF: ${c.nif}` : ""}</div>
    <div>${c.address || ""}</div>
    <div>${[c.postalCode, c.city].filter(Boolean).join(" ")}</div>
    <div>${c.country || ""}</div>
  `;
}

/** === ALBARÁN / FACTURA ===
 *  type: "albaran" | "factura"
 *  customer: cliente usado para totales (RE/IRPF)
 *  seller: datos de tu empresa (SIEMPRE pasar)
 */
export function renderDocHTML(doc, type, customer, seller = Seller) {
  const isInvoice = type === "factura";
  const t = computeTotals(doc, customer, { isInvoice });

  const title = isInvoice ? "FACTURA" : "ALBARÁN";
  const num = `${doc.series || "S"}-${doc.number ?? ""}`;

  const legalNote = isInvoice
    ? `<p class="muted" style="margin-top:6pt">Documento conforme a la Ley 37/1992 del IVA. ${customer?.re ? "Cliente en recargo de equivalencia." : ""}</p>`
    : `<p class="muted" style="margin-top:6pt">Documento de entrega (no fiscal).</p>`;

  const linesHTML = (doc.lines || []).map((l) => `
      <tr>
        <td class="desc">${[l.name, l.desc].filter(Boolean).join(" — ")}</td>
        <td class="num">${l.qty ?? ""}</td>
        <td class="num">${fmtMoney(l.price ?? 0)}</td>
        <td class="num">${l.dtopct || 0}%</td>
        <td class="num">${l.vat ? l.vat.toUpperCase() : ""}</td>
        <td class="num">${fmtMoney((l.qty || 0) * (l.price || 0) * (1 - (l.dtopct || 0)/100))}</td>
      </tr>
  `).join("");

  return `<!doctype html>
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
            <div class="muted">Número: <b>${doc.series}-${doc.number}</b></div>
            <div class="muted">Fecha: <b>${fmtDate(doc.date)}</b></div>
          </div>
          <div class="muted" style="text-align:right">
            ${addrSellerHTML(seller)}   <!-- bloque EMPRESA -->
          </div>
        </div>

        <div class="box">
          <div class="label muted" style="margin-bottom:4pt">Cliente</div>
          ${addrCustomerHTML(customer)} <!-- bloque CLIENTE -->
        </div>

        <div class="box">
          <table>
            <colgroup>
              <col style="width:46%">
              <col style="width:8%">
              <col style="width:14%">
              <col style="width:10%">
              <col style="width:10%">
              <col style="width:12%">
            </colgroup>
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
}

/** === CARTA DE PORTE (NACIONAL) ===
 *  cp: objeto con todos los campos del formulario
 *  seller: opcional (si quieres usarlo como remitente por defecto)
 */
export function renderCPHTML(cp, seller = null) {
  const s = (v) => (v ?? "");
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

  // fallback: si no hay remitente, usa el seller como remitente
  const remitente = cp?.remitente?.name ? cp.remitente : (seller ? {
    name: seller.name, nif: seller.nif, address: [seller.address, seller.postalCode, seller.city].filter(Boolean).join(" "),
  } : cp.remitente);

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Carta de Porte ${s(cp.numero)}</title>
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

        <div class="grid2" style="margin-top:10pt">
          <div class="box">
            <div class="label">1 · Remitente / Cargador contractual</div>
            <div><b>${s(remitente?.name || "")}</b></div>
            <div class="muted">${s(remitente?.nif || "")}</div>
            <div class="muted">${s(remitente?.address || "")}</div>
            ${cp?.cargadorContractual?.name ? `
              <div class="muted" style="margin-top:4pt">
                <b>Cargador contractual:</b> ${s(cp.cargadorContractual?.name)} — ${s(cp.cargadorContractual?.nif || "")} — ${s(cp.cargadorContractual?.address || "")}
              </div>` : ``}
          </div>

          <div class="box">
            <div class="label">2 · Consignatario</div>
            <div><b>${s(cp.consignatario?.name)}</b></div>
            <div class="muted">${s(cp.consignatario?.nif)}</div>
            <div class="muted">${s(cp.consignatario?.address)}</div>
          </div>

          <div class="box">
            <div class="label">3 · Operador de transporte</div>
            <div><b>${s(cp.operador?.name)}</b></div>
            <div class="muted">${s(cp.operador?.cif)}</div>
            <div class="muted">${s(cp.operador?.address)}</div>
          </div>

          <div class="box">
            <div class="label">4 · Porteador</div>
            <div><b>${s(cp.porteador?.name)}</b></div>
            <div class="muted">${s(cp.porteador?.cif)}</div>
            <div class="muted">${s(cp.porteador?.address)}</div>
          </div>
        </div>

        <div class="grid2">
          <div class="box">
            <div class="label">5 · Lugar de entrega</div>
            <div>${s(cp.lugarEntrega)}</div>
            <div class="muted" style="margin-top:6pt"><b>Vehículo:</b> ${s(cp.vehiculo)}</div>
          </div>
          <div class="box">
            <div class="label">Lugar y fecha de carga</div>
            <div>${s(cp.lugarFechaCarga)}</div>
            <div class="muted" style="margin-top:6pt"><b>Documentos anexos:</b> ${s(cp.documentosAnexos)}</div>
          </div>
        </div>

        <div class="grid2">
          <div class="box">
            <div class="label">Porteadores sucesivos</div>
            <div>${s(cp.porteadoresSucesivos)}</div>
          </div>
          <div class="box">
            <div class="label">Reservas</div>
            <div>${s(cp.reservas)}</div>
          </div>
        </div>

        <div class="box">
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