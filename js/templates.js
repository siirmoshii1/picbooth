/**
 * Studio Photobooth Template Engine & Filter Compositor
 * Generates high-resolution composite photos for various group designs & layouts.
 */

const BOOTH_TEMPLATES = {
  'strip-4': {
    id: 'strip-4',
    name: 'Classic 4-Strip',
    shotsRequired: 4,
    description: 'Iconic vertical 4-photo booth strip',
    render: renderStrip4
  },
  'strip-3': {
    id: 'strip-3',
    name: 'Classic 3-Strip',
    shotsRequired: 3,
    description: 'Sleek vertical 3-photo booth strip',
    render: renderStrip3
  },
  'grid-2x2': {
    id: 'grid-2x2',
    name: 'Studio 2×2 Grid',
    shotsRequired: 4,
    description: '4-photo quad grid ideal for friend groups',
    render: renderGrid2x2
  },
  'polaroid': {
    id: 'polaroid',
    name: 'Vintage Polaroid',
    shotsRequired: 1,
    description: 'Classic single card with bottom space',
    render: renderPolaroid
  },
  'wide-duo': {
    id: 'wide-duo',
    name: 'Wide Duo Split',
    shotsRequired: 2,
    description: 'Landscape dual-shot panoramic group banner',
    render: renderWideDuo
  }
};

/**
 * Filter definitions applied to individual photo frames
 */
const BOOTH_FILTERS = {
  'normal': { name: 'Normal Studio', filterCss: 'none' },
  'noir': { name: 'Classic Noir B&W', filterCss: 'grayscale(100%) contrast(125%) brightness(95%)' },
  'sepia': { name: 'Vintage Sepia', filterCss: 'sepia(85%) contrast(110%) brightness(95%)' },
  'velvet': { name: 'Velvet Mono', filterCss: 'grayscale(100%) contrast(150%) brightness(90%)' },
  'warm': { name: 'Warm Sunset', filterCss: 'sepia(35%) saturate(140%) brightness(105%) hue-rotate(-10deg)' },
  'cool': { name: 'Cyber Cool', filterCss: 'saturate(110%) hue-rotate(185deg) contrast(115%)' }
};

/**
 * Renders the chosen template onto the provided output canvas.
 */
function renderComposite(targetCanvas, rawCanvases, options = {}) {
  const {
    templateId = 'strip-4',
    filterId = 'normal',
    frameColor = '#111116',
    customText = 'STUDIO PHOTOBOOTH',
    dateText = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } = options;

  const template = BOOTH_TEMPLATES[templateId] || BOOTH_TEMPLATES['strip-4'];

  // Apply selected filter to copies of captured canvases
  const filteredCanvases = rawCanvases.map(src => applyFilterToCanvas(src, filterId));

  // Delegate rendering to specific layout generator
  template.render(targetCanvas, filteredCanvases, {
    frameColor,
    customText,
    dateText
  });
}

/**
 * Applies a visual filter to a canvas using standard Canvas filter property
 */
function applyFilterToCanvas(srcCanvas, filterId) {
  const out = document.createElement('canvas');
  out.width = srcCanvas.width;
  out.height = srcCanvas.height;
  const ctx = out.getContext('2d');

  const filterDef = BOOTH_FILTERS[filterId] || BOOTH_FILTERS.normal;
  ctx.filter = filterDef.filterCss;
  ctx.drawImage(srcCanvas, 0, 0);
  ctx.filter = 'none';

  return out;
}

/**
 * Helper to determine contrast text color (white or black) based on background hex
 */
function getContrastTextColor(hexColor) {
  if (hexColor === '#ffffff' || hexColor === '#f5f5f0') return '#0a0a0d';
  return '#ffffff';
}

/* ==========================================================================
   LAYOUT RENDERERS
   ========================================================================== */

/**
 * 1. Classic 4-Photo Vertical Strip (Width: 800, Height: 2400)
 */
function renderStrip4(canvas, photos, opts) {
  const width = 800;
  const height = 2400;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background frame
  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  const margin = 40;
  const gap = 30;
  const footerHeight = 180;
  const photoWidth = width - margin * 2;
  const photoHeight = (height - margin * 2 - footerHeight - gap * 3) / 4;

  const textColor = getContrastTextColor(opts.frameColor);

  // Draw 4 photos
  for (let i = 0; i < 4; i++) {
    const y = margin + i * (photoHeight + gap);
    if (photos[i]) {
      drawPhotoCropped(ctx, photos[i], margin, y, photoWidth, photoHeight);
      
      // Subtle inner frame border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(margin, y, photoWidth, photoHeight);
    } else {
      ctx.fillStyle = '#1c1c24';
      ctx.fillRect(margin, y, photoWidth, photoHeight);
    }
  }

  // Draw branding footer
  const footerY = height - footerHeight + 40;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';

  ctx.font = 'bold 30px "Playfair Display", Georgia, serif';
  ctx.fillText(opts.customText.toUpperCase(), width / 2, footerY);

  ctx.font = '500 18px "Inter", sans-serif';
  ctx.fillStyle = textColor === '#ffffff' ? '#a0a0b2' : '#52525b';
  ctx.fillText(opts.dateText, width / 2, footerY + 36);

  // Studio emblem dots
  drawStudioEmblem(ctx, width / 2, footerY + 68, textColor);
}

/**
 * 2. Classic 3-Photo Vertical Strip (Width: 800, Height: 2100)
 */
function renderStrip3(canvas, photos, opts) {
  const width = 800;
  const height = 2100;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  const margin = 44;
  const gap = 32;
  const footerHeight = 190;
  const photoWidth = width - margin * 2;
  const photoHeight = (height - margin * 2 - footerHeight - gap * 2) / 3;

  const textColor = getContrastTextColor(opts.frameColor);

  for (let i = 0; i < 3; i++) {
    const y = margin + i * (photoHeight + gap);
    if (photos[i]) {
      drawPhotoCropped(ctx, photos[i], margin, y, photoWidth, photoHeight);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(margin, y, photoWidth, photoHeight);
    } else {
      ctx.fillStyle = '#1c1c24';
      ctx.fillRect(margin, y, photoWidth, photoHeight);
    }
  }

  const footerY = height - footerHeight + 45;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';

  ctx.font = 'bold 32px "Playfair Display", Georgia, serif';
  ctx.fillText(opts.customText.toUpperCase(), width / 2, footerY);

  ctx.font = '500 18px "Inter", sans-serif';
  ctx.fillStyle = textColor === '#ffffff' ? '#a0a0b2' : '#52525b';
  ctx.fillText(opts.dateText, width / 2, footerY + 38);

  drawStudioEmblem(ctx, width / 2, footerY + 70, textColor);
}

/**
 * 3. Studio 2x2 Quad Grid (Width: 1600, Height: 1800)
 */
function renderGrid2x2(canvas, photos, opts) {
  const width = 1600;
  const height = 1800;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  const margin = 50;
  const gap = 30;
  const footerHeight = 180;

  const photoWidth = (width - margin * 2 - gap) / 2;
  const photoHeight = (height - margin * 2 - footerHeight - gap) / 2;

  const textColor = getContrastTextColor(opts.frameColor);

  const coords = [
    { x: margin, y: margin },
    { x: margin + photoWidth + gap, y: margin },
    { x: margin, y: margin + photoHeight + gap },
    { x: margin + photoWidth + gap, y: margin + photoHeight + gap }
  ];

  coords.forEach((coord, i) => {
    if (photos[i]) {
      drawPhotoCropped(ctx, photos[i], coord.x, coord.y, photoWidth, photoHeight);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(coord.x, coord.y, photoWidth, photoHeight);
    } else {
      ctx.fillStyle = '#1c1c24';
      ctx.fillRect(coord.x, coord.y, photoWidth, photoHeight);
    }
  });

  const footerY = height - footerHeight + 45;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';

  ctx.font = 'bold 36px "Playfair Display", Georgia, serif';
  ctx.fillText(opts.customText.toUpperCase(), width / 2, footerY);

  ctx.font = '500 20px "Inter", sans-serif';
  ctx.fillStyle = textColor === '#ffffff' ? '#a0a0b2' : '#52525b';
  ctx.fillText(opts.dateText, width / 2, footerY + 40);

  drawStudioEmblem(ctx, width / 2, footerY + 75, textColor);
}

/**
 * 4. Vintage Polaroid Card (Width: 1200, Height: 1460)
 */
function renderPolaroid(canvas, photos, opts) {
  const width = 1200;
  const height = 1460;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  const margin = 60;
  const photoWidth = width - margin * 2;
  const photoHeight = 1080;

  const textColor = getContrastTextColor(opts.frameColor);

  if (photos[0]) {
    drawPhotoCropped(ctx, photos[0], margin, margin, photoWidth, photoHeight);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, photoWidth, photoHeight);
  } else {
    ctx.fillStyle = '#1c1c24';
    ctx.fillRect(margin, margin, photoWidth, photoHeight);
  }

  const footerY = margin + photoHeight + 110;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';

  ctx.font = 'italic bold 44px "Playfair Display", Georgia, serif';
  ctx.fillText(opts.customText, width / 2, footerY);

  ctx.font = '500 22px "Inter", sans-serif';
  ctx.fillStyle = textColor === '#ffffff' ? '#a0a0b2' : '#52525b';
  ctx.fillText(opts.dateText, width / 2, footerY + 46);
}

/**
 * 5. Wide Duo Split (Landscape Banner, Width: 1920, Height: 1080)
 */
function renderWideDuo(canvas, photos, opts) {
  const width = 1920;
  const height = 1080;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  const margin = 48;
  const gap = 36;
  const bottomBar = 130;
  const photoWidth = (width - margin * 2 - gap) / 2;
  const photoHeight = height - margin * 2 - bottomBar;

  const textColor = getContrastTextColor(opts.frameColor);

  const coords = [
    { x: margin, y: margin },
    { x: margin + photoWidth + gap, y: margin }
  ];

  coords.forEach((coord, i) => {
    if (photos[i]) {
      drawPhotoCropped(ctx, photos[i], coord.x, coord.y, photoWidth, photoHeight);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(coord.x, coord.y, photoWidth, photoHeight);
    } else {
      ctx.fillStyle = '#1c1c24';
      ctx.fillRect(coord.x, coord.y, photoWidth, photoHeight);
    }
  });

  const footerY = height - bottomBar + 55;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';

  ctx.font = 'bold 36px "Playfair Display", Georgia, serif';
  ctx.fillText(opts.customText.toUpperCase(), width / 2, footerY);

  ctx.font = '500 20px "Inter", sans-serif';
  ctx.fillStyle = textColor === '#ffffff' ? '#a0a0b2' : '#52525b';
  ctx.fillText(opts.dateText, width / 2, footerY + 36);
}

/**
 * Cropping helper: scales and centers image in destination box without distortion
 */
function drawPhotoCropped(ctx, srcCanvas, dx, dy, dWidth, dHeight) {
  const srcRatio = srcCanvas.width / srcCanvas.height;
  const dstRatio = dWidth / dHeight;

  let sx = 0, sy = 0, sWidth = srcCanvas.width, sHeight = srcCanvas.height;

  if (srcRatio > dstRatio) {
    // Source is wider than target
    sWidth = srcCanvas.height * dstRatio;
    sx = (srcCanvas.width - sWidth) / 2;
  } else {
    // Source is taller than target
    sHeight = srcCanvas.width / dstRatio;
    sy = (srcCanvas.height - sHeight) / 2;
  }

  ctx.drawImage(srcCanvas, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

/**
 * Draws minimal three-dot studio emblem
 */
function drawStudioEmblem(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.5;
  [-12, 0, 12].forEach(offset => {
    ctx.beginPath();
    ctx.arc(x + offset, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;
}

window.BOOTH_TEMPLATES = BOOTH_TEMPLATES;
window.BOOTH_FILTERS = BOOTH_FILTERS;
window.renderComposite = renderComposite;
