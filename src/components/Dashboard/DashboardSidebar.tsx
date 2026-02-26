import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, FolderOpen, Star, Clock, Settings, LogOut, ChevronDown, User, CreditCard } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import ellocontentLogo from '@/assets/ellocontent_logo.png';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ activeTab, onTabChange }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Usuário';
  const email = user?.email || '';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Buscar', icon: Search },
  ];

  return (
    <aside className="w-[240px] h-screen flex flex-col border-r border-white/[0.06] shrink-0" style={{ backgroundColor: '#111116' }}>
      {/* Logo */}
      <div className="px-4 pt-4 pb-3">
        <img src={ellocontentLogo} alt="elloContent" className="h-5" />
      </div>

      {/* Nav */}
      <nav className="px-2 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === item.id
                ? 'bg-white/[0.08] text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Projects section */}
      <div className="px-2 mt-5">
        <p className="px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5">Projetos</p>
        <button
          onClick={() => onTabChange('projects')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            activeTab === 'projects'
              ? 'bg-white/[0.08] text-white font-medium'
              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Todos os projetos
        </button>
        <button
          onClick={() => onTabChange('starred')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            activeTab === 'starred'
              ? 'bg-white/[0.08] text-white font-medium'
              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
          }`}
        >
          <Star className="w-4 h-4" />
          Favoritos
        </button>
      </div>

      {/* Recents */}
      <div className="px-2 mt-5 flex-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider mb-1.5">Recentes</p>
        <div className="space-y-0.5">
          {/* Will be populated with recent projects */}
          <p className="px-3 py-2 text-xs text-white/20">Nenhum projeto ainda</p>
        </div>
      </div>

      {/* Bottom: Profile */}
      <div className="mt-auto border-t border-white/[0.06]">
        {/* Credits */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Créditos</span>
            <span className="text-white/70 font-medium">0 restantes</span>
          </div>
          <div className="w-full h-1 rounded-full bg-white/[0.06] mt-1.5">
            <div className="h-full rounded-full bg-purple-500/60" style={{ width: '0%' }} />
          </div>
        </div>

        {/* Profile button */}
        <div className="relative px-2 pb-3">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm text-white/80 font-medium truncate">{username}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile dropdown */}
          {showProfileMenu && (
            <div
              className="absolute bottom-full left-2 right-2 mb-1 rounded-xl border border-white/[0.08] shadow-2xl overflow-hidden z-50"
              style={{ backgroundColor: '#1a1a22' }}
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm text-white/80 font-medium truncate">{email}</p>
              </div>
              <div className="py-1">
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <User className="w-4 h-4" /> Perfil
                </button>
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <Settings className="w-4 h-4" /> Configurações
                </button>
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <CreditCard className="w-4 h-4" /> Plano & Créditos
                </button>
              </div>
              <div className="border-t border-white/[0.06] py-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400/70 hover:text-red-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
