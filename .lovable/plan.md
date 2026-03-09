

## Análise: Sistema de Remoção Automática de Logos

### O que você quer
Carregar até 15 posts de diferentes pessoas, a IA identificar automaticamente onde estão as logos em cada imagem, e removê-las com preenchimento generativo, entregando todas as imagens "limpas".

### Viabilidade Técnica

**Sim, é possível!** E podemos fazer usando a infraestrutura que já existe no projeto.

### Como funciona

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE REMOÇÃO DE LOGOS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. UPLOAD (até 15 imagens)                                     │
│     └── Arrastar ou selecionar posts                            │
│                                                                 │
│  2. DETECÇÃO DE LOGOS (IA Vision)                               │
│     └── Gemini analisa cada imagem e retorna coordenadas        │
│         das logos encontradas (bounding boxes)                  │
│                                                                 │
│  3. PREVIEW COM MARCAÇÕES                                       │
│     └── Usuário vê onde a IA detectou logos                     │
│     └── Pode ajustar/adicionar/remover áreas manualmente        │
│                                                                 │
│  4. INPAINTING EM LOTE                                          │
│     └── Para cada imagem: gera máscara → preenche               │
│     └── Processamento paralelo (3-5 por vez)                    │
│                                                                 │
│  5. DOWNLOAD                                                    │
│     └── ZIP com todas as imagens processadas                    │
│     └── Ou download individual                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes a criar

| Componente | Descrição |
|------------|-----------|
| **LogoRemoverTool** | Tela de upload e gerenciamento do processo |
| **LogoDetectionPreview** | Preview das detecções com edição manual |
| **Edge Function** | `logo-removal` - detecta logos + faz inpainting |

### Edge Function: Duas ações

1. **`detect`**: Envia imagem para Gemini Vision, pede coordenadas de todas as logos
2. **`remove`**: Recebe imagem + coordenadas, gera máscara, aplica inpainting

### Tecnologias utilizadas

- **Detecção**: Gemini 2.5 Flash (vision) - já integrado via Lovable AI Gateway
- **Inpainting**: Gemini 2.5 Flash Image - já integrado
- **ZIP**: jszip (já instalado no projeto)

### Limitações e considerações

- Processamento de 15 imagens pode levar 2-5 minutos
- Logos muito pequenas (<50px) podem não ser detectadas
- Logos integradas ao design (ex: marca d'água transparente) são mais difíceis
- Custo estimado: ~$0.01-0.02 por imagem (detecção + inpainting)

### Localização no Dashboard

Nova seção em "Ferramentas" ou como botão no DashboardHome.

