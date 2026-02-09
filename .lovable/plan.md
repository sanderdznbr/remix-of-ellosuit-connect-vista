

# Fix: Fundo escuro no Email Builder

## Problema
O container do canvas do Email Builder aparece com fundo escuro/preto porque a classe Tailwind `bg-white` e usada no dark mode, o que faz com que o tema escuro sobrescreva a cor de fundo.

## Solucao
Forcar o fundo branco no container externo do canvas usando `style={{ backgroundColor: '#ffffff' }}` em vez de depender apenas da classe Tailwind `bg-white`.

## Detalhes Tecnicos

**Arquivo:** `src/components/Dashboard/EmailTemplateBuilder.tsx`

**Linha 1389** - Container do canvas:
- Atual: `className="flex-1 p-8 overflow-y-auto transition-colors bg-white ..."`
- Adicionar: `style={{ backgroundColor: '#ffffff' }}` para forcar o fundo branco independentemente do tema

Isso garante que o fundo ao redor do email (a area cinza/preta visivel no print) fique branco, igual ao que ja foi feito para o container interno do email nas linhas 1409-1411.

