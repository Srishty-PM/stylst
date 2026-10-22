import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { NEXT_RELEASE_ENABLED } from '@/lib/next-release';
import { type TryOnRequest, type TryOnResult } from '@/lib/try-on';

export interface TryOnAvailability { enabled: boolean; remaining?: number; dailyLimit?: number; globalAvailable?: boolean; resetsAt?: string; message?: string }
export function useTryOnAvailability() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['try-on-availability', user?.id], enabled: NEXT_RELEASE_ENABLED && Boolean(user), staleTime: 15000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<TryOnAvailability> => {
      const { data, error } = await supabase.functions.invoke('avatar-try-on', { method: 'GET' });
      if (error || typeof data?.enabled !== 'boolean') throw new Error('The fitting room could not be reached. Please try again.');
      return data;
    },
    retry: 1,
  });
}
export function useTryOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: TryOnRequest): Promise<TryOnResult> => {
      if (!NEXT_RELEASE_ENABLED) throw new Error('Avatar previews are currently available on the web.');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please sign in again.');
      const { data, error } = await supabase.functions.invoke('avatar-try-on', { body: { ...request, requestId: crypto.randomUUID() } });
      if (error) {
        const context = (error as { context?: Response }).context;
        const body = await context?.json().catch(() => null);
        throw new Error(body?.error ?? 'Your preview could not be created. Please try again.');
      }
      if (!data?.image?.data || !['image/png', 'image/jpeg', 'image/webp'].includes(data.image.mimeType)) throw new Error('No preview was returned. Try another photo.');
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['try-on-availability'] }),
    retry: false,
  });
}
