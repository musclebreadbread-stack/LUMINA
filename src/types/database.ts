/**
 * Public Supabase schema contract used by the server DAL.
 * private_cognitive is deliberately omitted: its rows must not become a
 * browser-facing generated type or a client component prop.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      assessment_runs: {
        Row: {
          id: string;
          owner_id: string;
          assessment_key: "cognitive_v1";
          status: "active" | "paused" | "completed" | "invalid";
          item_bank_version: string;
          algorithm_version: string;
          blueprint_version: string;
          target_item_count: number;
          answered_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          assessment_key: "cognitive_v1";
          status?: "active";
          item_bank_version: string;
          algorithm_version: string;
          blueprint_version: string;
          target_item_count: number;
          answered_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          assessment_key?: "cognitive_v1";
          status?: "active" | "paused" | "completed" | "invalid";
          item_bank_version?: string;
          algorithm_version?: string;
          blueprint_version?: string;
          target_item_count?: number;
          answered_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assessment_results: {
        Row: {
          id: string;
          run_id: string;
          owner_id: string;
          status: "pilot_withheld" | "standardized_scored" | "ineligible";
          norm_version: string | null;
          score_payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          owner_id: string;
          status: "pilot_withheld" | "standardized_scored" | "ineligible";
          norm_version?: string | null;
          score_payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string;
          owner_id?: string;
          status?: "pilot_withheld" | "standardized_scored" | "ineligible";
          norm_version?: string | null;
          score_payload?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      research_consents: {
        Row: {
          id: string;
          owner_id: string;
          consent_version: string;
          operational_storage: true;
          research_participation: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          consent_version: string;
          operational_storage: true;
          research_participation: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          consent_version?: string;
          operational_storage?: true;
          research_participation?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
