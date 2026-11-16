import { timingSafeEqual } from 'node:crypto';

function validPin(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(received), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
const fail = (res, code, error) => res.status(code).json({ ok: false, error });

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');
  const { N8N_WEBHOOK_URL, APP_ACCESS_PIN } = process.env;
  if (!N8N_WEBHOOK_URL || !APP_ACCESS_PIN) return fail(res, 503, 'Configuração do webhook ou do código de acesso pendente.');
  const { phone, filename, videoUrl, contentType, sizeBytes, pin } = req.body || {};
  if (!validPin(pin, APP_ACCESS_PIN)) return fail(res, 401, 'Código de acesso inválido.');
  if (typeof phone !== 'string' || !/^55\d{10,11}$/.test(phone)) return fail(res, 400, 'Número de WhatsApp inválido.');
  if (typeof filename !== 'string' || !filename.trim() || filename.length > 240) return fail(res, 400, 'Nome do arquivo inválido.');
  let blob;
  try { blob = new URL(videoUrl); } catch { return fail(res, 400, 'URL do vídeo inválida.'); }
  if (blob.protocol !== 'https:' || !blob.hostname.endsWith('.public.blob.vercel-storage.com')) return fail(res, 400, 'URL de vídeo fora do armazenamento autorizado.');
  let webhook;
  try { webhook = new URL(N8N_WEBHOOK_URL); } catch { return fail(res, 500, 'URL do n8n inválida na configuração.'); }
  if (webhook.protocol !== 'https:') return fail(res, 500, 'O webhook precisa usar HTTPS.');
  try {
    const result = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone, filename: filename.trim(), videoUrl: blob.toString(),
        contentType: typeof contentType === 'string' ? contentType : 'video/mp4',
        sizeBytes: Number.isFinite(Number(sizeBytes)) ? Number(sizeBytes) : null,
        source: 'marcus-momento-pwa', uploadedAt: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!result.ok) return fail(res, 502, 'O n8n respondeu com status ' + result.status + '.');
    return res.status(200).json({ ok: true });
  } catch (error) {
    return fail(res, 502, error?.name === 'TimeoutError' ? 'Tempo limite do n8n excedido.' : 'Não foi possível conectar ao n8n.');
  }
}