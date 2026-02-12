import { useState, useEffect } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingBag, ExternalLink, Loader2, Sparkles, Store, AlertCircle,
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
}

interface ShoppingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MissingItem | null;
}

const ShoppingSheet = ({ open, onOpenChange, item }: ShoppingSheetProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setRecommendations(data?.recommendations || []);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, item]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl px-4 pb-6">
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

        <ScrollArea className="h-full pr-1">
          {loading && (
            <div className="space-y-3 pb-8">
              <div className="text-center py-6 space-y-2">
                <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
                <p className="text-sm text-muted-foreground">Finding the best options...</p>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
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

          {!loading && !error && recommendations.length > 0 && (
            <AnimatePresence>
              <div className="space-y-3 pb-8">
                {recommendations.map((rec, i) => (
                  <motion.a
                    key={i}
                    href={rec.search_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="block rounded-xl border border-border hover:border-primary/40 p-3 space-y-1.5 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {rec.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{rec.brand}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {rec.price_range}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rec.why}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Store className="w-3 h-3" /> {rec.retailer}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Shop <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </motion.a>
                ))}

                {/* Google Shopping fallback */}
                {item && (
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
                )}
              </div>
            </AnimatePresence>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ShoppingSheet;
