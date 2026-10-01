import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCatalogue } from './shop-catalogue';
import { shopFixture } from '@/test/shop-fixtures';
import { openRetailer } from './retailer-browser';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn() } }));
vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn().mockResolvedValue(undefined) } }));
afterEach(() => vi.restoreAllMocks());

describe('retailer handoff', () => {
  it('opens native purchase pages inside the system browser overlay', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const product = parseCatalogue(shopFixture()).products[0];
    await openRetailer(product);
    expect(Browser.open).toHaveBeenCalledWith({ url: product.affiliateUrl, presentationStyle: 'fullscreen', toolbarColor: '#F5F0EC' });
    expect(open).not.toHaveBeenCalled();
  });
  it('opens the exact tracked link on web without changing the STYLST page', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const product = parseCatalogue(shopFixture()).products[0];
    await openRetailer(product);
    expect(open).toHaveBeenCalledWith(product.affiliateUrl, '_blank', 'noopener,noreferrer');
  });
});
