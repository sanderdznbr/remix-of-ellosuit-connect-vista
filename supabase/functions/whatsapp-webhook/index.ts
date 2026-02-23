import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

// ============== HELPER: Send admin notification ==============
async function notifyAdmin(supabase: any, params: {
  event_type: string;
  event_title: string;
  event_description?: string;
  user_id?: string;
  user_email?: string;
  company_id?: string;
  company_name?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    
    await fetch(`${SUPABASE_URL}/functions/v1/admin-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(params),
    });
    console.log(`[ADMIN-NOTIFY] Sent: ${params.event_type}`);
  } catch (e) {
    console.error("[ADMIN-NOTIFY] Failed:", e);
  }
}
// ============== HELPER: Check if JID is a group ==============
function isGroupJid(jid: string): boolean {
  return jid?.includes('@g.us') || false;
}

// ============== HELPER: Check if JID is a newsletter/channel ==============
function isNewsletterJid(jid: string): boolean {
  if (!jid) return false;
  // WhatsApp Channels/Newsletters use @newsletter suffix
  if (jid.includes('@newsletter')) return true;
  // Some Baileys versions send newsletters as @g.us but with specific patterns
  // Newsletter JIDs from "Updates" tab - detect by checking if it's a status broadcast variant
  return false;
}

// ============== HELPER: Validate phone/group ID ==============
function isValidIdentifier(id: string, isGroup: boolean): boolean {
  if (!id) return false;
  
  const digits = id.replace(/\D/g, '');
  
  if (isGroup) {
    // Groups have longer IDs (typically 18+ digits) - just check minimum
    return digits.length >= 8;
  } else {
    // Individual chats: 8+ digits (includes LIDs which can be 15+ digits)
    return digits.length >= 8;
  }
}

// ============== HELPER: Check if JID is a LID (Linked ID) ==============
function isLidJid(jid: string): boolean {
  return jid?.includes('@lid') || false;
}

// ============== HELPER: Clean phone/ID from JID ==============
function extractPhoneFromJid(jid: string, allowGroups: boolean = false): string | null {
  if (!jid) return null;
  
  const isGroup = isGroupJid(jid);
  const isLid = isLidJid(jid);
  
  // Skip groups if not allowed
  if (isGroup && !allowGroups) {
    return null;
  }
  
  // Extract identifier from JID (handle @lid, @s.whatsapp.net, @g.us, @c.us)
  let identifier = jid
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@c.us', '')
    .replace('@lid', '')
    .replace(/\D/g, ''); // Remove any remaining non-digits
  
  // Validate the extracted identifier
  if (!isValidIdentifier(identifier, isGroup)) {
    console.log(`[FILTER] Invalid identifier: ${identifier} (length: ${identifier.length}, isGroup: ${isGroup}, isLid: ${isLid})`);
    return null;
  }
  
  // NO longer prefix with 'lid_' - just return the digits
  // The real phone resolution happens at a higher level using remoteJidAlt
  return identifier;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const webhookSecret = req.headers.get('x-webhook-secret');
    const body = await req.json();
    
    const { event, sessionId, instanceName, data } = body;

    console.log(`[WhatsApp Webhook] Event: ${event}, Session: ${sessionId || instanceName}`);

    // Validate webhook secret if provided
    if (webhookSecret && sessionId) {
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('webhook_secret')
        .eq('id', sessionId)
        .single();
      
      if (session && session.webhook_secret !== webhookSecret) {
        console.error('Invalid webhook secret');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Log webhook event for debugging
    await supabase
      .from('whatsapp_webhook_events')
      .insert({
        session_id: sessionId,
        event_type: event,
        payload: body
      });

    switch (event) {
      // ==================== QR CODE RECEIVED ====================
      case 'qr':
      case 'qr.update': {
        const qrCode = data?.qrCode || data?.qr;
        
        if (qrCode && sessionId) {
          await supabase
            .from('whatsapp_sessions')
            .update({ 
              qr_code: qrCode,
              status: 'waiting_qr'
            })
            .eq('id', sessionId);
          
          console.log('QR Code updated for session:', sessionId);
        }
        break;
      }

      // ==================== CONNECTION UPDATE ====================
      case 'connection.update':
      case 'connection': {
        const { connection, isConnected, qr, phoneNumber, pushName, profilePicture } = data || {};
        
        if (sessionId) {
          const updateData: Record<string, unknown> = {};
          
          if (connection === 'open' || isConnected === true) {
            updateData.status = 'connected';
            updateData.connected_at = new Date().toISOString();
            updateData.last_seen_at = new Date().toISOString();
            
            // MIGRATE: When reconnecting, update all conversations from old sessions of same company+phone
            try {
              const { data: currentSession } = await supabase
                .from('whatsapp_sessions')
                .select('company_id, phone_number')
                .eq('id', sessionId)
                .single();
              
              if (currentSession?.company_id && currentSession?.phone_number) {
                // Find all OTHER sessions with same phone number in same company
                const { data: oldSessions } = await supabase
                  .from('whatsapp_sessions')
                  .select('id')
                  .eq('company_id', currentSession.company_id)
                  .eq('phone_number', currentSession.phone_number)
                  .neq('id', sessionId);
                
                if (oldSessions && oldSessions.length > 0) {
                  const oldSessionIds = oldSessions.map(s => s.id);
                  
                  // Migrate conversations to new session
                  const { data: migratedConvs } = await supabase
                    .from('whatsapp_conversations')
                    .update({ session_id: sessionId })
                    .in('session_id', oldSessionIds)
                    .select('id');
                  
                  // Migrate messages to new session
                  await supabase
                    .from('whatsapp_messages')
                    .update({ session_id: sessionId })
                    .in('session_id', oldSessionIds);
                  
                  console.log(`[SESSION-MIGRATE] Migrated ${migratedConvs?.length || 0} conversations from ${oldSessionIds.length} old sessions to ${sessionId}`);
                  
                  // Also migrate conversations that belong to the same company but have no session
                  await supabase
                    .from('whatsapp_conversations')
                    .update({ session_id: sessionId })
                    .eq('company_id', currentSession.company_id)
                    .is('session_id', null);
                }
              }
            } catch (migrationErr) {
              console.error('[SESSION-MIGRATE] Error migrating sessions:', migrationErr);
            }
          } else if (connection === 'close') {
            updateData.status = 'disconnected';
          } else if (connection === 'connecting') {
            updateData.status = 'connecting';
          }
          
          if (qr) updateData.qr_code = qr;
          if (phoneNumber) updateData.phone_number = phoneNumber;
          if (pushName) updateData.push_name = pushName;
          if (profilePicture) updateData.profile_picture = profilePicture;
          
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('whatsapp_sessions')
              .update(updateData)
              .eq('id', sessionId);
            
            console.log('Connection updated:', updateData);
            
            // Notify admin on connection/disconnection
            if (updateData.status === 'connected' || updateData.status === 'disconnected') {
              // Get session owner info
              const { data: sessionInfo } = await supabase
                .from('whatsapp_sessions')
                .select('company_id, phone_number, push_name')
                .eq('id', sessionId)
                .single();
              
              if (sessionInfo) {
                const { data: companyInfo } = await supabase
                  .from('companies')
                  .select('name')
                  .eq('id', sessionInfo.company_id)
                  .single();
                
                const isConnected = updateData.status === 'connected';
                notifyAdmin(supabase, {
                  event_type: isConnected ? 'whatsapp_connected' : 'whatsapp_disconnected',
                  event_title: isConnected
                    ? `Parabéns ${companyInfo?.name || sessionInfo.push_name || 'Usuário'}! Seu WhatsApp foi conectado em nosso sistema.`
                    : `O WhatsApp de ${companyInfo?.name || sessionInfo.push_name || 'Usuário'} foi desconectado.`,
                  event_description: `Número: ${sessionInfo.phone_number || phoneNumber || 'Desconhecido'}`,
                  company_id: sessionInfo.company_id,
                  company_name: companyInfo?.name,
                  metadata: { phone_number: sessionInfo.phone_number || phoneNumber, push_name: sessionInfo.push_name || pushName },
                });
              }
            }
          }
        }
        break;
      }

      // ==================== CHATS SYNC ====================
      case 'chats.upsert':
      case 'chats.set': {
        const chats = data?.chats || [];
        console.log(`[CHATS] Processing ${chats.length} chats`);
        
        // Get session info
        let targetSessionId = sessionId;
        let companyId = '';
        
        if (!targetSessionId && instanceName) {
          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('id, company_id')
            .eq('instance_name', instanceName)
            .single();
          
          if (session) {
            targetSessionId = session.id;
            companyId = session.company_id;
          }
        } else if (targetSessionId) {
          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('company_id')
            .eq('id', targetSessionId)
            .single();
          
          if (session) companyId = session.company_id;
        }
        
        if (!targetSessionId || !companyId) {
          console.log('Could not find session for chats');
          break;
        }
        
        let processedCount = 0;
        for (const chat of chats) {
          try {
            const jid = chat.id || chat.jid;
            if (!jid || jid === 'status@broadcast') continue;
            
            // Skip WhatsApp Channels/Newsletters (Updates tab)
            if (isNewsletterJid(jid)) {
              console.log(`[FILTER] Skipping newsletter/channel: ${jid}`);
              continue;
            }
            
            const isGroup = isGroupJid(jid);
            
            // For LID chats, try to resolve to real phone using alternative JID fields
            let resolvedJid = jid;
            if (isLidJid(jid) && !isGroup) {
              const altJid = chat.lidJid || chat.phoneJid || chat.altJid;
              if (altJid && !isLidJid(altJid)) {
                console.log(`[CHAT LID] Resolved ${jid} -> ${altJid}`);
                resolvedJid = altJid;
              }
            }
            
            // Extract and validate identifier (phone number or group ID)
            const phoneNumber = extractPhoneFromJid(resolvedJid, true);
            if (!phoneNumber) continue;
            
            // ============== IMPROVED: Get contact/group name ==============
            // For groups: prioritize groupSubject, subject, groupName
            // For individuals: prioritize name, notify, pushName - NEVER fall back to raw LID
            let contactName: string;
            if (isGroup) {
              contactName = chat.groupSubject || chat.subject || chat.groupName || 
                           chat.name || chat.metadata?.subject || phoneNumber;
              console.log(`[CHAT GROUP] ${phoneNumber} => "${contactName}"`);
            } else {
              contactName = chat.name || chat.notify || chat.pushName || chat.verifiedName || '';
              // If no name available, use phone number (not LID identifier)
              if (!contactName) contactName = phoneNumber;
            }
            
            // Profile picture - from enriched data or chat object
            const profilePicture = chat.profilePicture || chat.imgUrl || chat.picture || null;
            
            // Get last message info - handle multiple formats from Baileys
            const lastMsg = chat.conversationTimestamp || chat.lastMessage?.messageTimestamp;
            let lastMessageAt = new Date().toISOString();
            
            // Robust timestamp parsing
            const parseTimestamp = (ts: unknown): string | null => {
              try {
                if (!ts) return null;
                
                let timestamp: number;
                
                // Handle {high, low, unsigned} Long format from protobuf
                if (typeof ts === 'object' && ts !== null) {
                  const obj = ts as Record<string, unknown>;
                  if ('low' in obj && typeof obj.low === 'number') {
                    timestamp = obj.low;
                  } else if ('toNumber' in obj && typeof obj.toNumber === 'function') {
                    timestamp = (obj as { toNumber: () => number }).toNumber();
                  } else {
                    return null;
                  }
                } else if (typeof ts === 'string') {
                  timestamp = parseInt(ts, 10);
                } else if (typeof ts === 'number') {
                  timestamp = ts;
                } else {
                  return null;
                }
                
                // Validate timestamp is reasonable (after 2000, before 2100)
                if (isNaN(timestamp) || timestamp <= 0) return null;
                
                // Check if timestamp is in milliseconds (> year 2100 in seconds)
                const isMillis = timestamp > 4102444800;
                const dateMs = isMillis ? timestamp : timestamp * 1000;
                
                // Validate date range
                if (dateMs < 946684800000 || dateMs > 4102444800000) return null;
                
                const date = new Date(dateMs);
                if (isNaN(date.getTime())) return null;
                
                return date.toISOString();
              } catch {
                return null;
              }
            };
            
            const parsedTime = parseTimestamp(lastMsg);
            if (parsedTime) {
              lastMessageAt = parsedTime;
            }
            
            // Extract last message content
            let lastMessageContent = '';
            if (chat.messages && chat.messages.length > 0) {
              // Get last message from messages array
              const lastMsgObj = chat.messages[chat.messages.length - 1];
              const msgData = lastMsgObj?.message?.message || lastMsgObj?.message || {};
              lastMessageContent = msgData.conversation || 
                                   msgData.extendedTextMessage?.text ||
                                   msgData.imageMessage?.caption ||
                                   '[Mídia]';
            } else if (chat.lastMessage) {
              const msgContent = chat.lastMessage.message || chat.lastMessage;
              lastMessageContent = msgContent.conversation || 
                                   msgContent.extendedTextMessage?.text ||
                                   msgContent.imageMessage?.caption ||
                                   msgContent.videoMessage?.caption ||
                                   '';
            }
            
            // IMPROVED: First try to find existing conversation by company_id + contact_phone
            // This consolidates conversations across multiple sessions
            const { data: existingConv } = await supabase
              .from('whatsapp_conversations')
              .select('id, session_id, contact_name, profile_picture')
              .eq('company_id', companyId)
              .eq('contact_phone', phoneNumber)
              .order('last_message_at', { ascending: false })
              .limit(1)
              .single();
            
            if (existingConv) {
              // Update existing conversation
              // ============== PRESERVE DATA: Never overwrite with empty values ==============
              // Only update name if:
              // 1. We have a valid new name (not empty, not just the phone number)
              // 2. AND either the existing name is empty OR it's a group (groups can have name changes)
              const hasValidNewName = contactName && contactName.trim() && contactName !== phoneNumber;
              const existingNameEmpty = !existingConv.contact_name || existingConv.contact_name === phoneNumber;
              const shouldUpdateName = hasValidNewName && (isGroup || existingNameEmpty);
              
              const updatePayload: Record<string, unknown> = {
                session_id: targetSessionId, // ALWAYS update to current active session
                status: chat.archive ? 'archived' : 'open',
                last_message: lastMessageContent || chat.lastMessage?.conversation || '',
                last_message_at: lastMessageAt,
                unread_count: chat.unreadCount || 0
              };
              
              // Only update contact_name if we have a valid new name
              if (shouldUpdateName) {
                updatePayload.contact_name = contactName;
                console.log(`[CHAT] Updating name: "${existingConv.contact_name}" -> "${contactName}"`);
              }
              
              // Only update profile_picture if we have a valid new one AND existing is empty
              // NEVER overwrite existing picture with null/empty
              if (profilePicture && profilePicture.trim() && !existingConv.profile_picture) {
                updatePayload.profile_picture = profilePicture;
              }
              
              await supabase
                .from('whatsapp_conversations')
                .update(updatePayload)
                .eq('id', existingConv.id);
              processedCount++;
            } else {
              // Create new conversation
               const { error } = await supabase
                .from('whatsapp_conversations')
                .insert({
                  session_id: targetSessionId,
                  company_id: companyId,
                  contact_phone: phoneNumber,
                  contact_name: contactName,
                  profile_picture: profilePicture,
                  remote_jid: chat.id || (phoneNumber + '@s.whatsapp.net'),
                  status: chat.archive ? 'archived' : 'open',
                  last_message: lastMessageContent || chat.lastMessage?.conversation || '',
                  last_message_at: lastMessageAt,
                  unread_count: chat.unreadCount || 0
                });
              
              if (!error) processedCount++;
              else console.error(`[CHAT] Error creating ${contactName}:`, error.message);
            }
          } catch (e) {
            console.error(`[CHAT] Error syncing chat:`, e);
          }
        }
        
        console.log(`[CHATS] Finished: ${processedCount}/${chats.length} processed`);
        break;
      }

      // ==================== NEW MESSAGE ====================
      case 'messages.upsert':
      case 'message':
      case 'message.received': {
        const messages = data?.messages || (data ? [data] : []);

        // Resolve session context ONCE (fixes ReferenceError + improves perf)
        let targetSessionId = sessionId as string | undefined;
        let companyId = '';
        let sessionPhone = '';

        // Try by sessionId first
        if (targetSessionId) {
          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('company_id, phone_number')
            .eq('id', targetSessionId)
            .single();

          if (session) {
            companyId = session.company_id;
            sessionPhone = session.phone_number || '';
          }
        }

        // Fallback: if sessionId didn't resolve OR wasn't provided, try instanceName
        if (!companyId && instanceName) {
          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('id, company_id, phone_number')
            .eq('instance_name', instanceName)
            .single();

          if (session) {
            targetSessionId = session.id;
            companyId = session.company_id;
            sessionPhone = session.phone_number || '';
            console.log(`[Session] Resolved via instanceName fallback: ${instanceName} -> ${session.id}`);
          }
        }

        if (!targetSessionId || !companyId) {
          console.log(`Could not find session for message batch. sessionId=${sessionId}, instanceName=${instanceName}`);
          
          // Last resort: try to find ANY connected session that matches this sessionId pattern
          // The Baileys server may be sending a stale/old session ID
          if (sessionId) {
            const { data: connectedSessions } = await supabase
              .from('whatsapp_sessions')
              .select('id, company_id, phone_number')
              .eq('status', 'connected')
              .limit(10);
            
            if (connectedSessions && connectedSessions.length > 0) {
              // Use the first connected session as fallback
              const fallbackSession = connectedSessions[0];
              targetSessionId = fallbackSession.id;
              companyId = fallbackSession.company_id;
              sessionPhone = fallbackSession.phone_number || '';
              console.log(`[Session] Last-resort fallback: using connected session ${fallbackSession.id} for stale sessionId ${sessionId}`);
            }
          }
          
          if (!targetSessionId || !companyId) {
            break;
          }
        }

        for (const msg of messages) {
          const messageKey = msg.key || {};
          // Use remoteJidAlt if available (contains real phone number instead of LID)
          // This is critical for LID contacts where remoteJid is @lid but remoteJidAlt has the real @s.whatsapp.net JID
          let remoteJid = messageKey.remoteJidAlt || messageKey.remoteJid || msg.from || msg.remoteJid;
          
          // Log all available JID fields for debugging LID issues
          console.log(`[JID-DEBUG] remoteJid=${messageKey.remoteJid}, remoteJidAlt=${messageKey.remoteJidAlt}, msg.from=${msg.from}, msg.remoteJidAlt=${msg.remoteJidAlt}, msg.chatJid=${msg.chatJid}, resolved=${remoteJid}`);
          
          // Skip WhatsApp Channels/Newsletters (Updates tab)
          if (isNewsletterJid(remoteJid)) {
            console.log(`[FILTER] Skipping newsletter message from: ${remoteJid}`);
            continue;
          }
          
          // If still a LID, try to get real JID from other fields
          if (isLidJid(remoteJid)) {
            const altJid = msg.remoteJidAlt || msg.chatJid || msg.from;
            if (altJid && !isLidJid(altJid)) {
              console.log(`[LID] Resolved LID ${remoteJid} to real JID ${altJid}`);
              remoteJid = altJid;
            } else {
              console.log(`[LID-WARN] Could not resolve LID ${remoteJid}, no alternative JID available`);
            }
          }

          // ============== IMPROVED: Determine fromMe more reliably ==============
          // Compare sender with session phone to fix cases where Baileys misflags fromMe
          let fromMe = messageKey.fromMe || msg.fromMe || false;

          if (!fromMe && sessionPhone) {
            const senderJid = messageKey.participant || messageKey.remoteJid || '';
            const senderPhoneRaw = senderJid.replace(/@.*$/, '').replace(/\D/g, '');
            const sessionPhoneRaw = sessionPhone.replace(/\D/g, '');

            if (senderPhoneRaw && sessionPhoneRaw && senderPhoneRaw.includes(sessionPhoneRaw.slice(-8))) {
              console.log(`[MESSAGE] Correcting fromMe for sender ${senderPhoneRaw} matching session ${sessionPhoneRaw}`);
              fromMe = true;
            }
          }

          const messageId = messageKey.id || msg.id;
          
          // Skip protocol messages (sync notifications)
          if (msg.message?.protocolMessage) {
            console.log('Skipping protocol message');
            continue;
          }
          
          const isGroup = isGroupJid(remoteJid);
          
          // ============== GROUP MESSAGE: Extract actual sender ==============
          // Server v3.5.0+ sends senderPhone, senderName, and groupName directly
          // Fallback to extracting from messageKey.participant for older servers
          let senderPhone = '';
          let senderName = '';
          
          // First try direct fields from server v3.5.0+
          if (msg.senderPhone) {
            senderPhone = msg.senderPhone;
          }
          if (msg.senderName) {
            senderName = msg.senderName;
          }
          
          // Fallback: extract from participant JID for older server versions
          if (isGroup && !fromMe && !senderPhone) {
            const participantJid = messageKey.participant || msg.participant;
            if (participantJid) {
              senderPhone = extractPhoneFromJid(participantJid, false) || '';
              if (!senderName) {
                senderName = msg.pushName || '';
              }
            }
          }
          
          // For individual chats, sender is the contact
          if (!isGroup && !fromMe && !senderName) {
            senderName = msg.pushName || '';
          }
          
          if (isGroup && (senderName || senderPhone)) {
            console.log(`[GROUP MSG] Sender: ${senderName} (${senderPhone})`);
          }
          
          // Extract and validate identifier (allows groups now)
          const phoneNumber = extractPhoneFromJid(remoteJid, true);
          if (!phoneNumber) {
            console.log(`[FILTER] Skipping message - invalid identifier from JID: ${remoteJid}`);
            continue;
          }
          
          // Extract message content
          let content = '';
          let messageType = 'text';
          let mediaUrl = msg.mediaUrl || '';
          let mediaCaption = msg.mediaCaption || '';
          
          // Handle media from server v3.0.0+
          if (msg.mediaType) {
            messageType = msg.mediaType;
            if (msg.mediaUrl) {
              mediaUrl = msg.mediaUrl;
            }
          }
          
          const messageContent = msg.message || msg;
          
          if (messageContent.conversation) {
            content = messageContent.conversation;
          } else if (messageContent.extendedTextMessage) {
            content = messageContent.extendedTextMessage.text || '';
          } else if (messageContent.imageMessage) {
            messageType = 'image';
            mediaCaption = messageContent.imageMessage.caption || '';
            content = mediaCaption || '[Imagem]';
            // Log if no mediaUrl provided for debugging
            if (!mediaUrl) {
              console.log('[MEDIA] Image message without mediaUrl - server needs to upload to storage');
            }
          } else if (messageContent.videoMessage) {
            messageType = 'video';
            mediaCaption = messageContent.videoMessage.caption || '';
            content = mediaCaption || '[Vídeo]';
          } else if (messageContent.audioMessage) {
            messageType = messageContent.audioMessage.ptt ? 'ptt' : 'audio';
            content = '[Áudio]';
            console.log(`🎙️ [AUDIO-PARSE] Audio message detected. mediaUrl=${mediaUrl ? 'YES' : 'NO'}, fromMe=${fromMe}, sessionId=${targetSessionId}`);
            // Always try to download audio from Baileys server for incoming messages
            // Even if mediaUrl exists, it may be a temporary URL that's not publicly accessible
            if (!fromMe && targetSessionId) {
              try {
                const { data: sessAudio } = await supabase
                  .from('whatsapp_sessions')
                  .select('baileys_server_url, instance_name')
                  .eq('id', targetSessionId)
                  .single();
                if (sessAudio?.baileys_server_url) {
                  console.log(`🎙️ [AUDIO-DL] Downloading audio via Baileys server for msg ${messageId}`);
                  const abortCtrl = new AbortController();
                  const dlTimeout = setTimeout(() => abortCtrl.abort(), 15000);
                  try {
                    const dlResp = await fetch(`${sessAudio.baileys_server_url}/api/media/download`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ instanceName: sessAudio.instance_name, messageId, remoteJid }),
                      signal: abortCtrl.signal,
                    });
                    clearTimeout(dlTimeout);
                    if (dlResp.ok) {
                      const dlData = await dlResp.json();
                      if (dlData.base64 || dlData.url) {
                        if (dlData.base64) {
                          // Upload base64 audio to storage (preferred - creates persistent URL)
                          const audioFileName = `incoming-audio/${targetSessionId}/${messageId}.ogg`;
                          const binaryStr = atob(dlData.base64);
                          const audioBytes = new Uint8Array(binaryStr.length);
                          for (let i = 0; i < binaryStr.length; i++) audioBytes[i] = binaryStr.charCodeAt(i);
                          const { error: upErr } = await supabase.storage.from('whatsapp-media').upload(audioFileName, audioBytes, { contentType: 'audio/ogg', upsert: true });
                          if (!upErr) {
                            const { data: pubData } = supabase.storage.from('whatsapp-media').getPublicUrl(audioFileName);
                            mediaUrl = pubData.publicUrl;
                            console.log(`🎙️ [AUDIO-DL] Uploaded audio to storage: ${mediaUrl.substring(0, 80)}`);
                          } else {
                            console.error('🎙️ [AUDIO-DL] Upload error:', upErr);
                          }
                        } else if (dlData.url) {
                          mediaUrl = dlData.url;
                          console.log(`🎙️ [AUDIO-DL] Got audio URL: ${mediaUrl.substring(0, 80)}`);
                        }
                      } else {
                        console.log('🎙️ [AUDIO-DL] Response has no base64 or url');
                      }
                    } else {
                      console.log(`🎙️ [AUDIO-DL] Download endpoint returned ${dlResp.status}`);
                    }
                  } catch (fetchErr: any) {
                    clearTimeout(dlTimeout);
                    console.error(`🎙️ [AUDIO-DL] Fetch error (${fetchErr.name}):`, fetchErr.message);
                  }
                } else {
                  console.log('🎙️ [AUDIO-DL] No baileys_server_url for session');
                }
              } catch (dlErr) {
                console.error('🎙️ [AUDIO-DL] Error downloading audio:', dlErr);
              }
            }
          } else if (messageContent.documentMessage) {
            messageType = 'document';
            content = messageContent.documentMessage.fileName || '[Documento]';
          } else if (messageContent.stickerMessage) {
            messageType = 'sticker';
            content = '[Sticker]';
          } else if (messageContent.locationMessage) {
            messageType = 'location';
            content = '[Localização]';
          } else if (messageContent.contactMessage) {
            messageType = 'contact';
            content = messageContent.contactMessage.displayName || '[Contato]';
          } else if (msg.text || msg.content) {
            content = msg.text || msg.content;
          }
          
          if (!content && !mediaUrl) {
            console.log('Skipping message without jid or content');
            continue;
          }
          
          // Session context (targetSessionId/companyId/sessionPhone) resolved once per request above
          // (kept here intentionally blank)

          
          // SELF-MESSAGE FILTER: Skip messages where contact matches the session's own phone
          // But DO NOT filter for groups - we want to see our own messages in groups
          if (!isGroup) {
            const normalizedSessionPhone = sessionPhone.replace(/\D/g, '');
            const normalizedContactPhone = phoneNumber.replace(/\D/g, '');
            
            if (normalizedSessionPhone && normalizedContactPhone && (
              normalizedSessionPhone === normalizedContactPhone ||
              normalizedSessionPhone.endsWith(normalizedContactPhone) ||
              normalizedContactPhone.endsWith(normalizedSessionPhone)
            )) {
              console.log(`[SKIP] Self-message detected: session=${normalizedSessionPhone}, contact=${normalizedContactPhone}`);
              continue;
            }
          }
          
          // ============== DEDUPLICATION CHECK ==============
          // Check if this message already exists (by wa_message_id)
          if (messageId && messageId.trim()) {
            const { data: existingMsg } = await supabase
              .from('whatsapp_messages')
              .select('id')
              .eq('wa_message_id', messageId)
              .single();
            
            if (existingMsg) {
              console.log(`[DEDUP] Message already exists: ${messageId}`);
              continue;
            }
          }
          
          // ============== v4.1.0: Extract enhanced metadata ==============
          // Server v4.1.0 sends contactMetadata with profile picture, status, group info
          const contactMetadata = msg.contactMetadata || {};
          
          // Profile picture: prioritize contactMetadata (v4.1.0), then fallback to old fields
          const profilePicture = contactMetadata.profilePicture || 
                                 msg.profilePicture || 
                                 msg.senderProfilePic || 
                                 msg.groupProfilePic || 
                                 null;
          
          // Contact status (bio) - v4.1.0 only
          const contactStatus = contactMetadata.status || null;
          
          // Group description - v4.1.0 only
          const groupDescription = contactMetadata.groupDescription || null;
          
          // Group participants - v4.1.0 only
          const groupParticipants = contactMetadata.groupParticipants || null;
          
          // ============== IMPROVED: Contact/Group name resolution ==============
          // For groups: use groupName from server v3.5.0+
          // For individuals: use pushName only for incoming messages
          let contactName = phoneNumber;
          if (isGroup) {
            // Groups: prioritize groupName, groupSubject from server
            contactName = msg.groupName || msg.groupSubject || msg.subject || 
                          msg.groupMetadata?.subject || phoneNumber;
            console.log(`[GROUP] Resolved name: "${contactName}", description: ${groupDescription ? 'yes' : 'no'}, participants: ${groupParticipants?.length || 0}`);
          } else if (!fromMe) {
            // Individual incoming: use sender's pushName
            contactName = msg.pushName || msg.senderName || phoneNumber;
            if (contactStatus) {
              console.log(`[CONTACT] ${contactName} status: "${contactStatus}"`);
            }
          }
          
          // IMPROVED: Find conversation by company_id + contact_phone first (consolidates across sessions)
          let { data: conversation } = await supabase
            .from('whatsapp_conversations')
            .select('*')
            .eq('company_id', companyId)
            .eq('contact_phone', phoneNumber)
            .order('last_message_at', { ascending: false })
            .limit(1)
            .single();
          
          if (!conversation) {
            // Build insert payload with v4.1.0 enhanced fields
             const insertPayload: Record<string, unknown> = {
              session_id: targetSessionId,
              company_id: companyId,
              contact_phone: phoneNumber,
              contact_name: contactName,
              profile_picture: profilePicture,
              remote_jid: remoteJid,
              status: 'open',
              last_message: content,
              last_message_at: new Date().toISOString(),
              unread_count: fromMe ? 0 : 1
            };
            
            // v4.1.0: Add enhanced metadata fields
            if (contactStatus) insertPayload.contact_status = contactStatus;
            if (groupDescription) insertPayload.group_description = groupDescription;
            if (groupParticipants) insertPayload.group_participants = groupParticipants;
            
            const { data: newConv } = await supabase
              .from('whatsapp_conversations')
              .insert(insertPayload)
              .select()
              .single();
            
            conversation = newConv;

            // ==================== AUTO-TRIGGER CHATBOT FOR NEW CONVERSATIONS ====================
            // When a new conversation is created from an incoming message, check if there's
            // an active chatbot flow configured to auto-trigger on new WhatsApp conversations
            if (!fromMe && conversation && !isGroup) {
              try {
                console.log(`🤖🆕 [AUTO-TRIGGER] New conversation detected, checking for auto-trigger flows...`);
                
                // Find active chatbot flows with whatsapp_channel trigger for this company
                const { data: autoFlows } = await supabase
                  .from('chatbot_flows')
                  .select('id, name, nodes, edges, trigger_config, execution_count')
                  .eq('company_id', companyId)
                  .eq('is_active', true)
                  .order('updated_at', { ascending: false });

                if (autoFlows && autoFlows.length > 0) {
                  // Find flow with whatsapp_channel trigger (or conversation_start)
                  // IMPORTANT: Respect sessionId filter — only trigger if flow matches this session or has no session filter
                  const triggerFlow = autoFlows.find((f: any) => {
                    const tc = f.trigger_config as Record<string, unknown> | null;
                    if (!tc) return false;
                    if (tc.type !== 'whatsapp_channel' && tc.type !== 'conversation_start') return false;
                    // If flow has a specific sessionId, only trigger for that session
                    if (tc.sessionId && tc.sessionId !== targetSessionId) return false;
                    return true;
                  });

                  // Only use a default flow if it doesn't have a session restriction
                  const fallbackFlow = autoFlows.find((f: any) => {
                    const tc = f.trigger_config as Record<string, unknown> | null;
                    return !tc?.sessionId; // Only use flows without session filter as fallback
                  });
                  const flowToTrigger = triggerFlow || fallbackFlow;

                  if (flowToTrigger) {
                    // Check there's no existing execution for this conversation
                    const { data: existingExec } = await supabase
                      .from('chatbot_executions')
                      .select('id')
                      .eq('conversation_id', conversation.id)
                      .eq('status', 'running')
                      .limit(1);

                    if (!existingExec || existingExec.length === 0) {
                      console.log(`🤖🆕 [AUTO-TRIGGER] Starting flow "${flowToTrigger.name}" for new conversation ${conversation.id}`);

                      // Create execution record
                      const { data: newExec } = await supabase
                        .from('chatbot_executions')
                        .insert({
                          flow_id: flowToTrigger.id,
                          conversation_id: conversation.id,
                          contact_phone: phoneNumber,
                          status: 'running',
                          variables: {
                            nome: contactName || phoneNumber,
                            telefone: phoneNumber,
                          },
                          execution_path: [],
                          last_activity_at: new Date().toISOString(),
                        })
                        .select()
                        .single();

                      if (newExec) {
                        // Increment execution count
                        await supabase
                          .from('chatbot_flows')
                          .update({ execution_count: (flowToTrigger.execution_count || 0) + 1 })
                          .eq('id', flowToTrigger.id);

                        console.log(`🤖🆕 [AUTO-TRIGGER] Execution created: ${newExec.id}`);
                      }
                    } else {
                      console.log(`🤖🆕 [AUTO-TRIGGER] Execution already exists for conversation ${conversation.id}`);
                    }
                  }
                } else {
                  console.log(`🤖🆕 [AUTO-TRIGGER] No active chatbot flows found for company ${companyId}`);
                }
              } catch (autoTriggerErr) {
                console.error('🤖🆕 [AUTO-TRIGGER] Error:', autoTriggerErr);
              }
            }

            // ==================== AUTO-ASSIGN AI AGENT BY SESSION ====================
            // Check if any AI agent is configured to auto-respond on this specific WhatsApp session
            if (!fromMe && conversation && !isGroup) {
              try {
                // Check if a chatbot was already triggered for this conversation
                const { data: runningExec } = await supabase
                  .from('chatbot_executions')
                  .select('id')
                  .eq('conversation_id', conversation.id)
                  .eq('status', 'running')
                  .limit(1);

                const chatbotAlreadyRunning = runningExec && runningExec.length > 0;

                if (!chatbotAlreadyRunning) {
                  // Find an active AI agent bound to this specific WhatsApp session
                  const { data: boundAgent } = await supabase
                    .from('ai_agents')
                    .select('id, name')
                    .eq('company_id', companyId)
                    .eq('whatsapp_enabled', true)
                    .eq('whatsapp_session_id', targetSessionId)
                    .eq('is_active', true)
                    .limit(1)
                    .single();

                  if (boundAgent) {
                    console.log(`🤖🔗 [AUTO-ASSIGN] Agent "${boundAgent.name}" bound to session ${targetSessionId}, auto-assigning to conversation ${conversation.id}`);
                    await supabase
                      .from('whatsapp_conversations')
                      .update({
                        assigned_agent_id: boundAgent.id,
                        ai_auto_reply_enabled: true,
                      })
                      .eq('id', conversation.id);

                    // Send system message
                    await supabase.from('whatsapp_messages').insert({
                      company_id: companyId,
                      session_id: targetSessionId,
                      conversation_id: conversation.id,
                      content: `🤖 Agente "${boundAgent.name}" assumiu a conversa automaticamente.`,
                      from_me: true,
                      status: 'sent',
                      message_type: 'system',
                      sender_name: 'Sistema',
                    });
                  }
                }
              } catch (autoAssignErr) {
                console.error('🤖🔗 [AUTO-ASSIGN] Error:', autoAssignErr);
              }
            }
          } else {
            // Update conversation with latest info
            const updateData: Record<string, unknown> = {
              session_id: targetSessionId, // ALWAYS keep session_id current
              last_message: content,
              last_message_at: new Date().toISOString(),
              unread_count: fromMe ? conversation.unread_count : (conversation.unread_count || 0) + 1,
            };
            
            // ============== PRESERVE DATA: Never overwrite with empty values ==============
            // Only update name if:
            // 1. We have a valid new name (not empty, not just phone number)
            // 2. AND either existing is empty OR it's a group (groups can have name changes)
            const hasValidNewName = contactName && contactName.trim() && contactName !== phoneNumber;
            const existingNameEmpty = !conversation.contact_name || conversation.contact_name === phoneNumber;
            
            if (isGroup && hasValidNewName) {
              // For groups: update if we have a valid name
              updateData.contact_name = contactName;
              console.log(`[GROUP] Updating name to: "${contactName}"`);
            } else if (!fromMe && hasValidNewName && existingNameEmpty) {
              // For individuals: only update if incoming AND existing is empty
              updateData.contact_name = contactName;
            }
            // If incoming name is empty/null, DO NOT update - preserve existing
            
            // Only update profile_picture if we have valid new one AND existing is empty
            // NEVER overwrite existing picture with null/empty
            if (profilePicture && profilePicture.trim() && !conversation.profile_picture) {
              updateData.profile_picture = profilePicture;
            }
            
            // v4.1.0: Update enhanced metadata fields if provided
            if (contactStatus && !conversation.contact_status) {
              updateData.contact_status = contactStatus;
            }
            if (groupDescription && (!conversation.group_description || conversation.group_description !== groupDescription)) {
              updateData.group_description = groupDescription;
            }
            if (groupParticipants && groupParticipants.length > 0) {
              updateData.group_participants = groupParticipants;
            }
            // Always keep remote_jid up to date
            if (remoteJid && remoteJid.includes('@')) {
              updateData.remote_jid = remoteJid;
            }
            
            await supabase
              .from('whatsapp_conversations')
              .update(updateData)
              .eq('id', conversation.id);
          }

          // ==================== CONTACT BACKFILL (from messages) ====================
          // Garante que a aba Contatos não fique zerada mesmo quando o Baileys não emite contacts.set
          if (!isGroup && remoteJid) {
            try {
              const waId = remoteJid;
              const validPushName = contactName && contactName.trim() && contactName !== phoneNumber ? contactName.trim() : null;

              const { data: existingContact } = await supabase
                .from('whatsapp_contacts')
                .select('push_name, profile_picture')
                .eq('company_id', companyId)
                .eq('wa_id', waId)
                .maybeSingle();

              const contactUpsert: Record<string, unknown> = {
                company_id: companyId,
                session_id: targetSessionId,
                wa_id: waId,
                phone_number: phoneNumber,
                is_business: false,
              };

              if (validPushName) {
                contactUpsert.push_name = validPushName;
              } else if (existingContact?.push_name) {
                contactUpsert.push_name = existingContact.push_name;
              }

              if (profilePicture && profilePicture.trim()) {
                contactUpsert.profile_picture = profilePicture;
              } else if (existingContact?.profile_picture) {
                contactUpsert.profile_picture = existingContact.profile_picture;
              }

              const { error: contactErr } = await supabase
                .from('whatsapp_contacts')
                .upsert(contactUpsert, { onConflict: 'company_id,wa_id' });

              if (contactErr) {
                console.error('[CONTACTS] Backfill upsert error:', contactErr.message);
              }
            } catch (e) {
              console.error('[CONTACTS] Backfill error:', e);
            }
          }
          
          // Parse timestamp safely
          let msgTimestamp = new Date().toISOString();
          if (msg.messageTimestamp) {
            try {
              const ts = typeof msg.messageTimestamp === 'object' && msg.messageTimestamp.low
                ? msg.messageTimestamp.low
                : parseInt(msg.messageTimestamp);
              if (!isNaN(ts) && ts > 0) {
                const dateMs = ts > 4102444800 ? ts : ts * 1000;
                msgTimestamp = new Date(dateMs).toISOString();
              }
            } catch (e) {
              console.log('Timestamp parse error, using now');
            }
          }
          
          // Build message data
          const messageData: Record<string, unknown> = {
            conversation_id: conversation?.id,
            session_id: targetSessionId,
            company_id: companyId,
            from_me: fromMe,
            content: content,
            message_type: messageType,
            media_url: mediaUrl,
            media_caption: mediaCaption,
            status: fromMe ? 'sent' : 'received',
            timestamp: msgTimestamp
          };
          
          // Add sender info for group messages (non-fromMe only)
          if (senderPhone) {
            messageData.sender_phone = senderPhone;
          }
          if (senderName) {
            messageData.sender_name = senderName;
          }
          
          // Use upsert only if we have a valid message ID, otherwise insert
          if (messageId && messageId.trim()) {
            const { error: msgError } = await supabase
              .from('whatsapp_messages')
              .upsert({
                ...messageData,
                wa_message_id: messageId
              }, {
                onConflict: 'wa_message_id'
              });
            
            if (msgError) {
              console.error(`Message upsert error:`, msgError.message);
            } else {
              console.log(`Message saved: ${content.substring(0, 50)}...`);
              
              // ==================== OWNER INTERVENES → STOP AI ====================
              // If the owner/agent sends a message and AI auto-reply is active, disable it
              if (fromMe && conversation) {
                try {
                  const { data: convCheck } = await supabase
                    .from('whatsapp_conversations')
                    .select('id, assigned_agent_id, ai_auto_reply_enabled')
                    .eq('id', conversation.id)
                    .single();
                  
                  if (convCheck?.ai_auto_reply_enabled && convCheck?.assigned_agent_id) {
                    console.log(`👤 Owner intervened in conversation ${conversation.id}, stopping AI auto-reply`);
                    await supabase
                      .from('whatsapp_conversations')
                      .update({ ai_auto_reply_enabled: false, assigned_agent_id: null })
                      .eq('id', conversation.id);
                    
                    // Insert system message
                    await supabase.from('whatsapp_messages').insert({
                      company_id: companyId,
                      session_id: targetSessionId,
                      conversation_id: conversation.id,
                      content: '👤 Atendente assumiu a conversa. IA desativada.',
                      from_me: true,
                      status: 'sent',
                      message_type: 'system',
                      sender_name: 'Sistema',
                    });
                  }

                  // ==================== OWNER INTERVENES → STOP CHATBOT ====================
                  // Also stop any active chatbot execution when the owner sends a message
                  const { data: activeChatbotExecs } = await supabase
                    .from('chatbot_executions')
                    .select('id')
                    .eq('conversation_id', conversation.id)
                    .eq('status', 'running');
                  
                  if (activeChatbotExecs && activeChatbotExecs.length > 0) {
                    console.log(`👤 Owner intervened - stopping ${activeChatbotExecs.length} active chatbot execution(s)`);
                    await supabase
                      .from('chatbot_executions')
                      .update({ status: 'completed', completed_at: new Date().toISOString() })
                      .eq('conversation_id', conversation.id)
                      .eq('status', 'running');
                    
                    // Insert system message only if no AI message was already inserted
                    if (!convCheck?.ai_auto_reply_enabled) {
                      await supabase.from('whatsapp_messages').insert({
                        company_id: companyId,
                        session_id: targetSessionId,
                        conversation_id: conversation.id,
                        content: '👤 Atendente assumiu a conversa. Chatbot encerrado.',
                        from_me: true,
                        status: 'sent',
                        message_type: 'system',
                        sender_name: 'Sistema',
                      });
                    }
                  }
                } catch (ownerErr) {
                  console.error('Owner intervene check error:', ownerErr);
                }
              }

              // ==================== ORDER DETECTION: Skip chatbot for orders ====================
              let orderDetected = false;
              if (!fromMe && conversation && content) {
                const upperContent = content.toUpperCase();
                const isOrder = upperContent.includes('PEDIDO VIA WHATSAPP') ||
                  upperContent.includes('CÓDIGO DO PEDIDO') ||
                  (upperContent.includes('*PEDIDO') && upperContent.includes('*PRODUTOS*')) ||
                  (upperContent.includes('DADOS DO CLIENTE') && upperContent.includes('ENDEREÇO DE ENTREGA'));
                
                if (isOrder) {
                  orderDetected = true;
                  console.log(`📦 [ORDER] Order message detected in conversation ${conversation.id}, skipping chatbot/AI`);
                  
                  try {
                    // Send acknowledgement
                    const { data: sess } = await supabase
                      .from('whatsapp_sessions')
                      .select('baileys_server_url, instance_name')
                      .eq('id', targetSessionId)
                      .single();
                    
                    if (sess?.baileys_server_url) {
                      const jid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
                      const orderReply = `✅ Pedido recebido com sucesso!\n\nEstamos encaminhando para um atendente que irá dar andamento ao seu pedido. Aguarde, por favor! 🙏`;
                      
                      await fetch(`${sess.baileys_server_url}/api/message/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ instanceName: sess.instance_name, jid, message: orderReply }),
                      });
                      
                      // Save the reply as a message
                      await supabase.from('whatsapp_messages').insert({
                        session_id: targetSessionId,
                        conversation_id: conversation.id,
                        company_id: companyId,
                        content: orderReply,
                        from_me: true,
                        message_type: 'text',
                        status: 'sent',
                        sender_name: 'Sistema',
                      });
                      
                      console.log(`📦 [ORDER] Acknowledgement sent to ${phoneNumber}`);
                    }
                    
                    // Stop any active chatbot execution
                    await supabase
                      .from('chatbot_executions')
                      .update({ status: 'completed', completed_at: new Date().toISOString() })
                      .eq('conversation_id', conversation.id)
                      .eq('status', 'running');
                    
                    // Disable AI auto-reply if active
                    await supabase
                      .from('whatsapp_conversations')
                      .update({ ai_auto_reply_enabled: false, assigned_agent_id: null })
                      .eq('id', conversation.id);
                      
                  } catch (orderErr) {
                    console.error('📦 [ORDER] Error handling order:', orderErr);
                  }
                }
              }

              // ==================== MEETING RSVP DETECTION ====================
              // Check if incoming message is a response to a meeting invite
              let rsvpHandled = false;
              if (!fromMe && conversation && content && !orderDetected) {
                try {
                  const upperContent = content.trim().toUpperCase();
                  const isYes = upperContent === 'SIM' || upperContent === '1' || upperContent === 'YES' || upperContent === 'CONFIRMO';
                  const isNo = upperContent === 'NÃO' || upperContent === 'NAO' || upperContent === '2' || upperContent === 'NO';

                  if (isYes || isNo) {
                    // Build phone variants from multiple sources:
                    // 1. phoneNumber (may be LID digits)
                    // 2. conversation.contact_phone (real phone from DB)
                    // 3. remoteJid variants
                    const cleanPhone = phoneNumber.replace(/\D/g, '');
                    const phoneVariants = new Set<string>([cleanPhone]);
                    
                    // CRITICAL: Use the conversation's contact_phone which has the REAL number
                    // This solves the LID problem where phoneNumber is a LID identifier
                    if (conversation?.contact_phone) {
                      const convPhone = conversation.contact_phone.replace(/\D/g, '');
                      phoneVariants.add(convPhone);
                      // Also add 9th digit variants for Brazilian numbers
                      if (convPhone.startsWith('55') && convPhone.length === 13) {
                        phoneVariants.add(convPhone.slice(0, 4) + convPhone.slice(5));
                      } else if (convPhone.startsWith('55') && convPhone.length === 12) {
                        phoneVariants.add(convPhone.slice(0, 4) + '9' + convPhone.slice(4));
                      }
                    }
                    
                    // Add 9th digit variants for the main phoneNumber too
                    if (cleanPhone.startsWith('55') && cleanPhone.length === 13) {
                      phoneVariants.add(cleanPhone.slice(0, 4) + cleanPhone.slice(5));
                    } else if (cleanPhone.startsWith('55') && cleanPhone.length === 12) {
                      phoneVariants.add(cleanPhone.slice(0, 4) + '9' + cleanPhone.slice(4));
                    }

                    // Build JID variants for resolved_jid matching
                    const jidVariants = new Set<string>([remoteJid]);
                    for (const pv of phoneVariants) {
                      jidVariants.add(`${pv}@s.whatsapp.net`);
                    }

                    const phoneArr = Array.from(phoneVariants);
                    const jidArr = Array.from(jidVariants);
                    console.log(`📋 [RSVP] Checking pending RSVPs for phones: ${phoneArr.join(', ')}, jids: ${jidArr.join(', ')}, conv.contact_phone: ${conversation?.contact_phone}`);

                    const { data: pendingRsvps } = await supabase
                      .from('meeting_rsvp')
                      .select('id, event_id, company_id, attendee_name')
                      .in('status', ['pending', 'reminded'])
                      .or(
                        phoneArr.map(p => `attendee_phone.eq.${p}`).join(',') + ',' +
                        jidArr.map(j => `resolved_jid.eq.${j}`).join(',')
                      )
                      .order('invited_at', { ascending: false })
                      .limit(1);

                    if (pendingRsvps && pendingRsvps.length > 0) {
                      const rsvp = pendingRsvps[0];
                      const newStatus = isYes ? 'confirmed' : 'declined';

                      await supabase
                        .from('meeting_rsvp')
                        .update({ status: newStatus, responded_at: new Date().toISOString() })
                        .eq('id', rsvp.id);

                      console.log(`📋 [RSVP] ${phoneNumber} responded "${newStatus}" to event ${rsvp.event_id}`);
                      rsvpHandled = true; // Prevent AI from responding

                      // Get event details for notification
                      const { data: eventInfo } = await supabase
                        .from('calendar_events')
                        .select('title, created_by, start_date, company_id')
                        .eq('id', rsvp.event_id)
                        .single();

                      if (eventInfo) {
                        // Send confirmation reply via WhatsApp
                        const { data: sess } = await supabase
                          .from('whatsapp_sessions')
                          .select('baileys_server_url, instance_name')
                          .eq('id', targetSessionId)
                          .single();

                        if (sess?.baileys_server_url) {
                          const replyJid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
                          let replyMsg = '';
                          
                          if (isYes) {
                            replyMsg = `✅ *Presença confirmada!*\n\nSua participação na reunião *"${eventInfo.title}"* foi registrada.\n\nObrigado!`;
                          } else {
                            replyMsg = `❌ *Participação recusada*\n\nRegistramos que você não poderá participar da reunião *"${eventInfo.title}"*.\n\nO organizador será notificado.`;
                          }

                          await fetch(`${sess.baileys_server_url}/api/message/send`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ instanceName: sess.instance_name, jid: replyJid, message: { text: replyMsg } }),
                          });

                          // Save reply as message
                          await supabase.from('whatsapp_messages').insert({
                            session_id: targetSessionId,
                            conversation_id: conversation.id,
                            company_id: companyId,
                            content: replyMsg,
                            from_me: true,
                            message_type: 'text',
                            status: 'sent',
                            sender_name: 'Sistema',
                          });
                        }

                        // Notify organizer
                        const contactDisplayName = rsvp.attendee_name || contactName || phoneNumber;
                        await supabase.from('notifications').insert({
                          user_id: eventInfo.created_by,
                          company_id: eventInfo.company_id,
                          title: isYes ? '✅ Presença confirmada' : '❌ Participação recusada',
                          message: `${contactDisplayName} ${isYes ? 'confirmou presença' : 'recusou participar'} na reunião "${eventInfo.title}"`,
                          type: isYes ? 'success' : 'warning',
                          category: 'calendar',
                          icon: 'Calendar',
                          action_url: '/dashboard/agenda',
                          metadata: { event_id: rsvp.event_id, rsvp_id: rsvp.id, status: newStatus },
                        });
                      }
                    }
                  }
                } catch (rsvpErr) {
                  console.error('[RSVP] Error processing RSVP response:', rsvpErr);
                }
              }

              // ==================== CHATBOT FLOW ENGINE ====================
              // Check if there's an active chatbot execution for this conversation
              let chatbotHandled = false;
              if (!fromMe && conversation && !orderDetected && !rsvpHandled) {
                try {
                  // First check if AI auto-reply is already active — skip chatbot if so
                  const { data: convAiCheck } = await supabase
                    .from('whatsapp_conversations')
                    .select('ai_auto_reply_enabled')
                    .eq('id', conversation.id)
                    .single();
                  
                  if (convAiCheck?.ai_auto_reply_enabled) {
                    console.log(`🤖🔄 [CHATBOT] AI auto-reply is active, skipping chatbot engine`);
                    // Clean up any stale running executions
                    await supabase
                      .from('chatbot_executions')
                      .update({ status: 'completed', completed_at: new Date().toISOString() })
                      .eq('conversation_id', conversation.id)
                      .eq('status', 'running');
                    chatbotHandled = false; // Let AI auto-reply handle it
                  }

                  // Use limit 1 + order to avoid "multiple rows" error
                  const { data: execRows } = await supabase
                    .from('chatbot_executions')
                    .select('id, flow_id, current_node_id, variables, execution_path, last_activity_at')
                    .eq('conversation_id', conversation.id)
                    .eq('status', 'running')
                    .order('started_at', { ascending: false })
                    .limit(1);

                  let activeExec = (!convAiCheck?.ai_auto_reply_enabled) ? (execRows?.[0] || null) : null;

                  // ===== INACTIVITY TIMEOUT: 10 minutes =====
                  const CHATBOT_TIMEOUT_MS = 10 * 60 * 1000;
                  if (activeExec && activeExec.last_activity_at) {
                    const lastActivity = new Date(activeExec.last_activity_at).getTime();
                    const elapsed = Date.now() - lastActivity;
                    if (elapsed > CHATBOT_TIMEOUT_MS) {
                      console.log(`🤖⏰ [CHATBOT] Execution ${activeExec.id} timed out (${Math.round(elapsed/1000/60)}min inactive). Restarting flow...`);
                      
                      // Complete the stale execution
                      await supabase.from('chatbot_executions')
                        .update({ status: 'timeout', completed_at: new Date().toISOString() })
                        .eq('id', activeExec.id);
                      
                      // Find the same flow to restart
                      const { data: flowToRestart } = await supabase
                        .from('chatbot_flows')
                        .select('id, name, nodes, edges, trigger_config, execution_count')
                        .eq('id', activeExec.flow_id)
                        .single();
                      
                      if (flowToRestart) {
                        const { data: restartedExec } = await supabase
                          .from('chatbot_executions')
                          .insert({
                            flow_id: flowToRestart.id,
                            conversation_id: conversation.id,
                            contact_phone: phoneNumber,
                            status: 'running',
                            variables: { nome: contactName || phoneNumber, telefone: phoneNumber },
                            execution_path: [],
                            last_activity_at: new Date().toISOString(),
                          })
                          .select()
                          .single();
                        
                        if (restartedExec) {
                          console.log(`🤖🔄 [CHATBOT] Flow restarted: ${flowToRestart.name}`);
                          const restartNodes = (flowToRestart.nodes || []) as any[];
                          const restartEdges = (flowToRestart.edges || []) as any[];
                          const rootNode = restartNodes.find((n: any) => n.type === 'trigger') || restartNodes[0];
                          
                          if (rootNode) {
                            const firstEdge = restartEdges.find((e: any) => e.source === rootNode.id);
                            const firstNode = firstEdge ? restartNodes.find((n: any) => n.id === firstEdge.target) : null;
                            
                            if (firstNode && firstNode.type === 'message') {
                              let finalMsg = firstNode.data?.config?.message || firstNode.data?.label || '';
                              const msgButtons: string[] = firstNode.data?.config?.buttons || [];
                              const imgUrl = firstNode.data?.config?.imageUrl || null;
                              const vars = restartedExec.variables as Record<string, unknown> || {};
                              Object.entries(vars).forEach(([k, v]) => {
                                finalMsg = finalMsg.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'gi'), String(v || ''));
                              });
                              if (msgButtons.length > 0) {
                                finalMsg += '\n\n' + msgButtons.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n');
                              }
                              
                              const { data: sess } = await supabase
                                .from('whatsapp_sessions')
                                .select('baileys_server_url, instance_name')
                                .eq('id', targetSessionId)
                                .single();
                              
                              if (sess?.baileys_server_url) {
                                const jid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
                                await fetch(`${sess.baileys_server_url}/api/message/send`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ instanceName: sess.instance_name, jid, message: finalMsg }),
                                });
                                await supabase.from('whatsapp_messages').insert({
                                  session_id: targetSessionId, conversation_id: conversation.id,
                                  remote_jid: remoteJid, from_me: true, content: finalMsg,
                                  message_type: 'text', status: 'sent',
                                  media_url: imgUrl || null, sender_name: 'Chatbot',
                                });
                              }
                              
                              await supabase.from('chatbot_executions').update({
                                current_node_id: firstNode.id,
                                execution_path: [firstNode.id],
                                last_activity_at: new Date().toISOString(),
                              }).eq('id', restartedExec.id);
                            }
                          }
                          chatbotHandled = true;
                          activeExec = null;
                        }
                      } else {
                        activeExec = null;
                      }
                    }
                  }

                  // Update last_activity_at for active execution
                  if (activeExec) {
                    await supabase.from('chatbot_executions').update({
                      last_activity_at: new Date().toISOString(),
                    }).eq('id', activeExec.id);
                  }

                  if (activeExec) {
                    console.log(`🤖🔄 [CHATBOT] Active execution found: ${activeExec.id}, current_node: ${activeExec.current_node_id}`);

                    // Load flow
                    const { data: flow } = await supabase
                      .from('chatbot_flows')
                      .select('nodes, edges')
                      .eq('id', activeExec.flow_id)
                      .single();

                    if (flow) {
                      const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
                      const edges = Array.isArray(flow.edges) ? flow.edges : [];

                      // If current_node_id is null, find the first message node (after trigger)
                      let currentNode = nodes.find((n: any) => n.id === activeExec.current_node_id);
                      if (!currentNode) {
                        console.log(`🤖🔄 [CHATBOT] current_node_id is null, finding first node...`);
                        const triggerNode = nodes.find((n: any) => n.type === 'trigger');
                        if (triggerNode) {
                          const firstEdge = edges.find((e: any) => e.source === triggerNode.id);
                          currentNode = firstEdge ? nodes.find((n: any) => n.id === firstEdge.target) : null;
                        }
                        if (!currentNode) {
                          // Fallback: find node with no incoming edges
                          const targetIds = new Set(edges.map((e: any) => e.target));
                          currentNode = nodes.find((n: any) => n.type !== 'trigger' && !targetIds.has(n.id));
                        }
                        
                        // If we found a starting node, send its message first (the initial greeting)
                        if (currentNode) {
                          console.log(`🤖🔄 [CHATBOT] Resolved to first node: ${currentNode.id}`);
                          
                          // Get session server URL
                          const { data: sessionData } = await supabase
                            .from('whatsapp_sessions')
                            .select('baileys_server_url, instance_name')
                            .eq('id', targetSessionId)
                            .single();
                          const serverUrl = sessionData?.baileys_server_url;
                          const instanceName2 = sessionData?.instance_name;
                          
                          console.log(`🤖🔄 [CHATBOT] serverUrl=${serverUrl}, nodeType=${currentNode.type}, phoneNumber=${phoneNumber}`);
                          if (serverUrl && currentNode.type === 'message') {
                            const vars = (activeExec.variables as Record<string, string>) || {};
                            let greetMsg = currentNode.data?.config?.content || '';
                            greetMsg = greetMsg.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key] || `{{${key}}}`);
                            
                            const greetButtons: string[] = currentNode.data?.config?.buttons || [];
                            if (greetButtons.length > 0) {
                              greetMsg += '\n\n' + greetButtons.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n');
                            }
                            
                            // Use remoteJid (already resolved from remoteJidAlt) instead of phoneNumber (which may be a LID)
                            const jid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
                            console.log(`🤖🔄 [CHATBOT] Using JID for send: ${jid} (remoteJid=${remoteJid}, phoneNumber=${phoneNumber})`);
                            const imageUrl = currentNode.data?.config?.imageUrl || currentNode.data?.config?.url || '';
                            console.log(`🤖🔄 [CHATBOT] Initial node subType=${currentNode.subType}, imageUrl=${imageUrl ? 'YES' : 'NO'}`);
                            
                            try {
                              let ok = false;
                              if (imageUrl) {
                                const r = await fetch(`${serverUrl}/api/message/send-media`, {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ instanceName: instanceName2, jid, mediaUrl: imageUrl, mediaType: 'image', caption: greetMsg }),
                                });
                                ok = r.ok;
                              } else {
                                const r = await fetch(`${serverUrl}/api/message/send`, {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ instanceName: instanceName2, jid, message: { text: greetMsg } }),
                                });
                                console.log(`🤖🔄 [CHATBOT] Send response: ${r.status} ${r.statusText}`);
                                if (!r.ok) {
                                  const body = await r.text();
                                  console.error(`🤖🔄 [CHATBOT] Send failed body: ${body}`);
                                }
                                ok = r.ok;
                              }
                              
                              if (ok) {
                                await supabase.from('whatsapp_messages').insert({
                                  company_id: companyId, session_id: targetSessionId,
                                  conversation_id: conversation.id, content: greetMsg,
                                  from_me: true, status: 'sent',
                                  message_type: imageUrl ? 'image' : 'text',
                                  media_url: imageUrl || null, sender_name: 'Chatbot',
                                });
                                
                                await supabase.from('chatbot_executions').update({
                                  current_node_id: currentNode.id,
                                  execution_path: [currentNode.id],
                                }).eq('id', activeExec.id);
                                
                                console.log(`🤖🔄 [CHATBOT] Sent initial greeting for node ${currentNode.id}`);
                                chatbotHandled = true;
                              }
                            } catch (e) {
                              console.error('🤖🔄 [CHATBOT] Initial greeting error:', e);
                            }
                          }
                        }
                      }

                      if (currentNode && !chatbotHandled) {
                        const userInput = (content || '').trim();
                        let nextNodeId: string | null = null;

                        // If current node has buttons (choice node), match user input
                        const buttons: string[] = currentNode.data?.config?.buttons || [];
                        if (buttons.length > 0) {
                          // === MULTI-SELECTION SUPPORT ===
                          // Parse inputs like "4 e 9", "4, 9", "4 9", "4,9", "1, 3 e 5"
                          const multiPattern = /[\s,]+e\s+|[,;\s]+/gi;
                          const parts = userInput.split(multiPattern).map((p: string) => p.trim()).filter(Boolean);
                          
                          // Check if it's a multi-selection (2+ valid numbers)
                          const parsedIndices: number[] = [];
                          for (const part of parts) {
                            const num = parseInt(part);
                            if (!isNaN(num) && num >= 1 && num <= buttons.length) {
                              parsedIndices.push(num - 1); // 0-based
                            } else {
                              const partLower = part.toLowerCase().trim();
                              // 1) Exact match
                              let idx = buttons.findIndex((b: string) => b.toLowerCase().trim() === partLower);
                              // 2) Button starts with user input (e.g. "Sim" matches "Sim, sou eu!")
                              if (idx < 0) idx = buttons.findIndex((b: string) => b.toLowerCase().trim().startsWith(partLower));
                              // 3) User input starts with button text
                              if (idx < 0) idx = buttons.findIndex((b: string) => partLower.startsWith(b.toLowerCase().trim()));
                              // 4) Keyword contained in button text
                              if (idx < 0 && partLower.length >= 3) idx = buttons.findIndex((b: string) => b.toLowerCase().includes(partLower));
                              if (idx >= 0) parsedIndices.push(idx);
                            }
                          }
                          
                          // Deduplicate
                          const uniqueIndices = [...new Set(parsedIndices)];
                          
                          if (uniqueIndices.length > 1) {
                            // *** MULTI-SELECTION: process each choice sequentially ***
                            console.log(`🤖🔄 [CHATBOT] Multi-selection detected: ${uniqueIndices.map(i => `${i+1}. ${buttons[i]}`).join(', ')}`);
                            
                            // Get session data once for all sends
                            const { data: sessionData } = await supabase
                              .from('whatsapp_sessions')
                              .select('baileys_server_url, instance_name')
                              .eq('id', targetSessionId)
                              .single();
                            const serverUrlMulti = sessionData?.baileys_server_url;
                            const instanceNameMulti = sessionData?.instance_name;
                            const jidMulti = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
                            
                            if (serverUrlMulti) {
                              for (const selectedIndex of uniqueIndices) {
                                const edge = edges.find((e: any) =>
                                  e.source === currentNode.id && e.sourceHandle === `btn_${selectedIndex}`
                                );
                                const targetId = edge?.target;
                                if (!targetId) continue;
                                
                                const targetNode = nodes.find((n: any) => n.id === targetId);
                                if (!targetNode || targetNode.type !== 'message') continue;
                                
                                const vars = (activeExec.variables as Record<string, string>) || {};
                                let msgContent = targetNode.data?.config?.content || '';
                                msgContent = msgContent.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key] || `{{${key}}}`);
                                
                                const targetButtons: string[] = targetNode.data?.config?.buttons || [];
                                if (targetButtons.length > 0) {
                                  msgContent += '\n\n' + targetButtons.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n');
                                }
                                
                                const imgUrl = targetNode.data?.config?.imageUrl || targetNode.data?.config?.url || '';
                                
                                try {
                                  let sent = false;
                                  if (imgUrl) {
                                    const res = await fetch(`${serverUrlMulti}/api/message/send-media`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ instanceName: instanceNameMulti, jid: jidMulti, mediaUrl: imgUrl, mediaType: 'image', caption: msgContent }),
                                    });
                                    sent = res.ok;
                                    if (!res.ok) {
                                      const fallback = await fetch(`${serverUrlMulti}/api/message/send`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ instanceName: instanceNameMulti, jid: jidMulti, message: { text: msgContent + '\n\n📷 ' + imgUrl } }),
                                      });
                                      sent = fallback.ok;
                                    }
                                  } else {
                                    const res = await fetch(`${serverUrlMulti}/api/message/send`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ instanceName: instanceNameMulti, jid: jidMulti, message: { text: msgContent } }),
                                    });
                                    sent = res.ok;
                                  }
                                  
                                  if (sent) {
                                    await supabase.from('whatsapp_messages').insert({
                                      company_id: companyId, session_id: targetSessionId,
                                      conversation_id: conversation.id, content: msgContent,
                                      from_me: true, status: 'sent',
                                      message_type: imgUrl ? 'image' : 'text',
                                      media_url: imgUrl || null, sender_name: 'Chatbot',
                                    });
                                    console.log(`🤖🔄 [CHATBOT] Multi-select: sent response for option ${selectedIndex + 1}`);
                                  }
                                  
                                  // Small delay between messages to maintain order
                                  if (uniqueIndices.indexOf(selectedIndex) < uniqueIndices.length - 1) {
                                    await new Promise(r => setTimeout(r, 1000));
                                  }
                                } catch (err) {
                                  console.error(`🤖🔄 [CHATBOT] Multi-select send error for option ${selectedIndex + 1}:`, err);
                                }
                              }
                              
                              // After multi-select, stay on current node so user can pick more or continue
                              const execPath = Array.isArray(activeExec.execution_path) ? activeExec.execution_path : [];
                              await supabase.from('chatbot_executions').update({
                                current_node_id: currentNode.id,
                                execution_path: [...execPath, `multi:${uniqueIndices.map(i => i+1).join(',')}`],
                              }).eq('id', activeExec.id);
                              
                              chatbotHandled = true;
                            }
                          } else if (uniqueIndices.length === 1) {
                            // Single selection (original logic)
                            const matchedIndex = uniqueIndices[0];
                            const edge = edges.find((e: any) =>
                              e.source === currentNode.id && e.sourceHandle === `btn_${matchedIndex}`
                            );
                            nextNodeId = edge?.target || null;
                            console.log(`🤖🔄 [CHATBOT] Matched button ${matchedIndex}: "${buttons[matchedIndex]}" -> ${nextNodeId}`);
                          } else {
                            // === AI DEEP FALLBACK: Scan entire flow tree to find matching product/option ===
                            let aiMatchedIndex = -1;
                            try {
                              const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
                              if (LOVABLE_API_KEY) {
                                // Build a complete map of all reachable nodes from current node
                                const flowMap: { path: string; nodeId: string; content: string; btns: string[] }[] = [];
                                const visited = new Set<string>();
                                
                                const traverseNodes = (nodeId: string, pathPrefix: string, depth: number) => {
                                  if (depth > 6 || visited.has(nodeId)) return;
                                  visited.add(nodeId);
                                  const outEdges = edges.filter((e: any) => e.source === nodeId);
                                  for (const oe of outEdges) {
                                    const tn = nodes.find((n: any) => n.id === oe.target);
                                    if (!tn) continue;
                                    const nc = tn.data?.config?.content || tn.data?.label || '';
                                    const nb: string[] = tn.data?.config?.buttons || [];
                                    const lbl = tn.data?.label || tn.id;
                                    const np = `${pathPrefix} > ${lbl}`;
                                    flowMap.push({ path: np, nodeId: tn.id, content: nc, btns: nb });
                                    traverseNodes(tn.id, np, depth + 1);
                                  }
                                };
                                
                                traverseNodes(currentNode.id, currentNode.data?.label || 'Menu', 0);
                                
                                const currentButtonsDesc = buttons.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n');
                                const flowTreeDesc = flowMap.map((fm, i) => 
                                  `[Nó ${i+1}] ${fm.path}\nConteúdo: ${fm.content}${fm.btns.length > 0 ? '\nSub-opções: ' + fm.btns.join(', ') : ''}`
                                ).join('\n---\n');
                                
                                const aiPrompt = `Você é um assistente que interpreta mensagens de clientes em chatbots de WhatsApp de farmácia/e-commerce.

MENU ATUAL apresentado ao cliente:
${currentButtonsDesc}

MENSAGEM DO CLIENTE: "${userInput}"

MAPA COMPLETO DO FLUXO (todos os produtos e caminhos acessíveis a partir de cada opção):
${flowTreeDesc}

TAREFA: Determine qual opção do MENU ATUAL o cliente quer acessar, analisando todo o fluxo.

REGRAS IMPORTANTES:
- O cliente pode ter erros de digitação (ex: "Terzec" = "Tirzec", "sema" = "Semaglutida")  
- Se o cliente menciona um produto específico com dosagem (ex: "15mg"), busque no mapa qual opção do menu atual leva a esse produto
- Analise nomes comerciais, princípios ativos, abreviações
- Só responda se tiver ALTA confiança no match

Responda SOMENTE o número da opção (1, 2, 3...). Se não conseguir determinar com confiança, responda 0.`;

                                console.log(`🤖🧠 [CHATBOT-AI] Deep fallback: "${userInput}" - ${flowMap.length} nodes scanned`);
                                
                                const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    model: "google/gemini-3-flash-preview",
                                    messages: [
                                      { role: "system", content: aiPrompt },
                                      { role: "user", content: userInput },
                                    ],
                                    temperature: 0.05,
                                  }),
                                });
                                
                                if (aiResp.ok) {
                                  const aiData = await aiResp.json();
                                  const aiAnswer = (aiData.choices?.[0]?.message?.content || '').trim();
                                  const numMatch = aiAnswer.match(/\d+/);
                                  const aiNum = numMatch ? parseInt(numMatch[0]) : 0;
                                  if (aiNum >= 1 && aiNum <= buttons.length) {
                                    aiMatchedIndex = aiNum - 1;
                                    console.log(`🤖🧠 [CHATBOT-AI] Matched "${userInput}" → option ${aiNum}: "${buttons[aiMatchedIndex]}"`);
                                  } else {
                                    console.log(`🤖🧠 [CHATBOT-AI] No match. AI said: "${aiAnswer}"`);
                                  }
                                }
                              }
                            } catch (aiErr) {
                              console.error(`🤖🧠 [CHATBOT-AI] Deep fallback error:`, aiErr);
                            }
                            
                            if (aiMatchedIndex >= 0) {
                              const edge = edges.find((e: any) =>
                                e.source === currentNode.id && e.sourceHandle === `btn_${aiMatchedIndex}`
                              );
                              nextNodeId = edge?.target || null;
                              console.log(`🤖🧠 [CHATBOT-AI] Routed → btn ${aiMatchedIndex}: "${buttons[aiMatchedIndex]}" -> ${nextNodeId}`);
                            } else {
                              const invalidEdge = edges.find((e: any) =>
                                e.source === currentNode.id && e.sourceHandle === 'invalid'
                              );
                              nextNodeId = invalidEdge?.target || null;
                              console.log(`🤖🔄 [CHATBOT] AI deep match failed for "${userInput}" -> invalid edge ${nextNodeId}`);
                            }
                          }
                        } else {
                          // Non-choice node: follow default edge (no sourceHandle or first edge)
                          const edge = edges.find((e: any) => e.source === currentNode.id && !e.sourceHandle) ||
                                       edges.find((e: any) => e.source === currentNode.id);
                          nextNodeId = edge?.target || null;
                        }

                        if (nextNodeId) {
                          const nextNode = nodes.find((n: any) => n.id === nextNodeId);

                          if (nextNode) {
                            // Get session server URL for sending
                            const { data: sessionData } = await supabase
                              .from('whatsapp_sessions')
                              .select('baileys_server_url, instance_name')
                              .eq('id', targetSessionId)
                              .single();

                            const serverUrl = sessionData?.baileys_server_url;
                            const instanceName2 = sessionData?.instance_name;

                            if (nextNode.type === 'action') {
                              // ===== HANDLE ACTION NODES =====
                              const actionSubType = nextNode.subType || nextNode.data?.config?.actionType || '';
                              console.log(`🤖🔄 [CHATBOT] Processing action node: ${actionSubType}`);

                              if (actionSubType === 'transfer_ai_agent') {
                                const agentId = nextNode.data?.config?.agentId;
                                const aiEntryBehavior = nextNode.data?.config?.aiEntryBehavior || 'send_welcome';
                                console.log(`🤖🔄 [CHATBOT] Transferring to AI agent: ${agentId}, behavior: ${aiEntryBehavior}`);

                                if (agentId) {
                                  // Enable AI auto-reply on the conversation
                                  await supabase
                                    .from('whatsapp_conversations')
                                    .update({
                                      assigned_agent_id: agentId,
                                      ai_auto_reply_enabled: true,
                                    })
                                    .eq('id', conversation.id);

                                  // Send system message indicating AI took over
                                  await supabase.from('whatsapp_messages').insert({
                                    company_id: companyId,
                                    session_id: targetSessionId,
                                    conversation_id: conversation.id,
                                    content: '🤖 Agente de IA entrou na conversa.',
                                    from_me: true,
                                    status: 'sent',
                                    message_type: 'system',
                                    sender_name: 'Sistema',
                                  });

                                  // Complete ALL running chatbot executions for this conversation (not just current)
                                  await supabase
                                    .from('chatbot_executions')
                                    .update({
                                      status: 'completed',
                                      completed_at: new Date().toISOString(),
                                    })
                                    .eq('conversation_id', conversation.id)
                                    .eq('status', 'running');

                                  // If behavior is send_welcome, trigger AI to send first message
                                  if (aiEntryBehavior === 'send_welcome') {
                                    console.log(`🤖🔄 [CHATBOT] AI will send welcome message`);
                                    // Fetch agent to get greeting
                                    const { data: aiAgent } = await supabase
                                      .from('ai_agents')
                                      .select('id, name, personality, instructions, is_active, settings')
                                      .eq('id', agentId)
                                      .eq('is_active', true)
                                      .single();

                                    if (aiAgent) {
                                      const agentSettings = (aiAgent.settings as Record<string, unknown>) || {};
                                      const agentHumor = (agentSettings.humor as string) ?? 'profissional';
                                      const welcomePrompt = `Personalidade: ${aiAgent.personality}\nTom: ${agentHumor}\n\n${aiAgent.instructions}\n\nVocê acabou de entrar na conversa com o cliente. Envie uma saudação breve e natural (1-2 frases). Não faça perguntas complexas, apenas cumprimente.`;

                                      try {
                                        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
                                        if (LOVABLE_API_KEY) {
                                          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                                            method: "POST",
                                            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              model: (agentSettings.model as string) || "google/gemini-3-flash-preview",
                                              messages: [
                                                { role: "system", content: welcomePrompt },
                                                { role: "user", content: "O cliente foi transferido do chatbot para você. Envie sua saudação." },
                                              ],
                                            }),
                                          });
                                          if (aiResp.ok) {
                                            const aiData = await aiResp.json();
                                            const welcomeMsg = aiData.choices?.[0]?.message?.content || '';
                                            if (welcomeMsg) {
                                              const jid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
                                              const sendRes = await fetch(`${serverUrl}/api/message/send`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ instanceName: instanceName2, jid, message: { text: welcomeMsg } }),
                                              });
                                              if (sendRes.ok) {
                                                await supabase.from('whatsapp_messages').insert({
                                                  company_id: companyId,
                                                  session_id: targetSessionId,
                                                  conversation_id: conversation.id,
                                                  content: welcomeMsg,
                                                  from_me: true,
                                                  status: 'sent',
                                                  message_type: 'text',
                                                  sender_name: aiAgent.name,
                                                });
                                              }
                                            }
                                          }
                                        }
                                      } catch (aiErr) {
                                        console.error('🤖🔄 [CHATBOT] AI welcome error:', aiErr);
                                      }
                                    }
                                  }

                                  chatbotHandled = true;
                                  console.log(`🤖🔄 [CHATBOT] Transfer to AI completed`);
                                }
                              } else if (actionSubType === 'transfer_human') {
                                console.log(`🤖🔄 [CHATBOT] Transferring to human`);
                                // Disable any AI, complete chatbot
                                await supabase
                                  .from('whatsapp_conversations')
                                  .update({ assigned_agent_id: null, ai_auto_reply_enabled: false })
                                  .eq('id', conversation.id);

                                await supabase.from('whatsapp_messages').insert({
                                  company_id: companyId,
                                  session_id: targetSessionId,
                                  conversation_id: conversation.id,
                                  content: '👤 Conversa transferida para atendimento humano.',
                                  from_me: true,
                                  status: 'sent',
                                  message_type: 'system',
                                  sender_name: 'Sistema',
                                });

                                const execPath = Array.isArray(activeExec.execution_path) ? activeExec.execution_path : [];
                                await supabase
                                  .from('chatbot_executions')
                                  .update({
                                    current_node_id: nextNodeId,
                                    execution_path: [...execPath, nextNodeId],
                                    status: 'completed',
                                    completed_at: new Date().toISOString(),
                                  })
                                  .eq('id', activeExec.id);

                                chatbotHandled = true;
                              // ===== LOOKUP ACCOUNT ACTION =====
                              } else if (actionSubType === 'lookup_account') {
                                console.log(`🤖🔄 [CHATBOT] Lookup account action`);
                                // The user's last message should contain their email
                                const emailInput = (content || '').trim().toLowerCase();
                                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
                                const emailMatch = emailInput.match(emailRegex);
                                
                                const execPath = Array.isArray(activeExec.execution_path) ? activeExec.execution_path : [];
                                const vars = (activeExec.variables as Record<string, unknown>) || {};
                                
                                if (emailMatch) {
                                  const email = emailMatch[0];
                                  console.log(`🤖🔄 [CHATBOT] Looking up account for: ${email}`);
                                  
                                  // Search for user by email using service role
                                  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
                                  const foundUser = authUsers?.users?.find((u: any) => u.email?.toLowerCase() === email);
                                  
                                  if (foundUser) {
                                    // Get company info
                                    const { data: compUser } = await supabase
                                      .from('company_users')
                                      .select('company_id, role')
                                      .eq('user_id', foundUser.id)
                                      .limit(1)
                                      .single();
                                    
                                    if (compUser) {
                                      const { data: comp } = await supabase
                                        .from('companies')
                                        .select('name')
                                        .eq('id', compUser.company_id)
                                        .single();
                                      
                                      const userName = foundUser.user_metadata?.username || foundUser.email?.split('@')[0] || 'Usuário';
                                      const companyName = comp?.name || 'N/A';
                                      
                                      // Store in execution variables
                                      await supabase.from('chatbot_executions').update({
                                        current_node_id: nextNodeId,
                                        execution_path: [...execPath, nextNodeId],
                                        variables: {
                                          ...vars,
                                          email,
                                          authenticated_user_id: foundUser.id,
                                          authenticated_company_id: compUser.company_id,
                                          authenticated_user_name: userName,
                                          authenticated_company_name: companyName,
                                          account_found: 'true',
                                        },
                                      }).eq('id', activeExec.id);
                                      
                                      console.log(`🤖🔄 [CHATBOT] Account found: ${userName} (${companyName})`);
                                    } else {
                                      await supabase.from('chatbot_executions').update({
                                        current_node_id: nextNodeId,
                                        execution_path: [...execPath, nextNodeId],
                                        variables: { ...vars, email, account_found: 'false' },
                                      }).eq('id', activeExec.id);
                                    }
                                  } else {
                                    await supabase.from('chatbot_executions').update({
                                      current_node_id: nextNodeId,
                                      execution_path: [...execPath, nextNodeId],
                                      variables: { ...vars, email, account_found: 'false' },
                                    }).eq('id', activeExec.id);
                                  }
                                } else {
                                  // Not an email - store as not found
                                  await supabase.from('chatbot_executions').update({
                                    current_node_id: nextNodeId,
                                    execution_path: [...execPath, nextNodeId],
                                    variables: { ...vars, account_found: 'false' },
                                  }).eq('id', activeExec.id);
                                }
                                
                                // Now follow the edge from this action node to the next node (condition checking account_found)
                                const afterActionEdge = edges.find((e: any) => e.source === nextNodeId);
                                if (afterActionEdge) {
                                  const afterNode = nodes.find((n: any) => n.id === afterActionEdge.target);
                                  if (afterNode && afterNode.type === 'condition') {
                                    // Re-read updated variables
                                    const { data: updatedExec } = await supabase
                                      .from('chatbot_executions')
                                      .select('variables')
                                      .eq('id', activeExec.id)
                                      .single();
                                    const updVars = (updatedExec?.variables as Record<string, string>) || {};
                                    const checkVar = afterNode.data?.config?.variable || 'account_found';
                                    const checkValue = afterNode.data?.config?.value || 'true';
                                    const varValue = updVars[checkVar] || '';
                                    
                                    // Find correct edge based on condition result
                                    const condResult = varValue === checkValue;
                                    const condEdge = edges.find((e: any) => 
                                      e.source === afterNode.id && e.sourceHandle === (condResult ? 'true' : 'false')
                                    ) || edges.find((e: any) => 
                                      e.source === afterNode.id && e.sourceHandle === (condResult ? 'yes' : 'no')
                                    );
                                    
                                    if (condEdge) {
                                      const responseNode = nodes.find((n: any) => n.id === condEdge.target);
                                      if (responseNode && responseNode.type === 'message' && serverUrl) {
                                        let rMsg = responseNode.data?.config?.content || '';
                                        rMsg = rMsg.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => updVars[key] || `{{${key}}}`);
                                        
                                        const rButtons: string[] = responseNode.data?.config?.buttons || [];
                                        if (rButtons.length > 0) {
                                          rMsg += '\n\n' + rButtons.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n');
                                        }
                                        
                                        const jid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
                                        const sendRes = await fetch(`${serverUrl}/api/message/send`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ instanceName: instanceName2, jid, message: { text: rMsg } }),
                                        });
                                        
                                        if (sendRes.ok) {
                                          await supabase.from('whatsapp_messages').insert({
                                            company_id: companyId, session_id: targetSessionId,
                                            conversation_id: conversation.id, content: rMsg,
                                            from_me: true, status: 'sent', message_type: 'text', sender_name: 'Chatbot',
                                          });
                                          
                                          const updPath = [...execPath, nextNodeId, afterNode.id, responseNode.id];
                                          const hasMore = edges.some((e: any) => e.source === responseNode.id);
                                          await supabase.from('chatbot_executions').update({
                                            current_node_id: responseNode.id,
                                            execution_path: updPath,
                                            ...(hasMore ? {} : { status: 'completed', completed_at: new Date().toISOString() }),
                                          }).eq('id', activeExec.id);
                                        }
                                      } else if (responseNode && responseNode.type === 'action') {
                                        // The condition leads to another action (e.g., transfer_ai_agent)
                                        // Update execution to point to this action node so next message triggers it
                                        const updPath2 = [...execPath, nextNodeId, afterNode.id, responseNode.id];
                                        await supabase.from('chatbot_executions').update({
                                          current_node_id: afterNode.id,
                                          execution_path: updPath2,
                                        }).eq('id', activeExec.id);
                                        
                                        // If it's transfer_ai_agent, execute it immediately
                                        const actionSub = responseNode.subType || responseNode.data?.config?.actionType || '';
                                        if (actionSub === 'transfer_ai_agent') {
                                          const agentIdLookup = responseNode.data?.config?.agentId;
                                          if (agentIdLookup) {
                                            await supabase.from('whatsapp_conversations').update({
                                              assigned_agent_id: agentIdLookup,
                                              ai_auto_reply_enabled: true,
                                            }).eq('id', conversation.id);
                                            
                                            await supabase.from('whatsapp_messages').insert({
                                              company_id: companyId, session_id: targetSessionId,
                                              conversation_id: conversation.id,
                                              content: '🤖 Agente de IA entrou na conversa.',
                                              from_me: true, status: 'sent', message_type: 'system', sender_name: 'Sistema',
                                            });
                                            
                                            await supabase.from('chatbot_executions').update({
                                              status: 'completed', completed_at: new Date().toISOString(),
                                            }).eq('conversation_id', conversation.id).eq('status', 'running');
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                                
                                chatbotHandled = true;
                              // ===== SET VARIABLE ACTION =====
                              } else if (actionSubType === 'set_variable') {
                                const varName = nextNode.data?.config?.variableName || '';
                                const varValue = nextNode.data?.config?.variableValue || content || '';
                                console.log(`🤖🔄 [CHATBOT] Set variable: ${varName} = ${varValue}`);
                                
                                const execPath = Array.isArray(activeExec.execution_path) ? activeExec.execution_path : [];
                                const vars = (activeExec.variables as Record<string, unknown>) || {};
                                
                                await supabase.from('chatbot_executions').update({
                                  current_node_id: nextNodeId,
                                  execution_path: [...execPath, nextNodeId],
                                  variables: { ...vars, [varName]: varValue },
                                }).eq('id', activeExec.id);
                                
                                // Auto-follow to next node
                                const nextEdge = edges.find((e: any) => e.source === nextNodeId);
                                if (nextEdge) {
                                  // Will be processed on next message
                                }
                                chatbotHandled = true;
                              }
                            } else if (serverUrl && nextNode.type === 'message') {
                              const vars = (activeExec.variables as Record<string, string>) || {};
                              let msgContent = nextNode.data?.config?.content || '';
                              // Replace variables
                              msgContent = msgContent.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key] || `{{${key}}}`);

                              const nextButtons: string[] = nextNode.data?.config?.buttons || [];
                              // If it has buttons, append numbered list
                              if (nextButtons.length > 0) {
                                msgContent += '\n\n' + nextButtons.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n');
                              }

                              // Check for image
                              const imageUrl = nextNode.data?.config?.imageUrl || nextNode.data?.config?.url || '';
                              console.log(`🤖🔄 [CHATBOT] Next node subType=${nextNode.subType}, imageUrl=${imageUrl ? 'YES' : 'NO'}`);

                              // Use remoteJid (already resolved from remoteJidAlt) instead of phoneNumber (which may be a LID)
                              const jid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
                              console.log(`🤖🔄 [CHATBOT] Using JID for next node send: ${jid}`);

                              try {
                                let sendSuccess = false;

                                if (imageUrl) {
                                  // Send image with caption
                                  console.log(`🤖🔄 [CHATBOT] Sending image: url=${imageUrl.substring(0, 100)}, caption=${msgContent.substring(0, 50)}`);
                                  try {
                                    const sendRes = await fetch(`${serverUrl}/api/message/send-media`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        instanceName: instanceName2,
                                        jid,
                                        mediaUrl: imageUrl,
                                        mediaType: 'image',
                                        caption: msgContent,
                                      }),
                                    });
                                    console.log(`🤖🔄 [CHATBOT] send-media response: ${sendRes.status} ${sendRes.statusText}`);
                                    if (!sendRes.ok) {
                                      const errBody = await sendRes.text();
                                      console.error(`🤖🔄 [CHATBOT] send-media error: ${errBody}`);
                                      // Fallback: send as text only
                                      console.log(`🤖🔄 [CHATBOT] Falling back to text-only send`);
                                      const fallbackRes = await fetch(`${serverUrl}/api/message/send`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ instanceName: instanceName2, jid, message: { text: msgContent + '\n\n📷 ' + imageUrl } }),
                                      });
                                      sendSuccess = fallbackRes.ok;
                                    } else {
                                      sendSuccess = true;
                                    }
                                  } catch (imgErr) {
                                    console.error(`🤖🔄 [CHATBOT] send-media exception:`, imgErr);
                                    // Fallback: send as text only
                                    try {
                                      const fallbackRes = await fetch(`${serverUrl}/api/message/send`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ instanceName: instanceName2, jid, message: { text: msgContent + '\n\n📷 ' + imageUrl } }),
                                      });
                                      sendSuccess = fallbackRes.ok;
                                    } catch (e2) {
                                      console.error(`🤖🔄 [CHATBOT] Fallback text also failed:`, e2);
                                    }
                                  }
                                } else {
                                  // Send text
                                  const sendRes = await fetch(`${serverUrl}/api/message/send`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ instanceName: instanceName2, jid, message: { text: msgContent } }),
                                  });
                                  sendSuccess = sendRes.ok;
                                }

                                if (sendSuccess) {
                                  console.log(`🤖🔄 [CHATBOT] Sent message for node ${nextNodeId}`);

                                  // Save the bot message
                                  await supabase.from('whatsapp_messages').insert({
                                    company_id: companyId,
                                    session_id: targetSessionId,
                                    conversation_id: conversation.id,
                                    content: msgContent,
                                    from_me: true,
                                    status: 'sent',
                                    message_type: imageUrl ? 'image' : 'text',
                                    media_url: imageUrl || null,
                                    sender_name: 'Chatbot',
                                  });

                                  // Update execution state
                                  const execPath = Array.isArray(activeExec.execution_path) ? activeExec.execution_path : [];
                                  const hasMoreEdges = edges.some((e: any) => e.source === nextNodeId);

                                  await supabase
                                    .from('chatbot_executions')
                                    .update({
                                      current_node_id: nextNodeId,
                                      execution_path: [...execPath, nextNodeId],
                                      ...(hasMoreEdges ? {} : { status: 'completed', completed_at: new Date().toISOString() }),
                                    })
                                    .eq('id', activeExec.id);

                                  chatbotHandled = true;
                                }
                              } catch (sendErr) {
                                console.error('🤖🔄 [CHATBOT] Send error:', sendErr);
                              }
                            }
                          }
                        } else {
                          // No next node - flow completed
                          console.log(`🤖🔄 [CHATBOT] Flow completed, no next node`);
                          await supabase
                            .from('chatbot_executions')
                            .update({ status: 'completed', completed_at: new Date().toISOString() })
                            .eq('id', activeExec.id);
                          chatbotHandled = true;
                        }
                      }
                    }
                  }
                } catch (chatbotErr) {
                  console.error('🤖🔄 [CHATBOT] Engine error:', chatbotErr);
                }
              }

              // ==================== AI AUTO-RESPONSE ====================
              // Check if conversation has an AI agent assigned and auto-reply is enabled
              if (!fromMe && conversation && !chatbotHandled && !orderDetected && !rsvpHandled) {
                try {
                  console.log(`🤖 Checking AI auto-reply for conversation: ${conversation.id}`);
                  
                  // Fetch conversation with agent info
                  const { data: convWithAgent, error: convError } = await supabase
                    .from('whatsapp_conversations')
                    .select('id, assigned_agent_id, ai_auto_reply_enabled')
                    .eq('id', conversation.id)
                    .single();
                  
                  console.log(`🤖 Conv data: agent_id=${convWithAgent?.assigned_agent_id}, auto_reply=${convWithAgent?.ai_auto_reply_enabled}`);
                  
                  if (convWithAgent?.assigned_agent_id && convWithAgent?.ai_auto_reply_enabled) {
                    console.log('🤖 AI Auto-reply triggered for conversation:', conversation.id);
                    
                    // Fetch the AI agent's configuration
                    const { data: agent } = await supabase
                      .from('ai_agents')
                      .select('id, name, personality, instructions, is_active, settings')
                      .eq('id', convWithAgent.assigned_agent_id)
                      .eq('is_active', true)
                      .single();
                    
                    if (agent) {
                      console.log('🤖 Using AI agent:', agent.name);
                      
                      // Get agent settings
                      const agentSettings = (agent.settings as Record<string, unknown>) || {};
                      const agentTemperature = (agentSettings.temperature as number) ?? 0.7;
                      const agentMaxChars = (agentSettings.maxResponseChars as number) ?? 500;
                      const agentHumor = (agentSettings.humor as string) ?? 'profissional';
                      const MESSAGE_SEPARATOR = '|||';
                      
                      // Load agent media files
                      const { data: agentMedia } = await supabase
                        .from('ai_agent_media')
                        .select('id, file_url, file_name, file_type, description, context_keywords')
                        .eq('agent_id', agent.id)
                        .eq('is_active', true);
                      
                      const mediaList = agentMedia || [];
                      console.log(`🤖📸 Agent has ${mediaList.length} active media files`);
                      
                      // ============== PLATFORM AGENT: Route to ellosuit-whatsapp-agent ==============
                      const isPlatformAgent = !!(agentSettings.is_platform_agent);
                      if (isPlatformAgent) {
                        console.log('🤖🌐 [PLATFORM-AGENT] Detected platform agent, routing to ellosuit-whatsapp-agent');
                        
                        // Get authenticated user context from chatbot execution variables
                        let authenticatedUserId = '';
                        let authenticatedCompanyId = '';
                        
                        // Look for the most recent completed chatbot execution for this conversation
                        const { data: recentExec } = await supabase
                          .from('chatbot_executions')
                          .select('variables')
                          .eq('conversation_id', conversation.id)
                          .order('started_at', { ascending: false })
                          .limit(1)
                          .single();
                        
                        if (recentExec?.variables) {
                          const vars = recentExec.variables as Record<string, string>;
                          authenticatedUserId = vars.authenticated_user_id || '';
                          authenticatedCompanyId = vars.authenticated_company_id || '';
                          console.log(`🤖🌐 [PLATFORM-AGENT] Auth context: userId=${authenticatedUserId}, companyId=${authenticatedCompanyId}`);
                        }
                        
                        if (!authenticatedUserId || !authenticatedCompanyId) {
                          console.log('🤖🌐 [PLATFORM-AGENT] No auth context found, sending error message');
                          // Send message asking to re-authenticate
                          const { data: sessionData } = await supabase
                            .from('whatsapp_sessions')
                            .select('baileys_server_url, instance_name')
                            .eq('id', targetSessionId)
                            .single();
                          if (sessionData?.baileys_server_url) {
                            const jid = remoteJid.includes('@') ? remoteJid : `${phoneNumber}@s.whatsapp.net`;
                            await fetch(`${sessionData.baileys_server_url}/api/message/send`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                instanceName: sessionData.instance_name,
                                jid,
                                message: { text: 'Sua sessão expirou. Por favor, envie "oi" para iniciar uma nova autenticação.' }
                              }),
                            });
                          }
                          // Disable AI and let chatbot re-trigger
                          await supabase
                            .from('whatsapp_conversations')
                            .update({ ai_auto_reply_enabled: false, assigned_agent_id: null })
                            .eq('id', conversation.id);
                          break;
                        }
                        
                        // Transcribe audio if needed
                        let platformInputContent = content;
                        if ((messageType === 'audio' || messageType === 'ptt')) {
                          // If mediaUrl is empty, try downloading from Baileys server first
                          if (!mediaUrl && targetSessionId) {
                            try {
                              const { data: sessAudioPlatform } = await supabase
                                .from('whatsapp_sessions')
                                .select('baileys_server_url, instance_name')
                                .eq('id', targetSessionId)
                                .single();
                              if (sessAudioPlatform?.baileys_server_url) {
                                console.log(`🎙️🌐 [PLATFORM-AUDIO-DL] Downloading audio via Baileys for msg ${messageId}`);
                                const dlResp = await fetch(`${sessAudioPlatform.baileys_server_url}/api/media/download`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ instanceName: sessAudioPlatform.instance_name, messageId, remoteJid }),
                                });
                                if (dlResp.ok) {
                                  const dlData = await dlResp.json();
                                  if (dlData.url) {
                                    mediaUrl = dlData.url;
                                    console.log(`🎙️🌐 [PLATFORM-AUDIO-DL] Got URL: ${mediaUrl.substring(0, 80)}`);
                                  } else if (dlData.base64) {
                                    const audioFileName = `incoming-audio/${targetSessionId}/${messageId}.ogg`;
                                    const binaryStr = atob(dlData.base64);
                                    const audioBytes = new Uint8Array(binaryStr.length);
                                    for (let i = 0; i < binaryStr.length; i++) audioBytes[i] = binaryStr.charCodeAt(i);
                                    const { error: upErr } = await supabase.storage.from('whatsapp-media').upload(audioFileName, audioBytes, { contentType: 'audio/ogg', upsert: true });
                                    if (!upErr) {
                                      const { data: pubData } = supabase.storage.from('whatsapp-media').getPublicUrl(audioFileName);
                                      mediaUrl = pubData.publicUrl;
                                      console.log(`🎙️🌐 [PLATFORM-AUDIO-DL] Uploaded: ${mediaUrl.substring(0, 80)}`);
                                    }
                                  }
                                } else {
                                  console.log(`🎙️🌐 [PLATFORM-AUDIO-DL] Download returned ${dlResp.status}`);
                                }
                              }
                            } catch (dlErr) {
                              console.error('🎙️🌐 [PLATFORM-AUDIO-DL] Error:', dlErr);
                            }
                          }

                          if (mediaUrl) {
                          try {
                            const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
                            if (ELEVENLABS_API_KEY) {
                              const audioResp = await fetch(mediaUrl);
                              if (audioResp.ok) {
                                const audioBuffer = await audioResp.arrayBuffer();
                                const scribeForm = new FormData();
                                scribeForm.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'audio.ogg');
                                scribeForm.append('model_id', 'scribe_v2');
                                scribeForm.append('language_code', 'por');
                                const scribeResp = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
                                  method: 'POST',
                                  headers: { 'xi-api-key': ELEVENLABS_API_KEY },
                                  body: scribeForm,
                                });
                                if (scribeResp.ok) {
                                  const scribeResult = await scribeResp.json();
                                  if (scribeResult.text?.trim()?.length > 2) {
                                    platformInputContent = scribeResult.text.trim();
                                    console.log(`🎙️🌐 [PLATFORM] Transcribed: ${platformInputContent.substring(0, 100)}`);
                                    await supabase.from('whatsapp_messages').update({ content: `🎙️ ${platformInputContent}` }).eq('wa_message_id', messageId);
                                  } else {
                                    platformInputContent = '[O usuário enviou um áudio mas não foi possível entender. Peça educadamente para repetir ou digitar.]';
                                  }
                                } else {
                                  console.error('🤖🌐 [PLATFORM-AGENT] Scribe error:', scribeResp.status);
                                  // Fallback to OpenAI Whisper
                                  console.log('🤖🌐 [PLATFORM-AGENT] Trying Whisper fallback...');
                                  try {
                                    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
                                    if (OPENAI_API_KEY) {
                                      const whisperForm = new FormData();
                                      whisperForm.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'audio.ogg');
                                      whisperForm.append('model', 'whisper-1');
                                      whisperForm.append('language', 'pt');
                                      const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
                                        body: whisperForm,
                                      });
                                      if (whisperResp.ok) {
                                        const whisperResult = await whisperResp.json();
                                        if (whisperResult.text?.trim()?.length > 2) {
                                          platformInputContent = whisperResult.text.trim();
                                          console.log(`🎙️🌐 [PLATFORM] Whisper Transcribed: ${platformInputContent.substring(0, 100)}`);
                                          await supabase.from('whatsapp_messages').update({ content: `🎙️ ${platformInputContent}` }).eq('wa_message_id', messageId);
                                        }
                                      }
                                    }
                                  } catch (whisperErr) {
                                    console.error('🤖🌐 [PLATFORM-AGENT] Whisper fallback error:', whisperErr);
                                  }
                                  if (platformInputContent === content) {
                                    platformInputContent = '[O usuário enviou um áudio mas houve erro na transcrição. Peça para digitar.]';
                                  }
                                }
                              }
                            }
                          } catch (sttErr) {
                            console.error('🤖🌐 [PLATFORM-AGENT] STT error:', sttErr);
                            platformInputContent = '[O usuário enviou um áudio mas ocorreu um erro. Peça para digitar.]';
                          }
                          } else {
                            console.log('🤖🌐 [PLATFORM-AGENT] Audio without mediaUrl after download attempt');
                            platformInputContent = '[O usuário enviou um áudio mas o sistema não conseguiu acessar o arquivo. Peça educadamente para digitar ou enviar novamente.]';
                          }
                        }
                        // Load conversation history
                        const { data: histMsgs } = await supabase
                          .from('whatsapp_messages')
                          .select('from_me, content, is_ai_response')
                          .eq('conversation_id', conversation.id)
                          .neq('wa_message_id', messageId)
                          .order('timestamp', { ascending: false })
                          .limit(10);
                        
                        const history = (histMsgs || []).reverse().map((m: any) => ({
                          role: m.from_me ? 'assistant' : 'user',
                          content: m.content || ''
                        }));
                        
                        // Call ellosuit-whatsapp-agent
                        const agentResp = await fetch(`${SUPABASE_URL}/functions/v1/ellosuit-whatsapp-agent`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                          },
                          body: JSON.stringify({
                            messages: [...history, { role: 'user', content: platformInputContent }],
                            userId: authenticatedUserId,
                            companyId: authenticatedCompanyId,
                            contactPhone: phoneNumber,
                            agentInstructions: agent.instructions,
                            agentPersonality: agent.personality,
                            agentSettings: agentSettings,
                            lastMedia: mediaUrl ? {
                              url: mediaUrl,
                              fileName: (messageType === 'document' && content && content !== '[Documento]') ? content : (mediaCaption || `whatsapp-${Date.now()}.${messageType === 'image' ? 'jpg' : messageType === 'video' ? 'mp4' : 'bin'}`),
                              type: messageType,
                              mimeType: messageType === 'image' ? 'image/jpeg' : messageType === 'video' ? 'video/mp4' : messageType === 'document' ? 'application/octet-stream' : 'application/octet-stream',
                            } : undefined,
                          }),
                        });
                        
                        if (agentResp.ok) {
                          const agentData = await agentResp.json();
                          let aiReply = agentData.response || '';
                          
                          if (aiReply) {
                            // Clean markdown
                            aiReply = aiReply
                              .replace(/\*\*(.*?)\*\*/g, '$1')
                              .replace(/\*(.*?)\*/g, '$1')
                              .replace(/#{1,6}\s?/g, '')
                              .replace(/`{1,3}(.*?)`{1,3}/gs, '$1')
                              .replace(/\[(.*?)\]\((.*?)\)/g, '$2')
                              .trim();
                            
                            // Check for handoff
                            const isHandoff = aiReply.includes('[HANDOFF]');
                            if (isHandoff) aiReply = aiReply.replace('[HANDOFF]', '').trim();
                            
                            // Remove stage tags
                            aiReply = aiReply.replace(/\[STAGE:\w+\]/g, '').trim();
                            
                            // Send response
                            const { data: sessionData } = await supabase
                              .from('whatsapp_sessions')
                              .select('baileys_server_url, instance_name')
                              .eq('id', targetSessionId)
                              .single();
                            
                            if (sessionData?.baileys_server_url) {
                              const sendJid = remoteJid.includes('@') ? remoteJid : `${phoneNumber}@s.whatsapp.net`;
                              const aiMsgId = `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                              
                              // Determine audio mode
                              const audioResponseMode = (agentSettings.audioResponseMode as string) || 'disabled';
                              // Force 'ello' voice for platform agent
                              const ttsVoice = 'ello';
                              console.log(`🤖🌐 [PLATFORM-AGENT] Forced ttsVoice=ello, audioResponseMode=${audioResponseMode}, messageType=${messageType}`);
                              const shouldSendAudio = audioResponseMode === 'always' || 
                                (audioResponseMode === 'when_audio' && (messageType === 'audio' || messageType === 'ptt'));
                              
                              let sendSuccess = false;
                              
                              if (shouldSendAudio) {
                                let audioBase64 = '';
                                let audioContentType = 'audio/ogg; codecs=opus';
                                
                                if (ttsVoice === 'ello') {
                                  // Use ElevenLabs TTS with Ello voice
                                  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
                                  if (ELEVENLABS_API_KEY) {
                                    const elloResp = await fetch(
                                      `https://api.elevenlabs.io/v1/text-to-speech/RGymW84CSmfVugnA5tvA?output_format=mp3_44100_128`,
                                      {
                                        method: 'POST',
                                        headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ text: aiReply.slice(0, 5000), model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true } }),
                                      }
                                    );
                                    if (elloResp.ok) {
                                      const elloBuffer = await elloResp.arrayBuffer();
                                      const elloBytes = new Uint8Array(elloBuffer);
                                      // Safe base64 encoding for large buffers
                                      let binary = '';
                                      for (let i = 0; i < elloBytes.length; i++) binary += String.fromCharCode(elloBytes[i]);
                                      audioBase64 = btoa(binary);
                                      audioContentType = 'audio/mpeg';
                                    } else {
                                      console.error('❌ ElevenLabs Ello TTS failed:', elloResp.status);
                                    }
                                  }
                                }
                                
                                // Fallback to OpenAI TTS for non-ello voices or if ElevenLabs failed
                                if (!audioBase64) {
                                  const ttsResp = await fetch(`${SUPABASE_URL}/functions/v1/tts-openai`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
                                    body: JSON.stringify({ text: aiReply, voice: ttsVoice === 'ello' ? 'nova' : ttsVoice, speed: 1.0, format: 'opus' }),
                                  });
                                  if (ttsResp.ok) {
                                    const ttsData = await ttsResp.json();
                                    audioBase64 = ttsData.audio_base64;
                                    audioContentType = 'audio/ogg; codecs=opus';
                                  }
                                }
                                
                                if (audioBase64) {
                                  const audioFileName = `ai-audio/${aiMsgId}.${audioContentType.includes('mpeg') ? 'mp3' : 'ogg'}`;
                                  const binaryStr = atob(audioBase64);
                                  const bytes = new Uint8Array(binaryStr.length);
                                  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
                                  
                                  const { error: uploadErr } = await supabase.storage.from('whatsapp-media').upload(audioFileName, bytes, { contentType: audioContentType, upsert: true });
                                  if (!uploadErr) {
                                    const { data: pubUrl } = supabase.storage.from('whatsapp-media').getPublicUrl(audioFileName);
                                    const voiceResp = await fetch(`${sessionData.baileys_server_url}/api/message/send-voice`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ instanceName: sessionData.instance_name, jid: sendJid, audioUrl: pubUrl.publicUrl, mimetype: audioContentType }),
                                    });
                                    sendSuccess = voiceResp.ok;
                                    if (sendSuccess) {
                                      await supabase.from('whatsapp_messages').insert({
                                        conversation_id: conversation.id, session_id: targetSessionId, company_id: companyId,
                                        wa_message_id: aiMsgId, from_me: true, content: '[Áudio]', message_type: 'ptt',
                                        media_url: pubUrl.publicUrl, status: 'sent', is_ai_response: true, sender_name: agent.name,
                                      });
                                    }
                                  }
                                }
                              }
                              
                              if (!sendSuccess) {
                                // Send as text
                                const sendResp = await fetch(`${sessionData.baileys_server_url}/api/message/send`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ instanceName: sessionData.instance_name, jid: sendJid, message: { text: aiReply } }),
                                });
                                sendSuccess = sendResp.ok;
                                await supabase.from('whatsapp_messages').insert({
                                  conversation_id: conversation.id, session_id: targetSessionId, company_id: companyId,
                                  wa_message_id: aiMsgId, from_me: true, content: aiReply, message_type: 'text',
                                  status: sendSuccess ? 'sent' : 'failed', is_ai_response: true, sender_name: agent.name,
                                });
                              }
                              
                              // Update conversation
                              const convUpd: Record<string, unknown> = {
                                last_message: shouldSendAudio && sendSuccess ? '🎙️ Áudio' : aiReply.substring(0, 100),
                                last_message_at: new Date().toISOString(),
                              };
                              if (isHandoff) {
                                convUpd.ai_auto_reply_enabled = false;
                                convUpd.assigned_agent_id = null;
                              }
                              await supabase.from('whatsapp_conversations').update(convUpd).eq('id', conversation.id);
                            }
                          }
                        } else {
                          console.error('🤖🌐 [PLATFORM-AGENT] Agent call failed:', await agentResp.text());
                        }
                        
                        // Skip normal AI flow - platform agent handled it
                        break;
                      }
                      // ============== END PLATFORM AGENT ==============
                      
                      // Build proper system prompt - concise, one message at a time
                      const systemPrompt = [
                        `Personalidade: ${agent.personality}`,
                        `Tom/Humor: ${agentHumor}`,
                        '',
                        agent.instructions,
                        '',
                        'REGRAS ESSENCIAIS DE COMPORTAMENTO NO WHATSAPP:',
                        '1. Responda APENAS o que foi perguntado. Seja direto e conciso.',
                        '2. NUNCA antecipe perguntas que o cliente nao fez. Espere ele perguntar.',
                        '3. Envie UMA UNICA mensagem curta por vez. NAO divida em multiplas mensagens.',
                        '4. Se o cliente perguntar algo simples, responda em 1-2 frases no maximo.',
                        '5. NAO despeje todas as informacoes de uma vez. Va respondendo conforme o cliente pergunta.',
                        '6. Aja como um vendedor real no WhatsApp: respostas curtas, naturais e objetivas.',
                        '',
                        'FORMATACAO:',
                        '- NAO use asteriscos, negrito, italico, markdown ou formatacao especial.',
                        '- Escreva texto corrido e natural, como uma pessoa digitando no WhatsApp.',
                        '- NAO use listas com marcadores. Escreva em frases corridas.',
                        '- NAO use links com formatacao markdown. Escreva a URL direta.',
                        '',
                        `LIMITE: Responda com NO MAXIMO ${agentMaxChars} caracteres. Prefira respostas bem mais curtas.`,
                        `NUNCA use o separador "|||". Envie sempre UMA unica mensagem.`,
                        '',
                        'TRANSFERENCIA PARA ATENDENTE HUMANO:',
                        'Se o cliente pedir para falar com um atendente humano, ou se voce perceber que nao consegue resolver a situacao (ex: problemas de pagamento, reclamacoes graves, assuntos que exigem um humano), inclua a tag [HANDOFF] no FINAL da sua resposta.',
                        'Ao usar [HANDOFF], envie uma mensagem gentil dizendo que vai transferir para um atendente. Exemplo: "Vou te transferir para um atendente que poderá te ajudar melhor com isso! [HANDOFF]"',
                        'A tag [HANDOFF] sera removida automaticamente e nao aparecera para o cliente.',
                        '',
                        'CLASSIFICACAO AUTOMATICA DO ATENDIMENTO:',
                        'Ao final de CADA resposta, inclua uma tag de classificacao do estagio da conversa. Use EXATAMENTE uma destas tags:',
                        '- [STAGE:novo] - Contato novo, primeira interacao ou sem contexto suficiente.',
                        '- [STAGE:em_atendimento] - Conversa ativa, cliente está sendo atendido agora.',
                        '- [STAGE:aguardando] - Voce fez uma pergunta ou pediu informacao ao cliente e está esperando resposta.',
                        '- [STAGE:qualificado] - Cliente demonstrou interesse real, pediu preco, quer fechar, ou é um lead quente.',
                        '- [STAGE:finalizado] - Conversa encerrada, cliente agradeceu, despedida, ou assunto resolvido.',
                        'SEMPRE inclua a tag [STAGE:xxx] no FINAL da resposta. Ela sera removida automaticamente.',
                        '',
                        'LINKS E URLs:',
                        'Quando precisar enviar links ou URLs, SEMPRE inclua o link na sua resposta em texto. O sistema automaticamente enviara o texto com o link clicavel e depois o audio separadamente.',
                        '',
                        ...(mediaList.length > 0 ? [
                          'MIDIAS DISPONIVEIS PARA ENVIO:',
                          'Voce tem acesso a estes arquivos que pode enviar ao cliente quando for relevante.',
                          'Para enviar uma midia, inclua a tag [MEDIA:ID] na sua resposta (o ID sera substituido pelo sistema).',
                          'Envie a midia JUNTO com uma mensagem de texto contextual.',
                          'NAO envie midia se o cliente nao pediu algo relacionado. So envie quando fizer sentido.',
                          '',
                          ...mediaList.map((m: any) => `- ID: ${m.id} | Arquivo: ${m.file_name} | Quando enviar: ${m.description}${m.context_keywords?.length > 0 ? ` | Palavras-chave: ${m.context_keywords.join(', ')}` : ''}`),
                          '',
                        ] : []),
                        'Responda sempre em português brasileiro.'
                      ].join('\n');
                      
                      // Load recent conversation history for context (exclude the current message)
                      const { data: recentMessages } = await supabase
                        .from('whatsapp_messages')
                        .select('from_me, content, is_ai_response')
                        .eq('conversation_id', conversation.id)
                        .neq('wa_message_id', messageId)
                        .order('timestamp', { ascending: false })
                        .limit(10);
                      
                      const historyMessages = (recentMessages || []).reverse().map(m => ({
                        role: m.from_me ? 'assistant' as const : 'user' as const,
                        content: m.content || ''
                      }));
                      
                      // If message is audio/ptt, try to transcribe it before sending to AI
                      let aiInputContent = content;
                      if ((messageType === 'audio' || messageType === 'ptt')) {
                        // If mediaUrl is empty, try downloading from Baileys server
                        if (!mediaUrl && targetSessionId) {
                          try {
                            const { data: sessAudioAgent } = await supabase
                              .from('whatsapp_sessions')
                              .select('baileys_server_url, instance_name')
                              .eq('id', targetSessionId)
                              .single();
                            if (sessAudioAgent?.baileys_server_url) {
                              console.log(`🎙️ [AGENT-AUDIO-DL] Downloading audio via Baileys for msg ${messageId}`);
                              const dlResp = await fetch(`${sessAudioAgent.baileys_server_url}/api/media/download`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ instanceName: sessAudioAgent.instance_name, messageId, remoteJid }),
                              });
                              if (dlResp.ok) {
                                const dlData = await dlResp.json();
                                if (dlData.url) {
                                  mediaUrl = dlData.url;
                                  console.log(`🎙️ [AGENT-AUDIO-DL] Got URL: ${mediaUrl.substring(0, 80)}`);
                                } else if (dlData.base64) {
                                  const audioFileName = `incoming-audio/${targetSessionId}/${messageId}.ogg`;
                                  const binaryStr = atob(dlData.base64);
                                  const audioBytes = new Uint8Array(binaryStr.length);
                                  for (let i = 0; i < binaryStr.length; i++) audioBytes[i] = binaryStr.charCodeAt(i);
                                  const { error: upErr } = await supabase.storage.from('whatsapp-media').upload(audioFileName, audioBytes, { contentType: 'audio/ogg', upsert: true });
                                  if (!upErr) {
                                    const { data: pubData } = supabase.storage.from('whatsapp-media').getPublicUrl(audioFileName);
                                    mediaUrl = pubData.publicUrl;
                                    console.log(`🎙️ [AGENT-AUDIO-DL] Uploaded: ${mediaUrl.substring(0, 80)}`);
                                  }
                                }
                              } else {
                                console.log(`🎙️ [AGENT-AUDIO-DL] Download returned ${dlResp.status}`);
                              }
                            }
                          } catch (dlErr) {
                            console.error('🎙️ [AGENT-AUDIO-DL] Error:', dlErr);
                          }
                        }

                        if (mediaUrl) {
                          console.log('🎙️ Audio message detected, attempting transcription via ElevenLabs Scribe...');
                          try {
                            const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
                            if (ELEVENLABS_API_KEY) {
                              const audioResponse = await fetch(mediaUrl);
                              if (audioResponse.ok) {
                                const audioBuffer = await audioResponse.arrayBuffer();
                                console.log(`🎙️ Audio downloaded: ${audioBuffer.byteLength} bytes`);
                                const scribeForm = new FormData();
                                const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
                                scribeForm.append('file', audioBlob, 'audio.ogg');
                                scribeForm.append('model_id', 'scribe_v2');
                                scribeForm.append('language_code', 'por');
                                const scribeResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
                                  method: 'POST',
                                  headers: { 'xi-api-key': ELEVENLABS_API_KEY },
                                  body: scribeForm,
                                });
                                if (scribeResponse.ok) {
                                  const scribeResult = await scribeResponse.json();
                                  const transcribedText = scribeResult.text?.trim();
                                  if (transcribedText && transcribedText.length > 2) {
                                    console.log(`🎙️ ElevenLabs Transcription: ${transcribedText.substring(0, 100)}`);
                                    aiInputContent = `[O cliente enviou um áudio dizendo]: ${transcribedText}`;
                                    await supabase.from('whatsapp_messages').update({ content: `🎙️ ${transcribedText}` }).eq('wa_message_id', messageId);
                                  } else {
                                    console.log('🎙️ Transcription empty or too short');
                                    aiInputContent = '[O cliente enviou um áudio mas não foi possível entender o conteúdo. Peça educadamente para ele repetir ou digitar.]';
                                  }
                                } else {
                                  const errText = await scribeResponse.text();
                                  console.error('🎙️ ElevenLabs Scribe API error:', scribeResponse.status, errText);
                                  // Fallback to OpenAI Whisper
                                  console.log('🎙️ Trying OpenAI Whisper fallback...');
                                  try {
                                    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
                                    if (OPENAI_API_KEY) {
                                      const whisperForm = new FormData();
                                      whisperForm.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'audio.ogg');
                                      whisperForm.append('model', 'whisper-1');
                                      whisperForm.append('language', 'pt');
                                      const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
                                        body: whisperForm,
                                      });
                                      if (whisperResp.ok) {
                                        const whisperResult = await whisperResp.json();
                                        if (whisperResult.text?.trim()?.length > 2) {
                                          console.log(`🎙️ Whisper Transcription: ${whisperResult.text.trim().substring(0, 100)}`);
                                          aiInputContent = `[O cliente enviou um áudio dizendo]: ${whisperResult.text.trim()}`;
                                          await supabase.from('whatsapp_messages').update({ content: `🎙️ ${whisperResult.text.trim()}` }).eq('wa_message_id', messageId);
                                        }
                                      }
                                    }
                                  } catch (whisperErr) {
                                    console.error('🎙️ Whisper fallback error:', whisperErr);
                                  }
                                  if (!aiInputContent.includes('[O cliente enviou um áudio dizendo]')) {
                                    aiInputContent = '[O cliente enviou um áudio. Não foi possível transcrevê-lo no momento. Peça educadamente para ele digitar a mensagem.]';
                                  }
                                }
                              } else {
                                console.error('🎙️ Failed to download audio:', audioResponse.status);
                                aiInputContent = '[O cliente enviou um áudio mas não foi possível acessá-lo. Peça educadamente para ele digitar.]';
                              }
                            } else {
                              aiInputContent = '[O cliente enviou um áudio. Peça para ele digitar a mensagem pois não há serviço de transcrição configurado.]';
                            }
                          } catch (transcribeErr) {
                            console.error('🎙️ Transcription error:', transcribeErr);
                            aiInputContent = '[O cliente enviou um áudio mas ocorreu um erro na transcrição. Peça educadamente para ele digitar.]';
                          }
                        } else {
                          console.log('🎙️ Audio message without mediaUrl after download attempt');
                          aiInputContent = '[O cliente enviou um áudio mas o sistema não conseguiu acessar o arquivo de áudio para transcrição. Peça educadamente para ele digitar ou enviar novamente.]';
                        }
                      }
                      
                      const apiMessages = [
                        { role: 'system' as const, content: systemPrompt },
                        ...historyMessages,
                        { role: 'user' as const, content: aiInputContent }
                      ];
                      
                      // Call the ai-chat edge function with full messages array
                      const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                        },
                        body: JSON.stringify({
                          messages: apiMessages,
                          model: 'google/gemini-3-flash-preview',
                          temperature: agentTemperature
                        })
                      });
                      
                      if (aiResponse.ok) {
                        const aiData = await aiResponse.json();
                        let aiReply = aiData.response || aiData.message;
                        
                        if (aiReply) {
                          // Clean markdown from response
                          aiReply = aiReply
                            .replace(/\*\*(.*?)\*\*/g, '$1')
                            .replace(/\*(.*?)\*/g, '$1')
                            .replace(/#{1,6}\s?/g, '')
                            .replace(/`{1,3}(.*?)`{1,3}/gs, '$1')
                            .replace(/\[(.*?)\]\((.*?)\)/g, '$2')
                            .replace(/^[-*+]\s/gm, '• ')
                            .trim();
                          
                          console.log('🤖 AI Response (cleaned):', aiReply.substring(0, 100) + '...');
                          
                          // Check for handoff signal - if present, remove the tag from the message and flag for handoff
                          const isHandoff = aiReply.includes('[HANDOFF]');
                          if (isHandoff) {
                            aiReply = aiReply.replace('[HANDOFF]', '').trim();
                            console.log('🤖🔄 HANDOFF detected! Will disable AI auto-reply after sending message.');
                          }
                          
                          // Check for pipeline stage classification tag
                          const validStages = ['novo', 'em_atendimento', 'aguardando', 'qualificado', 'finalizado'];
                          const stageMatch = aiReply.match(/\[STAGE:(\w+)\]/);
                          let detectedStage: string | null = null;
                          if (stageMatch && validStages.includes(stageMatch[1])) {
                            detectedStage = stageMatch[1];
                            console.log(`📊 AI classified conversation stage: ${detectedStage}`);
                          }
                          // Remove ALL stage tags from the reply
                          aiReply = aiReply.replace(/\[STAGE:\w+\]/g, '').trim();
                          
                          // ============== DETECT AND EXTRACT MEDIA TAGS ==============
                          const mediaTagRegex = /\[MEDIA:([a-f0-9-]+)\]/gi;
                          const detectedMediaIds: string[] = [];
                          let mediaMatch;
                          while ((mediaMatch = mediaTagRegex.exec(aiReply)) !== null) {
                            detectedMediaIds.push(mediaMatch[1]);
                          }
                          // Remove media tags from the text reply
                          aiReply = aiReply.replace(/\[MEDIA:[a-f0-9-]+\]/gi, '').trim();
                          console.log(`🤖📸 Detected ${detectedMediaIds.length} media tags in response`);
                          
                          // Split response by separator
                          const messageParts = aiReply.split(MESSAGE_SEPARATOR).map((p: string) => p.trim()).filter((p: string) => p.length > 0);
                          console.log(`🤖 Message parts: ${messageParts.length}`);
                          
                          // Get session server URL
                          const { data: sessionData } = await supabase
                            .from('whatsapp_sessions')
                            .select('id, baileys_server_url, instance_name')
                            .eq('id', targetSessionId)
                            .single();
                          
                          if (sessionData?.baileys_server_url) {
                            // Determine if we should respond with audio
                            const audioResponseMode = (agentSettings.audioResponseMode as string) || 'disabled';
                            const ttsVoice = (agentSettings.ttsVoice as string) || 'nova';
                            const shouldSendAudio = audioResponseMode === 'always' || 
                              (audioResponseMode === 'when_audio' && (messageType === 'audio' || messageType === 'ptt'));
                            
                            console.log(`🤖 Audio mode: ${audioResponseMode}, ttsVoice: ${ttsVoice}, messageType: ${messageType}, shouldSendAudio: ${shouldSendAudio}`);
                            
                            // Use remoteJid directly - it's already resolved from remoteJidAlt in the webhook
                            // For LID contacts, the remoteJid is the best we have
                            const sendJid = remoteJid.includes('@') ? remoteJid : `${phoneNumber}@s.whatsapp.net`;
                            console.log(`🤖 Send JID: ${sendJid}, remoteJid: ${remoteJid}, phoneNumber: ${phoneNumber}`);
                            
                            // Detect URLs in the response - if audio mode is on and response contains links,
                            // extract links to send as text separately, then send audio without the links
                            const urlRegex = /(https?:\/\/[^\s,)]+)/gi;
                            
                            // Send each message part
                            for (let partIndex = 0; partIndex < messageParts.length; partIndex++) {
                              const partContent = messageParts[partIndex];
                              const containsUrl = urlRegex.test(partContent);
                              urlRegex.lastIndex = 0; // Reset regex
                              
                              // If audio mode is on and content has URLs, send text first then audio
                              if (shouldSendAudio && partIndex === 0 && containsUrl) {
                                console.log('🔗 Response contains URLs - sending text first, then audio');
                                
                                // 1. Send text message with the full content (including links)
                                const textMsgId = `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                                await supabase
                                  .from('whatsapp_messages')
                                  .insert({
                                    conversation_id: conversation.id,
                                    session_id: targetSessionId,
                                    company_id: companyId,
                                    wa_message_id: textMsgId,
                                    from_me: true,
                                    content: partContent,
                                    message_type: 'text',
                                    status: 'sending',
                                    is_ai_response: true,
                                    sender_name: agent.name,
                                    timestamp: new Date().toISOString()
                                  });
                                
                                const textSendResp = await fetch(`${sessionData.baileys_server_url}/api/message/send`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    instanceName: sessionData.instance_name,
                                    jid: sendJid,
                                    message: { text: partContent }
                                  })
                                });
                                
                                await supabase
                                  .from('whatsapp_messages')
                                  .update({ status: textSendResp.ok ? 'sent' : 'failed' })
                                  .eq('wa_message_id', textMsgId);
                                
                                if (textSendResp.ok) {
                                  console.log('🔗 Text with links sent successfully');
                                } else {
                                  console.error('🔗 Failed to send text with links:', await textSendResp.text());
                                }
                                
                                // Small delay before sending audio
                                await new Promise(r => setTimeout(r, 1000));
                                
                                // 2. Now send audio version (without URLs for cleaner speech)
                                const audioContent = partContent.replace(urlRegex, '').replace(/\s{2,}/g, ' ').trim();
                                urlRegex.lastIndex = 0;
                                
                                if (audioContent.length > 5) {
                                  const audioMsgId = `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                                  await supabase
                                    .from('whatsapp_messages')
                                    .insert({
                                      conversation_id: conversation.id,
                                      session_id: targetSessionId,
                                      company_id: companyId,
                                      wa_message_id: audioMsgId,
                                      from_me: true,
                                      content: '[Áudio]',
                                      message_type: 'ptt',
                                      status: 'sending',
                                      is_ai_response: true,
                                      sender_name: agent.name,
                                      timestamp: new Date(Date.now() + 1000).toISOString()
                                    });
                                  
                                  // Generate TTS for the text without URLs
                                  let ttsResponse: Response | null = null;
                                  
                                  if (ttsVoice === 'ello') {
                                    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
                                    if (ELEVENLABS_API_KEY) {
                                      const elloResp = await fetch(
                                        `https://api.elevenlabs.io/v1/text-to-speech/RGymW84CSmfVugnA5tvA?output_format=mp3_44100_128`,
                                        {
                                          method: 'POST',
                                          headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ text: audioContent.slice(0, 5000), model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true } }),
                                        }
                                      );
                                      if (elloResp.ok) {
                                        const elloBuffer = await elloResp.arrayBuffer();
                                        const elloBytes = new Uint8Array(elloBuffer);
                                        let binary = '';
                                        for (let i = 0; i < elloBytes.length; i++) binary += String.fromCharCode(elloBytes[i]);
                                        ttsResponse = new Response(JSON.stringify({ audio_base64: btoa(binary), format: 'mp3' }), { status: 200 });
                                        console.log('🎙️ ElevenLabs TTS (URL path) generated successfully');
                                      }
                                    }
                                  }
                                  
                                  if (!ttsResponse) {
                                    ttsResponse = await fetch(`${SUPABASE_URL}/functions/v1/tts-openai`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                                    },
                                    body: JSON.stringify({
                                      text: audioContent,
                                      voice: ttsVoice === 'ello' ? 'nova' : ttsVoice,
                                      speed: 1.0,
                                      format: 'opus'
                                    })
                                    });
                                  }
                                  
                                  let audioSent = false;
                                  if (ttsResponse.ok) {
                                    const ttsData = await ttsResponse.json();
                                    const audioBase64 = ttsData.audio_base64;
                                    const audioFormat = ttsData.format || 'opus';
                                    const fileExt = audioFormat === 'mp3' ? 'mp3' : 'ogg';
                                    const contentType = audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/ogg; codecs=opus';
                                    const audioFileName = `ai-audio/${audioMsgId}.${fileExt}`;
                                    
                                    const binaryString = atob(audioBase64);
                                    const audioBytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) {
                                      audioBytes[i] = binaryString.charCodeAt(i);
                                    }
                                    
                                    const { error: uploadError } = await supabase.storage
                                      .from('whatsapp-media')
                                      .upload(audioFileName, audioBytes, { contentType, upsert: true });
                                    
                                    if (!uploadError) {
                                      const { data: publicUrlData } = supabase.storage
                                        .from('whatsapp-media')
                                        .getPublicUrl(audioFileName);
                                      
                                      const sendVoiceResp = await fetch(`${sessionData.baileys_server_url}/api/message/send-voice`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          instanceName: sessionData.instance_name,
                                          jid: sendJid,
                                          audioUrl: publicUrlData.publicUrl,
                                          mimetype: contentType
                                        })
                                      });
                                      
                                      audioSent = sendVoiceResp.ok;
                                      await supabase
                                        .from('whatsapp_messages')
                                        .update({ media_url: publicUrlData.publicUrl, status: audioSent ? 'sent' : 'failed' })
                                        .eq('wa_message_id', audioMsgId);
                                    }
                                  }
                                  
                                  if (!audioSent) {
                                    // Remove failed audio message from DB
                                    await supabase.from('whatsapp_messages').delete().eq('wa_message_id', audioMsgId);
                                    console.log('🎙️ Audio generation failed for link message, text already sent');
                                  }
                                }
                                
                                continue; // Skip the normal send logic below
                              }
                              
                              const aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                              
                              // Save to database
                              await supabase
                                .from('whatsapp_messages')
                                .insert({
                                  conversation_id: conversation.id,
                                  session_id: targetSessionId,
                                  company_id: companyId,
                                  wa_message_id: aiMessageId,
                                  from_me: true,
                                  content: shouldSendAudio && partIndex === 0 ? '[Áudio]' : partContent,
                                  message_type: shouldSendAudio && partIndex === 0 ? 'ptt' : 'text',
                                  status: 'sending',
                                  is_ai_response: true,
                                  sender_name: agent.name,
                                  timestamp: new Date(Date.now() + partIndex * 1000).toISOString()
                                });
                              
                              try {
                                let sendSuccess = false;
                                
                                if (shouldSendAudio && partIndex === 0) {
                                  // Generate TTS audio for first part only
                                  console.log(`🎙️ Generating TTS audio with voice: ${ttsVoice}`);
                                  
                                  let ttsResponse: Response | null = null;
                                  let isElevenLabs = false;
                                  
                                  if (ttsVoice === 'ello') {
                                    // Use ElevenLabs TTS
                                    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
                                    if (ELEVENLABS_API_KEY) {
                                      const elloResp = await fetch(
                                        `https://api.elevenlabs.io/v1/text-to-speech/RGymW84CSmfVugnA5tvA?output_format=mp3_44100_128`,
                                        {
                                          method: 'POST',
                                          headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ text: partContent.slice(0, 5000), model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true } }),
                                        }
                                      );
                                      if (elloResp.ok) {
                                        const elloBuffer = await elloResp.arrayBuffer();
                                        const elloBytes = new Uint8Array(elloBuffer);
                                        let binary = '';
                                        for (let i = 0; i < elloBytes.length; i++) binary += String.fromCharCode(elloBytes[i]);
                                        const audioBase64 = btoa(binary);
                                        // Create a fake response-like object for compatibility
                                        ttsResponse = new Response(JSON.stringify({ audio_base64: audioBase64, format: 'mp3' }), { status: 200 });
                                        isElevenLabs = true;
                                        console.log('🎙️ ElevenLabs TTS generated successfully');
                                      } else {
                                        console.error('🎙️ ElevenLabs TTS failed:', elloResp.status, '- falling back to OpenAI');
                                      }
                                    }
                                  }
                                  
                                  // Fallback to OpenAI TTS
                                  if (!ttsResponse) {
                                    ttsResponse = await fetch(`${SUPABASE_URL}/functions/v1/tts-openai`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                                    },
                                    body: JSON.stringify({
                                      text: partContent,
                                      voice: ttsVoice === 'ello' ? 'nova' : ttsVoice,
                                      speed: 1.0,
                                      format: 'opus'
                                    })
                                    });
                                  }
                                  
                                  if (ttsResponse.ok) {
                                    const ttsData = await ttsResponse.json();
                                    const audioBase64 = ttsData.audio_base64;
                                    const audioFormat = ttsData.format || 'opus';
                                    const fileExt = audioFormat === 'mp3' ? 'mp3' : 'ogg';
                                    const contentType = audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/ogg; codecs=opus';
                                    const audioFileName = `ai-audio/${aiMessageId}.${fileExt}`;
                                    
                                    // Decode base64 to binary
                                    const binaryString = atob(audioBase64);
                                    const audioBytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) {
                                      audioBytes[i] = binaryString.charCodeAt(i);
                                    }
                                    
                                    const { error: uploadError } = await supabase.storage
                                      .from('whatsapp-media')
                                      .upload(audioFileName, audioBytes, {
                                        contentType: contentType,
                                        upsert: true
                                      });
                                    
                                    if (!uploadError) {
                                      const { data: publicUrlData } = supabase.storage
                                        .from('whatsapp-media')
                                        .getPublicUrl(audioFileName);
                                      
                                      const audioPublicUrl = publicUrlData.publicUrl;
                                      console.log(`🎙️ Audio uploaded: ${audioPublicUrl} (${contentType})`);
                                      
                                      // Send via send-voice - OGG Opus with ptt:true for WhatsApp voice note
                                      const sendResponse = await fetch(`${sessionData.baileys_server_url}/api/message/send-voice`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          instanceName: sessionData.instance_name,
                                          jid: sendJid,
                                          audioUrl: audioPublicUrl,
                                          mimetype: contentType
                                        })
                                      });
                                      
                                      sendSuccess = sendResponse.ok;
                                      if (!sendSuccess) {
                                        const errText = await sendResponse.text();
                                        console.error('🎙️ send-voice failed:', sendResponse.status, errText);
                                      } else {
                                        console.log('🎙️ Audio sent successfully via send-voice as PTT');
                                      }
                                      await supabase
                                        .from('whatsapp_messages')
                                        .update({ media_url: audioPublicUrl })
                                        .eq('wa_message_id', aiMessageId);
                                    } else {
                                      console.error('🎙️ Audio upload failed:', uploadError.message);
                                    }
                                  } else {
                                    const ttsErr = await ttsResponse.text();
                                    console.error('🎙️ TTS generation failed:', ttsResponse.status, ttsErr);
                                  }
                                  
                                  // Fallback to text if audio failed
                                  if (!sendSuccess) {
                                    console.log('🎙️ Audio failed, falling back to text');
                                    const sendResponse = await fetch(`${sessionData.baileys_server_url}/api/message/send`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        instanceName: sessionData.instance_name,
                                        jid: sendJid,
                                        message: { text: partContent }
                                      })
                                    });
                                    sendSuccess = sendResponse.ok;
                                    await supabase
                                      .from('whatsapp_messages')
                                      .update({ content: partContent, message_type: 'text' })
                                      .eq('wa_message_id', aiMessageId);
                                  }
                                } else {
                                  // Send as text using correct Baileys format
                                  const sendResponse = await fetch(`${sessionData.baileys_server_url}/api/message/send`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      instanceName: sessionData.instance_name,
                                      jid: sendJid,
                                      message: { text: partContent }
                                    })
                                  });
                                  sendSuccess = sendResponse.ok;
                                  if (!sendSuccess) {
                                    console.error('🤖 Failed to send AI message part:', await sendResponse.text());
                                  }
                                }
                                
                                if (sendSuccess) {
                                  console.log(`🤖 AI message part ${partIndex + 1}/${messageParts.length} sent successfully`);
                                  await supabase
                                    .from('whatsapp_messages')
                                    .update({ status: 'sent' })
                                    .eq('wa_message_id', aiMessageId);
                                } else {
                                  await supabase
                                    .from('whatsapp_messages')
                                    .update({ status: 'failed' })
                                    .eq('wa_message_id', aiMessageId);
                                }
                              } catch (sendError) {
                                console.error('🤖 Error sending AI message part:', sendError);
                                await supabase
                                  .from('whatsapp_messages')
                                  .update({ status: 'failed' })
                                  .eq('wa_message_id', aiMessageId);
                              }
                              
                              // Small delay between parts to simulate typing
                              if (partIndex < messageParts.length - 1) {
                                await new Promise(r => setTimeout(r, 1500));
                              }
                            }
                            
                            // ============== SEND DETECTED MEDIA FILES ==============
                            if (detectedMediaIds.length > 0 && sessionData?.baileys_server_url) {
                              for (const mediaId of detectedMediaIds) {
                                const mediaItem = mediaList.find((m: any) => m.id === mediaId);
                                if (!mediaItem) {
                                  console.log(`🤖📸 Media ID ${mediaId} not found in agent media list`);
                                  continue;
                                }
                                
                                console.log(`🤖📸 Sending media: ${mediaItem.file_name} (${mediaItem.file_type})`);
                                const mediaMsgId = `ai-media-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                                
                                try {
                                  const mediaType = mediaItem.file_type === 'image' ? 'image' : 
                                                    mediaItem.file_type === 'video' ? 'video' : 'document';
                                  
                                  const sendMediaResp = await fetch(`${sessionData.baileys_server_url}/api/message/send-media`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      instanceName: sessionData.instance_name,
                                      jid: sendJid,
                                      mediaUrl: mediaItem.file_url,
                                      mediaType: mediaType,
                                      caption: '',
                                    }),
                                  });
                                  
                                  const mediaSent = sendMediaResp.ok;
                                  console.log(`🤖📸 Media send result: ${mediaSent ? 'success' : 'failed'}`);
                                  
                                  // Save media message to DB
                                  await supabase.from('whatsapp_messages').insert({
                                    conversation_id: conversation.id,
                                    session_id: targetSessionId,
                                    company_id: companyId,
                                    wa_message_id: mediaMsgId,
                                    from_me: true,
                                    content: `[${mediaType === 'image' ? 'Imagem' : mediaType === 'video' ? 'Vídeo' : 'Documento'}]`,
                                    message_type: mediaType,
                                    media_url: mediaItem.file_url,
                                    status: mediaSent ? 'sent' : 'failed',
                                    is_ai_response: true,
                                    sender_name: agent.name,
                                    timestamp: new Date().toISOString(),
                                  });
                                  
                                  if (!mediaSent) {
                                    // Fallback: send URL as text
                                    await fetch(`${sessionData.baileys_server_url}/api/message/send`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        instanceName: sessionData.instance_name,
                                        jid: sendJid,
                                        message: { text: mediaItem.file_url }
                                      }),
                                    });
                                  }
                                  
                                  // Small delay between media sends
                                  await new Promise(r => setTimeout(r, 1000));
                                } catch (mediaErr) {
                                  console.error(`🤖📸 Error sending media ${mediaId}:`, mediaErr);
                                }
                              }
                            }
                            // ============== END SEND MEDIA ==============
                            
                            // Update conversation last message
                            const convUpdate: Record<string, unknown> = {
                              last_message: shouldSendAudio ? '🎙️ Áudio' : messageParts[messageParts.length - 1].substring(0, 100),
                              last_message_at: new Date().toISOString()
                            };
                            
                            // If handoff was triggered, disable AI auto-reply
                            if (isHandoff) {
                              convUpdate.ai_auto_reply_enabled = false;
                              convUpdate.assigned_agent_id = null;
                              convUpdate.pipeline_stage = 'aguardando'; // Handoff = awaiting human
                              console.log('🤖🔄 HANDOFF: AI auto-reply DISABLED for conversation:', conversation.id);
                            }
                            
                            // Update pipeline stage if AI classified it
                            if (detectedStage) {
                              convUpdate.pipeline_stage = detectedStage;
                              console.log(`📊 Updating pipeline_stage to: ${detectedStage}`);
                            }
                            
                            await supabase
                              .from('whatsapp_conversations')
                              .update(convUpdate)
                              .eq('id', conversation.id);
                          }
                        }
                      } else {
                        console.error('🤖 AI chat error:', await aiResponse.text());
                      }
                    }
                  }
                } catch (aiError) {
                  console.error('🤖 AI auto-reply error:', aiError);
                }
              }
            }
          } else {
            // Insert without wa_message_id (for messages without IDs)
            const { error: msgError } = await supabase
              .from('whatsapp_messages')
              .insert(messageData);
            
            if (msgError) {
              console.error(`Message insert error:`, msgError.message);
            } else {
              console.log(`Message inserted: ${content.substring(0, 50)}...`);
            }
          }
        }
        break;
      }

      // ==================== MESSAGE STATUS UPDATE ====================
      case 'messages.update': {
        const updates = data?.updates || [];
        console.log(`[MSG UPDATE] Processing ${updates.length} updates`);
        
        // Get session context for unread count updates
        let targetSessionId = sessionId;
        let companyId = '';
        
        if (!targetSessionId && instanceName) {
          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('id, company_id')
            .eq('instance_name', instanceName)
            .single();
          
          if (session) {
            targetSessionId = session.id;
            companyId = session.company_id;
          }
        } else if (targetSessionId) {
          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('company_id')
            .eq('id', targetSessionId)
            .single();
          
          if (session) companyId = session.company_id;
        }
        
        for (const update of updates) {
          const messageId = update.key?.id;
          const remoteJid = update.key?.remoteJid;
          const status = update.update?.status;
          
          if (messageId && status !== undefined) {
            // Map status numbers to strings
            const statusMap: Record<number, string> = {
              0: 'error',
              1: 'pending',
              2: 'sent',
              3: 'delivered',
              4: 'read',
              5: 'played'
            };
            
            const statusStr = typeof status === 'number' ? statusMap[status] || 'unknown' : status;
            
            console.log(`[MSG UPDATE] ${messageId} -> ${statusStr}, jid: ${remoteJid}`);
            
            // Update message status
            await supabase
              .from('whatsapp_messages')
              .update({ status: statusStr })
              .eq('wa_message_id', messageId);
            
            // ============== CRITICAL: Reset unread_count when messages are read ==============
            // When status is 'read' (4) or 'played' (5), it means INCOMING messages were read
            // This happens when the user views messages on their phone
            if ((statusStr === 'read' || statusStr === 'played') && remoteJid && companyId) {
              // Extract phone number from JID
              const phoneNumber = remoteJid
                .replace('@s.whatsapp.net', '')
                .replace('@g.us', '')
                .replace('@c.us', '')
                .replace(/\D/g, '');
              
              if (phoneNumber) {
                console.log(`[MSG UPDATE] Resetting unread_count for conversation with ${phoneNumber}`);
                
                await supabase
                  .from('whatsapp_conversations')
                  .update({ unread_count: 0 })
                  .eq('company_id', companyId)
                  .eq('contact_phone', phoneNumber);
              }
            }
          }
        }
        break;
      }

      // ==================== CONTACTS SYNC ====================
      case 'contacts.set':
      case 'contacts.update':
      case 'contacts.upsert': {
        const contacts = data?.contacts || [];
        console.log(`[CONTACTS] Processing ${contacts.length} contacts`);

        // Get session info
        let targetSessionId = sessionId;
        let companyId = '';

        if (!targetSessionId && instanceName) {
          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('id, company_id')
            .eq('instance_name', instanceName)
            .single();

          if (session) {
            targetSessionId = session.id;
            companyId = session.company_id;
          }
        } else if (targetSessionId) {
          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('company_id')
            .eq('id', targetSessionId)
            .single();

          if (session) companyId = session.company_id;
        }

        if (!companyId) break;

        let upserted = 0;
        for (const contact of contacts) {
          try {
            const jid = contact.id || contact.jid;
            if (!jid) continue;

            // Ignore groups here; whatsapp_contacts é só para pessoas/negócios
            if (isGroupJid(jid)) continue;

            const phoneNumber = extractPhoneFromJid(jid, false);
            if (!phoneNumber) continue;

            const pushName = (contact.name || contact.notify || contact.verifiedName || '').trim();
            const profilePicture = (contact.imgUrl || contact.profilePicture || null) as string | null;

            // Preserve existing values (never overwrite with empty)
            const { data: existingContact } = await supabase
              .from('whatsapp_contacts')
              .select('push_name, profile_picture, business_name, is_business')
              .eq('company_id', companyId)
              .eq('wa_id', jid)
              .maybeSingle();

            const upsertData: Record<string, unknown> = {
              company_id: companyId,
              session_id: targetSessionId,
              wa_id: jid,
              phone_number: phoneNumber,
              is_business: contact.isBusiness ?? existingContact?.is_business ?? false,
            };

            // push_name
            if (pushName && pushName !== phoneNumber) {
              upsertData.push_name = pushName;
            } else if (existingContact?.push_name) {
              upsertData.push_name = existingContact.push_name;
            } else {
              upsertData.push_name = null;
            }

            // profile_picture
            if (profilePicture && profilePicture.trim()) {
              upsertData.profile_picture = profilePicture;
            } else if (existingContact?.profile_picture) {
              upsertData.profile_picture = existingContact.profile_picture;
            }

            // business_name (quando disponível)
            const businessName = (contact.businessName || contact.business_name || '').trim();
            if (businessName) {
              upsertData.business_name = businessName;
            } else if (existingContact?.business_name) {
              upsertData.business_name = existingContact.business_name;
            }

            const { error: upsertError } = await supabase
              .from('whatsapp_contacts')
              .upsert(upsertData, { onConflict: 'company_id,wa_id' });

            if (upsertError) {
              console.error('[CONTACTS] Upsert error:', upsertError);
              continue;
            }
            upserted++;

            // Also update conversation name if exists AND we have a valid name AND conv name is empty
            if (pushName && pushName !== phoneNumber) {
              const { data: conv } = await supabase
                .from('whatsapp_conversations')
                .select('id, contact_name')
                .eq('company_id', companyId)
                .eq('contact_phone', phoneNumber)
                .maybeSingle();

              if (conv && (!conv.contact_name || conv.contact_name === phoneNumber)) {
                await supabase
                  .from('whatsapp_conversations')
                  .update({ contact_name: pushName })
                  .eq('id', conv.id);
              }
            }
          } catch (e) {
            console.error('[CONTACTS] Contact processing error:', e);
          }
        }

        console.log(`[CONTACTS] Upserted ${upserted}/${contacts.length}`);
        break;
      }

      // ==================== SYNC CONTACT (Manual Refresh) ====================
      case 'sync.contact': {
        const { jid, phone, isGroup, name, profilePicture, groupDescription, groupParticipants } = data || {};
        
        console.log(`[SYNC.CONTACT] Processing: ${jid}, name: ${name}, hasPic: ${!!profilePicture}`);
        
        // Get session info
        let targetSessionId = sessionId;
        let companyId = '';
        
        if (!targetSessionId && instanceName) {
          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('id, company_id')
            .eq('instance_name', instanceName)
            .single();
          
          if (session) {
            targetSessionId = session.id;
            companyId = session.company_id;
          }
        } else if (targetSessionId) {
          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('company_id')
            .eq('id', targetSessionId)
            .single();
          
          if (session) companyId = session.company_id;
        }
        
        if (!companyId || !phone) {
          console.log('[SYNC.CONTACT] Missing companyId or phone');
          break;
        }
        
        // Update conversation with new photo and name
        const updateData: Record<string, unknown> = {};
        
        if (profilePicture) {
          updateData.profile_picture = profilePicture;
        }
        if (name && name !== phone) {
          updateData.contact_name = name;
        }
        
        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('whatsapp_conversations')
            .update(updateData)
            .eq('company_id', companyId)
            .eq('contact_phone', phone);
          
          if (error) {
            console.error('[SYNC.CONTACT] Update error:', error);
          } else {
            console.log(`[SYNC.CONTACT] Updated ${phone}:`, updateData);
          }
        }
        
        // Also update whatsapp_contacts table
        const { data: existingContact } = await supabase
          .from('whatsapp_contacts')
          .select('id, push_name, profile_picture')
          .eq('company_id', companyId)
          .eq('wa_id', jid)
          .maybeSingle();
        
        const contactUpsert: Record<string, unknown> = {
          company_id: companyId,
          wa_id: jid,
          phone_number: phone
        };
        
        if (name && name !== phone) {
          contactUpsert.push_name = name;
        } else if (existingContact?.push_name) {
          contactUpsert.push_name = existingContact.push_name;
        }
        
        if (profilePicture) {
          contactUpsert.profile_picture = profilePicture;
        } else if (existingContact?.profile_picture) {
          contactUpsert.profile_picture = existingContact.profile_picture;
        }
        
        await supabase
          .from('whatsapp_contacts')
          .upsert(contactUpsert, { onConflict: 'company_id,wa_id' });
        
        break;
      }

      default:
        console.log(`Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ success: true, event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
