import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LiveKit JWT Token implementation (compatible with LiveKit server SDK)
class LiveKitAccessToken {
  private apiKey: string;
  private apiSecret: string;
  private identity: string;
  private name?: string;
  private ttl: string;
  private grants: any = {};

  constructor(apiKey: string, apiSecret: string, options: { identity: string; name?: string; ttl: string }) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.identity = options.identity;
    this.name = options.name;
    this.ttl = options.ttl;
  }

  addGrant(grant: any) {
    this.grants = { ...this.grants, ...grant };
  }

  async toJwt(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.parseTTL(this.ttl);

    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload = {
      iss: this.apiKey,
      sub: this.identity,
      name: this.name,
      iat: now,
      exp: exp,
      video: this.grants
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = await this.sign(`${encodedHeader}.${encodedPayload}`, this.apiSecret);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private parseTTL(ttl: string): number {
    if (ttl.endsWith('h')) {
      return parseInt(ttl) * 3600;
    }
    if (ttl.endsWith('m')) {
      return parseInt(ttl) * 60;
    }
    return parseInt(ttl);
  }

  private base64UrlEncode(str: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return btoa(String.fromCharCode(...data))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private async sign(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { roomName, participantName } = await req.json();
    
    if (!roomName || !participantName) {
      throw new Error('roomName and participantName are required');
    }

    console.log('Generating token for:', { roomName, participantName, userId: user.id });

    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!livekitUrl || !apiKey || !apiSecret) {
      throw new Error('LiveKit credentials not configured');
    }

    // Create access token
    const at = new LiveKitAccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: participantName,
      ttl: '1h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    console.log('Token generated successfully for room:', roomName);

    return new Response(JSON.stringify({ 
      token,
      url: livekitUrl,
      roomName,
      participantName,
      userId: user.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});