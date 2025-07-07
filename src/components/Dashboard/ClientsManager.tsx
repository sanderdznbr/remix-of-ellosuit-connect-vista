import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Search, 
  Plus, 
  Mail,
  Phone,
  MapPin,
  Building,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company_name?: string;
  cnpj_cpf?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  status: 'active' | 'inactive' | 'lead' | 'converted';
  notes?: string;
  created_at: string;
}

const ClientsManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Mock data
  const clients: Client[] = [
    {
      id: '1',
      name: 'João Silva',
      email: 'joao@exemplo.com',
      phone: '(11) 99999-9999',
      whatsapp: '(11) 99999-9999',
      company_name: 'Tech Solutions Ltda',
      cnpj_cpf: '12345678901',
      address_street: 'Rua das Flores, 123',
      address_city: 'São Paulo',
      address_state: 'SP',
      status: 'active',
      notes: 'Cliente muito interessado em soluções de automação',
      created_at: '2024-01-15'
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria@empresa.com',
      phone: '(11) 88888-8888',
      company_name: 'Santos & Associados',
      cnpj_cpf: '98765432109',
      status: 'lead',
      created_at: '2024-01-20'
    },
    {
      id: '3',
      name: 'Pedro Costa',
      email: 'pedro@costa.com',
      phone: '(11) 77777-7777',
      status: 'converted',
      notes: 'Cliente convertido após apresentação',
      created_at: '2024-01-25'
    }
  ];

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    lead: 'bg-yellow-100 text-yellow-800',
    converted: 'bg-blue-100 text-blue-800'
  };

  const statusLabels = {
    active: 'Ativo',
    inactive: 'Inativo',
    lead: 'Lead',
    converted: 'Convertido'
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openClientDetails = (client: Client) => {
    setSelectedClient(client);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gerencie sua base de clientes</p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-xl">
                  <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
                  <TabsTrigger value="business">Dados Empresariais</TabsTrigger>
                  <TabsTrigger value="address">Endereço</TabsTrigger>
                </TabsList>
                
                <TabsContent value="personal" className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input id="name" placeholder="Digite o nome completo" className="rounded-xl mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" placeholder="email@exemplo.com" className="rounded-xl mt-1" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" placeholder="(11) 99999-9999" className="rounded-xl mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input id="whatsapp" placeholder="(11) 99999-9999" className="rounded-xl mt-1" />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" placeholder="000.000.000-00" className="rounded-xl mt-1" />
                  </div>
                </TabsContent>
                
                <TabsContent value="business" className="space-y-4 mt-6">
                  <div>
                    <Label htmlFor="company">Nome da Empresa</Label>
                    <Input id="company" placeholder="Nome da empresa" className="rounded-xl mt-1" />
                  </div>
                  
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" placeholder="00.000.000/0000-00" className="rounded-xl mt-1" />
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select>
                      <SelectTrigger className="rounded-xl mt-1">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="converted">Convertido</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="address" className="space-y-4 mt-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="street">Rua/Avenida</Label>
                      <Input id="street" placeholder="Nome da rua" className="rounded-xl mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="number">Número</Label>
                      <Input id="number" placeholder="123" className="rounded-xl mt-1" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input id="city" placeholder="São Paulo" className="rounded-xl mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="state">Estado</Label>
                      <Input id="state" placeholder="SP" className="rounded-xl mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="zip">CEP</Label>
                      <Input id="zip" placeholder="00000-000" className="rounded-xl mt-1" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div>
                <Label htmlFor="notes">Anotações</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Observações sobre o cliente..."
                  className="rounded-xl mt-1"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsAddModalOpen(false)}>
                  Salvar Cliente
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="converted">Convertido</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">{clients.filter(c => c.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Leads</p>
                <p className="text-2xl font-bold">{clients.filter(c => c.status === 'lead').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Convertidos</p>
                <p className="text-2xl font-bold">{clients.filter(c => c.status === 'converted').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredClients.map((client) => (
              <div key={client.id} className="p-6 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{client.name}</h3>
                      <Badge className={`${statusColors[client.status]} border-0`}>
                        {statusLabels[client.status]}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{client.email}</span>
                        </div>
                      )}
                      
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      
                      {client.company_name && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <span>{client.company_name}</span>
                        </div>
                      )}
                      
                      {client.address_city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{client.address_city}, {client.address_state}</span>
                        </div>
                      )}
                    </div>
                    
                    {client.notes && (
                      <div className="mt-3">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{client.notes}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      Cadastrado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => openClientDetails(client)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="rounded-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{selectedClient.name}</h2>
                <Badge className={`${statusColors[selectedClient.status]} border-0`}>
                  {statusLabels[selectedClient.status]}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Informações de Contato</h3>
                  
                  {selectedClient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedClient.email}</span>
                    </div>
                  )}
                  
                  {selectedClient.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedClient.phone}</span>
                    </div>
                  )}
                  
                  {selectedClient.whatsapp && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedClient.whatsapp} (WhatsApp)</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Informações Empresariais</h3>
                  
                  {selectedClient.company_name && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedClient.company_name}</span>
                    </div>
                  )}
                  
                  {selectedClient.cnpj_cpf && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedClient.cnpj_cpf}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {(selectedClient.address_street || selectedClient.address_city) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Endereço</h3>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      {selectedClient.address_street && <p>{selectedClient.address_street}</p>}
                      {selectedClient.address_city && (
                        <p>{selectedClient.address_city}, {selectedClient.address_state}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {selectedClient.notes && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Anotações</h3>
                  <p className="text-muted-foreground">{selectedClient.notes}</p>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground border-t pt-4">
                Cliente cadastrado em {new Date(selectedClient.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsManager;