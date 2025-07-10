<script lang="ts">
  import { onMount } from 'svelte';
  import type { ProgressiveCaptureJob } from '../supabase.js';
  import { recentJobs } from '../stores/metrics.js';

  export let limit = 10;
  export let showRepository = true;
  export let repositoryId: string | null = null;

  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    await fetchRecentJobs();
  });

  async function fetchRecentJobs() {
    try {
      loading = true;
      error = null;
      
      let url = `/api/jobs/recent?limit=${limit}`;
      if (repositoryId) {
        url += `&repository_id=${repositoryId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch recent jobs');
      }
      
      const jobs = await response.json();
      recentJobs.set(jobs);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching recent jobs:', err);
    } finally {
      loading = false;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getProcessorColor(processor: string) {
    switch (processor) {
      case 'inngest': return 'bg-inngest-100 text-inngest-800';
      case 'github_actions': return 'bg-github-100 text-github-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function formatDuration(job: ProgressiveCaptureJob) {
    if (job.status === 'completed' && job.started_at && job.completed_at) {
      const start = new Date(job.started_at).getTime();
      const end = new Date(job.completed_at).getTime();
      const duration = Math.round((end - start) / 1000);
      return `${duration}s`;
    }
    return '-';
  }

  function formatTimestamp(timestamp: string) {
    return new Date(timestamp).toLocaleString();
  }

  function truncateError(error: string | null, maxLength = 50) {
    if (!error) return '-';
    return error.length > maxLength ? error.substring(0, maxLength) + '...' : error;
  }
</script>

<div class="card">
  <div class="card-header">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-foreground">Recent Jobs</h3>
      <button 
        on:click={fetchRecentJobs}
        class="p-2 rounded-md border border-border bg-background hover:bg-accent transition-colors"
        disabled={loading}
        title="Refresh recent jobs"
        aria-label="Refresh recent jobs"
      >
        <svg class="w-4 h-4 text-foreground {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    </div>
  </div>

  <div class="card-content">
    {#if loading}
      <div class="text-center py-8">
        <div class="animate-spin h-8 w-8 border-2 border-border border-t-primary rounded-full mx-auto"></div>
        <p class="mt-2 text-sm text-muted-foreground">Loading recent jobs...</p>
      </div>
    {:else if error}
      <div class="text-center py-8">
        <div class="text-red-500 mb-2">
          <svg class="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <p class="text-sm text-foreground">{error}</p>
        <button on:click={fetchRecentJobs} class="mt-2 btn-primary text-sm">
          Try Again
        </button>
      </div>
    {:else if $recentJobs.length === 0}
      <div class="text-center py-8 text-muted-foreground">
        <svg class="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p class="mt-2 text-sm text-muted-foreground">No recent jobs found</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-muted">
            <tr>
              <th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Job</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Processor</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              {#if showRepository}
                <th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Repository</th>
              {/if}
              <th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
              <th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Started</th>
            </tr>
          </thead>
          <tbody class="bg-card divide-y divide-border">
            {#each $recentJobs as job (job.id)}
              <tr class="hover:bg-accent">
                <td class="px-3 py-2 text-sm">
                  <div class="font-medium text-foreground">{job.job_type}</div>
                  {#if job.error}
                    <div 
                      class="text-red-600 text-xs cursor-help relative group" 
                      title={job.error}
                    >
                      {truncateError(job.error)}
                      <!-- Tooltip -->
                      <div class="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 w-80 p-3 bg-popover border border-border rounded-md shadow-lg backdrop-blur-sm">
                        <div class="text-xs text-popover-foreground break-words whitespace-pre-wrap">
                          {job.error}
                        </div>
                        <!-- Arrow pointing down -->
                        <div class="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-popover"></div>
                      </div>
                    </div>
                  {/if}
                </td>
                <td class="px-3 py-2">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getProcessorColor(job.processor_type)}">
                    {job.processor_type.replace('_', ' ')}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getStatusColor(job.status)}">
                    {job.status}
                  </span>
                </td>
                {#if showRepository}
                  <td class="px-3 py-2 text-sm">
                    {#if job.repository?.id}
                      <a 
                        href="/repository/{job.repository.id}" 
                        class="text-primary hover:text-primary/80 hover:underline transition-colors"
                        title="View repository dashboard"
                      >
                        {job.repository.full_name}
                      </a>
                    {:else}
                      <span class="text-muted-foreground">N/A</span>
                    {/if}
                  </td>
                {/if}
                <td class="px-3 py-2 text-sm text-muted-foreground">
                  {formatDuration(job)}
                </td>
                <td class="px-3 py-2 text-sm text-muted-foreground">
                  {job.started_at ? formatTimestamp(job.started_at) : 'Not started'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>