import ProductTile from './ProductTile';
import type { ShopProduct } from '@/lib/shop-catalogue';

interface ShoppingGridProps {
  products: ShopProduct[];
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  onSelect: (product: ShopProduct) => void;
}

const ShoppingGrid = ({ products, savedIds, onToggleSave, onSelect }: ShoppingGridProps) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
    {products.map(product => <ProductTile key={product.id} product={product} isSaved={savedIds.has(product.id)} onToggleSave={onToggleSave} onSelect={onSelect} />)}
  </div>
);

export default ShoppingGrid;
