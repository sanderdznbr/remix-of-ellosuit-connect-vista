import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

// Import all preview images
import omniCrmWhatsapp from '@/assets/previews/omni-crm-whatsapp.jpg';
import omniAgentesIa from '@/assets/previews/omni-agentes-ia.jpg';
import omniChatbot from '@/assets/previews/omni-chatbot.jpg';
import omniEmail from '@/assets/previews/omni-email.jpg';
import omniDisparos from '@/assets/previews/omni-disparos.jpg';
import omniAutomacoes from '@/assets/previews/omni-automacoes.jpg';
import omniApiWhatsapp from '@/assets/previews/omni-api-whatsapp.jpg';
import flowAgenda from '@/assets/previews/flow-agenda.jpg';
import flowAgendaOnline from '@/assets/previews/flow-agenda-online.jpg';
import flowTasks from '@/assets/previews/flow-tasks.jpg';
import flowReunioes from '@/assets/previews/flow-reunioes.jpg';
import flowFluxos from '@/assets/previews/flow-fluxos.jpg';
import trackRastreamento from '@/assets/previews/track-rastreamento.jpg';
import trackEncurtador from '@/assets/previews/track-encurtador.jpg';
import trackLeads from '@/assets/previews/track-leads.jpg';
import suiteCadastros from '@/assets/previews/suite-cadastros.jpg';
import suiteDrive from '@/assets/previews/suite-drive.jpg';
import suiteEquipe from '@/assets/previews/suite-equipe.jpg';
import suiteHabitos from '@/assets/previews/suite-habitos.jpg';
import suiteContratos from '@/assets/previews/suite-contratos.jpg';
import suitePropostas from '@/assets/previews/suite-propostas.jpg';
import suiteRecibos from '@/assets/previews/suite-recibos.jpg';
import suiteAnalytics from '@/assets/previews/suite-analytics.jpg';

interface ToolInfo {
  path: string;
  title: string;
  preview: string;
  hub: 'omni' | 'flow' | 'track' | 'suite';
}

const TOOLS: ToolInfo[] = [
  { path: '/dashboard/crm-whatsapp', title: 'CRM WhatsApp', preview: omniCrmWhatsapp, hub: 'omni' },
  { path: '/dashboard/bot-ia', title: 'Agentes IA', preview: omniAgentesIa, hub: 'omni' },
  { path: '/dashboard/chatbot', title: 'Chatbot', preview: omniChatbot, hub: 'omni' },
  { path: '/dashboard/email', title: 'E-mail Marketing', preview: omniEmail, hub: 'omni' },
  { path: '/dashboard/disparos', title: 'Disparos', preview: omniDisparos, hub: 'omni' },
  { path: '/dashboard/automacoes', title: 'Automações', preview: omniAutomacoes, hub: 'omni' },
  { path: '/dashboard/api-whatsapp', title: 'API WhatsApp', preview: omniApiWhatsapp, hub: 'omni' },
  { path: '/dashboard/agenda', title: 'Agenda', preview: flowAgenda, hub: 'flow' },
  { path: '/dashboard/agenda-aberta', title: 'Agenda Online', preview: flowAgendaOnline, hub: 'flow' },
  { path: '/dashboard/tasks', title: 'Tarefas', preview: flowTasks, hub: 'flow' },
  { path: '/dashboard/reunioes', title: 'Reuniões', preview: flowReunioes, hub: 'flow' },
  { path: '/dashboard/fluxos', title: 'Fluxos', preview: flowFluxos, hub: 'flow' },
  { path: '/dashboard/rastreamento', title: 'Rastreamento', preview: trackRastreamento, hub: 'track' },
  { path: '/dashboard/encurtador', title: 'Encurtador', preview: trackEncurtador, hub: 'track' },
  { path: '/dashboard/track/leads', title: 'Leads Tracking', preview: trackLeads, hub: 'track' },
  { path: '/dashboard/cadastros', title: 'Cadastros', preview: suiteCadastros, hub: 'suite' },
  { path: '/dashboard/drive', title: 'Arquivos', preview: suiteDrive, hub: 'suite' },
  { path: '/dashboard/equipe', title: 'Equipe', preview: suiteEquipe, hub: 'suite' },
  { path: '/dashboard/habitos', title: 'Hábitos', preview: suiteHabitos, hub: 'suite' },
  { path: '/dashboard/contratos', title: 'Contratos', preview: suiteContratos, hub: 'suite' },
  { path: '/dashboard/propostas', title: 'Ordem de Serviço', preview: suitePropostas, hub: 'suite' },
  { path: '/dashboard/recibos', title: 'Recibos', preview: suiteRecibos, hub: 'suite' },
  { path: '/dashboard/analytics', title: 'Analytics', preview: suiteAnalytics, hub: 'suite' },
];

const HUB_COLORS: Record<string, string> = {
  omni: '#FF4500',
  flow: '#007DE3',
  track: '#3A9A1C',
  suite: '#3000E3',
};

const HUB_LABELS: Record<string, string> = {
  omni: 'Omni',
  flow: 'Flow',
  track: 'Track',
  suite: 'Suite',
};

const STORAGE_KEY = 'ellosuit_tool_usage';

interface UsageData {
  [path: string]: number;
}

function getUsageData(): UsageData {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function incrementUsage(path: string) {
  const data = getUsageData();
  data[path] = (data[path] || 0) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export interface TrackedTool extends ToolInfo {
  count: number;
  hubColor: string;
  hubLabel: string;
}

export function useToolUsageTracker() {
  const location = useLocation();

  // Track current page visit
  useEffect(() => {
    const tool = TOOLS.find(t => location.pathname === t.path);
    if (tool) {
      incrementUsage(tool.path);
    }
  }, [location.pathname]);

  const mostUsedTools = useMemo((): TrackedTool[] => {
    const data = getUsageData();
    return TOOLS
      .filter(t => (data[t.path] || 0) > 0)
      .map(t => ({ ...t, count: data[t.path] || 0, hubColor: HUB_COLORS[t.hub], hubLabel: HUB_LABELS[t.hub] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return { mostUsedTools, allTools: TOOLS };
}
