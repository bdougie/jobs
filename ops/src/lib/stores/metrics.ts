import { writable, derived } from 'svelte/store';
import type { HybridQueueStats, ProgressiveCaptureJob } from '../supabase.js';

// Core metrics store
export const metricsStore = writable<HybridQueueStats | null>(null);

// Loading state
export const isLoading = writable(true);

// Error state
export const error = writable<string | null>(null);

// Recent jobs store
export const recentJobs = writable<ProgressiveCaptureJob[]>([]);

// Alert configuration
export const alertThresholds = writable({
  failedJobs: 5,
  successRate: 95,
  avgDuration: 300000 // 5 minutes in ms
});

// Derived stores for specific metrics
export const totalJobs = derived(metricsStore, ($metrics) => {
  if (!$metrics) return 0;
  return $metrics.total.pending + $metrics.total.processing + $metrics.total.completed + $metrics.total.failed;
});

export const overallSuccessRate = derived(metricsStore, ($metrics) => {
  if (!$metrics) return 0;
  return $metrics.total.success_rate;
});

export const activeAlerts = derived(
  [metricsStore, alertThresholds],
  ([$metrics, $thresholds]) => {
    if (!$metrics) return [];
    
    const alerts = [];
    
    // Check for high failure rate
    if ($metrics.total.failed > $thresholds.failedJobs) {
      alerts.push({
        id: 'high_failures',
        type: 'error',
        title: 'High Failure Rate',
        message: `${$metrics.total.failed} jobs have failed recently`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Check for low success rate
    if ($metrics.total.success_rate < $thresholds.successRate) {
      alerts.push({
        id: 'low_success_rate',
        type: 'warning',
        title: 'Low Success Rate',
        message: `Success rate is ${$metrics.total.success_rate.toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Check for slow processing
    if ($metrics.total.avg_duration > $thresholds.avgDuration) {
      alerts.push({
        id: 'slow_processing',
        type: 'warning',
        title: 'Slow Processing',
        message: `Average duration is ${Math.round($metrics.total.avg_duration / 1000)}s`,
        timestamp: new Date().toISOString()
      });
    }
    
    return alerts;
  }
);

// Functions to update stores
export const updateMetrics = (newMetrics: HybridQueueStats) => {
  metricsStore.set(newMetrics);
  isLoading.set(false);
  error.set(null);
};

export const setError = (errorMessage: string) => {
  error.set(errorMessage);
  isLoading.set(false);
};

export const setLoading = (loading: boolean) => {
  isLoading.set(loading);
};