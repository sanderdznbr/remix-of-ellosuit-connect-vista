
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
    authLoading,
    deviceLoading,
    isMobile,
    location: window.location.pathname
  });

  // Exibir loading durante verificações iniciais
  if (authLoading || deviceLoading) {
    console.log('Tarefas Page - Showing loading state');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Carregando...</div>
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
  
  try {
    return isMobile ? <TarefasMobile /> : <TarefasDesktop />;
  } catch (error) {
    console.error('Tarefas Page - Error rendering tasks component:', error);
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Erro ao carregar tarefas</h1>
          <p className="text-gray-600 mb-4">Ocorreu um erro inesperado. Tente recarregar a página.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
};

export default Tarefas;
