
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ellocontent.app',
  appName: 'ellocontent',
  webDir: 'dist',
  backgroundColor: '#0a0a0f',
  ios: {
    backgroundColor: '#0a0a0f',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
