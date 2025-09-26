import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      const {
        documentId,
        sessionId,
        eventType,
        pageNumber,
        data,
        visitorId
      } = await req.json();

      // Get client info
      const userAgent = req.headers.get('user-agent');
      const forwardedFor = req.headers.get('x-forwarded-for');
      const realIP = req.headers.get('x-real-ip');
      const ipAddress = forwardedFor?.split(',')[0] || realIP || 'unknown';

      console.log('Tracking event:', {
        documentId,
        sessionId,
        eventType,
        pageNumber,
        data,
        visitorId,
        userAgent: userAgent?.substring(0, 200), // Limit length
        ipAddress
      });

      // Insert tracking event
      const { error } = await supabase
        .from('document_tracking_events')
        .insert({
          document_id: documentId,
          session_id: sessionId,
          event_type: eventType,
          page_number: pageNumber,
          data: data || {},
          user_agent: userAgent?.substring(0, 200),
          ip_address: ipAddress,
          visitor_id: visitorId
        });

      if (error) {
        console.error('Error inserting tracking event:', error);
        throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const documentId = url.searchParams.get('documentId');

      if (!documentId) {
        throw new Error('documentId is required');
      }

      // Get document stats
      const { data: stats, error } = await supabase
        .from('document_tracking_events')
        .select(`
          event_type,
          page_number,
          data,
          timestamp,
          visitor_id,
          session_id
        `)
        .eq('document_id', documentId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching tracking stats:', error);
        throw error;
      }

      // Process stats
      const sessionIds = [...new Set(stats?.map(s => s.session_id))];
      const uniqueVisitors = [...new Set(stats?.filter(s => s.visitor_id).map(s => s.visitor_id))];
      
      const pageViews = stats?.filter(s => s.event_type === 'page_view') || [];
      const pageStats = pageViews.reduce((acc, view) => {
        const page = view.page_number || 1;
        if (!acc[page]) {
          acc[page] = { views: 0, timeSpent: 0, visitors: new Set() };
        }
        acc[page].views++;
        if (view.visitor_id) {
          acc[page].visitors.add(view.visitor_id);
        }
        return acc;
      }, {} as Record<number, { views: number, timeSpent: number, visitors: Set<string> }>);

      // Convert sets to arrays for JSON serialization
      const processedPageStats = Object.entries(pageStats).map(([page, data]) => ({
        page: parseInt(page),
        views: data.views,
        uniqueVisitors: data.visitors.size,
        timeSpent: data.timeSpent
      }));

      const response = {
        totalSessions: sessionIds.length,
        uniqueVisitors: uniqueVisitors.length,
        totalEvents: stats?.length || 0,
        pageStats: processedPageStats,
        recentEvents: stats?.slice(0, 50) || []
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error) {
    console.error('Error in document-tracking function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});