import React, { useState } from 'react';
import { Download, Server, CheckCircle2, Loader2, AlertTriangle, Image as ImageIcon, Users } from 'lucide-react';
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
    // ========== PACKAGE.JSON v3.1.0 ==========
    const packageJson = `{
  "name": "baileys-server",
  "version": "3.1.0",
  "description": "Servidor Baileys com suporte a mídia para WhatsApp CRM",
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
    "mime-types": "^2.1.35",
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

    const readme = `# 🚀 Baileys Server v3.1.0 - Suporte a Mídias e Grupos

## ✅ Novidades v3.1.0

### Mudanças v3.1.0:
- ✅ **Suporte Completo a Grupos** - Identifica quem enviou cada mensagem
- ✅ **Suporte a Mídias** - Imagens, vídeos, áudios, documentos e stickers
- ✅ **Upload para Supabase Storage** - Mídias são salvas no bucket whatsapp-media
- ✅ **Retry em Downloads** - 3 tentativas para download de mídias
- ✅ **Melhor Identificação de Contatos** - Nome e telefone do remetente em grupos

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
============================================
🚀 Baileys Server v3.1.0 running on port XXXX
============================================
📡 Webhook URL: https://...
📸 Media Support: ✅ Enabled
============================================
\`\`\`

## Endpoints da API

### Health Check
\`GET /api/health\`

### Criar Instância
\`POST /api/instance/create\`
\`\`\`json
{
  "sessionId": "uuid",
  "instanceName": "minha-instancia",
  "webhookSecret": "opcional"
}
\`\`\`

### Obter QR Code
\`GET /api/instance/:sessionId/qr\`

### Status da Conexão
\`GET /api/instance/:sessionId/status\`

### Enviar Mensagem de Texto
\`POST /api/message/send-text\`
\`\`\`json
{
  "sessionId": "uuid",
  "phone": "5511999999999",
  "message": "Olá!"
}
\`\`\`

### Enviar Mídia
\`POST /api/message/send-media\`
\`\`\`json
{
  "sessionId": "uuid",
  "phone": "5511999999999",
  "mediaUrl": "https://...",
  "mediaType": "image|video|audio|ptt|document",
  "caption": "Legenda opcional",
  "fileName": "documento.pdf"
}
\`\`\`
`;

    // ========== SERVIDOR v3.1.0 COMPLETO ==========
    const indexJs = `/**
 * ============================================
 * BAILEYS SERVER v3.1.0
 * ============================================
 * Servidor completo com suporte a mídias e grupos
 * Para WhatsApp CRM - Lovable
 * ============================================
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Dynamic imports for ESM modules
let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadMediaMessage, Browsers;
let QRCode, pino, mime, supabase;

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

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

// ============== HELPERS ==============

/**
 * Extract phone number from JID
 * Handles: @s.whatsapp.net, @g.us (groups), @lid (linked devices)
 */
function extractPhoneFromJid(jid) {
  if (!jid) return null;
  
  // Skip LIDs (Linked IDs) - they're not real phone numbers
  if (jid.includes('@lid')) {
    return null;
  }
  
  // Extract the number part before @ symbol
  const parts = jid.split('@');
  if (parts.length < 1) return null;
  
  // Clean to digits only
  const digits = parts[0].replace(/\\D/g, '');
  
  // Validate minimum length
  if (digits.length < 8) return null;
  
  return digits;
}

/**
 * Check if JID is a group
 */
function isGroupJid(jid) {
  return jid?.includes('@g.us') || false;
}

/**
 * Format JID for sending messages
 */
function formatJidForSend(phone, isGroup = false) {
  let jid = phone.replace(/\\D/g, '');
  
  if (isGroup || phone.includes('@g.us')) {
    // Group: use @g.us suffix
    if (!jid.includes('@')) {
      jid = jid + '@g.us';
    }
  } else {
    // Individual: use @s.whatsapp.net suffix
    if (!jid.includes('@')) {
      jid = jid + '@s.whatsapp.net';
    }
  }
  
  return jid;
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

    console.log(\`📤 Uploading media to Supabase: \${fileName} (\${mimeType})\`);

    const { data, error } = await supabase.storage
      .from('whatsapp-media')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase upload error:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(fileName);

    console.log(\`✅ Media uploaded: \${urlData.publicUrl}\`);
    return { url: urlData.publicUrl, mimeType };
  } catch (error) {
    console.error('❌ Upload error:', error.message);
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
      // Get extension from filename or default to pdf
      const fileName = mediaMessage.fileName || '';
      extension = fileName.split('.').pop() || 'pdf';
    } else if (message.stickerMessage) {
      mediaType = 'sticker';
      mediaMessage = message.stickerMessage;
      extension = 'webp';
    }

    if (!mediaType || !mediaMessage) return null;

    console.log(\`📥 Downloading \${mediaType} media...\`);

    // Download media with retry
    let buffer = null;
    let retries = 3;
    
    while (retries > 0 && !buffer) {
      try {
        buffer = await downloadMediaMessage(
          msg,
          'buffer',
          {},
          {
            logger: console,
            reuploadRequest: socket.updateMediaMessage
          }
        );
      } catch (downloadError) {
        console.log(\`⚠️ Download attempt failed, \${retries - 1} retries left...\`);
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!buffer) {
      console.error('❌ Failed to download media after all retries');
      return { mediaType }; // Return type but no URL
    }

    console.log(\`✅ Media downloaded: \${buffer.length} bytes\`);

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
    console.error('❌ Error processing media:', error.message);
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
      headers: { 
        'Content-Type': 'application/json',
        'x-webhook-secret': payload.webhookSecret || ''
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log(\`📤 Webhook sent: \${payload.event}\`);
    } else {
      console.log(\`⚠️ Webhook response: \${response.status}\`);
    }
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
  }
}

// ============== WHATSAPP SESSION ==============

async function createWhatsAppSession(sessionId, instanceName, webhookSecret) {
  if (sessions.has(sessionId)) {
    console.log(\`ℹ️ Session \${instanceName} already exists\`);
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
    browser: Browsers.macOS('Desktop'),
    connectTimeoutMs: 60000,
    qrTimeout: 60000
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
        webhookSecret,
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
        webhookSecret,
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
        webhookSecret,
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
      // Skip status broadcast
      if (msg.key.remoteJid === 'status@broadcast') continue;

      const remoteJid = msg.key.remoteJid;
      const fromMe = msg.key.fromMe || false;
      const isGroup = isGroupJid(remoteJid);

      // Extract sender info for groups
      let senderPhone = '';
      let senderName = '';
      
      if (isGroup && !fromMe) {
        // In groups, participant contains the actual sender's JID
        const participantJid = msg.key.participant;
        if (participantJid) {
          senderPhone = extractPhoneFromJid(participantJid) || '';
          senderName = msg.pushName || '';
          console.log(\`👥 Group message from: \${senderName} (\${senderPhone})\`);
        }
      } else if (!fromMe) {
        // Individual chat - sender is the contact
        senderPhone = extractPhoneFromJid(remoteJid) || '';
        senderName = msg.pushName || '';
      }

      // Process media
      let mediaUrl = null;
      let mediaMimeType = null;
      let mediaType = null;
      let mediaCaption = getMediaCaption(msg);

      if (hasMedia(msg)) {
        console.log(\`📨 Media message from \${remoteJid}\`);
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
        console.log(\`📨 Text message from \${remoteJid}: \${textContent.substring(0, 50)}...\`);
      }

      // Get sender profile picture (only for non-group individual messages)
      let senderProfilePic = null;
      if (!isGroup) {
        try {
          senderProfilePic = await socket.profilePictureUrl(remoteJid, 'image');
        } catch (e) {
          // Profile picture not available
        }
      }

      // Send webhook with all data
      await sendWebhook({
        event: 'messages.upsert',
        sessionId,
        instanceName,
        webhookSecret,
        data: {
          messages: [{
            key: msg.key,
            message: msg.message,
            messageTimestamp: msg.messageTimestamp,
            pushName: msg.pushName,
            // Sender info (for groups)
            senderPhone,
            senderName,
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
      webhookSecret,
      data: { updates }
    });
  });

  // Chats sync (on connect)
  socket.ev.on('chats.set', async ({ chats }) => {
    console.log(\`📋 Syncing \${chats.length} chats...\`);
    await sendWebhook({
      event: 'chats.set',
      sessionId,
      instanceName,
      webhookSecret,
      data: { chats }
    });
  });

  // Contacts sync
  socket.ev.on('contacts.update', async (contacts) => {
    await sendWebhook({
      event: 'contacts.update',
      sessionId,
      instanceName,
      webhookSecret,
      data: { contacts }
    });
  });

  return session;
}

// ============== API ROUTES ==============

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.1.0',
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
    console.error('❌ Create instance error:', error);
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

    // Detect if it's a group
    const isGroup = phone.includes('@g.us') || phone.length > 15;
    const jid = formatJidForSend(phone, isGroup);

    const result = await session.socket.sendMessage(jid, { text: message });

    res.json({ 
      success: true, 
      to: jid,
      messageId: result?.key?.id 
    });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send media message
app.post('/api/message/send-media', async (req, res) => {
  try {
    const { sessionId, phone, mediaUrl, mediaType, caption, fileName } = req.body;

    const session = sessions.get(sessionId);
    if (!session || !session.socket || !session.isConnected) {
      return res.status(400).json({ error: 'Session not connected' });
    }

    const isGroup = phone.includes('@g.us') || phone.length > 15;
    const jid = formatJidForSend(phone, isGroup);

    let content;
    switch (mediaType) {
      case 'image':
        content = { image: { url: mediaUrl }, caption };
        break;
      case 'video':
        content = { video: { url: mediaUrl }, caption };
        break;
      case 'audio':
        content = { audio: { url: mediaUrl }, mimetype: 'audio/mp4', ptt: false };
        break;
      case 'ptt':
        content = { audio: { url: mediaUrl }, mimetype: 'audio/ogg; codecs=opus', ptt: true };
        break;
      case 'document':
        content = { 
          document: { url: mediaUrl }, 
          mimetype: mime.lookup(fileName || 'file.pdf') || 'application/octet-stream', 
          fileName: fileName || caption || 'document.pdf' 
        };
        break;
      default:
        return res.status(400).json({ error: 'Invalid media type. Use: image, video, audio, ptt, document' });
    }

    const result = await session.socket.sendMessage(jid, content);

    res.json({ 
      success: true, 
      to: jid,
      messageId: result?.key?.id
    });
  } catch (error) {
    console.error('❌ Send media error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============== START SERVER ==============

async function startServer() {
  console.log('🚀 Starting Baileys Server v3.1.0...');
  
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
    console.log('   Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable media support');
  }

  const PORT = process.env.PORT || 3333;
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('============================================');
    console.log(\`🚀 Baileys Server v3.1.0 running on port \${PORT}\`);
    console.log('============================================');
    console.log(\`📡 Webhook URL: \${WEBHOOK_URL || 'Not configured'}\`);
    console.log(\`📸 Media Support: \${supabase ? '✅ Enabled' : '❌ Disabled'}\`);
    console.log('============================================');
    console.log('');
  });
}

startServer().catch(console.error);
`;

    const envExample = `# Webhook do Supabase (Edge Function)
SUPABASE_WEBHOOK_URL=${webhookUrl}

# Supabase Storage (para upload de mídias)
SUPABASE_URL=https://jwddiyuezqrpuakazvgg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# NÃO defina PORT - Railway define automaticamente
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
      a.download = 'baileys-server-v3.1.0.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Download concluído!',
        description: 'Servidor v3.1.0 - Com suporte a mídias e grupos'
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Servidor Baileys v3.1.0
            </DialogTitle>
            <DialogDescription>
              Servidor WhatsApp com suporte completo a mídias e grupos para deploy no Railway
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* What's New */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Novidades v3.1.0
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-primary" />
                  <strong>Suporte a Grupos</strong> - Identifica quem enviou cada mensagem
                </li>
                <li className="flex items-center gap-2">
                  <ImageIcon className="h-3 w-3 text-primary" />
                  <strong>Mídias</strong> - Imagens, vídeos, áudios, documentos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  Upload automático para Supabase Storage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  Retry automático em downloads de mídia (3 tentativas)
                </li>
              </ul>
            </div>

            {/* Files included */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">📦 Arquivos incluídos:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>package.json</code> - Dependências (Baileys 6.7.9 + Supabase)</li>
                <li>• <code>index.js</code> - Servidor completo com suporte a mídias e grupos</li>
                <li>• <code>.env.example</code> - Exemplo de variáveis de ambiente</li>
                <li>• <code>README.md</code> - Instruções de deploy detalhadas</li>
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
                  Baixar baileys-server-v3.1.0.zip
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
