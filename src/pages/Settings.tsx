import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileLayout from '@/components/Mobile/MobileLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Upload, 
  Video, 
  Calendar, 
  Link,
  Check,
  X,
  Image,
  Palette,
  Plug
} from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [brandLogo, setBrandLogo] = useState<string>('');
  const [integrations, setIntegrations] = useState({
    google_meet: false,
    zoom: false,
    calendly: false
  });

  if (!user) {
    return null;
  }

  const handleThemeChange = (enabled: boolean) => {
    setIsDarkMode(enabled);
    // Aqui você pode implementar a lógica para alternar entre modo claro/escuro
    document.documentElement.classList.toggle('dark', enabled);
    
    toast({
      title: "Tema atualizado",
      description: `Modo ${enabled ? 'escuro' : 'claro'} ativado com sucesso`
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBrandLogo(e.target?.result as string);
        toast({
          title: "Logo carregado",
          description: "Sua marca foi atualizada com sucesso"
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIntegrationToggle = (integration: string) => {
    setIntegrations(prev => ({
      ...prev,
      [integration]: !prev[integration as keyof typeof prev]
    }));
    
    toast({
      title: "Integração atualizada",
      description: `${integration.replace('_', ' ')} foi ${!integrations[integration as keyof typeof integrations] ? 'conectado' : 'desconectado'}`
    });
  };

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-2">Gerencie suas preferências e integrações</p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Marca
          </TabsTrigger>
        </TabsList>

        {/* Integrações */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Conexões de Contas
              </CardTitle>
              <CardDescription>
                Conecte suas contas para sincronizar reuniões e agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Google Meet */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Video className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Google Meet</h3>
                    <p className="text-sm text-gray-600">Crie reuniões automaticamente</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={integrations.google_meet ? "default" : "secondary"}>
                    {integrations.google_meet ? "Conectado" : "Desconectado"}
                  </Badge>
                  <Button 
                    variant={integrations.google_meet ? "outline" : "default"}
                    onClick={() => handleIntegrationToggle('google_meet')}
                  >
                    {integrations.google_meet ? "Desconectar" : "Conectar"}
                  </Button>
                </div>
              </div>

              {/* Zoom */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Video className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Zoom</h3>
                    <p className="text-sm text-gray-600">Integração com Zoom Meetings</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={integrations.zoom ? "default" : "secondary"}>
                    {integrations.zoom ? "Conectado" : "Desconectado"}
                  </Badge>
                  <Button 
                    variant={integrations.zoom ? "outline" : "default"}
                    onClick={() => handleIntegrationToggle('zoom')}
                  >
                    {integrations.zoom ? "Desconectar" : "Conectar"}
                  </Button>
                </div>
              </div>

              {/* Calendly */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Calendly</h3>
                    <p className="text-sm text-gray-600">Sincronize agendamentos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={integrations.calendly ? "default" : "secondary"}>
                    {integrations.calendly ? "Conectado" : "Desconectado"}
                  </Badge>
                  <Button 
                    variant={integrations.calendly ? "outline" : "default"}
                    onClick={() => handleIntegrationToggle('calendly')}
                  >
                    {integrations.calendly ? "Desconectar" : "Conectar"}
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Aparência */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Preferências de Aparência
              </CardTitle>
              <CardDescription>
                Personalize como o sistema aparece para você
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-medium">Tema do Sistema</h3>
                    <p className="text-sm text-gray-600">
                      Escolha entre modo claro ou escuro
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Claro</span>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={handleThemeChange}
                  />
                  <span className="text-sm text-gray-600">Escuro</span>
                </div>
              </div>

              {/* Preview do tema */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-2">Prévia do Tema</h4>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} border`}>
                  <p className="text-sm">
                    Este é um exemplo de como o sistema aparecerá com o tema {isDarkMode ? 'escuro' : 'claro'} selecionado.
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Marca */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Configurações de Marca
              </CardTitle>
              <CardDescription>
                Personalize sua marca e como ela aparece no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="logo-upload">Logo da Empresa</Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Faça upload do logo da sua empresa. Ele aparecerá nos links públicos de agendamento.
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      {brandLogo ? (
                        <img 
                          src={brandLogo} 
                          alt="Logo da empresa" 
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <Image className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="mb-2"
                      />
                      <p className="text-xs text-gray-500">
                        Formatos aceitos: JPG, PNG, SVG (máx. 2MB)
                      </p>
                    </div>
                  </div>
                </div>

                {brandLogo && (
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h4 className="font-medium text-green-800 mb-2">
                      Logo carregado com sucesso!
                    </h4>
                    <p className="text-sm text-green-700">
                      Seu logo agora aparecerá nos links públicos de agendamento e outros materiais.
                    </p>
                  </div>
                )}

                <div className="p-4 border rounded-lg bg-blue-50">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Onde sua marca aparece:
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Links públicos de agendamento</li>
                    <li>• Emails de confirmação</li>
                    <li>• Relatórios exportados</li>
                    <li>• Página de login personalizada</li>
                  </ul>
                </div>

              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout 
        title="Configurações" 
        activeItem="settings" 
        onItemClick={() => {}}
      >
        {content}
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {content}
      </div>
    </div>
  );
};

export default Settings;