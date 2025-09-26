import React, { useState } from 'react';
import { Plus, Video, Users, Settings, ExternalLink, Copy, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMeetingRooms } from '@/hooks/useMeetingRooms';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ellosuitLogo from '@/assets/ellosuit-logo.png';
import MeetingRecordings from './MeetingRecordings';

const MeetingRooms = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showRecordingsDialog, setShowRecordingsDialog] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newRoom, setNewRoom] = useState({
    title: '',
    recording_enabled: false,
    chat_enabled: true,
    screen_sharing_enabled: true,
  });

  const { rooms, loading, createRoom, joinRoom, deleteRoom } = useMeetingRooms();
  const { toast } = useToast();

  const handleCreateRoom = async () => {
    if (!newRoom.title.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um título para a reunião",
        variant: "destructive",
      });
      return;
    }

    const room = await createRoom(newRoom);
    if (room) {
      setShowCreateDialog(false);
      setNewRoom({
        title: '',
        recording_enabled: false,
        chat_enabled: true,
        screen_sharing_enabled: true,
      });
      
      // Redirecionar para a sala criada com LiveKit
      window.open(`/livekit/${room.room_code}`, '_blank');
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !displayName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    // Não inserir participante aqui - deixar para MeetingRoom fazer via WebSocket
    setShowJoinDialog(false);
    const code = roomCode.toUpperCase();
    const name = displayName;
    setRoomCode('');
    setDisplayName('');
    
    // Redirecionar para a sala LiveKit passando o nome como parâmetro
    window.open(`/livekit/${code}?name=${encodeURIComponent(name)}`, '_blank');
  };

  const copyRoomLink = (roomCode: string) => {
    const link = `${window.location.origin}/livekit/${roomCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link da reunião foi copiado para a área de transferência",
    });
  };

  const joinExistingRoom = (roomCode: string) => {
    window.open(`/livekit/${roomCode}`, '_blank');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-white min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <img src={ellosuitLogo} alt="Ellosuit" className="h-10" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reuniões</h1>
            <p className="text-gray-600">
              Crie e gerencie suas reuniões online em tempo real
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={showRecordingsDialog} onOpenChange={setShowRecordingsDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
              >
                <Play className="h-4 w-4" />
                Ver Gravações
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] p-0">
              <MeetingRecordings />
            </DialogContent>
          </Dialog>
          
          <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
                <ExternalLink className="h-4 w-4" />
                Entrar em Reunião
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Entrar em uma Reunião</DialogTitle>
                <DialogDescription>
                  Digite o código da reunião para participar
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="roomCode">Código da Reunião</Label>
                  <Input
                    id="roomCode"
                    placeholder="Ex: ABC123XYZ"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Seu Nome</Label>
                  <Input
                    id="displayName"
                    placeholder="Como você quer aparecer"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleJoinRoom} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Entrar na Reunião
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Reunião
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Nova Reunião</DialogTitle>
                <DialogDescription>
                  Configure sua reunião online
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título da Reunião *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Reunião de Planejamento"
                    value={newRoom.title}
                    onChange={(e) => setNewRoom({...newRoom, title: e.target.value})}
                  />
                </div>
                
                <Separator />
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="chat">Chat habilitado</Label>
                    <Switch
                      id="chat"
                      checked={newRoom.chat_enabled}
                      onCheckedChange={(checked) => setNewRoom({...newRoom, chat_enabled: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="screen">Compartilhamento de tela</Label>
                    <Switch
                      id="screen"
                      checked={newRoom.screen_sharing_enabled}
                      onCheckedChange={(checked) => setNewRoom({...newRoom, screen_sharing_enabled: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recording">Gravação habilitada</Label>
                    <Switch
                      id="recording"
                      checked={newRoom.recording_enabled}
                      onCheckedChange={(checked) => setNewRoom({...newRoom, recording_enabled: checked})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateRoom} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Criar Reunião
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card className="text-center py-12 shadow-lg bg-white border-0">
          <CardContent>
            <Video className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <CardTitle className="mb-2 text-gray-900">Nenhuma reunião ativa</CardTitle>
            <CardDescription className="mb-4 text-gray-600">
              Crie sua primeira reunião ou entre em uma existente usando o código
            </CardDescription>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nova Reunião
              </Button>
              <Button variant="outline" onClick={() => setShowJoinDialog(true)} className="border-blue-300 text-blue-700 hover:bg-blue-50">
                <ExternalLink className="h-4 w-4 mr-2" />
                Entrar em Reunião
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card key={room.id} className="hover:shadow-xl transition-all duration-300 bg-white border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-gray-900">{room.title}</CardTitle>
                    <CardDescription className="text-gray-600">
                      Código: <span className="font-mono font-semibold text-blue-600">{room.room_code}</span>
                    </CardDescription>
                  </div>
                  <Badge className={room.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                    {room.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Settings className="h-4 w-4 text-blue-600" />
                    {[
                      room.chat_enabled && 'Chat',
                      room.screen_sharing_enabled && 'Tela',
                      room.recording_enabled && 'Gravação'
                    ].filter(Boolean).join(', ')}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  Criada em {format(new Date(room.created_at), 'dd/MM/yyyy às HH:mm', { locale: ptBR })}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => joinExistingRoom(room.room_code)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Entrar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyRoomLink(room.room_code)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Deseja excluir esta reunião?')) {
                        deleteRoom(room.id);
                      }
                    }}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeetingRooms;