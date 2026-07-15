import { useState, useEffect } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ExternalLink } from 'lucide-react';
import PriceFilter from '@/components/shopping/PriceFilter';
import type { MissingItem } from '@/hooks/useAutoMatch';

export type ShopMissingItem = MissingItem & { thumbnail_url?: string | null };

interface ShoppingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ShopMissingItem | null;
}

const PRICE_MIN = 0;
const PRICE_MAX = 500;
const DEFAULT_RANGE: [number, number] = [0, 200];

function googleShoppingUrl(query: string, [min, max]: [number, number]): string {
  const priceParts = ['mr:1', 'price:1'];
  if (min > PRICE_MIN) priceParts.push(`ppr_min:${min}`);
  if (max < PRICE_MAX) priceParts.push(`ppr_max:${max}`);
  const tbs = priceParts.join(',');
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}&tbs=${encodeURIComponent(tbs)}`;
}

const ShoppingSheet = ({ open, onOpenChange, item }: ShoppingSheetProps) => {
  const [range, setRange] = useState<[number, number]>(DEFAULT_RANGE);

  useEffect(() => {
    if (item) setRange(DEFAULT_RANGE);
  }, [item?.name]);

  if (!item) return null;

  const query = item.name;
  const url = googleShoppingUrl(query, range);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="w-4 h-4 text-primary" /> Shop {item.name}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Set your budget, then browse real options for this piece on Google Shopping.
          </SheetDescription>
        </SheetHeader>

        {item.thumbnail_url && (
          <div className="flex justify-center pb-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-border shadow-sm bg-card">
              <img src={item.thumbnail_url} alt={item.name} className="w-full h-full object-contain p-1" />
            </div>
          </div>
        )}

        <div className="pb-5">
          <PriceFilter min={PRICE_MIN} max={PRICE_MAX} value={range} onChange={setRange} currency="£" />
        </div>

        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full gap-2">
            <ExternalLink className="w-4 h-4" /> Shop on Google Shopping
          </Button>
        </a>

        <p className="text-[11px] text-muted-foreground text-center pt-3">
          {item.name} · £{range[0]} to £{range[1]}
        </p>
      </SheetContent>
    </Sheet>
  );
};

export default ShoppingSheet;
