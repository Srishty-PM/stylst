import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'shop.stylst.app',
  appName: 'Stylst',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      launchFadeOutDuration: 500,
      backgroundColor: '#F5F0EC',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#FAFAF8',
    },
  },
};

export default config;
