import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

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
            
            // Extract phone number from JID (handle @lid and @s.whatsapp.net)
            let phoneNumber = jid.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '');
            
            // Skip groups for now
            if (jid.includes('@g.us')) continue;
            
            // Get contact name - try multiple sources
            const contactName = chat.name || chat.notify || chat.pushName || chat.verifiedName || phoneNumber;
            
            // Profile picture - from enriched data or chat object
            const profilePicture = chat.profilePicture || chat.imgUrl || chat.picture || null;
            
            // Get last message info - handle both number and {high, low} format
            const lastMsg = chat.conversationTimestamp || chat.lastMessage?.messageTimestamp;
            let lastMessageAt = new Date().toISOString();
            try {
              if (lastMsg) {
                // Handle {high, low, unsigned} format from Baileys
                const timestamp = typeof lastMsg === 'object' && lastMsg.low 
                  ? lastMsg.low 
                  : parseInt(lastMsg);
                if (!isNaN(timestamp) && timestamp > 0) {
                  lastMessageAt = new Date(timestamp * 1000).toISOString();
                }
              }
            } catch (e) {
              console.log('[CHAT] Timestamp parse error, using now');
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
            
            // Upsert conversation
            const { error } = await supabase
              .from('whatsapp_conversations')
              .upsert({
                session_id: targetSessionId,
                company_id: companyId,
                contact_phone: phoneNumber,
                contact_name: contactName,
                profile_picture: profilePicture,
                status: chat.archive ? 'archived' : 'open',
                last_message: lastMessageContent || chat.lastMessage?.conversation || '',
                last_message_at: lastMessageAt,
                unread_count: chat.unreadCount || 0
              }, {
                onConflict: 'session_id,contact_phone'
              });
            
            if (!error) {
              processedCount++;
            } else {
              console.error(`[CHAT] Error syncing ${contactName}:`, error.message);
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
        
        for (const msg of messages) {
          const messageKey = msg.key || {};
          // Use remoteJidAlt if available (contains real phone number)
          let remoteJid = messageKey.remoteJidAlt || messageKey.remoteJid || msg.from || msg.remoteJid;
          const fromMe = messageKey.fromMe || msg.fromMe || false;
          const messageId = messageKey.id || msg.id;
          
          // Skip protocol messages (sync notifications)
          if (msg.message?.protocolMessage) {
            console.log('Skipping protocol message');
            continue;
          }
          
          // Extract message content
          let content = '';
          let messageType = 'text';
          let mediaUrl = '';
          let mediaCaption = '';
          
          const messageContent = msg.message || msg;
          
          if (messageContent.conversation) {
            content = messageContent.conversation;
          } else if (messageContent.extendedTextMessage) {
            content = messageContent.extendedTextMessage.text || '';
          } else if (messageContent.imageMessage) {
            messageType = 'image';
            mediaCaption = messageContent.imageMessage.caption || '';
            content = mediaCaption || '[Imagem]';
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
          
          if (!remoteJid || !content) {
            console.log('Skipping message without jid or content');
            continue;
          }
          
          // Extract phone number from JID (handle @lid format)
          let phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '');
          
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
            
            if (session) {
              companyId = session.company_id;
            }
          }
          
          if (!targetSessionId || !companyId) {
            console.log('Could not find session for message');
            continue;
          }
          
          // Profile picture from enriched data
          const profilePicture = msg.profilePicture || null;
          const contactName = msg.pushName || msg.senderName || phoneNumber;
          
          // Find or create conversation
          let { data: conversation } = await supabase
            .from('whatsapp_conversations')
            .select('*')
            .eq('session_id', targetSessionId)
            .eq('contact_phone', phoneNumber)
            .single();
          
          if (!conversation) {
            const { data: newConv } = await supabase
              .from('whatsapp_conversations')
              .insert({
                session_id: targetSessionId,
                company_id: companyId,
                contact_phone: phoneNumber,
                contact_name: contactName,
                profile_picture: profilePicture,
                status: 'open',
                last_message: content,
                last_message_at: new Date().toISOString(),
                unread_count: fromMe ? 0 : 1
              })
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
            
            // Update contact name and picture if we have better data
            if (contactName && contactName !== phoneNumber) {
              updateData.contact_name = contactName;
            }
            if (profilePicture && !conversation.profile_picture) {
              updateData.profile_picture = profilePicture;
            }
            
            await supabase
              .from('whatsapp_conversations')
              .update(updateData)
              .eq('id', conversation.id);
          }
          
          // Save message (upsert to avoid duplicates)
          await supabase
            .from('whatsapp_messages')
            .upsert({
              conversation_id: conversation?.id,
              session_id: targetSessionId,
              company_id: companyId,
              wa_message_id: messageId,
              from_me: fromMe,
              content: content,
              message_type: messageType,
              media_url: mediaUrl,
              media_caption: mediaCaption,
              status: fromMe ? 'sent' : 'received',
              timestamp: msg.messageTimestamp 
                ? new Date(parseInt(msg.messageTimestamp) * 1000).toISOString()
                : new Date().toISOString()
            }, {
              onConflict: 'wa_message_id'
            });
          
          console.log(`Message saved: ${content.substring(0, 50)}...`);
        }
        break;
      }

      // ==================== MESSAGE STATUS UPDATE ====================
      case 'messages.update':
      case 'message.status': {
        const updates = data?.updates || (data ? [data] : []);
        
        for (const update of updates) {
          const messageId = update.key?.id || update.messageId;
          const status = update.update?.status || update.status;
          
          if (!messageId || !status) continue;
          
          const statusMap: Record<number | string, string> = {
            0: 'error',
            1: 'pending',
            2: 'sent',
            3: 'delivered',
            4: 'read',
            'DELIVERY_ACK': 'delivered',
            'READ': 'read',
            'PLAYED': 'read'
          };
          
          const dbStatus = statusMap[status] || 'sent';
          
          const updateData: Record<string, unknown> = { status: dbStatus };
          if (dbStatus === 'delivered') updateData.delivered_at = new Date().toISOString();
          if (dbStatus === 'read') updateData.read_at = new Date().toISOString();
          
          await supabase
            .from('whatsapp_messages')
            .update(updateData)
            .eq('wa_message_id', messageId);
          
          console.log(`Message ${messageId} status updated to ${dbStatus}`);
        }
        break;
      }

      // ==================== PRESENCE UPDATE ====================
      case 'presence.update': {
        // Handle typing indicators, online status, etc.
        console.log('Presence update:', data);
        break;
      }

      // ==================== CONTACTS UPDATE ====================
      case 'contacts.upsert':
      case 'contacts.update':
      case 'contacts.set': {
        const contacts = data?.contacts || (data ? [data] : []);
        console.log(`[CONTACTS] Processing ${contacts.length} contacts`);
        
        // Get company_id from session
        let companyId = '';
        let targetSessionId = sessionId;
        
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
        
        if (!companyId || !targetSessionId) {
          console.log('Could not find session for contacts');
          break;
        }
        
        let processedCount = 0;
        for (const contact of contacts) {
          const waId = contact.id || contact.jid;
          if (!waId || waId.includes('@g.us')) continue;
          
          const phoneNumber = waId.replace('@s.whatsapp.net', '').replace('@lid', '');
          const pushName = contact.name || contact.notify || contact.pushName || contact.verifiedName;
          const profilePicture = contact.profilePicture || contact.imgUrl || contact.picture;
          
          const { error } = await supabase
            .from('whatsapp_contacts')
            .upsert({
              company_id: companyId,
              session_id: targetSessionId,
              wa_id: waId,
              phone_number: phoneNumber,
              push_name: pushName,
              profile_picture: profilePicture
            }, {
              onConflict: 'company_id,wa_id'
            });
          
          if (!error) {
            processedCount++;
            
            // Also update conversation profile picture if exists
            if (profilePicture || pushName) {
              const updateData: Record<string, unknown> = {};
              if (profilePicture) updateData.profile_picture = profilePicture;
              if (pushName) updateData.contact_name = pushName;
              
              await supabase
                .from('whatsapp_conversations')
                .update(updateData)
                .eq('session_id', targetSessionId)
                .eq('contact_phone', phoneNumber);
            }
          }
        }
        
        console.log(`[CONTACTS] Finished: ${processedCount}/${contacts.length} processed`);
        break;
      }

      // ==================== HISTORY MESSAGES (cria conversas a partir de msgs) ====================
      case 'history.messages': {
        const messages = data?.messages || [];
        console.log(`[HISTORY MSGS] Processing ${messages.length} history messages`);
        
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
          console.log('Could not find session for history messages');
          break;
        }
        
        // Group messages by JID to create conversations
        const conversationMap = new Map<string, { 
          phoneNumber: string; 
          contactName: string; 
          profilePicture: string | null;
          lastMessage: string;
          lastMessageAt: string;
          messages: any[];
        }>();
        
        for (const msg of messages) {
          const jid = msg.jid || msg.remoteJid;
          if (!jid || jid === 'status@broadcast' || jid.includes('@g.us')) continue;
          
          const phoneNumber = jid.replace('@s.whatsapp.net', '').replace('@lid', '');
          const contactName = msg.pushName || msg.contactName || phoneNumber;
          const profilePicture = msg.profilePicture || null;
          
          // Extract message content
          let content = '';
          const messageContent = msg.message || msg;
          if (messageContent.conversation) {
            content = messageContent.conversation;
          } else if (messageContent.extendedTextMessage) {
            content = messageContent.extendedTextMessage.text || '';
          } else if (messageContent.imageMessage) {
            content = messageContent.imageMessage.caption || '[Imagem]';
          } else if (messageContent.videoMessage) {
            content = messageContent.videoMessage.caption || '[Vídeo]';
          } else if (messageContent.audioMessage) {
            content = '[Áudio]';
          } else if (messageContent.documentMessage) {
            content = messageContent.documentMessage.fileName || '[Documento]';
          }
          
          if (!content) continue;
          
          const timestamp = msg.messageTimestamp 
            ? new Date(parseInt(msg.messageTimestamp) * 1000).toISOString()
            : new Date().toISOString();
          
          if (!conversationMap.has(phoneNumber)) {
            conversationMap.set(phoneNumber, {
              phoneNumber,
              contactName,
              profilePicture,
              lastMessage: content,
              lastMessageAt: timestamp,
              messages: []
            });
          }
          
          const conv = conversationMap.get(phoneNumber)!;
          conv.messages.push({
            ...msg,
            content,
            timestamp
          });
          
          // Update last message if newer
          if (new Date(timestamp) > new Date(conv.lastMessageAt)) {
            conv.lastMessage = content;
            conv.lastMessageAt = timestamp;
          }
          
          // Update name/picture if we have better data
          if (contactName && contactName !== phoneNumber) {
            conv.contactName = contactName;
          }
          if (profilePicture) {
            conv.profilePicture = profilePicture;
          }
        }
        
        console.log(`[HISTORY MSGS] Found ${conversationMap.size} unique conversations`);
        
        // Create conversations and messages
        let processedConvs = 0;
        let processedMsgs = 0;
        
        for (const [phoneNumber, convData] of conversationMap) {
          try {
            // Upsert conversation
            const { data: conversation, error: convError } = await supabase
              .from('whatsapp_conversations')
              .upsert({
                session_id: targetSessionId,
                company_id: companyId,
                contact_phone: phoneNumber,
                contact_name: convData.contactName,
                profile_picture: convData.profilePicture,
                status: 'open',
                last_message: convData.lastMessage,
                last_message_at: convData.lastMessageAt,
                unread_count: 0
              }, {
                onConflict: 'session_id,contact_phone'
              })
              .select()
              .single();
            
            if (convError) {
              console.error(`[HISTORY] Error creating conv for ${phoneNumber}:`, convError.message);
              continue;
            }
            
            processedConvs++;
            
            // Insert messages for this conversation
            if (conversation) {
              for (const msg of convData.messages) {
                const { error: msgError } = await supabase
                  .from('whatsapp_messages')
                  .upsert({
                    conversation_id: conversation.id,
                    session_id: targetSessionId,
                    company_id: companyId,
                    wa_message_id: msg.id || `hist_${Date.now()}_${Math.random()}`,
                    from_me: msg.fromMe || false,
                    content: msg.content,
                    message_type: 'text',
                    status: msg.fromMe ? 'sent' : 'received',
                    timestamp: msg.timestamp
                  }, {
                    onConflict: 'wa_message_id'
                  });
                
                if (!msgError) processedMsgs++;
              }
            }
          } catch (e) {
            console.error(`[HISTORY] Error processing ${phoneNumber}:`, e);
          }
        }
        
        console.log(`[HISTORY MSGS] Created ${processedConvs} conversations, ${processedMsgs} messages`);
        break;
      }

      default:
        console.log(`Unhandled event: ${event}`);
    }

    // Mark webhook event as processed
    if (sessionId) {
      await supabase
        .from('whatsapp_webhook_events')
        .update({ processed: true })
        .eq('session_id', sessionId)
        .eq('event_type', event)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Webhook processing failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});