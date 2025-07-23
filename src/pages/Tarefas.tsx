
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import TarefasMobile from '@/components/Tarefas/TarefasMobile';
import TarefasDesktop from '@/components/Tarefas/TarefasDesktop';

const Tarefas = () => {
  const { user, loading: authLoading } = useAuth();
  const { isMobile, isLoading: deviceLoading } = useIsMobile();

  // Exibir loading durante verificações iniciais
  if (authLoading || deviceLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  // Para a rota /tasks, sempre mostrar a interface de tarefas
  // A autenticação agora é feita nativamente pelo app iOS
  return isMobile ? <TarefasMobile /> : <TarefasDesktop />;
};

export default Tarefas;
