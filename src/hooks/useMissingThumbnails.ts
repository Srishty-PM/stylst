import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MissingItem } from '@/hooks/useAutoMatch';

/**
 * Lazily generates thumbnails for missing items AFTER match results appear.
 * Returns a map of item index -> base64 thumbnail URL.
 */
export const useMissingThumbnails = (missingItems: MissingItem[]) => {
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!missingItems.length) return;

    // Fire all thumbnail requests in parallel
    missingItems.forEach((item, idx) => {
      supabase.functions
        .invoke('generate-thumbnail', {
          body: { item_name: item.name, category: item.category },
        })
        .then(({ data }) => {
          if (data?.thumbnail_url) {
            setThumbnails(prev => ({ ...prev, [idx]: data.thumbnail_url }));
          }
        })
        .catch(() => {
          // Silent fail — icon placeholder stays
        });
    });
  }, [missingItems]);

  return thumbnails;
};
