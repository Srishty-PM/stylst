import { describe, expect, it } from 'vitest';
import { getPinterestSyncNotice } from './pinterest-sync-result';

describe('Pinterest sync result messaging', () => {
  it('reports newly imported Pins', () => {
    expect(getPinterestSyncNotice('Office outfits', {
      synced: 4,
      total_pins: 4,
      available: 4,
      failed: 0,
    })).toEqual({
      title: 'Board Synced!',
      description: 'Imported 4 new Pins from "Office outfits".',
    });
  });

  it('reports the verified available count instead of saying zero Pins were imported', () => {
    const notice = getPinterestSyncNotice('Office outfits', {
      synced: 0,
      total_pins: 4,
      available: 4,
      failed: 0,
    });

    expect(notice).toEqual({
      title: 'Board Up to Date',
      description: '4 Pins from "Office outfits" are available in Inspiration.',
    });
    expect(notice.description).not.toContain('Imported 0');
  });

  it('uses a truthful fallback with an older Edge Function response', () => {
    const notice = getPinterestSyncNotice('Office outfits', {
      synced: 0,
      total_pins: 4,
    });

    expect(notice.description).toBe(
      'Sync completed for "Office outfits". Open Inspiration to view its available Pins.',
    );
    expect(notice.description).not.toContain('Imported 0');
  });

  it('surfaces a complete import failure', () => {
    expect(getPinterestSyncNotice('Office outfits', {
      synced: 0,
      total_pins: 4,
      available: 0,
      failed: 4,
    })).toEqual({
      title: 'Sync Incomplete',
      description: 'STYLST could not import Pins from "Office outfits". Please try again.',
      variant: 'destructive',
    });
  });
});
