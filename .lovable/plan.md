
# Plano: Corrigir Criação de Agentes de IA e Conectar ao Lovable AI

## Problema Identificado

O erro "Preencha todos os campos obrigatórios" ocorre porque:
1. A validação no código verifica `companyId` que vem de `user?.user_metadata?.company_id`
2. Se o usuário não tem `company_id` nos metadados, essa variável é `undefined`
3. A tabela `ai_agents` exige `company_id` como NOT NULL

Além disso:
- A edge function `ai-chat` usa `OPENAI_API_KEY` diretamente em vez do Lovable AI Gateway (recomendado)
- Não há suporte a streaming para respostas em tempo real

---

## Solução Proposta

### Parte 1: Corrigir Criação de Agentes

**Arquivo**: `src/components/BotIA/BotIADashboard.tsx`

Modificações:
- Criar função para auto-criar company se não existir
- Usar `user.id` como fallback para `company_id` quando não disponível
- Adicionar verificação e criação automática de company no carregamento

```text
Lógica:
1. Ao carregar o componente, verificar se usuário tem company_id
2. Se não tiver, criar automaticamente uma company com o nome do usuário
3. Atualizar os metadados do usuário com o novo company_id
4. Usar esse company_id para criar agentes
```

### Parte 2: Atualizar Edge Function para Lovable AI

**Arquivo**: `supabase/functions/ai-chat/index.ts`

Substituir implementação atual por:
- Usar Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`)
- Usar `LOVABLE_API_KEY` em vez de `OPENAI_API_KEY`
- Implementar suporte a streaming SSE
- Tratar erros 429 (rate limit) e 402 (payment required)
- Modelo padrão: `google/gemini-3-flash-preview`

```typescript
// Estrutura da nova edge function
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview",
    messages: [...],
    stream: true,
  }),
});
```

### Parte 3: Atualizar Chat com Streaming

**Arquivo**: `src/components/BotIA/BotIAChat.tsx`

Implementar:
- Parser SSE para streaming token-por-token
- Atualização progressiva das mensagens
- Indicador de "digitando" mais responsivo
- Tratamento de erros de rate limit

### Parte 4: Criar Tabela de Conversas (Opcional)

**Migração SQL** para persistir histórico de conversas:

```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/BotIA/BotIADashboard.tsx` | Modificar | Adicionar auto-criação de company e validação melhorada |
| `supabase/functions/ai-chat/index.ts` | Reescrever | Usar Lovable AI com streaming |
| `src/components/BotIA/BotIAChat.tsx` | Modificar | Implementar streaming SSE no frontend |
| `src/hooks/useAuth.tsx` | Modificar | Adicionar função para atualizar user metadata |
| Nova migração SQL | Criar | Tabela de conversas (opcional) |

---

## Fluxo de Funcionamento

```text
1. Usuário acessa "Agentes de IA"
   |
2. Sistema verifica se tem company_id
   |
   ├── SIM → Carrega agentes normalmente
   |
   └── NÃO → Cria company automaticamente
           → Atualiza user metadata
           → Prossegue com carregamento
   |
3. Usuário cria novo agente
   |
4. Agente salvo no banco com company_id válido
   |
5. Usuário clica "Conversar"
   |
6. Chat abre e envia mensagem
   |
7. Edge function processa via Lovable AI
   |
8. Resposta streamed em tempo real
```

---

## Detalhes Técnicos

### Modelo de IA Recomendado
- **Padrão**: `google/gemini-3-flash-preview` (rápido, eficiente)
- **Alternativas no select**: 
  - `google/gemini-2.5-flash` 
  - `google/gemini-2.5-pro` (para tarefas complexas)
  - `openai/gpt-5-mini`

### Tratamento de Erros
- **429 Too Many Requests**: "Limite de requisições atingido, tente novamente em alguns segundos"
- **402 Payment Required**: "Créditos insuficientes, adicione créditos na sua conta Lovable"
- **500 Internal Error**: Fallback genérico com retry

### Integração WhatsApp (Futuro)
A estrutura permite futura integração onde:
- Um webhook recebe mensagens do WhatsApp
- O agente processa e responde automaticamente
- Histórico é salvo na tabela de conversas

---

## Resultado Esperado

Após implementação:
1. Criação de agentes funcionará sem erros
2. Chat terá respostas em tempo real via streaming
3. Sistema usará Lovable AI (mais estável e gerenciado)
4. Usuários sem company serão tratados automaticamente
