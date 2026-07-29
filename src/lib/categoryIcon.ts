import { Shirt, Footprints, Watch, ShoppingBag, Gem, type LucideIcon } from 'lucide-react';

export const categoryIcon = (category?: string): LucideIcon => {
  const c = category?.toLowerCase() || '';
  if (c.includes('shoe') || c.includes('boot') || c.includes('sneaker') || c.includes('heel') || c.includes('flat') || c.includes('sandal') || c.includes('loafer')) return Footprints;
  if (c.includes('bag') || c.includes('purse') || c.includes('clutch') || c.includes('tote') || c.includes('backpack')) return ShoppingBag;
  if (c.includes('jewel') || c.includes('watch') || c.includes('ring') || c.includes('necklace') || c.includes('earring') || c.includes('bracelet')) return Gem;
  if (c.includes('accessor') || c.includes('belt') || c.includes('hat') || c.includes('scarf') || c.includes('sunglass') || c.includes('glass')) return Watch;
  return Shirt;
};
