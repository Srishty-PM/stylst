import { describe, expect, it } from 'vitest';
import { stylistResultSchema } from './ai-stylist';

const item = (id: string) => ({ id, name: `Item ${id}`, category: 'tops', imageUrl: `https://images.example/${id}.jpg` });

describe('visual AI stylist response contract', () => {
  it('accepts visual outfits only when every selected ID has the matching closet image', () => {
    const result = stylistResultSchema.parse({
      intro: 'Three looks made from your wardrobe.',
      outfits: [{
        name: 'Winter Date', itemIds: ['coat', 'dress'], items: [item('coat'), item('dress')],
        whyItWorks: 'The strong coat balances the softer dress.', occasion: 'Date night', season: 'Winter', rating: 5,
      }],
    });
    expect(result.outfits[0].items.map(value => value.imageUrl)).toEqual([
      'https://images.example/coat.jpg', 'https://images.example/dress.jpg',
    ]);
  });

  it('rejects prose-only and mismatched responses before they reach the screen', () => {
    expect(stylistResultSchema.safeParse({ intro: '### Raw Markdown', outfits: [] }).success).toBe(false);
    expect(stylistResultSchema.safeParse({
      intro: 'A look', outfits: [{
        name: 'Look', itemIds: ['coat'], items: [item('dress')], whyItWorks: 'Works', occasion: 'Work', season: 'Winter', rating: 4,
      }],
    }).success).toBe(false);
  });
});
