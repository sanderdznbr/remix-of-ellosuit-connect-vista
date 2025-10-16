import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  User,
  CreditCard,
  FileText,
  Settings,
  Crown,
  Calendar,
  Download,
  Mail,
  Building
} from 'lucide-react';

const AccountManagement = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - substituir com dados reais do Stripe/Supabase
  const accountInfo = {
    name: user?.user_metadata?.username || 'Usuário',
    email: user?.email || '',
    company: user?.user_metadata?.company_name || 'Minha Empresa',
    plan: 'Premium',
    planStatus: 'active',
    nextBillingDate: '15/04/2025',
    monthlyPrice: 'R$ 299,00'
  };

  const paymentHistory = [
    {
      id: '1',
      date: '15/03/2025',
      amount: 'R$ 299,00',
      status: 'Pago',
      invoice: 'INV-2025-03-001'
    },
    {
      id: '2',
      date: '15/02/2025',
      amount: 'R$ 299,00',
      status: 'Pago',
      invoice: 'INV-2025-02-001'
    },
    {
      id: '3',
      date: '15/01/2025',
      amount: 'R$ 299,00',
      status: 'Pago',
      invoice: 'INV-2025-01-001'
    }
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Implementar atualização de perfil
    setTimeout(() => {
      toast.success('Perfil atualizado com sucesso!');
      setIsLoading(false);
    }, 1000);
  };

  const handleDownloadInvoice = (invoice: string) => {
    toast.success(`Baixando invoice ${invoice}...`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Minha Conta</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas informações e assinatura
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2 text-lg px-4 py-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Plano {accountInfo.plan}
        </Badge>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Plano</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Pagamentos</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Invoices</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Perfil */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Perfil
              </CardTitle>
              <CardDescription>
                Atualize suas informações pessoais e de empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      defaultValue={accountInfo.name}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={accountInfo.email}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="company">Nome da Empresa</Label>
                  <Input
                    id="company"
                    defaultValue={accountInfo.company}
                    placeholder="Nome da sua empresa"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Cargo</Label>
                    <Input
                      id="position"
                      placeholder="CEO, Gerente, etc."
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Plano */}
        <TabsContent value="plan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Seu Plano Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-6 border rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-yellow-500" />
                    <div>
                      <h3 className="text-2xl font-bold">Plano {accountInfo.plan}</h3>
                      <p className="text-muted-foreground">Recursos ilimitados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm mt-4">
                    <Badge variant={accountInfo.planStatus === 'active' ? 'default' : 'secondary'}>
                      {accountInfo.planStatus === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Próxima cobrança: {accountInfo.nextBillingDate}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{accountInfo.monthlyPrice}</p>
                  <p className="text-sm text-muted-foreground">por mês</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold">Recursos Inclusos:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Reuniões ilimitadas
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Gravação e transcrição de reuniões
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Gerenciamento de clientes
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Integração com Google Calendar
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Suporte prioritário
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button variant="outline">Alterar Plano</Button>
                <Button variant="destructive">Cancelar Assinatura</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Pagamentos */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Histórico de Pagamentos
              </CardTitle>
              <CardDescription>
                Visualize todos os seus pagamentos realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <CreditCard className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">{payment.amount}</p>
                        <p className="text-sm text-muted-foreground">{payment.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                        {payment.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(payment.invoice)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Invoices */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Suas Invoices
              </CardTitle>
              <CardDescription>
                Baixe e visualize suas invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{payment.invoice}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.date} - {payment.amount}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(payment.invoice)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountManagement;
