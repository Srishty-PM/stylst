import { describe, expect, it } from 'vitest';
import { legacyStylistTextToResult, stylistResultSchema } from './ai-stylist';

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

  it('turns the currently deployed Markdown stream into closet-photo outfits', () => {
    const legacy = `Here are two ideas.\n\n### 1. Parisian Midnight Glamour\n* **Outerwear:** Tweed Jacket with Jewel Buttons\n* **Bottom:** Houndstooth Straight Mini-Skirt\n* **Shoes:** Patent Heels\n\n**Why it works:** Texture and shine make this feel polished.\n**Rating:** 5/5\n\n### 2. Soft Tailoring\n* **Outerwear:** Camel Coat\n* **Bottom:** Houndstooth Straight Mini-Skirt\n\n**Why it works:** Warm neutrals balance the graphic skirt.`;
    const closet = [
      { id: 'jacket', name: 'Tweed Jacket with Jewel Buttons', category: 'outerwear', image_url: 'https://images.example/jacket.jpg' },
      { id: 'skirt', name: 'Houndstooth Straight Mini-Skirt', category: 'bottoms', image_url: 'https://images.example/skirt.jpg' },
      { id: 'heels', name: 'Patent Heels', category: 'shoes', image_url: 'https://images.example/heels.jpg' },
      { id: 'coat', name: 'Camel Coat', category: 'outerwear', image_url: 'https://images.example/coat.jpg' },
    ];
    const result = legacyStylistTextToResult(legacy, closet, 'winter date night');
    expect(result.outfits).toHaveLength(2);
    expect(result.outfits[0].itemIds).toEqual(['jacket', 'skirt', 'heels']);
    expect(result.outfits[0].items[0].imageUrl).toBe('https://images.example/jacket.jpg');
    expect(result.outfits[0]).toMatchObject({ occasion: 'Date night', season: 'Winter', rating: 5 });
    expect(result.outfits[0].whyItWorks).not.toContain('**');
  });
});
