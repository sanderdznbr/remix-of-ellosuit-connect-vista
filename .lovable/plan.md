

# Plano: Corrigir Bug do QR Lock Bloqueando Reconexão 515 - v2.9.4

## Diagnóstico Completo

### Problema Identificado
O erro 515 (restartRequired) é um comportamento **ESPERADO** do WhatsApp após escanear o QR Code. A mensagem nos logs confirma:
```
"pairing configured successfully, expect to restart the connection..."
```

**Bug Crítico**: No código v2.9.3, o check de QR Lock (linhas 373-382) vem **ANTES** do handler do erro 515 (linha 398). Como o QR foi gerado há menos de 60 segundos quando o usuário escaneia, o código faz `return` e **nunca chega ao handler do 515**.

### Fluxo Atual (ERRADO)
```text
connection === 'close' com statusCode 515
    ↓
CHECK QR LOCK (linha 373-382)
    ↓
QR gerado há 15s < 60s → return (PARA AQUI!)
    ↓
Handler do 515 NUNCA é alcançado
    ↓
Reconexão NÃO acontece
    ↓
Erro "Não foi possível conectar"
```

### Fluxo Correto (v2.9.4)
```text
connection === 'close' com statusCode 515
    ↓
CHECK LOGOUT (401) → Se logout, deletar sessão
    ↓
CHECK 515 PRIMEIRO (PRIORIDADE MÁXIMA!)
    ↓
515 detectado → Limpar QR Lock, reconectar em 1s
    ↓
Reconexão acontece com credenciais salvas
    ↓
connection === 'open' → Sucesso!
```

## Solução: v2.9.4

### Mudança Principal
Mover o handler do **erro 515 para ANTES** do check de QR Lock, e limpar o QR Lock quando 515 for detectado.

### Código ATUAL (v2.9.3 - ERRADO)
```javascript
if (connection === 'close') {
  // ❌ QR LOCK CHECK PRIMEIRO - IMPEDE RECONEXÃO 515!
  if (session.qrGeneratedAt) {
    const timeSinceQR = Date.now() - session.qrGeneratedAt;
    if (timeSinceQR < QR_LOCK_TIME_MS) {
      return;  // ❌ PARA AQUI! Handler 515 nunca é alcançado
    }
  }
  
  // Handler 515 vem depois - nunca alcançado
  if (statusCode === 515) {
    // ...reconexão
  }
}
```

### Código NOVO (v2.9.4 - CORRETO)
```javascript
if (connection === 'close') {
  // ✅ CHECK LOGOUT PRIMEIRO
  if (statusCode === DisconnectReason?.loggedOut) {
    // deletar sessão
    return;
  }
  
  // ✅ CHECK 515 COM PRIORIDADE MÁXIMA
  // 515 = restartRequired = reconexão obrigatória após pareamento
  if (statusCode === 515 || statusCode === DisconnectReason?.restartRequired) {
    console.log('[515] ⚡ PAREAMENTO DETECTADO - Reconexão IMEDIATA');
    
    // LIMPAR QR LOCK - pareamento já foi feito!
    session.qrGeneratedAt = null;
    session.qrCode = null;
    session.status = 'reconnecting_after_pair';
    
    // Reconectar IMEDIATAMENTE
    setTimeout(() => createSocketForSession(session), 1000);
    return;
  }
  
  // QR Lock check apenas para outros erros (não 515)
  if (session.qrGeneratedAt) {
    const timeSinceQR = Date.now() - session.qrGeneratedAt;
    if (timeSinceQR < QR_LOCK_TIME_MS) {
      return;  // Não reconectar se usuário ainda pode estar escaneando
    }
  }
  
  // ... outros handlers
}
```

## Mudanças Técnicas v2.9.4

| Item | v2.9.3 | v2.9.4 |
|------|--------|--------|
| Ordem dos checks | QR Lock antes do 515 | **515 antes do QR Lock** |
| QR Lock no 515 | Impede reconexão | **Limpa o lock** |
| Delay reconexão 515 | 1s (nunca alcançado) | **1s (sempre executado)** |
| Status no 515 | `reconnecting_after_pair` | **Mantido** |

## Arquivo a Modificar

`src/components/CRM/BaileysServerDownload.tsx` - Corrigir ordem dos handlers no template do servidor

## Código Completo do Handler de Desconexão (v2.9.4)

```javascript
// ===== DESCONECTADO =====
if (connection === 'close') {
  session.isConnected = false;
  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const errorMessage = lastDisconnect?.error?.message || '';
  
  console.log('');
  console.log('[DISCONNECTED] ========================================');
  console.log(\`[DISCONNECTED] Instância: \${instanceName}\`);
  console.log(\`[DISCONNECTED] Código: \${statusCode}\`);
  console.log(\`[DISCONNECTED] Erro: \${errorMessage}\`);
  console.log('[DISCONNECTED] ========================================');
  
  await sendWebhook({
    event: 'connection.update',
    sessionId,
    instanceName,
    data: { connection: 'close', isConnected: false, statusCode }
  });
  
  // ===== 1. CHECK LOGOUT (401) =====
  if (statusCode === DisconnectReason?.loggedOut) {
    console.log('[LOGOUT] Usuário fez logout, removendo sessão');
    session.status = 'logged_out';
    sessions.delete(sessionId);
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    } catch (e) {}
    return;
  }
  
  // ===== 2. CHECK 515 - PRIORIDADE MÁXIMA! =====
  // O erro 515 (restartRequired) é ESPERADO após escanear o QR
  // WhatsApp pede reconexão após pareamento bem-sucedido
  // NÃO deve ser bloqueado pelo QR Lock!
  if (statusCode === 515 || statusCode === DisconnectReason?.restartRequired) {
    console.log('');
    console.log('[515] ═══════════════════════════════════════════════════');
    console.log('[515] ⚡ PAREAMENTO DETECTADO - Reconexão IMEDIATA');
    console.log('[515] Isso é NORMAL! WhatsApp pede restart após QR scan');
    console.log('[515] Credenciais JÁ FORAM SALVAS pelo pareamento');
    console.log('[515] ═══════════════════════════════════════════════════');
    console.log('');
    
    // IMPORTANTE: Limpar QR Lock pois pareamento foi bem-sucedido
    session.qrGeneratedAt = null;
    session.qrCode = null;
    session.status = 'reconnecting_after_pair';
    
    // NÃO incrementar retry - isso não é um erro real
    // NÃO limpar auth - credenciais já foram salvas
    
    // Fechar socket atual
    if (session.socket) {
      try { session.socket.end(); } catch (e) {}
      session.socket = null;
    }
    
    // Reconectar IMEDIATAMENTE (1s para dar tempo de limpar socket)
    setTimeout(async () => {
      try {
        console.log('[515] 🔄 Iniciando reconexão com credenciais salvas...');
        await createSocketForSession(session);
      } catch (err) {
        console.error('[515] ❌ Erro na reconexão:', err.message);
        session.status = 'failed';
      }
    }, 1000);
    
    return;
  }
  
  // ===== 3. CHECK QR LOCK - Apenas para outros erros =====
  // Este check impede reconexões enquanto usuário escaneia
  // MAS não deve bloquear o 515 (já tratado acima)
  if (session.qrGeneratedAt) {
    const timeSinceQR = Date.now() - session.qrGeneratedAt;
    if (timeSinceQR < QR_LOCK_TIME_MS) {
      const remaining = Math.ceil((QR_LOCK_TIME_MS - timeSinceQR) / 1000);
      console.log(\`[QR LOCK] ⏳ QR ativo, NÃO reconectando (aguarde \${remaining}s)\`);
      console.log('[QR LOCK] Usuário pode estar escaneando o QR');
      return;
    }
  }
  
  // ===== 4. ERROS 405/408 - Protocolo =====
  if (statusCode === 405 || statusCode === 408) {
    console.log(\`[\${statusCode}] Erro de protocolo\`);
    session.retryCount++;
    if (session.retryCount < MAX_RETRIES) {
      session.qrCode = null;
      session.qrGeneratedAt = null;
      session.status = 'reconnecting';
      console.log(\`[\${statusCode}] Reconectando em \${RETRY_DELAY_MS/1000}s (tentativa \${session.retryCount})\`);
      setTimeout(async () => {
        try {
          await createSocketForSession(session);
        } catch (err) {
          console.error(\`[\${statusCode}] Erro ao reconectar:\`, err.message);
          session.status = 'failed';
        }
      }, RETRY_DELAY_MS);
    } else {
      console.log(\`[\${statusCode}] Esgotou tentativas\`);
      session.status = 'failed';
    }
    return;
  }
  
  // ===== 5. OUTROS ERROS =====
  if (session.retryCount < MAX_RETRIES) {
    session.retryCount++;
    session.status = 'reconnecting';
    console.log(\`[RETRY] Tentativa \${session.retryCount}/\${MAX_RETRIES} em \${RETRY_DELAY_MS/1000}s...\`);
    setTimeout(async () => {
      try {
        await createSocketForSession(session);
      } catch (err) {
        console.error('[RETRY] Erro:', err.message);
        session.status = 'failed';
      }
    }, RETRY_DELAY_MS);
  } else {
    console.log('[FAILED] Esgotou tentativas');
    session.status = 'failed';
  }
}
```

## Resultado Esperado (Logs do Railway)

Após escanear o QR Code, os logs devem mostrar:
```text
[QR] 🎉 QR Code recebido!
[QR] ✅ QR Code convertido para DataURL
[QR] 🔒 QR Lock ativo por 60 s
... (usuário escaneia o QR)
[DISCONNECTED] ========================================
[DISCONNECTED] Código: 515
[DISCONNECTED] ========================================
[515] ═══════════════════════════════════════════════════
[515] ⚡ PAREAMENTO DETECTADO - Reconexão IMEDIATA
[515] Isso é NORMAL! WhatsApp pede restart após QR scan
[515] Credenciais JÁ FORAM SALVAS pelo pareamento
[515] ═══════════════════════════════════════════════════
[515] 🔄 Iniciando reconexão com credenciais salvas...
[SOCKET] Criando socket com config v2.9.4...
[SOCKET] ✓ Socket criado!
[CONNECTED] ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
[CONNECTED] whatsapp-xxx CONECTADO!
[CONNECTED] Telefone: 5511999999999
[CONNECTED] ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
```

## Por Que Deve Funcionar

1. **Ordem correta dos handlers** - 515 é verificado ANTES do QR Lock
2. **QR Lock limpo no 515** - Remove o bloqueio quando pareamento é detectado
3. **Credenciais preservadas** - Não limpa auth (já salvas pelo pareamento)
4. **Baseado em Issue #1218** - Solução confirmada pela comunidade Baileys

## Instruções para o Usuário

1. **Baixar novo servidor (v2.9.4)** - Clique no botão "Servidor" no CRM
2. **Substituir TODOS os arquivos** - Especialmente o `index.js`
3. **Aguardar deploy no Railway** (~3 minutos)
4. **Testar conexão** - Escanear QR e aguardar reconexão automática

## Comparativo de Versões

| Versão | Problema | Status |
|--------|----------|--------|
| v2.9.2 | QR regenera muito rápido | Corrigido com QR Lock |
| v2.9.3 | 515 com delay de 15s | Corrigido para 1s |
| **v2.9.4** | **QR Lock bloqueia 515** | **FIX: 515 tem prioridade** |

