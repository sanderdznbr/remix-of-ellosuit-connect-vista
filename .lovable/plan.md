
# Plano: Melhorias WhatsApp CRM + Nova Funcao ChatBot Visual

## Visao Geral

Este plano aborda 4 areas principais:
1. Sincronizacao instantanea de mensagens (remover delay restante)
2. Corrigir notificacoes persistentes (resetar unread_count ao ler)
3. Swipe to Delete nas conversas
4. Novo modulo ChatBot profissional estilo Umbler Talk

---

## 1. Sincronizacao Instantanea de Mensagens

**Problema Identificado**: Embora exista UI otimista implementada (linhas 790-865), ainda ha delay porque apos enviar a mensagem o codigo chama `loadMessagesByPhone` e `loadConversations` que podem sobrescrever a mensagem otimista.

**Solucao**:
- Remover chamada imediata de `loadMessagesByPhone` apos envio
- Confiar na UI otimista + polling de 500ms existente
- Melhorar deduplicacao para evitar mensagens duplicadas (temp + real)

**Arquivo**: `src/components/CRM/WhatsAppCRM.tsx`

**Mudancas**:
```text
// Remover linha 847-848 que forca refresh imediato
// loadMessagesByPhone(selectedConversation.contact_phone);
// loadConversations();

// Adicionar deduplicacao inteligente por content+timestamp
setMessages(prev => {
  const filtered = prev.filter(m => 
    !m.id.startsWith('temp-') || 
    !realMessages.some(rm => rm.content === m.content)
  );
  return [...filtered, ...newMessages];
});
```

---

## 2. Corrigir Notificacoes Persistentes

**Problema Identificado**: Nao existe codigo que reseta `unread_count` quando uma conversa e selecionada/lida.

**Solucao**: Adicionar funcao `markConversationAsRead` que:
1. Atualiza `unread_count = 0` no Supabase
2. Atualiza estado local imediatamente

**Arquivo**: `src/components/CRM/WhatsAppCRM.tsx`

**Nova Funcao**:
```typescript
const markConversationAsRead = async (conv: WhatsAppConversationData) => {
  if (!conv || (conv.unread_count || 0) === 0) return;
  
  // Atualizar estado local imediatamente
  setConversations(prev => prev.map(c => 
    c.id === conv.id ? { ...c, unread_count: 0 } : c
  ));
  
  // Atualizar banco de dados
  await supabase
    .from('whatsapp_conversations')
    .update({ unread_count: 0 })
    .eq('id', conv.id);
};
```

**Integrar com selecao de conversa** (chamar ao clicar em uma conversa):
```typescript
const selectConversation = (conv: WhatsAppConversationData) => {
  setSelectedConversation(conv);
  markConversationAsRead(conv); // <-- Adicionar
  setShowMobileChat(true);
};
```

---

## 3. Swipe to Delete em Conversas

**Solucao**: Criar componente `SwipeableConversationItem` que usa gestos de toque para revelar botao de delete.

**Novo Arquivo**: `src/components/CRM/SwipeableConversationItem.tsx`

**Funcionalidade**:
- Arrastar para esquerda revela botao vermelho "Excluir"
- Arrastar mais de 150px executa delete automaticamente
- Feedback visual durante swipe (fundo vermelho aparecendo)
- Usa `framer-motion` para animacoes suaves

**Estrutura**:
```text
+------------------------------------------+
|  [Avatar] Nome do Contato      12:30 PM  |  <-- Item normal
+------------------------------------------+
         |
         | SWIPE LEFT
         v
+-----------------------------+------------+
|  [Avatar] Nome do Conta... |   EXCLUIR  |  <-- Revelar botao
+-----------------------------+------------+
         |
         | SWIPE 150px+
         v
      DELETE AUTOMATICO
```

**Integrar em WhatsAppCRM.tsx**:
```typescript
// Substituir div da conversa por SwipeableConversationItem
<SwipeableConversationItem
  conversation={conversation}
  onDelete={() => handleDeleteConversation(conversation)}
  onSelect={() => selectConversation(conversation)}
>
  {/* Conteudo atual da conversa */}
</SwipeableConversationItem>
```

---

## 4. Novo Modulo ChatBot Visual (Estilo Umbler Talk)

### 4.1 Arquitetura

**Novo Arquivo**: `src/components/ChatBot/ChatBotBuilder.tsx`

**Layout Principal**:
```text
+------------------------------------------------------------------+
|  HEADER: ChatBot Builder                    [Salvar] [Executar]  |
+------------------------------------------------------------------+
|          |                                                        |
| SIDEBAR  |                    CANVAS                              |
|          |                                                        |
| [Blocos] |   +--------+        +--------+        +--------+      |
|          |   | Gatilho|------->|Mensagem|------->|  Acao  |      |
| Gatilhos |   +--------+        +--------+        +--------+      |
| Mensagens|         |                                   |          |
| Condicoes|         v                                   v          |
| Acoes    |   +---------+                        +---------+       |
| Delays   |   |Condicao |                        |  Delay  |       |
| Integr.  |   +---------+                        +---------+       |
|          |                                                        |
+------------------------------------------------------------------+
```

### 4.2 Categorias de Blocos (Sidebar)

**Gatilhos (Triggers)**:
- Canal WhatsApp (numero conectado)
- Canal Email
- Palavra-chave recebida
- Inicio de conversa
- Inatividade do usuario
- Horario especifico
- Webhook externo

**Mensagens**:
- Texto simples
- Mensagem com botoes
- Lista de opcoes
- Mensagem com imagem
- Mensagem com arquivo

**Condicoes**:
- Se/Senao (If/Else)
- Verificar variavel
- Verificar horario
- Verificar tag do contato

**Acoes**:
- Atribuir tag
- Transferir para humano
- Salvar em CRM
- Enviar email
- Chamar API externa
- Definir variavel

**Delays**:
- Aguardar X segundos
- Aguardar resposta
- Aguardar horario comercial

### 4.3 Canvas Interativo

**Tecnologia**: React Flow ou implementacao customizada com drag-and-drop

**Funcionalidades**:
- Drag-and-drop de blocos da sidebar para canvas
- Conectar blocos arrastando linhas entre eles
- Zoom in/out e pan
- Mini-mapa de navegacao
- Selecao multipla
- Copy/paste de blocos
- Undo/redo

### 4.4 Painel de Propriedades

Ao clicar em um bloco, abre painel lateral direito com configuracoes:
- Nome do bloco
- Configuracoes especificas do tipo
- Conexoes de entrada/saida
- Variaveis disponiveis

### 4.5 Dashboard de Estatisticas

**Metricas por Fluxo**:
- Total de execucoes
- Taxa de conclusao
- Tempo medio de execucao
- Pontos de abandono
- Conversoes por objetivo

### 4.6 Integracao com Header

**Adicionar ao OmniHub e MegaMenu**:
```typescript
// OmniHub.tsx - novo modulo
{
  id: "chatbot",
  title: "ChatBot Builder",
  description: "Construa fluxos de atendimento automatizados",
  icon: GitBranch,
  path: "/dashboard/chatbot",
}

// MegaMenuHeader.tsx - adicionar item
{ 
  id: "chatbot", 
  label: "ChatBot Builder", 
  description: "Fluxos automatizados", 
  icon: GitBranch, 
  path: "/dashboard/chatbot" 
}
```

### 4.7 Estrutura de Arquivos

```text
src/components/ChatBot/
├── ChatBotBuilder.tsx       # Componente principal
├── ChatBotCanvas.tsx        # Area de canvas drag-drop
├── ChatBotSidebar.tsx       # Sidebar com blocos
├── ChatBotPropertiesPanel.tsx # Painel de configuracao
├── ChatBotStats.tsx         # Dashboard de estatisticas
├── nodes/
│   ├── TriggerNode.tsx      # No de gatilho
│   ├── MessageNode.tsx      # No de mensagem
│   ├── ConditionNode.tsx    # No de condicao
│   ├── ActionNode.tsx       # No de acao
│   └── DelayNode.tsx        # No de delay
├── types/
│   └── index.ts             # Tipos TypeScript
└── hooks/
    └── useChatBotFlow.ts    # Hook para gerenciar fluxos
```

### 4.8 Tabelas do Banco de Dados

**Nova tabela `chatbot_flows`**:
```sql
CREATE TABLE chatbot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  trigger_config JSONB,
  is_active BOOLEAN DEFAULT false,
  execution_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Nova tabela `chatbot_executions`** (para estatisticas):
```sql
CREATE TABLE chatbot_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES chatbot_flows(id),
  conversation_id UUID,
  contact_phone TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',
  current_node_id TEXT,
  variables JSONB DEFAULT '{}',
  execution_path JSONB DEFAULT '[]'
);
```

---

## Ordem de Implementacao

| Prioridade | Tarefa | Complexidade | Tempo Est. |
|------------|--------|--------------|------------|
| 1 | Corrigir notificacoes (unread_count) | Baixa | 10 min |
| 2 | Otimizar UI otimista (remover refresh) | Baixa | 10 min |
| 3 | Implementar Swipe to Delete | Media | 30 min |
| 4 | Estrutura base ChatBot Builder | Alta | 1h |
| 5 | Canvas interativo com nodes | Alta | 1h |
| 6 | Integrar com header/navegacao | Baixa | 15 min |
| 7 | Migracoes banco de dados | Media | 20 min |

---

## Resumo de Arquivos a Criar/Modificar

**Criar**:
- `src/components/CRM/SwipeableConversationItem.tsx`
- `src/components/ChatBot/ChatBotBuilder.tsx`
- `src/components/ChatBot/ChatBotCanvas.tsx`
- `src/components/ChatBot/ChatBotSidebar.tsx`
- `src/components/ChatBot/ChatBotPropertiesPanel.tsx`
- `src/components/ChatBot/nodes/*.tsx`
- `supabase/migrations/..._add_chatbot_tables.sql`

**Modificar**:
- `src/components/CRM/WhatsAppCRM.tsx` (instant sync, notifications, swipe)
- `src/components/Dashboard/OmniHub.tsx` (add chatbot module)
- `src/components/Dashboard/MegaMenuHeader.tsx` (add chatbot link)
- `src/components/Mobile/MobileResponsiveDashboard.tsx` (add route)
