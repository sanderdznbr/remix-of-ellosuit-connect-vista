import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, User, Mail, Phone, CheckCircle, MessageCircle, ArrowLeft } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ellosuitLogo from '@/assets/ellosuit-logo.png';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BookingLink {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  user_id: string;
  is_active: boolean;
}

interface UserAvailability {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const ImprovedBookingCalendar = () => {
  const { companyName, slug } = useParams();
  const { toast } = useToast();
  
  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null);
  const [availability, setAvailability] = useState<UserAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    notes: ''
  });

  useEffect(() => {
    if (slug) {
      loadBookingLink();
    }
  }, [slug]);

  const loadBookingLink = async () => {
    try {
      const { data: linkData, error: linkError } = await supabase
        .from('public_booking_links')
        .select('*')
        .eq('link_slug', slug)
        .eq('is_active', true)
        .single();

      if (linkError || !linkData) {
        toast({
          title: 'Link não encontrado',
          description: 'Este link de agendamento não existe ou não está ativo.',
          variant: 'destructive'
        });
        return;
      }

      setBookingLink(linkData);

      // Load availability - try availability_schedules first
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('availability_schedules')
        .select('*')
        .eq('user_id', linkData.user_id)
        .eq('is_active', true)
        .order('day_of_week');

      if (!availabilityError && availabilityData) {
        setAvailability(availabilityData);
      }

    } catch (error) {
      console.error('Error loading booking link:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (date?: Date) => {
    if (!date) return [];
    
    const dayOfWeek = date.getDay();
    const dayAvailability = availability.find(av => av.day_of_week === dayOfWeek);
    
    if (!dayAvailability) return [];
    
    const slots = [];
    const [startHour, startMinute] = dayAvailability.start_time.split(':').map(Number);
    const [endHour, endMinute] = dayAvailability.end_time.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      slots.push(timeString);
      
      // Add 30 minutes
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }
    
    return slots;
  };

  const isDateAvailable = (date: Date) => {
    const dayOfWeek = date.getDay();
    return availability.some(av => av.day_of_week === dayOfWeek);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingLink || !formData.client_name || !formData.client_email || !selectedDate || !selectedTime) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      // Get company_id from the booking link
      const { data: linkDetails } = await supabase
        .from('public_booking_links')
        .select('company_id')
        .eq('id', bookingLink.id)
        .single();

      const { error } = await supabase
        .from('public_bookings')
        .insert({
          booking_link_id: bookingLink.id,
          user_id: bookingLink.user_id,
          company_id: linkDetails?.company_id || bookingLink.user_id,
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
          booking_date: selectedDate.toISOString().split('T')[0],
          booking_time: selectedTime,
          notes: formData.notes,
          status: 'confirmed'
        });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast({
        title: 'Agendamento confirmado!',
        description: 'Seu agendamento foi criado com sucesso.'
      });

    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Erro ao agendar',
        description: 'Ocorreu um erro ao criar seu agendamento. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!bookingLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md shadow-lg">
          <CardContent className="text-center py-16">
            <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Link não encontrado
            </h3>
            <p className="text-gray-600">
              Este link de agendamento não existe ou não está mais ativo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-lg">
          <div className="bg-green-50 border-b p-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Agendamento Confirmado!
            </h2>
            <p className="text-gray-600">
              Tudo pronto! Seu horário foi reservado com sucesso.
            </p>
          </div>
          
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Data</p>
                  <p className="font-semibold">{selectedDate ? format(selectedDate, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: ptBR }) : ''}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Horário</p>
                  <p className="font-semibold">{selectedTime}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeSlots = generateTimeSlots(selectedDate);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="px-6 py-8 text-center">
            <div className="w-24 h-12 mx-auto mb-4">
              <img 
                src={ellosuitLogo} 
                alt="ELLOsuit" 
                className="h-full w-auto object-contain mx-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {bookingLink.title}
            </h1>
            {bookingLink.description && (
              <p className="text-gray-600 mb-4">{bookingLink.description}</p>
            )}
            <Badge variant="outline" className="flex items-center gap-2 w-fit mx-auto">
              <Clock className="h-4 w-4" />
              {bookingLink.duration_minutes} minutos
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-0 min-h-[600px]">
          {/* Calendar Side */}
          <div className="bg-white p-8 border-r">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
              Selecione uma data
            </h2>
            
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime('');
                }}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today || !isDateAvailable(date);
                }}
                initialFocus
                className="w-full max-w-sm"
                classNames={{
                  months: "flex flex-col space-y-4",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-lg font-semibold",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-gray-500 rounded-md w-10 font-normal text-sm",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                  day: "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 w-10 hover:bg-blue-100",
                  day_selected: "bg-blue-600 text-white hover:bg-blue-600",
                  day_today: "bg-gray-100 text-gray-900",
                  day_outside: "text-gray-300",
                  day_disabled: "text-gray-300 opacity-50 cursor-not-allowed",
                  day_hidden: "invisible",
                }}
              />
            </div>

            {selectedDate && timeSlots.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Horários disponíveis
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                      className="h-10"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Side */}
          <div className="bg-gray-50 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
              <User className="h-6 w-6 text-blue-600" />
              Suas informações
            </h2>

            {selectedDate && selectedTime ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <div className="flex items-center gap-2 text-blue-800 font-medium mb-1">
                    <CalendarIcon className="h-4 w-4" />
                    {format(selectedDate, 'EEEE, d \'de\' MMMM', { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <Clock className="h-4 w-4" />
                    {selectedTime} - {bookingLink.duration_minutes} minutos
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    placeholder="Seu nome completo"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                    placeholder="seu@email.com"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Algo que gostaria de compartilhar..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-semibold"
                  disabled={submitting}
                >
                  {submitting ? 'Agendando...' : 'Confirmar Agendamento'}
                </Button>
              </form>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">
                  Selecione uma data e horário
                </h3>
                <p className="text-gray-400">
                  Escolha uma data disponível no calendário ao lado
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedBookingCalendar;