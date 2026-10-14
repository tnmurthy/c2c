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
      accounts: {
        Row: {
          account_id: string
          billing_address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          industry: string | null
          name: string
          owner_id: string | null
          phone: string | null
          primary_contact_id: string | null
          shipping_address: string | null
          tenant_id: string | null
          type: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          account_id?: string
          billing_address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          industry?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          primary_contact_id?: string | null
          shipping_address?: string | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          account_id?: string
          billing_address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          industry?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          primary_contact_id?: string | null
          shipping_address?: string | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounts_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_id: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          owner_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          status: string | null
          subject: string | null
          tenant_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          activity_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          owner_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          owner_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      admins: {
        Row: {
          auth_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          applied_at: string | null
          id: string
          job_id: string
          notes: string | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          id?: string
          job_id: string
          notes?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          development_report: Json
          dimension_scores: Json
          founder_fit: Json
          id: string
          primary_profile: string
          sales_fit_index: number | null
          student_id: string | null
          tech_fit_index: number | null
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string | null
          development_report: Json
          dimension_scores: Json
          founder_fit: Json
          id?: string
          primary_profile: string
          sales_fit_index?: number | null
          student_id?: string | null
          tech_fit_index?: number | null
        }
        Update: {
          attempt_number?: number | null
          created_at?: string | null
          development_report?: Json
          dimension_scores?: Json
          founder_fit?: Json
          id?: string
          primary_profile?: string
          sales_fit_index?: number | null
          student_id?: string | null
          tech_fit_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          assessment_id: number | null
          created_at: string
          id: number
          question_id: string | null
          response: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          assessment_id?: number | null
          created_at?: string
          id?: number
          question_id?: string | null
          response: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          assessment_id?: number | null
          created_at?: string
          id?: number
          question_id?: string | null
          response?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "psychometric_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          created_at: string
          id: string
          last_question_index: number
          questions_json: Json
          responses_json: Json
          started_at: string
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_question_index?: number
          questions_json?: Json
          responses_json?: Json
          started_at?: string
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_question_index?: number
          questions_json?: Json
          responses_json?: Json
          started_at?: string
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          development_report: Json
          dimension_scores: Json
          founder_fit: Json
          id: number
          primary_profile: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          development_report: Json
          dimension_scores: Json
          founder_fit: Json
          id?: number
          primary_profile: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          development_report?: Json
          dimension_scores?: Json
          founder_fit?: Json
          id?: number
          primary_profile?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          attachment_id: string
          file_name: string | null
          file_path: string | null
          mime_type: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          size: number | null
          tenant_id: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          attachment_id?: string
          file_name?: string | null
          file_path?: string | null
          mime_type?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          size?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          attachment_id?: string
          file_name?: string | null
          file_path?: string | null
          mime_type?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          size?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          changes: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          log_id: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          log_id?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          log_id?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cash_flow_buckets: {
        Row: {
          bucket_end_day: number
          bucket_start_day: number
          committed_credit_lines: number | null
          committed_facilities_inflow: number | null
          committed_liquidity_lines: number | null
          created_at: string | null
          derivative_outflows: number | null
          digital_banking_deposits: number | null
          entity_id: string
          id: string
          interbank_inflows: number | null
          observation_date: string
          other_inflows: number | null
          other_outflows: number | null
          retail_deposits_less_stable: number | null
          retail_deposits_stable: number | null
          retail_loan_repayments: number | null
          scenario: string
          secured_borrowings: number | null
          secured_lending_inflows: number | null
          trade_finance_outflows: number | null
          unsecured_borrowings: number | null
          updated_at: string | null
          wholesale_deposits_nonop: number | null
          wholesale_deposits_op: number | null
          wholesale_loan_repayments: number | null
        }
        Insert: {
          bucket_end_day: number
          bucket_start_day: number
          committed_credit_lines?: number | null
          committed_facilities_inflow?: number | null
          committed_liquidity_lines?: number | null
          created_at?: string | null
          derivative_outflows?: number | null
          digital_banking_deposits?: number | null
          entity_id?: string
          id?: string
          interbank_inflows?: number | null
          observation_date: string
          other_inflows?: number | null
          other_outflows?: number | null
          retail_deposits_less_stable?: number | null
          retail_deposits_stable?: number | null
          retail_loan_repayments?: number | null
          scenario?: string
          secured_borrowings?: number | null
          secured_lending_inflows?: number | null
          trade_finance_outflows?: number | null
          unsecured_borrowings?: number | null
          updated_at?: string | null
          wholesale_deposits_nonop?: number | null
          wholesale_deposits_op?: number | null
          wholesale_loan_repayments?: number | null
        }
        Update: {
          bucket_end_day?: number
          bucket_start_day?: number
          committed_credit_lines?: number | null
          committed_facilities_inflow?: number | null
          committed_liquidity_lines?: number | null
          created_at?: string | null
          derivative_outflows?: number | null
          digital_banking_deposits?: number | null
          entity_id?: string
          id?: string
          interbank_inflows?: number | null
          observation_date?: string
          other_inflows?: number | null
          other_outflows?: number | null
          retail_deposits_less_stable?: number | null
          retail_deposits_stable?: number | null
          retail_loan_repayments?: number | null
          scenario?: string
          secured_borrowings?: number | null
          secured_lending_inflows?: number | null
          trade_finance_outflows?: number | null
          unsecured_borrowings?: number | null
          updated_at?: string | null
          wholesale_deposits_nonop?: number | null
          wholesale_deposits_op?: number | null
          wholesale_loan_repayments?: number | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          account_id: string | null
          city: string | null
          contact_id: string
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          owner_id: string | null
          phone: string | null
          role: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          city?: string | null
          contact_id?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          owner_id?: string | null
          phone?: string | null
          role?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          city?: string | null
          contact_id?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          owner_id?: string | null
          phone?: string | null
          role?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      crm_users: {
        Row: {
          created_at: string | null
          email: string
          name: string | null
          password_hash: string | null
          phone: string | null
          role_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          name?: string | null
          password_hash?: string | null
          phone?: string | null
          role_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          name?: string | null
          password_hash?: string | null
          phone?: string | null
          role_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "crm_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          data_type: string | null
          entity_type: string | null
          field_id: string
          field_name: string | null
          is_active: boolean | null
          is_required: boolean | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          data_type?: string | null
          entity_type?: string | null
          field_id?: string
          field_name?: string | null
          is_active?: boolean | null
          is_required?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          data_type?: string | null
          entity_type?: string | null
          field_id?: string
          field_name?: string | null
          is_active?: boolean | null
          is_required?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          field_id: string | null
          tenant_id: string | null
          updated_at: string | null
          value: string | null
          value_id: string
        }
        Insert: {
          entity_id?: string | null
          entity_type?: string | null
          field_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          value?: string | null
          value_id?: string
        }
        Update: {
          entity_id?: string | null
          entity_type?: string | null
          field_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          value?: string | null
          value_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["field_id"]
          },
          {
            foreignKeyName: "custom_field_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      employers: {
        Row: {
          auth_id: string | null
          company_name: string
          contact_person: string | null
          created_at: string
          id: string
          industry: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          company_name: string
          contact_person?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          company_name?: string
          contact_person?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completion_date: string | null
          contact_id: string | null
          created_at: string | null
          enrollment_date: string | null
          enrollment_id: string
          fees_due: number | null
          fees_paid: number | null
          payment_status: string | null
          program_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          completion_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          enrollment_id?: string
          fees_due?: number | null
          fees_paid?: number | null
          payment_status?: string | null
          program_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          completion_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          enrollment_id?: string
          fees_due?: number | null
          fees_paid?: number | null
          payment_status?: string | null
          program_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      entity_tags: {
        Row: {
          entity_id: string
          entity_type: string
          tag_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          entity_id: string
          entity_type: string
          tag_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          entity_id?: string
          entity_type?: string
          tag_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["tag_id"]
          },
          {
            foreignKeyName: "entity_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      hqla_assets: {
        Row: {
          asset_type: string
          coupon: number | null
          created_at: string | null
          face_value: number | null
          haircut_pct: number | null
          hqla_level: string | null
          id: string
          is_active: boolean | null
          isin: string
          issuer: string | null
          market_price: number | null
          market_value_cr: number | null
          maturity_date: string | null
          name: string
          rating: string | null
          rating_agency: string | null
          scraped_at: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          asset_type: string
          coupon?: number | null
          created_at?: string | null
          face_value?: number | null
          haircut_pct?: number | null
          hqla_level?: string | null
          id?: string
          is_active?: boolean | null
          isin: string
          issuer?: string | null
          market_price?: number | null
          market_value_cr?: number | null
          maturity_date?: string | null
          name: string
          rating?: string | null
          rating_agency?: string | null
          scraped_at?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_type?: string
          coupon?: number | null
          created_at?: string | null
          face_value?: number | null
          haircut_pct?: number | null
          hqla_level?: string | null
          id?: string
          is_active?: boolean | null
          isin?: string
          issuer?: string | null
          market_price?: number | null
          market_value_cr?: number | null
          maturity_date?: string | null
          name?: string
          rating?: string | null
          rating_agency?: string | null
          scraped_at?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      institution_whitelist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          institution_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          institution_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          institution_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_whitelist_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          auth_id: string | null
          created_at: string
          domain: string
          id: number
          location: string | null
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          domain: string
          id?: number
          location?: string | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          domain?: string
          id?: number
          location?: string | null
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      job_postings: {
        Row: {
          created_at: string
          description: string
          employer_id: string | null
          id: string
          is_remote: boolean | null
          location: string | null
          match_scores: Json | null
          requirements: Json | null
          role_type: string | null
          salary_range: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          employer_id?: string | null
          id?: string
          is_remote?: boolean | null
          location?: string | null
          match_scores?: Json | null
          requirements?: Json | null
          role_type?: string | null
          salary_range?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          employer_id?: string | null
          id?: string
          is_remote?: boolean | null
          location?: string | null
          match_scores?: Json | null
          requirements?: Json | null
          role_type?: string | null
          salary_range?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          account_name: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          interest_area: string | null
          last_name: string | null
          lead_id: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          pipeline_id: string | null
          source: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          interest_area?: string | null
          last_name?: string | null
          lead_id?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          pipeline_id?: string | null
          source?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          interest_area?: string | null
          last_name?: string | null
          lead_id?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          pipeline_id?: string | null
          source?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      market_leads: {
        Row: {
          ai_notes: string | null
          ai_score: number | null
          ai_summary: string | null
          company: string | null
          created_at: string
          date_found: string | null
          id: number
          name: string | null
          source: string | null
          status: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          ai_notes?: string | null
          ai_score?: number | null
          ai_summary?: string | null
          company?: string | null
          created_at?: string
          date_found?: string | null
          id?: number
          name?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          ai_notes?: string | null
          ai_score?: number | null
          ai_summary?: string | null
          company?: string | null
          created_at?: string
          date_found?: string | null
          id?: number
          name?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      match_alerts: {
        Row: {
          created_at: string
          id: number
          job_id: string | null
          lead_url: string
          score: number | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          job_id?: string | null
          lead_url: string
          score?: number | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          job_id?: string | null
          lead_url?: string
          score?: number | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_alerts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_alerts_lead_url_fkey"
            columns: ["lead_url"]
            isOneToOne: false
            referencedRelation: "market_leads"
            referencedColumns: ["url"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string | null
          note_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string | null
          note_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string | null
          note_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      opportunities: {
        Row: {
          account_id: string | null
          amount: number | null
          candidate_id: string | null
          created_at: string | null
          currency: string | null
          expected_close_date: string | null
          name: string
          opportunity_id: string
          owner_id: string | null
          pipeline_id: string | null
          primary_contact_id: string | null
          probability: number | null
          stage_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          candidate_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_close_date?: string | null
          name: string
          opportunity_id?: string
          owner_id?: string | null
          pipeline_id?: string | null
          primary_contact_id?: string | null
          probability?: number | null
          stage_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          candidate_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_close_date?: string | null
          name?: string
          opportunity_id?: string
          owner_id?: string | null
          pipeline_id?: string | null
          primary_contact_id?: string | null
          probability?: number | null
          stage_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "opportunities_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "opportunities_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "opportunities_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      orgspec_leads: {
        Row: {
          ai_accuracy: number | null
          ai_knowledge: string | null
          ai_score: number | null
          company_name: string | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string | null
          data_pct: number | null
          deal_value: number | null
          email: string | null
          gaps: Json | null
          id: string
          industry: string | null
          location: string | null
          name: string | null
          notes: string | null
          org_data: Json | null
          phone: string | null
          source: string | null
          status: string | null
          tier_interest: string | null
          website_url: string
        }
        Insert: {
          ai_accuracy?: number | null
          ai_knowledge?: string | null
          ai_score?: number | null
          company_name?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          data_pct?: number | null
          deal_value?: number | null
          email?: string | null
          gaps?: Json | null
          id?: string
          industry?: string | null
          location?: string | null
          name?: string | null
          notes?: string | null
          org_data?: Json | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tier_interest?: string | null
          website_url: string
        }
        Update: {
          ai_accuracy?: number | null
          ai_knowledge?: string | null
          ai_score?: number | null
          company_name?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          data_pct?: number | null
          deal_value?: number | null
          email?: string | null
          gaps?: Json | null
          id?: string
          industry?: string | null
          location?: string | null
          name?: string | null
          notes?: string | null
          org_data?: Json | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tier_interest?: string | null
          website_url?: string
        }
        Relationships: []
      }
      peer_feedback: {
        Row: {
          created_at: string
          dimension_scores: Json
          feedback_text: string | null
          id: string
          reviewer_email: string
          reviewer_role: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          dimension_scores: Json
          feedback_text?: string | null
          id?: string
          reviewer_email: string
          reviewer_role?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          dimension_scores?: Json
          feedback_text?: string | null
          id?: string
          reviewer_email?: string
          reviewer_role?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "peer_feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string | null
          permission_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          description?: string | null
          permission_id?: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          description?: string | null
          permission_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          created_at: string | null
          name: string
          pipeline_id: string | null
          probability: number | null
          sequence: number
          stage_id: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          name: string
          pipeline_id?: string | null
          probability?: number | null
          sequence: number
          stage_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          name?: string
          pipeline_id?: string | null
          probability?: number | null
          sequence?: number
          stage_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["pipeline_id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          entity_type: string
          is_default: boolean | null
          name: string
          pipeline_id: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_type: string
          is_default?: boolean | null
          name: string
          pipeline_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_type?: string
          is_default?: boolean | null
          name?: string
          pipeline_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      programs: {
        Row: {
          account_id: string | null
          capacity: number | null
          created_at: string | null
          currency: string | null
          end_date: string | null
          fees: number | null
          name: string
          owner_id: string | null
          program_id: string
          start_date: string | null
          status: string | null
          tenant_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          capacity?: number | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          fees?: number | null
          name: string
          owner_id?: string | null
          program_id?: string
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          capacity?: number | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          fees?: number | null
          name?: string
          owner_id?: string | null
          program_id?: string
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "programs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "crm_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      psychometric_items: {
        Row: {
          created_at: string
          id: string
          intended_audience: string | null
          item_type: string
          options: Json | null
          primary_dimension: string
          scoring_logic: Json | null
          secondary_dimensions: string[] | null
          stem: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id: string
          intended_audience?: string | null
          item_type: string
          options?: Json | null
          primary_dimension: string
          scoring_logic?: Json | null
          secondary_dimensions?: string[] | null
          stem: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          intended_audience?: string | null
          item_type?: string
          options?: Json | null
          primary_dimension?: string
          scoring_logic?: Json | null
          secondary_dimensions?: string[] | null
          stem?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          permission_id: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          permission_id?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["permission_id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          name: string
          role_id: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          name: string
          role_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          name?: string
          role_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      scraper_run_log: {
        Row: {
          assets_matured: number | null
          assets_new: number | null
          assets_scraped: number | null
          assets_updated: number | null
          created_at: string | null
          duration_secs: number | null
          error_message: string | null
          id: string
          run_date: string
          source: string
          status: string | null
        }
        Insert: {
          assets_matured?: number | null
          assets_new?: number | null
          assets_scraped?: number | null
          assets_updated?: number | null
          created_at?: string | null
          duration_secs?: number | null
          error_message?: string | null
          id?: string
          run_date: string
          source: string
          status?: string | null
        }
        Update: {
          assets_matured?: number | null
          assets_new?: number | null
          assets_scraped?: number | null
          assets_updated?: number | null
          created_at?: string | null
          duration_secs?: number | null
          error_message?: string | null
          id?: string
          run_date?: string
          source?: string
          status?: string | null
        }
        Relationships: []
      }
      stress_run_results: {
        Row: {
          breaches_internal_buffer: boolean | null
          breaches_rbi_minimum: boolean | null
          capped_inflows_crores: number | null
          created_at: string | null
          entity_id: string
          gross_inflows_crores: number | null
          gross_outflows_crores: number | null
          hqla_adjusted_crores: number | null
          id: string
          inflow_cap_amount_crores: number | null
          inflow_cap_applied: boolean | null
          lcr_pct: number | null
          net_cash_outflows_crores: number | null
          run_date: string
          run_metadata: Json | null
          scenario: string
        }
        Insert: {
          breaches_internal_buffer?: boolean | null
          breaches_rbi_minimum?: boolean | null
          capped_inflows_crores?: number | null
          created_at?: string | null
          entity_id?: string
          gross_inflows_crores?: number | null
          gross_outflows_crores?: number | null
          hqla_adjusted_crores?: number | null
          id?: string
          inflow_cap_amount_crores?: number | null
          inflow_cap_applied?: boolean | null
          lcr_pct?: number | null
          net_cash_outflows_crores?: number | null
          run_date: string
          run_metadata?: Json | null
          scenario: string
        }
        Update: {
          breaches_internal_buffer?: boolean | null
          breaches_rbi_minimum?: boolean | null
          capped_inflows_crores?: number | null
          created_at?: string | null
          entity_id?: string
          gross_inflows_crores?: number | null
          gross_outflows_crores?: number | null
          hqla_adjusted_crores?: number | null
          id?: string
          inflow_cap_amount_crores?: number | null
          inflow_cap_applied?: boolean | null
          lcr_pct?: number | null
          net_cash_outflows_crores?: number | null
          run_date?: string
          run_metadata?: Json | null
          scenario?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          auth_id: string | null
          bio: string | null
          created_at: string
          department: string
          email: string
          full_name: string
          graduation_year: number
          id: string
          institution_id: number | null
          is_verified: boolean | null
          linkedin_url: string | null
          phone: string | null
          resume_url: string | null
          skills: Json | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          bio?: string | null
          created_at?: string
          department: string
          email: string
          full_name: string
          graduation_year: number
          id?: string
          institution_id?: number | null
          is_verified?: boolean | null
          linkedin_url?: string | null
          phone?: string | null
          resume_url?: string | null
          skills?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          bio?: string | null
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          graduation_year?: number
          id?: string
          institution_id?: number | null
          is_verified?: boolean | null
          linkedin_url?: string | null
          phone?: string | null
          resume_url?: string | null
          skills?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          annual_price: number | null
          created_at: string | null
          description: string | null
          limits: Json | null
          monthly_price: number | null
          name: string
          plan_id: string
          updated_at: string | null
        }
        Insert: {
          annual_price?: number | null
          created_at?: string | null
          description?: string | null
          limits?: Json | null
          monthly_price?: number | null
          name: string
          plan_id?: string
          updated_at?: string | null
        }
        Update: {
          annual_price?: number | null
          created_at?: string | null
          description?: string | null
          limits?: Json | null
          monthly_price?: number | null
          name?: string
          plan_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_account_id: string | null
          created_at: string | null
          end_date: string | null
          plan_id: string | null
          renewal_date: string | null
          start_date: string | null
          status: string | null
          subscription_id: string
          tenant_id: string | null
          trial_end_date: string | null
          updated_at: string | null
        }
        Insert: {
          billing_account_id?: string | null
          created_at?: string | null
          end_date?: string | null
          plan_id?: string | null
          renewal_date?: string | null
          start_date?: string | null
          status?: string | null
          subscription_id?: string
          tenant_id?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_account_id?: string | null
          created_at?: string | null
          end_date?: string | null
          plan_id?: string | null
          renewal_date?: string | null
          start_date?: string | null
          status?: string | null
          subscription_id?: string
          tenant_id?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tags: {
        Row: {
          name: string
          tag_id: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          name: string
          tag_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          name?: string
          tag_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding_settings: Json | null
          created_at: string | null
          feature_flags: Json | null
          name: string
          plan_id: string | null
          retake_cooldown_days: number
          slug: string
          status: string | null
          tenant_id: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          branding_settings?: Json | null
          created_at?: string | null
          feature_flags?: Json | null
          name: string
          plan_id?: string | null
          retake_cooldown_days?: number
          slug: string
          status?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          branding_settings?: Json | null
          created_at?: string | null
          feature_flags?: Json | null
          name?: string
          plan_id?: string | null
          retake_cooldown_days?: number
          slug?: string
          status?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["plan_id"]
          },
        ]
      }
    }
    Views: {
      hqla_buffer_summary: {
        Row: {
          adjusted_value_cr: number | null
          asset_count: number | null
          hqla_level: string | null
          last_updated: string | null
          total_market_value_cr: number | null
        }
        Relationships: []
      }
      orgspec_lead_summary: {
        Row: {
          ai_score: number | null
          company_name: string | null
          created_at: string | null
          deal_value: number | null
          email: string | null
          gap_count: number | null
          id: string | null
          status: string | null
          tier_interest: string | null
          website_url: string | null
        }
        Insert: {
          ai_score?: number | null
          company_name?: string | null
          created_at?: string | null
          deal_value?: number | null
          email?: string | null
          gap_count?: never
          id?: string | null
          status?: string | null
          tier_interest?: string | null
          website_url?: string | null
        }
        Update: {
          ai_score?: number | null
          company_name?: string | null
          created_at?: string | null
          deal_value?: number | null
          email?: string | null
          gap_count?: never
          id?: string | null
          status?: string | null
          tier_interest?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      orgspec_stats: {
        Row: {
          avg_ai_score: number | null
          contacted: number | null
          converted: number | null
          new_leads: number | null
          total_leads: number | null
          total_revenue_inr: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_profile_id: { Args: never; Returns: string }
      auth_role: { Args: never; Returns: string }
      check_whitelist_email: {
        Args: { check_email: string; inst_id: number }
        Returns: boolean
      }
      get_auth_tenant_id: { Args: never; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
