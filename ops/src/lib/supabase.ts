import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_KEY } from '$env/static/private';

// Client for browser-side operations (read-only)
export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

// Server-side client with service key (full access)
export const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Types for our progressive capture system
export interface ProgressiveCaptureJob {
  id: string;
  job_type: string;
  repository_id: string;
  processor_type: 'inngest' | 'github_actions';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  time_range_days?: number;
  workflow_run_id?: number;
  metadata?: Record<string, any>;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface JobMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  success_rate: number;
  avg_duration: number;
}

export interface HybridQueueStats {
  inngest: JobMetrics;
  github_actions: JobMetrics;
  total: JobMetrics;
  last_updated: string;
}