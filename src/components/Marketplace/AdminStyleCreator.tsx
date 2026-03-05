import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Trash2, Star, StarOff, Eye, EyeOff, Pencil, Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import AdminStyleDialog from './AdminStyleDialog';

interface MarketplaceStyleRow {
  id: string;
  name: string;
  description: string | null;
  preview_images: string[];
  price_credits: number;
  price_brl: number;
  category: string;
  style_config: any;
  is_active: boolean;
  is_featured: boolean;
  is_free: boolean;
  sort_order: number;
  tags: string[];
  strict_instructions?: string;
}

const ADMIN_EMAIL = 'admin@gmail.com';

export interface AdminStyleManagerApi {
  isAdmin: boolean;
  openCreate: () => void;
  openEdit: (style: MarketplaceStyleRow) => void;
}

const AdminStyleCreator: React.FC<{
  onStylesChanged?: () => void;
  onApiReady?: (api: AdminStyleManagerApi) => void;
}> = ({ onStylesChanged, onApiReady }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [styles, setStyles] = useState<MarketplaceStyleRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStyle, setEditStyle] = useState<MarketplaceStyleRow | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user?.email === ADMIN_EMAIL) {
      setIsAdmin(true);
      fetchStyles();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchStyles = async () => {
    setLoading(true);
    const { data } = await supabase.from('marketplace_styles').select('*').order('sort_order', { ascending: true });
    setStyles((data as any[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditStyle(null);
    setDialogOpen(true);
  };

  const openEdit = (style: MarketplaceStyleRow) => {
    setEditStyle(style);
    setDialogOpen(true);
  };

  // Expose API to parent
  useEffect(() => {
    onApiReady?.({ isAdmin, openCreate, openEdit });
  }, [isAdmin]);

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from('marketplace_styles').update({ is_active: !currentActive } as any).eq('id', id);
    fetchStyles();
    onStylesChanged?.();
  };

  const toggleFeatured = async (id: string, currentFeatured: boolean) => {
    await supabase.from('marketplace_styles').update({ is_featured: !currentFeatured } as any).eq('id', id);
    fetchStyles();
    onStylesChanged?.();
  };

  const deleteStyle = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este estilo?')) return;
    await supabase.from('marketplace_styles').delete().eq('id', id);
    fetchStyles();
    onStylesChanged?.();
    toast.success('Estilo excluído');
  };

  if (!isAdmin) return null;

  return (
    <>
      {/* Compact admin bar */}
      <div className="mb-6 flex items-center justify-between px-4 py-3 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.03]">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-bold text-yellow-300">Admin</span>
          <span className="text-[10px] text-yellow-300/40">{styles.length} estilos</span>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs font-medium hover:bg-yellow-500/30 transition-colors cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Novo Estilo
        </button>
      </div>

      <AdminStyleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editStyle={editStyle}
        onSaved={() => { fetchStyles(); onStylesChanged?.(); }}
        totalStyles={styles.length}
      />
    </>
  );
};

export default AdminStyleCreator;
