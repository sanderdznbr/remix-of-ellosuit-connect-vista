
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, isToday, isYesterday, startOfDay, endOfDay, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, TrendingUp, Mail, Target, Calendar as CalIcon, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DailyEmailCount {
  date: string;
  count: number;
}

const MailProductivity = () => {
  const { user } = useAuth();
  const [emailCounts, setEmailCounts] = useState<DailyEmailCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  const fetchEmailProductivity = async () => {
    try {
      setIsLoading(true);
      
      // Get user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!companyUser) {
        // Se não tem empresa, criar dados vazios
        const counts: DailyEmailCount[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateStr = format(date, 'yyyy-MM-dd');
          counts.push({
            date: dateStr,
            count: 0
          });
        }
        setEmailCounts(counts);
        setCurrentStreak(0);
        setLongestStreak(0);
        return;
      }

      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const { data, error } = await supabase
        .from('emails')
        .select('sent_at')
        .eq('company_id', companyUser.company_id)
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
      // Em caso de erro, criar dados vazios
      const counts: DailyEmailCount[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        counts.push({
          date: dateStr,
          count: 0
        });
      }
      setEmailCounts(counts);
      setCurrentStreak(0);
      setLongestStreak(0);
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
    if (user) {
      fetchEmailProductivity();
    }
  }, [user]);

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
    if (streak >= 7) return 'bg-gradient-to-r from-green-500 to-green-600';
    if (streak >= 3) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    return 'bg-gradient-to-r from-gray-500 to-gray-600';
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-4xl font-bold text-gray-900">Carregando Produtividade...</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-none shadow-lg rounded-3xl">
              <CardContent className="p-8">
                <div className="h-24 bg-gray-200 rounded-2xl"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen ml-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4 text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📧 Mail Productivity
        </h1>
        <p className="text-gray-600 text-xl">
          Acompanhe sua consistência no envio de emails e mantenha sua produtividade
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Sequência Atual</p>
                <p className="text-4xl font-bold text-gray-900">{currentStreak}</p>
                <p className="text-sm text-gray-500 mt-2">dias consecutivos</p>
              </div>
              <div className={`p-5 rounded-full ${getStreakColor(currentStreak)} shadow-lg`}>
                <Target className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Maior Sequência</p>
                <p className="text-4xl font-bold text-gray-900">{longestStreak}</p>
                <p className="text-sm text-gray-500 mt-2">dias consecutivos</p>
              </div>
              <div className="p-5 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Total (30 dias)</p>
                <p className="text-4xl font-bold text-gray-900">{getTotalEmails()}</p>
                <p className="text-sm text-gray-500 mt-2">emails enviados</p>
              </div>
              <div className="p-5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl bg-white hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Média por Dia</p>
                <p className="text-4xl font-bold text-gray-900">{getAverageEmails()}</p>
                <p className="text-sm text-gray-500 mt-2">emails por dia</p>
              </div>
              <div className="p-5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar */}
        <Card className="lg:col-span-2 border-none shadow-xl rounded-3xl bg-white">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              Calendário de Atividade
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-7 gap-3 mb-8">
              {emailCounts.map((day, index) => {
                const date = new Date(day.date);
                const isCurrentDay = isToday(date);
                const dayCount = day.count;
                
                let bgColor = 'bg-gray-100 hover:bg-gray-200';
                if (dayCount > 0) {
                  if (dayCount >= 10) bgColor = 'bg-green-600 hover:bg-green-700';
                  else if (dayCount >= 5) bgColor = 'bg-green-400 hover:bg-green-500';
                  else if (dayCount >= 1) bgColor = 'bg-green-200 hover:bg-green-300';
                }

                return (
                  <div
                    key={index}
                    className={`
                      w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-medium cursor-pointer transition-all duration-200
                      ${bgColor}
                      ${isCurrentDay ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                      ${dayCount > 0 ? 'text-white' : 'text-gray-600'}
                      hover:scale-110 transform shadow-md
                    `}
                    title={`${format(date, 'dd/MM/yyyy')} - ${dayCount} emails`}
                    onClick={() => setSelectedDate(date)}
                  >
                    {format(date, 'd')}
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <span className="font-medium">Menos</span>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-gray-100 rounded-xl"></div>
                <div className="w-5 h-5 bg-green-200 rounded-xl"></div>
                <div className="w-5 h-5 bg-green-400 rounded-xl"></div>
                <div className="w-5 h-5 bg-green-600 rounded-xl"></div>
              </div>
              <span className="font-medium">Mais</span>
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card className="border-none shadow-xl rounded-3xl bg-white">
          <CardHeader className="pb-6 text-center">
            <CardTitle className="text-xl">
              {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Selecione um dia'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-8 text-center">
              <div>
                <div className="text-5xl font-bold text-gray-900 mb-3">
                  {getSelectedDateEmails()}
                </div>
                <p className="text-sm text-gray-600">emails enviados</p>
              </div>

              {selectedDate && (
                <div className="space-y-4">
                  <Badge 
                    variant={getSelectedDateEmails() > 0 ? "default" : "secondary"}
                    className="px-6 py-3 rounded-full text-sm"
                  >
                    {getSelectedDateEmails() > 0 ? '✅ Dia Produtivo' : '⭕ Sem Atividade'}
                  </Badge>

                  {isToday(selectedDate) && (
                    <p className="text-sm text-blue-600 font-medium">📅 Hoje</p>
                  )}
                  
                  {isYesterday(selectedDate) && (
                    <p className="text-sm text-gray-500 font-medium">📅 Ontem</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-none shadow-xl rounded-3xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            Atividade Recente (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center py-16 text-gray-500">
            <Mail className="h-20 w-20 mx-auto mb-6 text-gray-300" />
            <p className="text-xl font-medium mb-3">Nenhuma atividade encontrada</p>
            <p className="text-sm">Comece enviando emails para ver suas estatísticas aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MailProductivity;
