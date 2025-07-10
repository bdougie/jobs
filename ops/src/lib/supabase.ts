import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

// Support both naming conventions (with and without PUBLIC_ prefix)
const SUPABASE_URL = env.PUBLIC_SUPABASE_URL || privateEnv.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY || privateEnv.SUPABASE_ANON_KEY || privateEnv.SUPABASE_TOKEN;
const SUPABASE_SERVICE_KEY = privateEnv.SUPABASE_SERVICE_KEY;

// Provide default values for build-time if missing (will be overridden at runtime)
const url = SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!SUPABASE_URL) {
  console.warn('SUPABASE_URL not found. Using placeholder for build.');
}

if (!SUPABASE_ANON_KEY) {
  console.warn('SUPABASE_ANON_KEY not found. Using placeholder for build.');
}

// Client for browser-side operations (read-only)
export const supabase = createClient(url, anonKey);

// Server-side client with service key (full access)
export const supabaseAdmin = createClient(url, SUPABASE_SERVICE_KEY || anonKey);

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