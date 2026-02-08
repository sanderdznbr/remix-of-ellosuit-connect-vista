

# Plano: Sistema de Assinatura Modular para Empresas

## Visão Geral

Sistema de assinatura B2B focado em **EMPRESAS**, onde o cliente (empresa) pode:
- Cadastrar múltiplos funcionários (custo adicional por usuário)
- Ter múltiplos CRMs WhatsApp com alternância entre eles
- Criar múltiplas agendas online
- Comprar add-ons conforme necessidade de crescimento

O **Ellosuit Base** é obrigatório e os módulos (Omni, Flow, Track) são complementares.

---

## Arquitetura de Preços (Atualizada)

### Plano Base Obrigatório: **Ellosuit Base**

| Recurso | Incluído no Base |
|---------|------------------|
| Dashboard e Home | Sim |
| Gestão (Cadastros unificados) | Sim |
| Drive (5 GB) | Sim |
| Analytics e Relatórios | Sim |
| Configurações | Sim |
| **2 Usuários** | Sim |

**Preço:** R$ 97/mês (ou R$ 970/ano - 17% desconto)

---

### Módulos Adicionais

#### **Omni** (Comunicação) - Cor: #E34800

| Recurso | Limite Base |
|---------|-------------|
| CRM WhatsApp | 1 sessão (pode comprar mais) |
| Email Marketing | 2.000/mês |
| Agentes de IA | 2 agentes |
| ChatBot Builder | 3 fluxos |
| Alternância de CRMs | Sim |

**Preço:** R$ 147/mês (ou R$ 1.470/ano)

---

#### **Flow** (Produtividade) - Cor: #007DE3

| Recurso | Limite Base |
|---------|-------------|
| Minha Agenda | Ilimitado |
| Agenda Online | 2 links (pode comprar mais) |
| Tarefas | Ilimitado |
| Videoconferência | 8 participantes |
| Gravação de Reuniões | 5 horas/mês |
| Fluxos de Trabalho | 5 quadros |

**Preço:** R$ 97/mês (ou R$ 970/ano)

---

#### **Track** (Rastreamento) - Cor: #00E371

| Recurso | Limite Base |
|---------|-------------|
| Rastrear Documentos | 100/mês |
| Rastrear Links | 200/mês |
| Rastrear Vídeos | 50/mês |
| Rastrear Emails | Integrado com Omni |
| Analytics de Rastreamento | Sim |

**Preço:** R$ 67/mês (ou R$ 670/ano)

---

### Combos (Desconto de 15%)

| Combo | Módulos Inclusos | Usuários | Mensal | Anual |
|-------|------------------|----------|--------|-------|
| **Essencial** | Base + 1 módulo | 2 | R$ 194-244/mês | Varia |
| **Pro** | Base + Omni + Flow | 5 | R$ 297/mês | R$ 2.970/ano |
| **Business** | Base + Omni + Flow + Track | 10 | R$ 397/mês | R$ 3.970/ano |
| **Enterprise** | Tudo ilimitado | Ilimitado | R$ 797/mês | R$ 7.970/ano |

---

### Add-ons (Compras Avulsas por Empresa)

| Add-on | Preço Mensal | Descrição |
|--------|--------------|-----------|
| +1 Usuário (funcionário) | R$ 29/mês | Por usuário adicional |
| +5 Usuários | R$ 119/mês | Pacote economia |
| +10 GB Armazenamento | R$ 19/mês | Espaço extra no Drive |
| +50 GB Armazenamento | R$ 79/mês | Pacote economia |
| +1 Sessão WhatsApp CRM | R$ 67/mês | CRM adicional |
| +3 Sessões WhatsApp | R$ 167/mês | Pacote economia |
| +2.000 Emails | R$ 29/mês | Créditos extras |
| +1 Agente IA | R$ 39/mês | Agente adicional |
| +5 Agentes IA | R$ 159/mês | Pacote economia |
| +1 Agenda Online | R$ 19/mês | Link extra de booking |
| +5 Agendas Online | R$ 79/mês | Pacote economia |
| Gravação Reuniões (+10h) | R$ 49/mês | Horas extras |
| +100 Docs Rastreados | R$ 29/mês | Limite extra |
| Suporte Prioritário | R$ 97/mês | Atendimento VIP |

---

## Estrutura do Banco de Dados

### Novas Tabelas a Criar

```text
subscriptions (Assinatura principal da empresa)
+---------------------------+---------------------------+
| Coluna                    | Tipo                      |
+---------------------------+---------------------------+
| id                        | uuid (PK)                 |
| company_id                | uuid (FK -> companies)    |
| plan_type                 | enum (base, pro, business, enterprise, custom) |
| billing_cycle             | enum (monthly, yearly)    |
| status                    | enum (active, canceled, past_due, trialing) |
| base_users_included       | integer (default: 2)      |
| current_period_start      | timestamptz               |
| current_period_end        | timestamptz               |
| trial_ends_at             | timestamptz (nullable)    |
| stripe_subscription_id    | text (nullable)           |
| stripe_customer_id        | text (nullable)           |
| monthly_price             | decimal                   |
| created_at / updated_at   | timestamptz               |
+---------------------------+---------------------------+
```

```text
subscription_modules (Módulos ativos por empresa)
+---------------------------+---------------------------+
| Coluna                    | Tipo                      |
+---------------------------+---------------------------+
| id                        | uuid (PK)                 |
| subscription_id           | uuid (FK)                 |
| company_id                | uuid (FK)                 |
| module_type               | enum (omni, flow, track)  |
| is_active                 | boolean                   |
| activated_at              | timestamptz               |
| expires_at                | timestamptz (nullable)    |
| monthly_price             | decimal                   |
+---------------------------+---------------------------+
```

```text
subscription_addons (Add-ons comprados pela empresa)
+---------------------------+---------------------------+
| Coluna                    | Tipo                      |
+---------------------------+---------------------------+
| id                        | uuid (PK)                 |
| subscription_id           | uuid (FK)                 |
| company_id                | uuid (FK)                 |
| addon_type                | enum (users, storage, emails, ai_agents, whatsapp_sessions, booking_links, meeting_hours, tracked_docs, priority_support) |
| quantity                  | integer                   |
| unit_price                | decimal                   |
| is_active                 | boolean                   |
| purchased_at              | timestamptz               |
| expires_at                | timestamptz (nullable)    |
+---------------------------+---------------------------+
```

```text
subscription_limits (Limites consolidados por empresa)
+---------------------------+---------------------------+
| Coluna                    | Tipo                      |
+---------------------------+---------------------------+
| id                        | uuid (PK)                 |
| company_id                | uuid (FK, unique)         |
| max_users                 | integer (default: 2)      |
| max_storage_gb            | integer (default: 5)      |
| max_emails_month          | integer (default: 0)      |
| max_ai_agents             | integer (default: 0)      |
| max_whatsapp_sessions     | integer (default: 0)      |
| max_booking_links         | integer (default: 0)      |
| max_meeting_hours         | integer (default: 0)      |
| max_tracked_docs          | integer (default: 0)      |
| max_tracked_links         | integer (default: 0)      |
| max_tracked_videos        | integer (default: 0)      |
| has_priority_support      | boolean (default: false)  |
| updated_at                | timestamptz               |
+---------------------------+---------------------------+
```

```text
subscription_usage (Uso atual no período)
+---------------------------+---------------------------+
| Coluna                    | Tipo                      |
+---------------------------+---------------------------+
| id                        | uuid (PK)                 |
| company_id                | uuid (FK)                 |
| resource_type             | enum (users, storage_gb, emails_sent, ai_agents_active, whatsapp_sessions_active, booking_links_active, meeting_hours_used, tracked_docs_created, tracked_links_created, tracked_videos_created) |
| current_usage             | integer                   |
| period_start              | date                      |
| period_end                | date                      |
| updated_at                | timestamptz               |
+---------------------------+---------------------------+
```

---

## Fluxo de Funcionários (Multi-usuário)

### Como Funciona

1. **Empresa cria conta** -> Recebe plano Base com 2 usuários inclusos
2. **Admin convida funcionários** -> Sistema verifica limite de usuários
3. **Se limite excedido** -> Mostra modal de upgrade para comprar +usuários
4. **Funcionários têm permissões granulares** -> Já implementado em ImprovedUserManagement.tsx

### Verificação de Limite

```typescript
// Antes de adicionar funcionário
const { currentUsers, maxUsers } = useSubscription();

if (currentUsers >= maxUsers) {
  showUpgradeModal('users'); // Mostra opção de comprar +usuários
  return;
}
```

---

## Fluxo de Múltiplos CRMs WhatsApp

### Como Funciona

1. **Com módulo Omni** -> 1 sessão WhatsApp incluída
2. **Usuário quer mais CRMs** -> Compra add-on de sessões
3. **Interface de alternância** -> Dropdown no topo do CRM para trocar entre sessões
4. **Cada sessão independente** -> Conversas e contatos separados por session_id

### Verificação

```typescript
const { whatsappSessionsActive, maxWhatsappSessions } = useSubscription();

if (whatsappSessionsActive >= maxWhatsappSessions) {
  showUpgradeModal('whatsapp_sessions');
  return;
}
```

---

## Fluxo de Múltiplas Agendas Online

### Como Funciona

1. **Com módulo Flow** -> 2 links de agenda incluídos
2. **Usuário quer mais agendas** -> Compra add-on de booking links
3. **Cada agenda pode ser atribuída** -> A funcionários diferentes
4. **Links únicos** -> /agendar/empresa/funcionario-1, /agendar/empresa/funcionario-2

---

## Interface da Página /dashboard/assinatura

### Layout em Seções

**1. Header Hero**
- Logo Ellosuit com animação
- Título: "Escale sua empresa com o Ellosuit"
- Subtítulo: "Monte o plano ideal para seu time"

**2. Seção: Plano Base (Obrigatório)**
- Card grande destacado
- "Incluído em todos os planos"
- Lista de recursos base
- "Já inclui 2 usuários"

**3. Seção: Módulos**
- 3 cards coloridos (Omni laranja, Flow azul, Track verde)
- Checkbox/Toggle para ativar cada um
- Preço individual exibido
- Recursos listados em cada card

**4. Seção: Combos Sugeridos**
- Cards Pro, Business, Enterprise
- Badge "Economia de X%"
- "Inclui X usuários"
- Seleção rápida

**5. Seção: Personalize seu Plano (Add-ons)**
- Abas: Usuários | Armazenamento | Comunicação | Produtividade
- Cada aba mostra add-ons relevantes
- Seletores de quantidade
- Cálculo em tempo real

**6. Resumo Lateral (Sticky)**
- Lista de itens selecionados
- Subtotal por categoria
- Descontos aplicados
- **Total mensal/anual**
- Botão "Assinar Agora" / "Atualizar Plano"

**7. Seção: Uso Atual (se já assinante)**
- Cards com barras de progresso:
  - Usuários: 3/5 usados
  - Storage: 12/50 GB
  - Emails: 1.200/5.000 enviados
  - WhatsApp: 2/3 sessões
  - Agendas: 4/5 links
- Botões de upgrade rápido

**8. FAQ Atualizado**
- "Como adicionar funcionários?"
- "Posso ter vários WhatsApps?"
- "Como funcionam as agendas?"
- "Pagamento proporcional?"

---

## Hook useSubscription

Novo hook centralizado para toda verificação de limites:

```typescript
interface SubscriptionData {
  // Status
  isActive: boolean;
  planType: 'base' | 'pro' | 'business' | 'enterprise' | 'custom';
  billingCycle: 'monthly' | 'yearly';
  
  // Módulos
  hasOmni: boolean;
  hasFlow: boolean;
  hasTrack: boolean;
  
  // Limites
  limits: {
    maxUsers: number;
    maxStorageGb: number;
    maxEmailsMonth: number;
    maxAiAgents: number;
    maxWhatsappSessions: number;
    maxBookingLinks: number;
    maxMeetingHours: number;
    maxTrackedDocs: number;
    maxTrackedLinks: number;
    maxTrackedVideos: number;
    hasPrioritySupport: boolean;
  };
  
  // Uso atual
  usage: {
    currentUsers: number;
    storageUsedGb: number;
    emailsSentThisMonth: number;
    aiAgentsActive: number;
    whatsappSessionsActive: number;
    bookingLinksActive: number;
    meetingHoursUsed: number;
    trackedDocsCreated: number;
    trackedLinksCreated: number;
    trackedVideosCreated: number;
  };
  
  // Helpers
  hasModule: (module: 'omni' | 'flow' | 'track') => boolean;
  checkLimit: (resource: string) => boolean;
  getUsagePercent: (resource: string) => number;
  canAddUser: () => boolean;
  canAddWhatsApp: () => boolean;
  canAddBookingLink: () => boolean;
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/Dashboard/SubscriptionPage.tsx` | Reescrever completamente |
| `src/components/Dashboard/subscription/ModuleCard.tsx` | Novo - Card de módulo |
| `src/components/Dashboard/subscription/AddonSelector.tsx` | Novo - Seletor de add-ons |
| `src/components/Dashboard/subscription/PricingSummary.tsx` | Novo - Resumo lateral |
| `src/components/Dashboard/subscription/UsageDashboard.tsx` | Novo - Uso atual |
| `src/components/Dashboard/subscription/ComboCard.tsx` | Novo - Card de combo |
| `src/hooks/useSubscription.tsx` | Novo - Hook central |
| `src/components/shared/UpgradeModal.tsx` | Novo - Modal de upgrade |
| Migration SQL | Nova - Criar tabelas |

---

## Enums SQL

```sql
CREATE TYPE plan_type AS ENUM ('base', 'pro', 'business', 'enterprise', 'custom');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
CREATE TYPE module_type AS ENUM ('omni', 'flow', 'track');
CREATE TYPE addon_type AS ENUM (
  'users', 'storage', 'emails', 'ai_agents', 
  'whatsapp_sessions', 'booking_links', 'meeting_hours', 
  'tracked_docs', 'priority_support'
);
CREATE TYPE resource_type AS ENUM (
  'users', 'storage_gb', 'emails_sent', 'ai_agents_active',
  'whatsapp_sessions_active', 'booking_links_active', 
  'meeting_hours_used', 'tracked_docs_created',
  'tracked_links_created', 'tracked_videos_created'
);
```

---

## Resumo de Preços Final

| Plano | Usuários | Mensal | Anual | Economia |
|-------|----------|--------|-------|----------|
| Base | 2 | R$ 97 | R$ 970 | R$ 194 |
| Base + Omni | 2 | R$ 244 | R$ 2.440 | R$ 488 |
| Base + Flow | 2 | R$ 194 | R$ 1.940 | R$ 388 |
| Base + Track | 2 | R$ 164 | R$ 1.640 | R$ 328 |
| **Pro** (Base+Omni+Flow) | **5** | R$ 297 | R$ 2.970 | R$ 594 |
| **Business** (Tudo) | **10** | R$ 397 | R$ 3.970 | R$ 794 |
| **Enterprise** | **Ilimitado** | R$ 797 | R$ 7.970 | R$ 1.594 |

---

## Próximos Passos

Após aprovação:
1. Criar migration com todas as tabelas de subscription
2. Implementar hook useSubscription
3. Reescrever página /dashboard/assinatura
4. Criar componentes auxiliares
5. Integrar verificações de limite em pontos críticos (adicionar usuário, criar sessão WhatsApp, criar agenda)

