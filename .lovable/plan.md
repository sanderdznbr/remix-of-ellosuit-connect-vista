
# Plano: Correcao de Mensagens Duplicadas e UI Instantanea no WhatsApp CRM

## Problemas Identificados

### 1. Mensagens Duplicadas Para Si Mesmo
O webhook cria conversas para TODAS as mensagens, incluindo as enviadas pelo proprio numero conectado. Nao ha verificacao no backend para filtrar self-messages.

### 2. Delay na Exibicao de Mensagens
O polling de 500ms em `loadMessagesByPhone` substitui TODAS as mensagens pelo resultado do banco de dados. Quando uma mensagem otimista e adicionada com ID `temp-...`, ela e removida no proximo ciclo porque nao existe no banco ainda.

**Fluxo atual problemático:**
```text
1. Usuario digita "Oi" e aperta Enter
2. Mensagem otimista {id: "temp-123", content: "Oi", status: "sending"} adicionada
3. 500ms depois, polling chama loadMessagesByPhone()
4. Banco retorna [] (mensagem ainda nao chegou)
5. setMessages([]) - MENSAGEM OTIMISTA PERDIDA!
6. 500ms depois, banco retorna a mensagem real
7. Usuario vê a mensagem aparecer com delay
```

---

## Solucao 1: Corrigir Filtragem de Self-Messages no Frontend

**Arquivo**: `src/components/CRM/WhatsAppCRM.tsx`

O filtro atual (linha 993-998) depende apenas de `connectedSessions[0]?.phone_number`, mas precisa verificar TODOS os numeros conectados e normalizar os formatos.

**Mudanca**:
```typescript
// Extrair todos os numeros conectados (normalizados)
const connectedPhones = connectedSessions
  .map(s => s.phone_number?.replace(/\D/g, ''))
  .filter(Boolean);

// No filtro de conversas:
const contactPhone = conv.contact_phone?.replace(/\D/g, '');
if (connectedPhones.some(cp => cp === contactPhone || 
    cp?.endsWith(contactPhone) || contactPhone?.endsWith(cp))) {
  return false; // Excluir self-chat
}
```

---

## Solucao 2: Preservar Mensagens Otimistas Durante Polling

**Arquivo**: `src/components/CRM/WhatsAppCRM.tsx`

Modificar `loadMessagesByPhone` para:
1. Manter mensagens com ID `temp-...` no estado
2. Substituir mensagens temp apenas quando encontrar correspondencia real
3. Usar conteudo + timestamp aproximado para fazer match

**Nova logica de merge**:
```typescript
setMessages(prev => {
  // Separar mensagens temporarias das reais
  const tempMessages = prev.filter(m => m.id.startsWith('temp-'));
  
  // Para cada mensagem temp, verificar se existe correspondencia no banco
  const matchedTempIds = new Set<string>();
  const serverMessages = sorted.map(serverMsg => {
    // Procurar mensagem temp correspondente (mesmo conteudo, timestamp proximo)
    const matchingTemp = tempMessages.find(temp => 
      temp.content === serverMsg.content && 
      temp.from_me === serverMsg.from_me &&
      !matchedTempIds.has(temp.id) &&
      Math.abs(new Date(temp.created_at).getTime() - new Date(serverMsg.created_at).getTime()) < 60000
    );
    
    if (matchingTemp) {
      matchedTempIds.add(matchingTemp.id);
    }
    return serverMsg;
  });
  
  // Manter mensagens temp que ainda nao tem correspondencia no servidor
  const unmatchedTemp = tempMessages.filter(t => !matchedTempIds.has(t.id));
  
  // Combinar: mensagens do servidor + mensagens temp nao correspondidas
  const combined = [...serverMessages, ...unmatchedTemp]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  // Evitar re-render se nada mudou
  const prevSignature = prev.map(m => `${m.id}-${m.status}`).join(',');
  const newSignature = combined.map(m => `${m.id}-${m.status}`).join(',');
  if (prevSignature === newSignature) return prev;
  
  return combined;
});
```

---

## Solucao 3: Filtrar Self-Messages no Webhook (Backend)

**Arquivo**: `supabase/functions/whatsapp-webhook/index.ts`

Adicionar verificacao no processamento de mensagens para ignorar mensagens onde o `phoneNumber` e igual ao numero da sessao conectada.

**Mudanca no case 'messages.upsert'**:
```typescript
// Apos obter session info, obter numero da sessao
const { data: sessionInfo } = await supabase
  .from('whatsapp_sessions')
  .select('phone_number, company_id')
  .eq('id', targetSessionId)
  .single();

const sessionPhone = sessionInfo?.phone_number?.replace(/\D/g, '');
const contactPhone = phoneNumber?.replace(/\D/g, '');

// Ignorar mensagens para si mesmo
if (sessionPhone && contactPhone && 
    (sessionPhone === contactPhone || 
     sessionPhone.endsWith(contactPhone) || 
     contactPhone.endsWith(sessionPhone))) {
  console.log('Skipping self-message');
  continue;
}
```

---

## Solucao 4: Adicionar Debounce no Input para Performance

**Arquivo**: `src/components/CRM/WhatsAppCRM.tsx`

Garantir que o input do usuario nao cause delay. O input atual ja usa estado controlado que e responsivo.

---

## Resumo de Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/CRM/WhatsAppCRM.tsx` | Logica de merge para preservar msgs temp + filtro de self-chat |
| `supabase/functions/whatsapp-webhook/index.ts` | Filtrar self-messages no backend |

---

## Fluxo Corrigido

```text
1. Usuario digita "Oi" e aperta Enter
2. Mensagem otimista {id: "temp-123", content: "Oi", status: "sending"} adicionada INSTANTANEAMENTE
3. Chamada API enviada em background
4. 500ms depois, polling chama loadMessagesByPhone()
5. Banco retorna [] (mensagem ainda nao chegou)
6. Merge preserva temp-123 pois nao ha correspondencia
7. Usuario continua vendo a mensagem (sem piscar)
8. Proximo polling: banco retorna mensagem real
9. Merge detecta correspondencia e substitui temp-123 pela real
10. Status muda de "sending" para "sent" - transicao suave
```

---

## Secao Tecnica

### Normalizacao de Numeros de Telefone
Os numeros de telefone podem vir em diferentes formatos:
- `5511999999999`
- `+55 11 99999-9999`
- `11999999999`

A normalizacao usando `.replace(/\D/g, '')` remove todos os caracteres nao-numericos.

Para comparacao, usamos `endsWith` porque alguns numeros podem ter ou nao o codigo do pais.

### Deduplicacao por wa_message_id
Mensagens reais do WhatsApp tem um `wa_message_id` unico. Mensagens otimistas tem ID `temp-...`. A logica de merge usa o conteudo e timestamp para fazer correspondencia entre temp e real.

### Janela de Tempo para Match
Usamos 60 segundos como janela para considerar uma mensagem temp como correspondente a uma real. Isso e suficiente para cobrir latencia de rede.
