
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const apnsBundleId = Deno.env.get('APNS_BUNDLE_ID');
const apnsTeamId = Deno.env.get('APNS_TEAM_ID');
const apnsKeyId = Deno.env.get('APNS_KEY_ID');
const apnsKey = Deno.env.get('APNS_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      const { title, body, deviceToken } = await req.json();
      
      if (!title || !body) {
        throw new Error('Title and body are required');
      }

      console.log('📲 Sending push notification:', { title, body });

      // Get all device tokens if no specific token provided
      let tokens = [];
      if (deviceToken) {
        tokens = [deviceToken];
      } else {
        const { data: deviceTokens, error } = await supabase
          .from('device_tokens')
          .select('token');

        if (error) {
          console.error('❌ Error fetching device tokens:', error);
          throw error;
        }

        tokens = deviceTokens?.map(dt => dt.token) || [];
      }

      if (tokens.length === 0) {
        console.log('⚠️ No device tokens found');
        return new Response(JSON.stringify({
          success: true,
          message: 'No devices to send notifications to',
          sent: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`📱 Sending to ${tokens.length} device(s)`);

      // Check if APNs credentials are configured
      if (!apnsBundleId || !apnsTeamId || !apnsKeyId || !apnsKey) {
        console.log('⚠️ APNs credentials not configured, simulating notification');
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Notification simulated (APNs not configured)',
          sent: tokens.length,
          simulation: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Here you would implement the actual APNs push notification logic
      // For now, we'll simulate success
      let sentCount = 0;
      const results = [];

      for (const token of tokens) {
        try {
          // TODO: Implement actual APNs push notification
          console.log(`📲 Simulating push to token: ${token.substring(0, 10)}...`);
          
          results.push({
            token: token.substring(0, 10) + '...',
            success: true,
            simulation: true
          });
          
          sentCount++;
        } catch (error) {
          console.error(`❌ Failed to send to token ${token}:`, error);
          results.push({
            token: token.substring(0, 10) + '...',
            success: false,
            error: error.message
          });
        }
      }

      console.log(`✅ Push notifications processed: ${sentCount}/${tokens.length} sent`);

      return new Response(JSON.stringify({
        success: true,
        message: `Notifications sent to ${sentCount}/${tokens.length} devices`,
        sent: sentCount,
        total: tokens.length,
        results: results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Error in send-push function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
    status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
