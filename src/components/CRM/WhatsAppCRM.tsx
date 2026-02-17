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
  const isMobile = useIsMobile();
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

  // Send message to WhatsApp conversation with Optimistic UI
  const sendMessage = async () => {
    if (selectedAgent) {
      return sendMessageToAgent();
    }
    
    if (!newMessage.trim() || !selectedConversation) return;
    
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
      <div className="h-[calc(100vh-64px)] bg-background flex items-center justify-center">
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
      isMobile && showMobileChat ? "h-[100dvh] fixed inset-0 z-50" : isMobile ? "h-[100dvh]" : "h-[calc(100vh-64px)]"
    )}>
      {/* Top Header - Hidden on mobile */}
      <div className={cn(
        "p-3 border-b bg-card flex items-center justify-between flex-shrink-0",
        isMobile && "hidden"
      )}>
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
          <Button variant="ghost" size="sm" onClick={() => setShowServerDownload(true)} className="h-7 px-2">
            <Server className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline text-xs">Servidor</span>
          </Button>
          {connectedSessions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <Circle className="h-2.5 w-2.5 fill-[#FF4500] text-[#FF4500] mr-1.5" />
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
      {viewMode === 'kanban' ? (
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
            {/* Mobile WhatsApp-style header */}
            {isMobile && (
              <div className="flex items-center justify-between px-3 h-14 bg-[#FF4500] flex-shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-white" />
                  </button>
                  <svg width="100" height="25" viewBox="0 0 573 143" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M251.272 114.361V29.3138H267.383V114.361H251.272ZM180.641 86.4399C181.138 95.6289 186.342 101.593 194.267 101.593C199.472 101.593 204.062 98.9846 205.174 94.7637H221.782C218.055 107.308 208.025 114.387 195.013 114.387C174.691 114.387 164.543 103.205 164.543 81.0917C164.543 62.2157 175.318 50.0512 194.019 50.0512C212.733 50.0512 222.645 62.2157 222.645 86.4399H180.641ZM206.037 76.2547C205.789 67.1838 199.851 62.8449 193.522 62.8449C187.088 62.8449 181.752 67.813 181.138 76.2547H206.037ZM228.216 114.361V29.3138H244.328V114.361H228.216ZM272.64 82.219C272.64 62.8449 284.658 50.0512 303.987 50.0512C323.067 50.0512 334.967 62.7138 334.967 82.219C334.967 101.593 322.949 114.387 303.987 114.387C284.292 114.387 272.64 101.213 272.64 82.219ZM318.738 82.219C318.738 69.7923 313.782 63.7101 303.987 63.7101C294.205 63.7101 289.248 69.7923 289.248 82.219C289.248 94.6326 294.205 100.846 303.987 100.846C313.782 100.846 318.738 94.6326 318.738 82.219Z" fill="white"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M80.9296 0C82.1301 0 83.6033 0.0326661 84.2068 0.0783986C84.8104 0.124131 85.7903 0.228663 86.3938 0.300528C86.9909 0.378927 88.133 0.555324 88.9313 0.705588C89.723 0.849318 91.0015 1.11718 91.7737 1.30664C92.5395 1.49611 93.8374 1.85543 94.6551 2.1037C95.4728 2.35196 96.8486 2.82888 97.7182 3.15554C98.5813 3.48874 99.7819 3.9722 100.385 4.24006C100.989 4.50792 101.891 4.91951 102.397 5.16124C102.903 5.39644 103.922 5.92563 104.669 6.32416C105.415 6.72922 106.615 7.4152 107.336 7.85293C108.056 8.28412 109.296 9.08117 110.094 9.61037C110.886 10.1461 112.008 10.9366 112.586 11.3809C113.163 11.8186 114.007 12.4719 114.461 12.8378C114.922 13.2036 115.844 13.9746 116.519 14.556C117.194 15.1375 118.563 16.4245 119.569 17.4176C120.575 18.4106 121.886 19.7826 122.489 20.462C123.093 21.135 124.066 22.2848 124.65 23.01C125.241 23.7417 126.084 24.8262 126.532 25.4338C126.973 26.0414 127.824 27.2697 128.414 28.1647C129.005 29.0598 129.829 30.386 130.251 31.1112C130.672 31.8364 131.425 33.2214 131.918 34.1949C132.412 35.1618 133.061 36.5076 133.359 37.1871C133.658 37.8665 134.08 38.8727 134.294 39.4345C134.508 39.9898 134.891 41.0547 135.144 41.8061C135.397 42.5574 135.767 43.7464 135.961 44.452C136.163 45.1511 136.461 46.3401 136.63 47.0914C136.792 47.8428 137.013 48.9534 137.117 49.5545C137.214 50.1621 137.376 51.3119 137.474 52.109C137.603 53.1543 137.668 54.3433 137.701 56.336C137.733 58.4854 137.714 59.485 137.603 60.7785C137.525 61.6997 137.363 63.1044 137.24 63.9079C137.117 64.705 136.857 66.09 136.662 66.9851C136.468 67.8802 136.15 69.1737 135.961 69.8466C135.773 70.5261 135.436 71.6172 135.222 72.2705C135.001 72.9238 134.534 74.1912 134.183 75.0863C133.833 75.9813 133.229 77.386 132.84 78.2092C132.457 79.0323 131.847 80.2606 131.49 80.9401C131.133 81.6195 130.556 82.6714 130.205 83.2724C129.855 83.88 129.05 85.167 128.414 86.134C127.778 87.1074 126.785 88.5317 126.208 89.3026C125.63 90.08 124.715 91.2495 124.17 91.9028C123.625 92.5561 122.684 93.6472 122.067 94.3266C121.457 94.9995 120.231 96.267 119.348 97.1424C118.465 98.0114 117.07 99.3049 116.259 100.011C115.441 100.71 114.416 101.565 113.981 101.912C113.553 102.251 112.683 102.905 112.06 103.362C111.437 103.826 110.451 104.518 109.873 104.904C109.296 105.296 108.413 105.871 107.907 106.184C107.401 106.498 106.336 107.125 105.545 107.576C104.753 108.027 103.39 108.739 102.527 109.164C101.664 109.588 100.561 110.098 100.08 110.3C99.6002 110.503 98.6138 110.895 97.8934 111.182C97.1731 111.463 95.8297 111.927 94.9212 112.221C94.0061 112.509 92.8185 112.861 91.3129 113.253L91.1183 114.135C91.0079 114.619 90.7873 115.488 90.6186 116.069C90.4498 116.651 90.0994 117.702 89.8333 118.402C89.5672 119.107 89.0156 120.375 88.6068 121.217C88.1979 122.067 87.5879 123.236 87.2504 123.818C86.9065 124.399 86.3484 125.288 86.0109 125.797C85.6735 126.307 85.1024 127.117 84.739 127.6C84.3756 128.084 83.6876 128.959 83.2074 129.541C82.7272 130.122 81.6629 131.272 80.8452 132.095C80.021 132.918 78.9567 133.918 78.4765 134.323C77.9963 134.728 77.1526 135.401 76.601 135.832C76.0429 136.257 75.0824 136.936 74.4529 137.348C73.8299 137.759 72.863 138.354 72.3114 138.674C71.7597 138.988 70.9356 139.432 70.4748 139.667C70.0205 139.896 69.2937 140.236 68.8589 140.432C68.4241 140.621 67.6583 140.935 67.1521 141.124C66.6459 141.32 65.6465 141.653 64.9262 141.862C64.1993 142.071 63.1415 142.346 62.5639 142.47C61.9864 142.594 61.0584 142.764 60.5067 142.849C59.6696 142.98 58.9687 143.006 56.3534 142.999C53.459 142.993 53.0632 142.973 51.4537 142.757C50.4933 142.627 48.8384 142.346 47.7806 142.13C46.7228 141.915 45.3081 141.581 44.6331 141.392C43.9582 141.196 42.7641 140.824 41.9659 140.562C41.1742 140.294 39.9541 139.857 39.2532 139.576C38.5589 139.295 37.4946 138.85 36.8975 138.583C36.294 138.321 35.2881 137.844 34.6651 137.531C34.0421 137.211 32.8999 136.597 32.1277 136.159C31.3619 135.728 30.317 135.107 29.8109 134.793C29.3047 134.48 28.4221 133.905 27.8445 133.519C27.2669 133.127 26.2805 132.435 25.6575 131.978C25.0345 131.52 24.1649 130.86 23.7366 130.521C23.3018 130.181 22.2764 129.325 21.4587 128.619C20.641 127.914 19.2328 126.607 18.3242 125.712C17.4157 124.811 16.2086 123.563 15.644 122.936C15.0729 122.308 14.1449 121.237 13.5868 120.557C13.0222 119.878 12.1072 118.715 11.5426 117.964C10.9845 117.212 10.0889 115.945 9.55677 115.141C9.02462 114.344 8.23288 113.097 7.79808 112.371C7.36976 111.646 6.70133 110.457 6.31196 109.732C5.92907 109.007 5.2866 107.713 4.89073 106.87C4.49486 106.021 3.88484 104.597 3.5344 103.702C3.17747 102.807 2.69075 101.474 2.45063 100.749C2.21701 100.024 1.86008 98.8541 1.67188 98.1551C1.47719 97.4495 1.18516 96.2213 1.00994 95.4242C0.841211 94.6271 0.601095 93.3205 0.477792 92.5169C0.360979 91.7199 0.192249 90.3348 0.114373 89.4398C0.00404966 88.1658 -0.0219088 87.1858 0.0170289 84.9907C0.0429874 83.2332 0.114374 81.724 0.198739 80.9858C0.276615 80.3325 0.438854 79.1957 0.562156 78.4574C0.678969 77.7192 0.899618 76.5693 1.04239 75.9029C1.19165 75.2366 1.4123 74.3154 1.5356 73.8515C1.6589 73.3942 1.89253 72.5645 2.06126 72.0026C2.2235 71.4473 2.5999 70.317 2.89193 69.4939C3.18396 68.6707 3.68366 67.3836 3.99516 66.6323C4.31316 65.8875 5.01403 64.3783 5.55267 63.2873C6.0978 62.2028 6.92198 60.6544 7.38274 59.8574C7.85 59.0603 8.71312 57.6687 9.30367 56.7737C9.88774 55.8786 10.7379 54.6504 11.1857 54.0428C11.6334 53.4417 12.4771 52.3507 13.0676 51.6255C13.6517 50.9003 14.5148 49.8681 14.9821 49.3389C15.4493 48.8031 16.5915 47.601 17.513 46.6668C18.4346 45.726 19.8363 44.3867 20.628 43.6811C21.4198 42.9755 22.523 42.0347 23.0811 41.5905C23.6327 41.1462 24.5543 40.4276 25.1318 39.9898C25.7094 39.5521 26.8321 38.7551 27.6239 38.2193C28.4221 37.6901 29.6616 36.8996 30.3819 36.4619C31.1023 36.0242 32.3223 35.3317 33.0881 34.9135C33.8604 34.5019 35.0804 33.8878 35.8008 33.5481C36.5211 33.2149 37.4881 32.7772 37.9423 32.5812C38.4031 32.3917 39.4609 31.9736 40.3046 31.6534C41.1482 31.3399 42.563 30.8629 43.452 30.6016C44.3411 30.3337 45.3794 30.0463 45.7494 29.9548C46.2231 29.8437 46.4308 29.7523 46.4308 29.6608C46.4243 29.5889 46.567 28.9552 46.7358 28.2496C46.911 27.5506 47.229 26.4399 47.4431 25.7866C47.6638 25.1333 48.0337 24.1337 48.2673 23.5653C48.5074 22.9904 49.0201 21.8863 49.4095 21.0958C49.8054 20.3118 50.357 19.273 50.649 18.7895C50.941 18.2995 51.5186 17.3914 51.9469 16.7642C52.3688 16.1305 53.0567 15.1832 53.4785 14.6475C53.8938 14.1183 54.6207 13.2428 55.0879 12.7136C55.5617 12.1779 56.5091 11.1849 57.197 10.5119C57.8849 9.83249 58.787 8.99624 59.1958 8.64998C59.6047 8.31025 60.3315 7.71573 60.8118 7.33681C61.292 6.95788 62.2979 6.24576 63.0442 5.74923C63.7905 5.25271 64.9132 4.56019 65.5362 4.21393C66.1592 3.86113 67.243 3.30581 67.9374 2.97915C68.6382 2.65249 69.7415 2.18863 70.3904 1.9469C71.0394 1.70517 71.9025 1.40464 72.3114 1.28051C72.7202 1.14985 73.5509 0.93425 74.1479 0.790519C74.7514 0.646789 75.5756 0.470392 75.9845 0.391993C76.3933 0.313595 77.1786 0.195997 77.7367 0.130664C78.3013 0.058799 79.703 0.00653322 80.9296 0ZM77.9963 14.3339C77.4901 14.4384 76.5491 14.7063 75.9001 14.9219C75.2511 15.144 74.1285 15.6144 73.4081 15.9672C72.6878 16.3265 71.5651 16.9733 70.9161 17.4045C70.2671 17.8292 69.3196 18.5151 68.8134 18.9202C68.3073 19.3253 67.3403 20.2138 66.6654 20.8932C65.9905 21.5727 65.1079 22.5461 64.7055 23.0557C64.3032 23.5653 63.6347 24.493 63.2259 25.1268C62.8106 25.754 62.194 26.845 61.8436 27.5441C61.4932 28.2496 61.2271 28.8442 61.2401 28.8638C61.2595 28.8899 61.4477 28.9422 61.6554 28.9814C61.8631 29.0206 62.6483 29.1904 63.3946 29.3603C64.1409 29.5367 65.322 29.8699 66.0164 30.0985C66.7108 30.3337 67.7167 30.6996 68.2489 30.9217C68.7745 31.1373 69.6441 31.5293 70.1698 31.7776C70.7019 32.0324 71.6235 32.5158 72.227 32.849C72.824 33.1888 73.9273 33.8682 74.6736 34.3647C75.4199 34.8613 76.4258 35.5734 76.906 35.9523C77.3862 36.3312 78.1131 36.9192 78.5219 37.2655C78.9308 37.6117 79.8263 38.448 80.5207 39.1209C81.2086 39.8004 82.1626 40.7934 82.6298 41.3226C83.0971 41.8583 83.7915 42.6881 84.1744 43.1715C84.5508 43.655 85.1413 44.452 85.4788 44.9355C85.8098 45.4189 86.3938 46.3075 86.7702 46.9151C87.1466 47.5226 87.8215 48.7509 88.2693 49.6459C88.7171 50.541 89.2622 51.7104 89.4764 52.2396C89.697 52.7753 90.0345 53.6835 90.2292 54.2649C90.4239 54.8464 90.7419 55.9374 90.9301 56.6887C91.1183 57.4401 91.3584 58.5442 91.4557 59.1518C91.5531 59.7594 91.6764 60.6675 91.7283 61.1771C91.7867 61.7781 91.8126 68.4224 91.8126 80.2606C91.8126 97.5148 91.8191 98.4164 91.9684 98.3641C92.0528 98.338 92.4941 98.1747 92.9483 97.9983C93.4091 97.8284 94.415 97.4038 95.1808 97.0575C95.953 96.7178 97.2315 96.084 98.0232 95.6529C98.8149 95.2217 99.8792 94.6075 100.385 94.294C100.892 93.9804 101.716 93.4446 102.222 93.1049C102.728 92.7652 103.65 92.1053 104.279 91.6349C104.902 91.1645 105.843 90.4132 106.375 89.969C106.901 89.5247 107.965 88.5774 108.725 87.8653C109.49 87.1597 110.697 85.9445 111.411 85.167C112.119 84.3896 113.047 83.3443 113.469 82.8347C113.884 82.3251 114.565 81.4562 114.987 80.8943C115.402 80.339 116.006 79.4962 116.324 79.0258C116.648 78.5554 117.174 77.7453 117.492 77.2226C117.81 76.7 118.336 75.7984 118.66 75.217C118.985 74.6355 119.445 73.7666 119.686 73.2831C119.932 72.7997 120.335 71.9242 120.581 71.3428C120.834 70.7613 121.198 69.8728 121.392 69.3632C121.587 68.8536 121.86 68.1023 121.996 67.6907C122.139 67.2791 122.405 66.371 122.593 65.6654C122.781 64.9663 123.034 63.8949 123.157 63.2873C123.274 62.6862 123.437 61.6736 123.521 61.0464C123.599 60.4127 123.69 59.2759 123.722 58.5115C123.755 57.7537 123.755 56.5058 123.722 55.7414C123.69 54.977 123.599 53.8403 123.514 53.2065C123.437 52.5794 123.261 51.5079 123.125 50.835C122.989 50.1555 122.768 49.2213 122.645 48.7639C122.515 48.3066 122.275 47.49 122.106 46.9608C121.944 46.4251 121.632 45.5365 121.418 44.9747C121.211 44.4194 120.86 43.57 120.646 43.0866C120.432 42.6031 119.991 41.6689 119.666 41.0156C119.342 40.3622 118.881 39.4737 118.634 39.036C118.394 38.5983 117.979 37.8861 117.719 37.4484C117.453 37.0172 116.921 36.181 116.532 35.5995C116.149 35.0181 115.493 34.0903 115.078 33.535C114.656 32.9732 113.988 32.1238 113.592 31.6404C113.189 31.1569 112.566 30.4252 112.197 30.0136C111.833 29.6085 111.08 28.7984 110.529 28.217C109.977 27.6421 108.952 26.649 108.257 26.0153C107.556 25.375 106.577 24.5192 106.07 24.101C105.564 23.6895 104.701 23.01 104.143 22.5984C103.591 22.1868 102.767 21.5988 102.306 21.2918C101.852 20.9847 100.866 20.364 100.119 19.9133C99.3795 19.4559 98.1206 18.7569 97.3223 18.3518C96.5306 17.9468 95.3495 17.3914 94.7005 17.1105C94.0516 16.8296 92.9289 16.3918 92.2085 16.124C91.4882 15.8627 90.346 15.4903 89.6711 15.3073C88.9962 15.1179 88.0811 14.8827 87.6398 14.7847C87.192 14.6867 86.3484 14.5299 85.7578 14.4319C85.1673 14.3404 84.1549 14.2163 83.5059 14.1706C82.857 14.1183 81.9939 14.066 81.585 14.053C81.1762 14.0399 80.4039 14.0595 79.8782 14.0922C79.3461 14.1248 78.5024 14.2359 77.9963 14.3339ZM60.046 81.5607C60.1498 82.0899 60.338 82.8804 60.4613 83.3181C60.5911 83.7559 60.8312 84.468 61.0064 84.9057C61.1752 85.3369 61.5386 86.1536 61.8112 86.7089C62.0837 87.2642 62.4991 88.0351 62.7392 88.4271C62.9728 88.8126 63.4011 89.4659 63.6867 89.8775C63.9787 90.2891 64.433 90.9032 64.7055 91.2429C64.9781 91.5827 65.5492 92.236 65.971 92.6933C66.3928 93.1572 67.0937 93.8628 67.535 94.2678C67.9763 94.6794 68.6512 95.2609 69.0341 95.5745C69.417 95.8881 70.2671 96.5022 70.9161 96.9334C71.5651 97.3711 72.545 97.9591 73.1031 98.24C73.6547 98.521 74.5373 98.9325 75.0694 99.1481C75.5951 99.3703 76.3933 99.6512 76.8411 99.7753C77.2824 99.8995 77.7042 100.004 77.7756 100.004C77.8924 100.004 77.9054 97.8676 77.8794 81.1818C77.8535 62.4184 77.8535 62.3596 77.6718 61.3992C77.5679 60.8635 77.3473 59.975 77.1786 59.4131C77.0098 58.8578 76.6918 57.9693 76.4712 57.4335C76.2441 56.9043 75.8547 56.0681 75.5951 55.5846C75.3355 55.1012 74.8163 54.2323 74.4335 53.6508C74.0571 53.0693 73.4146 52.1743 73.0122 51.6712C72.6034 51.1616 71.7208 50.1882 71.0459 49.5087C70.371 48.8293 69.4105 47.9408 68.9043 47.5357C68.3981 47.1241 67.4506 46.4447 66.8017 46.0135C66.1527 45.5823 65.0689 44.9616 64.4005 44.6219C63.7256 44.2887 62.7392 43.8575 62.2135 43.668C61.6814 43.4786 60.9935 43.2564 60.682 43.178C60.3705 43.0996 60.046 43.0082 59.9681 42.9886C59.8253 42.9428 59.8188 44.1188 59.8383 61.7651C59.8643 80.5807 59.8643 80.5873 60.046 81.5607ZM42.4461 45.9677C42.0633 46.1376 41.2391 46.5296 40.6096 46.8497C39.9866 47.1633 38.9417 47.7252 38.2928 48.1041C37.6438 48.4765 36.5406 49.1625 35.8462 49.6198C35.1453 50.0837 34.1265 50.7958 33.5748 51.2074C33.0167 51.619 32.1536 52.2984 31.6474 52.7165C31.1412 53.1347 30.2197 53.9317 29.5902 54.4936C28.9672 55.062 27.9418 56.0485 27.3188 56.7018C26.6958 57.3486 25.8846 58.211 25.5212 58.6226C25.1513 59.0342 24.5283 59.7659 24.126 60.2493C23.7301 60.7393 23.0617 61.5887 22.6398 62.144C22.2245 62.6993 21.5561 63.6532 21.1537 64.2607C20.7514 64.8618 20.1154 65.8744 19.7325 66.5016C19.3561 67.1354 18.6812 68.3832 18.2269 69.2783C17.7791 70.1733 17.247 71.284 17.0458 71.7413C16.8446 72.1986 16.4942 73.0741 16.267 73.6816C16.0334 74.2827 15.7089 75.2365 15.5337 75.7919C15.365 76.3472 15.1378 77.1116 15.0405 77.484C14.9367 77.8629 14.7614 78.6142 14.6446 79.1565C14.5278 79.7053 14.3461 80.7637 14.2423 81.515C14.1384 82.2663 14.0281 83.5207 13.9957 84.3112C13.9632 85.0952 13.9632 86.3822 13.9957 87.1727C14.0281 87.9567 14.1384 89.2176 14.2423 89.9624C14.3461 90.7137 14.5408 91.844 14.6771 92.4777C14.8198 93.1049 15.0729 94.1372 15.2482 94.7643C15.4234 95.3915 15.7803 96.4826 16.0334 97.1816C16.2865 97.8872 16.7408 99.0371 17.0393 99.7361C17.3443 100.442 17.7856 101.409 18.0257 101.892C18.2723 102.382 18.7396 103.271 19.077 103.878C19.4145 104.479 19.9077 105.335 20.1738 105.766C20.4398 106.204 20.959 106.995 21.3159 107.53C21.6794 108.059 22.3154 108.955 22.7307 109.51C23.146 110.065 23.8339 110.941 24.2493 111.45C24.6711 111.953 25.5796 112.985 26.261 113.737C26.9489 114.488 28.156 115.703 28.9477 116.435C29.733 117.173 30.8103 118.14 31.3424 118.584C31.8681 119.029 32.8156 119.774 33.4386 120.244C34.068 120.714 34.9896 121.381 35.4958 121.72C36.0019 122.06 36.7483 122.544 37.1571 122.798C37.5659 123.06 38.3707 123.53 38.9482 123.857C39.5258 124.183 40.376 124.641 40.8302 124.869C41.2845 125.105 42.1541 125.51 42.7576 125.771C43.3547 126.039 44.3411 126.444 44.9382 126.673C45.5417 126.908 46.4892 127.234 47.0408 127.404C47.5924 127.581 48.3387 127.796 48.7021 127.894C49.0591 127.992 49.734 128.156 50.1883 128.26C50.6425 128.358 51.3953 128.502 51.8496 128.574C52.3039 128.652 53.2319 128.77 53.9068 128.842C54.5752 128.913 55.7758 128.972 56.574 128.972C57.3658 128.972 58.3068 128.933 58.6702 128.874C59.0336 128.822 59.7994 128.659 60.377 128.515C60.9545 128.371 61.876 128.071 62.4342 127.849C62.9858 127.633 63.9268 127.202 64.5303 126.895C65.1338 126.588 66.0943 126.019 66.6719 125.64C67.2495 125.255 68.0736 124.667 68.5084 124.327C68.9432 123.987 69.6701 123.36 70.1243 122.936C70.5851 122.511 71.3444 121.74 71.8181 121.23C72.2854 120.714 72.9603 119.917 73.3108 119.46C73.6612 118.996 74.2128 118.225 74.5308 117.742C74.8553 117.258 75.4069 116.278 75.7703 115.56C76.1272 114.847 76.4258 114.233 76.4258 114.201C76.4258 114.161 75.9001 114.018 75.2641 113.881C74.6282 113.743 73.5184 113.462 72.7916 113.247C72.0712 113.038 71.0524 112.698 70.5202 112.502C69.9881 112.3 68.9497 111.849 68.2034 111.502C67.4571 111.156 66.2955 110.562 65.6206 110.183C64.9521 109.804 63.8878 109.157 63.2648 108.739C62.6353 108.327 61.6749 107.641 61.1168 107.217C60.5651 106.792 59.7215 106.113 59.2413 105.707C58.761 105.309 57.6967 104.303 56.8726 103.48C56.0549 102.656 54.9906 101.507 54.5103 100.925C54.0301 100.344 53.3422 99.4748 52.9788 98.9913C52.6154 98.5079 52.0443 97.6912 51.7068 97.1816C51.3694 96.6786 50.8242 95.8031 50.4933 95.2478C50.1688 94.6925 49.5782 93.5818 49.1888 92.7848C48.7995 91.9812 48.3063 90.8967 48.0986 90.361C47.8909 89.8318 47.5664 88.9171 47.3718 88.3357C47.1836 87.7542 46.898 86.7481 46.7358 86.0948C46.5735 85.4349 46.3659 84.4092 46.262 83.8016C46.1647 83.2005 46.0414 82.2859 45.9895 81.7763C45.9311 81.1753 45.8986 74.544 45.9051 62.7385C45.9051 48.3066 45.8791 44.6284 45.7948 44.6284C45.7364 44.635 45.1134 44.8636 44.419 45.1445C43.7181 45.4255 42.8355 45.7979 42.4461 45.9677Z" fill="white"/>
                    <path d="M377.089 103.776C388.273 103.776 397.22 95.9518 397.22 78.4032C397.22 60.8547 390.062 51.5775 377.089 51.5775C364.004 51.5775 356.735 60.8547 356.735 78.4032C356.735 95.9518 364.228 103.776 377.089 103.776ZM377.089 117.077C354.274 117.077 341.413 103.105 341.413 78.0679C341.413 52.9188 354.274 37.8293 377.089 37.8293C399.904 37.8293 412.541 52.9188 412.541 78.4032C412.541 103.888 399.904 117.077 377.089 117.077Z" fill="white"/>
                    <path d="M496.298 114.506H482.095V81.1976C482.095 74.6029 478.628 69.9084 473.484 69.9084C468.115 69.9084 464.201 74.9382 464.201 81.6447V114.506H449.662V81.4211C449.662 72.591 447.314 70.3555 440.939 70.3555C435.124 70.3555 432.104 73.9323 432.104 81.0858V114.506H417.565V59.5134H431.209V67.5612C434.9 60.2959 440.044 58.0604 447.314 58.0604C454.807 58.0604 458.386 60.4076 462.635 66.7787C465.655 60.7429 470.576 58.0604 477.51 58.0604C488.582 58.0604 496.298 66.1081 496.298 76.3913V114.506Z" fill="white"/>
                    <path d="M551.759 114.506H537.108V81.1976C537.108 72.7028 534.648 70.3555 527.714 70.3555C520.109 70.3555 516.418 74.6029 516.418 82.986V114.506H501.88V59.5134H515.747V67.5612C519.102 61.4136 524.694 58.0604 533.529 58.0604C544.042 58.0604 551.759 64.4315 551.759 76.3913V114.506Z" fill="white"/>
                    <path d="M573 114.506H558.461V59.5134H573V114.506ZM573 52.9188H558.461V39.3941H573V52.9188Z" fill="white"/>
                  </svg>
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
                      <DropdownMenuItem onClick={() => setViewMode('kanban')}>
                        <LayoutGrid className="h-4 w-4 mr-2" />
                        Kanban
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
                      <DropdownMenuItem onClick={() => setShowServerDownload(true)}>
                        <Server className="h-4 w-4 mr-2" />
                        Servidor
                      </DropdownMenuItem>
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
            )}

            {/* Channel Selector - hidden on mobile, shown in header instead */}
            {!isMobile && (
              <ChannelSelector
                sessions={sessions}
                selectedSessionId={selectedSessionId}
                onSelectSession={(id) => {
                  setSelectedSessionId(id);
                  loadConversations();
                }}
                onAddNew={() => setShowQRModal(true)}
                onSessionDeleted={() => {
                  loadSessions();
                  loadConversations();
                }}
              />
            )}
            
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
        <ScrollArea className="flex-1">
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
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isGroupConversation(conversation) && (
                            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="font-medium truncate">
                            {getDisplayName(conversation)}
                          </span>
                          {/* AI Badge */}
                          {conversation.assigned_agent_id && conversation.ai_auto_reply_enabled && (
                            <Badge className="bg-orange-100 text-[#FF4500] dark:bg-orange-900/30 dark:text-orange-300 text-[10px] px-1.5 py-0 gap-1">
                              <Sparkles className="h-2.5 w-2.5" />
                              IA
                            </Badge>
                          )}
                          {/* Chatbot Badge */}
                          {chatbotActiveConvIds.has(conversation.id) && !(conversation.assigned_agent_id && conversation.ai_auto_reply_enabled) && (
                            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] px-1.5 py-0 gap-1">
                              <GitBranch className="h-2.5 w-2.5" />
                              Bot
                            </Badge>
                          )}
                          {/* Labels next to name */}
                          {conversation.labels && conversation.labels.length > 0 && (
                            <div className="flex items-center gap-1 flex-shrink-0">
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
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatTime(conversation.last_message_at)}
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
