export interface WorkflowGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_by: string;
}

export interface Workflow {
  id: string;
  group_id: string;
  name: string;
  description?: string;
}

export interface WorkflowColumn {
  id: string;
  workflow_id: string;
  name: string;
  position: number;
  color: string;
}

export interface WorkflowCard {
  id: string;
  column_id: string;
  title: string;
  description?: string;
  position: number;
  priority: string;
  due_date?: string;
  tags?: string[];
  created_by: string;
  attachments?: string[];
  links?: string[];
  comments?: { author: string; text: string; date: string }[];
  assigned_user_id?: string;
}

export interface EnrichedWorkflow extends Workflow {
  group_name: string;
  group_color: string;
}

export const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-emerald-500', bgLight: 'bg-emerald-50', textColor: 'text-emerald-700' },
  medium: { label: 'Média', color: 'bg-amber-500', bgLight: 'bg-amber-50', textColor: 'text-amber-700' },
  high: { label: 'Alta', color: 'bg-rose-500', bgLight: 'bg-rose-50', textColor: 'text-rose-700' }
};

export const labelColors = [
  { name: 'Verde', value: '#22c55e' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Roxo', value: '#a855f7' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Rosa', value: '#ec4899' },
];

export const columnColors = [
  '#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'
];
