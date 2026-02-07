
# Plano de Implementação Completo

Este plano aborda 5 melhorias principais: correção do status de mensagens da IA, chat no modo Kanban, redesign de páginas, e criação do Lead Capture Builder (estilo inlead.digital).

---

## 1. Correção do Status de Mensagens da IA no CRM WhatsApp

### Problema Identificado
A mensagem da IA é enviada com sucesso para o WhatsApp (confirmado no print), porém no sistema aparece como "não enviada". O problema está na lógica de atualização do status após o envio.

### Causa Raiz
No webhook `whatsapp-webhook/index.ts`, a mensagem é inserida com `status: 'sending'`, e depois atualizada para `status: 'sent'` após confirmação. Porém, se o endpoint `/api/message/send-text` retornar sucesso mas sem confirmação real, o status permanece como `sending`.

### Solução Técnica
1. **Melhorar a verificação de envio no webhook**: Verificar o retorno do Baileys server de forma mais robusta
2. **Atualizar o status mesmo em caso de resposta parcial**: Se o Baileys confirmar que recebeu a solicitação, marcar como `sent`
3. **Adicionar fallback de atualização**: Se a resposta HTTP for 200, considerar sucesso

### Arquivos a Modificar
- `supabase/functions/whatsapp-webhook/index.ts`

---

## 2. Chat Sidebar no Modo Kanban

### Descrição
Adicionar capacidade de abrir um chat completo diretamente do modo Kanban, sem precisar trocar para o modo Lista.

### Implementação
1. **Criar componente KanbanChatSidebar**: Um Sheet (drawer lateral) que exibe o chat completo
2. **Integrar ao WhatsAppKanbanView**: Ao clicar no card, abrir o sidebar ao invés de trocar de view
3. **Reutilizar componentes existentes**: Usar a mesma lógica de mensagens do `WhatsAppCRM`

### Arquivos a Criar/Modificar
- **Criar**: `src/components/CRM/KanbanChatSidebar.tsx`
- **Modificar**: `src/components/CRM/WhatsAppKanbanView.tsx`
- **Modificar**: `src/components/CRM/WhatsAppCRM.tsx`

### Fluxo de Interação
```text
Kanban Card → Clique → Abre Sheet lateral direito → Chat completo com input
                        (conversa + mensagens + envio)
```

---

## 3. Redesign das Páginas (Estilo /email)

### Páginas a Redesenhar
O design do `/email` serve como referência: limpo, com header + stats + tabs.

| Página | Componente | Melhorias |
|--------|-----------|-----------|
| `/email-template` | EmailTemplatesManager | Header com ícone, stats cards, grid de templates |
| `/bot-ia` | BotIADashboard | Header padrão, estatísticas, grid de agentes |
| `/chatbot` | ChatbotManagement | Header padrão, estatísticas, cards de fluxos |
| `/cadastros` | UnifiedCadastros | Header com ícone, tabs estilizados, stats |

### Padrão Visual a Aplicar
- Header: Ícone com background primary/10 + título + descrição
- Stats: 4 cards em grid (2x2 mobile, 4x1 desktop)
- Conteúdo principal: Card com tabs integrados
- Cores: Usar cores primárias do sistema (azul `#3600FF`)

### Arquivos a Modificar
- `src/components/Dashboard/EmailTemplatesManager.tsx`
- `src/components/BotIA/BotIADashboard.tsx`
- `src/components/BotIA/ChatbotManagement.tsx`
- `src/components/Dashboard/UnifiedCadastros.tsx`

---

## 4. Lead Capture Builder (Estilo inlead.digital) - NOVA FEATURE

### Visão Geral
Criar um sistema completo de funis de captura de leads interativos, similar ao inlead.digital, permitindo criar formulários step-by-step com:
- Múltiplos tipos de elementos (texto, escolha única, múltipla escolha, botões, etc.)
- Analytics de cada etapa (visualizações, abandonos, conversões)
- URL pública para compartilhamento

### 4.1 Estrutura de Banco de Dados (Novas Tabelas)

```sql
-- Tabela principal dos funis
CREATE TABLE lead_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Etapas do funil
CREATE TABLE lead_funnel_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES lead_funnels(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  step_type TEXT NOT NULL, -- 'text', 'single_choice', 'multiple_choice', 'email', 'phone', 'cta'
  title TEXT,
  description TEXT,
  content JSONB DEFAULT '{}', -- Opções, placeholder, validações
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Submissões/Leads capturados
CREATE TABLE lead_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES lead_funnels(id),
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  current_step INTEGER DEFAULT 1,
  answers JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}', -- IP, user agent, referrer
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Eventos de tracking por etapa
CREATE TABLE lead_step_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL,
  step_id UUID NOT NULL,
  submission_id UUID,
  event_type TEXT NOT NULL, -- 'view', 'start', 'complete', 'skip', 'abandon'
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
```

### 4.2 Componentes a Criar

| Componente | Descrição |
|------------|-----------|
| `LeadFunnelsManager.tsx` | Dashboard principal - lista todos os funis |
| `LeadFunnelBuilder.tsx` | Constructor visual drag-and-drop |
| `LeadFunnelPreview.tsx` | Preview em tempo real |
| `LeadFunnelAnalytics.tsx` | Dashboard de métricas |
| `PublicLeadFunnel.tsx` | Página pública para responder o funil |
| `LeadFunnelElements.tsx` | Componentes dos elementos (texto, escolhas, etc.) |

### 4.3 Tipos de Elementos do Builder

| Elemento | Descrição | Ícone |
|----------|-----------|-------|
| **Texto** | Campo de texto livre (nome, etc.) | Type |
| **Email** | Input de email com validação | Mail |
| **Telefone** | Input de telefone com máscara | Phone |
| **Escolha Única** | Radio buttons ou cards | CircleDot |
| **Múltipla Escolha** | Checkboxes | CheckSquare |
| **Escala** | Rating 1-10 ou estrelas | Star |
| **Botão/CTA** | Botão de ação final | MousePointer |
| **Separador** | Texto ou imagem entre steps | Minus |

### 4.4 Fluxo do Usuário

```text
1. Dashboard /leads → Ver todos os funis criados
2. Clicar "Novo Funil" → Abrir Builder
3. No Builder:
   - Arrastar elementos da paleta para o canvas
   - Configurar cada elemento (título, opções, validações)
   - Preview em tempo real no lado direito
   - Salvar e ativar
4. Compartilhar link público: /f/{slug}
5. Ver Analytics: conversões, abandonos por etapa, tempo médio
```

### 4.5 Rotas

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/dashboard/leads` | LeadFunnelsManager | Lista de funis |
| `/dashboard/leads/builder` | LeadFunnelBuilder | Criador/editor |
| `/dashboard/leads/analytics/:id` | LeadFunnelAnalytics | Métricas |
| `/f/:slug` | PublicLeadFunnel | Página pública (sem auth) |

### 4.6 Analytics Disponíveis

- **Visualizações totais**: Quantos acessaram o funil
- **Taxa de início**: % que iniciou vs visualizou
- **Taxa de conversão**: % que completou
- **Abandono por etapa**: Gráfico mostrando onde as pessoas param
- **Tempo médio**: Quanto tempo para completar
- **Leads capturados**: Lista com todos os dados

---

## 5. Integração com Menu e Navegação

### Mega Menu Header
Adicionar "Leads" no menu "Flow" do header:
- Ícone: Target ou Users
- Link: `/dashboard/leads`

### Sidebar
Adicionar item "Captura de Leads" na seção "Flow Hub"

---

## Detalhes Técnicos Adicionais

### Edge Functions Necessárias
1. **lead-funnel-events**: Para tracking de eventos sem auth
2. **lead-submission**: Para salvar respostas

### RLS Policies
- Funis e steps: Apenas usuários da empresa podem ver/editar
- Submissions: Apenas usuários da empresa podem ver
- Eventos de tracking: Insert público (para tracking anônimo)

### Hooks a Criar
- `useLeadFunnels.tsx`: CRUD de funis
- `useLeadAnalytics.tsx`: Métricas e estatísticas

---

## Resumo das Alterações

| Categoria | Arquivos | Tipo |
|-----------|---------|------|
| Bug Fix - AI Status | 1 arquivo | Modificação |
| Kanban Chat | 3 arquivos | 1 novo, 2 modificações |
| Redesign páginas | 4 arquivos | Modificação |
| Lead Capture | ~12 arquivos | Novos |
| Database | 4 tabelas | Novas migrations |
| Navegação | 2 arquivos | Modificação |

**Total estimado**: ~22 arquivos novos/modificados
