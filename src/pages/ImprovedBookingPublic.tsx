import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Mail, Phone, CheckCircle, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ellosuitLogo from '@/assets/ellosuit-logo.png';

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
  const { companyName, slug } = useParams();
  const { toast } = useToast();
  
  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null);
  const [availability, setAvailability] = useState<UserAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_whatsapp: '',
    booking_date: '',
    booking_time: '',
    notes: ''
  });

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  useEffect(() => {
    if (slug) {
      loadBookingLink();
    }
  }, [slug]);

  const loadBookingLink = async () => {
    try {
      const { data: linkData, error: linkError } = await supabase
        .from('booking_links')
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

      // Load availability
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('user_availability')
        .select('*')
        .eq('user_id', linkData.user_id)
        .eq('is_active', true)
        .order('day_of_week');

      if (!availabilityError) {
        setAvailability(availabilityData || []);
      }

    } catch (error) {
      console.error('Error loading booking link:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (selectedDate?: string) => {
    if (!selectedDate) return [];
    
    const date = new Date(selectedDate);
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

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) { // Next 30 days
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayOfWeek = date.getDay();
      const hasAvailability = availability.some(av => av.day_of_week === dayOfWeek);
      
      if (hasAvailability) {
        dates.push({
          value: date.toISOString().split('T')[0],
          label: date.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: '2-digit', 
            month: 'long',
            year: 'numeric'
          })
        });
      }
    }
    
    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingLink || !formData.client_name || !formData.client_email || !formData.booking_date || !formData.booking_time) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('scheduled_bookings')
        .insert({
          booking_link_id: bookingLink.id,
          user_id: bookingLink.user_id,
          company_id: bookingLink.user_id, // We'll need to get proper company_id
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
          booking_date: formData.booking_date,
          booking_time: formData.booking_time,
          notes: formData.notes,
          status: 'confirmed'
        });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast({
        title: 'Agendamento confirmado!',
        description: 'Seu agendamento foi criado com sucesso. Você receberá uma confirmação por email.'
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

  const formatWhatsAppNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    return numbers.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!bookingLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md shadow-2xl rounded-3xl">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Calendar className="h-10 w-10 text-red-500" />
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

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-2xl rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-8 text-center">
            <CheckCircle className="h-20 w-20 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">
              Agendamento Confirmado!
            </h2>
            <p className="text-green-100">
              Tudo pronto! Seu horário foi reservado com sucesso.
            </p>
          </div>
          
          <CardContent className="p-8">
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Data</p>
                  <p className="font-semibold">{new Date(formData.booking_date).toLocaleDateString('pt-BR', { 
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Horário</p>
                  <p className="font-semibold">{formData.booking_time}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Nome</p>
                  <p className="font-semibold">{formData.client_name}</p>
                </div>
              </div>
              
              {formData.client_whatsapp && (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">WhatsApp</p>
                    <p className="font-semibold">{formData.client_whatsapp}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 p-4 rounded-2xl text-center">
              <p className="text-blue-800 font-medium">
                📧 Confirmação enviada para
              </p>
              <p className="text-blue-600 font-semibold">
                {formData.client_email}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-32 h-16 mx-auto mb-6">
            <img 
              src={ellosuitLogo} 
              alt="ELLOsuit" 
              className="h-full w-auto object-contain mx-auto"
            />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            {bookingLink.title}
          </h1>
          {bookingLink.description && (
            <p className="text-lg text-gray-700 mb-6">{bookingLink.description}</p>
          )}
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2 py-2 px-4 rounded-full border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800 font-medium">{bookingLink.duration_minutes} minutos</span>
            </Badge>
          </div>
        </div>

        {/* Booking Form */}
        <Card className="shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="text-2xl text-center">Agendar Seu Horário</CardTitle>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <User className="h-6 w-6 text-blue-600" />
                  Suas Informações
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Nome completo *</Label>
                    <Input
                      id="name"
                      value={formData.client_name}
                      onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                      placeholder="Seu nome completo"
                      required
                      className="mt-2 h-12 rounded-xl border-gray-200 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                      placeholder="seu@email.com"
                      required
                      className="mt-2 h-12 rounded-xl border-gray-200 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                      placeholder="(11) 99999-9999"
                      className="mt-2 h-12 rounded-xl border-gray-200 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="whatsapp" className="text-sm font-semibold text-gray-700">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      type="tel"
                      value={formData.client_whatsapp}
                      onChange={(e) => setFormData({...formData, client_whatsapp: formatWhatsAppNumber(e.target.value)})}
                      placeholder="(11) 99999-9999"
                      required
                      className="mt-2 h-12 rounded-xl border-gray-200 focus:border-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💬 Usaremos o WhatsApp para lembretes e confirmações
                    </p>
                  </div>
                </div>
              </div>

              {/* Date and Time Selection */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  Escolher Data e Horário
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="date" className="text-sm font-semibold text-gray-700">Data disponível *</Label>
                    <select
                      id="date"
                      className="mt-2 w-full h-12 p-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      value={formData.booking_date}
                      onChange={(e) => {
                        setFormData({...formData, booking_date: e.target.value, booking_time: ''});
                      }}
                      required
                    >
                      <option value="">Selecione uma data</option>
                      {getAvailableDates().map((date) => (
                        <option key={date.value} value={date.value}>
                          {date.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="time" className="text-sm font-semibold text-gray-700">Horário disponível *</Label>
                    <select
                      id="time"
                      className="mt-2 w-full h-12 p-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      value={formData.booking_time}
                      onChange={(e) => setFormData({...formData, booking_time: e.target.value})}
                      required
                      disabled={!formData.booking_date}
                    >
                      <option value="">
                        {formData.booking_date ? 'Selecione um horário' : 'Primeiro selecione uma data'}
                      </option>
                      {generateTimeSlots(formData.booking_date).map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">Observações ou comentários</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Alguma informação adicional que gostaria de compartilhar..."
                  rows={4}
                  className="mt-2 rounded-xl border-gray-200 focus:border-blue-500"
                />
              </div>

              <Button 
                type="submit" 
                disabled={submitting} 
                className="w-full h-14 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Agendando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-3" />
                    Confirmar Agendamento
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p className="text-sm">
            Powered by <span className="font-semibold text-blue-600">ELLOsuit</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImprovedBookingPublic;