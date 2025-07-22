
import React, { useState } from 'react';
import { Mail, Send, Users, TrendingUp, Plus } from 'lucide-react';
import MobileCard from '@/components/ui/mobile-card';
import { vibrate } from '@/utils/mobile-helpers';

const MobileEmailDashboard = () => {
  const [activeTab, setActiveTab] = useState('inbox');

  const emailStats = [
    { icon: Mail, label: 'Recebidos', value: '24', color: 'text-blue-500' },
    { icon: Send, label: 'Enviados', value: '127', color: 'text-green-500' },
    { icon: Users, label: 'Campanhas', value: '8', color: 'text-purple-500' },
    { icon: TrendingUp, label: 'Taxa de Abertura', value: '68%', color: 'text-orange-500' }
  ];

  const recentEmails = [
    { from: 'João Silva', subject: 'Proposta comercial', time: '2 min', status: 'unread' },
    { from: 'Maria Santos', subject: 'Feedback do projeto', time: '1 hora', status: 'read' },
    { from: 'Pedro Costa', subject: 'Reunião de amanhã', time: '3 horas', status: 'replied' }
  ];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    vibrate(30);
  };

  return (
    <div className="ios-scroll" style={{ backgroundColor: 'var(--ios-bg-grouped)' }}>
      <div className="px-4 pb-6 space-y-6">
        {/* Email Stats */}
        <div className="ios-card-section">
          <div className="ios-section-header">
            <h2 className="ios-title-3">Estatísticas</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            {emailStats.map((stat, index) => (
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

        {/* Filter Pills */}
        <div className="flex space-x-3 px-4">
          {['inbox', 'sent', 'campaigns'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`ios-pill ios-haptic-feedback flex items-center space-x-2 transition-all duration-200 ${
                activeTab === tab ? 'ios-pill-active' : ''
              }`}
            >
              <span className="ios-callout font-medium capitalize">{tab}</span>
            </button>
          ))}
        </div>

        {/* Email List */}
        <div className="ios-card-section">
          <div className="ios-section-header">
            <h2 className="ios-title-3">Emails Recentes</h2>
          </div>
          <div className="space-y-1">
            {recentEmails.map((email, index) => (
              <div key={index} className="ios-list-item ios-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    email.status === 'unread' ? 'bg-blue-500' :
                    email.status === 'replied' ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <div className="flex-1">
                    <h3 className="ios-headline">{email.from}</h3>
                    <p className="ios-subheadline line-clamp-1">{email.subject}</p>
                  </div>
                  <span className="ios-caption text-gray-500">{email.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="ios-card-section">
          <div className="ios-section-header">
            <h2 className="ios-title-3">Ações Rápidas</h2>
          </div>
          <div className="p-4 space-y-3">
            <button className="ios-button ios-button-primary w-full">
              <Plus className="h-5 w-5 mr-2" />
              <span>Novo Email</span>
            </button>
            <button className="ios-button ios-button-secondary w-full">
              <Users className="h-5 w-5 mr-2" />
              <span>Nova Campanha</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileEmailDashboard;
