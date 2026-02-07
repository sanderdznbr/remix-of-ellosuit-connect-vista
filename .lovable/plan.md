

# Plano: Corrigir QR Code - Baileys v2.6.0 (Downgrade para 6.5.0)

## Problema Identificado

O Baileys versão ^6.7.9 tem **bugs conhecidos** que causam desconexão imediata antes do QR ser gerado:

```text
Logs do Problema:
[SOCKET] Etapa 5: ✓ Socket criado!
[SOCKET] Etapa 6: ✓ connection.update
[CONNECTION] Update: {"hasQr":false,"connection":"close"}
[DISCONNECTED] socketAge: 261ms   <-- Desconecta em 260ms!
```

**Evidências:**
- Issue #2050: QR missing em 6.7.21
- Issue #2040: Desconexão automática em 6.7.20
- Issue #1914: Socket não gera QR
- Projeto SuhailTechInfo/web-qr funciona com **6.5.0**

## Solucao: Server v2.6.0

### Mudancas Principais

| Item | Antes | Depois |
|------|-------|--------|
| Versão Baileys | ^6.7.9 (bugada) | 6.5.0 (estável) |
| Configuração | 15+ opções | 4 opções mínimas |
| Listeners | Complexos | Simples e diretos |
| Retry | Muitas tentativas | 3 tentativas simples |

### Codigo do package.json

```json
{
  "name": "baileys-server",
  "version": "2.6.0",
  "dependencies": {
    "@whiskeysockets/baileys": "6.5.0",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "pino": "^8.1.0",
    "qrcode": "^1.5.4"
  }
}
```

### Codigo Simplificado do Socket

```javascript
// Configuração MÍNIMA que funciona
const sock = makeWASocket({
  printQRInTerminal: true,
  auth: state,
  logger: pino({ level: 'silent' })
});

// Registrar listeners IMEDIATAMENTE
sock.ev.on('creds.update', saveCreds);

sock.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect, qr } = update;
  
  // QR code disponível
  if (qr) {
    session.qrCode = await QRCode.toDataURL(qr);
    console.log('[QR] ✅ QR Code gerado!');
  }
  
  // Conectado
  if (connection === 'open') {
    session.isConnected = true;
    console.log('[CONNECTED] ✅ WhatsApp conectado!');
  }
  
  // Desconectado
  if (connection === 'close') {
    const shouldReconnect = 
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    if (shouldReconnect) {
      // Reconectar...
    }
  }
});
```

### Por que 6.5.0 Funciona

1. **Estabilidade testada** - Usado em produção por muitos projetos
2. **Menos código de conexão** - Menos chance de bugs internos
3. **Eventos mais confiáveis** - O evento `qr` dispara corretamente

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/CRM/BaileysServerDownload.tsx` | Servidor v2.6.0 com Baileys 6.5.0 |

## Resultado Esperado

Após v2.6.0:

```
[BAILEYS] ✓ Módulo importado (6.5.0)
[SOCKET] Criando socket...
[CONNECTION] qr recebido ✅
[QR] ✅ QR Code gerado!
```

## Instruções para o Usuario

1. Baixar novo servidor (v2.6.0)
2. **Substituir TODOS os arquivos** no repositório
3. Railway vai reinstalar o Baileys 6.5.0 automaticamente
4. Aguardar deploy completo (~2-3 minutos)
5. Testar conexão

## Detalhes Tecnicos

### Diferenças de Configuração

Antes (v2.5.0 - não funciona):
```javascript
const socketConfig = {
  version,
  logger,
  printQRInTerminal: true,
  auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(...) },
  browser: Browsers.ubuntu('Chrome'),
  connectTimeoutMs: 180000,
  defaultQueryTimeoutMs: 60000,
  syncFullHistory: false,
  markOnlineOnConnect: false,
  generateHighQualityLinkPreview: false,
  getMessage: async () => undefined
};
```

Depois (v2.6.0 - funciona):
```javascript
const sock = makeWASocket({
  printQRInTerminal: true,
  auth: state,
  logger: pino({ level: 'silent' })
});
```

### Remoção de Complexidade

- Sem `makeCacheableSignalKeyStore` (Baileys 6.5.0 não precisa)
- Sem `fetchLatestBaileysVersion` (usar versão padrão)
- Sem `Browsers` customizado (usar padrão)
- Sem múltiplos timeouts
- Sem `getMessage` handler

### Estrutura de Retry Simplificada

```javascript
if (connection === 'close') {
  const statusCode = lastDisconnect?.error?.output?.statusCode;
  
  if (statusCode === DisconnectReason.loggedOut) {
    // Usuário fez logout - não reconectar
    sessions.delete(sessionId);
  } else if (session.retryCount < 3) {
    // Tentar reconectar
    session.retryCount++;
    setTimeout(() => createSocket(session), 5000);
  }
}
```

