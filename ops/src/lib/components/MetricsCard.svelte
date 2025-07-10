<script lang="ts">
  import type { JobMetrics } from '../supabase.js';
  import { createEventDispatcher } from 'svelte';

  export let title: string;
  export let metrics: JobMetrics;
  export let color: 'blue' | 'green' | 'purple' = 'blue';
  export let loading = false;

  const dispatch = createEventDispatcher();

  $: colorClasses = {
    blue: 'border-border bg-card',
    green: 'border-border bg-card', 
    purple: 'border-border bg-card'
  };

  $: iconColors = {
    blue: 'text-primary',
    green: 'text-green-600',
    purple: 'text-purple-600'
  };

  $: total = metrics.pending + metrics.processing + metrics.completed + metrics.failed;
</script>

<div class="metric-card {colorClasses[color]}">
  <div class="card-header">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-foreground">{title}</h3>
      <button 
        on:click={() => dispatch('refresh')}
        class="p-2 rounded-md border border-border bg-background hover:bg-accent transition-colors"
        disabled={loading}
        title="Refresh metrics"
        aria-label="Refresh metrics"
      >
        <svg class="w-4 h-4 text-foreground {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    </div>
  </div>

  <div class="card-content space-y-4">
    <!-- Total Jobs -->
    <div class="text-center">
      <div class="text-3xl font-bold {iconColors[color]}">{total.toLocaleString()}</div>
      <div class="text-sm text-muted-foreground">Total Jobs</div>
    </div>

    <!-- Status Breakdown -->
    <div class="grid grid-cols-2 gap-3 text-sm">
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">Pending</span>
        <span class="status-pending">{metrics.pending}</span>
      </div>
      
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">Processing</span>
        <span class="status-processing">{metrics.processing}</span>
      </div>
      
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">Completed</span>
        <span class="status-completed">{metrics.completed}</span>
      </div>
      
      <div class="flex items-center justify-between">
        <span class="text-muted-foreground">Failed</span>
        <span class="status-failed">{metrics.failed}</span>
      </div>
    </div>

    <!-- Success Rate -->
    <div class="border-t border-border pt-3">
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">Success Rate</span>
        <span class="text-sm font-semibold {metrics.success_rate >= 95 ? 'text-green-600' : metrics.success_rate >= 90 ? 'text-yellow-600' : 'text-red-600'}">
          {metrics.success_rate.toFixed(1)}%
        </span>
      </div>
      
      <!-- Progress bar -->
      <div class="mt-2 bg-muted rounded-full h-2">
        <div 
          class="h-2 rounded-full transition-all duration-300 {metrics.success_rate >= 95 ? 'bg-green-500' : metrics.success_rate >= 90 ? 'bg-yellow-500' : 'bg-red-500'}"
          style="width: {Math.max(metrics.success_rate, 0)}%"
        ></div>
      </div>
    </div>

    <!-- Average Duration -->
    {#if metrics.avg_duration > 0}
      <div class="text-center text-sm text-muted-foreground">
        <div>Avg Duration</div>
        <div class="font-semibold text-foreground">
          {Math.round(metrics.avg_duration / 1000)}s
        </div>
      </div>
    {/if}
  </div>
</div>