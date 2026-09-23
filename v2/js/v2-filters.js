/**
 * Photobooth Studio Pro (V2) - Vintage & Classic Filter Engine
 * Live viewfinder shader emulation + pixel-accurate canvas composite rendering with film grain & vignette.
 */

const V2_FILTERS = {
  'normal': {
    id: 'normal',
    name: 'Natural Studio Pro',
    category: 'Studio',
    tagline: 'Clean, crisp modern studio lighting',
    cssFilter: 'contrast(102%) brightness(101%) saturate(102%)',
    vignette: 0.1,
    grain: 0
  },
  'vintage70s': {
    id: 'vintage70s',
    name: 'Vintage 1970s Warmth',
    category: 'Vintage',
    tagline: 'Warm golden hues, faded shadows & retro nostalgic punch',
    cssFilter: 'sepia(38%) saturate(125%) contrast(110%) brightness(103%) hue-rotate(-8deg)',
    vignette: 0.35,
    grain: 0.18
  },
  'sepia20s': {
    id: 'sepia20s',
    name: 'Classic 1920s Sepia',
    category: 'Vintage',
    tagline: 'Deep rich antique sepia tone with aged edge vignette',
    cssFilter: 'sepia(90%) contrast(118%) brightness(92%) saturate(110%)',
    vignette: 0.45,
    grain: 0.22
  },
  'kodachrome': {
    id: 'kodachrome',
    name: 'Kodachrome 35mm',
    category: 'Classic Film',
    tagline: 'Iconic analog color film with saturated reds and deep blacks',
    cssFilter: 'contrast(120%) saturate(135%) brightness(98%) hue-rotate(-4deg)',
    vignette: 0.25,
    grain: 0.15
  },
  'polaroid600': {
    id: 'polaroid600',
    name: 'Polaroid 600 Matte',
    category: 'Vintage',
    tagline: 'Faded milky blacks, cyan highlight shift and instant film charm',
    cssFilter: 'contrast(92%) brightness(108%) saturate(115%) sepia(20%) hue-rotate(5deg)',
    vignette: 0.3,
    grain: 0.2
  },
  'silverGelatin': {
    id: 'silverGelatin',
    name: 'Silver Gelatin B&W',
    category: 'Monochrome',
    tagline: 'Fine art darkroom silver-halide black & white with smooth tonality',
    cssFilter: 'grayscale(100%) contrast(125%) brightness(98%)',
    vignette: 0.28,
    grain: 0.16
  },
  'noir': {
    id: 'noir',
    name: 'Cinema Noir 1940s',
    category: 'Monochrome',
    tagline: 'Dramatic, intense hard-light monochrome with deep shadows',
    cssFilter: 'grayscale(100%) contrast(165%) brightness(88%)',
    vignette: 0.5,
    grain: 0.25
  },
  'camcorder95': {
    id: 'camcorder95',
    name: 'Retro Camcorder 90s',
    category: 'Retro',
    tagline: 'Nostalgic 1990s VHS tape warmth with soft bloom',
    cssFilter: 'saturate(130%) contrast(108%) brightness(105%) hue-rotate(6deg)',
    vignette: 0.2,
    grain: 0.28
  },
  'goldenHour': {
    id: 'goldenHour',
    name: 'Golden Hour Sunset',
    category: 'Color',
    tagline: 'Luminous honey amber tones that make skin tones glow',
    cssFilter: 'sepia(25%) saturate(150%) brightness(105%) hue-rotate(-12deg)',
    vignette: 0.25,
    grain: 0.08
  },
  'pastelDream': {
    id: 'pastelDream',
    name: 'Pastel Soft Dream',
    category: 'Aesthetic',
    tagline: 'Gentle diffusion, airy dreamy highlights and pastel undertones',
    cssFilter: 'contrast(90%) brightness(112%) saturate(92%)',
    vignette: 0.15,
    grain: 0.1
  },
  'moodyEmerald': {
    id: 'moodyEmerald',
    name: 'Moody Cross-Process',
    category: 'Vintage',
    tagline: 'Cross-processed analog slide film with jade and teal shadows',
    cssFilter: 'contrast(125%) saturate(110%) hue-rotate(170deg) brightness(96%)',
    vignette: 0.35,
    grain: 0.2
  }
};

class V2FilterEngine {
  constructor() {
    this.grainPattern = null;
    this.initGrainCache();
  }

  initGrainCache() {
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 256;
    grainCanvas.height = 256;
    const ctx = grainCanvas.getContext('2d');
    const imgData = ctx.createImageData(256, 256);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = Math.floor(Math.random() * 45); // subtle alpha
    }

    ctx.putImageData(imgData, 0, 0);
    this.grainPatternCanvas = grainCanvas;
  }

  /**
   * Applies the selected filter, intensity slider, grain & vignette to a source canvas
   */
  applyFilter(srcCanvas, filterId = 'normal', intensity = 1.0, userGrain = null, userVignette = null) {
    const filter = V2_FILTERS[filterId] || V2_FILTERS.normal;
    const out = document.createElement('canvas');
    out.width = srcCanvas.width;
    out.height = srcCanvas.height;
    const ctx = out.getContext('2d');

    const w = out.width;
    const h = out.height;

    // 1. Draw base image
    ctx.drawImage(srcCanvas, 0, 0);

    // 2. If intensity > 0 and not 'normal', blend the filtered version
    if (filterId !== 'normal' && intensity > 0) {
      const filteredCanvas = document.createElement('canvas');
      filteredCanvas.width = w;
      filteredCanvas.height = h;
      const fCtx = filteredCanvas.getContext('2d');

      fCtx.filter = filter.cssFilter;
      fCtx.drawImage(srcCanvas, 0, 0);
      fCtx.filter = 'none';

      ctx.save();
      ctx.globalAlpha = Math.min(1.0, Math.max(0, intensity));
      ctx.drawImage(filteredCanvas, 0, 0);
      ctx.restore();
    }

    // 3. Vignette calculation
    const vignetteAmount = (userVignette !== null) ? userVignette : filter.vignette;
    if (vignetteAmount > 0.05) {
      this.applyVignette(ctx, w, h, vignetteAmount * intensity);
    }

    // 4. Analog Film Grain calculation
    const grainAmount = (userGrain !== null) ? userGrain : filter.grain;
    if (grainAmount > 0.05) {
      this.applyFilmGrain(ctx, w, h, grainAmount * intensity);
    }

    return out;
  }

  applyVignette(ctx, w, h, amount) {
    ctx.save();
    const radius = Math.max(w, h) * 0.75;
    const gradient = ctx.createRadialGradient(w / 2, h / 2, radius * 0.45, w / 2, h / 2, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, `rgba(0, 0, 0, ${amount * 0.4})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${amount * 0.85})`);

    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  applyFilmGrain(ctx, w, h, amount) {
    if (!this.grainPatternCanvas) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.6, amount);
    ctx.globalCompositeOperation = 'overlay';

    const pattern = ctx.createPattern(this.grainPatternCanvas, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /**
   * Helper to get CSS filter string for live video viewfinder
   */
  getLiveFilterCss(filterId, intensity = 1.0) {
    const filter = V2_FILTERS[filterId] || V2_FILTERS.normal;
    if (filterId === 'normal' || intensity <= 0) return 'none';
    if (intensity >= 0.98) return filter.cssFilter;

    // Scale CSS filters down for partial intensity
    return `${filter.cssFilter} opacity(${0.7 + (intensity * 0.3)})`;
  }
}

window.V2_FILTERS = V2_FILTERS;
window.v2FilterEngine = new V2FilterEngine();
