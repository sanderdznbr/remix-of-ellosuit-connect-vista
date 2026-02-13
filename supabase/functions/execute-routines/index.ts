import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date().toISOString();
    console.log('⏰ Checking routines at:', now);

    // Fix active routines missing next_run_at
    const { data: missingNextRun } = await supabase
      .from('task_routines')
      .select('*')
      .eq('is_active', true)
      .is('next_run_at', null);

    if (missingNextRun && missingNextRun.length > 0) {
      console.log(`🔧 Fixing ${missingNextRun.length} routine(s) missing next_run_at`);
      for (const r of missingNextRun) {
        const nextRun = calculateNextRun(r);
        await supabase.from('task_routines').update({ next_run_at: nextRun }).eq('id', r.id);
        console.log(`  Fixed "${r.title}" -> ${nextRun}`);
      }
    }

    // Find active routines that are due
    const { data: dueRoutines, error: fetchError } = await supabase
      .from('task_routines')
      .select('*')
      .eq('is_active', true)
      .not('next_run_at', 'is', null)
      .lte('next_run_at', now);

    if (fetchError) {
      console.error('❌ Error fetching routines:', fetchError);
      throw fetchError;
    }

    if (!dueRoutines || dueRoutines.length === 0) {
      console.log('✅ No routines due');
      return new Response(JSON.stringify({ executed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔄 Found ${dueRoutines.length} due routine(s)`);
    let executed = 0;

    for (const routine of dueRoutines) {
      try {
        // Parse flow data from description
        let flowData: { nodes: any[]; edges: any[] } | null = null;
        try {
          flowData = routine.description ? JSON.parse(routine.description) : null;
        } catch {
          console.error(`❌ Invalid flow data for routine ${routine.id}`);
          continue;
        }

        if (!flowData?.nodes || !flowData?.edges) {
          console.log(`⚠️ No flow data for routine ${routine.id}`);
          continue;
        }

        // Find action nodes connected to trigger
        const actionNodes = flowData.nodes.filter((n: any) => n.type === 'action');
        
        for (const actionNode of actionNodes) {
          const config = actionNode.data?.config || {};
          const subType = actionNode.subType;

          console.log(`🎯 Executing action: ${subType} for routine: ${routine.title}`);

          if (subType === 'create_task' || subType === 'add_to_calendar') {
            // Create a calendar event (which shows in both Tasks and Agenda)
            const taskTitle = config.taskTitle || config.title || routine.title;
            const nowDate = new Date();
            const startDate = new Date(nowDate);
            const endDate = new Date(nowDate);
            endDate.setMinutes(endDate.getMinutes() + (config.duration || 30));

            const eventData: any = {
              title: taskTitle,
              description: config.description || `Criado automaticamente pelo hábito: ${routine.title}`,
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              event_type: 'reminder',
              company_id: routine.company_id,
              created_by: routine.created_by,
              color: routine.color || '#3000E3',
              status: 'pending',
              source: 'habit',
            };

            if (routine.assigned_user_id) {
              eventData.assigned_user_id = routine.assigned_user_id;
            }

            const { error: insertError } = await supabase
              .from('calendar_events')
              .insert(eventData);

            if (insertError) {
              console.error(`❌ Error creating event for routine ${routine.id}:`, insertError);
            } else {
              console.log(`✅ Created event "${taskTitle}" for routine "${routine.title}"`);
              executed++;
            }
          }
        }

        // Calculate next run
        const nextRun = calculateNextRun(routine);
        
        await supabase
          .from('task_routines')
          .update({
            last_run_at: now,
            next_run_at: nextRun,
          })
          .eq('id', routine.id);

        console.log(`📅 Next run for "${routine.title}": ${nextRun}`);
      } catch (routineError) {
        console.error(`❌ Error executing routine ${routine.id}:`, routineError);
      }
    }

    console.log(`✅ Executed ${executed} action(s) from ${dueRoutines.length} routine(s)`);

    return new Response(JSON.stringify({ executed, routines: dueRoutines.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('💥 Error:', error);
    return new Response(JSON.stringify({ error: (error as any).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateNextRun(routine: any): string {
  const now = new Date();
  const timeParts = (routine.time_of_day || '09:00:00').split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  if (routine.frequency === 'daily') {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(hours, minutes, 0, 0);
    return next.toISOString();
  }

  if (routine.frequency === 'weekly') {
    const daysOfWeek: number[] = routine.days_of_week || [1]; // default Monday
    // Find next matching day
    for (let i = 1; i <= 7; i++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + i);
      candidate.setHours(hours, minutes, 0, 0);
      if (daysOfWeek.includes(candidate.getDay())) {
        return candidate.toISOString();
      }
    }
    // Fallback: next week same day
    const next = new Date(now);
    next.setDate(next.getDate() + 7);
    next.setHours(hours, minutes, 0, 0);
    return next.toISOString();
  }

  if (routine.frequency === 'monthly') {
    const dayOfMonth = routine.day_of_month || 1;
    const next = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth, hours, minutes, 0);
    return next.toISOString();
  }

  // Default: tomorrow
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}
