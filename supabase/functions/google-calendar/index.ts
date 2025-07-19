
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle POST requests (from frontend)
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('📨 POST request received:', body);

      // Return Google Client ID
      if (body.action === 'get_client_id') {
        console.log('🔑 Returning Google Client ID');
        return new Response(JSON.stringify({
          client_id: googleClientId,
          success: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Process OAuth code exchange
      if (body.action === 'exchange_code') {
        const { code, user_id } = body;
        console.log('🔄 Processing OAuth code exchange for user:', user_id);

        if (!code || !user_id) {
          throw new Error('Code or user_id missing');
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: `${supabaseUrl}/functions/v1/google-calendar`
          })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          console.error('❌ Token exchange error:', tokenData);
          throw new Error(`Token exchange failed: ${tokenData.error}`);
        }

        console.log('✅ Tokens obtained successfully');

        // Get user's company_id
        const { data: companyUser, error: companyError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user_id)
          .single();

        if (companyError || !companyUser) {
          console.error('❌ Error getting user company:', companyError);
          throw new Error('User company not found');
        }

        // Calculate expiration timestamp
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

        // Save to meeting_integrations table
        const { error: insertError } = await supabase
          .from('meeting_integrations')
          .upsert({
            user_id: user_id,
            company_id: companyUser.company_id,
            provider: 'google_meet',
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
          });

        if (insertError) {
          console.error('❌ Error saving integration:', insertError);
          throw new Error(`Failed to save integration: ${insertError.message}`);
        }

        console.log('✅ Google Meet integration saved successfully');

        return new Response(JSON.stringify({
          success: true,
          message: 'Google Meet connected successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        error: 'Unknown action'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle GET requests (OAuth callback)
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('🔗 OAuth callback received:', { code: !!code, state, error });

    if (error) {
      console.error('❌ OAuth error:', error);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://ellosuit.online/dashboard?error=${error}`
        }
      });
    }

    if (!code) {
      console.error('❌ No code in callback');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://ellosuit.online/dashboard?error=no_code`
        }
      });
    }

    // Redirect back to dashboard with code for frontend processing
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `https://ellosuit.online/dashboard?code=${code}&state=${state || 'google_meet_auth'}`
      }
    });

  } catch (error) {
    console.error('💥 Error in google-calendar function:', error);
    
    if (req.method === 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        'Location': `https://ellosuit.online/dashboard?error=${encodeURIComponent(error.message)}`
      }
    });
  }
});
