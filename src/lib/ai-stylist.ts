import { z } from 'zod';

const stylistItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(160),
  category: z.string().min(1).max(80),
  imageUrl: z.string().url(),
});

export const stylistOutfitSchema = z.object({
  name: z.string().min(1).max(80),
  itemIds: z.array(z.string().min(1)).min(1).max(4),
  items: z.array(stylistItemSchema).min(1).max(4),
  whyItWorks: z.string().min(1).max(360),
  occasion: z.string().min(1).max(50),
  season: z.string().min(1).max(50),
  rating: z.number().int().min(1).max(5),
  styleInspiration: z.string().max(100).optional().default(''),
}).refine(outfit => outfit.itemIds.length === outfit.items.length && outfit.items.every((item, index) => item.id === outfit.itemIds[index]), {
  message: 'Outfit images must match the selected closet items.',
});

export const stylistResultSchema = z.object({
  intro: z.string().min(1).max(240),
  outfits: z.array(stylistOutfitSchema).min(1).max(3),
});

export type StylistOutfit = z.infer<typeof stylistOutfitSchema>;
export type StylistResult = z.infer<typeof stylistResultSchema>;
