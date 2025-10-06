// AI Chat function using OpenAI API for Bot IA
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, message, personality, instructions, model = 'gpt-4o-mini' } = await req.json();

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Support both old (message) and new (messages) format
    let apiMessages = [];
    
    if (messages && Array.isArray(messages)) {
      // New format with messages array
      apiMessages = messages;
    } else if (message) {
      // Old format with single message
      const systemPrompt = `${personality ? `Personalidade: ${personality}\n\n` : ''}${instructions || 'Você é um assistente IA útil e amigável.'}`;
      apiMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ];
    } else {
      throw new Error('Either "messages" array or "message" string is required');
    }

    console.log('🤖 Processing chat request:', { model, messageCount: apiMessages.length });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: apiMessages,
        max_tokens: 2000,
        temperature: 0.7,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI response received');
    
    const assistantMessage = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: assistantMessage,
      message: assistantMessage, // For backward compatibility
      model: model,
      usage: data.usage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error in ai-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});