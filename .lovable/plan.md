

# Plano: Melhorias CRM WhatsApp + Reorganização Sidebar

## Parte 1: Conversas Demo no WhatsApp CRM

### Dados Simulados
Adicionar conversas de exemplo realistas que aparecem automaticamente:

| Contato | Última Mensagem | Status | Não Lidas |
|---------|-----------------|--------|-----------|
| Maria Silva | "Olá, gostaria de saber sobre o produto X" | open | 2 |
| João Pereira | "Obrigado pelo atendimento!" | closed | 0 |
| Ana Costa | "Preciso de suporte urgente" | open | 5 |
| Pedro Santos | "Qual o prazo de entrega?" | open | 1 |
| Empresa ABC | "Podemos agendar uma reunião?" | open | 3 |

### Mensagens de Exemplo
Cada conversa terá um histórico simulado com mensagens de ida e volta para demonstrar a funcionalidade.

---

## Parte 2: Agentes de IA no CRM

### Nova Seção na Lista de Conversas
- Seção "Agentes IA" acima das conversas normais no CRM
- Ícone de robô para diferenciar de contatos humanos
- Ao clicar, abre chat com o agente no painel direito
- Usa a edge function `ai-chat` existente para respostas

---

## Parte 3: Reorganização da Sidebar (Atualizada)

### Nova Estrutura com Grupo IA Separado

```text
+-------------------------+
|  DASHBOARD              |
|  - Home                 |
+-------------------------+
|  INTELIGÊNCIA ARTIFICIAL|  <- NOVO GRUPO
|  - Agentes de IA        |
+-------------------------+
|  COMUNICAÇÃO            |
|  - CRM WhatsApp         |
|  - Email                |
+-------------------------+
|  PRODUTIVIDADE          |
|  - Agenda               |
|  - Tarefas              |
|  - Reuniões             |
|  - Fluxos               |
+-------------------------+
|  GESTÃO                 |
|  - Cadastros            | <- Unifica Clientes/Fornecedores/Prospectos/Usuários
|  - Arquivos             |
|  - Rastreamento         | <- Unifica PDF/Link/Vídeo
+-------------------------+
|  INSIGHTS               |
|  - Analytics            |
+-------------------------+
|  CONFIGURAÇÕES          |
|  - Preferências         |
|  - Segurança            |
|  - Suporte              |
+-------------------------+
```

### Página Unificada de Cadastros
Uma única página com tabs:
- **Clientes**: Listagem com filtros e ações
- **Fornecedores**: Mesma estrutura
- **Prospectos**: Mesma estrutura  
- **Colaboradores**: Mesma estrutura

### Página Unificada de Rastreamento
Uma única página com tabs:
- **Documentos PDF**: Dashboard de rastreamento
- **Links**: Dashboard de rastreamento
- **Vídeos**: Dashboard de rastreamento

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/CRM/WhatsAppCRM.tsx` | Modificar | Adicionar dados demo + seção de agentes IA |
| `src/components/Dashboard/UnifiedSidebar.tsx` | Modificar | Reorganizar com grupo IA separado |
| `src/components/Dashboard/UnifiedCadastros.tsx` | Criar | Página unificada com tabs |
| `src/components/Dashboard/UnifiedTracking.tsx` | Criar | Página unificada de rastreamento |
| `src/components/Mobile/MobileResponsiveDashboard.tsx` | Modificar | Adicionar novas rotas |

---

## Detalhes Técnicos

### Estrutura do Demo Data
```typescript
const DEMO_CONVERSATIONS = [
  {
    id: 'demo-1',
    contact_name: 'Maria Silva',
    contact_phone: '+55 11 99999-1234',
    last_message: 'Olá, gostaria de saber sobre o produto X',
    last_message_at: new Date().toISOString(),
    status: 'open',
    unread_count: 2
  },
  // ... mais conversas
];
```

### Novo Grupo na Sidebar
```typescript
{
  title: "Inteligência Artificial",
  icon: Bot,
  items: [
    { title: "Agentes de IA", path: "/dashboard/agentes-ia", icon: Bot }
  ]
}
```

---

## Resultado Esperado

1. **CRM com Exemplos**: Conversas demo para demonstrar a interface
2. **Chat com IA no CRM**: Agentes aparecem e respondem em tempo real
3. **Grupo IA Destacado**: Seção própria na sidebar para funcionalidades de IA
4. **Sidebar Organizada**: Navegação mais intuitiva
5. **Páginas Unificadas**: Cadastros e Rastreamento em páginas únicas com tabs

