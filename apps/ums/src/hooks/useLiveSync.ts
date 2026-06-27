import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * useLiveSync
 * Periodically invalidates specific query keys to ensure the dashboard feels "live"
 * without exhausting Cloudflare Worker free tier limits.
 */
export function useLiveSync(intervalMs = 30000) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [queryClient, intervalMs]);
}
