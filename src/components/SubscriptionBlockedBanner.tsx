import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { isNativeIOS } from '@/lib/platform';

export function SubscriptionBlockedBanner() {
  const { isBlocked, status, planType, expiresAt, monthlyPrice } = useSubscriptionGuard();
  const navigate = useNavigate();
  const location = useLocation();

  // Billing and external-payment recovery are intentionally absent from the
  // iOS build. The server still enforces the user's available entitlements.
  if (isNativeIOS()) return null;

  // Don't block on checkout, pricing, or auth pages
  const unblockPaths = ['/checkout', '/precos', '/auth', '/register', '/forgot-password'];
  if (!isBlocked || unblockPaths.some(p => location.pathname.startsWith(p))) return null;

  const isPastDue = status === 'past_due';
  const formattedDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="max-w-md w-full mx-4 rounded-2xl p-8 text-center" style={{ backgroundColor: '#18181f', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: isPastDue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)' }}>
          <AlertTriangle className="w-8 h-8" style={{ color: isPastDue ? '#ef4444' : '#eab308' }} />
        </div>

        <h2 className="text-white text-xl font-bold mb-2">
          {isPastDue ? 'Pagamento pendente' : 'Assinatura cancelada'}
        </h2>

        <p className="text-white/50 text-sm mb-2">
          {isPastDue
            ? 'Não foi possível processar o pagamento da sua assinatura. Atualize seus dados de pagamento para continuar usando o elloContent.'
            : 'Sua assinatura foi cancelada. Renove para voltar a acessar todos os recursos.'}
        </p>

        {formattedDate && (
          <p className="text-white/30 text-xs mb-6">
            {isPastDue ? 'Vencimento:' : 'Expirou em:'} {formattedDate}
          </p>
        )}

        {monthlyPrice && (
          <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-white/40 text-xs mb-1">Fatura pendente</p>
            <p className="text-white text-2xl font-bold">R$ {Number(monthlyPrice).toFixed(2).replace('.', ',')}</p>
            <p className="text-white/30 text-xs">Plano {planType || 'mensal'}</p>
          </div>
        )}

        <button
          onClick={() => navigate(`/checkout?plano=${planType || 'starter'}`)}
          className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
          style={{ backgroundColor: '#7B50DC', color: '#fff' }}
        >
          <CreditCard className="w-4 h-4" />
          {isPastDue ? 'Atualizar pagamento' : 'Renovar assinatura'}
        </button>

        <p className="text-white/20 text-[10px] mt-4">
          Dúvidas? Entre em contato: contato@ellocontent.com
        </p>
      </div>
    </div>
  );
}
