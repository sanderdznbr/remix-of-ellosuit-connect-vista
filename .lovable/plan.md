
# Corrigir Audio: Dashboard + WhatsApp

## Problemas Identificados

### 1. Dashboard - Audio nao toca apos resposta
O codigo chama `speakText()` automaticamente apos cada resposta da IA, mas:
- Nao ha log de erro visivel (o `catch` engole silenciosamente)
- Navegadores bloqueiam autoplay de audio sem interacao do usuario
- A funcao `elevenlabs-tts` funciona (testada com sucesso), mas o audio pode nao tocar por restricao do navegador

### 2. WhatsApp - IA diz que nao ouviu o audio
O fluxo de transcricao esta implementado (download fallback + ElevenLabs Scribe), mas:
- Os logs nao mostram nenhum processamento de mensagem de audio recente
- A transcricao pode estar falhando silenciosamente (mediaUrl nao acessivel, Scribe retornando erro)
- Precisa de melhor logging para diagnostico

### 3. WhatsApp - IA nao responde com audio (ElevenLabs)
O agente "Ellosuit Assistant" tem `ttsVoice: 'nova'` (OpenAI) em vez de `'ello'` (ElevenLabs). O `audioResponseMode` e `'when_audio'`, o que esta correto (responde com audio quando recebe audio), mas a voz precisa ser alterada para ElevenLabs.

---

## Plano de Correcao

### Tarefa 1: Dashboard - Corrigir autoplay e adicionar feedback visual
**Arquivo:** `src/components/Dashboard/AIAssistantHome.tsx`

- Adicionar `console.log` no `speakText` para rastrear chamadas e erros
- Tratar erro de autoplay do navegador: se `audio.play()` falhar com `NotAllowedError`, mostrar um botao/toast para o usuario clicar e ouvir manualmente
- Adicionar um botao de speaker nas mensagens do assistente para reproduzir manualmente
- Garantir que o `pendingSpeakRef` funcione corretamente apos o `setMessages`

### Tarefa 2: WhatsApp - Melhorar robustez da transcricao de audio
**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

- Adicionar mais logging no fluxo de audio (platform-agent e agent regular) para identificar onde falha
- Verificar se o `audioResp = await fetch(mediaUrl)` esta retornando 200 (a URL publica do Supabase pode nao estar acessivel)
- Adicionar fallback: se ElevenLabs Scribe falhar, tentar OpenAI Whisper como alternativa
- Garantir que o `content` da mensagem nao fique como `[Audio]` quando a transcricao falha

### Tarefa 3: WhatsApp - Alterar voz TTS para ElevenLabs
**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

- No bloco do platform-agent (Ellosuit Assistant), forcar `ttsVoice = 'ello'` para que use ElevenLabs TTS em vez de OpenAI
- Alternativa: atualizar o registro do agente no banco para `settings.ttsVoice = 'ello'`
- Garantir que o bloco de geracao de audio ElevenLabs (linhas 2484-2507) execute corretamente com a voz Ello

---

## Detalhes Tecnicos

### Dashboard - Autoplay Fix
```text
speakText() -> fetch elevenlabs-tts -> audio.play()
                                         |
                                    [NotAllowedError?]
                                         |
                              Mostrar botao "Ouvir resposta"
```

A estrategia e:
1. Tentar autoplay normalmente
2. Se o navegador bloquear, guardar o audioUrl e exibir um botao de play na mensagem
3. Ao clicar, o play funciona pois houve interacao do usuario

### WhatsApp - Fluxo de Audio Completo
```text
Audio recebido -> mediaUrl presente?
  |                    |
  Nao                 Sim
  |                    |
  Baileys Download -> Upload Supabase -> ElevenLabs Scribe -> Transcricao
                                                |
                                           [Falha?]
                                                |
                                    OpenAI Whisper (fallback)
```

### WhatsApp - TTS Response
```text
AI gera resposta texto -> ttsVoice == 'ello'?
                            |
                           Sim -> ElevenLabs API -> Upload audio -> Enviar PTT
                           Nao -> OpenAI TTS -> Upload audio -> Enviar PTT
```
