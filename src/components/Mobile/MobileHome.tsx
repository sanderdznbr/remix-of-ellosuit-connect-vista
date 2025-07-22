
import React from 'react';
import { Calendar, Mail, Users, BarChart3, Clock, CheckCircle } from 'lucide-react';
import MobileCard from '@/components/ui/mobile-card';
import { formatDateMobile } from '@/utils/mobile-helpers';

const MobileHome = () => {
  const quickStats = [
    { icon: Calendar, label: 'Eventos Hoje', value: '3', color: 'text-blue-500' },
    { icon: Mail, label: 'Emails Enviados', value: '127', color: 'text-green-500' },
    { icon: Users, label: 'Clientes Ativos', value: '42', color: 'text-orange-500' },
    { icon: CheckCircle, label: 'Tarefas Concluídas', value: '8', color: 'text-purple-500' }
  ];

  const recentActivity = [
    { type: 'email', title: 'Email para João Silva', time: '2 min atrás', status: 'opened' },
    { type: 'meeting', title: 'Reunião com cliente', time: '1 hora atrás', status: 'completed' },
    { type: 'task', title: 'Revisar proposta', time: '3 horas atrás', status: 'pending' }
  ];

  return (
    <div className="ios-scroll" style={{ backgroundColor: 'var(--ios-bg-grouped)' }}>
      <div className="px-4 pb-6 space-y-6">
        {/* Quick Stats */}
        <div className="ios-card-section">
          <div className="ios-section-header">
            <h2 className="ios-title-3">Visão Geral</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            {quickStats.map((stat, index) => (
              <MobileCard 
                key={index} 
                className="ios-card p-4 text-center ios-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <stat.icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
                <p className="ios-title-2 font-bold mb-1">{stat.value}</p>
                <p className="ios-caption">{stat.label}</p>
              </MobileCard>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="ios-card-section">
          <div className="ios-section-header">
            <h2 className="ios-title-3">Agenda de Hoje</h2>
            <p className="ios-subheadline">{formatDateMobile(new Date())}</p>
          </div>
          <div className="space-y-1">
            <div className="ios-list-item">
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <h3 className="ios-headline">Reunião com cliente</h3>
                  <p className="ios-subheadline">09:00 - 10:00</p>
                </div>
              </div>
            </div>
            <div className="ios-list-item">
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="flex-1">
                  <h3 className="ios-headline">Apresentação de proposta</h3>
                  <p className="ios-subheadline">14:00 - 15:30</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="ios-card-section">
          <div className="ios-section-header">
            <h2 className="ios-title-3">Atividade Recente</h2>
          </div>
          <div className="space-y-1">
            {recentActivity.map((activity, index) => (
              <div key={index} className="ios-list-item ios-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'opened' ? 'bg-green-500' :
                    activity.status === 'completed' ? 'bg-blue-500' : 'bg-orange-500'
                  }`}></div>
                  <div className="flex-1">
                    <h3 className="ios-headline">{activity.title}</h3>
                    <p className="ios-subheadline">{activity.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileHome;
