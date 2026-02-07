export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_agents: {
        Row: {
          avatar_url: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          instructions: string
          is_active: boolean | null
          model: string | null
          name: string
          personality: string
          settings: Json | null
          updated_at: string
          whatsapp_enabled: boolean | null
          whatsapp_session_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          instructions: string
          is_active?: boolean | null
          model?: string | null
          name: string
          personality: string
          settings?: Json | null
          updated_at?: string
          whatsapp_enabled?: boolean | null
          whatsapp_session_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          instructions?: string
          is_active?: boolean | null
          model?: string | null
          name?: string
          personality?: string
          settings?: Json | null
          updated_at?: string
          whatsapp_enabled?: boolean | null
          whatsapp_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_whatsapp_session_id_fkey"
            columns: ["whatsapp_session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_schedules: {
        Row: {
          company_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_links: {
        Row: {
          buffer_minutes: number
          company_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          expires_at: string | null
          id: string
          is_active: boolean
          link_slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buffer_minutes?: number
          company_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buffer_minutes?: number
          company_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          assigned_user_id: string | null
          attendees: Json | null
          audio_url: string | null
          color: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          google_event_id: string | null
          id: string
          is_all_day: boolean | null
          meeting_data: Json | null
          meeting_link: string | null
          meeting_provider:
            | Database["public"]["Enums"]["meeting_provider"]
            | null
          recurrence_rule: string | null
          source: string | null
          start_date: string
          status: string | null
          sync_status: string | null
          title: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          attendees?: Json | null
          audio_url?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          google_event_id?: string | null
          id?: string
          is_all_day?: boolean | null
          meeting_data?: Json | null
          meeting_link?: string | null
          meeting_provider?:
            | Database["public"]["Enums"]["meeting_provider"]
            | null
          recurrence_rule?: string | null
          source?: string | null
          start_date: string
          status?: string | null
          sync_status?: string | null
          title: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          attendees?: Json | null
          audio_url?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          google_event_id?: string | null
          id?: string
          is_all_day?: boolean | null
          meeting_data?: Json | null
          meeting_link?: string | null
          meeting_provider?:
            | Database["public"]["Enums"]["meeting_provider"]
            | null
          recurrence_rule?: string | null
          source?: string | null
          start_date?: string
          status?: string | null
          sync_status?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_executions: {
        Row: {
          completed_at: string | null
          contact_phone: string | null
          conversation_id: string | null
          current_node_id: string | null
          execution_path: Json | null
          flow_id: string
          id: string
          started_at: string
          status: string
          variables: Json | null
        }
        Insert: {
          completed_at?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          current_node_id?: string | null
          execution_path?: Json | null
          flow_id: string
          id?: string
          started_at?: string
          status?: string
          variables?: Json | null
        }
        Update: {
          completed_at?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          current_node_id?: string | null
          execution_path?: Json | null
          flow_id?: string
          id?: string
          started_at?: string
          status?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "chatbot_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_flows: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          edges: Json
          execution_count: number | null
          id: string
          is_active: boolean | null
          name: string
          nodes: Json
          trigger_config: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          edges?: Json
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          nodes?: Json
          trigger_config?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          edges?: Json
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          nodes?: Json
          trigger_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_flows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          interaction_date: string
          interaction_type: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          interaction_date?: string
          interaction_type: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_interactions_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_interactions_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_city: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          annual_revenue: number | null
          avatar_url: string | null
          birth_date: string | null
          client_type: string | null
          cnpj_cpf: string | null
          company_id: string
          company_name: string | null
          company_size: string | null
          created_at: string
          created_by: string
          email: string | null
          facebook: string | null
          id: string
          industry: string | null
          instagram: string | null
          linkedin: string | null
          name: string
          notes: string | null
          phone: string | null
          profession: string | null
          status: string
          tags: string[] | null
          updated_at: string
          website: string | null
          whatsapp: string | null
          whatsapp_business: string | null
        }
        Insert: {
          address_city?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          annual_revenue?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          client_type?: string | null
          cnpj_cpf?: string | null
          company_id: string
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          facebook?: string | null
          id?: string
          industry?: string | null
          instagram?: string | null
          linkedin?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          profession?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          whatsapp_business?: string | null
        }
        Update: {
          address_city?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          annual_revenue?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          client_type?: string | null
          cnpj_cpf?: string | null
          company_id?: string
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          facebook?: string | null
          id?: string
          industry?: string | null
          instagram?: string | null
          linkedin?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          profession?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          whatsapp_business?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_clients_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          name: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          permissions: Json | null
          role: Database["public"]["Enums"]["company_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_labels: {
        Row: {
          color: string
          company_id: string
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_labels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_visible: boolean | null
          position: number
          settings: Json | null
          size: string | null
          updated_at: string | null
          user_id: string
          widget_type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          position?: number
          settings?: Json | null
          size?: string | null
          updated_at?: string | null
          user_id: string
          widget_type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          position?: number
          settings?: Json | null
          size?: string | null
          updated_at?: string | null
          user_id?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          token: string
        }
        Update: {
          created_at?: string | null
          id?: string
          token?: string
        }
        Relationships: []
      }
      document_files: {
        Row: {
          created_at: string
          document_id: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          original_filename: string
        }
        Insert: {
          created_at?: string
          document_id: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          original_filename: string
        }
        Update: {
          created_at?: string
          document_id?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          original_filename?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_files_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_folders_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_folders_parent"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tracking_events: {
        Row: {
          browser: string | null
          data: Json | null
          device_type: string | null
          document_id: string
          duration_seconds: number | null
          event_type: string
          id: string
          ip_address: unknown
          os: string | null
          page_number: number | null
          referrer: string | null
          screen_resolution: string | null
          scroll_depth: number | null
          session_id: string
          timestamp: string
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          data?: Json | null
          device_type?: string | null
          document_id: string
          duration_seconds?: number | null
          event_type: string
          id?: string
          ip_address?: unknown
          os?: string | null
          page_number?: number | null
          referrer?: string | null
          screen_resolution?: string | null
          scroll_depth?: number | null
          session_id: string
          timestamp?: string
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          data?: Json | null
          device_type?: string | null
          document_id?: string
          duration_seconds?: number | null
          event_type?: string
          id?: string
          ip_address?: unknown
          os?: string | null
          page_number?: number | null
          referrer?: string | null
          screen_resolution?: string | null
          scroll_depth?: number | null
          session_id?: string
          timestamp?: string
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_tracking_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "trackable_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          file_size: number | null
          file_type: string
          file_url: string | null
          folder_id: string | null
          id: string
          name: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          file_size?: number | null
          file_type: string
          file_url?: string | null
          folder_id?: string | null
          id?: string
          name: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string | null
          folder_id?: string | null
          id?: string
          name?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_documents_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_folder"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_designs: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          design_data: Json
          id: string
          is_published: boolean
          name: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          design_data?: Json
          id?: string
          is_published?: boolean
          name: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          design_data?: Json
          id?: string
          is_published?: boolean
          name?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_events: {
        Row: {
          email_id: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          email_id: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          email_id?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_limits: {
        Row: {
          company_id: string
          created_at: string | null
          daily_limit: number
          date: string
          id: string
          sent_count: number
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          daily_limit?: number
          date?: string
          id?: string
          sent_count?: number
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          daily_limit?: number
          date?: string
          id?: string
          sent_count?: number
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string
          company_id: string
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          preview_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          preview_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          preview_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emails: {
        Row: {
          campaign_id: string | null
          content_html: string
          content_text: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string
          status: string
          subject: string
          tracking_pixel_id: string
        }
        Insert: {
          campaign_id?: string | null
          content_html: string
          content_text?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string
          status?: string
          subject: string
          tracking_pixel_id?: string
        }
        Update: {
          campaign_id?: string | null
          content_html?: string
          content_text?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string
          status?: string
          subject?: string
          tracking_pixel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notification_settings: {
        Row: {
          company_id: string
          created_at: string
          event_id: string
          id: string
          notification_at_start: boolean
          notifications_enabled: boolean
          reminder_minutes: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_id: string
          id?: string
          notification_at_start?: boolean
          notifications_enabled?: boolean
          reminder_minutes?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_id?: string
          id?: string
          notification_at_start?: boolean
          notifications_enabled?: boolean
          reminder_minutes?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          company_id: string
          created_at: string
          date: string
          id: string
          is_active: boolean
          name: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date: string
          id?: string
          is_active?: boolean
          name: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          is_active?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      in_person_meetings: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          duration_seconds: number | null
          file_url: string | null
          id: string
          speaker_mapping: Json | null
          title: string
          transcript: string | null
          transcript_with_timestamps: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          duration_seconds?: number | null
          file_url?: string | null
          id?: string
          speaker_mapping?: Json | null
          title: string
          transcript?: string | null
          transcript_with_timestamps?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          duration_seconds?: number | null
          file_url?: string | null
          id?: string
          speaker_mapping?: Json | null
          title?: string
          transcript?: string | null
          transcript_with_timestamps?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_funnel_steps: {
        Row: {
          content: Json | null
          created_at: string | null
          description: string | null
          funnel_id: string
          id: string
          position: number
          required: boolean | null
          step_type: string
          title: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          description?: string | null
          funnel_id: string
          id?: string
          position: number
          required?: boolean | null
          step_type: string
          title?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          description?: string | null
          funnel_id?: string
          id?: string
          position?: number
          required?: boolean | null
          step_type?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_funnel_steps_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "lead_funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_funnels: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_step_events: {
        Row: {
          event_type: string
          funnel_id: string
          id: string
          metadata: Json | null
          step_id: string | null
          submission_id: string | null
          timestamp: string | null
        }
        Insert: {
          event_type: string
          funnel_id: string
          id?: string
          metadata?: Json | null
          step_id?: string | null
          submission_id?: string | null
          timestamp?: string | null
        }
        Update: {
          event_type?: string
          funnel_id?: string
          id?: string
          metadata?: Json | null
          step_id?: string | null
          submission_id?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      lead_submissions: {
        Row: {
          answers: Json | null
          completed_at: string | null
          current_step: number | null
          funnel_id: string
          id: string
          metadata: Json | null
          session_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          current_step?: number | null
          funnel_id: string
          id?: string
          metadata?: Json | null
          session_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          current_step?: number | null
          funnel_id?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_submissions_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "lead_funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          browser: string | null
          city: string | null
          clicked_at: string
          country: string | null
          device_type: string | null
          id: string
          ip_address: unknown
          link_id: string
          os: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          link_id: string
          os?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          link_id?: string
          os?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "tracked_links"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_audio_settings: {
        Row: {
          audio_type: string
          audio_url: string
          company_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          audio_type: string
          audio_url: string
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          audio_type?: string
          audio_url?: string
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_audio_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_integrations: {
        Row: {
          access_token: string | null
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          provider: Database["public"]["Enums"]["meeting_provider"]
          provider_email: string | null
          provider_user_id: string | null
          redirect_uri: string | null
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: Database["public"]["Enums"]["meeting_provider"]
          provider_email?: string | null
          provider_user_id?: string | null
          redirect_uri?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: Database["public"]["Enums"]["meeting_provider"]
          provider_email?: string | null
          provider_user_id?: string | null
          redirect_uri?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_recordings: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          duration_seconds: number | null
          file_size: number | null
          file_url: string
          id: string
          livekit_recording_id: string | null
          room_id: string
          speaker_mapping: Json | null
          title: string
          transcript: string | null
          transcript_with_timestamps: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          file_size?: number | null
          file_url: string
          id?: string
          livekit_recording_id?: string | null
          room_id: string
          speaker_mapping?: Json | null
          title: string
          transcript?: string | null
          transcript_with_timestamps?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          file_size?: number | null
          file_url?: string
          id?: string
          livekit_recording_id?: string | null
          room_id?: string
          speaker_mapping?: Json | null
          title?: string
          transcript?: string | null
          transcript_with_timestamps?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_recordings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "meeting_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_rooms: {
        Row: {
          chat_enabled: boolean | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          ended_at: string | null
          id: string
          is_active: boolean | null
          is_locked: boolean | null
          max_participants: number | null
          password_hash: string | null
          recording_enabled: boolean | null
          room_code: string
          screen_sharing_enabled: boolean | null
          started_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          chat_enabled?: boolean | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          max_participants?: number | null
          password_hash?: string | null
          recording_enabled?: boolean | null
          room_code: string
          screen_sharing_enabled?: boolean | null
          started_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          chat_enabled?: boolean | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          max_participants?: number | null
          password_hash?: string | null
          recording_enabled?: boolean | null
          room_code?: string
          screen_sharing_enabled?: boolean | null
          started_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          calendar_notifications_enabled: boolean
          company_id: string
          created_at: string
          default_reminder_minutes: number
          event_start_notifications: boolean
          id: string
          reminder_notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_notifications_enabled?: boolean
          company_id: string
          created_at?: string
          default_reminder_minutes?: number
          event_start_notifications?: boolean
          id?: string
          reminder_notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_notifications_enabled?: boolean
          company_id?: string
          created_at?: string
          default_reminder_minutes?: number
          event_start_notifications?: boolean
          id?: string
          reminder_notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_booking_links: {
        Row: {
          background_color: string | null
          buffer_minutes: number
          company_id: string
          created_at: string
          custom_message: string | null
          description: string | null
          duration_minutes: number
          expires_at: string | null
          id: string
          is_active: boolean
          link_slug: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          background_color?: string | null
          buffer_minutes?: number
          company_id: string
          created_at?: string
          custom_message?: string | null
          description?: string | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_slug: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          background_color?: string | null
          buffer_minutes?: number
          company_id?: string
          created_at?: string
          custom_message?: string | null
          description?: string | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_slug?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_bookings: {
        Row: {
          booking_date: string
          booking_link_id: string
          booking_time: string
          client_email: string
          client_name: string
          client_phone: string | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          booking_link_id: string
          booking_time: string
          client_email: string
          client_name: string
          client_phone?: string | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          booking_link_id?: string
          booking_time?: string
          client_email?: string
          client_name?: string
          client_phone?: string | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_bookings_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "public_booking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_consents: {
        Row: {
          consented: boolean
          created_at: string
          id: string
          participant_name: string
          room_id: string
        }
        Insert: {
          consented: boolean
          created_at?: string
          id?: string
          participant_name: string
          room_id: string
        }
        Update: {
          consented?: boolean
          created_at?: string
          id?: string
          participant_name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_consents_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "meeting_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string | null
          participant_id: string
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string | null
          participant_id: string
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string | null
          participant_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_chat_messages_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "room_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "meeting_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_participants: {
        Row: {
          audio_enabled: boolean | null
          connection_status: string | null
          display_name: string
          id: string
          is_host: boolean | null
          is_moderator: boolean | null
          joined_at: string
          left_at: string | null
          peer_id: string
          room_id: string
          screen_sharing: boolean | null
          updated_at: string | null
          user_id: string | null
          video_enabled: boolean | null
          waiting_approval: boolean | null
        }
        Insert: {
          audio_enabled?: boolean | null
          connection_status?: string | null
          display_name: string
          id?: string
          is_host?: boolean | null
          is_moderator?: boolean | null
          joined_at?: string
          left_at?: string | null
          peer_id: string
          room_id: string
          screen_sharing?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          video_enabled?: boolean | null
          waiting_approval?: boolean | null
        }
        Update: {
          audio_enabled?: boolean | null
          connection_status?: string | null
          display_name?: string
          id?: string
          is_host?: boolean | null
          is_moderator?: boolean | null
          joined_at?: string
          left_at?: string | null
          peer_id?: string
          room_id?: string
          screen_sharing?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          video_enabled?: boolean | null
          waiting_approval?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "meeting_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_reactions: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          reaction_type: string
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          reaction_type: string
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          reaction_type?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_reactions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "room_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_reactions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "meeting_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_bookings: {
        Row: {
          booking_date: string
          booking_link_id: string
          booking_time: string
          client_email: string
          client_name: string
          client_phone: string | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          booking_link_id: string
          booking_time: string
          client_email: string
          client_name: string
          client_phone?: string | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          booking_link_id?: string
          booking_time?: string
          client_email?: string
          client_name?: string
          client_phone?: string | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_bookings_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_config: {
        Row: {
          id: number
          key: string | null
          value: string | null
        }
        Insert: {
          id?: number
          key?: string | null
          value?: string | null
        }
        Update: {
          id?: number
          key?: string | null
          value?: string | null
        }
        Relationships: []
      }
      task_routines: {
        Row: {
          assigned_user_id: string | null
          color: string | null
          company_id: string
          created_at: string | null
          created_by: string
          day_of_month: number | null
          days_of_week: number[] | null
          description: string | null
          duration_minutes: number | null
          frequency: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          priority: string | null
          time_of_day: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          color?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          description?: string | null
          duration_minutes?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          priority?: string | null
          time_of_day?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          description?: string | null
          duration_minutes?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          priority?: string | null
          time_of_day?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_routines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trackable_documents: {
        Row: {
          company_id: string
          created_at: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string
          original_filename: string
          public_link_id: string
          title: string
          tracking_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type: string
          original_filename: string
          public_link_id?: string
          title: string
          tracking_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string
          original_filename?: string
          public_link_id?: string
          title?: string
          tracking_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracked_links: {
        Row: {
          clicks: number | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          original_url: string
          short_code: string
          title: string | null
          unique_visitors: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clicks?: number | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          original_url: string
          short_code: string
          title?: string | null
          unique_visitors?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clicks?: number | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          original_url?: string
          short_code?: string
          title?: string | null
          unique_visitors?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_availability: {
        Row: {
          company_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_email_accounts: {
        Row: {
          access_token: string | null
          company_id: string
          connected_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          provider: Database["public"]["Enums"]["email_provider"]
          provider_user_id: string | null
          refresh_token: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          company_id: string
          connected_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          provider: Database["public"]["Enums"]["email_provider"]
          provider_user_id?: string | null
          refresh_token?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          company_id?: string
          connected_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          provider?: Database["public"]["Enums"]["email_provider"]
          provider_user_id?: string | null
          refresh_token?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_email_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          company_id: string
          granted_at: string | null
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["permission_type"]
          user_id: string
        }
        Insert: {
          company_id: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["permission_type"]
          user_id: string
        }
        Update: {
          company_id?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["permission_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sidebar_settings: {
        Row: {
          company_id: string
          created_at: string
          custom_favicon_url: string | null
          custom_logo_url: string | null
          id: string
          menu_groups: Json | null
          menu_order: Json | null
          sidebar_background_color: string | null
          sidebar_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          custom_favicon_url?: string | null
          custom_logo_url?: string | null
          id?: string
          menu_groups?: Json | null
          menu_order?: Json | null
          sidebar_background_color?: string | null
          sidebar_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          custom_favicon_url?: string | null
          custom_logo_url?: string | null
          id?: string
          menu_groups?: Json | null
          menu_order?: Json | null
          sidebar_background_color?: string | null
          sidebar_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_contacts: {
        Row: {
          business_name: string | null
          company_id: string
          created_at: string
          id: string
          is_business: boolean | null
          phone_number: string
          profile_picture: string | null
          push_name: string | null
          session_id: string | null
          updated_at: string
          wa_id: string
        }
        Insert: {
          business_name?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_business?: boolean | null
          phone_number: string
          profile_picture?: string | null
          push_name?: string | null
          session_id?: string | null
          updated_at?: string
          wa_id: string
        }
        Update: {
          business_name?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_business?: boolean | null
          phone_number?: string
          profile_picture?: string | null
          push_name?: string | null
          session_id?: string | null
          updated_at?: string
          wa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          ai_auto_reply_enabled: boolean | null
          assigned_agent_id: string | null
          assigned_to: string | null
          assigned_user_id: string | null
          company_id: string
          contact_id: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string
          id: string
          integration_id: string | null
          is_archived: boolean | null
          is_pinned: boolean | null
          labels: string[] | null
          last_message: string | null
          last_message_at: string | null
          notes: string | null
          pipeline_stage: string | null
          profile_picture: string | null
          session_id: string | null
          status: string | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          ai_auto_reply_enabled?: boolean | null
          assigned_agent_id?: string | null
          assigned_to?: string | null
          assigned_user_id?: string | null
          company_id: string
          contact_id?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          id?: string
          integration_id?: string | null
          is_archived?: boolean | null
          is_pinned?: boolean | null
          labels?: string[] | null
          last_message?: string | null
          last_message_at?: string | null
          notes?: string | null
          pipeline_stage?: string | null
          profile_picture?: string | null
          session_id?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          ai_auto_reply_enabled?: boolean | null
          assigned_agent_id?: string | null
          assigned_to?: string | null
          assigned_user_id?: string | null
          company_id?: string
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          id?: string
          integration_id?: string | null
          is_archived?: boolean | null
          is_pinned?: boolean | null
          labels?: string[] | null
          last_message?: string | null
          last_message_at?: string | null
          notes?: string | null
          pipeline_stage?: string | null
          profile_picture?: string | null
          session_id?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_integrations: {
        Row: {
          access_token: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          phone_number: string
          settings: Json | null
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          access_token: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          phone_number: string
          settings?: Json | null
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          access_token?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          phone_number?: string
          settings?: Json | null
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          company_id: string
          content: string | null
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          from_me: boolean
          id: string
          is_ai_response: boolean | null
          is_forwarded: boolean | null
          media_caption: string | null
          media_type: string | null
          media_url: string | null
          message_id: string | null
          message_type: string
          metadata: Json | null
          quoted_message_id: string | null
          reaction: string | null
          read_at: string | null
          recipient_name: string | null
          recipient_phone: string | null
          sender_name: string | null
          sender_phone: string | null
          session_id: string
          status: string
          timestamp: string
          wa_message_id: string | null
        }
        Insert: {
          company_id: string
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          from_me?: boolean
          id?: string
          is_ai_response?: boolean | null
          is_forwarded?: boolean | null
          media_caption?: string | null
          media_type?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          quoted_message_id?: string | null
          reaction?: string | null
          read_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          session_id: string
          status?: string
          timestamp?: string
          wa_message_id?: string | null
        }
        Update: {
          company_id?: string
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          from_me?: boolean
          id?: string
          is_ai_response?: boolean | null
          is_forwarded?: boolean | null
          media_caption?: string | null
          media_type?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          quoted_message_id?: string | null
          reaction?: string | null
          read_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          session_id?: string
          status?: string
          timestamp?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          baileys_server_url: string | null
          company_id: string
          connected_at: string | null
          created_at: string
          id: string
          instance_id: string | null
          instance_name: string
          last_seen_at: string | null
          phone_name: string | null
          phone_number: string | null
          profile_picture: string | null
          push_name: string | null
          qr_code: string | null
          session_data: Json | null
          settings: Json | null
          status: string
          updated_at: string
          user_id: string
          webhook_secret: string | null
        }
        Insert: {
          baileys_server_url?: string | null
          company_id: string
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name: string
          last_seen_at?: string | null
          phone_name?: string | null
          phone_number?: string | null
          profile_picture?: string | null
          push_name?: string | null
          qr_code?: string | null
          session_data?: Json | null
          settings?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          webhook_secret?: string | null
        }
        Update: {
          baileys_server_url?: string | null
          company_id?: string
          connected_at?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string
          last_seen_at?: string | null
          phone_name?: string | null
          phone_number?: string | null
          profile_picture?: string | null
          push_name?: string | null
          qr_code?: string | null
          session_data?: Json | null
          settings?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed?: boolean | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhook_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_card_assignments: {
        Row: {
          assigned_by: string
          card_id: string
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          card_id: string
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          card_id?: string
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_card_assignments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "workflow_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_card_attachments: {
        Row: {
          card_id: string
          company_id: string
          created_at: string
          file_size: number | null
          file_url: string
          filename: string
          id: string
          mime_type: string | null
          uploaded_by: string
        }
        Insert: {
          card_id: string
          company_id: string
          created_at?: string
          file_size?: number | null
          file_url: string
          filename: string
          id?: string
          mime_type?: string | null
          uploaded_by: string
        }
        Update: {
          card_id?: string
          company_id?: string
          created_at?: string
          file_size?: number | null
          file_url?: string
          filename?: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_card_attachments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "workflow_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_card_comments: {
        Row: {
          card_id: string
          comment: string
          company_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          comment: string
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          comment?: string
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_card_comments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "workflow_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_cards: {
        Row: {
          assigned_user_id: string | null
          checklist: Json | null
          column_id: string
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string | null
          start_date: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          checklist?: Json | null
          column_id: string
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          position: number
          priority?: string | null
          start_date?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          checklist?: Json | null
          column_id?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string | null
          start_date?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "workflow_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_columns: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          workflow_id: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          position: number
          updated_at?: string
          workflow_id: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_columns_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_groups: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          group_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          group_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "workflow_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      associate_existing_users_with_companies: {
        Args: never
        Returns: undefined
      }
      cleanup_meeting_rooms: { Args: never; Returns: undefined }
      increment_email_count: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: undefined
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_admin_or_manager: {
        Args: { company_id: string; user_id: string }
        Returns: boolean
      }
      is_participant_in_room: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_active: { Args: { _room_id: string }; Returns: boolean }
      is_room_creator: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_host: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_company: {
        Args: { company_id: string; user_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          _company_id: string
          _permission: Database["public"]["Enums"]["permission_type"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      company_role: "admin" | "manager" | "employee"
      email_provider: "gmail" | "outlook" | "yahoo"
      event_type: "meeting" | "appointment" | "reminder"
      meeting_provider: "google_meet" | "zoom" | "teams"
      permission_type:
        | "view_calendar"
        | "manage_calendar"
        | "view_clients"
        | "manage_clients"
        | "view_emails"
        | "send_emails"
        | "manage_email_campaigns"
        | "view_documents"
        | "manage_documents"
        | "view_meetings"
        | "create_meetings"
        | "view_tasks"
        | "manage_tasks"
        | "view_analytics"
        | "manage_settings"
        | "manage_users"
        | "view_crm"
        | "manage_crm"
        | "view_tracking"
        | "manage_tracking"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      company_role: ["admin", "manager", "employee"],
      email_provider: ["gmail", "outlook", "yahoo"],
      event_type: ["meeting", "appointment", "reminder"],
      meeting_provider: ["google_meet", "zoom", "teams"],
      permission_type: [
        "view_calendar",
        "manage_calendar",
        "view_clients",
        "manage_clients",
        "view_emails",
        "send_emails",
        "manage_email_campaigns",
        "view_documents",
        "manage_documents",
        "view_meetings",
        "create_meetings",
        "view_tasks",
        "manage_tasks",
        "view_analytics",
        "manage_settings",
        "manage_users",
        "view_crm",
        "manage_crm",
        "view_tracking",
        "manage_tracking",
      ],
    },
  },
} as const
