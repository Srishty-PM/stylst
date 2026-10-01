import { useSearchParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import ShopBrowser from '@/components/shopping/ShopBrowser';
import { normalizeShopCategory } from '@/lib/shop-catalogue';
import { usePageView } from '@/hooks/useAnalytics';

const Shop = () => {
  const [params] = useSearchParams();
  const query = (params.get('q') ?? '').slice(0, 200);
  const category = normalizeShopCategory(params.get('category') ?? undefined);
  usePageView('shop');
  return <div className="space-y-7">
    <header className="space-y-2"><p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary"><ShoppingBag className="w-4 h-4" />The finishing touch</p><h1 className="font-display text-4xl md:text-5xl">Shop your style</h1><p className="text-sm text-muted-foreground max-w-lg">Find the pieces that bring your saved looks to life. Browse here, save what you love, and buy directly from the retailer.</p></header>
    <ShopBrowser key={`${query}:${category ?? ''}`} initialQuery={query} initialCategory={category} />
  </div>;
};

export default Shop;
