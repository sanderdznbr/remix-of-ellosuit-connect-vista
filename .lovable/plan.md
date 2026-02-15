

# Assistente Ellosuit via WhatsApp -- Plano de Implementacao

## Visao Geral

Criar um sistema completo onde clientes da Ellosuit possam interagir com a plataforma via WhatsApp da conta admin (554189015612). O fluxo funciona assim:

1. Cliente manda mensagem para o WhatsApp da Ellosuit
2. Um chatbot pergunta o e-mail do cliente
3. O sistema busca a conta no banco de dados e pede confirmacao
4. Apos confirmado, um Agente de IA especializado assume a conversa
5. O agente consegue executar acoes na conta do usuario (criar tarefas, agendar, verificar dados, etc.)

## Arquitetura do Fluxo

```text
Cliente WhatsApp
      |
      v
[Chatbot Flow: "Ellosuit Support"]
      |
      +--> Mensagem de boas-vindas
      |
      +--> Pergunta e-mail
      |
      +--> Busca conta (variavel: email)
      |         |
      |    Nao encontrou --> "Conta nao encontrada, tente novamente"
      |         |
      |    Encontrou --> "Confirmacao: Voce e [Nome] da [Empresa]?"
      |                       |
      |                  Sim --> Transfere para Agente IA
      |                  Nao --> "Por favor, digite o e-mail correto"
      |
      v
[Agente IA: "Ellosuit Assistant"]
      |
      +--> Tem acesso ao company_id e user_id do cliente
      +--> Recebe mensagens de texto e audio (STT via ElevenLabs)
      +--> Executa acoes na conta via tool calls
      +--> Responde por texto (e opcionalmente audio)
```

## Etapas de Implementacao

### Etapa 1: Criar o Agente de IA "Ellosuit WhatsApp Assistant"

Inserir um registro na tabela `ai_agents` vinculado a conta admin (company_id: `60008c43-e536-482d-a090-91904de57534`) com:

- **Nome**: "Ellosuit Assistant"
- **Personalidade**: Assistente profissional e amigavel da plataforma Ellosuit
- **Instrucoes**: Prompt detalhado com capacidade de executar acoes na conta do usuario autenticado
- **Settings**: Configuracoes de temperatura, limite de caracteres, modo de audio

### Etapa 2: Criar Edge Function "ellosuit-whatsapp-agent"

Uma Edge Function dedicada que estende o `ai-chat` com **tool calling** para executar acoes reais na conta do usuario:

**Tools disponiveis:**
- `list_tasks` -- Listar tarefas do usuario
- `create_task` -- Criar nova tarefa
- `list_contacts` -- Listar cadastros/contatos
- `check_subscription` -- Ver status da assinatura
- `list_documents` -- Listar arquivos no Drive
- `list_calendar_events` -- Ver agenda
- `create_calendar_event` -- Criar evento na agenda
- `send_email` -- Enviar e-mail
- `general_info` -- Informacoes sobre a plataforma

Cada tool recebe o `company_id` e `user_id` do cliente autenticado (armazenados nas variaveis da execucao do chatbot) e opera diretamente nas tabelas do Supabase.

### Etapa 3: Criar o Chatbot Flow via Banco de Dados

Inserir um registro na tabela `chatbot_flows` com os nodes e edges que representam:

1. **Trigger Node**: `whatsapp_channel` -- ativa para novas conversas
2. **Message Node**: Boas-vindas -- "Ola! Sou o assistente da Ellosuit. Para acessar sua conta, por favor me informe seu e-mail cadastrado."
3. **Condition Node**: Aguarda resposta com e-mail
4. **Action Node**: Busca conta no banco (`auth.users` via service role + `company_users`)
5. **Condition Node**: Conta encontrada?
   - Sim: Message "Encontrei! Voce e [Nome] da empresa [Empresa]. Correto?"
   - Nao: Message "Nao encontrei uma conta com esse e-mail. Tente novamente."
6. **Condition Node**: Confirmacao (Sim/Nao)
   - Sim: Action `transfer_ai_agent` com o agente criado na Etapa 1
   - Nao: Volta para perguntar o e-mail

### Etapa 4: Atualizar o Webhook para Suportar o Agente Ellosuit

Modificar a secao de **AI Auto-Response** no `whatsapp-webhook/index.ts` para:

- Quando o agente ativo for o "Ellosuit Assistant", chamar a Edge Function `ellosuit-whatsapp-agent` em vez da `ai-chat` padrao
- Passar o `company_id` e `user_id` do cliente (extraidos das variaveis do chatbot) no payload
- O agente processa tool calls e retorna respostas contextualizadas

### Etapa 5: Logica de Lookup de Conta no Chatbot Engine

Adicionar um novo tipo de bloco de acao no processamento do chatbot (`whatsapp-webhook`) que:

- Recebe o e-mail digitado pelo usuario
- Busca em `auth.users` (via service role) o usuario com aquele e-mail
- Busca o `company_id` em `company_users`
- Armazena `user_id`, `company_id` e `user_name` nas variaveis da execucao
- Esses dados sao passados ao agente de IA quando a transferencia acontece

## Detalhes Tecnicos

### Tabela de Contexto (nova coluna ou uso de `variables` existente)

A tabela `chatbot_executions` ja tem uma coluna `variables` (jsonb) que sera usada para armazenar:
```text
{
  "authenticated_user_id": "uuid",
  "authenticated_company_id": "uuid",
  "authenticated_user_name": "Nome",
  "authenticated_company_name": "Empresa",
  "email": "user@email.com"
}
```

Quando o chatbot transfere para o agente IA, esses dados sao lidos e passados para a Edge Function.

### Edge Function: ellosuit-whatsapp-agent

Utilizara o Lovable AI Gateway com tool calling (mesmo padrao do `ai-assistant`), mas com tools focados em operacoes de conta:

```text
POST /functions/v1/ellosuit-whatsapp-agent
Body: {
  messages: [...],
  userId: "uuid do cliente",
  companyId: "uuid da empresa do cliente",
  contactPhone: "numero whatsapp"
}
```

### Modificacoes no whatsapp-webhook

Na secao de AI Auto-Response (linha ~1574), adicionar verificacao:
- Se o agente tem um campo especial (ex: `settings.is_platform_agent: true`), usar a Edge Function `ellosuit-whatsapp-agent` passando as variaveis de autenticacao da conversa

### Seguranca

- A busca de conta e feita com `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor (Edge Function)
- O `user_id` e `company_id` autenticados sao validados antes de qualquer operacao
- Cada tool verifica se o recurso pertence ao `company_id` do usuario
- Nenhum dado de outros clientes e exposto

## Resumo dos Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/functions/ellosuit-whatsapp-agent/index.ts` | **Novo** -- Edge Function com tool calling para acoes na conta |
| `supabase/functions/whatsapp-webhook/index.ts` | **Modificar** -- Adicionar logica de lookup de conta no chatbot e roteamento para o agente especial |
| `supabase/config.toml` | **Modificar** -- Registrar nova Edge Function |
| Banco de dados | **Insert** -- Criar registro do agente IA e do chatbot flow |

