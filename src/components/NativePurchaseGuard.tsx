import type { ReactNode } from 'react';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isNativeIOS } from '@/lib/platform';

interface NativePurchaseGuardProps {
  children: ReactNode;
}

export function NativePurchaseGuard({ children }: NativePurchaseGuardProps) {
  const navigate = useNavigate();

  if (!isNativeIOS()) {
    return <>{children}</>;
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        paddingTop: 'max(24px, env(safe-area-inset-top))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        backgroundColor: '#0a0a0f',
      }}
    >
      <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15">
          <Smartphone className="h-7 w-7 text-purple-300" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-white">Área indisponível no iOS</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Esta área não faz parte da versão para iPhone. Você pode continuar criando com os recursos disponíveis na sua conta.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </button>
      </section>
    </main>
  );
}
