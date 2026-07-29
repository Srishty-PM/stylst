import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ExternalLink } from 'lucide-react';
import PriceFilter from '@/components/shopping/PriceFilter';
import { categoryIcon } from '@/lib/categoryIcon';
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
  let q = query;
  if (max < PRICE_MAX) q += ` under £${max}`;
  else if (min > PRICE_MIN) q += ` over £${min}`;
  const params = new URLSearchParams({ q, udm: '28', gl: 'uk', hl: 'en-GB' });
  return `https://www.google.com/search?${params.toString()}`;
}

const ShoppingSheet = ({ open, onOpenChange, item }: ShoppingSheetProps) => {
  const [range, setRange] = useState<[number, number]>(DEFAULT_RANGE);

  useEffect(() => {
    if (item) setRange(DEFAULT_RANGE);
  }, [item?.name]);

  if (!item) return null;

  const query = item.name;
  const url = googleShoppingUrl(query, range);
  const Icon = categoryIcon(item.category);

  const handleShop = async () => {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url, presentationStyle: 'popover' });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

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

        <div className="flex justify-center pb-4">
          <div className="w-20 h-20 rounded-xl flex items-center justify-center border border-border shadow-sm bg-muted">
            <Icon className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>

        <div className="pb-5">
          <PriceFilter min={PRICE_MIN} max={PRICE_MAX} value={range} onChange={setRange} currency="£" />
        </div>

        <Button className="w-full gap-2" onClick={handleShop}>
          <ExternalLink className="w-4 h-4" /> Shop on Google Shopping
        </Button>

        <p className="text-[11px] text-muted-foreground text-center pt-3">
          {item.name} · £{range[0]} to £{range[1]}
        </p>
      </SheetContent>
    </Sheet>
  );
};

export default ShoppingSheet;
