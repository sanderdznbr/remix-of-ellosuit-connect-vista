
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const TarefasDesktop = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Dashboard</span>
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tarefas</h1>
          <p className="text-gray-600 mb-6">
            Esta funcionalidade foi otimizada para dispositivos móveis.
          </p>
          <p className="text-sm text-gray-500">
            Acesse pelo seu celular para uma melhor experiência.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TarefasDesktop;
