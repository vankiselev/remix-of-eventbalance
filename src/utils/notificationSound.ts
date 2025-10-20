class NotificationSound {
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio('/sounds/notification.mp3');
      this.audio.preload = 'auto';
      this.audio.volume = 0.5;
      this.audio.addEventListener('error', (e) => {
        console.error('Notification audio load error', e);
      });
      
      // Load from localStorage
      const saved = localStorage.getItem('notification-sound-enabled');
      this.enabled = saved !== 'false';
    }
  }

  async play() {
    if (!this.enabled) return;
    try {
      if (!this.audio) throw new Error('audio-not-initialized');
      await this.ensureLoaded();
      this.audio.currentTime = 0;
      await this.audio.play();
    } catch (err) {
      console.error('Could not play notification sound, using fallback beep:', err);
      this.beepFallback();
    }
  }

  private ensureLoaded(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audio) return resolve();
      if (this.audio.readyState >= 2) return resolve();
      const onCanPlay = () => {
        this.audio?.removeEventListener('canplaythrough', onCanPlay);
        resolve();
      };
      this.audio.addEventListener('canplaythrough', onCanPlay as any, { once: true } as any);
      try { this.audio.load(); } catch {}
    });
  }

  private beepFallback() {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      o.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.error('Fallback beep failed', e);
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
    this.play();
  }
}

export const notificationSound = new NotificationSound();
