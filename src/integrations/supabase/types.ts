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
    PostgrestVersion: "13.0.5"
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
      category_icons: {
        Row: {
          bg_color: string
          category_name: string
          created_at: string
          created_by: string | null
          icon_color: string
          icon_type: string
          icon_value: string
          id: string
          updated_at: string
        }
        Insert: {
          bg_color?: string
          category_name: string
          created_at?: string
          created_by?: string | null
          icon_color?: string
          icon_type: string
          icon_value: string
          id?: string
          updated_at?: string
        }
        Update: {
          bg_color?: string
          category_name?: string
          created_at?: string
          created_by?: string | null
          icon_color?: string
          icon_type?: string
          icon_value?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_participants: {
        Row: {
          chat_room_id: string
          id: string
          is_admin: boolean | null
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          chat_room_id: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          chat_room_id?: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_group: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
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
      event_action_requests: {
        Row: {
          action_type: string
          comment: string
          created_at: string
          event_id: string
          id: string
          requested_by: string
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_type: string
          comment: string
          created_at?: string
          event_id: string
          id?: string
          requested_by: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          comment?: string
          created_at?: string
          event_id?: string
          id?: string
          requested_by?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_action_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
          animator_ids: string[] | null
          animators: string | null
          client_id: string | null
          contractor_ids: string[] | null
          contractors: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          estimate_file_url: string | null
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
          photographer_contact_id: string | null
          photos: string[] | null
          place: string | null
          project_owner: string | null
          responsible_manager_id: string | null
          responsible_manager_ids: string[] | null
          show_program: string | null
          source_event_id: string | null
          start_date: string
          status: string
          time_range: string | null
          updated_at: string
          venue_id: string | null
          video: string | null
          videographer_contact_id: string | null
          videos: string[] | null
        }
        Insert: {
          animator_ids?: string[] | null
          animators?: string | null
          client_id?: string | null
          contractor_ids?: string[] | null
          contractors?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          estimate_file_url?: string | null
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
          photographer_contact_id?: string | null
          photos?: string[] | null
          place?: string | null
          project_owner?: string | null
          responsible_manager_id?: string | null
          responsible_manager_ids?: string[] | null
          show_program?: string | null
          source_event_id?: string | null
          start_date: string
          status?: string
          time_range?: string | null
          updated_at?: string
          venue_id?: string | null
          video?: string | null
          videographer_contact_id?: string | null
          videos?: string[] | null
        }
        Update: {
          animator_ids?: string[] | null
          animators?: string | null
          client_id?: string | null
          contractor_ids?: string[] | null
          contractors?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          estimate_file_url?: string | null
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
          photographer_contact_id?: string | null
          photos?: string[] | null
          place?: string | null
          project_owner?: string | null
          responsible_manager_id?: string | null
          responsible_manager_ids?: string[] | null
          show_program?: string | null
          source_event_id?: string | null
          start_date?: string
          status?: string
          time_range?: string | null
          updated_at?: string
          venue_id?: string | null
          video?: string | null
          videographer_contact_id?: string | null
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_responsible_manager_id_fkey"
            columns: ["responsible_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          linked_transaction_id: string | null
          no_receipt: boolean | null
          no_receipt_reason: string | null
          notes: string | null
          operation_date: string
          project_id: string | null
          project_owner: string
          receipt_url: string | null
          requires_verification: boolean | null
          static_project_name: string | null
          transfer_from_user_id: string | null
          transfer_rejection_reason: string | null
          transfer_status: string | null
          transfer_to_user_id: string | null
          updated_at: string
          verification_comment: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
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
          linked_transaction_id?: string | null
          no_receipt?: boolean | null
          no_receipt_reason?: string | null
          notes?: string | null
          operation_date?: string
          project_id?: string | null
          project_owner: string
          receipt_url?: string | null
          requires_verification?: boolean | null
          static_project_name?: string | null
          transfer_from_user_id?: string | null
          transfer_rejection_reason?: string | null
          transfer_status?: string | null
          transfer_to_user_id?: string | null
          updated_at?: string
          verification_comment?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
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
          linked_transaction_id?: string | null
          no_receipt?: boolean | null
          no_receipt_reason?: string | null
          notes?: string | null
          operation_date?: string
          project_id?: string | null
          project_owner?: string
          receipt_url?: string | null
          requires_verification?: boolean | null
          static_project_name?: string | null
          transfer_from_user_id?: string | null
          transfer_rejection_reason?: string | null
          transfer_status?: string | null
          transfer_to_user_id?: string | null
          updated_at?: string
          verification_comment?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          errors: Json | null
          failed_rows: number | null
          id: string
          import_data: Json | null
          inserted_rows: number | null
          paused_at: string | null
          processed_rows: number | null
          skipped_rows: number | null
          started_at: string | null
          status: string
          total_rows: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          failed_rows?: number | null
          id?: string
          import_data?: Json | null
          inserted_rows?: number | null
          paused_at?: string | null
          processed_rows?: number | null
          skipped_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          failed_rows?: number | null
          id?: string
          import_data?: Json | null
          inserted_rows?: number | null
          paused_at?: string | null
          processed_rows?: number | null
          skipped_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_status: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_room_id: string
          content: string | null
          created_at: string
          id: string
          is_edited: boolean | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          chat_room_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_edited?: boolean | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          chat_room_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_edited?: boolean | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
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
      permission_migrations: {
        Row: {
          applied_at: string
          applied_by: string | null
          description: string | null
          id: string
          permissions_added: string[] | null
          version: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          description?: string | null
          id?: string
          permissions_added?: string[] | null
          version: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          description?: string | null
          id?: string
          permissions_added?: string[] | null
          version?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          scope_type: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          scope_type?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          scope_type?: string | null
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
          first_name: string | null
          full_name: string
          google_drive_folder_id: string | null
          google_drive_folder_url: string | null
          google_sheet_id: string | null
          google_sheet_url: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          mobile_nav_settings: Json | null
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
          first_name?: string | null
          full_name: string
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          google_sheet_id?: string | null
          google_sheet_url?: string | null
          id: string
          last_name?: string | null
          middle_name?: string | null
          mobile_nav_settings?: Json | null
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
          first_name?: string | null
          full_name?: string
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          google_sheet_id?: string | null
          google_sheet_url?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          mobile_nav_settings?: Json | null
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
          device_token: string | null
          device_type: string
          endpoint: string
          id: string
          p256dh: string
          platform: string
          subscription_data: Json | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_token?: string | null
          device_type?: string
          endpoint: string
          id?: string
          p256dh: string
          platform: string
          subscription_data?: Json | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_token?: string | null
          device_type?: string
          endpoint?: string
          id?: string
          p256dh?: string
          platform?: string
          subscription_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      role_definitions: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_admin_role: boolean
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_admin_role?: boolean
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_admin_role?: boolean
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission_id: string
          role_id: string
          scope: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_id: string
          role_id: string
          scope?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_id?: string
          role_id?: string
          scope?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions_history: {
        Row: {
          action: string
          changed_by: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          permission_id: string
          role_id: string
        }
        Insert: {
          action: string
          changed_by: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          permission_id: string
          role_id: string
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_history_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_history_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["id"]
          },
        ]
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
      task_checklists: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          sort_order: number
          task_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          task_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          task_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          attachment_url: string | null
          comment: string | null
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          event_id: string | null
          id: string
          priority: string
          reminder_at: string | null
          status: string
          tags: string[] | null
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          priority?: string
          reminder_at?: string | null
          status?: string
          tags?: string[] | null
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          priority?: string
          reminder_at?: string | null
          status?: string
          tags?: string[] | null
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_categories: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_projects: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_verifications: {
        Row: {
          action: string
          comment: string | null
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          transaction_id: string
          verified_by: string
        }
        Insert: {
          action: string
          comment?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          transaction_id: string
          verified_by: string
        }
        Update: {
          action?: string
          comment?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          transaction_id?: string
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_verifications_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["id"]
          },
        ]
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
      warehouse_categories: {
        Row: {
          bg_color: string
          created_at: string
          created_by: string | null
          display_order: number
          icon_color: string
          icon_type: string
          icon_value: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          bg_color?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          icon_color?: string
          icon_type?: string
          icon_value?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          bg_color?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          icon_color?: string
          icon_type?: string
          icon_value?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "warehouse_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_inventories: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      warehouse_inventory_items: {
        Row: {
          actual_quantity: number | null
          created_at: string
          difference: number | null
          expected_quantity: number
          id: string
          inventory_id: string
          item_id: string
          location_id: string | null
          notes: string | null
          scanned_at: string | null
          scanned_by: string | null
          updated_at: string
        }
        Insert: {
          actual_quantity?: number | null
          created_at?: string
          difference?: number | null
          expected_quantity?: number
          id?: string
          inventory_id: string
          item_id: string
          location_id?: string | null
          notes?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          updated_at?: string
        }
        Update: {
          actual_quantity?: number | null
          created_at?: string
          difference?: number | null
          expected_quantity?: number
          id?: string
          inventory_id?: string
          item_id?: string
          location_id?: string | null
          notes?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_inventory_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "warehouse_inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_inventory_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "warehouse_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_items: {
        Row: {
          barcode: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          min_stock: number
          name: string
          photo_url: string | null
          price: number
          sku: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          photo_url?: string | null
          price?: number
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          photo_url?: string | null
          price?: number
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "warehouse_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_items_audit_log: {
        Row: {
          action: string
          change_description: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: string[] | null
          id: string
          ip_address: unknown
          item_id: string
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          change_description?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          ip_address?: unknown
          item_id: string
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          change_description?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          ip_address?: unknown
          item_id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_items_audit_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "warehouse_items"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_locations: {
        Row: {
          address: string | null
          cell: string | null
          created_at: string
          created_by: string | null
          display_order: number
          employee_id: string | null
          floor: string | null
          id: string
          is_active: boolean
          name: string
          rack: string | null
          shelf: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cell?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          employee_id?: string | null
          floor?: string | null
          id?: string
          is_active?: boolean
          name: string
          rack?: string | null
          shelf?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cell?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          employee_id?: string | null
          floor?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rack?: string | null
          shelf?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      warehouse_movements: {
        Row: {
          created_at: string
          created_by: string
          from_location_id: string | null
          id: string
          item_id: string
          movement_type: string
          notes: string | null
          operation_date: string
          photo_url: string | null
          quantity: number
          to_location_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          from_location_id?: string | null
          id?: string
          item_id: string
          movement_type: string
          notes?: string | null
          operation_date?: string
          photo_url?: string | null
          quantity: number
          to_location_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          from_location_id?: string | null
          id?: string
          item_id?: string
          movement_type?: string
          notes?: string | null
          operation_date?: string
          photo_url?: string | null
          quantity?: number
          to_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "warehouse_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_settings: {
        Row: {
          created_at: string
          default_currency: string
          default_unit: string
          enable_notifications: boolean
          id: string
          low_stock_threshold_percent: number
          notify_on_low_stock: boolean
          notify_on_overdue_return: boolean
          notify_on_task_assigned: boolean
          notify_on_task_due: boolean
          return_reminder_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          default_unit?: string
          enable_notifications?: boolean
          id?: string
          low_stock_threshold_percent?: number
          notify_on_low_stock?: boolean
          notify_on_overdue_return?: boolean
          notify_on_task_assigned?: boolean
          notify_on_task_due?: boolean
          return_reminder_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          default_unit?: string
          enable_notifications?: boolean
          id?: string
          low_stock_threshold_percent?: number
          notify_on_low_stock?: boolean
          notify_on_overdue_return?: boolean
          notify_on_task_assigned?: boolean
          notify_on_task_due?: boolean
          return_reminder_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      warehouse_stock: {
        Row: {
          id: string
          item_id: string
          location_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          location_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          location_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "warehouse_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_task_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          photo_url: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          photo_url?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          photo_url?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "warehouse_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_task_items: {
        Row: {
          collected_quantity: number
          created_at: string
          id: string
          is_collected: boolean
          item_id: string
          notes: string | null
          quantity: number
          task_id: string
        }
        Insert: {
          collected_quantity?: number
          created_at?: string
          id?: string
          is_collected?: boolean
          item_id: string
          notes?: string | null
          quantity: number
          task_id: string
        }
        Update: {
          collected_quantity?: number
          created_at?: string
          id?: string
          is_collected?: boolean
          item_id?: string
          notes?: string | null
          quantity?: number
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_task_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "warehouse_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_task_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "warehouse_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          due_date: string | null
          event_id: string | null
          id: string
          notes: string | null
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          task_type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      accept_money_transfer: {
        Args: { p_transaction_id: string }
        Returns: boolean
      }
      assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      calculate_all_users_cash: {
        Args: never
        Returns: {
          cash_lera: number
          cash_nastya: number
          cash_vanya: number
          total_cash: number
          user_id: string
        }[]
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
        Args: { p_employee_user_id: string }
        Returns: boolean
      }
      format_phone_display: { Args: { phone_e164: string }; Returns: string }
      generate_user_api_key: { Args: never; Returns: string }
      get_admin_employee_data: {
        Args: never
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
        Args: never
        Returns: {
          avatar_url: string
          birth_date: string
          cash_lera: number
          cash_nastya: number
          cash_vanya: number
          created_at: string
          email: string
          employment_status: string
          first_name: string
          full_name: string
          id: string
          last_name: string
          middle_name: string
          phone: string
          phone_e164: string
          role: Database["public"]["Enums"]["user_role"]
          termination_date: string
          termination_reason: string
          total_cash_on_hand: number
          updated_at: string
        }[]
      }
      get_all_basic_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          birth_date: string
          created_at: string
          email: string
          employment_status: string
          first_name: string
          full_name: string
          id: string
          last_name: string
          middle_name: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      get_all_users_cash_totals: {
        Args: never
        Returns: {
          cash_lera: number
          cash_nastya: number
          cash_vanya: number
          total_cash: number
          user_id: string
        }[]
      }
      get_company_cash_summary: {
        Args: never
        Returns: {
          cash_lera: number
          cash_nastya: number
          cash_vanya: number
          total_cash: number
        }[]
      }
      get_current_user_permissions: { Args: never; Returns: string[] }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_current_vacations_summary: {
        Args: never
        Returns: {
          employee_name: string
          vacation_type: string
        }[]
      }
      get_dashboard_stats:
        | { Args: { user_uuid: string }; Returns: Json }
        | { Args: never; Returns: Json }
      get_employee_basic_data: {
        Args: never
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
        Args: never
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
        Args: never
        Returns: {
          user_avatar_url: string
          user_birth_date: string
          user_email: string
          user_employment_status: string
          user_first_name: string
          user_full_name: string
          user_id: string
          user_last_name: string
          user_middle_name: string
          user_phone: string
          user_position: string
          user_salary: number
        }[]
      }
      get_user_full_context: { Args: { user_uuid: string }; Returns: Json }
      get_user_highest_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_profile_with_roles: { Args: never; Returns: Json }
      get_user_rbac_roles_by_id: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_permission: { Args: { p_code: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_token: { Args: { token_value: string }; Returns: string }
      is_active_user: { Args: never; Returns: boolean }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_chat_admin: {
        Args: { _chat_room_id: string; _user_id: string }
        Returns: boolean
      }
      is_chat_participant: {
        Args: { _chat_room_id: string; _user_id: string }
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
      reject_money_transfer:
        | {
            Args: { p_rejection_reason: string; p_transaction_id: string }
            Returns: boolean
          }
        | { Args: { p_transaction_id: string }; Returns: boolean }
      request_password_reset: { Args: { user_email: string }; Returns: boolean }
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
      validate_api_key: { Args: { p_api_key: string }; Returns: string }
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
