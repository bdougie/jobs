import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  const supabase = createClient();
  const repositoryId = params.id;

  try {
    // Fetch repository data
    const { data: repository, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', repositoryId)
      .single();

    if (repoError) {
      if (repoError.code === 'PGRST116') { // No rows returned
        throw error(404, 'Repository not found');
      }
      throw repoError;
    }

    return json(repository);
  } catch (err) {
    console.error('Error fetching repository:', err);
    
    if (err instanceof Error && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    throw error(500, 'Failed to fetch repository data');
  }
};