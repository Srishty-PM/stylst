const CONSENT_VERSION = '2026-09-29';

const keyFor = (userId: string) => `stylst_ai_consent_${CONSENT_VERSION}_${userId}`;

export const hasAIConsent = (userId: string) => {
  try { return localStorage.getItem(keyFor(userId)) === 'true'; } catch { return false; }
};

export const setAIConsent = (userId: string, consent: boolean) => {
  try {
    if (consent) localStorage.setItem(keyFor(userId), 'true');
    else localStorage.removeItem(keyFor(userId));
  } catch { /* A failed write must never count as consent. */ }
};

export const ensureAIConsent = (userId: string) => {
  if (hasAIConsent(userId)) return true;
  const agreed = window.confirm(
    'Allow Google Gemini AI processing?\n\nStylst sends the clothing and inspiration photos, item details, and style prompts you provide to Google Gemini to analyze items, clean up images, and suggest outfits. Your data will be sent only if you choose OK. You can withdraw permission in Settings and read the Privacy Policy there.\n\nSelect OK to allow, or Cancel to continue without this AI feature.'
  );
  if (agreed) setAIConsent(userId, true);
  return hasAIConsent(userId);
};
