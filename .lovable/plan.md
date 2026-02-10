
# API WhatsApp Publica - Estilo 2chat.co

## O que sera construido

Um sistema de API publica que permite que sites externos enviem mensagens WhatsApp atraves da Ellosuit. O fluxo sera:

1. Usuario conecta WhatsApp via QR Code no painel da Ellosuit (ja funciona)
2. Sistema gera uma **API Key** unica para aquela sessao
3. O site externo usa essa API Key para enviar mensagens via HTTP

```text
Site Externo                    Ellosuit                      WhatsApp
    |                              |                              |
    |-- POST /whatsapp-public-api -|                              |
    |   (API Key + numero + msg)   |                              |
    |                              |-- Valida API Key             |
    |                              |-- Busca sessao conectada     |
    |                              |-- Envia via Baileys -------->|
    |                              |                              |
    |<---- { success: true } ------|                              |
```

## Alteracoes no Banco de Dados

### 1. Tabela `whatsapp_api_keys`
Armazena as chaves de API geradas por sessao.

```sql
CREATE TABLE whatsapp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 30,
  total_messages_sent BIGINT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Com RLS para que apenas o dono da empresa veja suas chaves.

### 2. Tabela `whatsapp_api_logs`
Log de todas as chamadas a API para auditoria.

```sql
CREATE TABLE whatsapp_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES whatsapp_api_keys(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message_preview TEXT,
  status TEXT NOT NULL, -- 'sent', 'failed', 'rate_limited'
  error_message TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Nova Edge Function: `whatsapp-public-api`

Endpoint publico (sem JWT) que recebe chamadas externas autenticadas por API Key.

**Endpoints suportados:**

| Metodo | Rota (via body action) | Descricao |
|--------|----------------------|-----------|
| POST | `send_text` | Enviar mensagem de texto |
| POST | `send_media` | Enviar imagem/video/documento |
| POST | `check_status` | Verificar se a sessao esta conectada |

**Autenticacao:** Header `X-API-Key: ek_xxxxxxxxxxxx`

**Exemplo de uso pelo site externo:**
```text
POST https://jwddiyuezqrpuakazvgg.supabase.co/functions/v1/whatsapp-public-api
Headers:
  X-API-Key: ek_abc123def456...
  Content-Type: application/json
Body:
  {
    "action": "send_text",
    "phone": "5511999999999",
    "message": "Sua compra foi aprovada! Obrigado."
  }
```

**Protecoes incluidas:**
- Rate limiting (30 msgs/minuto por padrao, configuravel)
- Validacao de API Key ativa
- Verificacao de sessao conectada
- Log de todas as chamadas
- Contador de mensagens enviadas

## Interface no Painel (novo componente)

### `WhatsAppApiPanel.tsx`
Acessivel dentro da area de WhatsApp do dashboard, com:

- Botao "Gerar API Key" vinculado a sessao conectada
- Lista de API Keys com nome, status (ativa/inativa), data de criacao
- Botao copiar chave
- Botao desativar/ativar
- Botao deletar
- Exemplo de codigo (curl, JavaScript, Python) pronto para copiar
- Estatisticas: total de mensagens enviadas, ultima utilizacao

## Configuracao

- Adicionar `whatsapp-public-api` ao `config.toml` com `verify_jwt = false`
- Nenhum secret adicional necessario (usa `SUPABASE_SERVICE_ROLE_KEY` que ja existe)

## Ordem de Implementacao

1. Criar tabelas `whatsapp_api_keys` e `whatsapp_api_logs` com RLS
2. Criar Edge Function `whatsapp-public-api` com autenticacao por API Key
3. Criar componente `WhatsAppApiPanel.tsx` com gerenciamento de chaves
4. Integrar o painel na interface do WhatsApp existente
5. Adicionar exemplos de codigo na interface para facilitar integracao
