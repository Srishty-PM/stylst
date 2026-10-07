export const AI_CONSENT_VERSION = '2026-10-07';
export const AI_DATA_DESCRIPTION = 'Clothing and inspiration photos, clothing details, style prompts, and the influencer names or handles you choose';

const keyFor = (userId: string) => `stylst_ai_consent_${AI_CONSENT_VERSION}_${userId}`;
const withdrawn = new Set<string>();
const pending = new Map<string, Promise<boolean>>();
type ConsentPrompt = (userId: string) => Promise<boolean>;
let prompt: ConsentPrompt | undefined;
let activeUserId: string | undefined;

export const hasAIConsent = (userId: string): boolean => {
  if (!userId || withdrawn.has(userId)) return false;
  try {
    const record = JSON.parse(localStorage.getItem(keyFor(userId)) ?? 'null');
    return record?.version === AI_CONSENT_VERSION && record.userId === userId &&
      record.recipient === 'Google Gemini' && record.allowed === true && record.adult === true;
  } catch { return false; }
};

export const setAIConsent = (userId: string, allowed: boolean): boolean => {
  if (!userId) return false;
  // Stop new requests immediately, even if storage is unavailable.
  if (!allowed) withdrawn.add(userId);
  try {
    if (!allowed) {
      localStorage.removeItem(keyFor(userId));
      return true;
    }
    const record = JSON.stringify({
      version: AI_CONSENT_VERSION, userId, recipient: 'Google Gemini',
      allowed: true, adult: true, grantedAt: new Date().toISOString(),
    });
    localStorage.setItem(keyFor(userId), record);
    if (localStorage.getItem(keyFor(userId)) !== record) return false;
    withdrawn.delete(userId);
    return true;
  } catch { return false; }
};

/** Only the mounted dialog for the signed-in account can grant permission. */
export const registerAIConsentPrompt = (next: ConsentPrompt, userId?: string) => {
  prompt = next;
  activeUserId = userId;
  return () => {
    if (prompt === next) {
      prompt = undefined;
      activeUserId = undefined;
    }
  };
};

export const ensureAIConsent = async (userId: string): Promise<boolean> => {
  if (!userId || activeUserId !== userId) return false;
  if (hasAIConsent(userId)) return true;
  if (pending.has(userId)) return pending.get(userId)!;
  const requestPrompt = prompt;
  if (!requestPrompt) return false;
  const request = (async () => {
    const allowed = await requestPrompt(userId);
    return allowed && prompt === requestPrompt && activeUserId === userId && setAIConsent(userId, true);
  })();
  pending.set(userId, request);
  try { return await request; }
  finally { if (pending.get(userId) === request) pending.delete(userId); }
};

/** Recheck immediately before transmission, after any photo uploads or awaits. */
export const runAIRequest = async <T>(userId: string, request: () => Promise<T>): Promise<T> => {
  if (activeUserId !== userId || !hasAIConsent(userId)) {
    throw new Error('AI processing is paused. Allow Google Gemini processing before trying again.');
  }
  return request();
};
