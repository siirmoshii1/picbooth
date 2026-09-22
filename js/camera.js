/**
 * WebRTC Camera Controller for Photobooth
 * Handles camera stream discovery, switching, mirroring, aspect ratios & snapshot capture.
 */

class BoothCamera {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.devices = [];
    this.currentDeviceId = null;
    this.isMirrored = true;
    this.aspectRatio = '4/3'; // '4/3', '16/9', '1/1', '3/2'
    this.isMockMode = false;
    this.mockTimer = null;
  }

  async init(onDevicesLoaded) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('getUserMedia not supported in this browser context (HTTP vs HTTPS). Using simulated studio feed.');
      this.startMockFeed();
      return;
    }

    try {
      // First quick request to get permission and labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      // Stop temp tracks immediately
      tempStream.getTracks().forEach(t => t.stop());

      await this.refreshDevices();
      if (onDevicesLoaded) onDevicesLoaded(this.devices);

      // Start default camera
      await this.startStream();
    } catch (err) {
      console.warn('Camera access denied or no camera device found. Enabling simulated studio stream.', err);
      this.startMockFeed();
    }
  }

  async refreshDevices() {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      this.devices = allDevices.filter(d => d.kind === 'videoinput');
      return this.devices;
    } catch (e) {
      console.warn('Failed to enumerate devices', e);
      return [];
    }
  }

  async startStream(deviceId = null) {
    this.stopStream();

    if (deviceId) {
      this.currentDeviceId = deviceId;
    } else if (!this.currentDeviceId && this.devices.length > 0) {
      this.currentDeviceId = this.devices[0].deviceId;
    }

    const idealDimensions = this.getDimensionsForAspect(this.aspectRatio);

    const constraints = {
      video: {
        width: { ideal: idealDimensions.width },
        height: { ideal: idealDimensions.height },
        facingMode: 'user'
      },
      audio: false
    };

    if (this.currentDeviceId) {
      constraints.video.deviceId = { exact: this.currentDeviceId };
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await this.video.play();
      this.isMockMode = false;
      this.applyMirroring();
    } catch (err) {
      console.error('Error starting video stream', err);
      // If exact device failed, try generic fallback
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.video.srcObject = this.stream;
        await this.video.play();
        this.isMockMode = false;
        this.applyMirroring();
      } catch (fallbackErr) {
        console.warn('Camera stream fallback failed. Starting simulated studio feed.');
        this.startMockFeed();
      }
    }
  }

  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
  }

  setAspectRatio(ratioString) {
    this.aspectRatio = ratioString;
    // Update viewfinder CSS class
    const box = document.getElementById('viewfinderBox');
    if (box) {
      box.classList.remove('aspect-4-3', 'aspect-16-9', 'aspect-1-1', 'aspect-3-2');
      const cleanRatio = ratioString.replace('/', '-');
      box.classList.add(`aspect-${cleanRatio}`);
    }
  }

  getDimensionsForAspect(ratioString) {
    switch (ratioString) {
      case '16/9': return { width: 1920, height: 1080, ratioVal: 16 / 9 };
      case '1/1':  return { width: 1080, height: 1080, ratioVal: 1 / 1 };
      case '3/2':  return { width: 1800, height: 1200, ratioVal: 3 / 2 };
      case '4/3':
      default:     return { width: 1440, height: 1080, ratioVal: 4 / 3 };
    }
  }

  toggleMirror() {
    this.isMirrored = !this.isMirrored;
    this.applyMirroring();
    return this.isMirrored;
  }

  applyMirroring() {
    if (this.isMirrored) {
      this.video.classList.remove('unmirrored');
    } else {
      this.video.classList.add('unmirrored');
    }
  }

  /**
   * Captures the current video frame onto an offscreen canvas.
   * Accurately preserves mirror choice and crops to the selected aspect ratio.
   */
  captureSnapshot() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const videoWidth = this.video.videoWidth || 1280;
    const videoHeight = this.video.videoHeight || 960;

    const targetRatio = this.getDimensionsForAspect(this.aspectRatio).ratioVal;
    const currentVideoRatio = videoWidth / videoHeight;

    let srcX = 0;
    let srcY = 0;
    let srcWidth = videoWidth;
    let srcHeight = videoHeight;

    // Crop source video coordinates to match selected photobooth aspect ratio
    if (currentVideoRatio > targetRatio) {
      // Video is wider than target aspect ratio -> crop horizontal sides
      srcWidth = videoHeight * targetRatio;
      srcX = (videoWidth - srcWidth) / 2;
    } else {
      // Video is taller than target aspect ratio -> crop vertical sides
      srcHeight = videoWidth / targetRatio;
      srcY = (videoHeight - srcHeight) / 2;
    }

    // Set canvas dimensions to high-resolution matching target ratio
    canvas.width = 1440;
    canvas.height = Math.round(1440 / targetRatio);

    ctx.save();

    // Mirror horizontal axis if viewfinder is mirrored
    if (this.isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      this.video,
      srcX, srcY, srcWidth, srcHeight,
      0, 0, canvas.width, canvas.height
    );

    ctx.restore();

    return canvas;
  }

  /**
   * Simulated animated test studio feed for environments where a camera
   * is not currently attached or permissions are restricted.
   */
  startMockFeed() {
    this.isMockMode = true;
    const mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1280;
    mockCanvas.height = 960;
    const mctx = mockCanvas.getContext('2d');

    let frameCount = 0;
    const drawMock = () => {
      frameCount++;
      // Background studio gradient
      const grad = mctx.createRadialGradient(640, 480, 50, 640, 480, 600);
      grad.addColorStop(0, '#22222a');
      grad.addColorStop(1, '#0e0e12');
      mctx.fillStyle = grad;
      mctx.fillRect(0, 0, 1280, 960);

      // Studio grid lines
      mctx.strokeStyle = '#272733';
      mctx.lineWidth = 1;
      for (let x = 0; x < 1280; x += 80) {
        mctx.beginPath();
        mctx.moveTo(x, 0);
        mctx.lineTo(x, 960);
        mctx.stroke();
      }
      for (let y = 0; y < 960; y += 80) {
        mctx.beginPath();
        mctx.moveTo(0, y);
        mctx.lineTo(1280, y);
        mctx.stroke();
      }

      // Animated studio avatar / group silhouettes
      const bob = Math.sin(frameCount * 0.05) * 12;

      // Group silhouette 1 (Left)
      mctx.fillStyle = '#40404e';
      mctx.beginPath();
      mctx.arc(460, 430 + bob * 0.5, 90, 0, Math.PI * 2);
      mctx.fill();
      mctx.beginPath();
      mctx.ellipse(460, 680 + bob * 0.5, 170, 190, 0, 0, Math.PI * 2);
      mctx.fill();

      // Group silhouette 2 (Center)
      mctx.fillStyle = '#5c5c70';
      mctx.beginPath();
      mctx.arc(640, 390 + bob, 105, 0, Math.PI * 2);
      mctx.fill();
      mctx.beginPath();
      mctx.ellipse(640, 660 + bob, 190, 210, 0, 0, Math.PI * 2);
      mctx.fill();

      // Group silhouette 3 (Right)
      mctx.fillStyle = '#484857';
      mctx.beginPath();
      mctx.arc(820, 440 - bob * 0.5, 85, 0, Math.PI * 2);
      mctx.fill();
      mctx.beginPath();
      mctx.ellipse(820, 690 - bob * 0.5, 160, 180, 0, 0, Math.PI * 2);
      mctx.fill();

      // Studio Badge
      mctx.fillStyle = 'rgba(10, 10, 14, 0.8)';
      mctx.roundRect ? mctx.roundRect(460, 120, 360, 56, 12) : mctx.fillRect(460, 120, 360, 56);
      mctx.fill();
      mctx.strokeStyle = '#3e3e50';
      mctx.stroke();

      mctx.fillStyle = '#ffffff';
      mctx.font = 'bold 20px Inter, sans-serif';
      mctx.textAlign = 'center';
      mctx.fillText('STUDIO LIVE TEST FEED', 640, 155);

      mctx.fillStyle = '#94a3b8';
      mctx.font = '14px Inter, sans-serif';
      mctx.fillText('(Plug in or allow camera permissions for live webcam)', 640, 200);
    };

    if (mockCanvas.captureStream) {
      this.stream = mockCanvas.captureStream(30);
      this.video.srcObject = this.stream;
      this.video.play().catch(() => {});
      this.mockTimer = setInterval(drawMock, 33);
    }
  }
}

window.BoothCamera = BoothCamera;
