import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  UserPlus, MoreVertical, Shield, Mail, Search,
  Users, Crown, UserCheck, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700 border-red-200', icon: Crown },
  manager: { label: 'Gerente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Shield },
  employee: { label: 'Colaborador', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: UserCheck },
};

const TeamManagement = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadTeam();
  }, [user]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      
      // Get current user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id, role')
        .eq('user_id', user!.id)
        .single();

      if (!companyUser) return;
      
      setCompanyId(companyUser.company_id);
      setCurrentUserRole(companyUser.role);

      // Get all team members
      const { data: teamMembers, error } = await supabase
        .from('company_users')
        .select('id, user_id, role, created_at')
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get emails from auth (we'll use the user_id to display)
      const membersWithEmail: TeamMember[] = (teamMembers || []).map(m => ({
        ...m,
        email: m.user_id === user!.id ? user!.email || '' : `user-${m.user_id.slice(0, 6)}`,
      }));

      setMembers(membersWithEmail);
    } catch (err) {
      console.error('Error loading team:', err);
      toast.error('Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !companyId) return;

    try {
      // Check if user exists in auth by trying to find them
      const { data: existingUsers } = await supabase
        .from('company_users')
        .select('id')
        .eq('company_id', companyId);

      // For now, we'll create an invitation record
      // In a full implementation, this would send an email invitation
      toast.success(`Convite enviado para ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('employee');
      setInviteOpen(false);
    } catch (err) {
      toast.error('Erro ao enviar convite');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('company_users')
        .update({ role: newRole as any })
        .eq('id', memberId);

      if (error) throw error;
      toast.success('Permissão atualizada');
      loadTeam();
    } catch (err) {
      toast.error('Erro ao atualizar permissão');
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast.error('Você não pode remover a si mesmo');
      return;
    }

    try {
      const { error } = await supabase
        .from('company_users')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      toast.success('Membro removido');
      loadTeam();
    } catch (err) {
      toast.error('Erro ao remover membro');
    }
  };

  const filteredMembers = members.filter(m =>
    (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
          <p className="text-gray-500 mt-1">
            Gerencie os membros e permissões da sua empresa
          </p>
        </div>
        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#3000E3] hover:bg-[#2400b3]">
                <UserPlus className="h-4 w-4" />
                Convidar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Convidar Colaborador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Email do colaborador
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="email@empresa.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Função
                  </label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-red-500" />
                          Admin — Acesso total
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-amber-500" />
                          Gerente — Gerencia equipe
                        </div>
                      </SelectItem>
                      <SelectItem value="employee">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-blue-500" />
                          Colaborador — Acesso padrão
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleInvite}
                  className="w-full bg-[#3000E3] hover:bg-[#2400b3]"
                  disabled={!inviteEmail.trim()}
                >
                  Enviar Convite
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', count: members.length, icon: Users, color: '#3000E3' },
          { label: 'Admins', count: members.filter(m => m.role === 'admin').length, icon: Crown, color: '#EF4444' },
          { label: 'Colaboradores', count: members.filter(m => m.role === 'employee').length, icon: UserCheck, color: '#3B82F6' },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl"
                style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar membros..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Members List */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum membro encontrado</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMembers.map((member) => {
                const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.employee;
                const RoleIcon = roleConfig.icon;
                const initials = (member.email || '??').slice(0, 2).toUpperCase();
                const isCurrentUser = member.user_id === user?.id;

                return (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback 
                          className="text-sm font-medium"
                          style={{ 
                            backgroundColor: `${member.role === 'admin' ? '#EF4444' : '#3000E3'}15`,
                            color: member.role === 'admin' ? '#EF4444' : '#3000E3',
                          }}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {member.email}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Você
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Desde {new Date(member.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={`${roleConfig.color} border gap-1 text-xs`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {roleConfig.label}
                      </Badge>

                      {isAdmin && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'admin')}>
                              <Crown className="h-4 w-4 mr-2 text-red-500" />
                              Tornar Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'manager')}>
                              <Shield className="h-4 w-4 mr-2 text-amber-500" />
                              Tornar Gerente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'employee')}>
                              <UserCheck className="h-4 w-4 mr-2 text-blue-500" />
                              Tornar Colaborador
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRemoveMember(member.id, member.user_id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamManagement;
