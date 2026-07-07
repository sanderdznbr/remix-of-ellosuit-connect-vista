import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { ArrowLeft, ShoppingBag, Check, Sparkles, Crown, CreditCard, Coins } from 'lucide-react';
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar';
import { routeFromTab } from '@/utils/dashboard-routes';
import CommunityPosts from '@/components/Marketplace/CommunityPosts';
import { useIsMobile } from '@/hooks/use-mobile';
import { Home } from 'lucide-react';

interface MarketplaceStyle {
  id: string;
  name: string;
  description: string | null;
  preview_images: string[];
  price_credits: number;
  price_brl: number;
  category: string;
  style_config: any;
  is_featured: boolean;
  is_free?: boolean;
  tags: string[];
}

const MarketplaceStyleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [style, setStyle] = useState<MarketplaceStyle | null>(null);
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [activeImage, setActiveImage] = useState(0);


  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    if (id) fetchStyle();
  }, [id]);

  useEffect(() => {
    if (user && id) checkOwnership();
  }, [user, id]);

  const fetchStyle = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('marketplace_styles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setStyle(data as any);
    setLoading(false);
  };

  const checkOwnership = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('purchased_styles')
      .select('id')
      .eq('user_id', user.id)
      .eq('style_id', id)
      .maybeSingle();
    setOwned(!!data);
  };

  const handlePurchase = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!style) return;
    if (owned) { toast.info('Você já possui este estilo!'); return; }

    // Free styles: grant immediately
    if (style.is_free) {
      setPurchasing(true);
      try {
        const { data: cu } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (!cu) throw new Error('Company not found');

        const { error } = await supabase.from('purchased_styles').insert({
          user_id: user.id,
          company_id: cu.company_id,
          style_id: style.id,
          payment_method: 'free',
        } as any);
        if (error) throw error;

        setOwned(true);
        toast.success(`Estilo "${style.name}" adquirido com sucesso!`);
      } catch (err: any) {
        toast.error('Erro ao adquirir estilo: ' + (err.message || 'Tente novamente'));
      } finally {
        setPurchasing(false);
      }
      return;
    }

    // Paid styles: try credits first
    setPurchasing(true);
    try {
      const { data: cu } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (!cu) throw new Error('Company not found');

      // Check credit balance
      const { data: balanceData } = await supabase
        .from('ai_credit_balances')
        .select('balance')
        .eq('company_id', cu.company_id)
        .maybeSingle();

      const balance = (balanceData as any)?.balance || 0;

      if (balance >= style.price_credits) {
        // Has enough credits — consume and grant
        const { data: consumeResult } = await supabase.rpc('consume_ai_credits', {
          p_company_id: cu.company_id,
          p_agent_id: null as any,
          p_amount: style.price_credits,
          p_description: `Compra de estilo: ${style.name}`,
        });
        if (!(consumeResult as any)?.success) {
          toast.error('Créditos insuficientes.');
          setPurchasing(false);
          return;
        }

        const { error } = await supabase.from('purchased_styles').insert({
          user_id: user.id,
          company_id: cu.company_id,
          style_id: style.id,
          payment_method: 'credits',
        } as any);
        if (error) throw error;

        setOwned(true);
        toast.success(`Estilo "${style.name}" adquirido com ${style.price_credits} créditos!`);
      } else {
        // Not enough credits — show purchase options modal
        setPurchasing(false);
        setShowPurchaseModal(true);
      }
    } catch (err: any) {
      toast.error('Erro ao comprar estilo: ' + (err.message || 'Tente novamente'));
    } finally {
      setPurchasing(false);
    }
  };




  const content = (
    <div className="flex-1 h-full overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Back */}
        <button
          onClick={() => navigate('/marketplace')}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Marketplace
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : !style ? (
          <div className="text-center py-20">
            <p className="text-white/30 text-lg">Estilo não encontrado</p>
          </div>
        ) : (
          <>
          <div className="flex flex-col lg:flex-row gap-8">
              {/* Left: Images */}
              <div className="lg:w-3/5">
                {(() => {
                  const allImages = style.preview_images || [];
                  const currentImg = allImages[activeImage];
                  return (
                    <>
                      <div className="rounded-2xl overflow-hidden bg-white/[0.03] mb-4 max-w-sm mx-auto" style={{ aspectRatio: '1080/1350' }}>
                        {currentImg ? (
                          <img src={currentImg} alt={style.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-12 h-12 text-white/10" />
                          </div>
                        )}
                      </div>
                      {allImages.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
                          {allImages.map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveImage(i)}
                              className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                                i === activeImage
                                  ? 'border-purple-500 opacity-100'
                                  : 'border-transparent opacity-50 hover:opacity-80'
                              }`}
                            >
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Right: Info */}
              <div className="lg:w-2/5 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  {style.is_featured && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold">
                      <Crown className="w-3 h-3" /> DESTAQUE
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-white/[0.06] text-white/40 text-[10px]">
                    {style.category}
                  </span>
                </div>

                <h1 className="text-3xl font-bold text-white mb-3">{style.name}</h1>

                {style.description && (
                  <p className="text-sm text-white/40 mb-6 leading-relaxed">{style.description}</p>
                )}

                {style.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-8">
                    {style.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.04] text-white/30 border border-white/[0.06]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto space-y-5">
                  {!owned ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                          {style.is_free ? 'Grátis' : `R$ ${(style.price_brl ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                        {!style.is_free && style.price_credits > 0 && (
                          <span className="text-sm text-white/30">ou {style.price_credits} créditos</span>
                        )}
                      </div>
                      <button
                        onClick={handlePurchase}
                        disabled={purchasing}
                        className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {purchasing ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4" /> {style.is_free ? 'Usar grátis' : 'Comprar estilo'}
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 py-3.5 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
                      <Check className="w-5 h-5" /> Você já possui este estilo
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Community Posts */}
            {id && <CommunityPosts styleId={id} />}
          </>
        )}
      </div>

      {/* Purchase options modal */}
      {showPurchaseModal && style && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setShowPurchaseModal(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl p-6 space-y-5" style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Como deseja adquirir?</h3>
              <p className="text-sm text-white/40 mt-1">Estilo: <span className="text-white/70">{style.name}</span></p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Pay with PIX */}
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  navigate(`/checkout?modo=style&style_id=${style.id}&style_name=${encodeURIComponent(style.name)}&style_price=${style.price_brl}&metodo=pix`);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer text-left"
                style={{ backgroundColor: 'rgba(0,186,173,0.08)', borderColor: 'rgba(0,186,173,0.3)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0,186,173,0.15)' }}>
                  <svg viewBox="0 0 512 512" className="w-5 h-5" fill="none">
                    <path d="M395.5 297.4l-83.6-83.6c-5.5-5.5-14.4-5.5-19.8 0l-83.6 83.6c-5.5 5.5-5.5 14.4 0 19.8l83.6 83.6c5.5 5.5 14.4 5.5 19.8 0l83.6-83.6c5.5-5.5 5.5-14.4 0-19.8z" fill="#00BAAD"/>
                    <path d="M256 116.4l-83.6 83.6c-5.5 5.5-5.5 14.4 0 19.8l83.6 83.6c5.5 5.5 14.4 5.5 19.8 0l83.6-83.6c5.5 5.5 14.4-5.5 19.8 0l-83.6-83.6C270.4 110.9 261.5 110.9 256 116.4z" fill="#00BAAD" opacity="0.7"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Pagar com PIX · R$ {(style.price_brl ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-white/40">Pagamento instantâneo</p>
                </div>
              </button>

              {/* Option 2: Pay with Card */}
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  navigate(`/checkout?modo=style&style_id=${style.id}&style_name=${encodeURIComponent(style.name)}&style_price=${style.price_brl}&metodo=cartao`);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer text-left"
                style={{ backgroundColor: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.3)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
                  <CreditCard className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Cartão de crédito · R$ {(style.price_brl ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-xs text-white/40">Visa, Mastercard, Elo...</p>
                </div>
              </button>

              {/* Option 3: Buy credits */}
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  navigate(`/checkout?modo=creditos&creditos=2`);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer text-left"
                style={{ backgroundColor: 'rgba(234,179,8,0.06)', borderColor: 'rgba(234,179,8,0.2)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(234,179,8,0.12)' }}>
                  <Coins className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Comprar {style.price_credits} créditos</p>
                  <p className="text-xs text-white/40">Use créditos para este e outros estilos</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowPurchaseModal(false)}
              className="w-full py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-full" style={{ backgroundColor: '#0a0a0f' }}>
        <header className="flex items-center justify-between px-4 h-14 shrink-0" style={{ backgroundColor: '#0a0a0f' }}>
          <button onClick={() => navigate('/')} className="p-1.5 text-white/70 cursor-pointer">
            <Home className="w-5 h-5" />
          </button>
          <span className="text-white/70 text-sm font-medium">Marketplace</span>
          <div className="w-8" />
        </header>
        <div className="flex-1 min-h-0">{content}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: '#0a0a0f' }}>
      {content}
    </div>
  );
};


export default MarketplaceStyleDetail;
