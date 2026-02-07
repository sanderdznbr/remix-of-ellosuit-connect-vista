import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  user_id?: string;
}

const sendWithResend = async (emailData: SendEmailRequest) => {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY não configurada');
  }

  const resend = new Resend(resendApiKey);
  
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

const refreshGmailToken = async (supabase: any, accountId: string, refreshToken: string) => {
  console.log('🔄 Refreshing Gmail token...');
  
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('Google credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Token refresh failed:', error);
    throw new Error('Failed to refresh Gmail token');
  }

  const tokens = await response.json();
  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

  // Update token in database
  await supabase
    .from('user_email_accounts')
    .update({
      access_token: tokens.access_token,
      expires_at: expiresAt
    })
    .eq('id', accountId);

  console.log('✅ Token refreshed successfully');
  return tokens.access_token;
};

const sendWithGmail = async (emailData: SendEmailRequest, accessToken: string) => {
  console.log('📧 Sending email via Gmail API...');
  
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
    body: JSON.stringify({ raw: encodedMessage })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Gmail API error:', error);
    throw new Error(`Erro ao enviar email via Gmail: ${error.error?.message || 'Erro desconhecido'}`);
  }

  const result = await response.json();
  console.log('✅ Email sent via Gmail:', result.id);
  
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

    const requestData: SendEmailRequest = await req.json();
    const { 
      recipient_email, 
      recipient_name, 
      subject, 
      content_html, 
      content_text, 
      campaign_id,
      provider = 'resend',
      from_email,
      from_name,
      user_id
    } = requestData;

    console.log(`📨 Sending email to ${recipient_email} via ${provider}`);

    // Generate tracking pixel ID
    const tracking_pixel_id = crypto.randomUUID();
    
    // Insert pixel tracking into HTML
    const pixelUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/track-email-open?pixel_id=${tracking_pixel_id}`;
    const htmlWithPixel = content_html + `<img src="${pixelUrl}" width="1" height="1" style="display:none;" />`;

    let sendResult;
    let finalFromEmail = from_email;
    let finalFromName = from_name;

    // Send email based on provider
    if (provider === 'gmail' && user_id) {
      console.log('🔍 Looking for Gmail account for user:', user_id);
      
      // Fetch user's Gmail account from database
      const { data: emailAccount, error: accountError } = await supabase
        .from('user_email_accounts')
        .select('*')
        .eq('user_id', user_id)
        .eq('provider', 'gmail')
        .single();

      if (accountError || !emailAccount) {
        console.error('❌ Gmail account not found:', accountError);
        throw new Error('Conta Gmail não encontrada. Conecte seu Gmail primeiro.');
      }

      // Get email from correct column name
      const gmailEmail = emailAccount.email || emailAccount.provider_email;
      console.log('✅ Gmail account found:', gmailEmail);

      // Check if token is expired
      let accessToken = emailAccount.access_token;
      const now = new Date();
      const expiresAt = new Date(emailAccount.expires_at);
      
      if (now >= expiresAt) {
        console.log('⚠️ Token expired, refreshing...');
        accessToken = await refreshGmailToken(supabase, emailAccount.id, emailAccount.refresh_token);
      }

      // Use the Gmail account email as sender
      finalFromEmail = gmailEmail;
      finalFromName = from_name || (gmailEmail ? gmailEmail.split('@')[0] : 'User');

      sendResult = await sendWithGmail({
        ...requestData,
        content_html: htmlWithPixel,
        from_email: finalFromEmail,
        from_name: finalFromName
      }, accessToken);
    } else {
      // Use Resend
      sendResult = await sendWithResend({
        ...requestData,
        content_html: htmlWithPixel
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
          external_id: sendResult.external_id,
          from_email: finalFromEmail,
          from_name: finalFromName
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

    console.log(`✅ Email sent successfully via ${sendResult.provider}:`, emailData.id);

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
    console.error('❌ Error in send-email function:', error);
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
