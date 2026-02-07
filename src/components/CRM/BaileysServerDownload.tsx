import React, { useState } from 'react';
import { Download, Server, CheckCircle2, Loader2 } from 'lucide-react';
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
    // JAVASCRIPT PURO - SEM BUILD NECESSÁRIO
    const packageJson = `{
  "name": "baileys-server",
  "version": "2.5.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.9",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "pino": "^9.6.0",
    "qrcode": "^1.5.4"
  },
  "engines": {
    "node": ">=18"
  }
}`;

    const gitignore = `node_modules/
sessions/
.env
*.log`;

    const readme = `# 🚀 Baileys Server v2.5.0 para WhatsApp CRM

## Novidades v2.5.0
- ✅ Listener direto para evento 'qr' (mais confiável)
- ✅ Logging detalhado por etapas (debug fácil)
- ✅ Error handling robusto no auth state
- ✅ Retry automático em desconexões rápidas
- ✅ Até 10 tentativas de gerar QR Code

## Deploy no Railway

### 1. Suba para o GitHub
- Crie um repositório no GitHub
- Faça upload destes arquivos

### 2. No Railway
1. New Project → Deploy from GitHub
2. Selecione seu repositório
3. Em **Variables**, adicione:
   \`SUPABASE_WEBHOOK_URL\` = \`${webhookUrl}\`

### 3. Pronto!
O servidor vai iniciar automaticamente.

## Verificação de Logs

Nos logs do Railway, você deve ver:
\`\`\`
[SOCKET] Etapa 1: Preparando diretório de auth...
[SOCKET] Etapa 2: Carregando auth state...
[SOCKET] Etapa 3: Buscando versão do Baileys...
[SOCKET] Etapa 4: Configurando socket...
[SOCKET] Etapa 5: Criando socket Baileys...
[SOCKET] Etapa 6: Registrando event listeners...
[QR-EVENT] ⚡⚡⚡ EVENTO QR RECEBIDO DIRETAMENTE! ⚡⚡⚡
\`\`\`

Se parar antes da "Etapa 5", o problema é no auth state.
Se parar após "Etapa 5", o problema é na conexão com WhatsApp.
`;

    // SERVIDOR JAVASCRIPT COMPLETO - v2.5.0 com listener direto de QR
    const indexJs = `const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('[INIT] 🚀 Baileys Server v2.5.0 iniciando...');
console.log('[INIT] Node version:', process.version);
console.log('[INIT] Platform:', process.platform);
console.log('[INIT] PORT:', process.env.PORT || 3333);
console.log('[INIT] CWD:', process.cwd());
console.log('='.repeat(60));

const VERSION = "v2.5.0";
const app = express();

app.use(cors());
app.use(express.json());

// ============ CONFIGURAÇÃO ============
const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL || '';
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
const MAX_QR_RETRIES = 10;
const IMMEDIATE_RETRY_THRESHOLD = 5000;

console.log('[CONFIG] Webhook URL:', WEBHOOK_URL ? 'Configurada ✓' : 'NÃO configurada ⚠');
console.log('[CONFIG] Sessions dir:', SESSIONS_DIR);
console.log('[CONFIG] Max QR retries:', MAX_QR_RETRIES);

try {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    console.log('[CONFIG] ✓ Pasta sessions criada');
  } else {
    console.log('[CONFIG] ✓ Pasta sessions existe');
  }
} catch (err) {
  console.error('[CONFIG] ❌ Erro ao criar pasta sessions:', err.message);
}

// ============ VARIÁVEIS GLOBAIS ============
const sessions = new Map();
let makeWASocket = null;
let useMultiFileAuthState = null;
let DisconnectReason = null;
let makeCacheableSignalKeyStore = null;
let fetchLatestBaileysVersion = null;
let Browsers = null;
let QRCode = null;
let pino = null;
let baileysLoaded = false;

// ============ WEBHOOK ============
async function sendWebhook(payload) {
  if (!WEBHOOK_URL) return;
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(\`[WEBHOOK] \${payload.event} - Status: \${response.status}\`);
  } catch (error) {
    console.error('[WEBHOOK] Erro:', error.message);
  }
}

// ============ DELAY HELPER ============
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ CRIAR SOCKET PARA SESSÃO (v2.5.0) ============
async function createSocketForSession(session) {
  const { sessionId, instanceName } = session;
  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  
  console.log('');
  console.log(\`[SOCKET] ========== CRIANDO SOCKET PARA \${instanceName} ==========\`);
  console.log(\`[SOCKET] Tentativa: \${session.qrRetryCount + 1}/\${MAX_QR_RETRIES}\`);
  
  // ========== ETAPA 1: PREPARAR DIRETÓRIO ==========
  console.log('[SOCKET] Etapa 1: Preparando diretório de auth...');
  
  if (session.qrRetryCount > 0) {
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log('[SOCKET] Etapa 1: ✓ Auth antiga removida');
      }
    } catch (e) {
      console.error('[SOCKET] Etapa 1: ⚠ Erro ao limpar auth:', e.message);
    }
    
    const delayMs = Math.min(1000 * (session.qrRetryCount + 1), 5000);
    console.log(\`[SOCKET] Etapa 1: Aguardando \${delayMs}ms...\`);
    await sleep(delayMs);
  }
  
  try {
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    console.log('[SOCKET] Etapa 1: ✓ Diretório pronto:', sessionPath);
  } catch (e) {
    console.error('[SOCKET] Etapa 1: ❌ ERRO ao criar diretório:', e.message);
    throw e;
  }
  
  // ========== ETAPA 2: CARREGAR AUTH STATE ==========
  console.log('[SOCKET] Etapa 2: Carregando auth state...');
  
  let state, saveCreds;
  try {
    const authResult = await useMultiFileAuthState(sessionPath);
    state = authResult.state;
    saveCreds = authResult.saveCreds;
    console.log('[SOCKET] Etapa 2: ✓ Auth state carregado');
    console.log('[SOCKET] Etapa 2: Creds existentes:', !!state.creds?.me);
  } catch (authError) {
    console.error('[SOCKET] Etapa 2: ❌ ERRO no auth state:', authError.message);
    console.log('[SOCKET] Etapa 2: Tentando limpar e recriar...');
    
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      fs.mkdirSync(sessionPath, { recursive: true });
      const retryAuth = await useMultiFileAuthState(sessionPath);
      state = retryAuth.state;
      saveCreds = retryAuth.saveCreds;
      console.log('[SOCKET] Etapa 2: ✓ Auth state recriado após erro');
    } catch (retryError) {
      console.error('[SOCKET] Etapa 2: ❌ FALHA FATAL:', retryError.message);
      throw retryError;
    }
  }
  
  // ========== ETAPA 3: BUSCAR VERSÃO DO BAILEYS ==========
  console.log('[SOCKET] Etapa 3: Buscando versão do Baileys...');
  
  let version;
  try {
    const versionResult = await fetchLatestBaileysVersion();
    version = versionResult.version;
    console.log(\`[SOCKET] Etapa 3: ✓ Versão: \${version.join('.')}\`);
  } catch (versionError) {
    console.error('[SOCKET] Etapa 3: ⚠ Erro ao buscar versão, usando default');
    version = [2, 3000, 1015901307];
  }
  
  // ========== ETAPA 4: CONFIGURAR SOCKET ==========
  console.log('[SOCKET] Etapa 4: Configurando socket...');
  
  const logger = pino({ level: 'silent' });
  
  const socketConfig = {
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '120.0.6099.119'],
    connectTimeoutMs: 180000,
    defaultQueryTimeoutMs: 60000,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    getMessage: async () => undefined
  };
  
  console.log('[SOCKET] Etapa 4: ✓ Config pronta');
  console.log('[SOCKET] Etapa 4: Browser:', JSON.stringify(socketConfig.browser));
  
  // ========== ETAPA 5: CRIAR SOCKET ==========
  console.log('[SOCKET] Etapa 5: Criando socket Baileys...');
  
  let socket;
  try {
    socket = makeWASocket(socketConfig);
    session.socket = socket;
    session.socketCreatedAt = Date.now();
    console.log('[SOCKET] Etapa 5: ✓ Socket criado!');
  } catch (socketError) {
    console.error('[SOCKET] Etapa 5: ❌ ERRO ao criar socket:', socketError.message);
    throw socketError;
  }
  
  // ========== ETAPA 6: REGISTRAR LISTENERS ==========
  console.log('[SOCKET] Etapa 6: Registrando event listeners...');
  
  socket.ev.on('creds.update', saveCreds);
  console.log('[SOCKET] Etapa 6: ✓ creds.update');
  
  // ===== LISTENER DIRETO PARA QR (v2.5.0) =====
  socket.ev.on('qr', async (qr) => {
    console.log('[QR-EVENT] ⚡⚡⚡ EVENTO QR RECEBIDO DIRETAMENTE! ⚡⚡⚡');
    console.log('[QR-EVENT] QR string length:', qr?.length || 0);
    
    try {
      const qrDataUrl = await QRCode.toDataURL(qr);
      session.qrCode = qrDataUrl;
      session.qrGeneratedAt = Date.now();
      session.status = 'waiting_qr';
      console.log('[QR-EVENT] ✅ QR Code convertido para DataURL!');
      
      await sendWebhook({
        event: 'qr.update',
        sessionId,
        instanceName,
        data: { qrCode: qrDataUrl }
      });
    } catch (e) {
      console.error('[QR-EVENT] ❌ Erro ao converter QR:', e.message);
    }
  });
  console.log('[SOCKET] Etapa 6: ✓ QR DIRETO registrado');
  
  // ===== LISTENER DE CONNECTION.UPDATE =====
  socket.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;
    
    console.log('[CONNECTION] Update:', JSON.stringify({
      hasQr: !!qr, connection, hasLastDisconnect: !!lastDisconnect
    }));

    if (qr && !session.qrCode) {
      console.log('[CONNECTION] QR via connection.update (backup)');
      try {
        session.qrCode = await QRCode.toDataURL(qr);
        session.qrGeneratedAt = Date.now();
        session.status = 'waiting_qr';
        console.log('[CONNECTION] ✅ QR processado');
        
        await sendWebhook({
          event: 'qr.update', sessionId, instanceName,
          data: { qrCode: session.qrCode }
        });
      } catch (e) {
        console.error('[CONNECTION] Erro QR:', e.message);
      }
    }

    if (connection === 'open') {
      session.isConnected = true;
      session.wasConnected = true;
      session.qrRetryCount = 0;
      session.retryCount = 0;
      session.qrCode = null;
      session.status = 'connected';
      
      const user = socket.user;
      if (user) {
        session.phoneNumber = user.id.split(':')[0].replace('@s.whatsapp.net', '');
        session.pushName = user.name || null;
      }
      
      console.log(\`[CONNECTED] ✅✅✅ \${instanceName} CONECTADO! ✅✅✅\`);
      console.log(\`[CONNECTED] Telefone: \${session.phoneNumber}\`);
      
      await sendWebhook({
        event: 'connection.update', sessionId, instanceName,
        data: { connection: 'open', isConnected: true, phoneNumber: session.phoneNumber, pushName: session.pushName }
      });
    }

    if (connection === 'close') {
      session.isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const hadQR = !!session.qrCode || !!session.qrGeneratedAt;
      const socketAge = Date.now() - (session.socketCreatedAt || session.createdAt);
      
      console.log('');
      console.log('[DISCONNECTED] ========== DESCONEXÃO ==========');
      console.log(\`[DISCONNECTED] Instância: \${instanceName}\`);
      console.log(\`[DISCONNECTED] Código: \${statusCode}\`);
      console.log(\`[DISCONNECTED] wasConnected: \${session.wasConnected}\`);
      console.log(\`[DISCONNECTED] hadQR: \${hadQR}\`);
      console.log(\`[DISCONNECTED] qrRetryCount: \${session.qrRetryCount}\`);
      console.log(\`[DISCONNECTED] socketAge: \${socketAge}ms\`);
      
      await sendWebhook({
        event: 'connection.update', sessionId, instanceName,
        data: { connection: 'close', isConnected: false, statusCode }
      });
      
      if (statusCode === DisconnectReason?.loggedOut) {
        console.log(\`[LOGOUT] \${instanceName} fez logout\`);
        session.status = 'logged_out';
        sessions.delete(sessionId);
        try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
        
      } else if (session.wasConnected && session.retryCount < 5) {
        session.retryCount++;
        session.status = 'reconnecting';
        console.log(\`[RECONNECT] Tentativa \${session.retryCount}/5 em 3s...\`);
        setTimeout(async () => {
          try { await createSocketForSession(session); } catch (err) {
            console.error('[RECONNECT] Erro:', err.message);
          }
        }, 3000);
        
      } else if (!session.wasConnected && !hadQR && session.qrRetryCount < MAX_QR_RETRIES) {
        session.qrRetryCount++;
        session.status = 'retrying';
        
        const isQuickDisconnect = socketAge < IMMEDIATE_RETRY_THRESHOLD;
        const retryDelay = isQuickDisconnect ? 1000 : 2000;
        
        console.log(\`[QR-RETRY] ⚡ Tentativa \${session.qrRetryCount}/\${MAX_QR_RETRIES}\`);
        console.log(\`[QR-RETRY] Quick disconnect: \${isQuickDisconnect}, delay: \${retryDelay}ms\`);
        
        setTimeout(async () => {
          try { await createSocketForSession(session); } catch (err) {
            console.error('[QR-RETRY] Erro:', err.message);
            session.status = 'failed';
          }
        }, retryDelay);
        
      } else if (!session.wasConnected && hadQR) {
        session.status = 'waiting_scan';
        console.log(\`[WAITING] \${instanceName} aguardando QR ser escaneado\`);
        
      } else {
        console.log(\`[FAILED] \${instanceName} esgotou tentativas\`);
        session.status = 'failed';
      }
    }
  });
  console.log('[SOCKET] Etapa 6: ✓ connection.update');
  
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') continue;
      console.log(\`[MESSAGE] De \${msg.key.remoteJid}\`);
      await sendWebhook({
        event: 'messages.upsert', sessionId, instanceName,
        data: { messages: [{ key: msg.key, message: msg.message, messageTimestamp: msg.messageTimestamp, pushName: msg.pushName }] }
      });
    }
  });
  console.log('[SOCKET] Etapa 6: ✓ messages.upsert');
  
  socket.ev.on('messages.update', async (updates) => {
    await sendWebhook({ event: 'messages.update', sessionId, instanceName, data: { updates } });
  });
  console.log('[SOCKET] Etapa 6: ✓ messages.update');
  
  console.log('[SOCKET] ========== SOCKET PRONTO, AGUARDANDO QR ==========');
  console.log('');
  
  return session;
}

// ============ CRIAR SESSÃO WHATSAPP ============
async function createSession(sessionId, instanceName, webhookSecret) {
  if (!baileysLoaded) {
    throw new Error('Baileys ainda não carregado');
  }
  
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId);
    if (!existing.qrCode && !existing.isConnected && existing.status !== 'retrying') {
      console.log(\`[SESSION] \${sessionId} existe sem QR, recriando...\`);
      existing.qrRetryCount = 0;
      return await createSocketForSession(existing);
    }
    console.log(\`[SESSION] \${sessionId} já existe (status: \${existing.status})\`);
    return existing;
  }

  console.log(\`[SESSION] ========== NOVA SESSÃO: \${instanceName} ==========\`);

  const session = {
    sessionId, instanceName, socket: null, webhookSecret,
    qrCode: null, qrGeneratedAt: null,
    isConnected: false, wasConnected: false,
    retryCount: 0, qrRetryCount: 0,
    createdAt: Date.now(), socketCreatedAt: null,
    phoneNumber: null, pushName: null, status: 'initializing'
  };

  sessions.set(sessionId, session);
  await createSocketForSession(session);
  return session;
}

// ============ ROTAS ============

app.get('/api/health', (req, res) => {
  console.log(\`[\${VERSION}] Health check\`);
  res.json({ status: 'ok', version: VERSION, sessions: sessions.size, baileysLoaded, timestamp: new Date().toISOString() });
});

app.post('/api/instance/create', async (req, res) => {
  try {
    if (!baileysLoaded) return res.status(503).json({ error: 'Baileys carregando...' });
    const { sessionId, instanceName, webhookSecret } = req.body;
    if (!sessionId || !instanceName) return res.status(400).json({ error: 'sessionId e instanceName obrigatórios' });
    
    console.log(\`[\${VERSION}] Criando: \${instanceName}\`);
    const session = await createSession(sessionId, instanceName, webhookSecret || '');
    res.json({ success: true, version: VERSION, sessionId: session.sessionId, instanceName: session.instanceName, isConnected: session.isConnected, qrRetryCount: session.qrRetryCount, status: session.status });
  } catch (error) {
    console.error('[ERROR] Criar:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/instance/:sessionId/qr', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
  res.json({ qrCode: session.qrCode, isConnected: session.isConnected, phoneNumber: session.phoneNumber, pushName: session.pushName, qrRetryCount: session.qrRetryCount, status: session.status });
});

app.get('/api/instance/:sessionId/status', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada', status: 'not_found' });
  res.json({ status: session.status, isConnected: session.isConnected, phoneNumber: session.phoneNumber, pushName: session.pushName, wasConnected: session.wasConnected, retryCount: session.retryCount, qrRetryCount: session.qrRetryCount, sessionAge: Date.now() - session.createdAt, hasQR: !!session.qrCode });
});

app.post('/api/instance/:sessionId/regenerate-qr', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
  
  console.log(\`[REGENERATE] ========== \${session.instanceName} ==========\`);
  
  if (session.socket) { try { session.socket.end(); } catch (e) {} }
  
  session.socket = null;
  session.qrCode = null;
  session.qrGeneratedAt = null;
  session.qrRetryCount = 0;
  session.retryCount = 0;
  session.status = 'initializing';
  session.wasConnected = false;
  
  const sessionPath = path.join(SESSIONS_DIR, session.sessionId);
  try { fs.rmSync(sessionPath, { recursive: true, force: true }); console.log('[REGENERATE] ✓ Auth limpa'); } catch (e) {}
  
  await sleep(1000);
  
  try {
    await createSocketForSession(session);
    res.json({ success: true, message: 'Regenerando QR...', status: session.status });
  } catch (error) {
    console.error('[REGENERATE] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/instance/list', (req, res) => {
  const list = [];
  for (const [id, session] of sessions) {
    list.push({ sessionId: id, instanceName: session.instanceName, isConnected: session.isConnected, phoneNumber: session.phoneNumber, status: session.status, hasQR: !!session.qrCode });
  }
  res.json({ sessions: list });
});

app.delete('/api/instance/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
  try { if (session.socket) { try { await session.socket.logout(); } catch (e) { try { session.socket.end(); } catch (e2) {} } } } catch (e) {}
  const sessionPath = path.join(SESSIONS_DIR, session.sessionId);
  if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true });
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

app.post('/api/message/send-text', async (req, res) => {
  try {
    const { sessionId, phone, message } = req.body;
    const session = sessions.get(sessionId);
    if (!session || !session.socket || !session.isConnected) return res.status(400).json({ error: 'Sessão não conectada' });
    let jid = phone.replace(/\\D/g, '');
    if (!jid.includes('@')) jid = jid + '@s.whatsapp.net';
    await session.socket.sendMessage(jid, { text: message });
    res.json({ success: true, to: jid });
  } catch (error) {
    console.error('[ERROR] Enviar:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ INICIAR SERVIDOR ============
const PORT = process.env.PORT || 3333;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('='.repeat(60));
  console.log(\`🚀 [\${VERSION}] Servidor HTTP na porta \${PORT}\`);
  console.log(\`📡 Webhook: \${WEBHOOK_URL || 'Não configurada'}\`);
  console.log('='.repeat(60));
  console.log('');
  loadBaileys();
});

async function loadBaileys() {
  console.log('[BAILEYS] ========== CARREGANDO ==========');
  try {
    QRCode = require('qrcode');
    console.log('[BAILEYS] ✓ qrcode');
    
    pino = require('pino');
    console.log('[BAILEYS] ✓ pino');
    
    console.log('[BAILEYS] Importando @whiskeysockets/baileys...');
    const baileys = await import('@whiskeysockets/baileys');
    console.log('[BAILEYS] ✓ Módulo importado');
    
    if (typeof baileys.default === 'function') {
      makeWASocket = baileys.default;
      console.log('[BAILEYS] ✓ makeWASocket via default');
    } else if (baileys.default && typeof baileys.default.default === 'function') {
      makeWASocket = baileys.default.default;
      console.log('[BAILEYS] ✓ makeWASocket via default.default');
    } else if (typeof baileys.makeWASocket === 'function') {
      makeWASocket = baileys.makeWASocket;
      console.log('[BAILEYS] ✓ makeWASocket via named export');
    } else {
      console.log('[BAILEYS] ⚠ Estrutura:', Object.keys(baileys));
      throw new Error('makeWASocket não encontrado');
    }
    
    useMultiFileAuthState = baileys.useMultiFileAuthState || baileys.default?.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason || baileys.default?.DisconnectReason;
    makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore || baileys.default?.makeCacheableSignalKeyStore;
    fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion || baileys.default?.fetchLatestBaileysVersion;
    Browsers = baileys.Browsers || baileys.default?.Browsers;
    
    console.log('[BAILEYS] ✓ useMultiFileAuthState:', typeof useMultiFileAuthState);
    console.log('[BAILEYS] ✓ Browsers:', typeof Browsers);
    
    if (!useMultiFileAuthState || !makeCacheableSignalKeyStore || !fetchLatestBaileysVersion) {
      throw new Error('Funções auxiliares não encontradas');
    }
    
    baileysLoaded = true;
    console.log('');
    console.log('[BAILEYS] ========== PRONTO! ==========');
    console.log('');
  } catch (err) {
    console.error('[BAILEYS] ❌ ERRO:', err.message);
    console.error('[BAILEYS] Stack:', err.stack);
  }
}

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Recebido SIGTERM');
  server.close(() => { console.log('[SHUTDOWN] Fechado'); process.exit(0); });
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled:', reason);
});
`;

    return {
      'package.json': packageJson,
      '.gitignore': gitignore,
      'README.md': readme,
      'index.js': indexJs
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
      a.download = 'baileys-server-v2.5.0.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Download concluído!',
        description: 'Servidor v2.5.0 com listener direto de QR'
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar o ZIP',
        variant: 'destructive'
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="h-8"
      >
        <Server className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Servidor</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-green-600" />
              Servidor Baileys v2.5.0
            </DialogTitle>
            <DialogDescription>
              Com listener direto de QR e logging detalhado por etapas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-sm text-green-800 dark:text-green-200 mb-2">
                ✨ Novidades v2.5.0
              </h4>
              <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                <li>⚡ Listener direto para evento 'qr'</li>
                <li>📝 Logging detalhado por etapas (debug fácil)</li>
                <li>🔄 Até 10 tentativas automáticas de gerar QR</li>
                <li>🛡️ Error handling robusto no auth state</li>
              </ul>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">📦 Conteúdo do ZIP:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  package.json (v2.5.0)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  index.js (servidor completo!)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  README.md (instruções + checklist)
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
              <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-2">
                🔍 Como verificar se funcionou:
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Nos logs do Railway, procure por:<br />
                <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">[QR-EVENT] ⚡⚡⚡ EVENTO QR RECEBIDO</code>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={downloadZip} 
              disabled={downloading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Baixar v2.5.0
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BaileysServerDownload;
