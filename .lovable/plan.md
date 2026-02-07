

# Plano: Corrigir Erro 405 - Baileys v2.9.0

## Diagnóstico Final

O erro 405 ocorre porque o WhatsApp está **rejeitando ativamente** conexões do Baileys com certas configurações. Baseado na documentação oficial e issues do GitHub:

### Causas Identificadas:
1. **Browser string fixo inválido** - O formato `["Chrome (Linux)", "Chrome", "130.0.6723.70"]` não é aceito
2. **Versão 6.7.9** - Pode ter incompatibilidades
3. **makeCacheableSignalKeyStore** - Pode causar problemas de inicialização

### Solução Proposta: v2.9.0

| Item | Problema | Solução |
|------|----------|---------|
| Baileys | 6.7.9 | **7.0.0-rc.9** (mais recente e estável) |
| Browser | Fixo manual | **Browsers.macOS("Desktop")** |
| Version | Não especificada | **Deixar padrão** (recomendação oficial) |
| Auth Keys | makeCacheableSignalKeyStore | **Apenas state direto** |

## Mudanças Principais

### 1. Usar Baileys 7.0.0-rc.9

```json
{
  "dependencies": {
    "@whiskeysockets/baileys": "7.0.0-rc.9"
  },
  "type": "module"
}
```

### 2. Usar Browser String Oficial

```javascript
import { Browsers } from '@whiskeysockets/baileys';

const sock = makeWASocket({
  auth: state,
  browser: Browsers.macOS("Desktop"),
  printQRInTerminal: true,
  logger: pino({ level: 'silent' })
});
```

### 3. Simplificar Auth State

```javascript
// Baileys 7.x usa auth diferente
const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

const sock = makeWASocket({
  auth: state, // Direto, sem makeCacheableSignalKeyStore
  browser: Browsers.macOS("Desktop"),
  printQRInTerminal: true,
  logger: pino({ level: 'silent' })
});
```

### 4. Estrutura ESM (Baileys 7.x requer)

O Baileys 7.x é somente ESM (não suporta CommonJS). O servidor precisa usar `"type": "module"` e imports ESM.

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/CRM/BaileysServerDownload.tsx` | Servidor v2.9.0 completo com Baileys 7.x |

## Código do Servidor v2.9.0

### package.json
```json
{
  "name": "baileys-server",
  "version": "2.9.0",
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
    "node": ">=18"
  }
}
```

### index.js (ESM)
```javascript
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(60));
console.log('[INIT] Baileys Server v2.9.0 iniciando...');
console.log('[INIT] Baileys 7.0.0-rc.9 (ESM)');
console.log('[INIT] Browser: Browsers.macOS("Desktop")');
console.log('='.repeat(60));

const app = express();
app.use(cors());
app.use(express.json());

// Importar Baileys dinamicamente
let makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers;
let QRCode, pino;
let baileysLoaded = false;

async function loadBaileys() {
  try {
    const baileys = await import('@whiskeysockets/baileys');
    makeWASocket = baileys.default;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    Browsers = baileys.Browsers;
    
    QRCode = (await import('qrcode')).default;
    pino = (await import('pino')).default;
    
    baileysLoaded = true;
    console.log('[BAILEYS] ✅ Carregado com sucesso!');
  } catch (err) {
    console.error('[BAILEYS] ❌ Erro:', err.message);
  }
}

// Criar socket com configuração mínima oficial
async function createSocketForSession(session) {
  const sessionPath = path.join(process.cwd(), 'sessions', session.sessionId);
  
  // Garantir diretório
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  
  console.log('[SOCKET] Criando com Browsers.macOS("Desktop")...');
  
  // Configuração MÍNIMA oficial
  const sock = makeWASocket({
    auth: state,
    browser: Browsers.macOS("Desktop"),
    printQRInTerminal: true,
    logger: pino({ level: 'silent' })
  });
  
  session.socket = sock;
  
  // Listeners
  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;
    
    if (qr) {
      console.log('[QR] ✅ QR Code recebido!');
      session.qrCode = await QRCode.toDataURL(qr);
      session.status = 'waiting_qr';
    }
    
    if (connection === 'open') {
      console.log('[CONNECTED] ✅ WhatsApp conectado!');
      session.isConnected = true;
      session.status = 'connected';
      // Pegar info do usuário
      if (sock.user) {
        session.phoneNumber = sock.user.id.split(':')[0];
        session.pushName = sock.user.name;
      }
    }
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log('[DISCONNECTED] Código:', statusCode);
      session.isConnected = false;
      
      // Retry se não for logout
      if (statusCode !== DisconnectReason?.loggedOut && session.retryCount < 3) {
        session.retryCount++;
        setTimeout(() => createSocketForSession(session), 5000);
      }
    }
  });
  
  return session;
}

// Rotas...
```

## Por que Deve Funcionar

1. **Baileys 7.0.0-rc.9** - Versão mais recente com correções
2. **Browsers.macOS("Desktop")** - Browser string OFICIAL do Baileys
3. **Sem versão manual** - Deixa o Baileys usar a versão compatível
4. **ESM** - Formato correto para Baileys 7.x
5. **Auth simples** - Sem makeCacheableSignalKeyStore que pode causar problemas

## Resultado Esperado

Nos logs do Railway após v2.9.0:
```text
[INIT] Baileys Server v2.9.0 iniciando...
[BAILEYS] ✅ Carregado com sucesso!
[SOCKET] Criando com Browsers.macOS("Desktop")...
[QR] ✅ QR Code recebido!
```

## Instruções para o Usuário

1. Baixar novo servidor v2.9.0
2. **IMPORTANTE**: Substituir TODOS os arquivos (especialmente package.json)
3. O Railway vai reinstalar as dependências automaticamente
4. Aguardar deploy completo (~3-4 minutos por ser nova versão)
5. Testar conexão

## Nota Importante

Se mesmo com v2.9.0 o erro 405 persistir, o problema pode ser do lado do WhatsApp (bloqueio de IP/região). Nesse caso, as opções seriam:

1. Usar proxy/VPN no servidor
2. Tentar em um servidor de outra região
3. Aguardar atualizações do Baileys

O erro 405 é um problema ativo na comunidade Baileys e não há garantia de 100% de funcionamento.

