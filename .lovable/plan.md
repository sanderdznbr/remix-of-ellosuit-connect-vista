
# Plano: Atualizar Servidor v3.0.0 e Corrigir Bug de Duplicação de Mensagens

## Resumo do Problema

### 1. Versão do Download (v2.9.6 → v3.0.0)
O modal de download do servidor Baileys está mostrando versão 2.9.6/2.9.8 quando deveria ser v3.0.0 com suporte completo a mídias.

### 2. Bug de Duplicação de Mensagens
Identificado que:
- Existem **2 sessões conectadas** para o mesmo número de WhatsApp
- Quando você envia uma mensagem para "Erica Duarte", ela aparece duplicada em outro contato (`14959756996822`)
- O número `14959756996822` é um **LID (Linked ID)** do WhatsApp que não está sendo filtrado

**Causa raiz**: O webhook processa mensagens `fromMe=true` vindas do servidor e pode criar conversas duplicadas entre sessões diferentes.

---

## Etapa 1: Atualizar BaileysServerDownload.tsx para v3.0.0

### Alterações:
1. Atualizar `version` de `2.9.8` para `3.0.0`
2. Mudar `"type": "module"` para `"type": "commonjs"` (conforme documentação v3.0.0)
3. Adicionar dependências para mídia: `@supabase/supabase-js`, `mime-types`
4. Substituir código do `index.js` pelo servidor v3.0.0 com suporte completo a mídia
5. Atualizar textos e novidades no modal

---

## Etapa 2: Corrigir Bug de Duplicação no Webhook

### 2.1 Filtrar Números LID Inválidos
Adicionar validação para ignorar números com formato LID que não são telefones reais:

```text
Validações a adicionar:
- Se o número tem mais de 15 dígitos → ignorar
- Se contém formato @lid → extrair número real ou ignorar
- Se já existe mensagem com mesmo wa_message_id → não duplicar
```

### 2.2 Evitar Duplicação de Mensagens Enviadas
Quando `fromMe=true`:
1. Verificar se a mensagem já foi salva pela `whatsapp-api` (pelo `wa_message_id`)
2. Se já existe, apenas atualizar status (não criar nova)
3. Usar `company_id` para encontrar conversa existente (não depender só de `session_id`)

### 2.3 Consolidar Conversas por Company
Ao processar mensagens, buscar conversa existente por `company_id + contact_phone` primeiro, antes de criar nova por `session_id`.

---

## Etapa 3: Melhorar Filtro no Frontend

### No WhatsAppCRM.tsx:
1. Filtrar números que parecem ser LIDs (> 15 dígitos)
2. Garantir que a deduplicação por `contact_phone` funcione corretamente
3. Usar apenas a sessão da conversa selecionada ao enviar mensagens

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/CRM/BaileysServerDownload.tsx` | Atualizar para v3.0.0 com suporte a mídia |
| `supabase/functions/whatsapp-webhook/index.ts` | Filtrar LIDs e evitar duplicação |
| `src/components/CRM/WhatsAppCRM.tsx` | Melhorar filtro de conversas no frontend |

---

## Resultado Esperado

1. **Download v3.0.0**: Modal mostrará versão 3.0.0 com suporte a mídia
2. **Sem duplicação**: Mensagens enviadas não aparecerão em conversas de outros contatos
3. **Números limpos**: LIDs inválidos serão filtrados automaticamente
