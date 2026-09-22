/**
 * Web Audio API Sound Synthesizer for Photobooth
 * Zero network requests, ultra-low latency on tablets & mobile browsers.
 */

class BoothAudio {
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
      this.ctx.resume();
    }
  }

  playCountdownTick(isFinal = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isFinal ? 1046.5 : 523.25, now); // C6 for final, C5 for normal tick
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  playShutterSound() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. First click: mechanical blade opening (high passed noise)
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 3;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      // 2. Second click: mechanical shutter curtain snap (deep body thud)
      const osc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      thudGain.gain.setValueAtTime(0.4, now + 0.05);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(thudGain);
      thudGain.connect(this.ctx.destination);
      osc.start(now + 0.05);
      osc.stop(now + 0.16);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

window.boothAudio = new BoothAudio();
