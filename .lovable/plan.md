
# Correção: Validação de Número WhatsApp Antes do Envio

## Problema

A API constrói o JID (identificador WhatsApp) diretamente a partir do telefone recebido, sem verificar se aquele número existe no WhatsApp. Isso causa falha silenciosa quando:

- O número tem o 9o dígito brasileiro extra (ex: 5541**9**96875461 vs 554196875461)
- O número está no formato diferente do registrado no WhatsApp

A mensagem retorna "sent" mas nunca chega ao destinatário real.

## Solução em 2 partes

### Parte 1: Novo endpoint no servidor Baileys (instrução para deploy)

Adicionar endpoint `/api/number/check` no servidor Baileys que usa a função `onWhatsApp()` do Baileys para resolver o JID correto de um número.

O usuário precisará atualizar o `index.js` do Baileys no Railway com este novo endpoint.

### Parte 2: Atualizar a Edge Function

Antes de enviar mensagem (texto ou mídia), a Edge Function vai:

1. Chamar `/api/number/check` no Baileys com o número fornecido
2. Se o número existir no WhatsApp, usar o JID retornado (que é o correto)
3. Se não existir, tentar variações do número brasileiro (com/sem 9o dígito)
4. Se nenhum funcionar, retornar erro claro ao chamador

## Detalhes Técnicos

### Novo endpoint no Baileys (`index.js`)

Adicionar antes dos endpoints de mensagem:

```text
POST /api/number/check
Body: { "instanceName": "xxx", "phone": "5541996875461" }
Response: { "exists": true, "jid": "554196875461@s.whatsapp.net" }
```

Internamente usa `socket.onWhatsApp(phone)` que retorna o JID real.

### Alterações na Edge Function (`whatsapp-public-api/index.ts`)

1. Criar função auxiliar `resolveWhatsAppJid()` que:
   - Chama o endpoint `/api/number/check` no Baileys
   - Se o número não for encontrado e for brasileiro (começa com 55), tenta remover ou adicionar o 9o dígito
   - Retorna o JID correto ou erro

2. Nos cases `send_text` e `send_media`:
   - Substituir a construção manual do JID pelo resultado de `resolveWhatsAppJid()`
   - Logar o JID resolvido para debug

### Fluxo corrigido

```text
Site externo envia: phone "5541996875461"
    |
    v
Edge Function chama: /api/number/check com "5541996875461"
    |
    v
Baileys onWhatsApp() retorna: jid "554196875461@s.whatsapp.net"
    |
    v
Edge Function envia para o JID correto
    |
    v
Mensagem chega ao contato real (Amor)
```

### Arquivo criado
- `docs/baileys-server-template/baileys-server-v4.6.0/number-check-endpoint.js` -- snippet para o usuário adicionar ao Baileys

### Arquivo modificado
- `supabase/functions/whatsapp-public-api/index.ts` -- adicionar resolução de JID antes do envio

## Instruções para o servidor Baileys (Railway)

O usuário precisará adicionar o endpoint `/api/number/check` ao `index.js` do Baileys no Railway. Será fornecido o código pronto para copiar e colar.

Vou implementar e atualizar o arquivo em crm-whatsapp servidor para bayleys 4.7.0

