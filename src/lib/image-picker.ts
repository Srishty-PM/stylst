import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function isNativePicker(): boolean {
  return Capacitor.isNativePlatform();
}

async function webPathToFile(webPath: string, filename: string): Promise<File> {
  const res = await fetch(webPath);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

export async function takePhoto(): Promise<File | null> {
  const photo = await Camera.getPhoto({
    source: CameraSource.Camera,
    resultType: CameraResultType.Uri,
    quality: 90,
    correctOrientation: true,
  });
  if (!photo.webPath) return null;
  return webPathToFile(photo.webPath, `camera-${Date.now()}.${photo.format || 'jpeg'}`);
}

export async function pickFromLibrary(): Promise<File[]> {
  const result = await Camera.pickImages({ quality: 90 });
  return Promise.all(
    result.photos.map((p, i) => webPathToFile(p.webPath, `library-${Date.now()}-${i}.${p.format || 'jpeg'}`))
  );
}

export async function pickSinglePhoto(source: 'camera' | 'library'): Promise<File | null> {
  const photo = await Camera.getPhoto({
    source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    resultType: CameraResultType.Uri,
    quality: 90,
    correctOrientation: true,
  });
  if (!photo.webPath) return null;
  return webPathToFile(photo.webPath, `${source}-${Date.now()}.${photo.format || 'jpeg'}`);
}
