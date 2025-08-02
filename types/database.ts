export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      schemas: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schema_columns: {
        Row: {
          id: string
          schema_id: string
          name: string
          data_type: string
          position: number
          sample_values: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          schema_id: string
          name: string
          data_type: string
          position: number
          sample_values?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          schema_id?: string
          name?: string
          data_type?: string
          position?: number
          sample_values?: Json | null
          created_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          schema_id: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          schema_id: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          schema_id?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          completed_at?: string | null
        }
      }
      job_files: {
        Row: {
          id: string
          job_id: string
          file_name: string
          file_type: string
          file_url: string
          raw_data: Json | null
          processed_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          file_name: string
          file_type: string
          file_url: string
          raw_data?: Json | null
          processed_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          file_name?: string
          file_type?: string
          file_url?: string
          raw_data?: Json | null
          processed_data?: Json | null
          created_at?: string
        }
      }
      column_mappings: {
        Row: {
          id: string
          job_id: string
          file_id: string
          source_column: string
          target_column: string
          confidence: number
          mapping_type: 'exact' | 'fuzzy' | 'ai' | 'manual'
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          file_id: string
          source_column: string
          target_column: string
          confidence: number
          mapping_type: 'exact' | 'fuzzy' | 'ai' | 'manual'
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          file_id?: string
          source_column?: string
          target_column?: string
          confidence?: number
          mapping_type?: 'exact' | 'fuzzy' | 'ai' | 'manual'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}