
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Globe, Plus, Copy, ExternalLink, Trash2, Settings } from 'lucide-react';
import { useMyMeetings } from '@/hooks/useMyMeetings';
import { useToast } from '@/hooks/use-toast';

interface BookingLinksTabProps {
  bookingLinks: any[];
}

const BookingLinksTab: React.FC<BookingLinksTabProps> = ({ bookingLinks }) => {
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState({
    title: '',
    description: '',
    link_slug: '',
    duration_minutes: 30,
    buffer_minutes: 15,
    is_active: true,
    expires_at: '',
    never_expires: false
  });
  
  const { createBookingLink, updateBookingLink, deleteBookingLink } = useMyMeetings();
  const { toast } = useToast();

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setNewLink({
      ...newLink,
      title,
      link_slug: generateSlug(title)
    });
  };

  const handleCreateLink = async () => {
    if (!newLink.title || !newLink.link_slug) {
      toast({
        title: "Erro",
        description: "Título e slug são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const linkData = {
      ...newLink,
      expires_at: newLink.never_expires ? null : (newLink.expires_at || null)
    };
    delete linkData.never_expires;

    await createBookingLink(linkData);
    setIsAddingLink(false);
    setNewLink({
      title: '',
      description: '',
      link_slug: '',
      duration_minutes: 30,
      buffer_minutes: 15,
      is_active: true,
      expires_at: '',
      never_expires: false
    });
  };

  const handleToggleActive = async (linkId: string, currentStatus: boolean) => {
    try {
      await updateBookingLink(linkId, { is_active: !currentStatus });
      toast({
        title: "Sucesso",
        description: `Link ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar status do link",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLink = async (linkId: string, linkTitle: string) => {
    if (confirm(`Tem certeza que deseja excluir o link "${linkTitle}"?`)) {
      try {
        await deleteBookingLink(linkId);
        toast({
          title: "Sucesso",
          description: "Link excluído com sucesso!"
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir link",
          variant: "destructive"
        });
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Link copiado para a área de transferência"
    });
  };

  const getPublicUrl = (slug: string) => {
    return `https://ellosuit.online/book/${slug}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900">🔗 Links Públicos de Agendamento</h3>
          <p className="text-gray-500 mt-2 text-lg">Crie links que clientes podem usar para agendar reuniões</p>
        </div>
        <Button 
          onClick={() => setIsAddingLink(true)}
          className="bg-[#3600FF] hover:bg-[#3600FF]/90 text-white flex items-center space-x-2 rounded-2xl px-6 py-3"
        >
          <Plus className="h-5 w-5" />
          <span>Criar Link</span>
        </Button>
      </div>

      {isAddingLink && (
        <Card className="border-[#3600FF] border-2 shadow-xl rounded-3xl">
          <CardHeader>
            <CardTitle className="text-xl">✨ Novo Link de Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="title">Título da Reunião</Label>
                <Input
                  id="title"
                  value={newLink.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="ex: Consultoria de 30 minutos"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="slug">URL Personalizada</Label>
                <Input
                  id="slug"
                  value={newLink.link_slug}
                  onChange={(e) => setNewLink({...newLink, link_slug: e.target.value})}
                  placeholder="consultoria-30min"
                  className="mt-2 rounded-xl"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newLink.description}
                onChange={(e) => setNewLink({...newLink, description: e.target.value})}
                placeholder="Descreva o tipo de reunião..."
                rows={3}
                className="mt-2 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={newLink.duration_minutes}
                  onChange={(e) => setNewLink({...newLink, duration_minutes: parseInt(e.target.value)})}
                  min="15"
                  max="480"
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="buffer">Buffer entre reuniões (minutos)</Label>
                <Input
                  id="buffer"
                  type="number"
                  value={newLink.buffer_minutes}
                  onChange={(e) => setNewLink({...newLink, buffer_minutes: parseInt(e.target.value)})}
                  min="0"
                  max="60"
                  className="mt-2 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="expiration">Expiração do Link</Label>
                <div className="space-y-4 mt-3">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={newLink.never_expires}
                      onCheckedChange={(checked) => setNewLink({...newLink, never_expires: checked, expires_at: ''})}
                    />
                    <Label>Link nunca expira</Label>
                  </div>
                  {!newLink.never_expires && (
                    <div>
                      <Label htmlFor="expires_at">Data de Expiração</Label>
                      <Input
                        id="expires_at"
                        type="datetime-local"
                        value={newLink.expires_at}
                        onChange={(e) => setNewLink({...newLink, expires_at: e.target.value})}
                        min={new Date().toISOString().slice(0, 16)}
                        className="mt-2 rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={newLink.is_active}
                    onCheckedChange={(checked) => setNewLink({...newLink, is_active: checked})}
                  />
                  <Label>Link ativo</Label>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setIsAddingLink(false)} className="rounded-xl">
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateLink} className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-xl">
                    Criar Link
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {bookingLinks.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 rounded-3xl">
            <Globe className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-medium text-gray-900 mb-3">Nenhum link criado</h3>
            <p className="text-gray-500 mb-8 text-lg">Crie links públicos para que clientes possam agendar reuniões</p>
            <Button 
              onClick={() => setIsAddingLink(true)}
              className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-2xl px-8 py-3"
            >
              Criar Primeiro Link
            </Button>
          </Card>
        ) : (
          bookingLinks.map((link) => (
            <Card key={link.id} className="hover:shadow-2xl transition-all duration-300 border-none shadow-xl rounded-3xl">
              <CardContent className="p-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-6 flex-1">
                    <div className="w-16 h-16 bg-[#3600FF]/10 rounded-2xl flex items-center justify-center">
                      <Globe className="h-8 w-8 text-[#3600FF]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 text-xl">{link.title}</h4>
                        <div className={`w-3 h-3 rounded-full ${link.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </div>
                      {link.description && (
                        <p className="text-gray-600 mb-4">{link.description}</p>
                      )}
                      <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {link.duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Buffer: {link.buffer_minutes} min
                        </span>
                        {link.expires_at ? (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            Expira: {new Date(link.expires_at).toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Nunca expira
                          </span>
                        )}
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <code className="text-sm text-gray-700 font-mono">
                            {getPublicUrl(link.link_slug)}
                          </code>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(getPublicUrl(link.link_slug))}
                              className="rounded-xl"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(getPublicUrl(link.link_slug), '_blank')}
                              className="rounded-xl"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={link.is_active} 
                        onCheckedChange={() => handleToggleActive(link.id, link.is_active)}
                      />
                      <span className="text-sm text-gray-600">
                        {link.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLink(link.id, link.title)}
                      className="text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default BookingLinksTab;
