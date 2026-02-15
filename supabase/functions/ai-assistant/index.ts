// AI Assistant Orchestrator - Intelligent system-wide assistant

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'npm:@supabase/supabase-js@2';

const SYSTEM_PROMPT = `Você é o assistente IA da Ellosuit, uma plataforma completa de gestão empresarial. Você é inteligente, proativo e responde sempre em português brasileiro de forma concisa e amigável.

Você tem acesso a AÇÕES que pode executar no sistema. Quando o usuário pedir algo, analise e retorne a ação correta usando tool calls.

CAPACIDADES:
1. **Navegação**: Levar o usuário para qualquer módulo do sistema
2. **Drive/Arquivos**: Salvar arquivos no drive, criar pastas, compartilhar links
3. **Contatos**: Importar contatos de arquivos CSV/XLSX para o sistema
4. **Email Marketing**: Preparar envio de emails para contatos
5. **Informações**: Responder perguntas sobre o sistema e ajudar o usuário

REGRAS:
- Se o usuário anexou um arquivo e quer guardar no drive, use a ação save_to_drive
- Se o usuário anexou um CSV/XLSX com contatos, use import_contacts
- Se o usuário quer navegar para algum módulo, use navigate
- Se o usuário quer criar pasta no drive, use create_folder
- Se o usuário pede para salvar/anexar/enviar um arquivo MAS NÃO ANEXOU nenhum arquivo (não há "[Arquivo anexado:" na mensagem), use OBRIGATORIAMENTE a ação request_file para pedir que ele anexe o arquivo
- Sempre confirme o que foi feito e pergunte se precisa de mais algo
- Seja conciso mas informativo`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Navegar para um módulo específico do sistema",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Caminho da rota, ex: /dashboard/crm-whatsapp" },
          label: { type: "string", description: "Nome amigável do módulo" }
        },
        required: ["path", "label"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_to_drive",
      description: "Salvar um arquivo que o usuário enviou no Drive do sistema",
      parameters: {
        type: "object",
        properties: {
          folder_name: { type: "string", description: "Nome da pasta onde salvar (opcional, se não especificado salva na raiz)" },
          create_folder: { type: "boolean", description: "Se deve criar a pasta caso não exista" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_folder",
      description: "Criar uma pasta no Drive",
      parameters: {
        type: "object",
        properties: {
          folder_name: { type: "string", description: "Nome da pasta a criar" }
        },
        required: ["folder_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "import_contacts",
      description: "Importar contatos de um arquivo CSV/XLSX para o sistema de cadastros",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", enum: ["cadastros", "email_marketing", "disparos"], description: "Para onde importar os contatos" }
        },
        required: ["target"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "general_response",
      description: "Responder de forma geral quando não há ação específica a executar",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Mensagem de resposta ao usuário" }
        },
        required: ["message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_file",
      description: "Solicitar que o usuário anexe um arquivo quando ele pede para salvar/enviar/importar algo mas não anexou nenhum arquivo",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Mensagem pedindo para o usuário anexar o arquivo" },
          purpose: { type: "string", enum: ["save_to_drive", "import_contacts", "general"], description: "Para que o arquivo será usado" },
          folder_name: { type: "string", description: "Nome da pasta destino se mencionada (opcional)" }
        },
        required: ["message", "purpose"]
      }
    }
  }
];

const ROUTE_MAP: Record<string, { path: string; label: string }> = {
  'whatsapp': { path: '/dashboard/crm-whatsapp', label: 'CRM WhatsApp' },
  'crm': { path: '/dashboard/crm-whatsapp', label: 'CRM WhatsApp' },
  'disparo': { path: '/dashboard/disparos', label: 'Disparos em Massa' },
  'chatbot': { path: '/dashboard/chatbot', label: 'ChatBot Builder' },
  'email': { path: '/dashboard/email', label: 'Email Marketing' },
  'template': { path: '/dashboard/email-templates', label: 'Templates de Email' },
  'agente': { path: '/dashboard/bot-ia', label: 'Agentes de IA' },
  'automação': { path: '/dashboard/automacoes', label: 'Automações' },
  'api': { path: '/dashboard/api-whatsapp', label: 'API WhatsApp' },
  'agenda': { path: '/dashboard/agenda', label: 'Minha Agenda' },
  'agendamento': { path: '/dashboard/agenda-aberta', label: 'Agenda Online' },
  'tarefa': { path: '/dashboard/tasks', label: 'Tarefas' },
  'fluxo': { path: '/dashboard/fluxos', label: 'Fluxos' },
  'reunião': { path: '/dashboard/reunioes', label: 'Videoconferência' },
  'rastreamento': { path: '/dashboard/rastreamento', label: 'Rastrear Conteúdo' },
  'encurtador': { path: '/dashboard/encurtador', label: 'Encurtador' },
  'lead': { path: '/dashboard/leads', label: 'Captura de Leads' },
  'cadastro': { path: '/dashboard/cadastros', label: 'Cadastros' },
  'drive': { path: '/dashboard/drive', label: 'Arquivos' },
  'equipe': { path: '/dashboard/equipe', label: 'Equipe' },
  'contrato': { path: '/dashboard/contratos', label: 'Contratos' },
  'proposta': { path: '/dashboard/propostas', label: 'Ordem de Serviço' },
  'recibo': { path: '/dashboard/recibos', label: 'Recibos' },
  'analytics': { path: '/dashboard/analytics', label: 'Analytics' },
  'configuração': { path: '/dashboard/configuracoes', label: 'Configurações' },
  'perfil': { path: '/dashboard/perfil', label: 'Meu Perfil' },
  'assinatura': { path: '/dashboard/assinatura', label: 'Assinatura' },
};

async function executeAction(
  actionName: string,
  args: any,
  context: { supabase: any; userId: string; companyId: string; fileUrl?: string; fileName?: string }
): Promise<{ success: boolean; data?: any; message: string }> {
  const { supabase, userId, companyId, fileUrl, fileName } = context;

  switch (actionName) {
    case 'navigate': {
      return { success: true, data: { action: 'navigate', path: args.path, label: args.label }, message: `Abrindo ${args.label}...` };
    }

    case 'save_to_drive': {
      if (!fileUrl || !fileName) {
        return { success: false, message: 'Nenhum arquivo foi anexado para salvar.' };
      }

      let folderId: string | null = null;

      if (args.folder_name) {
        // Check if folder exists
        const { data: existingFolder } = await supabase
          .from('document_folders')
          .select('id')
          .eq('company_id', companyId)
          .eq('name', args.folder_name)
          .is('parent_folder_id', null)
          .maybeSingle();

        if (existingFolder) {
          folderId = existingFolder.id;
        } else if (args.create_folder !== false) {
          const { data: newFolder, error: folderError } = await supabase
            .from('document_folders')
            .insert({ name: args.folder_name, company_id: companyId, created_by: userId })
            .select('id')
            .single();

          if (folderError) {
            return { success: false, message: `Erro ao criar pasta: ${folderError.message}` };
          }
          folderId = newFolder.id;
        }
      }

      // Determine file type from extension
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const fileTypeMap: Record<string, string> = {
        'pdf': 'pdf', 'doc': 'doc', 'docx': 'doc', 'xls': 'spreadsheet', 'xlsx': 'spreadsheet',
        'csv': 'spreadsheet', 'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image',
        'webp': 'image', 'mp4': 'video', 'mov': 'video', 'avi': 'video', 'mp3': 'audio',
        'wav': 'audio', 'ogg': 'audio', 'txt': 'text', 'ppt': 'presentation', 'pptx': 'presentation',
      };
      const fileType = fileTypeMap[ext] || 'other';

      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          name: fileName,
          file_type: fileType,
          file_url: fileUrl,
          company_id: companyId,
          created_by: userId,
          folder_id: folderId,
        })
        .select('id')
        .single();

      if (docError) {
        return { success: false, message: `Erro ao salvar: ${docError.message}` };
      }

      const folderMsg = args.folder_name ? ` na pasta "${args.folder_name}"` : '';
      return {
        success: true,
        data: { action: 'saved_to_drive', documentId: doc.id, folderId, folderName: args.folder_name },
        message: `Arquivo "${fileName}" salvo no Drive${folderMsg} com sucesso!`
      };
    }

    case 'create_folder': {
      const { data: folder, error } = await supabase
        .from('document_folders')
        .insert({ name: args.folder_name, company_id: companyId, created_by: userId })
        .select('id')
        .single();

      if (error) {
        return { success: false, message: `Erro ao criar pasta: ${error.message}` };
      }

      return {
        success: true,
        data: { action: 'folder_created', folderId: folder.id, folderName: args.folder_name },
        message: `Pasta "${args.folder_name}" criada com sucesso no Drive!`
      };
    }

    case 'import_contacts': {
      // Return action for the frontend to handle
      const targetMap: Record<string, string> = {
        'cadastros': '/dashboard/cadastros',
        'email_marketing': '/dashboard/email',
        'disparos': '/dashboard/disparos',
      };
      const path = targetMap[args.target] || '/dashboard/cadastros';
      return {
        success: true,
        data: { action: 'import_contacts', path, target: args.target, fileUrl, fileName },
        message: `Preparando importação de contatos para ${args.target === 'email_marketing' ? 'Email Marketing' : args.target === 'disparos' ? 'Disparos' : 'Cadastros'}...`
      };
    }

    case 'general_response': {
      return { success: true, data: { action: 'message' }, message: args.message };
    }

    case 'request_file': {
      return {
        success: true,
        data: { action: 'request_file', purpose: args.purpose, folder_name: args.folder_name },
        message: args.message
      };
    }

    default:
      return { success: false, message: 'Ação não reconhecida.' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, messages, fileUrl, fileName, userId, companyId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build conversation
    const apiMessages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (messages && Array.isArray(messages)) {
      apiMessages.push(...messages);
    }

    // Add current message with file context
    let userContent = message || '';
    if (fileUrl && fileName) {
      userContent += `\n\n[Arquivo anexado: "${fileName}" - URL: ${fileUrl}]`;
    }
    if (userContent) {
      apiMessages.push({ role: 'user', content: userContent });
    }

    console.log('🤖 AI Assistant processing:', { messageCount: apiMessages.length, hasFile: !!fileUrl });

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI Gateway error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns segundos.' }), {
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

    // Handle tool calls
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const actionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      console.log('🔧 Executing action:', actionName, args);

      const result = await executeAction(actionName, args, {
        supabase, userId, companyId, fileUrl, fileName
      });

      return new Response(JSON.stringify({
        response: result.message,
        action: result.data,
        success: result.success,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Regular text response
    const assistantMessage = choice.message.content || 'Desculpe, não consegui processar sua solicitação.';

    return new Response(JSON.stringify({
      response: assistantMessage,
      action: { action: 'message' },
      success: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ AI Assistant error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
