# Marcus Momento — PWA de envio de vídeos

Aplicação instalável no celular para encaminhar vídeos de registros aos clientes.

## Como funciona
1. O navegador envia o vídeo diretamente ao Vercel Blob.
2. `/api/upload-token` autoriza o upload usando um PIN privado.
3. `/api/enviar` chama o n8n com telefone, nome, URL e dados do vídeo.

## Variáveis necessárias
- `N8N_WEBHOOK_URL`: URL do webhook de produção do n8n.
- `APP_ACCESS_PIN`: código privado do fotógrafo.
- `BLOB_READ_WRITE_TOKEN`: gerado ao conectar o Blob Store da Vercel ao projeto.

## Ajuste obrigatório no n8n
O Webhook recebe JSON, não o arquivo binário. Após o Webhook, configure um nó HTTP Request (GET) para baixar `{{$json.body.videoUrl}}` (ou `{{$json.videoUrl}}`, conforme a saída do nó) e encaminhar o binário ao nó de envio de mídia pelo WhatsApp. O telefone chega em formato internacional, por exemplo `5575999998888`.

Uma resposta 2xx apenas confirma que o n8n aceitou o gatilho; confira a execução do workflow para confirmar o envio ao WhatsApp.

Os vídeos ficam em Blob público para que o n8n possa baixá-los sem credenciais extras. Qualquer pessoa com a URL pode acessar o conteúdo. Trate os links como privados e defina política de exclusão/retenção dos vídeos conforme a privacidade dos clientes.

## Desenvolvimento
```bash
npm install
npm run dev
npm run build
```
