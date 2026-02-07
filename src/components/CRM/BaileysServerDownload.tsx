import React, { useState } from 'react';
import { Download, Server, CheckCircle2, Loader2, AlertTriangle, Image as ImageIcon, Users, Zap } from 'lucide-react';
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
    // ========== PACKAGE.JSON v3.6.0 ==========
    const packageJson = `{
  "name": "baileys-server",
  "version": "3.6.0",
  "description": "Servidor Baileys SEM histórico - apenas mensagens em tempo real",
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

    const readme = `# 🚀 Baileys Server v3.6.0 - SEM Histórico

## ✅ Novidades v3.6.0

### 🚫 HISTÓRICO DESABILITADO
- **Sem conversas antigas** - Apenas mensagens novas após conexão
- **Sem grupos antigos** - Grupos aparecem quando há nova mensagem
- **Performance otimizada** - Conexão muito mais rápida

### Principais Features:
- ✅ **NOMES DE GRUPOS CORRETOS** - Busca groupMetadata automaticamente
- ✅ **REMETENTES EM GRUPOS** - sender_phone e sender_name corretos
- ✅ **FOTOS DE PERFIL** - Para contatos e grupos
- ✅ **MÍDIAS** - Imagens, vídeos, áudios, documentos

## Deploy no Railway

### 1. Suba para o GitHub
- Substitua **TODOS** os arquivos
- **IMPORTANTE:** Delete a pasta \`sessions/\` para uma nova conexão limpa

### 2. No Railway
1. New Project → Deploy from GitHub
2. Selecione seu repositório
3. Em **Variables**, adicione:
   \`SUPABASE_WEBHOOK_URL\` = \`${webhookUrl}\`
   \`SUPABASE_URL\` = \`https://jwddiyuezqrpuakazvgg.supabase.co\`
   \`SUPABASE_SERVICE_ROLE_KEY\` = \`sua_service_role_key\` (pegar no Dashboard Supabase > Settings > API)

**NÃO** defina PORT - Railway define automaticamente!

## Comportamento

### ✅ O que SERÁ processado:
- Mensagens novas recebidas após conexão
- Mensagens enviadas por você
- Novos grupos que você é adicionado
- Contatos que enviam mensagem pela primeira vez

### ❌ O que NÃO será processado:
- Histórico de conversas antigas
- Mensagens anteriores à conexão
- Grupos antigos (só aparecem quando houver nova mensagem)
`;

    // ========== SERVIDOR v3.6.0 COMPLETO - SEM HISTÓRICO ==========
    const indexJs = `/**
 * ============================================
 * BAILEYS SERVER v3.6.0
 * ============================================
 * SEM HISTÓRICO - Apenas mensagens novas em tempo real
 * - Desabilita sincronização de histórico completamente
 * - Busca groupMetadata para nomes corretos de grupos
 * - Extrai sender_phone corretamente do participant
 * - Cache de metadados para performance
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

// Cache for group metadata (persists across messages)
const groupMetadataCache = new Map();

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

function extractPhoneFromJid(jid) {
  if (!jid) return null;
  if (jid.includes('@lid')) return null;
  const parts = jid.split('@');
  if (parts.length < 1) return null;
  const digits = parts[0].replace(/\\D/g, '');
  if (digits.length < 8) return null;
  return digits;
}

function isGroupJid(jid) {
  return jid?.includes('@g.us') || false;
}

function formatJidForSend(phone, isGroup = false) {
  let jid = phone.replace(/\\D/g, '');
  if (isGroup || phone.includes('@g.us')) {
    if (!jid.includes('@')) jid = jid + '@g.us';
  } else {
    if (!jid.includes('@')) jid = jid + '@s.whatsapp.net';
  }
  return jid;
}

async function getGroupMetadata(socket, groupJid) {
  if (groupMetadataCache.has(groupJid)) {
    const cached = groupMetadataCache.get(groupJid);
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.data;
    }
  }
  try {
    const metadata = await socket.groupMetadata(groupJid);
    if (metadata) {
      groupMetadataCache.set(groupJid, { data: metadata, timestamp: Date.now() });
      return metadata;
    }
  } catch (e) {
    console.log(\`⚠️ Could not fetch group metadata for \${groupJid}: \${e.message}\`);
  }
  return null;
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
      .upload(fileName, buffer, { contentType: mimeType, upsert: false });
    if (error) {
      console.error('❌ Supabase upload error:', error.message);
      return null;
    }
    const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(fileName);
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
      mediaType = 'image'; mediaMessage = message.imageMessage; extension = 'jpg';
    } else if (message.videoMessage) {
      mediaType = 'video'; mediaMessage = message.videoMessage; extension = 'mp4';
    } else if (message.audioMessage) {
      mediaType = message.audioMessage.ptt ? 'ptt' : 'audio';
      mediaMessage = message.audioMessage;
      extension = message.audioMessage.ptt ? 'ogg' : 'mp3';
    } else if (message.documentMessage) {
      mediaType = 'document'; mediaMessage = message.documentMessage;
      const fileName = mediaMessage.fileName || '';
      extension = fileName.split('.').pop() || 'pdf';
    } else if (message.stickerMessage) {
      mediaType = 'sticker'; mediaMessage = message.stickerMessage; extension = 'webp';
    }
    if (!mediaType || !mediaMessage) return null;
    console.log(\`📥 Downloading \${mediaType} media...\`);
    let buffer = null;
    let retries = 3;
    while (retries > 0 && !buffer) {
      try {
        buffer = await downloadMediaMessage(msg, 'buffer', {}, {
          logger: console, reuploadRequest: socket.updateMediaMessage
        });
      } catch (downloadError) {
        console.log(\`⚠️ Download attempt failed, \${retries - 1} retries left...\`);
        retries--;
        if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    if (!buffer) {
      console.error('❌ Failed to download media after all retries');
      return { mediaType };
    }
    console.log(\`✅ Media downloaded: \${buffer.length} bytes\`);
    const uploadResult = await uploadMediaToSupabase(buffer, sessionId, mediaType, extension);
    if (uploadResult) {
      return { mediaUrl: uploadResult.url, mediaMimeType: uploadResult.mimeType, mediaType };
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
  return !!(message.imageMessage || message.videoMessage || message.audioMessage || message.documentMessage || message.stickerMessage);
}

function getMediaCaption(msg) {
  const message = msg.message;
  if (!message) return '';
  return message.imageMessage?.caption || message.videoMessage?.caption || message.documentMessage?.caption || message.documentMessage?.fileName || '';
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
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': payload.webhookSecret || '' },
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
  console.log(\`🚫 History sync: DISABLED - Only real-time messages will be processed\`);

  const session = {
    sessionId, instanceName, socket: null, webhookSecret,
    qrCode: null, isConnected: false, phoneNumber: null, pushName: null, profilePicture: null
  };
  sessions.set(sessionId, session);

  const logger = pino({ level: 'silent' });

  const socket = makeWASocket({
    version, logger, printQRInTerminal: true,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    browser: Browsers.macOS('Desktop'),
    connectTimeoutMs: 60000,
    qrTimeout: 60000,
    // ============== v3.6.0: DISABLE HISTORY SYNC ==============
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    fireInitQueries: false
  });

  session.socket = socket;
  socket.ev.on('creds.update', saveCreds);

  // Connection updates
  socket.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;
    if (qr) {
      session.qrCode = await QRCode.toDataURL(qr);
      console.log(\`📱 QR Code generated for \${instanceName}\`);
      await sendWebhook({ event: 'qr.update', sessionId, instanceName, webhookSecret, data: { qrCode: session.qrCode } });
    }
    if (connection === 'open') {
      session.isConnected = true;
      session.qrCode = null;
      const user = socket.user;
      if (user) {
        session.phoneNumber = user.id.split(':')[0].replace('@s.whatsapp.net', '');
        session.pushName = user.name || user.notify || null;
        try { session.profilePicture = await socket.profilePictureUrl(user.id, 'image'); } catch (e) { session.profilePicture = null; }
      }
      console.log(\`✅ \${instanceName} connected! Phone: \${session.phoneNumber}\`);
      console.log(\`🚫 History sync disabled - Only new messages will appear\`);
      await sendWebhook({
        event: 'connection.update', sessionId, instanceName, webhookSecret,
        data: { connection: 'open', isConnected: true, phoneNumber: session.phoneNumber, pushName: session.pushName, profilePicture: session.profilePicture }
      });
    }
    if (connection === 'close') {
      session.isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;
      console.log(\`❌ \${instanceName} disconnected. Code: \${statusCode}. Reconnect: \${shouldReconnect}\`);
      await sendWebhook({ event: 'connection.update', sessionId, instanceName, webhookSecret, data: { connection: 'close', isConnected: false, statusCode } });
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

  // ============== v3.6.0: ONLY REAL-TIME MESSAGES ==============
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    // CRITICAL: Only process 'notify' (real-time messages)
    if (type !== 'notify') {
      console.log(\`⏭️ Skipping \${messages.length} messages (type: \${type}) - only real-time messages are processed\`);
      return;
    }
    console.log(\`📨 Processing \${messages.length} REAL-TIME messages\`);

    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') continue;
      const remoteJid = msg.key.remoteJid;
      const fromMe = msg.key.fromMe || false;
      const isGroup = isGroupJid(remoteJid);

      let senderPhone = '';
      let senderName = '';
      let groupName = '';
      let groupProfilePic = null;
      
      if (isGroup) {
        const groupMetadata = await getGroupMetadata(socket, remoteJid);
        if (groupMetadata) {
          groupName = groupMetadata.subject || '';
          console.log(\`👥 Group: "\${groupName}" (\${remoteJid})\`);
          try { groupProfilePic = await socket.profilePictureUrl(remoteJid, 'image'); } catch (e) {}
        }
        if (!fromMe) {
          const participantJid = msg.key.participant;
          if (participantJid) {
            senderPhone = extractPhoneFromJid(participantJid) || '';
            senderName = msg.pushName || '';
            console.log(\`👤 Sender: "\${senderName}" (\${senderPhone})\`);
          }
        }
      } else if (!fromMe) {
        senderPhone = extractPhoneFromJid(remoteJid) || '';
        senderName = msg.pushName || '';
      }

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
      }

      let senderProfilePic = null;
      if (!isGroup) {
        try { senderProfilePic = await socket.profilePictureUrl(remoteJid, 'image'); } catch (e) {}
      }

      await sendWebhook({
        event: 'messages.upsert', sessionId, instanceName, webhookSecret,
        data: {
          messages: [{
            key: msg.key, message: msg.message, messageTimestamp: msg.messageTimestamp, pushName: msg.pushName,
            groupName, groupSubject: groupName, groupProfilePic, isGroup,
            senderPhone, senderName,
            mediaUrl, mediaMimeType, mediaType, mediaCaption,
            senderProfilePic,
            syncType: 'realtime'
          }]
        }
      });
    }
  });

  socket.ev.on('messages.update', async (updates) => {
    await sendWebhook({ event: 'messages.update', sessionId, instanceName, webhookSecret, data: { updates } });
  });

  // ============== v3.6.0: MINIMAL CHAT SYNC ==============
  socket.ev.on('chats.upsert', async (chats) => {
    console.log(\`📋 [CHATS.UPSERT] \${chats.length} new/updated chats\`);
    const enrichedChats = [];
    for (const chat of chats) {
      const jid = chat.id;
      const isGroup = isGroupJid(jid);
      let enrichedChat = { ...chat };
      if (isGroup) {
        const metadata = await getGroupMetadata(socket, jid);
        if (metadata) {
          enrichedChat.groupSubject = metadata.subject;
          enrichedChat.subject = metadata.subject;
          enrichedChat.groupName = metadata.subject;
          enrichedChat.name = metadata.subject;
          try { enrichedChat.profilePicture = await socket.profilePictureUrl(jid, 'image'); } catch (e) {}
        }
      } else {
        try { enrichedChat.profilePicture = await socket.profilePictureUrl(jid, 'image'); } catch (e) {}
      }
      enrichedChats.push(enrichedChat);
    }
    await sendWebhook({ event: 'chats.upsert', sessionId, instanceName, webhookSecret, data: { chats: enrichedChats } });
  });

  // ============== v3.6.0: IGNORE HISTORY SYNC EVENTS ==============
  socket.ev.on('chats.set', async ({ chats }) => {
    console.log(\`🚫 [CHATS.SET] Ignoring \${chats.length} historical chats (history sync disabled)\`);
  });

  socket.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest }) => {
    console.log(\`🚫 [HISTORY SYNC] Ignoring \${chats?.length || 0} chats, \${messages?.length || 0} messages (history sync disabled)\`);
  });

  socket.ev.on('contacts.update', async (contacts) => {
    await sendWebhook({ event: 'contacts.update', sessionId, instanceName, webhookSecret, data: { contacts } });
  });

  return session;
}

// ============== API ROUTES ==============

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok', version: '3.6.0', historySync: false,
    sessions: sessions.size, mediaSupport: !!(SUPABASE_URL && SUPABASE_SERVICE_KEY),
    groupMetadataCache: groupMetadataCache.size, timestamp: new Date().toISOString()
  });
});

app.post('/api/instance/create', async (req, res) => {
  try {
    const { sessionId, instanceName, webhookSecret } = req.body;
    if (!sessionId || !instanceName) {
      return res.status(400).json({ error: 'sessionId and instanceName required' });
    }
    const session = await createWhatsAppSession(sessionId, instanceName, webhookSecret || '');
    res.json({ success: true, sessionId: session.sessionId, instanceName: session.instanceName, isConnected: session.isConnected });
  } catch (error) {
    console.error('❌ Create instance error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/instance/:sessionId/qr', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ qrCode: session.qrCode, isConnected: session.isConnected, phoneNumber: session.phoneNumber, pushName: session.pushName, profilePicture: session.profilePicture });
});

app.get('/api/instance/:sessionId/status', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found', status: 'not_found' });
  res.json({ status: session.isConnected ? 'connected' : (session.qrCode ? 'waiting_qr' : 'connecting'), isConnected: session.isConnected, phoneNumber: session.phoneNumber, pushName: session.pushName, profilePicture: session.profilePicture });
});

app.get('/api/instance/list', (req, res) => {
  const list = [];
  for (const [id, session] of sessions) {
    list.push({ sessionId: id, instanceName: session.instanceName, isConnected: session.isConnected, phoneNumber: session.phoneNumber });
  }
  res.json({ sessions: list });
});

app.delete('/api/instance/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  try { if (session.socket) await session.socket.logout(); } catch (e) { console.log('Logout error:', e.message); }
  const sessionPath = path.join(SESSIONS_DIR, session.instanceName);
  if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true });
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

app.post('/api/message/send', async (req, res) => {
  try {
    const { sessionId, phone, message, isGroup } = req.body;
    const session = sessions.get(sessionId);
    if (!session || !session.socket || !session.isConnected) {
      return res.status(400).json({ error: 'Session not connected' });
    }
    const jid = formatJidForSend(phone, isGroup);
    console.log(\`📤 Sending message to \${jid}: \${message.substring(0, 50)}...\`);
    await session.socket.sendMessage(jid, { text: message });
    res.json({ success: true, jid });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/message/media', async (req, res) => {
  try {
    const { sessionId, phone, mediaUrl, mediaType, caption, isGroup } = req.body;
    const session = sessions.get(sessionId);
    if (!session || !session.socket || !session.isConnected) {
      return res.status(400).json({ error: 'Session not connected' });
    }
    const jid = formatJidForSend(phone, isGroup);
    let messageContent = {};
    if (mediaType === 'image') messageContent = { image: { url: mediaUrl }, caption: caption || '' };
    else if (mediaType === 'video') messageContent = { video: { url: mediaUrl }, caption: caption || '' };
    else if (mediaType === 'audio') messageContent = { audio: { url: mediaUrl }, mimetype: 'audio/mpeg' };
    else if (mediaType === 'document') messageContent = { document: { url: mediaUrl }, fileName: caption || 'document' };
    console.log(\`📤 Sending \${mediaType} to \${jid}\`);
    await session.socket.sendMessage(jid, messageContent);
    res.json({ success: true, jid });
  } catch (error) {
    console.error('❌ Send media error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/group/:sessionId/:groupId', async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session || !session.socket) return res.status(404).json({ error: 'Session not found' });
    const groupJid = req.params.groupId.includes('@') ? req.params.groupId : \`\${req.params.groupId}@g.us\`;
    const metadata = await getGroupMetadata(session.socket, groupJid);
    if (metadata) res.json({ success: true, metadata });
    else res.status(404).json({ error: 'Group not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profile/:sessionId/:jid', async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session || !session.socket) return res.status(404).json({ error: 'Session not found' });
    const jid = req.params.jid.includes('@') ? req.params.jid : \`\${req.params.jid}@s.whatsapp.net\`;
    try {
      const url = await session.socket.profilePictureUrl(jid, 'image');
      res.json({ success: true, url });
    } catch (e) {
      res.json({ success: false, url: null });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== INITIALIZATION ==============

async function init() {
  const baileys = await import('@whiskeysockets/baileys');
  makeWASocket = baileys.default;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  DisconnectReason = baileys.DisconnectReason;
  fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
  makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;
  downloadMediaMessage = baileys.downloadMediaMessage;
  Browsers = baileys.Browsers;

  const qrModule = await import('qrcode');
  QRCode = qrModule.default;

  const pinoModule = await import('pino');
  pino = pinoModule.default;

  const mimeModule = await import('mime-types');
  mime = mimeModule.default;

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('✅ Supabase client initialized for media storage');
  } else {
    console.log('⚠️ Supabase not configured - media will not be uploaded');
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(\`\\n🚀 Baileys Server v3.6.0 running on port \${PORT}\`);
    console.log(\`🚫 History sync: DISABLED\`);
    console.log(\`📨 Only real-time messages will be processed\`);
    console.log(\`🔗 Webhook URL: \${WEBHOOK_URL || 'Not configured'}\`);
    console.log(\`📁 Sessions directory: \${SESSIONS_DIR}\`);
    console.log(\`☁️ Supabase media: \${supabase ? 'Enabled' : 'Disabled'}\\n\`);
  });
}

init().catch(console.error);
`;

    const envExample = `# Webhook URL (OBRIGATÓRIO)
SUPABASE_WEBHOOK_URL=${webhookUrl}

# Para upload de mídia (OPCIONAL)
SUPABASE_URL=https://jwddiyuezqrpuakazvgg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# NÃO defina PORT no Railway!
# PORT=3333
`;

    return {
      'package.json': packageJson,
      '.node-version': nodeVersion,
      'nixpacks.toml': nixpacksToml,
      '.gitignore': gitignore,
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
      a.download = 'baileys-server-v3.6.0.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Download concluído!',
        description: 'Servidor v3.6.0 - SEM histórico, apenas mensagens novas!'
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
              Servidor Baileys v3.6.0 - SEM Histórico
            </DialogTitle>
            <DialogDescription>
              Servidor WhatsApp otimizado - apenas mensagens novas em tempo real
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* What's New */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Novidades v3.6.0
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-green-500" />
                  <strong>SEM HISTÓRICO</strong> - Apenas mensagens novas após conexão
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-primary" />
                  <strong>Nomes de Grupos</strong> - Busca automática via groupMetadata
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  <strong>Remetentes</strong> - Nome e telefone de quem enviou em grupos
                </li>
                <li className="flex items-center gap-2">
                  <ImageIcon className="h-3 w-3 text-primary" />
                  <strong>Mídias</strong> - Imagens, vídeos, áudios, documentos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  <strong>Fotos de Perfil</strong> - Para contatos e grupos
                </li>
              </ul>
            </div>

            {/* Important: No History */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h4 className="font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                🚫 Sem Conversas Antigas
              </h4>
              <p className="text-sm text-muted-foreground">
                Esta versão <strong>NÃO sincroniza histórico</strong>. Apenas mensagens recebidas APÓS a conexão aparecerão. 
                Isso significa conexão mais rápida e sem conversas antigas indesejadas!
              </p>
            </div>

            {/* Files included */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">📦 Arquivos incluídos:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>package.json</code> - Dependências (Baileys 6.7.9)</li>
                <li>• <code>index.js</code> - Servidor SEM sync de histórico</li>
                <li>• <code>.env.example</code> - Variáveis de ambiente</li>
                <li>• <code>README.md</code> - Instruções de deploy</li>
              </ul>
            </div>

            {/* Important Note */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Importante: Atualização Necessária
              </h4>
              <p className="text-sm text-muted-foreground">
                Se você já tem o servidor no Railway, <strong>substitua TODOS os arquivos</strong> (especialmente <code>index.js</code>). 
                Delete também a pasta <code>sessions/</code> para uma nova conexão limpa.
              </p>
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
                <li>• <code>SUPABASE_SERVICE_ROLE_KEY</code> - Chave de serviço</li>
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
                  Baixar baileys-server-v3.6.0.zip
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
