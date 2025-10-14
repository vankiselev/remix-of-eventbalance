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
      animators: {
        Row: {
          contact_person: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          phone_e164: string | null
          specialization: string | null
          updated_at: string
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          phone_e164?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          phone_e164?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          company: string | null
          contact_person: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          phone_e164: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          phone_e164?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          phone_e164?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contractors: {
        Row: {
          contact_person: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          phone_e164: string | null
          specialization: string | null
          updated_at: string
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          phone_e164?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          phone_e164?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      event_report_salaries: {
        Row: {
          amount: number
          assigned_by: string
          created_at: string
          employee_user_id: string
          id: string
          report_id: string
          salary_type: string
          updated_at: string
          wallet_type: string
        }
        Insert: {
          amount?: number
          assigned_by: string
          created_at?: string
          employee_user_id: string
          id?: string
          report_id: string
          salary_type?: string
          updated_at?: string
          wallet_type: string
        }
        Update: {
          amount?: number
          assigned_by?: string
          created_at?: string
          employee_user_id?: string
          id?: string
          report_id?: string
          salary_type?: string
          updated_at?: string
          wallet_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_report_salaries_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "event_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reports: {
        Row: {
          car_kilometers: number | null
          created_at: string
          end_time: string
          id: string
          onsite_work: string
          preparation_work: string
          project_name: string
          start_time: string
          updated_at: string
          user_id: string
          without_car: boolean | null
        }
        Insert: {
          car_kilometers?: number | null
          created_at?: string
          end_time: string
          id?: string
          onsite_work: string
          preparation_work: string
          project_name: string
          start_time: string
          updated_at?: string
          user_id: string
          without_car?: boolean | null
        }
        Update: {
          car_kilometers?: number | null
          created_at?: string
          end_time?: string
          id?: string
          onsite_work?: string
          preparation_work?: string
          project_name?: string
          start_time?: string
          updated_at?: string
          user_id?: string
          without_car?: boolean | null
        }
        Relationships: []
      }
      events: {
        Row: {
          animators: string | null
          contractor_ids: string[] | null
          contractors: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_time: string | null
          google_sheets_row_id: string | null
          holiday: string | null
          id: string
          is_archived: boolean | null
          location: string | null
          manager_ids: string[] | null
          managers: string | null
          name: string
          notes: string | null
          photo: string | null
          photo_video: string | null
          photos: string[] | null
          place: string | null
          project_owner: string | null
          responsible_manager_ids: string[] | null
          show_program: string | null
          source_event_id: string | null
          start_date: string
          status: string
          time_range: string | null
          updated_at: string
          venue_id: string | null
          video: string | null
          videos: string[] | null
        }
        Insert: {
          animators?: string | null
          contractor_ids?: string[] | null
          contractors?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          event_time?: string | null
          google_sheets_row_id?: string | null
          holiday?: string | null
          id?: string
          is_archived?: boolean | null
          location?: string | null
          manager_ids?: string[] | null
          managers?: string | null
          name: string
          notes?: string | null
          photo?: string | null
          photo_video?: string | null
          photos?: string[] | null
          place?: string | null
          project_owner?: string | null
          responsible_manager_ids?: string[] | null
          show_program?: string | null
          source_event_id?: string | null
          start_date: string
          status?: string
          time_range?: string | null
          updated_at?: string
          venue_id?: string | null
          video?: string | null
          videos?: string[] | null
        }
        Update: {
          animators?: string | null
          contractor_ids?: string[] | null
          contractors?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_time?: string | null
          google_sheets_row_id?: string | null
          holiday?: string | null
          id?: string
          is_archived?: boolean | null
          location?: string | null
          manager_ids?: string[] | null
          managers?: string | null
          name?: string
          notes?: string | null
          photo?: string | null
          photo_video?: string | null
          photos?: string[] | null
          place?: string | null
          project_owner?: string | null
          responsible_manager_ids?: string[] | null
          show_program?: string | null
          source_event_id?: string | null
          start_date?: string
          status?: string
          time_range?: string | null
          updated_at?: string
          venue_id?: string | null
          video?: string | null
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
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
      financial_attachments: {
        Row: {
          created_at: string
          created_by: string
          id: string
          mime_type: string
          original_filename: string
          size_bytes: number
          storage_path: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          mime_type: string
          original_filename: string
          size_bytes: number
          storage_path: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          mime_type?: string
          original_filename?: string
          size_bytes?: number
          storage_path?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
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
          balance_after: number | null
          cash_type: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          expense_amount: number | null
          id: string
          income_amount: number | null
          no_receipt: boolean | null
          no_receipt_reason: string | null
          notes: string | null
          operation_date: string
          project_id: string | null
          project_owner: string
          receipt_url: string | null
          static_project_name: string | null
          updated_at: string
        }
        Insert: {
          balance_after?: number | null
          cash_type?: string | null
          category: string
          created_at?: string
          created_by: string
          description: string
          expense_amount?: number | null
          id?: string
          income_amount?: number | null
          no_receipt?: boolean | null
          no_receipt_reason?: string | null
          notes?: string | null
          operation_date?: string
          project_id?: string | null
          project_owner: string
          receipt_url?: string | null
          static_project_name?: string | null
          updated_at?: string
        }
        Update: {
          balance_after?: number | null
          cash_type?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_amount?: number | null
          id?: string
          income_amount?: number | null
          no_receipt?: boolean | null
          no_receipt_reason?: string | null
          notes?: string | null
          operation_date?: string
          project_id?: string | null
          project_owner?: string
          receipt_url?: string | null
          static_project_name?: string | null
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
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
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
          employment_status: string
          full_name: string
          google_drive_folder_id: string | null
          google_drive_folder_url: string | null
          google_sheet_id: string | null
          google_sheet_url: string | null
          id: string
          phone: string | null
          phone_e164: string | null
          role: Database["public"]["Enums"]["user_role"]
          termination_date: string | null
          termination_reason: string | null
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
          employment_status?: string
          full_name: string
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          google_sheet_id?: string | null
          google_sheet_url?: string | null
          id: string
          phone?: string | null
          phone_e164?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          termination_date?: string | null
          termination_reason?: string | null
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
          employment_status?: string
          full_name?: string
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          google_sheet_id?: string | null
          google_sheet_url?: string | null
          id?: string
          phone?: string | null
          phone_e164?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          termination_date?: string | null
          termination_reason?: string | null
          total_cash_on_hand?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_type: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_type?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_type?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_status: {
        Row: {
          archived_count: number | null
          created_at: string | null
          created_count: number | null
          error_message: string | null
          id: string
          last_sync_time: string | null
          sync_month: string
          sync_status: string | null
          sync_year: number
          updated_count: number | null
        }
        Insert: {
          archived_count?: number | null
          created_at?: string | null
          created_count?: number | null
          error_message?: string | null
          id?: string
          last_sync_time?: string | null
          sync_month: string
          sync_status?: string | null
          sync_year: number
          updated_count?: number | null
        }
        Update: {
          archived_count?: number | null
          created_at?: string | null
          created_count?: number | null
          error_message?: string | null
          id?: string
          last_sync_time?: string | null
          sync_month?: string
          sync_status?: string | null
          sync_year?: number
          updated_count?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacations: {
        Row: {
          created_at: string
          description: string | null
          employee_name: string
          end_date: string
          id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
          vacation_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          employee_name: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
          vacation_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          employee_name?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          vacation_type?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          capacity: number | null
          contact_person: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          phone_e164: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          phone_e164?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity?: number | null
          contact_person?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          phone_e164?: string | null
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
      assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
      can_edit_admin_profile: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_update_profile_fields: {
        Args: {
          new_cash_lera: number
          new_cash_nastya: number
          new_cash_vanya: number
          new_role: Database["public"]["Enums"]["user_role"]
          new_total_cash: number
          old_cash_lera: number
          old_cash_nastya: number
          old_cash_vanya: number
          old_role: Database["public"]["Enums"]["user_role"]
          old_total_cash: number
          target_user_id: string
        }
        Returns: boolean
      }
      can_view_invitation: {
        Args: { invitation_token: string }
        Returns: boolean
      }
      delete_employee_permanently: {
        Args: { employee_user_id: string }
        Returns: boolean
      }
      format_phone_display: {
        Args: { phone_e164: string }
        Returns: string
      }
      get_admin_employee_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          birth_date: string
          created_at: string
          hire_date: string
          id: string
          phone: string
          position: string
          salary: number
          updated_at: string
          user_id: string
        }[]
      }
      get_admin_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          birth_date: string
          cash_lera: number
          cash_nastya: number
          cash_vanya: number
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          total_cash_on_hand: number
          updated_at: string
        }[]
      }
      get_all_basic_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          birth_date: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_current_vacations_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          employee_name: string
          vacation_type: string
        }[]
      }
      get_employee_basic_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          birth_date: string
          created_at: string
          hire_date: string
          id: string
          phone: string
          position: string
          updated_at: string
          user_id: string
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
      get_user_basic_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          birth_date: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }[]
      }
      get_user_highest_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_token: {
        Args: { token_value: string }
        Returns: string
      }
      is_active_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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
      normalize_phone_to_e164: {
        Args: { phone_input: string }
        Returns: string
      }
      reactivate_employee: {
        Args: { employee_user_id: string }
        Returns: boolean
      }
      recalculate_balances_for_cash_type: {
        Args: { p_cash_type: string }
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
      revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      terminate_employee: {
        Args: { employee_user_id: string; termination_reason_text?: string }
        Returns: boolean
      }
      validate_password_reset_token: {
        Args: { reset_token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "employee"
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
      app_role: ["super_admin", "admin", "employee"],
      user_role: ["admin", "employee"],
    },
  },
} as const
