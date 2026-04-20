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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contents: {
        Row: {
          body: Json | null
          contact_info: Json | null
          cta_text: Json | null
          id: string
          is_published: boolean | null
          partner_id: string
          section_type: string
          subtitle: Json | null
          title: Json | null
          updated_at: string | null
        }
        Insert: {
          body?: Json | null
          contact_info?: Json | null
          cta_text?: Json | null
          id?: string
          is_published?: boolean | null
          partner_id: string
          section_type: string
          subtitle?: Json | null
          title?: Json | null
          updated_at?: string | null
        }
        Update: {
          body?: Json | null
          contact_info?: Json | null
          cta_text?: Json | null
          id?: string
          is_published?: boolean | null
          partner_id?: string
          section_type?: string
          subtitle?: Json | null
          title?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contents_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_requests: {
        Row: {
          activated_at: string | null
          created_at: string | null
          id: string
          partner_id: string
          rejection_reason: string | null
          request_type: string
          requested_domain: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["domain_request_status"]
          updated_at: string | null
          verification_record: Json | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          partner_id: string
          rejection_reason?: string | null
          request_type: string
          requested_domain: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["domain_request_status"]
          updated_at?: string | null
          verification_record?: Json | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          partner_id?: string
          rejection_reason?: string | null
          request_type?: string
          requested_domain?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["domain_request_status"]
          updated_at?: string | null
          verification_record?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      global_contents: {
        Row: {
          body: Json | null
          id: string
          meta: Json | null
          section_type: string
          subtitle: Json | null
          title: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          body?: Json | null
          id?: string
          meta?: Json | null
          section_type: string
          subtitle?: Json | null
          title?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          body?: Json | null
          id?: string
          meta?: Json | null
          section_type?: string
          subtitle?: Json | null
          title?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          cloud_usage_amount: string | null
          company_name: string | null
          created_at: string | null
          customer_name: string
          email: string
          id: string
          message: string | null
          partner_id: string
          phone: string | null
          status: string | null
        }
        Insert: {
          cloud_usage_amount?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_name: string
          email: string
          id?: string
          message?: string | null
          partner_id: string
          phone?: string | null
          status?: string | null
        }
        Update: {
          cloud_usage_amount?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_name?: string
          email?: string
          id?: string
          message?: string | null
          partner_id?: string
          phone?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_sections: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          is_visible: boolean
          partner_id: string
          section_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          partner_id: string
          section_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          partner_id?: string
          section_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_sections_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          business_name: string
          created_at: string | null
          custom_domain: string | null
          custom_domain_status: string | null
          default_locale: string
          favicon_url: string | null
          features: Json
          hero_image_url: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          notification_emails: Json | null
          owner_id: string
          published_locales: string[]
          subdomain: string
          theme_key: string | null
          updated_at: string | null
        }
        Insert: {
          business_name: string
          created_at?: string | null
          custom_domain?: string | null
          custom_domain_status?: string | null
          default_locale?: string
          favicon_url?: string | null
          features?: Json
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          notification_emails?: Json | null
          owner_id: string
          published_locales?: string[]
          subdomain: string
          theme_key?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string | null
          custom_domain?: string | null
          custom_domain_status?: string | null
          default_locale?: string
          favicon_url?: string | null
          features?: Json
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          notification_emails?: Json | null
          owner_id?: string
          published_locales?: string[]
          subdomain?: string
          theme_key?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          partner_id: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          id: string
          partner_id?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          partner_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          count: number
          id: string
          partner_id: string
          visit_date: string
        }
        Insert: {
          count?: number
          id?: string
          partner_id: string
          visit_date?: string
        }
        Update: {
          count?: number
          id?: string
          partner_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          diff: Json | null
          id: string
          ip: string | null
          on_behalf_of: string | null
          partner_id: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          diff?: Json | null
          id?: string
          ip?: string | null
          on_behalf_of?: string | null
          partner_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          diff?: Json | null
          id?: string
          ip?: string | null
          on_behalf_of?: string | null
          partner_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_on_behalf_of_fkey"
            columns: ["on_behalf_of"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leads_masked_view: {
        Row: {
          cloud_usage_amount: string | null
          company_name: string | null
          created_at: string | null
          customer_name: string | null
          email: string | null
          id: string | null
          message: string | null
          partner_id: string | null
          phone: string | null
          status: string | null
        }
        Insert: {
          cloud_usage_amount?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_name?: never
          email?: never
          id?: string | null
          message?: never
          partner_id?: string | null
          phone?: never
          status?: string | null
        }
        Update: {
          cloud_usage_amount?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_name?: never
          email?: never
          id?: string | null
          message?: never
          partner_id?: string | null
          phone?: never
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_my_role: { Args: never; Returns: string }
      update_partner_feature: {
        Args: {
          p_enabled: boolean
          p_feature_key: string
          p_partner_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      domain_request_status:
        | "pending"
        | "approved"
        | "active"
        | "rejected"
        | "expired"
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
      domain_request_status: [
        "pending",
        "approved",
        "active",
        "rejected",
        "expired",
      ],
    },
  },
} as const
