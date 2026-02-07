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

    // SERVIDOR JAVASCRIPT COMPLETO EM UM ÚNICO ARQUIVO
    const indexJs = `const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const VERSION = "v1.0.0";
const app = express();

app.use(cors());
app.use(express.json());

// ============ CONFIGURAÇÃO ============
const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL || '';
const SESSIONS_DIR = path.join(__dirname, 'sessions');

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// ============ VARIÁVEIS GLOBAIS ============
const sessions = new Map();
let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore;
let QRCode, pino;

// ============ WEBHOOK ============
async function sendWebhook(payload) {
  if (!WEBHOOK_URL) {
    console.log('[WEBHOOK] URL não configurada');
    return;
  }
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

// ============ CRIAR SESSÃO WHATSAPP ============
async function createSession(sessionId, instanceName, webhookSecret) {
  if (sessions.has(sessionId)) {
    console.log(\`[SESSION] \${instanceName} já existe\`);
    return sessions.get(sessionId);
  }

  const sessionPath = path.join(SESSIONS_DIR, instanceName);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  
  console.log(\`[SESSION] Criando \${instanceName} (Baileys v\${version.join('.')})\`);

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
  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      session.qrCode = await QRCode.toDataURL(qr);
      console.log(\`[QR] Gerado para \${instanceName}\`);
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
        session.pushName = user.name || null;
      }
      console.log(\`[CONNECTED] \${instanceName} - \${session.phoneNumber}\`);
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
      const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;
      console.log(\`[DISCONNECTED] \${instanceName} - Reconnect: \${shouldReconnect}\`);
      await sendWebhook({
        event: 'connection.update',
        sessionId,
        instanceName,
        data: { connection: 'close', isConnected: false, statusCode }
      });
      if (shouldReconnect) {
        sessions.delete(sessionId);
        setTimeout(() => createSession(sessionId, instanceName, webhookSecret), 5000);
      } else {
        sessions.delete(sessionId);
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

// ============ ROTAS ============

// Health check
app.get('/api/health', (req, res) => {
  console.log(\`[\${VERSION}] Health check\`);
  res.json({ status: 'ok', version: VERSION, sessions: sessions.size, timestamp: new Date().toISOString() });
});

// Criar instância
app.post('/api/instance/create', async (req, res) => {
  try {
    const { sessionId, instanceName, webhookSecret } = req.body;
    if (!sessionId || !instanceName) {
      return res.status(400).json({ error: 'sessionId e instanceName são obrigatórios' });
    }
    console.log(\`[\${VERSION}] Criando instância: \${instanceName}\`);
    const session = await createSession(sessionId, instanceName, webhookSecret || '');
    res.json({ success: true, version: VERSION, sessionId: session.sessionId, instanceName: session.instanceName, isConnected: session.isConnected });
  } catch (error) {
    console.error('[ERROR] Criar instância:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obter QR Code
app.get('/api/instance/:sessionId/qr', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
  res.json({ qrCode: session.qrCode, isConnected: session.isConnected, phoneNumber: session.phoneNumber, pushName: session.pushName });
});

// Obter status
app.get('/api/instance/:sessionId/status', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada', status: 'not_found' });
  res.json({
    status: session.isConnected ? 'connected' : (session.qrCode ? 'waiting_qr' : 'connecting'),
    isConnected: session.isConnected,
    phoneNumber: session.phoneNumber,
    pushName: session.pushName
  });
});

// Listar sessões
app.get('/api/instance/list', (req, res) => {
  const list = [];
  for (const [id, session] of sessions) {
    list.push({ sessionId: id, instanceName: session.instanceName, isConnected: session.isConnected, phoneNumber: session.phoneNumber });
  }
  res.json({ sessions: list });
});

// Deletar sessão
app.delete('/api/instance/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
  try {
    if (session.socket) await session.socket.logout();
  } catch (e) {
    console.log('[LOGOUT] Erro:', e.message);
  }
  const sessionPath = path.join(SESSIONS_DIR, session.instanceName);
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
async function startServer() {
  console.log('[INIT] Carregando módulos...');
  
  // Import dinâmico do Baileys (ESM)
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
    console.log(\`🚀 [\${VERSION}] Baileys Server rodando na porta \${PORT}\`);
    console.log(\`📡 Webhook URL: \${WEBHOOK_URL || 'Não configurada'}\`);
  });
}

startServer().catch(err => {
  console.error('[FATAL] Erro ao iniciar:', err);
  process.exit(1);
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
