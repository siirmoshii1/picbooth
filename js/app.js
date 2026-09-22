/**
 * Classic Studio Photobooth - Main Application Logic
 * Orchestrates camera stream, countdown sequencing, touch controls & output rendering.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
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
  const cameraSelect = document.getElementById('cameraSelect');
  const btnFlipCamera = document.getElementById('btnFlipCamera');
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const btnFullscreen = document.getElementById('btnFullscreen');
  
  // Result Modal Elements
  const resultModal = document.getElementById('resultModal');
  const compositeCanvas = document.getElementById('compositeCanvas');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnDownloadPng = document.getElementById('btnDownloadPng');
  const btnDownloadJpg = document.getElementById('btnDownloadJpg');
  const btnPrintPhoto = document.getElementById('btnPrintPhoto');
  const btnRetakeAll = document.getElementById('btnRetakeAll');
  const customEventText = document.getElementById('customEventText');

  // Instantiate Camera
  const camera = new BoothCamera(videoStream);

  // App State
  const state = {
    activeTemplate: 'strip-4',
    activeFilter: 'normal',
    countdownDuration: 3,
    frameColor: '#111116',
    customText: 'STUDIO PHOTOBOOTH',
    capturedShots: [],
    isSessionActive: false
  };

  // Initialize Camera
  camera.init((devices) => {
    populateCameraDropdown(devices);
  });

  function populateCameraDropdown(devices) {
    cameraSelect.innerHTML = '';
    if (devices.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = camera.isMockMode ? 'Simulated Studio Camera' : 'Default Camera';
      cameraSelect.appendChild(opt);
      return;
    }

    devices.forEach((dev, idx) => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.textContent = dev.label || `Camera ${idx + 1}`;
      cameraSelect.appendChild(opt);
    });
  }

  // Camera Select Event
  cameraSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      camera.startStream(e.target.value);
    }
  });

  // Mirror Toggle
  btnFlipCamera.addEventListener('click', () => {
    const isMirrored = camera.toggleMirror();
    btnFlipCamera.classList.toggle('active', isMirrored);
  });

  // Sound Toggle
  btnSoundToggle.addEventListener('click', () => {
    const isMuted = window.boothAudio.toggleMute();
    btnSoundToggle.innerHTML = isMuted 
      ? '<i class="fa-solid fa-volume-xmark"></i>' 
      : '<i class="fa-solid fa-volume-high"></i>';
    btnSoundToggle.classList.toggle('active', !isMuted);
  });

  // Fullscreen Kiosk Mode
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.warn(err));
      btnFullscreen.innerHTML = '<i class="fa-solid fa-compress"></i>';
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
      btnFullscreen.innerHTML = '<i class="fa-solid fa-expand"></i>';
    }
  });

  // Sidebar Tabs Switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // Aspect Ratio Option Buttons
  const aspectBtns = document.querySelectorAll('[data-aspect]');
  aspectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      aspectBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const ratio = btn.dataset.aspect;
      camera.setAspectRatio(ratio);
    });
  });

  // Timer Buttons
  const timerBtns = document.querySelectorAll('[data-timer]');
  timerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timerBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.countdownDuration = parseInt(btn.dataset.timer, 10);
    });
  });

  // Template Selection Cards
  const templateCards = document.querySelectorAll('.template-card');
  templateCards.forEach(card => {
    card.addEventListener('click', () => {
      templateCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.activeTemplate = card.dataset.template;
      updateStartButtonText();
    });
  });

  function updateStartButtonText() {
    const templateDef = window.BOOTH_TEMPLATES[state.activeTemplate];
    const count = templateDef ? templateDef.shotsRequired : 4;
    btnStartSession.innerHTML = `<i class="fa-solid fa-camera"></i> Start Session (${count} ${count > 1 ? 'Photos' : 'Photo'})`;
  }

  // Filter Selection
  const filterItems = document.querySelectorAll('.filter-item');
  filterItems.forEach(item => {
    item.addEventListener('click', () => {
      filterItems.forEach(f => f.classList.remove('selected'));
      item.classList.add('selected');
      state.activeFilter = item.dataset.filter;
      applyLiveViewfinderFilter(state.activeFilter);
      
      // If modal is open, immediately update the rendered composite
      if (resultModal.classList.contains('open') && state.capturedShots.length > 0) {
        regenerateCompositePreview();
      }
    });
  });

  function applyLiveViewfinderFilter(filterId) {
    const filterDef = window.BOOTH_FILTERS[filterId];
    if (filterDef) {
      videoStream.style.filter = filterDef.filterCss;
    }
  }

  // Frame Color Options
  const colorOptions = document.querySelectorAll('.color-option');
  colorOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      colorOptions.forEach(c => c.classList.remove('selected'));
      opt.classList.add('selected');
      state.frameColor = opt.dataset.color;
      if (resultModal.classList.contains('open') && state.capturedShots.length > 0) {
        regenerateCompositePreview();
      }
    });
  });

  // Custom Event Text input
  customEventText.addEventListener('input', (e) => {
    state.customText = e.target.value.trim() || 'STUDIO PHOTOBOOTH';
    if (resultModal.classList.contains('open') && state.capturedShots.length > 0) {
      regenerateCompositePreview();
    }
  });

  // Shutter & Start Triggers
  btnShutter.addEventListener('click', startCaptureSequence);
  btnStartSession.addEventListener('click', startCaptureSequence);

  // Keyboard shortcut: Space to capture, Esc to close modal
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !state.isSessionActive && !resultModal.classList.contains('open')) {
      if (document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        startCaptureSequence();
      }
    } else if (e.code === 'Escape' && resultModal.classList.contains('open')) {
      closeResultModal();
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

    const templateDef = window.BOOTH_TEMPLATES[state.activeTemplate];
    const totalShots = templateDef ? templateDef.shotsRequired : 4;

    for (let shotIndex = 0; shotIndex < totalShots; shotIndex++) {
      sequenceText.textContent = `Photo ${shotIndex + 1} of ${totalShots}`;

      // Run countdown if configured
      if (state.countdownDuration > 0) {
        await runCountdown(state.countdownDuration, shotIndex, totalShots);
      } else {
        // Quick 0.5s pause to compose
        await sleep(500);
      }

      // Capture flash effect and sound
      triggerFlashAndShutter();

      // Grab snapshot frame
      const frameCanvas = camera.captureSnapshot();
      state.capturedShots.push(frameCanvas);

      // Buffer pause between shots for changing poses (if more shots remain)
      if (shotIndex < totalShots - 1) {
        countdownNumber.textContent = 'POSE!';
        countdownLabel.textContent = `Get ready for shot ${shotIndex + 2}`;
        countdownOverlay.classList.add('visible');
        await sleep(1500);
        countdownOverlay.classList.remove('visible');
      }
    }

    // Sequence completed
    statusDot.classList.remove('recording');
    sequenceProgress.classList.remove('active');
    btnShutter.disabled = false;
    btnStartSession.disabled = false;
    state.isSessionActive = false;

    // Render composite and show modal
    regenerateCompositePreview();
    openResultModal();
  }

  function runCountdown(seconds, shotIndex, totalShots) {
    return new Promise(resolve => {
      let remaining = seconds;
      countdownOverlay.classList.add('visible');
      countdownLabel.textContent = `Get Ready (${shotIndex + 1}/${totalShots})`;
      countdownNumber.textContent = remaining;

      window.boothAudio.playCountdownTick(remaining === 1);

      const interval = setInterval(() => {
        remaining--;
        if (remaining > 0) {
          countdownNumber.textContent = remaining;
          window.boothAudio.playCountdownTick(remaining === 1);
        } else {
          clearInterval(interval);
          countdownOverlay.classList.remove('visible');
          resolve();
        }
      }, 1000);
    });
  }

  function triggerFlashAndShutter() {
    // Sound
    window.boothAudio.playShutterSound();

    // Visual Flash Animation
    flashLayer.classList.remove('trigger');
    void flashLayer.offsetWidth; // force reflow
    flashLayer.classList.add('trigger');
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ==========================================================================
     RESULT PREVIEW & COMPOSITE HANDLING
     ========================================================================== */
  function regenerateCompositePreview() {
    window.renderComposite(compositeCanvas, state.capturedShots, {
      templateId: state.activeTemplate,
      filterId: state.activeFilter,
      frameColor: state.frameColor,
      customText: state.customText
    });
  }

  function openResultModal() {
    resultModal.classList.add('open');
  }

  function closeResultModal() {
    resultModal.classList.remove('open');
  }

  btnCloseModal.addEventListener('click', closeResultModal);

  // Retake All
  btnRetakeAll.addEventListener('click', () => {
    closeResultModal();
    setTimeout(() => {
      startCaptureSequence();
    }, 400);
  });

  // Download PNG
  btnDownloadPng.addEventListener('click', () => {
    downloadCanvasImage('image/png', `photobooth-${state.activeTemplate}-${Date.now()}.png`);
  });

  // Download JPEG
  btnDownloadJpg.addEventListener('click', () => {
    downloadCanvasImage('image/jpeg', `photobooth-${state.activeTemplate}-${Date.now()}.jpg`, 0.95);
  });

  function downloadCanvasImage(mimeType, filename, quality = 1.0) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = compositeCanvas.toDataURL(mimeType, quality);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Print Action
  btnPrintPhoto.addEventListener('click', () => {
    window.print();
  });

  // Initial state setup
  updateStartButtonText();
});
