import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Bookmark, ShoppingBag } from 'lucide-react';
import ShopBrowser from '@/components/shopping/ShopBrowser';
import { normalizeShopCategory } from '@/lib/shop-catalogue';
import { usePageView } from '@/hooks/useAnalytics';
import { useLooks } from '@/hooks/useLooks';
import type { MissingItem } from '@/hooks/useAutoMatch';

const Shop = () => {
  const [params] = useSearchParams();
  const query = (params.get('q') ?? '').slice(0, 200);
  const category = normalizeShopCategory(params.get('category') ?? undefined);
  const { data: looks = [] } = useLooks();
  const savedMissing = [...new Map(looks.flatMap(look => {
    const raw = Array.isArray(look.missing_items) ? look.missing_items : [];
    return raw.filter((item): item is MissingItem => Boolean(item && typeof item === 'object' && !Array.isArray(item) && typeof (item as Record<string, unknown>).name === 'string' && typeof (item as Record<string, unknown>).category === 'string'));
  }).map(item => [`${item.category.toLowerCase()}:${item.name.toLowerCase()}`, item])).values()].slice(0, 12);
  usePageView('shop');
  return <div className="space-y-7">
    <header className="space-y-2"><p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary"><ShoppingBag className="w-4 h-4" />The finishing touch</p><h1 className="font-display text-4xl md:text-5xl">Shop your style</h1><p className="text-sm text-muted-foreground max-w-lg">Find the pieces that bring your saved looks to life. Browse here, save what you love, and buy directly from the retailer.</p></header>
    {savedMissing.length > 0 && <section className="rounded-2xl border border-border bg-card p-4 space-y-3" aria-labelledby="saved-missing-heading"><div><p className="text-xs uppercase tracking-[0.16em] text-primary flex items-center gap-1.5"><Bookmark className="w-3.5 h-3.5" />Saved from your looks</p><h2 id="saved-missing-heading" className="font-display text-2xl mt-1">Missing pieces to buy later</h2></div><div className="flex gap-2 overflow-x-auto pb-1">{savedMissing.map(item => { const search = new URLSearchParams({ q: item.name }); const normalized = normalizeShopCategory(item.category); if (normalized) search.set('category', normalized); return <Link key={`${item.category}:${item.name}`} to={`/shop?${search}`} className="shrink-0 max-w-56 min-h-11 rounded-full border border-border px-4 py-2 text-sm inline-flex items-center gap-2 hover:border-primary"><span className="truncate">{item.name}</span><ArrowRight className="w-3.5 h-3.5 shrink-0" /></Link>; })}</div></section>}
    <ShopBrowser key={`${query}:${category ?? ''}`} initialQuery={query} initialCategory={category} />
  </div>;
};

export default Shop;
