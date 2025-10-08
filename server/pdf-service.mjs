// server/pdf-service.mjs
import express from "express";
import { Resend } from "resend";
import puppeteer from "puppeteer";

// IMPORTA tus plantillas TS (gracias al loader tsx en el arranque)
import { renderDocHTML, renderCPHTML } from "../src/pdf/templates.ts";

const app = express();
app.use(express.json({ limit: "6mb" }));

// Seguridad básica: solo tu dominio
const ALLOW_HOSTS = ["fsclone.lukaserver.com", "localhost", "127.0.0.1"];

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || "FSClone <no-reply@fsclone.lukaserver.com>";

app.post("/api/send-pdf", async (req, res) => {
  try {
    const host = String(req.headers["origin"] || req.headers["host"] || "");
    if (!ALLOW_HOSTS.some(h => host.includes(h))) {
      return res.status(403).json({ error: "forbidden" });
    }

    const { kind, data, to, subject, message, filename, customer, seller } = req.body || {};
    if (!kind || !data || !to || !subject || !filename) {
      return res.status(400).json({ error: "missing fields: kind,data,to,subject,filename" });
    }

    let html;
    if (kind === "albaran" || kind === "factura") html = renderDocHTML(data, kind, customer, seller);
    else if (kind === "cp") html = renderCPHTML(data, seller);
    else return res.status(400).json({ error: "invalid kind" });

    // En systemd/raíz, usa no-sandbox para evitar errores
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,  // respeta @page { size: A4; margin: 0 }
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    await browser.close();

    const result = await resend.emails.send({
      from: FROM,                    // Usa tu dominio (verificado en Resend)
      to: Array.isArray(to) ? to : [to],
      subject,
      html: `<p>${(message || "").replace(/\n/g, "<br/>")}</p>`,
      attachments: [{ filename, content: pdfBuffer, contentType: "application/pdf" }],
    });

    return res.json({ ok: true, id: result?.data?.id || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "server error" });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log("PDF service listening on :" + PORT));
