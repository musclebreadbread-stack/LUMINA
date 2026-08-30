/**
 * Legacy Supabase schema contract retained for historical migration tests.
 * The active cognitive server DAL uses Neon SQL and does not import this
 * type; private rows are never returned as Client Component props.
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
    Functions: {
      [key: string]: never;
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  private_cognitive: {
    Tables: {
      item_versions: {
        Row: {
          version_id: string;
          item_bank_version: string;
          calibration_version: string;
          domain: "gf" | "gc" | "gv" | "gwm" | "gs";
          status: "draft" | "pilot" | "active" | "retired";
          presentation: Json;
          parameters: Json | null;
          exposure_rate: number;
          created_at: string;
        };
        Insert: {
          version_id: string;
          item_bank_version: string;
          calibration_version: string;
          domain: "gf" | "gc" | "gv" | "gwm" | "gs";
          status: "draft" | "pilot" | "active" | "retired";
          presentation: Json;
          parameters?: Json | null;
          exposure_rate: number;
          created_at?: string;
        };
        Update: {
          version_id?: string;
          item_bank_version?: string;
          calibration_version?: string;
          domain?: "gf" | "gc" | "gv" | "gwm" | "gs";
          status?: "draft" | "pilot" | "active" | "retired";
          presentation?: Json;
          parameters?: Json | null;
          exposure_rate?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      answer_keys: {
        Row: {
          version_id: string;
          correct_option_id: string;
        };
        Insert: {
          version_id: string;
          correct_option_id: string;
        };
        Update: {
          version_id?: string;
          correct_option_id?: string;
        };
        Relationships: [];
      };
      run_assignments: {
        Row: {
          assignment_id: string;
          run_id: string;
          item_version_id: string;
          ordinal: number;
          state: "current" | "answered" | "expired";
          presented_at: string;
          answered_at: string | null;
        };
        Insert: {
          assignment_id?: string;
          run_id: string;
          item_version_id: string;
          ordinal: number;
          state: "current" | "answered" | "expired";
          presented_at?: string;
          answered_at?: string | null;
        };
        Update: {
          assignment_id?: string;
          run_id?: string;
          item_version_id?: string;
          ordinal?: number;
          state?: "current" | "answered" | "expired";
          presented_at?: string;
          answered_at?: string | null;
        };
        Relationships: [];
      };
      raw_responses: {
        Row: {
          response_id: string;
          run_id: string;
          assignment_id: string;
          option_id: string;
          elapsed_ms: number | null;
          submitted_at: string;
        };
        Insert: {
          response_id?: string;
          run_id: string;
          assignment_id: string;
          option_id: string;
          elapsed_ms?: number | null;
          submitted_at?: string;
        };
        Update: {
          response_id?: string;
          run_id?: string;
          assignment_id?: string;
          option_id?: string;
          elapsed_ms?: number | null;
          submitted_at?: string;
        };
        Relationships: [];
      };
      scoring_state: {
        Row: {
          run_id: string;
          server_seed: string;
          theta: number;
          information: number;
          standard_error: number | null;
          answered_count: number;
          age_years: number | null;
          updated_at: string;
        };
        Insert: {
          run_id: string;
          server_seed: string;
          theta?: number;
          information?: number;
          standard_error?: number | null;
          answered_count?: number;
          age_years?: number | null;
          updated_at?: string;
        };
        Update: {
          run_id?: string;
          server_seed?: string;
          theta?: number;
          information?: number;
          standard_error?: number | null;
          answered_count?: number;
          age_years?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          event_id: string;
          run_id: string | null;
          actor_id: string | null;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          event_id?: string;
          run_id?: string | null;
          actor_id?: string | null;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          run_id?: string | null;
          actor_id?: string | null;
          event_type?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      norm_releases: {
        Row: {
          id: string;
          status: "candidate" | "approved" | "retired";
          target_population: "ko-adults-18-64";
          item_bank_version: string;
          algorithm_version: string;
          norm_payload: Json;
          validation_manifest_hash: string;
          approved_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          status: "candidate" | "approved" | "retired";
          target_population: "ko-adults-18-64";
          item_bank_version: string;
          algorithm_version: string;
          norm_payload: Json;
          validation_manifest_hash: string;
          approved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          status?: "candidate" | "approved" | "retired";
          target_population?: "ko-adults-18-64";
          item_bank_version?: string;
          algorithm_version?: string;
          norm_payload?: Json;
          validation_manifest_hash?: string;
          approved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      submit_response: {
        Args: {
          p_run_id: string;
          p_assignment_id: string;
          p_option_id: string;
          p_elapsed_ms?: number | null;
        };
        Returns: {
          returned_run_id: string;
          returned_status: string;
          next_assignment_id: string | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
