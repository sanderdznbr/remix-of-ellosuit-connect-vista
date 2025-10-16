import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Sparkles, Calendar, Mail, CheckSquare, Video, FileText, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Suggestion {
  text: string;
  icon: React.ReactNode;
  action: () => void;
}

interface IntelligentAssistantProps {
  onNavigate: (item: string) => void;
  suggestions?: Suggestion[];
}

const IntelligentAssistant: React.FC<IntelligentAssistantProps> = ({ onNavigate, suggestions }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const navigate = useNavigate();

  const defaultSuggestions: Suggestion[] = suggestions || [
    {
      text: 'Próxima reunião começa em 15 minutos',
      icon: <Video className="h-4 w-4" />,
      action: () => navigate('/dashboard')
    },
    {
      text: '5 emails importantes não respondidos',
      icon: <Mail className="h-4 w-4" />,
      action: () => navigate('/dashboard')
    },
    {
      text: '3 tarefas com deadline hoje',
      icon: <CheckSquare className="h-4 w-4" />,
      action: () => navigate('/tarefas')
    }
  ];

  const handleQuery = (e: React.FormEvent) => {
    e.preventDefault();
    const queryLower = query.toLowerCase();
    
    const actions: { [key: string]: { response: string; route: string } } = {
      'reunião': { response: 'Redirecionando para Reuniões...', route: '/dashboard' },
      'agenda': { response: 'Abrindo sua Agenda...', route: '/dashboard' },
      'email': { response: 'Abrindo seus Emails...', route: '/dashboard' },
      'tarefa': { response: 'Abrindo Tarefas...', route: '/tarefas' },
      'cliente': { response: 'Abrindo Gerenciamento de Clientes...', route: '/dashboard' },
      'documento': { response: 'Abrindo Documentos...', route: '/dashboard' },
      'configuração': { response: 'Abrindo Configurações...', route: '/dashboard' }
    };

    for (const [key, action] of Object.entries(actions)) {
      if (queryLower.includes(key)) {
        setResponse(action.response);
        setTimeout(() => {
          navigate(action.route);
          setResponse('');
          setQuery('');
        }, 1000);
        return;
      }
    }

    setResponse('Desculpe, não entendi. Tente perguntar sobre reuniões, agenda, emails, tarefas, clientes ou documentos.');
    setTimeout(() => setResponse(''), 3000);
  };

  return (
    <Card className="mb-6 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Assistente Inteligente</h2>
        </div>
        
        <form onSubmit={handleQuery} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="O que deseja fazer hoje?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-24 h-12 text-lg"
            />
            <Button 
              type="submit" 
              size="sm" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              Perguntar
            </Button>
          </div>
        </form>

        {response && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg text-primary">
            {response}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">Sugestões para você:</p>
          {defaultSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={suggestion.action}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {suggestion.icon}
              </div>
              <span className="text-sm">{suggestion.text}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default IntelligentAssistant;
