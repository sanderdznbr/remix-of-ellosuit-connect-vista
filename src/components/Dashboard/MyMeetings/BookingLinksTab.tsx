
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Globe, Plus, Copy, ExternalLink } from 'lucide-react';
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
  
  const { createBookingLink } = useMyMeetings();
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Links Públicos de Agendamento</h3>
          <p className="text-gray-500 mt-1">Crie links que clientes podem usar para agendar reuniões</p>
        </div>
        <Button 
          onClick={() => setIsAddingLink(true)}
          className="bg-[#3600FF] hover:bg-[#3600FF]/90 text-white flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Criar Link</span>
        </Button>
      </div>

      {isAddingLink && (
        <Card className="border-[#3600FF] border-2">
          <CardHeader>
            <CardTitle className="text-lg">Novo Link de Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título da Reunião</Label>
                <Input
                  id="title"
                  value={newLink.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="ex: Consultoria de 30 minutos"
                />
              </div>
              <div>
                <Label htmlFor="slug">URL Personalizada</Label>
                <Input
                  id="slug"
                  value={newLink.link_slug}
                  onChange={(e) => setNewLink({...newLink, link_slug: e.target.value})}
                  placeholder="consultoria-30min"
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
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={newLink.duration_minutes}
                  onChange={(e) => setNewLink({...newLink, duration_minutes: parseInt(e.target.value)})}
                  min="15"
                  max="480"
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
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="expiration">Expiração do Link</Label>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center space-x-2">
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
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newLink.is_active}
                    onCheckedChange={(checked) => setNewLink({...newLink, is_active: checked})}
                  />
                  <Label>Link ativo</Label>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setIsAddingLink(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateLink} className="bg-[#3600FF] hover:bg-[#3600FF]/90">
                    Criar Link
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {bookingLinks.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum link criado</h3>
            <p className="text-gray-500 mb-4">Crie links públicos para que clientes possam agendar reuniões</p>
            <Button 
              onClick={() => setIsAddingLink(true)}
              className="bg-[#3600FF] hover:bg-[#3600FF]/90"
            >
              Criar Primeiro Link
            </Button>
          </Card>
        ) : (
          bookingLinks.map((link) => (
            <Card key={link.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-[#3600FF]/10 rounded-lg flex items-center justify-center">
                      <Globe className="h-6 w-6 text-[#3600FF]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{link.title}</h4>
                      {link.description && (
                        <p className="text-gray-600 text-sm mb-3">{link.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{link.duration_minutes} min</span>
                        <span>•</span>
                        <span>Buffer: {link.buffer_minutes} min</span>
                        {link.expires_at && (
                          <>
                            <span>•</span>
                            <span>Expira: {new Date(link.expires_at).toLocaleDateString('pt-BR')}</span>
                          </>
                        )}
                        {!link.expires_at && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">Nunca expira</span>
                          </>
                        )}
                      </div>
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <code className="text-sm text-gray-700">
                            {getPublicUrl(link.link_slug)}
                          </code>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(getPublicUrl(link.link_slug))}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(getPublicUrl(link.link_slug), '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Switch checked={link.is_active} />
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
