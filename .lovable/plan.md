
# Plano: Servidor Baileys v2.3.0 - Auto-Retry de Socket

## Problema Identificado

O Baileys desconecta com `Code: undefined` **ANTES** de gerar o QR Code:
```
[SESSION] Criando whatsapp-xxx
[DISCONNECTED] whatsapp-xxx - Code: undefined, wasConnected: false
[WAITING] aguardando QR ser escaneado
```

O socket morre antes de gerar o QR, deixando a sessão "presa" sem QR.

## Solução v2.3.0

### Lógica de Auto-Retry

```text
Sessão criada
     ↓
Socket conecta ao WhatsApp
     ↓
Desconecta (Code: undefined) sem gerar QR?
     ↓
SIM → qrRetryCount < 3?
     ↓
SIM → Aguarda 2s * qrRetryCount
     ↓
Recria socket automaticamente
     ↓
Tenta gerar QR novamente
```

### Mudanças no Servidor

1. **Nova função `createSocketForSession()`** - Cria/recria socket para uma sessão existente
2. **Campo `qrRetryCount`** - Conta tentativas de gerar QR
3. **Campo `qrGeneratedAt`** - Registra quando QR foi gerado
4. **Auto-retry com backoff** - Se desconectar sem QR, tenta novamente (até 3x)
5. **Novo endpoint `/regenerate-qr`** - Força regeneração de QR

### Mudanças na Edge Function

- Usa novo endpoint `/regenerate-qr` do servidor
- Polling mais longo (8 tentativas de 2s = 16s)
- Melhor logging

## Arquivos Modificados

| Arquivo | Versão | Mudança |
|---------|--------|---------|
| `BaileysServerDownload.tsx` | v2.3.0 | Auto-retry de socket |
| `whatsapp-api/index.ts` | - | Usa /regenerate-qr endpoint |
| `WhatsAppQRModal.tsx` | - | Botão "Gerar Novo QR Code" |

## Como Testar

1. **Baixe o novo servidor v2.3.0** no CRM (botão "Servidor")
2. Atualize o `index.js` no GitHub
3. Railway vai redeploy automaticamente
4. Ao conectar, o servidor vai tentar até 3x gerar o QR automaticamente

## Logs Esperados (Sucesso)

```
[SOCKET] Criando socket para whatsapp-xxx - tentativa 1/3
[DISCONNECTED] whatsapp-xxx - Code: undefined, hadQR: false, qrRetryCount: 0
[QR-RETRY] whatsapp-xxx desconectou sem QR, tentando em 2s... (1/3)
[SOCKET] Criando socket para whatsapp-xxx - tentativa 2/3
[QR] ✅ Gerado para whatsapp-xxx
```
