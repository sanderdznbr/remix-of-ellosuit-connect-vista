
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import TarefasMobile from '@/components/Tarefas/TarefasMobile';
import TarefasDesktop from '@/components/Tarefas/TarefasDesktop';

const Tarefas = () => {
  const { user } = useAuth();
  const { isMobile, isLoading } = useIsMobile();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Exibir loading durante a verificação do dispositivo
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  // Priorizar experiência mobile - sempre renderizar mobile em caso de dúvida
  return isMobile ? <TarefasMobile /> : <TarefasDesktop />;
};

export default Tarefas;
