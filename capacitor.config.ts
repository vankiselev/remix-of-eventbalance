import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.570d8d9738784019bf44f397a9d95e1b',
  appName: 'eventbalance',
  webDir: 'dist',
  server: {
    url: 'https://570d8d97-3878-4019-bf44-f397a9d95e1b.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
