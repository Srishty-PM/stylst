import { describe, expect, it } from 'vitest';
import { isAllowedUrl, normalizeShopCategory, parseCatalogue, retailerDestination, selectProducts } from './shop-catalogue';
import { shopFixture } from '@/test/shop-fixtures';

describe('approved retailer catalogue', () => {
  it('shows an empty collection without inventing products', () => {
    expect(parseCatalogue({ version: 1, updatedAt: null, expiresAt: null, retailers: [], products: [] })).toMatchObject({ products: [], status: 'empty' });
  });
  it('excludes unapproved destinations, bad prices and unavailable products', () => {
    const source = shopFixture();
    const template = source.products[0];
    source.products.push(
      { ...template, id: 'unsafe-link', productUrl: 'javascript:alert(1)' },
      { ...template, id: 'lookalike', productUrl: 'https://retailer.example.evil.example/product' },
      { ...template, id: 'bad-affiliate', affiliateUrl: 'https://unapproved.example/click' },
      { ...template, id: 'unavailable', inStock: false },
      { ...template, id: 'bad-price', price: -5 },
    );
    expect(parseCatalogue(source).products.map(p => p.id)).toEqual(['coat-1', 'coat-2', 'dress-1', 'usd-1']);
  });
  it('requires fresh feed metadata and hides expired catalogues', () => {
    const source = shopFixture();
    source.updatedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    source.expiresAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(parseCatalogue(source)).toMatchObject({ products: [], status: 'expired' });
    expect(() => parseCatalogue({ ...source, expiresAt: null })).toThrow();
    expect(() => parseCatalogue({ ...source, updatedAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() })).toThrow();
  });
  it('does not make stale individual products fresh by republishing a catalogue', () => {
    const source = shopFixture();
    source.products[0].updatedAt = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    expect(parseCatalogue(source).products.some(p => p.id === 'coat-1')).toBe(false);
  });
  it('preserves affiliate attribution and blocks expired product handoffs', () => {
    const product = parseCatalogue(shopFixture()).products[0];
    expect(retailerDestination(product)).toBe('https://affiliate.example/click?publisher=123&product=coat');
    expect(() => retailerDestination({ ...product, catalogueExpiresAt: new Date(Date.now() - 1000).toISOString() })).toThrow();
  });
  it('rejects credentials, non-HTTPS schemes, IPs and unlisted subdomains', () => {
    for (const url of ['http://retailer.example/a', 'https://user:pass@retailer.example/a', 'https://127.0.0.1/a', 'https://shop.retailer.example/a', 'https://retailer.example:444/a']) {
      expect(isAllowedUrl(url, ['retailer.example'])).toBe(false);
    }
  });
  it('keeps currencies separate and applies contextual search, budget, category and saved filters', () => {
    const products = parseCatalogue(shopFixture()).products;
    const base = { currency: 'GBP' as const, minPrice: 0, maxPrice: 100, sort: 'price_asc' as const };
    expect(selectProducts(products, { ...base, category: 'outerwear' }).map(p => p.id)).toEqual(['coat-2', 'coat-1']);
    expect(selectProducts(products, { ...base, query: 'beige' }).map(p => p.id)).toEqual(['coat-1']);
    expect(selectProducts(products, { ...base, maxPrice: 50, savedIds: new Set(['coat-1', 'dress-1']) }).map(p => p.id)).toEqual(['dress-1']);
    expect(normalizeShopCategory('jacket')).toBe('outerwear');
    expect(normalizeShopCategory('unsupported')).toBeUndefined();
  });
});
