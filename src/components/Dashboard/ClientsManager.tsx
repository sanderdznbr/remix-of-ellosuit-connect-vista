
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Mail, 
  Phone, 
  UserCheck, 
  Target, 
  TrendingUp, 
  MoreHorizontal, 
  UserCog, 
  Calendar, 
  Trash2,
  Plus,
  Search
} from 'lucide-react';
import { useClients } from '@/hooks/useClients';

const ClientsManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    status: 'active',
    notes: ''
  });
  const [editingClient, setEditingClient] = useState<any>(null);

  const { clients, loading, createClient, updateClient, deleteClient } = useClients();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewClient(prev => ({ ...prev, [name]: value }));
  };

  const handleAddClient = async () => {
    await createClient(newClient);
    setNewClient({
      name: '',
      company_name: '',
      email: '',
      phone: '',
      status: 'active',
      notes: ''
    });
    setShowAddModal(false);
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setNewClient({
      name: client.name,
      company_name: client.company_name || '',
      email: client.email || '',
      phone: client.phone || '',
      status: client.status,
      notes: client.notes || ''
    });
    setShowAddModal(true);
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;
    await updateClient(editingClient.id, newClient);
    setEditingClient(null);
    setNewClient({
      name: '',
      company_name: '',
      email: '',
      phone: '',
      status: 'active',
      notes: ''
    });
    setShowAddModal(false);
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-base text-gray-600 mt-2">Gerencie seus clientes e relacionamentos</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar clientes..."
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

          <Button onClick={() => setShowAddModal(true)} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg rounded-2xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total de Clientes</p>
                <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
              </div>
              <div className="p-4 rounded-full bg-blue-50">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-2xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Clientes Ativos</p>
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
          <CardTitle className="text-lg font-semibold">Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum cliente encontrado
              </h3>
              <p className="text-gray-500 mb-4">
                Comece adicionando seu primeiro cliente
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cliente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="text-sm text-gray-600 font-medium p-6">CLIENTE</TableHead>
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
                          <AvatarFallback className="bg-blue-50 text-blue-600">
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

      {/* Add/Edit Client Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name" className="text-base font-medium">Nome *</Label>
              <Input
                id="name"
                name="name"
                value={newClient.name}
                onChange={handleInputChange}
                className="mt-2 rounded-xl"
                required
              />
            </div>
            <div>
              <Label htmlFor="company_name" className="text-base font-medium">Empresa</Label>
              <Input
                id="company_name"
                name="company_name"
                value={newClient.company_name}
                onChange={handleInputChange}
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-base font-medium">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={newClient.email}
                onChange={handleInputChange}
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-base font-medium">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                value={newClient.phone}
                onChange={handleInputChange}
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="status" className="text-base font-medium">Status</Label>
              <Select value={newClient.status} onValueChange={(value) => handleInputChange({ target: { name: 'status', value } } as any)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="prospect">Prospecto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={editingClient ? handleUpdateClient : handleAddClient} className="rounded-xl">
              {editingClient ? 'Atualizar Cliente' : 'Adicionar Cliente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsManager;
