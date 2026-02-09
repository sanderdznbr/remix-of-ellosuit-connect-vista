
# Fix: Fundo preto/cinza no Email Builder

## Problema
O arquivo `meeting-dark-theme.css` (linha 47-48) tem uma regra CSS extremamente agressiva:

```css
div[style*="background"] {
  background-color: #101010 !important;
}
```

Essa regra seleciona **qualquer div** que tenha "background" no atributo `style` e forca fundo preto com `!important`. Como adicionamos `style={{ backgroundColor: '#ffffff' }}` ao canvas do Email Builder, essa regra CSS esta sobrescrevendo o branco com preto.

## Solucao

Duas alteracoes:

### 1. Corrigir `meeting-dark-theme.css` (linha 47-48)
Limitar a regra agressiva para que ela so se aplique dentro de paginas de reuniao (LiveKit), e nao em toda a aplicacao:

**De:**
```css
div[style*="background"] {
  background-color: #101010 !important;
}
```

**Para:**
```css
[data-meeting-page] div[style*="background"] {
  background-color: #101010 !important;
}
```

Isso garante que a regra so atue dentro de elementos que possuem o atributo `data-meeting-page`, sem afetar o Email Builder nem nenhuma outra pagina.

### 2. Manter o inline style no `EmailTemplateBuilder.tsx`
O `style={{ backgroundColor: '#ffffff' }}` ja adicionado na linha 1390 vai funcionar corretamente apos a correcao do CSS acima.

## Impacto
- O Email Builder tera fundo branco como esperado
- As reunioes LiveKit continuam com fundo escuro (ja usam `data-meeting-page`)
- Nenhuma outra pagina e afetada negativamente
