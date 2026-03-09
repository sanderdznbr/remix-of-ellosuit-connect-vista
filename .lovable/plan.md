

# Wizard Redesign: Modo Simples + Avancado com Edicao de Texto por Card

## Resumo

Reorganizar o wizard de criacao em dois modos: **Simples** (fluxo rapido, menos etapas) e **Avancado** (controle total, incluindo edicao de texto por card). Ambos os modos suportam Post Unico e Carrossel, com a nova funcionalidade de definir o texto exato de cada card antes da geracao.

---

## Fluxo Proposto

### Tela Inicial do Wizard (Step 0) - NOVO

Antes de comecar, o usuario escolhe:

```text
+------------------------------------------+
|  Como voce quer criar?                    |
|                                           |
|  [  Simples  ]    [  Avancado  ]          |
|  Rapido, a IA       Controle total:       |
|  cuida de tudo      textos, rosto,        |
|                     produto, cores...     |
+------------------------------------------+
```

Um toggle/chip no topo do wizard que pode ser alternado a qualquer momento.

### Modo Simples (4 etapas)

| Step | Conteudo |
|------|----------|
| 0 | Tema + Formato (Post Unico / Carrossel + slider de quantidade) |
| 1 | Rosto (opcional, com botao "Pular") |
| 2 | Logo + Marca (upload logo, nome da marca) |
| 3 | Velocidade (Flash vs Pro) -> Gerar |

- Cores, fontes e estilo sao aplicados automaticamente (paleta aleatoria ou da marca)
- Sem etapa de produto, sem referencias de marca, sem cores/fontes manuais
- Web search fica ativo por padrao (sem toggle visivel)

### Modo Avancado (manter as 11 etapas atuais + nova etapa de texto por card)

| Step | Conteudo |
|------|----------|
| 0 | Tema (com engrenagem de texto exato e toggle de web search) |
| 1 | Formato (Post Unico / Carrossel + slider) |
| 2 | Imagens da Web (skip automatico se desativado) |
| 3 | Rosto (multi-pessoa, ate 4) |
| 4 | Produto |
| 5 | Referencias de Marca |
| 6 | Estilo (presets / marketplace) |
| 7 | Cores |
| 8 | Fontes |
| 9 | **Roteiro por Card** (NOVO) |
| 10 | Logo + Marca |
| 11 | Velocidade -> Gerar |

### Nova Etapa: Roteiro por Card (Step 9 no modo avancado)

```text
+------------------------------------------+
|  Defina o texto de cada card              |
|  (opcional - a IA preenche o que faltar)  |
|                                           |
|  Card 1 (Capa)                            |
|  [____________________________]           |
|  [____________________________]           |
|                                           |
|  Card 2                                   |
|  [____________________________]           |
|  [____________________________]           |
|                                           |
|  ...                                      |
|                                           |
|  [+ Preencher todos com IA]              |
+------------------------------------------+
```

- Cada card tera campos para titulo e corpo
- Campos pre-preenchidos pela IA (via prompt) OU deixados vazios para a IA decidir
- Botao "Preencher com IA" gera sugestoes para todos os cards de uma vez
- O texto definido aqui sera enviado ao `generate-carousel` como `manualCardTexts`
- No post unico, mostra apenas 1 card com titulo, subtitulo e CTA

---

## Detalhes Tecnicos

### 1. Novo estado `wizardMode`

```typescript
const [wizardMode, setWizardMode] = useState<'simple' | 'advanced'>('simple');
```

### 2. Mapeamento de steps dinamico

Criar duas constantes de steps:

```typescript
const SIMPLE_STEPS = ['Tema', 'Rosto', 'Logo', 'Velocidade'];
const ADVANCED_STEPS = ['Tema', 'Formato', 'Fotos', 'Rosto', 'Produto', 'Marca', 'Estilo', 'Cores', 'Fontes', 'Roteiro', 'Logo', 'Velocidade'];
```

A constante `WIZARD_STEPS` sera derivada do `wizardMode`.

### 3. Navegacao condicional

A logica de `next`/`prev` no wizard usara o array de steps correto. No modo simples, o step 0 (Tema) incluira o seletor de formato embutido (Post Unico/Carrossel + slider), eliminando a necessidade de um step separado.

### 4. Novo estado `manualCardTexts`

```typescript
const [manualCardTexts, setManualCardTexts] = useState<
  { title?: string; body?: string }[]
>([]);
```

### 5. Novo componente `StepCardTexts.tsx`

- Recebe `cardCount`, `contentMode`, `manualCardTexts`, `setManualCardTexts`
- Renderiza um accordion/lista de cards com campos de titulo e corpo
- Botao "Preencher com IA" chama `generate-carousel` com action `generate-outline`
- Cada card editavel individualmente

### 6. Integracao com geracao

No `generateContent()`, enviar `manualCardTexts` ao `generate-carousel` edge function. O backend usara esses textos como base, preenchendo apenas os que estiverem vazios.

### 7. Toggle simples/avancado

Um chip no canto superior direito do wizard que permite alternar entre modos a qualquer momento. Ao mudar de avancado para simples, os dados preenchidos sao preservados (nao resetados).

---

## Arquivos a Criar/Editar

| Arquivo | Acao |
|---------|------|
| `src/components/Carousel/wizard/StepCardTexts.tsx` | **Criar** - novo componente de roteiro por card |
| `src/components/Carousel/CarouselGenerator.tsx` | **Editar** - adicionar wizardMode, manualCardTexts, logica de steps condicional, toggle de modo |
| `src/components/Carousel/wizard/StepTopic.tsx` | **Editar** - no modo simples, embutir seletor de formato |
| `supabase/functions/generate-carousel/index.ts` | **Editar** - aceitar `manualCardTexts` e usa-los na geracao |

