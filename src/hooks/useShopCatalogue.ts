import { useQuery } from '@tanstack/react-query';
import { parseCatalogue } from '@/lib/shop-catalogue';

export function shopCatalogueUrl(): string {
  const configured = import.meta.env.VITE_SHOP_CATALOGUE_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid shop catalogue URL');
    return url.toString();
  }
  return `${import.meta.env.BASE_URL}affiliate-catalogue.json`;
}

export function useShopCatalogue(enabled = true) {
  return useQuery({
    queryKey: ['shop-catalogue'],
    enabled,
    queryFn: async ({ signal }) => {
      const response = await fetch(shopCatalogueUrl(), { signal, cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error('The shop could not be loaded');
      return parseCatalogue(await response.json());
    },
    staleTime: 0,
    refetchInterval: 60 * 1000,
    retry: 1,
  });
}
