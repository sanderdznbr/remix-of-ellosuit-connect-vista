// AI Assistant Orchestrator - Full platform assistant with tool calling
import { createClient } from 'npm:@supabase/supabase-js@2';

async function logUsage(params: { service_type: string; action: string; model?: string; input_tokens?: number; output_tokens?: number; total_cost: number; user_id?: string; company_id?: string; metadata?: Record<string, any> }) {
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await sb.from('api_usage_logs').insert({
      service_type: params.service_type, action: params.action, model: params.model || null,
      input_tokens: params.input_tokens || 0, output_tokens: params.output_tokens || 0,
      total_cost: params.total_cost, unit_cost: params.total_cost,
      user_id: params.user_id || null, company_id: params.company_id || null,
      metadata: params.metadata || {},
    });
  } catch (e) { console.error('logUsage error:', e); }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============== TOOL DEFINITIONS ==============
const TOOLS = [
  // === TAREFAS ===
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "Listar tarefas/lembretes do usuário",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "in_progress", "completed", "all"], description: "Filtrar por status" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Criar uma nova tarefa/lembrete",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da tarefa" },
          description: { type: "string", description: "Descrição (opcional)" },
          due_date: { type: "string", description: "Data de vencimento YYYY-MM-DD (opcional)" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Atualizar uma tarefa existente",
      parameters: {
        type: "object",
        properties: {
          task_title: { type: "string", description: "Título da tarefa (busca parcial)" },
          new_title: { type: "string" },
          new_status: { type: "string", enum: ["pending", "completed", "cancelled"] },
          new_description: { type: "string" }
        },
        required: ["task_title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Excluir uma tarefa",
      parameters: {
        type: "object",
        properties: { task_title: { type: "string", description: "Título da tarefa (busca parcial)" } },
        required: ["task_title"]
      }
    }
  },

  // === AGENDA ===
  {
    type: "function",
    function: {
      name: "list_calendar_events",
      description: "Listar eventos/compromissos da agenda",
      parameters: {
        type: "object",
        properties: { days_ahead: { type: "number", description: "Dias à frente (padrão: 7)" } },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Criar um novo evento/compromisso na agenda",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título do evento" },
          start_date: { type: "string", description: "Data/hora início YYYY-MM-DDTHH:mm:ss" },
          end_date: { type: "string", description: "Data/hora fim YYYY-MM-DDTHH:mm:ss" },
          description: { type: "string", description: "Descrição (opcional)" },
          event_type: { type: "string", enum: ["meeting", "reminder", "task", "other"], description: "Tipo (padrão: meeting)" }
        },
        required: ["title", "start_date", "end_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_calendar_event",
      description: "Excluir um evento da agenda",
      parameters: {
        type: "object",
        properties: { event_title: { type: "string", description: "Título do evento (busca parcial)" } },
        required: ["event_title"]
      }
    }
  },

  // === CRM / CONTATOS ===
  {
    type: "function",
    function: {
      name: "list_contacts",
      description: "Listar contatos/clientes do CRM",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Buscar por nome, email ou telefone" },
          limit: { type: "number", description: "Quantidade (padrão: 10)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Criar um novo contato/cliente",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          company_name: { type: "string" },
          notes: { type: "string" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_contact",
      description: "Atualizar um contato existente",
      parameters: {
        type: "object",
        properties: {
          contact_name: { type: "string", description: "Nome do contato (busca parcial)" },
          new_name: { type: "string" },
          new_email: { type: "string" },
          new_phone: { type: "string" },
          new_notes: { type: "string" },
          new_status: { type: "string", enum: ["active", "inactive", "lead"] }
        },
        required: ["contact_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_contact",
      description: "Excluir um contato",
      parameters: {
        type: "object",
        properties: { contact_name: { type: "string" } },
        required: ["contact_name"]
      }
    }
  },

  // === DRIVE ===
  {
    type: "function",
    function: {
      name: "save_to_drive",
      description: "Salvar um arquivo anexado no Drive",
      parameters: {
        type: "object",
        properties: {
          folder_name: { type: "string", description: "Pasta destino (opcional)" },
          create_folder: { type: "boolean" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_documents",
      description: "Listar documentos no Drive",
      parameters: {
        type: "object",
        properties: {
          folder_name: { type: "string" },
          limit: { type: "number" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_folder",
      description: "Criar pasta no Drive",
      parameters: {
        type: "object",
        properties: { folder_name: { type: "string" } },
        required: ["folder_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_folders",
      description: "Listar pastas do Drive",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // === NAVEGAÇÃO ===
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Navegar para um módulo do sistema",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Rota, ex: /dashboard/crm-whatsapp" },
          label: { type: "string", description: "Nome amigável" }
        },
        required: ["path", "label"]
      }
    }
  },

  // === SERVIÇOS ===
  {
    type: "function",
    function: {
      name: "list_services",
      description: "Listar serviços/produtos cadastrados",
      parameters: {
        type: "object",
        properties: { search: { type: "string" } },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_service",
      description: "Cadastrar novo serviço/produto",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          unit_price: { type: "number" },
          description: { type: "string" },
          category: { type: "string" }
        },
        required: ["name", "unit_price"]
      }
    }
  },

  // === ASSINATURA ===
  {
    type: "function",
    function: {
      name: "check_subscription",
      description: "Verificar status da assinatura e módulos ativos",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // === PROPOSTAS / CONTRATOS / RECIBOS ===
  {
    type: "function",
    function: {
      name: "list_proposals",
      description: "Listar propostas comerciais",
      parameters: {
        type: "object",
        properties: { status: { type: "string", enum: ["draft", "sent", "approved", "rejected", "all"] }, limit: { type: "number" } },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_contracts",
      description: "Listar contratos",
      parameters: {
        type: "object",
        properties: { status: { type: "string", enum: ["draft", "signed", "cancelled", "all"] }, limit: { type: "number" } },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_receipts",
      description: "Listar recibos emitidos",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
        required: []
      }
    }
  },

  // === EMAIL ===
  {
    type: "function",
    function: {
      name: "list_email_templates",
      description: "Listar templates de email",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "list_sent_emails",
      description: "Listar emails enviados com estatísticas",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
        required: []
      }
    }
  },

  // === AUTOMAÇÕES ===
  {
    type: "function",
    function: {
      name: "list_automations",
      description: "Listar automações configuradas",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "toggle_automation",
      description: "Ativar/desativar uma automação",
      parameters: {
        type: "object",
        properties: {
          automation_name: { type: "string" },
          active: { type: "boolean" }
        },
        required: ["automation_name", "active"]
      }
    }
  },

  // === CHATBOTS ===
  {
    type: "function",
    function: {
      name: "list_chatbots",
      description: "Listar chatbots",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "toggle_chatbot",
      description: "Ativar/desativar chatbot",
      parameters: {
        type: "object",
        properties: { chatbot_name: { type: "string" }, active: { type: "boolean" } },
        required: ["chatbot_name", "active"]
      }
    }
  },

  // === AGENTES IA ===
  {
    type: "function",
    function: {
      name: "list_ai_agents",
      description: "Listar agentes de IA",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // === WHATSAPP ===
  {
    type: "function",
    function: {
      name: "list_whatsapp_conversations",
      description: "Listar conversas recentes do WhatsApp",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" }, unread_only: { type: "boolean" } },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_whatsapp_message",
      description: "Enviar uma mensagem de WhatsApp para um contato. Busca automaticamente o número do contato pelo nome no CRM. Usa o WhatsApp conectado do usuário. Se não tiver conectado, informe ao usuário que ele pode conectar ou usar o WhatsApp da Ellosuit (use_ellosuit=true).",
      parameters: {
        type: "object",
        properties: {
          contact_name: { type: "string", description: "Nome do contato (busca no CRM)" },
          phone: { type: "string", description: "Número do telefone direto (se já souber, ex: 5541999999999)" },
          message: { type: "string", description: "Texto da mensagem a enviar" },
          use_ellosuit: { type: "boolean", description: "Se true, envia pelo WhatsApp da Ellosuit ao invés do WhatsApp do usuário" }
        },
        required: ["message"]
      }
    }
  },

  // === BOOKING ===
  {
    type: "function",
    function: {
      name: "list_booking_links",
      description: "Listar links de agendamento online",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // === CONNECT WHATSAPP ===
  {
    type: "function",
    function: {
      name: "connect_whatsapp",
      description: "Conectar um número de WhatsApp gerando QR Code para escaneamento. Use quando o usuário quer conectar o WhatsApp dele.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // === CRIAR AUTOMAÇÃO ===
  {
    type: "function",
    function: {
      name: "create_automation",
      description: "Criar uma nova automação no sistema. O usuário descreve o que quer automatizar e a IA monta os nodes e edges.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome da automação" },
          description: { type: "string", description: "Descrição do que a automação faz" },
          trigger_type: { type: "string", enum: ["new_client", "new_event", "form_submit", "tag_added", "manual"], description: "Tipo de gatilho" },
          actions: {
            type: "array",
            description: "Lista de ações a executar",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["send_email", "send_whatsapp", "create_task", "add_tag", "wait", "notify"], description: "Tipo da ação" },
                config: { type: "object", description: "Configurações da ação (template, message, delay, etc.)" }
              }
            }
          }
        },
        required: ["name", "trigger_type"]
      }
    }
  },

  // === CRIAR CHATBOT ===
  {
    type: "function",
    function: {
      name: "create_chatbot",
      description: "Criar um novo fluxo de chatbot para WhatsApp. O usuário descreve o fluxo e a IA monta os blocos.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do chatbot" },
          description: { type: "string", description: "Descrição do fluxo" },
          trigger: { type: "string", enum: ["whatsapp_channel", "keyword", "conversation_start"], description: "Tipo de gatilho" },
          steps: {
            type: "array",
            description: "Passos do fluxo do chatbot",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["message", "buttons", "wait_response", "condition", "transfer_human", "transfer_ai_agent", "set_variable"], description: "Tipo do bloco" },
                content: { type: "string", description: "Texto da mensagem ou condição" },
                options: { type: "array", items: { type: "string" }, description: "Opções para botões" }
              }
            }
          }
        },
        required: ["name", "trigger"]
      }
    }
  },

  // === CRIAR AGENTE DE IA ===
  {
    type: "function",
    function: {
      name: "create_ai_agent",
      description: "Criar um novo agente de IA. O usuário descreve o perfil, personalidade e instruções do agente.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do agente" },
          description: { type: "string", description: "Descrição breve do agente" },
          personality: { type: "string", description: "Personalidade do agente (ex: profissional, amigável, técnico)" },
          instructions: { type: "string", description: "Instruções detalhadas de como o agente deve se comportar e responder" },
          model: { type: "string", enum: ["google/gemini-3-flash-preview", "google/gemini-2.5-flash", "google/gemini-2.5-pro"], description: "Modelo de IA (padrão: gemini-3-flash-preview)" }
        },
        required: ["name", "personality", "instructions"]
      }
    }
  },

  // === DASHBOARD SUMMARY ===
  {
    type: "function",
    function: {
      name: "get_dashboard_summary",
      description: "Resumo geral: contatos, eventos hoje, tarefas, propostas, etc.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // === REQUEST FILE ===
  {
    type: "function",
    function: {
      name: "request_file",
      description: "Pedir que o usuário anexe um arquivo",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string" },
          purpose: { type: "string", enum: ["save_to_drive", "import_contacts", "general"] },
          folder_name: { type: "string" }
        },
        required: ["message", "purpose"]
      }
    }
  },

  // === IMPORT CONTACTS ===
  {
    type: "function",
    function: {
      name: "import_contacts",
      description: "Importar contatos de arquivo CSV/XLSX",
      parameters: {
        type: "object",
        properties: { target: { type: "string", enum: ["cadastros", "email_marketing", "disparos"] } },
        required: ["target"]
      }
    }
  },
];

// ============== TOOL EXECUTION ==============
type ToolContext = {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  companyId: string;
  fileUrl?: string;
  fileName?: string;
};

async function executeTool(toolName: string, args: Record<string, unknown>, context: ToolContext): Promise<{ result: string; action?: any }> {
  const { supabase, userId, companyId, fileUrl, fileName } = context;

  switch (toolName) {

    // ==================== TAREFAS ====================
    case 'list_tasks': {
      let query = supabase.from('calendar_events')
        .select('id, title, description, status, start_date, event_type')
        .eq('company_id', companyId).eq('event_type', 'reminder')
        .order('start_date', { ascending: false }).limit(15);
      const status = args.status as string;
      if (status && status !== 'all') query = query.eq('status', status);
      const { data, error } = await query;
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhuma tarefa encontrada.' };
      return {
        result: `Tarefas (${data.length}):\n` + data.map((t: any, i: number) =>
          `${i + 1}. "${t.title}" - Status: ${t.status || 'pending'}${t.start_date ? `, Data: ${new Date(t.start_date).toLocaleDateString('pt-BR')}` : ''}`
        ).join('\n'),
        action: { action: 'list_tasks', data }
      };
    }

    case 'create_task': {
      const dueDate = (args.due_date as string) || new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.from('calendar_events').insert({
        title: args.title as string, description: (args.description as string) || null,
        start_date: `${dueDate}T08:00:00`, end_date: `${dueDate}T08:30:00`,
        event_type: 'reminder', status: 'pending', source: 'assistant',
        company_id: companyId, created_by: userId,
      }).select('id, title').single();
      if (error) return { result: `Erro ao criar tarefa: ${error.message}` };
      return {
        result: `✅ Tarefa "${data.title}" criada para ${dueDate}!`,
        action: { action: 'task_created', data }
      };
    }

    case 'update_task': {
      const { data: tasks } = await supabase.from('calendar_events')
        .select('id, title').eq('company_id', companyId).eq('event_type', 'reminder')
        .ilike('title', `%${args.task_title}%`).limit(1).single();
      if (!tasks) return { result: `Tarefa "${args.task_title}" não encontrada.` };
      const updates: any = {};
      if (args.new_title) updates.title = args.new_title;
      if (args.new_status) updates.status = args.new_status;
      if (args.new_description) updates.description = args.new_description;
      const { error } = await supabase.from('calendar_events').update(updates).eq('id', tasks.id);
      if (error) return { result: `Erro: ${error.message}` };
      return { result: `✅ Tarefa "${tasks.title}" atualizada!`, action: { action: 'task_updated' } };
    }

    case 'delete_task': {
      const { data: task } = await supabase.from('calendar_events')
        .select('id, title').eq('company_id', companyId).eq('event_type', 'reminder')
        .ilike('title', `%${args.task_title}%`).limit(1).single();
      if (!task) return { result: `Tarefa "${args.task_title}" não encontrada.` };
      const { error } = await supabase.from('calendar_events').delete().eq('id', task.id);
      if (error) return { result: `Erro: ${error.message}` };
      return { result: `✅ Tarefa "${task.title}" excluída!`, action: { action: 'task_deleted' } };
    }

    // ==================== AGENDA ====================
    case 'list_calendar_events': {
      const daysAhead = (args.days_ahead as number) || 7;
      const now = new Date();
      const end = new Date(now.getTime() + daysAhead * 86400000);
      const { data, error } = await supabase.from('calendar_events')
        .select('id, title, start_date, end_date, description, event_type, meeting_link, meeting_provider')
        .eq('company_id', companyId)
        .gte('start_date', now.toISOString()).lte('start_date', end.toISOString())
        .order('start_date', { ascending: true }).limit(20);
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: `Nenhum evento nos próximos ${daysAhead} dias.` };
      return {
        result: `Eventos (${data.length}):\n` + data.map((e: any, i: number) => {
          const s = new Date(e.start_date);
          let line = `${i + 1}. "${e.title}" - ${s.toLocaleDateString('pt-BR')} às ${s.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
          if (e.meeting_link) line += `\n   🔗 Link: ${e.meeting_link}`;
          return line;
        }).join('\n'),
        action: { action: 'list_events', data }
      };
    }

    case 'create_calendar_event': {
      const eventType = (args.event_type as string) || 'meeting';
      // Generate Ellomeeting link for meetings
      let meetingLink: string | null = null;
      if (eventType === 'meeting') {
        const roomCode = crypto.randomUUID().split('-')[0];
        meetingLink = `https://www.ellosuit.online/meet/${roomCode}`;
      }
      const insertData: any = {
        title: args.title as string, start_date: args.start_date as string,
        end_date: args.end_date as string, description: (args.description as string) || null,
        event_type: eventType, status: 'pending', source: 'assistant',
        company_id: companyId, created_by: userId,
      };
      if (meetingLink) {
        insertData.meeting_link = meetingLink;
        insertData.meeting_provider = 'ellosuit';
      }
      const { data, error } = await supabase.from('calendar_events').insert(insertData).select('id, title, start_date, meeting_link').single();
      if (error) return { result: `Erro ao criar evento: ${error.message}` };
      const s = new Date(data.start_date);
      const dateStr = s.toLocaleDateString('pt-BR');
      const timeStr = s.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      let resultText = `✅ Evento "${data.title}" criado para ${dateStr} às ${timeStr}!`;
      if (data.meeting_link) {
        resultText += `\nLink da reunião: ${data.meeting_link}`;
      }
      return {
        result: resultText,
        action: { action: 'event_created', data, navigate: '/dashboard/agenda' }
      };
    }

    case 'delete_calendar_event': {
      const { data: ev } = await supabase.from('calendar_events')
        .select('id, title').eq('company_id', companyId)
        .ilike('title', `%${args.event_title}%`).limit(1).single();
      if (!ev) return { result: `Evento "${args.event_title}" não encontrado.` };
      const { error } = await supabase.from('calendar_events').delete().eq('id', ev.id);
      if (error) return { result: `Erro: ${error.message}` };
      return { result: `✅ Evento "${ev.title}" excluído!`, action: { action: 'event_deleted' } };
    }

    // ==================== CONTATOS ====================
    case 'list_contacts': {
      let query = supabase.from('clients')
        .select('id, name, email, phone, company_name, status')
        .eq('company_id', companyId).order('created_at', { ascending: false })
        .limit((args.limit as number) || 10);
      if (args.search) query = query.or(`name.ilike.%${args.search}%,email.ilike.%${args.search}%,phone.ilike.%${args.search}%`);
      const { data, error } = await query;
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhum contato encontrado.' };
      return {
        result: `Contatos (${data.length}):\n` + data.map((c: any, i: number) =>
          `${i + 1}. ${c.name}${c.email ? ` - ${c.email}` : ''}${c.phone ? ` - ${c.phone}` : ''}`
        ).join('\n'),
        action: { action: 'list_contacts', data }
      };
    }

    case 'create_contact': {
      const { data, error } = await supabase.from('clients').insert({
        name: args.name as string, email: (args.email as string) || null,
        phone: (args.phone as string) || null, company_name: (args.company_name as string) || null,
        notes: (args.notes as string) || null, company_id: companyId, created_by: userId,
      }).select('id, name').single();
      if (error) return { result: `Erro: ${error.message}` };
      return {
        result: `✅ Contato "${data.name}" criado com sucesso!`,
        action: { action: 'contact_created', data, navigate: '/dashboard/cadastros' }
      };
    }

    case 'update_contact': {
      const { data: contact } = await supabase.from('clients')
        .select('id, name').eq('company_id', companyId)
        .ilike('name', `%${args.contact_name}%`).limit(1).single();
      if (!contact) return { result: `Contato "${args.contact_name}" não encontrado.` };
      const updates: any = {};
      if (args.new_name) updates.name = args.new_name;
      if (args.new_email) updates.email = args.new_email;
      if (args.new_phone) updates.phone = args.new_phone;
      if (args.new_notes) updates.notes = args.new_notes;
      if (args.new_status) updates.status = args.new_status;
      const { error } = await supabase.from('clients').update(updates).eq('id', contact.id);
      if (error) return { result: `Erro: ${error.message}` };
      return { result: `✅ Contato "${contact.name}" atualizado!`, action: { action: 'contact_updated' } };
    }

    case 'delete_contact': {
      const { data: contact } = await supabase.from('clients')
        .select('id, name').eq('company_id', companyId)
        .ilike('name', `%${args.contact_name}%`).limit(1).single();
      if (!contact) return { result: `Contato "${args.contact_name}" não encontrado.` };
      const { error } = await supabase.from('clients').delete().eq('id', contact.id);
      if (error) return { result: `Erro: ${error.message}` };
      return { result: `✅ Contato "${contact.name}" excluído!`, action: { action: 'contact_deleted' } };
    }

    // ==================== DRIVE ====================
    case 'save_to_drive': {
      if (!fileUrl || !fileName) return { result: 'Nenhum arquivo anexado para salvar.', action: { action: 'request_file', purpose: 'save_to_drive' } };
      let folderId: string | null = null;
      if (args.folder_name) {
        const { data: f } = await supabase.from('document_folders').select('id')
          .eq('company_id', companyId).eq('name', args.folder_name as string).is('parent_folder_id', null).maybeSingle();
        if (f) { folderId = f.id; }
        else if (args.create_folder !== false) {
          const { data: nf } = await supabase.from('document_folders')
            .insert({ name: args.folder_name as string, company_id: companyId, created_by: userId })
            .select('id').single();
          if (nf) folderId = nf.id;
        }
      }
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const typeMap: Record<string, string> = { pdf:'pdf', doc:'doc', docx:'doc', xls:'spreadsheet', xlsx:'spreadsheet', csv:'spreadsheet', png:'image', jpg:'image', jpeg:'image', gif:'image', webp:'image', mp4:'video', mp3:'audio' };
      const { data: doc, error } = await supabase.from('documents').insert({
        name: fileName, file_type: typeMap[ext] || 'other', file_url: fileUrl,
        company_id: companyId, created_by: userId, folder_id: folderId,
      }).select('id').single();
      if (error) return { result: `Erro ao salvar: ${error.message}` };
      const folderMsg = args.folder_name ? ` na pasta "${args.folder_name}"` : '';
      return {
        result: `✅ Arquivo "${fileName}" salvo no Drive${folderMsg}!`,
        action: { action: 'saved_to_drive', documentId: doc.id, navigate: '/dashboard/drive' }
      };
    }

    case 'list_documents': {
      let query = supabase.from('documents')
        .select('id, name, file_type, created_at')
        .eq('company_id', companyId).order('created_at', { ascending: false })
        .limit((args.limit as number) || 10);
      if (args.folder_name) {
        const { data: folder } = await supabase.from('document_folders').select('id')
          .eq('company_id', companyId).ilike('name', args.folder_name as string).maybeSingle();
        if (folder) query = query.eq('folder_id', folder.id);
      }
      const { data, error } = await query;
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhum documento encontrado.' };
      return {
        result: `Documentos (${data.length}):\n` + data.map((d: any, i: number) =>
          `${i + 1}. ${d.name} (${d.file_type}) - ${new Date(d.created_at).toLocaleDateString('pt-BR')}`
        ).join('\n'),
        action: { action: 'list_documents', data }
      };
    }

    case 'create_folder': {
      const { data, error } = await supabase.from('document_folders')
        .insert({ name: args.folder_name as string, company_id: companyId, created_by: userId })
        .select('id, name').single();
      if (error) return { result: `Erro: ${error.message}` };
      return { result: `✅ Pasta "${data.name}" criada!`, action: { action: 'folder_created', navigate: '/dashboard/drive' } };
    }

    case 'list_folders': {
      const { data, error } = await supabase.from('document_folders')
        .select('id, name, description').eq('company_id', companyId).order('name');
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhuma pasta encontrada.' };
      return {
        result: `Pastas (${data.length}):\n` + data.map((f: any, i: number) => `${i + 1}. ${f.name}`).join('\n'),
        action: { action: 'list_folders', data }
      };
    }

    // ==================== NAVEGAÇÃO ====================
    case 'navigate': {
      return { result: `Abrindo ${args.label}...`, action: { action: 'navigate', path: args.path, label: args.label } };
    }

    // ==================== SERVIÇOS ====================
    case 'list_services': {
      let query = supabase.from('company_services')
        .select('id, name, unit_price, category, is_active')
        .eq('company_id', companyId).order('name');
      if (args.search) query = query.ilike('name', `%${args.search}%`);
      const { data, error } = await query;
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhum serviço cadastrado.' };
      return {
        result: `Serviços (${data.length}):\n` + data.map((s: any, i: number) =>
          `${i + 1}. ${s.name} - R$${s.unit_price}${s.category ? ` (${s.category})` : ''}`
        ).join('\n'),
        action: { action: 'list_services', data }
      };
    }

    case 'create_service': {
      const { data, error } = await supabase.from('company_services').insert({
        name: args.name as string, unit_price: args.unit_price as number,
        description: (args.description as string) || null, category: (args.category as string) || null,
        company_id: companyId, created_by: userId,
      }).select('id, name').single();
      if (error) return { result: `Erro: ${error.message}` };
      return { result: `✅ Serviço "${data.name}" cadastrado!`, action: { action: 'service_created' } };
    }

    // ==================== ASSINATURA ====================
    case 'check_subscription': {
      const { data: sub } = await supabase.from('subscriptions')
        .select('plan_type, status, monthly_price, trial_ends_at, current_period_end')
        .eq('company_id', companyId).single();
      if (!sub) return { result: 'Assinatura não encontrada.' };
      const { data: modules } = await supabase.from('subscription_modules')
        .select('module_type, is_active').eq('company_id', companyId);
      const active = (modules || []).filter((m: any) => m.is_active).map((m: any) => m.module_type);
      return {
        result: [
          `Plano: ${sub.plan_type}`, `Status: ${sub.status}`, `Valor: R$${sub.monthly_price}/mês`,
          active.length ? `Módulos: ${active.join(', ')}` : 'Sem módulos extras',
        ].join('\n'),
        action: { action: 'subscription_info' }
      };
    }

    // ==================== PROPOSTAS/CONTRATOS/RECIBOS ====================
    case 'list_proposals': {
      let query = supabase.from('proposals')
        .select('id, proposal_number, title, status, total_value, created_at')
        .eq('company_id', companyId).order('created_at', { ascending: false })
        .limit((args.limit as number) || 10);
      if (args.status && args.status !== 'all') query = query.eq('status', args.status as string);
      const { data, error } = await query;
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhuma proposta encontrada.' };
      return {
        result: `Propostas (${data.length}):\n` + data.map((p: any, i: number) =>
          `${i + 1}. ${p.proposal_number} - "${p.title}" - R$${p.total_value || 0} - ${p.status}`
        ).join('\n'),
        action: { action: 'list_proposals', data }
      };
    }

    case 'list_contracts': {
      let query = supabase.from('generated_contracts')
        .select('id, title, status, created_at')
        .eq('company_id', companyId).order('created_at', { ascending: false })
        .limit((args.limit as number) || 10);
      if (args.status && args.status !== 'all') query = query.eq('status', args.status as string);
      const { data, error } = await query;
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhum contrato encontrado.' };
      return {
        result: `Contratos (${data.length}):\n` + data.map((c: any, i: number) =>
          `${i + 1}. "${c.title}" - ${c.status} - ${new Date(c.created_at).toLocaleDateString('pt-BR')}`
        ).join('\n'),
        action: { action: 'list_contracts', data }
      };
    }

    case 'list_receipts': {
      const { data, error } = await supabase.from('receipts')
        .select('id, receipt_number, description, amount, status, created_at')
        .eq('company_id', companyId).order('created_at', { ascending: false })
        .limit((args.limit as number) || 10);
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhum recibo encontrado.' };
      return {
        result: `Recibos (${data.length}):\n` + data.map((r: any, i: number) =>
          `${i + 1}. ${r.receipt_number} - R$${r.amount} - ${r.status}`
        ).join('\n'),
        action: { action: 'list_receipts', data }
      };
    }

    // ==================== EMAIL ====================
    case 'list_email_templates': {
      const { data, error } = await supabase.from('email_templates')
        .select('id, name, category, is_active')
        .eq('company_id', companyId).eq('is_active', true).order('name');
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhum template encontrado.' };
      return {
        result: `Templates (${data.length}):\n` + data.map((t: any, i: number) => `${i + 1}. "${t.name}" - ${t.category}`).join('\n'),
        action: { action: 'list_templates', data }
      };
    }

    case 'list_sent_emails': {
      const { data, error } = await supabase.from('emails')
        .select('id, subject, recipient_email, status, open_count, sent_at')
        .eq('company_id', companyId).order('sent_at', { ascending: false })
        .limit((args.limit as number) || 10);
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhum email enviado.' };
      return {
        result: `Emails (${data.length}):\n` + data.map((e: any, i: number) =>
          `${i + 1}. "${e.subject}" → ${e.recipient_email} ${e.open_count ? `(${e.open_count}x aberto)` : ''}`
        ).join('\n'),
        action: { action: 'list_emails', data }
      };
    }

    // ==================== AUTOMAÇÕES ====================
    case 'list_automations': {
      const { data, error } = await supabase.from('automations')
        .select('id, name, is_active, trigger_type, execution_count')
        .eq('company_id', companyId).order('name');
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhuma automação configurada.' };
      return {
        result: `Automações (${data.length}):\n` + data.map((a: any, i: number) =>
          `${i + 1}. "${a.name}" - ${a.is_active ? 'Ativa' : 'Inativa'} - ${a.execution_count || 0} execuções`
        ).join('\n'),
        action: { action: 'list_automations', data }
      };
    }

    case 'toggle_automation': {
      const { data: auto } = await supabase.from('automations')
        .select('id, name').eq('company_id', companyId)
        .ilike('name', `%${args.automation_name}%`).limit(1).single();
      if (!auto) return { result: `Automação "${args.automation_name}" não encontrada.` };
      const { error } = await supabase.from('automations').update({ is_active: args.active as boolean }).eq('id', auto.id);
      if (error) return { result: `Erro: ${error.message}` };
      return { result: `✅ Automação "${auto.name}" ${args.active ? 'ativada' : 'desativada'}!`, action: { action: 'automation_toggled' } };
    }

    // ==================== CHATBOTS ====================
    case 'list_chatbots': {
      const { data, error } = await supabase.from('chatbot_flows')
        .select('id, name, is_active, execution_count')
        .eq('company_id', companyId).order('name');
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhum chatbot configurado.' };
      return {
        result: `Chatbots (${data.length}):\n` + data.map((c: any, i: number) =>
          `${i + 1}. "${c.name}" - ${c.is_active ? 'Ativo' : 'Inativo'}`
        ).join('\n'),
        action: { action: 'list_chatbots', data }
      };
    }

    case 'toggle_chatbot': {
      const { data: bot } = await supabase.from('chatbot_flows')
        .select('id, name').eq('company_id', companyId)
        .ilike('name', `%${args.chatbot_name}%`).limit(1).single();
      if (!bot) return { result: `Chatbot "${args.chatbot_name}" não encontrado.` };
      const { error } = await supabase.from('chatbot_flows').update({ is_active: args.active as boolean }).eq('id', bot.id);
      if (error) return { result: `Erro: ${error.message}` };
      return { result: `✅ Chatbot "${bot.name}" ${args.active ? 'ativado' : 'desativado'}!`, action: { action: 'chatbot_toggled' } };
    }

    // ==================== AGENTES IA ====================
    case 'list_ai_agents': {
      const { data, error } = await supabase.from('ai_agents')
        .select('id, name, is_active, model, whatsapp_enabled')
        .eq('company_id', companyId).order('name');
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhum agente de IA configurado.' };
      return {
        result: `Agentes (${data.length}):\n` + data.map((a: any, i: number) =>
          `${i + 1}. "${a.name}" - ${a.is_active ? 'Ativo' : 'Inativo'}${a.whatsapp_enabled ? ' - WhatsApp ✅' : ''}`
        ).join('\n'),
        action: { action: 'list_agents', data }
      };
    }

    case 'send_whatsapp_message': {
      const contactName = args.contact_name as string | undefined;
      let phone = args.phone as string | undefined;
      const msgText = args.message as string;
      const useEllosuit = args.use_ellosuit as boolean | undefined;

      // If no phone provided, search CRM by contact name
      if (!phone && contactName) {
        const { data: contact } = await supabase.from('clients')
          .select('name, phone, whatsapp')
          .eq('company_id', companyId)
          .ilike('name', `%${contactName}%`)
          .limit(1).single();
        if (contact) {
          phone = contact.whatsapp || contact.phone || undefined;
          if (!phone) return { result: `Contato "${contact.name}" encontrado, mas não possui telefone/WhatsApp cadastrado.` };
        } else {
          return { result: `Contato "${contactName}" não encontrado no CRM. Informe o número diretamente ou verifique o nome.` };
        }
      }

      if (!phone) return { result: 'Informe o nome do contato ou o número de telefone para enviar a mensagem.' };

      // Clean phone number
      const cleanPhone = phone.replace(/\D/g, '');

      let session: any = null;

      if (useEllosuit) {
        // Use Ellosuit admin session - find the admin company's connected session
        const { data: adminUser } = await supabase.from('company_users')
          .select('company_id')
          .eq('role', 'adminmaster')
          .limit(1).single();
        
        if (adminUser) {
          const { data: elloSession } = await supabase.from('whatsapp_sessions')
            .select('id, instance_name, status, phone_number, baileys_server_url')
            .eq('company_id', adminUser.company_id)
            .eq('status', 'connected')
            .order('connected_at', { ascending: false })
            .limit(1).single();
          session = elloSession;
        }
        
        if (!session) {
          // Fallback: find any connected session from admin email company
          const { data: fallbackSessions } = await supabase.from('whatsapp_sessions')
            .select('id, instance_name, status, phone_number, baileys_server_url')
            .eq('status', 'connected')
            .order('connected_at', { ascending: false })
            .limit(1);
          session = fallbackSessions?.[0] || null;
        }

        if (!session) {
          return { result: '❌ O WhatsApp da Ellosuit não está disponível no momento. Tente conectar seu próprio número.' };
        }
      } else {
        // Use user's company session
        const { data: sessions } = await supabase.from('whatsapp_sessions')
          .select('id, instance_name, status, phone_number, baileys_server_url')
          .eq('company_id', companyId)
          .eq('status', 'connected')
          .order('connected_at', { ascending: false });

        session = sessions?.[0] || null;

        if (!session) {
          return {
            result: `⚠️ Seu WhatsApp não está conectado no momento. Você tem duas opções:\n1. Conectar seu WhatsApp no CRM\n2. Posso enviar pelo WhatsApp da Ellosuit\n\nQual prefere?`,
            action: { action: 'navigate', path: '/dashboard/crm-whatsapp', label: 'Conectar WhatsApp' }
          };
        }
      }

      const baileysUrl = (session.baileys_server_url || Deno.env.get('BAILEYS_SERVER_URL') || '').replace(/\/+$/, '');
      if (!baileysUrl) {
        return { result: '❌ Servidor WhatsApp não configurado. Contate o suporte.' };
      }

      try {
        // Resolve JID (handle Brazilian 9th digit)
        let jid = `${cleanPhone}@s.whatsapp.net`;
        try {
          const checkRes = await fetch(`${baileysUrl}/api/number/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName: session.instance_name, phone: cleanPhone }),
          });
          const checkData = await checkRes.json();
          if (checkData?.exists && checkData?.jid) {
            jid = checkData.jid;
          }
        } catch (e) {
          console.log('[send_whatsapp] JID check failed, using fallback:', e);
        }

        // Send message
        const sendRes = await fetch(`${baileysUrl}/api/message/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instanceName: session.instance_name,
            jid,
            message: { text: msgText },
          }),
        });

        const sendText = await sendRes.text();
        let sendData: any;
        try { sendData = JSON.parse(sendText); } catch { sendData = null; }

        if (sendRes.ok && sendData) {
          return {
            result: `✅ Mensagem enviada com sucesso para ${contactName || cleanPhone} via WhatsApp!`,
            action: { action: 'whatsapp_sent', phone: cleanPhone }
          };
        } else {
          return { result: `❌ Erro ao enviar: ${sendText.substring(0, 200)}` };
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        return { result: `❌ Erro ao enviar mensagem: ${errMsg}` };
      }
    }

    // ==================== WHATSAPP ====================
    case 'list_whatsapp_conversations': {
      let query = supabase.from('whatsapp_conversations')
        .select('id, contact_name, contact_phone, last_message, last_message_at, unread_count')
        .eq('company_id', companyId).order('last_message_at', { ascending: false })
        .limit((args.limit as number) || 10);
      if (args.unread_only) query = query.gt('unread_count', 0);
      const { data, error } = await query;
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhuma conversa encontrada.' };
      return {
        result: `Conversas (${data.length}):\n` + data.map((c: any, i: number) =>
          `${i + 1}. ${c.contact_name || c.contact_phone}${c.unread_count ? ` (${c.unread_count} não lidas)` : ''}`
        ).join('\n'),
        action: { action: 'list_conversations', data, navigate: '/dashboard/crm-whatsapp' }
      };
    }

    // ==================== BOOKING ====================
    case 'list_booking_links': {
      const { data, error } = await supabase.from('booking_links')
        .select('id, title, link_slug, duration_minutes, is_active')
        .eq('company_id', companyId).order('title');
      if (error) return { result: `Erro: ${error.message}` };
      if (!data?.length) return { result: 'Nenhum link de agendamento.' };
      return {
        result: `Links (${data.length}):\n` + data.map((b: any, i: number) =>
          `${i + 1}. "${b.title}" - ${b.duration_minutes}min - ${b.is_active ? 'Ativo' : 'Inativo'}`
        ).join('\n'),
        action: { action: 'list_booking', data }
      };
    }

    // ==================== DASHBOARD SUMMARY ====================
    case 'get_dashboard_summary': {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const [contacts, todayEvents, pendingTasks, proposals, docs, unreadChats] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('calendar_events').select('id, title, start_date').eq('company_id', companyId)
          .gte('start_date', todayStart).lt('start_date', todayEnd).order('start_date'),
        supabase.from('calendar_events').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).eq('event_type', 'reminder').eq('status', 'pending'),
        supabase.from('proposals').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).eq('status', 'sent'),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('whatsapp_conversations').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).gt('unread_count', 0),
      ]);
      const evList = (todayEvents.data || []).map((e: any) =>
        `  - ${new Date(e.start_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ${e.title}`
      ).join('\n');
      return {
        result: [
          `📊 Resumo do dia:`,
          `👥 Contatos: ${contacts.count || 0}`,
          `📋 Tarefas pendentes: ${pendingTasks.count || 0}`,
          `📄 Propostas enviadas: ${proposals.count || 0}`,
          `📁 Documentos: ${docs.count || 0}`,
          `💬 Conversas não lidas: ${unreadChats.count || 0}`,
          todayEvents.data?.length ? `\n📅 Eventos hoje:\n${evList}` : '📅 Nenhum evento hoje.',
        ].join('\n'),
        action: { action: 'dashboard_summary' }
      };
    }

    // ==================== REQUEST FILE ====================
    case 'request_file': {
      return {
        result: args.message as string,
        action: { action: 'request_file', purpose: args.purpose, folder_name: args.folder_name }
      };
    }

    // ==================== IMPORT CONTACTS ====================
    case 'import_contacts': {
      const targetMap: Record<string, string> = {
        'cadastros': '/dashboard/cadastros',
        'email_marketing': '/dashboard/email',
        'disparos': '/dashboard/disparos',
      };
      return {
        result: `Preparando importação para ${args.target}...`,
        action: { action: 'import_contacts', path: targetMap[(args.target as string)] || '/dashboard/cadastros', target: args.target, fileUrl, fileName }
      };
    }

    // ==================== CONNECT WHATSAPP ====================
    case 'connect_whatsapp': {
      // Check if already connected
      const { data: existingSessions } = await supabase.from('whatsapp_sessions')
        .select('id, instance_name, status, phone_number')
        .eq('company_id', companyId)
        .eq('status', 'connected');
      
      if (existingSessions?.length) {
        return {
          result: `✅ Seu WhatsApp já está conectado! Número: ${existingSessions[0].phone_number || 'N/A'}`,
          action: { action: 'whatsapp_already_connected', session: existingSessions[0] }
        };
      }

      const BAILEYS_URL_ENV = Deno.env.get('BAILEYS_SERVER_URL') || '';
      const SUPABASE_URL_ENV = Deno.env.get('SUPABASE_URL') || '';

      // Create new instance
      const instanceName = `assistant-${companyId.substring(0, 8)}-${Date.now()}`;
      const webhookSecret = crypto.randomUUID();
      const webhookUrl = `${SUPABASE_URL_ENV}/functions/v1/whatsapp-webhook`;

      const { data: session, error: sessionErr } = await supabase
        .from('whatsapp_sessions')
        .insert({
          company_id: companyId,
          user_id: userId,
          instance_name: instanceName,
          status: 'connecting',
          webhook_secret: webhookSecret,
          baileys_server_url: BAILEYS_URL_ENV,
          settings: { webhook_url: webhookUrl, created_from: 'ai-assistant' }
        })
        .select()
        .single();

      if (sessionErr) return { result: `❌ Erro ao criar sessão: ${sessionErr.message}` };

      // Create instance on Baileys server
      let qrCode: string | null = null;
      try {
        const baileysRes = await fetch(`${BAILEYS_URL_ENV}/api/instance/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id, instanceName, webhookUrl, webhookSecret }),
        });
        const baileysData = await baileysRes.json();
        if (baileysData?.qrCode) {
          qrCode = baileysData.qrCode;
          await supabase.from('whatsapp_sessions').update({ qr_code: qrCode }).eq('id', session.id);
        }
      } catch (e) {
        console.error('[connect_whatsapp] Baileys error:', e);
      }

      // If no QR yet, try fetching it
      if (!qrCode) {
        await new Promise(r => setTimeout(r, 3000));
        try {
          const qrRes = await fetch(`${BAILEYS_URL_ENV}/api/instance/qr?instanceName=${instanceName}`);
          const qrData = await qrRes.json();
          if (qrData?.qrCode) {
            qrCode = qrData.qrCode;
            await supabase.from('whatsapp_sessions').update({ qr_code: qrCode }).eq('id', session.id);
          }
        } catch (e) {
          console.error('[connect_whatsapp] QR fetch error:', e);
        }
      }

      return {
        result: qrCode 
          ? `📱 Escaneie o QR Code abaixo com seu WhatsApp para conectar!`
          : `⏳ Estou gerando o QR Code... Isso pode levar alguns segundos. Tente novamente em instantes.`,
        action: { 
          action: 'whatsapp_qr_code', 
          qrCode, 
          sessionId: session.id 
        }
      };
    }

    // ==================== CREATE AUTOMATION ====================
    case 'create_automation': {
      const triggerType = (args.trigger_type as string) || 'manual';
      const actions = (args.actions as any[]) || [];
      
      // Build nodes and edges for the automation
      const nodes: any[] = [];
      const edges: any[] = [];
      
      // Trigger node
      const triggerId = crypto.randomUUID();
      nodes.push({
        id: triggerId,
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { 
          label: `Gatilho: ${triggerType}`,
          triggerType,
          config: {}
        }
      });

      let prevNodeId = triggerId;
      let yPos = 200;
      
      for (const action of actions) {
        const nodeId = crypto.randomUUID();
        nodes.push({
          id: nodeId,
          type: 'action',
          position: { x: 250, y: yPos },
          data: {
            label: action.type || 'Ação',
            actionType: action.type,
            config: action.config || {}
          }
        });
        edges.push({
          id: `e-${prevNodeId}-${nodeId}`,
          source: prevNodeId,
          target: nodeId
        });
        prevNodeId = nodeId;
        yPos += 150;
      }

      const { data: automation, error } = await supabase.from('automations').insert({
        name: args.name as string,
        description: (args.description as string) || null,
        trigger_type: triggerType,
        nodes,
        edges,
        is_active: false,
        company_id: companyId,
        created_by: userId,
      }).select('id, name').single();

      if (error) return { result: `❌ Erro ao criar automação: ${error.message}` };
      
      return {
        result: `✅ Automação "${automation.name}" criada com ${nodes.length} blocos! Está desativada por padrão - ative quando estiver pronta.`,
        action: { action: 'automation_created', data: automation, navigate: '/dashboard/automacoes' }
      };
    }

    // ==================== CREATE CHATBOT ====================
    case 'create_chatbot': {
      const trigger = (args.trigger as string) || 'whatsapp_channel';
      const steps = (args.steps as any[]) || [];
      
      const nodes: any[] = [];
      const edgesArr: any[] = [];

      // Trigger node
      const triggerId = crypto.randomUUID();
      nodes.push({
        id: triggerId,
        type: 'trigger',
        subType: trigger,
        position: { x: 250, y: 50 },
        data: { label: 'Gatilho', config: { triggerType: trigger } }
      });

      let prevNodeId = triggerId;
      let yPos = 200;

      for (const step of steps) {
        const nodeId = crypto.randomUUID();
        const nodeType = step.type === 'buttons' ? 'message' : 
                         step.type === 'wait_response' ? 'delay' :
                         step.type === 'condition' ? 'condition' :
                         step.type === 'transfer_human' || step.type === 'transfer_ai_agent' ? 'action' :
                         step.type === 'set_variable' ? 'action' : 'message';
        const subType = step.type === 'buttons' ? 'buttons' : 
                        step.type === 'wait_response' ? 'wait_response' : 
                        step.type || 'text';

        nodes.push({
          id: nodeId,
          type: nodeType,
          subType,
          position: { x: 250, y: yPos },
          data: { 
            label: step.content || step.type,
            config: {
              message: step.content,
              buttons: step.options?.map((opt: string, i: number) => ({ id: `btn-${i}`, label: opt })) || [],
            }
          }
        });
        edgesArr.push({
          id: `e-${prevNodeId}-${nodeId}`,
          source: prevNodeId,
          target: nodeId
        });
        prevNodeId = nodeId;
        yPos += 150;
      }

      const { data: chatbot, error } = await supabase.from('chatbot_flows').insert({
        name: args.name as string,
        description: (args.description as string) || null,
        nodes,
        edges: edgesArr,
        trigger_config: { triggerType: trigger },
        is_active: false,
        company_id: companyId,
        created_by: userId,
      }).select('id, name').single();

      if (error) return { result: `❌ Erro ao criar chatbot: ${error.message}` };
      
      return {
        result: `✅ Chatbot "${chatbot.name}" criado com ${nodes.length} blocos! Está desativado por padrão - ative quando estiver pronto.`,
        action: { action: 'chatbot_created', data: chatbot, navigate: '/dashboard/chatbot-builder' }
      };
    }

    // ==================== CREATE AI AGENT ====================
    case 'create_ai_agent': {
      const { data: agent, error } = await supabase.from('ai_agents').insert({
        name: args.name as string,
        description: (args.description as string) || null,
        personality: (args.personality as string) || 'Assistente profissional e amigável',
        instructions: (args.instructions as string) || 'Responda de forma clara e útil.',
        model: (args.model as string) || 'google/gemini-3-flash-preview',
        is_active: true,
        company_id: companyId,
        created_by: userId,
        settings: { temperature: 0.7, maxResponseChars: 500 },
      }).select('id, name').single();

      if (error) return { result: `❌ Erro ao criar agente: ${error.message}` };
      
      return {
        result: `✅ Agente de IA "${agent.name}" criado com sucesso! Você pode editá-lo e ativá-lo no WhatsApp.`,
        action: { action: 'agent_created', data: agent, navigate: `/dashboard/bot-ia/editar/${agent.id}` }
      };
    }

    default:
      return { result: `Ferramenta "${toolName}" não reconhecida.` };
  }
}

// ============== MAIN HANDLER ==============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, messages, fileUrl, fileName, userId, companyId, timezone } = await req.json();

    if (!userId || !companyId) {
      return new Response(JSON.stringify({ error: 'userId e companyId são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user context
    const [{ data: companyData }, { data: userData }] = await Promise.all([
      supabase.from('companies').select('name').eq('id', companyId).single(),
      supabase.from('company_users').select('role').eq('user_id', userId).eq('company_id', companyId).single(),
    ]);

    const userTimezone = timezone || 'America/Sao_Paulo';
    const now = new Date();
    const todayStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: userTimezone });
    const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: userTimezone });
    
    // Build ISO date in user's local timezone
    const localParts = new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const isoToday = localParts; // YYYY-MM-DD format
    
    // Also get local hour/minute for precise relative time calculations
    const localHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: userTimezone, hour: 'numeric', hour12: false }).format(now));
    const localMinute = Number(new Intl.DateTimeFormat('en-US', { timeZone: userTimezone, minute: 'numeric' }).format(now));

    const SYSTEM_PROMPT = `Você é o assistente IA da Ellosuit, uma plataforma completa de gestão empresarial. Você é inteligente, proativo e executa ações reais no sistema.

DATA E HORA ATUAL: ${todayStr}, ${currentTime}
DATA ISO HOJE: ${isoToday}
HORA LOCAL: ${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}
TIMEZONE DO USUÁRIO: ${userTimezone}

IMPORTANTE SOBRE HORÁRIOS:
- Quando o usuário disser "daqui X minutos/horas", calcule baseado na HORA LOCAL acima (${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')})
- Use a DATA ISO HOJE (${isoToday}) como base para datas
- Formate datas para a tool como: ${isoToday}THH:mm:ss (sem timezone offset, já é hora local)

CONTEXTO:
- Empresa: ${companyData?.name || 'N/A'}
- Cargo: ${userData?.role || 'N/A'}

CAPACIDADES (use as ferramentas para executar):
1. Agenda: Criar, listar e excluir eventos/compromissos
2. Tarefas: CRUD completo de tarefas e lembretes
3. CRM: Criar, buscar, atualizar e excluir contatos
4. Drive: Salvar arquivos, criar pastas, listar documentos
5. Serviços: Cadastrar e listar serviços/produtos
6. Propostas/Contratos/Recibos: Consultar documentos comerciais
7. Email Marketing: Listar templates e emails enviados
8. Automações: Listar, ativar/desativar E CRIAR NOVAS automações
9. Chatbots: Listar, gerenciar E CRIAR NOVOS chatbots
10. WhatsApp: Ver conversas, ENVIAR MENSAGENS e CONECTAR novo número (QR Code)
11. Booking: Ver links de agendamento
12. Dashboard: Resumo geral do dia
13. Navegação: Levar o usuário para qualquer módulo

REGRAS:
- EXECUTE as ações diretamente usando as ferramentas quando o usuário pedir
- Se faltar informação para executar, PERGUNTE de forma inteligente
- Responda SEMPRE em português brasileiro
- Seja conciso mas informativo
- Use emojis moderadamente para tornar as respostas visuais
- Quando criar eventos, infira horários razoáveis se não especificados (ex: reunião = 1h, lembrete = 30min)
- Se o usuário pedir para salvar um arquivo mas NÃO ANEXOU, use request_file
- Confirme as ações executadas com detalhes
- NÃO use markdown com asteriscos (** ou *) nas respostas. Use texto simples e emojis para formatação.
- Para links, use o formato: texto_descritivo (URL) - ex: "Link da reunião: https://..."
- Ao criar reuniões, o link do Ellomeeting é gerado automaticamente pela ferramenta, não invente links externos como Google Meet ou Zoom
- Quando o usuário pedir para ENVIAR uma mensagem via WhatsApp, DISPARAR ou NOTIFICAR alguém, PRIMEIRO pergunte: "Quer enviar pelo SEU WhatsApp ou pelo WhatsApp da Ellosuit?"
- Se o usuário escolher "meu WhatsApp" e não tiver conectado, use connect_whatsapp para gerar o QR code direto no chat
- Se o usuário escolher "Ellosuit", use send_whatsapp_message com use_ellosuit=true
- Quando o usuário pedir para CRIAR uma automação, use create_automation. Pergunte o gatilho e as ações desejadas.
- Quando o usuário pedir para CRIAR um chatbot, use create_chatbot. Pergunte o objetivo do fluxo e monte os passos.
- Quando o usuário pedir para CRIAR um agente de IA, use create_ai_agent. Pergunte o nome, personalidade e instruções.
- Para AGENTES, ajude o usuário a definir personalidade e instruções detalhadas para obter melhores resultados.`;

    // Build conversation
    const apiMessages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (messages && Array.isArray(messages)) {
      apiMessages.push(...messages);
    }

    let userContent = message || '';
    if (fileUrl && fileName) {
      userContent += `\n\n[Arquivo anexado: "${fileName}" - URL: ${fileUrl}]`;
    }
    if (userContent) {
      apiMessages.push({ role: 'user', content: userContent });
    }

    console.log(`🤖 [AI-ASSISTANT] Processing: msgs=${apiMessages.length}, hasFile=${!!fileUrl}`);

    // First AI call
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: apiMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI Gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições. Tente novamente em alguns segundos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    // Log first AI call cost
    const u1 = data.usage || {};
    const cost1 = ((u1.prompt_tokens || 0) / 1000) * 0.00015 + ((u1.completion_tokens || 0) / 1000) * 0.0006;
    logUsage({
      service_type: 'lovable_ai', action: 'ai_assistant_call1', model: 'google/gemini-3-flash-preview',
      input_tokens: u1.prompt_tokens || 0, output_tokens: u1.completion_tokens || 0,
      total_cost: cost1, user_id: userId, company_id: companyId,
      metadata: { has_tool_calls: !!choice.message.tool_calls?.length },
    });

    // Handle tool calls with multi-round support
    if (choice.message.tool_calls?.length > 0) {
      console.log(`🔧 [AI-ASSISTANT] ${choice.message.tool_calls.length} tool call(s)`);

      const toolResults: Array<{ role: string; tool_call_id: string; content: string }> = [];
      let lastAction: any = null;

      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        console.log(`🔧 Executing: ${toolName}`, toolArgs);

        const result = await executeTool(toolName, toolArgs, { supabase, userId, companyId, fileUrl, fileName });
        console.log(`🔧 Result: ${result.result.substring(0, 100)}`);

        toolResults.push({ role: 'tool', tool_call_id: toolCall.id, content: result.result });
        if (result.action) lastAction = result.action;
      }

      // Second AI call to generate natural language response
      const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [...apiMessages, choice.message, ...toolResults],
          temperature: 0.7,
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        const finalMessage = followUpData.choices[0].message.content || '';

        // Log second AI call cost
        const u2 = followUpData.usage || {};
        const cost2 = ((u2.prompt_tokens || 0) / 1000) * 0.00015 + ((u2.completion_tokens || 0) / 1000) * 0.0006;
        logUsage({
          service_type: 'lovable_ai', action: 'ai_assistant_call2', model: 'google/gemini-3-flash-preview',
          input_tokens: u2.prompt_tokens || 0, output_tokens: u2.completion_tokens || 0,
          total_cost: cost2, user_id: userId, company_id: companyId,
        });

        console.log(`✅ [AI-ASSISTANT] Final: ${finalMessage.substring(0, 100)}...`);

        return new Response(JSON.stringify({
          response: finalMessage,
          action: lastAction,
          success: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fallback if follow-up fails
      return new Response(JSON.stringify({
        response: toolResults.map(r => r.content).join('\n\n'),
        action: lastAction,
        success: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Regular text response (no tool calls)
    const assistantMessage = choice.message.content || 'Desculpe, não consegui processar.';

    return new Response(JSON.stringify({
      response: assistantMessage,
      action: { action: 'message' },
      success: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [AI-ASSISTANT] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro interno',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
