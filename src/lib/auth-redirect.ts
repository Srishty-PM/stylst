import { Capacitor } from '@capacitor/core';

// capacitor://localhost is the app's private origin, not an email callback URL.
export const authRedirect = (path = '/') =>
  `${Capacitor.isNativePlatform() ? 'https://stylst.shop' : window.location.origin}${path}`;
