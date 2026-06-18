import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Sincroniza a URL /carousel/:id com o estado do CarouselGenerator.
 *
 * Regras (corrigem o bug do flash + redirect-to-home no preview):
 * 1. Se houver `routeCarouselId` na URL, NUNCA redireciona para `/`
 *    enquanto o post ainda está carregando — mesmo que `showWelcome=true`
 *    (estado inicial).
 * 2. Quando o usuário volta manualmente ao dashboard (`showWelcome=true`
 *    e SEM routeCarouselId), reseta a URL para `/`.
 * 3. Quando um carousel é carregado, atualiza a URL via replaceState
 *    (sem re-render).
 */
export interface CarouselRouteSyncOptions {
  routeCarouselId?: string;
  currentCarouselId?: string | null;
  showWelcome: boolean;
  user: unknown;
  /** Carrega o post no estado e marca showWelcome=false. */
  loadById: (id: string) => Promise<void> | void;
}

export function useCarouselRouteSync(opts: CarouselRouteSyncOptions) {
  const { routeCarouselId, currentCarouselId, showWelcome, user, loadById } = opts;
  const navigate = useNavigate();
  const hasManuallyNavigatedAway = useRef(false);
  const loadedForRouteRef = useRef<string | null>(null);

  // Effect 1: load carousel from route param.
  useEffect(() => {
    if (!routeCarouselId || !user) return;
    if (hasManuallyNavigatedAway.current) return;
    if (currentCarouselId === routeCarouselId) return;
    if (loadedForRouteRef.current === routeCarouselId) return;
    loadedForRouteRef.current = routeCarouselId;
    void loadById(routeCarouselId);
  }, [routeCarouselId, user, currentCarouselId, loadById]);

  // Effect 2: keep URL in sync, but never redirect away if a routeCarouselId
  // is present and pending — that was the bug.
  useEffect(() => {
    if (showWelcome) {
      if (routeCarouselId) return; // pending load — do NOT redirect
      hasManuallyNavigatedAway.current = true;
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/carousel/')) {
        navigate('/', { replace: true });
      }
      return;
    }
    hasManuallyNavigatedAway.current = false;
    if (currentCarouselId) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes(currentCarouselId)) {
        window.history.replaceState({}, '', `/carousel/${currentCarouselId}`);
      }
    } else if (
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/carousel/') &&
      !routeCarouselId
    ) {
      navigate('/', { replace: true });
    }
  }, [currentCarouselId, showWelcome, routeCarouselId, navigate]);
}
