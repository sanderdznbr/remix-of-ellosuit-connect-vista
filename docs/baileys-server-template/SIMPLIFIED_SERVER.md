# 🚀 Servidor Baileys SIMPLIFICADO (Single File)

Este é um servidor mais simples em um único arquivo para facilitar o deploy.

## 📁 Estrutura

```
baileys-server/
├── index.js          # Servidor (único arquivo)
├── sessions/         # Criado automaticamente
├── package.json
└── .env
```

## 📦 package.json

Crie o arquivo `package.json`:

```json
{
  "name": "baileys-server",
  "version": "1.0.0",
  "main": "index.js",
  "type": "commonjs",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.9",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "qrcode": "^1.5.4",
    "pino": "^9.6.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

## 📄 index.js

Crie o arquivo `index.js` (JavaScript puro, sem TypeScript):

```javascript
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Dynamic import for ESM module
let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore;
let QRCode;
let pino;

const app = express();
app.use(cors());
app.use(express.json());

// Store sessions in memory
const sessions = new Map();

// Webhook URL from environment
const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL || '';

// Sessions directory
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Send webhook to Supabase
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
    console.log(`📤 Webhook sent: ${payload.event} - Status: ${response.status}`);
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
  }
}

// Create WhatsApp session
async function createWhatsAppSession(sessionId, instanceName, webhookSecret) {
  if (sessions.has(sessionId)) {
    console.log(`Session ${instanceName} already exists`);
    return sessions.get(sessionId);
  }

  const sessionPath = path.join(SESSIONS_DIR, instanceName);
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  
  console.log(`📱 Creating session: ${instanceName} (Baileys v${version.join('.')})`);

  const session = {
    sessionId,
    instanceName,
    socket: null,
    webhookSecret,
    qrCode: null,
    isConnected: false,
    phoneNumber: null,
    pushName: null
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
    browser: ['Lovable CRM', 'Chrome', '120.0.0']
  });

  session.socket = socket;

  // Save credentials
  socket.ev.on('creds.update', saveCreds);

  // Connection updates
  socket.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      session.qrCode = await QRCode.toDataURL(qr);
      console.log(`📱 QR Code generated for ${instanceName}`);
      
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
      }
      
      console.log(`✅ ${instanceName} connected! Phone: ${session.phoneNumber}`);
      
      await sendWebhook({
        event: 'connection.update',
        sessionId,
        instanceName,
        data: {
          connection: 'open',
          isConnected: true,
          phoneNumber: session.phoneNumber,
          pushName: session.pushName
        }
      });
    }

    if (connection === 'close') {
      session.isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;
      
      console.log(`❌ ${instanceName} disconnected. Reconnect: ${shouldReconnect}`);
      
      await sendWebhook({
        event: 'connection.update',
        sessionId,
        instanceName,
        data: { connection: 'close', isConnected: false, statusCode }
      });

      if (shouldReconnect) {
        sessions.delete(sessionId);
        setTimeout(() => createWhatsAppSession(sessionId, instanceName, webhookSecret), 5000);
      } else {
        sessions.delete(sessionId);
      }
    }
  });

  // Incoming messages
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') continue;
      
      console.log(`📨 Message from ${msg.key.remoteJid}`);
      
      await sendWebhook({
        event: 'messages.upsert',
        sessionId,
        instanceName,
        data: {
          messages: [{
            key: msg.key,
            message: msg.message,
            messageTimestamp: msg.messageTimestamp,
            pushName: msg.pushName
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

// ============== ROUTES ==============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    sessions: sessions.size,
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
    pushName: session.pushName
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
    pushName: session.pushName
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
    let jid = phone.replace(/\D/g, '');
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

// ============== START SERVER ==============

async function startServer() {
  // Dynamic imports for ESM modules
  const baileysModule = await import('@whiskeysockets/baileys');
  makeWASocket = baileysModule.default;
  useMultiFileAuthState = baileysModule.useMultiFileAuthState;
  DisconnectReason = baileysModule.DisconnectReason;
  fetchLatestBaileysVersion = baileysModule.fetchLatestBaileysVersion;
  makeCacheableSignalKeyStore = baileysModule.makeCacheableSignalKeyStore;
  
  QRCode = require('qrcode');
  pino = require('pino');

  const PORT = process.env.PORT || 3333;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Baileys Server running on port ${PORT}`);
    console.log(`📡 Webhook URL: ${WEBHOOK_URL || 'Not configured'}`);
  });
}

startServer().catch(console.error);
```

## 🚀 Deploy no Railway

### 1. Crie um repositório GitHub com estes 2 arquivos:
- `package.json`
- `index.js`

### 2. No Railway, configure as variáveis:

| Variável | Valor |
|----------|-------|
| `SUPABASE_WEBHOOK_URL` | `https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/whatsapp-webhook` |

**NÃO** defina PORT - Railway define automaticamente!

### 3. Deploy e aguarde

O servidor deve mostrar nos logs:
```
🚀 Baileys Server running on port XXXX
📡 Webhook URL: https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/whatsapp-webhook
```

### 4. Teste o health check

Acesse: `https://seu-dominio.railway.app/api/health`

Deve retornar:
```json
{"status":"ok","sessions":0,"timestamp":"..."}
```

## ❓ Problemas Comuns

### "Cannot find module"
- Verifique se `package.json` está correto
- Rode `npm install` localmente antes de fazer push

### Servidor não responde
- Verifique se removeu a variável PORT
- Railway auto-injeta PORT

### QR Code não aparece
- Verifique os logs do Railway
- Certifique-se de que a variável SUPABASE_WEBHOOK_URL está correta
