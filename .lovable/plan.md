
# Plano de Correção: CRM WhatsApp - Sincronização e Usabilidade

## Problemas Identificados

1. **Ao alternar entre canais, as conversas não mudam** - A função `loadConversations` não filtra por `session_id` quando um canal específico está selecionado
2. **Tela de sync duplicada e feia** - O SVG está sendo renderizado dentro dele mesmo (barra de progresso duplicada no SVG + componente separado)
3. **Carregamento muito lento** - Timeout de 60s pode ser excessivo; o progresso visual não reflete o estado real da sincronização
4. **Contatos vindo sem nome, foto de perfil e foto de grupo** - O servidor Baileys precisa buscar metadados proativamente logo após a conexão
5. **Nomes mostrando número em vez de nome salvo** - WhatsApp retorna pushName/notify, não o nome do contato salvo no telefone (limitação da API)

## Solução Proposta

### 1. Filtrar Conversas por Canal Selecionado
**Arquivo:** `src/components/CRM/WhatsAppCRM.tsx`

- Modificar `loadConversations()` para filtrar por `session_id` quando um canal específico está selecionado
- Adicionar lógica: se `selectedSessionId` existir, adicionar `.eq('session_id', selectedSessionId)` na query
- Chamar `loadConversations()` automaticamente quando `selectedSessionId` mudar

```text
Mudanças na função loadConversations:
- Verificar se selectedSessionId existe
- Se sim, adicionar filtro .eq('session_id', selectedSessionId)
- Isso fará as conversas alternarem corretamente entre canais
```

### 2. Corrigir Tela de Sincronização
**Arquivo:** `src/components/CRM/WhatsAppSyncScreen.tsx`

- Redesenhar completamente para o layout solicitado:
  - Fundo **branco**
  - Logo SVG laranja (conforme fornecido pelo usuário)
  - Barra de progresso laranja separada e limpa
  - Mensagem "Puxando conversas..." abaixo
- Remover duplicação (o SVG atual tem uma barra de progresso embutida E uma separada)
- Duração fixa de **60 segundos** com fechamento automático

```text
Layout correto:
┌─────────────────────────────┐
│         (fundo branco)      │
│                             │
│          🟠 LOGO            │
│       (SVG Ellosuit)        │
│                             │
│   ═══════════════════       │
│   (barra progresso laranja) │
│          65%                │
│                             │
│   Puxando conversas...      │
│                             │
└─────────────────────────────┘
```

### 3. Forçar Sincronização Imediata de Metadados
**Arquivo:** `docs/baileys-server-template/baileys-server-v4.4.0/index.js`

Melhorar a lógica de sincronização:
- Após conexão, forçar busca de metadados para TODOS os chats imediatamente
- Priorizar grupos (que precisam de `groupMetadata()`)
- Buscar fotos de perfil em paralelo com semáforo

```text
Fluxo melhorado no connection.open:
1. Conexão estabelecida
2. Aguardar 3s para estabilizar
3. Para cada chat no cache:
   - Buscar profilePictureUrl()
   - Se grupo: buscar groupMetadata() 
   - Enviar webhook com dados enriquecidos
4. Processar mensagens das últimas 6h
```

### 4. Melhorar Extração de Nomes de Contatos
**Arquivo:** `docs/baileys-server-template/baileys-server-v4.4.0/index.js`

- Manter cache de nomes mais agressivo
- Usar múltiplas fontes: `contact.name`, `contact.notify`, `contact.pushName`, `contact.verifiedName`
- Para grupos: usar `groupMetadata().subject` como fonte primária

**Nota importante:** O WhatsApp **não** fornece acesso aos nomes salvos na agenda do telefone do usuário. Só temos acesso ao nome que o contato escolheu para si mesmo (pushName). Esta é uma limitação da API do WhatsApp, não um bug do sistema.

### 5. Adicionar Dependência de selectedSessionId
**Arquivo:** `src/components/CRM/WhatsAppCRM.tsx`

- Adicionar `selectedSessionId` como dependência do useEffect que carrega conversas
- Garantir que ao trocar de canal, os dados sejam recarregados corretamente

---

## Detalhes Técnicos

### Alterações em WhatsAppCRM.tsx

```typescript
// loadConversations com filtro de sessão
const loadConversations = async () => {
  if (!companyId) return;
  
  let query = supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('company_id', companyId);
  
  // NOVO: Filtrar por sessão selecionada
  if (selectedSessionId) {
    query = query.eq('session_id', selectedSessionId);
  }
  
  const { data, error } = await query
    .order('last_message_at', { ascending: false })
    .limit(200);
  // ... resto do código
};

// useEffect que recarrega ao trocar sessão
useEffect(() => {
  if (companyId && selectedSessionId) {
    loadConversations();
  }
}, [selectedSessionId]);
```

### Alterações em WhatsAppSyncScreen.tsx

```typescript
// Tela simplificada e limpa
return (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
    {/* Logo SVG grande */}
    <div className="mb-8">
      <svg width="200" viewBox="0 0 981 406" ...>
        {/* Apenas o logo, sem barra de progresso */}
      </svg>
    </div>

    {/* Barra de progresso separada */}
    <div className="w-80 mb-6">
      <div className="h-4 rounded-full bg-gray-100 overflow-hidden">
        <div 
          className="h-full rounded-full bg-[#FF4500] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-center text-sm text-gray-500 mt-2">
        {Math.round(progress)}%
      </p>
    </div>

    {/* Mensagem de status */}
    <p className="text-lg font-medium text-[#FF4500]">
      {syncMessages[messageIndex]}
    </p>
  </div>
);
```

### Alterações no Servidor Baileys

```javascript
// Após connection.open, forçar sync de metadados
socket.ev.on('connection.update', async (update) => {
  if (connection === 'open') {
    // ... código existente ...
    
    // NOVO: Forçar sync de metadados após 3s
    setTimeout(async () => {
      await syncAllMetadata(socket, session, webhookUrl, webhookSecret);
    }, 3000);
  }
});

async function syncAllMetadata(socket, session, webhookUrl, webhookSecret) {
  const chats = Array.from(session.allChats.values());
  
  for (const chat of chats) {
    const jid = chat.id || chat.jid;
    if (!jid) continue;
    
    // Buscar foto e metadados
    const metadata = await fetchContactMetadata(socket, jid);
    
    // Enviar webhook com dados enriquecidos
    await sendWebhook({
      event: 'contact.metadata',
      sessionId: session.sessionId,
      data: {
        jid,
        name: metadata.groupSubject || contactNamesCache.get(jid) || null,
        profilePicture: metadata.profilePicture
      }
    }, webhookUrl, webhookSecret);
  }
}
```

---

## Arquivos a Modificar

1. `src/components/CRM/WhatsAppCRM.tsx` - Filtro por sessão
2. `src/components/CRM/WhatsAppSyncScreen.tsx` - Redesign completo
3. `docs/baileys-server-template/baileys-server-v4.4.0/index.js` - Sync de metadados

## Resultado Esperado

- Ao alternar canais, as conversas mudam instantaneamente
- Tela de sync limpa, elegante, com fundo branco e logo laranja
- Sincronização completa com nomes e fotos em até 60 segundos
- Grupos com nomes e fotos corretos
- UX 100% funcional e profissional
