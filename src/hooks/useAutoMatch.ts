import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MissingItem {
  name: string;
  category: string;
  description?: string;
  thumbnail_url?: string;
}

export interface AutoMatchResult {
  look: {
    id: string;
    name: string;
    closet_item_ids: string[];
    occasion: string | null;
    season: string | null;
    notes: string | null;
  } | null;
  matched_items: {
    id: string;
    name: string;
    category: string;
    image_url: string;
    colors: string[] | null;
  }[];
  missing_items: MissingItem[];
  match_name: string;
  occasion: string | null;
  season: string | null;
  reasoning: string;
  scheduled_outfit: {
    id: string;
    scheduled_date: string;
  } | null;
}

export const useAutoMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inspiration_id,
      scheduled_date,
      save_look,
    }: {
      inspiration_id: string;
      scheduled_date?: string;
      save_look?: boolean;
    }): Promise<AutoMatchResult> => {
      const { data, error } = await supabase.functions.invoke('auto-match', {
        body: { inspiration_id, scheduled_date, save_look },
      });

      if (error) throw new Error(error.message || 'Auto-match failed');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['looks'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-outfits'] });
    },
  });
};
