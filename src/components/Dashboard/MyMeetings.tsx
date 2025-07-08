
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Globe, Settings } from 'lucide-react';
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
    <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Meetings</h1>
            <p className="text-gray-500 mt-1">Configure seus horários e links de agendamento público</p>
          </div>
        </div>

        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#3600FF] to-[#4F46E5] text-white">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-6 w-6" />
              <span>Configurações de Agendamento</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 rounded-none border-b bg-gray-50">
                <TabsTrigger 
                  value="schedules" 
                  className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Clock className="h-4 w-4" />
                  <span>Horários</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="holidays" 
                  className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Feriados</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="booking-links" 
                  className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Globe className="h-4 w-4" />
                  <span>Links Públicos</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="schedules" className="p-6">
                <SchedulesTab schedules={schedules} />
              </TabsContent>

              <TabsContent value="holidays" className="p-6">
                <HolidaysTab holidays={holidays} />
              </TabsContent>

              <TabsContent value="booking-links" className="p-6">
                <BookingLinksTab bookingLinks={bookingLinks} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyMeetings;
