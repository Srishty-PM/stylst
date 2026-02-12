import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Inspiration = Tables<'inspiration'>;

export const useInspirations = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['inspirations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspiration')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Inspiration[];
    },
    enabled: !!user,
  });
};

export const useAddInspiration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: TablesInsert<'inspiration'>) => {
      const { data, error } = await supabase
        .from('inspiration')
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspirations'] });
    },
  });
};

export const useDeleteInspiration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inspiration')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspirations'] });
    },
  });
};

export const uploadInspirationImage = async (userId: string, file: File): Promise<string> => {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('inspiration-images')
    .upload(path, file, { contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage
    .from('inspiration-images')
    .getPublicUrl(path);

  return data.publicUrl;
};
