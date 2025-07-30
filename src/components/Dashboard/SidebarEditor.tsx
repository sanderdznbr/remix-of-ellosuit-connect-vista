
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Upload, Palette, Settings, Image } from 'lucide-react';
import { useSidebarSettings } from '@/hooks/useSidebarSettings';
import ColorWheel from './ColorWheel';

const defaultMenuItems = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'calendar', label: 'Agenda', icon: '📅' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'clients', label: 'Clientes', icon: '👥' },
  { id: 'documents', label: 'Documentos', icon: '📁' },
  { id: 'analytics', label: 'Análises', icon: '📊' },
  { id: 'settings', label: 'Configurações', icon: '⚙️' }
];

interface SortableItemProps {
  id: string;
  label: string;
  icon: string;
}

function SortableItem({ id, label, icon }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm"
    >
      <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

const SidebarEditor = () => {
  const { settings, loading, updateSettings } = useSidebarSettings();
  const [menuItems, setMenuItems] = useState(defaultMenuItems);
  const [customLogoFile, setCustomLogoFile] = useState<File | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBackgroundColorPicker, setShowBackgroundColorPicker] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  React.useEffect(() => {
    if (settings.menu_order && settings.menu_order.length > 0) {
      const orderedItems = settings.menu_order
        .map(id => defaultMenuItems.find(item => item.id === id))
        .filter(Boolean) as typeof defaultMenuItems;
      
      const remainingItems = defaultMenuItems.filter(
        item => !settings.menu_order.includes(item.id)
      );
      
      setMenuItems([...orderedItems, ...remainingItems]);
    }
  }, [settings]);

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        updateSettings({
          menu_order: newItems.map(item => item.id)
        });

        return newItems;
      });
    }
  }

  const handleSidebarColorChange = (color: string) => {
    updateSettings({
      sidebar_color: color
    });
  };

  const handleBackgroundColorChange = (color: string) => {
    updateSettings({
      sidebar_background_color: color
    });
  };

  const handleLogoUpload = async () => {
    if (!customLogoFile) return;

    const logoUrl = URL.createObjectURL(customLogoFile);
    updateSettings({
      custom_logo_url: logoUrl
    });
  };

  const resetToDefaultLogo = () => {
    updateSettings({
      custom_logo_url: undefined
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Editar Sidebar</h1>
        <p className="text-base text-gray-600 mt-2">Personalize a aparência e ordem do menu lateral</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Menu Order */}
        <Card className="border-none shadow-lg rounded-2xl bg-white">
          <CardHeader className="p-6">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Ordem do Menu
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={menuItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {menuItems.map((item) => (
                    <SortableItem key={item.id} id={item.id} label={item.label} icon={item.icon} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        {/* Customization Options */}
        <div className="space-y-6">
          {/* Accent Color Picker */}
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Cor Principal da Sidebar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
                      style={{ backgroundColor: settings.sidebar_color }}
                    />
                    {showColorPicker && (
                      <ColorWheel
                        color={settings.sidebar_color}
                        onChange={handleSidebarColorChange}
                        onClose={() => setShowColorPicker(false)}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <Label>Cor Selecionada</Label>
                    <div className="text-sm text-gray-600 mt-1">{settings.sidebar_color}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Background Color Picker */}
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Cor de Fundo da Sidebar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <button
                      onClick={() => setShowBackgroundColorPicker(!showBackgroundColorPicker)}
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
                      style={{ backgroundColor: settings.sidebar_background_color || '#ffffff' }}
                    />
                    {showBackgroundColorPicker && (
                      <ColorWheel
                        color={settings.sidebar_background_color || '#ffffff'}
                        onChange={handleBackgroundColorChange}
                        onClose={() => setShowBackgroundColorPicker(false)}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <Label>Cor de Fundo Selecionada</Label>
                    <div className="text-sm text-gray-600 mt-1">{settings.sidebar_background_color || '#ffffff'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Logo Personalizada
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCustomLogoFile(e.target.files?.[0] || null)}
                />
                {settings.custom_logo_url ? (
                  <div className="p-4 border rounded-lg">
                    <img 
                      src={settings.custom_logo_url} 
                      alt="Custom Logo" 
                      className="h-12 object-contain mb-2"
                    />
                    <Button
                      onClick={resetToDefaultLogo}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Usar Logo Padrão
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600"
                      >
                        E
                      </div>
                      <span className="text-lg font-bold text-gray-900">ElloSuit</span>
                    </div>
                    <p className="text-sm text-gray-500">Logo padrão da ElloSuit</p>
                  </div>
                )}
                <Button 
                  onClick={handleLogoUpload} 
                  disabled={!customLogoFile}
                  className="w-full"
                >
                  Fazer Upload da Logo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SidebarEditor;
