

## Header Colorido Dinamico por Hub

### Cores por Rota

| Rota | Cor | Hub |
|------|-----|-----|
| `/dashboard` (home) | `#3000E3` (azul Ellosuit) | Default |
| `/dashboard/omni/*` | `#FF4500` (laranja) | Omni |
| `/dashboard/flows/*`, `/dashboard/agenda/*`, etc. | `#007DE3` (azul) | Flow |
| `/dashboard/track/*` | `#00E371` (verde) | Track |
| `/dashboard/cadastros/*`, `/dashboard/drive/*`, `/dashboard/analytics/*` | `#3000E3` (azul Ellosuit) | Suite |

### Visual

- Fundo do header (h-16) recebe a cor do hub ativo com transicao CSS suave (500ms)
- Textos dos botoes de navegacao ficam brancos
- Logo, icones (sino, engrenagem), avatar ficam brancos
- Botao ativo: fundo `white/20` (glassmorphism sutil)
- Hover nos botoes: `white/10`
- O mega menu dropdown que abre embaixo continua branco com sombra, sem alteracao

### Detalhes Tecnicos

**Arquivo: `src/hooks/useHubColor.tsx`**

- Adicionar rotas Suite: `/dashboard/drive`, `/dashboard/analytics`, `/dashboard/ello-vision`, `/dashboard/relatorios`, `/dashboard/perfil`, `/dashboard/assinatura`
- Cor Suite: `#3000E3` (mesmo que DEFAULT_COLOR)
- Adicionar `hub: 'suite'` ao retorno

**Arquivo: `src/components/Dashboard/MegaMenuHeader.tsx`**

1. No `<header>`, trocar `bg-white border-b border-gray-100` por estilo inline: `backgroundColor: hubColor`, `transition: 'all 0.5s ease-in-out'`
2. Remover `border-b border-gray-100` (nao precisa de borda quando tem cor)
3. Textos de navegacao: brancos (`text-white/80` inativo, `text-white` ativo)
4. Botao ativo do hub: `backgroundColor: 'rgba(255,255,255,0.2)'` em vez de `${group.color}10`
5. Hover: `rgba(255,255,255,0.1)`
6. Icones do lado direito (Bell, Settings): `text-white` em vez de `text-gray-500`
7. Badge de notificacao: permanece vermelho
8. Avatar fallback: permanece como esta (ja tem cor propria)
9. Logo (ElloLogo): passar `color="white"` ou `className` branco
10. ChevronDown: `text-white/60`
11. O mega menu dropdown (parte que expande abaixo) permanece exatamente como esta: `bg-white`, icones coloridos, texto escuro

### Animacoes

- `transition: all 0.5s ease-in-out` no header para transicao suave entre cores ao navegar entre hubs
- Botoes de nav com transicao de opacidade no hover

