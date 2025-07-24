
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import TarefasMobile from '@/components/Tarefas/TarefasMobile';
import TarefasDesktop from '@/components/Tarefas/TarefasDesktop';
import TaskLogin from '@/components/Tarefas/TaskLogin';

const Tarefas = () => {
  const { user, loading: authLoading } = useAuth();
  const { isMobile, isLoading: deviceLoading } = useIsMobile();

  console.log('Tarefas Page - Debug Info:', {
    user: user ? 'User exists' : 'No user',
    userId: user?.id,
    authLoading,
    deviceLoading,
    isMobile,
    location: window.location.pathname
  });

  // Exibir loading durante verificações iniciais
  if (authLoading || deviceLoading) {
    console.log('Tarefas Page - Showing loading state');
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-900 text-lg">Carregando...</div>
      </div>
    );
  }

  // Se não há usuário autenticado, mostrar tela de login
  if (!user) {
    console.log('Tarefas Page - No user, showing login');
    return <TaskLogin />;
  }

  // Se há usuário autenticado, mostrar tarefas normais
  console.log('Tarefas Page - User authenticated, showing tasks interface');
  
  return (
    <div className="min-h-screen bg-white">
      {isMobile ? <TarefasMobile /> : <TarefasDesktop />}
    </div>
  );
};

export default Tarefas;
