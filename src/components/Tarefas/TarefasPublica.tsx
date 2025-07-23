
import React from 'react';
import { CheckCircle, Calendar, Bell, Smartphone } from 'lucide-react';
import AuthScreen from '@/components/AuthScreen';

const TarefasPublica = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-6 py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Seus Lembretes
            </h1>
            <p className="text-gray-600">
              Organize suas tarefas e nunca mais esqueça o que é importante
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-md mx-auto px-6 py-8">
        <div className="space-y-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Organize por Período
              </h3>
              <p className="text-sm text-gray-600">
                Visualize suas tarefas por hoje, amanhã, semana ou mês
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Notificações Push
              </h3>
              <p className="text-sm text-gray-600">
                Receba lembretes mesmo com o app fechado (iOS)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Interface Móvel
              </h3>
              <p className="text-sm text-gray-600">
                Navegue por gestos e tenha controle total no seu celular
              </p>
            </div>
          </div>
        </div>

        {/* Auth Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Faça login para continuar
            </h2>
            <p className="text-sm text-gray-600">
              Acesse seus lembretes de qualquer dispositivo
            </p>
          </div>

          <AuthScreen />
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md mx-auto px-6 pb-8">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Seus dados são seguros e criptografados
          </p>
        </div>
      </div>
    </div>
  );
};

export default TarefasPublica;
