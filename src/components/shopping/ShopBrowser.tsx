import { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingBag, Heart, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useShopCatalogue } from '@/hooks/useShopCatalogue';
import { useSavedShopProducts } from '@/hooks/useSavedShopProducts';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SHOP_CATEGORIES, SHOP_CURRENCIES, selectProducts, type ShopCurrency, type ShopCategory, type ShopProduct, type ShopSort } from '@/lib/shop-catalogue';
import PriceFilter from './PriceFilter';
import SortDropdown from './SortDropdown';
import ShoppingGrid from './ShoppingGrid';
import ProductDetailSheet from './ProductDetailSheet';

interface ShopBrowserProps {
  initialQuery?: string;
  initialCategory?: ShopCategory;
  enabled?: boolean;
}

const ShopBrowser = ({ initialQuery = '', initialCategory, enabled = true }: ShopBrowserProps) => {
  const { user, profile } = useAuth();
  const { data, isLoading, isError, refetch } = useShopCatalogue(enabled);
  const { savedIds, toggleSave } = useSavedShopProducts(user?.id ?? 'guest');
  const { track } = useAnalytics();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<ShopCategory | undefined>(initialCategory);
  const [currency, setCurrency] = useState<ShopCurrency>(() => SHOP_CURRENCIES.includes(profile?.currency as ShopCurrency) ? profile.currency as ShopCurrency : 'GBP');
  const [budget, setBudget] = useState<[number, number] | null>(null);
  const [sort, setSort] = useState<ShopSort>('recommended');
  const [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState<ShopProduct | null>(null);
  const [limit, setLimit] = useState(48);
  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const maxPrice = useMemo(() => Math.max(500, Math.ceil(products.filter(p => p.currency === currency).reduce((max, p) => Math.max(max, p.price), 0) / 50) * 50), [products, currency]);
  const range: [number, number] = budget ? [Math.min(budget[0], maxPrice), Math.min(budget[1], maxPrice)] : [0, maxPrice];
  const filtered = selectProducts(products, { query, category, currency, minPrice: range[0], maxPrice: range[1], sort, savedIds: savedOnly ? savedIds : undefined });

  useEffect(() => { setLimit(48); }, [query, category, currency, budget, sort, savedOnly]);

  const onSave = (id: string) => {
    track('shop_product_saved', { product_id: id, saved: !savedIds.has(id) });
    toggleSave(id);
  };
  const onSelect = (product: ShopProduct) => {
    setSelected(product);
    track('shop_product_viewed', { product_id: product.id, retailer_id: product.retailerId });
  };
  const resetFilters = () => {
    setQuery(''); setCategory(undefined); setBudget(null); setSort('recommended'); setSavedOnly(false);
  };

  if (isLoading) return <div role="status" aria-label="Loading shop" className="grid grid-cols-2 gap-3 py-4">{[0, 1, 2, 3].map(i => <div key={i} className="rounded-xl bg-secondary/50 aspect-[3/4] animate-pulse" />)}</div>;
  if (isError) return <div className="rounded-xl border border-border p-8 text-center space-y-3"><ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground" /><p role="alert" className="font-medium">The shop couldn’t be loaded</p><p className="text-sm text-muted-foreground">Please check your connection and try again.</p><Button variant="outline" onClick={() => refetch()} className="gap-2"><RefreshCw className="w-4 h-4" />Try again</Button></div>;
  if (!data || data.status !== 'ready') return <div className="rounded-xl border border-border bg-card px-6 py-12 text-center space-y-3"><ShoppingBag className="w-12 h-12 mx-auto text-primary" strokeWidth={1} /><h3 className="text-2xl">{data?.status === 'expired' ? 'Refreshing the collection' : 'Your next favourite piece is on its way'}</h3><p className="max-w-sm mx-auto text-sm text-muted-foreground">{data?.status === 'expired' ? 'We’re waiting for current prices and availability from our retailers. Please check back soon.' : 'Our retailer collection is coming soon. Once available, you’ll be able to browse pieces and save favourites here.'}</p><Link to="/closet" className="inline-block text-sm text-primary underline underline-offset-4 pt-2">Style what’s already in your closet</Link></div>;

  return <div className="space-y-5">
    <div className="flex items-center gap-2">
      <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search shop" value={query} onChange={event => setQuery(event.target.value)} maxLength={200} placeholder="Search pieces, brands or colours" className="pl-9 min-h-11" /></div>
      <Button variant={savedOnly ? 'default' : 'outline'} onClick={() => setSavedOnly(!savedOnly)} aria-pressed={savedOnly} aria-label="Show saved products" className="min-h-11 gap-1.5"><Heart className={`w-4 h-4 ${savedOnly ? 'fill-current' : ''}`} /><span className="hidden sm:inline">Saved</span><span>{savedIds.size}</span></Button>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Product categories">
      {[undefined, ...SHOP_CATEGORIES].map(value => <button type="button" key={value ?? 'all'} onClick={() => setCategory(value)} aria-pressed={category === value} className={`shrink-0 px-3 py-2 rounded-full border text-xs capitalize ${category === value ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}>{value ?? 'All pieces'}</button>)}
    </div>
    <div className="rounded-xl bg-secondary/30 p-4 space-y-4">
      <PriceFilter min={0} max={maxPrice} value={range} onChange={setBudget} currency={currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '€'} />
      <div className="flex gap-3 items-center justify-between flex-wrap">
        <p className="text-xs text-muted-foreground" role="status">{filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}{savedOnly ? ' saved on this device' : ''}</p>
        <div className="flex items-center gap-2"><select aria-label="Shop currency" value={currency} onChange={event => { setCurrency(event.target.value as ShopCurrency); setBudget(null); }} className="bg-background border border-border rounded px-2 py-1.5 text-xs">{SHOP_CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}</select><SortDropdown value={sort} onChange={setSort} /></div>
      </div>
    </div>
    {filtered.length ? <>
      <ShoppingGrid products={filtered.slice(0, limit)} savedIds={savedIds} onToggleSave={onSave} onSelect={onSelect} />
      {filtered.length > limit && <div className="text-center"><Button variant="outline" onClick={() => setLimit(value => value + 48)}>Show more pieces</Button></div>}
    </> : <div className="text-center py-10 space-y-3"><ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto" /><h3 className="text-xl">{savedOnly ? 'No saved pieces match these filters' : 'No pieces match yet'}</h3><p className="text-sm text-muted-foreground">Try a broader search, category or budget.</p><Button variant="outline" onClick={resetFilters}>Clear filters</Button></div>}
    <p className="text-xs text-muted-foreground leading-relaxed">Browse and save pieces in STYLST. Purchases are completed with the retailer. Some links are affiliate links: STYLST may earn a commission at no extra cost to you. Saved items stay on this device.</p>
    <ProductDetailSheet key={selected?.id ?? 'closed'} product={selected} onClose={() => setSelected(null)} isSaved={selected ? savedIds.has(selected.id) : false} onToggleSave={onSave} />
  </div>;
};

export default ShopBrowser;
