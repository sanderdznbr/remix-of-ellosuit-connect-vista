# ✅ Plano: Corrigir Geração de QR Code do Baileys

## Status: IMPLEMENTADO (v2.5.0)

## Mudanças Principais v2.5.0

| Item | Status |
|------|--------|
| Listener direto para evento `qr` | ✅ Implementado |
| Error handling robusto no auth state | ✅ Implementado |
| Logging detalhado por etapas | ✅ Implementado |
| Retry imediato em desconexões rápidas | ✅ Implementado |
| Até 10 tentativas de gerar QR | ✅ Implementado |

## Verificação nos Logs do Railway

Após deploy do v2.5.0, você deve ver:

```
[SOCKET] Etapa 1: Preparando diretório de auth...
[SOCKET] Etapa 1: ✓ Diretório pronto
[SOCKET] Etapa 2: Carregando auth state...
[SOCKET] Etapa 2: ✓ Auth state carregado
[SOCKET] Etapa 3: Buscando versão do Baileys...
[SOCKET] Etapa 3: ✓ Versão: 2.3000.xxx
[SOCKET] Etapa 4: Configurando socket...
[SOCKET] Etapa 4: ✓ Config pronta
[SOCKET] Etapa 5: Criando socket Baileys...
[SOCKET] Etapa 5: ✓ Socket criado!
[SOCKET] Etapa 6: Registrando event listeners...
[SOCKET] Etapa 6: ✓ QR DIRETO registrado
[QR-EVENT] ⚡⚡⚡ EVENTO QR RECEBIDO DIRETAMENTE! ⚡⚡⚡
[QR-EVENT] ✅ QR Code convertido para DataURL!
```

## Diagnóstico por Etapa

| Se parar em... | Problema provável |
|----------------|-------------------|
| Etapa 1 | Permissão de escrita no filesystem |
| Etapa 2 | Erro no `useMultiFileAuthState` |
| Etapa 3 | Problema de rede (não consegue buscar versão) |
| Etapa 5 | Baileys não conseguiu criar socket |
| Após Etapa 6 sem QR | Conexão com WhatsApp bloqueada |

## Próximos Passos do Usuário

1. Baixar o novo ZIP (v2.5.0) clicando no botão "Servidor"
2. Substituir o `index.js` no repositório GitHub
3. Aguardar deploy no Railway
4. Tentar conectar novamente
5. Se falhar, verificar logs usando a tabela de diagnóstico acima
