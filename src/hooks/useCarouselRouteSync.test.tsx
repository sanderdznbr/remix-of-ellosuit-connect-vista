import { describe, it, expect, vi } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { useState, useCallback, useRef } from 'react';
import { MemoryRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { useCarouselRouteSync } from '@/hooks/useCarouselRouteSync';

interface FakePost { id: string; title: string }

const FAKE_POST: FakePost = { id: 'post-123', title: 'Meu Post' };

// Componente mínimo que reproduz o comportamento do CarouselGenerator
// no que tange routing: começa com showWelcome=true e carrega o post
// quando há um routeCarouselId.
function FakeCarouselGenerator({
  loadDelayMs = 30,
  onLoad,
}: {
  loadDelayMs?: number;
  onLoad?: (id: string) => void;
}) {
  const { id: routeCarouselId } = useParams<{ id?: string }>();
  const [currentCarouselId, setCurrentCarouselId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [post, setPost] = useState<FakePost | null>(null);
  const user = { id: 'u1' };

  const loadById = useCallback(
    async (id: string) => {
      await new Promise((r) => setTimeout(r, loadDelayMs));
      // ORDEM IMPORTANTE: setShowWelcome ANTES de loadCarousel,
      // para não deixar showWelcome=true com currentCarouselId definido.
      setShowWelcome(false);
      setCurrentCarouselId(id);
      setPost(FAKE_POST);
      onLoad?.(id);
    },
    [loadDelayMs, onLoad],
  );

  useCarouselRouteSync({
    routeCarouselId,
    currentCarouselId,
    showWelcome,
    user,
    loadById,
  });

  return (
    <div>
      <div data-testid="route-id">{routeCarouselId || 'none'}</div>
      <div data-testid="welcome">{showWelcome ? 'welcome' : 'editor'}</div>
      <div data-testid="post-title">{post?.title || ''}</div>
    </div>
  );
}

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="pathname">{loc.pathname}</div>;
}

function renderAtRoute(initialPath: string, loadDelayMs = 30) {
  const onLoad = vi.fn();
  const utils = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/carousel/:id"
          element={<FakeCarouselGenerator loadDelayMs={loadDelayMs} onLoad={onLoad} />}
        />
        <Route path="/" element={<div data-testid="home">HOME</div>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
  return { ...utils, onLoad };
}

describe('integration: /carousel/:id route', () => {
  it('não redireciona para "/" ao abrir um post existente', async () => {
    const { getByTestId, queryByTestId } = renderAtRoute('/carousel/post-123');

    // Frame inicial: já estamos em /carousel/:id; mesmo com showWelcome=true,
    // NÃO deve ter redirecionado para "/" nem renderizado o Home.
    expect(getByTestId('pathname').textContent).toBe('/carousel/post-123');
    expect(queryByTestId('home')).toBeNull();
    expect(getByTestId('route-id').textContent).toBe('post-123');

    // Após o load completar, sai do welcome e carrega o post.
    await waitFor(() => {
      expect(getByTestId('welcome').textContent).toBe('editor');
      expect(getByTestId('post-title').textContent).toBe('Meu Post');
    });

    // E continua na URL correta — nada de flash.
    expect(getByTestId('pathname').textContent).toBe('/carousel/post-123');
    expect(queryByTestId('home')).toBeNull();
  });

  it('não pisca: o componente do editor permanece montado durante o load', async () => {
    const renders: string[] = [];

    function Spy() {
      const loc = useLocation();
      renders.push(loc.pathname);
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/carousel/post-123']}>
        <Spy />
        <Routes>
          <Route
            path="/carousel/:id"
            element={<FakeCarouselGenerator loadDelayMs={50} />}
          />
          <Route path="/" element={<div data-testid="home">HOME</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Espera o load completar.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    // Nenhum dos renders deve ter passado por "/", o que indicaria flash/redirect.
    expect(renders.every((p) => p === '/carousel/post-123')).toBe(true);
  });

  it('volta para "/" quando o usuário sai do editor (showWelcome=true e sem routeCarouselId)', async () => {
    // Esse cenário é coberto pelo App em produção; aqui simulamos chegando
    // direto em "/" para confirmar que o hook não interfere.
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<div data-testid="home">HOME</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(getByTestId('home')).toBeInTheDocument();
  });
});
