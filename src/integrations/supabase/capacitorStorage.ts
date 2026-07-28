import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

type SupabaseAuthStorage = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

const nativeStorage: SupabaseAuthStorage = {
  getItem: async (key) => (await Preferences.get({ key })).value,
  setItem: async (key, value) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key) => {
    await Preferences.remove({ key });
  },
};

export const authStorage: SupabaseAuthStorage = Capacitor.isNativePlatform()
  ? nativeStorage
  : localStorage;
