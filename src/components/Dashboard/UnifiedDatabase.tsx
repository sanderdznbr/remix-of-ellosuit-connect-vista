import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Database, Search, Plus, MoreHorizontal, Eye, UserCog, Trash2, Filter, Download, Upload, Tag, Users, Building2, Target, Briefcase, X, ChevronDown, Mail, Phone } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import ClientForm from './ClientForm';
import { cn } from '@/lib/utils';

// Tag configurations
const TAG_CONFIGS: Record<string, {
  label: string;
  color: string;
  icon: React.ElementType;
}> = {
  cliente: {
    label: 'Cliente',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Users
  },
  fornecedor: {
    label: 'Fornecedor',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Building2
  },
  prospecto: {
    label: 'Prospecto',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: Target
  },
  colaborador: {
    label: 'Colaborador',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: Briefcase
  }
};
const STATUS_CONFIGS: Record<string, {
  label: string;
  color: string;
}> = {
  active: {
    label: 'Ativo',
    color: 'bg-emerald-100 text-emerald-700'
  },
  inactive: {
    label: 'Inativo',
    color: 'bg-red-100 text-red-700'
  },
  prospect: {
    label: 'Lead',
    color: 'bg-orange-100 text-orange-700'
  }
};
const UnifiedDatabase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Load all clients
  const {
    clients,
    loading,
    createClient,
    updateClient,
    deleteClient
  } = useClients('all');

  // Filter logic
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = client.name.toLowerCase().includes(searchLower) || (client.company_name || '').toLowerCase().includes(searchLower) || (client.email || '').toLowerCase().includes(searchLower) || (client.phone || '').toLowerCase().includes(searchLower);

      // Tag filter
      const clientType = client.client_type || 'cliente';
      const matchesTag = selectedTags.length === 0 || selectedTags.includes(clientType);

      // Status filter
      const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(client.status);
      return matchesSearch && matchesTag && matchesStatus;
    });
  }, [clients, searchTerm, selectedTags, selectedStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: clients.length,
    clientes: clients.filter(c => c.client_type === 'cliente').length,
    fornecedores: clients.filter(c => c.client_type === 'fornecedor').length,
    prospectos: clients.filter(c => c.client_type === 'prospecto').length
  }), [clients]);
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const toggleStatus = (status: string) => {
    setSelectedStatus(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };
  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };
  const toggleAllRows = () => {
    if (selectedRows.length === filteredClients.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredClients.map(c => c.id));
    }
  };
  const handleAddClient = () => {
    setEditingClient(null);
    setShowClientForm(true);
  };
  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setShowClientForm(true);
  };
  const handleSaveClient = async (clientData: any) => {
    if (editingClient) {
      await updateClient(editingClient.id, clientData);
    } else {
      await createClient(clientData);
    }
  };
  const handleDeleteClient = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este contato?')) {
      await deleteClient(id);
    }
  };
  const handleBulkDelete = async () => {
    if (confirm(`Deseja excluir ${selectedRows.length} contatos selecionados?`)) {
      for (const id of selectedRows) {
        await deleteClient(id);
      }
      setSelectedRows([]);
    }
  };
  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedStatus([]);
    setSearchTerm('');
  };
  if (loading) {
    return <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex items-center gap-4">
          
          <div>
            <h1 className="text-2xl font-bold text-foreground">Banco de Dados</h1>
            <p className="text-sm text-muted-foreground">
              {filteredClients.length} de {clients.length} contatos
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={handleAddClient} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Novo Contato
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => clearFilters()}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="p-2 rounded-xl bg-muted">
                <Database className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        {Object.entries(TAG_CONFIGS).filter(([key]) => key !== 'colaborador').map(([key, config]) => {
        const count = stats[key as keyof typeof stats] || 0;
        const Icon = config.icon;
        const isSelected = selectedTags.includes(key);
        return <Card key={key} className={cn("border-border/60 shadow-sm hover:shadow-md transition-all cursor-pointer", isSelected && "ring-2 ring-blue-500")} onClick={() => toggleTag(key)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{config.label}s</p>
                    <p className="text-2xl font-bold text-foreground">{count}</p>
                  </div>
                  <div className={cn("p-2 rounded-xl", config.color.split(' ')[0])}>
                    <Icon className={cn("h-5 w-5", config.color.split(' ')[1])} />
                  </div>
                </div>
              </CardContent>
            </Card>;
      })}
      </div>

      {/* Filters & Search */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, empresa, email ou telefone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-muted/50 border-border" />
            </div>

            {/* Tag Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Tipo:
              </span>
              {Object.entries(TAG_CONFIGS).map(([key, config]) => <Badge key={key} variant="outline" className={cn("cursor-pointer transition-all", selectedTags.includes(key) ? config.color : "bg-muted/50 text-muted-foreground border-border hover:bg-muted")} onClick={() => toggleTag(key)}>
                  {config.label}
                  {selectedTags.includes(key) && <X className="h-3 w-3 ml-1" />}
                </Badge>)}
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Filter className="h-4 w-4" />
                Status:
              </span>
              {Object.entries(STATUS_CONFIGS).map(([key, config]) => <Badge key={key} variant="outline" className={cn("cursor-pointer transition-all", selectedStatus.includes(key) ? config.color : "bg-muted/50 text-muted-foreground border-border hover:bg-muted")} onClick={() => toggleStatus(key)}>
                  {config.label}
                  {selectedStatus.includes(key) && <X className="h-3 w-3 ml-1" />}
                </Badge>)}
            </div>

            {/* Clear Filters */}
            {(selectedTags.length > 0 || selectedStatus.length > 0 || searchTerm) && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedRows.length > 0 && <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">
                {selectedRows.length} contato(s) selecionado(s)
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRows([])}>
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>}

      {/* Data Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-border/40">
                <TableHead className="w-12">
                  <Checkbox checked={selectedRows.length === filteredClients.length && filteredClients.length > 0} onCheckedChange={toggleAllRows} />
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">Nome</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Tipo</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Contato</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Tags</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Criado em</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Database className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-muted-foreground">Nenhum contato encontrado</p>
                      <Button variant="outline" size="sm" onClick={handleAddClient}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Contato
                      </Button>
                    </div>
                  </TableCell>
                </TableRow> : filteredClients.map(client => {
              const clientType = client.client_type || 'cliente';
              const tagConfig = TAG_CONFIGS[clientType] || TAG_CONFIGS.cliente;
              const statusConfig = STATUS_CONFIGS[client.status] || STATUS_CONFIGS.active;
              return <TableRow key={client.id} className={cn("hover:bg-muted/30 transition-colors", selectedRows.includes(client.id) && "bg-primary/5")}>
                      <TableCell>
                        <Checkbox checked={selectedRows.includes(client.id)} onCheckedChange={() => toggleRowSelection(client.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={client.avatar_url} />
                            <AvatarFallback className={cn("text-xs font-medium", tagConfig.color.split(' ')[0], tagConfig.color.split(' ')[1])}>
                              {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{client.name}</p>
                            {client.company_name && <p className="text-xs text-muted-foreground">{client.company_name}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-normal", tagConfig.color)}>
                          {tagConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </div>}
                          {client.phone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("font-normal", statusConfig.color)}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {client.tags?.slice(0, 2).map((tag: string, idx: number) => <Badge key={idx} variant="outline" className="text-[10px] py-0 h-5">
                              {tag}
                            </Badge>)}
                          {client.tags && client.tags.length > 2 && <Badge variant="outline" className="text-[10px] py-0 h-5">
                              +{client.tags.length - 2}
                            </Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClient(client)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClient(client)}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteClient(client.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>;
            })}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>

      {/* Client Form Modal */}
      <ClientForm client={editingClient} open={showClientForm} onOpenChange={setShowClientForm} onSave={handleSaveClient} />
    </div>;
};
export default UnifiedDatabase;