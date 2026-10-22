import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddInfluencerStyle from './AddInfluencerStyle';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  save: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: {} }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/hooks/useInfluencerStyles', () => ({
  useGenerateInfluencerStyle: () => ({ mutateAsync: mocks.generate, isPending: false }),
  useAddInfluencerPreference: () => ({ mutateAsync: mocks.save, isPending: false }),
}));

const profile = {
  aesthetic: 'Romantic tailoring', colors: ['cream'], silhouettes: ['fitted'], keyPieces: ['blazer'],
  occasions: ['daywear'], keywords: ['polished'], similarInfluencers: [], confidence: 0.9, generatedBy: 'AI',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.generate.mockResolvedValue({ success: true, profile, id: 'style-one' });
});
afterEach(cleanup);

describe('add influencer style', () => {
  it('accepts a full Instagram profile URL and sends the normalized username', async () => {
    render(<MemoryRouter><AddInfluencerStyle /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Influencer Name *'), { target: { value: 'Sophie Knight' } });
    fireEvent.change(screen.getByLabelText('Instagram username or profile link (optional)'), {
      target: { value: 'https://www.instagram.com/sophielouise/?igsh=abc123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Style Profile →' }));

    await waitFor(() => expect(mocks.generate).toHaveBeenCalledWith({
      influencer_name: 'Sophie Knight',
      instagram_handle: 'sophielouise',
    }));
    expect(screen.getByLabelText('Instagram username or profile link (optional)')).toHaveValue('@sophielouise');
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Validation Error' }));
  });

  it('shows an invalid profile link beside the field without calling the API', () => {
    render(<MemoryRouter><AddInfluencerStyle /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Influencer Name *'), { target: { value: 'Sophie Knight' } });
    fireEvent.change(screen.getByLabelText('Instagram username or profile link (optional)'), {
      target: { value: 'https://example.com/sophielouise' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Style Profile →' }));

    expect(screen.getByRole('alert')).toHaveTextContent('instagram.com');
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
