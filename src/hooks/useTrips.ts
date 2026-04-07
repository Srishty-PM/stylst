import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Trip = {
  id: string;
  user_id: string;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  start_date: string;
  end_date: string;
  weather_summary: any;
  activities: string[];
  suggested_looks: any[];
  packing_list: any[];
  status: string;
  created_at: string;
  updated_at: string;
};

export const useTrips = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips' as any)
        .select('*')
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data as unknown as Trip[];
    },
    enabled: !!user,
  });
};

export const useTrip = (tripId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips' as any)
        .select('*')
        .eq('id', tripId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Trip;
    },
    enabled: !!user && !!tripId,
  });
};

export const useSaveTrip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (trip: Partial<Trip> & { user_id: string }) => {
      if (trip.id) {
        const { id, ...updates } = trip;
        const { data, error } = await supabase
          .from('trips' as any)
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as Trip;
      } else {
        const { data, error } = await supabase
          .from('trips' as any)
          .insert(trip)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as Trip;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
};

export const useDeleteTrip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase
        .from('trips' as any)
        .delete()
        .eq('id', tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
};
