import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/supabase.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const processor = url.searchParams.get('processor'); // 'inngest' | 'github_actions'
    const status = url.searchParams.get('status'); // 'pending' | 'processing' | 'completed' | 'failed'
    const repositoryId = url.searchParams.get('repository_id');

    let query = supabaseAdmin
      .from('progressive_capture_jobs')
      .select(`
        *,
        repositories:repository_id(
          id,
          name,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters if provided
    if (processor) {
      query = query.eq('processor_type', processor);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (repositoryId) {
      query = query.eq('repository_id', repositoryId);
    }

    const { data: jobs, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch recent jobs: ${error.message}`);
    }

    // Transform the data to include repository info
    const transformedJobs = jobs?.map(job => ({
      ...job,
      repository: job.repositories || null
    })) || [];

    return json(transformedJobs);
  } catch (error) {
    console.error('Error fetching recent jobs:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};