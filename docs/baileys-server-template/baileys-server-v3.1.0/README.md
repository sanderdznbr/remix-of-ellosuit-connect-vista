# 🚀 Baileys Server v3.1.0 - Com Suporte a Mídia

Servidor Baileys completo com suporte a **mídias** (imagens, áudios, vídeos, documentos) e **grupos**.

## 📁 Arquivos

- `package.json` - Dependências do projeto
- `index.js` - Código do servidor (arquivo único)

## 🔧 Instalação

### 1. Criar pasta e copiar arquivos

```bash
mkdir baileys-server
cd baileys-server
# Copie os arquivos package.json e index.js para esta pasta
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env`:

```env
# Webhook do Supabase (Edge Function)
SUPABASE_WEBHOOK_URL=https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/whatsapp-webhook

# Supabase Storage (para upload de mídias)
SUPABASE_URL=https://jwddiyuezqrpuakazvgg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

**Onde pegar a SUPABASE_SERVICE_ROLE_KEY:**
1. Acesse o Dashboard do Supabase
2. Vá em Settings > API
3. Copie a "service_role key" (NÃO a anon key!)

### 4. Iniciar o servidor

```bash
npm start
```

Você deve ver:
```
============================================
🚀 Baileys Server v3.1.0 running on port 3333
============================================
📡 Webhook URL: https://...
📸 Media Support: ✅ Enabled
============================================
```

## 🚀 Deploy no Railway

### 1. Crie um repositório GitHub
Faça upload dos dois arquivos (`package.json` e `index.js`)

### 2. No Railway
1. New Project > Deploy from GitHub repo
2. Selecione seu repositório
3. Configure as variáveis de ambiente:

| Variável | Valor |
|----------|-------|
| `SUPABASE_WEBHOOK_URL` | `https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/whatsapp-webhook` |
| `SUPABASE_URL` | `https://jwddiyuezqrpuakazvgg.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Sua service role key |

**⚠️ NÃO defina PORT** - Railway configura automaticamente!

### 3. Deploy
Clique em "Deploy" e aguarde. Você verá a URL do seu servidor nos logs.

### 4. Atualizar no CRM
Copie a URL do Railway (ex: `https://baileys-server-xxx.up.railway.app`) e atualize no CRM WhatsApp.

## 📋 Funcionalidades

### ✅ Suporte Completo a Grupos
- Nome do remetente extraído automaticamente
- Telefone do remetente para mensagens de grupo
- Funciona com grupos de qualquer tamanho

### ✅ Suporte a Mídias
| Tipo | Extensão | Upload automático |
|------|----------|-------------------|
| Imagem | jpg | ✅ |
| Vídeo | mp4 | ✅ |
| Áudio | mp3 | ✅ |
| PTT (voz) | ogg | ✅ |
| Documento | pdf, doc, etc | ✅ |
| Sticker | webp | ✅ |

### ✅ Melhorias v3.1.0
- Retry automático para download de mídia (3 tentativas)
- Extração correta de remetente em grupos
- Melhor tratamento de erros
- Logs mais detalhados
- Suporte a envio de mídia (imagem, vídeo, áudio, documento)

## 🔗 API Endpoints

### Health Check
```
GET /api/health
```

### Criar Sessão
```
POST /api/instance/create
Body: { sessionId, instanceName, webhookSecret }
```

### Obter QR Code
```
GET /api/instance/:sessionId/qr
```

### Status da Sessão
```
GET /api/instance/:sessionId/status
```

### Enviar Mensagem de Texto
```
POST /api/message/send-text
Body: { sessionId, phone, message }
```

### Enviar Mídia
```
POST /api/message/send-media
Body: { sessionId, phone, mediaUrl, mediaType, caption, fileName }
mediaType: 'image' | 'video' | 'audio' | 'ptt' | 'document'
```

## ❓ Troubleshooting

### Mídias não aparecem no CRM
1. Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada
2. Verifique os logs: deve mostrar "Media Support: ✅ Enabled"
3. Confirme que o bucket `whatsapp-media` existe e é público no Supabase

### Grupos mostram remetente vazio
- Atualize para v3.1.0 que corrige a extração de participantes

### QR Code não aparece
- Verifique os logs do servidor
- Certifique-se de que `SUPABASE_WEBHOOK_URL` está correta

### Servidor não conecta
- Verifique se a porta não está em uso
- No Railway, NÃO defina a variável PORT manualmente
