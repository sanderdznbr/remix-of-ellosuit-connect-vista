import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar as CalendarIcon, Clock, User, Mail, Phone, 
  CheckCircle, ChevronLeft, ChevronRight, Loader2, MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ellosuitLogo from '@/assets/ellosuit-logo.png';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay, addMonths, subMonths } from 'date-fns';
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
  font_family?: string;
  border_radius?: string;
  button_style?: 'filled' | 'outlined' | 'gradient';
  success_title?: string;
  success_message?: string;
  button_text?: string;
  show_duration?: boolean;
  show_description?: boolean;
}

interface UserAvailability {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

type BookingStep = 'date' | 'time' | 'form' | 'success';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const ImprovedBookingCalendar = () => {
  const { slug } = useParams();
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
    if (slug) loadBookingLink();
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

      setBookingLink(linkData as BookingLink);

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
    
    const slots: string[] = [];
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
  const secondaryColor = bookingLink?.secondary_color || primaryColor;
  const backgroundColor = bookingLink?.background_color || '';
  const customMessage = bookingLink?.custom_message || '';
  const fontFamily = bookingLink?.font_family || 'Inter';
  const borderRadius = bookingLink?.border_radius || '16';
  const buttonStyle = bookingLink?.button_style || 'filled';
  const successTitle = bookingLink?.success_title || 'Agendamento Confirmado!';
  const successMessage = bookingLink?.success_message || 'Enviamos os detalhes para o seu email.';
  const buttonText = bookingLink?.button_text || 'Confirmar Agendamento';
  const showDuration = bookingLink?.show_duration ?? true;
  const showDescription = bookingLink?.show_description ?? true;
  const isDarkBg = ['#111827', '#000000', '#0A0A0A', '#18181B', '#1E1B4B'].includes(bookingLink?.background_color || '');

  const getButtonStyle = (isEnabled: boolean) => {
    if (!isEnabled) return { backgroundColor: '#e5e7eb', color: '#9ca3af' };
    switch (buttonStyle) {
      case 'outlined':
        return { border: `2px solid ${primaryColor}`, color: primaryColor, backgroundColor: 'transparent' };
      case 'gradient':
        return { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: '#FFFFFF' };
      default:
        return { backgroundColor: primaryColor, color: '#FFFFFF' };
    }
  };

  // Calendar generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = monthStart.getDay();
  const paddedDays = Array(startPadding).fill(null).concat(daysInMonth);
  const timeSlots = generateTimeSlots(selectedDate);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bookingLink) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
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

  const stepTitles = {
    date: 'Selecione a data',
    time: 'Selecione o horário',
    form: 'Seus dados',
    success: 'Confirmado!'
  };

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: backgroundColor || 'linear-gradient(to bottom right, #f8fafc, rgba(239,246,255,0.3))',
        fontFamily: fontFamily,
      }}
    >
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        {/* Header Card */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="shadow-xl shadow-primary/5 p-6 mb-6 text-center"
          style={{ 
            backgroundColor: isDarkBg ? '#1F2937' : '#FFFFFF', 
            borderRadius: `${parseInt(borderRadius) + 8}px` 
          }}
        >
          <div 
            className="w-14 h-14 mx-auto mb-4 overflow-hidden shadow-md flex items-center justify-center"
            style={{ 
              borderRadius: `${parseInt(borderRadius)}px`,
              backgroundColor: isDarkBg ? '#374151' : '#FFFFFF'
            }}
          >
            <img 
              src={bookingLink.logo_url || ellosuitLogo} 
              alt={bookingLink.title} 
              className="h-10 w-auto object-contain"
            />
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: isDarkBg ? '#FFFFFF' : '#111827' }}>
            {bookingLink.title}
          </h1>
          {showDescription && bookingLink.description && (
            <p className="text-sm mb-3" style={{ color: isDarkBg ? '#9CA3AF' : '#6B7280' }}>{bookingLink.description}</p>
          )}
          {showDuration && (
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
              style={{ 
                backgroundColor: `${primaryColor}15`, 
                color: primaryColor,
                borderRadius: `${parseInt(borderRadius)}px`
              }}
            >
              <Clock className="h-4 w-4" />
              {bookingLink.duration_minutes} minutos
            </div>
          )}
          {customMessage && (
            <p className="text-sm italic mt-2" style={{ color: isDarkBg ? '#9CA3AF' : '#6B7280' }}>"{customMessage}"</p>
          )}
        </motion.div>

        {/* Progress Steps */}
        {step !== 'success' && (
          <div className="flex items-center justify-center gap-3 mb-6">
            {(['date', 'time', 'form'] as const).map((s, i) => {
              const stepIndex = ['date', 'time', 'form'].indexOf(step);
              const isActive = step === s;
              const isCompleted = stepIndex > i;
              
              return (
                <React.Fragment key={s}>
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",
                      isActive && "shadow-lg scale-110",
                      isCompleted && "bg-primary/20"
                    )}
                    style={{ 
                      backgroundColor: isActive ? primaryColor : isCompleted ? `${primaryColor}30` : '#e5e7eb',
                      color: isActive ? 'white' : isCompleted ? primaryColor : '#9ca3af'
                    }}
                  >
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : i + 1}
                  </div>
                  {i < 2 && (
                    <div 
                      className="w-8 h-1 rounded-full transition-all duration-300"
                      style={{ backgroundColor: stepIndex > i ? primaryColor : '#e5e7eb' }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Main Card */}
        <motion.div 
          className="shadow-xl shadow-primary/5 overflow-hidden"
          style={{ 
            backgroundColor: isDarkBg ? '#1F2937' : '#FFFFFF',
            borderRadius: `${parseInt(borderRadius) + 8}px`
          }}
          layout
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Date Selection */}
            {step === 'date' && (
              <motion.div
                key="date"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                <h2 className="text-lg font-semibold text-center mb-6 flex items-center justify-center gap-2">
                  <CalendarIcon className="h-5 w-5" style={{ color: primaryColor }} />
                  {stepTitles.date}
                </h2>

                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="rounded-full h-9 w-9"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h3 className="text-base font-semibold capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="rounded-full h-9 w-9"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {WEEKDAYS.map((day, i) => (
                    <div key={i} className="text-center text-xs font-semibold text-muted-foreground py-2">
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
                          "aspect-square flex flex-col items-center justify-center transition-all duration-200 relative text-sm",
                          available && !selected && "hover:scale-105 cursor-pointer",
                          !available && "opacity-30 cursor-not-allowed"
                        )}
                        style={{
                          borderRadius: `${Math.min(parseInt(borderRadius), 12)}px`,
                          backgroundColor: selected ? primaryColor : 'transparent',
                          color: selected ? 'white' : available ? (isDarkBg ? '#E5E7EB' : '#1f2937') : (isDarkBg ? '#4B5563' : '#9ca3af'),
                          boxShadow: selected ? `0 4px 14px ${primaryColor}40` : 'none'
                        }}
                      >
                        <span className={cn("font-medium", today && !selected && "underline underline-offset-2")}>
                          {format(day, 'd')}
                        </span>
                        {available && !selected && (
                          <div 
                            className="w-1.5 h-1.5 rounded-full mt-0.5" 
                            style={{ backgroundColor: primaryColor }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Continue Button */}
                <Button
                  onClick={() => setStep('time')}
                  disabled={!selectedDate}
                  className="w-full h-12 text-base font-semibold mt-6 transition-all duration-300"
                  style={{ 
                    borderRadius: `${parseInt(borderRadius)}px`,
                    ...getButtonStyle(!!selectedDate)
                  }}
                >
                  Continuar
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Time Selection */}
            {step === 'time' && (
              <motion.div
                key="time"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                <button
                  onClick={() => setStep('date')}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>

                <h2 className="text-lg font-semibold text-center mb-2 flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5" style={{ color: primaryColor }} />
                  {stepTitles.time}
                </h2>
                <p className="text-center text-sm text-muted-foreground mb-6 capitalize">
                  {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>

                {timeSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                    {timeSlots.map((time) => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            "py-3 px-3 text-sm font-medium transition-all duration-200",
                            !isSelected && (isDarkBg ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-slate-100 hover:bg-slate-200 text-foreground")
                          )}
                          style={{
                            borderRadius: `${Math.min(parseInt(borderRadius), 12)}px`,
                            backgroundColor: isSelected ? primaryColor : undefined,
                            color: isSelected ? 'white' : undefined,
                            boxShadow: isSelected ? `0 4px 14px ${primaryColor}40` : 'none'
                          }}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhum horário disponível neste dia.</p>
                  </div>
                )}

                <Button
                  onClick={() => setStep('form')}
                  disabled={!selectedTime}
                  className="w-full h-12 text-base font-semibold mt-6 transition-all duration-300"
                  style={{ 
                    borderRadius: `${parseInt(borderRadius)}px`,
                    ...getButtonStyle(!!selectedTime)
                  }}
                >
                  Continuar
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            )}

            {/* Step 3: Form */}
            {step === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                <button
                  onClick={() => setStep('time')}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>

                <h2 className="text-lg font-semibold text-center mb-6 flex items-center justify-center gap-2">
                  <User className="h-5 w-5" style={{ color: primaryColor }} />
                  {stepTitles.form}
                </h2>

                {/* Summary */}
                <div 
                  className="rounded-2xl p-4 mb-6 text-sm"
                  style={{ backgroundColor: `${primaryColor}08` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" style={{ color: primaryColor }} />
                      <span className="capitalize">
                        {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" style={{ color: primaryColor }} />
                      <span>{selectedTime}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Nome completo *
                    </Label>
                    <Input
                      id="name"
                      value={formData.client_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Seu nome"
                      className="h-12 rounded-xl border-slate-200 focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                      placeholder="seu@email.com"
                      className="h-12 rounded-xl border-slate-200 focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Telefone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.client_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                      className="h-12 rounded-xl border-slate-200 focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Observações
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Algo que devemos saber?"
                      rows={3}
                      className="rounded-xl border-slate-200 focus:border-primary resize-none"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !formData.client_name || !formData.client_email}
                  className="w-full h-12 text-base font-semibold mt-6"
                  style={{ 
                    borderRadius: `${parseInt(borderRadius)}px`,
                    ...getButtonStyle(!submitting && !!formData.client_name && !!formData.client_email)
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      {buttonText}
                      <CheckCircle className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <CheckCircle className="h-10 w-10" style={{ color: primaryColor }} />
                </motion.div>
                
                <h2 className="text-2xl font-bold mb-2" style={{ color: isDarkBg ? '#FFFFFF' : '#111827' }}>{successTitle}</h2>
                <p className="mb-6" style={{ color: isDarkBg ? '#9CA3AF' : '#6B7280' }}>
                  {successMessage}
                </p>

                <div 
                  className="rounded-2xl p-5 text-left space-y-3"
                  style={{ backgroundColor: `${primaryColor}08` }}
                >
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5" style={{ color: primaryColor }} />
                    <span className="capitalize">
                      {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5" style={{ color: primaryColor }} />
                    <span>{selectedTime} • {bookingLink.duration_minutes} minutos</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5" style={{ color: primaryColor }} />
                    <span>{formData.client_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5" style={{ color: primaryColor }} />
                    <span>{formData.client_email}</span>
                  </div>
                </div>

                {bookingLink.custom_message && (
                  <p className="mt-6 text-sm text-muted-foreground italic">
                    "{bookingLink.custom_message}"
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by{' '}
          <span className="font-semibold" style={{ color: primaryColor }}>ellosuit</span>
        </p>
      </div>
    </div>
  );
};

export default ImprovedBookingCalendar;
