import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import TryOnConsent from './TryOnConsent';
afterEach(cleanup);
describe('photo consent', () => {
  it('is off by default and names the photos, recipient and adult/ownership requirement', () => {
    const change = vi.fn();
    render(<TryOnConsent allowed={false} onChange={change} />);
    const checkbox = screen.getByRole('checkbox', { name: /I am 18 or older, this is my own photo/ });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText(/selected body or avatar photo, clothing images and avatar settings to Google Gemini/)).toBeVisible();
    fireEvent.click(checkbox);
    expect(change).toHaveBeenCalledWith(true);
  });
});
