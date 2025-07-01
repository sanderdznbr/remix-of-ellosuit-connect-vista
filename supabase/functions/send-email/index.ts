
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
  provider?: 'resend' | 'gmail';
  from_email?: string;
  from_name?: string;
}

const sendWithResend = async (emailData: SendEmailRequest) => {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY não configurada');
  }

  const resend = new Resend(resendApiKey);
  
  // Use custom domain if provided, otherwise use default
  const fromAddress = emailData.from_email || "noreply@yourdomain.com";
  const fromName = emailData.from_name || "Sistema de Email";
  
  const emailResponse = await resend.emails.send({
    from: `${fromName} <${fromAddress}>`,
    to: [emailData.recipient_email],
    subject: emailData.subject,
    html: emailData.content_html,
    text: emailData.content_text
  });

  if (emailResponse.error) {
    console.error('Resend error:', emailResponse.error);
    throw new Error(`Erro ao enviar email via Resend: ${emailResponse.error.message}`);
  }

  return {
    provider: 'resend',
    external_id: emailResponse.data?.id,
    status: 'sent'
  };
};

const sendWithGmail = async (emailData: SendEmailRequest, accessToken: string) => {
  // Construct the email message in RFC 2822 format
  const messageParts = [
    `To: ${emailData.recipient_email}`,
    `From: ${emailData.from_email}`,
    `Subject: ${emailData.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    emailData.content_html || emailData.content_text || ''
  ];
  
  const message = messageParts.join('\n');
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedMessage
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Gmail API error:', error);
    throw new Error(`Erro ao enviar email via Gmail: ${error.error?.message || 'Erro desconhecido'}`);
  }

  const result = await response.json();
  return {
    provider: 'gmail',
    external_id: result.id,
    status: 'sent'
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      recipient_email, 
      recipient_name, 
      subject, 
      content_html, 
      content_text, 
      campaign_id,
      provider = 'resend',
      from_email,
      from_name
    }: SendEmailRequest = await req.json();

    console.log(`Sending email to ${recipient_email} via ${provider}`);

    // Generate tracking pixel ID
    const tracking_pixel_id = crypto.randomUUID();
    
    // Insert pixel tracking into HTML
    const pixelUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/track-email-open?pixel_id=${tracking_pixel_id}`;
    const htmlWithPixel = content_html + `<img src="${pixelUrl}" width="1" height="1" style="display:none;" />`;

    let sendResult;

    // Send email based on provider
    if (provider === 'gmail') {
      // For Gmail, we need to get the user's access token
      // In a real implementation, you'd get this from the user's stored tokens
      const accessToken = req.headers.get('x-gmail-token');
      if (!accessToken) {
        throw new Error('Token de acesso do Gmail não fornecido');
      }
      
      sendResult = await sendWithGmail({
        ...{ recipient_email, recipient_name, subject, content_html: htmlWithPixel, content_text, campaign_id, from_email, from_name }
      }, accessToken);
    } else {
      sendResult = await sendWithResend({
        recipient_email, recipient_name, subject, content_html: htmlWithPixel, content_text, campaign_id, from_email, from_name
      });
    }

    // Save email to database
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
        status: sendResult.status,
        metadata: {
          provider: sendResult.provider,
          external_id: sendResult.external_id
        }
      })
      .select()
      .single();

    if (emailError) {
      console.error('Error saving email:', emailError);
      throw emailError;
    }

    // Register send event
    await supabase
      .from('email_events')
      .insert({
        email_id: emailData.id,
        event_type: 'sent',
        timestamp: new Date().toISOString(),
        metadata: {
          provider: sendResult.provider
        }
      });

    console.log(`Email sent successfully via ${sendResult.provider}:`, emailData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: emailData.id,
        tracking_pixel_id,
        provider: sendResult.provider,
        external_id: sendResult.external_id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
