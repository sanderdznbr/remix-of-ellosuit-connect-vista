

# Plano: Corrigir Geração de QR Code do Baileys

## Diagnóstico Detalhado

O problema identificado:

```
[SESSION] Criando whatsapp-xxx
[DISCONNECTED] - Code: undefined, hadQR: false, socketAge: ~300ms
```

Isso significa que o socket Baileys está **fechando imediatamente** durante a inicialização, ANTES de:
1. Conectar ao servidor do WhatsApp
2. Receber o evento `qr`
3. Gerar o QR Code

**Pasta SESSIONS vazia**: NORMAL. A pasta só é preenchida após escanear um QR com sucesso.

## Causa Raiz

O Baileys está falhando na fase de **handshake inicial** com o WhatsApp. Possíveis causas:

1. **Problema com `useMultiFileAuthState`** - erro silencioso ao criar estado de auth
2. **Configuração do socket incompatível** - algumas opções causam rejeição
3. **Versão do Baileys** - pode ter bugs específicos
4. **Ambiente** - Node.js/dependências nativas

## Solução: Servidor v2.5.0

### Mudanças Principais

| Item | Descrição |
|------|-----------|
| Logging detalhado | Adicionar logs em CADA etapa da criação do socket |
| Error handling | Capturar erros de `useMultiFileAuthState` |
| Configuração simplificada | Usar config mínima do socket |
| Listener separado de QR | Escutar `qr` diretamente, não só em `connection.update` |
| Retry mais agressivo | Tentar novamente imediatamente se falhar |

### Código Corrigido (Principais Mudanças)

**1. Adicionar listener separado para evento QR:**

```javascript
// Listener SEPARADO para qr (mais confiável)
socket.ev.on('qr', async (qr) => {
  console.log('[QR-EVENT] ⚡ QR code recebido diretamente!');
  try {
    session.qrCode = await QRCode.toDataURL(qr);
    session.qrGeneratedAt = Date.now();
    session.status = 'waiting_qr';
    console.log('[QR-EVENT] ✅ QR convertido para DataURL');
  } catch (e) {
    console.error('[QR-EVENT] Erro ao converter QR:', e.message);
  }
});
```

**2. Melhorar error handling no auth state:**

```javascript
let state, saveCreds;
try {
  const authResult = await useMultiFileAuthState(sessionPath);
  state = authResult.state;
  saveCreds = authResult.saveCreds;
  console.log('[SOCKET] Auth state carregado com sucesso');
} catch (authError) {
  console.error('[SOCKET] ERRO no auth state:', authError.message);
  // Limpar e tentar novamente
  fs.rmSync(sessionPath, { recursive: true, force: true });
  const retryAuth = await useMultiFileAuthState(sessionPath);
  state = retryAuth.state;
  saveCreds = retryAuth.saveCreds;
}
```

**3. Configuração simplificada do socket:**

```javascript
const socketConfig = {
  version,
  logger,
  printQRInTerminal: true,
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, logger)
  },
  // Browser minimalista
  browser: Browsers.ubuntu('Chrome'),
  // Timeout aumentado
  connectTimeoutMs: 180000,
  // Desabilitar features que podem causar problemas
  syncFullHistory: false,
  markOnlineOnConnect: false,
  generateHighQualityLinkPreview: false,
  // Habilitar retry interno
  getMessage: async () => undefined
};
```

**4. Logging extensivo:**

```javascript
console.log('[SOCKET] Etapa 1: Criando pasta de auth...');
console.log('[SOCKET] Etapa 2: Carregando auth state...');
console.log('[SOCKET] Etapa 3: Buscando versão do Baileys...');
console.log('[SOCKET] Etapa 4: Criando socket...');
console.log('[SOCKET] Etapa 5: Socket criado, registrando listeners...');
console.log('[SOCKET] Etapa 6: Aguardando evento qr...');
```

**5. Retry imediato se falhar sem QR:**

```javascript
if (connection === 'close') {
  // Se desconectou muito rápido sem QR, tentar imediatamente
  const socketAge = Date.now() - session.socketCreatedAt;
  if (socketAge < 5000 && !session.qrCode && session.qrRetryCount < 10) {
    console.log('[IMMEDIATE-RETRY] Desconexão muito rápida, tentando novamente...');
    session.qrRetryCount++;
    await sleep(1000); // Espera curta
    await createSocketForSession(session);
  }
}
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/CRM/BaileysServerDownload.tsx` | Servidor v2.5.0 completo |
| `src/components/CRM/WhatsAppQRModal.tsx` | Feedback melhorado durante debugging |

## Passos de Implementação

1. Atualizar código do servidor para v2.5.0
2. Adicionar listener separado para evento `qr`
3. Melhorar error handling em toda a cadeia
4. Adicionar logging extensivo para debug
5. **Usuário baixa novo servidor e atualiza no Railway**

## Checklist de Verificação (Após Implementar)

Nos logs do Railway, você deve ver:

```
[SOCKET] Etapa 1: Criando pasta de auth...
[SOCKET] Etapa 2: Carregando auth state...
[SOCKET] Auth state carregado com sucesso
[SOCKET] Etapa 3: Buscando versão do Baileys...
[SOCKET] Versão: 2.3000.xxx
[SOCKET] Etapa 4: Criando socket...
[SOCKET] Etapa 5: Socket criado, registrando listeners...
[QR-EVENT] ⚡ QR code recebido diretamente!
[QR-EVENT] ✅ QR convertido para DataURL
```

Se os logs pararem antes de "Etapa 4", o problema é no auth state.
Se pararem após "Etapa 4", o problema é na conexão com WhatsApp.

## Resultado Esperado

Após v2.5.0:
- Logs detalhados mostram exatamente onde falha
- Listener separado de `qr` aumenta chance de captura
- Error handling previne falhas silenciosas
- Retry agressivo compensa instabilidades

