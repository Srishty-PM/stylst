import { useState, useEffect, useCallback } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingBag, Loader2, Sparkles, AlertCircle, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { MissingItem } from '@/hooks/useAutoMatch';
import ShoppingGrid from '@/components/shopping/ShoppingGrid';
import type { ShoppingProduct } from '@/components/shopping/ProductTile';

interface ShoppingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MissingItem | null;
}

/** Parse a price string like "$40-$60" or "£25" into a numeric price */
function parsePrice(priceRange: string): { price: number; originalPrice?: number } {
  const nums = priceRange.match(/[\d]+(?:\.[\d]+)?/g);
  if (!nums) return { price: 0 };
  if (nums.length >= 2) {
    return { price: parseFloat(nums[0]), originalPrice: parseFloat(nums[1]) };
  }
  return { price: parseFloat(nums[0]) };
}

function parseCurrency(priceRange: string): string {
  if (priceRange.includes('£')) return 'GBP';
  if (priceRange.includes('€')) return 'EUR';
  return 'USD';
}

const ShoppingSheet = ({ open, onOpenChange, item }: ShoppingSheetProps) => {
  const [products, setProducts] = useState<ShoppingProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setProducts([]);
    setError(null);
    setLoading(true);

    supabase.functions
      .invoke('shop-recommendations', {
        body: {
          item_name: item.name,
          item_category: item.category,
          item_description: item.description,
        },
      })
      .then(({ data, error: fnError }) => {
        if (fnError) {
          console.error('Shop recommendations error:', fnError);
          setError(fnError.message || 'Failed to load recommendations');
        } else if (data?.error) {
          console.error('Shop recommendations data error:', data.error);
          setError(data.error);
        } else {
          const recs = data?.recommendations || [];
          console.log('Shop recommendations received:', recs.length, 'items');
          const mapped: ShoppingProduct[] = recs.map((r: any, i: number) => {
            const { price, originalPrice } = parsePrice(r.price_range);
            return {
              id: `rec-${i}`,
              name: r.name,
              brand: r.brand,
              price,
              originalPrice,
              currency: parseCurrency(r.price_range),
              imageUrl: r.thumbnail_url || undefined,
              productUrl: r.search_url,
              retailer: r.retailer,
              category: item.category || undefined,
            };
          });
          setProducts(mapped);
          if (mapped.length === 0) {
            setError('No recommendations found. Try browsing Google Shopping instead.');
          }
        }
      })
      .catch((e) => {
        console.error('Shop recommendations catch:', e);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [open, item]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-4 pb-6">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Shop {item?.name || 'Item'}
          </SheetTitle>
          <SheetDescription className="text-xs">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI-curated picks to complete your outfit
            </span>
          </SheetDescription>
        </SheetHeader>

        {/* Thumbnail preview */}
        {item?.thumbnail_url && (
          <div className="flex justify-center pb-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-border shadow-sm">
              <img src={item.thumbnail_url} alt={item.name} className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        <ScrollArea className="h-full pr-1">
          {loading && (
            <div className="space-y-4 pb-8">
              <div className="text-center py-6 space-y-2">
                <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
                <p className="text-sm text-muted-foreground">Finding the best options…</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-xl border border-border overflow-hidden">
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-2.5 space-y-1.5">
                      <Skeleton className="h-2 w-1/3" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-12 space-y-3">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="pb-8">
              <ShoppingGrid products={products} />

              {/* Google Shopping fallback */}
              {item && (
                <div className="pt-4">
                  <a
                    href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Browse all on Google Shopping
                    </Button>
                  </a>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ShoppingSheet;
