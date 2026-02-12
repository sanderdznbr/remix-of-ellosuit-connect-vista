import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSubscription, type ModuleType } from '@/hooks/useSubscription';

const moduleInfo: Record<ModuleType, { name: string; color: string; description: string }> = {
  omni: {
    name: 'Ellosuit Omni',
    color: '#FF4500',
    description: 'CRM WhatsApp, Email Marketing, Agentes de IA e mais',
  },
  flow: {
    name: 'Ellosuit Flow',
    color: '#007DE3',
    description: 'Agenda, Tarefas, Videoconferência, Fluxos de Trabalho e mais',
  },
  track: {
    name: 'Ellosuit Track',
    color: '#3A9A1C',
    description: 'Rastreamento de Documentos, Links e Emails',
  },
};

interface LockedFeaturePageProps {
  module: ModuleType;
}

export default function LockedFeaturePage({ module }: LockedFeaturePageProps) {
  const navigate = useNavigate();
  const { isTrialExpired, trialEndsAt } = useSubscription();
  const info = moduleInfo[module];

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Lock Icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto"
          style={{ backgroundColor: `${info.color}12` }}
        >
          <Lock className="h-10 w-10" style={{ color: info.color }} />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {info.name}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {isTrialExpired 
              ? 'Seu período de teste gratuito terminou. Ative um plano para continuar usando este módulo.'
              : `Este módulo não está incluído no seu plano atual. Faça upgrade para acessar.`
            }
          </p>
        </div>

        {/* Module description */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4" style={{ color: info.color }} />
            <span className="text-sm font-medium text-gray-700">O que está incluído:</span>
          </div>
          <p className="text-sm text-gray-500">{info.description}</p>
        </div>

        {isTrialExpired && trialEndsAt && (
          <p className="text-xs text-gray-400">
            Teste expirou em {trialEndsAt.toLocaleDateString('pt-BR')}
          </p>
        )}

        {/* CTA */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/dashboard/assinatura')}
            className="w-full"
            style={{ backgroundColor: info.color }}
          >
            Ver Planos e Preços
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="w-full text-gray-500"
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
