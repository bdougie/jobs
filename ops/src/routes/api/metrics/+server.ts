import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/supabase.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const repositoryId = url.searchParams.get('repository_id');
    
    // Build query
    let query = supabaseAdmin
      .from('progressive_capture_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000); // Last 1000 jobs for metrics
    
    // Filter by repository if specified
    if (repositoryId) {
      query = query.eq('repository_id', repositoryId);
    }
    
    // Query progressive capture jobs for metrics
    const { data: jobs, error: jobsError } = await query;

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    if (!jobs) {
      throw new Error('No jobs data returned');
    }

    // Calculate metrics by processor type
    const inngestJobs = jobs.filter(job => job.processor_type === 'inngest');
    const githubActionsJobs = jobs.filter(job => job.processor_type === 'github_actions');

    const calculateJobMetrics = (jobList: typeof jobs) => {
      const pending = jobList.filter(job => job.status === 'pending').length;
      const processing = jobList.filter(job => job.status === 'processing').length;
      const completed = jobList.filter(job => job.status === 'completed').length;
      const failed = jobList.filter(job => job.status === 'failed').length;
      
      const total = completed + failed;
      const success_rate = total > 0 ? (completed / total) * 100 : 0;
      
      // Calculate average duration for completed jobs
      const completedJobs = jobList.filter(job => 
        job.status === 'completed' && job.started_at && job.completed_at
      );
      
      const avg_duration = completedJobs.length > 0 
        ? completedJobs.reduce((sum, job) => {
            const start = new Date(job.started_at!).getTime();
            const end = new Date(job.completed_at!).getTime();
            return sum + (end - start);
          }, 0) / completedJobs.length
        : 0;

      return {
        pending,
        processing,
        completed,
        failed,
        success_rate: Math.round(success_rate * 10) / 10, // Round to 1 decimal
        avg_duration: Math.round(avg_duration)
      };
    };

    const inngestMetrics = calculateJobMetrics(inngestJobs);
    const githubActionsMetrics = calculateJobMetrics(githubActionsJobs);
    const totalMetrics = calculateJobMetrics(jobs);

    const response = {
      inngest: inngestMetrics,
      github_actions: githubActionsMetrics,
      total: totalMetrics,
      last_updated: new Date().toISOString()
    };

    return json(response);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};