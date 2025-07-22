
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, Bell } from 'lucide-react';

const TarefasPublica = () => {
  const navigate = useNavigate();

  const handleConnectToELLOsuit = () => {
    // Navegar para a página de login com um parâmetro para indicar que deve retornar para tarefas
    navigate('/?returnTo=tarefas');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900 px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold">Tarefas</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <div className="text-center max-w-md space-y-6">
          {/* Icon */}
          <div className="mx-auto w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-gray-400" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white">
            Suas Tarefas Aguardam
          </h2>

          {/* Description */}
          <p className="text-gray-400 text-lg leading-relaxed">
            Conecte-se ao seu ELLOsuit para ver seus lembretes, compromissos e tarefas sincronizados em todos os seus dispositivos.
          </p>

          {/* Features */}
          <div className="space-y-4 py-6">
            <div className="flex items-center space-x-3 text-left">
              <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-gray-300">Sincronização com calendário</span>
            </div>
            <div className="flex items-center space-x-3 text-left">
              <Bell className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-gray-300">Lembretes inteligentes</span>
            </div>
            <div className="flex items-center space-x-3 text-left">
              <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-gray-300">Gerenciamento de tarefas</span>
            </div>
          </div>

          {/* Connect Button */}
          <Button
            onClick={handleConnectToELLOsuit}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200"
          >
            Conectar ao meu ELLOsuit
          </Button>

          {/* Secondary Text */}
          <p className="text-sm text-gray-500">
            Faça login ou crie sua conta para acessar suas tarefas
          </p>
        </div>
      </div>
    </div>
  );
};

export default TarefasPublica;
