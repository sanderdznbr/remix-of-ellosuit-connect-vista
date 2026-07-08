// Datas comemorativas brasileiras 2026 (fixas + móveis principais)
export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'nacional' | 'comemorativa' | 'marketing';
}

export const HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', name: 'Confraternização Universal', type: 'nacional' },
  { date: '2026-01-25', name: 'Aniversário de São Paulo', type: 'comemorativa' },
  { date: '2026-02-14', name: 'Dia dos Namorados (EUA) / Valentine', type: 'marketing' },
  { date: '2026-02-16', name: 'Carnaval', type: 'nacional' },
  { date: '2026-02-17', name: 'Terça-feira de Carnaval', type: 'nacional' },
  { date: '2026-02-18', name: 'Quarta-feira de Cinzas', type: 'comemorativa' },
  { date: '2026-03-08', name: 'Dia Internacional da Mulher', type: 'marketing' },
  { date: '2026-03-15', name: 'Dia do Consumidor', type: 'marketing' },
  { date: '2026-04-03', name: 'Sexta-feira Santa', type: 'nacional' },
  { date: '2026-04-05', name: 'Páscoa', type: 'comemorativa' },
  { date: '2026-04-21', name: 'Tiradentes', type: 'nacional' },
  { date: '2026-05-01', name: 'Dia do Trabalho', type: 'nacional' },
  { date: '2026-05-10', name: 'Dia das Mães', type: 'marketing' },
  { date: '2026-06-04', name: 'Corpus Christi', type: 'nacional' },
  { date: '2026-06-12', name: 'Dia dos Namorados', type: 'marketing' },
  { date: '2026-06-24', name: 'São João', type: 'comemorativa' },
  { date: '2026-07-20', name: 'Dia do Amigo', type: 'marketing' },
  { date: '2026-08-09', name: 'Dia dos Pais', type: 'marketing' },
  { date: '2026-09-07', name: 'Independência do Brasil', type: 'nacional' },
  { date: '2026-09-15', name: 'Dia do Cliente', type: 'marketing' },
  { date: '2026-10-12', name: 'Nossa Senhora / Dia das Crianças', type: 'nacional' },
  { date: '2026-10-15', name: 'Dia do Professor', type: 'comemorativa' },
  { date: '2026-11-02', name: 'Finados', type: 'nacional' },
  { date: '2026-11-15', name: 'Proclamação da República', type: 'nacional' },
  { date: '2026-11-20', name: 'Consciência Negra', type: 'nacional' },
  { date: '2026-11-27', name: 'Black Friday', type: 'marketing' },
  { date: '2026-11-30', name: 'Cyber Monday', type: 'marketing' },
  { date: '2026-12-08', name: 'Nossa Senhora da Conceição', type: 'comemorativa' },
  { date: '2026-12-24', name: 'Véspera de Natal', type: 'comemorativa' },
  { date: '2026-12-25', name: 'Natal', type: 'nacional' },
  { date: '2026-12-31', name: 'Véspera de Ano Novo', type: 'comemorativa' },
];

export const holidaysByDate: Record<string, Holiday> = HOLIDAYS_2026.reduce(
  (acc, h) => { acc[h.date] = h; return acc; },
  {} as Record<string, Holiday>
);

export const HOLIDAY_TYPE_COLOR: Record<Holiday['type'], string> = {
  nacional: '#EF4444',
  comemorativa: '#F59E0B',
  marketing: '#10B981',
};
