
# Plano: Corrigir Erro de Conexão Após QR Scan - v2.9.3

## Diagnóstico

O erro **"Não foi possível conectar o dispositivo"** ocorre porque:

1. O WhatsApp envia `<stream:error code='515'/>` DEPOIS do pareamento bem-sucedido
2. Isso é um comportamento **ESPERADO** do protocolo Baileys
3. O servidor v2.9.2 está esperando 15s para reconectar e limpando dados de auth
4. O delay causa timeout no celular, mostrando erro de conexão

### Evidência dos Logs (GitHub Issue #1218)
```text
{"msg":"pair success recv"}
{"msg":"pairing configured successfully, expect to restart the connection..."}
{"xml":"<stream:error code='515'/>","msg":"recv xml"}  <-- Erro esperado
{"msg":"stream errored out"}
```

A mensagem "expect to restart the connection" indica que o erro 515 é **normal** e a reconexão deve ser **imediata**.

## Solução: v2.9.3

### Mudança Principal

No handler do erro 515, fazer reconexão **imediata** (1s) ao invés de esperar 15s:

**Código ATUAL (v2.9.2) - ERRADO:**
```javascript
if (statusCode === 515) {
  session.qrCode = null;        // ERRADO: limpa auth
  session.qrGeneratedAt = null; // ERRADO: limpa lock
  setTimeout(async () => {
    await createSocketForSession(session);
  }, RETRY_DELAY_MS);  // ERRADO: espera 15s
}
```

**Código NOVO (v2.9.3) - CORRETO:**
```javascript
if (statusCode === 515) {
  // 515 = comportamento ESPERADO após QR scan
  console.log('[515] Stream error - Reconexão IMEDIATA');
  
  // NÃO limpar auth data (credenciais já salvas)
  // NÃO incrementar retry count
  session.status = 'reconnecting';
  
  // Reconectar IMEDIATAMENTE (1s apenas para limpar socket)
  setTimeout(async () => {
    await createSocketForSession(session);
  }, 1000);
}
```

### Mudanças no Servidor v2.9.3

| Item | v2.9.2 | v2.9.3 |
|------|--------|--------|
| Delay após 515 | 15s | **1s** |
| Limpa auth no 515 | Sim | **Não** |
| Limpa QR lock no 515 | Sim | **Não** |
| Incrementa retry no 515 | Não | **Não** |

### Arquivo a Modificar

`src/components/CRM/BaileysServerDownload.tsx` - Atualizar template do servidor para v2.9.3

### Código Específico da Correção

No handler `connection.update`, seção de `connection === 'close'`:

```javascript
// ===== ERRO 515 - COMPORTAMENTO ESPERADO APÓS QR =====
// WhatsApp envia 515 para forçar reconexão após pareamento
if (statusCode === 515) {
  console.log('');
  console.log('[515] ⚡ Stream Error - Reconexão IMEDIATA');
  console.log('[515] Isso é NORMAL após escanear o QR');
  console.log('[515] Credenciais foram salvas, reconectando...');
  console.log('');
  
  // IMPORTANTE: NÃO limpar auth, NÃO incrementar retry
  // As credenciais já foram salvas pelo pareamento
  session.status = 'reconnecting_after_pair';
  
  // Fechar socket atual
  if (session.socket) {
    try { session.socket.end(); } catch (e) {}
    session.socket = null;
  }
  
  // Reconectar IMEDIATAMENTE (1s para limpar socket)
  setTimeout(async () => {
    try {
      console.log('[515] Iniciando reconexão...');
      await createSocketForSession(session);
    } catch (err) {
      console.error('[515] Erro na reconexão:', err.message);
      session.status = 'failed';
    }
  }, 1000);
  
  return;
}
```

### Por Que Deve Funcionar

1. **Reconexão imediata** - O WhatsApp espera reconexão rápida após 515
2. **Credenciais preservadas** - O pareamento já salvou as credenciais
3. **Sem limpeza de dados** - Não resetar auth data que já foi salva
4. **Baseado em solução comprovada** - Issue #1218 fechado como resolvido

### Resultado Esperado

Nos logs do Railway após escanear o QR:
```text
[QR] QR Code recebido!
... (usuário escaneia)
[515] ⚡ Stream Error - Reconexão IMEDIATA
[515] Isso é NORMAL após escanear o QR
[515] Credenciais foram salvas, reconectando...
[515] Iniciando reconexão...
[CONNECTED] ✅ WhatsApp conectado!
[CONNECTED] Telefone: 5511999999999
```

## Instruções para o Usuário

1. **Baixar servidor v2.9.3** do botão "Servidor" no CRM
2. **Substituir TODOS os arquivos** no repositório GitHub
3. **Aguardar deploy** no Railway (~2-3 minutos)
4. **Testar conexão** - escanear QR e aguardar conexão automática

## Nota Técnica

Se o problema persistir após v2.9.3, pode ser:
- Problema específico com WhatsApp Business (ver Issue #1543)
- Bloqueio de IP/região pelo WhatsApp
- Versão específica do WhatsApp no celular

Solução alternativa nesses casos: reverter para WhatsApp normal (não Business).
