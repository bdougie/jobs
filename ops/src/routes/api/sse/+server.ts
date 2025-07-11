import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

export const GET: RequestHandler = async ({ url }) => {
  
  // Create a readable stream for server-sent events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any, event = 'message') => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };
      
      // Send initial connection confirmation
      sendEvent({ type: 'connected', timestamp: new Date().toISOString() }, 'connect');
      
      // Subscribe to real-time changes
      const subscription = supabase
        .channel('progressive_capture_jobs')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'progressive_capture_jobs' 
          }, 
          (payload) => {
            sendEvent({
              type: 'job_update',
              data: payload,
              timestamp: new Date().toISOString()
            }, 'job_update');
          }
        )
        .subscribe();

      // Set up periodic metrics updates
      const metricsInterval = setInterval(async () => {
        try {
          // Fetch updated metrics
          const { data: jobs, error } = await supabase
            .from('progressive_capture_jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
            
          if (!error && jobs && Array.isArray(jobs)) {
            // Calculate metrics
            const total = {
              pending: jobs.filter(j => j.status === 'pending').length,
              processing: jobs.filter(j => j.status === 'processing').length,
              completed: jobs.filter(j => j.status === 'completed').length,
              failed: jobs.filter(j => j.status === 'failed').length,
              success_rate: jobs.length > 0 ? 
                (jobs.filter(j => j.status === 'completed').length / jobs.length) * 100 : 0,
              avg_duration: jobs
                .filter(j => j.status === 'completed' && j.started_at && j.completed_at)
                .reduce((sum, j) => {
                  const duration = new Date(j.completed_at!).getTime() - new Date(j.started_at!).getTime();
                  return sum + duration;
                }, 0) / Math.max(jobs.filter(j => j.status === 'completed').length, 1)
            };
            
            const inngest = {
              pending: jobs.filter(j => j.processor_type === 'inngest' && j.status === 'pending').length,
              processing: jobs.filter(j => j.processor_type === 'inngest' && j.status === 'processing').length,
              completed: jobs.filter(j => j.processor_type === 'inngest' && j.status === 'completed').length,
              failed: jobs.filter(j => j.processor_type === 'inngest' && j.status === 'failed').length,
              success_rate: jobs.filter(j => j.processor_type === 'inngest').length > 0 ?
                (jobs.filter(j => j.processor_type === 'inngest' && j.status === 'completed').length / 
                 jobs.filter(j => j.processor_type === 'inngest').length) * 100 : 0,
              avg_duration: jobs
                .filter(j => j.processor_type === 'inngest' && j.status === 'completed' && j.started_at && j.completed_at)
                .reduce((sum, j) => {
                  const duration = new Date(j.completed_at!).getTime() - new Date(j.started_at!).getTime();
                  return sum + duration;
                }, 0) / Math.max(jobs.filter(j => j.processor_type === 'inngest' && j.status === 'completed').length, 1)
            };
            
            const github_actions = {
              pending: jobs.filter(j => j.processor_type === 'github_actions' && j.status === 'pending').length,
              processing: jobs.filter(j => j.processor_type === 'github_actions' && j.status === 'processing').length,
              completed: jobs.filter(j => j.processor_type === 'github_actions' && j.status === 'completed').length,
              failed: jobs.filter(j => j.processor_type === 'github_actions' && j.status === 'failed').length,
              success_rate: jobs.filter(j => j.processor_type === 'github_actions').length > 0 ?
                (jobs.filter(j => j.processor_type === 'github_actions' && j.status === 'completed').length / 
                 jobs.filter(j => j.processor_type === 'github_actions').length) * 100 : 0,
              avg_duration: jobs
                .filter(j => j.processor_type === 'github_actions' && j.status === 'completed' && j.started_at && j.completed_at)
                .reduce((sum, j) => {
                  const duration = new Date(j.completed_at!).getTime() - new Date(j.started_at!).getTime();
                  return sum + duration;
                }, 0) / Math.max(jobs.filter(j => j.processor_type === 'github_actions' && j.status === 'completed').length, 1)
            };
            
            sendEvent({
              type: 'metrics_update',
              data: { total, inngest, github_actions },
              timestamp: new Date().toISOString()
            }, 'metrics');
          }
        } catch (error) {
          console.error('Error fetching metrics for SSE:', error);
        }
      }, 30000); // Update every 30 seconds
      
      // Cleanup function
      const cleanup = () => {
        clearInterval(metricsInterval);
        subscription.unsubscribe();
        try {
          controller.close();
        } catch (e) {
          // Controller might already be closed
        }
      };
      
      // Handle client disconnect
      const clientDisconnected = () => {
        cleanup();
      };
      
      // Set up abort handling
      if (url.searchParams.has('close')) {
        cleanup();
        return;
      }
      
      // Store cleanup in a way that can be accessed if needed
      (controller as any).cleanup = cleanup;
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
};