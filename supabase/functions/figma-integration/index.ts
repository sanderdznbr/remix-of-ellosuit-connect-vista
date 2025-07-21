
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { action, code, fileKey } = await req.json()

    const figmaClientId = Deno.env.get('FIGMA_CLIENT_ID')
    const figmaClientSecret = Deno.env.get('FIGMA_CLIENT_SECRET')

    if (!figmaClientId || !figmaClientSecret) {
      throw new Error('Figma credentials not configured')
    }

    switch (action) {
      case 'auth':
        const authUrl = `https://www.figma.com/oauth?client_id=${figmaClientId}&redirect_uri=${encodeURIComponent('https://ellosuit.online/figma-callback')}&scope=file_read&state=${user.id}&response_type=code`
        
        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'token':
        const tokenResponse = await fetch('https://www.figma.com/api/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: figmaClientId,
            client_secret: figmaClientSecret,
            redirect_uri: 'https://ellosuit.online/figma-callback',
            code: code,
            grant_type: 'authorization_code'
          })
        })

        const tokenData = await tokenResponse.json()
        
        if (tokenData.access_token) {
          // Store token in user's profile
          await supabaseClient
            .from('figma_integrations')
            .upsert({
              user_id: user.id,
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            })
        }

        return new Response(
          JSON.stringify(tokenData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'getFile':
        const { data: integration } = await supabaseClient
          .from('figma_integrations')
          .select('access_token')
          .eq('user_id', user.id)
          .single()

        if (!integration) {
          throw new Error('Figma not connected')
        }

        const fileResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
          headers: {
            'X-Figma-Token': integration.access_token
          }
        })

        const fileData = await fileResponse.json()

        return new Response(
          JSON.stringify(fileData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'getImages':
        const { data: imgIntegration } = await supabaseClient
          .from('figma_integrations')
          .select('access_token')
          .eq('user_id', user.id)
          .single()

        if (!imgIntegration) {
          throw new Error('Figma not connected')
        }

        const imagesResponse = await fetch(`https://api.figma.com/v1/images/${fileKey}?format=png&scale=2`, {
          headers: {
            'X-Figma-Token': imgIntegration.access_token
          }
        })

        const imagesData = await imagesResponse.json()

        return new Response(
          JSON.stringify(imagesData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Figma integration error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
