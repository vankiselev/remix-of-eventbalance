class NotificationSound {
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio('/sounds/notification.mp3');
      this.audio.volume = 0.5;
      
      // Load from localStorage
      const saved = localStorage.getItem('notification-sound-enabled');
      this.enabled = saved !== 'false';
    }
  }

  play() {
    if (this.enabled && this.audio) {
      this.audio.currentTime = 0;
      this.audio.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('notification-sound-enabled', String(enabled));
  }

  isEnabled() {
    return this.enabled;
  }

  testSound() {
    if (this.audio) {
      this.audio.currentTime = 0;
      this.audio.play().catch(err => {
        console.log('Could not play test sound:', err);
      });
    }
  }
}

export const notificationSound = new NotificationSound();
