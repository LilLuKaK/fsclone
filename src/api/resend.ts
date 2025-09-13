// /api/resend.ts  (Vercel Serverless Function)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM || 'Facturación <facturas@tu-dominio.com>';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { to, subject, message, filename, pdfBase64 } = req.body || {};
    if (!to || !subject || !filename || !pdfBase64) {
      return res.status(400).json({ error: 'Faltan campos: to, subject, filename, pdfBase64' });
    }

    const result = await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: `<p>${(message || '').replace(/\n/g,'<br/>')}</p>`,
      attachments: [
        {
          filename,
          content: Buffer.from(pdfBase64, 'base64') // convierte base64 → Buffer
        }
      ]
    });

    return res.status(200).json({ ok: true, id: result?.data?.id });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Error enviando email' });
  }
}
