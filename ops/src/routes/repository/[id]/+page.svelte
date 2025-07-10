<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import MetricsCard from '$lib/components/MetricsCard.svelte';
  import RecentJobs from '$lib/components/RecentJobs.svelte';
  import type { JobMetrics } from '$lib/supabase.js';

  $: repositoryId = $page.params.id;

  let repository: any = null;
  let metrics: { total: JobMetrics; inngest: JobMetrics; github_actions: JobMetrics } | null = null;
  let loading = true;
  let error: string | null = null;

  onMount(() => {
    fetchRepositoryData();
  });

  async function fetchRepositoryData() {
    try {
      loading = true;
      error = null;

      // Fetch repository info and metrics
      const [repoResponse, metricsResponse] = await Promise.all([
        fetch(`/api/repository/${repositoryId}`),
        fetch(`/api/metrics?repository_id=${repositoryId}`)
      ]);

      if (!repoResponse.ok) {
        if (repoResponse.status === 404) {
          throw new Error('Repository not found');
        }
        throw new Error('Failed to fetch repository data');
      }

      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch repository metrics');
      }

      repository = await repoResponse.json();
      metrics = await metricsResponse.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching repository data:', err);
    } finally {
      loading = false;
    }
  }

  function handleRefreshMetrics() {
    fetchRepositoryData();
  }

  function goBack() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Repository {repositoryId} - ops.contributor.info</title>
  <meta name="description" content="Repository-specific dashboard for progressive capture monitoring" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="bg-card shadow-sm rounded-lg p-6 border border-border">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <button
          on:click={goBack}
          class="p-2 rounded-md border border-border bg-background hover:bg-accent transition-colors"
          title="Back to dashboard"
          aria-label="Back to dashboard"
        >
          <svg class="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <div>
          {#if loading}
            <div class="h-6 bg-muted rounded w-64 animate-pulse"></div>
            <div class="h-4 bg-muted rounded w-48 mt-1 animate-pulse"></div>
          {:else if error}
            <h1 class="text-2xl font-bold text-foreground">Repository Not Found</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              Could not load repository data: {error}
            </p>
          {:else if repository}
            <h1 class="text-2xl font-bold text-foreground">{repository.full_name}</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              Progressive capture metrics for this repository
            </p>
          {/if}
        </div>
      </div>

      {#if !loading && !error}
        <button 
          on:click={handleRefreshMetrics}
          class="btn-primary"
          title="Refresh metrics"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      {/if}
    </div>

    {#if repository}
      <!-- Repository details -->
      <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span class="text-muted-foreground">Owner:</span>
          <span class="ml-2 text-foreground font-medium">{repository.owner}</span>
        </div>
        <div>
          <span class="text-muted-foreground">Name:</span>
          <span class="ml-2 text-foreground font-medium">{repository.name}</span>
        </div>
        <div>
          <span class="text-muted-foreground">ID:</span>
          <span class="ml-2 text-foreground font-mono text-xs">{repository.id}</span>
        </div>
      </div>
    {/if}
  </div>

  {#if error}
    <!-- Error state -->
    <div class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <h3 class="mt-2 text-sm font-medium text-foreground">Unable to load repository data</h3>
      <p class="mt-1 text-sm text-muted-foreground">{error}</p>
      <div class="mt-6">
        <button on:click={goBack} class="btn-primary">
          Back to Dashboard
        </button>
      </div>
    </div>
  {:else if loading}
    <!-- Loading state -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {#each Array(3) as _}
        <div class="metric-card animate-pulse">
          <div class="card-header">
            <div class="h-4 bg-muted rounded w-1/3"></div>
          </div>
          <div class="card-content space-y-4">
            <div class="text-center">
              <div class="h-8 bg-muted rounded w-1/2 mx-auto"></div>
              <div class="h-3 bg-muted rounded w-1/4 mx-auto mt-2"></div>
            </div>
            <div class="space-y-2">
              {#each Array(4) as _}
                <div class="flex justify-between">
                  <div class="h-3 bg-muted rounded w-1/4"></div>
                  <div class="h-3 bg-muted rounded w-1/6"></div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if metrics}
    <!-- Metrics Cards -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <MetricsCard 
        title="Repository Total"
        metrics={metrics.total}
        color="blue"
        on:refresh={handleRefreshMetrics}
      />
      
      <MetricsCard 
        title="Inngest Queue"
        metrics={metrics.inngest}
        color="purple"
        on:refresh={handleRefreshMetrics}
      />
      
      <MetricsCard 
        title="GitHub Actions"
        metrics={metrics.github_actions}
        color="green"
        on:refresh={handleRefreshMetrics}
      />
    </div>

    <!-- Recent Jobs for this repository -->
    <div class="grid grid-cols-1 gap-6">
      <RecentJobs limit={20} showRepository={false} repositoryId={repositoryId} />
    </div>
  {/if}
</div>