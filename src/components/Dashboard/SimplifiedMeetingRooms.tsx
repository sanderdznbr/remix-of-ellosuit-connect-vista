import React, { useState } from 'react';
import { Video, Plus, Play, Mic, FileText, Users, Clock, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMeetingRooms } from '@/hooks/useMeetingRooms';
import MeetingRecordings from './MeetingRecordings';
import InPersonMeeting from './InPersonMeeting';
import SavedMeetings from './SavedMeetings';
import MeetingsChatAI from './MeetingsChatAI';

const SimplifiedMeetingRooms = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showRecordingsDialog, setShowRecordingsDialog] = useState(false);
  const [showInPersonDialog, setShowInPersonDialog] = useState(false);
  const [showSavedMeetingsDialog, setShowSavedMeetingsDialog] = useState(false);
  const [showAIChatDialog, setShowAIChatDialog] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');

  const { createRoom } = useMeetingRooms();
  const { toast } = useToast();

  const handleCreateRoom = async () => {
    if (!newRoomTitle.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite um título para a reunião",
        variant: "destructive",
      });
      return;
    }

    console.log('🚀 Tentando criar sala:', newRoomTitle);
    
    const room = await createRoom({
      title: newRoomTitle,
      recording_enabled: false,
      chat_enabled: true,
      screen_sharing_enabled: true,
    });
    
    console.log('📦 Resultado da criação:', room);
    
    if (room) {
      setShowCreateDialog(false);
      setNewRoomTitle('');
      
      // Redirecionar para a página da reunião (mesma janela)
      window.location.href = `/meet/${room.room_code}`;
    } else {
      // Se createRoom retornou null, o erro já foi exibido pelo hook
      console.error('❌ Falha ao criar sala - verifique autenticação');
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !displayName.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para entrar",
        variant: "destructive",
      });
      return;
    }

    setShowJoinDialog(false);
    window.open(`/meet/${roomCode.toUpperCase()}?name=${encodeURIComponent(displayName)}`, '_blank');
    setRoomCode('');
    setDisplayName('');
  };

  const quickActions = [
    {
      icon: Video,
      title: 'Nova Reunião Online',
      description: 'Criar sala de videoconferência',
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => setShowCreateDialog(true)
    },
    {
      icon: Users,
      title: 'Entrar em Reunião',
      description: 'Use um código para participar',
      color: 'bg-green-500 hover:bg-green-600',
      action: () => setShowJoinDialog(true)
    },
    {
      icon: Mic,
      title: 'Reunião Presencial',
      description: 'Gravar e transcrever ao vivo',
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => setShowInPersonDialog(true)
    },
  ];

  const manageActions = [
    {
      icon: Play,
      title: 'Gravações',
      count: null,
      color: 'text-blue-600 bg-blue-50',
      action: () => setShowRecordingsDialog(true)
    },
    {
      icon: FileText,
      title: 'Reuniões Salvas',
      count: null,
      color: 'text-purple-600 bg-purple-50',
      action: () => setShowSavedMeetingsDialog(true)
    },
    {
      icon: Bot,
      title: 'IA - Assistente',
      count: null,
      color: 'text-emerald-600 bg-emerald-50',
      action: () => setShowAIChatDialog(true)
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Reuniões</h1>
          <p className="text-gray-600">Gerencie suas reuniões de forma simples e rápida</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="group cursor-pointer hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden"
              onClick={action.action}
            >
              <CardContent className="p-6">
                <div className={`${action.color} rounded-2xl p-4 w-fit mb-4 transition-transform group-hover:scale-110`}>
                  <action.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-gray-600 text-sm">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Manage Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Gerenciar
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {manageActions.map((action, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0"
                onClick={action.action}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`${action.color} rounded-xl p-3`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{action.title}</h3>
                    {action.count !== null && (
                      <p className="text-sm text-gray-600">{action.count} disponíveis</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Dialogs */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Reunião Online</DialogTitle>
              <DialogDescription>
                Digite um título e começe sua videoconferência
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Reunião</Label>
                <Input
                  id="title"
                  placeholder="Ex: Reunião de Planejamento"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCreateRoom} className="flex-1">
                Criar e Entrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Entrar em Reunião</DialogTitle>
              <DialogDescription>
                Use o código fornecido pelo organizador
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código da Reunião</Label>
                <Input
                  id="code"
                  placeholder="ABC123XYZ"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Seu Nome</Label>
                <Input
                  id="name"
                  placeholder="Como deseja aparecer"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowJoinDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleJoinRoom} className="flex-1">
                Entrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRecordingsDialog} onOpenChange={setShowRecordingsDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0">
            <MeetingRecordings />
          </DialogContent>
        </Dialog>

        <Dialog open={showInPersonDialog} onOpenChange={setShowInPersonDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <InPersonMeeting />
          </DialogContent>
        </Dialog>

        <Dialog open={showSavedMeetingsDialog} onOpenChange={setShowSavedMeetingsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <SavedMeetings />
          </DialogContent>
        </Dialog>

        <Dialog open={showAIChatDialog} onOpenChange={setShowAIChatDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <MeetingsChatAI />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SimplifiedMeetingRooms;
