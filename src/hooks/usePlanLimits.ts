import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export type PlanKey = 'free' | 'starter' | 'pro' | 'growth' | 'enterprise';

export interface PlanLimits {
  // Identity
  planKey: PlanKey;
  planLabel: string;
  isActive: boolean;

  // Credits
  monthlyCredits: number;

  // Modes allowed
  allowSimple: boolean;
  allowAdvanced: boolean;
  allowExtreme: boolean;

  // Carousel limits
  maxSlidesPerCarousel: number;
  allowContinuousMode: boolean;

  // AI quality
  allowElloIAPro: boolean;
  allowElloIAFace: boolean;

  // Storage
  maxBrandGalleryGB: number;

  // Prompts
  maxSavedPrompts: number; // -1 = unlimited

  // Trends
  monthlyTrendCredits: number;

  // Templates
  allowPremiumTemplates: boolean;

  // Export
  allowedExportFormats: ('png' | 'jpg' | 'zip' | 'webp')[];

  // Support
  supportLevel: 'email' | 'priority' | 'chat';

  // Exclusive features
  allowVideoCards: boolean;
  allowRealisticPhotos: boolean;
  allowExclusiveTools: boolean;
}

const PLAN_CONFIGS: Record<PlanKey, Omit<PlanLimits, 'isActive'>> = {
  free: {
    planKey: 'free',
    planLabel: 'Free',
    monthlyCredits: 0,
    allowSimple: true,
    allowAdvanced: false,
    allowExtreme: false,
    maxSlidesPerCarousel: 5,
    allowContinuousMode: false,
    allowElloIAPro: false,
    allowElloIAFace: false,
    maxBrandGalleryGB: 0.5,
    maxSavedPrompts: 1,
    monthlyTrendCredits: 0,
    allowPremiumTemplates: false,
    allowedExportFormats: ['png', 'jpg'],
    supportLevel: 'email',
    allowVideoCards: false,
    allowRealisticPhotos: false,
    allowExclusiveTools: false,
  },
  starter: {
    planKey: 'starter',
    planLabel: 'Criador',
    monthlyCredits: 10,
    allowSimple: true,
    allowAdvanced: false,
    allowExtreme: false,
    maxSlidesPerCarousel: 5,
    allowContinuousMode: false,
    allowElloIAPro: false,
    allowElloIAFace: false,
    maxBrandGalleryGB: 1,
    maxSavedPrompts: 3,
    monthlyTrendCredits: 5,
    allowPremiumTemplates: false,
    allowedExportFormats: ['png', 'jpg', 'zip'],
    supportLevel: 'email',
    allowVideoCards: false,
    allowRealisticPhotos: false,
    allowExclusiveTools: false,
  },
  pro: {
    planKey: 'pro',
    planLabel: 'Estúdio',
    monthlyCredits: 25,
    allowSimple: true,
    allowAdvanced: true,
    allowExtreme: false,
    maxSlidesPerCarousel: 8,
    allowContinuousMode: true,
    allowElloIAPro: true,
    allowElloIAFace: true,
    maxBrandGalleryGB: 5,
    maxSavedPrompts: -1,
    monthlyTrendCredits: 15,
    allowPremiumTemplates: true,
    allowedExportFormats: ['png', 'jpg', 'zip', 'webp'],
    supportLevel: 'priority',
    allowVideoCards: false,
    allowRealisticPhotos: false,
    allowExclusiveTools: false,
  },
  growth: {
    planKey: 'growth',
    planLabel: 'Escala',
    monthlyCredits: 60,
    allowSimple: true,
    allowAdvanced: true,
    allowExtreme: true,
    maxSlidesPerCarousel: 10,
    allowContinuousMode: true,
    allowElloIAPro: true,
    allowElloIAFace: true,
    maxBrandGalleryGB: 10,
    maxSavedPrompts: -1,
    monthlyTrendCredits: 30,
    allowPremiumTemplates: true,
    allowedExportFormats: ['png', 'jpg', 'zip', 'webp'],
    supportLevel: 'chat',
    allowVideoCards: true,
    allowRealisticPhotos: true,
    allowExclusiveTools: true,
  },
  enterprise: {
    planKey: 'enterprise',
    planLabel: 'Enterprise',
    monthlyCredits: 999,
    allowSimple: true,
    allowAdvanced: true,
    allowExtreme: true,
    maxSlidesPerCarousel: 15,
    allowContinuousMode: true,
    allowElloIAPro: true,
    allowElloIAFace: true,
    maxBrandGalleryGB: 50,
    maxSavedPrompts: -1,
    monthlyTrendCredits: 999,
    allowPremiumTemplates: true,
    allowedExportFormats: ['png', 'jpg', 'zip', 'webp'],
    supportLevel: 'chat',
    allowVideoCards: true,
    allowRealisticPhotos: true,
    allowExclusiveTools: true,
  },
};

export function getPlanConfig(planKey: PlanKey): Omit<PlanLimits, 'isActive'> {
  return PLAN_CONFIGS[planKey] || PLAN_CONFIGS.free;
}

export function getRequiredPlanForMode(mode: 'simple' | 'advanced' | 'extreme'): PlanKey {
  if (mode === 'extreme') return 'growth';
  if (mode === 'advanced') return 'pro';
  return 'free';
}

export function getRequiredPlanLabel(planKey: PlanKey): string {
  return PLAN_CONFIGS[planKey]?.planLabel || 'Free';
}

export function usePlanLimits() {
  const { user } = useAuth();
  const [limits, setLimits] = useState<PlanLimits>({ ...PLAN_CONFIGS.free, isActive: false });
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLimits({ ...PLAN_CONFIGS.free, isActive: false });
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        const { data: cu } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!cu) {
          setLoading(false);
          return;
        }

        setCompanyId(cu.company_id);

        // Check both subscription tables
        const [{ data: sub }, { data: elloSub }] = await Promise.all([
          supabase.from('subscriptions').select('plan_type, status').eq('company_id', cu.company_id).maybeSingle(),
          supabase.from('ellocontent_subscriptions')
            .select('plan_name, status')
            .eq('company_id', cu.company_id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        // Determine effective plan
        let planKey: PlanKey = 'free';
        let isActive = false;

        // ellocontent_subscriptions takes priority if active
        if (elloSub && elloSub.status === 'active') {
          const name = (elloSub.plan_name || '').toLowerCase();
          if (name.includes('growth')) planKey = 'growth';
          else if (name.includes('pro')) planKey = 'pro';
          else if (name.includes('starter')) planKey = 'starter';
          else if (name.includes('enterprise')) planKey = 'enterprise';
          isActive = true;
        } else if (sub && sub.status === 'active') {
          const pt = sub.plan_type as string;
          if (pt === 'growth') planKey = 'growth';
          else if (pt === 'pro') planKey = 'pro';
          else if (pt === 'starter') planKey = 'starter';
          else if (pt === 'enterprise') planKey = 'enterprise';
          else if (pt === 'business') planKey = 'growth';
          isActive = true;
        }

        setLimits({ ...PLAN_CONFIGS[planKey], isActive });
      } catch (err) {
        console.error('usePlanLimits error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [user]);

  return { ...limits, loading, companyId };
}
