import { Capacitor } from '@capacitor/core';

/** Web rollout authorised on 22 October; bundled native releases retain the existing experience. */
export const isWebRelease = (platform: string): boolean => platform === 'web';
export const NEXT_RELEASE_ENABLED = isWebRelease(Capacitor.getPlatform());
export const IS_LOCAL_FEATURE_PREVIEW = import.meta.env.DEV && import.meta.env.VITE_STYLST_NEXT_RELEASE === 'true';

/** The server, rather than a frontend environment switch, reports live rendering readiness. */
export function canRenderTryOn(webEnabled: boolean, status?: { enabled: boolean; remaining?: number; globalAvailable?: boolean }): boolean {
  return webEnabled && status?.enabled === true && (status.remaining ?? 0) > 0 && status.globalAvailable !== false;
}
