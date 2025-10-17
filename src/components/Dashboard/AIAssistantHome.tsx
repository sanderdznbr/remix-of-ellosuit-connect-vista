import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
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
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const quickAccessItems = [
  { icon: Video, label: 'Reuniões', path: '/dashboard/reunioes', keywords: ['reunião', 'reuniões', 'meeting', 'video', 'chamada'] },
  { icon: Calendar, label: 'Agenda', path: '/dashboard/agenda', keywords: ['agenda', 'calendário', 'compromisso', 'agendar', 'evento'] },
  { icon: Mail, label: 'Email', path: '/dashboard/email', keywords: ['email', 'e-mail', 'mensagem', 'correio'] },
  { icon: Users, label: 'Clientes', path: '/dashboard/clientes', keywords: ['cliente', 'clientes', 'contato', 'contatos'] },
  { icon: CheckSquare, label: 'Tarefas', path: '/dashboard/tasks', keywords: ['tarefa', 'tarefas', 'task', 'todo', 'fazer'] },
  { icon: FileText, label: 'Arquivos', path: '/dashboard/drive', keywords: ['arquivo', 'arquivos', 'documento', 'documentos', 'drive'] },
  { icon: MessageSquare, label: 'WhatsApp', path: '/dashboard/crm-whatsapp', keywords: ['whatsapp', 'whats', 'mensagem', 'chat'] },
  { icon: Bot, label: 'IA Agentes', path: '/dashboard/bot-ia', keywords: ['ia', 'bot', 'agente', 'inteligência', 'artificial'] },
  { icon: Zap, label: 'Fluxos', path: '/dashboard/fluxos', keywords: ['fluxo', 'fluxos', 'automação', 'workflow'] },
  { icon: BarChart3, label: 'Análises', path: '/dashboard/analytics', keywords: ['análise', 'análises', 'relatório', 'dados', 'estatística'] },
  { icon: Settings, label: 'Configurações', path: '/dashboard/configuracoes', keywords: ['configuração', 'configurações', 'ajuste', 'preferência'] }
];

const AIAssistantHome = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

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
      }, 1000);
    } else {
      setResponse("Desculpe, não consegui entender. Tente algo como: 'criar reunião', 'ver agenda', 'gerenciar clientes', etc.");
    }
  };

  const handleQuickAccess = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8 mt-12">
        {/* AI Assistant Card */}
        <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
              O que deseja fazer hoje?
            </h1>
            <p className="text-center text-gray-600 mb-8">
              Digite sua solicitação e deixe o sistema te guiar
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Ex: Quero criar uma reunião online, arrumar minha agenda..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-14 px-6 text-lg rounded-2xl border-2 border-gray-200 focus:border-primary transition-colors pr-14"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>

              {response && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-blue-900 text-center">{response}</p>
                </div>
              )}
            </form>

            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <span className="text-xs text-gray-500">Sugestões:</span>
              {['criar reunião', 'ver agenda', 'enviar email', 'gerenciar clientes'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="px-3 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Access */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Acesso Rápido</h2>
          <div className="relative overflow-hidden">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
              {quickAccessItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleQuickAccess(item.path)}
                    className="flex-shrink-0 snap-start group"
                  >
                    <div className="flex flex-col items-center space-y-3 p-6 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 min-w-[120px] group-hover:scale-105">
                      <div className="p-4 rounded-full bg-gradient-to-br from-primary/10 to-purple-100 group-hover:from-primary group-hover:to-purple-600 transition-all">
                        <Icon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 text-center">
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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

export default AIAssistantHome;
