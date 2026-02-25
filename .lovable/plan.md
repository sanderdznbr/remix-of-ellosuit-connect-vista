
# Corrigir Scroll da Pagina do Carrossel

## Problema
O container raiz do `CarouselGenerator.tsx` usa `min-h-screen flex flex-col`, o que permite ao container crescer alem da viewport sem nunca ativar scroll. A secao de preview do Instagram (linha 1722) tem `overflow-hidden overflow-y-auto`, mas como o container pai nao tem altura fixa, o `flex-1` simplesmente expande e nada rola.

## Solucao

Alterar o container raiz (linha 1396) de `min-h-screen` para `h-screen` com `overflow-y-auto`:

```
// De:
<div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0A0A0A' }}>

// Para:
<div className="h-screen flex flex-col overflow-y-auto" style={{ backgroundColor: '#0A0A0A' }}>
```

E na secao de preview do Instagram (linha 1722), remover `overflow-hidden` que conflita:

```
// De:
className="flex-1 flex flex-col items-center justify-start py-8 px-4 relative overflow-hidden overflow-y-auto"

// Para:
className="flex-1 flex flex-col items-center justify-start py-8 px-4 relative overflow-y-auto"
```

## Detalhes tecnicos
- `h-screen` fixa a altura do container a viewport, forcando o conteudo que exceder a usar scroll
- `overflow-y-auto` no container raiz garante rolagem vertical
- Remover `overflow-hidden` da secao de preview evita conflito que bloqueia o scroll
- O editor full-screen (fixed inset-0) nao e afetado pois tem posicionamento absoluto
