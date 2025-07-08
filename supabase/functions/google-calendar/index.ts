
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

    const requestBody = await req.json();
    console.log('📨 Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { action, eventData, userId, accessToken, code, user_id, refreshToken } = requestBody;

    if (!action) {
      console.error('❌ No action specified in request');
      return new Response(JSON.stringify({ 
        error: 'Action is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        client_id: googleClientId 
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
          redirect_uri: 'https://ellosuit.online/dashboard',
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
      const { data: companyUser, error: companyError } = await supabaseClient
        .from('company_users')
        .select('company_id')
        .eq('user_id', userId || user_id)
        .maybeSingle();

      if (companyError || !companyUser) {
        console.error('❌ Error getting user company:', companyError);
        throw new Error('User not associated with company');
      }

      // Store integration
      const { error } = await supabaseClient
        .from('meeting_integrations')
        .upsert({
          user_id: userId || user_id,
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

    if (action === 'renew_token') {
      // Renew expired access token using refresh token
      console.log('Renewing access token...');
      
      if (!refreshToken || !userId) {
        console.error('Missing refreshToken or userId for token renewal');
        throw new Error('Missing refreshToken or userId for token renewal');
      }
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token renewal failed:', errorText);
        throw new Error(`Failed to renew token: ${tokenResponse.status}`);
      }

      const tokens = await tokenResponse.json();
      console.log('Tokens renewed successfully');
      
      // Update the stored integration with new token
      const { error } = await supabaseClient
        .from('meeting_integrations')
        .update({
          access_token: tokens.access_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('provider', 'google_meet');

      if (error) {
        console.error('Failed to update integration:', error);
        throw error;
      }

      console.log('Integration updated with new token');
      return new Response(JSON.stringify({ 
        success: true, 
        access_token: tokens.access_token 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_code_gmail') {
      // Exchange authorization code for Gmail access token
      console.log('Exchanging code for Gmail tokens...');
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: 'https://ellosuit.online/dashboard',
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Gmail token exchange failed:', errorText);
        throw new Error(`Failed to exchange code for Gmail token: ${tokenResponse.status}`);
      }

      const tokens = await tokenResponse.json();
      
      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      const userInfo = await userInfoResponse.json();
      
      // Get user company
      const { data: companyUser, error: companyError } = await supabaseClient
        .from('company_users')
        .select('company_id')
        .eq('user_id', user_id)
        .maybeSingle();

      if (companyError || !companyUser) {
        console.error('❌ Error getting user company for Gmail:', companyError);
        throw new Error('User not associated with company');
      }

      // Store Gmail integration
      const { error } = await supabaseClient
        .from('user_email_accounts')
        .upsert({
          user_id: user_id,
          company_id: companyUser.company_id,
          provider: 'gmail',
          email: userInfo.email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          provider_user_id: userInfo.id
        });

      if (error) {
        console.error('Failed to store Gmail integration:', error);
        throw error;
      }

      console.log('Gmail integration stored successfully');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create_event') {
      // Create Google Calendar event
      console.log('Creating Google Calendar event...', eventData);
      
      if (!accessToken) {
        console.error('Access token is required for creating events');
        throw new Error('Access token is required for creating events');
      }

      // Validate eventData
      if (!eventData || !eventData.title || !eventData.start_date || !eventData.end_date) {
        console.error('Invalid event data:', eventData);
        throw new Error('Missing required event data (title, start_date, end_date)');
      }

      // Processar datetime corretamente - garantir formato ISO
      const processDateTime = (dateTimeStr) => {
        try {
          let date;
          if (typeof dateTimeStr === 'string' && dateTimeStr.includes('T')) {
            // Se já tem timezone ou formato ISO, usar direto
            date = new Date(dateTimeStr);
          } else {
            // Se não tem timezone, assumir que é horário local do Brasil
            date = new Date(dateTimeStr);
          }
          
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${dateTimeStr}`);
          }
          
          console.log('Processing datetime:', dateTimeStr, '-> ISO:', date.toISOString());
          return date.toISOString();
        } catch (error) {
          console.error('Error processing datetime:', dateTimeStr, error);
          throw new Error(`Invalid datetime format: ${dateTimeStr}`);
        }
      };

      const startDateTime = processDateTime(eventData.start_date);
      const endDateTime = processDateTime(eventData.end_date);

      console.log('Processed dates:', { startDateTime, endDateTime });

      const calendarEvent = {
        summary: eventData.title,
        description: eventData.description || '',
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: endDateTime,
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
        attendees: (eventData.attendees || []).map((attendee) => ({
          email: attendee.email,
          displayName: attendee.displayName || attendee.email
        }))
      };

      console.log('Calendar event payload:', JSON.stringify(calendarEvent, null, 2));

      console.log('Making request to Google Calendar API...');
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      });

      const responseText = await response.text();
      console.log('Google Calendar API response status:', response.status);
      console.log('Google Calendar API response:', responseText);

      if (!response.ok) {
        console.error('Google Calendar API error:', responseText, 'Status:', response.status);
        
        if (response.status === 401) {
          throw new Error('Access token expired or invalid. Please reconnect Google Calendar.');
        }
        
        throw new Error(`Google Calendar API error: ${response.status} - ${responseText}`);
      }

      const createdEvent = JSON.parse(responseText);
      console.log('Event created successfully:', createdEvent.id);
      
      // Extract Google Meet link
      const meetLink = createdEvent.conferenceData?.entryPoints?.find(
        (entry) => entry.entryPointType === 'video'
      )?.uri;

      console.log('Google Meet link:', meetLink);

      return new Response(JSON.stringify({ 
        success: true, 
        googleEventId: createdEvent.id,
        meetLink: meetLink || null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'import_events') {
      // Import Google Calendar events
      console.log('Importing Google Calendar events...');
      
      if (!accessToken) {
        throw new Error('Access token is required for importing events');
      }

      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Google Calendar API error during import:', error);
        throw new Error(`Failed to fetch events: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const events = data.items || [];
      
      console.log(`Found ${events.length} events in Google Calendar`);

      const { data: companyUser, error: companyError } = await supabaseClient
        .from('company_users')
        .select('company_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (companyError || !companyUser) {
        console.error('❌ Error getting user company for import:', companyError);
        throw new Error('User not associated with company');
      }

      let importedCount = 0;

      for (const event of events) {
        try {
          const { data: existingEvent } = await supabaseClient
            .from('calendar_events')
            .select('id')
            .eq('title', event.summary || 'Evento sem título')
            .eq('start_date', event.start.dateTime || event.start.date)
            .maybeSingle();

          if (existingEvent) {
            continue;
          }

          const { error: insertError } = await supabaseClient
            .from('calendar_events')
            .insert({
              title: event.summary || 'Evento sem título',
              description: event.description || '',
              start_date: event.start.dateTime || event.start.date,
              end_date: event.end.dateTime || event.end.date,
              event_type: 'meeting',
              company_id: companyUser.company_id,
              created_by: userId,
              meeting_link: event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri || null,
              meeting_provider: event.conferenceData ? 'google_meet' : null,
              is_all_day: !event.start.dateTime,
              attendees: event.attendees || []
            });

          if (!insertError) {
            importedCount++;
          }
        } catch (eventError) {
          console.error(`Error importing event ${event.summary}:`, eventError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        imported: importedCount,
        total: events.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ação para processar agendamentos públicos
    if (action === 'process_public_booking') {
      const { bookingData } = eventData;
      
      console.log('Processing public booking:', bookingData);
      
      // Criar evento no calendário do usuário
      const { error: eventError } = await supabaseClient
        .from('calendar_events')
        .insert({
          title: `Reunião com ${bookingData.client_name}`,
          description: `Reunião agendada publicamente\nCliente: ${bookingData.client_name}\nEmail: ${bookingData.client_email}\nTelefone: ${bookingData.client_phone || 'Não informado'}\nObservações: ${bookingData.notes || 'Nenhuma'}`,
          start_date: `${bookingData.booking_date}T${bookingData.booking_time}:00-03:00`,
          end_date: `${bookingData.booking_date}T${String(parseInt(bookingData.booking_time.split(':')[0]) + 1).padStart(2, '0')}:${bookingData.booking_time.split(':')[1]}:00-03:00`,
          event_type: 'appointment',
          company_id: bookingData.company_id,
          created_by: bookingData.user_id,
          attendees: [{
            email: bookingData.client_email,
            displayName: bookingData.client_name
          }],
          is_all_day: false
        });

      if (eventError) {
        console.error('Error creating calendar event:', eventError);
        throw eventError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.error('Invalid action:', action);
    throw new Error('Invalid action');

  } catch (error) {
    console.error('💥 Error in google-calendar function:', error);
    console.error('📋 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
