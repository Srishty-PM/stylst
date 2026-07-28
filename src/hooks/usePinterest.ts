import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePinterestConnect = () => {
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const native = Capacitor.isNativePlatform();
      const res = await supabase.functions.invoke('pinterest-auth', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { platform: native ? 'native' : 'web' },
      });

      if (res.error) throw res.error;
      const { url } = res.data;
      if (native) {
        // The global deep-link handler catches the stylst:// return and closes this browser.
        await Browser.open({ url });
        setLoading(false);
      } else {
        window.location.href = url;
      }
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  return { connect, loading };
};

interface PinterestBoard {
  id: string;
  name: string;
  description: string | null;
  pin_count: number;
  image_url: string | null;
}

export const usePinterestBoards = (enabled: boolean) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pinterest-boards'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const res = await supabase.functions.invoke('pinterest-sync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) {
        const msg = (res.data as any)?.error || res.error.message || 'Pinterest error';
        const code = (res.data as any)?.code;
        const err: any = new Error(msg);
        err.code = code;
        throw err;
      }
      return res.data.boards as PinterestBoard[];
    },
    enabled: enabled && !!user,
    retry: false,
  });
};

export const useSyncPinterestBoard = () => {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const sync = async (boardId: string) => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const res = await supabase.functions.invoke('pinterest-sync', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { board_id: boardId },
      });
      if (res.error) throw res.error;
      queryClient.invalidateQueries({ queryKey: ['inspirations'] });
      return res.data as { synced: number; total_pins: number };
    } finally {
      setSyncing(false);
    }
  };

  return { sync, syncing };
};
