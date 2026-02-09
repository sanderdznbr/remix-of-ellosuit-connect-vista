

## Melhorias no Chat do Bot IA

### Problemas identificados
1. Cores do modal usam `primary` (roxo) em vez de laranja (#FF4500)
2. Texto das mensagens do bot tem baixa visibilidade (cinza claro sobre fundo cinza)
3. Bot envia markdown com asteriscos (`**texto**`) que aparecem crus na tela
4. System prompt nao instrui o bot a responder sem formatacao markdown
5. Configuracoes do agente (limite de caracteres, etc.) nao sao passadas ao prompt

### Alteracoes planejadas

**1. `src/components/BotIA/BotIAChat.tsx` (Visual + Markdown strip)**
- Trocar todas as referencias `primary` / `from-primary to-primary/60` pelo laranja `#FF4500`
- Avatar do bot: fundo laranja em vez de roxo
- Bolha do usuario: fundo laranja em vez de roxo
- Botao de enviar: laranja
- Header: icone laranja, modelo exibe "elloiav1.0"
- Texto das mensagens do bot: usar `text-gray-900` para melhor contraste (em vez de `text-foreground` sobre `bg-muted`)
- Adicionar funcao `cleanMarkdown()` que remove `**`, `*`, `##`, `#`, `` ` `` e outros caracteres markdown antes de exibir
- No system prompt enviado a API, adicionar instrucao explicita: "Responda como um humano real. NAO use markdown, asteriscos, negrito, listas com marcadores ou qualquer formatacao especial. Escreva texto corrido e natural."
- Passar `settings.maxResponseChars` do agente como instrucao no prompt (ex: "Limite suas respostas a no maximo X caracteres")
- Passar `settings.temperature` no body da requisicao a API
- Passar `settings.humor` como parte do prompt de personalidade

**2. `supabase/functions/ai-chat/index.ts` (Suporte a temperature)**
- Aceitar campo `temperature` no body da requisicao
- Passar `temperature` ao AI Gateway na chamada `fetch`

### Detalhes tecnicos

Funcao `cleanMarkdown`:
```
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **bold**
    .replace(/\*(.*?)\*/g, '$1')      // *italic*
    .replace(/#{1,6}\s?/g, '')        // # headers
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // `code`
    .replace(/^[-*+]\s/gm, '• ')      // list markers -> bullet
    .trim();
}
```

System prompt adicionado:
```
"IMPORTANTE: Responda como um ser humano real conversando. 
NAO use asteriscos, negrito, italico, markdown ou formatacao especial. 
Escreva texto corrido e natural, como uma pessoa digitando no WhatsApp."
```

Arquivos afetados:
- `src/components/BotIA/BotIAChat.tsx`
- `supabase/functions/ai-chat/index.ts`

