
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Users, 
  Mail, 
  Phone, 
  UserCheck, 
  Target, 
  TrendingUp, 
  MoreHorizontal, 
  UserCog, 
  Trash2,
  Plus,
  Search,
  Eye,
  Package,
  Building2
} from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import ClientForm from './ClientForm';

interface ClientsManagerProps {
  contactType?: 'cliente' | 'fornecedor' | 'prospecto' | 'all';
}

const ClientsManager = ({ contactType = 'all' }: ClientsManagerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const { clients, loading, createClient, updateClient, deleteClient, refetch } = useClients(contactType);

  // Config baseado no tipo de contato
  const typeConfig = {
    cliente: {
      title: 'Clientes',
      subtitle: 'Gerencie seus clientes e relacionamentos',
      icon: Users,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      newButtonText: 'Novo Cliente',
      emptyTitle: 'Nenhum cliente encontrado',
      emptyText: 'Comece adicionando seu primeiro cliente'
    },
    fornecedor: {
      title: 'Fornecedores',
      subtitle: 'Gerencie seus fornecedores e parceiros',
      icon: Package,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      newButtonText: 'Novo Fornecedor',
      emptyTitle: 'Nenhum fornecedor encontrado',
      emptyText: 'Comece adicionando seu primeiro fornecedor'
    },
    prospecto: {
      title: 'Prospectos',
      subtitle: 'Gerencie seus leads e oportunidades',
      icon: Target,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      newButtonText: 'Novo Prospecto',
      emptyTitle: 'Nenhum prospecto encontrado',
      emptyText: 'Comece adicionando seu primeiro prospecto'
    },
    all: {
      title: 'Contatos',
      subtitle: 'Gerencie todos os seus contatos',
      icon: Building2,
      iconColor: 'text-gray-600',
      bgColor: 'bg-gray-50',
      newButtonText: 'Novo Contato',
      emptyTitle: 'Nenhum contato encontrado',
      emptyText: 'Comece adicionando seu primeiro contato'
    }
  };

  const config = typeConfig[contactType];
  const IconComponent = config.icon;

  const handleAddClient = () => {
    setEditingClient(null);
    setShowClientForm(true);
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleSaveClient = async (clientData: any) => {
    // Se for um tipo específico, incluir o client_type
    const dataToSave = {
      ...clientData,
      client_type: contactType !== 'all' ? contactType : clientData.client_type || 'cliente'
    };

    if (editingClient) {
      await updateClient(editingClient.id, dataToSave);
    } else {
      await createClient(dataToSave);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm(`Tem certeza que deseja excluir este ${contactType === 'all' ? 'contato' : contactType}?`)) {
      await deleteClient(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'prospect':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'prospect':
        return 'Prospecto';
      default:
        return 'Desconhecido';
    }
  };

  const filteredClients = clients.filter(client => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch =
      client.name.toLowerCase().includes(searchTermLower) ||
      (client.company_name || '').toLowerCase().includes(searchTermLower) ||
      (client.email || '').toLowerCase().includes(searchTermLower);

    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeClients = clients.filter(c => c.status === 'active').length;
  const prospectClients = clients.filter(c => c.status === 'prospect').length;
  const newThisMonth = clients.filter(c => {
    const createdDate = new Date(c.created_at);
    const now = new Date();
    return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return (
      <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${config.bgColor}`}>
            <IconComponent className={`h-8 w-8 ${config.iconColor}`} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{config.title}</h1>
            <p className="text-base text-gray-600 mt-1">{config.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={`Buscar ${config.title.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 rounded-xl"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
              <SelectItem value="prospect">Prospecto</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleAddClient} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            {config.newButtonText}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg rounded-2xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total</p>
                <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
              </div>
              <div className={`p-4 rounded-full ${config.bgColor}`}>
                <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-2xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ativos</p>
                <p className="text-3xl font-bold text-gray-900">{activeClients}</p>
              </div>
              <div className="p-4 rounded-full bg-green-50">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-2xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Prospectos</p>
                <p className="text-3xl font-bold text-gray-900">{prospectClients}</p>
              </div>
              <div className="p-4 rounded-full bg-orange-50">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-2xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Novos este Mês</p>
                <p className="text-3xl font-bold text-gray-900">{newThisMonth}</p>
              </div>
              <div className="p-4 rounded-full bg-purple-50">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card className="border-none shadow-lg rounded-2xl bg-white">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg font-semibold">Lista de {config.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <div className={`h-16 w-16 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <IconComponent className={`h-8 w-8 ${config.iconColor}`} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {config.emptyTitle}
              </h3>
              <p className="text-gray-500 mb-4">
                {config.emptyText}
              </p>
              <Button onClick={handleAddClient}>
                <Plus className="h-4 w-4 mr-2" />
                {config.newButtonText}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="text-sm text-gray-600 font-medium p-6">NOME</TableHead>
                  <TableHead className="text-sm text-gray-600 font-medium p-6">CONTATO</TableHead>
                  <TableHead className="text-sm text-gray-600 font-medium p-6">STATUS</TableHead>
                  <TableHead className="text-sm text-gray-600 font-medium p-6">CRIADO EM</TableHead>
                  <TableHead className="text-sm text-gray-600 font-medium p-6">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-gray-50">
                    <TableCell className="p-6">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={client.avatar_url} />
                          <AvatarFallback className={`${config.bgColor} ${config.iconColor}`}>
                            {client.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-base font-semibold text-gray-900">{client.name}</p>
                          <p className="text-sm text-gray-600">{client.company_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-6">
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-6">
                      <Badge 
                        className={`rounded-full ${getStatusColor(client.status)}`}
                      >
                        {getStatusLabel(client.status)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="p-6">
                      <span className="text-base text-gray-600">
                        {new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </TableCell>
                    
                    <TableCell className="p-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => handleEditClient(client)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClient(client)}>
                            <UserCog className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClient(client.id)} 
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Client Form Modal */}
      <ClientForm
        client={editingClient}
        open={showClientForm}
        onOpenChange={setShowClientForm}
        onSave={handleSaveClient}
      />
    </div>
  );
};

export default ClientsManager;
