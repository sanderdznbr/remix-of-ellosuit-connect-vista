
# Plano: Renovação Completa do Email Marketing

## Visão Geral

Transformar o sistema de Email Marketing em uma experiência moderna e interativa com fluxo step-by-step, construtor visual drag-and-drop, integração com IA e limite de envios diários.

---

## Parte 1: Reorganização da Interface Principal

### Mudanças no Layout

**Antes:** Tab "Conexão" ocupando espaço completo
**Depois:** Status de conexão discreto no header

```text
+--------------------------------------------------+
|  Email Marketing           [Gmail Conectado ▾]   |
|  Envie campanhas...                              |
+--------------------------------------------------+
|  [📧 Compor] [📊 Campanhas] [🎨 Design] [📈 Métricas] |
+--------------------------------------------------+
```

**Componente afetado:** `CleanEmailMarketing.tsx`
- Remover tab "Conexão"
- Adicionar dropdown discreto no header para gerenciar conexão
- Badge de status + botão de desconectar em popover

---

## Parte 2: Novo Fluxo Step-by-Step para Compor Email

### Etapas do Wizard

```text
Step 1: Destinatários     Step 2: Assunto           Step 3: Conteúdo          Step 4: Revisar
     [●]────────────────────[○]────────────────────[○]────────────────────[○]
```

**Etapa 1 - Destinatários:**
- Input para digitar emails manualmente (um por um ou separados por vírgula)
- Botão "Importar Lista" (CSV/TXT)
- Opção "Selecionar da Agenda" (buscar clientes do banco)
- Contador de destinatários selecionados

**Etapa 2 - Assunto:**
- Input para digitar o assunto
- Botão "Melhorar com IA" que chama a OpenAI para sugerir versões
- Preview de como aparecerá na caixa de entrada

**Etapa 3 - Conteúdo:**
- Duas opções:
  - "Escolher Template" - abre seletor de templates salvos
  - "Criar do Zero" - redireciona ao Designer Visual
- Editor de texto rico para ajustes finais

**Etapa 4 - Revisão:**
- Preview completo do email
- Resumo: X destinatários, assunto, remetente
- Botão "Enviar" ou "Agendar"

**Novo arquivo:** `src/components/Dashboard/EmailComposerWizard.tsx`

---

## Parte 3: Construtor Visual de Email Marketing (Drag-and-Drop)

### Componentes a Criar/Melhorar

O sistema atual já tem base em `src/components/EmailDesigner/`, mas precisa de melhorias significativas:

**Novos Elementos no Palette:**
- Header (logo + título)
- Parágrafo
- Lista (bullet points)
- Coluna dupla (2 colunas)
- Imagem com legenda
- Social Icons (Facebook, Instagram, LinkedIn, WhatsApp)
- Footer (endereço + unsubscribe)
- Vídeo placeholder
- Countdown timer

**Melhorias no Canvas:**
- Reordenação via drag-and-drop (usando @dnd-kit/sortable)
- Duplicar elemento
- Copiar/Colar estilos
- Undo/Redo
- Zoom in/out

**Melhorias no Properties Panel:**
- Presets de cores da marca
- Upload de imagem direto
- Link para URL no botão
- Responsividade (visualizar mobile/desktop)

**Novos Arquivos:**
- `src/components/EmailDesigner/ImprovedDesignCanvas.tsx`
- `src/components/EmailDesigner/EnhancedElementsPalette.tsx`
- `src/components/EmailDesigner/ResponsivePreview.tsx`
- `src/components/EmailDesigner/TemplateGallery.tsx`

**Geração de HTML:**
- Melhorar função `generateHTML()` para criar código responsivo
- Inline CSS para compatibilidade com clientes de email
- Adicionar meta tags para preview

---

## Parte 4: Limite de 500 Emails Diários

### Implementação

**Banco de Dados:**
Nova tabela `email_send_limits`:
```sql
CREATE TABLE email_send_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_count INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
```

**Edge Function (send-email/index.ts):**
Adicionar verificação antes de enviar:
```typescript
// Check daily limit
const today = new Date().toISOString().split('T')[0];
const { data: limitData } = await supabase
  .from('email_send_limits')
  .select('sent_count, daily_limit')
  .eq('user_id', user_id)
  .eq('date', today)
  .single();

if (limitData && limitData.sent_count >= limitData.daily_limit) {
  throw new Error('Limite diário de 500 emails atingido');
}

// Increment counter after sending
await supabase.rpc('increment_email_count', { p_user_id: user_id });
```

**Frontend:**
- Barra de progresso mostrando "X/500 emails enviados hoje"
- Alerta quando próximo do limite (80%)
- Bloqueio visual quando atingido

---

## Parte 5: Integração com IA

### Recursos

**Melhorar Assunto:**
- Usa OpenAI para gerar 3 variações do assunto
- Mostra taxa de abertura estimada (simulada)
- Permite escolher ou editar

**Melhorar Texto:**
- Botão no editor para melhorar gramática/tom
- Sugestões de CTA (Call to Action)

**Edge Function:** Usar `ai-chat/index.ts` existente ou criar `ai-email-helper/index.ts`

---

## Estrutura de Arquivos

```text
src/components/Dashboard/
├── CleanEmailMarketing.tsx      (MODIFICAR - layout principal)
├── EmailComposerWizard.tsx      (NOVO - wizard step-by-step)
├── EmailLimitIndicator.tsx      (NOVO - indicador de limite)
├── EmailConnectionPopover.tsx   (NOVO - conexão discreta)

src/components/EmailDesigner/
├── EmailDesigner.tsx            (MODIFICAR - melhorias gerais)
├── DesignCanvas.tsx             (MODIFICAR - reordenação)
├── ElementsPalette.tsx          (MODIFICAR - novos elementos)
├── PropertiesPanel.tsx          (MODIFICAR - mais opções)
├── ResponsivePreview.tsx        (NOVO - preview mobile/desktop)
├── TemplateGallery.tsx          (NOVO - galeria de templates prontos)
├── AISubjectHelper.tsx          (NOVO - melhorar assunto com IA)

supabase/functions/send-email/
├── index.ts                     (MODIFICAR - adicionar limite)

Database:
├── email_send_limits            (NOVA TABELA)
```

---

## Fluxo de Usuário Final

```text
1. Usuário acessa /dashboard/email
2. Vê header com "Gmail Conectado" discreto
3. Clica em "Compor Email"
4. Wizard Step 1: Adiciona destinatários
5. Wizard Step 2: Escreve assunto, clica "Melhorar com IA"
6. Wizard Step 3: Escolhe template ou cria no Designer
7. Wizard Step 4: Revisa e envia
8. Sistema verifica limite (500/dia)
9. Email enviado, contador incrementado
```

---

## Resumo das Alterações

| Item | Tipo | Prioridade |
|------|------|------------|
| Conexão discreta no header | Modificar | Alta |
| Wizard step-by-step | Novo | Alta |
| Limite 500 emails/dia | Novo | Alta |
| Designer visual melhorado | Modificar | Média |
| Integração IA (assunto) | Novo | Média |
| Novos elementos no palette | Novo | Média |
| Preview responsivo | Novo | Baixa |
| Galeria de templates prontos | Novo | Baixa |

---

## Tecnologias Utilizadas

- **React** + **TypeScript** para componentes
- **@dnd-kit** para drag-and-drop (já instalado)
- **Supabase** para banco de dados e edge functions
- **OpenAI** para melhorias com IA (secret já configurado)
- **Tailwind CSS** para estilização
- **Framer Motion** para animações do wizard
