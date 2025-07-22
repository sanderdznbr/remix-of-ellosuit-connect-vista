
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import TarefasMobile from '@/components/Tarefas/TarefasMobile';
import TarefasDesktop from '@/components/Tarefas/TarefasDesktop';
import TarefasPublica from '@/components/Tarefas/TarefasPublica';

const Tarefas = () => {
  const { user } = useAuth();
  const { isMobile, isLoading } = useIsMobile();

  // Exibir loading durante a verificação do dispositivo
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  // Se não há usuário autenticado, mostrar página pública
  if (!user) {
    return <TarefasPublica />;
  }

  // Se há usuário autenticado, mostrar tarefas normais
  return isMobile ? <TarefasMobile /> : <TarefasDesktop />;
};

export default Tarefas;
