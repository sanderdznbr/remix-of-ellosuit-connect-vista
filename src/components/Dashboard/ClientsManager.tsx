import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'prospect';
  lastContact: string;
  avatar: string;
}

const ClientsManager = () => {
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      name: 'João Silva',
      company: 'Empresa A',
      email: 'joao.silva@email.com',
      phone: '+55 11 99999-9999',
      status: 'active',
      lastContact: '1 semana atrás',
      avatar: 'https://github.com/shadcn.png'
    },
    {
      id: '2',
      name: 'Maria Oliveira',
      company: 'Empresa B',
      email: 'maria.oliveira@email.com',
      phone: '+55 21 88888-8888',
      status: 'inactive',
      lastContact: '2 meses atrás',
      avatar: 'https://avatars.githubusercontent.com/u/104714744?v=4'
    },
    {
      id: '3',
      name: 'Carlos Pereira',
      company: 'Empresa C',
      email: 'carlos.pereira@email.com',
      phone: '+55 31 77777-7777',
      status: 'prospect',
      lastContact: '3 dias atrás',
      avatar: 'https://pbs.twimg.com/profile_images/1653844827364270080/NLVjQDj_.jpg'
    }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, 'id' | 'avatar'>>({
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'active',
    lastContact: 'Hoje'
  });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newThisMonth, setNewThisMonth] = useState(12);
  const { toast } = useToast();

  useEffect(() => {
    // Simulação de novos clientes este mês
    setNewThisMonth(Math.floor(Math.random() * 20));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewClient(prev => ({ ...prev, [name]: value }));
  };

  const handleAddClient = () => {
    const newId = String(Date.now());
    const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${newClient.name}`;
    const completeNewClient = { ...newClient, id: newId, avatar: avatarUrl };
    setClients(prev => [...prev, completeNewClient]);
    setNewClient({
      name: '',
      company: '',
      email: '',
      phone: '',
      status: 'active',
      lastContact: 'Hoje'
    });
    setShowAddModal(false);
    toast({
      title: "Cliente adicionado",
      description: "Cliente adicionado com sucesso.",
    });
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setNewClient({
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      status: client.status,
      lastContact: client.lastContact
    });
    setShowAddModal(true);
  };

  const handleUpdateClient = () => {
    if (!editingClient) return;

    const updatedClients = clients.map(client =>
      client.id === editingClient.id ? { ...client, ...newClient } : client
    );

    setClients(updatedClients);
    setEditingClient(null);
    setNewClient({
      name: '',
      company: '',
      email: '',
      phone: '',
      status: 'active',
      lastContact: 'Hoje'
    });
    setShowAddModal(false);
    toast({
      title: "Cliente atualizado",
      description: "Cliente atualizado com sucesso.",
    });
  };

  const handleDeleteClient = (id: string) => {
    setClients(prev => prev.filter(client => client.id !== id));
    toast({
      title: "Cliente excluído",
      description: "Cliente excluído com sucesso.",
    });
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
      client.company.toLowerCase().includes(searchTermLower) ||
      client.email.toLowerCase().includes(searchTermLower);

    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
                <p className="text-3xl font-bold text-gray-900">
                  {clients.filter(c => c.status === 'active').length}
                </p>
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
                <p className="text-3xl font-bold text-gray-900">
                  {clients.filter(c => c.status === 'prospect').length}
                </p>
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
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="text-sm text-gray-600 font-medium p-6">CLIENTE</TableHead>
                <TableHead className="text-sm text-gray-600 font-medium p-6">CONTATO</TableHead>
                <TableHead className="text-sm text-gray-600 font-medium p-6">STATUS</TableHead>
                <TableHead className="text-sm text-gray-600 font-medium p-6">ÚLTIMO CONTATO</TableHead>
                <TableHead className="text-sm text-gray-600 font-medium p-6">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-gray-50">
                  <TableCell className="p-6">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={client.avatar} />
                        <AvatarFallback className="bg-blue-50 text-blue-600">
                          {client.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-base font-semibold text-gray-900">{client.name}</p>
                        <p className="text-sm text-gray-600">{client.company}</p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="p-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{client.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{client.phone}</span>
                      </div>
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
                    <span className="text-base text-gray-600">{client.lastContact}</span>
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
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Enviar Email
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Calendar className="h-4 w-4 mr-2" />
                          Agendar Reunião
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
              <Label htmlFor="name" className="text-base font-medium">Nome</Label>
              <Input
                id="name"
                name="name"
                value={newClient.name}
                onChange={handleInputChange}
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="company" className="text-base font-medium">Empresa</Label>
              <Input
                id="company"
                name="company"
                value={newClient.company}
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
