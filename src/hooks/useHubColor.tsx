import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

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
  '/dashboard/automacoes',
];

const flowRoutes = [
  '/dashboard/flows',
  '/dashboard/agenda',
  '/dashboard/agenda-aberta',
  '/dashboard/tasks',
  '/dashboard/reunioes',
  '/dashboard/fluxos',
];

const trackRoutes = [
  '/dashboard/track',
  '/dashboard/rastreamento',
  '/dashboard/encurtador',
  '/dashboard/email-tracker',
  '/dashboard/leads',
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
  '/dashboard/contratos',
  '/dashboard/habitos',
];

export type HubType = 'omni' | 'flow' | 'track' | 'suite' | null;

export function useHubColor() {
  const location = useLocation();
  const path = location.pathname;
  
  let color = DEFAULT_COLOR;
  let hub: HubType = null;

  if (trackRoutes.some(route => path.startsWith(route))) {
    color = TRACK_COLOR; hub = 'track';
  } else if (omniRoutes.some(route => path.startsWith(route))) {
    color = OMNI_COLOR; hub = 'omni';
  } else if (flowRoutes.some(route => path.startsWith(route))) {
    color = FLOW_COLOR; hub = 'flow';
  } else if (suiteRoutes.some(route => path.startsWith(route))) {
    color = SUITE_COLOR; hub = 'suite';
  }

  // Sync PWA theme-color meta tag and body background with current hub
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
    
    const navMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (navMeta) navMeta.setAttribute('content', color);
    
    const tileMeta = document.querySelector('meta[name="msapplication-TileColor"]');
    if (tileMeta) tileMeta.setAttribute('content', color);
    
    // Sync html/body bg for PWA status bar area
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
  }, [color]);

  return { color, hub };
}
