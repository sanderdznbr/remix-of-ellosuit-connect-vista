import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, Clock, User, Mail, Phone, 
  CheckCircle, ArrowLeft, ArrowRight, Loader2, MapPin,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ellosuitLogo from '@/assets/ellosuit-logo.png';
import { cn } from '@/lib/utils';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingLink {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  user_id: string;
  company_id: string;
  is_active: boolean;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  custom_message?: string;
}

interface UserAvailability {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

type BookingStep = 'date' | 'time' | 'form' | 'success';

const ImprovedBookingCalendar = () => {
  const { companyName, slug } = useParams();
  const { toast } = useToast();
  
  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null);
  const [availability, setAvailability] = useState<UserAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [step, setStep] = useState<BookingStep>('date');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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

      const { data: availabilityData } = await supabase
        .from('availability_schedules')
        .select('*')
        .eq('user_id', linkData.user_id)
        .eq('is_active', true)
        .order('day_of_week');

      if (availabilityData) {
        setAvailability(availabilityData);
      }

    } catch (error) {
      console.error('Error loading booking link:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDateAvailable = (date: Date) => {
    if (isBefore(startOfDay(date), startOfDay(new Date()))) return false;
    const dayOfWeek = date.getDay();
    return availability.some(av => av.day_of_week === dayOfWeek);
  };

  const generateTimeSlots = (date: Date | null) => {
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
      
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }
    
    return slots;
  };

  const handleSubmit = async () => {
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
      // Create booking
      const { error: bookingError } = await supabase
        .from('public_bookings')
        .insert({
          booking_link_id: bookingLink.id,
          user_id: bookingLink.user_id,
          company_id: bookingLink.company_id,
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          booking_time: selectedTime,
          notes: formData.notes,
          status: 'confirmed'
        });

      if (bookingError) throw bookingError;

      // Create calendar event for the owner
      const startDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + bookingLink.duration_minutes);

      await supabase
        .from('calendar_events')
        .insert({
          title: `Agendamento: ${formData.client_name}`,
          description: `Agendamento via ${bookingLink.title}\n\nCliente: ${formData.client_name}\nEmail: ${formData.client_email}\nTelefone: ${formData.client_phone || 'Não informado'}\n\nObservações: ${formData.notes || 'Nenhuma'}`,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          event_type: 'meeting',
          company_id: bookingLink.company_id,
          created_by: bookingLink.user_id,
          color: bookingLink.primary_color || '#3600FF',
          status: 'confirmed'
        });

      // Try to save/update client
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', formData.client_email)
        .eq('company_id', bookingLink.company_id)
        .maybeSingle();

      if (!existingClient) {
        await supabase
          .from('clients')
          .insert({
            name: formData.client_name,
            email: formData.client_email,
            phone: formData.client_phone || null,
            company_id: bookingLink.company_id,
            created_by: bookingLink.user_id,
            status: 'active',
            client_type: 'lead',
            notes: `Origem: Agendamento online - ${bookingLink.title}`
          });
      }

      setStep('success');
      toast({
        title: 'Agendamento confirmado!',
        description: 'Seu horário foi reservado com sucesso.'
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

  const primaryColor = bookingLink?.primary_color || '#3600FF';

  // Calendar generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Pad to start from Sunday
  const startPadding = monthStart.getDay();
  const paddedDays = Array(startPadding).fill(null).concat(daysInMonth);

  const timeSlots = generateTimeSlots(selectedDate);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!bookingLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <CalendarIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Link não encontrado</h2>
          <p className="text-muted-foreground">
            Este link de agendamento não existe ou não está mais ativo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 mx-auto mb-4">
            <img 
              src={bookingLink.logo_url || ellosuitLogo} 
              alt={bookingLink.title} 
              className="h-full w-auto object-contain mx-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {bookingLink.title}
          </h1>
          {bookingLink.description && (
            <p className="text-muted-foreground mb-3">{bookingLink.description}</p>
          )}
          <Badge variant="secondary" className="gap-2">
            <Clock className="h-3.5 w-3.5" />
            {bookingLink.duration_minutes} minutos
          </Badge>
        </motion.div>

        {/* Progress Steps */}
        {step !== 'success' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {['date', 'time', 'form'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    step === s 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : ['date', 'time', 'form'].indexOf(step) > i
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1}
                </div>
                {i < 2 && (
                  <div className={cn(
                    "w-12 h-0.5 mx-1",
                    ['date', 'time', 'form'].indexOf(step) > i ? "bg-primary/40" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main Card */}
        <motion.div 
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          layout
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Date Selection */}
            {step === 'date' && (
              <motion.div
                key="date"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <h2 className="text-xl font-semibold text-center mb-6">
                  Escolha uma data disponível
                </h2>

                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                    className="rounded-full"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <h3 className="text-lg font-semibold capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                    className="rounded-full"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {paddedDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }
                    
                    const available = isDateAvailable(day);
                    const selected = selectedDate && isSameDay(day, selectedDate);
                    const today = isToday(day);
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => available && setSelectedDate(day)}
                        disabled={!available}
                        className={cn(
                          "aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative",
                          available && !selected && "hover:bg-primary/10 cursor-pointer",
                          selected && "bg-primary text-primary-foreground shadow-lg",
                          !available && "text-muted-foreground/30 cursor-not-allowed",
                          today && !selected && "ring-2 ring-primary/30"
                        )}
                      >
                        <span className={cn(
                          "text-sm font-medium",
                          selected && "text-primary-foreground"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {available && !selected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Continue Button */}
                <div className="mt-8">
                  <Button
                    onClick={() => setStep('time')}
                    disabled={!selectedDate}
                    className="w-full h-12 rounded-xl text-base font-semibold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Continuar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Time Selection */}
            {step === 'time' && (
              <motion.div
                key="time"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <button
                  onClick={() => setStep('date')}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>

                <h2 className="text-xl font-semibold text-center mb-2">
                  Escolha um horário
                </h2>
                <p className="text-center text-muted-foreground mb-6 capitalize">
                  {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>

                {timeSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "py-3 px-4 rounded-xl text-sm font-medium transition-all",
                          selectedTime === time
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhum horário disponível para esta data.</p>
                  </div>
                )}

                <Button
                  onClick={() => setStep('form')}
                  disabled={!selectedTime}
                  className="w-full h-12 rounded-xl text-base font-semibold"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continuar
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            )}

            {/* Step 3: Client Form */}
            {step === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <button
                  onClick={() => setStep('time')}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>

                <h2 className="text-xl font-semibold text-center mb-2">
                  Seus dados
                </h2>
                <p className="text-center text-muted-foreground mb-6">
                  Preencha suas informações para confirmar
                </p>

                {/* Selected Summary */}
                <div className="bg-primary/5 rounded-2xl p-4 mb-6">
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <span className="capitalize">
                      {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm mt-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>{selectedTime} • {bookingLink.duration_minutes} minutos</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">
                      Nome completo *
                    </Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={formData.client_name}
                        onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                        placeholder="Seu nome completo"
                        required
                        className="pl-10 h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email *
                    </Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.client_email}
                        onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                        placeholder="seu@email.com"
                        required
                        className="pl-10 h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Telefone
                    </Label>
                    <div className="relative mt-1.5">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.client_phone}
                        onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                        placeholder="(00) 00000-0000"
                        className="pl-10 h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium">
                      Observações
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Algo que gostaria de compartilhar..."
                      rows={3}
                      className="mt-1.5 rounded-xl resize-none"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !formData.client_name || !formData.client_email}
                  className="w-full h-12 rounded-xl text-base font-semibold mt-6"
                  style={{ backgroundColor: primaryColor }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Confirmar Agendamento
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center"
              >
                <div 
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <CheckCircle className="h-10 w-10" style={{ color: primaryColor }} />
                </div>

                <h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2>
                <p className="text-muted-foreground mb-8">
                  Seu horário foi reservado com sucesso. Enviamos os detalhes para seu email.
                </p>

                <div className="bg-muted/50 rounded-2xl p-6 text-left space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-semibold capitalize">
                        {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Horário</p>
                      <p className="font-semibold">
                        {selectedTime} • {bookingLink.duration_minutes} minutos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Participante</p>
                      <p className="font-semibold">{formData.client_name}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span>Agendado via ELLOsuit</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          Powered by <span className="font-semibold">ELLOsuit</span>
        </div>
      </div>
    </div>
  );
};

export default ImprovedBookingCalendar;
