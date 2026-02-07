import React, { useState } from 'react';
import { Download, Server, CheckCircle2, Loader2, AlertTriangle, Image as ImageIcon, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import JSZip from 'jszip';
import { useToast } from '@/hooks/use-toast';

interface BaileysServerDownloadProps {
  webhookUrl?: string;
  isOpenExternal?: boolean;
  onClose?: () => void;
}

const BaileysServerDownload: React.FC<BaileysServerDownloadProps> = ({ 
  webhookUrl = 'https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/whatsapp-webhook',
  isOpenExternal,
  onClose
}) => {
  const { toast } = useToast();
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const isOpen = isOpenExternal !== undefined ? isOpenExternal : isOpenInternal;
  const setIsOpen = (open: boolean) => {
    if (isOpenExternal !== undefined && onClose && !open) {
      onClose();
    } else {
      setIsOpenInternal(open);
    }
  };

  const generateServerFiles = () => {
    // ========== PACKAGE.JSON v3.8.0 ==========
    const packageJson = `{
  "name": "baileys-server",
  "version": "3.8.0",
  "description": "Servidor Baileys estável - tempo real + contatos + mídia completa + endpoint corrigido",
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

    const readme = `# 🚀 Baileys Server v3.8.0 - Estável e Completo

## ✨ Novidades v3.8.0

### 🔧 Correções
- **CORREÇÃO**: Endpoint /api/message/send funcional
- Logs detalhados no envio de mensagens
- Validação melhorada de sessão

### 🔄 Estabilidade
- **Heartbeat automático** - Ping a cada 25s mantém conexão
- **Reconexão inteligente** - Backoff exponencial
- **Timeout configurável** - 90s para conexão inicial

### 👥 Contatos
- **Sincronização completa** - Todos os contatos ao conectar
- **Fotos de perfil** - Busca automática com cache

### 📸 Mídia
- **Upload automático** - Supabase Storage
- **Retry inteligente** - 5 tentativas
- **Todos os tipos** - Imagens, vídeos, áudios, documentos

## Deploy no Railway

1. New Project → Deploy from GitHub
2. Em **Variables**, adicione:
   \`SUPABASE_WEBHOOK_URL\` = \`${webhookUrl}\`
   \`SUPABASE_URL\` = \`https://jwddiyuezqrpuakazvgg.supabase.co\`
   \`SUPABASE_SERVICE_ROLE_KEY\` = \`sua_service_role_key\`

**NÃO** defina PORT - Railway define automaticamente!

## Comportamento

### ✅ O que SERÁ sincronizado:
- Todos os contatos ao conectar
- Mensagens novas após conexão
- Todas as mídias (imagens, áudios, vídeos)

### ❌ O que NÃO será sincronizado:
- Histórico de conversas antigas
`;

    // ========== SERVIDOR v3.8.0 COMPLETO ==========
    const indexJs = `/**
 * ============================================
 * BAILEYS SERVER v3.8.0
 * ============================================
 * Servidor WhatsApp estável e completo
 * - CORREÇÃO: Endpoint /api/message/send funcional
 * - Heartbeat automático (25s)
 * - Reconexão com backoff exponencial
 * - Sincronização completa de contatos
 * - Upload de mídia com retry inteligente
 * Para WhatsApp CRM - Lovable
 * ============================================
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadMediaMessage, Browsers;
let QRCode, pino, mime, supabase;

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const sessions = new Map();
const groupMetadataCache = new Map();
const profilePicCache = new Map();
const GROUP_CACHE_TTL = 10 * 60 * 1000;
const PROFILE_PIC_CACHE_TTL = 30 * 60 * 1000;

const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

function extractPhoneFromJid(jid) {
  if (!jid || jid.includes('@lid')) return null;
  const parts = jid.split('@');
  if (parts.length < 1) return null;
  const digits = parts[0].replace(/\\D/g, '');
  return digits.length >= 8 ? digits : null;
}

function isGroupJid(jid) { return jid?.includes('@g.us') || false; }

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
  const cached = groupMetadataCache.get(groupJid);
  if (cached && Date.now() - cached.timestamp < GROUP_CACHE_TTL) return cached.data;
  try {
    const metadata = await socket.groupMetadata(groupJid);
    if (metadata) {
      groupMetadataCache.set(groupJid, { data: metadata, timestamp: Date.now() });
      return metadata;
    }
  } catch (e) { console.log(\`⚠️ Group metadata error: \${e.message}\`); }
  return null;
}

async function getProfilePicture(socket, jid) {
  const cached = profilePicCache.get(jid);
  if (cached && Date.now() - cached.timestamp < PROFILE_PIC_CACHE_TTL) return cached.url;
  try {
    const url = await socket.profilePictureUrl(jid, 'image');
    profilePicCache.set(jid, { url, timestamp: Date.now() });
    return url;
  } catch (e) {
    profilePicCache.set(jid, { url: null, timestamp: Date.now() });
    return null;
  }
}

async function uploadMediaToSupabase(buffer, sessionId, mediaType, extension) {
  if (!supabase) return null;
  try {
    const fileName = \`\${sessionId}/\${mediaType}/\${Date.now()}-\${crypto.randomBytes(8).toString('hex')}.\${extension}\`;
    const mimeType = mime.lookup(extension) || 'application/octet-stream';
    const { error } = await supabase.storage.from('whatsapp-media').upload(fileName, buffer, { contentType: mimeType, upsert: false });
    if (error) { console.error('❌ Upload error:', error.message); return null; }
    const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(fileName);
    console.log(\`✅ Uploaded: \${urlData.publicUrl}\`);
    return { url: urlData.publicUrl, mimeType };
  } catch (error) { console.error('❌ Upload error:', error.message); return null; }
}

async function processMediaMessage(socket, msg, sessionId) {
  try {
    const message = msg.message;
    if (!message) return null;
    let mediaType = null, extension = '';
    if (message.imageMessage) { mediaType = 'image'; extension = 'jpg'; }
    else if (message.videoMessage) { mediaType = 'video'; extension = 'mp4'; }
    else if (message.audioMessage) { mediaType = message.audioMessage.ptt ? 'ptt' : 'audio'; extension = message.audioMessage.ptt ? 'ogg' : 'mp3'; }
    else if (message.documentMessage) { mediaType = 'document'; extension = (message.documentMessage.fileName || '').split('.').pop() || 'pdf'; }
    else if (message.stickerMessage) { mediaType = 'sticker'; extension = 'webp'; }
    if (!mediaType) return null;
    console.log(\`📥 Downloading \${mediaType}...\`);
    let buffer = null;
    for (let attempt = 1; attempt <= 5 && !buffer; attempt++) {
      try {
        buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: console, reuploadRequest: socket.updateMediaMessage });
      } catch (e) {
        console.log(\`⚠️ Attempt \${attempt}/5 failed\`);
        if (attempt < 5) await new Promise(r => setTimeout(r, attempt * 1000));
      }
    }
    if (!buffer) return { mediaType };
    console.log(\`✅ Downloaded: \${buffer.length} bytes\`);
    const uploadResult = await uploadMediaToSupabase(buffer, sessionId, mediaType, extension);
    return uploadResult ? { mediaUrl: uploadResult.url, mediaMimeType: uploadResult.mimeType, mediaType } : { mediaType };
  } catch (error) { console.error('❌ Media error:', error.message); return null; }
}

function hasMedia(msg) {
  const m = msg.message;
  return m && !!(m.imageMessage || m.videoMessage || m.audioMessage || m.documentMessage || m.stickerMessage);
}

function getMediaCaption(msg) {
  const m = msg.message;
  return m?.imageMessage?.caption || m?.videoMessage?.caption || m?.documentMessage?.caption || m?.documentMessage?.fileName || '';
}

function getTextContent(msg) {
  const m = msg.message;
  return m?.conversation || m?.extendedTextMessage?.text || '';
}

async function sendWebhook(payload) {
  if (!WEBHOOK_URL) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-webhook-secret': payload.webhookSecret || '' },
      body: JSON.stringify(payload), signal: controller.signal
    });
    clearTimeout(timeout);
    console.log(\`📤 Webhook \${response.ok ? 'OK' : response.status}: \${payload.event}\`);
    return response.ok;
  } catch (error) { console.error('❌ Webhook error:', error.message); return false; }
}

async function createWhatsAppSession(sessionId, instanceName, webhookSecret, reconnectAttempt = 0) {
  if (sessions.has(sessionId) && sessions.get(sessionId).isConnected) {
    console.log(\`ℹ️ Session \${instanceName} already connected\`);
    return sessions.get(sessionId);
  }
  const sessionPath = path.join(SESSIONS_DIR, instanceName);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  console.log(\`📱 Creating: \${instanceName} (v\${version.join('.')})\`);

  const session = { sessionId, instanceName, socket: null, webhookSecret, qrCode: null, isConnected: false, phoneNumber: null, pushName: null, profilePicture: null, contacts: new Map() };
  sessions.set(sessionId, session);

  const logger = pino({ level: 'silent' });
  const socket = makeWASocket({
    version, logger, printQRInTerminal: true,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    browser: Browsers.macOS('Desktop'), connectTimeoutMs: 90000, qrTimeout: 60000, keepAliveIntervalMs: 25000,
    syncFullHistory: false, shouldSyncHistoryMessage: () => false, fireInitQueries: true,
    generateHighQualityLinkPreview: false, markOnlineOnConnect: true
  });
  session.socket = socket;
  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;
    if (qr) {
      session.qrCode = await QRCode.toDataURL(qr);
      console.log(\`📱 QR generated\`);
      await sendWebhook({ event: 'qr.update', sessionId, instanceName, webhookSecret, data: { qrCode: session.qrCode } });
    }
    if (connection === 'open') {
      session.isConnected = true; session.qrCode = null; reconnectAttempt = 0;
      const user = socket.user;
      if (user) {
        session.phoneNumber = user.id.split(':')[0].replace('@s.whatsapp.net', '');
        session.pushName = user.name || user.notify || null;
        session.profilePicture = await getProfilePicture(socket, user.id);
      }
      console.log(\`✅ Connected: \${session.phoneNumber}\`);
      await sendWebhook({ event: 'connection.update', sessionId, instanceName, webhookSecret, data: { connection: 'open', isConnected: true, phoneNumber: session.phoneNumber, pushName: session.pushName, profilePicture: session.profilePicture } });
    }
    if (connection === 'close') {
      session.isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;
      console.log(\`❌ Disconnected: \${statusCode}\`);
      await sendWebhook({ event: 'connection.update', sessionId, instanceName, webhookSecret, data: { connection: 'close', isConnected: false, statusCode } });
      if (shouldReconnect) {
        sessions.delete(sessionId);
        const delay = Math.min(Math.pow(2, reconnectAttempt) * 1000, 30000);
        console.log(\`🔄 Reconnecting in \${delay}ms...\`);
        setTimeout(() => createWhatsAppSession(sessionId, instanceName, webhookSecret, reconnectAttempt + 1), delay);
      } else { sessions.delete(sessionId); }
    }
  });

  socket.ev.on('contacts.set', async ({ contacts }) => {
    console.log(\`👥 Received \${contacts?.length || 0} contacts\`);
    if (!contacts?.length) return;
    const enriched = [];
    for (const c of contacts) {
      const phone = extractPhoneFromJid(c.id);
      if (!phone) continue;
      const e = { id: c.id, phone, name: c.name || c.notify || c.verifiedName || null, pushName: c.notify || null, isGroup: isGroupJid(c.id) };
      session.contacts.set(phone, e);
      enriched.push(e);
    }
    console.log(\`👥 Processed \${enriched.length} contacts\`);
    const batchSize = 100;
    for (let i = 0; i < enriched.length; i += batchSize) {
      await sendWebhook({ event: 'contacts.set', sessionId, instanceName, webhookSecret, data: { contacts: enriched.slice(i, i + batchSize), total: enriched.length } });
    }
  });

  socket.ev.on('contacts.update', async (updates) => {
    const enriched = [];
    for (const c of updates || []) {
      const phone = extractPhoneFromJid(c.id);
      if (!phone) continue;
      const existing = session.contacts.get(phone) || {};
      const e = { ...existing, id: c.id, phone, name: c.name || c.notify || existing.name || null, pushName: c.notify || existing.pushName || null };
      session.contacts.set(phone, e);
      enriched.push(e);
    }
    if (enriched.length) await sendWebhook({ event: 'contacts.update', sessionId, instanceName, webhookSecret, data: { contacts: enriched } });
  });

  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') { console.log(\`⏭️ Skipping \${messages.length} (type: \${type})\`); return; }
    console.log(\`📨 Processing \${messages.length} messages\`);
    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') continue;
      if (msg.message?.protocolMessage || msg.message?.reactionMessage) continue;
      const remoteJid = msg.key.remoteJid;
      if (remoteJid?.includes('@lid')) continue;
      const fromMe = msg.key.fromMe || false;
      const isGroup = isGroupJid(remoteJid);
      let senderPhone = '', senderName = '', groupName = '', groupProfilePic = null, contactProfilePic = null;
      if (isGroup) {
        const meta = await getGroupMetadata(socket, remoteJid);
        if (meta) groupName = meta.subject || '';
        groupProfilePic = await getProfilePicture(socket, remoteJid);
        if (!fromMe && msg.key.participant) {
          senderPhone = extractPhoneFromJid(msg.key.participant) || '';
          senderName = msg.pushName || '';
        }
      } else {
        if (!fromMe) { senderPhone = extractPhoneFromJid(remoteJid) || ''; senderName = msg.pushName || ''; }
        contactProfilePic = await getProfilePicture(socket, remoteJid);
      }
      let mediaUrl = null, mediaMimeType = null, mediaType = null;
      const mediaCaption = getMediaCaption(msg);
      if (hasMedia(msg)) {
        const mediaResult = await processMediaMessage(socket, msg, sessionId);
        if (mediaResult) { mediaUrl = mediaResult.mediaUrl || null; mediaMimeType = mediaResult.mediaMimeType || null; mediaType = mediaResult.mediaType || null; }
      }
      await sendWebhook({
        event: 'messages.upsert', sessionId, instanceName, webhookSecret,
        data: { messages: [{ key: msg.key, message: msg.message, messageTimestamp: msg.messageTimestamp, pushName: msg.pushName, groupName, groupSubject: groupName, groupProfilePic, isGroup, senderPhone, senderName, mediaUrl, mediaMimeType, mediaType, mediaCaption, senderProfilePic: contactProfilePic, syncType: 'realtime' }] }
      });
    }
  });

  socket.ev.on('messages.update', async (updates) => { await sendWebhook({ event: 'messages.update', sessionId, instanceName, webhookSecret, data: { updates } }); });
  socket.ev.on('chats.upsert', async (chats) => {
    const enriched = [];
    for (const chat of chats) {
      const jid = chat.id, isGroup = isGroupJid(jid);
      let e = { ...chat };
      if (isGroup) { const meta = await getGroupMetadata(socket, jid); if (meta) { e.groupSubject = meta.subject; e.name = meta.subject; } }
      e.profilePicture = await getProfilePicture(socket, jid);
      enriched.push(e);
    }
    await sendWebhook({ event: 'chats.upsert', sessionId, instanceName, webhookSecret, data: { chats: enriched } });
  });
  socket.ev.on('chats.set', async ({ chats }) => { console.log(\`🚫 Ignoring \${chats?.length || 0} historical chats\`); });
  socket.ev.on('messaging-history.set', async () => { console.log(\`🚫 Ignoring history sync\`); });
  return session;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.8.0', features: { contactsSync: true, mediaUpload: !!supabase, heartbeat: true }, sessions: sessions.size, timestamp: new Date().toISOString() });
});

app.post('/api/instance/create', async (req, res) => {
  try {
    const { sessionId, instanceName, webhookSecret } = req.body;
    if (!sessionId || !instanceName) return res.status(400).json({ error: 'sessionId and instanceName required' });
    const session = await createWhatsAppSession(sessionId, instanceName, webhookSecret || '');
    res.json({ success: true, sessionId: session.sessionId, instanceName: session.instanceName, isConnected: session.isConnected });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/instance/:sessionId/qr', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ qrCode: session.qrCode, isConnected: session.isConnected, phoneNumber: session.phoneNumber, pushName: session.pushName, profilePicture: session.profilePicture });
});

app.get('/api/instance/:sessionId/status', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found', status: 'not_found' });
  res.json({ status: session.isConnected ? 'connected' : (session.qrCode ? 'waiting_qr' : 'connecting'), isConnected: session.isConnected, phoneNumber: session.phoneNumber, pushName: session.pushName, profilePicture: session.profilePicture, contactsCount: session.contacts?.size || 0 });
});

app.get('/api/instance/list', (req, res) => {
  const list = [];
  for (const [id, session] of sessions) list.push({ sessionId: id, instanceName: session.instanceName, isConnected: session.isConnected, phoneNumber: session.phoneNumber });
  res.json({ sessions: list });
});

app.delete('/api/instance/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  try { if (session.socket) await session.socket.logout(); } catch (e) {}
  const sessionPath = path.join(SESSIONS_DIR, session.instanceName);
  if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true });
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

app.get('/api/contacts/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ success: true, count: session.contacts?.size || 0, contacts: Array.from(session.contacts?.values() || []) });
});

app.post('/api/message/send', async (req, res) => {
  try {
    const { sessionId, phone, message, isGroup } = req.body;
    console.log(\`📤 Send request: session=\${sessionId}, phone=\${phone}, isGroup=\${isGroup}\`);
    const session = sessions.get(sessionId);
    if (!session) { console.error(\`❌ Session not found: \${sessionId}\`); return res.status(400).json({ error: 'Session not found' }); }
    if (!session.socket) { console.error(\`❌ Socket not available\`); return res.status(400).json({ error: 'Socket not available' }); }
    if (!session.isConnected) { console.error(\`❌ Session not connected\`); return res.status(400).json({ error: 'Session not connected' }); }
    const jid = formatJidForSend(phone, isGroup);
    console.log(\`📤 Sending to \${jid}: "\${message.substring(0, 30)}..."\`);
    const result = await session.socket.sendMessage(jid, { text: message });
    console.log(\`✅ Message sent: \${result?.key?.id}\`);
    res.json({ success: true, jid, messageId: result?.key?.id });
  } catch (error) { console.error(\`❌ Send error:\`, error); res.status(500).json({ error: error.message }); }
});

app.post('/api/message/media', async (req, res) => {
  try {
    const { sessionId, phone, mediaUrl, mediaType, caption, isGroup, fileName } = req.body;
    const session = sessions.get(sessionId);
    if (!session?.socket?.isConnected) return res.status(400).json({ error: 'Session not connected' });
    const jid = formatJidForSend(phone, isGroup);
    let content = {};
    if (mediaType === 'image') content = { image: { url: mediaUrl }, caption: caption || '' };
    else if (mediaType === 'video') content = { video: { url: mediaUrl }, caption: caption || '' };
    else if (mediaType === 'audio') content = { audio: { url: mediaUrl }, mimetype: 'audio/mpeg' };
    else if (mediaType === 'ptt') content = { audio: { url: mediaUrl }, mimetype: 'audio/ogg; codecs=opus', ptt: true };
    else if (mediaType === 'document') content = { document: { url: mediaUrl }, fileName: fileName || caption || 'document' };
    else return res.status(400).json({ error: 'Invalid mediaType' });
    console.log(\`📤 Sending \${mediaType} to \${jid}\`);
    const result = await session.socket.sendMessage(jid, content);
    res.json({ success: true, jid, messageId: result?.key?.id });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/group/:sessionId/:groupId', async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session?.socket) return res.status(404).json({ error: 'Session not found' });
    const groupJid = req.params.groupId.includes('@') ? req.params.groupId : \`\${req.params.groupId}@g.us\`;
    const metadata = await getGroupMetadata(session.socket, groupJid);
    if (metadata) res.json({ success: true, metadata });
    else res.status(404).json({ error: 'Group not found' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/profile/:sessionId/:jid', async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session?.socket) return res.status(404).json({ error: 'Session not found' });
    const jid = req.params.jid.includes('@') ? req.params.jid : \`\${req.params.jid}@s.whatsapp.net\`;
    const url = await getProfilePicture(session.socket, jid);
    res.json({ success: true, url });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

async function init() {
  const baileys = await import('@whiskeysockets/baileys');
  makeWASocket = baileys.default;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  DisconnectReason = baileys.DisconnectReason;
  fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
  makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;
  downloadMediaMessage = baileys.downloadMediaMessage;
  Browsers = baileys.Browsers;
  QRCode = (await import('qrcode')).default;
  pino = (await import('pino')).default;
  mime = (await import('mime-types')).default;
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('✅ Supabase initialized');
  }
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(\`\\n🚀 Baileys Server v3.7.0 on port \${PORT}\`);
    console.log(\`💓 Heartbeat: 25s | 👥 Contacts: ON | ☁️ Media: \${supabase ? 'ON' : 'OFF'}\\n\`);
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
      a.download = 'baileys-server-v3.8.0.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Download concluído!',
        description: 'Servidor v3.8.0 - Estável com contatos, mídia e endpoint corrigido!'
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

  // If externally controlled, don't render the button
  if (isOpenExternal !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-[#FF4500]" />
              Servidor Baileys v3.8.0 - Estável
            </DialogTitle>
            <DialogDescription>
              Servidor WhatsApp completo - contatos, mídia e mensagens em tempo real
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* What's New */}
            <div className="bg-[#FF4500]/10 border border-[#FF4500]/20 rounded-lg p-4">
              <h4 className="font-medium text-[#FF4500] mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Novidades v3.8.0
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-[#FF4500]" />
                  <strong>Endpoint corrigido</strong> - /api/message/send funcional
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-[#FF4500]" />
                  <strong>Heartbeat automático</strong> - Conexão mais estável (25s)
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-[#FF4500]" />
                  <strong>Sincronização de Contatos</strong> - Todos os contatos ao conectar
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-[#FF4500]" />
                  <strong>Reconexão inteligente</strong> - Backoff exponencial
                </li>
                <li className="flex items-center gap-2">
                  <ImageIcon className="h-3 w-3 text-[#FF4500]" />
                  <strong>Mídia completa</strong> - Imagens, vídeos, áudios, documentos
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Fechar
              </Button>
              <Button 
                onClick={downloadZip} 
                disabled={downloading}
                className="bg-[#FF4500] hover:bg-[#FF4500]/90"
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar v3.8.0
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
              Servidor Baileys v3.7.0 - Estável
            </DialogTitle>
            <DialogDescription>
              Servidor WhatsApp completo - contatos, mídia e mensagens em tempo real
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* What's New */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Novidades v3.7.0
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-primary" />
                  <strong>Heartbeat automático</strong> - Conexão mais estável (25s)
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-primary" />
                  <strong>Sincronização de Contatos</strong> - Todos os contatos ao conectar
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  <strong>Reconexão inteligente</strong> - Backoff exponencial
                </li>
                <li className="flex items-center gap-2">
                  <ImageIcon className="h-3 w-3 text-primary" />
                  <strong>Mídia completa</strong> - Imagens, vídeos, áudios, documentos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  <strong>Retry inteligente</strong> - 5 tentativas para download de mídia
                </li>
              </ul>
            </div>

            {/* Important: Contacts Sync */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                👥 Sincronização de Contatos
              </h4>
              <p className="text-sm text-muted-foreground">
                Ao conectar, todos os seus contatos serão sincronizados automaticamente. 
                Mensagens novas aparecerão em tempo real!
              </p>
            </div>

            {/* Files included */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">📦 Arquivos incluídos:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>package.json</code> - Dependências (Baileys 6.7.9)</li>
                <li>• <code>index.js</code> - Servidor v3.7.0 completo</li>
                <li>• <code>.env.example</code> - Variáveis de ambiente</li>
                <li>• <code>README.md</code> - Instruções de deploy</li>
              </ul>
            </div>

            {/* Important Note */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <h4 className="font-medium text-[#FF4500] dark:text-orange-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Importante: Atualização Necessária
              </h4>
              <p className="text-sm text-muted-foreground">
                Se você já tem o servidor no Railway, <strong>substitua TODOS os arquivos</strong> (especialmente <code>index.js</code>). 
                Delete também a pasta <code>sessions/</code> para uma nova conexão limpa.
              </p>
            </div>

            {/* Requirements */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <h4 className="font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
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
                  Baixar baileys-server-v3.8.0.zip
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
