import React, { useState } from 'react';
import { Download, Server, CheckCircle2, Loader2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import JSZip from 'jszip';
import { useToast } from '@/hooks/use-toast';

interface BaileysServerDownloadProps {
  webhookUrl?: string;
}

const BaileysServerDownload: React.FC<BaileysServerDownloadProps> = ({ 
  webhookUrl = 'https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/whatsapp-webhook' 
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const generateServerFiles = () => {
    // ========== PACKAGE.JSON - v3.0.0 (CommonJS) + MEDIA SUPPORT ==========
    const packageJson = `{
  "name": "baileys-server",
  "version": "3.0.0",
  "main": "index.js",
  "type": "commonjs",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.75.1",
    "@whiskeysockets/baileys": "^6.7.9",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "mime-types": "^1.0.0",
    "pino": "^9.6.0",
    "qrcode": "^1.5.4"
  },
  "engines": {
    "node": ">=20"
  }
}`;

    const nodeVersion = `20`;

    const nixpacksToml = `[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm install"]

[start]
cmd = "node index.js"`;

    const gitignore = `node_modules/
sessions/
.env
*.log`;

    const readme = `# 🚀 Baileys Server v3.0.0 - Suporte Completo a Mídias

## ✅ Novidades v3.0.0

Esta versão adiciona suporte completo a **mídias** (imagens, áudios, vídeos, documentos).

### Mudanças v3.0.0:
- ✅ **Suporte a Mídias** - Imagens, vídeos, áudios, documentos e stickers
- ✅ **Upload para Supabase Storage** - Mídias são salvas no bucket whatsapp-media
- ✅ **CommonJS** - Melhor compatibilidade com Railway
- ✅ **Baileys 6.7.9** - Versão estável com suporte a mídias

### Tipos de Mídia Suportados:
| Tipo | Extensão | Descrição |
|------|----------|-----------|
| image | jpg | Fotos e imagens |
| video | mp4 | Vídeos |
| ptt | ogg | Mensagens de voz |
| audio | mp3 | Arquivos de áudio |
| document | pdf, doc, etc | Documentos |
| sticker | webp | Figurinhas |

## Deploy no Railway

### 1. Suba para o GitHub
- Substitua **TODOS** os arquivos (especialmente index.js!)

### 2. No Railway
1. New Project → Deploy from GitHub
2. Selecione seu repositório
3. Em **Variables**, adicione:
   \`SUPABASE_WEBHOOK_URL\` = \`${webhookUrl}\`
   \`SUPABASE_URL\` = \`https://jwddiyuezqrpuakazvgg.supabase.co\`
   \`SUPABASE_SERVICE_ROLE_KEY\` = \`sua_service_role_key\` (pegar no Dashboard Supabase > Settings > API)

**NÃO** defina PORT - Railway define automaticamente!

### 3. Pronto!
Aguarde deploy completo (~3-4 minutos).

## Verificação de Logs

Após conectar, você verá:

\`\`\`
🚀 Baileys Server v3.0.0 running on port XXXX
📡 Webhook URL: https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/whatsapp-webhook
📸 Media Support: Enabled
\`\`\`
`;

    // ========== SERVIDOR v3.0.0 - SUPORTE COMPLETO A MÍDIAS ==========
    const indexJs = `const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Dynamic imports for ESM modules
let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadMediaMessage, Browsers;
let QRCode, pino, mime, supabase;

const app = express();
app.use(cors());
app.use(express.json());

// Store sessions in memory
const sessions = new Map();

// Environment variables
const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Sessions directory
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// ============== SUPABASE STORAGE ==============

async function uploadMediaToSupabase(buffer, sessionId, mediaType, extension) {
  if (!supabase || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('⚠️ Supabase not configured for media upload');
    return null;
  }

  try {
    const timestamp = Date.now();
    const hash = crypto.randomBytes(8).toString('hex');
    const fileName = \`\${sessionId}/\${mediaType}/\${timestamp}-\${hash}.\${extension}\`;

    const mimeType = mime.lookup(extension) || 'application/octet-stream';

    console.log(\`📤 Uploading media to Supabase: \${fileName}\`);

    const { data, error } = await supabase.storage
      .from('whatsapp-media')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(fileName);

    console.log(\`✅ Media uploaded: \${urlData.publicUrl}\`);
    return { url: urlData.publicUrl, mimeType };
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}

// ============== MEDIA PROCESSING ==============

async function processMediaMessage(socket, msg, sessionId) {
  try {
    const message = msg.message;
    if (!message) return null;

    let mediaType = null;
    let mediaMessage = null;
    let extension = '';

    if (message.imageMessage) {
      mediaType = 'image';
      mediaMessage = message.imageMessage;
      extension = 'jpg';
    } else if (message.videoMessage) {
      mediaType = 'video';
      mediaMessage = message.videoMessage;
      extension = 'mp4';
    } else if (message.audioMessage) {
      mediaType = message.audioMessage.ptt ? 'ptt' : 'audio';
      mediaMessage = message.audioMessage;
      extension = message.audioMessage.ptt ? 'ogg' : 'mp3';
    } else if (message.documentMessage) {
      mediaType = 'document';
      mediaMessage = message.documentMessage;
      extension = mediaMessage.fileName?.split('.').pop() || 'pdf';
    } else if (message.stickerMessage) {
      mediaType = 'sticker';
      mediaMessage = message.stickerMessage;
      extension = 'webp';
    }

    if (!mediaType || !mediaMessage) return null;

    console.log(\`📥 Downloading \${mediaType} media...\`);

    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      {
        logger: console,
        reuploadRequest: socket.updateMediaMessage
      }
    );

    if (!buffer) {
      console.error('Failed to download media buffer');
      return null;
    }

    // Upload to Supabase
    const uploadResult = await uploadMediaToSupabase(buffer, sessionId, mediaType, extension);
    
    if (uploadResult) {
      return {
        mediaUrl: uploadResult.url,
        mediaMimeType: uploadResult.mimeType,
        mediaType
      };
    }

    return { mediaType };
  } catch (error) {
    console.error('Error processing media:', error);
    return null;
  }
}

function hasMedia(msg) {
  const message = msg.message;
  if (!message) return false;
  return !!(
    message.imageMessage ||
    message.videoMessage ||
    message.audioMessage ||
    message.documentMessage ||
    message.stickerMessage
  );
}

function getMediaCaption(msg) {
  const message = msg.message;
  if (!message) return '';
  return message.imageMessage?.caption ||
         message.videoMessage?.caption ||
         message.documentMessage?.caption ||
         message.documentMessage?.fileName ||
         '';
}

// ============== WEBHOOK ==============

async function sendWebhook(payload) {
  if (!WEBHOOK_URL) {
    console.log('⚠️ No webhook URL configured');
    return;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(\`📤 Webhook sent: \${payload.event} - Status: \${response.status}\`);
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
  }
}

// ============== WHATSAPP SESSION ==============

async function createWhatsAppSession(sessionId, instanceName, webhookSecret) {
  if (sessions.has(sessionId)) {
    console.log(\`Session \${instanceName} already exists\`);
    return sessions.get(sessionId);
  }

  const sessionPath = path.join(SESSIONS_DIR, instanceName);

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  console.log(\`📱 Creating session: \${instanceName} (Baileys v\${version.join('.')})\`);

  const session = {
    sessionId,
    instanceName,
    socket: null,
    webhookSecret,
    qrCode: null,
    isConnected: false,
    phoneNumber: null,
    pushName: null,
    profilePicture: null
  };

  sessions.set(sessionId, session);

  const logger = pino({ level: 'silent' });

  const socket = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: Browsers.macOS('Desktop')
  });

  session.socket = socket;

  // Save credentials
  socket.ev.on('creds.update', saveCreds);

  // Connection updates
  socket.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      session.qrCode = await QRCode.toDataURL(qr);
      console.log(\`📱 QR Code generated for \${instanceName}\`);

      await sendWebhook({
        event: 'qr.update',
        sessionId,
        instanceName,
        data: { qrCode: session.qrCode }
      });
    }

    if (connection === 'open') {
      session.isConnected = true;
      session.qrCode = null;

      const user = socket.user;
      if (user) {
        session.phoneNumber = user.id.split(':')[0].replace('@s.whatsapp.net', '');
        session.pushName = user.name || user.notify || null;

        // Get profile picture
        try {
          session.profilePicture = await socket.profilePictureUrl(user.id, 'image');
        } catch (e) {
          session.profilePicture = null;
        }
      }

      console.log(\`✅ \${instanceName} connected! Phone: \${session.phoneNumber}\`);

      await sendWebhook({
        event: 'connection.update',
        sessionId,
        instanceName,
        data: {
          connection: 'open',
          isConnected: true,
          phoneNumber: session.phoneNumber,
          pushName: session.pushName,
          profilePicture: session.profilePicture
        }
      });
    }

    if (connection === 'close') {
      session.isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;

      console.log(\`❌ \${instanceName} disconnected. Code: \${statusCode}. Reconnect: \${shouldReconnect}\`);

      await sendWebhook({
        event: 'connection.update',
        sessionId,
        instanceName,
        data: { connection: 'close', isConnected: false, statusCode }
      });

      // Quick reconnect for 515 (restartRequired)
      if (statusCode === 515) {
        console.log('⚡ Quick reconnect for 515...');
        sessions.delete(sessionId);
        setTimeout(() => createWhatsAppSession(sessionId, instanceName, webhookSecret), 1000);
      } else if (shouldReconnect) {
        sessions.delete(sessionId);
        setTimeout(() => createWhatsAppSession(sessionId, instanceName, webhookSecret), 5000);
      } else {
        sessions.delete(sessionId);
      }
    }
  });

  // ============== INCOMING MESSAGES ==============
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') continue;

      let mediaUrl = null;
      let mediaMimeType = null;
      let mediaType = null;
      let mediaCaption = getMediaCaption(msg);

      // Process media if present
      if (hasMedia(msg)) {
        console.log(\`📨 Media message from \${msg.key.remoteJid}\`);
        const mediaResult = await processMediaMessage(socket, msg, sessionId);
        if (mediaResult) {
          mediaUrl = mediaResult.mediaUrl || null;
          mediaMimeType = mediaResult.mediaMimeType || null;
          mediaType = mediaResult.mediaType || null;
        }
      } else {
        const textContent = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || 
                          '';
        console.log(\`📨 Text message from \${msg.key.remoteJid}: \${textContent.substring(0, 50)}...\`);
      }

      // Get sender profile picture
      let senderProfilePic = null;
      try {
        senderProfilePic = await socket.profilePictureUrl(msg.key.remoteJid, 'image');
      } catch (e) {
        // Profile picture not available
      }

      await sendWebhook({
        event: 'messages.upsert',
        sessionId,
        instanceName,
        data: {
          messages: [{
            key: msg.key,
            message: msg.message,
            messageTimestamp: msg.messageTimestamp,
            pushName: msg.pushName,
            // Media fields
            mediaUrl,
            mediaMimeType,
            mediaType,
            mediaCaption,
            // Profile
            senderProfilePic
          }]
        }
      });
    }
  });

  // Message status updates
  socket.ev.on('messages.update', async (updates) => {
    await sendWebhook({
      event: 'messages.update',
      sessionId,
      instanceName,
      data: { updates }
    });
  });

  return session;
}

// ============== API ROUTES ==============

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    sessions: sessions.size,
    mediaSupport: !!(SUPABASE_URL && SUPABASE_SERVICE_KEY),
    timestamp: new Date().toISOString()
  });
});

// Create instance
app.post('/api/instance/create', async (req, res) => {
  try {
    const { sessionId, instanceName, webhookSecret } = req.body;

    if (!sessionId || !instanceName) {
      return res.status(400).json({ error: 'sessionId and instanceName required' });
    }

    const session = await createWhatsAppSession(sessionId, instanceName, webhookSecret || '');

    res.json({
      success: true,
      sessionId: session.sessionId,
      instanceName: session.instanceName,
      isConnected: session.isConnected
    });
  } catch (error) {
    console.error('Create instance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get QR Code
app.get('/api/instance/:sessionId/qr', (req, res) => {
  const session = sessions.get(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    qrCode: session.qrCode,
    isConnected: session.isConnected,
    phoneNumber: session.phoneNumber,
    pushName: session.pushName,
    profilePicture: session.profilePicture
  });
});

// Get status
app.get('/api/instance/:sessionId/status', (req, res) => {
  const session = sessions.get(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found', status: 'not_found' });
  }

  res.json({
    status: session.isConnected ? 'connected' : (session.qrCode ? 'waiting_qr' : 'connecting'),
    isConnected: session.isConnected,
    phoneNumber: session.phoneNumber,
    pushName: session.pushName,
    profilePicture: session.profilePicture
  });
});

// List all sessions
app.get('/api/instance/list', (req, res) => {
  const list = [];
  for (const [id, session] of sessions) {
    list.push({
      sessionId: id,
      instanceName: session.instanceName,
      isConnected: session.isConnected,
      phoneNumber: session.phoneNumber
    });
  }
  res.json({ sessions: list });
});

// Delete session
app.delete('/api/instance/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    if (session.socket) {
      await session.socket.logout();
    }
  } catch (e) {
    console.log('Logout error:', e.message);
  }

  // Delete session files
  const sessionPath = path.join(SESSIONS_DIR, session.instanceName);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true });
  }

  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

// Send text message
app.post('/api/message/send-text', async (req, res) => {
  try {
    const { sessionId, phone, message } = req.body;

    const session = sessions.get(sessionId);
    if (!session || !session.socket || !session.isConnected) {
      return res.status(400).json({ error: 'Session not connected' });
    }

    // Format phone number
    let jid = phone.replace(/\\D/g, '');
    if (!jid.includes('@')) {
      jid = jid + '@s.whatsapp.net';
    }

    await session.socket.sendMessage(jid, { text: message });

    res.json({ success: true, to: jid });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send media message
app.post('/api/message/send-media', async (req, res) => {
  try {
    const { sessionId, phone, mediaUrl, mediaType, caption } = req.body;

    const session = sessions.get(sessionId);
    if (!session || !session.socket || !session.isConnected) {
      return res.status(400).json({ error: 'Session not connected' });
    }

    let jid = phone.replace(/\\D/g, '');
    if (!jid.includes('@')) {
      jid = jid + '@s.whatsapp.net';
    }

    let content;
    switch (mediaType) {
      case 'image':
        content = { image: { url: mediaUrl }, caption };
        break;
      case 'video':
        content = { video: { url: mediaUrl }, caption };
        break;
      case 'audio':
        content = { audio: { url: mediaUrl }, mimetype: 'audio/mp4' };
        break;
      case 'document':
        content = { document: { url: mediaUrl }, mimetype: 'application/pdf', fileName: caption || 'document.pdf' };
        break;
      default:
        return res.status(400).json({ error: 'Invalid media type' });
    }

    await session.socket.sendMessage(jid, content);

    res.json({ success: true, to: jid });
  } catch (error) {
    console.error('Send media error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============== START SERVER ==============

async function startServer() {
  // Dynamic imports for ESM modules
  const baileysModule = await import('@whiskeysockets/baileys');
  makeWASocket = baileysModule.default;
  useMultiFileAuthState = baileysModule.useMultiFileAuthState;
  DisconnectReason = baileysModule.DisconnectReason;
  fetchLatestBaileysVersion = baileysModule.fetchLatestBaileysVersion;
  makeCacheableSignalKeyStore = baileysModule.makeCacheableSignalKeyStore;
  downloadMediaMessage = baileysModule.downloadMediaMessage;
  Browsers = baileysModule.Browsers;

  QRCode = require('qrcode');
  pino = require('pino');
  mime = require('mime-types');

  // Initialize Supabase client if credentials available
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('✅ Supabase Storage configured for media uploads');
  } else {
    console.log('⚠️ Supabase not configured - media will not be uploaded');
  }

  const PORT = process.env.PORT || 3333;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(\`🚀 Baileys Server v3.0.0 running on port \${PORT}\`);
    console.log(\`📡 Webhook URL: \${WEBHOOK_URL || 'Not configured'}\`);
    console.log(\`📸 Media Support: \${supabase ? 'Enabled' : 'Disabled'}\`);
  });
}

startServer().catch(console.error);
`;

    const envExample = `# Webhook do Supabase (Edge Function)
SUPABASE_WEBHOOK_URL=https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/whatsapp-webhook

# Supabase Storage (para upload de mídias)
SUPABASE_URL=https://jwddiyuezqrpuakazvgg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
`;

    return {
      'package.json': packageJson,
      '.gitignore': gitignore,
      '.node-version': nodeVersion,
      'nixpacks.toml': nixpacksToml,
      'README.md': readme,
      'index.js': indexJs,
      '.env.example': envExample
    };
  };

  const downloadZip = async () => {
    setDownloading(true);
    
    try {
      const zip = new JSZip();
      const files = generateServerFiles();
      
      for (const [filePath, content] of Object.entries(files)) {
        zip.file(filePath, content);
      }
      
      zip.folder('sessions');
      
      const blob = await zip.generateAsync({ type: 'blob' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'baileys-server-v3.0.0.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Download concluído!',
        description: 'Servidor v3.0.0 - Com suporte a mídias'
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error downloading:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar arquivo ZIP',
        variant: 'destructive'
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Baixar Servidor
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Servidor Baileys v3.0.0
            </DialogTitle>
            <DialogDescription>
              Servidor WhatsApp com suporte completo a mídias para deploy no Railway
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* What's New */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Novidades v3.0.0
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  Suporte completo a mídias (imagens, vídeos, áudios, documentos)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  Upload automático para Supabase Storage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  Player de áudio estilo WhatsApp
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  Download de mídias integrado
                </li>
              </ul>
            </div>

            {/* Files included */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">📦 Arquivos incluídos:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>package.json</code> - Dependências (Baileys 6.7.9 + Supabase)</li>
                <li>• <code>index.js</code> - Servidor completo com suporte a mídias</li>
                <li>• <code>.env.example</code> - Exemplo de variáveis de ambiente</li>
                <li>• <code>README.md</code> - Instruções de deploy</li>
                <li>• <code>nixpacks.toml</code> - Configuração Railway</li>
              </ul>
            </div>

            {/* Requirements */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Variáveis Obrigatórias no Railway
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>SUPABASE_WEBHOOK_URL</code> - URL do webhook</li>
                <li>• <code>SUPABASE_URL</code> - URL do projeto Supabase</li>
                <li>• <code>SUPABASE_SERVICE_ROLE_KEY</code> - Chave de serviço (Settings &gt; API)</li>
              </ul>
            </div>

            {/* Download button */}
            <Button 
              onClick={downloadZip} 
              disabled={downloading}
              className="w-full"
              size="lg"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando ZIP...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar baileys-server-v3.0.0.zip
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BaileysServerDownload;
