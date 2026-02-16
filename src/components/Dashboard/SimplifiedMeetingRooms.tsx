import React, { useState } from 'react';
import { Video, Plus, Mic, FileText, Users, Bot, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMeetingRooms } from '@/hooks/useMeetingRooms';
import MeetingRecordings from './MeetingRecordings';
import InPersonMeeting from './InPersonMeeting';
import SavedMeetings from './SavedMeetings';
import MeetingsChatAI from './MeetingsChatAI';
import { APP_CONFIG } from '@/config/app';

const FLOW_COLOR = "#007DE3";

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
      toast({ title: "Campo obrigatório", description: "Digite um título para a reunião", variant: "destructive" });
      return;
    }

    const room = await createRoom({
      title: newRoomTitle,
      recording_enabled: false,
      chat_enabled: true,
      screen_sharing_enabled: true,
    });
    
    if (room) {
      setShowCreateDialog(false);
      setNewRoomTitle('');
      window.location.href = APP_CONFIG.getMeetingUrl(room.room_code);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !displayName.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos para entrar", variant: "destructive" });
      return;
    }

    setShowJoinDialog(false);
    const meetingUrl = `${APP_CONFIG.getMeetingUrl(roomCode.toUpperCase())}?name=${encodeURIComponent(displayName)}`;
    window.open(meetingUrl, '_blank');
    setRoomCode('');
    setDisplayName('');
  };

  const quickActions = [
    {
      icon: Video,
      title: 'Nova Reunião',
      description: 'Criar videoconferência',
      action: () => setShowCreateDialog(true)
    },
    {
      icon: Users,
      title: 'Entrar',
      description: 'Usar código para participar',
      action: () => setShowJoinDialog(true)
    },
    {
      icon: Mic,
      title: 'Presencial',
      description: 'Gravar e transcrever',
      action: () => setShowInPersonDialog(true)
    },
  ];

  const manageActions = [
    { icon: Video, title: 'Gravações', action: () => setShowRecordingsDialog(true) },
    { icon: FileText, title: 'Reuniões Salvas', action: () => setShowSavedMeetingsDialog(true) },
    { icon: Bot, title: 'IA - Assistente', action: () => setShowAIChatDialog(true) },
  ];

  return (
    <div className="h-full bg-background px-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="pt-2 md:pt-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Videoconferência</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gerencie suas reuniões</p>
        </div>

        {/* Quick Actions - mobile: horizontal scroll cards */}
        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
          {quickActions.map((action, index) => (
            <button 
              key={index}
              className="group text-left bg-card rounded-2xl md:rounded-3xl border border-border p-3 md:p-6 hover:shadow-lg hover:border-primary/20 transition-all active:scale-[0.98]"
              onClick={action.action}
            >
              <div 
                className="rounded-xl md:rounded-2xl p-2 md:p-3 w-fit mb-2 md:mb-4 transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${FLOW_COLOR}12` }}
              >
                <action.icon className="h-5 w-5 md:h-7 md:w-7" style={{ color: FLOW_COLOR }} />
              </div>
              <h3 className="text-sm md:text-lg font-bold text-foreground mb-0.5 md:mb-1">{action.title}</h3>
              <p className="text-[10px] md:text-sm text-muted-foreground leading-tight">{action.description}</p>
            </button>
          ))}
        </div>

        {/* Manage Section */}
        <div>
          <h2 className="text-sm md:text-lg font-semibold text-foreground mb-3">Gerenciar</h2>
          <div className="space-y-2 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
            {manageActions.map((action, index) => (
              <button 
                key={index}
                className="w-full flex items-center gap-3 bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-4 hover:shadow-md hover:border-primary/20 transition-all text-left active:scale-[0.98]"
                onClick={action.action}
              >
                <div 
                  className="rounded-lg md:rounded-xl p-2 md:p-2.5"
                  style={{ backgroundColor: `${FLOW_COLOR}10` }}
                >
                  <action.icon className="h-4 w-4 md:h-5 md:w-5" style={{ color: FLOW_COLOR }} />
                </div>
                <span className="flex-1 text-sm font-semibold text-foreground">{action.title}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 md:hidden" />
              </button>
            ))}
          </div>
        </div>

        {/* Dialogs */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Nova Reunião Online</DialogTitle>
              <DialogDescription>Digite um título e comece sua videoconferência</DialogDescription>
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
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1 rounded-xl">Cancelar</Button>
              <Button onClick={handleCreateRoom} className="flex-1 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>Criar e Entrar</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Entrar em Reunião</DialogTitle>
              <DialogDescription>Use o código fornecido pelo organizador</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código da Reunião</Label>
                <Input id="code" placeholder="ABC123XYZ" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} className="uppercase rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Seu Nome</Label>
                <Input id="name" placeholder="Como deseja aparecer" value={displayName} onChange={(e) => setDisplayName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()} className="rounded-xl" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowJoinDialog(false)} className="flex-1 rounded-xl">Cancelar</Button>
              <Button onClick={handleJoinRoom} className="flex-1 rounded-xl" style={{ backgroundColor: FLOW_COLOR }}>Entrar</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRecordingsDialog} onOpenChange={setShowRecordingsDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0 bg-background rounded-2xl">
            <MeetingRecordings />
          </DialogContent>
        </Dialog>

        <Dialog open={showInPersonDialog} onOpenChange={setShowInPersonDialog}>
          <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto bg-background rounded-2xl p-4 md:p-6">
            <InPersonMeeting />
          </DialogContent>
        </Dialog>

        <Dialog open={showSavedMeetingsDialog} onOpenChange={setShowSavedMeetingsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-background rounded-2xl">
            <SavedMeetings />
          </DialogContent>
        </Dialog>

        <Dialog open={showAIChatDialog} onOpenChange={setShowAIChatDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 rounded-2xl">
            <MeetingsChatAI />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SimplifiedMeetingRooms;
