/**
 * Photobooth Studio Pro (V2) - Sticker & Vintage Stamp Engine
 * Vintage rubber stamps, retro frames, tape overlays, and draggable sticker embellishments.
 */

const V2_STICKER_CATALOG = [
  // Vintage Rubber Stamps
  { id: 'stamp-approved', type: 'stamp', text: 'STUDIO APPROVED', color: '#dc2626', border: 'solid', icon: 'fa-check' },
  { id: 'stamp-original', type: 'stamp', text: 'ORIGINAL 35MM FILM', color: '#ca8a04', border: 'dashed', icon: 'fa-film' },
  { id: 'stamp-noir', type: 'stamp', text: 'NOIR ARCHIVES', color: '#ffffff', border: 'double', icon: 'fa-camera-retro' },
  { id: 'stamp-vip', type: 'stamp', text: '★ VIP ACCESS ★', color: '#eab308', border: 'solid', icon: 'fa-star' },
  { id: 'stamp-memories', type: 'stamp', text: 'TIMELESS MEMORIES', color: '#38bdf8', border: 'solid', icon: 'fa-heart' },

  // Emojis & Graphic Stickers
  { id: 'emoji-sparkles', type: 'emoji', glyph: '✨', name: 'Sparkles' },
  { id: 'emoji-heart', type: 'emoji', glyph: '❤️', name: 'Red Heart' },
  { id: 'emoji-fire', type: 'emoji', glyph: '🔥', name: 'Fire' },
  { id: 'emoji-sunglasses', type: 'emoji', glyph: '😎', name: 'Cool Shades' },
  { id: 'emoji-party', type: 'emoji', glyph: '🎉', name: 'Party Popper' },
  { id: 'emoji-crown', type: 'emoji', glyph: '👑', name: 'Golden Crown' },
  { id: 'emoji-camera', type: 'emoji', glyph: '📸', name: 'Instant Cam' },
  { id: 'emoji-cherry', type: 'emoji', glyph: '🍒', name: 'Cherries' },
  { id: 'emoji-disco', type: 'emoji', glyph: '🪩', name: 'Disco Ball' },
  { id: 'emoji-peace', type: 'emoji', glyph: '✌️', name: 'Peace Sign' },
  { id: 'emoji-butterfly', type: 'emoji', glyph: '🦋', name: 'Butterfly' },
  { id: 'emoji-star', type: 'emoji', glyph: '⭐', name: 'Gold Star' }
];

class V2StickerManager {
  constructor() {
    this.activeStickers = []; // Array of { id, type, x, y, scale, rotation, text, glyph, color, border }
  }

  addSticker(stickerId, x = 0.5, y = 0.5) {
    const item = V2_STICKER_CATALOG.find(s => s.id === stickerId);
    if (!item) return;

    // Slight random offset and rotation for organic sticker booth feel
    const randomRot = (Math.random() * 20 - 10) * (Math.PI / 180);
    const randomOffsetX = (Math.random() * 0.1 - 0.05);
    const randomOffsetY = (Math.random() * 0.1 - 0.05);

    const instance = {
      instanceId: 'stk_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      id: item.id,
      type: item.type,
      name: item.name || item.text,
      glyph: item.glyph,
      text: item.text,
      color: item.color,
      border: item.border,
      x: Math.max(0.1, Math.min(0.9, x + randomOffsetX)),
      y: Math.max(0.1, Math.min(0.9, y + randomOffsetY)),
      scale: 1.0,
      rotation: randomRot
    };

    this.activeStickers.push(instance);
    return instance;
  }

  removeSticker(instanceId) {
    this.activeStickers = this.activeStickers.filter(s => s.instanceId !== instanceId);
  }

  clearAll() {
    this.activeStickers = [];
  }

  /**
   * Renders all active stickers onto the target composite canvas
   */
  renderStickers(ctx, canvasWidth, canvasHeight) {
    if (this.activeStickers.length === 0) return;

    this.activeStickers.forEach(stk => {
      ctx.save();
      const posX = stk.x * canvasWidth;
      const posY = stk.y * canvasHeight;

      ctx.translate(posX, posY);
      ctx.rotate(stk.rotation);
      ctx.scale(stk.scale, stk.scale);

      if (stk.type === 'emoji') {
        ctx.font = '80px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.fillText(stk.glyph, 0, 0);
      } else if (stk.type === 'stamp') {
        // Render vintage rubber ink stamp
        const stampW = 280;
        const stampH = 75;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 10;

        // Stamp border
        ctx.strokeStyle = stk.color;
        ctx.lineWidth = 4;
        if (stk.border === 'dashed') {
          ctx.setLineDash([12, 6]);
        }
        ctx.strokeRect(-stampW / 2, -stampH / 2, stampW, stampH);
        ctx.setLineDash([]);

        // Inner frame line
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-stampW / 2 + 5, -stampH / 2 + 5, stampW - 10, stampH - 10);

        // Text
        ctx.font = 'bold 22px "Cinzel", "Playfair Display", "Impact", monospace';
        ctx.fillStyle = stk.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '3px';
        ctx.fillText(stk.text, 0, 0);
      }

      ctx.restore();
    });
  }
}

window.V2_STICKER_CATALOG = V2_STICKER_CATALOG;
window.v2Stickers = new V2StickerManager();
