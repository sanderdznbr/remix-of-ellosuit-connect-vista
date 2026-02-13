import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  UserPlus, MoreVertical, Shield, Mail, Search, Users, Crown, UserCheck,
  Trash2, Copy, Check, Clock, RefreshCw, XCircle, Link2, Briefcase, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/shared/UpgradeModal';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  permissions: string[];
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  status: string;
  token: string;
  created_at: string;
  expires_at: string;
}

const PERMISSIONS_CONFIG = [
  { category: 'Agenda', permissions: [
    { value: 'view_calendar', label: 'Ver agenda' },
    { value: 'manage_calendar', label: 'Gerenciar eventos' },
  ]},
  { category: 'Cadastros / CRM', permissions: [
    { value: 'view_clients', label: 'Ver contatos' },
    { value: 'manage_clients', label: 'Criar/editar contatos' },
    { value: 'view_crm', label: 'Ver CRM' },
    { value: 'manage_crm', label: 'Gerenciar CRM' },
  ]},
  { category: 'E-mail Marketing', permissions: [
    { value: 'view_emails', label: 'Ver e-mails' },
    { value: 'send_emails', label: 'Enviar e-mails' },
    { value: 'manage_email_campaigns', label: 'Gerenciar campanhas' },
  ]},
  { category: 'Documentos / Drive', permissions: [
    { value: 'view_documents', label: 'Ver documentos' },
    { value: 'manage_documents', label: 'Gerenciar documentos' },
  ]},
  { category: 'Reuniões', permissions: [
    { value: 'view_meetings', label: 'Ver reuniões' },
    { value: 'create_meetings', label: 'Criar reuniões' },
  ]},
  { category: 'Tarefas', permissions: [
    { value: 'view_tasks', label: 'Ver tarefas' },
    { value: 'manage_tasks', label: 'Gerenciar tarefas' },
  ]},
  { category: 'Rastreamento', permissions: [
    { value: 'view_tracking', label: 'Ver rastreamento' },
    { value: 'manage_tracking', label: 'Gerenciar rastreamento' },
  ]},
  { category: 'Analytics', permissions: [
    { value: 'view_analytics', label: 'Ver análises' },
  ]},
  { category: 'Administração', permissions: [
    { value: 'manage_settings', label: 'Configurações' },
    { value: 'manage_users', label: 'Gerenciar usuários' },
  ]},
];

const ALL_PERMS = PERMISSIONS_CONFIG.flatMap(c => c.permissions.map(p => p.value));

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700', icon: Crown },
  adminmaster: { label: 'Admin Master', color: 'bg-purple-100 text-purple-700', icon: Crown },
  manager: { label: 'Gerente', color: 'bg-amber-100 text-amber-700', icon: Shield },
  employee: { label: 'Colaborador', color: 'bg-blue-100 text-blue-700', icon: UserCheck },
};

const TeamManagement = () => {
  const { user } = useAuth();
  const subscription = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [invitePerms, setInvitePerms] = useState<string[]>([]);
  const [inviteSending, setInviteSending] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Permissions dialog
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editRole, setEditRole] = useState('employee');

  const [activeTab, setActiveTab] = useState('membros');

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: cu } = await supabase
        .from('company_users')
        .select('company_id, role')
        .eq('user_id', user!.id)
        .single();
      if (!cu) return;
      setCompanyId(cu.company_id);
      setCurrentUserRole(cu.role);

      // Members
      const { data: teamMembers } = await supabase
        .from('company_users')
        .select('id, user_id, role, created_at')
        .eq('company_id', cu.company_id)
        .order('created_at');

      const membersWithPerms: TeamMember[] = await Promise.all(
        (teamMembers || []).map(async (m) => {
          const { data: perms } = await supabase
            .from('user_permissions')
            .select('permission')
            .eq('user_id', m.user_id)
            .eq('company_id', cu.company_id);
          return {
            ...m,
            email: m.user_id === user!.id ? user!.email || '' : `user-${m.user_id.slice(0, 8)}`,
            permissions: perms?.map(p => p.permission) || [],
          };
        })
      );
      setMembers(membersWithPerms);

      // Invitations
      const { data: invs } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('company_id', cu.company_id)
        .in('status', ['pending'])
        .order('created_at', { ascending: false });
      setInvitations((invs as any) || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  };

  const remainingSlots = subscription.limits.maxUsers - members.length;
  const canInvite = remainingSlots > 0;

  const handleOpenInvite = () => {
    if (!canInvite) {
      setUpgradeOpen(true);
      return;
    }
    setInviteOpen(true);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !companyId) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) { toast.error('Email inválido'); return; }

    // Re-check limit before sending
    if (!canInvite) {
      setUpgradeOpen(true);
      return;
    }

    setInviteSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('team-invite', {
        body: {
          action: 'send-invite',
          email: inviteEmail,
          role: inviteRole,
          permissions: invitePerms,
          companyId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedLink(data.inviteUrl || '');
      toast.success(`Convite enviado para ${inviteEmail}!`);
      loadAll();
      subscription.refetch();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar convite');
    } finally {
      setInviteSending(false);
    }
  };

  const handleCancelInvite = async (invId: string) => {
    try {
      await supabase.functions.invoke('team-invite', {
        body: { action: 'cancel-invite', invitationId: invId, companyId },
      });
      toast.success('Convite cancelado');
      loadAll();
    } catch { toast.error('Erro ao cancelar'); }
  };

  const handleResendInvite = async (invId: string) => {
    try {
      await supabase.functions.invoke('team-invite', {
        body: { action: 'resend-invite', invitationId: invId },
      });
      toast.success('Convite reenviado!');
      loadAll();
    } catch { toast.error('Erro ao reenviar'); }
  };

  const handleUpdateMember = async () => {
    if (!editingMember || !companyId) return;
    try {
      // Update role
      await supabase.from('company_users').update({ role: editRole as any }).eq('id', editingMember.id);

      // Update permissions
      await supabase.from('user_permissions').delete()
        .eq('user_id', editingMember.user_id).eq('company_id', companyId);

      if (editRole !== 'admin' && editPerms.length > 0) {
        await supabase.from('user_permissions').insert(
          editPerms.map(p => ({
            user_id: editingMember.user_id,
            company_id: companyId,
            permission: p as any,
            granted_by: user?.id,
          }))
        );
      }

      toast.success('Membro atualizado!');
      setPermDialogOpen(false);
      setEditingMember(null);
      loadAll();
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (userId === user?.id) { toast.error('Você não pode se remover'); return; }
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    try {
      await supabase.from('user_permissions').delete().eq('user_id', userId).eq('company_id', companyId!);
      await supabase.from('company_users').delete().eq('id', memberId);
      toast.success('Membro removido');
      loadAll();
    } catch { toast.error('Erro ao remover'); }
  };

  const openPermDialog = (member: TeamMember) => {
    setEditingMember(member);
    setEditPerms(member.permissions);
    setEditRole(member.role);
    setPermDialogOpen(true);
  };

  const resetInviteDialog = () => {
    setInviteEmail(''); setInviteRole('employee'); setInvitePerms([]);
    setGeneratedLink(''); setCopied(false); setInviteOpen(false);
  };

  const togglePerm = (perm: string, perms: string[], setPerms: (p: string[]) => void) => {
    setPerms(perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm]);
  };

  const toggleCategory = (cat: typeof PERMISSIONS_CONFIG[0], perms: string[], setPerms: (p: string[]) => void) => {
    const catPerms = cat.permissions.map(p => p.value);
    const allSelected = catPerms.every(p => perms.includes(p));
    setPerms(allSelected ? perms.filter(p => !catPerms.includes(p)) : [...new Set([...perms, ...catPerms])]);
  };

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'adminmaster';

  const filteredMembers = members.filter(m =>
    (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Shared permissions editor
  const PermissionsEditor = ({ perms, setPerms, disabled }: { perms: string[]; setPerms: (p: string[]) => void; disabled?: boolean }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Permissões de Acesso</Label>
        <Button variant="ghost" size="sm" onClick={() => setPerms(perms.length === ALL_PERMS.length ? [] : [...ALL_PERMS])} disabled={disabled}>
          {perms.length === ALL_PERMS.length ? 'Desmarcar tudo' : 'Marcar tudo'}
        </Button>
      </div>
      {PERMISSIONS_CONFIG.map(cat => {
        const catPerms = cat.permissions.map(p => p.value);
        const selectedCount = catPerms.filter(p => perms.includes(p)).length;
        return (
          <div key={cat.category} className="rounded-lg border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <button
                onClick={() => !disabled && toggleCategory(cat, perms, setPerms)}
                className="text-sm font-medium flex items-center gap-2 hover:text-primary transition-colors"
                disabled={disabled}
              >
                {cat.category}
                <Badge variant="outline" className="text-[10px]">{selectedCount}/{catPerms.length}</Badge>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {cat.permissions.map(p => (
                <label key={p.value} className="flex items-center gap-2 text-sm cursor-pointer py-1 px-2 rounded hover:bg-muted transition-colors">
                  <Checkbox
                    checked={perms.includes(p.value)}
                    onCheckedChange={() => togglePerm(p.value, perms, setPerms)}
                    disabled={disabled}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Equipe</h1>
          <p className="text-muted-foreground">Gerencie membros, permissões e convites</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {remainingSlots > 0 ? (
                <>{remainingSlots} convite{remainingSlots !== 1 ? 's' : ''} restante{remainingSlots !== 1 ? 's' : ''}</>
              ) : (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" /> Limite atingido
                </span>
              )}
            </span>
            <Button onClick={handleOpenInvite} className="gap-2" variant={canInvite ? 'default' : 'outline'}>
              <UserPlus className="h-4 w-4" /> {canInvite ? 'Convidar Colaborador' : 'Adicionar Vaga'}
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', count: members.length, icon: Users, color: 'text-primary' },
          { label: 'Admins', count: members.filter(m => ['admin', 'adminmaster'].includes(m.role)).length, icon: Crown, color: 'text-destructive' },
          { label: 'Colaboradores', count: members.filter(m => m.role === 'employee').length, icon: Briefcase, color: 'text-blue-600' },
          { label: 'Convites', count: invitations.length, icon: Mail, color: 'text-amber-600' },
        ].map(s => (
          <Card key={s.label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="membros" className="gap-2"><Users className="h-4 w-4" /> Membros</TabsTrigger>
          <TabsTrigger value="convites" className="gap-2"><Mail className="h-4 w-4" /> Convites Pendentes</TabsTrigger>
        </TabsList>

        <TabsContent value="membros" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar membros..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum membro encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map(member => {
                const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.employee;
                const RIcon = rc.icon;
                const isMe = member.user_id === user?.id;
                return (
                  <Card key={member.id} className="border shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-xs font-semibold bg-muted">
                            {(member.email || '??').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{member.email}</p>
                            {isMe && <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">Você</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={`${rc.color} text-[10px] gap-1`}>
                              <RIcon className="h-3 w-3" /> {rc.label}
                            </Badge>
                            {member.permissions.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">{member.permissions.length} permissão(ões)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isAdmin && !isMe && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openPermDialog(member)}>
                              <Shield className="h-4 w-4 mr-2" /> Editar Permissões
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member.id, member.user_id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="convites" className="mt-4 space-y-2">
          {invitations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum convite pendente</p>
            </div>
          ) : (
            invitations.map(inv => (
              <Card key={inv.id} className="border shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {ROLE_CONFIG[inv.role]?.label || 'Colaborador'}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expira em {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                      </span>
                      {inv.permissions?.length > 0 && (
                        <span>{inv.permissions.length} permissão(ões)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Reenviar" onClick={() => handleResendInvite(inv.id)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Copiar link"
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/convite/${inv.token}`); toast.success('Link copiado!'); }}>
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Cancelar" onClick={() => handleCancelInvite(inv.id)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={o => !o && resetInviteDialog()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Convidar Colaborador</DialogTitle>
            <DialogDescription>Envie um convite por email com as permissões desejadas</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-180px)] pr-3">
            <div className="space-y-5 py-2">
              {/* Email */}
              <div className="space-y-2">
                <Label>Email do colaborador</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="colaborador@empresa.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="pl-10" />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={inviteRole} onValueChange={v => {
                  setInviteRole(v);
                  if (v === 'admin') setInvitePerms([...ALL_PERMS]);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">
                      <span className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-blue-500" /> Colaborador — Acesso limitado</span>
                    </SelectItem>
                    <SelectItem value="manager">
                      <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-amber-500" /> Gerente — Gerencia equipe</span>
                    </SelectItem>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2"><Crown className="h-4 w-4 text-red-500" /> Admin — Acesso total</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Permissions */}
              <PermissionsEditor perms={invitePerms} setPerms={setInvitePerms} disabled={inviteRole === 'admin'} />

              {/* Send button */}
              {!generatedLink && (
                <Button onClick={handleSendInvite} disabled={inviteSending || !inviteEmail.trim()} className="w-full">
                  {inviteSending ? 'Enviando...' : 'Enviar Convite'}
                </Button>
              )}

              {/* Generated link */}
              {generatedLink && (
                <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                    <Check className="h-4 w-4" /> Convite criado com sucesso!
                  </div>
                  <p className="text-xs text-muted-foreground">Um email de convite foi enviado. Você também pode compartilhar o link abaixo:</p>
                  <div className="flex gap-2">
                    <Input value={generatedLink} readOnly className="text-xs" />
                    <Button variant="outline" size="icon" onClick={copyLink}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Editar Permissões</DialogTitle>
            <DialogDescription>{editingMember?.email}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-200px)] pr-3">
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={editRole} onValueChange={v => {
                  setEditRole(v);
                  if (v === 'admin') setEditPerms([...ALL_PERMS]);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Colaborador</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />
              <PermissionsEditor perms={editPerms} setPerms={setEditPerms} disabled={editRole === 'admin'} />

              <Button onClick={handleUpdateMember} className="w-full">Salvar Alterações</Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        resource="users"
        currentUsage={members.length}
        maxLimit={subscription.limits.maxUsers}
      />
    </div>
  );
};

export default TeamManagement;
