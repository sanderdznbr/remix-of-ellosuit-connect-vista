
# 🎬 Carrossel Animado — Plano de Integração

## Conceito
Novo modo no wizard onde a IA gera código HTML/CSS animado para cada card do carrossel, que é renderizado como vídeo no browser do usuário.

## Arquitetura

### 1. Nova Edge Function: `generate-animated-card`
- Recebe: tema, estilo, número do card, branding (cores, logo, fontes)
- Usa Lovable AI para gerar código HTML/CSS completo com animações (keyframes, transitions)
- Retorna: código HTML/CSS autocontido para cada card
- A IA é instruída a criar animações de 3-5 segundos em formato 4:5 (1080x1350)

### 2. Novo componente: `AnimatedCardRenderer`
- Renderiza o HTML/CSS em um iframe invisível (sandboxed)
- Usa **MediaRecorder API** + `canvas.captureStream()` para gravar como WebM
- Cada card gera um vídeo de ~4 segundos
- Processamento 100% client-side (sem servidor de renderização)

### 3. Integração no Wizard
- Novo modo "Animado" no `StepMode` (ao lado de Simples/Avançado/Extreme)
- Reutiliza etapas existentes: Tópico, Cores, Branding
- Etapa especial de "Estilo de Animação" (fade-in, slide, bounce, etc.)
- Na geração, mostra preview em tempo real de cada card sendo animado

### 4. Fluxo do Usuário
1. Escolhe modo "Animado" ✨
2. Define tópico (reutiliza StepTopic)
3. Escolhe estilo de animação (novo step)
4. Define branding (reutiliza StepPersonalization)
5. Gera → IA cria HTML/CSS para cada card
6. Preview animado → usuário vê cada card rodando
7. Download como vídeos MP4/WebM individuais ou ZIP

### 5. Prompt Engineering (IA)
A IA recebe instruções para gerar:
- HTML/CSS puro (sem JS, sem libs externas)
- Animações via `@keyframes` CSS
- Duração fixa de 4 segundos
- Canvas de 1080x1350px (4:5)
- Tipografia, cores e logo integrados
- Estilo visual coerente entre todos os cards

### 6. Limitações e Considerações
- **MediaRecorder** gera WebM (Chrome) — conversão para MP4 pode precisar de ffmpeg.wasm
- Cards complexos podem ficar pesados no mobile
- Primeira versão: apenas desktop
- Créditos: custo maior que carrossel estático (1 chamada AI por card)

## Etapas de Implementação
1. ✅ Criar edge function `generate-animated-card`
2. ✅ Criar componente `AnimatedCardRenderer` (iframe + MediaRecorder)
3. ✅ Adicionar modo "Animado" no StepMode
4. ✅ Criar StepAnimationStyle (escolha do tipo de animação)
5. ✅ Integrar no CarouselGenerator
6. ✅ Testar com diferentes temas e estilos
