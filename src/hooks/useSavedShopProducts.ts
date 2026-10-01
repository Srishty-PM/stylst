import { useCallback, useState } from 'react';

const PREFIX = 'stylst_saved_shop_products:';

function readSaved(key: string): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(value)) return new Set();
    return new Set(value.filter((id): id is string => typeof id === 'string' && id.length <= 200).slice(0, 500));
  } catch { return new Set(); }
}

export function useSavedShopProducts(userId: string) {
  const key = `${PREFIX}${userId}`;
  const [snapshot, setSnapshot] = useState(() => ({ key, ids: readSaved(key) }));
  const savedIds = snapshot.key === key ? snapshot.ids : readSaved(key);
  const toggleSave = useCallback((id: string) => {
    setSnapshot(previous => {
      const ids = new Set(previous.key === key ? previous.ids : readSaved(key));
      if (ids.has(id)) ids.delete(id);
      else if (ids.size < 500) ids.add(id);
      try { localStorage.setItem(key, JSON.stringify([...ids])); } catch { /* Saving remains available for this visit. */ }
      return { key, ids };
    });
  }, [key]);
  return { savedIds, toggleSave };
}
