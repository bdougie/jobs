<script lang="ts">
  import { activeAlerts } from '../stores/metrics.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  interface Alert {
    id: string;
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
  }

  function getAlertIcon(type: Alert['type']) {
    switch (type) {
      case 'error':
        return 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z';
      case 'warning':
        return 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z';
      case 'info':
        return 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z';
      default:
        return 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z';
    }
  }

  function getAlertStyles(type: Alert['type']) {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-border text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-border text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-border text-blue-800';
      default:
        return 'bg-gray-50 border-border text-gray-800';
    }
  }

  function getIconStyles(type: Alert['type']) {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  }

  function formatTimestamp(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString();
  }

  function dismissAlert(alertId: string) {
    dispatch('dismiss', { alertId });
  }
</script>

<div class="card border-border">
  <div class="card-header">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-foreground">System Alerts</h3>
      <span class="text-sm text-muted-foreground">
        {$activeAlerts.length} active
      </span>
    </div>
  </div>

  <div class="card-content">
    {#if $activeAlerts.length === 0}
      <div class="text-center py-8 text-muted-foreground">
        <svg class="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-foreground">All Systems Operational</h3>
        <p class="mt-1 text-sm text-muted-foreground">No active alerts or issues detected.</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each $activeAlerts as alert (alert.id)}
          <div class="rounded-md border border-border p-4 {getAlertStyles(alert.type)}">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 {getIconStyles(alert.type)}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{getAlertIcon(alert.type)}"/>
                </svg>
              </div>
              <div class="ml-3 flex-1">
                <h3 class="text-sm font-medium">
                  {alert.title}
                </h3>
                <div class="mt-1 text-sm">
                  {alert.message}
                </div>
                <div class="mt-1 text-xs opacity-75">
                  {formatTimestamp(alert.timestamp)}
                </div>
              </div>
              <div class="ml-auto pl-3">
                <button
                  on:click={() => dismissAlert(alert.id)}
                  class="inline-flex text-sm opacity-75 hover:opacity-100 transition-opacity"
                  title="Dismiss alert"
                  aria-label="Dismiss alert"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>