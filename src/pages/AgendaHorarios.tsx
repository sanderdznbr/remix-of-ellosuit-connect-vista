
import { SchedulesTab } from '@/components/Dashboard/MyMeetings/SchedulesTab';

const AgendaHorarios = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Meus Horários</h1>
        <p className="text-gray-600">Configure seus horários de trabalho e disponibilidade</p>
      </div>
      
      <SchedulesTab />
    </div>
  );
};

export default AgendaHorarios;
