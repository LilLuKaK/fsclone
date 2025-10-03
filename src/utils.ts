// @ts-nocheck
/* Utilidades compartidas, catálogos y cálculos */
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export const TZ = "Europe/Madrid";

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-ES", { timeZone: TZ });
export const fmtMoney = (n: number) =>
  Number(n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export const initialSequences = () => ({ "A-2025": { last: 0 }, "B-2025": { last: 0 } });

export function dedupeById<T extends { id?: string }>(arr: T[]) {
  const map = new Map<string, T>();
  (arr || []).forEach((x) => x?.id && map.set(x.id!, x));
  return Array.from(map.values());
}

export const Seller = {
  name: "Tu Empresa S.L.",
  nif: "B00000000",
  address: "C/ Ejemplo 123",
  city: "Madrid",
  postalCode: "28000",
  country: "España",
  email: "info@tuempresa.com",
  phone: "+34 600 000 000",
};

export function updateSeller(patch: Partial<typeof Seller>) {
  if (!patch) return;
  Object.assign(Seller, patch);
}

export const VAT_RATES = [
  { id: "iva21", label: "IVA 21%", rate: 0.21 },
  { id: "iva10", label: "IVA 10%", rate: 0.1 },
  { id: "iva4", label: "IVA 4%", rate: 0.04 },
  { id: "exento", label: "Exento (0%)", rate: 0 },
];

export const SERIES = [
  { code: "A", name: "Serie A 2025" },
  { code: "B", name: "Serie B 2025" },
];

export const PAYMENT_METHODS = [
  { code: "CONTADO", name: "Contado", schedule: [{ percent: 100, days: 0 }] },
  {
    code: "30-60-90",
    name: "30-60-90",
    schedule: [
      { percent: 33, days: 30 },
      { percent: 33, days: 60 },
      { percent: 34, days: 90 },
    ],
  },
];

export const PRODUCTS = [
  { id: "P001", ref: "ABANICOL", name: "Abanico color", price: 8, vat: "iva21" },
  { id: "P100", ref: "SERV001", name: "Servicio técnico", price: 50, vat: "iva21" },
];

export function resolveVat(vatId: string) {
  return VAT_RATES.find((v) => v.id === vatId) || VAT_RATES[0];
}
export function recargoEquivalenciaRate(vatId: string) {
  if (vatId === "iva21") return 0.052;
  if (vatId === "iva10") return 0.014;
  if (vatId === "iva4") return 0.005;
  return 0;
}

export function computeLine(line, { applyRE = false } = {}) {
  const base = (line.qty || 0) * (line.price || 0);
  const dto = base - base * (1 - (line.dtopct || 0) / 100);
  const baseAfterDto = base - dto;
  const vatRate = resolveVat(line.vat).rate;
  const vatAmt = baseAfterDto * vatRate;
  const irpfAmt = baseAfterDto * ((line.irpfpct || 0) / 100) * -1;
  const reRate = applyRE ? recargoEquivalenciaRate(line.vat) : 0;
  const reAmt = baseAfterDto * reRate;
  return { base, dto, baseAfterDto, vatAmt, irpfAmt, reAmt, total: baseAfterDto + vatAmt + reAmt + irpfAmt };
}

export function computeTotals(doc, customer, { isInvoice = false } = {}) {
  const applyRE = isInvoice && !!customer?.re;
  const sum = (a, v) => a + v;
  const computed = (doc.lines || []).map((l) => computeLine(l, { applyRE }));
  const bruto = computed.map((x) => x.base).reduce(sum, 0);
  const dto = computed.map((x) => x.dto).reduce(sum, 0);
  const neto = computed.map((x) => x.baseAfterDto).reduce(sum, 0);
  const totaliva = computed.map((x) => x.vatAmt).reduce(sum, 0);
  const totalre = computed.map((x) => x.reAmt).reduce(sum, 0);
  const totalirpf = computed.map((x) => x.irpfAmt).reduce(sum, 0);
  const total = neto + totaliva + totalre + totalirpf;
  return { bruto, dto, neto, totaliva, totalre, totalirpf, total };
}

export function nextNumber(seqs, seriesCode: string, date: string) {
  const year = new Date(date).getFullYear();
  const key = `${seriesCode}-${year}`;
  const entry = seqs[key] || { last: 0 };
  const next = entry.last + 1;
  return { code: key, next, seqs: { ...seqs, [key]: { last: next } } };
}

// @ts-nocheck
// Imprime HTML: móvil => nueva pestaña "blob:" con auto-print; desktop => iframe oculto
export function openPrintWindow(html: string, opts?: { title?: string; page?: "A4" | "Letter" }) {
  const ua = navigator.userAgent || navigator.vendor || "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const pageSize = opts?.page ?? "A4";

  // Inserta meta viewport + CSS de impresión y (en móvil) script de auto-print
  const buildDoc = (raw: string, autoPrint: boolean) => {
    const meta = `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`;
    const printCss = `<style>
      @page { size: ${pageSize}; margin: 14mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>`;
    const auto = autoPrint
      ? `<script>
          window.addEventListener('load', function(){
            setTimeout(function(){
              try{ window.focus(); window.print(); }catch(e){}
            }, 300);
          });
        </script>`
      : "";
    if (/<head[^>]*>/i.test(raw)) {
      return raw.replace(/<head[^>]*>/i, m => `${m}\n${meta}\n${printCss}\n${auto}\n`);
    }
    return `<!doctype html><html><head>${meta}${printCss}${auto}</head><body>${raw}</body></html>`;
  };

  if (isMobile) {
    // ——— Camino MÓVIL: pestaña nueva con blob: y auto-print dentro del propio documento
    const docHTML = buildDoc(html, true);
    const blob = new Blob([docHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank"); // no lo cerramos desde aquí
    if (!w) {
      alert("No se pudo abrir la vista de impresión. Permite ventanas emergentes para esta web.");
    }
    // revoca el blob cuando ya no lo necesites (tiempo prudente)
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  // ——— Camino ESCRITORIO: iframe oculto + print desde el iframe
  const docHTML = buildDoc(html, false);
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed", right: "0", bottom: "0",
    width: "1px", height: "1px", opacity: "0", pointerEvents: "none",
  } as CSSStyleDeclaration);
  const cleanup = () => { try { iframe.parentNode?.removeChild(iframe); } catch {} };

  iframe.onload = () => {
    setTimeout(() => {
      try {
        const win = iframe.contentWindow!;
        if (opts?.title) { try { win.document.title = opts.title; } catch {} }
        win.focus(); win.print();
      } finally {
        setTimeout(cleanup, 1500);
      }
    }, 150);
  };

  try {
    (iframe as any).srcdoc = docHTML;
  } catch {
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    doc?.open(); doc?.write(docHTML); doc?.close();
    return;
  }
  document.body.appendChild(iframe);
}


// @ts-nocheck

/** Carga html2pdf.js desde CDN si aún no está cargado */
export async function ensureHtml2Pdf() {
  if (window.html2pdf) return window.html2pdf;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar html2pdf.js"));
    document.head.appendChild(s);
  });
  return window.html2pdf;
}

// @ts-nocheck
/* ====================== EMAIL (EmailJS) ====================== */

// Convierte tu HTML a un BLOB de PDF (sin descargar)
export async function htmlToPDFBlob(html: string): Promise<Blob> {
  const html2pdf = await ensureHtml2Pdf();

  // Iframe oculto para medir estilos igual que imprimir
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0"; iframe.style.bottom = "0";
  iframe.style.width = "0"; iframe.style.height = "0"; iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  doc.open(); doc.write(html); doc.close();

  // Asegurar mismo contexto que impresión
  const extra = doc.createElement("style");
  extra.textContent = `
    @page{ size: Letter; margin: 14mm; }
    html,body{ margin:0; padding:0 }
    body{-webkit-print-color-adjust:exact; print-color-adjust:exact}
  `;
  doc.head.appendChild(extra);

  try { if (doc.fonts?.ready) await doc.fonts.ready; } catch {}
  const imgs = Array.from(doc.images) as HTMLImageElement[];
  await Promise.all(imgs.map(img => img.complete ? Promise.resolve()
    : new Promise(r => { img.onload = img.onerror = () => r(null); })));

  const root = (doc.querySelector(".page") as HTMLElement) || doc.body;

  const worker = html2pdf()
    .set({
      filename: "documento.pdf",
      margin: 0,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(root)
    .toPdf();

  const pdf = await worker.get("pdf");
  const blob = pdf.output("blob");
  iframe.parentNode?.removeChild(iframe);
  return blob as Blob;
}

export async function blobToBase64Data(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result)); // data:application/pdf;base64,xxxx
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

// utils.ts
import html2pdf from 'html2pdf.js';

// Detecta ruta del endpoint (Vercel: /api/resend; Netlify: /.netlify/functions/resend)
const EMAIL_ENDPOINT =
  (import.meta as any).env?.VITE_EMAIL_ENDPOINT  // opcional override desde .env
  || (window.location.host.includes('netlify.app') ? '/.netlify/functions/resend' : '/api/resend');

// @ts-nocheck

/** Convierte un HTML (el mismo de imprimir) a PDF base64, sin descargar */
async function htmlToPdfBase64(html: string): Promise<string> {
  // Usa tu ensureHtml2Pdf si ya lo tienes; si no, carga html2pdf.js como hacías antes
  const html2pdf = await ensureHtml2Pdf?.() ?? (await import("html2pdf.js")).default;

  // Iframe oculto con el MISMO HTML (para respetar estilos)
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px";   // ≈ A4 a 96dpi
  iframe.style.height = "1123px";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open(); doc.write(html); doc.close();

  // Esperar fuentes/imágenes (muy importante para que sea igual al impreso)
  try { if (doc.fonts?.ready) await doc.fonts.ready; } catch {}
  const imgs = Array.from(doc.images) as HTMLImageElement[];
  await Promise.all(imgs.map(img => img.complete ? Promise.resolve()
    : new Promise(r => { img.onload = img.onerror = () => r(null); })));

  const root = (doc.querySelector(".page") as HTMLElement) || doc.body;

  const worker = html2pdf()
    .set({
      margin: 0,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 794, width: 794 },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(root)
    .toPdf();

  const pdf = await worker.get("pdf");
  const blob = pdf.output("blob");

  // Blob → base64
  const ab = await blob.arrayBuffer();
  const uint = new Uint8Array(ab);
  let bin = "";
  for (let i = 0; i < uint.length; i++) bin += String.fromCharCode(uint[i]);
  const base64 = btoa(bin);

  iframe.parentNode?.removeChild(iframe);
  return base64;
}

/** Envía email con PDF adjunto a través del endpoint /api/resend (Vercel) */
export async function sendEmailWithPDF({
  to, subject, message, html, filename,
}: { to: string; subject: string; message?: string; html: string; filename: string; }) {
  // 1) Generar PDF base64 desde el navegador
  const pdfBase64 = await htmlToPdfBase64(html);

  // 2) Mandar al serverless /api/resend (no expone tu API key)
  const resp = await fetch("/api/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, message, filename, pdfBase64 }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(()=> "");
    throw new Error(t || `Fallo enviando email (${resp.status})`);
  }
  return await resp.json().catch(()=> ({}));
}

/** Convierte ArrayBuffer a base64 */
export function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Genera un PDF A4 desde un HTML (mismo que usas para imprimir) en la propia ventana. */
export async function makePdfFromHtml(html: string): Promise<{ blob: Blob; base64: string; url: string }> {
  // 1) Montar fuera de pantalla
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "-99999px";
  holder.style.top = "0";
  holder.style.width = "900px";
  holder.style.background = "#fff";
  holder.innerHTML = html;
  document.body.appendChild(holder);

  // 2) Asegurar .page A4 en pt si no viene (debería venir)
  let page = holder.querySelector(".page") as HTMLElement | null;
  if (!page) {
    page = document.createElement("div");
    page.className = "page";
    page.style.width = "595pt";
    page.style.minHeight = "842pt";
    page.style.padding = "40pt";
    page.style.background = "#fff";
    while (holder.firstChild) page.appendChild(holder.firstChild);
    holder.appendChild(page);
  }

  // 3) Esperar fuentes e imágenes
  try { if ((document as any).fonts?.ready) await (document as any).fonts.ready; } catch {}
  const imgs = Array.from(page.querySelectorAll("img"));
  await Promise.all(imgs.map(img => new Promise<void>(res => img.complete ? res() : (img.onload = img.onerror = () => res()))));
  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));

  // 4) Capturar y crear PDF
  const canvas = await html2canvas(page, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const dataUrl = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  pdf.addImage(dataUrl, "PNG", 0, 0, 595, 842);

  const blob = pdf.output("blob");
  const arr = await (blob as Blob).arrayBuffer();
  const base64 = arrayBufferToBase64(arr);
  const url = URL.createObjectURL(blob);

  // 5) Limpieza
  document.body.removeChild(holder);

  return { blob, base64, url };
}