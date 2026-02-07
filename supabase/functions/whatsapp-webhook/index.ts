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
          
          // Get session info including phone number for self-message filtering
          let targetSessionId = sessionId;
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
            console.log('Could not find session for message');
            continue;
          }
          
          // SELF-MESSAGE FILTER: Skip messages where contact matches the session's own phone
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
          
          // Profile picture from enriched data
          const profilePicture = msg.profilePicture || null;
          // IMPORTANT: Only use pushName for contact name if this is an INCOMING message
          // For outgoing messages (fromMe=true), pushName is the session owner's name, not the contact's
          const contactName = !fromMe 
            ? (msg.pushName || msg.senderName || phoneNumber) 
            : phoneNumber;
          
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
            
            // Update contact name and picture if we have better data from INCOMING messages
            // Only update name from incoming messages to avoid overwriting with session owner's name
            if (!fromMe && contactName && contactName !== phoneNumber) {
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
          const messageData = {
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
                          
                          // Get session info to send message
                          const { data: sessionData } = await supabase
                            .from('whatsapp_sessions')
                            .select('id, baileys_server_url')
                            .eq('id', targetSessionId)
                            .single();
                          
                          if (sessionData?.baileys_server_url) {
                            // First, save the AI message to database with ai marker
                            // This ensures we can identify it as AI response in the UI
                            const aiMsgTimestamp = new Date().toISOString();
                            const aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            
                            await supabase
                              .from('whatsapp_messages')
                              .insert({
                                conversation_id: conversation?.id,
                                session_id: targetSessionId,
                                company_id: companyId,
                                from_me: true,
                                content: aiReply,
                                message_type: 'text',
                                status: 'sending',
                                timestamp: aiMsgTimestamp,
                                wa_message_id: aiMessageId,
                                is_ai_response: true,
                                sender_name: `🤖 ${agent.name}`,
                                metadata: { ai_agent_id: agent.id, ai_agent_name: agent.name }
                              });
                            
                            // Update conversation last message
                            await supabase
                              .from('whatsapp_conversations')
                              .update({
                                last_message: aiReply,
                                last_message_at: aiMsgTimestamp
                              })
                              .eq('id', conversation?.id);
                            
                            // Send the AI response via the WhatsApp server
                            const sendResponse = await fetch(`${sessionData.baileys_server_url}/api/message/send-text`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                sessionId: targetSessionId,
                                phone: phoneNumber,
                                message: aiReply
                              })
                            });
                            
                            // IMPROVED: Always update to 'sent' if HTTP response is successful (200-299)
                            // The Baileys server confirms receipt of the send request
                            const responseStatus = sendResponse.status;
                            if (responseStatus >= 200 && responseStatus < 300) {
                              console.log(`✅ AI auto-reply sent successfully (HTTP ${responseStatus})`);
                              // Update message status to sent immediately
                              await supabase
                                .from('whatsapp_messages')
                                .update({ status: 'sent' })
                                .eq('wa_message_id', aiMessageId);
                            } else {
                              const errorText = await sendResponse.text();
                              console.error(`❌ Failed to send AI auto-reply (HTTP ${responseStatus}):`, errorText);
                              // Mark as failed only on actual error
                              await supabase
                                .from('whatsapp_messages')
                                .update({ status: 'failed' })
                                .eq('wa_message_id', aiMessageId);
                            }
                          } else {
                            console.log('⚠️ No Baileys server URL found for session');
                          }
                        }
                      } else {
                        console.error('❌ AI chat error:', await aiResponse.text());
                      }
                    } else {
                      console.log('⚠️ AI agent not found or inactive:', convWithAgent.assigned_agent_id);
                    }
                  }
                } catch (aiError) {
                  console.error('❌ Error in AI auto-response:', aiError);
                }
              }
              
              // ==================== CHATBOT FLOW PROCESSING ====================
              // Check if any active chatbot flows should be triggered
              if (!fromMe && conversation) {
                try {
                  // Get active chatbot flows for this company
                  const { data: activeFlows } = await supabase
                    .from('chatbot_flows')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('is_active', true);
                  
                  if (activeFlows && activeFlows.length > 0) {
                    console.log(`🤖 Checking ${activeFlows.length} active chatbot flows`);
                    
                    for (const flow of activeFlows) {
                      let triggerConfig = flow.trigger_config as any;
                      const nodes = flow.nodes as any[];
                      let shouldTrigger = false;
                      
                      // If trigger_config is empty, try to get config from trigger nodes
                      if (!triggerConfig || Object.keys(triggerConfig).length === 0) {
                        const triggerNodes = nodes.filter(n => n.type === 'trigger');
                        if (triggerNodes.length > 0) {
                          const triggerNode = triggerNodes[0];
                          const nodeConfig = triggerNode.data?.config || {};
                          
                          // Build trigger config from node
                          if (triggerNode.subType === 'whatsapp_channel') {
                            triggerConfig = {
                              type: 'whatsapp_channel',
                              sessionId: nodeConfig.sessionId,
                              triggerWhen: nodeConfig.triggerWhen || 'any_message'
                            };
                          } else if (triggerNode.subType === 'keyword') {
                            triggerConfig = {
                              type: 'keyword',
                              value: Array.isArray(nodeConfig.keywords) ? nodeConfig.keywords.join(',') : nodeConfig.keywords
                            };
                          } else if (triggerNode.subType === 'conversation_start') {
                            triggerConfig = { type: 'start' };
                          }
                          console.log(`🤖 Built trigger config from node: ${JSON.stringify(triggerConfig)}`);
                        }
                      }
                      
                      // Check trigger conditions
                      if (triggerConfig?.type === 'keyword' && triggerConfig?.value) {
                        const keywords = triggerConfig.value.toLowerCase().split(',').map((k: string) => k.trim());
                        const messageLC = content.toLowerCase();
                        shouldTrigger = keywords.some((kw: string) => messageLC.includes(kw));
                        console.log(`🤖 Keyword check: keywords=${keywords.join(',')}, message includes? ${shouldTrigger}`);
                      } else if (triggerConfig?.type === 'whatsapp_channel') {
                        // Check if this is the configured session (or any session if not specified)
                        const matchesSession = !triggerConfig.sessionId || triggerConfig.sessionId === targetSessionId;
                        shouldTrigger = matchesSession;
                        console.log(`🤖 WhatsApp channel check: configSession=${triggerConfig.sessionId}, currentSession=${targetSessionId}, matches? ${shouldTrigger}`);
                      } else if (triggerConfig?.type === 'start') {
                        // Check if this is a new conversation (no previous messages)
                        const { count } = await supabase
                          .from('whatsapp_messages')
                          .select('*', { count: 'exact', head: true })
                          .eq('conversation_id', conversation.id)
                          .eq('from_me', false);
                        shouldTrigger = (count || 0) <= 1;
                        console.log(`🤖 Start check: message count=${count}, triggers? ${shouldTrigger}`);
                      } else {
                        console.log(`🤖 Unknown or no trigger type: ${triggerConfig?.type}`);
                      }
                      
                      if (shouldTrigger) {
                        console.log(`🤖 Triggering chatbot flow: ${flow.name}`);
                        
                        // Increment execution count
                        await supabase
                          .from('chatbot_flows')
                          .update({ execution_count: (flow.execution_count || 0) + 1 })
                          .eq('id', flow.id);
                        
                        // Get session server URL
                        const { data: sessionData } = await supabase
                          .from('whatsapp_sessions')
                          .select('id, baileys_server_url')
                          .eq('id', targetSessionId)
                          .single();
                        
                        if (sessionData?.baileys_server_url) {
                          // Process flow nodes (simplified - execute message nodes in order)
                          const messageNodes = nodes.filter(n => n.type === 'message');
                          console.log(`🤖 Found ${messageNodes.length} message nodes to process`);
                          
                          for (let i = 0; i < messageNodes.length; i++) {
                            const node = messageNodes[i];
                            const nodeContent = node.data?.content || node.data?.config?.content;
                            
                            if (nodeContent) {
                              // Check for delay before this node
                              const delayNodes = nodes.filter(n => n.type === 'delay');
                              const delayBefore = delayNodes.find(d => d.nextNodeId === node.id);
                              if (delayBefore && delayBefore.data?.delaySeconds) {
                                await new Promise(resolve => setTimeout(resolve, delayBefore.data.delaySeconds * 1000));
                              }
                              
                              // Save chatbot message to database
                              const cbMsgTimestamp = new Date().toISOString();
                              const cbMessageId = `cb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                              
                              await supabase
                                .from('whatsapp_messages')
                                .insert({
                                  conversation_id: conversation.id,
                                  session_id: targetSessionId,
                                  company_id: companyId,
                                  from_me: true,
                                  content: nodeContent,
                                  message_type: 'text',
                                  status: 'sending',
                                  timestamp: cbMsgTimestamp,
                                  wa_message_id: cbMessageId,
                                  is_ai_response: true,
                                  sender_name: `🤖 ${flow.name}`,
                                  metadata: { chatbot_flow_id: flow.id, chatbot_flow_name: flow.name }
                                });
                              
                              // Update conversation
                              await supabase
                                .from('whatsapp_conversations')
                                .update({
                                  last_message: nodeContent,
                                  last_message_at: cbMsgTimestamp
                                })
                                .eq('id', conversation.id);
                              
                              // Send message via WhatsApp
                              const sendResponse = await fetch(`${sessionData.baileys_server_url}/api/message/send-text`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  sessionId: targetSessionId,
                                  phone: phoneNumber,
                                  message: nodeContent
                                })
                              });
                              
                              if (sendResponse.ok) {
                                console.log(`✅ Chatbot message sent: ${nodeContent.substring(0, 50)}...`);
                                await supabase
                                  .from('whatsapp_messages')
                                  .update({ status: 'sent' })
                                  .eq('wa_message_id', cbMessageId);
                              } else {
                                console.error('❌ Failed to send chatbot message');
                                await supabase
                                  .from('whatsapp_messages')
                                  .update({ status: 'failed' })
                                  .eq('wa_message_id', cbMessageId);
                              }
                              
                              // Small delay between messages
                              if (i < messageNodes.length - 1) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                              }
                            }
                          }
                        } else {
                          console.log('⚠️ No baileys_server_url found for session');
                        }
                        
                        // Only trigger first matching flow
                        break;
                      }
                    }
                  }
                } catch (cbError) {
                  console.error('❌ Error in chatbot flow processing:', cbError);
                }
              }
            }
          } else {
            // No message ID - just insert
            const { error: msgError } = await supabase
              .from('whatsapp_messages')
              .insert(messageData);
            
            if (msgError) {
              console.error(`Message insert error:`, msgError.message);
            } else {
              console.log(`Message inserted: ${content.substring(0, 50)}...`);
              
              // ==================== AI AUTO-RESPONSE (for messages without wa_message_id) ====================
              if (!fromMe && conversation) {
                try {
                  const { data: convWithAgent } = await supabase
                    .from('whatsapp_conversations')
                    .select('id, assigned_agent_id, ai_auto_reply_enabled')
                    .eq('id', conversation.id)
                    .single();
                  
                  if (convWithAgent?.assigned_agent_id && convWithAgent?.ai_auto_reply_enabled) {
                    console.log('🤖 AI Auto-reply triggered (insert path)');
                    
                    const { data: agent } = await supabase
                      .from('ai_agents')
                      .select('id, name, personality, instructions, is_active')
                      .eq('id', convWithAgent.assigned_agent_id)
                      .eq('is_active', true)
                      .single();
                    
                    if (agent) {
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
                          const { data: sessionData } = await supabase
                            .from('whatsapp_sessions')
                            .select('id, baileys_server_url')
                            .eq('id', targetSessionId)
                            .single();
                          
                          if (sessionData?.baileys_server_url) {
                            // Save AI message to database with marker
                            const aiMsgTimestamp = new Date().toISOString();
                            const aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            
                            await supabase
                              .from('whatsapp_messages')
                              .insert({
                                conversation_id: conversation?.id,
                                session_id: targetSessionId,
                                company_id: companyId,
                                from_me: true,
                                content: aiReply,
                                message_type: 'text',
                                status: 'sent',
                                timestamp: aiMsgTimestamp,
                                wa_message_id: aiMessageId,
                                is_ai_response: true,
                                sender_name: `🤖 ${agent.name}`,
                                metadata: { ai_agent_id: agent.id, ai_agent_name: agent.name }
                              });
                            
                            const sendRes = await fetch(`${sessionData.baileys_server_url}/api/message/send-text`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                sessionId: targetSessionId,
                                phone: phoneNumber,
                                message: aiReply
                              })
                            });
                            if (sendRes.status >= 200 && sendRes.status < 300) {
                              console.log('✅ AI auto-reply sent (insert path)');
                            } else {
                              console.error('❌ AI auto-reply failed (insert path)');
                            }
                          }
                        }
                      }
                    }
                  }
                } catch (aiError) {
                  console.error('❌ Error in AI auto-response (insert):', aiError);
                }
              }
            }
          }
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
          
          // Robust timestamp parsing for history messages
          let timestamp = new Date().toISOString();
          try {
            const ts = msg.messageTimestamp;
            if (ts) {
              let tsNum: number;
              if (typeof ts === 'object' && ts !== null && 'low' in ts) {
                tsNum = (ts as { low: number }).low;
              } else if (typeof ts === 'string') {
                tsNum = parseInt(ts, 10);
              } else if (typeof ts === 'number') {
                tsNum = ts;
              } else {
                tsNum = 0;
              }
              
              if (!isNaN(tsNum) && tsNum > 0) {
                const isMillis = tsNum > 4102444800;
                const dateMs = isMillis ? tsNum : tsNum * 1000;
                if (dateMs > 946684800000 && dateMs < 4102444800000) {
                  timestamp = new Date(dateMs).toISOString();
                }
              }
            }
          } catch { /* use default */ }
          
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