import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ render: vi.fn(), save: vi.fn(), remove: vi.fn(), garment: vi.fn(), enabled: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test-person' } }) }));
vi.mock('@/hooks/useClosetItems', () => ({ useClosetItems: () => ({ data: [{ id: 'shirt', name: 'Blue shirt', category: 'tops', image_url: 'https://images.example/shirt.jpg' }], isLoading: false, isError: false }) }));
vi.mock('@/hooks/useShopCatalogue', () => ({ useShopCatalogue: () => ({ data: { products: [] } }) }));
vi.mock('@/hooks/useTryOn', () => ({ useTryOn: () => ({ mutateAsync: mocks.render, isPending: false }), useTryOnAvailability: () => ({ data: { enabled: mocks.enabled, remaining: 3, dailyLimit: 3, globalAvailable: true }, isLoading: false, isError: false, refetch: vi.fn() }) }));
vi.mock('@/lib/next-release', () => ({ NEXT_RELEASE_ENABLED: true, canRenderTryOn: (_web: boolean, state: { enabled: boolean }) => state.enabled }));
vi.mock('@/lib/avatar-store', () => ({ loadAvatar: vi.fn(async () => undefined), saveAvatar: mocks.save, deleteAvatar: mocks.remove }));
vi.mock('@/lib/try-on', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/try-on')>(), prepareTryOnPhoto: vi.fn(async () => ({ mimeType: 'image/jpeg', data: 'source-photo' })), prepareGarmentPhoto: mocks.garment }));
import TryOn from './TryOn';
const image = { mimeType: 'image/png', data: 'generated-avatar' };
const show = () => render(<MemoryRouter><TryOn /></MemoryRouter>);
async function createAvatar() {
  show();
  const upload = screen.getByLabelText('Your reference photo');
  await waitFor(() => expect(upload).not.toBeDisabled());
  fireEvent.change(upload, { target: { files: [new File(['photo'], 'self.jpg', { type: 'image/jpeg' })] } });
  await screen.findByRole('img', { name: /Your selected source photo/ });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Create my avatar' }));
  await screen.findByRole('img', { name: 'Your generated avatar' });
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.enabled = true;
  mocks.render.mockResolvedValue({ image }); mocks.garment.mockResolvedValue({ mimeType: 'image/jpeg', data: 'garment-photo' });
  mocks.save.mockResolvedValue(undefined); mocks.remove.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('avatar creation and wardrobe try-on', () => {
  it('sends no photo before consent, saves only on request, and uses the generated likeness for try-on', async () => {
    await createAvatar();
    expect(mocks.render).toHaveBeenCalledOnce();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.queryByRole('img', { name: /Your selected source photo/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save avatar' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 'test-person', image })));
    fireEvent.click(screen.getByRole('button', { name: 'Blue shirt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try this on my avatar' }));
    await screen.findByRole('img', { name: 'AI outfit preview on your avatar' });
    expect(mocks.render).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'try-on', person: image, garments: [expect.objectContaining({ name: 'Blue shirt', category: 'tops' })] }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('test-person'));
    await waitFor(() => expect(screen.queryByRole('img', { name: 'AI outfit preview on your avatar' })).not.toBeInTheDocument());
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('stops a pending clothing upload from triggering a render after consent is withdrawn', async () => {
    await createAvatar();
    let release!: (value: { mimeType: string; data: string }) => void;
    mocks.garment.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Blue shirt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try this on my avatar' }));
    await waitFor(() => expect(mocks.garment).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('checkbox'));
    release({ mimeType: 'image/jpeg', data: 'garment-photo' });
    await waitFor(() => expect(screen.queryByText('Preparing your preview…')).not.toBeInTheDocument());
    expect(mocks.render).toHaveBeenCalledOnce();
  });
  it('does not permit rendering while the server reports it unavailable', async () => {
    mocks.enabled = false;
    show();
    await waitFor(() => expect(screen.queryByLabelText('Loading saved avatar')).not.toBeInTheDocument());
    expect(screen.getByText(/No photos will be sent/)).toBeVisible();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Create my avatar' })).toBeDisabled();
    expect(mocks.render).not.toHaveBeenCalled();
  });
});
