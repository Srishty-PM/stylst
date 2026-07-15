const SKIP_TYPES = new Set(['image/svg+xml', 'image/gif']);

export async function normalizeImageOrientation(file: File): Promise<File> {
  if (typeof window === 'undefined' || typeof createImageBitmap !== 'function') return file;
  if (!file.type.startsWith('image/') || SKIP_TYPES.has(file.type)) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { width, height } = bitmap;
    if (!width || !height) return file;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, outputType === 'image/jpeg' ? 0.92 : undefined)
    );
    if (!blob || blob.size === 0) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    const extension = outputType === 'image/png' ? 'png' : 'jpg';
    return new File([blob], `${baseName}.${extension}`, {
      type: outputType,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
