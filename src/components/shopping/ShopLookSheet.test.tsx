import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { shopFixture } from '@/test/shop-fixtures';
import ShopLookSheet from './ShopLookSheet';
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test-person' }, profile: { currency: 'GBP' } }) }));
vi.mock('@/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track: vi.fn() }) }));
beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => shopFixture() })));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('shopping a whole look', () => {
  it('keeps a per-piece budget when moving between the missing garments', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter><ShopLookSheet open onOpenChange={vi.fn()} lookName="Weekend look" items={[{ name: 'coat', category: 'outerwear' }, { name: 'dress', category: 'dresses' }]} /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole('button', { name: 'View Beige wool coat' });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum per piece (optional)' }), { target: { value: '50' } });
    expect(screen.queryByRole('button', { name: 'View Beige wool coat' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Black raincoat' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /^dress$/ }));
    expect(await screen.findByRole('button', { name: 'View Blue midi dress' })).toBeVisible();
    expect(screen.getByRole('spinbutton', { name: 'Maximum per piece (optional)' })).toHaveValue(50);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum per piece (optional)' }), { target: { value: '30' } });
    expect(screen.queryByRole('button', { name: 'View Blue midi dress' })).not.toBeInTheDocument();
  });
});
