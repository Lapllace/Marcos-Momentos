import { upload } from '@vercel/blob/client';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const form = $('#send-form');
const phone = $('#phone');
const pin = $('#pin');
const video = $('#video');
const button = $('#submit-button');
const status = $('#status');
const progressArea = $('#progress-area');
$('#year').textContent = new Date().getFullYear();

const formatSize = (bytes) => bytes < 1024 ** 2
  ? (bytes / 1024).toFixed(0) + ' KB'
  : bytes < 1024 ** 3
    ? (bytes / 1024 ** 2).toFixed(1) + ' MB'
    : (bytes / 1024 ** 3).toFixed(2) + ' GB';

function normalizedPhone(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && [12, 13].includes(digits.length)) return digits;
  if ([10, 11].includes(digits.length)) return '55' + digits;
  return null;
}
function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('error', error);
}
function progress(percent, label) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  progressArea.hidden = false;
  $('#progress-label').textContent = label;
  $('#progress-value').textContent = value + '%';
  $('#progress-bar').style.width = value + '%';
}

video.addEventListener('change', () => {
  const file = video.files?.[0];
  $('#file-title').textContent = file?.name || 'Toque para selecionar o vídeo';
  $('#file-meta').textContent = file ? formatSize(file.size) + ' · ' + (file.type || 'vídeo') : 'MP4, MOV ou outro formato de vídeo';
  $('#dropzone').classList.toggle('selected', Boolean(file));
  message('');
});
phone.addEventListener('input', () => {
  const d = phone.value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) phone.value = d ? '(' + d : '';
  else if (d.length <= 6) phone.value = '(' + d.slice(0, 2) + ') ' + d.slice(2);
  else if (d.length <= 10) phone.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  else phone.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message('');
  progressArea.hidden = true;
  const number = normalizedPhone(phone.value);
  const file = video.files?.[0];
  const accessCode = pin.value.trim();
  if (!number) return message('Informe um número válido com DDD (10 ou 11 dígitos).', true);
  if (!file || !file.type.startsWith('video/')) return message('Selecione um arquivo de vídeo válido.', true);
  if (!accessCode) return message('Digite o código de acesso.', true);
  if (file.size > 1024 ** 3) return message('O vídeo ultrapassa o limite de 1 GB por envio.', true);

  button.disabled = true;
  $('#button-label').textContent = 'Enviando vídeo...';
  try {
    progress(0, 'Preparando upload...');
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/upload-token',
      clientPayload: JSON.stringify({ pin: accessCode }),
      multipart: file.size > 100 * 1024 * 1024,
      onUploadProgress: (p) => progress(p.percentage, 'Enviando vídeo para armazenamento...')
    });
    progress(100, 'Vídeo armazenado. Acionando entrega...');
    const response = await fetch('/api/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: number, filename: file.name, videoUrl: blob.url,
        contentType: file.type, sizeBytes: file.size, pin: accessCode
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível acionar o n8n.');
    message('Vídeo recebido e fluxo de entrega acionado.');
    form.reset();
    $('#file-title').textContent = 'Toque para selecionar o vídeo';
    $('#file-meta').textContent = 'MP4, MOV ou outro formato de vídeo';
    $('#dropzone').classList.remove('selected');
    progress(100, 'Solicitação concluída');
  } catch (error) {
    message(error?.message || 'Ocorreu um erro durante o envio.', true);
  } finally {
    button.disabled = false;
    $('#button-label').textContent = 'Enviar vídeo';
  }
});

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}