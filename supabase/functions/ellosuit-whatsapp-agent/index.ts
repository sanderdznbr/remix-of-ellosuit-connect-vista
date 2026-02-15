// Ellosuit WhatsApp Agent - AI agent with tool calling for account operations
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============== TOOL DEFINITIONS ==============
const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "Listar tarefas do usuário na plataforma Ellosuit",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "in_progress", "completed", "all"], description: "Filtrar por status (padrão: all)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Criar uma nova tarefa na plataforma Ellosuit",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da tarefa" },
          description: { type: "string", description: "Descrição da tarefa (opcional)" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Prioridade (padrão: medium)" },
          due_date: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD (opcional)" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_contacts",
      description: "Listar contatos/cadastros do CRM do usuário",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Buscar por nome, email ou telefone (opcional)" },
          limit: { type: "number", description: "Quantidade de resultados (padrão: 10)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_subscription",
      description: "Verificar status da assinatura e plano do usuário",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "list_documents",
      description: "Listar arquivos no Drive do usuário",
      parameters: {
        type: "object",
        properties: {
          folder_name: { type: "string", description: "Nome da pasta para filtrar (opcional)" },
          limit: { type: "number", description: "Quantidade (padrão: 10)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_calendar_events",
      description: "Listar eventos da agenda do usuário",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Quantos dias à frente buscar (padrão: 7)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Criar um novo evento na agenda do usuário",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título do evento" },
          start_date: { type: "string", description: "Data/hora início no formato YYYY-MM-DDTHH:mm:ss" },
          end_date: { type: "string", description: "Data/hora fim no formato YYYY-MM-DDTHH:mm:ss" },
          description: { type: "string", description: "Descrição do evento (opcional)" }
        },
        required: ["title", "start_date", "end_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "upload_to_drive",
      description: "Salvar um arquivo enviado pelo usuário no Drive da Ellosuit. Use quando o usuário enviar um arquivo (imagem, documento, etc.) e pedir para salvar.",
      parameters: {
        type: "object",
        properties: {
          folder_name: { type: "string", description: "Nome da pasta onde salvar (opcional, padrão: pasta principal)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "general_info",
      description: "Responder perguntas gerais sobre a plataforma Ellosuit ou sobre a conta do usuário",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "Pergunta do usuário" }
        },
        required: ["question"]
      }
    }
  }
];

// ============== TOOL EXECUTION ==============
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: { supabase: ReturnType<typeof createClient>; userId: string; companyId: string; lastMedia?: { url: string; fileName?: string; type?: string; mimeType?: string } }
): Promise<string> {
  const { supabase, userId, companyId } = context;

  switch (toolName) {
    case 'list_tasks': {
      let query = supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_date, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(15);

      const status = args.status as string;
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) return `Erro ao buscar tarefas: ${error.message}`;
      if (!data || data.length === 0) return 'Nenhuma tarefa encontrada.';

      return `Tarefas encontradas (${data.length}):\n` + data.map((t: any, i: number) =>
        `${i + 1}. "${t.title}" - Status: ${t.status}, Prioridade: ${t.priority}${t.due_date ? `, Vencimento: ${t.due_date}` : ''}`
      ).join('\n');
    }

    case 'create_task': {
      // Tasks are stored as calendar_events with event_type 'reminder'
      const dueDate = (args.due_date as string) || new Date().toISOString().split('T')[0];
      const startDate = `${dueDate}T08:00:00`;
      const endDate = `${dueDate}T08:30:00`;

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title: args.title as string,
          description: (args.description as string) || null,
          start_date: startDate,
          end_date: endDate,
          event_type: 'reminder',
          status: 'pending',
          source: 'whatsapp',
          company_id: companyId,
          created_by: userId,
        })
        .select('id, title')
        .single();

      console.log('🔧 create_task result:', { data, error });
      if (error) return `Erro ao criar tarefa: ${error.message}`;
      return `Tarefa "${data.title}" criada com sucesso para ${dueDate}!`;
    }

    case 'list_contacts': {
      let query = supabase
        .from('clients')
        .select('id, name, email, phone, company_name, status')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit((args.limit as number) || 10);

      const search = args.search as string;
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) return `Erro ao buscar contatos: ${error.message}`;
      if (!data || data.length === 0) return 'Nenhum contato encontrado.';

      return `Contatos (${data.length}):\n` + data.map((c: any, i: number) =>
        `${i + 1}. ${c.name}${c.email ? ` - ${c.email}` : ''}${c.phone ? ` - ${c.phone}` : ''}${c.company_name ? ` (${c.company_name})` : ''}`
      ).join('\n');
    }

    case 'check_subscription': {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_type, status, monthly_price, trial_ends_at, current_period_end')
        .eq('company_id', companyId)
        .single();

      if (!sub) return 'Não foi possível encontrar informações de assinatura.';

      const { data: modules } = await supabase
        .from('subscription_modules')
        .select('module_type, is_active')
        .eq('company_id', companyId);

      const activeModules = (modules || []).filter((m: any) => m.is_active).map((m: any) => m.module_type);

      return [
        `Plano: ${sub.plan_type}`,
        `Status: ${sub.status}`,
        `Valor: R$${sub.monthly_price}/mês`,
        sub.trial_ends_at ? `Trial até: ${new Date(sub.trial_ends_at).toLocaleDateString('pt-BR')}` : '',
        sub.current_period_end ? `Próx. renovação: ${new Date(sub.current_period_end).toLocaleDateString('pt-BR')}` : '',
        activeModules.length > 0 ? `Módulos ativos: ${activeModules.join(', ')}` : 'Nenhum módulo adicional ativo',
      ].filter(Boolean).join('\n');
    }

    case 'list_documents': {
      let query = supabase
        .from('documents')
        .select('id, name, file_type, file_size, created_at, folder_id')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit((args.limit as number) || 10);

      if (args.folder_name) {
        const { data: folder } = await supabase
          .from('document_folders')
          .select('id')
          .eq('company_id', companyId)
          .eq('name', args.folder_name as string)
          .maybeSingle();
        if (folder) query = query.eq('folder_id', folder.id);
      }

      const { data, error } = await query;
      if (error) return `Erro ao buscar documentos: ${error.message}`;
      if (!data || data.length === 0) return 'Nenhum documento encontrado.';

      return `Documentos (${data.length}):\n` + data.map((d: any, i: number) =>
        `${i + 1}. ${d.name} (${d.file_type}) - ${new Date(d.created_at).toLocaleDateString('pt-BR')}`
      ).join('\n');
    }

    case 'list_calendar_events': {
      const daysAhead = (args.days_ahead as number) || 7;
      const now = new Date();
      const endDate = new Date(now.getTime() + daysAhead * 86400000);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_date, end_date, description, event_type')
        .eq('company_id', companyId)
        .gte('start_date', now.toISOString())
        .lte('start_date', endDate.toISOString())
        .order('start_date', { ascending: true })
        .limit(15);

      if (error) return `Erro ao buscar eventos: ${error.message}`;
      if (!data || data.length === 0) return `Nenhum evento encontrado nos próximos ${daysAhead} dias.`;

      return `Eventos nos próximos ${daysAhead} dias (${data.length}):\n` + data.map((e: any, i: number) => {
        const start = new Date(e.start_date);
        return `${i + 1}. "${e.title}" - ${start.toLocaleDateString('pt-BR')} às ${start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }).join('\n');
    }

    case 'create_calendar_event': {
      console.log('🔧 create_calendar_event args:', args);
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title: args.title as string,
          start_date: args.start_date as string,
          end_date: args.end_date as string,
          description: (args.description as string) || null,
          event_type: 'reminder',
          status: 'pending',
          source: 'whatsapp',
          company_id: companyId,
          created_by: userId,
        })
        .select('id, title')
        .single();

      console.log('🔧 create_calendar_event result:', { data, error });
      if (error) return `Erro ao criar evento: ${error.message}`;
      return `Evento "${data.title}" criado com sucesso na agenda!`;
    }

    case 'upload_to_drive': {
      const mediaInfo = context.lastMedia;
      if (!mediaInfo || !mediaInfo.url) {
        return 'Nenhum arquivo foi recebido na mensagem. Peça ao usuário para enviar o arquivo primeiro.';
      }

      try {
        console.log('🔧 upload_to_drive: downloading from', mediaInfo.url);
        const mediaResp = await fetch(mediaInfo.url);
        if (!mediaResp.ok) return `Erro ao baixar o arquivo: HTTP ${mediaResp.status}`;
        const fileBuffer = await mediaResp.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        const fileName = mediaInfo.fileName || `whatsapp-${Date.now()}.${mediaInfo.type || 'bin'}`;
        const storagePath = `${companyId}/${Date.now()}-${fileName}`;
        const mimeType = mediaInfo.mimeType || 'application/octet-stream';

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, fileBytes, { contentType: mimeType, upsert: false });

        if (uploadError) {
          console.error('🔧 upload_to_drive storage error:', uploadError);
          return `Erro ao fazer upload: ${uploadError.message}`;
        }

        const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(storagePath);

        // Find folder if specified
        let folderId: string | null = null;
        const folderName = args.folder_name as string;
        if (folderName) {
          const { data: folder } = await supabase
            .from('document_folders')
            .select('id')
            .eq('company_id', companyId)
            .ilike('name', folderName)
            .maybeSingle();
          if (folder) folderId = folder.id;
        }

        // Detect file type
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const fileTypeMap: Record<string, string> = {
          pdf: 'pdf', doc: 'word', docx: 'word', xls: 'excel', xlsx: 'excel',
          ppt: 'powerpoint', pptx: 'powerpoint', png: 'image', jpg: 'image',
          jpeg: 'image', gif: 'image', webp: 'image', mp4: 'video', mp3: 'audio',
        };
        const fileType = fileTypeMap[ext] || 'other';

        // Create document record
        const { error: docError } = await supabase
          .from('documents')
          .insert({
            name: fileName,
            file_type: fileType,
            file_url: publicUrlData.publicUrl,
            file_size: fileBytes.length,
            company_id: companyId,
            created_by: userId,
            folder_id: folderId,
          });

        if (docError) {
          console.error('🔧 upload_to_drive doc error:', docError);
          return `Arquivo enviado ao storage mas erro ao registrar: ${docError.message}`;
        }

        // Also create document_files record
        await supabase.from('document_files').insert({
          document_id: (await supabase.from('documents').select('id').eq('file_url', publicUrlData.publicUrl).single()).data?.id,
          file_path: storagePath,
          file_size: fileBytes.length,
          mime_type: mimeType,
          original_filename: fileName,
        });

        console.log('🔧 upload_to_drive success:', fileName);
        return `Arquivo "${fileName}" salvo com sucesso no Drive${folderId ? ` na pasta "${folderName}"` : ' na pasta principal'}!`;
      } catch (err) {
        console.error('🔧 upload_to_drive error:', err);
        return `Erro ao processar arquivo: ${err instanceof Error ? err.message : 'erro desconhecido'}`;
      }
    }

    case 'general_info': {
      return `A Ellosuit é uma plataforma completa de gestão empresarial com módulos de CRM WhatsApp, Email Marketing, Agenda, Tarefas, Drive, Contratos, Propostas, Videoconferência, Chatbots, Agentes de IA, Automações e muito mais. Para qualquer dúvida específica, posso verificar diretamente na conta do usuário.`;
    }

    default:
      return `Ferramenta "${toolName}" não reconhecida.`;
  }
}

// ============== MAIN HANDLER ==============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, companyId, contactPhone, agentInstructions, agentPersonality, agentSettings, lastMedia } = await req.json();

    if (!userId || !companyId) {
      return new Response(JSON.stringify({ error: 'userId e companyId são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user and company info for context
    const [{ data: companyData }, { data: userData }] = await Promise.all([
      supabase.from('companies').select('name').eq('id', companyId).single(),
      supabase.from('company_users').select('role').eq('user_id', userId).eq('company_id', companyId).single(),
    ]);

    const settings = agentSettings || {};
    const temperature = (settings.temperature as number) ?? 0.7;
    const maxChars = (settings.maxResponseChars as number) ?? 500;
    const humor = (settings.humor as string) ?? 'profissional';

    const now = new Date();
    const todayStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const isoToday = now.toISOString().split('T')[0];

    const systemPrompt = [
      `Personalidade: ${agentPersonality || 'Assistente profissional e amigável da plataforma Ellosuit'}`,
      `Tom/Humor: ${humor}`,
      '',
      agentInstructions || 'Você é o assistente da Ellosuit via WhatsApp. Ajude o cliente a gerenciar sua conta.',
      '',
      `DATA E HORA ATUAL: ${todayStr}, ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      `DATA ISO HOJE: ${isoToday}`,
      '',
      `CONTEXTO DO USUARIO:`,
      `- Empresa: ${companyData?.name || 'N/A'}`,
      `- Cargo: ${userData?.role || 'N/A'}`,
      `- WhatsApp: ${contactPhone || 'N/A'}`,
      '',
      'REGRAS:',
      '1. Responda APENAS o que foi perguntado. Seja direto.',
      '2. Use as ferramentas disponíveis para executar ações na conta do usuário.',
      '3. Envie UMA mensagem curta por vez.',
      '4. NAO use markdown, asteriscos ou formatação especial.',
      '5. Escreva como uma pessoa digitando no WhatsApp.',
      `6. Limite: ${maxChars} caracteres no máximo.`,
      '7. Responda sempre em português brasileiro.',
      '8. Quando o usuário enviar um arquivo e pedir para salvar, use a ferramenta upload_to_drive.',
      '',
      lastMedia ? `ARQUIVO RECEBIDO: O usuário enviou um arquivo (${lastMedia.fileName || 'arquivo'}). Use upload_to_drive para salvá-lo se solicitado.` : '',
      '',
      'TRANSFERENCIA PARA ATENDENTE:',
      'Se o cliente pedir para falar com um humano, inclua [HANDOFF] no final.',
    ].filter(Boolean).join('\n');

    // Build messages array
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || []),
    ];

    console.log(`🤖 [ELLOSUIT-AGENT] Processing for user=${userId}, company=${companyId}, msgs=${apiMessages.length}`);

    // First AI call - may include tool calls
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: (settings.model as string) || 'google/gemini-3-flash-preview',
        messages: apiMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    // Handle tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      console.log(`🔧 [ELLOSUIT-AGENT] ${choice.message.tool_calls.length} tool call(s)`);

      // Execute all tool calls
      const toolResults: Array<{ role: string; tool_call_id: string; content: string }> = [];

      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        console.log(`🔧 Executing: ${toolName}`, toolArgs);

        const result = await executeTool(toolName, toolArgs, { supabase, userId, companyId, lastMedia });
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Second AI call with tool results
      const followUpMessages = [
        ...apiMessages,
        choice.message,
        ...toolResults,
      ];

      const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: (settings.model as string) || 'google/gemini-3-flash-preview',
          messages: followUpMessages,
          temperature,
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        const finalMessage = followUpData.choices[0].message.content || '';
        console.log(`✅ [ELLOSUIT-AGENT] Final response: ${finalMessage.substring(0, 100)}...`);

        return new Response(JSON.stringify({ response: finalMessage }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Regular text response (no tool calls)
    const message = choice.message.content || 'Desculpe, não consegui processar sua solicitação.';
    console.log(`✅ [ELLOSUIT-AGENT] Response: ${message.substring(0, 100)}...`);

    return new Response(JSON.stringify({ response: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [ELLOSUIT-AGENT] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro interno',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});