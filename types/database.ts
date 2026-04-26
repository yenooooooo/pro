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
    PostgrestVersion: "14.4"
  }
  chongmu: {
    Tables: {
      assets: {
        Row: {
          acquisition_cost: number | null
          acquisition_date: string | null
          asset_no: string | null
          assigned_to: string | null
          category: string | null
          created_at: string
          disposed_at: string | null
          id: string
          location: string | null
          memo: string | null
          name: string
          status: string
          updated_at: string
          useful_life: number | null
        }
        Insert: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          asset_no?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          disposed_at?: string | null
          id?: string
          location?: string | null
          memo?: string | null
          name: string
          status?: string
          updated_at?: string
          useful_life?: number | null
        }
        Update: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          asset_no?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          disposed_at?: string | null
          id?: string
          location?: string | null
          memo?: string | null
          name?: string
          status?: string
          updated_at?: string
          useful_life?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          holiday_hours: number
          id: string
          night_hours: number
          note: string | null
          overtime_hours: number
          regular_hours: number
          updated_at: string
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          holiday_hours?: number
          id?: string
          night_hours?: number
          note?: string | null
          overtime_hours?: number
          regular_hours?: number
          updated_at?: string
          work_date: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          holiday_hours?: number
          id?: string
          night_hours?: number
          note?: string | null
          overtime_hours?: number
          regular_hours?: number
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_history: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_done: boolean
          month: number
          note: string | null
          task_id: string
          updated_at: string
          year: number
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_done?: boolean
          month: number
          note?: string | null
          task_id: string
          updated_at?: string
          year: number
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_done?: boolean
          month?: number
          note?: string | null
          task_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "closing_history_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "closing_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_no: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_no: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_no?: number
          title?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          bank_account: string | null
          bank_name: string | null
          base_salary: number
          birth_date: string | null
          created_at: string
          deleted_at: string | null
          department_id: string | null
          dependents: number
          email: string | null
          employee_no: string
          hire_date: string
          id: string
          name: string
          phone: string | null
          position_id: string | null
          resign_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          bank_name?: string | null
          base_salary: number
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          department_id?: string | null
          dependents?: number
          email?: string | null
          employee_no: string
          hire_date: string
          id?: string
          name: string
          phone?: string | null
          position_id?: string | null
          resign_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          department_id?: string | null
          dependents?: number
          email?: string | null
          employee_no?: string
          hire_date?: string
          id?: string
          name?: string
          phone?: string | null
          position_id?: string | null
          resign_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          budget_monthly: number | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          budget_monthly?: number | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          budget_monthly?: number | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          expense_date: string
          id: string
          is_taxable: boolean
          payment_method: string
          receipt_url: string | null
          updated_at: string
          vat: number
          vendor_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          expense_date: string
          id?: string
          is_taxable?: boolean
          payment_method: string
          receipt_url?: string | null
          updated_at?: string
          vat?: number
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          is_taxable?: boolean
          payment_method?: string
          receipt_url?: string | null
          updated_at?: string
          vat?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      income_tax_table: {
        Row: {
          created_at: string
          dependents: number
          id: string
          max_salary: number
          min_salary: number
          tax: number
          year: number
        }
        Insert: {
          created_at?: string
          dependents: number
          id?: string
          max_salary: number
          min_salary: number
          tax: number
          year: number
        }
        Update: {
          created_at?: string
          dependents?: number
          id?: string
          max_salary?: number
          min_salary?: number
          tax?: number
          year?: number
        }
        Relationships: []
      }
      insurance_rates: {
        Row: {
          created_at: string
          effective_from: string | null
          employment_rate: number
          health_rate: number
          id: string
          ltc_rate: number
          pension_max_base: number | null
          pension_min_base: number | null
          pension_rate: number
          source: string | null
          year: number
        }
        Insert: {
          created_at?: string
          effective_from?: string | null
          employment_rate: number
          health_rate: number
          id?: string
          ltc_rate: number
          pension_max_base?: number | null
          pension_min_base?: number | null
          pension_rate: number
          source?: string | null
          year: number
        }
        Update: {
          created_at?: string
          effective_from?: string | null
          employment_rate?: number
          health_rate?: number
          id?: string
          ltc_rate?: number
          pension_max_base?: number | null
          pension_min_base?: number | null
          pension_rate?: number
          source?: string | null
          year?: number
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          remaining: number
          total_granted: number
          total_used: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          remaining: number
          total_granted: number
          total_used?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          remaining?: number
          total_granted?: number
          total_used?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days: number
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          base_salary: number
          calculated_at: string
          confirmed_at: string | null
          created_at: string
          employee_id: string
          employment_deduction: number
          gross_pay: number
          health_deduction: number
          holiday_pay: number
          id: string
          income_tax: number
          local_income_tax: number
          ltc_deduction: number
          meal_allowance: number
          net_pay: number
          night_pay: number
          other_allowance: number
          other_deduction: number
          overtime_pay: number
          paid_at: string | null
          pay_month: number
          pay_year: number
          pension_deduction: number
          position_allowance: number
          status: string
          total_deduction: number
          updated_at: string
        }
        Insert: {
          base_salary: number
          calculated_at?: string
          confirmed_at?: string | null
          created_at?: string
          employee_id: string
          employment_deduction?: number
          gross_pay: number
          health_deduction?: number
          holiday_pay?: number
          id?: string
          income_tax?: number
          local_income_tax?: number
          ltc_deduction?: number
          meal_allowance?: number
          net_pay: number
          night_pay?: number
          other_allowance?: number
          other_deduction?: number
          overtime_pay?: number
          paid_at?: string | null
          pay_month: number
          pay_year: number
          pension_deduction?: number
          position_allowance?: number
          status?: string
          total_deduction: number
          updated_at?: string
        }
        Update: {
          base_salary?: number
          calculated_at?: string
          confirmed_at?: string | null
          created_at?: string
          employee_id?: string
          employment_deduction?: number
          gross_pay?: number
          health_deduction?: number
          holiday_pay?: number
          id?: string
          income_tax?: number
          local_income_tax?: number
          ltc_deduction?: number
          meal_allowance?: number
          net_pay?: number
          night_pay?: number
          other_allowance?: number
          other_deduction?: number
          overtime_pay?: number
          paid_at?: string | null
          pay_month?: number
          pay_year?: number
          pension_deduction?: number
          position_allowance?: number
          status?: string
          total_deduction?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          id: string
          level: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          name?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          business_no: string | null
          category: string | null
          contact_person: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          email: string | null
          id: string
          memo: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          business_no?: string | null
          category?: string | null
          contact_person?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          email?: string | null
          id?: string
          memo?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          business_no?: string | null
          category?: string | null
          contact_person?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          email?: string | null
          id?: string
          memo?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_leave: {
        Args: {
          p_employee_id: string
          p_leave_type: string
          p_start_date: string
          p_end_date: string
          p_days: number
          p_reason: string | null
        }
        Returns: string
      }
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
  chongmu: {
    Enums: {},
  },
} as const
