
import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import TarefasMobile from '@/components/Tarefas/TarefasMobile';
import TarefasDesktop from '@/components/Tarefas/TarefasDesktop';

const Tarefas = () => {
  const { user } = useAuth();
  const { isMobile } = useIsMobile();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return isMobile ? <TarefasMobile /> : <TarefasDesktop />;
};

export default Tarefas;
