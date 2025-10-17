import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Mail, 
  Users, 
  Video,
  FileText,
  CheckSquare,
  MessageSquare,
  Bot,
  Zap,
  BarChart3,
  Settings,
  Send,
  Sparkles,
  Clock,
  CalendarDays,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MobileHomeScreenProps {
  onNavigate: (item: string) => void;
}

const quickAccessItems = [
  { icon: Video, label: 'Reuniões', path: '/dashboard/reunioes', keywords: ['reunião', 'reuniões', 'meeting', 'video', 'chamada'], color: 'from-indigo-500 to-indigo-600' },
  { icon: Calendar, label: 'Ag. Online', path: '/dashboard/agenda-aberta', keywords: ['agenda online', 'agendar online', 'agendamento'], color: 'from-cyan-500 to-cyan-600' },
  { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda', keywords: ['agenda', 'calendário', 'compromisso', 'agendar', 'evento'], color: 'from-blue-500 to-blue-600' },
  { icon: Mail, label: 'Email', path: '/dashboard/email', keywords: ['email', 'e-mail', 'mensagem', 'correio'], color: 'from-green-500 to-green-600' },
  { icon: Users, label: 'Contatos', path: '/dashboard/clientes', keywords: ['cliente', 'clientes', 'contato', 'contatos'], color: 'from-purple-500 to-purple-600' },
  { icon: FileText, label: 'Arquivos', path: '/dashboard/drive', keywords: ['arquivo', 'arquivos', 'documento', 'documentos', 'drive'], color: 'from-orange-500 to-orange-600' },
  { icon: CheckSquare, label: 'Tarefas', path: '/dashboard/tasks', keywords: ['tarefa', 'tarefas', 'task', 'todo', 'fazer'], color: 'from-pink-500 to-pink-600' },
  { icon: Zap, label: 'Fluxos', path: '/dashboard/fluxos', keywords: ['fluxo', 'fluxos', 'automação', 'workflow'], color: 'from-red-500 to-red-600' },
  { icon: MessageSquare, label: 'WhatsApp', path: '/dashboard/crm-whatsapp', keywords: ['whatsapp', 'whats', 'mensagem', 'chat'], color: 'from-emerald-500 to-emerald-600' },
  { icon: Bot, label: 'IA', path: '/dashboard/bot-ia', keywords: ['ia', 'bot', 'agente', 'inteligência', 'artificial'], color: 'from-violet-500 to-violet-600' },
  { icon: BarChart3, label: 'Análises', path: '/dashboard/analytics', keywords: ['análise', 'análises', 'relatório', 'dados', 'estatística'], color: 'from-amber-500 to-amber-600' }
];

const MobileHomeScreen: React.FC<MobileHomeScreenProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    meetingsToday: 0,
    nextMeeting: null as any,
    nextEvent: null as any,
    totalClients: 0
  });

  const findBestMatch = (input: string) => {
    const normalizedInput = input.toLowerCase().trim();
    
    for (const item of quickAccessItems) {
      if (item.keywords.some(keyword => normalizedInput.includes(keyword))) {
        return item;
      }
    }
    
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast({
        title: "Digite algo",
        description: "Por favor, descreva o que você deseja fazer.",
        variant: "destructive"
      });
      return;
    }

    const match = findBestMatch(query);
    
    if (match) {
      setResponse(`Entendi! Vou te levar para ${match.label}...`);
      
      setTimeout(() => {
        navigate(match.path);
        setQuery('');
        setResponse('');
      }, 800);
    } else {
      setResponse("Desculpe, não consegui entender. Tente: 'criar reunião', 'ver agenda', 'gerenciar clientes', etc.");
    }
  };

  const handleQuickAccess = (path: string) => {
    navigate(path);
  };

  // Pegar nome do usuário
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  useEffect(() => {
    loadDashboardStats();
  }, [user]);

  const loadDashboardStats = async () => {
    if (!user) return;

    // Get company_id
    const { data: companyUsers } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!companyUsers || companyUsers.length === 0) return;
    const companyId = companyUsers[0].company_id;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get meetings today
    const { data: meetingsToday } = await supabase
      .from('meeting_rooms')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    // Get next upcoming meeting
    const { data: nextMeeting } = await supabase
      .from('meeting_rooms')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .gte('created_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(1);

    // Get next event
    const { data: nextEvent } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('company_id', companyId)
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(1);

    // Get total clients
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    setStats({
      meetingsToday: meetingsToday?.length || 0,
      nextMeeting: nextMeeting?.[0] || null,
      nextEvent: nextEvent?.[0] || null,
      totalClients: totalClients || 0
    });
  };

  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `Hoje às ${format(date, 'HH:mm')}`;
    }
    if (isTomorrow(date)) {
      return `Amanhã às ${format(date, 'HH:mm')}`;
    }
    return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      {/* Welcome Section */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 to-purple-50 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-3 rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Olá, {userName}! 👋
              </h2>
              <p className="text-sm text-gray-600">
                O que deseja fazer hoje?
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Input
                type="text"
                placeholder="Ex: Quero criar uma reunião..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 px-4 text-base rounded-xl border-2 border-gray-200 focus:border-primary transition-colors pr-12"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-10 w-10 rounded-lg bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {response && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-blue-900 text-sm text-center">{response}</p>
              </div>
            )}
          </form>

          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            <span className="text-xs text-gray-500">Sugestões:</span>
            {['criar reunião', 'ver agenda', 'enviar email'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="px-2 py-0.5 text-xs rounded-full bg-white hover:bg-gray-50 text-gray-700 transition-colors border border-gray-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Reuniões Hoje */}
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Reuniões Hoje
            </CardTitle>
            <Video className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.meetingsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.meetingsToday === 0 ? 'Nenhuma' : 'agendadas'}
            </p>
          </CardContent>
        </Card>

        {/* Próxima Reunião */}
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Próxima Reunião
            </CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {stats.nextMeeting ? (
              <>
                <div className="text-sm font-bold truncate">
                  {stats.nextMeeting.title}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatEventDate(stats.nextMeeting.created_at)}
                </p>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">
                Nenhuma agendada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximo Evento */}
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Próximo Evento
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {stats.nextEvent ? (
              <>
                <div className="text-sm font-bold truncate">
                  {stats.nextEvent.title}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatEventDate(stats.nextEvent.start_date)}
                </p>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">
                Nenhum agendado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total de Clientes */}
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Clientes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card className="border-none shadow-lg rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Ações Rápidas</h3>
          </div>
          
          <div className="relative overflow-hidden">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
              {quickAccessItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleQuickAccess(item.path)}
                    className="flex-shrink-0 snap-start group"
                  >
                    <div className="flex flex-col items-center space-y-2 p-3 bg-white rounded-xl border border-gray-200 hover:border-primary/30 transition-all duration-200 group-active:scale-95 shadow-sm min-w-[85px]">
                      <div className={`p-2.5 rounded-full bg-gradient-to-br ${item.color} shadow-md`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-gray-900 text-center leading-tight">
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default MobileHomeScreen;
