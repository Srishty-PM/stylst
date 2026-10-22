const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com']);
const NON_PROFILE_PATHS = new Set(['accounts', 'direct', 'explore', 'p', 'reel', 'reels', 'stories']);
const HANDLE_PATTERN = /^[a-z0-9._]{1,30}$/i;

export class InstagramHandleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstagramHandleError';
  }
}

/** Accepts a username, @username, or Instagram profile URL and returns one canonical username. */
export function normalizeInstagramHandle(value: string | null | undefined): string {
  const input = value?.trim() ?? '';
  if (!input) return '';
  if (input.length > 2048) throw new InstagramHandleError('Instagram profile links must be shorter than 2,048 characters.');

  let candidate = input;
  const looksLikeInstagramUrl = /^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\//i.test(input);
  const looksLikeAnotherUrl = /^(?:https?:\/\/|www\.)/i.test(input);

  if (looksLikeInstagramUrl) {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    } catch {
      throw new InstagramHandleError('Enter a valid Instagram profile link.');
    }
    if (!INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) {
      throw new InstagramHandleError('Use an instagram.com profile link, or enter the username only.');
    }
    const firstPath = url.pathname.split('/').filter(Boolean)[0] ?? '';
    try {
      candidate = decodeURIComponent(firstPath);
    } catch {
      throw new InstagramHandleError('Enter a valid Instagram profile link.');
    }
    if (!candidate || NON_PROFILE_PATHS.has(candidate.toLowerCase())) {
      throw new InstagramHandleError('Paste an Instagram profile link, not a post, Reel or Story link.');
    }
  } else if (looksLikeAnotherUrl) {
    throw new InstagramHandleError('Use an instagram.com profile link, or enter the username only.');
  }

  candidate = candidate.replace(/^@/, '').trim();
  if (!HANDLE_PATTERN.test(candidate)) {
    throw new InstagramHandleError('Enter a username with up to 30 letters, numbers, periods or underscores.');
  }
  return candidate.toLowerCase();
}
