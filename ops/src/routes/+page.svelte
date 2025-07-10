<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { metricsStore, updateMetrics, setError, setLoading } from '$lib/stores/metrics.js';
  import MetricsCard from '$lib/components/MetricsCard.svelte';
  import AlertPanel from '$lib/components/AlertPanel.svelte';
  import RecentJobs from '$lib/components/RecentJobs.svelte';

  let refreshInterval: number;
  let lastRefresh = new Date();
  let autoRefresh = true;
  let refreshRate = 30; // seconds
  let eventSource: EventSource | null = null;
  let isRealTimeConnected = false;

  onMount(() => {
    fetchMetrics();
    if (autoRefresh) {
      startAutoRefresh();
    }
    setupRealTimeUpdates();
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    if (eventSource) {
      eventSource.close();
    }
  });

  async function fetchMetrics() {
    try {
      setLoading(true);
      
      const response = await fetch('/api/metrics');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const metrics = await response.json();
      updateMetrics(metrics);
      lastRefresh = new Date();
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch metrics');
    }
  }

  function startAutoRefresh() {
    refreshInterval = setInterval(fetchMetrics, refreshRate * 1000);
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    if (autoRefresh) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  }

  function handleRefreshMetrics() {
    fetchMetrics();
  }

  function formatLastRefresh() {
    return lastRefresh.toLocaleTimeString();
  }

  // Handle alert dismissals
  function handleAlertDismiss(event: CustomEvent<{ alertId: string }>) {
    // In a real implementation, you might want to persist dismissed alerts
    console.log('Alert dismissed:', event.detail.alertId);
  }

  function setupRealTimeUpdates() {
    if (typeof EventSource !== 'undefined') {
      eventSource = new EventSource('/api/sse');
      
      eventSource.onopen = () => {
        isRealTimeConnected = true;
        console.log('Real-time connection established');
      };
      
      eventSource.addEventListener('connect', (event) => {
        const data = JSON.parse(event.data);
        console.log('SSE Connected:', data);
      });
      
      eventSource.addEventListener('metrics', (event) => {
        const data = JSON.parse(event.data);
        updateMetrics(data.data);
        lastRefresh = new Date();
      });
      
      eventSource.addEventListener('job_update', (event) => {
        const data = JSON.parse(event.data);
        console.log('Job update received:', data);
        // Refresh metrics when jobs change
        fetchMetrics();
      });
      
      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        isRealTimeConnected = false;
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (eventSource?.readyState === EventSource.CLOSED) {
            setupRealTimeUpdates();
          }
        }, 5000);
      };
      
      eventSource.onclose = () => {
        isRealTimeConnected = false;
        console.log('Real-time connection closed');
      };
    }
  }

  $: metrics = $metricsStore;
</script>

<svelte:head>
  <title>ops.contributor.info</title>
  <meta name="description" content="Real-time monitoring dashboard for the hybrid progressive capture system" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="bg-card shadow-sm rounded-lg p-6 border border-border">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Operations Dashboard</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Monitor the hybrid progressive capture system performance in real-time
        </p>
      </div>
      
      <div class="flex items-center space-x-4">
        <!-- Auto-refresh toggle -->
        <div class="flex items-center space-x-2">
          <label for="auto-refresh" class="text-sm text-foreground">Auto-refresh</label>
          <button
            id="auto-refresh"
            type="button"
            class="inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {autoRefresh ? 'bg-primary' : 'bg-input'}"
            on:click={toggleAutoRefresh}
          >
            <span class="sr-only">Auto-refresh toggle</span>
            <span class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {autoRefresh ? 'translate-x-4' : 'translate-x-0'}">
            </span>
          </button>
        </div>

        <!-- Refresh button -->
        <button 
          on:click={handleRefreshMetrics}
          class="p-2 rounded-md border border-border bg-background hover:bg-accent transition-colors"
          disabled={$metricsStore.loading}
          title="Refresh metrics"
        >
          <svg class="w-4 h-4 text-foreground {$metricsStore.loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Last refresh info -->
    <div class="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <div>
        Last updated: {formatLastRefresh()}
        {#if autoRefresh}
          • Auto-refreshing every {refreshRate}s
        {/if}
      </div>
      <div class="flex items-center space-x-2">
        <div class="w-2 h-2 rounded-full animate-pulse-slow {isRealTimeConnected ? 'bg-green-400' : 'bg-yellow-400'}"></div>
        <span class="text-xs">
          {isRealTimeConnected ? 'Real-time Connected' : 'Polling Mode'}
        </span>
      </div>
    </div>
  </div>

  <!-- Metrics Cards -->
  {#if metrics}
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <MetricsCard 
        title="Overall System"
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
  {:else}
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
  {/if}

  <!-- Alerts and Recent Jobs -->
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <AlertPanel on:dismiss={handleAlertDismiss} />
    <RecentJobs limit={10} />
  </div>

  <!-- Additional metrics could go here -->
  <!-- TODO: Add charts, cost tracking, performance trends, etc. -->
</div>
