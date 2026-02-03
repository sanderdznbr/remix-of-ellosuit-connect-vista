
# Plano de Correção: React Error #300 e Rotas Faltantes da Sidebar

## Problema 1: React Error #300

O erro #300 significa "Objects are not valid as a React child". Isso acontece quando tentamos renderizar um objeto diretamente no JSX.

### Causa Provável
Após análise do código, identifiquei que o erro pode estar ocorrendo em:
- Componentes que renderizam dados de usuário sem verificação de tipo
- Props de navegação (`onNavigate`) não sendo passadas corretamente para componentes como `Analytics`

### Solução
1. Adicionar verificações defensivas de tipo em `AuthScreen.tsx` e `MobileAuthScreen.tsx`
2. Garantir que erros e mensagens sejam sempre strings antes de renderizar

## Problema 2: Rotas da Sidebar que Não Existem

### Rotas Faltantes Identificadas

| Rota | Status | Componente Necessário |
|------|--------|----------------------|
| `/dashboard/fornecedores` | Faltando | Novo componente |
| `/dashboard/prospectos` | Faltando | Novo componente |
| `/dashboard/bot-ia` | Faltando | BotIADashboard (existe) |
| `/dashboard/email-marketing` | Faltando | EmailDashboard |
| `/dashboard/rastreamento-link` | Faltando | Novo placeholder |
| `/dashboard/rastreamento-video` | Faltando | Novo placeholder |
| `/dashboard/ello-vision` | Faltando | Novo placeholder |
| `/dashboard/analytics` | Faltando | Analytics (existe) |
| `/dashboard/relatorios` | Faltando | Novo placeholder |
| `/dashboard/suporte` | Faltando | Novo placeholder |
| `/dashboard/reportar-problema` | Faltando | Novo placeholder |
| `/dashboard/seguranca` | Faltando | Novo placeholder |

---

## Implementação

### Etapa 1: Corrigir React Error #300

**Arquivo: `src/components/AuthScreen.tsx`**
- Adicionar verificação de tipo para mensagens de erro
- Garantir que `error` seja sempre string antes de renderizar

**Arquivo: `src/components/Mobile/MobileAuthScreen.tsx`**
- Mesmas correções de tipagem

### Etapa 2: Criar Páginas Placeholder

**Novo arquivo: `src/components/Dashboard/PlaceholderPage.tsx`**
- Componente reutilizável para páginas em desenvolvimento
- Mostra ícone, título e mensagem "Em breve"

### Etapa 3: Atualizar Rotas

**Arquivo: `src/components/Mobile/MobileResponsiveDashboard.tsx`**

Adicionar as seguintes rotas:

```text
/dashboard/fornecedores     -> ClientsManager (com prop type="fornecedor")
/dashboard/prospectos       -> ClientsManager (com prop type="prospecto")
/dashboard/bot-ia           -> BotIADashboard
/dashboard/email-marketing  -> EmailDashboard
/dashboard/rastreamento-link -> PlaceholderPage
/dashboard/rastreamento-video -> PlaceholderPage
/dashboard/ello-vision      -> PlaceholderPage
/dashboard/analytics        -> Analytics
/dashboard/relatorios       -> PlaceholderPage
/dashboard/suporte          -> PlaceholderPage
/dashboard/reportar-problema -> PlaceholderPage
/dashboard/seguranca        -> PlaceholderPage
```

---

## Detalhes Técnicos

### PlaceholderPage Component

```tsx
interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ComponentType;
}
```

Componente simples que exibe:
- Ícone grande centralizado
- Título da funcionalidade
- Mensagem "Em desenvolvimento"
- Botão para voltar ao dashboard

### Correção de Tipagem para Erro #300

```tsx
// Antes (pode causar erro se error for objeto)
{error && <AlertDescription>{error}</AlertDescription>}

// Depois (garantia de string)
{error && <AlertDescription>{String(error)}</AlertDescription>}
```

### Analytics Component Fix

O componente `Analytics` espera uma prop `onNavigate`, mas não está recebendo. Será corrigido:

```tsx
// Antes
<Route path="/analytics" element={<Analytics />} />

// Depois
<Route path="/analytics" element={<Analytics onNavigate={handleNavigate} />} />
```

---

## Arquivos a Serem Modificados

1. `src/components/AuthScreen.tsx` - Correção de tipagem
2. `src/components/Mobile/MobileAuthScreen.tsx` - Correção de tipagem
3. `src/components/Dashboard/PlaceholderPage.tsx` - Novo arquivo
4. `src/components/Mobile/MobileResponsiveDashboard.tsx` - Adicionar todas as rotas faltantes

---

## Resultado Esperado

Após implementação:
- O erro #300 será corrigido
- Todas as 12 rotas faltantes funcionarão
- Páginas em desenvolvimento mostrarão placeholder amigável
- Navegação da sidebar funcionará 100%
