import React, { useState } from 'react';
import { Download, Server, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
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
    // ========== PACKAGE.JSON - BAILEYS 7.0.0-rc.9 (ESM) + NODE 20 ==========
    const packageJson = `{
  "name": "baileys-server",
  "version": "2.9.1",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "7.0.0-rc.9",
    "@hapi/boom": "^10.0.1",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "pino": "^9.6.0",
    "qrcode": "^1.5.4"
  },
  "engines": {
    "node": ">=20"
  }
}`;

    // Força Railway a usar Node 20
    const nodeVersion = `20`;

    // Configuração do Nixpacks para Railway
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

    const readme = `# 🚀 Baileys Server v2.9.1 - ESM + Baileys 7.x + Node 20

## ✅ Correções v2.9.1

Esta versão resolve o **Erro 405** usando Baileys 7.x com configuração oficial.

### Mudanças Principais:
- ✅ **Node.js 20** (obrigatório para Baileys 7.x)
- ✅ **Baileys 7.0.0-rc.9** (versão mais recente)
- ✅ **ESM** (type: module) - obrigatório para Baileys 7.x
- ✅ **Browsers.macOS("Desktop")** - browser string oficial
- ✅ **nixpacks.toml** - força Railway a usar Node 20
- ✅ **.node-version** - especifica Node 20

## Deploy no Railway

### 1. Suba para o GitHub
- Crie um repositório no GitHub
- Faça upload de **TODOS** estes arquivos (incluindo .node-version e nixpacks.toml)

### 2. No Railway
1. New Project → Deploy from GitHub
2. Selecione seu repositório
3. Em **Variables**, adicione:
   \`SUPABASE_WEBHOOK_URL\` = \`${webhookUrl}\`

### 3. Pronto!
O Railway vai usar Node.js 20 automaticamente (3-4 minutos).

## Verificação de Logs

Nos logs do Railway, você deve ver:

\`\`\`
[INIT] Baileys Server v2.9.1 iniciando...
[INIT] Baileys 7.0.0-rc.9 (ESM)
[INIT] Node version: v20.x.x  <-- IMPORTANTE!
[BAILEYS] ✅ Carregado com sucesso!
[QR] ✅ QR Code recebido!
\`\`\`

## Arquivos Importantes

- **nixpacks.toml** - Configura Railway para usar Node 20
- **.node-version** - Especifica a versão do Node
- **package.json** - engines: ">=20"

Se o deploy falhar com erro de Node 18, verifique se o nixpacks.toml foi incluído.
`;

    // ========== SERVIDOR v2.9.1 - ESM + BAILEYS 7.x + NODE 20 ==========
    const indexJs = `import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(60));
console.log('[INIT] 🚀 Baileys Server v2.9.1 iniciando...');
console.log('[INIT] 📦 Baileys 7.0.0-rc.9 (ESM)');
console.log('[INIT] 🖥️ Browser: Browsers.macOS("Desktop")');
console.log('[INIT] Node version:', process.version);
console.log('[INIT] Platform:', process.platform);
console.log('[INIT] PORT:', process.env.PORT || 3333);
console.log('='.repeat(60));

const VERSION = "v2.9.0";
const app = express();

app.use(cors());
app.use(express.json());

// ============ CONFIGURAÇÃO ============
const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL || '';
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
const MAX_RETRIES = 3;

console.log('[CONFIG] Webhook URL:', WEBHOOK_URL ? 'Configurada ✓' : 'NÃO configurada ⚠');
console.log('[CONFIG] Sessions dir:', SESSIONS_DIR);

try {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    console.log('[CONFIG] ✓ Pasta sessions criada');
  }
} catch (err) {
  console.error('[CONFIG] ❌ Erro ao criar pasta sessions:', err.message);
}

// ============ VARIÁVEIS GLOBAIS ============
const sessions = new Map();
let makeWASocket = null;
let useMultiFileAuthState = null;
let DisconnectReason = null;
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

// ============ SLEEP ============
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ CRIAR SOCKET (v2.9.0 - ESM + Browsers.macOS) ============
async function createSocketForSession(session) {
  const { sessionId, instanceName } = session;
  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  
  console.log('');
  console.log('[SOCKET] ========================================');
  console.log(\`[SOCKET] Criando socket para: \${instanceName}\`);
  console.log(\`[SOCKET] Tentativa: \${session.retryCount + 1}/\${MAX_RETRIES}\`);
  console.log('[SOCKET] ========================================');
  
  // Limpar auth em retry
  if (session.retryCount > 0) {
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log('[SOCKET] ✓ Auth antiga removida');
      }
      await sleep(3000);
    } catch (e) {
      console.error('[SOCKET] ⚠ Erro ao limpar auth:', e.message);
    }
  }
  
  // Criar diretório
  try {
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    console.log('[SOCKET] ✓ Diretório pronto');
  } catch (e) {
    console.error('[SOCKET] ❌ Erro ao criar diretório:', e.message);
    throw e;
  }
  
  // Carregar auth state - Baileys 7.x usa apenas state direto
  console.log('[SOCKET] Carregando auth state (Baileys 7.x)...');
  let state, saveCreds;
  try {
    const authResult = await useMultiFileAuthState(sessionPath);
    state = authResult.state;
    saveCreds = authResult.saveCreds;
    console.log('[SOCKET] ✓ Auth state carregado');
  } catch (e) {
    console.error('[SOCKET] ❌ Erro no auth state:', e.message);
    throw e;
  }
  
  // Aguardar antes de criar socket
  console.log('[SOCKET] Aguardando 1s antes de criar socket...');
  await sleep(1000);
  
  // ========== CRIAR SOCKET - CONFIGURAÇÃO OFICIAL BAILEYS 7.x ==========
  console.log('[SOCKET] Criando socket com Browsers.macOS("Desktop")...');
  
  const logger = pino({ level: 'silent' });
  
  // CONFIGURAÇÃO MÍNIMA OFICIAL - Baileys 7.x
  const sock = makeWASocket({
    auth: state,  // Direto, sem makeCacheableSignalKeyStore
    browser: Browsers.macOS("Desktop"),  // Browser string OFICIAL
    printQRInTerminal: true,
    logger: logger,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
    getMessage: async () => undefined
  });
  
  session.socket = sock;
  session.socketCreatedAt = Date.now();
  console.log('[SOCKET] ✓ Socket criado com Browsers.macOS("Desktop")!');
  
  // ========== REGISTRAR LISTENERS ==========
  console.log('[SOCKET] Registrando listeners...');
  
  // Salvar credenciais
  sock.ev.on('creds.update', saveCreds);
  console.log('[SOCKET] ✓ creds.update registrado');
  
  // CONNECTION UPDATE - Principal handler
  sock.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;
    
    console.log('[CONNECTION] Update:', JSON.stringify({
      hasQr: !!qr,
      connection: connection || null
    }));
    
    // ===== QR CODE =====
    if (qr) {
      console.log('[QR] 🎉 QR Code recebido!');
      try {
        session.qrCode = await QRCode.toDataURL(qr);
        session.qrGeneratedAt = Date.now();
        session.status = 'waiting_qr';
        console.log('[QR] ✅ QR Code convertido para DataURL');
        
        await sendWebhook({
          event: 'qr.update',
          sessionId,
          instanceName,
          data: { qrCode: session.qrCode }
        });
      } catch (e) {
        console.error('[QR] ❌ Erro ao converter:', e.message);
      }
    }
    
    // ===== CONECTADO =====
    if (connection === 'open') {
      session.isConnected = true;
      session.wasConnected = true;
      session.retryCount = 0;
      session.qrCode = null;
      session.status = 'connected';
      
      const user = sock.user;
      if (user) {
        session.phoneNumber = user.id.split(':')[0].replace('@s.whatsapp.net', '');
        session.pushName = user.name || null;
      }
      
      console.log('');
      console.log('[CONNECTED] ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅');
      console.log(\`[CONNECTED] \${instanceName} CONECTADO!\`);
      console.log(\`[CONNECTED] Telefone: \${session.phoneNumber}\`);
      console.log('[CONNECTED] ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅');
      console.log('');
      
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
    
    // ===== DESCONECTADO =====
    if (connection === 'close') {
      session.isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      
      console.log('');
      console.log('[DISCONNECTED] ========================================');
      console.log(\`[DISCONNECTED] Instância: \${instanceName}\`);
      console.log(\`[DISCONNECTED] Código: \${statusCode}\`);
      console.log(\`[DISCONNECTED] wasConnected: \${session.wasConnected}\`);
      console.log(\`[DISCONNECTED] hadQR: \${!!session.qrCode}\`);
      console.log('[DISCONNECTED] ========================================');
      
      await sendWebhook({
        event: 'connection.update',
        sessionId,
        instanceName,
        data: { connection: 'close', isConnected: false, statusCode }
      });
      
      // Logout = não reconectar
      if (statusCode === DisconnectReason?.loggedOut) {
        console.log('[LOGOUT] Usuário fez logout');
        session.status = 'logged_out';
        sessions.delete(sessionId);
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        } catch (e) {}
        return;
      }
      
      // Erro 405 = Method Not Allowed - problema de protocolo
      if (statusCode === 405) {
        console.log('[405] Method Not Allowed - problema de protocolo');
        console.log('[405] Usando Baileys 7.x com Browsers.macOS("Desktop")');
        session.retryCount++;
        if (session.retryCount < MAX_RETRIES) {
          session.status = 'reconnecting';
          console.log(\`[405] Tentando reconectar em 10s (tentativa \${session.retryCount})...\`);
          setTimeout(async () => {
            try {
              await createSocketForSession(session);
            } catch (err) {
              console.error('[405] Erro ao reconectar:', err.message);
              session.status = 'failed';
            }
          }, 10000);
        } else {
          console.log('[405] Esgotou tentativas - pode ser bloqueio de IP');
          session.status = 'failed';
        }
        return;
      }
      
      // Erro 515 = Restart Required - reconectar com delay maior
      if (statusCode === 515) {
        console.log('[515] Restart Required - reconectando em 5s...');
        session.retryCount++;
        if (session.retryCount < MAX_RETRIES) {
          session.status = 'reconnecting';
          setTimeout(async () => {
            try {
              await createSocketForSession(session);
            } catch (err) {
              console.error('[515] Erro ao reconectar:', err.message);
              session.status = 'failed';
            }
          }, 5000);
        } else {
          session.status = 'failed';
        }
        return;
      }
      
      // Tentar reconectar para outros erros
      if (session.retryCount < MAX_RETRIES) {
        session.retryCount++;
        session.status = 'reconnecting';
        
        console.log(\`[RETRY] Tentativa \${session.retryCount}/\${MAX_RETRIES} em 5s...\`);
        
        setTimeout(async () => {
          try {
            await createSocketForSession(session);
          } catch (err) {
            console.error('[RETRY] Erro:', err.message);
            session.status = 'failed';
          }
        }, 5000);
      } else {
        console.log('[FAILED] Esgotou tentativas');
        session.status = 'failed';
      }
    }
  });
  console.log('[SOCKET] ✓ connection.update registrado');
  
  // MENSAGENS
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') continue;
      
      console.log(\`[MESSAGE] De: \${msg.key.remoteJid}\`);
      
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
  console.log('[SOCKET] ✓ messages.upsert registrado');
  
  console.log('[SOCKET] ========================================');
  console.log('[SOCKET] ✅ Socket pronto, aguardando QR...');
  console.log('[SOCKET] ========================================');
  console.log('');
  
  return session;
}

// ============ CRIAR SESSÃO ============
async function createSession(sessionId, instanceName, webhookSecret) {
  if (!baileysLoaded) {
    throw new Error('Baileys ainda não carregado');
  }
  
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId);
    console.log(\`[SESSION] \${sessionId} já existe (status: \${existing.status})\`);
    return existing;
  }

  console.log(\`[SESSION] ========== NOVA SESSÃO: \${instanceName} ==========\`);

  const session = {
    sessionId,
    instanceName,
    socket: null,
    webhookSecret,
    qrCode: null,
    qrGeneratedAt: null,
    isConnected: false,
    wasConnected: false,
    retryCount: 0,
    createdAt: Date.now(),
    socketCreatedAt: null,
    phoneNumber: null,
    pushName: null,
    status: 'initializing'
  };

  sessions.set(sessionId, session);
  await createSocketForSession(session);
  return session;
}

// ============ ROTAS ============

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: VERSION,
    baileys: '7.0.0-rc.9',
    browser: 'Browsers.macOS("Desktop")',
    sessions: sessions.size,
    baileysLoaded,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/instance/create', async (req, res) => {
  try {
    if (!baileysLoaded) {
      return res.status(503).json({ error: 'Baileys carregando...' });
    }
    
    const { sessionId, instanceName, webhookSecret } = req.body;
    
    if (!sessionId || !instanceName) {
      return res.status(400).json({ error: 'sessionId e instanceName obrigatórios' });
    }
    
    console.log(\`[\${VERSION}] Criando: \${instanceName}\`);
    const session = await createSession(sessionId, instanceName, webhookSecret || '');
    
    res.json({
      success: true,
      version: VERSION,
      sessionId: session.sessionId,
      instanceName: session.instanceName,
      isConnected: session.isConnected,
      status: session.status
    });
  } catch (error) {
    console.error('[ERROR] Criar:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/instance/:sessionId/qr', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }
  
  res.json({
    qrCode: session.qrCode,
    isConnected: session.isConnected,
    phoneNumber: session.phoneNumber,
    pushName: session.pushName,
    status: session.status
  });
});

app.get('/api/instance/:sessionId/status', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada', status: 'not_found' });
  }
  
  res.json({
    status: session.status,
    isConnected: session.isConnected,
    phoneNumber: session.phoneNumber,
    pushName: session.pushName,
    wasConnected: session.wasConnected,
    retryCount: session.retryCount,
    hasQR: !!session.qrCode
  });
});

app.post('/api/instance/:sessionId/regenerate-qr', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }
  
  console.log(\`[REGENERATE] \${session.instanceName}\`);
  
  // Fechar socket atual
  if (session.socket) {
    try { session.socket.end(); } catch (e) {}
  }
  
  // Resetar estado
  session.socket = null;
  session.qrCode = null;
  session.qrGeneratedAt = null;
  session.retryCount = 0;
  session.status = 'initializing';
  session.wasConnected = false;
  
  // Limpar auth
  const sessionPath = path.join(SESSIONS_DIR, session.sessionId);
  try {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log('[REGENERATE] ✓ Auth limpa');
  } catch (e) {}
  
  await sleep(2000);
  
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
    list.push({
      sessionId: id,
      instanceName: session.instanceName,
      isConnected: session.isConnected,
      phoneNumber: session.phoneNumber,
      status: session.status,
      hasQR: !!session.qrCode
    });
  }
  res.json({ sessions: list });
});

app.delete('/api/instance/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }
  
  if (session.socket) {
    try { await session.socket.logout(); } catch (e) {
      try { session.socket.end(); } catch (e2) {}
    }
  }
  
  const sessionPath = path.join(SESSIONS_DIR, session.sessionId);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true });
  }
  
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

app.post('/api/message/send-text', async (req, res) => {
  try {
    const { sessionId, phone, message } = req.body;
    const session = sessions.get(sessionId);
    
    if (!session || !session.socket || !session.isConnected) {
      return res.status(400).json({ error: 'Sessão não conectada' });
    }
    
    let jid = phone.replace(/\\D/g, '');
    if (!jid.includes('@')) {
      jid = jid + '@s.whatsapp.net';
    }
    
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
  console.log(\`📦 Baileys: 7.0.0-rc.9 (ESM)\`);
  console.log(\`🖥️ Browser: Browsers.macOS("Desktop")\`);
  console.log('='.repeat(60));
  console.log('');
  loadBaileys();
});

// ============ CARREGAR BAILEYS (ESM) ==========
async function loadBaileys() {
  console.log('[BAILEYS] ========================================');
  console.log('[BAILEYS] Carregando Baileys 7.0.0-rc.9 (ESM)...');
  console.log('[BAILEYS] ========================================');
  
  try {
    // Importar módulos ESM
    const qrcodeModule = await import('qrcode');
    QRCode = qrcodeModule.default;
    console.log('[BAILEYS] ✓ qrcode');
    
    const pinoModule = await import('pino');
    pino = pinoModule.default;
    console.log('[BAILEYS] ✓ pino');
    
    console.log('[BAILEYS] Importando @whiskeysockets/baileys 7.x...');
    const baileys = await import('@whiskeysockets/baileys');
    
    // Baileys 7.x exports
    makeWASocket = baileys.default || baileys.makeWASocket;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    Browsers = baileys.Browsers;
    
    console.log('[BAILEYS] ✓ makeWASocket:', typeof makeWASocket);
    console.log('[BAILEYS] ✓ useMultiFileAuthState:', typeof useMultiFileAuthState);
    console.log('[BAILEYS] ✓ DisconnectReason:', typeof DisconnectReason);
    console.log('[BAILEYS] ✓ Browsers:', typeof Browsers);
    
    if (!makeWASocket || !useMultiFileAuthState || !Browsers) {
      console.log('[BAILEYS] Exports disponíveis:', Object.keys(baileys));
      throw new Error('Exports do Baileys 7.x não encontrados');
    }
    
    // Testar Browsers.macOS
    const browserTest = Browsers.macOS("Desktop");
    console.log('[BAILEYS] ✓ Browsers.macOS("Desktop"):', JSON.stringify(browserTest));
    
    baileysLoaded = true;
    
    console.log('');
    console.log('[BAILEYS] ========================================');
    console.log('[BAILEYS] ✅ BAILEYS 7.0.0-rc.9 PRONTO!');
    console.log('[BAILEYS] Browser: Browsers.macOS("Desktop")');
    console.log('[BAILEYS] ========================================');
    console.log('');
  } catch (err) {
    console.error('[BAILEYS] ❌ ERRO:', err.message);
    console.error('[BAILEYS] Stack:', err.stack);
  }
}

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Recebido SIGTERM');
  server.close(() => {
    console.log('[SHUTDOWN] Fechado');
    process.exit(0);
  });
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
      '.node-version': nodeVersion,
      'nixpacks.toml': nixpacksToml,
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
      a.download = 'baileys-server-v2.9.1.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Download concluído!',
        description: 'Servidor v2.9.1 com Node 20 + Baileys 7.x'
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
              Servidor Baileys v2.9.1
            </DialogTitle>
            <DialogDescription>
              Node 20 + Baileys 7.x com ESM
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-sm text-green-800 dark:text-green-200 mb-2">
                ✅ Correções v2.9.1
              </h4>
              <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                <li>🟢 <strong>Node.js 20</strong> (obrigatório)</li>
                <li>📦 <strong>Baileys 7.0.0-rc.9</strong></li>
                <li>🔧 <strong>nixpacks.toml</strong> (força Node 20)</li>
                <li>🖥️ <strong>Browsers.macOS("Desktop")</strong></li>
              </ul>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h4 className="font-medium text-sm text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Resolve Erro 405
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                O erro 405 é causado por configuração inválida. 
                Esta versão usa Baileys 7.x com configuração oficial que 
                é aceita pelo WhatsApp.
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">📦 Conteúdo do ZIP:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  nixpacks.toml (força Node 20 no Railway)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  .node-version (especifica Node 20)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  package.json (Baileys 7.0.0-rc.9 + ESM)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  index.js (imports ESM)
                </li>
              </ul>
            </div>

            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-medium text-sm text-red-800 dark:text-red-200 mb-2">
                ⚠️ IMPORTANTE
              </h4>
              <p className="text-xs text-red-700 dark:text-red-300">
                Substitua <strong>TODOS os arquivos</strong> no seu repositório GitHub.
                O Railway vai reinstalar as dependências (3-4 minutos).
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
              Baixar v2.9.1
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BaileysServerDownload;
