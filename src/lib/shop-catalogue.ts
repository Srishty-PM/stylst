import { z } from 'zod';

export const SHOP_CURRENCIES = ['GBP', 'USD', 'EUR'] as const;
export type ShopCurrency = typeof SHOP_CURRENCIES[number];
export const SHOP_CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'bags', 'accessories'] as const;
export type ShopCategory = typeof SHOP_CATEGORIES[number];
export type ShopSort = 'recommended' | 'price_asc' | 'price_desc' | 'newest';

const hostSchema = z.string().min(1).max(253).regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i);
const httpsUrl = z.string().max(4096).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && hostSchema.safeParse(url.hostname).success;
  } catch { return false; }
}, 'An HTTPS URL without credentials is required');

export const retailerSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(120),
  productHosts: z.array(hostSchema).min(1).max(20),
  affiliateHosts: z.array(hostSchema).max(20).default([]),
});

export const productSchema = z.object({
  id: z.string().min(1).max(200),
  retailerId: z.string().min(1).max(100),
  name: z.string().min(1).max(300),
  brand: z.string().max(120).default(''),
  description: z.string().max(5000).default(''),
  price: z.number().finite().nonnegative(),
  originalPrice: z.number().finite().nonnegative().optional(),
  currency: z.enum(SHOP_CURRENCIES),
  productUrl: httpsUrl,
  affiliateUrl: httpsUrl.optional(),
  imageUrl: httpsUrl.optional(),
  category: z.enum(SHOP_CATEGORIES),
  colours: z.array(z.string().max(60)).max(20).default([]),
  sizes: z.array(z.string().max(40)).max(40).default([]),
  inStock: z.boolean().nullable().default(null),
  updatedAt: z.string().datetime({ offset: true }),
});

const catalogueSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().datetime({ offset: true }).nullable(),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  retailers: z.array(retailerSchema).max(1000),
  products: z.array(z.unknown()).max(20000),
});

export type ShopRetailer = z.infer<typeof retailerSchema>;
export type ShopProduct = z.infer<typeof productSchema> & { retailer: ShopRetailer; catalogueExpiresAt: string };
export interface ShopCatalogue {
  products: ShopProduct[];
  updatedAt: string | null;
  expiresAt: string | null;
  status: 'ready' | 'empty' | 'expired';
}

export function isAllowedUrl(value: string, hosts: string[]): boolean {
  if (!httpsUrl.safeParse(value).success) return false;
  return hosts.some(host => new URL(value).hostname === host.toLowerCase());
}

export function parseCatalogue(input: unknown, now = Date.now()): ShopCatalogue {
  const data = catalogueSchema.parse(input);
  const updated = data.updatedAt ? Date.parse(data.updatedAt) : NaN;
  const expires = data.expiresAt ? Date.parse(data.expiresAt) : NaN;
  if (data.products.length && (!Number.isFinite(updated) || !Number.isFinite(expires) || expires <= updated || expires - updated > 48 * 60 * 60 * 1000 || updated > now + 5 * 60 * 1000)) {
    throw new Error('Catalogue freshness information is invalid');
  }
  const expired = data.products.length > 0 && expires <= now;
  const retailers = new Map(data.retailers.map(r => [r.id, r]));
  if (retailers.size !== data.retailers.length) throw new Error('Duplicate retailer IDs');
  const seen = new Set<string>();
  const products: ShopProduct[] = [];
  if (!expired) for (const raw of data.products) {
    const result = productSchema.safeParse(raw);
    if (!result.success) continue;
    const product = result.data;
    const retailer = retailers.get(product.retailerId);
    const productUpdated = Date.parse(product.updatedAt);
    if (!retailer || seen.has(product.id) || product.inStock === false || now - productUpdated > 48 * 60 * 60 * 1000 || productUpdated > now + 5 * 60 * 1000) continue;
    if (!isAllowedUrl(product.productUrl, retailer.productHosts)) continue;
    if (product.affiliateUrl && !isAllowedUrl(product.affiliateUrl, retailer.affiliateHosts)) continue;
    seen.add(product.id);
    products.push({ ...product, retailer, catalogueExpiresAt: data.expiresAt! });
  }
  return { products, updatedAt: data.updatedAt, expiresAt: data.expiresAt, status: expired ? 'expired' : products.length ? 'ready' : 'empty' };
}

export function normalizeShopCategory(value?: string): ShopCategory | undefined {
  const category = value?.toLowerCase().trim();
  const aliases: Record<string, ShopCategory> = {
    top: 'tops', tops: 'tops', shirt: 'tops', shirts: 'tops', blouse: 'tops', knitwear: 'tops',
    bottom: 'bottoms', bottoms: 'bottoms', trousers: 'bottoms', jeans: 'bottoms', skirt: 'bottoms', skirts: 'bottoms',
    dress: 'dresses', dresses: 'dresses', jumpsuit: 'dresses',
    outerwear: 'outerwear', jacket: 'outerwear', coat: 'outerwear', coats: 'outerwear', blazer: 'outerwear',
    shoes: 'shoes', shoe: 'shoes', footwear: 'shoes', boots: 'shoes', heels: 'shoes', sneakers: 'shoes',
    bag: 'bags', bags: 'bags', handbag: 'bags',
    accessory: 'accessories', accessories: 'accessories', jewellery: 'accessories', jewelry: 'accessories',
  };
  return category ? aliases[category] : undefined;
}

export interface ShopFilters {
  query?: string;
  category?: ShopCategory;
  currency: ShopCurrency;
  minPrice: number;
  maxPrice: number;
  sort: ShopSort;
  savedIds?: Set<string>;
}

export function selectProducts(products: ShopProduct[], filters: ShopFilters): ShopProduct[] {
  const terms = (filters.query ?? '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const scored = products.filter(p => p.currency === filters.currency && (!filters.category || p.category === filters.category) && p.price >= filters.minPrice && p.price <= filters.maxPrice && (!filters.savedIds || filters.savedIds.has(p.id))).map(product => {
    const text = `${product.name} ${product.brand} ${product.category} ${product.colours.join(' ')} ${product.description}`.toLowerCase();
    const score = terms.filter(term => text.includes(term)).length;
    return { product, score };
  }).filter(p => terms.length === 0 || p.score > 0);
  scored.sort((a, b) => {
    if (filters.sort === 'price_asc') return a.product.price - b.product.price;
    if (filters.sort === 'price_desc') return b.product.price - a.product.price;
    if (filters.sort === 'newest') return Date.parse(b.product.updatedAt) - Date.parse(a.product.updatedAt);
    return b.score - a.score;
  });
  return scored.map(p => p.product);
}

export function formatShopPrice(amount: number, currency: ShopCurrency): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
}

export function retailerDestination(product: ShopProduct): string {
  if (Date.parse(product.catalogueExpiresAt) <= Date.now() || Date.now() - Date.parse(product.updatedAt) > 48 * 60 * 60 * 1000) throw new Error('This product needs refreshed prices');
  const url = product.affiliateUrl ?? product.productUrl;
  const hosts = product.affiliateUrl ? product.retailer.affiliateHosts : product.retailer.productHosts;
  if (!isAllowedUrl(url, hosts)) throw new Error('This retailer link is unavailable');
  return url;
}
