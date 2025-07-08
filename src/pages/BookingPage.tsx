
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Clock, User, Mail, Phone } from 'lucide-react';
import { format, addDays, isSameDay, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BookingPage = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const [bookingLink, setBookingLink] = useState<any>(null);
  const [availableSchedules, setAvailableSchedules] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    notes: ''
  });

  useEffect(() => {
    if (slug) {
      fetchBookingLink();
    }
  }, [slug]);

  useEffect(() => {
    if (selectedDate && availableSchedules.length > 0) {
      generateTimeSlots();
    }
  }, [selectedDate, availableSchedules]);

  const fetchBookingLink = async () => {
    try {
      const { data, error } = await supabase
        .from('public_booking_links')
        .select('*')
        .eq('link_slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      setBookingLink(data);
      await fetchAvailableSchedules(data.user_id);
    } catch (error) {
      console.error('Error fetching booking link:', error);
      toast({
        title: "Erro",
        description: "Link de agendamento não encontrado ou inativo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSchedules = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('availability_schedules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      setAvailableSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const generateTimeSlots = () => {
    if (!selectedDate) return;

    const dayOfWeek = selectedDate.getDay();
    const scheduleForDay = availableSchedules.find(s => s.day_of_week === dayOfWeek);
    
    if (!scheduleForDay) {
      setAvailableTimeSlots([]);
      return;
    }

    const slots: string[] = [];
    const startTime = new Date(`2000-01-01T${scheduleForDay.start_time}`);
    const endTime = new Date(`2000-01-01T${scheduleForDay.end_time}`);
    const duration = bookingLink?.duration_minutes || 30;
    const buffer = bookingLink?.buffer_minutes || 0;
    
    let currentTime = new Date(startTime);
    
    while (currentTime < endTime) {
      const timeString = currentTime.toTimeString().slice(0, 5);
      slots.push(timeString);
      currentTime.setMinutes(currentTime.getMinutes() + duration + buffer);
    }

    setAvailableTimeSlots(slots);
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTimeSlot || !booking.client_name || !booking.client_email) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('public_bookings')
        .insert({
          booking_link_id: bookingLink.id,
          user_id: bookingLink.user_id,
          company_id: bookingLink.company_id,
          client_name: booking.client_name,
          client_email: booking.client_email,
          client_phone: booking.client_phone,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          booking_time: selectedTimeSlot,
          notes: booking.notes,
          status: 'confirmed'
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Agendamento realizado com sucesso. Você receberá uma confirmação por email.",
      });

      // Reset form
      setSelectedDate(undefined);
      setSelectedTimeSlot('');
      setBooking({
        client_name: '',
        client_email: '',
        client_phone: '',
        notes: ''
      });

    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Erro",
        description: "Erro ao realizar agendamento. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-lg text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!bookingLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Link não encontrado</h1>
          <p className="text-gray-600">O link de agendamento não foi encontrado ou está inativo.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{bookingLink.title}</h1>
            {bookingLink.description && (
              <p className="text-gray-600 mb-4">{bookingLink.description}</p>
            )}
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{bookingLink.duration_minutes} minutos</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calendar Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarDays className="h-5 w-5" />
                  <span>Selecione uma data</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => 
                    date < startOfDay(new Date()) || 
                    !availableSchedules.some(s => s.day_of_week === date.getDay())
                  }
                  className="rounded-md border"
                  locale={ptBR}
                />
                
                {selectedDate && availableTimeSlots.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium mb-2 block">Horários disponíveis</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableTimeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTimeSlot === time ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTimeSlot(time)}
                          className="text-xs"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedDate && availableTimeSlots.length === 0 && (
                  <div className="mt-4 text-center text-gray-500">
                    <p>Nenhum horário disponível para esta data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Seus dados</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    value={booking.client_name}
                    onChange={(e) => setBooking({...booking, client_name: e.target.value})}
                    placeholder="Seu nome completo"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={booking.client_email}
                    onChange={(e) => setBooking({...booking, client_email: e.target.value})}
                    placeholder="seu@email.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={booking.client_phone}
                    onChange={(e) => setBooking({...booking, client_phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={booking.notes}
                    onChange={(e) => setBooking({...booking, notes: e.target.value})}
                    placeholder="Alguma informação adicional..."
                    rows={3}
                  />
                </div>

                {selectedDate && selectedTimeSlot && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Resumo do agendamento:</h3>
                    <p className="text-sm text-blue-800">
                      📅 {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-blue-800">
                      🕒 {selectedTimeSlot} ({bookingLink.duration_minutes} min)
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleBooking}
                  className="w-full bg-[#3600FF] hover:bg-[#3600FF]/90"
                  disabled={!selectedDate || !selectedTimeSlot || !booking.client_name || !booking.client_email}
                >
                  Confirmar Agendamento
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
