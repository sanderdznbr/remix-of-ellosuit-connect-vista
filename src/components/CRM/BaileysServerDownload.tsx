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
  "version": "1.0.0",
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

    const readme = `# 🚀 Baileys Server para WhatsApp CRM

## Deploy no Railway (SUPER SIMPLES!)

### 1. Suba para o GitHub
- Crie um repositório no GitHub
- Faça upload destes arquivos

### 2. No Railway
1. New Project → Deploy from GitHub
2. Selecione seu repositório
3. Em **Variables**, adicione:
   \`SUPABASE_WEBHOOK_URL\` = \`${webhookUrl}\`

### 3. Pronto!
O servidor vai iniciar automaticamente. Teste:
\`https://SEU-DOMINIO.railway.app/api/health\`

## Estrutura
\`\`\`
baileys-server/
├── index.js       ← Servidor completo (único arquivo!)
├── package.json
├── .gitignore
└── README.md
\`\`\`
`;

    // SERVIDOR JAVASCRIPT COMPLETO - v2.4.0 com configuração robusta
    const indexJs = `const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(50));
console.log('[INIT] Baileys Server iniciando...');
console.log('[INIT] Node version:', process.version);
console.log('[INIT] PORT:', process.env.PORT || 3333);
console.log('='.repeat(50));

const VERSION = "v2.4.0";
const app = express();

app.use(cors());
app.use(express.json());

// ============ CONFIGURAÇÃO ============
const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL || '';
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
const MAX_QR_RETRIES = 5; // Aumentado para 5 tentativas
const RETRY_DELAYS = [3000, 5000, 8000, 12000, 15000]; // Delays progressivos

console.log('[CONFIG] Webhook URL:', WEBHOOK_URL ? 'Configurada' : 'NÃO configurada');
console.log('[CONFIG] Sessions dir:', SESSIONS_DIR);

try {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    console.log('[CONFIG] Pasta sessions criada');
  }
} catch (err) {
  console.error('[CONFIG] Erro ao criar pasta sessions:', err.message);
}

// ============ VARIÁVEIS GLOBAIS ============
const sessions = new Map();
let makeWASocket = null;
let useMultiFileAuthState = null;
let DisconnectReason = null;
let makeCacheableSignalKeyStore = null;
let fetchLatestBaileysVersion = null;
let Browsers = null;
let delay = null;
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

// ============ CRIAR SOCKET PARA SESSÃO ============
async function createSocketForSession(session) {
  const { sessionId, instanceName, webhookSecret } = session;
  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  
  // Limpar pasta de auth se existir e estamos recriando após falha
  if (session.qrRetryCount > 0) {
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log(\`[SOCKET] Limpou auth antiga para \${instanceName}\`);
    } catch (e) {}
    
    // Aguardar antes de recriar (delay progressivo)
    const delayMs = RETRY_DELAYS[Math.min(session.qrRetryCount - 1, RETRY_DELAYS.length - 1)];
    console.log(\`[SOCKET] Aguardando \${delayMs/1000}s antes de recriar socket...\`);
    await sleep(delayMs);
  }
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  
  console.log(\`[SOCKET] Criando socket para \${instanceName} (Baileys v\${version.join('.')}) - tentativa \${session.qrRetryCount + 1}/\${MAX_QR_RETRIES}\`);

  const logger = pino({ level: 'silent' });
  
  // v2.4.0: Configuração mais robusta do socket
  const socketConfig = {
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    // Browser string que funciona melhor
    browser: ['Ubuntu', 'Chrome', '120.0.6099.119'],
    // Timeouts aumentados
    connectTimeoutMs: 120000,
    defaultQueryTimeoutMs: 60000,
    qrTimeout: 60000,
    // Opções para evitar sobrecarga
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    // Retry interno desabilitado (controlamos manualmente)
    retryRequestDelayMs: 2000,
    maxMsgRetryCount: 1
  };
  
  console.log('[SOCKET] Config:', JSON.stringify({
    browser: socketConfig.browser,
    connectTimeoutMs: socketConfig.connectTimeoutMs,
    syncFullHistory: socketConfig.syncFullHistory
  }));

  const socket = makeWASocket(socketConfig);

  session.socket = socket;
  session.socketCreatedAt = Date.now();
  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      session.qrCode = await QRCode.toDataURL(qr);
      session.qrGeneratedAt = Date.now();
      session.status = 'waiting_qr';
      console.log(\`[QR] ✅ Gerado para \${instanceName} (após \${session.qrRetryCount} retries)\`);
      await sendWebhook({
        event: 'qr.update',
        sessionId,
        instanceName,
        data: { qrCode: session.qrCode }
      });
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
      console.log(\`[CONNECTED] ✅ \${instanceName} - \${session.phoneNumber}\`);
      await sendWebhook({
        event: 'connection.update',
        sessionId,
        instanceName,
        data: { connection: 'open', isConnected: true, phoneNumber: session.phoneNumber, pushName: session.pushName }
      });
    }

    if (connection === 'close') {
      session.isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const hadQR = !!session.qrCode || !!session.qrGeneratedAt;
      const socketAge = Date.now() - (session.socketCreatedAt || session.createdAt);
      
      console.log(\`[DISCONNECTED] \${instanceName} - Code: \${statusCode}, wasConnected: \${session.wasConnected}, hadQR: \${hadQR}, qrRetryCount: \${session.qrRetryCount}, socketAge: \${socketAge}ms\`);
      
      await sendWebhook({
        event: 'connection.update',
        sessionId,
        instanceName,
        data: { connection: 'close', isConnected: false, statusCode }
      });
      
      // Lógica de reconexão melhorada v2.4.0
      if (statusCode === DisconnectReason?.loggedOut) {
        // Logout explícito - remover sessão
        console.log(\`[LOGOUT] \${instanceName} fez logout, removendo sessão\`);
        session.status = 'logged_out';
        sessions.delete(sessionId);
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        } catch (e) {}
      } else if (session.wasConnected && session.retryCount < 5) {
        // Já tinha conectado antes - reconectar normalmente
        session.retryCount++;
        session.status = 'reconnecting';
        console.log(\`[RECONNECT] Reconectando \${instanceName} em 3s... (tentativa \${session.retryCount}/5)\`);
        setTimeout(async () => {
          try {
            await createSocketForSession(session);
          } catch (err) {
            console.error(\`[RECONNECT] Erro:\`, err.message);
          }
        }, 3000);
      } else if (!session.wasConnected && !hadQR && session.qrRetryCount < MAX_QR_RETRIES) {
        // v2.4.0: Nunca conectou E não gerou QR - TENTAR NOVAMENTE com delay maior
        session.qrRetryCount++;
        session.status = 'retrying';
        console.log(\`[QR-RETRY] \${instanceName} desconectou sem QR, tentativa \${session.qrRetryCount}/\${MAX_QR_RETRIES}\`);
        
        // Criar socket de forma assíncrona (não bloquear)
        setImmediate(async () => {
          try {
            await createSocketForSession(session);
          } catch (err) {
            console.error(\`[QR-RETRY] Erro:\`, err.message);
            session.status = 'failed';
          }
        });
      } else if (!session.wasConnected && hadQR) {
        // Tinha QR mas não escaneou - manter sessão esperando
        session.status = 'waiting_scan';
        console.log(\`[WAITING] \${instanceName} tem QR, aguardando escaneamento\`);
      } else {
        // Esgotou tentativas
        console.log(\`[FAILED] \${instanceName} esgotou tentativas de gerar QR (\${session.qrRetryCount} tentativas)\`);
        session.status = 'failed';
      }
    }
  });

  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') continue;
      console.log(\`[MESSAGE] De \${msg.key.remoteJid}\`);
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

  socket.ev.on('messages.update', async (updates) => {
    await sendWebhook({ event: 'messages.update', sessionId, instanceName, data: { updates } });
  });

  return session;
}

// ============ CRIAR SESSÃO WHATSAPP ============
async function createSession(sessionId, instanceName, webhookSecret) {
  if (!baileysLoaded) {
    throw new Error('Baileys ainda não carregado, aguarde alguns segundos');
  }
  
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId);
    // Se já existe mas não tem QR e não está conectado, recriar socket
    if (!existing.qrCode && !existing.isConnected && existing.status !== 'retrying') {
      console.log(\`[SESSION] \${sessionId} existe sem QR, recriando socket...\`);
      existing.qrRetryCount = 0; // Reset counter
      return await createSocketForSession(existing);
    }
    console.log(\`[SESSION] \${sessionId} já existe (status: \${existing.status})\`);
    return existing;
  }

  console.log(\`[SESSION] Criando nova sessão \${instanceName}\`);

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
    qrRetryCount: 0,
    createdAt: Date.now(),
    socketCreatedAt: null,
    phoneNumber: null,
    pushName: null,
    status: 'connecting'
  };

  sessions.set(sessionId, session);
  
  await createSocketForSession(session);

  return session;
}

// ============ ROTAS ============

// Health check
app.get('/api/health', (req, res) => {
  console.log(\`[\${VERSION}] Health check\`);
  res.json({ 
    status: 'ok', 
    version: VERSION, 
    sessions: sessions.size, 
    baileysLoaded,
    timestamp: new Date().toISOString() 
  });
});

// Criar instância
app.post('/api/instance/create', async (req, res) => {
  try {
    if (!baileysLoaded) {
      return res.status(503).json({ error: 'Baileys ainda carregando, aguarde alguns segundos...' });
    }
    const { sessionId, instanceName, webhookSecret } = req.body;
    if (!sessionId || !instanceName) {
      return res.status(400).json({ error: 'sessionId e instanceName são obrigatórios' });
    }
    console.log(\`[\${VERSION}] Criando instância: \${instanceName}\`);
    const session = await createSession(sessionId, instanceName, webhookSecret || '');
    res.json({ 
      success: true, 
      version: VERSION, 
      sessionId: session.sessionId, 
      instanceName: session.instanceName, 
      isConnected: session.isConnected, 
      qrRetryCount: session.qrRetryCount,
      status: session.status
    });
  } catch (error) {
    console.error('[ERROR] Criar instância:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obter QR Code
app.get('/api/instance/:sessionId/qr', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
  res.json({ 
    qrCode: session.qrCode, 
    isConnected: session.isConnected, 
    phoneNumber: session.phoneNumber, 
    pushName: session.pushName,
    qrRetryCount: session.qrRetryCount,
    status: session.status
  });
});

// Obter status
app.get('/api/instance/:sessionId/status', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada', status: 'not_found' });
  res.json({
    status: session.status,
    isConnected: session.isConnected,
    phoneNumber: session.phoneNumber,
    pushName: session.pushName,
    wasConnected: session.wasConnected,
    retryCount: session.retryCount,
    qrRetryCount: session.qrRetryCount,
    sessionAge: Date.now() - session.createdAt,
    hasQR: !!session.qrCode
  });
});

// Forçar regeneração de QR (v2.4.0 - mais robusto)
app.post('/api/instance/:sessionId/regenerate-qr', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
  
  console.log(\`[REGENERATE] Forçando regeneração de QR para \${session.instanceName}\`);
  
  // Fechar socket existente se houver
  if (session.socket) {
    try {
      session.socket.end();
    } catch (e) {}
  }
  
  // Reset completo
  session.socket = null;
  session.qrCode = null;
  session.qrGeneratedAt = null;
  session.qrRetryCount = 0;
  session.retryCount = 0;
  session.status = 'connecting';
  session.wasConnected = false;
  
  // Limpar pasta de auth
  const sessionPath = path.join(SESSIONS_DIR, session.sessionId);
  try {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log(\`[REGENERATE] Auth limpa para \${session.instanceName}\`);
  } catch (e) {}
  
  // Aguardar um pouco antes de recriar
  await sleep(2000);
  
  try {
    await createSocketForSession(session);
    res.json({ success: true, message: 'Regenerando QR Code...', status: session.status });
  } catch (error) {
    console.error('[REGENERATE] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar sessões
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

// Deletar sessão
app.delete('/api/instance/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
  try {
    if (session.socket) {
      try {
        await session.socket.logout();
      } catch (e) {
        try {
          session.socket.end();
        } catch (e2) {}
      }
    }
  } catch (e) {
    console.log('[LOGOUT] Erro:', e.message);
  }
  const sessionPath = path.join(SESSIONS_DIR, session.sessionId);
  if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true });
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

// Enviar mensagem de texto
app.post('/api/message/send-text', async (req, res) => {
  try {
    const { sessionId, phone, message } = req.body;
    const session = sessions.get(sessionId);
    if (!session || !session.socket || !session.isConnected) {
      return res.status(400).json({ error: 'Sessão não conectada' });
    }
    let jid = phone.replace(/\\D/g, '');
    if (!jid.includes('@')) jid = jid + '@s.whatsapp.net';
    await session.socket.sendMessage(jid, { text: message });
    res.json({ success: true, to: jid });
  } catch (error) {
    console.error('[ERROR] Enviar mensagem:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ INICIAR SERVIDOR ============
const PORT = process.env.PORT || 3333;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(\`🚀 [\${VERSION}] Servidor HTTP rodando na porta \${PORT}\`);
  console.log(\`📡 Webhook URL: \${WEBHOOK_URL || 'Não configurada'}\`);
  console.log('='.repeat(50));
  
  loadBaileys();
});

async function loadBaileys() {
  console.log('[BAILEYS] Carregando módulos...');
  try {
    QRCode = require('qrcode');
    console.log('[BAILEYS] qrcode carregado ✓');
    
    pino = require('pino');
    console.log('[BAILEYS] pino carregado ✓');
    
    const baileys = await import('@whiskeysockets/baileys');
    console.log('[BAILEYS] Módulo importado, extraindo funções...');
    
    if (typeof baileys.default === 'function') {
      makeWASocket = baileys.default;
    } else if (baileys.default && typeof baileys.default.default === 'function') {
      makeWASocket = baileys.default.default;
    } else if (typeof baileys.makeWASocket === 'function') {
      makeWASocket = baileys.makeWASocket;
    } else {
      console.log('[BAILEYS] Estrutura do módulo:', Object.keys(baileys));
      console.log('[BAILEYS] Estrutura de baileys.default:', baileys.default ? Object.keys(baileys.default) : 'undefined');
      throw new Error('Não foi possível encontrar makeWASocket no módulo');
    }
    
    useMultiFileAuthState = baileys.useMultiFileAuthState || baileys.default?.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason || baileys.default?.DisconnectReason;
    makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore || baileys.default?.makeCacheableSignalKeyStore;
    fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion || baileys.default?.fetchLatestBaileysVersion;
    Browsers = baileys.Browsers || baileys.default?.Browsers;
    delay = baileys.delay || baileys.default?.delay;
    
    if (!useMultiFileAuthState || !makeCacheableSignalKeyStore || !fetchLatestBaileysVersion) {
      throw new Error('Funções auxiliares do Baileys não encontradas');
    }
    
    baileysLoaded = true;
    console.log('[BAILEYS] @whiskeysockets/baileys carregado ✓');
    console.log('[BAILEYS] makeWASocket:', typeof makeWASocket);
    console.log('[BAILEYS] Browsers:', typeof Browsers);
    console.log('[BAILEYS] Pronto para criar sessões!');
  } catch (err) {
    console.error('[BAILEYS] ERRO ao carregar:', err.message);
    console.error('[BAILEYS] Stack:', err.stack);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Recebido SIGTERM, fechando...');
  server.close(() => {
    console.log('[SHUTDOWN] Servidor fechado');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
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
      
      // Criar pasta sessions vazia
      zip.folder('sessions');
      
      const blob = await zip.generateAsync({ type: 'blob' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'baileys-server-js.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Download concluído!',
        description: 'Extraia o ZIP e suba para o GitHub'
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
              Servidor Baileys (JavaScript)
            </DialogTitle>
            <DialogDescription>
              Download do servidor pronto para Railway - SEM BUILD necessário!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-sm text-green-800 dark:text-green-200 mb-2">
                ✨ Versão Simplificada
              </h4>
              <p className="text-xs text-green-700 dark:text-green-300">
                Apenas <strong>2 arquivos</strong> essenciais. Sem TypeScript, sem build, sem complicação!
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">📦 Conteúdo do ZIP:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  package.json (dependências)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  index.js (servidor completo!)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  README.md (instruções)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  .gitignore
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
              <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-2">
                🚀 Após o download:
              </h4>
              <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Extraia o ZIP</li>
                <li>Suba para GitHub (novo repo)</li>
                <li>Railway → New Project → Deploy from GitHub</li>
                <li>Adicione variável: SUPABASE_WEBHOOK_URL</li>
                <li>Deploy automático! ✅</li>
              </ol>
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
              Baixar ZIP
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BaileysServerDownload;
