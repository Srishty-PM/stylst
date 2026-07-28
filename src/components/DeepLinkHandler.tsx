import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const DeepLinkHandler = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let remove: (() => void) | undefined;

    CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url || !url.startsWith('stylst://pinterest-callback')) return;
      await Browser.close().catch(() => {});
      const success = url.includes('success=true');
      if (success) {
        await refreshProfile().catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['pinterest-boards'] });
        toast({ title: 'Pinterest Connected!', description: 'Your account is now linked. Go to Inspiration to sync boards.' });
      } else {
        toast({ title: 'Connection Failed', description: 'Could not connect Pinterest. Please try again.', variant: 'destructive' });
      }
      navigate('/inspiration/add', { replace: true });
    }).then((handle) => { remove = () => handle.remove(); });

    return () => { if (remove) remove(); };
  }, [navigate, queryClient, refreshProfile]);

  return null;
};

export default DeepLinkHandler;
