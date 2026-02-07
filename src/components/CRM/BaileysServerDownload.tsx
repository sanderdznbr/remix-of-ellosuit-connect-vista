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
    const packageJson = `{
  "name": "baileys-server",
  "version": "1.0.0",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node src/server.ts"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.9",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.2",
    "pino": "^9.6.0",
    "qrcode": "^1.5.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.19",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=18"
  }
}`;

    const tsconfig = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`;

    const gitignore = `node_modules/
dist/
sessions/
.env
*.log`;

    const envExample = `# Configurado automaticamente pelo Railway
# PORT=3333

# URL do webhook do Supabase (obrigatório)
SUPABASE_WEBHOOK_URL=${webhookUrl}`;

    const serverTs = `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createSession, getSession, deleteSession, sessions } from './whatsapp';
import { sendTextMessage } from './routes/message';

dotenv.config();

const VERSION = "v1.0.0";
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  console.log(\`[\${VERSION}] Health check requested\`);
  res.json({ 
    status: 'ok', 
    version: VERSION,
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

    console.log(\`[\${VERSION}] Creating instance: \${instanceName}\`);
    const session = await createSession(sessionId, instanceName, webhookSecret || '');
    
    res.json({
      success: true,
      version: VERSION,
      sessionId: session.sessionId,
      instanceName: session.instanceName,
      isConnected: session.isConnected
    });
  } catch (error: any) {
    console.error('Create instance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get QR Code
app.get('/api/instance/:sessionId/qr', (req, res) => {
  const session = getSession(req.params.sessionId);
  
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
  const session = getSession(req.params.sessionId);
  
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

// List sessions
app.get('/api/instance/list', (req, res) => {
  const list: any[] = [];
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
  const success = await deleteSession(req.params.sessionId);
  if (!success) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ success: true });
});

// Send text message
app.post('/api/message/send-text', async (req, res) => {
  try {
    const { sessionId, phone, message } = req.body;
    const result = await sendTextMessage(sessionId, phone, message);
    res.json(result);
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(\`🚀 [\${VERSION}] Baileys Server running on port \${PORT}\`);
  console.log(\`📡 Webhook URL: \${process.env.SUPABASE_WEBHOOK_URL || 'Not configured'}\`);
});`;

    const typesTs = `import { WASocket } from '@whiskeysockets/baileys';

export interface Session {
  sessionId: string;
  instanceName: string;
  socket: WASocket | null;
  webhookSecret: string;
  qrCode: string | null;
  isConnected: boolean;
  phoneNumber: string | null;
  pushName: string | null;
}

export interface WebhookPayload {
  event: string;
  sessionId: string;
  instanceName: string;
  data: any;
}`;

    const whatsappTs = `import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { Session, WebhookPayload } from './types';

const logger = pino({ level: 'silent' });
const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL || '';
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

// Store active sessions
export const sessions: Map<string, Session> = new Map();

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Send webhook to Supabase
async function sendWebhook(payload: WebhookPayload) {
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
  } catch (error: any) {
    console.error('❌ Webhook error:', error.message);
  }
}

// Create WhatsApp session
export async function createSession(
  sessionId: string, 
  instanceName: string, 
  webhookSecret: string
): Promise<Session> {
  if (sessions.has(sessionId)) {
    console.log(\`Session \${instanceName} already exists\`);
    return sessions.get(sessionId)!;
  }

  const sessionPath = path.join(SESSIONS_DIR, instanceName);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  
  console.log(\`📱 Creating session: \${instanceName} (Baileys v\${version.join('.')})\`);

  const session: Session = {
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
        session.pushName = user.name || null;
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
          pushName: session.pushName
        }
      });
    }

    if (connection === 'close') {
      session.isConnected = false;
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(\`❌ \${instanceName} disconnected. Reconnect: \${shouldReconnect}\`);
      
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

  // Incoming messages
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') continue;
      
      console.log(\`📨 Message from \${msg.key.remoteJid}\`);
      
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

// Get session
export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

// Delete session
export async function deleteSession(sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  try {
    if (session.socket) {
      await session.socket.logout();
    }
  } catch (e) {
    console.log('Logout error:', e);
  }
  
  // Delete session files
  const sessionPath = path.join(SESSIONS_DIR, session.instanceName);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true });
  }
  
  sessions.delete(sessionId);
  return true;
}`;

    const messageTs = `import { getSession } from '../whatsapp';

export async function sendTextMessage(
  sessionId: string, 
  phone: string, 
  message: string
): Promise<{ success: boolean; to: string }> {
  const session = getSession(sessionId);
  
  if (!session || !session.socket || !session.isConnected) {
    throw new Error('Session not connected');
  }

  // Format phone number
  let jid = phone.replace(/\\D/g, '');
  if (!jid.includes('@')) {
    jid = jid + '@s.whatsapp.net';
  }

  await session.socket.sendMessage(jid, { text: message });
  
  return { success: true, to: jid };
}`;

    const readme = `# 🚀 Baileys Server para WhatsApp CRM

## Deploy no Railway

### 1. Suba para o GitHub
\`\`\`bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU_USUARIO/baileys-server.git
git push -u origin main
\`\`\`

### 2. No Railway
1. Crie novo projeto → Deploy from GitHub
2. Selecione o repositório
3. Em **Variables**, adicione:
   - \`SUPABASE_WEBHOOK_URL\` = \`${webhookUrl}\`

### 3. Aguarde o deploy
O servidor deve mostrar nos logs:
\`\`\`
🚀 [v1.0.0] Baileys Server running on port XXXX
📡 Webhook URL: ${webhookUrl}
\`\`\`

### 4. Teste
Acesse: \`https://SEU-DOMINIO.railway.app/api/health\`

## Estrutura
\`\`\`
baileys-server/
├── src/
│   ├── routes/
│   │   └── message.ts
│   ├── server.ts
│   ├── types.ts
│   └── whatsapp.ts
├── package.json
├── tsconfig.json
├── .gitignore
└── .env.example
\`\`\`
`;

    return {
      'package.json': packageJson,
      'tsconfig.json': tsconfig,
      '.gitignore': gitignore,
      '.env.example': envExample,
      'README.md': readme,
      'src/server.ts': serverTs,
      'src/types.ts': typesTs,
      'src/whatsapp.ts': whatsappTs,
      'src/routes/message.ts': messageTs
    };
  };

  const downloadZip = async () => {
    setDownloading(true);
    
    try {
      const zip = new JSZip();
      const files = generateServerFiles();
      
      // Add files to zip
      for (const [filePath, content] of Object.entries(files)) {
        zip.file(filePath, content);
      }
      
      // Create empty sessions folder
      zip.folder('sessions');
      
      // Generate zip
      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'baileys-server.zip';
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
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <Server className="h-4 w-4 mr-2" />
        Baixar Servidor Baileys
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-green-600" />
              Servidor Baileys Pronto
            </DialogTitle>
            <DialogDescription>
              Download do servidor completo para deploy no Railway
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">📦 Conteúdo do ZIP:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  package.json (dependências configuradas)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  tsconfig.json (TypeScript configurado)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  src/server.ts (servidor Express)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  src/whatsapp.ts (integração Baileys)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  README.md (instruções de deploy)
                </li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
              <h4 className="font-medium text-sm text-green-800 dark:text-green-200 mb-2">
                🚀 Após o download:
              </h4>
              <ol className="text-xs text-green-700 dark:text-green-300 space-y-1 list-decimal list-inside">
                <li>Extraia o ZIP</li>
                <li>Suba para um repositório GitHub</li>
                <li>Crie projeto no Railway com esse repo</li>
                <li>Adicione a variável SUPABASE_WEBHOOK_URL</li>
                <li>Deploy automático!</li>
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
              className="flex-1 bg-green-600 hover:bg-green-700"
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
