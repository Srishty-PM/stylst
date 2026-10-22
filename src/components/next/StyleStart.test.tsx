import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import StyleStart from './StyleStart';
afterEach(cleanup);
describe('guided starting points', () => {
  it('takes a new user directly to adding useful content instead of an empty collection', () => {
    render(<MemoryRouter><StyleStart closetCount={0} inspirationCount={0} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Recreate a look/ })).toHaveAttribute('href', '/inspiration/add');
    expect(screen.getByRole('link', { name: /Create something new/ })).toHaveAttribute('href', '/closet/add');
  });
  it('keeps existing users one tap away from styling, saved looks and planning', () => {
    render(<MemoryRouter><StyleStart closetCount={6} inspirationCount={2} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Recreate a look/ })).toHaveAttribute('href', '/inspiration');
    expect(screen.getByRole('link', { name: /Create something new/ })).toHaveAttribute('href', '/ai-stylist');
    expect(screen.getByRole('link', { name: 'Saved looks' })).toHaveAttribute('href', '/looks');
    expect(screen.getByRole('link', { name: 'Plan my week' })).toHaveAttribute('href', '/calendar');
  });
});
