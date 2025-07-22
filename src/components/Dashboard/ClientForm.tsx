import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Upload, User, Building, MapPin, Phone, Globe } from 'lucide-react';

interface ClientFormProps {
  client?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (clientData: any) => void;
}

const ClientForm = ({ client, open, onOpenChange, onSave }: ClientFormProps) => {
  const [formData, setFormData] = useState({
    // Personal Info
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    whatsapp: client?.whatsapp || '',
    whatsapp_business: client?.whatsapp_business || '',
    birth_date: client?.birth_date || '',
    profession: client?.profession || '',
    avatar_url: client?.avatar_url || '',
    
    // Company Info
    company_name: client?.company_name || '',
    cnpj_cpf: client?.cnpj_cpf || '',
    client_type: client?.client_type || 'individual',
    company_size: client?.company_size || '',
    industry: client?.industry || '',
    annual_revenue: client?.annual_revenue || '',
    website: client?.website || '',
    
    // Address
    address_street: client?.address_street || '',
    address_number: client?.address_number || '',
    address_city: client?.address_city || '',
    address_state: client?.address_state || '',
    address_zip: client?.address_zip || '',
    
    // Social Media
    linkedin: client?.linkedin || '',
    instagram: client?.instagram || '',
    facebook: client?.facebook || '',
    
    // Other
    status: client?.status || 'active',
    notes: client?.notes || '',
    tags: client?.tags || []
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Handle avatar upload if file is selected
    if (avatarFile) {
      // Here you would upload to storage and get URL
      const avatarUrl = URL.createObjectURL(avatarFile);
      formData.avatar_url = avatarUrl;
    }

    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Pessoal</TabsTrigger>
            <TabsTrigger value="company">Empresa</TabsTrigger>
            <TabsTrigger value="address">Endereço</TabsTrigger>
            <TabsTrigger value="social">Social/Outros</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6 mt-6">
            {/* Avatar Upload */}
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {formData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label htmlFor="avatar">Foto do Cliente</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange('birth_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="profession">Profissão</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => handleInputChange('profession', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="company" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_type">Tipo de Cliente</Label>
                <Select value={formData.client_type} onValueChange={(value) => handleInputChange('client_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Pessoa Física</SelectItem>
                    <SelectItem value="company">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cnpj_cpf">CPF/CNPJ</Label>
                <Input
                  id="cnpj_cpf"
                  value={formData.cnpj_cpf}
                  onChange={(e) => handleInputChange('cnpj_cpf', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="industry">Setor</Label>
                <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Tecnologia</SelectItem>
                    <SelectItem value="healthcare">Saúde</SelectItem>
                    <SelectItem value="finance">Financeiro</SelectItem>
                    <SelectItem value="education">Educação</SelectItem>
                    <SelectItem value="retail">Varejo</SelectItem>
                    <SelectItem value="manufacturing">Manufatura</SelectItem>
                    <SelectItem value="services">Serviços</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="company_size">Tamanho da Empresa</Label>
                <Select value={formData.company_size} onValueChange={(value) => handleInputChange('company_size', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tamanho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 funcionários</SelectItem>
                    <SelectItem value="11-50">11-50 funcionários</SelectItem>
                    <SelectItem value="51-200">51-200 funcionários</SelectItem>
                    <SelectItem value="201-500">201-500 funcionários</SelectItem>
                    <SelectItem value="500+">500+ funcionários</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="annual_revenue">Faturamento Anual (R$)</Label>
                <Input
                  id="annual_revenue"
                  type="number"
                  value={formData.annual_revenue}
                  onChange={(e) => handleInputChange('annual_revenue', e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="address" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address_street">Rua</Label>
                <Input
                  id="address_street"
                  value={formData.address_street}
                  onChange={(e) => handleInputChange('address_street', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="address_number">Número</Label>
                <Input
                  id="address_number"
                  value={formData.address_number}
                  onChange={(e) => handleInputChange('address_number', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="address_city">Cidade</Label>
                <Input
                  id="address_city"
                  value={formData.address_city}
                  onChange={(e) => handleInputChange('address_city', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="address_state">Estado</Label>
                <Input
                  id="address_state"
                  value={formData.address_state}
                  onChange={(e) => handleInputChange('address_state', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="address_zip">CEP</Label>
                <Input
                  id="address_zip"
                  value={formData.address_zip}
                  onChange={(e) => handleInputChange('address_zip', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin}
                  onChange={(e) => handleInputChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/usuario"
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                  placeholder="@usuario"
                />
              </div>
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={formData.facebook}
                  onChange={(e) => handleInputChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/usuario"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp_business">WhatsApp Business</Label>
                <Input
                  id="whatsapp_business"
                  value={formData.whatsapp_business}
                  onChange={(e) => handleInputChange('whatsapp_business', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="prospect">Prospecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                placeholder="Informações adicionais sobre o cliente..."
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 mt-8">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {client ? 'Atualizar Cliente' : 'Criar Cliente'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientForm;
