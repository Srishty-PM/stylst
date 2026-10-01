import { useState } from 'react';
import { Heart, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatShopPrice, type ShopProduct } from '@/lib/shop-catalogue';
import { openRetailer } from '@/lib/retailer-browser';
import { useAnalytics } from '@/hooks/useAnalytics';

interface ProductDetailSheetProps {
  product: ShopProduct | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
}

const ProductDetailSheet = ({ product, onClose, isSaved, onToggleSave }: ProductDetailSheetProps) => {
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const { track } = useAnalytics();

  const handleRetailer = async () => {
    if (!product) return;
    setError(null);
    setOpening(true);
    try {
      await openRetailer(product);
      track('shop_retailer_clicked', { product_id: product.id, retailer_id: product.retailerId, affiliate: Boolean(product.affiliateUrl) });
    } catch {
      setError('The retailer could not be opened. Please try again.');
    } finally { setOpening(false); }
  };

  return (
    <Sheet open={Boolean(product)} onOpenChange={open => { if (!open) { setError(null); onClose(); } }}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl px-6 pb-[calc(1.5rem_+_env(safe-area-inset-bottom))]">
        {product && <div className="max-w-2xl mx-auto">
          <SheetHeader className="text-left mb-5">
            <SheetTitle className="font-display text-2xl">{product.name}</SheetTitle>
            <SheetDescription>{product.brand ? `${product.brand} · ` : ''}{product.retailer.name}</SheetDescription>
          </SheetHeader>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="aspect-[3/4] rounded-xl bg-secondary/40 overflow-hidden flex items-center justify-center">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} referrerPolicy="no-referrer" className="w-full h-full object-contain" onError={event => { event.currentTarget.style.display = 'none'; }} /> : <ShoppingBag className="w-14 h-14 text-muted-foreground/40" />}
            </div>
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <p className="text-2xl font-semibold">{formatShopPrice(product.price, product.currency)}</p>
                {product.originalPrice && product.originalPrice > product.price ? <p className="text-sm text-muted-foreground line-through">{formatShopPrice(product.originalPrice, product.currency)}</p> : null}
              </div>
              {product.description && <p className="text-sm leading-relaxed whitespace-pre-line">{product.description}</p>}
              {product.colours.length > 0 && <p className="text-sm"><span className="font-medium">Colours: </span>{product.colours.join(', ')}</p>}
              {product.sizes.length > 0 && <p className="text-sm"><span className="font-medium">Listed sizes: </span>{product.sizes.join(', ')}. Confirm availability with the retailer.</p>}
              <p className="text-xs text-muted-foreground">Product information updated {new Date(product.updatedAt).toLocaleDateString('en-GB')}. Final price, availability and delivery are confirmed by the retailer.</p>
              <Button variant="outline" className="w-full gap-2" onClick={() => onToggleSave(product.id)} aria-pressed={isSaved}><Heart className={`w-4 h-4 ${isSaved ? 'fill-primary text-primary' : ''}`} />{isSaved ? 'Saved on this device' : 'Save this item'}</Button>
              {product.affiliateUrl && <p className="text-xs text-muted-foreground">Affiliate link: STYLST may earn a commission if you buy, at no extra cost to you.</p>}
              <Button className="w-full gap-2 min-h-11" onClick={handleRetailer} disabled={opening}><ArrowUpRight className="w-4 h-4" />{opening ? 'Opening retailer…' : `Continue to ${product.retailer.name}`}</Button>
              <p className="text-xs text-muted-foreground">Complete your purchase with {product.retailer.name}, who handles payment, delivery and returns.</p>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        </div>}
      </SheetContent>
    </Sheet>
  );
};

export default ProductDetailSheet;
