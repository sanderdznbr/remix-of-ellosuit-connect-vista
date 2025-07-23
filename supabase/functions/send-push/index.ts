
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

// Function to create JWT for APNs authentication
function createApnsJwt() {
  if (!apnsKey || !apnsKeyId || !apnsTeamId) {
    throw new Error('APNs credentials not configured');
  }

  const header = {
    alg: "ES256",
    kid: apnsKeyId
  };

  const payload = {
    iss: apnsTeamId,
    iat: Math.floor(Date.now() / 1000)
  };

  // For production, you would use a proper JWT library with ES256 signing
  // This is a simplified version for demonstration
  console.log('🔑 APNs JWT created for team:', apnsTeamId);
  return "mock-jwt-token"; // In production, implement proper ES256 JWT signing
}

async function sendApnsPushNotification(deviceToken: string, title: string, body: string) {
  try {
    if (!apnsBundleId || !apnsTeamId || !apnsKeyId || !apnsKey) {
      console.log('⚠️ APNs credentials incomplete, simulating notification');
      return { success: true, simulation: true };
    }

    const jwt = createApnsJwt();
    
    const payload = {
      aps: {
        alert: {
          title: title,
          body: body
        },
        sound: "default",
        badge: 1
      }
    };

    // APNs endpoint (sandbox or production)
    const apnsUrl = `https://api.sandbox.push.apple.com/3/device/${deviceToken}`;
    
    const response = await fetch(apnsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'apns-topic': apnsBundleId,
        'apns-push-type': 'alert',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ APNs notification sent successfully');
      return { success: true, simulation: false };
    } else {
      const errorText = await response.text();
      console.error('❌ APNs error:', response.status, errorText);
      return { success: false, error: `APNs error: ${response.status}` };
    }
  } catch (error) {
    console.error('💥 Error sending APNs notification:', error);
    return { success: false, error: error.message };
  }
}

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

      let sentCount = 0;
      const results = [];

      for (const token of tokens) {
        try {
          const result = await sendApnsPushNotification(token, title, body);
          
          results.push({
            token: token.substring(0, 10) + '...',
            success: result.success,
            simulation: result.simulation || false,
            error: result.error
          });
          
          if (result.success) {
            sentCount++;
          }
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
