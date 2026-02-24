import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useAdminMaster } from '@/hooks/useAdminMaster';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LayoutDashboard, Users, CreditCard, Activity, HeadphonesIcon,
  Shield, ChevronLeft, ChevronRight, LogOut, Menu, X, Bell, DollarSign, Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard/admin' },
  { label: 'Empresas & Usuários', icon: Users, path: '/dashboard/admin/users' },
  { label: 'Assinaturas & Planos', icon: CreditCard, path: '/dashboard/admin/subs' },
  { label: 'Logs & Notificações', icon: Bell, path: '/dashboard/admin/notifications' },
  { label: 'Saúde do Sistema', icon: Activity, path: '/dashboard/admin/system' },
  { label: 'Suporte & Bugs', icon: HeadphonesIcon, path: '/dashboard/admin/support' },
  { label: 'Custos', icon: DollarSign, path: '/dashboard/admin/costs' },
  { label: 'Tutoriais', icon: Video, path: '/dashboard/admin/tutorials' },
];

const AdminLayout = () => {
  const { isAdminMaster, loading: authLoading } = useAdminMaster();
  const { user, signOut } = useAuth();
  const { isMobile } = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Skeleton className="h-64 w-full max-w-md" />
      </div>
    );
  }

  if (!isAdminMaster) return <Navigate to="/dashboard" replace />;

  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-[260px]';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        <div className="p-2 rounded-xl bg-destructive/10">
          <Shield className="h-6 w-6 text-destructive" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-sidebar-foreground truncate">Admin Master</h1>
            <p className="text-[11px] text-muted-foreground truncate">Painel da Plataforma</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard/admin'}
              onClick={() => isMobile && setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-destructive/10 text-destructive shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-destructive")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <button
          onClick={() => navigate('/dashboard')}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
            collapsed && "justify-center px-2"
          )}
        >
          <ChevronLeft className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Voltar ao Dashboard</span>}
        </button>
        <button
          onClick={() => signOut()}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className={cn(
          "fixed inset-y-0 left-0 z-30 bg-card border-r border-border flex flex-col transition-all duration-300",
          sidebarWidth
        )}>
          <SidebarContent />
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-7 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </aside>
      )}

      {/* Mobile Header + Drawer */}
      {isMobile && (
        <>
          <header className="fixed top-0 inset-x-0 z-40 h-14 bg-card border-b border-border flex items-center px-4 gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Shield className="h-5 w-5 text-destructive" />
            <span className="font-semibold text-sm text-foreground">Admin Master</span>
          </header>

          {/* Overlay */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
              <aside className="relative w-[280px] bg-card h-full shadow-2xl animate-in slide-in-from-left duration-300">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
                <SidebarContent />
              </aside>
            </div>
          )}
        </>
      )}

      {/* Main content */}
      <main className={cn(
        "flex-1 min-h-screen transition-all duration-300",
        !isMobile && (collapsed ? 'ml-[68px]' : 'ml-[260px]'),
        isMobile && 'pt-14'
      )}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
