/**
 * Photobooth Studio Pro (V2) - Master Application Logic
 * Touch-first multi-device orchestration, live shaders, multi-format export & local gallery.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const videoStream = document.getElementById('videoStream');
  const viewfinderBox = document.getElementById('viewfinderBox');
  const btnShutter = document.getElementById('btnShutter');
  const btnStartSession = document.getElementById('btnStartSession');
  const countdownOverlay = document.getElementById('countdownOverlay');
  const countdownNumber = document.getElementById('countdownNumber');
  const countdownLabel = document.getElementById('countdownLabel');
  const flashLayer = document.getElementById('flashLayer');
  const sequenceProgress = document.getElementById('sequenceProgress');
  const sequenceText = document.getElementById('sequenceText');
  const statusBadge = document.getElementById('statusBadge');
  const statusDot = document.getElementById('statusDot');

  // Header & Device Controls
  const cameraSelect = document.getElementById('cameraSelect');
  const btnSwitchFacing = document.getElementById('btnSwitchFacing');
  const btnFlipCamera = document.getElementById('btnFlipCamera');
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnGalleryToggle = document.getElementById('btnGalleryToggle');
  const resolutionSelect = document.getElementById('resolutionSelect');

  // Result Modal Elements
  const resultModal = document.getElementById('resultModal');
  const compositeCanvas = document.getElementById('compositeCanvas');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnDownloadPng = document.getElementById('btnDownloadPng');
  const btnDownloadJpg = document.getElementById('btnDownloadJpg');
  const btnDownloadWebp = document.getElementById('btnDownloadWebp');
  const btnDownloadGif = document.getElementById('btnDownloadGif');
  const btnPrintPhoto = document.getElementById('btnPrintPhoto');
  const btnShareMobile = document.getElementById('btnShareMobile');
  const btnCopyClipboard = document.getElementById('btnCopyClipboard');
  const btnRetakeAll = document.getElementById('btnRetakeAll');

  // Gallery Drawer
  const galleryDrawer = document.getElementById('galleryDrawer');
  const btnCloseGallery = document.getElementById('btnCloseGallery');
  const galleryGrid = document.getElementById('galleryGrid');
  const btnClearGallery = document.getElementById('btnClearGallery');

  // Sliders & Customization Inputs
  const filterIntensitySlider = document.getElementById('filterIntensitySlider');
  const intensityValueDisplay = document.getElementById('intensityValueDisplay');
  const filmGrainSlider = document.getElementById('filmGrainSlider');
  const grainValueDisplay = document.getElementById('grainValueDisplay');
  const borderPaddingSlider = document.getElementById('borderPaddingSlider');
  const photoGapSlider = document.getElementById('photoGapSlider');
  const cornerRadiusSlider = document.getElementById('cornerRadiusSlider');
  const customEventTitle = document.getElementById('customEventTitle');
  const customSubtitle = document.getElementById('customSubtitle');
  const customLocation = document.getElementById('customLocation');
  const fontSelect = document.getElementById('fontSelect');
  const toggleDateStamp = document.getElementById('toggleDateStamp');
  const customColorInput = document.getElementById('customColorInput');

  // Instantiate Camera
  const camera = new window.V2Camera(videoStream);

  // App State
  const state = {
    activeTemplate: 'strip-4',
    activeFilter: 'vintage70s',
    filterIntensity: 1.0,
    filmGrain: 0.18,
    vignette: 0.35,
    frameColor: '#111116',
    borderPadding: 36,
    photoGap: 20,
    cornerRadius: 8,
    fontFamily: 'Playfair Display',
    customTitle: 'STUDIO PHOTOBOOTH',
    customSubtitle: 'PRO EDITION • NOIR & SILVER',
    locationText: '',
    showDate: true,
    countdownDuration: 3,
    capturedShots: [],
    isSessionActive: false
  };

  // Initialize Camera
  camera.init((devices) => {
    populateCameraDropdown(devices);
  });

  function populateCameraDropdown(devices) {
    if (!cameraSelect) return;
    cameraSelect.innerHTML = '';
    if (devices.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = camera.isMockMode ? 'Simulated HD Studio Camera' : 'Default Camera';
      cameraSelect.appendChild(opt);
      return;
    }

    devices.forEach((dev, idx) => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.textContent = dev.label || `Camera ${idx + 1} (${idx === 0 ? 'Front/Main' : 'Rear/External'})`;
      cameraSelect.appendChild(opt);
    });
  }

  // Camera Switch Listener
  if (cameraSelect) {
    cameraSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        camera.startStream(e.target.value);
      }
    });
  }

  // Front/Back Switcher
  if (btnSwitchFacing) {
    btnSwitchFacing.addEventListener('click', () => {
      const mode = camera.toggleFacingMode();
      btnSwitchFacing.innerHTML = (mode === 'user')
        ? '<i class="fa-solid fa-camera-rotate"></i><span>Selfie</span>'
        : '<i class="fa-solid fa-camera-rotate"></i><span>Rear</span>';
      window.v2Audio.playClick();
    });
  }

  // Resolution selector
  if (resolutionSelect) {
    resolutionSelect.addEventListener('change', (e) => {
      camera.setResolution(e.target.value);
      window.v2Audio.playClick();
    });
  }

  // Mirror Toggle
  if (btnFlipCamera) {
    btnFlipCamera.addEventListener('click', () => {
      const isMirrored = camera.toggleMirror();
      btnFlipCamera.classList.toggle('active', isMirrored);
      window.v2Audio.playClick();
    });
  }

  // Sound Toggle
  if (btnSoundToggle) {
    btnSoundToggle.addEventListener('click', () => {
      const isMuted = window.v2Audio.toggleMute();
      btnSoundToggle.innerHTML = isMuted 
        ? '<i class="fa-solid fa-volume-xmark"></i><span>Muted</span>' 
        : '<i class="fa-solid fa-volume-high"></i><span>Sound</span>';
      btnSoundToggle.classList.toggle('active', !isMuted);
    });
  }

  // Fullscreen Kiosk Mode
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        btnFullscreen.innerHTML = '<i class="fa-solid fa-compress"></i><span>Exit</span>';
      } else {
        document.exitFullscreen().catch(() => {});
        btnFullscreen.innerHTML = '<i class="fa-solid fa-expand"></i><span>Kiosk</span>';
      }
      window.v2Audio.playClick();
    });
  }

  // Tab Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
      window.v2Audio.playClick();
    });
  });

  // Aspect Ratio Preset Buttons
  const aspectBtns = document.querySelectorAll('[data-aspect]');
  aspectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      aspectBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      camera.setAspectRatio(btn.dataset.aspect);
      window.v2Audio.playClick();
    });
  });

  // Countdown Duration Buttons
  const timerBtns = document.querySelectorAll('[data-timer]');
  timerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timerBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.countdownDuration = parseInt(btn.dataset.timer, 10);
      window.v2Audio.playClick();
    });
  });

  // Layout Template Selection Cards
  const templateCards = document.querySelectorAll('.template-card');
  templateCards.forEach(card => {
    card.addEventListener('click', () => {
      templateCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.activeTemplate = card.dataset.template;
      updateStartButtonText();
      window.v2Audio.playClick();
      if (resultModal.classList.contains('open') && state.capturedShots.length > 0) {
        regenerateCompositePreview();
      }
    });
  });

  function updateStartButtonText() {
    const templateDef = window.V2_TEMPLATES[state.activeTemplate];
    const count = templateDef ? templateDef.shotsRequired : 4;
    btnStartSession.innerHTML = `<i class="fa-solid fa-camera"></i> <span>Start Session (${count} ${count > 1 ? 'Photos' : 'Photo'})</span>`;
  }

  // Filter Selection Cards
  const filterItems = document.querySelectorAll('.filter-item');
  filterItems.forEach(item => {
    item.addEventListener('click', () => {
      filterItems.forEach(f => f.classList.remove('selected'));
      item.classList.add('selected');
      state.activeFilter = item.dataset.filter;

      const def = window.V2_FILTERS[state.activeFilter];
      if (def) {
        state.vignette = def.vignette;
        state.filmGrain = def.grain;
        if (filmGrainSlider) {
          filmGrainSlider.value = Math.round(state.filmGrain * 100);
          if (grainValueDisplay) grainValueDisplay.textContent = `${filmGrainSlider.value}%`;
        }
      }

      applyLiveViewfinderFilter();
      window.v2Audio.playClick();

      if (resultModal.classList.contains('open') && state.capturedShots.length > 0) {
        regenerateCompositePreview();
      }
    });
  });

  function applyLiveViewfinderFilter() {
    const css = window.v2FilterEngine.getLiveFilterCss(state.activeFilter, state.filterIntensity);
    videoStream.style.filter = css;
  }

  // Filter Intensity Slider
  if (filterIntensitySlider) {
    filterIntensitySlider.addEventListener('input', (e) => {
      state.filterIntensity = parseFloat(e.target.value) / 100;
      if (intensityValueDisplay) intensityValueDisplay.textContent = `${e.target.value}%`;
      applyLiveViewfinderFilter();
      if (resultModal.classList.contains('open') && state.capturedShots.length > 0) {
        regenerateCompositePreview();
      }
    });
  }

  // Film Grain Slider
  if (filmGrainSlider) {
    filmGrainSlider.addEventListener('input', (e) => {
      state.filmGrain = parseFloat(e.target.value) / 100;
      if (grainValueDisplay) grainValueDisplay.textContent = `${e.target.value}%`;
      if (resultModal.classList.contains('open') && state.capturedShots.length > 0) {
        regenerateCompositePreview();
      }
    });
  }

  // Frame Sliders (Border padding, Photo gap, Corner radius)
  if (borderPaddingSlider) {
    borderPaddingSlider.addEventListener('input', (e) => {
      state.borderPadding = parseInt(e.target.value, 10);
      document.getElementById('paddingValueDisplay').textContent = `${state.borderPadding}px`;
      if (resultModal.classList.contains('open')) regenerateCompositePreview();
    });
  }

  if (photoGapSlider) {
    photoGapSlider.addEventListener('input', (e) => {
      state.photoGap = parseInt(e.target.value, 10);
      document.getElementById('gapValueDisplay').textContent = `${state.photoGap}px`;
      if (resultModal.classList.contains('open')) regenerateCompositePreview();
    });
  }

  if (cornerRadiusSlider) {
    cornerRadiusSlider.addEventListener('input', (e) => {
      state.cornerRadius = parseInt(e.target.value, 10);
      document.getElementById('radiusValueDisplay').textContent = `${state.cornerRadius}px`;
      if (resultModal.classList.contains('open')) regenerateCompositePreview();
    });
  }

  // Color Swatches
  const colorOptions = document.querySelectorAll('.color-option');
  colorOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      colorOptions.forEach(c => c.classList.remove('selected'));
      opt.classList.add('selected');
      state.frameColor = opt.dataset.color;
      window.v2Audio.playClick();
      if (resultModal.classList.contains('open')) regenerateCompositePreview();
    });
  });

  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      state.frameColor = e.target.value;
      colorOptions.forEach(c => c.classList.remove('selected'));
      if (resultModal.classList.contains('open')) regenerateCompositePreview();
    });
  }

  // Typography & Branding Text Inputs
  if (customEventTitle) {
    customEventTitle.addEventListener('input', (e) => {
      state.customTitle = e.target.value.trim() || 'STUDIO PHOTOBOOTH';
      if (resultModal.classList.contains('open')) regenerateCompositePreview();
    });
  }

  if (customSubtitle) {
    customSubtitle.addEventListener('input', (e) => {
      state.customSubtitle = e.target.value.trim();
      if (resultModal.classList.contains('open')) regenerateCompositePreview();
    });
  }

  if (customLocation) {
    customLocation.addEventListener('input', (e) => {
      state.locationText = e.target.value.trim();
      if (resultModal.classList.contains('open')) regenerateCompositePreview();
    });
  }

  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      state.fontFamily = e.target.value;
      if (resultModal.classList.contains('open')) regenerateCompositePreview();
    });
  }

  if (toggleDateStamp) {
    toggleDateStamp.addEventListener('change', (e) => {
      state.showDate = e.target.checked;
      if (resultModal.classList.contains('open')) regenerateCompositePreview();
    });
  }

  // Stickers / Stamps Click-to-Add
  const stickerButtons = document.querySelectorAll('.sticker-chip');
  stickerButtons.forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.sticker;
      if (window.v2Stickers) {
        window.v2Stickers.addSticker(id);
        window.v2Audio.playClick();
        if (resultModal.classList.contains('open')) regenerateCompositePreview();
      }
    });
  });

  const btnClearStickers = document.getElementById('btnClearStickers');
  if (btnClearStickers) {
    btnClearStickers.addEventListener('click', () => {
      if (window.v2Stickers) {
        window.v2Stickers.clearAll();
        window.v2Audio.playClick();
        if (resultModal.classList.contains('open')) regenerateCompositePreview();
      }
    });
  }

  // Shutter & Start Sequence Triggers
  btnShutter.addEventListener('click', startCaptureSequence);
  btnStartSession.addEventListener('click', startCaptureSequence);

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !state.isSessionActive && !resultModal.classList.contains('open')) {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
        e.preventDefault();
        startCaptureSequence();
      }
    } else if (e.code === 'Escape') {
      if (resultModal.classList.contains('open')) closeResultModal();
      if (galleryDrawer.classList.contains('open')) closeGallery();
    } else if (e.code === 'KeyG' && document.activeElement.tagName !== 'INPUT') {
      openGallery();
    }
  });

  /* ==========================================================================
     CAPTURE SEQUENCE ORCHESTRATION
     ========================================================================== */
  async function startCaptureSequence() {
    if (state.isSessionActive) return;
    state.isSessionActive = true;
    state.capturedShots = [];

    // UI state updates
    btnShutter.disabled = true;
    btnStartSession.disabled = true;
    statusDot.classList.add('recording');
    sequenceProgress.classList.add('active');

    const templateDef = window.V2_TEMPLATES[state.activeTemplate];
    const totalShots = templateDef ? templateDef.shotsRequired : 4;

    for (let shotIndex = 0; shotIndex < totalShots; shotIndex++) {
      sequenceText.textContent = `Photo ${shotIndex + 1} of ${totalShots}`;

      // Countdown
      if (state.countdownDuration > 0) {
        await runCountdown(state.countdownDuration, shotIndex, totalShots);
      } else {
        await sleep(400);
      }

      // Flash & Shutter
      triggerFlashAndShutter();

      // Snapshot frame
      const frameCanvas = camera.captureSnapshot();
      state.capturedShots.push(frameCanvas);

      // Buffer pause between shots for pose changing
      if (shotIndex < totalShots - 1) {
        countdownNumber.textContent = 'POSE!';
        countdownLabel.textContent = `Get ready for shot ${shotIndex + 2} of ${totalShots}`;
        countdownOverlay.classList.add('visible');
        await sleep(1400);
        countdownOverlay.classList.remove('visible');
      }
    }

    // Finished sequence
    statusDot.classList.remove('recording');
    sequenceProgress.classList.remove('active');
    btnShutter.disabled = false;
    btnStartSession.disabled = false;
    state.isSessionActive = false;

    window.v2Audio.playSuccess();

    // Render composite preview & open modal
    regenerateCompositePreview();
    openResultModal();

    // Save to local IndexedDB session gallery
    autoSaveSession();
  }

  function runCountdown(seconds, shotIndex, totalShots) {
    return new Promise(resolve => {
      let remaining = seconds;
      countdownOverlay.classList.add('visible');
      countdownLabel.textContent = `Get Ready (${shotIndex + 1}/${totalShots})`;
      countdownNumber.textContent = remaining;

      window.v2Audio.playCountdownTick(remaining === 1);

      const interval = setInterval(() => {
        remaining--;
        if (remaining > 0) {
          countdownNumber.textContent = remaining;
          window.v2Audio.playCountdownTick(remaining === 1);
        } else {
          clearInterval(interval);
          countdownOverlay.classList.remove('visible');
          resolve();
        }
      }, 1000);
    });
  }

  function triggerFlashAndShutter() {
    window.v2Audio.playShutterSound();
    flashLayer.classList.remove('trigger');
    void flashLayer.offsetWidth; // trigger reflow
    flashLayer.classList.add('trigger');
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ==========================================================================
     RESULT PREVIEW & COMPOSITE RENDERING
     ========================================================================== */
  function regenerateCompositePreview() {
    if (state.capturedShots.length === 0) return;

    window.renderV2Composite(compositeCanvas, state.capturedShots, {
      templateId: state.activeTemplate,
      filterId: state.activeFilter,
      filterIntensity: state.filterIntensity,
      filmGrain: state.filmGrain,
      vignette: state.vignette,
      frameColor: state.frameColor,
      borderPadding: state.borderPadding,
      photoGap: state.photoGap,
      cornerRadius: state.cornerRadius,
      fontFamily: state.fontFamily,
      customTitle: state.customTitle,
      customSubtitle: state.customSubtitle,
      locationText: state.locationText,
      showDate: state.showDate
    });
  }

  function openResultModal() {
    resultModal.classList.add('open');
  }

  function closeResultModal() {
    resultModal.classList.remove('open');
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeResultModal);

  // Retake All
  if (btnRetakeAll) {
    btnRetakeAll.addEventListener('click', () => {
      closeResultModal();
      setTimeout(() => {
        startCaptureSequence();
      }, 400);
    });
  }

  /* ==========================================================================
     EXPORT FORMATS: PNG, JPEG, WEBP, GIF, PRINT, SHARE
     ========================================================================== */
  // High-Res PNG
  if (btnDownloadPng) {
    btnDownloadPng.addEventListener('click', () => {
      downloadCanvasImage('image/png', `photobooth-v2-${state.activeTemplate}-${Date.now()}.png`);
      window.v2Audio.playClick();
    });
  }

  // Quality JPEG
  if (btnDownloadJpg) {
    btnDownloadJpg.addEventListener('click', () => {
      const quality = parseFloat(document.getElementById('jpgQualitySelect')?.value || '0.92');
      downloadCanvasImage('image/jpeg', `photobooth-v2-${state.activeTemplate}-${Date.now()}.jpg`, quality);
      window.v2Audio.playClick();
    });
  }

  // Modern WebP
  if (btnDownloadWebp) {
    btnDownloadWebp.addEventListener('click', () => {
      downloadCanvasImage('image/webp', `photobooth-v2-${state.activeTemplate}-${Date.now()}.webp`, 0.95);
      window.v2Audio.playClick();
    });
  }

  // Direct Print
  if (btnPrintPhoto) {
    btnPrintPhoto.addEventListener('click', () => {
      window.print();
    });
  }

  // Native Mobile Share
  if (btnShareMobile) {
    btnShareMobile.addEventListener('click', async () => {
      if (!navigator.share || !compositeCanvas.toBlob) {
        alert('Web Share is not supported in this browser. Downloading PNG instead!');
        btnDownloadPng.click();
        return;
      }

      compositeCanvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `photobooth-${Date.now()}.png`, { type: 'image/png' });
        try {
          await navigator.share({
            title: state.customTitle,
            text: `${state.customTitle} • Photobooth Studio Pro`,
            files: [file]
          });
        } catch (err) {
          if (err.name !== 'AbortError') console.warn('Share error', err);
        }
      }, 'image/png');
    });
  }

  // Copy Image to Clipboard
  if (btnCopyClipboard) {
    btnCopyClipboard.addEventListener('click', async () => {
      if (!navigator.clipboard || !window.ClipboardItem) {
        alert('Clipboard image copy not supported in this browser context.');
        return;
      }

      try {
        compositeCanvas.toBlob(async (blob) => {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          const origText = btnCopyClipboard.innerHTML;
          btnCopyClipboard.innerHTML = '<i class="fa-solid fa-check"></i><span>Copied!</span>';
          setTimeout(() => { btnCopyClipboard.innerHTML = origText; }, 2000);
        }, 'image/png');
      } catch (err) {
        console.warn('Clipboard write error', err);
        alert('Could not copy image to clipboard.');
      }
    });
  }

  // Animated GIF / Boomerang Loop
  if (btnDownloadGif) {
    btnDownloadGif.addEventListener('click', () => {
      generateAndDownloadGif();
    });
  }

  function downloadCanvasImage(mimeType, filename, quality = 1.0) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = compositeCanvas.toDataURL(mimeType, quality);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Generates a lightweight looping animated GIF / video sequence
   */
  async function generateAndDownloadGif() {
    if (state.capturedShots.length < 2) {
      alert('Need at least 2 shots for an animated loop.');
      return;
    }

    const btn = btnDownloadGif;
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Generating...</span>';
    btn.disabled = true;

    try {
      // Create offscreen recorder canvas
      const animCanvas = document.createElement('canvas');
      animCanvas.width = 640;
      animCanvas.height = 480;
      const ctx = animCanvas.getContext('2d');

      const stream = animCanvas.captureStream(10);
      let recorder = null;
      let recordedChunks = [];

      try {
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: recorder.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photobooth-loop-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        btn.innerHTML = origHTML;
        btn.disabled = false;
      };

      recorder.start();

      // Play 2 cycles of all shots like a boomerang
      const frames = [...state.capturedShots, ...state.capturedShots.slice().reverse()];
      for (let cycle = 0; cycle < 2; cycle++) {
        for (const frame of frames) {
          ctx.drawImage(frame, 0, 0, animCanvas.width, animCanvas.height);
          await sleep(350);
        }
      }

      recorder.stop();
    } catch (err) {
      console.warn('Loop creation failed', err);
      btn.innerHTML = origHTML;
      btn.disabled = false;
    }
  }

  /* ==========================================================================
     GALLERY & SESSION STORAGE
     ========================================================================== */
  async function autoSaveSession() {
    if (!window.v2Gallery || state.capturedShots.length === 0) return;

    // Generate low-res thumbnail
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 180;
    thumbCanvas.height = Math.round(180 * (compositeCanvas.height / compositeCanvas.width));
    const tCtx = thumbCanvas.getContext('2d');
    tCtx.drawImage(compositeCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

    await window.v2Gallery.saveSession({
      templateId: state.activeTemplate,
      filterId: state.activeFilter,
      frameColor: state.frameColor,
      customTitle: state.customTitle,
      thumbnail: thumbCanvas.toDataURL('image/jpeg', 0.7),
      compositeData: compositeCanvas.toDataURL('image/jpeg', 0.9)
    });
  }

  async function openGallery() {
    if (!galleryDrawer) return;
    galleryDrawer.classList.add('open');
    await loadGalleryItems();
    window.v2Audio.playClick();
  }

  function closeGallery() {
    if (!galleryDrawer) return;
    galleryDrawer.classList.remove('open');
  }

  if (btnGalleryToggle) btnGalleryToggle.addEventListener('click', openGallery);
  if (btnCloseGallery) btnCloseGallery.addEventListener('click', closeGallery);

  async function loadGalleryItems() {
    if (!galleryGrid || !window.v2Gallery) return;
    galleryGrid.innerHTML = '<div class="gallery-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading previous sessions...</div>';

    const sessions = await window.v2Gallery.getAllSessions();
    if (sessions.length === 0) {
      galleryGrid.innerHTML = `
        <div class="gallery-empty">
          <i class="fa-regular fa-images" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--text-muted);"></i>
          <p>No saved photo sessions yet.</p>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Take some photos to build your studio archive!</span>
        </div>`;
      return;
    }

    galleryGrid.innerHTML = '';
    sessions.forEach(sess => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        <div class="gallery-card-thumb">
          <img src="${sess.thumbnail}" alt="${sess.customTitle}">
        </div>
        <div class="gallery-card-meta">
          <div class="gallery-card-title">${sess.customTitle}</div>
          <div class="gallery-card-date">${sess.dateString}</div>
        </div>
        <div class="gallery-card-actions">
          <button class="btn-gallery-action btn-view" title="Open full print"><i class="fa-solid fa-expand"></i></button>
          <button class="btn-gallery-action btn-del" title="Delete session"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      `;

      card.querySelector('.btn-view').addEventListener('click', () => {
        const img = new Image();
        img.onload = () => {
          compositeCanvas.width = img.width;
          compositeCanvas.height = img.height;
          compositeCanvas.getContext('2d').drawImage(img, 0, 0);
          closeGallery();
          openResultModal();
        };
        img.src = sess.compositeData;
      });

      card.querySelector('.btn-del').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this saved session from history?')) {
          await window.v2Gallery.deleteSession(sess.id);
          loadGalleryItems();
        }
      });

      galleryGrid.appendChild(card);
    });
  }

  if (btnClearGallery) {
    btnClearGallery.addEventListener('click', async () => {
      if (confirm('Clear entire studio capture history? This cannot be undone.')) {
        await window.v2Gallery.clearAll();
        loadGalleryItems();
      }
    });
  }

  // Initial UI state setup
  updateStartButtonText();
  applyLiveViewfinderFilter();
});
