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
          created_at: string
          hire_date: string
          id: string
          position: string
          salary: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hire_date?: string
          id?: string
          position: string
          salary?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hire_date?: string
          id?: string
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
      financial_transactions: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          expense_amount: number | null
          id: string
          income_amount: number | null
          operation_date: string
          project_id: string | null
          project_owner: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description: string
          expense_amount?: number | null
          id?: string
          income_amount?: number | null
          operation_date?: string
          project_id?: string | null
          project_owner: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_amount?: number | null
          id?: string
          income_amount?: number | null
          operation_date?: string
          project_id?: string | null
          project_owner?: string
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
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
