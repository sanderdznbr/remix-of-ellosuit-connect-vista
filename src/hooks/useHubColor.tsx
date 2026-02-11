import { useLocation } from 'react-router-dom';

export const OMNI_COLOR = '#FF4500';
export const FLOW_COLOR = '#007DE3';
export const TRACK_COLOR = '#3A9A1C';
export const SUITE_COLOR = '#3000E3';
export const DEFAULT_COLOR = '#3000E3';

const omniRoutes = [
  '/dashboard/omni',
  '/dashboard/crm-whatsapp',
  '/dashboard/api-whatsapp',
  '/dashboard/chatbot',
  '/dashboard/chatbot-builder',
  '/dashboard/email',
  '/dashboard/email-templates',
  '/dashboard/email-builder',
  '/dashboard/bot-ia',
  '/dashboard/disparos',
];

const flowRoutes = [
  '/dashboard/flows',
  '/dashboard/agenda',
  '/dashboard/agenda-aberta',
  '/dashboard/tasks',
  '/dashboard/reunioes',
  '/dashboard/fluxos',
  '/dashboard/leads',
];

const trackRoutes = [
  '/dashboard/track',
  '/dashboard/rastreamento',
  '/dashboard/encurtador',
  '/dashboard/email-tracker',
];

const suiteRoutes = [
  '/dashboard/suite',
  '/dashboard/cadastros',
  '/dashboard/drive',
  '/dashboard/equipe',
  '/dashboard/analytics',
  '/dashboard/ello-vision',
  '/dashboard/relatorios',
  '/dashboard/perfil',
  '/dashboard/assinatura',
  '/dashboard/arquivos',
];

export type HubType = 'omni' | 'flow' | 'track' | 'suite' | null;

export function useHubColor() {
  const location = useLocation();
  const path = location.pathname;
  
  if (trackRoutes.some(route => path.startsWith(route))) {
    return { color: TRACK_COLOR, hub: 'track' as const };
  }
  if (omniRoutes.some(route => path.startsWith(route))) {
    return { color: OMNI_COLOR, hub: 'omni' as const };
  }
  if (flowRoutes.some(route => path.startsWith(route))) {
    return { color: FLOW_COLOR, hub: 'flow' as const };
  }
  if (suiteRoutes.some(route => path.startsWith(route))) {
    return { color: SUITE_COLOR, hub: 'suite' as const };
  }
  
  return { color: DEFAULT_COLOR, hub: null };
}
