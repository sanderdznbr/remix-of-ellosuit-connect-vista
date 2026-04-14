// Maps between URL paths and internal dashboard tab names

const ROUTE_TO_TAB: Record<string, string> = {
  '/': 'home',
  '/projetos': 'projects',
  '/favoritos': 'starred',
  '/galeria': 'gallery',
  '/prompts': 'prompts',
  '/marketplace': 'marketplace',
  '/ferramentas/remover-logo': 'logo-remover',
  '/ferramentas/historico': 'logo-history',
  '/ferramentas/behance': 'behance-import',
  '/ferramentas/instagram': 'instagram-import',
  '/ferramentas/gerador-rosto': 'face-generator',
  '/ferramentas/criar-estilo': 'style-creator',
  '/trends': 'trends',
};

const TAB_TO_ROUTE: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTE_TO_TAB).map(([route, tab]) => [tab, route])
);

export function tabFromPath(pathname: string): string {
  return ROUTE_TO_TAB[pathname] || 'home';
}

export function routeFromTab(tab: string): string {
  return TAB_TO_ROUTE[tab] || '/';
}

/** All dashboard paths that should render PublicCarouselGenerator */
export const DASHBOARD_PATHS = Object.keys(ROUTE_TO_TAB);
