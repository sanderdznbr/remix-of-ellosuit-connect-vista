import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Unsubscribe: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error'>('loading');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    const validate = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await res.json();
        if (res.ok && data.valid) setStatus('valid');
        else if (data.reason === 'already_unsubscribed') setStatus('already');
        else setStatus('invalid');
      } catch {
        setStatus('invalid');
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setStatus('success');
      else if (data?.reason === 'already_unsubscribed') setStatus('already');
      else setStatus('error');
    } catch {
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="w-full max-w-md text-center rounded-2xl p-8 border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
        {status === 'loading' && (
          <p className="text-white/50 text-sm">Verificando...</p>
        )}
        {status === 'valid' && (
          <>
            <h1 className="text-white text-xl font-bold mb-3">Cancelar inscrição</h1>
            <p className="text-white/40 text-sm mb-6">
              Deseja parar de receber e-mails do elloContent?
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={processing}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#7B50DC' }}
            >
              {processing ? 'Processando...' : 'Confirmar cancelamento'}
            </button>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-white text-xl font-bold mb-3">Inscrição cancelada</h1>
            <p className="text-white/40 text-sm">Você não receberá mais e-mails do elloContent.</p>
          </>
        )}
        {status === 'already' && (
          <>
            <h1 className="text-white text-xl font-bold mb-3">Já cancelado</h1>
            <p className="text-white/40 text-sm">Sua inscrição já foi cancelada anteriormente.</p>
          </>
        )}
        {status === 'invalid' && (
          <>
            <h1 className="text-white text-xl font-bold mb-3">Link inválido</h1>
            <p className="text-white/40 text-sm">Este link de cancelamento é inválido ou expirou.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-white text-xl font-bold mb-3">Erro</h1>
            <p className="text-white/40 text-sm">Ocorreu um erro. Tente novamente mais tarde.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
