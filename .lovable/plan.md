

## Bug Fix: Mensagens WhatsApp nao enviadas para grupos

### Problema Identificado
O sistema esta enviando mensagens para grupos WhatsApp usando o sufixo errado. Grupos WhatsApp usam `@g.us`, mas o codigo atual sempre usa `@s.whatsapp.net` (para contatos individuais).

**Linha com bug** (`supabase/functions/whatsapp-api/index.ts`, linha 513):
```text
const jid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
```

Numeros de grupo tem 18+ digitos. A correcao e detectar isso e usar `@g.us` automaticamente.

### Correcao
Alterar a logica de construcao do JID na edge function `whatsapp-api` para detectar grupos (18+ digitos) e usar `@g.us` ao inves de `@s.whatsapp.net`.

---

## Painel Admin Master

### Visao Geral
Criar um painel administrativo completo acessivel apenas para usuarios com `role = 'adminmaster'` na tabela `company_users`. Este painel centraliza o monitoramento de toda a plataforma.

### Alteracoes no Banco de Dados

1. **Adicionar role `adminmaster`** ao enum `company_role` existente
2. **Criar tabela `support_tickets`** para gerenciamento de tickets de suporte
3. **Criar tabela `bug_reports`** para relatorios de bugs
4. **Criar tabela `admin_impersonation_logs`** para registrar acessos de impersonacao (auditoria)

### Componentes a Criar

1. **`src/components/Admin/AdminMasterDashboard.tsx`** - Dashboard principal com:
   - Cards de KPI: total de empresas, usuarios ativos, assinaturas ativas, receita mensal
   - Grafico de acessos/cadastros ao longo do tempo
   - Lista de assinaturas recentes com status, valor, forma de pagamento, renovacao

2. **`src/components/Admin/AdminUsersPanel.tsx`** - Painel de usuarios/empresas:
   - Lista de todas as empresas com seus dados
   - Detalhes por empresa: clientes cadastrados, agendas, fluxos, agentes IA
   - Botao "Logar como cliente" (impersonacao segura via edge function)

3. **`src/components/Admin/AdminSubscriptionsPanel.tsx`** - Painel de assinaturas:
   - Todas as assinaturas com status, valor, data de pagamento, renovacao
   - Filtros por plano, status, periodo

4. **`src/components/Admin/AdminSystemHealth.tsx`** - Saude do sistema:
   - Status das edge functions
   - Erros recentes nos logs
   - Monitoramento de APIs (WhatsApp, LiveKit, etc.)

5. **`src/components/Admin/AdminSupportPanel.tsx`** - Suporte:
   - Lista de tickets de suporte abertos
   - Responder tickets
   - Relatorios de bugs

6. **`src/components/Admin/AdminImpersonation.tsx`** - Logica de impersonacao:
   - Edge function `admin-impersonate` para gerar token temporario
   - Log de auditoria de cada acesso

### Rotas

Adicionar em `MobileResponsiveDashboard.tsx`:
```text
/dashboard/admin          -> AdminMasterDashboard
/dashboard/admin/users    -> AdminUsersPanel
/dashboard/admin/subs     -> AdminSubscriptionsPanel
/dashboard/admin/system   -> AdminSystemHealth
/dashboard/admin/support  -> AdminSupportPanel
```

### Seguranca

- Acesso restrito via verificacao de `role = 'adminmaster'` em `company_users`
- RLS policies nas novas tabelas
- Edge function de impersonacao com validacao server-side da role
- Log de auditoria para cada impersonacao

### Detalhes Tecnicos

**Edge Function `admin-impersonate`:**
- Recebe `targetUserId`
- Valida que o solicitante tem role `adminmaster`
- Usa Supabase Admin API para gerar um token de acesso temporario
- Registra o acesso na tabela `admin_impersonation_logs`

**Dados exibidos no dashboard:**
- Queries agregadas usando service_role nas edge functions para dados cross-company
- Total de empresas, usuarios, assinaturas (da tabela `subscriptions`)
- Receita mensal calculada (SUM de `monthly_price` onde `status = 'active'`)
- Dados de pagamento do Pagar.me via `pagarme_subscription_id`

### Ordem de Implementacao

1. Corrigir bug do JID de grupos no WhatsApp (edge function)
2. Adicionar `adminmaster` ao enum de roles no banco
3. Criar tabelas de suporte e auditoria
4. Criar edge function `admin-impersonate`
5. Criar componentes do painel admin
6. Adicionar rotas e protecao de acesso

