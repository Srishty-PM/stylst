import { imageDataUrl, type AvatarSettings, type TryOnImage } from './try-on';

export interface SavedAvatar { userId: string; image: TryOnImage; settings: AvatarSettings }
const DATABASE = 'stylst-avatar-preview';
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('avatars', { keyPath: 'userId' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Avatar storage is unavailable on this device.'));
  });
}
async function access<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('avatars', mode);
    const request = operation(tx.objectStore('avatars'));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = () => { db.close(); reject(new Error('Your avatar could not be saved. Please try again.')); };
    tx.onabort = () => { db.close(); reject(new Error('Avatar storage was interrupted.')); };
  });
}
export async function loadAvatar(userId: string): Promise<SavedAvatar | undefined> {
  const record = await access('readonly', store => store.get(userId)) as SavedAvatar | undefined;
  if (!record || record.userId !== userId || !record.image?.data || !imageDataUrl(record.image).startsWith('data:image/')) return undefined;
  return record;
}
export async function saveAvatar(avatar: SavedAvatar): Promise<void> {
  await access('readwrite', store => store.put(avatar));
}
export async function deleteAvatar(userId: string): Promise<void> {
  await access('readwrite', store => store.delete(userId));
}
