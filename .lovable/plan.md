
# Plano: Corrigir Duplicação de Mensagens no Frontend (Definitivo)

## Diagnóstico

A duplicação ocorre porque existem **3 fontes** que podem adicionar mensagens ao state:

1. **Otimização local** (linha 948): Adiciona `temp-xxx` imediatamente
2. **Realtime subscription** (linhas 731-746): Adiciona quando recebe INSERT do banco
3. **Polling 500ms** (linha 828): Recarrega mensagens periodicamente

O problema está na **realtime subscription** que não verifica se já existe uma mensagem otimista (temp) com o mesmo conteúdo antes de adicionar.

## Solução

### Etapa 1: Corrigir Realtime no WhatsAppCRM.tsx

Modificar a lógica de INSERT (linhas 731-746) para:
1. Verificar se existe mensagem temp com mesmo conteúdo
2. Se existir: **substituir** o temp pelo real (não adicionar)
3. Se não existir: verificar por conteúdo duplicado recente antes de adicionar

```text
Antes:
- Verifica apenas ID exato e wa_message_id
- Se não encontra, adiciona (causando duplicação)

Depois:
- Verifica ID exato e wa_message_id
- Verifica se existe temp-xxx com mesmo conteúdo → SUBSTITUI
- Verifica se existe duplicata recente por conteúdo → IGNORA
- Só adiciona se realmente for nova
```

### Etapa 2: Melhorar loadMessagesByPhone

A função já tem lógica de merge, mas pode melhorar:
1. Usar um Map para tracking de mensagens pendentes
2. Garantir que temp messages são removidas quando o servidor confirma

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/CRM/WhatsAppCRM.tsx` | Corrigir dedup no realtime INSERT |

## Resultado Esperado

- Mensagem enviada aparece **uma única vez**
- Transição suave de `temp-xxx` para `uuid-real`
- Zero duplicação visual
