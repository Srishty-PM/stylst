import { z } from 'zod';

export const TRY_ON_CONSENT_VERSION = '2026-10-22-avatar-v1';
export const avatarSettingsSchema = z.object({
  heightCm: z.number().int().min(120).max(220).optional(),
  build: z.enum(['as-photographed', 'slender', 'athletic', 'curvy', 'broad']).default('as-photographed'),
  hair: z.enum(['as-photographed', 'short', 'shoulder-length', 'long', 'tied-back']).default('as-photographed'),
});
export type AvatarSettings = z.infer<typeof avatarSettingsSchema>;
export const DEFAULT_AVATAR_SETTINGS: AvatarSettings = { build: 'as-photographed', hair: 'as-photographed' };
export interface TryOnImage { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }
export interface TryOnGarment { name: string; category: string; image: TryOnImage }
export interface TryOnRequest {
  action: 'avatar' | 'try-on';
  person: TryOnImage;
  settings: AvatarSettings;
  garments: TryOnGarment[];
  consent: { version: typeof TRY_ON_CONSENT_VERSION; allowed: true; adultAndOwnPhoto: true };
}
export interface TryOnResult { image: TryOnImage }
export const imageDataUrl = (image: TryOnImage): string => `data:${image.mimeType};base64,${image.data}`;

/** Re-encode on device to limit size, honour orientation and discard photo metadata. */
export async function prepareTryOnPhoto(file: Blob): Promise<TryOnImage> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP photo.');
  if (!file.size || file.size > 8 * 1024 * 1024) throw new Error('Choose a photo smaller than 8 MB.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    if (!bitmap.width || !bitmap.height) throw new Error('This photo could not be read.');
    const ratio = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Photo preparation is unavailable on this device.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.88).split(',')[1] };
  } finally { bitmap.close(); }
}

export async function prepareGarmentPhoto(url: string, signal?: AbortSignal): Promise<TryOnImage> {
  const target = new URL(url);
  if (target.protocol !== 'https:') throw new Error('This item needs an HTTPS product image.');
  const response = await fetch(target, { credentials: 'omit', referrerPolicy: 'no-referrer', signal });
  if (!response.ok) throw new Error('The item photo could not be loaded.');
  return prepareTryOnPhoto(await response.blob());
}
