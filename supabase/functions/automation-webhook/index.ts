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
  // Extract automation ID from path: /automation-webhook/{automationId}
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
    // Verify automation exists and is active
    const { data: automation, error: autoErr } = await supabase
      .from("automations")
      .select("id, name, is_active, nodes, edges, company_id")
      .eq("id", automationId)
      .single();

    if (autoErr || !automation) {
      return new Response(
        JSON.stringify({ error: "Automation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!automation.is_active) {
      return new Response(
        JSON.stringify({ error: "Automation is not active" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        formData.forEach((value, key) => {
          incomingData[key] = value;
        });
      } else {
        try { incomingData = await req.json(); } catch { /* ignore */ }
      }
    } else if (req.method === "GET") {
      url.searchParams.forEach((value, key) => {
        incomingData[key] = value;
      });
    }

    // Store the detected fields on the automation for the UI
    const detectedFields = Object.keys(incomingData);
    
    // Update the webhook node config with detected fields
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

    await supabase
      .from("automations")
      .update({ nodes: updatedNodes })
      .eq("id", automationId);

    // Log the execution
    await supabase.from("automation_executions").insert({
      automation_id: automationId,
      status: "completed",
      trigger_data: incomingData,
      execution_log: {
        trigger: "webhook",
        fields_detected: detectedFields,
        timestamp: new Date().toISOString(),
      },
      completed_at: new Date().toISOString(),
    });

    // Process action nodes connected to webhook
    const edges = Array.isArray(automation.edges) ? automation.edges : [];
    const webhookNode = updatedNodes.find((n: any) => n.type === "webhook");
    
    if (webhookNode) {
      const connectedEdges = edges.filter((e: any) => e.source === webhookNode.id);
      
      for (const edge of connectedEdges) {
        const targetNode = updatedNodes.find((n: any) => n.id === edge.target);
        if (!targetNode) continue;

        if (targetNode.type === "create_client") {
          const config = targetNode.config || {};
          const resolveField = (template: string) => {
            if (!template) return null;
            const match = template.match(/\{\{data\.(\w+)\}\}/);
            if (match) return incomingData[match[1]] as string || null;
            return incomingData[template] as string || template;
          };

          const clientData: Record<string, unknown> = {
            company_id: automation.company_id,
            created_by: "00000000-0000-0000-0000-000000000000",
            name: resolveField(config.nameField) || incomingData["name"] || incomingData["nome"] || "Sem nome",
            email: resolveField(config.emailField) || incomingData["email"] || null,
            phone: resolveField(config.phoneField) || incomingData["phone"] || incomingData["telefone"] || null,
            status: "lead",
          };

          await supabase.from("clients").insert(clientData);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook received and processed",
        fields_detected: detectedFields,
      }),
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
