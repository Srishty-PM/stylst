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
      closet_items: {
        Row: {
          ai_confidence: number | null
          brand: string | null
          category: string
          colors: string[] | null
          created_at: string
          id: string
          image_url: string
          image_url_cleaned: string | null
          last_worn_date: string | null
          name: string
          needs_review: boolean | null
          purchase_price: number | null
          status: string
          subcategory: string | null
          tags: string[] | null
          times_worn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          brand?: string | null
          category: string
          colors?: string[] | null
          created_at?: string
          id?: string
          image_url: string
          image_url_cleaned?: string | null
          last_worn_date?: string | null
          name: string
          needs_review?: boolean | null
          purchase_price?: number | null
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          times_worn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          brand?: string | null
          category?: string
          colors?: string[] | null
          created_at?: string
          id?: string
          image_url?: string
          image_url_cleaned?: string | null
          last_worn_date?: string | null
          name?: string
          needs_review?: boolean | null
          purchase_price?: number | null
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          times_worn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inspiration: {
        Row: {
          created_at: string
          description: string | null
          detected_items: string[] | null
          id: string
          image_url: string
          source_id: string | null
          source_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          detected_items?: string[] | null
          id?: string
          image_url: string
          source_id?: string | null
          source_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          detected_items?: string[] | null
          id?: string
          image_url?: string
          source_id?: string | null
          source_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspiration_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "inspiration_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      inspiration_sources: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          last_synced_at: string | null
          source_name: string | null
          source_type: string
          sync_enabled: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          source_name?: string | null
          source_type: string
          sync_enabled?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          source_name?: string | null
          source_type?: string
          sync_enabled?: boolean
          user_id?: string
        }
        Relationships: []
      }
      matched_looks: {
        Row: {
          closet_item_ids: string[]
          created_at: string
          created_by_ai: boolean
          id: string
          inspiration_id: string | null
          is_favorite: boolean
          name: string
          notes: string | null
          occasion: string | null
          season: string | null
          times_worn: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closet_item_ids: string[]
          created_at?: string
          created_by_ai?: boolean
          id?: string
          inspiration_id?: string | null
          is_favorite?: boolean
          name: string
          notes?: string | null
          occasion?: string | null
          season?: string | null
          times_worn?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closet_item_ids?: string[]
          created_at?: string
          created_by_ai?: boolean
          id?: string
          inspiration_id?: string | null
          is_favorite?: boolean
          name?: string
          notes?: string | null
          occasion?: string | null
          season?: string | null
          times_worn?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matched_looks_inspiration_id_fkey"
            columns: ["inspiration_id"]
            isOneToOne: false
            referencedRelation: "inspiration"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          onboarding_step: number | null
          pinterest_access_token: string | null
          pinterest_connected: boolean
          pinterest_refresh_token: string | null
          pinterest_token_expires_at: string | null
          style_goals: string[] | null
          subscription_expires_at: string | null
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          onboarding_step?: number | null
          pinterest_access_token?: string | null
          pinterest_connected?: boolean
          pinterest_refresh_token?: string | null
          pinterest_token_expires_at?: string | null
          style_goals?: string[] | null
          subscription_expires_at?: string | null
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          onboarding_step?: number | null
          pinterest_access_token?: string | null
          pinterest_connected?: boolean
          pinterest_refresh_token?: string | null
          pinterest_token_expires_at?: string | null
          style_goals?: string[] | null
          subscription_expires_at?: string | null
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_outfits: {
        Row: {
          created_at: string
          event_name: string | null
          id: string
          matched_look_id: string
          scheduled_date: string
          user_id: string
          was_worn: boolean
          worn_at: string | null
        }
        Insert: {
          created_at?: string
          event_name?: string | null
          id?: string
          matched_look_id: string
          scheduled_date: string
          user_id: string
          was_worn?: boolean
          worn_at?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string | null
          id?: string
          matched_look_id?: string
          scheduled_date?: string
          user_id?: string
          was_worn?: boolean
          worn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_outfits_matched_look_id_fkey"
            columns: ["matched_look_id"]
            isOneToOne: false
            referencedRelation: "matched_looks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
