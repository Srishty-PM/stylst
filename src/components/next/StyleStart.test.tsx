import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import StyleStart from './StyleStart';
afterEach(cleanup);
describe('guided starting points', () => {
  it('takes a new user directly to adding useful content instead of an empty collection', () => {
    render(<MemoryRouter><StyleStart closetCount={0} inspirationCount={0} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Add your first closet piece/ })).toHaveAttribute('href', '/closet/add');
    expect(screen.getByRole('link', { name: 'Create avatar' })).toHaveAttribute('href', '/try-on');
  });
  it('moves to inspiration only after the closet exists', () => {
    render(<MemoryRouter><StyleStart closetCount={6} inspirationCount={0} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Add your first inspiration/ })).toHaveAttribute('href', '/inspiration/add');
  });
  it('keeps existing users one tap away from recreating and saved looks', () => {
    render(<MemoryRouter><StyleStart closetCount={6} inspirationCount={2} avatarReady /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Choose a look to recreate/ })).toHaveAttribute('href', '/inspiration');
    expect(screen.getByRole('link', { name: 'AI stylist' })).toHaveAttribute('href', '/ai-stylist');
    expect(screen.getByRole('link', { name: 'Saved looks' })).toHaveAttribute('href', '/looks');
    expect(screen.queryByRole('link', { name: 'Create avatar' })).not.toBeInTheDocument();
  });
});
