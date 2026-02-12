import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type ScheduledOutfit = Tables<'scheduled_outfits'>;

export const useScheduledOutfits = (startDate: string, endDate: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['scheduled-outfits', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_outfits')
        .select('*')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date');
      if (error) throw error;
      return data as ScheduledOutfit[];
    },
    enabled: !!user,
  });
};

export const useAddScheduledOutfit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (outfit: TablesInsert<'scheduled_outfits'>) => {
      const { data, error } = await supabase
        .from('scheduled_outfits')
        .insert(outfit)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-outfits'] });
    },
  });
};

export const useMarkWorn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_outfits')
        .update({ was_worn: true, worn_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-outfits'] });
    },
  });
};

export const useDeleteScheduledOutfit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_outfits')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-outfits'] });
    },
  });
};
