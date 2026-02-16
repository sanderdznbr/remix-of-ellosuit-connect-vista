import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building2, Camera, Save, Loader2, 
  Shield, Key, Bell, Globe, MapPin, Briefcase, Calendar,
  LogOut, Trash2, CheckCircle2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function UserProfilePage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    location: '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load user data on mount and when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || user.phone || '',
        company: user.user_metadata?.company || '',
        jobTitle: user.user_metadata?.job_title || '',
        location: user.user_metadata?.location || '',
        bio: user.user_metadata?.bio || '',
      });

      // Fetch company name
      const fetchCompany = async () => {
        const { data } = await supabase
          .from('company_users')
          .select('company_id, companies(name)')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        if (data?.companies) {
          setCompanyName((data.companies as any).name || '');
        }
      };
      fetchCompany();
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          phone: formData.phone,
          company: formData.company,
          job_title: formData.jobTitle,
          location: formData.location,
          bio: formData.bio,
        }
      });
      if (error) throw error;
      toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas com sucesso.' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      toast({ title: 'Senha alterada', description: 'Sua senha foi atualizada com sucesso.' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({ title: 'Erro ao alterar senha', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl.publicUrl } });
      toast({ title: 'Avatar atualizado', description: 'Sua foto de perfil foi alterada.' });
    } catch (error: any) {
      toast({ title: 'Erro ao enviar imagem', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const createdAt = user?.created_at 
    ? format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  const lastSignIn = user?.last_sign_in_at
    ? format(new Date(user.last_sign_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : '';

  const initials = formData.fullName
    ? formData.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'US';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        
        {/* Profile Header Card */}
        <div className="relative mb-8">
          {/* Banner */}
          <div className="h-32 sm:h-40 rounded-2xl bg-gradient-to-r from-primary/80 via-primary/60 to-primary/40" />
          
          {/* Avatar + Info overlay */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 px-6 -mt-14 sm:-mt-12">
            <div className="relative group flex-shrink-0">
              <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-6 w-6 text-white" />
              </label>
              <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              {/* Online indicator */}
              <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background" />
            </div>
            
            <div className="flex-1 text-center sm:text-left pb-2">
              <h1 className="text-2xl font-bold text-foreground">{formData.fullName || 'Seu Nome'}</h1>
              <p className="text-muted-foreground text-sm">{formData.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                {companyName && (
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3 w-3" /> {companyName}
                  </Badge>
                )}
                {formData.jobTitle && (
                  <Badge variant="outline" className="gap-1">
                    <Briefcase className="h-3 w-3" /> {formData.jobTitle}
                  </Badge>
                )}
                {formData.location && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" /> {formData.location}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2 pb-2">
              <Button onClick={handleSave} disabled={isLoading} className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{createdAt ? '1' : '0'}</p>
            <p className="text-xs text-muted-foreground">Conta ativa</p>
          </Card>
          <Card className="p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Membro desde</p>
            <p className="text-xs font-medium text-foreground mt-1">{createdAt || '—'}</p>
          </Card>
          <Card className="p-4 text-center">
            <Shield className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Último acesso</p>
            <p className="text-xs font-medium text-foreground mt-1">{lastSignIn || '—'}</p>
          </Card>
          <Card className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-xs font-medium text-green-600 mt-1">Verificado</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" /> Pessoal
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Key className="h-4 w-4" /> Segurança
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Bell className="h-4 w-4" /> Preferências
            </TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                <CardDescription>Atualize seus dados de contato e informações profissionais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder={formData.fullName || 'Seu nome completo'}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        value={formData.email}
                        disabled
                        className="pl-10 bg-muted"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder={formData.phone || '(00) 00000-0000'}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Localização</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder={formData.location || 'Cidade, Estado'}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder={formData.company || companyName || 'Nome da empresa'}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Cargo</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="jobTitle"
                        name="jobTitle"
                        value={formData.jobTitle}
                        onChange={handleChange}
                        placeholder={formData.jobTitle || 'Ex: Diretor de Marketing'}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder={formData.bio || 'Conte um pouco sobre você...'}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alterar Senha</CardTitle>
                <CardDescription>Mantenha sua conta segura atualizando sua senha regularmente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Repita a nova senha"
                      className="pl-10"
                    />
                  </div>
                  {passwordData.newPassword && passwordData.confirmPassword && (
                    <p className={`text-xs flex items-center gap-1 ${passwordData.newPassword === passwordData.confirmPassword ? 'text-green-600' : 'text-destructive'}`}>
                      {passwordData.newPassword === passwordData.confirmPassword 
                        ? <><CheckCircle2 className="h-3 w-3" /> Senhas coincidem</>
                        : <><AlertCircle className="h-3 w-3" /> Senhas não coincidem</>
                      }
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={isLoading || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                  className="gap-2"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  Alterar Senha
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sessões e Segurança</CardTitle>
                <CardDescription>Informações sobre o acesso à sua conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Sessão Atual</p>
                      <p className="text-xs text-muted-foreground">
                        {lastSignIn ? `Último login: ${lastSignIn}` : 'Sessão ativa'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Ativa</Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Provedor de Login</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.app_metadata?.provider === 'google' ? 'Google' 
                        : user?.app_metadata?.provider === 'apple' ? 'Apple'
                        : 'Email e Senha'}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {user?.app_metadata?.provider === 'google' ? 'Google' 
                      : user?.app_metadata?.provider === 'apple' ? 'Apple'
                      : 'Email'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notificações</CardTitle>
                <CardDescription>Configure como e quando deseja receber notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Notificações por email', desc: 'Receba atualizações importantes por email', key: 'email_notif' },
                  { label: 'Notificações push', desc: 'Alertas no navegador e dispositivos', key: 'push_notif' },
                  { label: 'Resumo semanal', desc: 'Receba um resumo das atividades toda semana', key: 'weekly_summary' },
                  { label: 'Lembretes de reunião', desc: 'Aviso antes do início de reuniões agendadas', key: 'meeting_reminder' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">Zona de Perigo</CardTitle>
                <CardDescription>Ações irreversíveis da conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="text-sm font-medium text-foreground">Sair de todos os dispositivos</p>
                    <p className="text-xs text-muted-foreground">Encerra todas as sessões ativas</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => signOut()}>
                    <LogOut className="h-3.5 w-3.5" /> Sair
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default UserProfilePage;
