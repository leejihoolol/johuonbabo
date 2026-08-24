import { ElementType, Sword } from '../types';

export function drawPixelSword(
  ctx: CanvasRenderingContext2D,
  sword: Sword,
  width: number,
  height: number,
  elementInfusion: ElementType = 'none',
  frame: number = 0,
  isEnhancing: boolean = false
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const pixelSize = Math.max(3, Math.floor(Math.min(width, height) / 48));

  // Determine blade color override if elemental infused
  const theme = { ...sword.colorTheme };
  if (elementInfusion === 'fire') {
    theme.aura = '#ff4400';
  } else if (elementInfusion === 'ice') {
    theme.aura = '#00f0ff';
  } else if (elementInfusion === 'lightning') {
    theme.aura = '#ffe600';
  } else if (elementInfusion === 'holy') {
    theme.aura = '#ffd700';
  } else if (elementInfusion === 'dark') {
    theme.aura = '#a855f7';
  }

  // Draw Aura & Shimmer if level >= 8 or elemental infused
  if (theme.aura || sword.level >= 8 || elementInfusion !== 'none') {
    const auraColor = theme.aura || '#38bdf8';
    ctx.save();
    const auraPulse = Math.sin(frame * 0.08) * 4 + 8;
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = sword.level >= 20 ? 25 : auraPulse;

    // Draw floating elemental pixel particles
    const particleCount = Math.min(18, 4 + Math.floor(sword.level / 3));
    for (let i = 0; i < particleCount; i++) {
      const pAngle = (frame * 0.03 + (i * Math.PI * 2) / particleCount);
      const pDist = 28 + Math.sin(frame * 0.05 + i) * 16 + (sword.level > 15 ? 12 : 0);
      const px = cx + Math.cos(pAngle) * pDist;
      const py = cy - 20 + Math.sin(pAngle) * (pDist * 1.3);
      const pSize = (i % 2 === 0 ? 2 : 3) * (pixelSize / 3);

      ctx.fillStyle = i % 2 === 0 ? auraColor : '#ffffff';
      ctx.fillRect(Math.floor(px), Math.floor(py), pSize, pSize);
    }
    ctx.restore();
  }

  // Tilt sword diagonally (45 degrees) like classic RPGs
  ctx.translate(cx, cy);
  const floatOffset = Math.sin(frame * 0.03) * 2;
  const shakeOffset = isEnhancing ? (Math.random() * 4 - 2) : 0;
  ctx.translate(shakeOffset, floatOffset + shakeOffset);
  ctx.rotate((-45 * Math.PI) / 180);

  // Helper to draw a pixel block relative to sword center
  const drawPx = (gx: number, gy: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(gx * pixelSize, gy * pixelSize, pixelSize, pixelSize);
  };

  // Outline helper
  const outlineColor = '#0f172a';

  // 1. BLADE STRUCTURE (from -12 to 2 on Y axis)
  const bladeLength = Math.min(22, 14 + Math.floor(sword.level / 2.5));
  const bladeWidth = sword.level >= 15 ? 3 : (sword.level >= 7 ? 2 : 1);

  // Blade Tip
  drawPx(0, -bladeLength - 2, outlineColor);
  drawPx(0, -bladeLength - 1, theme.bladeLight);
  drawPx(-1, -bladeLength - 1, outlineColor);
  drawPx(1, -bladeLength - 1, outlineColor);

  // Blade Body
  for (let y = -bladeLength; y <= 0; y++) {
    // Shimmer effect sweeping down the blade
    const shimmerPos = Math.floor((frame % 60) / 60 * (bladeLength + 4)) - bladeLength;
    const isShimmer = Math.abs(y - shimmerPos) <= 1;

    for (let x = -bladeWidth; x <= bladeWidth; x++) {
      if (x === -bladeWidth || x === bladeWidth) {
        // Edge outline
        drawPx(x, y, outlineColor);
      } else if (x === -bladeWidth + 1) {
        // Highlight side
        drawPx(x, y, isShimmer ? '#ffffff' : theme.bladeLight);
      } else if (x === bladeWidth - 1) {
        // Shadow side
        drawPx(x, y, isShimmer ? theme.bladeLight : theme.bladeDark);
      } else {
        // Center fuller / groove
        if (x === 0 && sword.level >= 10 && y % 3 === 0) {
          drawPx(x, y, theme.gem || theme.bladeLight);
        } else {
          drawPx(x, y, isShimmer ? '#ffffff' : theme.blade);
        }
      }
    }
  }

  // 2. CROSSGUARD (-3 to 3 on X axis at Y = 1 to 2)
  const guardSpan = Math.min(6, 3 + Math.floor(sword.level / 8));
  for (let x = -guardSpan; x <= guardSpan; x++) {
    drawPx(x, 1, outlineColor);
    drawPx(x, 2, x === 0 && theme.gem ? theme.gem : theme.guard);
    drawPx(x, 3, outlineColor);
  }
  // Guard wings detail
  if (sword.level >= 6) {
    drawPx(-guardSpan - 1, 0, outlineColor);
    drawPx(-guardSpan - 1, 1, theme.guard);
    drawPx(-guardSpan - 1, 2, outlineColor);

    drawPx(guardSpan + 1, 0, outlineColor);
    drawPx(guardSpan + 1, 1, theme.guard);
    drawPx(guardSpan + 1, 2, outlineColor);
  }

  // 3. HILT / HANDLE (Y = 4 to 9)
  const hiltLen = 5 + (sword.level >= 12 ? 2 : 0);
  for (let y = 4; y <= 3 + hiltLen; y++) {
    drawPx(-1, y, outlineColor);
    drawPx(0, y, y % 2 === 0 ? theme.hilt : outlineColor);
    drawPx(1, y, outlineColor);
  }

  // 4. POMMEL (bottom knob with optional jewel)
  const pommelY = 4 + hiltLen;
  drawPx(-1, pommelY, outlineColor);
  drawPx(0, pommelY, theme.gem || theme.guard);
  drawPx(1, pommelY, outlineColor);
  drawPx(0, pommelY + 1, outlineColor);

  ctx.restore();
}
