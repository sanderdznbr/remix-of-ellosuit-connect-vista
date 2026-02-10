
# Correção da API Pública WhatsApp - Endpoints Incorretos

## Problema Identificado

A Edge Function `whatsapp-public-api` está chamando endpoints que **nao existem** no servidor Baileys v4.6.0:

| O que a API chama (ERRADO) | O que o Baileys tem (CORRETO) |
|---|---|
| `/api/instance/{name}/send-message` | `/api/message/send` |
| `/api/instance/{name}/send-media` | `/api/message/send-media` |

Isso faz o servidor Baileys retornar uma pagina HTML de erro 404, que a API interpreta como falha.

## Correção

Atualizar o arquivo `supabase/functions/whatsapp-public-api/index.ts`:

### 1. Corrigir endpoint de envio de texto (send_text)

**De:**
```
/api/instance/${instanceKey}/send-message
```
**Para:**
```
/api/message/send
```

E incluir o `instanceName` no body da requisicao em vez da URL.

### 2. Corrigir endpoint de envio de midia (send_media)

**De:**
```
/api/instance/${iKey}/send-media
```
**Para:**
```
/api/message/send-media
```

Mesma logica: instanceName vai no body.

### 3. Adicionar tratamento de resposta HTML

Antes de tentar parsear o JSON da resposta, verificar o Content-Type. Se vier HTML, registrar erro claro no log.

### 4. Ajustar o body enviado ao Baileys

O Baileys v4.6.0 espera o campo `instanceName` no body para identificar a sessao, junto com `phone` e `message`.

---

## Instrucoes para o outro site (para voce enviar)

Nenhuma mudanca e necessaria no lado do site que consome a API. O problema e exclusivamente nos endpoints internos do Ellosuit que se comunicam com o servidor Baileys. A API publica (`/functions/v1/whatsapp-public-api`) continuara funcionando com os mesmos parametros:

```json
{
  "action": "send_text",
  "phone": "5511999999999",
  "message": "Ola!"
}
```

O header `X-API-Key` e o formato do body permanecem identicos.

---

## Detalhes Tecnicos

Arquivo modificado: `supabase/functions/whatsapp-public-api/index.ts`

Mudancas especificas:
- Linha ~133: URL de send-message corrigida para `/api/message/send`
- Linha ~136-139: Body atualizado para incluir `instanceName`
- Linha ~217: URL de send-media corrigida para `/api/message/send-media`
- Linha ~220-225: Body atualizado para incluir `instanceName`
- Adicao de `fetchJsonSafely` para detectar respostas HTML e gerar logs mais claros
