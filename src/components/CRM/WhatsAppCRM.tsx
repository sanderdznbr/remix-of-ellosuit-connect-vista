import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Phone, MessageSquare, Settings, QrCode, Trash2, Users, Bot, Search, Filter, MoreVertical, Send, Check, CheckCheck, Circle, ArrowLeft, Sparkles, LayoutGrid, List, Tag, UserPlus, Contact, Archive, Image as ImageIcon, Loader2, Copy, Play, Pause, Mic, Server, Paperclip, FileText, Calendar, RefreshCw, Square, GitBranch, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminMaster } from '@/hooks/useAdminMaster';
import { useToast } from '@/hooks/use-toast';
import WhatsAppQRModal from './WhatsAppQRModal';
import WhatsAppKanbanView, { DEFAULT_COLUMNS, KanbanColumn } from './WhatsAppKanbanView';
import ConversationLabelsManager from './ConversationLabelsManager';
import SaveLeadModal from './SaveLeadModal';
import ConversationPopup from './ConversationPopup';
import KanbanColumnConfig from './KanbanColumnConfig';

import BaileysServerDownload from './BaileysServerDownload';
import WhatsAppContacts from './WhatsAppContacts';
import SwipeableConversationItem from './SwipeableConversationItem';
import ConversationContextMenu from './ConversationContextMenu';
import MessageContextMenu from './MessageContextMenu';
import AudioRecorderButton from './AudioRecorderButton';
import ScheduleMeetingModal from './ScheduleMeetingModal';
import { ChannelSelector } from './ChannelSelector';
import StartChatbotModal from './StartChatbotModal';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface WhatsAppSession {
  id: string;
  instance_name: string;
  status: string;
  phone_number?: string;
  phone_name?: string;
  profile_picture?: string;
  connected_at?: string;
  created_at: string;
  baileys_server_url?: string;
}

interface ConversationLabel {
  id: string;
  name: string;
  color: string;
}

interface WhatsAppConversationData {
  id: string;
  contact_phone: string;
  contact_name?: string;
  last_message_at: string;
  last_message?: string;
  status: string;
  unread_count?: number;
  profile_picture?: string;
  session_id?: string;
  assigned_agent_id?: string;
  ai_auto_reply_enabled?: boolean;
  is_demo?: boolean;
  is_ai_agent?: boolean;
  pipeline_stage?: string;
  labels?: string[];
}

interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  content: string;
  from_me: boolean;
  status: string;
  created_at: string;
  sender_name?: string;
  wa_message_id?: string;
  message_type?: string;
  media_url?: string;
  media_caption?: string;
  is_ai_response?: boolean;
}

interface AIAgent {
  id: string;
  name: string;
  description?: string;
  personality: string;
  instructions: string;
  avatar_url?: string;
  is_active: boolean;
}

// Audio Player Component for WhatsApp-style audio messages
const AudioPlayer: React.FC<{ mediaUrl: string; fromMe: boolean; isPTT?: boolean }> = ({ mediaUrl, fromMe, isPTT }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [mediaUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audioRef.current.currentTime = percentage * duration;
    setProgress(percentage * 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "flex items-center gap-3 min-w-[200px] max-w-[260px] p-2 rounded-xl",
      fromMe ? "bg-white/10" : "bg-gray-100 dark:bg-gray-800"
    )}>
      <button
        onClick={togglePlay}
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
          isPTT 
            ? "bg-[#FF4500] hover:bg-[#FF4500]/80" 
            : "bg-[#FF4500] hover:bg-[#FF4500]/80"
        )}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 text-white" fill="white" />
        ) : (
          <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div 
          className="h-[20px] flex items-center gap-[2px] cursor-pointer"
          onClick={handleProgressClick}
        >
          {Array.from({ length: 25 }).map((_, i) => {
            const heights = [10, 6, 14, 8, 16, 12, 6, 14, 10, 4, 12, 16, 8, 14, 6, 10, 14, 4, 12, 8, 16, 6, 14, 10, 4];
            const isActive = (i / 25) * 100 <= progress;
            return (
              <div
                key={i}
                className={cn(
                  "w-[2px] rounded-full transition-colors",
                  isActive ? "bg-[#FF4500]" : (fromMe ? "bg-white/40" : "bg-gray-400/40")
                )}
                style={{ height: `${heights[i % heights.length]}px` }}
              />
            );
          })}
        </div>
        
        <div className="flex justify-between items-center">
          <span className={cn("text-[10px]", fromMe ? "text-white/70" : "text-gray-500")}>
            {duration > 0 ? formatTime(isPlaying ? (progress / 100) * duration : duration) : '0:00'}
          </span>
          {isPTT && <Mic className="h-3 w-3 text-[#FF4500]" />}
        </div>
      </div>

      <audio ref={audioRef} src={mediaUrl} preload="metadata" className="hidden" />
    </div>
  );
};

// No demo data - real conversations only

const WhatsAppCRM: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const { isAdminMaster } = useAdminMaster();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  // State
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversationData[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingConversations, setSyncingConversations] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // UI State
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversationData | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'open' | 'closed'>('all');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [agentChatMessages, setAgentChatMessages] = useState<WhatsAppMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [agentChatHistory, setAgentChatHistory] = useState<Record<string, WhatsAppMessage[]>>({});
  
  // New CRM Features State
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'contacts'>('list');
  const [labels, setLabels] = useState<ConversationLabel[]>([]);
  const [showLabelsManager, setShowLabelsManager] = useState(false);
  const [showSaveLeadModal, setShowSaveLeadModal] = useState(false);
  const [selectedConversationForLabels, setSelectedConversationForLabels] = useState<WhatsAppConversationData | null>(null);
  const [selectedConversationForLead, setSelectedConversationForLead] = useState<WhatsAppConversationData | null>(null);
  const [contactsCount, setContactsCount] = useState(0);
  
  // Kanban specific state
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>(() => {
    const saved = localStorage.getItem('whatsapp_kanban_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showConversationPopup, setShowConversationPopup] = useState(false);
  const [popupConversation, setPopupConversation] = useState<WhatsAppConversationData | null>(null);
  const [showStartChatbot, setShowStartChatbot] = useState(false);
  const [activeChatbotFlow, setActiveChatbotFlow] = useState<{ id: string; name: string } | null>(null);
  const [chatbotActiveConvIds, setChatbotActiveConvIds] = useState<Set<string>>(new Set());
  const [popupMessages, setPopupMessages] = useState<WhatsAppMessage[]>([]);
  const [showServerDownload, setShowServerDownload] = useState(false);
  
  // Media upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [recordingAudio, setRecordingAudio] = useState(false);
  
  // Schedule meeting modal state
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);
  
  // Sync data state
  const [syncingData, setSyncingData] = useState(false);
  
  // Selected session for channel selector
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Context menu states
  const [conversationContextMenu, setConversationContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    conversation: WhatsAppConversationData | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, conversation: null });
  
  const [messageContextMenu, setMessageContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    messageId: string;
    messageContent: string;
    isFromMe: boolean;
  }>({ isOpen: false, position: { x: 0, y: 0 }, messageId: '', messageContent: '', isFromMe: false });

  // Load persisted agent chat history from localStorage
  useEffect(() => {
    const savedAgentHistory = localStorage.getItem('whatsapp_agent_history');
    
    if (savedAgentHistory) {
      try {
        setAgentChatHistory(JSON.parse(savedAgentHistory));
      } catch (e) {
        console.error('Error loading agent history:', e);
      }
    }
  }, []);

  // Save agent chat history to localStorage
  useEffect(() => {
    if (Object.keys(agentChatHistory).length > 0) {
      localStorage.setItem('whatsapp_agent_history', JSON.stringify(agentChatHistory));
    }
  }, [agentChatHistory]);

  // Mobile: Handle browser back button to go back to conversation list instead of dashboard
  useEffect(() => {
    if (!isMobile || !showMobileChat) return;
    
    // Push a state so back button goes to conversation list
    window.history.pushState({ whatsappChat: true }, '');
    
    const handlePopState = (e: PopStateEvent) => {
      if (showMobileChat) {
        e.preventDefault();
        setShowMobileChat(false);
        setSelectedConversation(null);
        setSelectedAgent(null);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobile, showMobileChat]);

  useEffect(() => {
    if (!showScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, agentChatMessages]);

  // Detect scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const viewport = messagesScrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport) return;
    const onScroll = () => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setShowScrollToBottom(distanceFromBottom > 150);
    };
    viewport.addEventListener('scroll', onScroll);
    return () => viewport.removeEventListener('scroll', onScroll);
  }, [selectedConversation, selectedAgent]);

  const handleScrollToBottom = () => {
    const viewport = messagesScrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  };

  // Polling for popup messages when popup is open
  useEffect(() => {
    if (!showConversationPopup || !popupConversation || !companyId) return;
    
    const refreshPopupMessages = async () => {
      const { data: convs } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('company_id', companyId)
        .eq('contact_phone', popupConversation.contact_phone);
      
      if (convs && convs.length > 0) {
        const conversationIds = convs.map(c => c.id);
        const { data } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .in('conversation_id', conversationIds)
          .order('timestamp', { ascending: true })
          .limit(200);
        
        const uniqueMessages = new Map<string, WhatsAppMessage>();
        (data || []).forEach(m => {
          const key = m.wa_message_id || m.id;
          if (!uniqueMessages.has(key)) {
            uniqueMessages.set(key, { 
              ...m, 
              created_at: m.timestamp || m.created_at,
              message_type: m.message_type,
              media_url: m.media_url,
              media_caption: m.media_caption
            });
          }
        });
        
        // Only update if changed
        const newMsgs = Array.from(uniqueMessages.values());
        setPopupMessages(prev => {
          const prevIds = prev.map(m => m.id).join(',');
          const newIds = newMsgs.map(m => m.id).join(',');
          if (prevIds === newIds) return prev;
          return newMsgs;
        });
      }
    };
    
    // Initial load
    refreshPopupMessages();
    
    // Poll every 500ms for instant sync
    const interval = setInterval(refreshPopupMessages, 500);
    return () => clearInterval(interval);
  }, [showConversationPopup, popupConversation?.contact_phone, companyId]);

  // Get company ID
  useEffect(() => {
    const getCompanyId = async () => {
      if (!user?.id) return;
      
      const metadataCompanyId = user.user_metadata?.company_id;
      if (metadataCompanyId) {
        setCompanyId(metadataCompanyId);
        return;
      }

      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (data?.company_id) {
        setCompanyId(data.company_id);
      }
    };

    getCompanyId();
  }, [user?.id]);

  // Unify sessions with the same phone number - migrate conversations to the newest session
  const unifyDuplicateSessions = async (sessionsData: WhatsAppSession[]) => {
    if (!companyId || sessionsData.length < 2) return sessionsData;
    
    // Group sessions by phone number
    const byPhone = new Map<string, WhatsAppSession[]>();
    sessionsData.forEach(s => {
      const phone = s.phone_number?.replace(/\D/g, '');
      if (phone) {
        if (!byPhone.has(phone)) byPhone.set(phone, []);
        byPhone.get(phone)!.push(s);
      }
    });
    
    const sessionsToDelete: string[] = [];
    
    for (const [phone, group] of byPhone.entries()) {
      if (group.length < 2) continue;
      
      // Keep the newest connected session, or newest overall
      const sorted = [...group].sort((a, b) => {
        // Prefer connected
        if (a.status === 'connected' && b.status !== 'connected') return -1;
        if (b.status === 'connected' && a.status !== 'connected') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      const keepSession = sorted[0];
      const oldSessions = sorted.slice(1);
      const oldIds = oldSessions.map(s => s.id);
      
      console.log(`[Unify] Phone ${phone}: keeping ${keepSession.id}, merging ${oldIds.length} old session(s)`);
      
      // Migrate conversations from old sessions to the keep session
      const { data: migrated } = await supabase
        .from('whatsapp_conversations')
        .update({ session_id: keepSession.id })
        .in('session_id', oldIds)
        .select('id');
      
      if (migrated && migrated.length > 0) {
        console.log(`[Unify] ✅ Migrated ${migrated.length} conversations for phone ${phone}`);
      }
      
      // Also migrate messages from old sessions
      await supabase
        .from('whatsapp_messages')
        .update({ session_id: keepSession.id })
        .in('session_id', oldIds);
      
      // Delete old sessions
      await supabase
        .from('whatsapp_sessions')
        .delete()
        .in('id', oldIds);
      
      sessionsToDelete.push(...oldIds);
    }
    
    if (sessionsToDelete.length > 0) {
      return sessionsData.filter(s => !sessionsToDelete.includes(s.id));
    }
    return sessionsData;
  };

  // Load data
  const loadSessions = async () => {
    if (!companyId) return;
    
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Auto-unify duplicate sessions with same phone number
      const unified = await unifyDuplicateSessions(data);
      setSessions(unified);
      // Auto-select first connected session if none selected
      if (!selectedSessionId && unified.length > 0) {
        const connected = unified.find(s => s.status === 'connected');
        setSelectedSessionId(connected?.id || unified[0].id);
      }
    }
  };

  // Helper: Check if conversation is valid
  // v3.5.0: Show ALL conversations including groups without names (display formatted ID)
  const isValidConversation = (conv: WhatsAppConversationData): boolean => {
    if (!conv.contact_phone) return false;
    const digits = conv.contact_phone.replace(/\D/g, '');
    
    // Too short is invalid
    if (digits.length < 8) return false;
    
    // v3.5.0: Show ALL conversations - groups will be displayed with formatted ID if no name
    return true;
  };
  
  // Helper: Get display name for conversation (handles groups without names)
  // Also checks messages for sender_name as fallback
  const getDisplayName = (conv: WhatsAppConversationData, messagesForLookup?: WhatsAppMessage[]): string => {
    if (conv.contact_name && conv.contact_name !== conv.contact_phone) {
      return conv.contact_name;
    }
    
    // Fallback: look for sender_name in incoming messages
    if (messagesForLookup && messagesForLookup.length > 0) {
      const incomingWithName = messagesForLookup.find(m => !m.from_me && m.sender_name);
      if (incomingWithName?.sender_name) {
        return incomingWithName.sender_name;
      }
    }
    
    // For groups without name, show formatted ID
    const digits = conv.contact_phone.replace(/\D/g, '');
    if (digits.length > 15) {
      return `Grupo ${digits.substring(0, 8)}...`;
    }
    return conv.contact_phone;
  };
  
  // Helper: Check if conversation is a group
  const isGroupConversation = (conv: WhatsAppConversationData): boolean => {
    const digits = conv.contact_phone.replace(/\D/g, '');
    return digits.length > 15;
  };

  // Legacy helper for backwards compatibility
  const isValidPhoneNumber = (phone: string): boolean => {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8;
  };

  const loadConversations = async () => {
    if (!companyId) return;
    
    let query = supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('company_id', companyId);
    
    // FILTRAR POR SESSÃO SELECIONADA se houver
    if (selectedSessionId) {
      query = query.eq('session_id', selectedSessionId);
    }
    
    const { data, error } = await query
      .order('last_message_at', { ascending: false })
      .limit(200);
    
    if (error) {
      console.error('❌ Error loading conversations:', error);
      return;
    }
    
    // Filter out invalid conversations (LIDs without names) and deduplicate by contact_phone
    const uniqueByPhone = new Map<string, typeof data[0]>();
    (data || []).forEach(conv => {
      const phone = conv.contact_phone;
      
      // Skip invalid conversations (LIDs or groups without proper names)
      if (!isValidConversation(conv)) {
        return;
      }
      
      if (!uniqueByPhone.has(phone) || 
          new Date(conv.last_message_at) > new Date(uniqueByPhone.get(phone)!.last_message_at)) {
        uniqueByPhone.set(phone, conv);
      }
    });
    const deduplicated = Array.from(uniqueByPhone.values())
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    
    // Only update state if data actually changed (prevent flicker)
    setConversations(prev => {
      const prevIds = prev.map(c => `${c.id}-${c.last_message_at}-${c.unread_count}`).join(',');
      const newIds = deduplicated.map(c => `${c.id}-${c.last_message_at}-${c.unread_count}`).join(',');
      if (prevIds === newIds) return prev;
      return deduplicated;
    });
  };

  // Load messages from ALL conversations with the same contact_phone
  // IMPORTANT: Robust deduplication to prevent jumbled messages after reconnection
  const loadMessagesByPhone = async (contactPhone: string) => {
    // First get all conversation IDs for this phone
    const { data: convs } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('company_id', companyId)
      .eq('contact_phone', contactPhone);
    
    if (!convs || convs.length === 0) return;
    
    const conversationIds = convs.map(c => c.id);
    
    // Get all messages from all these conversations
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('timestamp', { ascending: true })
      .limit(200);
    
    if (!error && data) {
      // ROBUST DEDUPLICATION: Use wa_message_id as primary key, with content+timestamp as fallback
      const uniqueMessages = new Map<string, WhatsAppMessage>();
      
      data.forEach(m => {
        // Primary key: wa_message_id (unique from WhatsApp)
        // Secondary key: content + from_me + timestamp (for messages without wa_message_id)
        const primaryKey = m.wa_message_id;
        const timestamp = new Date(m.timestamp || m.created_at).getTime();
        const fallbackKey = `${m.content?.substring(0, 50)}_${m.from_me}_${Math.floor(timestamp / 1000)}`;
        const key = primaryKey || fallbackKey;
        
        // Only add if not already exists - first occurrence wins (earliest insert)
        if (!uniqueMessages.has(key)) {
          uniqueMessages.set(key, {
            ...m,
            created_at: m.timestamp || m.created_at,
            wa_message_id: m.wa_message_id,
            message_type: m.message_type,
            media_url: m.media_url,
            media_caption: m.media_caption,
            is_ai_response: m.is_ai_response,
            sender_name: m.sender_name
          });
        }
      });
      
      // Sort by timestamp ascending for correct chronological order
      const serverMessages = Array.from(uniqueMessages.values())
        .sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          // If timestamps are equal, use id as tiebreaker for stable sorting
          if (timeA === timeB) {
            return a.id.localeCompare(b.id);
          }
          return timeA - timeB;
        });
      
      // OPTIMISTIC UI: Preserve temp messages and merge with server data
      setMessages(prev => {
        // Separate temp messages (optimistic) from real messages
        const tempMessages = prev.filter(m => m.id.startsWith('temp-') && conversationIds.includes(m.conversation_id));
        
        // Find which temp messages have been synced to server
        const matchedTempIds = new Set<string>();
        serverMessages.forEach(serverMsg => {
          // Match by content + from_me + timestamp within 60 seconds
          const matchingTemp = tempMessages.find(temp =>
            temp.content === serverMsg.content &&
            temp.from_me === serverMsg.from_me &&
            !matchedTempIds.has(temp.id) &&
            Math.abs(new Date(temp.created_at).getTime() - new Date(serverMsg.created_at).getTime()) < 60000
          );
          if (matchingTemp) {
            matchedTempIds.add(matchingTemp.id);
          }
        });
        
        // Keep temp messages that haven't been matched to server yet
        const unmatchedTemp = tempMessages.filter(t => !matchedTempIds.has(t.id));
        
        // Combine: server messages + unmatched temp messages, then sort
        const combined = [...serverMessages, ...unmatchedTemp]
          .sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            if (timeA === timeB) {
              return a.id.localeCompare(b.id);
            }
            return timeA - timeB;
          });
        
        // Only update if something changed (prevent flicker)
        const prevSignature = prev.map(m => `${m.id}-${m.status}`).join(',');
        const newSignature = combined.map(m => `${m.id}-${m.status}`).join(',');
        if (prevSignature === newSignature) return prev;
        
        return combined;
      });
    }
  };

  const loadAiAgents = async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);
    
    setAiAgents(data || []);
  };

  // Load labels
  const loadLabels = async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('conversation_labels')
      .select('*')
      .eq('company_id', companyId);
    
    setLabels(data || []);
  };

  // Load contacts count
  const loadContactsCount = async () => {
    if (!companyId) return;
    
    const { count } = await supabase
      .from('whatsapp_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    
    setContactsCount(count || 0);
  };

  // Mark conversation as read - reset unread_count and send read receipts to Baileys
  const markConversationAsRead = async (conv: WhatsAppConversationData) => {
    if (!conv || (conv.unread_count || 0) === 0) return;
    
    // Update local state immediately
    setConversations(prev => prev.map(c => 
      c.id === conv.id ? { ...c, unread_count: 0 } : c
    ));
    
    // Get connected session for this conversation
    const connectedSession = sessions.find(s => 
      s.id === conv.session_id && s.status === 'connected'
    ) || sessions.find(s => s.status === 'connected');
    
    // Call API to mark as read (updates DB + sends read receipts to Baileys)
    try {
      if (connectedSession) {
        await supabase.functions.invoke('whatsapp-api', {
          body: {
            action: 'mark_as_read',
            sessionId: connectedSession.id,
            phone: conv.contact_phone,
            conversationId: conv.id
          }
        });
      } else {
        // Just update database if no connected session
        await supabase
          .from('whatsapp_conversations')
          .update({ unread_count: 0 })
          .eq('id', conv.id);
      }
    } catch (e) {
      console.error('Error marking conversation as read:', e);
    }
  };

  // Create label
  const handleCreateLabel = async (name: string, color: string) => {
    if (!companyId || !user?.id) return;
    
    const { data, error } = await supabase
      .from('conversation_labels')
      .insert({ name, color, company_id: companyId, created_by: user.id })
      .select()
      .single();
    
    if (!error && data) {
      setLabels(prev => [...prev, data]);
      toast({ title: 'Sucesso', description: 'Etiqueta criada!' });
    }
  };

  // Delete label
  const handleDeleteLabel = async (labelId: string) => {
    const { error } = await supabase
      .from('conversation_labels')
      .delete()
      .eq('id', labelId);
    
    if (!error) {
      setLabels(prev => prev.filter(l => l.id !== labelId));
      toast({ title: 'Sucesso', description: 'Etiqueta removida!' });
    }
  };

  // Toggle label on conversation - persists to database
  const handleToggleLabel = async (labelId: string) => {
    if (!selectedConversationForLabels) return;
    
    const currentLabels = selectedConversationForLabels.labels || [];
    const newLabels = currentLabels.includes(labelId)
      ? currentLabels.filter(l => l !== labelId)
      : [...currentLabels, labelId];
    
    // Optimistic update
    setConversations(prev => prev.map(c => {
      if (c.id === selectedConversationForLabels.id) {
        return { ...c, labels: newLabels };
      }
      return c;
    }));
    setSelectedConversationForLabels(prev => prev ? { ...prev, labels: newLabels } : null);
    
    // Persist to database
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ labels: newLabels })
      .eq('id', selectedConversationForLabels.id);
    
    if (error) {
      console.error('Error updating labels:', error);
      // Rollback on error
      setConversations(prev => prev.map(c => {
        if (c.id === selectedConversationForLabels.id) {
          return { ...c, labels: currentLabels };
        }
        return c;
      }));
      setSelectedConversationForLabels(prev => prev ? { ...prev, labels: currentLabels } : null);
      toast({ title: 'Erro', description: 'Erro ao salvar etiqueta', variant: 'destructive' });
    }
  };

  // Update pipeline stage (for Kanban)
  const handleUpdateStage = (conversationId: string, newStage: string) => {
    setConversations(prev => prev.map(c => 
      c.id === conversationId ? { ...c, pipeline_stage: newStage } : c
    ));
    toast({ title: 'Movido', description: `Conversa movida para ${newStage}` });
  };

  // Open labels manager for a conversation
  const openLabelsManager = (conv: WhatsAppConversationData) => {
    setSelectedConversationForLabels(conv);
    setShowLabelsManager(true);
  };

  // Open save lead modal
  const openSaveLeadModal = (conv: WhatsAppConversationData) => {
    setSelectedConversationForLead(conv);
    setShowSaveLeadModal(true);
  };

  // Refresh/Sync all data from Baileys server
  const handleRefreshData = async () => {
    if (syncingData) return;
    
    const session = sessions.find(s => s.status === 'connected' && s.baileys_server_url);
    if (!session?.baileys_server_url) {
      toast({ 
        title: 'Sem conexão', 
        description: 'Nenhuma sessão conectada para sincronizar',
        variant: 'destructive'
      });
      return;
    }
    
    setSyncingData(true);
    
    try {
      // 1. Request server to resync contacts and photos
      const syncResponse = await fetch(`${session.baileys_server_url}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id })
      });
      
      if (!syncResponse.ok) {
        console.warn('Sync endpoint not available, trying manual refresh');
      }
      
      // 2. Reload all local data
      await Promise.all([
        loadSessions(),
        loadConversations(),
        loadLabels(),
        loadContactsCount()
      ]);
      
      // 3. If conversation selected, reload messages
      if (selectedConversation) {
        await loadMessagesByPhone(selectedConversation.contact_phone);
      }
      
      toast({ 
        title: 'Dados atualizados!', 
        description: 'Fotos, mensagens e contatos sincronizados' 
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({ 
        title: 'Erro ao atualizar', 
        description: 'Tente novamente em alguns segundos',
        variant: 'destructive'
      });
    } finally {
      setSyncingData(false);
    }
  };

  // Archive/Unarchive conversation
  const handleArchiveConversation = async (conv: WhatsAppConversationData) => {
    const newStatus = conv.status === 'archived' ? 'open' : 'archived';
    
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ status: newStatus })
      .eq('id', conv.id);
    
    if (!error) {
      setConversations(prev => prev.map(c => 
        c.id === conv.id ? { ...c, status: newStatus } : c
      ));
      if (selectedConversation?.id === conv.id) {
        setSelectedConversation({ ...conv, status: newStatus });
      }
      toast({ 
        title: newStatus === 'archived' ? 'Arquivada' : 'Desarquivada', 
        description: `Conversa ${newStatus === 'archived' ? 'arquivada' : 'desarquivada'} com sucesso!` 
      });
    } else {
      toast({ title: 'Erro', description: 'Erro ao arquivar conversa', variant: 'destructive' });
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (conv: WhatsAppConversationData) => {
    if (!confirm('Tem certeza que deseja excluir esta conversa? Todas as mensagens serão perdidas.')) {
      return;
    }
    
    // Delete messages first
    await supabase
      .from('whatsapp_messages')
      .delete()
      .eq('conversation_id', conv.id);
    
    // Then delete conversation
    const { error } = await supabase
      .from('whatsapp_conversations')
      .delete()
      .eq('id', conv.id);
    
    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== conv.id));
      if (selectedConversation?.id === conv.id) {
        setSelectedConversation(null);
        setShowMobileChat(false);
      }
      toast({ title: 'Excluída', description: 'Conversa excluída com sucesso!' });
    } else {
      toast({ title: 'Erro', description: 'Erro ao excluir conversa', variant: 'destructive' });
    }
  };

  // Delete a single message
  const handleDeleteMessage = async (messageId: string) => {
    // If it's a temp/optimistic message, just remove from state
    if (messageId.startsWith('temp-')) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setPopupMessages(prev => prev.filter(m => m.id !== messageId));
      toast({ title: 'Mensagem excluída' });
      return;
    }
    
    // Delete from database
    const { error } = await supabase
      .from('whatsapp_messages')
      .delete()
      .eq('id', messageId);
    
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setPopupMessages(prev => prev.filter(m => m.id !== messageId));
      toast({ title: 'Mensagem excluída' });
    } else {
      toast({ title: 'Erro', description: 'Erro ao excluir mensagem', variant: 'destructive' });
    }
  };

  // Copy text to clipboard
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado!', description: 'Texto copiado para a área de transferência' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  // Handle right-click on conversation
  const handleConversationContextMenu = (e: React.MouseEvent, conv: WhatsAppConversationData) => {
    e.preventDefault();
    e.stopPropagation();
    setConversationContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      conversation: conv,
    });
  };

  // Handle right-click on message
  const handleMessageContextMenu = (e: React.MouseEvent, message: WhatsAppMessage) => {
    e.preventDefault();
    e.stopPropagation();
    setMessageContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      messageId: message.id,
      messageContent: message.content,
      isFromMe: message.from_me,
    });
  };

  // Assign AI agent to conversation with auto-reply toggle
  const handleAssignAgent = async (conv: WhatsAppConversationData, agentId: string | null, enableAutoReply: boolean = true) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ 
        assigned_agent_id: agentId,
        ai_auto_reply_enabled: agentId ? enableAutoReply : false
      })
      .eq('id', conv.id);
    
    if (!error) {
      setConversations(prev => prev.map(c => 
        c.id === conv.id ? { ...c, assigned_agent_id: agentId || undefined } : c
      ));
      if (selectedConversation?.id === conv.id) {
        setSelectedConversation({ ...conv, assigned_agent_id: agentId || undefined });
      }
      toast({ 
        title: agentId ? 'Agente Atribuído' : 'Agente Removido', 
        description: agentId ? 'Agente IA atribuído à conversa!' : 'Agente IA removido da conversa'
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!companyId) return;
      
      // Load sessions first so selectedSessionId is set before loading conversations
      await loadSessions();
      await Promise.all([
        loadConversations(),
        loadAiAgents(),
        loadLabels(),
        loadContactsCount()
      ]);
      setLoading(false);
    };
    
    loadData();
    
    // Polling fallback for conversations - refresh every 2s (reduce load)
    const conversationsPoll = setInterval(() => {
      if (companyId) {
        loadConversations();
      }
    }, 2000);
    
    return () => clearInterval(conversationsPoll);
  }, [companyId, selectedSessionId]);
  
  // Recarregar conversas quando trocar de canal
  useEffect(() => {
    if (companyId && selectedSessionId) {
      loadConversations();
      // Limpar conversa selecionada ao trocar canal
      setSelectedConversation(null);
      setMessages([]);
      setShowMobileChat(false);
    }
  }, [selectedSessionId]);

  // Real-time subscription for messages, conversations, contacts, sessions
  useEffect(() => {
    if (!companyId) return;

    console.log('📡 Setting up realtime subscriptions for company:', companyId);

    // Subscribe to new messages - listen to INSERT and UPDATE
    const messagesChannel = supabase
      .channel('whatsapp-messages-rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `company_id=eq.${companyId}`
      }, (payload) => {
        const newMessage = payload.new as any;
        console.log('📨 Realtime message event:', payload.eventType, newMessage?.content?.substring(0, 30));
        
        // SIMPLIFIED: Only update conversations list from realtime
        // Messages are handled by polling (500ms) with proper deduplication
        // This prevents race conditions and duplications
        loadConversations();
      })
      .subscribe();

    // Subscribe to conversation updates (INSERT and UPDATE)
    const conversationsChannel = supabase
      .channel('whatsapp-conversations-rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_conversations',
        filter: `company_id=eq.${companyId}`
      }, (payload) => {
        const newConv = payload.new as any;
        console.log('📥 New conversation:', newConv.contact_name || newConv.contact_phone);
        setConversations(prev => {
          // Avoid duplicates
          if (prev.some(c => c.id === newConv.id)) return prev;
          return [newConv, ...prev];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_conversations',
        filter: `company_id=eq.${companyId}`
      }, (payload) => {
        const updated = payload.new as any;
        setConversations(prev => 
          prev.map(c => c.id === updated.id ? { ...c, ...updated } : c)
        );
      })
      .subscribe();

    // Subscribe to session updates
    const sessionsChannel = supabase
      .channel('whatsapp-sessions-rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_sessions',
        filter: `company_id=eq.${companyId}`
      }, () => {
        loadSessions();
      })
      .subscribe();

    // Subscribe to contacts (for count update)
    const contactsChannel = supabase
      .channel('whatsapp-contacts-rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_contacts',
        filter: `company_id=eq.${companyId}`
      }, () => {
        // Update contacts count
        loadContactsCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(contactsChannel);
    };
  }, [companyId, selectedConversation?.id]);

  // Load messages when conversation changes + polling fallback for realtime reliability
  useEffect(() => {
    if (selectedConversation) {
      loadMessagesByPhone(selectedConversation.contact_phone);
      setSelectedAgent(null);
      
      // Polling fallback - refresh messages every 500ms (instant sync)
      const pollInterval = setInterval(() => {
        loadMessagesByPhone(selectedConversation.contact_phone);
      }, 500);
      
      return () => clearInterval(pollInterval);
    } else {
      setMessages([]);
    }
  }, [selectedConversation?.contact_phone]);

  // Fetch conversation IDs with active chatbot executions
  useEffect(() => {
    const fetchChatbotConvs = async () => {
      const { data } = await supabase
        .from('chatbot_executions')
        .select('conversation_id')
        .eq('status', 'running');
      if (data) {
        setChatbotActiveConvIds(new Set(data.map(d => d.conversation_id).filter(Boolean) as string[]));
      }
    };
    fetchChatbotConvs();
    const interval = setInterval(fetchChatbotConvs, 15000);
    return () => clearInterval(interval);
  }, []);

  // Check for active chatbot execution on selected conversation
  useEffect(() => {
    if (!selectedConversation?.id) {
      setActiveChatbotFlow(null);
      return;
    }
    const checkChatbot = async () => {
      const { data } = await supabase
        .from('chatbot_executions')
        .select('id, flow_id, chatbot_flows(name)')
        .eq('conversation_id', selectedConversation.id)
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setActiveChatbotFlow({ id: data.id, name: (data as any).chatbot_flows?.name || 'Chatbot' });
      } else {
        setActiveChatbotFlow(null);
      }
    };
    checkChatbot();
  }, [selectedConversation?.id]);

  // Handle session success - sync conversations after connection
  const handleSessionSuccess = async (session: WhatsAppSession) => {
    // Force select the new session immediately
    setSelectedSessionId(session.id);
    
    await loadSessions();
    toast({ title: 'Sucesso', description: 'WhatsApp conectado!' });
    
    // Start syncing conversations and contacts
    setSyncingConversations(true);
    toast({ title: 'Sincronizando', description: 'Carregando dados do WhatsApp...' });
    
    try {
      await Promise.all([
        loadConversations(),
        loadContactsCount()
      ]);
      toast({ title: 'Pronto', description: 'Dados carregados com sucesso!' });
    } catch (error) {
      console.error('Error syncing data:', error);
      toast({ 
        title: 'Aviso', 
        description: 'Alguns dados podem não ter sido carregados.',
        variant: 'destructive'
      });
    } finally {
      setSyncingConversations(false);
    }
  };

  // Send message to AI Agent
  const sendMessageToAgent = async () => {
    if (!newMessage.trim() || !selectedAgent) return;
    
    setSendingMessage(true);
    const agentKey = `agent-${selectedAgent.id}`;
    const userMessage: WhatsAppMessage = {
      id: `agent-msg-${Date.now()}`,
      conversation_id: agentKey,
      content: newMessage,
      from_me: true,
      status: 'sent',
      created_at: new Date().toISOString()
    };
    
    const updatedMessages = [...agentChatMessages, userMessage];
    setAgentChatMessages(updatedMessages);
    setAgentChatHistory(prev => ({ ...prev, [agentKey]: updatedMessages }));
    setNewMessage('');
    setIsAiTyping(true);
    
    try {
      const response = await supabase.functions.invoke('ai-chat', {
        body: {
          message: newMessage,
          agentId: selectedAgent.id,
          personality: selectedAgent.personality,
          instructions: selectedAgent.instructions
        }
      });
      
      if (response.error) throw response.error;
      
      const aiMessage: WhatsAppMessage = {
        id: `agent-msg-${Date.now() + 1}`,
        conversation_id: agentKey,
        content: response.data?.response || 'Desculpe, não consegui processar sua mensagem.',
        from_me: false,
        status: 'delivered',
        created_at: new Date().toISOString(),
        sender_name: selectedAgent.name
      };
      
      const finalMessages = [...updatedMessages, aiMessage];
      setAgentChatMessages(finalMessages);
      setAgentChatHistory(prev => ({ ...prev, [agentKey]: finalMessages }));
    } catch (error) {
      console.error('Error calling AI:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao comunicar com o agente IA',
        variant: 'destructive'
      });
    } finally {
      setIsAiTyping(false);
      setSendingMessage(false);
    }
  };

  // Ref guard to prevent duplicate sends from double-clicks or rapid Enter presses
  const sendingRef = useRef(false);

  // Send message to WhatsApp conversation with Optimistic UI
  const sendMessage = async () => {
    if (selectedAgent) {
      return sendMessageToAgent();
    }
    
    if (!newMessage.trim() || !selectedConversation || sendingRef.current) return;
    sendingRef.current = true;
    
    // Check if connected before sending
    const connectedSession = sessions.find(s => 
      s.id === selectedConversation.session_id && s.status === 'connected'
    ) || sessions.find(s => s.status === 'connected');
    
    if (!connectedSession && !selectedConversation.is_demo) {
      toast({ 
        title: 'WhatsApp Desconectado', 
        description: 'Você precisa conectar seu WhatsApp para enviar mensagens. Clique em "Desconectado" para reconectar.',
        variant: 'destructive'
      });
      return;
    }
    
    setSendingMessage(true);
    const messageContent = newMessage;
    setNewMessage('');
    
    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: WhatsAppMessage = {
      id: tempId,
      conversation_id: selectedConversation.id,
      content: messageContent,
      from_me: true,
      status: 'sending',
      created_at: new Date().toISOString()
    };
    
    // OPTIMISTIC: Add message to UI immediately (instant feedback)
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Update conversation in list immediately
    setConversations(prev => prev.map(c => 
      c.contact_phone === selectedConversation.contact_phone 
        ? { ...c, last_message: messageContent, last_message_at: new Date().toISOString() }
        : c
    ));
    
    try {
      // Check if this is a real conversation with a connected session
      const connectedSession = sessions.find(s => 
        s.id === selectedConversation.session_id && s.status === 'connected'
      ) || sessions.find(s => s.status === 'connected');
      
      if (connectedSession && !selectedConversation.is_demo) {
        // Send via real WhatsApp API
        const { error } = await supabase.functions.invoke('whatsapp-api', {
          body: {
            action: 'send_message',
            sessionId: connectedSession.id,
            phone: selectedConversation.contact_phone,
            message: messageContent
          }
        });
        
        if (error) throw error;
        
        // Update optimistic message status to sent (instant - no reload needed)
        // The 500ms polling will sync any server-side updates automatically
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, status: 'sent' } : m
        ));
        
        // Note: Don't call loadMessagesByPhone here to avoid flicker
        // Polling will handle sync
      } else {
        // Demo mode - just mark as sent
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, status: 'sent' } : m
        ));
      }
    } catch (e: any) {
      console.error('Error sending message:', e);
      // Mark message as failed
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'failed' } : m
      ));
      toast({ title: 'Erro', description: e.message || 'Erro ao enviar mensagem', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
      sendingRef.current = false;
    }
  };

  // Handle file upload for media messages
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Check if connected before sending
    const connectedSession = sessions.find(s => 
      s.id === selectedConversation.session_id && s.status === 'connected'
    ) || sessions.find(s => s.status === 'connected');
    
    if (!connectedSession && !selectedConversation.is_demo) {
      toast({ 
        title: 'WhatsApp Desconectado', 
        description: 'Você precisa conectar seu WhatsApp para enviar mídia.',
        variant: 'destructive'
      });
      return;
    }
    
    setUploadingMedia(true);
    
    try {
      // Determine media type
      let mediaType = 'document';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
      
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(`outgoing/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        throw new Error('Erro ao fazer upload do arquivo');
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(uploadData.path);
      
      const mediaUrl = urlData.publicUrl;
      
      // Create optimistic message
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: WhatsAppMessage = {
        id: tempId,
        conversation_id: selectedConversation.id,
        content: file.name,
        from_me: true,
        status: 'sending',
        created_at: new Date().toISOString(),
        message_type: mediaType,
        media_url: mediaUrl
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Send via API
      if (connectedSession && !selectedConversation.is_demo) {
        const { error } = await supabase.functions.invoke('whatsapp-api', {
          body: {
            action: 'send_media',
            sessionId: connectedSession.id,
            phone: selectedConversation.contact_phone,
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            fileName: file.name,
            caption: ''
          }
        });
        
        if (error) throw error;
        
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, status: 'sent' } : m
        ));
        
        toast({ title: 'Mídia enviada!' });
      } else {
        // Demo mode
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, status: 'sent' } : m
        ));
      }
    } catch (e: any) {
      console.error('Error uploading media:', e);
      toast({ 
        title: 'Erro', 
        description: e.message || 'Erro ao enviar mídia', 
        variant: 'destructive' 
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  // Handle audio recording complete
  const handleAudioRecordingComplete = async (audioBlob: Blob) => {
    if (!selectedConversation) return;
    
    const connectedSession = sessions.find(s => 
      s.id === selectedConversation.session_id && s.status === 'connected'
    ) || sessions.find(s => s.status === 'connected');
    
    if (!connectedSession && !selectedConversation.is_demo) {
      toast({ 
        title: 'WhatsApp Desconectado', 
        description: 'Você precisa conectar seu WhatsApp para enviar áudio.',
        variant: 'destructive'
      });
      return;
    }
    
    setUploadingMedia(true);
    
    try {
      // Create file from blob
      const fileName = `audio-${Date.now()}.webm`;
      const file = new File([audioBlob], fileName, { type: audioBlob.type });
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(`outgoing/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        throw new Error('Erro ao fazer upload do áudio');
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(uploadData.path);
      
      const mediaUrl = urlData.publicUrl;
      
      // Create optimistic message
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: WhatsAppMessage = {
        id: tempId,
        conversation_id: selectedConversation.id,
        content: '🎤 Mensagem de voz',
        from_me: true,
        status: 'sending',
        created_at: new Date().toISOString(),
        message_type: 'audio',
        media_url: mediaUrl
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Send via API
      if (connectedSession && !selectedConversation.is_demo) {
        const { error } = await supabase.functions.invoke('whatsapp-api', {
          body: {
            action: 'send_media',
            sessionId: connectedSession.id,
            phone: selectedConversation.contact_phone,
            mediaUrl: mediaUrl,
            mediaType: 'audio',
            fileName: fileName,
            caption: ''
          }
        });
        
        if (error) throw error;
        
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, status: 'sent' } : m
        ));
        
        toast({ title: 'Áudio enviado!' });
      } else {
        // Demo mode
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, status: 'sent' } : m
        ));
      }
    } catch (e: any) {
      console.error('Error sending audio:', e);
      toast({ 
        title: 'Erro', 
        description: e.message || 'Erro ao enviar áudio', 
        variant: 'destructive' 
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  // Handle meeting scheduled - insert link into message
  const handleMeetingScheduled = (meetingLink: string, scheduledTime: string) => {
    setNewMessage(`📅 Reunião agendada para ${scheduledTime}\n\n🔗 Link: ${meetingLink}`);
  };

  const selectAgent = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setSelectedConversation(null);
    // Load persisted history for this agent
    const agentKey = `agent-${agent.id}`;
    setAgentChatMessages(agentChatHistory[agentKey] || []);
    setShowMobileChat(true);
  };

  // Get connected sessions first (needed for filtering)
  const connectedSessions = sessions.filter(s => s.status === 'connected');
  
  // Check if there are disconnected sessions (for UI indicator)
  const hasDisconnectedSessions = sessions.some(s => s.status === 'disconnected' && !connectedSessions.length);

  // Helper function to check if a phone number is a status broadcast or invalid
  // NOTE: Groups have 18+ digit IDs - these are VALID and should NOT be filtered
  const isStatusBroadcastOrInvalid = (phone: string | undefined): boolean => {
    if (!phone) return true;
    const cleaned = phone.replace(/\D/g, '');
    // Only filter truly invalid patterns
    if (cleaned.length < 8) return true; // Too short
    if (cleaned.startsWith('status')) return true;
    if (phone.includes('@broadcast')) return true;
    // Don't filter by length - groups have 18+ digits and are valid
    return false;
  };

  // Extract ALL connected phone numbers (normalized) for self-chat filtering
  const connectedPhones = connectedSessions
    .map(s => s.phone_number?.replace(/\D/g, ''))
    .filter(Boolean) as string[];
  
  // Filter conversations - exclude self-conversations and status broadcasts
  const filteredConversations = conversations.filter(conv => {
    // Filter out status broadcasts and invalid phone numbers
    if (isStatusBroadcastOrInvalid(conv.contact_phone)) {
      return false;
    }
    
    // Normalize contact phone for comparison
    const contactPhone = conv.contact_phone?.replace(/\D/g, '');
    
    // Filter out self-conversations (where contact_phone matches ANY connected session phone)
    // Use endsWith to handle country code differences (e.g., 5511999999 vs 11999999)
    // Only apply self-filter for normal phone numbers (8-15 digits), not groups (18+ digits)
    if (contactPhone && contactPhone.length <= 15 && connectedPhones.some(cp => 
      cp === contactPhone || 
      cp?.endsWith(contactPhone) || 
      contactPhone?.endsWith(cp)
    )) {
      return false; // Exclude self-chat
    }
    
    const matchesSearch = searchQuery === '' || 
      conv.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contact_phone.includes(searchQuery);
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'unread' && (conv.unread_count || 0) > 0) ||
      (activeTab === 'open' && conv.status === 'open') ||
      (activeTab === 'closed' && conv.status === 'closed');
    
    return matchesSearch && matchesTab;
  });

  // Format time
  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return d.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF4500] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando CRM WhatsApp...</p>
        </div>
      </div>
    );
  }

  const currentMessages = selectedAgent ? agentChatMessages : messages;

  return (
    <div className={cn(
      "bg-background flex flex-col overflow-hidden",
      "h-[100dvh] md:h-full",
      isMobile && showMobileChat && "fixed inset-0 z-50",
      isMobile && !showMobileChat && "fixed inset-0 z-40"
    )}>
      {/* Top Header - Hidden on mobile (md:flex) */}
      <div className="p-3 border-b bg-card hidden md:flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-7 px-2"
            >
              <List className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline text-xs">Lista</span>
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-7 px-2"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline text-xs">Kanban</span>
            </Button>
            <Button
              variant={viewMode === 'contacts' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('contacts')}
              className="h-7 px-2 relative"
            >
              <Users className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline text-xs">Contatos</span>
              {contactsCount > 0 && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 min-w-5 p-0 text-[10px] flex items-center justify-center">
                  {contactsCount > 999 ? '999+' : contactsCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedConversationForLabels(null); setShowLabelsManager(true); }} className="h-7 px-2">
            <Tag className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline text-xs">Etiquetas</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefreshData} disabled={syncingData} className="h-7 px-2">
            <RefreshCw className={cn("h-4 w-4 mr-1", syncingData && "animate-spin")} />
            <span className="hidden sm:inline text-xs">{syncingData ? 'Atualizando...' : 'Atualizar'}</span>
          </Button>
          {isAdminMaster && (
            <Button variant="ghost" size="sm" onClick={() => setShowServerDownload(true)} className="h-7 px-2">
              <Server className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline text-xs">Servidor</span>
            </Button>
          )}
          {connectedSessions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500 mr-1.5" />
                  <span className="hidden sm:inline text-xs">Conexão</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{connectedSessions[0]?.phone_number || 'WhatsApp'}</p>
                  <p className="text-xs text-muted-foreground">{connectedSessions[0]?.instance_name}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowQRModal(true)}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Conectar outro
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={async () => {
                  const session = connectedSessions[0];
                  if (!session) return;
                  setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: 'disconnected' } : s));
                  try {
                    await supabase.from('whatsapp_sessions').update({ status: 'disconnected' }).eq('id', session.id);
                    await loadSessions();
                    const serverUrl = session.baileys_server_url;
                    if (serverUrl) {
                      fetch(`${serverUrl}/disconnect/${session.instance_name}`, { method: 'POST' }).catch(e => console.warn('Server disconnect call failed:', e));
                    }
                    toast({ title: 'Desconectado', description: 'WhatsApp desconectado com sucesso' });
                  } catch (e) {
                    console.error('Error disconnecting:', e);
                    await loadSessions();
                    toast({ title: 'Erro', description: 'Erro ao desconectar', variant: 'destructive' });
                  }
                }}>
                  <Phone className="h-4 w-4 mr-2" />
                  Desconectar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowQRModal(true)} className="h-7 px-2">
              <Circle className={cn("h-2.5 w-2.5 mr-1.5", hasDisconnectedSessions ? "fill-destructive text-destructive" : "fill-muted-foreground text-muted-foreground")} />
              <span className="hidden sm:inline text-xs">Conexão</span>
            </Button>
          )}
        </div>

        {showServerDownload && (
          <BaileysServerDownload isOpenExternal={showServerDownload} onClose={() => setShowServerDownload(false)} />
        )}
      </div>

      {showServerDownload && isMobile && (
        <BaileysServerDownload isOpenExternal={showServerDownload} onClose={() => setShowServerDownload(false)} />
      )}

      {/* Main Content */}
      {viewMode === 'kanban' && !isMobile ? (
        <WhatsAppKanbanView
          conversations={filteredConversations}
          labels={labels}
          columns={kanbanColumns}
          companyId={companyId}
          onSelectConversation={async (conv) => {
            setPopupConversation(conv);
            
            // Load messages from ALL conversations with same phone
            const { data: convs } = await supabase
              .from('whatsapp_conversations')
              .select('id')
              .eq('company_id', companyId)
              .eq('contact_phone', conv.contact_phone);
            
            if (convs && convs.length > 0) {
              const conversationIds = convs.map(c => c.id);
              const { data } = await supabase
                .from('whatsapp_messages')
                .select('*')
                .in('conversation_id', conversationIds)
                .order('timestamp', { ascending: true })
                .limit(200);
              
              // Deduplicate by wa_message_id
              const uniqueMessages = new Map<string, WhatsAppMessage>();
              (data || []).forEach(m => {
                const key = m.wa_message_id || m.id;
                if (!uniqueMessages.has(key)) {
                  uniqueMessages.set(key, {
                    ...m,
                    created_at: m.timestamp || m.created_at
                  });
                }
              });
              setPopupMessages(Array.from(uniqueMessages.values()));
            }
            
            setShowConversationPopup(true);
          }}
          onSaveLead={openSaveLeadModal}
          onManageLabels={openLabelsManager}
          onUpdateStage={handleUpdateStage}
          onConfigureColumns={() => setShowColumnConfig(true)}
        />
      ) : viewMode === 'contacts' ? (
        <div className="flex-1 overflow-hidden">
          <WhatsAppContacts
            companyId={companyId || ''}
            sessionId={connectedSessions[0]?.id}
            onStartConversation={(contact) => {
              // Create a temporary conversation for this contact
              const tempConv: WhatsAppConversationData = {
                id: `temp-${contact.id}`,
                contact_phone: contact.phone_number,
                contact_name: contact.push_name || contact.business_name,
                profile_picture: contact.profile_picture,
                last_message_at: new Date().toISOString(),
                status: 'open',
                session_id: contact.session_id
              };
              setSelectedConversation(tempConv);
              setViewMode('list');
              setShowMobileChat(true);
              toast({ title: 'Iniciar conversa', description: `Enviando mensagem para ${contact.push_name || contact.phone_number}` });
            }}
            onSaveAsLead={(contact) => {
              // Open save lead modal with contact info
              setSelectedConversationForLead({
                id: `temp-${contact.id}`,
                contact_phone: contact.phone_number,
                contact_name: contact.push_name || contact.business_name,
                profile_picture: contact.profile_picture,
                last_message_at: new Date().toISOString(),
                status: 'open'
              });
              setShowSaveLeadModal(true);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations List - Left Panel */}
          <div className={cn(
            "w-full md:w-96 lg:w-[400px] border-r flex flex-col bg-card",
            showMobileChat && "hidden md:flex"
          )}>
            {/* Mobile WhatsApp-style header - hidden on md+ screens */}
              <div className="flex md:hidden items-center justify-between px-3 bg-[#FF4500] flex-shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-white" />
                  </button>
                  <span className="text-white font-semibold text-lg">WhatsApp</span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Channel selector button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 h-9 px-2 rounded-full hover:bg-white/10 transition-colors">
                        <Circle className={cn(
                          "h-2.5 w-2.5",
                          connectedSessions.length > 0 ? "fill-[#FF4500] text-[#FF4500]" : "fill-red-400 text-red-400"
                        )} />
                        <Phone className="h-4 w-4 text-white" />
                        <ChevronDown className="h-3 w-3 text-white/70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72">
                      {sessions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Nenhum canal configurado
                        </div>
                      ) : (
                        sessions.map(session => {
                          const isSelected = (selectedSessionId || connectedSessions[0]?.id) === session.id;
                          return (
                            <DropdownMenuItem
                              key={session.id}
                              onClick={() => { setSelectedSessionId(session.id); loadConversations(); }}
                              className="flex items-center gap-3 p-2 cursor-pointer"
                            >
                              <div className="relative">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={session.profile_picture} />
                                  <AvatarFallback className="bg-[#FF4500] text-white text-xs">
                                    <Phone className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                                <span className={cn(
                                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                                  session.status === 'connected' ? "bg-green-500" : "bg-red-500"
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {session.phone_name || session.instance_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {session.phone_number || (session.status === 'connected' ? 'Conectado' : 'Desconectado')}
                                </p>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-[#FF4500] shrink-0" />}
                            </DropdownMenuItem>
                          );
                        })
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowQRModal(true)} className="flex items-center gap-2 cursor-pointer">
                        <Plus className="h-4 w-4" />
                        <span>Adicionar novo canal</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors">
                        <MoreVertical className="h-5 w-5 text-white" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => setViewMode('list')}>
                        <List className="h-4 w-4 mr-2" />
                        Lista
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setViewMode('contacts')}>
                        <Users className="h-4 w-4 mr-2" />
                        Contatos {contactsCount > 0 && `(${contactsCount})`}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setSelectedConversationForLabels(null); setShowLabelsManager(true); }}>
                        <Tag className="h-4 w-4 mr-2" />
                        Etiquetas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleRefreshData} disabled={syncingData}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", syncingData && "animate-spin")} />
                        {syncingData ? 'Atualizando...' : 'Atualizar'}
                      </DropdownMenuItem>
                      {isAdminMaster && (
                        <DropdownMenuItem onClick={() => setShowServerDownload(true)}>
                          <Server className="h-4 w-4 mr-2" />
                          Servidor
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {connectedSessions.length > 0 ? (
                        <>
                          <div className="px-2 py-1.5">
                            <p className="text-xs font-medium flex items-center gap-1.5">
                              <Circle className="h-2 w-2 fill-[#FF4500] text-[#FF4500]" />
                              {connectedSessions[0]?.phone_number || 'Conectado'}
                            </p>
                          </div>
                          <DropdownMenuItem onClick={() => setShowQRModal(true)}>
                            <QrCode className="h-4 w-4 mr-2" />
                            Conectar outro
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={async () => {
                            const session = connectedSessions[0];
                            if (!session) return;
                            setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: 'disconnected' } : s));
                            try {
                              await supabase.from('whatsapp_sessions').update({ status: 'disconnected' }).eq('id', session.id);
                              await loadSessions();
                              if (session.baileys_server_url) {
                                fetch(`${session.baileys_server_url}/disconnect/${session.instance_name}`, { method: 'POST' }).catch(() => {});
                              }
                              toast({ title: 'Desconectado' });
                            } catch (e) {
                              await loadSessions();
                              toast({ title: 'Erro', variant: 'destructive' });
                            }
                          }}>
                            <Phone className="h-4 w-4 mr-2" />
                            Desconectar
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem onClick={() => setShowQRModal(true)}>
                          <QrCode className="h-4 w-4 mr-2" />
                          Conectar WhatsApp
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

            {/* Channel Selector - hidden on mobile, shown on md+ screens */}
            <div className="hidden md:block">
              <ChannelSelector
                sessions={sessions}
                selectedSessionId={selectedSessionId}
                onSelectSession={(id) => {
                  setSelectedSessionId(id);
                  loadConversations();
                }}
                onAddNew={() => setShowQRModal(true)}
                onReconnect={() => setShowQRModal(true)}
                onSessionDeleted={() => {
                  loadSessions();
                  loadConversations();
                }}
              />
            </div>
            
            {/* Search & Filters */}
            <div className={cn("border-b space-y-2", isMobile ? "p-3 pt-2" : "p-4 space-y-3")}>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn("pl-9", isMobile && "h-9 text-sm rounded-full bg-muted border-0")}
                />
              </div>
              
              {/* Filter Tabs */}
              <div className="flex gap-1">
                {['all', 'unread', 'open', 'closed'].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab(tab as any)}
                    className={cn(
                      "flex-1 text-xs",
                      isMobile && "h-7 text-[11px]",
                      activeTab === tab && "bg-[#FF4500] hover:bg-[#FF4500]/90"
                    )}
                  >
                    {tab === 'all' ? 'Todas' : tab === 'unread' ? 'Não lidas' : tab === 'open' ? 'Abertas' : 'Fechadas'}
                  </Button>
                ))}
              </div>
            </div>
        
            {/* AI Agents Section removed for cleaner mobile experience */}
        
        {/* Conversations List */}
        <ScrollArea className="flex-1 overscroll-contain">
          {syncingConversations ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF4500] mx-auto mb-4"></div>
              <h3 className="font-medium mb-2">Sincronizando conversas</h3>
              <p className="text-sm text-muted-foreground">
                Carregando suas conversas do WhatsApp...
              </p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              {connectedSessions.length === 0 ? (
                <>
                  <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhum WhatsApp conectado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conecte seu WhatsApp para ver as conversas
                  </p>
                  <Button onClick={() => setShowQRModal(true)} className="bg-[#FF4500] hover:bg-[#FF4500]/90">
                    <QrCode className="h-4 w-4 mr-2" />
                    Conectar WhatsApp
                  </Button>
                </>
              ) : searchQuery ? (
                <>
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhum resultado</h3>
                  <p className="text-sm text-muted-foreground">
                    Tente outra busca ou filtro
                  </p>
                </>
              ) : (
                <>
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhuma conversa ainda</h3>
                  <p className="text-sm text-muted-foreground">
                    As conversas aparecerão aqui quando você receber mensagens
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map(conversation => (
                <SwipeableConversationItem
                  key={conversation.id}
                  onDelete={() => handleDeleteConversation(conversation)}
                  onSelect={() => {
                    setSelectedConversation(conversation);
                    setSelectedAgent(null);
                    markConversationAsRead(conversation);
                    setShowMobileChat(true);
                  }}
                >
                  <div
                    className={cn(
                      "flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                      selectedConversation?.id === conversation.id && "bg-muted"
                    )}
                    onContextMenu={(e) => handleConversationContextMenu(e, conversation)}
                    onTouchStart={(e) => {
                      const timer = setTimeout(() => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        setConversationContextMenu({
                          isOpen: true,
                          position: { x: touch.clientX, y: touch.clientY },
                          conversation,
                        });
                      }, 500);
                      (e.currentTarget as any)._longPressTimer = timer;
                    }}
                    onTouchEnd={(e) => {
                      clearTimeout((e.currentTarget as any)._longPressTimer);
                    }}
                    onTouchMove={(e) => {
                      clearTimeout((e.currentTarget as any)._longPressTimer);
                    }}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conversation.profile_picture} />
                        <AvatarFallback className="bg-[#FF4500]/10 text-[#FF4500]">
                          {(conversation.contact_name || conversation.contact_phone).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* AI Agent indicator */}
                      {conversation.assigned_agent_id && conversation.ai_auto_reply_enabled && (
                        <div className="absolute -bottom-1 -right-1 p-1 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full shadow-lg">
                          <Bot className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {/* Chatbot indicator */}
                      {!(conversation.assigned_agent_id && conversation.ai_auto_reply_enabled) && chatbotActiveConvIds.has(conversation.id) && (
                        <div className="absolute -bottom-1 -right-1 p-1 bg-gradient-to-br from-orange-500 to-red-500 rounded-full shadow-lg">
                          <GitBranch className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                          {isGroupConversation(conversation) && (
                            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="font-medium truncate">
                            {getDisplayName(conversation)}
                          </span>
                          {/* AI Badge */}
                          {conversation.assigned_agent_id && conversation.ai_auto_reply_enabled && (
                            <Badge className="bg-orange-100 text-[#FF4500] dark:bg-orange-900/30 dark:text-orange-300 text-[10px] px-1.5 py-0 gap-1 flex-shrink-0">
                              <Sparkles className="h-2.5 w-2.5" />
                              IA
                            </Badge>
                          )}
                          {/* Chatbot Badge */}
                          {chatbotActiveConvIds.has(conversation.id) && !(conversation.assigned_agent_id && conversation.ai_auto_reply_enabled) && (
                            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] px-1.5 py-0 gap-1 flex-shrink-0">
                              <GitBranch className="h-2.5 w-2.5" />
                              Bot
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                          {conversation.last_message_at ? formatTime(conversation.last_message_at) : '--:--'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between min-w-0">
                        <p className="text-sm text-muted-foreground truncate pr-2 min-w-0 flex-1">
                          {conversation.last_message || 'Nova conversa'}
                        </p>
                        {(conversation.unread_count || 0) > 0 && (
                          <Badge className="bg-[#FF4500] text-white text-xs px-2 py-0.5 min-w-[20px] justify-center">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      {/* Labels below message */}
                      {conversation.labels && conversation.labels.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 overflow-hidden">
                          {conversation.labels.slice(0, 2).map(labelId => {
                            const label = labels.find(l => l.id === labelId);
                            if (!label) return null;
                            return (
                              <span
                                key={labelId}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${label.color}20`,
                                  color: label.color,
                                  border: `1px solid ${label.color}40`
                                }}
                              >
                                {label.name}
                              </span>
                            );
                          })}
                          {conversation.labels.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{conversation.labels.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </SwipeableConversationItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area - Right Panel */}
      <div className={cn(
        "flex-1 flex flex-col",
        !showMobileChat && "hidden md:flex",
        isMobile && showMobileChat && "w-full"
      )}>
        {selectedConversation || selectedAgent ? (
          <>
            {/* Chat Header */}
            <div className={cn(
              "border-b flex items-center justify-between px-4 bg-card flex-shrink-0",
              isMobile ? "h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]" : "h-16"
            )}>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  onClick={() => {
                    setShowMobileChat(false);
                    setSelectedConversation(null);
                    setSelectedAgent(null);
                    // Pop the history state we pushed
                    if (window.history.state?.whatsappChat) {
                      window.history.back();
                    }
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  {selectedAgent ? (
                    <>
                      <AvatarImage src={selectedAgent.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-[#FF4500] to-orange-600 text-white">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </>
                  ) : (
                    <>
                      <AvatarImage src={selectedConversation?.profile_picture} />
                      <AvatarFallback className="bg-orange-100 text-[#FF4500]">
                        {(selectedConversation ? getDisplayName(selectedConversation, messages) : '').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium">
                      {selectedAgent ? selectedAgent.name : (selectedConversation ? getDisplayName(selectedConversation, messages) : '')}
                    </h2>
                    {selectedAgent && (
                      <Badge className="bg-orange-100 text-[#FF4500] dark:bg-orange-900 dark:text-orange-300 text-xs">
                        Agente IA
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedAgent ? selectedAgent.description || 'Assistente virtual' : selectedConversation?.contact_phone}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedConversation && (
                  <>
                    <Badge 
                      className={selectedConversation.status === 'open' ? 'bg-[#FF4500] hover:bg-[#FF4500]/90 text-white' : ''}
                      variant={selectedConversation.status === 'open' ? 'default' : 'secondary'}
                    >
                      {selectedConversation.status === 'open' ? 'Aberta' : selectedConversation.status === 'archived' ? 'Arquivada' : 'Fechada'}
                    </Badge>
                    {activeChatbotFlow && (
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs gap-1 px-2">
                          <GitBranch className="h-3 w-3" />
                          {activeChatbotFlow.name}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={async () => {
                            await supabase
                              .from('chatbot_executions')
                              .update({ status: 'stopped', completed_at: new Date().toISOString() })
                              .eq('id', activeChatbotFlow.id);
                            setActiveChatbotFlow(null);
                            toast({ title: 'Chatbot parado', description: 'O fluxo foi interrompido.' });
                          }}
                        >
                          <Square className="h-3 w-3 mr-1" />
                          Parar
                        </Button>
                      </div>
                    )}
                    {selectedConversation.assigned_agent_id && selectedConversation.ai_auto_reply_enabled && (() => {
                      const assignedAgent = aiAgents.find(a => a.id === selectedConversation.assigned_agent_id);
                      return assignedAgent ? (
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-xs gap-1 px-2">
                            <Bot className="h-3 w-3" />
                            {assignedAgent.name} atendendo
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={async () => {
                              const { error } = await supabase
                                .from('whatsapp_conversations')
                                .update({ ai_auto_reply_enabled: false })
                                .eq('id', selectedConversation.id);
                              if (!error) {
                                setConversations(prev => prev.map(c => 
                                  c.id === selectedConversation.id 
                                    ? { ...c, ai_auto_reply_enabled: false } 
                                    : c
                                ));
                                setSelectedConversation(prev => prev 
                                  ? { ...prev, ai_auto_reply_enabled: false } 
                                  : null
                                );
                                toast({ title: 'IA pausada', description: 'O agente IA não responderá mais automaticamente.' });
                              }
                            }}
                          >
                            <Square className="h-3 w-3 mr-1" />
                            Parar
                          </Button>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Users className="h-4 w-4 mr-2" />
                      Ver perfil
                    </DropdownMenuItem>
                    {!selectedAgent && selectedConversation && (
                      <>
                        <DropdownMenuSeparator />
                        {aiAgents.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              Atribuir Agente IA
                            </div>
                            {aiAgents.map(agent => (
                              <DropdownMenuItem 
                                key={agent.id}
                                onClick={() => handleAssignAgent(selectedConversation, agent.id, true)}
                                className={selectedConversation.assigned_agent_id === agent.id ? "bg-orange-50 dark:bg-orange-950" : ""}
                              >
                                <Bot className="h-4 w-4 mr-2 text-[#FF4500]" />
                                {agent.name}
                                {selectedConversation.assigned_agent_id === agent.id && (
                                  <Check className="h-4 w-4 ml-auto text-[#FF4500]" />
                                )}
                              </DropdownMenuItem>
                            ))}
                            {selectedConversation.assigned_agent_id && (
                              <>
                                <DropdownMenuItem 
                                  onClick={async () => {
                                    const newState = !selectedConversation.ai_auto_reply_enabled;
                                    const { error } = await supabase
                                      .from('whatsapp_conversations')
                                      .update({ ai_auto_reply_enabled: newState })
                                      .eq('id', selectedConversation.id);
                                    
                                    if (!error) {
                                      setConversations(prev => prev.map(c => 
                                        c.id === selectedConversation.id 
                                          ? { ...c, ai_auto_reply_enabled: newState } 
                                          : c
                                      ));
                                      setSelectedConversation(prev => prev 
                                        ? { ...prev, ai_auto_reply_enabled: newState } 
                                        : null
                                      );
                                      toast({
                                        title: newState ? 'Auto-resposta ativada' : 'Auto-resposta desativada',
                                        description: newState 
                                          ? 'O agente IA responderá automaticamente' 
                                          : 'O agente IA não responderá automaticamente'
                                      });
                                    }
                                  }}
                                  className={selectedConversation.ai_auto_reply_enabled ? "text-[#FF4500]" : "text-muted-foreground"}
                                >
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  {selectedConversation.ai_auto_reply_enabled ? '✓ Auto-resposta ON' : 'Auto-resposta OFF'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAssignAgent(selectedConversation, null)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover Agente
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => setShowStartChatbot(true)}>
                          <GitBranch className="h-4 w-4 mr-2 text-[#FF4500]" />
                          Iniciar Chatbot
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openLabelsManager(selectedConversation)}>
                          <Tag className="h-4 w-4 mr-2" />
                          Gerenciar Etiquetas
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openSaveLeadModal(selectedConversation)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Adicionar à Base de Clientes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleArchiveConversation(selectedConversation)}
                          className="text-amber-600"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          {selectedConversation.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteConversation(selectedConversation)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir conversa
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 relative overflow-hidden">
              <ScrollArea ref={messagesScrollAreaRef} className="h-full p-4 bg-gradient-to-b from-orange-50/50 to-red-50/50 dark:from-orange-950/10 dark:to-red-950/10">
              <div className="space-y-2 max-w-3xl mx-auto">
                {currentMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-20">
                    <div className="text-center">
                      {selectedAgent ? (
                        <>
                          <Bot className="h-12 w-12 text-[#FF4500] mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            Inicie uma conversa com <strong>{selectedAgent.name}</strong>
                          </p>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            Nenhuma mensagem ainda. Inicie a conversa!
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {currentMessages.map(message => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex group",
                          message.from_me ? 'justify-end' : 'justify-start',
                          message.from_me && message.is_ai_response && 'items-end gap-2'
                        )}
                        onContextMenu={(e) => handleMessageContextMenu(e, message)}
                      >
                        {/* Bot avatar for AI responses */}
                        {message.from_me && message.is_ai_response && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mb-1 order-first">
                            <Bot className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm relative",
                            message.from_me
                              ? message.is_ai_response 
                                ? "bg-gradient-to-br from-violet-500 to-purple-600 rounded-br-sm" 
                                : message.status === 'sending'
                                  ? "bg-[#FF4500]/70 rounded-br-sm"
                                  : message.status === 'failed'
                                    ? "bg-destructive rounded-br-sm"
                                    : "bg-[#FF4500] rounded-br-sm"
                              : selectedAgent
                                ? "bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 text-foreground rounded-bl-sm border border-orange-100 dark:border-orange-800"
                                : "bg-card text-foreground rounded-bl-sm border"
                          )}
                        >
                          {/* AI Response indicator for sent messages */}
                          {message.from_me && message.is_ai_response && (
                            <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-white/20">
                              <Bot className="h-3.5 w-3.5 text-white" />
                              <span className="text-[10px] font-semibold text-white/90 uppercase tracking-wide">
                                {message.sender_name?.replace('🤖 ', '') || 'Resposta Automática IA'}
                              </span>
                            </div>
                          )}
                          
                          {!message.from_me && selectedAgent && (
                            <div className="flex items-center gap-1 mb-1">
                              <Bot className="h-3 w-3 text-[#FF4500]" />
                              <span className="text-[10px] font-medium text-[#FF4500] dark:text-orange-400">
                                {selectedAgent.name}
                              </span>
                            </div>
                          )}
                          
                          {/* Group message: show sender name */}
                          {!message.from_me && !selectedAgent && message.sender_name && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-xs font-semibold text-[#FF4500]">
                                {message.sender_name}
                              </span>
                            </div>
                          )}
                          
                          {/* Render image if message is an image */}
                          {message.message_type === 'image' && message.media_url ? (
                            <div className="mb-2 relative">
                              <img 
                                src={message.media_url} 
                                alt="Imagem" 
                                className="rounded-lg max-w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(message.media_url, '_blank')}
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {/* Download button - always visible */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast({ title: 'Baixando...', description: 'Aguarde o download da imagem' });
                                  // Fetch and download as blob for cross-origin images
                                  fetch(message.media_url!)
                                    .then(res => res.blob())
                                    .then(blob => {
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `whatsapp-image-${message.id}.jpg`;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                      toast({ title: 'Sucesso!', description: 'Imagem baixada com sucesso' });
                                    })
                                    .catch(() => {
                                      // Fallback: open in new tab
                                      window.open(message.media_url, '_blank');
                                      toast({ title: 'Abrindo em nova aba', description: 'O download direto não foi possível' });
                                    });
                                }}
                                className={cn(
                                  "absolute top-2 right-2 p-2 rounded-full shadow-lg transition-all hover:scale-110",
                                  message.from_me 
                                    ? "bg-white/80 hover:bg-white text-[#FF4500]" 
                                    : "bg-[#FF4500] hover:bg-[#FF4500]/90 text-white"
                                )}
                                title="Baixar imagem"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="7 10 12 15 17 10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                              </button>
                              {(message.media_caption || message.content) && (
                                <p className={cn(
                                  "text-sm whitespace-pre-wrap mt-2",
                                  message.from_me ? "text-white" : "text-foreground"
                                )}>
                                  {message.media_caption || message.content}
                                </p>
                              )}
                            </div>
                          ) : message.message_type === 'image' ? (
                            <div className="flex items-center gap-2 mb-1">
                              <ImageIcon className={cn("h-4 w-4", message.from_me ? "text-white/70" : "text-muted-foreground")} />
                              <span className={cn("text-sm italic", message.from_me ? "text-white/90" : "text-muted-foreground")}>
                                {message.content || '[Imagem]'}
                              </span>
                            </div>
                          ) : message.message_type === 'video' ? (
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("text-sm", message.from_me ? "text-white" : "text-foreground")}>
                                🎥 {message.content || '[Vídeo]'}
                              </span>
                            </div>
                          ) : (message.message_type === 'audio' || message.message_type === 'ptt') && message.media_url ? (
                            <AudioPlayer 
                              mediaUrl={message.media_url} 
                              fromMe={message.from_me}
                              isPTT={message.message_type === 'ptt'}
                            />
                          ) : (message.message_type === 'audio' || message.message_type === 'ptt') ? (
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("text-sm", message.from_me ? "text-white" : "text-foreground")}>
                                🎵 {message.content || '[Áudio]'}
                              </span>
                            </div>
                          ) : message.message_type === 'document' ? (
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("text-sm", message.from_me ? "text-white" : "text-foreground")}>
                                📄 {message.content || '[Documento]'}
                              </span>
                            </div>
                          ) : message.message_type === 'sticker' ? (
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("text-sm", message.from_me ? "text-white" : "text-foreground")}>
                                🎨 [Sticker]
                              </span>
                            </div>
                          ) : (
                            <p className={cn(
                              "text-sm whitespace-pre-wrap",
                              message.from_me ? "text-white" : "text-foreground"
                            )}>
                              {message.content}
                            </p>
                          )}
                          
                          <div className={cn(
                            "flex items-center justify-end gap-1 mt-1",
                            message.from_me ? "text-white/70" : "text-muted-foreground"
                          )}>
                            <span className="text-[10px]">
                              {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {message.from_me && (
                              message.status === 'read' ? (
                                <CheckCheck className="h-3 w-3 text-cyan-300" />
                              ) : message.status === 'delivered' ? (
                                <CheckCheck className="h-3 w-3 text-white/70" />
                              ) : (
                                <Check className="h-3 w-3 text-white/70" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isAiTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 rounded-lg px-4 py-3 rounded-bl-none border border-orange-100 dark:border-orange-800">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-[#FF4500] animate-pulse" />
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-[#FF4500] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-[#FF4500] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-[#FF4500] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
              </ScrollArea>

              {/* Scroll to bottom button - WhatsApp Web style */}
              {showScrollToBottom && (
                <Button
                  onClick={handleScrollToBottom}
                  size="icon"
                  className="absolute bottom-4 right-6 z-10 rounded-full bg-card shadow-lg hover:bg-accent h-10 w-10 border"
                >
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </Button>
              )}
            </div>
            
            {/* Input Area */}
            <div className={cn(
              "p-4 border-t bg-card",
              isMobile && "pb-[calc(1rem+env(safe-area-inset-bottom))]"
            )}>
              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileUpload}
              />
              
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                {/* Media upload dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-10 w-10 flex-shrink-0"
                      disabled={uploadingMedia || !selectedConversation}
                    >
                      {uploadingMedia ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*';
                        fileInputRef.current.click();
                      }
                    }}>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Imagem
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'video/*';
                        fileInputRef.current.click();
                      }
                    }}>
                      <Play className="h-4 w-4 mr-2" />
                      Vídeo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx';
                        fileInputRef.current.click();
                      }
                    }}>
                      <FileText className="h-4 w-4 mr-2" />
                      Documento
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Audio Recorder Button */}
                <AudioRecorderButton
                  onRecordingComplete={handleAudioRecordingComplete}
                  disabled={uploadingMedia || !selectedConversation}
                />
                
                <Input
                  placeholder={selectedAgent ? `Mensagem para ${selectedAgent.name}...` : "Digite uma mensagem..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={sendingMessage || !newMessage.trim()}
                  className="bg-[#FF4500] hover:bg-[#FF4500]/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 text-center p-8">
            <div className="w-64 h-64 mb-8 opacity-50">
              <MessageSquare className="w-full h-full text-muted-foreground/20" />
            </div>
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">
              CRM WhatsApp
            </h2>
            <p className="text-muted-foreground max-w-md">
              Selecione uma conversa à esquerda para visualizar e responder mensagens.
              {aiAgents.length > 0 && (
                <span className="block mt-2">
                  Ou converse com um dos <strong>Agentes IA</strong> disponíveis.
                </span>
              )}
            </p>
            {connectedSessions.length === 0 && (
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button 
                  onClick={() => setShowQRModal(true)} 
                  className="bg-[#FF4500] hover:bg-[#FF4500]/90"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Conectar WhatsApp
                </Button>
                <BaileysServerDownload />
              </div>
            )}
          </div>
        )}
      </div>
      {/* End of list view */}
      </div>
      )}

      {/* QR Modal */}
      {companyId && user?.id && (
        <WhatsAppQRModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          companyId={companyId}
          userId={user.id}
          onSuccess={handleSessionSuccess}
        />
      )}

      {/* Labels Manager Modal */}
      <ConversationLabelsManager
        isOpen={showLabelsManager}
        onClose={() => {
          setShowLabelsManager(false);
          setSelectedConversationForLabels(null);
        }}
        labels={labels}
        selectedLabels={selectedConversationForLabels?.labels || []}
        onToggleLabel={handleToggleLabel}
        onCreateLabel={handleCreateLabel}
        onDeleteLabel={handleDeleteLabel}
        mode={selectedConversationForLabels ? 'assign' : 'manage'}
      />

      {/* Save Lead Modal */}
      <SaveLeadModal
        isOpen={showSaveLeadModal}
        onClose={() => {
          setShowSaveLeadModal(false);
          setSelectedConversationForLead(null);
        }}
        conversation={selectedConversationForLead}
        companyId={companyId}
        onSuccess={() => toast({ title: 'Lead salvo!', description: 'Contato adicionado ao banco de dados' })}
      />

      {/* Start Chatbot Modal */}
      {selectedConversation && (
        <StartChatbotModal
          isOpen={showStartChatbot}
          onClose={() => setShowStartChatbot(false)}
          companyId={companyId}
          conversationId={selectedConversation.id}
          contactPhone={selectedConversation.contact_phone}
          contactName={selectedConversation.contact_name}
          sessionId={selectedConversation.session_id}
          onStarted={(execId, flowName) => setActiveChatbotFlow({ id: execId, name: flowName })}
        />
      )}

      <ConversationPopup
        open={showConversationPopup}
        onOpenChange={(open) => {
          setShowConversationPopup(open);
          if (!open) setPopupConversation(null);
        }}
        conversation={popupConversation}
        messages={popupMessages}
        labels={labels}
        onSendMessage={async (message) => {
          if (!popupConversation) return;
          
          // Check if demo
          if (popupConversation.is_demo || popupConversation.id.startsWith('demo-')) {
            const newMsg: WhatsAppMessage = {
              id: `demo-msg-${Date.now()}`,
              conversation_id: popupConversation.id,
              content: message,
              from_me: true,
              status: 'sent',
              created_at: new Date().toISOString()
            };
            setPopupMessages(prev => [...prev, newMsg]);
            return;
          }
          
          // Real message - find connected session
          const connectedSession = sessions.find(s => 
            s.id === popupConversation.session_id && s.status === 'connected'
          ) || sessions.find(s => s.status === 'connected');
          
          if (connectedSession) {
            // OPTIMISTIC: Add message immediately for instant feedback
            const tempId = `temp-${Date.now()}`;
            const optimisticMsg: WhatsAppMessage = {
              id: tempId,
              conversation_id: popupConversation.id,
              content: message,
              from_me: true,
              status: 'sending',
              created_at: new Date().toISOString()
            };
            setPopupMessages(prev => [...prev, optimisticMsg]);
            
            setSendingMessage(true);
            try {
              const { error } = await supabase.functions.invoke('whatsapp-api', {
                body: {
                  action: 'send_message',
                  sessionId: connectedSession.id,
                  phone: popupConversation.contact_phone,
                  message
                }
              });
              
              if (error) throw error;
              
              // Update optimistic message to sent (instant - polling will sync)
              setPopupMessages(prev => prev.map(m => 
                m.id === tempId ? { ...m, status: 'sent' } : m
              ));
            } catch (e: any) {
              // Mark as failed
              setPopupMessages(prev => prev.map(m => 
                m.id === tempId ? { ...m, status: 'failed' } : m
              ));
              toast({ title: 'Erro', description: e.message, variant: 'destructive' });
            } finally {
              setSendingMessage(false);
            }
          } else {
            toast({ title: 'Atenção', description: 'Conecte um WhatsApp para enviar mensagens', variant: 'destructive' });
          }
        }}
        onManageLabels={() => {
          if (popupConversation) {
            openLabelsManager(popupConversation);
          }
        }}
        onSaveLead={() => {
          if (popupConversation) {
            openSaveLeadModal(popupConversation);
          }
        }}
        onDeleteMessage={handleDeleteMessage}
        sendingMessage={sendingMessage}
      />

      {/* Kanban Column Config */}
      <KanbanColumnConfig
        open={showColumnConfig}
        onOpenChange={setShowColumnConfig}
        columns={kanbanColumns}
        onColumnsChange={(newColumns) => {
          setKanbanColumns(newColumns);
          localStorage.setItem('whatsapp_kanban_columns', JSON.stringify(newColumns));
        }}
      />

      {/* Conversation Context Menu */}
      <ConversationContextMenu
        isOpen={conversationContextMenu.isOpen}
        position={conversationContextMenu.position}
        conversation={conversationContextMenu.conversation}
        labels={labels}
        aiAgents={aiAgents}
        onClose={() => setConversationContextMenu(prev => ({ ...prev, isOpen: false }))}
        onManageLabels={(conv) => openLabelsManager(conv as WhatsAppConversationData)}
        onSaveLead={(conv) => openSaveLeadModal(conv as WhatsAppConversationData)}
        onArchive={(conv) => handleArchiveConversation(conv as WhatsAppConversationData)}
        onDelete={(conv) => handleDeleteConversation(conv as WhatsAppConversationData)}
        onAssignAgent={(conv, agentId) => handleAssignAgent(conv as WhatsAppConversationData, agentId)}
        onCopyPhone={(phone) => handleCopyToClipboard(phone)}
        onStartChatbot={(conv) => {
          setSelectedConversation(conv as WhatsAppConversationData);
          setShowStartChatbot(true);
        }}
        onMarkResolved={async (conv) => {
          const { error } = await supabase
            .from('whatsapp_conversations')
            .update({ status: 'closed' })
            .eq('id', conv.id);
          if (!error) {
            setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, status: 'closed' } : c));
            toast({ title: 'Conversa marcada como resolvida' });
          }
        }}
      />

      {/* Message Context Menu */}
      <MessageContextMenu
        isOpen={messageContextMenu.isOpen}
        position={messageContextMenu.position}
        messageId={messageContextMenu.messageId}
        messageContent={messageContextMenu.messageContent}
        isFromMe={messageContextMenu.isFromMe}
        onClose={() => setMessageContextMenu(prev => ({ ...prev, isOpen: false }))}
        onCopy={(content) => handleCopyToClipboard(content)}
        onDelete={(messageId) => handleDeleteMessage(messageId)}
        onScheduleMeeting={() => setShowScheduleMeetingModal(true)}
      />

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={showScheduleMeetingModal}
        onClose={() => setShowScheduleMeetingModal(false)}
        contactName={selectedConversation?.contact_name}
        contactPhone={selectedConversation?.contact_phone}
        onMeetingScheduled={handleMeetingScheduled}
      />
    </div>
  );
};

export default WhatsAppCRM;
