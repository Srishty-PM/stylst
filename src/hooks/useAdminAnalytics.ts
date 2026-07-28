import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AnalyticsDashboard {
  period_days: number;
  unique_visitors: number;
  unique_devices: number;
  signups: number;
  logins: number;
  outfits_created: number;
  photos_uploaded: number;
  steps_completed: number;
  avg_session_duration_seconds: number;
  page_views: Record<string, number>;
  total_sessions: number;
}

export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-admin', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) return false;
      return !!data;
    },
  });
}

export function useAnalyticsDashboard(days: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['analytics-dashboard', days, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AnalyticsDashboard> => {
      const { data, error } = await supabase.functions.invoke('analytics-dashboard', {
        body: { days },
      });
      if (error) {
        let message = 'Could not load analytics.';
        const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
        if (ctx?.json) {
          try {
            const body = await ctx.json();
            if (body?.error) message = body.error;
          } catch {
            // keep default
          }
        }
        throw new Error(message);
      }
      return data;
    },
  });
}
