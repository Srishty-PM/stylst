import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StyleProfile {
  aesthetic: string;
  colors: string[];
  silhouettes: string[];
  keyPieces: string[];
  occasions: string[];
  keywords: string[];
  similarInfluencers: string[];
  confidence: number;
  generatedBy: string;
}

export interface InfluencerStyle {
  id: string;
  influencer_name: string;
  instagram_handle: string | null;
  style_profile: StyleProfile;
  user_uploaded_photos: string[] | null;
  times_used: number;
  created_at: string;
  updated_at: string;
}

export interface UserInfluencerPreference {
  id: string;
  user_id: string;
  influencer_style_id: string;
  is_active: boolean;
  created_at: string;
  influencer_styles?: InfluencerStyle;
}

export const useUserInfluencerPreferences = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['influencer-preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_influencer_preferences')
        .select('*, influencer_styles(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as UserInfluencerPreference[];
    },
    enabled: !!user,
  });
};

export const useActiveInfluencerStyles = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['active-influencer-styles', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_influencer_preferences')
        .select('influencer_styles(*)')
        .eq('user_id', user!.id)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []).map(d => d.influencer_styles).filter(Boolean) as unknown as InfluencerStyle[];
    },
    enabled: !!user,
  });
};

export const useToggleInfluencerActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('user_influencer_preferences')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['influencer-preferences'] });
      qc.invalidateQueries({ queryKey: ['active-influencer-styles'] });
    },
  });
};

export const useDeleteInfluencerPreference = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_influencer_preferences')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['influencer-preferences'] });
      qc.invalidateQueries({ queryKey: ['active-influencer-styles'] });
    },
  });
};

export const useAddInfluencerPreference = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (influencer_style_id: string) => {
      const { data, error } = await supabase
        .from('user_influencer_preferences')
        .insert({ user_id: user!.id, influencer_style_id, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['influencer-preferences'] });
      qc.invalidateQueries({ queryKey: ['active-influencer-styles'] });
    },
  });
};

export const useGenerateInfluencerStyle = () => {
  return useMutation({
    mutationFn: async ({ influencer_name, instagram_handle }: { influencer_name: string; instagram_handle?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-influencer-style`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ influencer_name, instagram_handle }),
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }
      return resp.json();
    },
  });
};
