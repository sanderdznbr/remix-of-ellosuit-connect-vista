
# Plano: Correção Completa do WhatsApp CRM

## Resumo do Problema
O CRM não está sincronizando corretamente as conversas do WhatsApp:
- Grupos aparecem com ID numérico ao invés do nome
- Nome da pessoa que enviou não aparece nos grupos  
- Novas mensagens não aparecem em tempo real
- Conversas duplicadas no banco de dados
- Muitas conversas válidas não são exibidas

## Solução em 5 Partes

### Parte 1: Corrigir Webhook para Grupos
**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

Modificações:
1. No evento `chats.set`, adicionar suporte para `groupSubject`:
   - Linha ~210: `chat.groupSubject || chat.subject || chat.name || ...`

2. No evento `messages.upsert`, sempre atualizar nome do grupo:
   - Linha ~575: Remover condição `!fromMe` para grupos com nome válido

3. Adicionar log detalhado para debug de grupos

### Parte 2: Atualizar Servidor Baileys v3.5.0
**Arquivo:** `docs/baileys-server-template/` + Download component

Melhorias:
1. Buscar `groupMetadata` para TODOS os grupos no `chats.set` e `messages.upsert`
2. Extrair `sender_phone` corretamente do participant JID
3. Adicionar campo `isGroup` em todos os payloads
4. Melhorar logging para facilitar debug

### Parte 3: Corrigir Frontend
**Arquivo:** `src/components/CRM/WhatsAppCRM.tsx`

Modificações:
1. **Remover filtro restritivo** de grupos:
   - Mostrar todas conversas, mesmo sem nome resolvido
   - Exibir ID formatado quando nome não disponível

2. **Melhorar detecção de grupos**:
   - Usar `@g.us` ou comprimento do ID para identificar
   - Mostrar ícone diferente para grupos

3. **Consolidar conversas duplicadas**:
   - Usar apenas a mais recente por `contact_phone`

4. **Melhorar exibição de sender_name**:
   - Sempre mostrar nome do remetente em grupos
   - Cores diferentes por remetente

### Parte 4: Melhorar Real-time
**Arquivo:** `src/components/CRM/WhatsAppCRM.tsx`

Modificações:
1. Reduzir polling para 300ms em conversas ativas
2. Forçar refresh após enviar mensagem
3. Adicionar indicador visual de sincronização
4. Melhorar deduplicação de mensagens

### Parte 5: Limpeza de Dados
**SQL Migration**

Script para:
1. Consolidar conversas duplicadas (manter mais recente)
2. Atualizar nomes de grupos com dados das mensagens
3. Limpar conversas órfãs (sem mensagens)

## Detalhamento Técnico

### Webhook - Evento chats.set
```text
ANTES:
contactName = chat.name || chat.notify || chat.pushName || phoneNumber;

DEPOIS:
// Para grupos: priorizar groupSubject
if (isGroup) {
  contactName = chat.groupSubject || chat.subject || chat.name || phoneNumber;
} else {
  contactName = chat.name || chat.notify || chat.pushName || phoneNumber;
}
```

### Webhook - Evento messages.upsert
```text
ANTES:
if (!fromMe && contactName && contactName !== phoneNumber) {
  updateData.contact_name = contactName;
}

DEPOIS:
// Para grupos: SEMPRE atualizar se tivermos nome válido
if (isGroup && contactName && contactName !== phoneNumber) {
  updateData.contact_name = contactName;
} else if (!fromMe && contactName && contactName !== phoneNumber) {
  updateData.contact_name = contactName;
}
```

### Frontend - Filtro de Conversas
```text
ANTES:
// Esconde grupos sem nome
if (digits.length >= 16 && !conv.contact_name) return false;

DEPOIS:
// Mostra todos - formata ID quando necessário
// Não filtra mais por falta de nome
return digits.length >= 8;
```

### Frontend - Exibição de Nome
```text
// Formatar ID de grupo quando não tem nome
const displayName = conv.contact_name && conv.contact_name !== conv.contact_phone
  ? conv.contact_name
  : conv.contact_phone.length > 15 
    ? `Grupo ${conv.contact_phone.substring(0, 8)}...`
    : conv.contact_phone;
```

### Servidor Baileys - Sender Phone
```text
// Extrair phone do participant corretamente
if (isGroup && !fromMe && msg.key.participant) {
  const participantJid = msg.key.participant;
  senderPhone = participantJid.split('@')[0].replace(/\D/g, '');
  senderName = msg.pushName || '';
}
```

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/whatsapp-webhook/index.ts` | Corrigir lógica de grupos |
| `src/components/CRM/WhatsAppCRM.tsx` | Remover filtros, melhorar UI |
| `docs/baileys-server-template/baileys-server-v3.5.0/` | Nova versão do servidor |
| `src/components/CRM/BaileysServerDownload.tsx` | Atualizar para v3.5.0 |

## Resultado Esperado

Após implementação:
- Todos os grupos aparecerão com seus nomes reais
- Mensagens de grupo mostrarão quem enviou
- Novas mensagens aparecerão instantaneamente
- Interface mais limpa e organizada
- Conversas consolidadas sem duplicatas

## Próximos Passos do Usuário

1. Aprovar este plano
2. Após implementação, **baixar novo servidor v3.5.0**
3. No Railway: substituir arquivos e deletar pasta `sessions/`
4. Reconectar WhatsApp escaneando QR code
5. Aguardar sincronização (pode levar alguns minutos para contas grandes)
