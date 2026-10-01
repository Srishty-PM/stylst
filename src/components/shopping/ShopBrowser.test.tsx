import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ShopBrowser from './ShopBrowser';
import { shopFixture } from '@/test/shop-fixtures';

const mocks = vi.hoisted(() => ({ userId: 'account-one', track: vi.fn(), openRetailer: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mocks.userId }, profile: { currency: 'GBP' } }) }));
vi.mock('@/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track: mocks.track }) }));
vi.mock('@/lib/retailer-browser', () => ({ openRetailer: mocks.openRetailer }));

function showShop(props: Parameters<typeof ShopBrowser>[0] = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><ShopBrowser {...props} /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  mocks.userId = 'account-one';
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => shopFixture() }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('in-app shop journey', () => {
  it('browses details before any retailer handoff and saves across visits', async () => {
    const view = showShop();
    const product = await screen.findByRole('button', { name: 'View Beige wool coat' });
    expect(mocks.openRetailer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Beige wool coat' }));
    expect(screen.getByRole('button', { name: 'Unsave Beige wool coat' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(product);
    expect(await screen.findByRole('button', { name: 'Continue to Test Boutique' })).toBeVisible();
    expect(screen.getByText(/STYLST may earn a commission if you buy/)).toBeVisible();
    expect(mocks.openRetailer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Test Boutique' }));
    await waitFor(() => expect(mocks.openRetailer).toHaveBeenCalledOnce());
    view.unmount();
    showShop();
    expect(await screen.findByRole('button', { name: 'Unsave Beige wool coat' })).toBeVisible();
  });
  it('isolates saved items between signed-in accounts', async () => {
    const view = showShop();
    fireEvent.click(await screen.findByRole('button', { name: 'Save Beige wool coat' }));
    view.unmount();
    mocks.userId = 'account-two';
    showShop();
    expect(await screen.findByRole('button', { name: 'Save Beige wool coat' })).toHaveAttribute('aria-pressed', 'false');
  });
  it('narrows a missing piece by category and budget and searches within the app', async () => {
    showShop({ initialCategory: 'outerwear' });
    await screen.findByRole('button', { name: 'View Beige wool coat' });
    expect(screen.queryByRole('button', { name: 'View Blue midi dress' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '£25–£50' }));
    expect(screen.queryByRole('button', { name: 'View Beige wool coat' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Black raincoat' })).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search shop' }), { target: { value: 'unfindable' } });
    expect(screen.getByText('No pieces match yet')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('button', { name: 'View Blue midi dress' })).toBeVisible();
  });
  it('does not present purchasable products before an approved feed exists', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ version: 1, updatedAt: null, expiresAt: null, retailers: [], products: [] }) } as Response);
    showShop();
    expect(await screen.findByText('Your next favourite piece is on its way')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Continue to/ })).not.toBeInTheDocument();
  });
});
