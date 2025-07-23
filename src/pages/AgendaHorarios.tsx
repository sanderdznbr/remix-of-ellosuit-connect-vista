
import SchedulesTab from '@/components/Dashboard/MyMeetings/SchedulesTab';
import { useMyMeetings } from '@/hooks/useMyMeetings';

const AgendaHorarios = () => {
  const { schedules, loading } = useMyMeetings();
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Meus Horários</h1>
          <p className="text-gray-600">Configure seus horários de trabalho e disponibilidade</p>
        </div>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Meus Horários</h1>
        <p className="text-gray-600">Configure seus horários de trabalho e disponibilidade</p>
      </div>
      
      <SchedulesTab schedules={schedules} />
    </div>
  );
};

export default AgendaHorarios;
