import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { retailerDestination, type ShopProduct } from './shop-catalogue';

export async function openRetailer(product: ShopProduct): Promise<void> {
  const url = retailerDestination(product);
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url, presentationStyle: 'fullscreen', toolbarColor: '#F5F0EC' });
    return;
  }
  // Open synchronously in the click handler to retain the browser's user gesture.
  window.open(url, '_blank', 'noopener,noreferrer');
}
