import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type MatchedLook = Tables<'matched_looks'>;
export type MatchedLookInsert = TablesInsert<'matched_looks'>;

export const useLooks = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['looks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matched_looks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MatchedLook[];
    },
    enabled: !!user,
  });
};

export const useLook = (lookId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['look', lookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matched_looks')
        .select('*')
        .eq('id', lookId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!lookId,
  });
};

export const useAddLook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (look: MatchedLookInsert) => {
      const { data, error } = await supabase
        .from('matched_looks')
        .insert(look)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['looks'] });
    },
  });
};

export const useDeleteLook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lookId: string) => {
      const { error } = await supabase
        .from('matched_looks')
        .delete()
        .eq('id', lookId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['looks'] });
    },
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase
        .from('matched_looks')
        .update({ is_favorite })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['looks'] });
      queryClient.invalidateQueries({ queryKey: ['look', vars.id] });
    },
  });
};
