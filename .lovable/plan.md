
# Plano: Email Marketing Limpo e Funcional

## Resumo Executivo

Redesenhar a página de Email Marketing com interface limpa e implementar **duas opções de envio**:

1. **Gmail/Google Workspace (Individual)** - Cada usuário conecta SEU próprio email
2. **Resend (Empresarial)** - Envio centralizado da empresa com domínio verificado

---

## Resposta à sua Pergunta

### Com Resend
- **1 domínio verificado** = envio apenas desse domínio (ex: `@suaempresa.com.br`)
- Todos os usuários enviariam do mesmo domínio
- **NÃO** permite cada usuário enviar do seu email pessoal

### Com Gmail OAuth (Recomendado para seu caso)
- **Cada usuário conecta seu próprio email** (Gmail ou Google Workspace)
- Maria envia de `maria@empresa.com`, João de `joao@empresa.com`
- **SIM** permite cada um usar seu próprio email
- Limite: 500/dia (Gmail pessoal) ou 2000/dia (Google Workspace)

### Solução Proposta: Sistema Híbrido
Oferecer **ambas as opções** para flexibilidade máxima.

---

## Parte 1: Nova Interface Limpa

### Antes (Atual)
- Header grande com ícone de email
- Seção "Sua Jornada de Email Marketing"
- Muitos elementos visuais

### Depois (Novo)
```text
+----------------------------------------------------------+
| Email Marketing                    [Status: Conectado ✓] |
+----------------------------------------------------------+
| [Conexão] [Compor] [Campanhas] [Templates] [Métricas]    |
+----------------------------------------------------------+
|                                                          |
|  KPIs: [Enviados: 156] [Abertos: 89] [Cliques: 34]      |
|                                                          |
|  [Conteúdo da tab ativa]                                |
|                                                          |
+----------------------------------------------------------+
```

---

## Parte 2: Opções de Conexão

### Tab "Conexão" - Duas Opções

```text
┌─────────────────────────────────────────────────────────┐
│  Como você quer enviar emails?                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐    ┌─────────────────┐            │
│  │ 📧 MEU EMAIL   │    │ 🏢 EMAIL EMPRESA │            │
│  │                │    │                  │            │
│  │ Gmail/Workspace│    │ Domínio próprio  │            │
│  │ Seu email      │    │ @empresa.com     │            │
│  │ 500-2000/dia   │    │ Ilimitado        │            │
│  │                │    │                  │            │
│  │ [Conectar]     │    │ [Configurar]     │            │
│  └─────────────────┘    └─────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Parte 3: Arquivos a Modificar/Criar

### 1. Criar: `CleanEmailMarketing.tsx`
Interface principal limpa com:
- Header compacto com status de conexão
- Tabs: Conexão, Compor, Campanhas, Templates, Métricas
- KPIs em linha (não cards grandes)
- Design minimalista estilo RD Station

### 2. Modificar: `EmailConnectionWizard.tsx`
Simplificar wizard e adicionar:
- Opção Gmail OAuth (já existe)
- Opção Resend/Domínio próprio (nova)
- Menos passos, mais direto

### 3. Modificar: `EmailComposer.tsx`
Adicionar:
- Seletor de provedor (Gmail pessoal ou Resend)
- Auto-preenchimento do email do remetente quando Gmail conectado
- Validação de limite diário

### 4. Atualizar: `send-email/index.ts`
Melhorar para:
- Buscar token Gmail do banco automaticamente
- Suportar ambos os provedores
- Refresh de token quando expirado

### 5. Atualizar rotas em `MobileResponsiveDashboard.tsx`

---

## Parte 4: Fluxo Gmail (Cada usuário com seu email)

```text
1. Usuário clica "Conectar meu Gmail"
2. OAuth2 Google → Autoriza
3. Token salvo em user_email_accounts (por usuário)
4. Ao enviar:
   - Sistema busca token do usuário logado
   - Envia via Gmail API com email do usuário
   - maria@empresa.com → envia como maria@empresa.com
```

### Vantagens
- Cada um envia do seu próprio email
- Aparece "de Maria Silva <maria@empresa.com>"
- Respostas vão para o email correto
- Sem necessidade de configurar domínio

---

## Parte 5: Fluxo Resend (Domínio da empresa)

```text
1. Admin configura RESEND_API_KEY
2. Admin verifica domínio no Resend
3. Qualquer usuário pode enviar como @empresa.com
4. Ex: marketing@empresa.com, vendas@empresa.com
```

### Quando usar
- Campanhas em massa (+2000 emails)
- Comunicação oficial da empresa
- Email marketing profissional

---

## Parte 6: Secret Necessário

Para usar Resend, será necessário adicionar:
- `RESEND_API_KEY` (do painel resend.com)

O Gmail OAuth já funciona com as credenciais Google existentes.

---

## Implementação Técnica

### Componente CleanEmailMarketing
```
- Estado: activeTab, connectionStatus
- Hook: useGmail para status Gmail
- Renderização: tabs limpos sem elementos pesados
- Design: cores #3000E3, minimalista
```

### Modificação send-email
```
- Se provider=gmail:
  - Buscar user_email_accounts do user_id
  - Usar access_token para Gmail API
  - Fazer refresh se expirado
  
- Se provider=resend:
  - Usar RESEND_API_KEY
  - Enviar do domínio configurado
```

### Interface Composer
```
- Detectar se usuário tem Gmail conectado
- Auto-preencher from_email
- Mostrar limite diário restante
- Opção de escolher provedor
```

---

## Resultado Final

1. **Interface limpa** sem elementos visuais pesados
2. **Gmail OAuth** funcionando para cada usuário
3. **Resend opcional** para campanhas em massa
4. **Métricas** de abertura e clique funcionando
5. **Templates** reutilizáveis
