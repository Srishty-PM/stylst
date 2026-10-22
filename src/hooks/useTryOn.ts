import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TRY_ON_RENDERING_ENABLED } from '@/lib/next-release';
import { type TryOnRequest, type TryOnResult } from '@/lib/try-on';

export function useTryOn() {
  return useMutation({
    mutationFn: async (request: TryOnRequest): Promise<TryOnResult> => {
      if (!TRY_ON_RENDERING_ENABLED) throw new Error('Connect a separate test backend to enable image rendering.');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please sign in to the test account again.');
      const { data, error } = await supabase.functions.invoke('avatar-try-on', { body: request });
      if (error) {
        const context = (error as { context?: Response }).context;
        const body = await context?.json().catch(() => null);
        throw new Error(body?.error ?? 'Your preview could not be created. Please try again.');
      }
      if (!data?.image?.data || !['image/png', 'image/jpeg', 'image/webp'].includes(data.image.mimeType)) throw new Error('No preview was returned. Try another photo.');
      return data;
    },
    retry: false, // Rendering incurs cost: retry only after an explicit user action.
  });
}
