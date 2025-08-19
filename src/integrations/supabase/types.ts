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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      employees: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          hire_date: string
          id: string
          phone: string | null
          position: string
          salary: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          hire_date?: string
          id?: string
          phone?: string | null
          position: string
          salary?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          hire_date?: string
          id?: string
          phone?: string | null
          position?: string
          salary?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_employees_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actual_cost: number | null
          animators: string[] | null
          budget: number
          contractors: string[] | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          event_time: string | null
          id: string
          location: string | null
          managers: string[] | null
          name: string
          notes: string | null
          photos: string[] | null
          project_owner: string | null
          show_program: string | null
          start_date: string
          status: string
          updated_at: string
          videos: string[] | null
        }
        Insert: {
          actual_cost?: number | null
          animators?: string[] | null
          budget?: number
          contractors?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          event_time?: string | null
          id?: string
          location?: string | null
          managers?: string[] | null
          name: string
          notes?: string | null
          photos?: string[] | null
          project_owner?: string | null
          show_program?: string | null
          start_date: string
          status?: string
          updated_at?: string
          videos?: string[] | null
        }
        Update: {
          actual_cost?: number | null
          animators?: string[] | null
          budget?: number
          contractors?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          event_time?: string | null
          id?: string
          location?: string | null
          managers?: string[] | null
          name?: string
          notes?: string | null
          photos?: string[] | null
          project_owner?: string | null
          show_program?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          videos?: string[] | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          event_id: string
          expense_date: string
          id: string
          receipt_url: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description: string
          event_id: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          event_id?: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_log: {
        Row: {
          action: string
          change_description: string | null
          changed_at: string
          changed_by: string
          id: string
          new_data: Json | null
          old_data: Json | null
          transaction_id: string
        }
        Insert: {
          action: string
          change_description?: string | null
          changed_at?: string
          changed_by: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          transaction_id: string
        }
        Update: {
          action?: string
          change_description?: string | null
          changed_at?: string
          changed_by?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          transaction_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          cash_type: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          expense_amount: number | null
          id: string
          income_amount: number | null
          notes: string | null
          operation_date: string
          project_id: string | null
          project_owner: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          cash_type?: string | null
          category: string
          created_at?: string
          created_by: string
          description: string
          expense_amount?: number | null
          id?: string
          income_amount?: number | null
          notes?: string | null
          operation_date?: string
          project_id?: string | null
          project_owner: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          cash_type?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_amount?: number | null
          id?: string
          income_amount?: number | null
          notes?: string | null
          operation_date?: string
          project_id?: string | null
          project_owner?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string
          event_id: string
          id: string
          income_date: string
          source: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description: string
          event_id: string
          id?: string
          income_date?: string
          source: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string
          event_id?: string
          id?: string
          income_date?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          invitation_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          invitation_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          invitation_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_audit_log_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invited_at: string
          invited_by: string
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          token: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_at?: string
          invited_by: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          token?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_at?: string
          invited_by?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          token?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_edit_history: {
        Row: {
          created_at: string | null
          edited_by: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          edited_by: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id: string
        }
        Update: {
          created_at?: string | null
          edited_by?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_edit_history_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_edit_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          cash_lera: number | null
          cash_nastya: number | null
          cash_vanya: number | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          total_cash_on_hand: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          cash_lera?: number | null
          cash_nastya?: number | null
          cash_vanya?: number | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          total_cash_on_hand?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          cash_lera?: number | null
          cash_nastya?: number | null
          cash_vanya?: number | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          total_cash_on_hand?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { invitation_token: string }
        Returns: boolean
      }
      calculate_user_cash_totals: {
        Args: { user_uuid: string }
        Returns: {
          cash_lera: number
          cash_nastya: number
          cash_vanya: number
          total_cash: number
        }[]
      }
      can_view_invitation: {
        Args: { invitation_token: string }
        Returns: boolean
      }
      get_company_cash_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          cash_lera: number
          cash_nastya: number
          cash_vanya: number
          total_cash: number
        }[]
      }
      get_employee_cash_summary: {
        Args: { employee_user_id: string }
        Returns: {
          cash_lera: number
          cash_nastya: number
          cash_vanya: number
          total_cash: number
        }[]
      }
      get_invitation_by_token: {
        Args: { invitation_token: string }
        Returns: {
          email: string
          expires_at: string
          first_name: string
          id: string
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
        }[]
      }
      get_my_employee_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          hire_date: string
          id: string
          position: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      hash_token: {
        Args: { token_value: string }
        Returns: string
      }
      log_profile_edit: {
        Args: {
          p_field_name: string
          p_new_value: string
          p_old_value: string
          p_profile_id: string
        }
        Returns: undefined
      }
      request_password_reset: {
        Args: { user_email: string }
        Returns: boolean
      }
      reset_password_with_token: {
        Args: { new_password: string; reset_token: string }
        Returns: boolean
      }
      validate_password_reset_token: {
        Args: { reset_token: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "employee"
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
      user_role: ["admin", "employee"],
    },
  },
} as const
