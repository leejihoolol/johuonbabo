import { Monster } from '../types';

export function drawPixelMonster(
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  width: number,
  height: number,
  frame: number,
  isHit: boolean,
  isStunned?: boolean
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
    const squish = Math.sin(frame * 0.04) * 1.5;
    const bodyW = 6 + (monster.isBoss ? 2 : 0);
    const bodyH = 5 + (monster.isBoss ? 2 : 0);

    for (let y = -bodyH; y <= 2; y++) {
      const rowW = y === -bodyH ? bodyW - 3 : (y >= 1 ? bodyW + 1 : bodyW);
      for (let x = -rowW; x <= rowW; x++) {
        if (Math.abs(x) === rowW || y === -bodyH || y === 2) {
          drawPx(x, y + squish, outline);
        } else {
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

  // 2. ELEMENTAL (Flame / Frost / Vortex wisp)
  else if (monster.spriteType === 'elemental') {
    const float = Math.sin(frame * 0.06) * 2.5;
    const pulse = Math.cos(frame * 0.08) * 1.2;

    // Outer Aura Flame
    for (let y = -9; y <= 5; y++) {
      const w = Math.max(1, Math.floor(6 - Math.abs(y + 2) * 0.6 + pulse));
      for (let x = -w; x <= w; x++) {
        if (Math.abs(x) === w || y === -9 || y === 5) {
          drawPx(x, y + float, outline);
        } else {
          const isCore = Math.abs(x) <= 2 && Math.abs(y + 1) <= 2;
          drawPx(x, y + float, isCore ? '#ffffff' : c);
        }
      }
    }
    // Glowing Core
    drawPx(-1, -1 + float, '#fef08a');
    drawPx(1, -1 + float, '#fef08a');

    // Floating Sparks
    for (let s = 0; s < 4; s++) {
      const sAngle = frame * 0.05 + (s * Math.PI) / 2;
      const sx = Math.cos(sAngle) * 9;
      const sy = Math.sin(sAngle) * 7;
      drawPx(Math.floor(sx), Math.floor(sy + float), c);
    }
  }

  // 3. MACHINE / AUTOMATA (Chronos gears)
  else if (monster.spriteType === 'machine') {
    const tick = Math.floor(frame * 0.1) % 2 === 0 ? 0.5 : -0.5;
    // Brass Head & Gear
    for (let y = -10; y <= -4; y++) {
      for (let x = -5; x <= 5; x++) {
        if (Math.abs(x) === 5 || y === -10 || y === -4) drawPx(x, y + tick, outline);
        else drawPx(x, y + tick, '#b45309');
      }
    }
    // Gear Teeth on top
    drawPx(-4, -12 + tick, '#d97706');
    drawPx(0, -12 + tick, '#d97706');
    drawPx(4, -12 + tick, '#d97706');

    // Cyan Sensor Visor
    for (let vx = -3; vx <= 3; vx++) {
      drawPx(vx, -7 + tick, '#06b6d4');
    }

    // Metal Torso & Steam Pipes
    for (let y = -3; y <= 6; y++) {
      for (let x = -6; x <= 6; x++) {
        if (Math.abs(x) === 6 || y === 6) drawPx(x, y + tick, outline);
        else drawPx(x, y + tick, (x + y) % 2 === 0 ? '#78716c' : '#a8a29e');
      }
    }
    // Steam emission
    const steamY = -14 + Math.sin(frame * 0.08) * 2;
    drawPx(5, steamY, '#e2e8f0');
    drawPx(6, steamY - 1, '#cbd5e1');
  }

  // 4. ANGEL / SERAPH (Elysion holy celestial)
  else if (monster.spriteType === 'angel') {
    const float = Math.sin(frame * 0.03) * 2;
    const flap = Math.sin(frame * 0.04) * 2;

    // Golden Halo
    for (let hx = -3; hx <= 3; hx++) {
      drawPx(hx, -13 + float, '#fde047');
    }

    // Holy Wings (Pure White / Gold)
    for (let wy = -8; wy <= 2; wy++) {
      const span = 13 - Math.abs(wy);
      drawPx(-span - flap, wy + float, '#ffffff');
      drawPx(-span + 1 - flap, wy + float, '#fef08a');
      drawPx(span + flap, wy + float, '#ffffff');
      drawPx(span - 1 + flap, wy + float, '#fef08a');
    }

    // Robed Body
    for (let y = -8; y <= 6; y++) {
      const rw = Math.min(5, Math.floor((y + 9) * 0.5));
      for (let x = -rw; x <= rw; x++) {
        if (Math.abs(x) === rw || y === 6) drawPx(x, y + float, outline);
        else drawPx(x, y + float, y < -2 ? '#fef3c7' : '#ffffff');
      }
    }
    // Radiant Eyes
    drawPx(-1, -5 + float, '#0284c7');
    drawPx(1, -5 + float, '#0284c7');
  }

  // 5. TENTACLE ABYSS / ELDRITCH (Abyss Eldritch god)
  else if (monster.spriteType === 'tentacle_abyss') {
    const float = Math.sin(frame * 0.03) * 1.5;
    // Central Dark Orb
    for (let y = -8; y <= 2; y++) {
      for (let x = -6; x <= 6; x++) {
        if (x * x + (y + 3) * (y + 3) <= 25) {
          drawPx(x, y + float, outline);
        }
        if (x * x + (y + 3) * (y + 3) <= 16) {
          drawPx(x, y + float, c);
        }
      }
    }

    // Giant Red Evil Eye
    drawPx(0, -3 + float, '#ef4444');
    drawPx(-1, -3 + float, '#991b1b');
    drawPx(1, -3 + float, '#991b1b');
    drawPx(0, -4 + float, '#fca5a5');

    // Writhing Tentacles
    for (let t = -4; t <= 4; t += 2) {
      const wave = Math.sin(frame * 0.06 + t) * 3;
      for (let ty = 3; ty <= 9; ty++) {
        drawPx(t + Math.floor(wave * (ty / 9)), ty + float, c);
      }
    }
  }

  // 6. CELESTIAL DRAGON / COSMIC GOD
  else if (monster.spriteType === 'celestial_dragon') {
    const float = Math.sin(frame * 0.03) * 2;
    const flap = Math.sin(frame * 0.05) * 2;

    // Cosmic Wings with Stars
    for (let wy = -11; wy <= 3; wy++) {
      const wSpan = 15 - Math.abs(wy);
      drawPx(-wSpan - flap, wy + float, c);
      drawPx(wSpan + flap, wy + float, c);
      if ((wy + frame) % 4 === 0) {
        drawPx(-wSpan + 2 - flap, wy + float, '#ffffff');
        drawPx(wSpan - 2 + flap, wy + float, '#f43f5e');
      }
    }

    // Majestic Dragon Head & Horns
    drawPx(-5, -12 + float, '#fbbf24');
    drawPx(-6, -14 + float, '#fbbf24');
    drawPx(5, -12 + float, '#fbbf24');
    drawPx(6, -14 + float, '#fbbf24');

    for (let y = -9; y <= 6; y++) {
      for (let x = -6; x <= 6; x++) {
        if (Math.abs(x) === 6 || y === -9 || y === 6) drawPx(x, y + float, outline);
        else drawPx(x, y + float, y < 0 ? '#1e1b4b' : c);
      }
    }

    // Starry Eyes
    drawPx(-2, -6 + float, '#38bdf8');
    drawPx(2, -6 + float, '#38bdf8');

    // Galaxy Particle Ring
    for (let p = 0; p < 8; p++) {
      const pAngle = frame * 0.04 + (p * Math.PI) / 4;
      const px = Math.cos(pAngle) * 22;
      const py = Math.sin(pAngle) * 14;
      drawPx(Math.floor(px), Math.floor(py + float), p % 2 === 0 ? '#a855f7' : '#ec4899');
    }
  }

  // 7. GOBLIN / ORC
  else if (monster.spriteType === 'goblin' || monster.spriteType === 'orc') {
    const bob = Math.sin(frame * 0.03) * 1.2;
    const isOrc = monster.spriteType === 'orc';
    const skin = c;
    const armor = isOrc ? '#7f1d1d' : '#854d0e';

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

    for (let y = -3; y <= 4; y++) {
      for (let x = -5; x <= 5; x++) {
        if (Math.abs(x) === 5 || y === 4) drawPx(x, y + bob, outline);
        else drawPx(x, y + bob, armor);
      }
    }
    const weaponColor = isOrc ? '#dc2626' : '#94a3b8';
    drawPx(6, -2 + bob, weaponColor);
    drawPx(7, -3 + bob, weaponColor);
    drawPx(8, -4 + bob, weaponColor);
    drawPx(9, -5 + bob, weaponColor);
  }

  // 8. SKELETON
  else if (monster.spriteType === 'skeleton') {
    const float = Math.sin(frame * 0.03) * 1.5;
    for (let y = -10; y <= -5; y++) {
      for (let x = -4; x <= 4; x++) {
        if (Math.abs(x) === 4 || y === -10 || y === -5) drawPx(x, y + float, outline);
        else drawPx(x, y + float, '#f8fafc');
      }
    }
    drawPx(-2, -7 + float, '#06b6d4');
    drawPx(2, -7 + float, '#06b6d4');

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

  // 9. GOLEM
  else if (monster.spriteType === 'golem') {
    const breath = Math.sin(frame * 0.02) * 1.0;
    for (let y = -11; y <= -5; y++) {
      for (let x = -5; x <= 5; x++) {
        if (Math.abs(x) === 5 || y === -11 || y === -5) drawPx(x, y + breath, outline);
        else drawPx(x, y + breath, c);
      }
    }
    drawPx(-2, -8 + breath, '#38bdf8');
    drawPx(2, -8 + breath, '#38bdf8');
    drawPx(0, 0 + breath, '#38bdf8');

    for (let y = -4; y <= 5; y++) {
      for (let x = -8; x <= 8; x++) {
        if (Math.abs(x) === 8 || y === 5) drawPx(x, y + breath, outline);
        else drawPx(x, y + breath, (x + y) % 3 === 0 ? '#334155' : c);
      }
    }
  }

  // 10. DRAGON / WYRM / DEMON / VOID GOD
  else {
    const float = Math.sin(frame * 0.03) * 1.8;
    const wingFlap = Math.sin(frame * 0.05) * 1.5;

    for (let wy = -10; wy <= 2; wy++) {
      const wSpan = 14 - Math.abs(wy);
      drawPx(-wSpan - wingFlap, wy + float, c);
      drawPx(wSpan + wingFlap, wy + float, c);
    }

    for (let y = -9; y <= 6; y++) {
      for (let x = -6; x <= 6; x++) {
        if (Math.abs(x) === 6 || y === -9 || y === 6) drawPx(x, y + float, outline);
        else drawPx(x, y + float, y < 0 ? c : '#171717');
      }
    }

    drawPx(-5, -11 + float, '#fbbf24');
    drawPx(-6, -13 + float, '#fbbf24');
    drawPx(5, -11 + float, '#fbbf24');
    drawPx(6, -13 + float, '#fbbf24');

    drawPx(-3, -6 + float, '#ef4444');
    drawPx(-2, -6 + float, '#fbbf24');
    drawPx(3, -6 + float, '#ef4444');
    drawPx(2, -6 + float, '#fbbf24');

    for (let p = 0; p < 8; p++) {
      const pAngle = frame * 0.03 + (p * Math.PI) / 4;
      const px = Math.cos(pAngle) * 20;
      const py = Math.sin(pAngle) * 12;
      drawPx(Math.floor(px), Math.floor(py + float), '#e11d48');
    }
  }

  // Stun visual overlay
  if (isStunned) {
    const starCount = 3;
    for (let i = 0; i < starCount; i++) {
      const sAng = frame * 0.1 + (i * Math.PI * 2) / starCount;
      const sx = Math.cos(sAng) * 14;
      const sy = Math.sin(sAng) * 6 - 12;
      drawPx(Math.floor(sx), Math.floor(sy), '#facc15');
      drawPx(Math.floor(sx), Math.floor(sy - 1), '#ffffff');
    }
  }

  ctx.restore();
}
