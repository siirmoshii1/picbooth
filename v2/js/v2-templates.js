/**
 * Photobooth Studio Pro (V2) - Template Layout & Compositing Engine
 * High-resolution 300-DPI renderers for 8 print formats, customizable frames, typography & stickers.
 */

const V2_TEMPLATES = {
  'strip-4': {
    id: 'strip-4',
    name: 'Classic 4-Strip (2×6")',
    shotsRequired: 4,
    category: 'Strips',
    desc: 'Timeless arcade photobooth vertical strip',
    render: renderStrip4
  },
  'double-strip-4': {
    id: 'double-strip-4',
    name: 'Duplicate 2-in-1 Strip (4×6")',
    shotsRequired: 4,
    category: 'Prints',
    desc: 'Side-by-side twin 2×6 strips with cut line for 4×6 photo printers',
    render: renderDoubleStrip4
  },
  'strip-3': {
    id: 'strip-3',
    name: 'Classic 3-Strip (2×6")',
    shotsRequired: 3,
    category: 'Strips',
    desc: 'Sleek vertical 3-shot strip with generous bottom branding space',
    render: renderStrip3
  },
  'grid-2x2': {
    id: 'grid-2x2',
    name: 'Studio Quad 2×2 (4×6")',
    shotsRequired: 4,
    category: 'Grid',
    desc: 'Bold 4-photo square grid ideal for groups, parties and reunions',
    render: renderGrid2x2
  },
  'grid-2x3': {
    id: 'grid-2x3',
    name: 'Storybook 6-Grid (4×6")',
    shotsRequired: 6,
    category: 'Grid',
    desc: 'Mini photoshoot 6-shot storybook layout with footer header',
    render: renderGrid2x3
  },
  'polaroid': {
    id: 'polaroid',
    name: 'Vintage Polaroid Card',
    shotsRequired: 1,
    category: 'Instant',
    desc: 'Classic instant camera frame with large handwritten note space',
    render: renderPolaroid
  },
  'wide-duo': {
    id: 'wide-duo',
    name: 'Panoramic Duo (6×4")',
    shotsRequired: 2,
    category: 'Landscape',
    desc: 'Horizontal dual-shot cinematic banner',
    render: renderWideDuo
  },
  'film-35mm': {
    id: 'film-35mm',
    name: '35mm Film Roll Negative',
    shotsRequired: 4,
    category: 'Film',
    desc: 'Authentic 35mm film strip with sprocket holes and frame numbers',
    render: renderFilm35mm
  }
};

/**
 * Main Master Compositing Routine
 */
function renderV2Composite(targetCanvas, rawCanvases, options = {}) {
  const {
    templateId = 'strip-4',
    filterId = 'normal',
    filterIntensity = 1.0,
    filmGrain = null,
    vignette = null,
    frameColor = '#111116',
    borderPadding = 36,
    photoGap = 20,
    cornerRadius = 8,
    fontFamily = 'Playfair Display',
    customTitle = 'STUDIO PHOTOBOOTH',
    customSubtitle = 'PRO EDITION • NOIR & SILVER',
    locationText = '',
    showDate = true,
    customDate = ''
  } = options;

  const template = V2_TEMPLATES[templateId] || V2_TEMPLATES['strip-4'];

  // Apply selected filter to each captured shot
  const filteredCanvases = rawCanvases.map(src => {
    return window.v2FilterEngine.applyFilter(src, filterId, filterIntensity, filmGrain, vignette);
  });

  const dateFormatted = customDate || new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Delegate to specific template renderer
  template.render(targetCanvas, filteredCanvases, {
    frameColor,
    borderPadding: Math.max(12, borderPadding),
    photoGap: Math.max(6, photoGap),
    cornerRadius: Math.max(0, cornerRadius),
    fontFamily,
    customTitle,
    customSubtitle,
    locationText,
    showDate,
    dateFormatted
  });

  // Render overlay stickers if sticker manager is present
  if (window.v2Stickers) {
    const ctx = targetCanvas.getContext('2d');
    window.v2Stickers.renderStickers(ctx, targetCanvas.width, targetCanvas.height);
  }
}

/**
 * Utility: Calculate contrast text and subtext colors based on frame hex
 */
function getThemeColors(hexColor) {
  const cleanHex = hexColor.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  }
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const isLight = brightness > 150;

  return {
    isLight,
    text: isLight ? '#111116' : '#ffffff',
    subtext: isLight ? '#555566' : '#9999aa',
    accent: isLight ? '#b45309' : '#eab308',
    divider: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)',
    photoBorder: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'
  };
}

/**
 * Utility: Draw rounded rectangle path
 */
function roundedRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Utility: Draw cropped and rounded image
 */
function drawRoundedImage(ctx, img, x, y, width, height, radius, borderColor) {
  if (!img) return;
  ctx.save();
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.clip();

  // Cover-crop the source into target slot
  const srcRatio = img.width / img.height;
  const targetRatio = width / height;
  let sW = img.width, sH = img.height, sX = 0, sY = 0;

  if (srcRatio > targetRatio) {
    sW = img.height * targetRatio;
    sX = (img.width - sW) / 2;
  } else {
    sH = img.width / targetRatio;
    sY = (img.height - sH) / 2;
  }

  ctx.drawImage(img, sX, sY, sW, sH, x, y, width, height);

  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

/* ==========================================================================
   1. CLASSIC 4-STRIP (2x6" Vertical)
   ========================================================================== */
function renderStrip4(canvas, photos, opts) {
  const width = 800;
  const height = 2400;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const colors = getThemeColors(opts.frameColor);

  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  const pad = opts.borderPadding;
  const gap = opts.photoGap;
  const photoW = width - (pad * 2);
  const bottomFooterH = 250;
  const availableH = height - (pad * 2) - bottomFooterH - (gap * 3);
  const photoH = availableH / 4;

  let currentY = pad;
  for (let i = 0; i < 4; i++) {
    const photo = photos[i] || photos[0];
    drawRoundedImage(ctx, photo, pad, currentY, photoW, photoH, opts.cornerRadius, colors.photoBorder);
    currentY += photoH + gap;
  }

  // Footer Branding
  renderFooterBranding(ctx, width / 2, height - (bottomFooterH / 2) - 10, opts, colors);
}

/* ==========================================================================
   2. DUPLICATE 2-IN-1 STRIP (4x6" Print Cut Format)
   ========================================================================== */
function renderDoubleStrip4(canvas, photos, opts) {
  const width = 1600;
  const height = 2400;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const colors = getThemeColors(opts.frameColor);

  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  // Render Left Strip (0 to 800)
  const stripCanvas = document.createElement('canvas');
  renderStrip4(stripCanvas, photos, opts);

  ctx.drawImage(stripCanvas, 0, 0);
  ctx.drawImage(stripCanvas, 800, 0);

  // Center dotted cut-line guide for dye-sub printers
  ctx.save();
  ctx.strokeStyle = colors.divider;
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(800, 40);
  ctx.lineTo(800, height - 40);
  ctx.stroke();

  // Little scissors cut icon hint in center
  ctx.fillStyle = colors.subtext;
  ctx.font = '16px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✂ CUT HERE ✂', 800, 30);
  ctx.restore();
}

/* ==========================================================================
   3. CLASSIC 3-STRIP (2x6" Vertical)
   ========================================================================== */
function renderStrip3(canvas, photos, opts) {
  const width = 800;
  const height = 2200;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const colors = getThemeColors(opts.frameColor);

  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  const pad = opts.borderPadding;
  const gap = opts.photoGap;
  const photoW = width - (pad * 2);
  const bottomFooterH = 280;
  const availableH = height - (pad * 2) - bottomFooterH - (gap * 2);
  const photoH = availableH / 3;

  let currentY = pad;
  for (let i = 0; i < 3; i++) {
    const photo = photos[i] || photos[0];
    drawRoundedImage(ctx, photo, pad, currentY, photoW, photoH, opts.cornerRadius, colors.photoBorder);
    currentY += photoH + gap;
  }

  renderFooterBranding(ctx, width / 2, height - (bottomFooterH / 2) - 15, opts, colors);
}

/* ==========================================================================
   4. STUDIO QUAD 2x2 GRID (4x6" Format)
   ========================================================================== */
function renderGrid2x2(canvas, photos, opts) {
  const width = 1600;
  const height = 2400;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const colors = getThemeColors(opts.frameColor);

  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  const pad = opts.borderPadding * 1.3;
  const gap = opts.photoGap * 1.2;
  const bottomFooterH = 260;

  const photoW = (width - (pad * 2) - gap) / 2;
  const availableH = height - (pad * 2) - bottomFooterH - gap;
  const photoH = availableH / 2;

  const positions = [
    { x: pad, y: pad },
    { x: pad + photoW + gap, y: pad },
    { x: pad, y: pad + photoH + gap },
    { x: pad + photoW + gap, y: pad + photoH + gap }
  ];

  for (let i = 0; i < 4; i++) {
    const photo = photos[i] || photos[0];
    const pos = positions[i];
    drawRoundedImage(ctx, photo, pos.x, pos.y, photoW, photoH, opts.cornerRadius, colors.photoBorder);
  }

  renderFooterBranding(ctx, width / 2, height - (bottomFooterH / 2), opts, colors, true);
}

/* ==========================================================================
   5. STORYBOOK 6-GRID 2x3 (4x6" Format)
   ========================================================================== */
function renderGrid2x3(canvas, photos, opts) {
  const width = 1600;
  const height = 2400;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const colors = getThemeColors(opts.frameColor);

  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  const pad = opts.borderPadding * 1.2;
  const gap = opts.photoGap;
  const bottomFooterH = 240;

  const photoW = (width - (pad * 2) - gap) / 2;
  const availableH = height - (pad * 2) - bottomFooterH - (gap * 2);
  const photoH = availableH / 3;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const idx = (row * 2) + col;
      const photo = photos[idx] || photos[0];
      const posX = pad + col * (photoW + gap);
      const posY = pad + row * (photoH + gap);
      drawRoundedImage(ctx, photo, posX, posY, photoW, photoH, opts.cornerRadius, colors.photoBorder);
    }
  }

  renderFooterBranding(ctx, width / 2, height - (bottomFooterH / 2) - 10, opts, colors, true);
}

/* ==========================================================================
   6. VINTAGE POLAROID CARD (3.5x4.25")
   ========================================================================== */
function renderPolaroid(canvas, photos, opts) {
  const width = 1400;
  const height = 1750;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const colors = getThemeColors(opts.frameColor);

  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  const padX = 90;
  const padTop = 90;
  const photoW = width - (padX * 2);
  const photoH = photoW * 1.05; // classic square-ish photo area

  const photo = photos[0];
  drawRoundedImage(ctx, photo, padX, padTop, photoW, photoH, 4, colors.photoBorder);

  // Handwritten / Classic signature at bottom
  const bottomCenterY = padTop + photoH + ((height - (padTop + photoH)) / 2) - 10;
  renderFooterBranding(ctx, width / 2, bottomCenterY, opts, colors, true);
}

/* ==========================================================================
   7. WIDE PANORAMIC DUO (6x4" Landscape)
   ========================================================================== */
function renderWideDuo(canvas, photos, opts) {
  const width = 2400;
  const height = 1600;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const colors = getThemeColors(opts.frameColor);

  ctx.fillStyle = opts.frameColor;
  ctx.fillRect(0, 0, width, height);

  const pad = opts.borderPadding * 1.5;
  const gap = opts.photoGap * 1.5;
  const bottomFooterH = 200;

  const photoW = (width - (pad * 2) - gap) / 2;
  const photoH = height - (pad * 2) - bottomFooterH;

  const p1 = photos[0];
  const p2 = photos[1] || photos[0];

  drawRoundedImage(ctx, p1, pad, pad, photoW, photoH, opts.cornerRadius, colors.photoBorder);
  drawRoundedImage(ctx, p2, pad + photoW + gap, pad, photoW, photoH, opts.cornerRadius, colors.photoBorder);

  renderFooterBranding(ctx, width / 2, height - (bottomFooterH / 2) - 5, opts, colors, true);
}

/* ==========================================================================
   8. 35MM FILM ROLL NEGATIVE STRIP
   ========================================================================== */
function renderFilm35mm(canvas, photos, opts) {
  const width = 900;
  const height = 2600;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Film base color is always deep obsidian
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, width, height);

  const sprocketMargin = 60;
  const sprocketW = 28;
  const sprocketH = 38;
  const sprocketRadius = 6;
  const sprocketGap = 48;

  // Draw Left & Right Sprocket Holes
  ctx.fillStyle = '#ffffff';
  for (let y = 30; y < height - 30; y += sprocketGap) {
    // Left sprocket
    roundedRectPath(ctx, 22, y, sprocketW, sprocketH, sprocketRadius);
    ctx.fill();

    // Right sprocket
    roundedRectPath(ctx, width - 22 - sprocketW, y, sprocketW, sprocketH, sprocketRadius);
    ctx.fill();
  }

  // Frame Markings (Film Barcode and Frame Numbers)
  ctx.font = '600 14px monospace';
  ctx.fillStyle = '#eab308';
  ctx.textAlign = 'center';

  const photoPad = 85;
  const photoW = width - (photoPad * 2);
  const gap = 40;
  const bottomFooterH = 180;
  const availableH = height - (photoPad * 2) - bottomFooterH - (gap * 3);
  const photoH = availableH / 4;

  let currentY = photoPad;
  for (let i = 0; i < 4; i++) {
    const photo = photos[i] || photos[0];
    drawRoundedImage(ctx, photo, photoPad, currentY, photoW, photoH, 2, 'rgba(255,255,255,0.15)');

    // Film Frame Numbers
    ctx.fillText(`▶ 35MM FILM • FRAME 0${i + 1}A`, width / 2, currentY - 14);
    currentY += photoH + gap;
  }

  const colors = getThemeColors('#0a0a0c');
  renderFooterBranding(ctx, width / 2, height - (bottomFooterH / 2), opts, colors);
}

/* ==========================================================================
   FOOTER BRANDING & TYPOGRAPHY COMPOSITOR
   ========================================================================== */
function renderFooterBranding(ctx, centerX, centerY, opts, colors, isWide = false) {
  ctx.save();
  ctx.textAlign = 'center';

  // 1. Decorative subtle top divider line
  ctx.strokeStyle = colors.divider;
  ctx.lineWidth = 1.5;
  const lineW = isWide ? 340 : 220;
  ctx.beginPath();
  ctx.moveTo(centerX - (lineW / 2), centerY - 65);
  ctx.lineTo(centerX + (lineW / 2), centerY - 65);
  ctx.stroke();

  // 2. Custom Title
  const titleFont = opts.fontFamily || 'Playfair Display';
  ctx.font = `700 38px "${titleFont}", serif`;
  ctx.fillStyle = colors.text;
  ctx.letterSpacing = '3px';
  ctx.fillText(opts.customTitle.toUpperCase(), centerX, centerY - 15);

  // 3. Subtitle / Tagline
  ctx.font = `500 18px "Inter", sans-serif`;
  ctx.fillStyle = colors.subtext;
  ctx.letterSpacing = '2px';
  ctx.fillText(opts.customSubtitle.toUpperCase(), centerX, centerY + 24);

  // 4. Date & Location Stamp
  let stampParts = [];
  if (opts.showDate && opts.dateFormatted) stampParts.push(opts.dateFormatted);
  if (opts.locationText) stampParts.push(opts.locationText);

  if (stampParts.length > 0) {
    ctx.font = `600 15px "Inter", sans-serif`;
    ctx.fillStyle = colors.accent;
    ctx.letterSpacing = '2px';
    ctx.fillText(stampParts.join(' • ').toUpperCase(), centerX, centerY + 58);
  }

  ctx.restore();
}

window.V2_TEMPLATES = V2_TEMPLATES;
window.renderV2Composite = renderV2Composite;
