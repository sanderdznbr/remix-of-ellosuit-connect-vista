import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, User, Mail, Phone, CheckCircle, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ellosuitLogo from '@/assets/ellosuit-logo.png';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';

// Validation schema
const bookingSchema = z.object({
  client_name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  client_email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  client_whatsapp: z.string().trim().min(14, "WhatsApp deve ter formato (XX) XXXXX-XXXX").max(15, "WhatsApp inválido"),
  notes: z.string().max(500, "Observações muito longas").optional()
});

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

const ImprovedBookingPublic = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  
  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null);
  const [availability, setAvailability] = useState<UserAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'select-date' | 'form' | 'confirmation'>('select-date');
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_whatsapp: '',
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

      // Load availability (fallback between availability_schedules and user_availability)
      const { data: schedules, error: schedulesError } = await supabase
        .from('availability_schedules')
        .select('*')
        .eq('user_id', linkData.user_id)
        .eq('is_active', true)
        .order('day_of_week');

      if (schedulesError || !schedules || schedules.length === 0) {
        const { data: userAvail, error: userAvailError } = await supabase
          .from('user_availability')
          .select('*')
          .eq('user_id', linkData.user_id)
          .eq('is_active', true)
          .order('day_of_week');

        if (!userAvailError) {
          setAvailability(userAvail || []);
        } else {
          setAvailability([]);
        }
      } else {
        setAvailability(schedules || []);
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
      
      currentMinute += bookingLink?.duration_minutes || 30;
      while (currentMinute >= 60) {
        currentHour += 1;
        currentMinute -= 60;
      }
    }
    
    return slots;
  };

  const isDateAvailable = (date: Date) => {
    const dayOfWeek = date.getDay();
    return availability.some(av => av.day_of_week === dayOfWeek);
  };

  const formatWhatsAppNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    return numbers.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      bookingSchema.parse(formData);
      
      if (!bookingLink || !selectedDate || !selectedTime) {
        toast({
          title: 'Dados incompletos',
          description: 'Por favor, selecione data e horário.',
          variant: 'destructive'
        });
        return;
      }

      setSubmitting(true);

      const { error } = await supabase
        .from('public_bookings')
        .insert({
          booking_link_id: bookingLink.id,
          user_id: bookingLink.user_id,
          company_id: bookingLink.user_id,
          client_name: formData.client_name.trim(),
          client_email: formData.client_email.trim(),
          client_phone: formData.client_whatsapp,
          booking_date: selectedDate.toISOString().split('T')[0],
          booking_time: selectedTime,
          notes: formData.notes?.trim() || '',
          status: 'confirmed'
        });

      if (error) {
        throw error;
      }

      setStep('confirmation');
      toast({
        title: 'Agendamento confirmado!',
        description: 'Seu agendamento foi criado com sucesso.'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Dados inválidos',
          description: error.errors[0].message,
          variant: 'destructive'
        });
      } else {
        console.error('Error creating booking:', error);
        toast({
          title: 'Erro ao agendar',
          description: 'Ocorreu um erro ao criar seu agendamento. Tente novamente.',
          variant: 'destructive'
        });
      }
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
        <Card className="max-w-md shadow-lg rounded-3xl">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CalendarIcon className="h-10 w-10 text-red-500" />
            </div>
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

  if (step === 'confirmation') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-3 sm:p-4">
        <Card className="max-w-lg w-full shadow-lg rounded-2xl sm:rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 sm:p-8 text-center">
            <CheckCircle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Agendamento Confirmado!
            </h2>
            <p className="text-green-100 text-sm sm:text-base">
              Tudo pronto! Seu horário foi reservado com sucesso.
            </p>
          </div>
          
          <CardContent className="p-4 sm:p-8">
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Data</p>
                  <p className="font-semibold text-sm sm:text-base break-words">{selectedDate ? format(selectedDate, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: ptBR }) : ''}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Horário</p>
                  <p className="font-semibold text-sm sm:text-base">{selectedTime}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Nome</p>
                  <p className="font-semibold text-sm sm:text-base break-words">{formData.client_name}</p>
                </div>
              </div>
              
              {formData.client_whatsapp && (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-500">WhatsApp</p>
                    <p className="font-semibold text-sm sm:text-base">{formData.client_whatsapp}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center">
              <p className="text-blue-800 font-medium text-sm sm:text-base">
                📧 Confirmação enviada para
              </p>
              <p className="text-blue-600 font-semibold text-sm sm:text-base break-words">
                {formData.client_email}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeSlots = generateTimeSlots(selectedDate);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com Logo - Responsivo */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img 
              src={ellosuitLogo} 
              alt="Ellosuit" 
              className="h-8 sm:h-12 w-auto"
            />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
            {bookingLink.title}
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-600 text-sm sm:text-base">
            <Clock className="h-4 w-4" />
            <span>{bookingLink.duration_minutes} minutos</span>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal - Responsivo */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-2">
            Marque seu horário
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Escolha a data e horário mais conveniente para você
          </p>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Seleção de Data - Mobile First */}
          <Card className="shadow-lg rounded-xl sm:rounded-2xl">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Selecione uma data
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="flex justify-center mb-4 sm:mb-6">
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
                  className="pointer-events-auto scale-90 sm:scale-100"
                  classNames={{
                    day_selected: "bg-blue-600 text-white hover:bg-blue-700",
                    day_today: "bg-blue-100 text-blue-900",
                    root: "w-full max-w-none",
                    nav_button: "h-7 w-7 sm:h-8 sm:w-8",
                    head_cell: "text-xs sm:text-sm",
                    cell: "text-xs sm:text-sm p-0",
                    day: "h-7 w-7 sm:h-9 sm:w-9 text-xs sm:text-sm"
                  }}
                />
              </div>

              {/* Horários Disponíveis - Responsivo */}
              {selectedDate && (
                <div className="mt-4 sm:mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
                    Horários para {format(selectedDate, 'dd/MM', { locale: ptBR })}
                  </h4>
                  {timeSlots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          className={cn(
                            "text-xs sm:text-sm py-2 px-2 sm:px-4",
                            selectedTime === time
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "hover:bg-blue-50"
                          )}
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                      Nenhum horário disponível para esta data. Tente outro dia.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coluna 2: Informações do Cliente */}
          <Card className="shadow-lg rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-blue-600" />
                Suas informações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate || !selectedTime ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <CalendarIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Selecione uma data e horário
                  </h3>
                  <p className="text-gray-500">
                    Escolha uma data disponível no calendário ao lado
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Nome completo *
                    </Label>
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
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email *
                    </Label>
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
                    <Label htmlFor="whatsapp" className="text-xs sm:text-sm font-medium text-gray-700">
                      WhatsApp *
                    </Label>
                    <Input
                      id="whatsapp"
                      type="tel"
                      value={formData.client_whatsapp}
                      onChange={(e) => setFormData({...formData, client_whatsapp: formatWhatsAppNumber(e.target.value)})}
                      placeholder="(11) 99999-9999"
                      required
                      className="mt-1 text-sm sm:text-base h-10 sm:h-11"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes" className="text-xs sm:text-sm font-medium text-gray-700">
                      Observações (opcional)
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Alguma informação adicional..."
                      className="mt-1 min-h-[60px] sm:min-h-[80px] text-sm sm:text-base"
                      maxLength={500}
                    />
                  </div>

                  {/* Resumo do Agendamento - Mobile */}
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-xl mt-4 sm:mt-6">
                    <h4 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Resumo do agendamento</h4>
                    <div className="space-y-1 text-xs sm:text-sm text-blue-800">
                      <p><strong>Data:</strong> {format(selectedDate, 'EEEE, d \'de\' MMMM', { locale: ptBR })}</p>
                      <p><strong>Horário:</strong> {selectedTime}</p>
                      <p><strong>Duração:</strong> {bookingLink.duration_minutes} minutos</p>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl mt-4 sm:mt-6 h-12 sm:h-auto"
                    disabled={submitting || !selectedDate || !selectedTime}
                  >
                    {submitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ImprovedBookingPublic;