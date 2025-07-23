
import React from 'react';
import { Calendar, Video, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AgendaMenu = () => {
  const menuItems = [
    {
      icon: Calendar,
      title: 'Calendário',
      description: 'Visualize e gerencie seus compromissos',
      path: '/dashboard/agenda/calendario',
      color: 'bg-blue-500'
    },
    {
      icon: Video,
      title: 'Start Meet',
      description: 'Inicie reuniões rapidamente',
      path: '/dashboard/agenda/start-meet',
      color: 'bg-green-500'
    },
    {
      icon: Clock,
      title: 'Meus Horários',
      description: 'Configure seus horários de trabalho',
      path: '/dashboard/agenda/horarios',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agenda</h1>
        <p className="text-gray-600">Gerencie seus compromissos e reuniões</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-gray-600 text-sm">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AgendaMenu;
