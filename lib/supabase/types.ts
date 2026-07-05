// TrustVox — Supabase database types (Phase 8.1)
//
// Mirrors the schema defined in supabase/migrations/0001–0003 exactly. Shaped to
// match the output of `supabase gen types typescript` so it can be regenerated
// with the CLI later (e.g. in 8.8) without churn:
//   supabase gen types typescript --project-id <ref> --schema public > lib/supabase/types.ts
//
// Column names are snake_case (DB convention); the lib/ store modules map them
// back to the camelCase the UI expects.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          display_name: string | null
          email: string | null
          status: Database["public"]["Enums"]["account_status"]
          dob: string | null
          gender: string | null
          company_name: string | null
          industry: string | null
          company_size: string | null
          website: string | null
          contact_name: string | null
          position: string | null
          description: string | null
          address: string | null
          city: string | null
          country: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          display_name?: string | null
          email?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          dob?: string | null
          gender?: string | null
          company_name?: string | null
          industry?: string | null
          company_size?: string | null
          website?: string | null
          contact_name?: string | null
          position?: string | null
          description?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          display_name?: string | null
          email?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          dob?: string | null
          gender?: string | null
          company_name?: string | null
          industry?: string | null
          company_size?: string | null
          website?: string | null
          contact_name?: string | null
          position?: string | null
          description?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          category: string
          status: Database["public"]["Enums"]["company_status"]
          date_added: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          status?: Database["public"]["Enums"]["company_status"]
          date_added?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          status?: Database["public"]["Enums"]["company_status"]
          date_added?: string
        }
        Relationships: []
      }
      forms: {
        Row: {
          id: string
          title: string
          description: string
          product: string
          category: string
          category_details: string | null
          company_id: string | null
          client_id: string
          client_name: string
          status: Database["public"]["Enums"]["form_status"]
          visibility: Database["public"]["Enums"]["form_visibility"]
          response_limit: number | null
          allow_anonymous: boolean
          enable_ratings: boolean
          auto_close_date: string | null
          questions: Json
          reward_tokens: number
          rejection_reason: string | null
          request_changes_note: string | null
          created_at: string
          submitted_at: string | null
          approved_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          title?: string
          description?: string
          product?: string
          category?: string
          category_details?: string | null
          company_id?: string | null
          client_id: string
          client_name?: string
          status?: Database["public"]["Enums"]["form_status"]
          visibility?: Database["public"]["Enums"]["form_visibility"]
          response_limit?: number | null
          allow_anonymous?: boolean
          enable_ratings?: boolean
          auto_close_date?: string | null
          questions?: Json
          reward_tokens?: number
          rejection_reason?: string | null
          request_changes_note?: string | null
          created_at?: string
          submitted_at?: string | null
          approved_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          product?: string
          category?: string
          category_details?: string | null
          company_id?: string | null
          client_id?: string
          client_name?: string
          status?: Database["public"]["Enums"]["form_status"]
          visibility?: Database["public"]["Enums"]["form_visibility"]
          response_limit?: number | null
          allow_anonymous?: boolean
          enable_ratings?: boolean
          auto_close_date?: string | null
          questions?: Json
          reward_tokens?: number
          rejection_reason?: string | null
          request_changes_note?: string | null
          created_at?: string
          submitted_at?: string | null
          approved_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          id: string
          form_id: string
          user_id: string
          answers: Json
          reward_tokens: number | null
          submitted_at: string
        }
        Insert: {
          id?: string
          form_id: string
          user_id: string
          answers?: Json
          reward_tokens?: number | null
          submitted_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          user_id?: string
          answers?: Json
          reward_tokens?: number | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          reason: string
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          reason: string
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          reason?: string
          reference_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          is_read: boolean
          action: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          is_read?: boolean
          action?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          message?: string
          is_read?: boolean
          action?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          id: string
          client_id: string
          name: string
          description: string
          status: Database["public"]["Enums"]["campaign_status"]
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          description?: string
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          description?: string
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          id: string
          title: string
          description: string
          cost: number
          badge: string
          category: Database["public"]["Enums"]["store_category"]
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id: string
          title: string
          description?: string
          cost: number
          badge?: string
          category: Database["public"]["Enums"]["store_category"]
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          cost?: number
          badge?: string
          category?: Database["public"]["Enums"]["store_category"]
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      wallet_balances: {
        Row: {
          user_id: string | null
          balance: number | null
          total_earned: number | null
          total_spent: number | null
        }
        Relationships: []
      }
      form_response_counts: {
        Row: {
          form_id: string | null
          response_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_app_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      current_app_status: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["account_status"]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_client: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      credit_feedback_reward: {
        Args: { p_response_id: string }
        Returns: number
      }
      redeem_reward: {
        Args: { p_item_id: string }
        Returns: number
      }
    }
    Enums: {
      user_role: "user" | "client" | "admin"
      account_status: "active" | "blocked"
      company_status: "active" | "inactive"
      form_status: "draft" | "pending" | "approved" | "rejected"
      form_visibility: "private" | "public" | "link"
      notification_type:
        | "reward_pending"
        | "reward_credited"
        | "reward_redeemed"
        | "new_opportunity"
        | "streak_risk"
      campaign_status: "active" | "draft" | "completed"
      store_category: "vouchers" | "subscriptions" | "merch"
    }
    CompositeTypes: Record<string, never>
  }
}

// ── Convenience helpers (subset of the generator's helper block) ──────────────
type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
