
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Globe, Plus, CheckCircle, XCircle } from 'lucide-react';
import SchedulesTab from './MyMeetings/SchedulesTab';
import HolidaysTab from './MyMeetings/HolidaysTab';
import BookingLinksTab from './MyMeetings/BookingLinksTab';
import { useMyMeetings } from '@/hooks/useMyMeetings';

const MyMeetings = () => {
  const [activeTab, setActiveTab] = useState('schedules');
  const { schedules, holidays, bookingLinks, loading } = useMyMeetings();

  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-gray-600">Carregando My Meetings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Minimalista */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">My Meetings</h1>
          <p className="text-gray-500">Configure seus horários e links de agendamento</p>
        </div>

        {/* Cards de Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm bg-white/50 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">{schedules.length} Horários</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white/50 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-gray-700">{holidays.length} Feriados</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white/50 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Globe className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700">{bookingLinks.length} Links</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo Principal */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur rounded-3xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b bg-gray-50/50">
              <TabsList className="w-full grid grid-cols-3 bg-transparent h-14 rounded-none">
                <TabsTrigger 
                  value="schedules" 
                  className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl mx-2 my-2"
                >
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Horários Disponíveis</span>
                  <span className="sm:hidden">Horários</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="holidays" 
                  className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl mx-2 my-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Feriados & Bloqueios</span>
                  <span className="sm:hidden">Feriados</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="booking-links" 
                  className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl mx-2 my-2"
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Links Públicos</span>
                  <span className="sm:hidden">Links</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="schedules" className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Horários de Disponibilidade</h3>
                  <p className="text-sm text-gray-500">Configure quando você está disponível para reuniões</p>
                </div>
                <Button size="sm" className="bg-[#3600FF] hover:bg-[#3600FF]/90 rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Horário
                </Button>
              </div>
              <SchedulesTab schedules={schedules} />
            </TabsContent>

            <TabsContent value="holidays" className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Feriados e Bloqueios</h3>
                  <p className="text-sm text-gray-500">Defina datas em que você não estará disponível</p>
                </div>
                <Button size="sm" className="bg-red-500 hover:bg-red-600 rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Feriado
                </Button>
              </div>
              <HolidaysTab holidays={holidays} />
            </TabsContent>

            <TabsContent value="booking-links" className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Links de Agendamento Público</h3>
                  <p className="text-sm text-gray-500">Crie links para que clientes agendem reuniões diretamente</p>
                </div>
                <Button size="sm" className="bg-green-500 hover:bg-green-600 rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Link
                </Button>
              </div>
              <BookingLinksTab bookingLinks={bookingLinks} />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Status Footer */}
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Sistema ativo</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Sincronizado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyMeetings;
