import { Heart, ShoppingBag } from 'lucide-react';
import { formatShopPrice, type ShopProduct } from '@/lib/shop-catalogue';

interface ProductTileProps {
  product: ShopProduct;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onSelect: (product: ShopProduct) => void;
}

const ProductTile = ({ product, isSaved, onToggleSave, onSelect }: ProductTileProps) => (
  <article className="relative overflow-hidden rounded-xl border border-border bg-card group">
    <button type="button" className="block w-full text-left focus-visible:outline-primary" onClick={() => onSelect(product)} aria-label={`View ${product.name}`}>
      <div className="aspect-[3/4] bg-secondary/40 overflow-hidden flex items-center justify-center">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" onError={event => { event.currentTarget.style.display = 'none'; }} />
        ) : <ShoppingBag className="w-12 h-12 text-muted-foreground/40" strokeWidth={1} />}
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{product.brand || product.retailer.name}</p>
        <h3 className="!font-sans text-sm font-medium line-clamp-2 leading-snug min-h-[2.5rem]">{product.name}</h3>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold">{formatShopPrice(product.price, product.currency)}</span>
          {product.originalPrice && product.originalPrice > product.price ? <span className="text-xs text-muted-foreground line-through">{formatShopPrice(product.originalPrice, product.currency)}</span> : null}
        </div>
        <p className="text-xs text-muted-foreground">{product.retailer.name}</p>
        <span className="inline-block text-xs font-medium text-primary pt-1">View details</span>
      </div>
    </button>
    <button type="button" className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-background/95 shadow-sm" aria-label={`${isSaved ? 'Unsave' : 'Save'} ${product.name}`} aria-pressed={isSaved} onClick={() => onToggleSave(product.id)}>
      <Heart className={`h-4 w-4 ${isSaved ? 'fill-primary text-primary' : 'text-foreground'}`} strokeWidth={1.5} />
    </button>
  </article>
);

export default ProductTile;
