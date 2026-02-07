
# Plano: Correção Completa do ChatBot Builder

## Problemas Identificados

1. **Conectores não funcionam**: Sistema atual usa "click-to-connect" confuso
2. **Nodes se movem sozinhos**: framer-motion `drag` está conflitando com clicks
3. **Configurações genéricas**: Gatilhos como "Canal WhatsApp" não têm opções específicas
4. **Falta feedback visual**: Não há linha durante conexão

---

## 1. Corrigir Sistema de Drag (Movimento de Nodes)

**Problema**: O atributo `drag` do framer-motion captura qualquer interação e causa micro-movimentos.

**Solução**: Trocar para drag manual controlado com estado e eventos de mouse.

**Arquivo**: `src/components/ChatBot/ChatBotCanvas.tsx`

**Mudanças**:
- Remover `motion.div` com `drag` e `dragMomentum`
- Implementar `onMouseDown/onMouseMove/onMouseUp` manual apenas no handle de arraste
- Usar estado `draggingNode` para controlar qual node está sendo arrastado
- Só permitir arraste ao clicar no GripVertical

```text
// Lógica atual (problemática)
<motion.div drag dragMomentum={false} ...>

// Nova lógica (controlada)
<div style={{...}} ...>
  <GripVertical onMouseDown={(e) => startDrag(nodeId, e)} />
```

---

## 2. Corrigir Sistema de Conexões (Edges)

**Problema**: Sistema click-to-connect é confuso e não mostra feedback visual.

**Solução**: Implementar drag-to-connect com linha visual durante arraste.

**Mudanças**:
- Adicionar estado `connectingLine` para linha temporária
- Quando arrastar do ponto de saída (direita), mostrar linha seguindo cursor
- Quando soltar sobre ponto de entrada (esquerda), criar edge
- Feedback visual com cor diferente durante conexão

```text
Estado durante conexão:
+--------+
| Node A |------- - - - - - cursor
+--------+         (linha tracejada)

Após conexão:
+--------+        +--------+
| Node A |------->| Node B |
+--------+        +--------+
```

---

## 3. Configurações Específicas por Tipo de Bloco

### 3.1 Canal WhatsApp (`whatsapp_channel`)

**Problema**: Não permite selecionar qual número/sessão usar.

**Solução**: Carregar sessões WhatsApp conectadas e mostrar dropdown.

**Arquivo**: `src/components/ChatBot/ChatBotPropertiesPanel.tsx`

**Nova configuração**:
```typescript
// Buscar sessões
const { data: sessions } = await supabase
  .from('whatsapp_sessions')
  .select('id, instance_name, phone_number, status')
  .eq('company_id', companyId)
  .eq('status', 'connected');

// UI
<Select value={config.sessionId} onValueChange={...}>
  {sessions.map(s => (
    <SelectItem value={s.id}>
      {s.phone_number} - {s.instance_name}
    </SelectItem>
  ))}
</Select>
```

### 3.2 Canal Email (`email_channel`)

**Campos**:
- Conta de email conectada
- Filtro de assunto (opcional)
- Filtro de remetente (opcional)

### 3.3 Início de Conversa (`conversation_start`)

**Campos**:
- Tipo de início (primeiro contato, reabertura após X dias)
- Canal (WhatsApp, Email, Todos)

### 3.4 Se/Senão (`if_else`)

**Campos**:
- Tipo de condição (resposta do usuário, valor de variável, horário)
- Operador (contém, igual, maior, menor)
- Valor esperado

---

## 4. Melhorar Exibição dos Nodes

**Problema**: Nodes mostram informação genérica como "Gatilho: whatsapp channel".

**Solução**: Mostrar informação específica da configuração.

**Exemplos**:

| Tipo | Exibição Atual | Nova Exibição |
|------|---------------|---------------|
| WhatsApp | "Gatilho: whatsapp channel" | "+55 11 99999-9999" |
| Texto | "Clique para configurar" | "Olá! Como posso..." (truncado) |
| Delay | "Aguardar 5s" | "⏱️ Aguardar 5 segundos" |
| Tag | "Clique para configurar" | "🏷️ Atribuir: lead_quente" |

---

## 5. Pontos de Conexão com Handles Múltiplos

**Problema**: Condições precisam de múltiplas saídas (Sim/Não).

**Solução**: Para nodes do tipo `condition`, adicionar dois pontos de saída.

```text
+------------------+
|    Se/Senão      |
|   idade > 18     |
+------------------+
   ●              ○ Sim ------>
  (in)            ○ Não ------>
```

---

## Estrutura Final dos Arquivos

### ChatBotCanvas.tsx (Revisado)
```typescript
// Estados de controle
const [draggingNode, setDraggingNode] = useState<string | null>(null);
const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
const [connectingLine, setConnectingLine] = useState<{
  sourceId: string;
  sourceX: number;
  sourceY: number;
  currentX: number;
  currentY: number;
} | null>(null);

// Handlers de drag manual
const handleNodeMouseDown = (e, nodeId, nodePos) => {
  if (e.target.closest('.drag-handle')) {
    setDraggingNode(nodeId);
    setDragOffset({ x: e.clientX - nodePos.x, y: e.clientY - nodePos.y });
  }
};

// Handler de conexão
const handleConnectorMouseDown = (e, nodeId) => {
  const rect = e.target.getBoundingClientRect();
  setConnectingLine({
    sourceId: nodeId,
    sourceX: rect.left,
    sourceY: rect.top,
    currentX: e.clientX,
    currentY: e.clientY
  });
};
```

### ChatBotPropertiesPanel.tsx (Revisado)
```typescript
// Hook para carregar dados dinâmicos
const [whatsappSessions, setWhatsappSessions] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  if (node.subType === 'whatsapp_channel') {
    loadWhatsAppSessions();
  }
}, [node.subType]);

// Renderização condicional com dados reais
{node.subType === 'whatsapp_channel' && (
  <div className="space-y-4">
    <Label>Selecione o Canal WhatsApp</Label>
    <Select value={node.data.config?.sessionId} ...>
      {whatsappSessions.map(session => (
        <SelectItem value={session.id}>
          <div className="flex items-center gap-2">
            <Avatar><AvatarImage src={session.profile_picture} /></Avatar>
            <div>
              <p>{session.phone_number}</p>
              <p className="text-xs text-gray-500">{session.instance_name}</p>
            </div>
          </div>
        </SelectItem>
      ))}
    </Select>
    
    <Label>Quando Iniciar?</Label>
    <Select value={node.data.config?.triggerWhen || 'any_message'}>
      <SelectItem value="any_message">Qualquer mensagem</SelectItem>
      <SelectItem value="new_conversation">Nova conversa</SelectItem>
      <SelectItem value="reopened">Conversa reaberta</SelectItem>
    </Select>
  </div>
)}
```

---

## Ordem de Implementação

| Prioridade | Tarefa | Arquivos |
|------------|--------|----------|
| 1 | Corrigir sistema de drag (parar movimento) | ChatBotCanvas.tsx |
| 2 | Implementar drag-to-connect visual | ChatBotCanvas.tsx |
| 3 | Config WhatsApp Channel (select sessões) | ChatBotPropertiesPanel.tsx |
| 4 | Config demais gatilhos | ChatBotPropertiesPanel.tsx |
| 5 | Melhorar exibição nos nodes | ChatBotCanvas.tsx |
| 6 | Handles múltiplos para condições | ChatBotCanvas.tsx |

---

## Resumo de Mudanças

**Arquivos a modificar**:
- `src/components/ChatBot/ChatBotCanvas.tsx` - Sistema de drag e conexões
- `src/components/ChatBot/ChatBotPropertiesPanel.tsx` - Configurações específicas
- `src/components/ChatBot/ChatBotSidebar.tsx` - Descrições mais claras

**Resultado esperado**:
- Nodes só movem quando arrastados pelo handle
- Conexões feitas por drag com feedback visual
- Canal WhatsApp permite selecionar sessão conectada
- Informações úteis exibidas diretamente nos nodes
- Interface profissional similar ao Umbler Talk
