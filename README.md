# Marcus Momento — PWA de envio de vídeos

Aplicação mobile-first instalável no celular para encaminhar vídeos de registros ao WhatsApp dos clientes.

## Como funciona
1. O navegador envia o vídeo diretamente ao Vercel Blob (sem atravessar o limite de 4,5 MB das Functions).
2. A rota `/api/upload-token` autoriza uploads com um código de acesso.
3. A rota `/api/enviar` envia ao n8n um JSON com número, nome do arquivo e URL do vídeo.

## Variáveis na Vercel
- `N8N_WEBHOOK_URL`: URL do webhook de produção do n8n.
- `APP_ACCESS_PIN`: código privado do fotógrafo.
- `BLOB_READ_WRITE_TOKEN`: criado automaticamente ao conectar um Blob Store ao projeto.

## Ajuste necessário no n8n
O webhook recebe JSON, não o arquivo binário. Após o Webhook, configure um nó HTTP Request (GET) com URL `{{$json.body.videoUrl}}` — ou `{{$json.videoUrl}}`, conforme a saída do seu nó — para baixar o vídeo e disponibilizá-lo como binário ao nó de envio de WhatsApp. O número chega em formato internacional (ex.: `5575999998888`).

O retorno 2xx do webhook confirma que o n8n aceitou o gatilho, não que o WhatsApp já entregou a mídia. Confirme a execução do workflow.

Os vídeos ficam em um Blob público para permitir que o n8n os baixe sem credenciais adicionais. A URL é aleatória, mas qualquer pessoa que a possua pode acessar o vídeo. Defina uma política de retenção e exclusão adequada à privacidade dos clientes.

## Desenvolvimento
```bash
npm install
npm run dev
npm run build
```
