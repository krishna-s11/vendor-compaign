export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      campaign_email_sends: {
        Row: {
          campaign_id: string
          created_at: string
          email_type: string
          id: string
          sent_at: string
          status: string
          vendor_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email_type: string
          id?: string
          sent_at?: string
          status?: string
          vendor_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email_type?: string
          id?: string
          sent_at?: string
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "msme_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_email_sends_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_uploads: {
        Row: {
          campaign_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          uploaded_at: string
          vendor_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          uploaded_at?: string
          vendor_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          uploaded_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_uploads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "msme_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploads_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          subject: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      form_fields: {
        Row: {
          conditional_logic: Json | null
          created_at: string
          field_name: string
          field_type: string
          form_id: string
          id: string
          is_required: boolean | null
          label: string
          options: Json | null
          order_index: number
          validation_rules: Json | null
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string
          field_name: string
          field_type: string
          form_id: string
          id?: string
          is_required?: boolean | null
          label: string
          options?: Json | null
          order_index?: number
          validation_rules?: Json | null
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string
          field_name?: string
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean | null
          label?: string
          options?: Json | null
          order_index?: number
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          campaign_id: string | null
          created_at: string
          form_id: string
          id: string
          ip_address: string | null
          response_data: Json | null
          submitted_at: string
          vendor_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          form_id: string
          id?: string
          ip_address?: string | null
          response_data?: Json | null
          submitted_at?: string
          vendor_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          form_id?: string
          id?: string
          ip_address?: string | null
          response_data?: Json | null
          submitted_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "msme_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      msme_campaigns: {
        Row: {
          communication_only: boolean | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          email_template_id: string | null
          form_id: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["campaign_status"] | null
          target_vendors: string[] | null
          updated_at: string
          whatsapp_template_id: string | null
        }
        Insert: {
          communication_only?: boolean | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          email_template_id?: string | null
          form_id?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_vendors?: string[] | null
          updated_at?: string
          whatsapp_template_id?: string | null
        }
        Update: {
          communication_only?: boolean | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          email_template_id?: string | null
          form_id?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_vendors?: string[] | null
          updated_at?: string
          whatsapp_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "msme_campaigns_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "msme_campaigns_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "msme_campaigns_whatsapp_template_id_fkey"
            columns: ["whatsapp_template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      msme_responses: {
        Row: {
          campaign_id: string | null
          created_at: string
          form_data: Json | null
          id: string
          response_status: Database["public"]["Enums"]["response_status"] | null
          submitted_at: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          form_data?: Json | null
          id?: string
          response_status?:
            | Database["public"]["Enums"]["response_status"]
            | null
          submitted_at?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          form_data?: Json | null
          id?: string
          response_status?:
            | Database["public"]["Enums"]["response_status"]
            | null
          submitted_at?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "msme_responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "msme_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "msme_responses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      upload_logs: {
        Row: {
          created_at: string
          created_by: string | null
          error_details: string | null
          error_type: string
          id: string
          raw_data: Json | null
          upload_session_id: string
          vendor_code: string | null
          vendor_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_details?: string | null
          error_type: string
          id?: string
          raw_data?: Json | null
          upload_session_id?: string
          vendor_code?: string | null
          vendor_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_details?: string | null
          error_type?: string
          id?: string
          raw_data?: Json | null
          upload_session_id?: string
          vendor_code?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          business_category: string | null
          closing_balance: number | null
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          email: string | null
          group_category: string | null
          id: string
          last_updated_date: string | null
          location: string | null
          msme_category: Database["public"]["Enums"]["msme_category"] | null
          msme_status: Database["public"]["Enums"]["msme_status"] | null
          opening_balance: number | null
          phone: string | null
          registration_date: string | null
          udyam_number: string | null
          updated_at: string
          vendor_code: string
          vendor_name: string
        }
        Insert: {
          business_category?: string | null
          closing_balance?: number | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          email?: string | null
          group_category?: string | null
          id?: string
          last_updated_date?: string | null
          location?: string | null
          msme_category?: Database["public"]["Enums"]["msme_category"] | null
          msme_status?: Database["public"]["Enums"]["msme_status"] | null
          opening_balance?: number | null
          phone?: string | null
          registration_date?: string | null
          udyam_number?: string | null
          updated_at?: string
          vendor_code: string
          vendor_name: string
        }
        Update: {
          business_category?: string | null
          closing_balance?: number | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          email?: string | null
          group_category?: string | null
          id?: string
          last_updated_date?: string | null
          location?: string | null
          msme_category?: Database["public"]["Enums"]["msme_category"] | null
          msme_status?: Database["public"]["Enums"]["msme_status"] | null
          opening_balance?: number | null
          phone?: string | null
          registration_date?: string | null
          udyam_number?: string | null
          updated_at?: string
          vendor_code?: string
          vendor_name?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      campaign_status: "Draft" | "Active" | "Completed" | "Cancelled"
      msme_category: "Micro" | "Small" | "Medium" | "Others"
      msme_status:
        | "MSME Certified"
        | "Non MSME"
        | "MSME Application Pending"
        | "Others"
        | "MSME"
      response_status: "Pending" | "Completed" | "Partial"
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
      campaign_status: ["Draft", "Active", "Completed", "Cancelled"],
      msme_category: ["Micro", "Small", "Medium", "Others"],
      msme_status: [
        "MSME Certified",
        "Non MSME",
        "MSME Application Pending",
        "Others",
        "MSME",
      ],
      response_status: ["Pending", "Completed", "Partial"],
    },
  },
} as const
