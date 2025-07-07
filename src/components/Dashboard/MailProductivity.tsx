import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, isToday, isYesterday, startOfDay, endOfDay, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, TrendingUp, Mail, Target, Calendar as CalIcon } from 'lucide-react';

interface DailyEmailCount {
  date: string;
  count: number;
}

const MailProductivity = () => {
  const [emailCounts, setEmailCounts] = useState<DailyEmailCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  const fetchEmailProductivity = async () => {
    try {
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const { data, error } = await supabase
        .from('emails')
        .select('sent_at')
        .gte('sent_at', thirtyDaysAgo.toISOString())
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Group emails by date
      const emailsByDate: { [key: string]: number } = {};
      
      data?.forEach(email => {
        const date = format(new Date(email.sent_at), 'yyyy-MM-dd');
        emailsByDate[date] = (emailsByDate[date] || 0) + 1;
      });

      // Convert to array and fill missing dates with 0
      const counts: DailyEmailCount[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        counts.push({
          date: dateStr,
          count: emailsByDate[dateStr] || 0
        });
      }

      setEmailCounts(counts);
      calculateStreaks(counts);
    } catch (error) {
      console.error('Error fetching email productivity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreaks = (counts: DailyEmailCount[]) => {
    let current = 0;
    let longest = 0;
    let tempStreak = 0;

    // Calculate current streak (from today backwards)
    const sortedCounts = [...counts].reverse();
    for (const day of sortedCounts) {
      if (day.count > 0) {
        current++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    for (const day of counts) {
      if (day.count > 0) {
        tempStreak++;
        longest = Math.max(longest, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    setCurrentStreak(current);
    setLongestStreak(longest);
  };

  useEffect(() => {
    fetchEmailProductivity();

    const channel = supabase
      .channel('email-productivity')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emails'
      }, () => {
        fetchEmailProductivity();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getSelectedDateEmails = () => {
    if (!selectedDate) return 0;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayData = emailCounts.find(d => d.date === dateStr);
    return dayData?.count || 0;
  };

  const getTotalEmails = () => {
    return emailCounts.reduce((sum, day) => sum + day.count, 0);
  };

  const getAverageEmails = () => {
    const total = getTotalEmails();
    return emailCounts.length > 0 ? Math.round((total / emailCounts.length) * 10) / 10 : 0;
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 7) return 'bg-green-500';
    if (streak >= 3) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mail Productivity</h1>
          <p className="text-gray-600">Acompanhe sua consistência no envio de emails</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Mail Productivity</h1>
        <p className="text-gray-600">
          Acompanhe sua consistência no envio de emails e mantenha sua produtividade
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border rounded-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Sequência Atual</p>
                <p className="text-2xl font-bold text-gray-900">{currentStreak} dias</p>
              </div>
              <div className={`p-3 rounded-full ${getStreakColor(currentStreak)}`}>
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border rounded-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Maior Sequência</p>
                <p className="text-2xl font-bold text-gray-900">{longestStreak} dias</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border rounded-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total (30 dias)</p>
                <p className="text-2xl font-bold text-gray-900">{getTotalEmails()}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border rounded-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Média por Dia</p>
                <p className="text-2xl font-bold text-gray-900">{getAverageEmails()}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500">
                <CalIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 bg-white border rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendário de Atividade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {emailCounts.map((day, index) => {
                const date = new Date(day.date);
                const isCurrentDay = isToday(date);
                const dayCount = day.count;
                
                let bgColor = 'bg-gray-100';
                if (dayCount > 0) {
                  if (dayCount >= 10) bgColor = 'bg-green-600';
                  else if (dayCount >= 5) bgColor = 'bg-green-400';
                  else if (dayCount >= 1) bgColor = 'bg-green-200';
                }

                return (
                  <div
                    key={index}
                    className={`
                      w-8 h-8 rounded flex items-center justify-center text-xs font-medium cursor-pointer
                      ${bgColor}
                      ${isCurrentDay ? 'ring-2 ring-blue-500' : ''}
                      ${dayCount > 0 ? 'text-white' : 'text-gray-600'}
                      hover:scale-110 transition-transform
                    `}
                    title={`${format(date, 'dd/MM/yyyy')} - ${dayCount} emails`}
                    onClick={() => setSelectedDate(date)}
                  >
                    {format(date, 'd')}
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Menos</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-gray-100 rounded"></div>
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <div className="w-3 h-3 bg-green-600 rounded"></div>
              </div>
              <span>Mais</span>
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card className="bg-white border rounded-lg">
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Selecione um dia'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {getSelectedDateEmails()}
                </div>
                <p className="text-sm text-gray-600">emails enviados</p>
              </div>

              {selectedDate && (
                <div className="space-y-2">
                  <Badge 
                    variant={getSelectedDateEmails() > 0 ? "default" : "secondary"}
                    className="w-full justify-center"
                  >
                    {getSelectedDateEmails() > 0 ? '✅ Dia Produtivo' : '⭕ Sem Atividade'}
                  </Badge>

                  {isToday(selectedDate) && (
                    <p className="text-xs text-blue-600 text-center">Hoje</p>
                  )}
                  
                  {isYesterday(selectedDate) && (
                    <p className="text-xs text-gray-500 text-center">Ontem</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white border rounded-lg">
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {emailCounts.slice(-7).reverse().map((day, index) => {
              const date = new Date(day.date);
              const isCurrentDay = isToday(date);
              const wasYesterday = isYesterday(date);
              
              return (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${day.count > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <div>
                      <p className="text-sm font-medium">
                        {isCurrentDay ? 'Hoje' : 
                         wasYesterday ? 'Ontem' : 
                         format(date, 'dd/MM')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(date, 'EEEE', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{day.count} emails</p>
                    {day.count > 0 && (
                      <p className="text-xs text-green-600">✅ Produtivo</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MailProductivity;