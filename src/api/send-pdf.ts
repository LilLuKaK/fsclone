// api/send-pdf.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
// IMPORTA ESTÁTICO el renderer para que TypeScript lo resuelva y lo empaquete
import { renderDocHTML, renderCPHTML } from "./../pdf/templates";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM || "onboarding@resend.dev";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { kind, data, to, subject, message, filename, customer } = req.body || {};
    if (!kind || !data || !to || !subject || !filename) {
      return res.status(400).json({ error: "Faltan campos: kind, data, to, subject, filename" });
    }

    // 1) Renderizamos HTML según el tipo
    let html: string;
    if (kind === "albaran" || kind === "factura") {
      html = renderDocHTML(data, kind, customer);
    } else if (kind === "cp") {
      html = renderCPHTML(data);
    } else {
      return res.status(400).json({ error: "kind inválido" });
    }

    // 2) Lanzamos Chrome headless (Vercel vs local)
    const isVercel = !!process.env.VERCEL;
    let browser: any;

    if (isVercel) {
      // Vercel: usa @sparticuz/chromium + puppeteer-core
      const chromium = await import("@sparticuz/chromium");
      const { default: puppeteer } = await import("puppeteer-core");

      // Algunos tipos no exponen todas las props -> tiramos de 'any' de forma acotada
      const chr: any = chromium;

      browser = await puppeteer.launch({
        args: chr.args,                                 // ✅
        executablePath: await chr.executablePath(),     // ✅
        headless: true,                                 // ✅ suficiente
        // defaultViewport no es necesario
      });
    } else {
      // Local: puppeteer completo con binario incluido
      const { default: puppeteer } = await import("puppeteer");
      browser = await puppeteer.launch({ headless: true });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true, // respeta @page size/margins del HTML
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    await browser.close();

    const result = await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: `<p>${(message || "").replace(/\n/g, "<br/>")}</p>`,
      attachments: [{ filename, content: pdfBuffer, contentType: "application/pdf" }],
    });

    return res.status(200).json({ ok: true, id: result?.data?.id });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Error generando/enviando PDF" });
  }
}
