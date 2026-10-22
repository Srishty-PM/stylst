import { Capacitor } from '@capacitor/core';

/** Web rollout authorised on 22 October; bundled native releases retain the existing experience. */
export const isWebRelease = (platform: string): boolean => platform === 'web';
export const NEXT_RELEASE_ENABLED = isWebRelease(Capacitor.getPlatform());
export const IS_LOCAL_FEATURE_PREVIEW = import.meta.env.DEV && import.meta.env.VITE_STYLST_NEXT_RELEASE === 'true';

/** Image rendering is permitted only against an explicitly configured non-production project. */
export function canRenderTryOn(enabled: boolean, url?: string, sandboxRef?: string): boolean {
  if (!enabled || !url || !sandboxRef || sandboxRef === 'dzhhrtxlmmmbhggwsbrh') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === `${sandboxRef}.supabase.co`;
  } catch { return false; }
}

export const TRY_ON_RENDERING_ENABLED = canRenderTryOn(
  NEXT_RELEASE_ENABLED, import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_TRY_ON_SANDBOX_PROJECT_REF,
);
