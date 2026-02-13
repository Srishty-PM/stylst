import { Heart, ExternalLink, Store, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export interface ShoppingProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  currency: string;
  imageUrl?: string;
  productUrl: string;
  retailer: string;
  category?: string;
  isSaved?: boolean;
}

interface ProductTileProps {
  product: ShoppingProduct;
  index: number;
  onToggleSave: (id: string) => void;
}

const formatPrice = (amount: number, currency: string) => {
  const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
  return `${sym}${amount.toFixed(2)}`;
};

const ProductTile = ({ product, index, onToggleSave }: ProductTileProps) => {
  const isOnSale = product.originalPrice && product.originalPrice > product.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <a
        href={product.productUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-square overflow-hidden bg-muted"
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={`${product.brand} ${product.name}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground/50 px-3 text-center leading-tight">
              {product.brand}
            </span>
          </div>
        )}

        {/* Save heart */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(product.id);
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center transition-colors hover:bg-background"
          aria-label={product.isSaved ? 'Remove from saved' : 'Save item'}
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              product.isSaved
                ? 'fill-primary text-primary'
                : 'text-muted-foreground'
            }`}
          />
        </button>

        {/* Retailer badge */}
        <Badge className="absolute bottom-2 left-2 bg-background/90 text-foreground text-[9px] backdrop-blur-sm border-0 shadow-sm font-medium">
          <Store className="w-2.5 h-2.5 mr-1" />
          {product.retailer}
        </Badge>
      </a>

      {/* Info */}
      <a
        href={product.productUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-2.5 space-y-1"
      >
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {product.brand}
        </p>
        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {product.name}
        </p>
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className={`text-sm font-bold ${isOnSale ? 'text-primary' : 'text-foreground'}`}>
            {formatPrice(product.price, product.currency)}
          </span>
          {isOnSale && (
            <span className="text-[10px] text-muted-foreground line-through">
              {formatPrice(product.originalPrice!, product.currency)}
            </span>
          )}
        </div>
        <div className="pt-1">
          <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Shop Now <ExternalLink className="w-2.5 h-2.5" />
          </span>
        </div>
      </a>
    </motion.div>
  );
};

export default ProductTile;
