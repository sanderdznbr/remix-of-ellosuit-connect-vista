
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, MapPin, User, FileText, X, Edit, Save, CheckCircle, XCircle, Video, Upload, Info, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event
}) => {
  const [activeTab, setActiveTab] = useState('info');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [eventStatus, setEventStatus] = useState(event?.extendedProps?.status || 'scheduled');
  const [videoUrl, setVideoUrl] = useState(event?.extendedProps?.video_url || '');

  if (!event) return null;

  const formatEventDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return dateStr;
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'Reunião Online';
      case 'appointment':
        return 'Compromisso';
      case 'reminder':
        return 'Lembrete';
      default:
        return 'Evento';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'postponed':
        return 'Adiado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Agendado';
    }
  };

  const handleSaveNotes = () => {
    setIsEditingNotes(false);
    console.log('Salvando observações:', notes);
  };

  const handleStatusChange = (newStatus: string) => {
    setEventStatus(newStatus);
    console.log('Alterando status para:', newStatus);
  };

  const handleVideoUpload = () => {
    console.log('Abrindo seleção de arquivo do Google Drive');
  };

  const tabs = [
    { id: 'info', label: 'Informações', icon: Info },
    { id: 'recordings', label: 'Gravações', icon: Video },
    { id: 'actions', label: 'Ações', icon: Settings }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-white rounded-3xl shadow-2xl border-0 p-0 overflow-hidden max-h-[90vh]">
        <div className="flex h-[600px]">
          {/* Sidebar com abas */}
          <div className="w-64 bg-gray-50/50 border-r border-gray-100 p-6 rounded-l-3xl">
            <div className="mb-8">
              <DialogTitle className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                {event.title}
              </DialogTitle>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-[#3600FF]/10 text-[#3600FF] border border-[#3600FF]/20">
                {getEventTypeLabel(event.extendedProps?.event_type)}
              </div>
            </div>

            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-[#3600FF] text-white shadow-lg'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Status Badge */}
            <div className="mt-8 p-4 bg-white rounded-2xl shadow-sm">
              <p className="text-sm text-gray-500 mb-2">Status atual</p>
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                eventStatus === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                eventStatus === 'postponed' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                eventStatus === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {getStatusLabel(eventStatus)}
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-gray-100 h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Conteúdo das abas */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Data e Horário */}
                <div className="bg-gray-50/50 rounded-2xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Data e Horário</h3>
                      <p className="text-gray-600 text-lg">
                        {formatEventDate(event.start)}
                      </p>
                      {event.end && event.start !== event.end && (
                        <p className="text-gray-500 text-sm mt-1">
                          até {formatEventDate(event.end)}
                        </p>
                      )}
                      {event.allDay && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mt-2">
                          <Clock className="h-4 w-4 mr-1" />
                          Dia inteiro
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Descrição */}
                {event.extendedProps?.description && (
                  <div className="bg-gray-50/50 rounded-2xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                        <FileText className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">Descrição</h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {event.extendedProps.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Link da Reunião */}
                {event.extendedProps?.meeting_link && (
                  <div className="bg-gray-50/50 rounded-2xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                        <User className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">Link da Reunião</h3>
                        <a
                          href={event.extendedProps.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-[#3600FF] text-white rounded-xl hover:bg-[#3600FF]/90 transition-colors font-medium"
                        >
                          Participar da Reunião
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Observações */}
                <div className="bg-gray-50/50 rounded-2xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                      <Edit className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Observações</h3>
                        {!isEditingNotes ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingNotes(true)}
                            className="text-[#3600FF] hover:text-[#3600FF]/80 rounded-xl"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveNotes}
                            className="text-green-600 hover:text-green-700 rounded-xl"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                        )}
                      </div>
                      {isEditingNotes ? (
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Adicione suas observações sobre este evento..."
                          className="min-h-[120px] rounded-xl border-gray-200 focus:border-[#3600FF] focus:ring-[#3600FF] resize-none"
                        />
                      ) : (
                        <div className="bg-white rounded-xl p-4 min-h-[120px] border border-gray-100">
                          <p className="text-gray-600">
                            {notes || 'Nenhuma observação adicionada ainda. Clique em "Editar" para adicionar suas anotações.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'recordings' && (
              <div className="space-y-6">
                <div className="bg-gray-50/50 rounded-2xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                      <Video className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-4">Gravação da Reunião</h3>
                      
                      {videoUrl ? (
                        <div className="space-y-4">
                          <div className="bg-white rounded-xl p-4 border border-gray-100">
                            <p className="text-sm text-gray-500 mb-2">Gravação disponível:</p>
                            <a
                              href={videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#3600FF] hover:text-[#3600FF]/80 font-medium break-all"
                            >
                              {videoUrl}
                            </a>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setVideoUrl('')}
                            className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                          >
                            Remover Gravação
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                            <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">Nenhuma gravação adicionada</p>
                            <div className="space-y-3">
                              <Button
                                onClick={handleVideoUpload}
                                className="w-full bg-[#3600FF] hover:bg-[#3600FF]/90 text-white rounded-xl"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Adicionar do Google Drive
                              </Button>
                              
                              <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                  <div className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                  <span className="px-2 bg-gray-50/50 text-gray-500">ou</span>
                                </div>
                              </div>
                              
                              <Input
                                placeholder="Cole o link da gravação aqui..."
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                className="rounded-xl border-gray-200 focus:border-[#3600FF] focus:ring-[#3600FF]"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-6">
                <div className="bg-gray-50/50 rounded-2xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-6">Alterar Status do Evento</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => handleStatusChange('completed')}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                        eventStatus === 'completed'
                          ? 'border-green-200 bg-green-50 shadow-sm'
                          : 'border-gray-200 hover:border-green-200 hover:bg-green-50/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          eventStatus === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <CheckCircle className={`h-5 w-5 ${
                            eventStatus === 'completed' ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Marcar como Concluído</p>
                          <p className="text-sm text-gray-500">O evento foi realizado com sucesso</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleStatusChange('postponed')}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                        eventStatus === 'postponed'
                          ? 'border-orange-200 bg-orange-50 shadow-sm'
                          : 'border-gray-200 hover:border-orange-200 hover:bg-orange-50/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          eventStatus === 'postponed' ? 'bg-orange-100' : 'bg-gray-100'
                        }`}>
                          <Clock className={`h-5 w-5 ${
                            eventStatus === 'postponed' ? 'text-orange-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Marcar como Adiado</p>
                          <p className="text-sm text-gray-500">O evento foi reagendado para outra data</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleStatusChange('cancelled')}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                        eventStatus === 'cancelled'
                          ? 'border-red-200 bg-red-50 shadow-sm'
                          : 'border-gray-200 hover:border-red-200 hover:bg-red-50/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          eventStatus === 'cancelled' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <XCircle className={`h-5 w-5 ${
                            eventStatus === 'cancelled' ? 'text-red-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Marcar como Cancelado</p>
                          <p className="text-sm text-gray-500">O evento foi cancelado definitivamente</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleStatusChange('scheduled')}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                        eventStatus === 'scheduled'
                          ? 'border-blue-200 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          eventStatus === 'scheduled' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Calendar className={`h-5 w-5 ${
                            eventStatus === 'scheduled' ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Marcar como Agendado</p>
                          <p className="text-sm text-gray-500">Retornar ao status original</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsModal;
