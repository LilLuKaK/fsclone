// api/send-pdf.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM || "onboarding@resend.dev";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { kind, data, to, subject, message, filename, customer } = req.body || {};
    if (!kind || !data || !to || !subject || !filename) {
      return res.status(400).json({ error: "Faltan campos: kind, data, to, subject, filename" });
    }

    // Carga condicional de Chromium + Puppeteer (Vercel vs local)
    const isVercel = !!process.env.VERCEL;
    let browser: any, page: any;

    let html: string;
    if (kind === "albaran" || kind === "factura") {
      const { renderDocHTML } = await import("../src/pdf/templates.js"); // Vite/TS compila .ts
      html = renderDocHTML(data, kind, customer);
    } else if (kind === "cp") {
      const { renderCPHTML } = await import("../src/pdf/templates.js");
      html = renderCPHTML(data);
    } else {
      return res.status(400).json({ error: "kind inválido" });
    }

    if (isVercel) {
      const chromium = await import("@sparticuz/chromium");
      const puppeteer = await import("puppeteer-core");
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      const puppeteer = await import("puppeteer"); // requiere npm i -D puppeteer en local
      browser = await puppeteer.launch({ headless: "new" });
    }

    page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    // PDF respetando el tamaño del CSS (@page A4; margin:0) y con fondos
    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
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
