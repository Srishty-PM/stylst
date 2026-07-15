import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ExternalLink } from 'lucide-react';

export interface ShopItem {
  name: string;
  category?: string | null;
  brand?: string | null;
  color?: string | null;
  thumbnail_url?: string | null;
}

interface ShoppingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ShopItem | null;
}

function buildQuery(item: ShopItem): string {
  const parts = [item.color, item.brand, item.name].filter(Boolean) as string[];
  const query = parts.join(' ').trim();
  return query || item.name;
}

function googleShoppingUrl(query: string): string {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
}

const ShoppingSheet = ({ open, onOpenChange, item }: ShoppingSheetProps) => {
  if (!item) return null;

  const query = buildQuery(item);
  const url = googleShoppingUrl(query);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="w-4 h-4 text-primary" /> Shop {item.name}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Find where to buy this online. Results open on Google Shopping.
          </SheetDescription>
        </SheetHeader>

        {item.thumbnail_url && (
          <div className="flex justify-center pb-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-border shadow-sm">
              <img src={item.thumbnail_url} alt={item.name} className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full gap-2">
            <ExternalLink className="w-4 h-4" /> Shop on Google Shopping
          </Button>
        </a>

        <p className="text-[11px] text-muted-foreground text-center pt-3">
          Searching for "{query}"
        </p>
      </SheetContent>
    </Sheet>
  );
};

export default ShoppingSheet;
