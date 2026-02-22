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

    // === SEND REMINDERS ===
    await sendEventReminders(supabase);
    await sendTaskReminders(supabase);
    await sendBirthdayReminders(supabase);

    // === EXISTING ROUTINE LOGIC ===
    await executeRoutines(supabase, now);

    return new Response(JSON.stringify({ success: true, timestamp: now }), {
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

// ==================== EVENT REMINDERS ====================
async function sendEventReminders(supabase: any) {
  try {
    const nowDate = new Date();
    const windows = [
      { minutes: 5, label: '5 minutos' },
      { minutes: 15, label: '15 minutos' },
      { minutes: 60, label: '1 hora' },
    ];

    for (const w of windows) {
      const from = new Date(nowDate.getTime() + (w.minutes - 1) * 60 * 1000).toISOString();
      const to = new Date(nowDate.getTime() + (w.minutes + 1) * 60 * 1000).toISOString();

      const { data: events } = await supabase
        .from('calendar_events')
        .select('id, title, start_date, created_by, company_id, meeting_link, assigned_user_id, event_type, attendees')
        .gte('start_date', from)
        .lte('start_date', to)
        .neq('status', 'cancelled');

      if (!events || events.length === 0) continue;
      console.log(`⏰ Found ${events.length} events starting in ~${w.label}`);

      for (const evt of events) {
        // Notify creator
        await sendReminderIfNew(supabase, {
          userId: evt.created_by,
          companyId: evt.company_id,
          eventId: evt.id,
          minutes: w.minutes,
          title: `⏰ Evento em ${w.label}!`,
          message: buildEventMessage(evt, w.label),
          meetingLink: evt.meeting_link,
          notificationType: 'event_upcoming',
        });

        // Notify assigned user if different
        if (evt.assigned_user_id && evt.assigned_user_id !== evt.created_by) {
          await sendReminderIfNew(supabase, {
            userId: evt.assigned_user_id,
            companyId: evt.company_id,
            eventId: evt.id,
            minutes: w.minutes,
            title: `⏰ Evento em ${w.label}!`,
            message: buildEventMessage(evt, w.label),
            meetingLink: evt.meeting_link,
            notificationType: 'event_upcoming',
          });
        }
      }
    }
  } catch (err) {
    console.error('⚠️ Error in event reminders:', err);
  }
}

function buildEventMessage(evt: any, timeLabel: string): string {
  let msg = `"${evt.title}" começa em ${timeLabel}`;
  if (evt.meeting_link) {
    msg += `\n\n🔗 Link da reunião: ${evt.meeting_link}`;
  }
  return msg;
}

async function sendReminderIfNew(supabase: any, opts: {
  userId: string;
  companyId: string;
  eventId: string;
  minutes: number;
  title: string;
  message: string;
  meetingLink?: string;
  notificationType: string;
}) {
  // Dedup check
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', opts.userId)
    .contains('metadata', {
      event_id: opts.eventId,
      notification_type: opts.notificationType,
      minutes_until: opts.minutes,
    })
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`⏭️ Skipping duplicate for event ${opts.eventId} (${opts.minutes}min, user ${opts.userId.slice(0, 8)})`);
    return;
  }

  await supabase.functions.invoke('send-user-notification', {
    body: {
      user_id: opts.userId,
      company_id: opts.companyId,
      title: opts.title,
      message: opts.message,
      notification_type: opts.notificationType,
      category: 'calendar',
      icon: 'Clock',
      action_url: opts.meetingLink || '/dashboard/agenda',
      metadata: {
        event_id: opts.eventId,
        minutes_until: opts.minutes,
        meeting_link: opts.meetingLink || null,
      },
    },
  }).catch((e: any) => console.error('Notify error:', e));
}

// ==================== TASK REMINDERS ====================
async function sendTaskReminders(supabase: any) {
  try {
    const nowDate = new Date();
    const taskFrom = nowDate.toISOString();
    const taskTo = new Date(nowDate.getTime() + 31 * 60 * 1000).toISOString();

    const { data: dueTasks } = await supabase
      .from('calendar_events')
      .select('id, title, start_date, created_by, company_id, assigned_user_id')
      .in('event_type', ['task', 'reminder'])
      .eq('status', 'pending')
      .gte('start_date', taskFrom)
      .lte('start_date', taskTo);

    if (!dueTasks || dueTasks.length === 0) return;
    console.log(`✅ Found ${dueTasks.length} tasks due soon`);

    for (const task of dueTasks) {
      const targetUser = task.assigned_user_id || task.created_by;

      await sendReminderIfNew(supabase, {
        userId: targetUser,
        companyId: task.company_id,
        eventId: task.id,
        minutes: 0,
        title: '✅⏰ Tarefa prestes a vencer',
        message: `"${task.title}" deve ser realizada agora`,
        notificationType: 'task_due',
      });

      // Also notify creator if assigned to someone else
      if (task.assigned_user_id && task.assigned_user_id !== task.created_by) {
        await sendReminderIfNew(supabase, {
          userId: task.created_by,
          companyId: task.company_id,
          eventId: task.id,
          minutes: 0,
          title: '✅⏰ Tarefa do colaborador prestes a vencer',
          message: `A tarefa "${task.title}" atribuída ao colaborador está prestes a vencer`,
          notificationType: 'task_due',
        });
      }
    }
  } catch (err) {
    console.error('⚠️ Error in task reminders:', err);
  }
}

// ==================== BIRTHDAY REMINDERS ====================
async function sendBirthdayReminders(supabase: any) {
  try {
    const now = new Date();
    // Run only once per day around 8-9 AM BRT (11-12 UTC)
    const utcHour = now.getUTCHours();
    if (utcHour < 11 || utcHour > 12) return;

    const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
    const todayDay = String(now.getDate()).padStart(2, '0');
    const birthdayPattern = `%-${todayMonth}-${todayDay}%`;

    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, birth_date, company_id, created_by')
      .not('birth_date', 'is', null)
      .like('birth_date', birthdayPattern);

    if (!clients || clients.length === 0) return;
    console.log(`🎂 Found ${clients.length} client birthdays today`);

    for (const client of clients) {
      await sendReminderIfNew(supabase, {
        userId: client.created_by,
        companyId: client.company_id,
        eventId: `birthday-${client.id}-${todayMonth}${todayDay}`,
        minutes: 0,
        title: '🎂 Aniversário de cliente!',
        message: `Hoje é aniversário de ${client.name}! Que tal enviar uma mensagem de parabéns?`,
        notificationType: 'birthday_reminder',
      });
    }
  } catch (err) {
    console.error('⚠️ Error in birthday reminders:', err);
  }
}

// ==================== ROUTINE EXECUTION ====================
async function executeRoutines(supabase: any, now: string) {
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
    }
  }

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
    return;
  }

  console.log(`🔄 Found ${dueRoutines.length} due routine(s)`);

  for (const routine of dueRoutines) {
    try {
      let flowData: { nodes: any[]; edges: any[] } | null = null;
      try {
        flowData = routine.description ? JSON.parse(routine.description) : null;
      } catch {
        console.error(`❌ Invalid flow data for routine ${routine.id}`);
        continue;
      }

      if (!flowData?.nodes || !flowData?.edges) continue;

      const actionNodes = flowData.nodes.filter((n: any) => n.type === 'action');

      for (const actionNode of actionNodes) {
        const config = actionNode.data?.config || {};
        const subType = actionNode.subType;

        if (subType === 'create_task' || subType === 'add_to_calendar') {
          const taskTitle = config.taskTitle || config.title || routine.title;
          const nowDate = new Date();
          const endDate = new Date(nowDate);
          endDate.setMinutes(endDate.getMinutes() + (config.duration || 30));

          const eventData: any = {
            title: taskTitle,
            description: config.description || `Criado automaticamente pelo hábito: ${routine.title}`,
            start_date: nowDate.toISOString(),
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

          const { error: insertError } = await supabase.from('calendar_events').insert(eventData);
          if (insertError) {
            console.error(`❌ Error creating event for routine ${routine.id}:`, insertError);
          } else {
            console.log(`✅ Created event "${taskTitle}" for routine "${routine.title}"`);
          }
        }
      }

      const nextRun = calculateNextRun(routine);
      await supabase.from('task_routines').update({
        last_run_at: now,
        next_run_at: nextRun,
      }).eq('id', routine.id);

      console.log(`📅 Next run for "${routine.title}": ${nextRun}`);
    } catch (routineError) {
      console.error(`❌ Error executing routine ${routine.id}:`, routineError);
    }
  }
}

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
    const daysOfWeek: number[] = routine.days_of_week || [1];
    for (let i = 1; i <= 7; i++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + i);
      candidate.setHours(hours, minutes, 0, 0);
      if (daysOfWeek.includes(candidate.getDay())) {
        return candidate.toISOString();
      }
    }
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

  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}
