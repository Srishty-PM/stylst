// Fictional retailer data used only by automated tests; never included in the live feed.
import type { z } from 'zod';
import type { productSchema } from '@/lib/shop-catalogue';

type ProductFixture = z.input<typeof productSchema>;
export function shopFixture() {
  const updatedAt = new Date(Date.now() - 60 * 1000).toISOString();
  return {
    version: 1,
    updatedAt,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    retailers: [{ id: 'test-retailer', name: 'Test Boutique', productHosts: ['retailer.example'], affiliateHosts: ['affiliate.example'] }],
    products: [
      { id: 'coat-1', retailerId: 'test-retailer', name: 'Beige wool coat', brand: 'Test Brand', description: 'A fictional coat for testing.', price: 95, currency: 'GBP', category: 'outerwear', colours: ['beige'], sizes: ['S', 'M'], inStock: true, productUrl: 'https://retailer.example/coat', affiliateUrl: 'https://affiliate.example/click?publisher=123&product=coat', updatedAt },
      { id: 'coat-2', retailerId: 'test-retailer', name: 'Black raincoat', brand: 'Test Brand', price: 45, currency: 'GBP', category: 'outerwear', productUrl: 'https://retailer.example/raincoat', updatedAt },
      { id: 'dress-1', retailerId: 'test-retailer', name: 'Blue midi dress', brand: 'Test Brand', price: 40, currency: 'GBP', category: 'dresses', productUrl: 'https://retailer.example/dress', updatedAt },
      { id: 'usd-1', retailerId: 'test-retailer', name: 'Beige coat US', price: 30, currency: 'USD', category: 'outerwear', productUrl: 'https://retailer.example/us-coat', updatedAt },
    ] as ProductFixture[],
  };
}
