
# Plano de Correção: Rotas e Layouts

## Problemas Identificados

### 1. Rota `/termos` Não Funciona
**Causa**: A sidebar em `UnifiedSidebar.tsx` aponta para `/termos`, mas em `App.tsx` a rota está definida como `/terms`.

**Solução**: Corrigir o caminho na sidebar para `/terms` ou adicionar a rota `/termos` no App.tsx.

### 2. Rotas `/fornecedores` e `/prospectos` Não Funcionam
**Causa**: Ambas rotas apontam para o mesmo componente `ClientsManager` sem diferenciação. O componente não recebe um parâmetro de tipo para filtrar os dados.

**Solução**: 
- Modificar `ClientsManager` para aceitar uma prop `contactType` 
- Atualizar as rotas para passar o tipo apropriado
- Filtrar dados baseado no tipo de contato

### 3. Rotas `/usuarios` e `/clientes` São Iguais
**Causa**: Analisando o código:
- `/dashboard/funcionarios` -> `EmployeeManagement` (gerenciar funcionários da empresa)
- `/dashboard/clientes` -> `ClientsManager` (gerenciar clientes)

Não existe rota `/usuarios` definida. O problema é que a sidebar não tem `/usuarios`. A rota de usuários é `/funcionarios` que corretamente usa `EmployeeManagement`.

**Solução**: Verificar se existe uma rota `/usuarios` duplicada ou se é apenas confusão de nomenclatura. Criar distinção clara entre:
- Funcionários (usuários internos da empresa)
- Clientes (contatos externos)
- Fornecedores (tipo específico de contato)
- Prospectos (leads/potenciais clientes)

### 4. Layout `/drive` Precisa Melhorar
**Causa**: O layout atual é funcional mas básico, sem o visual moderno de um Google Drive.

**Solução**: Redesenhar com:
- Sidebar lateral com armazenamento usado, pastas favoritas, lixeira
- Área de drag-and-drop mais proeminente
- Cards de arquivo maiores com preview de imagem
- Barra de progresso de upload
- Menu de contexto (clique direito)
- Filtros por tipo de arquivo

### 5. Layout `/fluxos` Precisa Parecer com Trello
**Causa**: O FluxosBoard já tem estrutura Kanban básica, mas precisa de melhorias visuais.

**Solução**: Melhorar com:
- Scroll horizontal para colunas (overflow-x-auto)
- Colunas com largura fixa e altura máxima com scroll interno
- Cores de coluna mais vibrantes nos headers
- Contador de cards por coluna
- Botão de adicionar coluna no final
- Melhor visual dos cards com avatares, labels coloridas
- Animações de drag mais suaves

---

## Implementação Detalhada

### Etapa 1: Corrigir Rota `/termos`

**Arquivo: `src/components/Dashboard/UnifiedSidebar.tsx`**
- Alterar linha 100: `path: '/termos'` para `path: '/terms'`

### Etapa 2: Criar Componentes para Tipos de Contato

**Arquivo: `src/components/Dashboard/ClientsManager.tsx`**

Modificar para aceitar prop `contactType`:

```tsx
interface ClientsManagerProps {
  contactType?: 'cliente' | 'fornecedor' | 'prospecto' | 'all';
}

const ClientsManager = ({ contactType = 'all' }: ClientsManagerProps) => {
  // Título dinâmico baseado no tipo
  const titles = {
    cliente: 'Clientes',
    fornecedor: 'Fornecedores', 
    prospecto: 'Prospectos',
    all: 'Contatos'
  };
  
  // Filtrar dados baseado no tipo
  // ...
}
```

**Arquivo: `src/components/Mobile/MobileResponsiveDashboard.tsx`**

Atualizar rotas:
```tsx
<Route path="/clientes" element={<ClientsManager contactType="cliente" />} />
<Route path="/fornecedores" element={<ClientsManager contactType="fornecedor" />} />
<Route path="/prospectos" element={<ClientsManager contactType="prospecto" />} />
```

### Etapa 3: Redesenhar DriveManager

**Arquivo: `src/components/Dashboard/DriveManager.tsx`**

Novo layout inspirado no Google Drive:

```text
+------------------------------------------+
|  📁 Meu Drive                      [🔍]  |
+----------+-------------------------------+
| Sidebar  |  📁 Pastas                    |
| ---------|  +----+ +----+ +----+         |
| 🏠 Meu   |  |    | |    | |    |         |
| ⭐ Fav   |  +----+ +----+ +----+         |
| 🗑 Lixo  |                               |
| ---------|  📄 Arquivos Recentes         |
| 💾 12GB  |  +----+ +----+ +----+         |
| usado    |  |    | |    | |    |         |
+----------+-------------------------------+
```

Principais mudanças:
- Adicionar sidebar lateral com navegação rápida
- Cards de arquivo com preview de thumbnail
- Barra de progresso de armazenamento
- Drag-and-drop zone em tela cheia
- Grid responsivo melhor dimensionado

### Etapa 4: Melhorar FluxosBoard (Estilo Trello)

**Arquivo: `src/components/Fluxos/FluxosBoard.tsx`**

Novo layout estilo Trello:

```text
+----------------------------------------------------------+
| 🚀 Projeto X                    [+ Adicionar Quadro]     |
+----------------------------------------------------------+
| +------------+ +------------+ +------------+ +----------+|
| | 📋 A Fazer | |⏳ Progresso| | ✅ Feito   | | + Coluna ||
| | (5)        | | (3)        | | (12)       | |          ||
| +------------+ +------------+ +------------+ +----------+|
| | [Card 1]   | | [Card 4]   | | [Card 7]   |            |
| | [Card 2]   | | [Card 5]   | | [Card 8]   |            |
| | [Card 3]   | | [Card 6]   | | ...        |            |
| | [+ Card]   | | [+ Card]   | |            |            |
| +------------+ +------------+ +------------+            |
+----------------------------------------------------------+
```

Principais mudanças:
- Container com `overflow-x-auto` para scroll horizontal
- Colunas com `flex-shrink-0` e largura fixa (280-320px)
- Headers de coluna coloridos com contador
- Cards com design mais rico (avatar, tags, data)
- Botão de adicionar coluna visível no final
- Altura máxima das colunas com scroll interno

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/Dashboard/UnifiedSidebar.tsx` | Corrigir rota `/termos` -> `/terms` |
| `src/components/Dashboard/ClientsManager.tsx` | Adicionar prop `contactType` e lógica de filtro |
| `src/components/Mobile/MobileResponsiveDashboard.tsx` | Passar `contactType` para rotas |
| `src/components/Dashboard/DriveManager.tsx` | Redesenhar layout completo |
| `src/components/Fluxos/FluxosBoard.tsx` | Melhorar layout estilo Trello |

---

## Detalhes Técnicos

### ClientsManager com Tipos de Contato

```tsx
// Adicionar coluna client_type na tabela clients se não existir
// Ou usar o status existente para diferenciar

// No hook useClients, adicionar filtro por tipo:
const fetchClients = async (type?: string) => {
  let query = supabase.from('clients').select('*');
  
  if (type && type !== 'all') {
    query = query.eq('client_type', type);
  }
  
  // ...
};
```

### DriveManager com Sidebar

```tsx
// Estrutura do novo layout
<div className="flex h-full">
  {/* Sidebar */}
  <div className="w-64 border-r bg-gray-50 p-4">
    <nav className="space-y-2">
      <Button variant="ghost">🏠 Meu Drive</Button>
      <Button variant="ghost">⭐ Favoritos</Button>
      <Button variant="ghost">🕐 Recentes</Button>
      <Button variant="ghost">🗑 Lixeira</Button>
    </nav>
    
    {/* Storage Info */}
    <div className="mt-8">
      <Progress value={45} />
      <p className="text-sm">4.5 GB de 10 GB</p>
    </div>
  </div>
  
  {/* Main Content */}
  <div className="flex-1 p-6">
    {/* ... conteúdo existente melhorado */}
  </div>
</div>
```

### FluxosBoard Estilo Trello

```tsx
// Container principal com scroll horizontal
<div className="overflow-x-auto pb-4">
  <div className="flex gap-4 min-w-max">
    {columns.map(column => (
      <div 
        key={column.id} 
        className="w-72 flex-shrink-0 bg-gray-100 rounded-lg"
      >
        {/* Header colorido */}
        <div 
          className="p-3 rounded-t-lg text-white font-medium"
          style={{ backgroundColor: column.color }}
        >
          {column.name} ({cards.filter(c => c.column_id === column.id).length})
        </div>
        
        {/* Cards com scroll interno */}
        <div className="p-2 max-h-[calc(100vh-250px)] overflow-y-auto">
          {/* Cards */}
        </div>
        
        {/* Adicionar card */}
        <Button variant="ghost" className="w-full">
          + Adicionar Card
        </Button>
      </div>
    ))}
    
    {/* Adicionar coluna */}
    <div className="w-72 flex-shrink-0">
      <Button variant="outline" className="w-full h-12">
        + Adicionar Coluna
      </Button>
    </div>
  </div>
</div>
```

---

## Resultado Esperado

Após implementação:
- `/termos` redirecionará para a página de Termos de Uso
- `/fornecedores` mostrará apenas fornecedores
- `/prospectos` mostrará apenas prospectos/leads
- `/clientes` mostrará apenas clientes
- `/drive` terá visual moderno estilo Google Drive com sidebar
- `/fluxos` terá visual estilo Trello com colunas horizontais e scroll

