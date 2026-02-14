import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const automationId = pathParts[pathParts.length - 1];

  if (!automationId || automationId === "automation-webhook") {
    return new Response(
      JSON.stringify({ error: "Missing automation ID in URL path" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: automation, error: autoErr } = await supabase
      .from("automations")
      .select("id, name, is_active, nodes, edges, company_id, created_by")
      .eq("id", automationId)
      .single();

    if (autoErr || !automation) {
      return new Response(
        JSON.stringify({ error: "Automation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse incoming data
    let incomingData: Record<string, unknown> = {};
    if (req.method === "POST" || req.method === "PUT") {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        incomingData = await req.json();
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        formData.forEach((value, key) => { incomingData[key] = value; });
      } else {
        try { incomingData = await req.json(); } catch { /* ignore */ }
      }
    } else if (req.method === "GET") {
      url.searchParams.forEach((value, key) => { incomingData[key] = value; });
    }

    const detectedFields = Object.keys(incomingData);

    // Update webhook node with detected fields
    const nodes = Array.isArray(automation.nodes) ? automation.nodes : [];
    const updatedNodes = nodes.map((node: any) => {
      if (node.type === "webhook") {
        return {
          ...node,
          config: {
            ...node.config,
            detectedFields,
            lastPayload: incomingData,
            lastReceivedAt: new Date().toISOString(),
          },
        };
      }
      return node;
    });

    await supabase.from("automations").update({ nodes: updatedNodes }).eq("id", automationId);

    // If automation is not active, just detect fields and return
    if (!automation.is_active) {
      return new Response(
        JSON.stringify({ success: true, message: "Fields detected (automation inactive)", fields_detected: detectedFields }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === EXECUTION ENGINE ===
    const edges = Array.isArray(automation.edges) ? automation.edges : [];
    const webhookNode = updatedNodes.find((n: any) => n.type === "webhook");
    const executionLog: any[] = [];

    // Helper: resolve a value from incoming data using nested path (e.g. "user.name")
    const resolveValue = (path: string): unknown => {
      if (!path) return null;
      // Handle template syntax {{data.field}}
      const templateMatch = path.match(/\{\{data\.(.+?)\}\}/);
      const fieldPath = templateMatch ? templateMatch[1] : path;
      
      const parts = fieldPath.split(".");
      let current: any = incomingData;
      for (const part of parts) {
        if (current == null || typeof current !== "object") return null;
        current = current[part];
      }
      return current;
    };

    if (webhookNode) {
      // Find all edges from webhook (including per-field edges)
      const connectedEdges = edges.filter((e: any) => e.source === webhookNode.id);
      
      // Group edges by target node
      const edgesByTarget: Record<string, any[]> = {};
      for (const edge of connectedEdges) {
        if (!edgesByTarget[edge.target]) edgesByTarget[edge.target] = [];
        edgesByTarget[edge.target].push(edge);
      }

      for (const [targetId, targetEdges] of Object.entries(edgesByTarget)) {
        const targetNode = updatedNodes.find((n: any) => n.id === targetId);
        if (!targetNode) continue;

        try {
          if (targetNode.type === "create_client") {
            await executeCreateClient(supabase, targetNode, targetEdges, incomingData, automation, resolveValue);
            executionLog.push({ node: targetNode.id, type: "create_client", status: "success" });
          } else if (targetNode.type === "send_email") {
            executionLog.push({ node: targetNode.id, type: "send_email", status: "pending", message: "Email action queued" });
          } else if (targetNode.type === "send_whatsapp") {
            executionLog.push({ node: targetNode.id, type: "send_whatsapp", status: "pending", message: "WhatsApp action queued" });
          } else {
            executionLog.push({ node: targetNode.id, type: targetNode.type, status: "skipped" });
          }
        } catch (err: any) {
          executionLog.push({ node: targetNode.id, type: targetNode.type, status: "error", error: err.message });
        }
      }
    }

    // Log execution
    await supabase.from("automation_executions").insert({
      automation_id: automationId,
      status: "completed",
      trigger_data: incomingData,
      execution_log: { trigger: "webhook", fields_detected: detectedFields, actions: executionLog, timestamp: new Date().toISOString() },
      completed_at: new Date().toISOString(),
    });

    // Update execution count
    await supabase.from("automations").update({
      execution_count: (automation as any).execution_count ? (automation as any).execution_count + 1 : 1,
      last_executed_at: new Date().toISOString(),
    }).eq("id", automationId);

    return new Response(
      JSON.stringify({ success: true, message: "Webhook received and processed", fields_detected: detectedFields, execution: executionLog }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(
      JSON.stringify({ error: "Internal processing error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Field label -> DB column mapping
const FIELD_LABEL_TO_COLUMN: Record<string, string> = {
  "Nome": "name",
  "Email": "email",
  "Telefone": "phone",
  "WhatsApp": "whatsapp",
  "Status": "status",
  "CPF/CNPJ": "cnpj_cpf",
  "Empresa": "company_name",
  "Tipo": "client_type",
  "Profissão": "profession",
  "Nascimento": "birth_date",
  "Rua": "address_street",
  "Número": "address_number",
  "Cidade": "address_city",
  "Estado": "address_state",
  "CEP": "address_zip",
  "Indústria": "industry",
  "Porte": "company_size",
  "Faturamento": "annual_revenue",
  "Website": "website",
  "LinkedIn": "linkedin",
  "Instagram": "instagram",
  "Facebook": "facebook",
  "Anotações": "notes",
  "Tags": "tags",
};

async function executeCreateClient(
  supabase: any,
  node: any,
  edges: any[],
  incomingData: Record<string, unknown>,
  automation: any,
  resolveValue: (path: string) => unknown,
) {
  const config = node.config || {};
  
  // Build client data from field-to-field edge connections
  const clientData: Record<string, unknown> = {
    company_id: automation.company_id,
    created_by: automation.created_by,
    status: config.defaultStatus || "lead",
  };

  // Process per-field connections (sourceField -> targetField)
  for (const edge of edges) {
    if (edge.sourceField && edge.targetField) {
      const dbColumn = FIELD_LABEL_TO_COLUMN[edge.targetField];
      if (dbColumn) {
        const value = resolveValue(edge.sourceField);
        if (value !== null && value !== undefined) {
          if (dbColumn === "tags" && typeof value === "string") {
            clientData[dbColumn] = value.split(",").map((t: string) => t.trim());
          } else if (dbColumn === "annual_revenue") {
            clientData[dbColumn] = typeof value === "number" ? value : parseFloat(String(value)) || null;
          } else {
            clientData[dbColumn] = String(value);
          }
        }
      }
    } else if (!edge.sourceField && !edge.targetField) {
      // Generic connection: try to auto-map all incoming fields
      for (const [key, val] of Object.entries(incomingData)) {
        const lowerKey = key.toLowerCase();
        if ((lowerKey.includes("nome") || lowerKey === "name") && !clientData.name) clientData.name = String(val);
        if ((lowerKey.includes("email") || lowerKey === "email") && !clientData.email) clientData.email = String(val);
        if ((lowerKey.includes("telefone") || lowerKey.includes("phone") || lowerKey.includes("celular")) && !clientData.phone) clientData.phone = String(val);
        if ((lowerKey.includes("cpf") || lowerKey.includes("cnpj")) && !clientData.cnpj_cpf) clientData.cnpj_cpf = String(val);
        if ((lowerKey.includes("whatsapp") || lowerKey === "wpp") && !clientData.whatsapp) clientData.whatsapp = String(val);
      }
    }
  }

  // Fallback: ensure name exists
  if (!clientData.name) {
    clientData.name = (incomingData["name"] || incomingData["nome"] || incomingData["nome_completo"] || "Contato via Webhook") as string;
  }

  // Apply origin
  if (config.clientOrigin) {
    const origin = config.clientOrigin === "outro" ? (config.clientOriginCustom || "outro") : config.clientOrigin;
    clientData.notes = `${clientData.notes || ""}${clientData.notes ? "\n" : ""}Origem: ${origin}`.trim();
  }

  // Apply auto notes
  if (config.autoNotes) {
    let notes = config.autoNotes as string;
    // Replace {{data.field}} templates
    notes = notes.replace(/\{\{data\.(.+?)\}\}/g, (_: string, field: string) => {
      return String(resolveValue(field) || "");
    });
    clientData.notes = `${clientData.notes || ""}${clientData.notes ? "\n" : ""}${notes}`.trim();
  }

  // Apply auto tags
  if (config.autoTags && Array.isArray(config.autoTags) && config.autoTags.length > 0) {
    const existingTags = Array.isArray(clientData.tags) ? clientData.tags : [];
    clientData.tags = [...new Set([...existingTags, ...config.autoTags])];
  }

  // Apply client type
  if (config.clientType) {
    clientData.client_type = config.clientType;
  }

  // Insert the client
  const { data: newClient, error } = await supabase
    .from("clients")
    .insert(clientData)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating client:", error);
    throw new Error(`Failed to create client: ${error.message}`);
  }

  // Add to group if configured
  if (config.addToGroupId && newClient?.id) {
    const phone = (clientData.phone || clientData.whatsapp || "") as string;
    if (phone) {
      await supabase.from("contact_group_members").insert({
        group_id: config.addToGroupId,
        client_id: newClient.id,
        phone: phone,
        name: clientData.name as string,
      });
    }
  }

  console.log("Client created successfully:", newClient?.id);
  return newClient;
}
