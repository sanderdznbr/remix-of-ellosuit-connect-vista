import React, { useState } from 'react';
import { Download, Server, CheckCircle2, Loader2, AlertTriangle, Users, Zap } from 'lucide-react';
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
  
  const isOpen = isOpenExternal !== undefined ? isOpenExternal : isOpenInternal;
  const setIsOpen = (open: boolean) => {
    if (isOpenExternal !== undefined && onClose && !open) {
      onClose();
    } else {
      setIsOpenInternal(open);
    }
  };

  const generateServerFiles = () => {
    // ========== PACKAGE.JSON v4.2.0 - SEM @supabase/supabase-js ==========
    const packageJson = `{
  "name": "baileys-server",
  "version": "4.2.0",
  "description": "Servidor Baileys estável - QR Code, mensagens e metadados (sem SDK Supabase)",
  "main": "index.js",
  "type": "commonjs",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.17",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "pino": "^9.6.0",
    "qrcode": "^1.5.4"
  },
  "engines": {
    "node": ">=18"
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

    const readme = `# 🚀 Baileys Server v4.2.0 - Estável

## ✨ Correções v4.2.0

- ✅ **Removida dependência @supabase/supabase-js** - usa fetch nativo
- ✅ QR Code gerado corretamente
- ✅ Metadados de grupos (foto, descrição, participantes)
- ✅ Status/bio de contatos individuais
- ✅ Sincronização de contatos via contacts.set
- ✅ Reconexão automática com backoff exponencial

## Deploy no Railway

1. New Project → Deploy from GitHub
2. Em **Variables**, adicione:
   \`SUPABASE_WEBHOOK_URL\` = \`${webhookUrl}\`
   \`SUPABASE_URL\` = \`https://jwddiyuezqrpuakazvgg.supabase.co\`
   \`SUPABASE_SERVICE_ROLE_KEY\` = \`sua_service_role_key\`

**NÃO** defina PORT - Railway define automaticamente!

## Dependências

- @whiskeysockets/baileys: ^6.7.17
- express: ^4.21.2
- cors: ^2.8.5
- pino: ^9.6.0
- qrcode: ^1.5.4

**NÃO** inclui @supabase/supabase-js - todas as chamadas são via fetch.
`;

    // ========== SERVIDOR v4.2.0 - SEM SDK SUPABASE ==========
    const indexJs = `/**
 * Baileys Server v4.2.0 - Estável e Simplificado
 * 
 * CORREÇÕES v4.2.0:
 * - Removida dependência do @supabase/supabase-js (usa fetch puro)
 * - QR Code gerado corretamente
 * - Metadados de grupos e contatos
 * - Reconexão automática com backoff
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

// Configuração
const PORT = process.env.PORT || 3333;
const SUPABASE_WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const logger = pino({ level: 'silent' });

// Express app
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Armazena sessões ativas
const sessions = new Map();

// Controle de concorrência para downloads
const downloadSemaphore = {
  current: 0,
  max: 2,
  queue: []
};

async function acquireDownload() {
  if (downloadSemaphore.current < downloadSemaphore.max) {
    downloadSemaphore.current++;
    return true;
  }
  return new Promise(resolve => {
    downloadSemaphore.queue.push(resolve);
  });
}

function releaseDownload() {
  downloadSemaphore.current--;
  if (downloadSemaphore.queue.length > 0) {
    const next = downloadSemaphore.queue.shift();
    downloadSemaphore.current++;
    next(true);
  }
}

// Função para buscar metadados de contato/grupo
async function fetchContactMetadata(socket, jid) {
  const metadata = {
    profilePicture: null,
    status: null,
    groupDescription: null,
    groupParticipants: null
  };

  const isGroup = jid.endsWith('@g.us');

  try {
    // Foto de perfil (pessoa/grupo) — tenta preview primeiro e cai para image
    try {
      const preview = await socket.profilePictureUrl(jid, 'preview').catch(() => null);
      const full = preview ? null : await socket.profilePictureUrl(jid, 'image').catch(() => null);
      metadata.profilePicture = preview || full;

      if (!metadata.profilePicture) {
        // Log leve para debug (sem quebrar sync)
        console.log('Sem foto de perfil para ' + jid);
      }
    } catch (e) {
      console.log('Erro ao buscar foto de perfil ' + jid + ':', (e && e.message) ? e.message : e);
    }


    if (isGroup) {
      try {
        const groupMeta = await socket.groupMetadata(jid);
        metadata.groupDescription = groupMeta.desc || null;
        metadata.groupParticipants = groupMeta.participants?.map(p => ({
          jid: p.id,
          isAdmin: p.admin === 'admin' || p.admin === 'superadmin',
          isSuperAdmin: p.admin === 'superadmin'
        })) || [];
      } catch (e) {
        console.log(\`Erro metadados grupo \${jid}:\`, e.message);
      }
    } else {
      try {
        const statusResult = await socket.fetchStatus(jid);
        if (statusResult?.status) {
          metadata.status = statusResult.status;
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error(\`Erro metadados \${jid}:\`, e.message);
  }

  return metadata;
}

// Enviar webhook via fetch puro
async function sendWebhook(payload, webhookUrl, webhookSecret) {
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': webhookSecret || ''
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error('Webhook error:', response.status);
    }
  } catch (error) {
    console.error('Webhook fetch error:', error.message);
  }
}

// Criar sessão WhatsApp
async function createSession(config) {
  const { sessionId, instanceName, webhookUrl, webhookSecret } = config;
  
  if (sessions.has(sessionId)) {
    console.log(\`Sessão \${instanceName} já existe\`);
    return sessions.get(sessionId);
  }

  const sessionPath = path.join(__dirname, 'sessions', instanceName);
  
  if (!fs.existsSync(path.join(__dirname, 'sessions'))) {
    fs.mkdirSync(path.join(__dirname, 'sessions'), { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  
  console.log(\`📱 Criando sessão: \${instanceName} (Baileys v\${version.join('.')})\`);

  const session = {
    sessionId,
    instanceName,
    socket: null,
    webhookUrl,
    webhookSecret,
    qrCode: null,
    isConnected: false,
    phoneNumber: null,
    pushName: null,
    profilePicture: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10
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
    browser: ['Lovable CRM', 'Chrome', '120.0.0'],
    connectTimeoutMs: 60000,
    qrTimeout: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 20000
  });

  session.socket = socket;

  // Salvar credenciais
  socket.ev.on('creds.update', saveCreds);

  // Atualizações de conexão
  socket.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr);
        session.qrCode = qrDataUrl;
        
        await sendWebhook({
          event: 'qr.update',
          sessionId,
          instanceName,
          data: { qrCode: qrDataUrl }
        }, webhookUrl, webhookSecret);
        
        console.log(\`📱 QR Code gerado para \${instanceName}\`);
      } catch (qrError) {
        console.error('Erro ao gerar QR Code:', qrError.message);
      }
    }

    if (connection === 'open') {
      session.isConnected = true;
      session.qrCode = null;
      session.reconnectAttempts = 0;
      
      const user = socket.user;
      if (user) {
        session.phoneNumber = user.id.split(':')[0].replace('@s.whatsapp.net', '');
        session.pushName = user.name || user.notify || null;
        
        try {
          session.profilePicture = await socket.profilePictureUrl(user.id, 'image');
        } catch (e) {}
      }
      
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
      }, webhookUrl, webhookSecret);
      
      console.log(\`✅ \${instanceName} conectado!\`);
    }

    if (connection === 'close') {
      session.isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(\`❌ \${instanceName} desconectado. Código: \${statusCode}\`);
      
      await sendWebhook({
        event: 'connection.update',
        sessionId,
        instanceName,
        data: {
          connection: 'close',
          isConnected: false,
          statusCode,
          shouldReconnect
        }
      }, webhookUrl, webhookSecret);

      if (shouldReconnect && session.reconnectAttempts < session.maxReconnectAttempts) {
        session.reconnectAttempts++;
        const delay = Math.min(5000 * Math.pow(1.5, session.reconnectAttempts - 1), 60000);
        console.log(\`🔄 Reconectando em \${delay/1000}s\`);
        
        setTimeout(() => {
          sessions.delete(sessionId);
          createSession(config);
        }, delay);
      } else if (statusCode === DisconnectReason.loggedOut) {
        sessions.delete(sessionId);
      }
    }
  });

  // Mensagens recebidas
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') continue;
      
      const jid = msg.key.remoteJid;
      console.log(\`📨 Mensagem de \${jid}\`);
      
      // Buscar metadados
      const metadata = await fetchContactMetadata(socket, jid);
      
      // Detectar mídia
      let mediaUrl = null;
      let mediaType = null;
      const msgContent = msg.message;
      
      if (msgContent) {
        if (msgContent.imageMessage) mediaType = 'image';
        else if (msgContent.videoMessage) mediaType = 'video';
        else if (msgContent.audioMessage) mediaType = 'audio';
        else if (msgContent.documentMessage) mediaType = 'document';
        else if (msgContent.stickerMessage) mediaType = 'sticker';
      }

      // Download de mídia
      if (mediaType && !msg.key.fromMe && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          await acquireDownload();
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          
          if (buffer) {
            const ext = mediaType === 'audio' ? 'ogg' : mediaType === 'video' ? 'mp4' : 'jpg';
            const fileName = \`\${sessionId}/\${Date.now()}_\${msg.key.id}.\${ext}\`;
            
            const uploadResponse = await fetch(
              \`\${SUPABASE_URL}/storage/v1/object/whatsapp-media/\${fileName}\`,
              {
                method: 'POST',
                headers: {
                  'Authorization': \`Bearer \${SUPABASE_SERVICE_ROLE_KEY}\`,
                  'Content-Type': 'application/octet-stream'
                },
                body: buffer
              }
            );

            if (uploadResponse.ok) {
              mediaUrl = \`\${SUPABASE_URL}/storage/v1/object/public/whatsapp-media/\${fileName}\`;
            }
          }
        } catch (e) {
          console.error('Erro download mídia:', e.message);
        } finally {
          releaseDownload();
        }
      }

      // Enviar webhook
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
            mediaUrl,
            mediaType,
            contactMetadata: metadata
          }]
        }
      }, webhookUrl, webhookSecret);
    }
  });

  // Atualização de status
  socket.ev.on('messages.update', async (updates) => {
    await sendWebhook({
      event: 'messages.update',
      sessionId,
      instanceName,
      data: { updates }
    }, webhookUrl, webhookSecret);
  });

  // Contatos
  socket.ev.on('contacts.set', async ({ contacts }) => {
    console.log(\`📇 \${contacts.length} contatos recebidos\`);
    await sendWebhook({
      event: 'contacts.set',
      sessionId,
      instanceName,
      data: { contacts }
    }, webhookUrl, webhookSecret);
  });

  socket.ev.on('contacts.upsert', async (contacts) => {
    await sendWebhook({
      event: 'contacts.upsert',
      sessionId,
      instanceName,
      data: { contacts }
    }, webhookUrl, webhookSecret);
  });

  return session;
}

// ============ ROTAS ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '4.2.0',
    sessions: sessions.size,
    timestamp: new Date().toISOString()
  });
});

// Criar instância
app.post('/api/instance/create', async (req, res) => {
  try {
    const { sessionId, instanceName, webhookUrl, webhookSecret } = req.body;
    
    if (!sessionId || !instanceName) {
      return res.status(400).json({ error: 'sessionId e instanceName são obrigatórios' });
    }
    
    const session = await createSession({
      sessionId,
      instanceName,
      webhookUrl: webhookUrl || SUPABASE_WEBHOOK_URL,
      webhookSecret: webhookSecret || ''
    });
    
    res.json({
      success: true,
      sessionId: session?.sessionId,
      instanceName: session?.instanceName,
      qrCode: session?.qrCode
    });
  } catch (error) {
    console.error('Erro criar instância:', error);
    res.status(500).json({ error: 'Falha ao criar instância' });
  }
});

// Obter QR Code
app.get('/api/instance/:instanceName/qr', (req, res) => {
  const session = Array.from(sessions.values()).find(s => s.instanceName === req.params.instanceName);
  
  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }
  
  res.json({
    qrCode: session.qrCode,
    isConnected: session.isConnected
  });
});

// Status da instância
app.get('/api/instance/:instanceName/status', (req, res) => {
  const session = Array.from(sessions.values()).find(s => s.instanceName === req.params.instanceName);
  
  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }
  
  res.json({
    status: session.isConnected ? 'connected' : 'disconnected',
    isConnected: session.isConnected,
    phoneNumber: session.phoneNumber,
    pushName: session.pushName,
    profilePicture: session.profilePicture
  });
});

// Logout
app.post('/api/instance/:instanceName/logout', async (req, res) => {
  const session = Array.from(sessions.values()).find(s => s.instanceName === req.params.instanceName);
  
  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }
  
  try {
    if (session.socket) {
      await session.socket.logout();
    }
    sessions.delete(session.sessionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar instância
app.delete('/api/instance/:instanceName/delete', async (req, res) => {
  const session = Array.from(sessions.values()).find(s => s.instanceName === req.params.instanceName);
  
  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }
  
  try {
    if (session.socket) {
      await session.socket.logout();
    }
    
    const sessionPath = path.join(__dirname, 'sessions', session.instanceName);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true });
    }
    
    sessions.delete(session.sessionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar instâncias
app.get('/api/instance/list', (req, res) => {
  const sessionList = Array.from(sessions.values()).map(s => ({
    sessionId: s.sessionId,
    instanceName: s.instanceName,
    isConnected: s.isConnected,
    phoneNumber: s.phoneNumber,
    pushName: s.pushName
  }));
  
  res.json({ sessions: sessionList });
});

// Enviar mensagem
app.post('/api/message/send', async (req, res) => {
  try {
    const { instanceName, jid, message } = req.body;
    
    const session = Array.from(sessions.values()).find(s => s.instanceName === instanceName);
    if (!session || !session.socket || !session.isConnected) {
      return res.status(404).json({ error: 'Sessão não encontrada ou desconectada' });
    }
    
    const result = await session.socket.sendMessage(jid, message);
    
    res.json({
      success: true,
      messageId: result.key.id,
      key: result.key
    });
  } catch (error) {
    console.error('Erro enviar:', error);
    res.status(500).json({ error: 'Falha ao enviar' });
  }
});

// Enviar mídia
app.post('/api/message/send-media', async (req, res) => {
  try {
    const { instanceName, jid, mediaUrl, mediaType, caption } = req.body;
    
    const session = Array.from(sessions.values()).find(s => s.instanceName === instanceName);
    if (!session || !session.socket || !session.isConnected) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    
    let messageContent;
    switch (mediaType) {
      case 'image':
        messageContent = { image: { url: mediaUrl }, caption };
        break;
      case 'video':
        messageContent = { video: { url: mediaUrl }, caption };
        break;
      case 'audio':
        messageContent = { audio: { url: mediaUrl }, mimetype: 'audio/mp4', ptt: false };
        break;
      case 'document':
        messageContent = { document: { url: mediaUrl }, fileName: caption || 'document' };
        break;
      default:
        messageContent = { image: { url: mediaUrl }, caption };
    }
    
    const result = await session.socket.sendMessage(jid, messageContent);
    res.json({ success: true, messageId: result.key.id });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao enviar mídia' });
  }
});

// Enviar voz
app.post('/api/message/send-voice', async (req, res) => {
  try {
    const { instanceName, jid, audioUrl } = req.body;
    
    const session = Array.from(sessions.values()).find(s => s.instanceName === instanceName);
    if (!session || !session.socket || !session.isConnected) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    
    const result = await session.socket.sendMessage(jid, {
      audio: { url: audioUrl },
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true
    });
    
    res.json({ success: true, messageId: result.key.id });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao enviar voz' });
  }
});

// Marcar como lido
app.post('/api/message/read', async (req, res) => {
  try {
    const { instanceName, keys } = req.body;
    
    const session = Array.from(sessions.values()).find(s => s.instanceName === instanceName);
    if (!session || !session.socket || !session.isConnected) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    
    await session.socket.readMessages(keys);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao marcar como lido' });
  }
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(\`🚀 Baileys Server v4.2.0 rodando na porta \${PORT}\`);
  console.log(\`📡 Webhook: \${SUPABASE_WEBHOOK_URL || 'não configurado'}\`);
});
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
      a.download = 'baileys-server-v4.2.0.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Download concluído!',
        description: 'Servidor v4.2.0 - Sem dependência do SDK Supabase!'
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

  const DialogContentComponent = () => (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          Servidor Baileys v4.2.0 - Estável
        </DialogTitle>
        <DialogDescription>
          Corrigido: sem @supabase/supabase-js, QR Code funcional
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* What's New */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Correções v4.2.0
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <strong>Removido @supabase/supabase-js</strong> - usa fetch nativo
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <strong>QR Code funcional</strong> - geração correta
            </li>
            <li className="flex items-center gap-2">
              <Users className="h-3 w-3 text-primary" />
              <strong>Metadados de grupos</strong> - foto, descrição, participantes
            </li>
            <li className="flex items-center gap-2">
              <Users className="h-3 w-3 text-primary" />
              <strong>Sincronização de contatos</strong> - contacts.set
            </li>
            <li className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-primary" />
              <strong>Reconexão automática</strong> - backoff exponencial
            </li>
          </ul>
        </div>

        {/* Important Note */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
          <h4 className="font-medium text-[#FF4500] dark:text-orange-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Importante: Substituição Total
          </h4>
          <p className="text-sm text-muted-foreground">
            <strong>Substitua TODOS os arquivos</strong> no Railway. 
            Delete a pasta <code>sessions/</code> para uma nova conexão limpa.
          </p>
        </div>

        {/* Files included */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">📦 Arquivos incluídos:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <code>package.json</code> - SEM @supabase/supabase-js</li>
            <li>• <code>index.js</code> - Servidor v4.2.0 simplificado</li>
            <li>• <code>.env.example</code> - Variáveis de ambiente</li>
            <li>• <code>README.md</code> - Instruções de deploy</li>
          </ul>
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
              Baixar baileys-server-v4.2.0.zip
            </>
          )}
        </Button>
      </div>
    </DialogContent>
  );

  if (isOpenExternal !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContentComponent />
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
        <DialogContentComponent />
      </Dialog>
    </>
  );
};

export default BaileysServerDownload;
