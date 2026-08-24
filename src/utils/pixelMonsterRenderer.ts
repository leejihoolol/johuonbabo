import { Monster } from '../types';

export function drawPixelMonster(
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  width: number,
  height: number,
  frame: number,
  isHit: boolean
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2 + 10;
  const pixelSize = Math.max(3, Math.floor(Math.min(width, height) / 36));

  const drawPx = (gx: number, gy: number, color: string) => {
    ctx.fillStyle = isHit ? '#ffffff' : color;
    ctx.fillRect(cx + gx * pixelSize, cy + gy * pixelSize, pixelSize, pixelSize);
  };

  const c = monster.color;
  const outline = '#0a0a0a';
  const eyeColor = monster.isBoss ? '#ef4444' : '#ffffff';

  // 1. SLIME
  if (monster.spriteType === 'slime') {
    const squish = Math.sin(frame * 0.1) * 2;
    const bodyW = 6 + (monster.isBoss ? 2 : 0);
    const bodyH = 5 + (monster.isBoss ? 2 : 0);

    for (let y = -bodyH; y <= 2; y++) {
      const rowW = y === -bodyH ? bodyW - 3 : (y >= 1 ? bodyW + 1 : bodyW);
      for (let x = -rowW; x <= rowW; x++) {
        if (Math.abs(x) === rowW || y === -bodyH || y === 2) {
          drawPx(x, y + squish, outline);
        } else {
          // Inner body with highlight on top
          drawPx(x, y + squish, y < -2 ? '#ffffff' : c);
        }
      }
    }
    // Eyes
    drawPx(-2, -1 + squish, eyeColor);
    drawPx(-2, 0 + squish, outline);
    drawPx(2, -1 + squish, eyeColor);
    drawPx(2, 0 + squish, outline);

    // Crown if Boss
    if (monster.isBoss) {
      const cyPos = -bodyH - 3 + squish;
      drawPx(-2, cyPos, '#fbbf24');
      drawPx(0, cyPos - 1, '#fbbf24');
      drawPx(2, cyPos, '#fbbf24');
      drawPx(-1, cyPos + 1, '#f59e0b');
      drawPx(0, cyPos + 1, '#ef4444');
      drawPx(1, cyPos + 1, '#f59e0b');
    }
  }

  // 2. GOBLIN / ORC
  else if (monster.spriteType === 'goblin' || monster.spriteType === 'orc') {
    const bob = Math.sin(frame * 0.08) * 1.5;
    const isOrc = monster.spriteType === 'orc';
    const skin = c;
    const armor = isOrc ? '#7f1d1d' : '#854d0e';

    // Head
    for (let y = -9; y <= -4; y++) {
      for (let x = -4; x <= 4; x++) {
        if (Math.abs(x) === 4 || y === -9 || y === -4) drawPx(x, y + bob, outline);
        else drawPx(x, y + bob, skin);
      }
    }
    // Ears
    drawPx(-5, -6 + bob, skin);
    drawPx(-6, -7 + bob, skin);
    drawPx(5, -6 + bob, skin);
    drawPx(6, -7 + bob, skin);

    // Eyes
    drawPx(-2, -6 + bob, '#facc15');
    drawPx(2, -6 + bob, '#facc15');

    // Body
    for (let y = -3; y <= 4; y++) {
      for (let x = -5; x <= 5; x++) {
        if (Math.abs(x) === 5 || y === 4) drawPx(x, y + bob, outline);
        else drawPx(x, y + bob, armor);
      }
    }
    // Weapon in hand
    const weaponColor = isOrc ? '#dc2626' : '#94a3b8';
    drawPx(6, -2 + bob, weaponColor);
    drawPx(7, -3 + bob, weaponColor);
    drawPx(8, -4 + bob, weaponColor);
    drawPx(9, -5 + bob, weaponColor);
  }

  // 3. SKELETON
  else if (monster.spriteType === 'skeleton') {
    const float = Math.sin(frame * 0.07) * 2;
    // Skull
    for (let y = -10; y <= -5; y++) {
      for (let x = -4; x <= 4; x++) {
        if (Math.abs(x) === 4 || y === -10 || y === -5) drawPx(x, y + float, outline);
        else drawPx(x, y + float, '#f8fafc');
      }
    }
    // Eye sockets (glowing)
    drawPx(-2, -7 + float, '#06b6d4');
    drawPx(2, -7 + float, '#06b6d4');

    // Ribs
    for (let y = -4; y <= 3; y++) {
      drawPx(0, y + float, '#cbd5e1');
      if (y % 2 === 0) {
        drawPx(-2, y + float, '#e2e8f0');
        drawPx(-3, y + float, '#e2e8f0');
        drawPx(2, y + float, '#e2e8f0');
        drawPx(3, y + float, '#e2e8f0');
      }
    }
  }

  // 4. GOLEM
  else if (monster.spriteType === 'golem') {
    const breath = Math.sin(frame * 0.05) * 1.5;
    // Massive Rocky Head & Shoulders
    for (let y = -11; y <= -5; y++) {
      for (let x = -5; x <= 5; x++) {
        if (Math.abs(x) === 5 || y === -11 || y === -5) drawPx(x, y + breath, outline);
        else drawPx(x, y + breath, c);
      }
    }
    // Glowing Core / Eyes
    drawPx(-2, -8 + breath, '#38bdf8');
    drawPx(2, -8 + breath, '#38bdf8');
    drawPx(0, 0 + breath, '#38bdf8');
    drawPx(-1, 0 + breath, '#0284c7');
    drawPx(1, 0 + breath, '#0284c7');

    // Heavy Torso
    for (let y = -4; y <= 5; y++) {
      for (let x = -8; x <= 8; x++) {
        if (Math.abs(x) === 8 || y === 5) drawPx(x, y + breath, outline);
        else drawPx(x, y + breath, (x + y) % 3 === 0 ? '#334155' : c);
      }
    }
  }

  // 5. DRAGON / WYRM / DEMON / VOID GOD
  else {
    const float = Math.sin(frame * 0.08) * 3;
    const wingFlap = Math.sin(frame * 0.15) * 3;

    // Wings
    for (let wy = -10; wy <= 2; wy++) {
      const wSpan = 14 - Math.abs(wy);
      drawPx(-wSpan - wingFlap, wy + float, c);
      drawPx(wSpan + wingFlap, wy + float, c);
    }

    // Body
    for (let y = -9; y <= 6; y++) {
      for (let x = -6; x <= 6; x++) {
        if (Math.abs(x) === 6 || y === -9 || y === 6) drawPx(x, y + float, outline);
        else drawPx(x, y + float, y < 0 ? c : '#171717');
      }
    }

    // Horns
    drawPx(-5, -11 + float, '#fbbf24');
    drawPx(-6, -13 + float, '#fbbf24');
    drawPx(5, -11 + float, '#fbbf24');
    drawPx(6, -13 + float, '#fbbf24');

    // Glowing menacing eyes
    drawPx(-3, -6 + float, '#ef4444');
    drawPx(-2, -6 + float, '#fbbf24');
    drawPx(3, -6 + float, '#ef4444');
    drawPx(2, -6 + float, '#fbbf24');

    // Dark / Holy Aura Particles for Mythic bosses
    for (let p = 0; p < 8; p++) {
      const pAngle = frame * 0.04 + (p * Math.PI) / 4;
      const px = Math.cos(pAngle) * 20;
      const py = Math.sin(pAngle) * 12;
      drawPx(Math.floor(px), Math.floor(py + float), '#e11d48');
    }
  }

  ctx.restore();
}
