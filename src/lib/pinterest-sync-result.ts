export interface PinterestSyncResult {
  synced: number;
  total_pins: number;
  available?: number;
  failed?: number;
}

export interface PinterestSyncNotice {
  title: string;
  description: string;
  variant?: 'destructive';
}

const pinLabel = (count: number) => count === 1 ? 'Pin' : 'Pins';

export const getPinterestSyncNotice = (
  boardName: string,
  result: PinterestSyncResult,
): PinterestSyncNotice => {
  const synced = Math.max(0, result.synced || 0);
  const totalPins = Math.max(0, result.total_pins || 0);
  const available = typeof result.available === 'number'
    ? Math.max(0, result.available)
    : undefined;
  const failed = Math.max(0, result.failed || 0);

  if (failed > 0 && synced === 0 && available === 0) {
    return {
      title: 'Sync Incomplete',
      description: `STYLST could not import Pins from "${boardName}". Please try again.`,
      variant: 'destructive',
    };
  }

  if (synced > 0) {
    const failureNote = failed > 0
      ? ` ${failed} ${pinLabel(failed)} could not be imported.`
      : '';
    return {
      title: 'Board Synced!',
      description: `Imported ${synced} new ${pinLabel(synced)} from "${boardName}".${failureNote}`,
    };
  }

  if (available !== undefined && available > 0) {
    return {
      title: 'Board Up to Date',
      description: `${available} ${pinLabel(available)} from "${boardName}" ${available === 1 ? 'is' : 'are'} available in Inspiration.`,
    };
  }

  if (totalPins === 0) {
    return {
      title: 'No Pins Found',
      description: `Pinterest returned no Pins for "${boardName}".`,
    };
  }

  // Older deployed functions do not return `available`. Keep the message truthful
  // without presenting their potentially stale inserted-row counter as the outcome.
  return {
    title: 'Board Synced!',
    description: `Sync completed for "${boardName}". Open Inspiration to view its available Pins.`,
  };
};
