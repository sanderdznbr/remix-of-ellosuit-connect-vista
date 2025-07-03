
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, eventData, userId, accessToken, code } = await req.json();

    // Get Google credentials from environment
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
      console.error('Google credentials not configured');
      return new Response(JSON.stringify({ 
        error: 'Google credentials not configured in Supabase secrets' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action to get Google Client ID
    if (action === 'get_client_id') {
      return new Response(JSON.stringify({ 
        clientId: googleClientId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_code') {
      // Exchange authorization code for access token
      console.log('Exchanging code for tokens...');
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: `${req.headers.get('origin')}/`,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(`Failed to exchange code for token: ${tokenResponse.status}`);
      }

      const tokens = await tokenResponse.json();
      console.log('Tokens received successfully');
      
      // Get user company
      const { data: companyUser } = await supabaseClient
        .from('company_users')
        .select('company_id')
        .eq('user_id', userId)
        .single();

      if (!companyUser) {
        throw new Error('User not associated with company');
      }

      // Store integration
      const { error } = await supabaseClient
        .from('meeting_integrations')
        .upsert({
          user_id: userId,
          company_id: companyUser.company_id,
          provider: 'google_meet',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        });

      if (error) {
        console.error('Failed to store integration:', error);
        throw error;
      }

      console.log('Integration stored successfully');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create_event') {
      // Create Google Calendar event
      const calendarEvent = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.start_date,
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: eventData.end_date,
          timeZone: 'America/Sao_Paulo',
        },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        attendees: eventData.attendees || []
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Google Calendar API error:', error);
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const createdEvent = await response.json();
      
      // Extract Google Meet link
      const meetLink = createdEvent.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === 'video'
      )?.uri;

      return new Response(JSON.stringify({ 
        success: true, 
        googleEventId: createdEvent.id,
        meetLink: meetLink
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in google-calendar function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
