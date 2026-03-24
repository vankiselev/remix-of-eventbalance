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
      animators: {
        Row: {
          contact_person: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          specialization: string | null
          specialty: string | null
          tenant_id: string | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          specialization?: string | null
          specialty?: string | null
          tenant_id?: string | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          specialization?: string | null
          specialty?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          actual_amount: number | null
          category: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          planned_amount: number | null
          report_id: string | null
          tenant_id: string | null
        }
        Insert: {
          actual_amount?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          planned_amount?: number | null
          report_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          actual_amount?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          planned_amount?: number | null
          report_id?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          company: string | null
          contact_person: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          tenant_id: string | null
        }
        Insert: {
          company?: string | null
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tenant_id?: string | null
        }
        Update: {
          company?: string | null
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      contact_persons: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          position: string | null
          tenant_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          position?: string | null
          tenant_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          position?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      contractors: {
        Row: {
          company: string | null
          contact_person: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          rating: number | null
          specialization: string | null
          specialty: string | null
          tenant_id: string | null
        }
        Insert: {
          company?: string | null
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          rating?: number | null
          specialization?: string | null
          specialty?: string | null
          tenant_id?: string | null
        }
        Update: {
          company?: string | null
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          rating?: number | null
          specialization?: string | null
          specialty?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string | null
          hire_date: string | null
          id: string
          name: string
          position: string | null
          salary: number | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          hire_date?: string | null
          id?: string
          name: string
          position?: string | null
          salary?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          hire_date?: string | null
          id?: string
          name?: string
          position?: string | null
          salary?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          confirmed: boolean | null
          created_at: string | null
          event_id: string
          id: string
          notes: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_report_salaries: {
        Row: {
          amount: number | null
          created_at: string | null
          employee_user_id: string
          id: string
          notes: string | null
          report_id: string
          salary_type: string | null
          tenant_id: string | null
          wallet_type: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          employee_user_id: string
          id?: string
          notes?: string | null
          report_id: string
          salary_type?: string | null
          tenant_id?: string | null
          wallet_type?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          employee_user_id?: string
          id?: string
          notes?: string | null
          report_id?: string
          salary_type?: string | null
          tenant_id?: string | null
          wallet_type?: string | null
        }
        Relationships: []
      }
      event_reports: {
        Row: {
          created_at: string | null
          end_time: string | null
          event_id: string | null
          id: string
          onsite_work: string | null
          preparation_work: string | null
          project_name: string | null
          start_time: string | null
          status: string | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          event_id?: string | null
          id?: string
          onsite_work?: string | null
          preparation_work?: string | null
          project_name?: string | null
          start_time?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          event_id?: string | null
          id?: string
          onsite_work?: string | null
          preparation_work?: string | null
          project_name?: string | null
          start_time?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          actual_cost: number | null
          animator_ids: string[] | null
          animators: string | null
          archived_at: string | null
          archived_by: string | null
          budget: number | null
          catering_ids: string[] | null
          client_id: string | null
          contract_number: string | null
          contractor_ids: string[] | null
          contractors: string | null
          created_at: string | null
          created_by: string | null
          decorator_ids: string[] | null
          description: string | null
          end_date: string | null
          end_time: string | null
          estimate_file_url: string | null
          event_time: string | null
          event_type: string | null
          guests_count: number | null
          id: string
          is_archived: boolean | null
          location: string | null
          manager_ids: string[] | null
          managers: string | null
          name: string
          notes: string | null
          other_specialist_ids: string[] | null
          photo_video: string | null
          photo_video_ids: string[] | null
          photographer_contact_id: string | null
          photos: string[] | null
          prepayment: number | null
          project_owner: string | null
          responsible_manager_id: string | null
          responsible_manager_ids: string[] | null
          show_program: string | null
          show_program_ids: string[] | null
          start_date: string
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          venue_id: string | null
          videographer_contact_id: string | null
          videos: string[] | null
        }
        Insert: {
          actual_cost?: number | null
          animator_ids?: string[] | null
          animators?: string | null
          archived_at?: string | null
          archived_by?: string | null
          budget?: number | null
          catering_ids?: string[] | null
          client_id?: string | null
          contract_number?: string | null
          contractor_ids?: string[] | null
          contractors?: string | null
          created_at?: string | null
          created_by?: string | null
          decorator_ids?: string[] | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          estimate_file_url?: string | null
          event_time?: string | null
          event_type?: string | null
          guests_count?: number | null
          id?: string
          is_archived?: boolean | null
          location?: string | null
          manager_ids?: string[] | null
          managers?: string | null
          name: string
          notes?: string | null
          other_specialist_ids?: string[] | null
          photo_video?: string | null
          photo_video_ids?: string[] | null
          photographer_contact_id?: string | null
          photos?: string[] | null
          prepayment?: number | null
          project_owner?: string | null
          responsible_manager_id?: string | null
          responsible_manager_ids?: string[] | null
          show_program?: string | null
          show_program_ids?: string[] | null
          start_date: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
          videographer_contact_id?: string | null
          videos?: string[] | null
        }
        Update: {
          actual_cost?: number | null
          animator_ids?: string[] | null
          animators?: string | null
          archived_at?: string | null
          archived_by?: string | null
          budget?: number | null
          catering_ids?: string[] | null
          client_id?: string | null
          contract_number?: string | null
          contractor_ids?: string[] | null
          contractors?: string | null
          created_at?: string | null
          created_by?: string | null
          decorator_ids?: string[] | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          estimate_file_url?: string | null
          event_time?: string | null
          event_type?: string | null
          guests_count?: number | null
          id?: string
          is_archived?: boolean | null
          location?: string | null
          manager_ids?: string[] | null
          managers?: string | null
          name?: string
          notes?: string | null
          other_specialist_ids?: string[] | null
          photo_video?: string | null
          photo_video_ids?: string[] | null
          photographer_contact_id?: string | null
          photos?: string[] | null
          prepayment?: number | null
          project_owner?: string | null
          responsible_manager_id?: string | null
          responsible_manager_ids?: string[] | null
          show_program?: string | null
          show_program_ids?: string[] | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
          videographer_contact_id?: string | null
          videos?: string[] | null
        }
        Relationships: []
      }
      financial_audit_log: {
        Row: {
          action: string | null
          changes: Json | null
          created_at: string | null
          id: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      financial_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          name: string | null
          profit: number | null
          status: string | null
          tenant_id: string | null
          total_actual: number | null
          total_planned: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          name?: string | null
          profit?: number | null
          status?: string | null
          tenant_id?: string | null
          total_actual?: number | null
          total_planned?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          name?: string | null
          profit?: number | null
          status?: string | null
          tenant_id?: string | null
          total_actual?: number | null
          total_planned?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          attachments_count: number | null
          cash_type: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_amount: number | null
          first_name: string | null
          id: string
          income_amount: number | null
          is_draft: boolean | null
          no_receipt: boolean | null
          no_receipt_reason: string | null
          notes: string | null
          operation_date: string
          project_id: string | null
          project_owner: string | null
          receipt_images: string[] | null
          requires_verification: boolean | null
          static_project_name: string | null
          tenant_id: string | null
          transfer_status: string | null
          transfer_to_user_id: string | null
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          attachments_count?: number | null
          cash_type?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_amount?: number | null
          first_name?: string | null
          id?: string
          income_amount?: number | null
          is_draft?: boolean | null
          no_receipt?: boolean | null
          no_receipt_reason?: string | null
          notes?: string | null
          operation_date: string
          project_id?: string | null
          project_owner?: string | null
          receipt_images?: string[] | null
          requires_verification?: boolean | null
          static_project_name?: string | null
          tenant_id?: string | null
          transfer_status?: string | null
          transfer_to_user_id?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          attachments_count?: number | null
          cash_type?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_amount?: number | null
          first_name?: string | null
          id?: string
          income_amount?: number | null
          is_draft?: boolean | null
          no_receipt?: boolean | null
          no_receipt_reason?: string | null
          notes?: string | null
          operation_date?: string
          project_id?: string | null
          project_owner?: string | null
          receipt_images?: string[] | null
          requires_verification?: boolean | null
          static_project_name?: string | null
          tenant_id?: string | null
          transfer_status?: string | null
          transfer_to_user_id?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      invitation_audit_log: {
        Row: {
          action: string | null
          actor_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          invitation_id: string | null
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          invitation_id?: string | null
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          invitation_id?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string | null
          status: string | null
          tenant_id: string | null
          token: string | null
          token_hash: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string | null
          status?: string | null
          tenant_id?: string | null
          token?: string | null
          token_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string | null
          status?: string | null
          tenant_id?: string | null
          token?: string | null
          token_hash?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string | null
          read: boolean | null
          title: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      overdue_report_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          notify_days: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          notify_days?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          notify_days?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profile_edit_history: {
        Row: {
          changes: Json | null
          created_at: string | null
          edited_by_id: string | null
          editor_id: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          profile_id: string
        }
        Insert: {
          changes?: Json | null
          created_at?: string | null
          edited_by_id?: string | null
          editor_id: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id: string
        }
        Update: {
          changes?: Json | null
          created_at?: string | null
          edited_by_id?: string | null
          editor_id?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          advance_balance: number | null
          avatar_url: string | null
          birth_date: string | null
          birthday: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          phone: string | null
          temp_password: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          advance_balance?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          birthday?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          temp_password?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          advance_balance?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          birthday?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          temp_password?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string | null
          user_id?: string
        }
        Relationships: []
      }
      role_definitions: {
        Row: {
          code: string | null
          created_at: string | null
          display_name: string
          id: string
          is_admin_role: boolean | null
          name: string
          permissions: string[] | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_admin_role?: boolean | null
          name: string
          permissions?: string[] | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_admin_role?: boolean | null
          name?: string
          permissions?: string[] | null
        }
        Relationships: []
      }
      salary_advances: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          id: string
          reason: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          reason?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          reason?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      salary_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          employee_id: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_type: string | null
          tenant_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_type?: string | null
          tenant_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_type?: string | null
          tenant_id?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      salary_settings: {
        Row: {
          base_salary: number | null
          created_at: string | null
          employee_id: string | null
          event_rate: number | null
          hourly_rate: number | null
          id: string
          payment_type: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          base_salary?: number | null
          created_at?: string | null
          employee_id?: string | null
          event_rate?: number | null
          hourly_rate?: number | null
          id?: string
          payment_type?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          base_salary?: number | null
          created_at?: string | null
          employee_id?: string | null
          event_rate?: number | null
          hourly_rate?: number | null
          id?: string
          payment_type?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_secrets: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          id: string
          priority: string | null
          status: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_memberships: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transaction_attachments: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          transaction_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      user_projects: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_role_assignments: {
        Row: {
          created_at: string | null
          id: string
          role_id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_id: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_id?: string
          tenant_id?: string | null
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
      user_voice_settings: {
        Row: {
          created_at: string | null
          default_project_id: string | null
          default_wallet: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_project_id?: string | null
          default_wallet?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_project_id?: string | null
          default_wallet?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vacations: {
        Row: {
          created_at: string | null
          description: string | null
          employee_name: string | null
          end_date: string
          id: string
          notes: string | null
          start_date: string
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
          vacation_type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          employee_name?: string | null
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
          vacation_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          employee_name?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
          vacation_type?: string | null
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          capacity: number | null
          contact_person: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          tenant_id: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tenant_id?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      warehouse_items: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
          quantity: number | null
          sku: string | null
          tenant_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          quantity?: number | null
          sku?: string | null
          tenant_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          quantity?: number | null
          sku?: string | null
          tenant_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: []
      }
      warehouse_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string | null
          setting_value: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key?: string | null
          setting_value?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string | null
          setting_value?: string | null
          warehouse_id?: string | null
        }
        Relationships: []
      }
      warehouse_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          status: string | null
          tenant_id: string | null
          title: string | null
          warehouse_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          tenant_id?: string | null
          title?: string | null
          warehouse_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          tenant_id?: string | null
          title?: string | null
          warehouse_id?: string | null
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation_for_registration: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      accept_money_transfer: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      approve_pending_user_membership: {
        Args: { p_user_id: string }
        Returns: Json
      }
      calculate_user_cash_totals: {
        Args: { p_user_id: string }
        Returns: {
          cash_type: string
          total_expense: number
          total_income: number
        }[]
      }
      delete_all_transactions: { Args: never; Returns: undefined }
      delete_employee_permanently:
        | { Args: { p_user_id: string }; Returns: undefined }
        | {
            Args: { p_employee_user_id?: string; p_user_id?: string }
            Returns: undefined
          }
      delete_user_transactions: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      ensure_invited_user_membership: {
        Args: { p_invitation_id: string; p_role?: string; p_user_id: string }
        Returns: Json
      }
      get_current_user_role: { Args: never; Returns: string }
      get_invitation_by_token: {
        Args: { invitation_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          role: string
          status: string
        }[]
      }
      get_invitation_for_registration: {
        Args: { invitation_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          tenant_id: string
        }[]
      }
      get_system_secret: { Args: { secret_key: string }; Returns: string }
      get_tenant_by_slug: { Args: { _slug: string }; Returns: Json }
      get_user_basic_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
        }[]
      }
      get_user_profile_with_roles: { Args: never; Returns: Json }
      get_user_tenant_memberships: { Args: never; Returns: Json }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_tenant_member: { Args: { p_tenant_id: string }; Returns: boolean }
      log_profile_edit:
        | {
            Args: { p_changes: Json; p_profile_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_changes: Json
              p_field_name?: string
              p_new_value?: string
              p_old_value?: string
              p_profile_id: string
            }
            Returns: undefined
          }
      reactivate_employee:
        | { Args: { p_user_id: string }; Returns: undefined }
        | {
            Args: { employee_user_id?: string; p_user_id?: string }
            Returns: undefined
          }
      reject_money_transfer: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      shares_tenant_with: { Args: { target_user_id: string }; Returns: boolean }
      terminate_employee:
        | { Args: { p_user_id: string }; Returns: undefined }
        | {
            Args: { employee_user_id?: string; p_user_id?: string }
            Returns: undefined
          }
      upsert_invited_user_profile: {
        Args: {
          p_avatar_url?: string
          p_birth_date?: string
          p_email: string
          p_first_name?: string
          p_full_name?: string
          p_last_name?: string
          p_middle_name?: string
          p_phone?: string
          p_user_id: string
        }
        Returns: Json
      }
      user_belongs_to_tenant: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      validate_api_key: { Args: { p_api_key: string }; Returns: string }
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
