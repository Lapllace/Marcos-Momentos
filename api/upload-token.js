import { timingSafeEqual } from 'node:crypto';
import { handleUpload } from '@vercel/blob/client';

function validPin(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(received), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const accessPin = process.env.PHOTOGRAPHER_ACCESS_PIN || process.env.APP_ACCESS_PIN;
  if (!process.env.BLOB_READ_WRITE_TOKEN || !accessPin) {
    return res.status(503).json({ error: 'Armazenamento ou código de acesso ainda não configurado.' });
  }
  try {
    const response = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        let payload = {};
        try { payload = typeof clientPayload === 'string' ? JSON.parse(clientPayload) : clientPayload || {}; } catch {}
        if (!validPin(payload.pin, accessPin)) throw new Error('Código de acesso inválido.');
        return {
          allowedContentTypes: ['video/mp4','video/quicktime','video/webm','video/x-m4v','video/3gpp','video/3gpp2','video/x-msvideo','video/x-matroska'],
          maximumSizeInBytes: 1024 ** 3,
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async () => {}
    });
    return res.status(200).json(response);
  } catch (error) {
    const message = error?.message || 'Falha ao autorizar upload.';
    return res.status(message.includes('Código de acesso inválido') ? 401 : 400).json({ error: message });
  }
}