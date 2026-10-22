import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import VisualOutfitCard from './VisualOutfitCard';

describe('visual outfit card', () => {
  it('shows the actual closet photos and useful actions instead of a prose response', () => {
    const onSave = vi.fn();
    render(<MemoryRouter><VisualOutfitCard
      outfit={{
        name: 'Parisian Midnight', itemIds: ['jacket', 'skirt', 'shoes'],
        items: [
          { id: 'jacket', name: 'Tweed Jacket', category: 'outerwear', imageUrl: 'https://images.example/jacket.jpg' },
          { id: 'skirt', name: 'Houndstooth Skirt', category: 'bottoms', imageUrl: 'https://images.example/skirt.jpg' },
          { id: 'shoes', name: 'Patent Heels', category: 'shoes', imageUrl: 'https://images.example/shoes.jpg' },
        ],
        whyItWorks: 'Texture and shine create an elevated date-night look.', occasion: 'Date night', season: 'Winter', rating: 5, styleInspiration: '',
      }}
      saved={false}
      saving={false}
      onSave={onSave}
    /></MemoryRouter>);

    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Tweed Jacket' })).toHaveAttribute('src', 'https://images.example/jacket.jpg');
    expect(screen.getByRole('button', { name: 'Try on' })).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Save look' }));
    expect(onSave).toHaveBeenCalledOnce();
  });
});
