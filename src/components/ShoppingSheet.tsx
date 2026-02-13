import { useState, useEffect, useMemo } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import {
  ShoppingBag, ExternalLink, Loader2, Sparkles, Store, AlertCircle, SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import type { MissingItem } from '@/hooks/useAutoMatch';

interface Recommendation {
  name: string;
  brand: string;
  price_range: string;
  retailer: string;
  search_url: string;
  why: string;
  thumbnail_url?: string;
}

interface ShoppingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MissingItem | null;
}

/** Extract the numeric min from a price string like "$40-$60" or "£25" */
function extractMinPrice(priceRange: string): number {
  const nums = priceRange.match(/[\d]+(?:\.[\d]+)?/g);
  return nums ? parseFloat(nums[0]) : 0;
}

function extractMaxPrice(priceRange: string): number {
  const nums = priceRange.match(/[\d]+(?:\.[\d]+)?/g);
  return nums && nums.length > 1 ? parseFloat(nums[nums.length - 1]) : (nums ? parseFloat(nums[0]) : 0);
}

const ShoppingSheet = ({ open, onOpenChange, item }: ShoppingSheetProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [maxPossible, setMaxPossible] = useState(500);

  useEffect(() => {
    if (!open || !item) return;
    setRecommendations([]);
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
          setError(fnError.message || 'Failed to load recommendations');
        } else if (data?.error) {
          setError(data.error);
        } else {
          const recs: Recommendation[] = data?.recommendations || [];
          setRecommendations(recs);
          // Compute max price across all recs
          if (recs.length > 0) {
            const highest = Math.max(...recs.map(r => extractMaxPrice(r.price_range)));
            const rounded = Math.ceil(highest / 50) * 50 || 500;
            setMaxPossible(rounded);
            setPriceRange([0, rounded]);
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, item]);

  const filtered = useMemo(() => {
    return recommendations.filter(r => {
      const min = extractMinPrice(r.price_range);
      return min >= priceRange[0] && min <= priceRange[1];
    });
  }, [recommendations, priceRange]);

  const currencySymbol = recommendations.length > 0
    ? (recommendations[0].price_range.match(/[£$€]/)?.[0] || '$')
    : '$';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl px-4 pb-6">
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
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-border shadow-sm">
              <img src={item.thumbnail_url} alt={item.name} className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        {/* Price range slider filter */}
        {!loading && !error && recommendations.length > 0 && (
          <div className="mb-4 px-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                Price Range
              </span>
              <span className="text-xs font-semibold text-primary">
                {currencySymbol}{priceRange[0]} – {currencySymbol}{priceRange[1]}
              </span>
            </div>
            <Slider
              min={0}
              max={maxPossible}
              step={5}
              value={priceRange}
              onValueChange={(v) => setPriceRange(v as [number, number])}
              className="w-full"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">{currencySymbol}0</span>
              <span className="text-[10px] text-muted-foreground">{currencySymbol}{maxPossible}</span>
            </div>
          </div>
        )}

        <ScrollArea className="h-full pr-1">
          {loading && (
            <div className="space-y-3 pb-8">
              <div className="text-center py-6 space-y-2">
                <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
                <p className="text-sm text-muted-foreground">Finding the best options...</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
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

          {!loading && !error && filtered.length > 0 && (
            <AnimatePresence>
              <div className="grid grid-cols-2 gap-3 pb-8">
                {filtered.map((rec, i) => (
                  <motion.a
                    key={i}
                    href={rec.search_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="block rounded-xl border border-border hover:border-primary/40 overflow-hidden transition-all group hover:shadow-md"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {rec.thumbnail_url ? (
                        <img
                          src={rec.thumbnail_url}
                          alt={rec.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-secondary/50">
                          <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
                          <span className="text-[10px] text-muted-foreground/60 px-2 text-center leading-tight">
                            {rec.brand}
                          </span>
                        </div>
                      )}
                      {/* Price badge overlay */}
                      <Badge className="absolute top-2 right-2 bg-background/90 text-foreground text-[10px] backdrop-blur-sm border-0 shadow-sm">
                        {rec.price_range}
                      </Badge>
                    </div>

                    {/* Info */}
                    <div className="p-2.5 space-y-1">
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {rec.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{rec.brand}</p>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Store className="w-2.5 h-2.5" /> {rec.retailer}
                        </span>
                        <ExternalLink className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>
            </AnimatePresence>
          )}

          {!loading && !error && recommendations.length > 0 && filtered.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <SlidersHorizontal className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No results in this price range</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPriceRange([0, maxPossible])}
              >
                Reset filter
              </Button>
            </div>
          )}

          {/* Google Shopping fallback */}
          {!loading && !error && recommendations.length > 0 && item && (
            <div className="pb-8">
              <a
                href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-3"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Browse all on Google Shopping
                </Button>
              </a>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ShoppingSheet;
