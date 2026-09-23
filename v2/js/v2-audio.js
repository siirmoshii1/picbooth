/**
 * Photobooth Studio Pro (V2) - Web Audio API Sound Synthesizer
 * Zero network requests, 100% offline, ultra-low latency on all devices (mobile, tablet, kiosk).
 */

class V2Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Countdown tick with dynamic pitch scaling
   */
  playCountdownTick(isFinal = false, pitchMultiplier = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const baseFreq = isFinal ? 1046.5 : (523.25 * pitchMultiplier); // C6 for final, C5 scaled
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.25 : 0.12));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + (isFinal ? 0.25 : 0.12));
    } catch (e) {
      console.warn('Audio tick error', e);
    }
  }

  /**
   * Dual-stage mechanical SLR shutter slap + electronic capacitor pop
   */
  playShutterSound() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Mechanical blade snap (bandpassed white noise burst)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.07);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.Q.setValueAtTime(3.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      // 2. Camera body reflex mirror slap (resonant low frequency drop)
      const osc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now + 0.035);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);

      thudGain.gain.setValueAtTime(0.5, now + 0.035);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

      osc.connect(thudGain);
      thudGain.connect(this.ctx.destination);
      osc.start(now + 0.035);
      osc.stop(now + 0.17);

      // 3. Strobe capacitor flash sizzle
      const flashOsc = this.ctx.createOscillator();
      const flashGain = this.ctx.createGain();
      flashOsc.type = 'sine';
      flashOsc.frequency.setValueAtTime(2400, now);
      flashOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.09);

      flashGain.gain.setValueAtTime(0.12, now);
      flashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      flashOsc.connect(flashGain);
      flashGain.connect(this.ctx.destination);
      flashOsc.start(now);
      flashOsc.stop(now + 0.09);
    } catch (e) {
      console.warn('Shutter sound error', e);
    }
  }

  /**
   * Tactile button click feedback
   */
  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  /**
   * Success chime when sequence is completed
   */
  playSuccess() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const start = this.ctx.currentTime + (idx * 0.07);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch (e) {}
  }
}

window.v2Audio = new V2Audio();
