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
      this.audio.play()
        .then(() => {
          console.log('Test sound played successfully');
        })
        .catch(err => {
          console.error('Could not play test sound:', err);
          alert('Не удалось воспроизвести звук. Проверьте, что звук не заблокирован браузером и файл /sounds/notification.mp3 существует.');
        });
    } else {
      alert('Аудио не инициализировано');
    }
  }
}

export const notificationSound = new NotificationSound();
