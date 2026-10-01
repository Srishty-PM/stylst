import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowUpRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import ShopBrowser from '@/components/shopping/ShopBrowser';
import { normalizeShopCategory } from '@/lib/shop-catalogue';
import type { MissingItem } from '@/hooks/useAutoMatch';

export type ShopMissingItem = MissingItem & { thumbnail_url?: string | null };

interface ShoppingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ShopMissingItem | null;
}

const ShoppingSheet = ({ open, onOpenChange, item }: ShoppingSheetProps) => {
  if (!item) return null;
  const category = normalizeShopCategory(item.category);
  const params = new URLSearchParams({ q: item.name.slice(0, 200) });
  if (category) params.set('category', category);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 max-h-[90dvh] overflow-y-auto pb-[calc(1.5rem_+_env(safe-area-inset-bottom))]">
        <div className="max-w-4xl mx-auto">
          <SheetHeader className="text-left pb-5 pr-5">
            <SheetTitle className="flex items-center gap-2 font-display text-2xl"><ShoppingBag className="w-5 h-5 text-primary" />Find your {item.name}</SheetTitle>
            <SheetDescription>Explore retailer pieces for this look, right here in STYLST.</SheetDescription>
          </SheetHeader>
          <ShopBrowser key={`${item.name}:${category ?? ''}:${open}`} initialQuery={item.name} initialCategory={category} enabled={open} />
          <Link to={`/shop?${params.toString()}`} onClick={() => onOpenChange(false)} className="inline-flex items-center gap-1.5 text-sm text-primary pt-5">Open the full shop<ArrowUpRight className="w-4 h-4" /></Link>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ShoppingSheet;
