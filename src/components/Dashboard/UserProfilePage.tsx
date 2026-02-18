import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Phone, Building2, Camera, Save, Loader2, 
  Shield, Key, Bell, Globe, MapPin, Briefcase, Calendar,
  LogOut, CheckCircle2, AlertCircle, Eye, EyeOff,
  Instagram, Linkedin, Twitter, Link2, Crown, Sparkles,
  Clock, ImageIcon, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function UserProfilePage() {
  const { user, signOut } = useAuth();
  const { planType, status, isTrialActive, trialDaysRemaining, isFree, monthlyPrice, billingCycle, currentPeriodEnd } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('info');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    location: '',
    bio: '',
    address: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    website: '',
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {};
      setFormData({
        fullName: meta.full_name || meta.username || '',
        email: user.email || '',
        phone: meta.phone || user.phone || '',
        company: meta.company || '',
        jobTitle: meta.job_title || '',
        location: meta.location || '',
        bio: meta.bio || '',
        address: meta.address || '',
        instagram: meta.instagram || '',
        linkedin: meta.linkedin || '',
        twitter: meta.twitter || '',
        website: meta.website || '',
      });

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
          address: formData.address,
          instagram: formData.instagram,
          linkedin: formData.linkedin,
          twitter: formData.twitter,
          website: formData.website,
        }
      });
      if (error) throw error;
      toast({ title: 'Perfil atualizado!', description: 'Suas informações foram salvas.' });
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
      toast({ title: 'Senha alterada!', description: 'Sua senha foi atualizada.' });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
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
      const filePath = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.auth.updateUser({ data: { avatar_url: `${publicUrl.publicUrl}?t=${Date.now()}` } });
      toast({ title: 'Foto atualizada!' });
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/cover.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('covers').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('covers').getPublicUrl(filePath);
      await supabase.auth.updateUser({ data: { cover_url: `${publicUrl.publicUrl}?t=${Date.now()}` } });
      toast({ title: 'Capa atualizada!' });
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const createdAt = user?.created_at ? new Date(user.created_at) : null;
  const daysActive = createdAt ? differenceInDays(new Date(), createdAt) : 0;
  const memberSince = createdAt ? format(createdAt, "MMM yyyy", { locale: ptBR }) : '';

  const lastSignIn = user?.last_sign_in_at
    ? format(new Date(user.last_sign_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : '';

  const initials = formData.fullName
    ? formData.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'US';

  const coverUrl = user?.user_metadata?.cover_url;

  const planLabel = isFree ? 'Free' : planType === 'business' ? 'Business' : planType.charAt(0).toUpperCase() + planType.slice(1);
  const statusLabel = isFree ? 'Gratuito' : isTrialActive ? `Trial (${trialDaysRemaining}d restantes)` : status === 'active' ? 'Ativo' : status;

  const sections = [
    { id: 'info', label: 'Informações', icon: User },
    { id: 'social', label: 'Redes Sociais', icon: Link2 },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'notifications', label: 'Notificações', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Cover + Avatar Section */}
        <div className="relative">
          {/* Cover Image */}
          <div 
            className="h-44 sm:h-56 md:h-64 w-full bg-gradient-to-br from-primary via-primary/70 to-primary/40 relative overflow-hidden"
            style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            {/* Overlay pattern */}
            {!coverUrl && (
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, white 1px, transparent 1px), radial-gradient(circle at 75% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              </div>
            )}
            
            {/* Edit Cover Button */}
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white text-xs font-medium transition-colors backdrop-blur-sm"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Editar capa
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </div>

          {/* Avatar overlapping cover */}
          <div className="px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <div className="relative group flex-shrink-0">
                <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background shadow-xl ring-2 ring-primary/20">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-1 right-1 w-9 h-9 flex items-center justify-center bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:opacity-90 transition-opacity border-2 border-background"
                >
                  <Camera className="h-4 w-4" />
                </label>
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>

              <div className="flex-1 text-center sm:text-left pb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                  {formData.fullName || 'Seu Nome'}
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">{formData.email}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2">
                  {companyName && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Building2 className="h-3 w-3" /> {companyName}
                    </Badge>
                  )}
                  {formData.jobTitle && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Briefcase className="h-3 w-3" /> {formData.jobTitle}
                    </Badge>
                  )}
                  {formData.location && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <MapPin className="h-3 w-3" /> {formData.location}
                    </Badge>
                  )}
                </div>
              </div>

              <Button onClick={handleSave} disabled={isLoading} size="sm" className="gap-1.5 shrink-0">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>

        {/* Plan Card */}
        <div className="px-4 sm:px-6 mt-6">
          <div className={`rounded-2xl p-5 border ${isFree ? 'bg-muted/50 border-border' : 'bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isFree ? 'bg-muted' : 'bg-primary/10'}`}>
                  {isFree ? <Sparkles className="h-5 w-5 text-muted-foreground" /> : <Crown className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">Plano {planLabel}</h3>
                    <Badge variant={isFree ? 'secondary' : 'default'} className="text-[10px] px-2 py-0">
                      {statusLabel}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {daysActive} dias ativo
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Desde {memberSince}
                    </span>
                    {!isFree && monthlyPrice > 0 && (
                      <span className="text-xs text-muted-foreground">
                        R$ {monthlyPrice.toFixed(2)}/{billingCycle === 'yearly' ? 'ano' : 'mês'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant={isFree ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigate(isFree ? '/checkout/ativar' : '/dashboard/assinatura')}
                className="gap-1.5"
              >
                {isFree ? <><Sparkles className="h-3.5 w-3.5" /> Ativar Business</> : 'Gerenciar Plano'}
              </Button>
            </div>
          </div>
        </div>

        {/* Bio */}
        {formData.bio && (
          <div className="px-4 sm:px-6 mt-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{formData.bio}</p>
          </div>
        )}

        {/* Section Nav */}
        <div className="px-4 sm:px-6 mt-6">
          <div className="flex gap-1 overflow-x-auto border-b border-border pb-px scrollbar-hide">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeSection === s.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Content */}
        <div className="px-4 sm:px-6 mt-6 space-y-5">

          {/* Info Section */}
          {activeSection === 'info' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
                <h3 className="text-sm font-semibold text-foreground">Informações Pessoais</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldInput icon={User} label="Nome Completo" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Seu nome completo" />
                  <FieldInput icon={Mail} label="Email" name="email" value={formData.email} onChange={() => {}} placeholder="" disabled />
                  <FieldInput icon={Phone} label="Telefone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
                  <FieldInput icon={MapPin} label="Localização" name="location" value={formData.location} onChange={handleChange} placeholder="Cidade, Estado" />
                  <div className="sm:col-span-2">
                    <FieldInput icon={MapPin} label="Endereço Completo" name="address" value={formData.address} onChange={handleChange} placeholder="Rua, Nº, Bairro, CEP" />
                  </div>
                </div>

                <Separator />

                <h3 className="text-sm font-semibold text-foreground">Informações Profissionais</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldInput icon={Building2} label="Empresa" name="company" value={formData.company} onChange={handleChange} placeholder={companyName || 'Nome da empresa'} />
                  <FieldInput icon={Briefcase} label="Cargo" name="jobTitle" value={formData.jobTitle} onChange={handleChange} placeholder="Ex: Diretor de Marketing" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-xs font-medium text-muted-foreground">Bio</Label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Conte um pouco sobre você..."
                    rows={3}
                    className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Social Section */}
          {activeSection === 'social' && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
              <h3 className="text-sm font-semibold text-foreground">Redes Sociais e Links</h3>
              <p className="text-xs text-muted-foreground -mt-3">Adicione suas redes para que sua equipe possa encontrá-lo facilmente.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <FieldInput icon={Instagram} label="Instagram" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@seuusuario" />
                <FieldInput icon={Linkedin} label="LinkedIn" name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="linkedin.com/in/seuperfil" />
                <FieldInput icon={Twitter} label="X (Twitter)" name="twitter" value={formData.twitter} onChange={handleChange} placeholder="@seuusuario" />
                <FieldInput icon={Globe} label="Website" name="website" value={formData.website} onChange={handleChange} placeholder="https://seusite.com" />
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Alterar Senha</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Nova Senha</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                        className="pl-10 pr-10 rounded-xl"
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Confirmar Senha</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Repita a nova senha"
                        className="pl-10 rounded-xl"
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
                </div>
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={isLoading || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                  size="sm"
                  className="gap-1.5"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  Alterar Senha
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Sessão</h3>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Sessão Atual</p>
                      <p className="text-xs text-muted-foreground">
                        {lastSignIn ? `Último login: ${lastSignIn}` : 'Sessão ativa'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px]">Ativa</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Provedor</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.app_metadata?.provider === 'google' ? 'Google' : 'Email e Senha'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {user?.app_metadata?.provider === 'google' ? 'Google' : 'Email'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Preferências de Notificação</h3>
                {[
                  { label: 'Notificações por email', desc: 'Receba atualizações importantes por email' },
                  { label: 'Notificações push', desc: 'Alertas no navegador e dispositivos' },
                  { label: 'Resumo semanal', desc: 'Receba um resumo das atividades toda semana' },
                  { label: 'Lembretes de reunião', desc: 'Aviso antes de reuniões agendadas' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-destructive/20 bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-destructive">Zona de Perigo</h3>
                <div className="flex items-center justify-between p-3 rounded-xl border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="text-sm font-medium text-foreground">Sair de todos os dispositivos</p>
                    <p className="text-xs text-muted-foreground">Encerra todas as sessões ativas</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => signOut()}>
                    <LogOut className="h-3.5 w-3.5" /> Sair
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Reusable field input */
function FieldInput({ icon: Icon, label, name, value, onChange, placeholder, disabled }: {
  icon: any;
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`pl-10 rounded-xl ${disabled ? 'bg-muted' : ''}`}
        />
      </div>
    </div>
  );
}

export default UserProfilePage;
