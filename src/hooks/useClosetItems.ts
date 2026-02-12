import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type ClosetItem = Tables<'closet_items'>;
export type ClosetItemInsert = TablesInsert<'closet_items'>;

export const useClosetItems = (category?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['closet-items', category],
    queryFn: async () => {
      let query = supabase
        .from('closet_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (category && category !== 'All') {
        query = query.eq('category', category.toLowerCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClosetItem[];
    },
    enabled: !!user,
  });
};

export const useClosetItem = (itemId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['closet-item', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('id', itemId!)
        .single();
      if (error) throw error;
      return data as ClosetItem;
    },
    enabled: !!user && !!itemId,
  });
};

export const useAddClosetItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: ClosetItemInsert) => {
      const { data, error } = await supabase
        .from('closet_items')
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closet-items'] });
    },
  });
};

export const useDeleteClosetItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('closet_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closet-items'] });
    },
  });
};

export const useUpdateClosetItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClosetItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('closet_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['closet-items'] });
      queryClient.invalidateQueries({ queryKey: ['closet-item', data.id] });
    },
  });
};

export const uploadClosetImage = async (userId: string, file: File): Promise<string> => {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('closet-images')
    .upload(path, file, { contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage
    .from('closet-images')
    .getPublicUrl(path);

  return data.publicUrl;
};
