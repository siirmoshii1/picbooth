/**
 * Photobooth Studio Pro (V2) - Camera Controller
 * Multi-device management, resolution scaling, front/back switching, WakeLock, and mock fallback.
 */

class V2Camera {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.devices = [];
    this.currentDeviceId = null;
    this.facingMode = 'user'; // 'user' or 'environment'
    this.isMirrored = true;
    this.aspectRatio = '4/3'; // '4/3', '16/9', '1/1', '3/2'
    this.resolution = '1080p'; // '4k', '1080p', '720p', 'auto'
    this.isMockMode = false;
    this.mockCanvas = null;
    this.mockCtx = null;
    this.mockAnimFrame = null;
    this.wakeLock = null;
    this.torchEnabled = false;

    this.onDevicesChangedCallback = null;
  }

  async init(onDevicesLoaded) {
    this.onDevicesChangedCallback = onDevicesLoaded;

    // Listen for USB webcam hot-plugging
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        console.log('Camera hardware change detected. Refreshing list...');
        await this.refreshDevices();
        if (this.onDevicesChangedCallback) {
          this.onDevicesChangedCallback(this.devices);
        }
      });
    }

    // Request Wake Lock to prevent screen sleep
    this.requestWakeLock();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('getUserMedia unavailable (non-secure context or unsupported). Starting Simulated Studio feed.');
      this.startMockFeed();
      if (onDevicesLoaded) onDevicesLoaded([]);
      return;
    }

    try {
      // First quick probe to prompt permission dialog
      const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      probe.getTracks().forEach(t => t.stop());

      await this.refreshDevices();
      if (onDevicesLoaded) onDevicesLoaded(this.devices);

      await this.startStream();
    } catch (err) {
      console.warn('Camera access unavailable or declined. Starting Simulated Studio feed.', err);
      this.startMockFeed();
      if (onDevicesLoaded) onDevicesLoaded([]);
    }
  }

  async refreshDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      this.devices = all.filter(d => d.kind === 'videoinput');
      return this.devices;
    } catch (e) {
      console.warn('Failed to enumerate video devices', e);
      this.devices = [];
      return [];
    }
  }

  getResolutionDimensions() {
    const aspectVals = {
      '4/3': 4 / 3,
      '16/9': 16 / 9,
      '1/1': 1,
      '3/2': 3 / 2
    };
    const ratio = aspectVals[this.aspectRatio] || (4 / 3);

    let targetHeight = 1080;
    if (this.resolution === '4k') targetHeight = 2160;
    else if (this.resolution === '720p') targetHeight = 720;
    else if (this.resolution === '1080p') targetHeight = 1080;

    const targetWidth = Math.round(targetHeight * ratio);
    return { width: targetWidth, height: targetHeight };
  }

  async startStream(deviceId = null, preferFacingMode = null) {
    this.stopStream();

    if (preferFacingMode) {
      this.facingMode = preferFacingMode;
      this.currentDeviceId = null; // reset specific ID when switching facing mode
    }

    if (deviceId) {
      this.currentDeviceId = deviceId;
    }

    const dims = this.getResolutionDimensions();

    const constraints = {
      video: {
        width: { ideal: dims.width },
        height: { ideal: dims.height }
      },
      audio: false
    };

    if (this.currentDeviceId) {
      constraints.video.deviceId = { exact: this.currentDeviceId };
    } else {
      constraints.video.facingMode = this.facingMode;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await this.video.play();
      this.isMockMode = false;
      this.applyMirroring();
    } catch (err) {
      console.warn('Exact camera constraints failed, attempting fallback...', err);
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this.facingMode },
          audio: false
        });
        this.video.srcObject = this.stream;
        await this.video.play();
        this.isMockMode = false;
        this.applyMirroring();
      } catch (finalErr) {
        console.warn('All camera attempts failed. Launching Simulated Studio camera.');
        this.startMockFeed();
      }
    }
  }

  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }
    if (this.mockAnimFrame) {
      cancelAnimationFrame(this.mockAnimFrame);
      this.mockAnimFrame = null;
    }
  }

  toggleFacingMode() {
    this.facingMode = (this.facingMode === 'user') ? 'environment' : 'user';
    // Back camera is usually not mirrored; front is mirrored
    this.isMirrored = (this.facingMode === 'user');
    this.startStream(null, this.facingMode);
    return this.facingMode;
  }

  toggleMirror() {
    this.isMirrored = !this.isMirrored;
    this.applyMirroring();
    return this.isMirrored;
  }

  applyMirroring() {
    if (this.video) {
      this.video.style.transform = this.isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    }
  }

  setAspectRatio(ratio) {
    this.aspectRatio = ratio;
    const box = document.getElementById('viewfinderBox');
    if (box) {
      box.classList.remove('aspect-4-3', 'aspect-16-9', 'aspect-1-1', 'aspect-3-2');
      if (ratio === '16/9') box.classList.add('aspect-16-9');
      else if (ratio === '1/1') box.classList.add('aspect-1-1');
      else if (ratio === '3/2') box.classList.add('aspect-3-2');
      else box.classList.add('aspect-4-3');
    }
    if (!this.isMockMode && this.stream) {
      this.startStream(this.currentDeviceId);
    }
  }

  setResolution(res) {
    this.resolution = res;
    if (!this.isMockMode && this.stream) {
      this.startStream(this.currentDeviceId);
    }
  }

  async toggleTorch() {
    if (!this.stream) return false;
    const track = this.stream.getVideoTracks()[0];
    if (!track) return false;

    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    if (capabilities.torch) {
      try {
        this.torchEnabled = !this.torchEnabled;
        await track.applyConstraints({
          advanced: [{ torch: this.torchEnabled }]
        });
        return this.torchEnabled;
      } catch (e) {
        console.warn('Torch toggle failed', e);
      }
    }
    return false;
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('Screen Wake Lock active (kiosk standby protection)');
      } catch (err) {
        console.log('Wake Lock request ignored or declined', err);
      }
    }
  }

  /**
   * Captures the current video frame into a high-resolution canvas snapshot.
   */
  captureSnapshot() {
    const canvas = document.createElement('canvas');
    let sourceWidth = this.video.videoWidth || 1280;
    let sourceHeight = this.video.videoHeight || 960;

    // Determine target dimensions matching aspect ratio
    const aspectVals = { '4/3': 4 / 3, '16/9': 16 / 9, '1/1': 1, '3/2': 3 / 2 };
    const targetRatio = aspectVals[this.aspectRatio] || (sourceWidth / sourceHeight);

    let cropW = sourceWidth;
    let cropH = sourceHeight;
    const currentRatio = sourceWidth / sourceHeight;

    if (currentRatio > targetRatio) {
      cropW = sourceHeight * targetRatio;
    } else {
      cropH = sourceWidth / targetRatio;
    }

    const cropX = (sourceWidth - cropW) / 2;
    const cropY = (sourceHeight - cropH) / 2;

    // High quality export dimensions
    const outputWidth = Math.max(1400, Math.round(cropW));
    const outputHeight = Math.max(1050, Math.round(cropH));

    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');

    // Handle mirroring during capture
    if (this.isMirrored) {
      ctx.translate(outputWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      this.video,
      cropX, cropY, cropW, cropH,
      0, 0, outputWidth, outputHeight
    );

    return canvas;
  }

  /**
   * Simulated Studio Camera Feed for testing without webcams or across devices
   */
  startMockFeed() {
    this.isMockMode = true;
    if (!this.mockCanvas) {
      this.mockCanvas = document.createElement('canvas');
      this.mockCanvas.width = 1280;
      this.mockCanvas.height = 960;
      this.mockCtx = this.mockCanvas.getContext('2d');
    }

    const renderMockFrame = () => {
      if (!this.isMockMode) return;
      const ctx = this.mockCtx;
      const w = this.mockCanvas.width;
      const h = this.mockCanvas.height;
      const time = Date.now() * 0.001;

      // Studio backdrop gradient with subtle movement
      const grad = ctx.createRadialGradient(
        w / 2 + Math.sin(time * 0.5) * 60,
        h / 2 + Math.cos(time * 0.5) * 40,
        50,
        w / 2, h / 2, Math.max(w, h) * 0.7
      );
      grad.addColorStop(0, '#2e2e38');
      grad.addColorStop(0.5, '#191922');
      grad.addColorStop(1, '#0c0c10');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Studio softbox rim light
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.sin(time * 2) * 0.05;
      const rim = ctx.createLinearGradient(0, 0, w, 0);
      rim.addColorStop(0, 'rgba(255, 230, 180, 0.4)');
      rim.addColorStop(0.5, 'transparent');
      rim.addColorStop(1, 'rgba(180, 220, 255, 0.4)');
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Stylized Subject Silhouette
      ctx.save();
      ctx.fillStyle = '#1c1c24';
      ctx.strokeStyle = '#444455';
      ctx.lineWidth = 4;

      // Body / Shoulders
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.82, 280, 160, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Head
      ctx.beginPath();
      const headBob = Math.sin(time * 1.5) * 8;
      ctx.arc(w / 2, h * 0.42 + headBob, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Studio Framing Guide
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(w / 3, 0); ctx.lineTo(w / 3, h);
      ctx.moveTo(w * 2 / 3, 0); ctx.lineTo(w * 2 / 3, h);
      ctx.moveTo(0, h / 3); ctx.lineTo(w, h / 3);
      ctx.moveTo(0, h * 2 / 3); ctx.lineTo(w, h * 2 / 3);
      ctx.stroke();
      ctx.setLineDash([]);

      // Status text overlay
      ctx.font = '600 24px Inter, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('SIMULATED HIGH-DEF STUDIO CAMERA', w / 2, 70);

      ctx.font = '400 16px Inter, sans-serif';
      ctx.fillStyle = '#9999aa';
      ctx.fillText('Ready for test capture • Connect camera for live stream', w / 2, 102);

      // Digital Timestamp
      ctx.font = '500 18px monospace';
      ctx.fillStyle = '#eab308';
      ctx.textAlign = 'right';
      const d = new Date();
      ctx.fillText(d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0').slice(0, 2), w - 40, 70);

      ctx.restore();

      this.mockAnimFrame = requestAnimationFrame(renderMockFrame);
    };

    renderMockFrame();

    try {
      const mockStream = this.mockCanvas.captureStream(30);
      this.video.srcObject = mockStream;
      this.video.play().catch(() => {});
      this.applyMirroring();
    } catch (e) {
      console.warn('captureStream not available on canvas', e);
    }
  }
}

window.V2Camera = V2Camera;
