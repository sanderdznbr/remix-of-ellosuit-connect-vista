export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
      calendar_events: {
        Row: {
          attendees: Json | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_all_day: boolean | null
          meeting_data: Json | null
          meeting_link: string | null
          meeting_provider:
            | Database["public"]["Enums"]["meeting_provider"]
            | null
          recurrence_rule: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: Json | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          is_all_day?: boolean | null
          meeting_data?: Json | null
          meeting_link?: string | null
          meeting_provider?:
            | Database["public"]["Enums"]["meeting_provider"]
            | null
          recurrence_rule?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: Json | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_all_day?: boolean | null
          meeting_data?: Json | null
          meeting_link?: string | null
          meeting_provider?:
            | Database["public"]["Enums"]["meeting_provider"]
            | null
          recurrence_rule?: string | null
          start_date?: string
          title?: string
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
          cnpj_cpf: string | null
          company_id: string
          company_name: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address_city?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnpj_cpf?: string | null
          company_id: string
          company_name?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address_city?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnpj_cpf?: string | null
          company_id?: string
          company_name?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
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
      document_folders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
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
      email_events: {
        Row: {
          email_id: string
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          email_id: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          email_id?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
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
      public_booking_links: {
        Row: {
          buffer_minutes: number
          company_id: string
          created_at: string
          description: string | null
          duration_minutes: number
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
          id?: string
          is_active?: boolean
          link_slug?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      associate_existing_users_with_companies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      is_company_admin_or_manager: {
        Args: { company_id: string; user_id: string }
        Returns: boolean
      }
      user_belongs_to_company: {
        Args: { company_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      company_role: "admin" | "manager" | "employee"
      email_provider: "gmail" | "outlook" | "yahoo"
      event_type: "meeting" | "appointment" | "reminder"
      meeting_provider: "google_meet" | "zoom" | "teams"
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
    },
  },
} as const
