
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, User, Mail, Phone, MessageSquare, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const BookingPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [bookingLink, setBookingLink] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (slug) {
      loadBookingLink();
    }
  }, [slug]);

  useEffect(() => {
    if (selectedDate && bookingLink) {
      loadAvailableSlots();
    }
  }, [selectedDate, bookingLink]);

  const loadBookingLink = async () => {
    try {
      const { data, error } = await supabase
        .from('public_booking_links')
        .select(`
          *,
          availability_schedules (*)
        `)
        .eq('link_slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      setBookingLink(data);
    } catch (error) {
      console.error('Erro ao carregar link de agendamento:', error);
      navigate('/404');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !bookingLink) return;

    try {
      const selectedDateObj = new Date(selectedDate);
      const dayOfWeek = selectedDateObj.getDay();

      // Buscar horários de disponibilidade para o dia da semana
      const { data: schedules, error: scheduleError } = await supabase
        .from('availability_schedules')
        .select('*')
        .eq('user_id', bookingLink.user_id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (scheduleError) throw scheduleError;

      // Buscar agendamentos já existentes para o dia
      const { data: existingBookings, error: bookingError } = await supabase
        .from('public_bookings')
        .select('booking_time')
        .eq('user_id', bookingLink.user_id)
        .eq('booking_date', selectedDate)
        .eq('status', 'confirmed');

      if (bookingError) throw bookingError;

      // Gerar slots disponíveis
      const slots: any[] = [];
      const existingTimes = existingBookings.map(b => b.booking_time);

      schedules.forEach(schedule => {
        const startTime = new Date(`2000-01-01T${schedule.start_time}`);
        const endTime = new Date(`2000-01-01T${schedule.end_time}`);
        
        while (startTime < endTime) {
          const timeString = startTime.toTimeString().substring(0, 5);
          
          if (!existingTimes.includes(timeString)) {
            slots.push({
              time: timeString,
              available: true
            });
          }
          
          // Adicionar duração do agendamento + buffer
          startTime.setMinutes(startTime.getMinutes() + bookingLink.duration_minutes + bookingLink.buffer_minutes);
        }
      });

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Erro ao carregar horários disponíveis:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !formData.client_name || !formData.client_email) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Criar agendamento
      const { error } = await supabase
        .from('public_bookings')
        .insert({
          booking_link_id: bookingLink.id,
          user_id: bookingLink.user_id,
          company_id: bookingLink.company_id,
          booking_date: selectedDate,
          booking_time: selectedTime,
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
          notes: formData.notes,
          status: 'confirmed'
        });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Agendamento confirmado!",
        description: "Você receberá um email de confirmação em breve."
      });

    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao confirmar agendamento",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Gerar opções de data (próximos 30 dias, excluindo weekends se necessário)
  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip weekends se não houver horários disponíveis
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Pular domingo e sábado por enquanto
      
      options.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('pt-BR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      });
    }
    
    return options;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando informações do agendamento...</p>
        </div>
      </div>
    );
  }

  if (!bookingLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto shadow-xl">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Link não encontrado</h2>
            <p className="text-gray-600">Este link de agendamento não existe ou foi desativado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto shadow-xl">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Agendamento Confirmado!</h2>
            <p className="text-gray-600 mb-4">
              Seu agendamento para {new Date(selectedDate).toLocaleDateString('pt-BR')} às {selectedTime} foi confirmado.
            </p>
            <p className="text-sm text-gray-500">
              Em breve você receberá um email de confirmação com todos os detalhes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{bookingLink.title}</h1>
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Clock className="h-5 w-5" />
            <span>{bookingLink.duration_minutes} minutos</span>
          </div>
          {bookingLink.description && (
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">{bookingLink.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seleção de Data e Hora */}
          <Card className="shadow-xl border-0 rounded-2xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-2xl">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-6 w-6" />
                <span>Selecione uma data</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Seleção de Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data *
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione uma data</option>
                  {getDateOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Horários Disponíveis */}
              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horários disponíveis
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`p-2 text-sm rounded-lg border transition-colors ${
                            selectedTime === slot.time
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))
                    ) : (
                      <p className="col-span-3 text-center text-gray-500 py-4">
                        Nenhum horário disponível para esta data
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados do Cliente */}
          <Card className="shadow-xl border-0 rounded-2xl">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-2xl">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-6 w-6" />
                <span>Seus dados</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo *
                </label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  placeholder="Seu nome completo"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                  placeholder="seu@email.com"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <Input
                  value={formData.client_phone}
                  onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Alguma informação adicional..."
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !selectedDate || !selectedTime}
                className="w-full h-12 text-lg font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Confirmar Agendamento
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
