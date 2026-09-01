import { ElementType, Sword } from '../types';

export function drawPixelSword(
  ctx: CanvasRenderingContext2D,
  sword: Sword,
  width: number,
  height: number,
  elementInfusion: ElementType = 'none',
  frame: number = 0,
  isEnhancing: boolean = false,
  awakeningLevel: number = 0
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  const effectiveAwakening = Math.max(
    awakeningLevel,
    sword.level >= 57 ? 3 : sword.level >= 46 ? 2 : sword.level >= 36 ? 1 : 0
  );

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

  // 🌈 Stage 3 Awakening Rainbow Prismatic Cycling
  if (effectiveAwakening >= 3) {
    const hue = (frame * 2.5) % 360;
    theme.aura = `hsl(${hue}, 100%, 65%)`;
  }

  // Draw Aura & Shimmer if level >= 8 or elemental infused or awakened
  if (theme.aura || sword.level >= 8 || elementInfusion !== 'none' || effectiveAwakening > 0) {
    const auraColor = theme.aura || '#38bdf8';
    ctx.save();
    const auraPulse = Math.sin(frame * 0.08) * 4 + 8;
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = effectiveAwakening >= 3 ? 35 : (effectiveAwakening >= 1 || sword.level >= 20 ? 25 : auraPulse);

    // Draw floating elemental/awakening pixel particles
    const particleCount = effectiveAwakening >= 3 ? 32 : effectiveAwakening >= 2 ? 24 : Math.min(18, 4 + Math.floor(sword.level / 3));
    for (let i = 0; i < particleCount; i++) {
      const pAngle = (frame * 0.03 + (i * Math.PI * 2) / particleCount);
      const pDist = (effectiveAwakening >= 3 ? 38 : effectiveAwakening >= 2 ? 32 : 28) + Math.sin(frame * 0.05 + i) * 16;
      const px = cx + Math.cos(pAngle) * pDist;
      const py = cy - 20 + Math.sin(pAngle) * (pDist * 1.3);
      const pSize = (i % 2 === 0 ? 2 : 3) * (pixelSize / 3);

      ctx.fillStyle = effectiveAwakening >= 3 ? `hsl(${(frame * 3 + i * 20) % 360}, 100%, 75%)` : (i % 2 === 0 ? auraColor : '#ffffff');
      ctx.fillRect(Math.floor(px), Math.floor(py), pSize, pSize);
    }

    // 🌌 Stage 3 Awakening: Rotating Geometric Cosmic Halo Orbiters
    if (effectiveAwakening >= 3) {
      const ringRadiusX = 52;
      const ringRadiusY = 18;
      const ringTilt = -0.35;
      const ringDots = 20;

      ctx.save();
      ctx.translate(cx, cy - 10);
      ctx.rotate(ringTilt);

      for (let d = 0; d < ringDots; d++) {
        const dotAngle = (frame * 0.04 + (d * Math.PI * 2) / ringDots);
        const rx = Math.cos(dotAngle) * ringRadiusX;
        const ry = Math.sin(dotAngle) * ringRadiusY;
        const alpha = (Math.sin(dotAngle) + 1) / 2 * 0.7 + 0.3;

        ctx.fillStyle = `hsla(${(frame * 2 + d * 18) % 360}, 100%, 70%, ${alpha})`;
        ctx.fillRect(Math.floor(rx), Math.floor(ry), pixelSize, pixelSize);
      }
      ctx.restore();
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
  const outlineColor = effectiveAwakening >= 3 ? '#1e1b4b' : '#0f172a';

  // 1. BLADE STRUCTURE (from -12 to 2 on Y axis)
  const baseBladeLen = 14 + Math.floor(Math.min(35, sword.level) / 2.5);
  const awakeningBonusLen = effectiveAwakening >= 3 ? 8 : effectiveAwakening >= 2 ? 5 : effectiveAwakening >= 1 ? 3 : 0;
  const bladeLength = Math.min(28, baseBladeLen + awakeningBonusLen);
  const bladeWidth = effectiveAwakening >= 2 || sword.level >= 15 ? 3 : (sword.level >= 7 ? 2 : 1);

  // Blade Tip
  drawPx(0, -bladeLength - 2, outlineColor);
  drawPx(0, -bladeLength - 1, effectiveAwakening >= 3 ? '#ffffff' : theme.bladeLight);
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
        if (x === 0 && (effectiveAwakening > 0 || sword.level >= 10) && y % 3 === 0) {
          if (effectiveAwakening >= 3) {
            drawPx(x, y, `hsl(${(frame * 4 + y * 20) % 360}, 100%, 75%)`);
          } else if (effectiveAwakening >= 2) {
            drawPx(x, y, '#fef08a');
          } else if (effectiveAwakening >= 1) {
            drawPx(x, y, '#d946ef');
          } else {
            drawPx(x, y, theme.gem || theme.bladeLight);
          }
        } else {
          drawPx(x, y, isShimmer ? '#ffffff' : theme.blade);
        }
      }
    }
  }

  // 2. CROSSGUARD (-3 to 3 on X axis at Y = 1 to 2)
  const guardSpan = Math.min(8, 3 + Math.floor(sword.level / 8) + (effectiveAwakening >= 2 ? 2 : 0));
  for (let x = -guardSpan; x <= guardSpan; x++) {
    drawPx(x, 1, outlineColor);
    drawPx(x, 2, x === 0 && theme.gem ? theme.gem : (effectiveAwakening >= 2 ? '#fbbf24' : theme.guard));
    drawPx(x, 3, outlineColor);
  }

  // Guard wings detail (🪽 Stage 2 & 3 Majestic Angelic / Celestial Wings)
  if (effectiveAwakening >= 2 || sword.level >= 6) {
    drawPx(-guardSpan - 1, 0, outlineColor);
    drawPx(-guardSpan - 1, 1, effectiveAwakening >= 2 ? '#fef08a' : theme.guard);
    drawPx(-guardSpan - 1, 2, outlineColor);

    drawPx(guardSpan + 1, 0, outlineColor);
    drawPx(guardSpan + 1, 1, effectiveAwakening >= 2 ? '#fef08a' : theme.guard);
    drawPx(guardSpan + 1, 2, outlineColor);

    // Multi-tier wing plumage for Stage 2 & 3
    if (effectiveAwakening >= 2) {
      drawPx(-guardSpan - 2, -1, outlineColor);
      drawPx(-guardSpan - 2, 0, '#ffffff');
      drawPx(-guardSpan - 2, 1, outlineColor);

      drawPx(guardSpan + 2, -1, outlineColor);
      drawPx(guardSpan + 2, 0, '#ffffff');
      drawPx(guardSpan + 2, 1, outlineColor);
    }
  }

  // 3. HILT / HANDLE (Y = 4 to 9)
  const hiltLen = 5 + (sword.level >= 12 ? 2 : 0);
  for (let y = 4; y <= 3 + hiltLen; y++) {
    drawPx(-1, y, outlineColor);
    drawPx(0, y, y % 2 === 0 ? (effectiveAwakening >= 3 ? '#6366f1' : theme.hilt) : outlineColor);
    drawPx(1, y, outlineColor);
  }

  // 4. POMMEL (bottom knob with optional jewel)
  const pommelY = 4 + hiltLen;
  drawPx(-1, pommelY, outlineColor);
  drawPx(0, pommelY, effectiveAwakening >= 3 ? '#38bdf8' : (theme.gem || theme.guard));
  drawPx(1, pommelY, outlineColor);
  drawPx(0, pommelY + 1, outlineColor);

  ctx.restore();
}

