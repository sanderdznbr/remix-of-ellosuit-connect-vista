
# Plano: Geração de Post Individual (1080x1350)

## Resumo
Adicionar a funcionalidade de gerar um **Post único** (1080x1350) além do carrossel, com opção de inserir texto manualmente que será renderizado diretamente na imagem.

## Mudanças Necessárias

### 1. Tela de boas-vindas (WelcomeScreen) -- adicionar seleção de tipo
- Abaixo do campo de prompt, adicionar dois botões de seleção: **"Carrossel"** e **"Post Único"**
- Quando "Post Único" for selecionado, mostrar um campo extra: **"Texto no post"** (textarea) onde o usuário digita o texto que deve aparecer renderizado na imagem
- O `onStart` passará um novo parâmetro indicando o modo (`carousel` ou `single-post`) e o texto manual

### 2. CarouselGenerator -- novo modo "single post"
- Adicionar estado `contentMode: 'carousel' | 'single-post'` e `manualPostText: string`
- No modo "single post":
  - Pular o wizard de "Quantidade de slides" (forçar `cardCount = 1`)
  - Gerar apenas 1 card com a imagem IA incluindo o texto manual renderizado diretamente
  - A geração de imagem usará um prompt especial que instrui a IA a renderizar o texto fornecido com tipografia editorial integrada (similar ao modo full-bleed dos estilos marketplace)
  - O editor mostrará o card único sem strip de thumbnails, apenas o preview e a sidebar de edição
  - Exportar como imagem única (sem opção ZIP, apenas PNG/JPG/WEBP direto)

### 3. Prompt de geração para post único
- Quando `contentMode === 'single-post'`, o prompt enviado ao `generate-carousel-image` incluirá:
  - O texto manual como **conteúdo obrigatório a ser renderizado** na imagem
  - Instrução para gerar composição editorial completa com tipografia integrada (1080x1350)
  - Referências de rosto, estilo e produto (se fornecidas)
  - Cores da marca (se extraídas do logo)
- Não será necessário chamar o `generate-carousel` para gerar conteúdo textual -- o texto é manual

### 4. Fluxo do wizard no modo single-post
- O wizard terá passos reduzidos: **Tema/Texto** -> **Fotos** -> **Rosto** -> **Produto** -> **Marca** -> **Estilo** -> **Gerar**
- O passo "Quantidade" será pulado automaticamente
- No passo "Tema", aparecerá o campo adicional "Texto que deve aparecer no post" (textarea)

### 5. Ajustes na exportação
- No modo single-post, o botão "Exportar" baixará diretamente a imagem (sem ZIP), com opção de formato (PNG/JPG/WEBP)

## Arquivos a Editar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Carousel/WelcomeScreen.tsx` | Adicionar botões "Carrossel" / "Post Único" e campo de texto manual; atualizar `onStart` com novos params |
| `src/components/Carousel/CarouselGenerator.tsx` | Novo estado `contentMode` e `manualPostText`; lógica de geração simplificada para single-post; wizard steps reduzidos; exportação direta |
| `src/components/Carousel/wizard/StepTopic.tsx` | Adicionar campo "Texto no post" quando modo é single-post |

## Detalhes Técnicos

- A geração do post único **não** chama `generate-carousel` (edge function de texto). Vai direto para `generate-carousel-image` com um prompt que inclui o texto manual
- O prompt será construído no estilo full-bleed: texto renderizado pela IA dentro da imagem com tipografia editorial
- O campo de texto manual suporta múltiplas linhas e será enviado integralmente no prompt
- Auto-save funciona normalmente, salvando como um "carrossel" de 1 card no banco
