
import React, { useState } from 'react';
import { Users, Plus, Search, Phone, Mail } from 'lucide-react';
import MobileCard from '@/components/ui/mobile-card';
import { vibrate } from '@/utils/mobile-helpers';

const MobileClientsManager = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const clients = [
    { name: 'João Silva', company: 'Tech Solutions', email: 'joao@tech.com', phone: '(11) 99999-9999', status: 'active' },
    { name: 'Maria Santos', company: 'Digital Agency', email: 'maria@digital.com', phone: '(11) 88888-8888', status: 'prospect' },
    { name: 'Pedro Costa', company: 'StartUp Inc', email: 'pedro@startup.com', phone: '(11) 77777-7777', status: 'active' },
    { name: 'Ana Oliveira', company: 'Creative Studio', email: 'ana@creative.com', phone: '(11) 66666-6666', status: 'inactive' }
  ];

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'prospect': return 'bg-orange-500';
      case 'inactive': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const handleClientClick = (client: any) => {
    vibrate(30);
    console.log('Client clicked:', client);
  };

  return (
    <div className="ios-scroll" style={{ backgroundColor: 'var(--ios-bg-grouped)' }}>
      <div className="px-4 pb-6 space-y-6">
        {/* Search */}
        <div className="ios-card p-4">
          <div className="flex items-center space-x-3">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ios-input flex-1 bg-transparent border-none outline-none"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="ios-card-section">
          <div className="ios-section-header">
            <h2 className="ios-title-3">Resumo</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 p-4">
            <div className="text-center">
              <p className="ios-title-2 font-bold text-green-500">24</p>
              <p className="ios-caption">Ativos</p>
            </div>
            <div className="text-center">
              <p className="ios-title-2 font-bold text-orange-500">8</p>
              <p className="ios-caption">Prospects</p>
            </div>
            <div className="text-center">
              <p className="ios-title-2 font-bold text-gray-500">3</p>
              <p className="ios-caption">Inativos</p>
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="ios-card-section">
          <div className="ios-section-header">
            <h2 className="ios-title-3">Clientes ({filteredClients.length})</h2>
          </div>
          <div className="space-y-1">
            {filteredClients.map((client, index) => (
              <div
                key={index}
                className="ios-list-item ios-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => handleClientClick(client)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="ios-headline">{client.name}</h3>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(client.status)}`}></div>
                    </div>
                    <p className="ios-subheadline">{client.company}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="ios-caption text-gray-500">{client.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span className="ios-caption text-gray-500">{client.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="ios-title-3 mb-2">Nenhum cliente encontrado</h3>
            <p className="ios-subheadline">Tente ajustar sua pesquisa</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileClientsManager;
