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

export interface LegacyClosetItem {
  id: string;
  name: string;
  category: string;
  image_url: string;
  image_url_cleaned?: string | null;
}

const plainText = (value: string): string => value
  .replace(/[*_`#]/g, '')
  .replace(/^\s*[-–—]+\s*$/gm, '')
  .replace(/\s+/g, ' ')
  .trim();

const contextLabel = (request: string, options: [RegExp, string][], fallback: string) =>
  options.find(([pattern]) => pattern.test(request))?.[1] ?? fallback;

/** Compatibility for the already-deployed endpoint that streams formatted prose. */
export function legacyStylistTextToResult(text: string, closet: LegacyClosetItem[], request: string): StylistResult {
  const headings = [...text.matchAll(/^#{1,4}\s*(?:\d+[.)]?\s*)?(.+?)\s*$/gm)];
  const sections = headings.length ? headings.map((heading, index) => ({
    name: plainText(heading[1]),
    text: text.slice(heading.index ?? 0, headings[index + 1]?.index ?? text.length),
  })) : [{ name: 'Styled from your closet', text }];
  const occasion = contextLabel(request.toLowerCase(), [
    [/date/, 'Date night'], [/office|work|meeting/, 'Work'], [/party|cocktail/, 'Party'], [/formal|wedding/, 'Formal'], [/weekend|casual/, 'Casual'],
  ], 'Styled for you');
  const season = contextLabel(request.toLowerCase(), [
    [/winter|cold/, 'Winter'], [/summer|warm weather|hot/, 'Summer'], [/spring/, 'Spring'], [/autumn|fall/, 'Autumn'],
  ], 'All season');

  const outfits = sections.map((section, index) => {
    const lower = section.text.toLowerCase();
    const items = closet
      .map(item => ({ item, position: lower.indexOf(item.name.toLowerCase()) }))
      .filter(match => match.position >= 0)
      .sort((a, b) => a.position - b.position)
      .filter((match, matchIndex, matches) => matches.findIndex(other => other.item.id === match.item.id) === matchIndex)
      .slice(0, 4)
      .map(match => ({
        id: match.item.id, name: match.item.name, category: match.item.category,
        imageUrl: match.item.image_url_cleaned || match.item.image_url,
      }));
    const unformatted = section.text.replace(/[*_`#]/g, '');
    const whyMatch = unformatted.match(/why it works\s*:?\s*([\s\S]*?)(?=\n\s*(?:rating|match|styling tip)\b|$)/i);
    const ratingMatch = unformatted.match(/(?:rating|match)[^1-5]*([1-5])/i);
    return {
      name: section.name || `Look ${index + 1}`,
      itemIds: items.map(item => item.id), items,
      whyItWorks: plainText(whyMatch?.[1] || 'These pieces were selected together from your closet for a balanced, wearable look.').slice(0, 360),
      occasion, season, rating: Number(ratingMatch?.[1] || 4), styleInspiration: '',
    };
  }).filter(outfit => outfit.items.length > 0).slice(0, 3);

  if (!outfits.length) throw new Error('The stylist did not match the suggestions to closet photos. Please try again.');
  return stylistResultSchema.parse({ intro: 'Visual outfit ideas using pieces from your closet.', outfits });
}
