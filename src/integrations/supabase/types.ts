export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          created_at: string;
          diff: Json | null;
          entity: string;
          entity_id: string | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          diff?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: number;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          diff?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
      coil_slit_map: {
        Row: {
          coil_spec_id: number;
          observed_count: number;
          slit_spec_id: number;
        };
        Insert: {
          coil_spec_id: number;
          observed_count?: number;
          slit_spec_id: number;
        };
        Update: {
          coil_spec_id?: number;
          observed_count?: number;
          slit_spec_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "coil_slit_map_coil_spec_id_fkey";
            columns: ["coil_spec_id"];
            isOneToOne: false;
            referencedRelation: "coil_spec";
            referencedColumns: ["spec_id"];
          },
          {
            foreignKeyName: "coil_slit_map_slit_spec_id_fkey";
            columns: ["slit_spec_id"];
            isOneToOne: false;
            referencedRelation: "slit_spec";
            referencedColumns: ["spec_id"];
          },
        ];
      };
      coil_spec: {
        Row: {
          source: string;
          spec_id: number;
          thickness_mm: number;
          width_mm: number;
        };
        Insert: {
          source?: string;
          spec_id?: number;
          thickness_mm: number;
          width_mm: number;
        };
        Update: {
          source?: string;
          spec_id?: number;
          thickness_mm?: number;
          width_mm?: number;
        };
        Relationships: [];
      };
      combination: {
        Row: {
          coil_spec_id: number;
          combination_id: number;
          created_at: string;
          created_by: string | null;
          last_used_at: string | null;
          no_of_coils_typical: number | null;
          scrap_mm: number | null;
          signature: string | null;
          source: Database["public"]["Enums"]["combination_source"];
          total_slit_width_mm: number | null;
          updated_at: string;
        };
        Insert: {
          coil_spec_id: number;
          combination_id?: number;
          created_at?: string;
          created_by?: string | null;
          last_used_at?: string | null;
          no_of_coils_typical?: number | null;
          scrap_mm?: number | null;
          signature?: string | null;
          source?: Database["public"]["Enums"]["combination_source"];
          total_slit_width_mm?: number | null;
          updated_at?: string;
        };
        Update: {
          coil_spec_id?: number;
          combination_id?: number;
          created_at?: string;
          created_by?: string | null;
          last_used_at?: string | null;
          no_of_coils_typical?: number | null;
          scrap_mm?: number | null;
          signature?: string | null;
          source?: Database["public"]["Enums"]["combination_source"];
          total_slit_width_mm?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "combination_coil_spec_id_fkey";
            columns: ["coil_spec_id"];
            isOneToOne: false;
            referencedRelation: "coil_spec";
            referencedColumns: ["spec_id"];
          },
        ];
      };
      combination_line: {
        Row: {
          combination_id: number;
          line_id: number;
          product_id: number;
          sequence: number;
          slit_count: number;
          slit_spec_id: number;
        };
        Insert: {
          combination_id: number;
          line_id?: number;
          product_id: number;
          sequence: number;
          slit_count: number;
          slit_spec_id: number;
        };
        Update: {
          combination_id?: number;
          line_id?: number;
          product_id?: number;
          sequence?: number;
          slit_count?: number;
          slit_spec_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "combination_line_combination_id_fkey";
            columns: ["combination_id"];
            isOneToOne: false;
            referencedRelation: "combination";
            referencedColumns: ["combination_id"];
          },
          {
            foreignKeyName: "combination_line_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "combination_line_slit_spec_id_fkey";
            columns: ["slit_spec_id"];
            isOneToOne: false;
            referencedRelation: "slit_spec";
            referencedColumns: ["spec_id"];
          },
        ];
      };
      combination_machine: {
        Row: {
          combination_id: number;
          first_seen_file: string | null;
          first_seen_sheet: string | null;
          frequency: number;
          machine_id: number;
        };
        Insert: {
          combination_id: number;
          first_seen_file?: string | null;
          first_seen_sheet?: string | null;
          frequency?: number;
          machine_id: number;
        };
        Update: {
          combination_id?: number;
          first_seen_file?: string | null;
          first_seen_sheet?: string | null;
          frequency?: number;
          machine_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "combination_machine_combination_id_fkey";
            columns: ["combination_id"];
            isOneToOne: false;
            referencedRelation: "combination";
            referencedColumns: ["combination_id"];
          },
          {
            foreignKeyName: "combination_machine_machine_id_fkey";
            columns: ["machine_id"];
            isOneToOne: false;
            referencedRelation: "machine";
            referencedColumns: ["machine_id"];
          },
        ];
      };
      machine: {
        Row: {
          code: string;
          machine_id: number;
          max_thickness_mm: number | null;
          name: string;
          observed_max_thickness_mm: number | null;
          observed_min_thickness_mm: number | null;
        };
        Insert: {
          code: string;
          machine_id?: number;
          max_thickness_mm?: number | null;
          name: string;
          observed_max_thickness_mm?: number | null;
          observed_min_thickness_mm?: number | null;
        };
        Update: {
          code?: string;
          machine_id?: number;
          max_thickness_mm?: number | null;
          name?: string;
          observed_max_thickness_mm?: number | null;
          observed_min_thickness_mm?: number | null;
        };
        Relationships: [];
      };
      plan: {
        Row: {
          created_at: string;
          created_by: string | null;
          machine_id: number;
          notes: string | null;
          plan_id: number;
          plan_number: string;
          planned_for: string | null;
          status: Database["public"]["Enums"]["plan_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          machine_id: number;
          notes?: string | null;
          plan_id?: number;
          plan_number: string;
          planned_for?: string | null;
          status?: Database["public"]["Enums"]["plan_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          machine_id?: number;
          notes?: string | null;
          plan_id?: number;
          plan_number?: string;
          planned_for?: string | null;
          status?: Database["public"]["Enums"]["plan_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_machine_id_fkey";
            columns: ["machine_id"];
            isOneToOne: false;
            referencedRelation: "machine";
            referencedColumns: ["machine_id"];
          },
        ];
      };
      plan_line: {
        Row: {
          actual_output_kg: number | null;
          coil_spec_id: number;
          combination_id: number;
          created_at: string;
          expected_output_kg: number | null;
          no_of_coils: number;
          notes: string | null;
          plan_id: number;
          plan_line_id: number;
          sequence: number;
          status: Database["public"]["Enums"]["plan_line_status"];
          updated_at: string;
        };
        Insert: {
          actual_output_kg?: number | null;
          coil_spec_id: number;
          combination_id: number;
          created_at?: string;
          expected_output_kg?: number | null;
          no_of_coils: number;
          notes?: string | null;
          plan_id: number;
          plan_line_id?: number;
          sequence: number;
          status?: Database["public"]["Enums"]["plan_line_status"];
          updated_at?: string;
        };
        Update: {
          actual_output_kg?: number | null;
          coil_spec_id?: number;
          combination_id?: number;
          created_at?: string;
          expected_output_kg?: number | null;
          no_of_coils?: number;
          notes?: string | null;
          plan_id?: number;
          plan_line_id?: number;
          sequence?: number;
          status?: Database["public"]["Enums"]["plan_line_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_line_coil_spec_id_fkey";
            columns: ["coil_spec_id"];
            isOneToOne: false;
            referencedRelation: "coil_spec";
            referencedColumns: ["spec_id"];
          },
          {
            foreignKeyName: "plan_line_combination_id_fkey";
            columns: ["combination_id"];
            isOneToOne: false;
            referencedRelation: "combination";
            referencedColumns: ["combination_id"];
          },
          {
            foreignKeyName: "plan_line_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plan";
            referencedColumns: ["plan_id"];
          },
        ];
      };
      product: {
        Row: {
          label: string;
          product_id: number;
        };
        Insert: {
          label: string;
          product_id?: number;
        };
        Update: {
          label?: string;
          product_id?: number;
        };
        Relationships: [];
      };
      slit_product_map: {
        Row: {
          observed_count: number;
          product_id: number;
          slit_spec_id: number;
        };
        Insert: {
          observed_count?: number;
          product_id: number;
          slit_spec_id: number;
        };
        Update: {
          observed_count?: number;
          product_id?: number;
          slit_spec_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "slit_product_map_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product";
            referencedColumns: ["product_id"];
          },
          {
            foreignKeyName: "slit_product_map_slit_spec_id_fkey";
            columns: ["slit_spec_id"];
            isOneToOne: false;
            referencedRelation: "slit_spec";
            referencedColumns: ["spec_id"];
          },
        ];
      };
      slit_spec: {
        Row: {
          source: string;
          spec_id: number;
          thickness_mm: number;
          width_mm: number;
        };
        Insert: {
          source?: string;
          spec_id?: number;
          thickness_mm: number;
          width_mm: number;
        };
        Update: {
          source?: string;
          spec_id?: number;
          thickness_mm?: number;
          width_mm?: number;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      compute_combination_signature: {
        Args: { _combination_id: number };
        Returns: string;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      upsert_combination: {
        Args: {
          _coil_spec_id: number;
          _lines: Json;
          _machine_id: number;
          _no_of_coils_typical?: number;
          _scrap_mm?: number;
          _total_slit_width_mm?: number;
        };
        Returns: {
          combination_id: number;
          was_duplicate: boolean;
        }[];
      };
    };
    Enums: {
      app_role: "viewer" | "planner" | "editor" | "manager" | "admin";
      combination_source: "imported" | "manual" | "curated";
      plan_line_status: "pending" | "in_progress" | "done" | "cancelled";
      plan_status: "draft" | "released" | "in_progress" | "done" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["viewer", "planner", "editor", "manager", "admin"],
      combination_source: ["imported", "manual", "curated"],
      plan_line_status: ["pending", "in_progress", "done", "cancelled"],
      plan_status: ["draft", "released", "in_progress", "done", "cancelled"],
    },
  },
} as const;
