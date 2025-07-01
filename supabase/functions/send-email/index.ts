
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  content_html: string;
  content_text?: string;
  campaign_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    const resend = new Resend(resendApiKey);
    const { recipient_email, recipient_name, subject, content_html, content_text, campaign_id }: SendEmailRequest = await req.json();

    // Gerar ID único para o pixel de rastreamento
    const tracking_pixel_id = crypto.randomUUID();
    
    // Inserir pixel de rastreamento no HTML
    const pixelUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/track-email-open?pixel_id=${tracking_pixel_id}`;
    const htmlWithPixel = content_html + `<img src="${pixelUrl}" width="1" height="1" style="display:none;" />`;

    // Enviar email usando Resend
    const emailResponse = await resend.emails.send({
      from: "EloSuit <onboarding@resend.dev>", // Você deve configurar um domínio personalizado
      to: [recipient_email],
      subject: subject,
      html: htmlWithPixel,
      text: content_text
    });

    if (emailResponse.error) {
      throw new Error(`Erro ao enviar email: ${emailResponse.error.message}`);
    }

    // Salvar email no banco de dados
    const { data: emailData, error: emailError } = await supabase
      .from('emails')
      .insert({
        campaign_id,
        recipient_email,
        recipient_name,
        subject,
        content_html: htmlWithPixel,
        content_text,
        tracking_pixel_id,
        status: 'sent'
      })
      .select()
      .single();

    if (emailError) {
      console.error('Error saving email:', emailError);
      throw emailError;
    }

    // Registrar evento de envio
    await supabase
      .from('email_events')
      .insert({
        email_id: emailData.id,
        event_type: 'sent',
        timestamp: new Date().toISOString()
      });

    console.log('Email sent successfully:', emailData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailData.id,
        tracking_pixel_id,
        resend_id: emailResponse.data?.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
