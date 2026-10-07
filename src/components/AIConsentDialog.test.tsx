import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AIConsentDialog from './AIConsentDialog';
import { ensureAIConsent, hasAIConsent } from '@/lib/ai-consent';
import { useAutoMatch } from '@/hooks/useAutoMatch';

const mocks = vi.hoisted(() => ({
  user: { id: 'review-user' } as { id: string } | null,
  invoke: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
    functions: { invoke: mocks.invoke },
  },
}));

const Location = () => <div data-testid="location">{useLocation().pathname}</div>;
const mount = () => render(<MemoryRouter><AIConsentDialog /><Location /></MemoryRouter>);
const requestPermission = () => {
  let request!: Promise<boolean>;
  act(() => { request = ensureAIConsent('review-user'); });
  return request;
};

describe('in-app Google Gemini disclosure', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.user = { id: 'review-user' };
    mocks.invoke.mockReset();
  });
  afterEach(cleanup);

  it('names the recipient and data, defaults to no consent, and allows decline', async () => {
    mount();
    const request = requestPermission();
    expect(screen.getByRole('heading', { name: 'Allow Google Gemini to process your data?' })).toBeInTheDocument();
    expect(screen.getByText(/influencer names or handles/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'I am 18 or older' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Allow AI processing' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(await request).toBe(false);
    expect(hasAIConsent('review-user')).toBe(false);
  });

  it('grants permission only after an explicit eligible-user action', async () => {
    mount();
    const request = requestPermission();
    fireEvent.click(screen.getByRole('checkbox', { name: 'I am 18 or older' }));
    fireEvent.click(screen.getByRole('button', { name: 'Allow AI processing' }));
    expect(await request).toBe(true);
    expect(hasAIConsent('review-user')).toBe(true);
  });

  it('lets the user open the policy without granting permission', async () => {
    mount();
    const request = requestPermission();
    fireEvent.click(screen.getByRole('link', { name: 'Read the Privacy Policy' }));
    expect(await request).toBe(false);
    expect(screen.getByTestId('location')).toHaveTextContent('/privacy');
    expect(hasAIConsent('review-user')).toBe(false);
  });

  it('cancels a pending prompt when the account changes', async () => {
    const view = mount();
    const request = requestPermission();
    mocks.user = { id: 'another-user' };
    view.rerender(<MemoryRouter><AIConsentDialog /><Location /></MemoryRouter>);
    expect(await request).toBe(false);
    expect(hasAIConsent('review-user')).toBe(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('keeps a real matching RPC blocked until consent and sends nothing after decline', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}><MemoryRouter><AIConsentDialog />{children}</MemoryRouter></QueryClientProvider>
    );
    const { result } = renderHook(() => useAutoMatch(), { wrapper });
    let mutation!: Promise<unknown>;
    act(() => { mutation = result.current.mutateAsync({ inspiration_id: 'inspiration-1' }).catch(error => error); });
    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
    expect(mocks.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    const error = await mutation;
    expect(error).toBeInstanceOf(Error);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
