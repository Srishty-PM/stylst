import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PriceFilter from './PriceFilter';
import SortDropdown, { type SortOption } from './SortDropdown';
import ProductTile, { type ShoppingProduct } from './ProductTile';

interface ShoppingGridProps {
  products: ShoppingProduct[];
  maxPrice?: number;
}

const ShoppingGrid = ({ products, maxPrice: maxPriceProp }: ShoppingGridProps) => {
  const computedMax = useMemo(() => {
    if (maxPriceProp) return maxPriceProp;
    const highest = Math.max(...products.map((p) => p.originalPrice ?? p.price), 0);
    return Math.ceil(highest / 50) * 50 || 500;
  }, [products, maxPriceProp]);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, computedMax]);
  const [sort, setSort] = useState<SortOption>('recommended');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let items = products.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    switch (sort) {
      case 'price_asc':
        items = [...items].sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        items = [...items].sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        items = [...items].reverse();
        break;
      default:
        break;
    }

    return items.map((p) => ({ ...p, isSaved: savedIds.has(p.id) }));
  }, [products, priceRange, sort, savedIds]);

  return (
    <div className="space-y-4">
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 pt-1 -mx-1 px-1 border-b border-border/50">
        <PriceFilter
          min={0}
          max={computedMax}
          value={priceRange}
          onChange={setPriceRange}
        />

        <div className="flex items-center justify-between mt-3">
          <p className="text-[10px] text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span>{' '}
            {filtered.length === 1 ? 'item' : 'items'}
          </p>
          <SortDropdown value={sort} onChange={setSort} />
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((product, i) => (
              <ProductTile
                key={product.id}
                product={product}
                index={i}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        </AnimatePresence>
      ) : (
        <div className="text-center py-12 space-y-3">
          <PackageOpen className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-sm font-medium text-foreground">No items in this range</p>
          <p className="text-xs text-muted-foreground">Try adjusting your budget</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPriceRange([0, computedMax])}
          >
            Reset filter
          </Button>
        </div>
      )}
    </div>
  );
};

export default ShoppingGrid;
