import React, { useState } from 'react';
import { Plus, Phone, Check, ChevronDown, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppSession {
  id: string;
  instance_name: string;
  status: string;
  phone_number?: string;
  phone_name?: string;
  profile_picture?: string;
}

interface ChannelSelectorProps {
  sessions: WhatsAppSession[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onAddNew: () => void;
  onReconnect?: () => void;
  onSessionDeleted?: () => void;
}

export function ChannelSelector({ 
  sessions, 
  selectedSessionId, 
  onSelectSession, 
  onAddNew,
  onReconnect,
  onSessionDeleted
}: ChannelSelectorProps) {
  const { toast } = useToast();
  const [deleteSession, setDeleteSession] = useState<WhatsAppSession | null>(null);
  const [deleting, setDeleting] = useState(false);

  const connectedSessions = sessions.filter(s => s.status === 'connected');
  const selectedSession = sessions.find(s => s.id === selectedSessionId) || connectedSessions[0];
  
  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const handleDeleteSession = async () => {
    if (!deleteSession) return;
    
    setDeleting(true);
    try {
      // Delete all conversations for this session
      await supabase
        .from('whatsapp_conversations')
        .delete()
        .eq('session_id', deleteSession.id);
      
      // Delete the session
      const { error } = await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('id', deleteSession.id);
      
      if (error) throw error;
      
      toast({
        title: 'Canal excluído',
        description: `O canal ${deleteSession.phone_name || deleteSession.instance_name} foi removido.`
      });
      
      onSessionDeleted?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
      setDeleteSession(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        {/* Channel Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex-1 justify-start gap-2 h-12 px-2 hover:bg-muted"
            >
              {selectedSession ? (
                <>
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedSession.profile_picture} />
                      <AvatarFallback className="bg-[#25D366] text-white text-xs">
                        <Phone className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                      selectedSession.status === 'connected' ? "bg-green-500" : "bg-red-500"
                    )} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">
                      {selectedSession.phone_name || selectedSession.instance_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatPhoneNumber(selectedSession.phone_number) || 'Canal ativo'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </>
              ) : (
                <>
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">Selecionar canal</p>
                    <p className="text-xs text-muted-foreground">Nenhum conectado</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="start" className="w-72">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum canal configurado
              </div>
            ) : (
              sessions.map(session => (
                <DropdownMenuItem 
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className="flex items-center gap-3 p-2 cursor-pointer"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.profile_picture} />
                      <AvatarFallback className="bg-[#25D366] text-white text-xs">
                        <Phone className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                      session.status === 'connected' ? "bg-green-500" : "bg-red-500"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.phone_name || session.instance_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatPhoneNumber(session.phone_number) || (session.status === 'connected' ? 'Conectado' : 'Desconectado')}
                    </p>
                  </div>
                  {selectedSession?.id === session.id && (
                    <Check className="h-4 w-4 text-[#25D366] shrink-0" />
                  )}
                  {/* Reconnect button for disconnected sessions */}
                  {session.status !== 'connected' && onReconnect && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-[#FF4500] hover:bg-[#FF4500]/10"
                      title="Reconectar sessão"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSession(session.id);
                        onReconnect();
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Delete button for disconnected sessions */}
                  {session.status !== 'connected' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteSession(session);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={onAddNew}
              className="flex items-center gap-2 text-[#FF4500] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar novo canal</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Add Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0 h-10 w-10 hover:bg-[#FF4500]/10 hover:text-[#FF4500]"
                onClick={onAddNew}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Conectar novo WhatsApp</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSession} onOpenChange={(open) => !open && setDeleteSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir canal?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá remover o canal <strong>{deleteSession?.phone_name || deleteSession?.instance_name}</strong> e todas as suas conversas. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSession}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir canal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
