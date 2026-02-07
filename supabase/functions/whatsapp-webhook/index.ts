import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

// ============== HELPER: Check if JID is a group ==============
function isGroupJid(jid: string): boolean {
  return jid?.includes('@g.us') || false;
}

// ============== HELPER: Validate phone/group ID ==============
function isValidIdentifier(id: string, isGroup: boolean): boolean {
  if (!id) return false;
  
  const digits = id.replace(/\D/g, '');
  
  if (isGroup) {
    // Groups have longer IDs (typically 18+ digits) - just check minimum
    return digits.length >= 8;
  } else {
    // Individual chats: 8-15 digits (filter LIDs which are 15+ digits)
    return digits.length >= 8 && digits.length <= 15;
  }
}

// ============== HELPER: Clean phone/ID from JID ==============
function extractPhoneFromJid(jid: string, allowGroups: boolean = false): string | null {
  if (!jid) return null;
  
  // Handle @lid format (WhatsApp Linked ID) - these are not real phone numbers
  if (jid.includes('@lid')) {
    console.log(`[LID FILTER] Skipping LID: ${jid}`);
    return null;
  }
  
  const isGroup = isGroupJid(jid);
  
  // Skip groups if not allowed
  if (isGroup && !allowGroups) {
    return null;
  }
  
  // Extract identifier from JID
  let identifier = jid
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@c.us', '')
    .replace(/\D/g, ''); // Remove any remaining non-digits
  
  // Validate the extracted identifier
  if (!isValidIdentifier(identifier, isGroup)) {
    console.log(`[FILTER] Invalid identifier: ${identifier} (length: ${identifier.length}, isGroup: ${isGroup})`);
    return null;
  }
  
  return identifier;
}

serve(async (req) => {
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
            
            const isGroup = isGroupJid(jid);
            
            // Extract and validate identifier (phone number or group ID)
            // Allow groups now - they have longer IDs but are valid
            const phoneNumber = extractPhoneFromJid(jid, true);
            if (!phoneNumber) continue;
            
            // ============== IMPROVED: Get contact/group name ==============
            // For groups: prioritize groupSubject, subject, groupName
            // For individuals: prioritize name, notify, pushName
            let contactName: string;
            if (isGroup) {
              contactName = chat.groupSubject || chat.subject || chat.groupName || 
                           chat.name || chat.metadata?.subject || phoneNumber;
              console.log(`[CHAT GROUP] ${phoneNumber} => "${contactName}"`);
            } else {
              contactName = chat.name || chat.notify || chat.pushName || chat.verifiedName || phoneNumber;
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

        if (!targetSessionId && instanceName) {
          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('id, company_id, phone_number')
            .eq('instance_name', instanceName)
            .single();

          if (session) {
            targetSessionId = session.id;
            companyId = session.company_id;
            sessionPhone = session.phone_number || '';
          }
        } else if (targetSessionId) {
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

        if (!targetSessionId || !companyId) {
          console.log('Could not find session for message batch');
          break;
        }

        for (const msg of messages) {
          const messageKey = msg.key || {};
          // Use remoteJidAlt if available (contains real phone number)
          let remoteJid = messageKey.remoteJidAlt || messageKey.remoteJid || msg.from || msg.remoteJid;

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
          } else {
            // Update conversation with latest info
            const updateData: Record<string, unknown> = {
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
              
              // ==================== AI AUTO-RESPONSE ====================
              // Check if conversation has an AI agent assigned and auto-reply is enabled
              if (!fromMe && conversation) {
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
                      .select('id, name, personality, instructions, is_active')
                      .eq('id', convWithAgent.assigned_agent_id)
                      .eq('is_active', true)
                      .single();
                    
                    if (agent) {
                      console.log('🤖 Using AI agent:', agent.name);
                      
                      // Call the ai-chat edge function
                      const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                        },
                        body: JSON.stringify({
                          message: content,
                          personality: agent.personality,
                          instructions: agent.instructions
                        })
                      });
                      
                      if (aiResponse.ok) {
                        const aiData = await aiResponse.json();
                        const aiReply = aiData.response || aiData.message;
                        
                        if (aiReply) {
                          console.log('🤖 AI Response:', aiReply.substring(0, 100) + '...');
                          
                          // Get session server URL
                          const { data: sessionData } = await supabase
                            .from('whatsapp_sessions')
                            .select('id, baileys_server_url')
                            .eq('id', targetSessionId)
                            .single();
                          
                          if (sessionData?.baileys_server_url) {
                            // First, save the AI message to database with ai marker
                            const aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                            
                            await supabase
                              .from('whatsapp_messages')
                              .insert({
                                conversation_id: conversation.id,
                                session_id: targetSessionId,
                                company_id: companyId,
                                wa_message_id: aiMessageId,
                                from_me: true,
                                content: aiReply,
                                message_type: 'text',
                                status: 'sending',
                                is_ai_response: true,
                                sender_name: agent.name,
                                timestamp: new Date().toISOString()
                              });
                            
                            // Then send via WhatsApp
                            try {
                              const sendResponse = await fetch(`${sessionData.baileys_server_url}/api/message/send-text`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  sessionId: targetSessionId,
                                  phone: phoneNumber,
                                  message: aiReply
                                })
                              });
                              
                              if (sendResponse.ok) {
                                console.log('🤖 AI message sent successfully');
                                
                                // Update message status to sent
                                await supabase
                                  .from('whatsapp_messages')
                                  .update({ status: 'sent' })
                                  .eq('wa_message_id', aiMessageId);
                                
                                // Update conversation last message
                                await supabase
                                  .from('whatsapp_conversations')
                                  .update({
                                    last_message: aiReply,
                                    last_message_at: new Date().toISOString()
                                  })
                                  .eq('id', conversation.id);
                              } else {
                                console.error('🤖 Failed to send AI message:', await sendResponse.text());
                                
                                // Update message status to failed
                                await supabase
                                  .from('whatsapp_messages')
                                  .update({ status: 'failed' })
                                  .eq('wa_message_id', aiMessageId);
                              }
                            } catch (sendError) {
                              console.error('🤖 Error sending AI message:', sendError);
                            }
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
        
        for (const update of updates) {
          const messageId = update.key?.id;
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
            
            console.log(`[MSG UPDATE] ${messageId} -> ${statusStr}`);
            
            await supabase
              .from('whatsapp_messages')
              .update({ status: statusStr })
              .eq('wa_message_id', messageId);
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
