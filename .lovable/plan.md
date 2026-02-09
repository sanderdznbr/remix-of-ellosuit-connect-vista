

# Plano: Cores Dinâmicas por Hub (Omni, Flow, Track)

## Objetivo
Implementar um sistema de cores dinâmicas onde:
1. Todas as páginas do **Omni** usam cor **#FF4500** (laranja)
2. Todas as páginas do **Flow** usam cor **#007DE3** (azul)
3. Todas as páginas do **Track** usam cor **#00E371** (verde)
4. O logo Ellosuit no header muda de cor conforme o hub ativo

## Mapeamento de Rotas por Hub

### Omni (#FF4500) - Comunicação
- `/dashboard/omni` - Hub principal
- `/dashboard/crm-whatsapp` - CRM WhatsApp
- `/dashboard/chatbot` - ChatBot Management
- `/dashboard/chatbot-builder` - ChatBot Builder
- `/dashboard/email` - Email Marketing
- `/dashboard/email-templates` - Templates de Email
- `/dashboard/email-builder` - Email Builder
- `/dashboard/bot-ia` - Agentes de IA
- `/dashboard/cadastros` - Banco de Clientes

### Flow (#007DE3) - Produtividade
- `/dashboard/flows` - Hub principal
- `/dashboard/agenda` - Minha Agenda
- `/dashboard/agenda-aberta` - Agenda Online
- `/dashboard/tasks` - Tarefas
- `/dashboard/reunioes` - Videoconferência
- `/dashboard/fluxos` - Fluxos de Trabalho
- `/dashboard/leads` - Captura de Leads

### Track (#00E371) - Rastreamento
- `/dashboard/track` - Hub principal
- `/dashboard/rastreamento` - Rastreamento Unificado
- `/dashboard/email-tracker` - Rastreamento de Emails

## Implementação

### 1. Criar Hook de Contexto de Cor

**Novo arquivo:** `src/hooks/useHubColor.tsx`

Este hook centraliza a lógica de detecção do hub ativo baseado na rota atual:

```text
Funcionalidades:
- Detecta automaticamente qual hub está ativo pela URL
- Retorna a cor correspondente (#FF4500, #007DE3, #00E371 ou padrão #3000E3)
- Retorna o ID do hub ativo (omni, flow, track, ou null)
- Pode ser usado em qualquer componente
```

### 2. Atualizar MegaMenuHeader

**Arquivo:** `src/components/Dashboard/MegaMenuHeader.tsx`

Modificações:
- Importar o hook `useHubColor`
- Alterar a cor do `<ElloLogo>` dinamicamente baseado no hub ativo
- Usar a cor do hub ativo no lugar de `#3000E3` fixo

```text
Antes:
<ElloLogo className="h-8 w-auto" color="#3000E3" />

Depois:
<ElloLogo className="h-8 w-auto" color={hubColor} />
```

### 3. Atualizar Cores nos Hubs

**Arquivo:** `src/components/Dashboard/OmniHub.tsx`
- Alterar `OMNI_COLOR` de `#E34800` para `#FF4500`

**Arquivo:** `src/components/Dashboard/MegaMenuHeader.tsx`
- Alterar `COLORS.omni` de `#E34800` para `#FF4500`

### 4. Atualizar Componentes do CRM (Omni)

**Arquivos a modificar:**
- `src/components/CRM/WhatsAppCRM.tsx`
- `src/components/CRM/SaveLeadModal.tsx`
- `src/components/CRM/ConversationLabelsManager.tsx`
- `src/components/CRM/WhatsAppQRModal.tsx`
- `src/components/CRM/ConversationContextMenu.tsx`
- `src/components/CRM/KanbanChatSidebar.tsx`

Mudanças:
- Substituir `bg-blue-600` por `bg-[#FF4500]`
- Substituir `hover:bg-blue-700` por `hover:bg-[#FF4500]/90`
- Substituir `text-blue-600` por `text-[#FF4500]`
- Substituir `text-blue-500` por `text-[#FF4500]`
- Manter cores do WhatsApp original (#25D366) para elementos específicos do WhatsApp

### 5. Atualizar ChatBot Builder (Omni)

**Arquivo:** `src/components/ChatBot/ChatBotBuilder.tsx`
- A constante `BRAND_COLOR` já é `#E34800`, atualizar para `#FF4500`

### 6. Atualizar BotIA Dashboard (Omni)

**Arquivo:** `src/components/BotIA/BotIADashboard.tsx`
- Verificar e atualizar botões e elementos de destaque para `#FF4500`

### 7. Atualizar Email Marketing (Omni)

**Arquivo:** `src/components/Dashboard/CleanEmailMarketing.tsx`
- Atualizar botões e elementos de destaque para `#FF4500`

### 8. Atualizar Componentes do Flow

**Arquivos a verificar:**
- `src/components/Dashboard/MyCalendar.tsx`
- `src/components/Dashboard/ImprovedAgendaAberta.tsx`
- `src/components/Tarefas/TarefasWeb.tsx`
- `src/components/Dashboard/MeetingRooms.tsx`
- `src/components/Fluxos/FluxosBoard.tsx`

Mudanças:
- Elementos de destaque devem usar `#007DE3`

### 9. Atualizar Componentes do Track

**Arquivos a verificar:**
- `src/components/Dashboard/UnifiedTracking.tsx`
- `src/components/Dashboard/SentEmailTracker.tsx`

Mudanças:
- Elementos de destaque devem usar `#00E371`

## Detalhes Técnicos

### Hook useHubColor

```typescript
// src/hooks/useHubColor.tsx
import { useLocation } from 'react-router-dom';

const OMNI_COLOR = '#FF4500';
const FLOW_COLOR = '#007DE3';
const TRACK_COLOR = '#00E371';
const DEFAULT_COLOR = '#3000E3';

const omniRoutes = [
  '/dashboard/omni',
  '/dashboard/crm-whatsapp',
  '/dashboard/chatbot',
  '/dashboard/chatbot-builder',
  '/dashboard/email',
  '/dashboard/email-templates',
  '/dashboard/email-builder',
  '/dashboard/bot-ia',
  '/dashboard/cadastros',
];

const flowRoutes = [
  '/dashboard/flows',
  '/dashboard/agenda',
  '/dashboard/agenda-aberta',
  '/dashboard/tasks',
  '/dashboard/reunioes',
  '/dashboard/fluxos',
  '/dashboard/leads',
];

const trackRoutes = [
  '/dashboard/track',
  '/dashboard/rastreamento',
  '/dashboard/email-tracker',
];

export function useHubColor() {
  const location = useLocation();
  const path = location.pathname;
  
  if (omniRoutes.some(route => path.startsWith(route))) {
    return { color: OMNI_COLOR, hub: 'omni' as const };
  }
  if (flowRoutes.some(route => path.startsWith(route))) {
    return { color: FLOW_COLOR, hub: 'flow' as const };
  }
  if (trackRoutes.some(route => path.startsWith(route))) {
    return { color: TRACK_COLOR, hub: 'track' as const };
  }
  
  return { color: DEFAULT_COLOR, hub: null };
}
```

### Exemplo de Atualização no WhatsAppCRM

```typescript
// Antes
<Button className="bg-blue-600 hover:bg-blue-700">

// Depois
<Button className="bg-[#FF4500] hover:bg-[#FF4500]/90">
```

### Exemplo no MegaMenuHeader

```typescript
// Importar o hook
import { useHubColor } from '@/hooks/useHubColor';

// Dentro do componente
const { color: hubColor, hub: activeHub } = useHubColor();

// No logo
<ElloLogo className="h-8 w-auto" color={hubColor} />
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useHubColor.tsx` | **Criar** - Hook de detecção de cor por hub |
| `src/components/Dashboard/MegaMenuHeader.tsx` | Logo dinâmico + COLORS.omni para #FF4500 |
| `src/components/Dashboard/OmniHub.tsx` | OMNI_COLOR para #FF4500 |
| `src/components/CRM/WhatsAppCRM.tsx` | Botões e elementos para #FF4500 |
| `src/components/CRM/SaveLeadModal.tsx` | Botões para #FF4500 |
| `src/components/CRM/ConversationLabelsManager.tsx` | Ícones para #FF4500 |
| `src/components/CRM/WhatsAppQRModal.tsx` | Elementos para #FF4500 |
| `src/components/CRM/ConversationContextMenu.tsx` | Ícones para #FF4500 |
| `src/components/CRM/KanbanChatSidebar.tsx` | Elementos para #FF4500 |
| `src/components/CRM/ChannelSelector.tsx` | Verificar consistência |
| `src/components/ChatBot/ChatBotBuilder.tsx` | BRAND_COLOR para #FF4500 |
| `src/components/BotIA/BotIADashboard.tsx` | Verificar cores |
| `src/components/Dashboard/CleanEmailMarketing.tsx` | Verificar cores |

## Resultado Esperado

1. Ao navegar para qualquer página do **Omni** (CRM, Email, ChatBot, etc.):
   - Logo Ellosuit no header fica **laranja #FF4500**
   - Todos os botões e elementos de destaque ficam **laranja #FF4500**

2. Ao navegar para qualquer página do **Flow** (Agenda, Tarefas, Reuniões, etc.):
   - Logo Ellosuit no header fica **azul #007DE3**
   - Todos os botões e elementos de destaque ficam **azul #007DE3**

3. Ao navegar para qualquer página do **Track** (Rastreamento, etc.):
   - Logo Ellosuit no header fica **verde #00E371**
   - Todos os botões e elementos de destaque ficam **verde #00E371**

4. Em páginas neutras (Home, Analytics, Settings, etc.):
   - Logo Ellosuit permanece **azul padrão #3000E3**

