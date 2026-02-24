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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      banned_devices: {
        Row: {
          banned_by: string | null
          created_at: string
          device_hash: string | null
          id: string
          phone_number: string | null
          reason: string
        }
        Insert: {
          banned_by?: string | null
          created_at?: string
          device_hash?: string | null
          id?: string
          phone_number?: string | null
          reason: string
        }
        Update: {
          banned_by?: string | null
          created_at?: string
          device_hash?: string | null
          id?: string
          phone_number?: string | null
          reason?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_confirmed: boolean
          buyer_confirmed_at: string | null
          buyer_id: string
          buyer_msg_count: number
          buyer_phone: string | null
          buyer_short_code: string | null
          created_at: string
          deal_closed: boolean
          deal_closed_at: string | null
          deal_closed_by: string | null
          id: string
          listing_id: string
          relay_status: string
          seller_id: string
          seller_msg_count: number
          seller_short_code: string | null
          total_msg_count: number
          unlocked: boolean
          unlocked_at: string | null
          updated_at: string
        }
        Insert: {
          buyer_confirmed?: boolean
          buyer_confirmed_at?: string | null
          buyer_id: string
          buyer_msg_count?: number
          buyer_phone?: string | null
          buyer_short_code?: string | null
          created_at?: string
          deal_closed?: boolean
          deal_closed_at?: string | null
          deal_closed_by?: string | null
          id?: string
          listing_id: string
          relay_status?: string
          seller_id: string
          seller_msg_count?: number
          seller_short_code?: string | null
          total_msg_count?: number
          unlocked?: boolean
          unlocked_at?: string | null
          updated_at?: string
        }
        Update: {
          buyer_confirmed?: boolean
          buyer_confirmed_at?: string | null
          buyer_id?: string
          buyer_msg_count?: number
          buyer_phone?: string | null
          buyer_short_code?: string | null
          created_at?: string
          deal_closed?: boolean
          deal_closed_at?: string | null
          deal_closed_by?: string | null
          id?: string
          listing_id?: string
          relay_status?: string
          seller_id?: string
          seller_msg_count?: number
          seller_short_code?: string | null
          total_msg_count?: number
          unlocked?: boolean
          unlocked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      id_verifications: {
        Row: {
          created_at: string
          document_path: string
          document_type: string
          documents_purged_at: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          document_path: string
          document_type: string
          documents_purged_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path: string
          status?: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          document_path?: string
          document_type?: string
          documents_purged_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string
          status?: Database["public"]["Enums"]["verification_status"]
          user_id?: string
        }
        Relationships: []
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_translations: {
        Row: {
          description: string
          id: string
          is_machine: boolean
          lang: string
          listing_id: string
          title: string
          updated_at: string
        }
        Insert: {
          description?: string
          id?: string
          is_machine?: boolean
          lang: string
          listing_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          description?: string
          id?: string
          is_machine?: boolean
          lang?: string
          listing_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_translations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: string
          condition: Database["public"]["Enums"]["item_condition"]
          created_at: string
          currency: string
          description_original: string
          extra_fields: Json | null
          id: string
          lang_original: string
          location_area: string
          price: number
          seller_id: string
          status: Database["public"]["Enums"]["listing_status"]
          subcategory: string | null
          title_original: string
          updated_at: string
          views_count: number
        }
        Insert: {
          category: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          currency?: string
          description_original: string
          extra_fields?: Json | null
          id?: string
          lang_original?: string
          location_area: string
          price?: number
          seller_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          subcategory?: string | null
          title_original: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          category?: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          currency?: string
          description_original?: string
          extra_fields?: Json | null
          id?: string
          lang_original?: string
          location_area?: string
          price?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          subcategory?: string | null
          title_original?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          from_role: string | null
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          from_role?: string | null
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          from_role?: string | null
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          phone_number: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          otp_hash: string
          phone_number: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          phone_number?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          reason: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_banned: boolean
          is_verified_seller: boolean
          phone: string | null
          phone_verified: boolean
          preferred_lang: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          trust_score: number
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_banned?: boolean
          is_verified_seller?: boolean
          phone?: string | null
          phone_verified?: boolean
          preferred_lang?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          trust_score?: number
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_banned?: boolean
          is_verified_seller?: boolean
          phone?: string | null
          phone_verified?: boolean
          preferred_lang?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          trust_score?: number
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
          whatsapp?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolved: boolean
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolved?: boolean
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          conversation_id: string | null
          created_at: string
          id: string
          is_verified_purchase: boolean
          listing_id: string | null
          rating: number
          reviewed_user_id: string | null
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          listing_id?: string | null
          rating: number
          reviewed_user_id?: string | null
          reviewer_id: string
          seller_id: string
        }
        Update: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          listing_id?: string | null
          rating?: number
          reviewed_user_id?: string | null
          reviewer_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trust_scores: {
        Row: {
          factors: Json | null
          id: string
          last_calculated: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          score: number
          user_id: string
        }
        Insert: {
          factors?: Json | null
          id?: string
          last_calculated?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          score?: number
          user_id: string
        }
        Update: {
          factors?: Json | null
          id?: string
          last_calculated?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      user_addons: {
        Row: {
          active: boolean
          addon_type: string
          created_at: string
          expires_at: string | null
          extra_slots: number | null
          id: string
          listing_id: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          addon_type: string
          created_at?: string
          expires_at?: string | null
          extra_slots?: number | null
          id?: string
          listing_id?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          addon_type?: string
          created_at?: string
          expires_at?: string | null
          extra_slots?: number | null
          id?: string
          listing_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addons_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          browser: string | null
          created_at: string
          device_hash: string
          id: string
          ip_address: string | null
          is_vpn: boolean | null
          os: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_hash: string
          id?: string
          ip_address?: string | null
          is_vpn?: boolean | null
          os?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_hash?: string
          id?: string
          ip_address?: string | null
          is_vpn?: boolean | null
          os?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          balance: number
          id: string
          month_reset: string
          monthly_dynamic_earned: number
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          month_reset?: string
          monthly_dynamic_earned?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          month_reset?: string
          monthly_dynamic_earned?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wa_relay_tokens: {
        Row: {
          buyer_id: string
          conversation_id: string | null
          created_at: string
          id: string
          listing_id: string
          token: string
        }
        Insert: {
          buyer_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id: string
          token: string
        }
        Update: {
          buyer_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          token?: string
        }
        Relationships: []
      }
      whatsapp_click_logs: {
        Row: {
          clicked_at: string
          id: string
          listing_id: string
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          listing_id: string
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          listing_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_click_logs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_listing_count: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_views: { Args: { _listing_id: string }; Returns: undefined }
      search_listings: { Args: { search_term: string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      item_condition: "new" | "like_new" | "good" | "fair" | "for_parts"
      listing_status: "draft" | "active" | "sold" | "archived"
      report_reason:
        | "scam"
        | "prohibited"
        | "duplicate"
        | "spam"
        | "wrong_category"
        | "other"
      risk_level: "low" | "medium" | "high"
      user_type: "private" | "business"
      verification_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "moderator", "user"],
      item_condition: ["new", "like_new", "good", "fair", "for_parts"],
      listing_status: ["draft", "active", "sold", "archived"],
      report_reason: [
        "scam",
        "prohibited",
        "duplicate",
        "spam",
        "wrong_category",
        "other",
      ],
      risk_level: ["low", "medium", "high"],
      user_type: ["private", "business"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
