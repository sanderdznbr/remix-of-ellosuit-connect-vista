
# Plano: Corrigir Loop Infinito de QR Code do WhatsApp

## Diagnóstico

O problema é um **loop de reconexão infinito** no servidor Baileys:

1. Sessão é criada
2. Baileys desconecta imediatamente com `Code: undefined` (antes de gerar QR)
3. Lógica de reconexão tenta reconectar após 3 segundos
4. Sessão é deletada e recriada infinitamente
5. QR Code nunca é gerado porque a sessão não fica ativa tempo suficiente

**Sobre inserir número de telefone:** NÃO é necessário. O WhatsApp Web funciona escaneando o QR Code - o número é detectado automaticamente após escanear.

## Solução

### 1. Corrigir Lógica de Reconexão do Servidor (v2.2.0)

Atualizar o `index.js` do servidor Baileys para:
- **Não reconectar** se a sessão nunca foi conectada (evita loop infinito)
- Manter a sessão em memória por mais tempo para dar tempo de gerar QR
- Adicionar um contador de tentativas para evitar loops eternos

```text
Lógica atual (problemática):
┌──────────────────────────────────────────────┐
│ Sessão criada                                │
│      ↓                                       │
│ Desconecta (Code: undefined)                 │
│      ↓                                       │
│ shouldReconnect = true (sempre!)             │
│      ↓                                       │
│ Deleta sessão + Recria = LOOP INFINITO       │
└──────────────────────────────────────────────┘

Lógica corrigida:
┌──────────────────────────────────────────────┐
│ Sessão criada → wasConnected = false         │
│      ↓                                       │
│ Desconecta (Code: undefined)                 │
│      ↓                                       │
│ wasConnected? NÃO → Não reconecta, mantém    │
│ sessão ativa esperando QR ser escaneado      │
│      ↓                                       │
│ QR escaneado → Conecta → wasConnected = true │
└──────────────────────────────────────────────┘
```

### 2. Atualizar Edge Function

- Reduzir frequência de polling (de 2s para 3s)
- Não recriar instância se ela foi criada nos últimos 30 segundos
- Adicionar timeout máximo para geração de QR (2 minutos)

### 3. Atualizar Frontend (WhatsAppQRModal)

- Adicionar indicador de tentativas
- Timeout automático após 2 minutos sem QR
- Botão para cancelar e tentar novamente limpo

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/CRM/BaileysServerDownload.tsx` | Servidor v2.2.0 com lógica corrigida |
| `supabase/functions/whatsapp-api/index.ts` | Rate-limiting e proteção contra loop |
| `src/components/CRM/WhatsAppQRModal.tsx` | Timeout e melhor feedback visual |

## Detalhes Técnicos

### Mudanças no Servidor (index.js)

```javascript
// Adicionar flag wasConnected na sessão
const session = {
  sessionId,
  instanceName,
  socket: null,
  qrCode: null,
  isConnected: false,
  wasConnected: false,  // NOVO: rastreia se já conectou
  retryCount: 0,        // NOVO: conta tentativas
  createdAt: Date.now() // NOVO: timestamp de criação
};

// Na lógica de connection.update:
if (connection === 'open') {
  session.isConnected = true;
  session.wasConnected = true;  // Marca que já conectou
  session.retryCount = 0;
  // ...
}

if (connection === 'close') {
  session.isConnected = false;
  
  // SÓ reconectar se:
  // 1. Já tinha conectado antes (wasConnected = true)
  // 2. Não fez logout
  // 3. Menos de 5 tentativas
  const shouldReconnect = 
    session.wasConnected && 
    statusCode !== DisconnectReason?.loggedOut &&
    session.retryCount < 5;
  
  if (!shouldReconnect && !session.wasConnected) {
    // Sessão nova que nunca conectou - manter ativa esperando QR
    console.log(`[SESSION] ${instanceName} aguardando QR (não reconectar)`);
    // NÃO deletar a sessão!
  }
}
```

### Mudanças no Edge Function

```typescript
// Adicionar rate-limiting
case 'get_qr_code': {
  const session = await getSession(sessionId);
  
  // Não recriar se a sessão é recente (< 30s)
  const sessionAge = Date.now() - new Date(session.created_at).getTime();
  if (qrResponse.status === 404 && sessionAge < 30000) {
    // Apenas aguardar, não recriar
    return { status: 'generating', message: 'Aguardando servidor...' };
  }
  // ...
}
```

## Passos de Implementação

1. Atualizar código do servidor no `BaileysServerDownload.tsx`
2. Deploy da edge function atualizada
3. Atualizar frontend com melhor feedback
4. **Usuário deve baixar novo servidor (v2.2.0) e atualizar no Railway**

## Resultado Esperado

Após as mudanças:
- Sessão criada permanece ativa esperando escaneamento do QR
- Sem loops de reconexão infinitos
- QR Code aparece em ~5-10 segundos
- Feedback claro do progresso
