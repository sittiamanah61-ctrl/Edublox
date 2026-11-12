class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private bgmTimer: number | null = null;
  private noteStep = 0;
  private readonly melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 783.99];

  private ensureContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private playTone(
    freq: number,
    duration = 0.16,
    type: OscillatorType = 'triangle',
    gainVal = 0.12,
    delay = 0
  ) {
    if (!this.enabled) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore audio failures when blocked by autoplay policy
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.ensureContext();
      this.startBgm();
    } else {
      this.stopBgm();
    }
    return this.enabled;
  }

  initStart(): void {
    if (this.enabled) {
      this.ensureContext();
      this.startBgm();
    }
  }

  startBgm(): void {
    this.stopBgm();
    if (!this.enabled) return;
    this.bgmTimer = window.setInterval(() => {
      if (!this.enabled) return;
      const freq = this.melody[this.noteStep % this.melody.length];
      this.playTone(freq, 0.24, 'sine', 0.035, 0);
      this.noteStep++;
    }, 420);
  }

  stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  jump(): void {
    this.playTone(280, 0.12, 'square', 0.07, 0);
    this.playTone(460, 0.16, 'triangle', 0.08, 0.06);
  }

  select(): void {
    this.playTone(540, 0.09, 'triangle', 0.09, 0);
  }

  correct(): void {
    this.playTone(523.25, 0.12, 'triangle', 0.12, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.12, 0.1);
    this.playTone(783.99, 0.25, 'triangle', 0.14, 0.2);
  }

  wrong(): void {
    this.playTone(230, 0.18, 'sawtooth', 0.09, 0);
    this.playTone(185, 0.25, 'sawtooth', 0.09, 0.14);
  }

  coin(): void {
    this.playTone(987.77, 0.08, 'sine', 0.12, 0);
    this.playTone(1318.51, 0.22, 'sine', 0.12, 0.07);
  }
}

export const SoundFX = new SoundSynthesizer();
