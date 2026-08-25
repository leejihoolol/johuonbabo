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
  const pixelSize = Math.max(3, Math.floor(Math.min(width, height) / 34));

  const drawPx = (gx: number, gy: number, color: string, alpha: number = 1) => {
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.fillStyle = isHit ? '#ffffff' : color;
    ctx.fillRect(Math.floor(cx + gx * pixelSize), Math.floor(cy + gy * pixelSize), pixelSize, pixelSize);
    ctx.restore();
  };

  const c = monster.color || '#3b82f6';
  const outline = '#0a0a0a';
  const highlight = '#ffffff';

  // 1. SLIME (슬라임 & 황금 모루 슬라임 킹)
  if (monster.spriteType === 'slime') {
    const squish = Math.sin(frame * 0.06) * 1.8;
    const bodyW = 7 + (monster.isBoss ? 3 : 0);
    const bodyH = 6 + (monster.isBoss ? 3 : 0);

    // Inner Jelly Glow Base
    for (let y = -bodyH; y <= 3; y++) {
      const progress = (y + bodyH) / (bodyH + 3);
      const rowW = Math.floor(Math.sin(progress * Math.PI) * bodyW + (y >= 1 ? 1 : 0));
      for (let x = -rowW; x <= rowW; x++) {
        const isBorder = Math.abs(x) === rowW || y === -bodyH || y === 3;
        if (isBorder) {
          drawPx(x, y + squish, outline);
        } else {
          // Jelly Transparency Gradient Layering
          if (y < -bodyH + 2 && x > -rowW + 1 && x < 0) {
            drawPx(x, y + squish, '#ffffff'); // Glossy Highlight
          } else if (y < 0) {
            drawPx(x, y + squish, c);
          } else {
            drawPx(x, y + squish, '#1e293b'); // Bottom Shadow
          }
        }
      }
    }

    // Inner Core Nucleus (Jelly Bubble)
    const bubbleFloat = Math.sin(frame * 0.1) * 0.8;
    drawPx(1, -1 + squish + bubbleFloat, '#ffffff', 0.8);
    drawPx(0, 0 + squish + bubbleFloat, '#fef08a', 0.9);

    // Animated Kawaii / Fierce Eyes
    const blink = Math.floor(frame / 35) % 8 === 0;
    if (blink) {
      drawPx(-2, -1 + squish, outline);
      drawPx(-3, -1 + squish, outline);
      drawPx(2, -1 + squish, outline);
      drawPx(3, -1 + squish, outline);
    } else {
      // Big Eyes with reflection
      drawPx(-3, -2 + squish, outline);
      drawPx(-2, -2 + squish, monster.isBoss ? '#ef4444' : '#ffffff');
      drawPx(-2, -1 + squish, outline);

      drawPx(2, -2 + squish, outline);
      drawPx(3, -2 + squish, monster.isBoss ? '#ef4444' : '#ffffff');
      drawPx(3, -1 + squish, outline);
    }

    // Cute Cheeks
    drawPx(-4, 0 + squish, '#f43f5e', 0.6);
    drawPx(4, 0 + squish, '#f43f5e', 0.6);

    // Slime King Crown with Sparkles
    if (monster.isBoss) {
      const crownY = -bodyH - 4 + squish;
      // Crown Base
      for (let cxp = -4; cxp <= 4; cxp++) {
        drawPx(cxp, crownY + 2, '#d97706');
        drawPx(cxp, crownY + 1, '#fbbf24');
      }
      // Crown Spikes
      drawPx(-4, crownY, '#fbbf24');
      drawPx(-4, crownY - 1, '#fde047');
      drawPx(0, crownY - 1, '#fbbf24');
      drawPx(0, crownY - 2, '#fde047');
      drawPx(4, crownY, '#fbbf24');
      drawPx(4, crownY - 1, '#fde047');

      // Ruby in Center of Crown
      drawPx(0, crownY + 1, '#ef4444');
      drawPx(-2, crownY + 1, '#06b6d4');
      drawPx(2, crownY + 1, '#06b6d4');

      // Sparkles floating around
      const sparkAng = frame * 0.08;
      drawPx(Math.floor(Math.cos(sparkAng) * 9), crownY + Math.floor(Math.sin(sparkAng) * 4), '#fef08a');
    }
  }

  // 2. GOBLIN / ORC (고블린 & 오크 광부 / 대족장)
  else if (monster.spriteType === 'goblin' || monster.spriteType === 'orc') {
    const bob = Math.sin(frame * 0.05) * 1.5;
    const isOrc = monster.spriteType === 'orc' || monster.isBoss;
    const skin = monster.color || (isOrc ? '#15803d' : '#84cc16');
    const armor = isOrc ? '#7f1d1d' : '#78350f';

    // Head
    for (let y = -10; y <= -4; y++) {
      for (let x = -5; x <= 5; x++) {
        if (Math.abs(x) === 5 || y === -10 || y === -4) drawPx(x, y + bob, outline);
        else drawPx(x, y + bob, skin);
      }
    }

    // Pointy Long Ears
    drawPx(-6, -7 + bob, skin);
    drawPx(-7, -8 + bob, skin);
    drawPx(-8, -9 + bob, outline);
    drawPx(6, -7 + bob, skin);
    drawPx(7, -8 + bob, skin);
    drawPx(8, -9 + bob, outline);

    // Glowing Menacing Eyes & Eyebrows
    drawPx(-3, -8 + bob, '#1e293b');
    drawPx(-2, -7 + bob, '#facc15');
    drawPx(-2, -6 + bob, '#000000');
    drawPx(3, -8 + bob, '#1e293b');
    drawPx(2, -7 + bob, '#facc15');
    drawPx(2, -6 + bob, '#000000');

    // Sharp Tusks
    drawPx(-2, -4 + bob, '#ffffff');
    drawPx(2, -4 + bob, '#ffffff');

    // Body & Spiked Metal Armor
    for (let y = -3; y <= 5; y++) {
      const w = y >= 2 ? 6 : 5;
      for (let x = -w; x <= w; x++) {
        if (Math.abs(x) === w || y === 5) drawPx(x, y + bob, outline);
        else drawPx(x, y + bob, armor);
      }
    }

    // Shoulder Spikes
    drawPx(-6, -2 + bob, '#94a3b8');
    drawPx(-7, -3 + bob, '#e2e8f0');
    drawPx(6, -2 + bob, '#94a3b8');
    drawPx(7, -3 + bob, '#e2e8f0');

    // Weapon: Glowing Battleaxe or Pickaxe
    const wepX = 8;
    const wepY = -3 + bob;
    drawPx(wepX, wepY - 4, '#ef4444');
    drawPx(wepX + 1, wepY - 3, '#f97316');
    drawPx(wepX + 2, wepY - 2, '#fbbf24');
    drawPx(wepX + 1, wepY - 1, '#f97316');
    drawPx(wepX, wepY, '#78350f');
    drawPx(wepX - 1, wepY + 1, '#78350f');
    drawPx(wepX - 2, wepY + 2, '#78350f');
  }

  // 3. SKELETON / LICH KING (해골 군단 & 불사의 리치 킹)
  else if (monster.spriteType === 'skeleton') {
    const float = Math.sin(frame * 0.04) * 2;
    const isLich = monster.isBoss;

    // Skull Head
    for (let y = -11; y <= -5; y++) {
      for (let x = -5; x <= 5; x++) {
        if (Math.abs(x) === 5 || y === -11 || y === -5) drawPx(x, y + float, outline);
        else drawPx(x, y + float, '#f8fafc');
      }
    }

    // Soul Fire Blue / Purple Glowing Eyes
    const eyeGlow = isLich ? '#a855f7' : '#06b6d4';
    drawPx(-2, -8 + float, eyeGlow);
    drawPx(-2, -7 + float, '#ffffff');
    drawPx(2, -8 + float, eyeGlow);
    drawPx(2, -7 + float, '#ffffff');

    // Teeth Grid
    drawPx(-3, -5 + float, outline);
    drawPx(-1, -5 + float, outline);
    drawPx(1, -5 + float, outline);
    drawPx(3, -5 + float, outline);

    // Ribcage & Dark Magic Robes
    for (let y = -4; y <= 5; y++) {
      for (let x = -5; x <= 5; x++) {
        if (Math.abs(x) === 5 || y === 5) drawPx(x, y + float, outline);
        else if (isLich) drawPx(x, y + float, y % 2 === 0 ? '#3b0764' : '#581c87');
        else drawPx(x, y + float, x === 0 || y % 2 === 0 ? '#e2e8f0' : '#0f172a');
      }
    }

    // Lich Crown & Necrotic Staff
    if (isLich) {
      drawPx(-4, -13 + float, '#9333ea');
      drawPx(0, -14 + float, '#c084fc');
      drawPx(4, -13 + float, '#9333ea');

      // Floating Soul Flame Orb
      const orbY = -6 + Math.sin(frame * 0.08) * 4;
      drawPx(8, orbY + float, '#38bdf8');
      drawPx(9, orbY - 1 + float, '#c084fc');
      drawPx(8, orbY - 2 + float, '#ffffff');
      drawPx(7, orbY - 1 + float, '#c084fc');
    }
  }

  // 4. GOLEM (흑요석 골렘 & 대화산 거신 볼케이노)
  else if (monster.spriteType === 'golem') {
    const pulse = Math.sin(frame * 0.03) * 1.5;
    const coreGlow = Math.sin(frame * 0.08) > 0 ? '#f97316' : '#ef4444';

    // Massive Stone Head & Horns
    for (let y = -12; y <= -6; y++) {
      for (let x = -6; x <= 6; x++) {
        if (Math.abs(x) === 6 || y === -12 || y === -6) drawPx(x, y + pulse, outline);
        else drawPx(x, y + pulse, (x + y) % 3 === 0 ? '#475569' : c);
      }
    }

    // Obsidian Spikes on Head
    drawPx(-7, -13 + pulse, '#1e293b');
    drawPx(-6, -14 + pulse, '#334155');
    drawPx(7, -13 + pulse, '#1e293b');
    drawPx(6, -14 + pulse, '#334155');

    // Glowing Lava Eye Slits
    drawPx(-3, -9 + pulse, '#fbbf24');
    drawPx(-2, -9 + pulse, coreGlow);
    drawPx(3, -9 + pulse, '#fbbf24');
    drawPx(2, -9 + pulse, coreGlow);

    // Giant Torso with Magma Core Cracks
    for (let y = -5; y <= 6; y++) {
      for (let x = -9; x <= 9; x++) {
        if (Math.abs(x) === 9 || y === 6) drawPx(x, y + pulse, outline);
        else {
          const isCrack = (Math.abs(x) === Math.abs(y - 1)) || (x === 0 && y >= -2);
          drawPx(x, y + pulse, isCrack ? coreGlow : (x + y) % 2 === 0 ? '#1e293b' : c);
        }
      }
    }

    // Huge Floating Stone Fists
    const fistY = Math.sin(frame * 0.05) * 3;
    for (let fy = -2; fy <= 4; fy++) {
      for (let fx = -4; fx <= 4; fx++) {
        drawPx(-13 + fx, fy + fistY, c);
        drawPx(13 + fx, fy + fistY, c);
      }
    }
  }

  // 5. ELEMENTAL (화염 / 빙결 / 번개 / 정령 솔라리스)
  else if (monster.spriteType === 'elemental') {
    const float = Math.sin(frame * 0.06) * 3;
    const pulse = Math.cos(frame * 0.08) * 1.5;

    // Multilayer Fire / Energy Vortex
    for (let y = -11; y <= 6; y++) {
      const w = Math.max(1, Math.floor(7 - Math.abs(y + 2) * 0.5 + pulse));
      for (let x = -w; x <= w; x++) {
        if (Math.abs(x) === w || y === -11 || y === 6) {
          drawPx(x, y + float, outline);
        } else {
          const distFromCenter = Math.sqrt(x * x + (y + 2) * (y + 2));
          if (distFromCenter < 2.5) {
            drawPx(x, y + float, '#ffffff'); // Pure White Hot Core
          } else if (distFromCenter < 4.5) {
            drawPx(x, y + float, '#fde047'); // Yellow Energy
          } else {
            drawPx(x, y + float, c);
          }
        }
      }
    }

    // Blazing Eyes
    drawPx(-2, -3 + float, '#ffffff');
    drawPx(2, -3 + float, '#ffffff');

    // 4 Orbiting Elemental Crystals / Plasma Flares
    for (let s = 0; s < 4; s++) {
      const sAngle = frame * 0.07 + (s * Math.PI) / 2;
      const sx = Math.cos(sAngle) * 13;
      const sy = Math.sin(sAngle) * 9;
      drawPx(Math.floor(sx), Math.floor(sy + float), '#fbbf24');
      drawPx(Math.floor(sx) + 1, Math.floor(sy + float), '#ef4444');
    }
  }

  // 6. MACHINE / AUTOMATA / CHRONOS (시공간 크로노스 & 오토마타)
  else if (monster.spriteType === 'machine') {
    const tick = Math.sin(frame * 0.05) * 1.2;

    // Rotating Brass Gears behind
    const gearRot = frame * 0.04;
    for (let g = 0; g < 6; g++) {
      const gx = Math.cos(gearRot + (g * Math.PI) / 3) * 11;
      const gy = Math.sin(gearRot + (g * Math.PI) / 3) * 11;
      drawPx(Math.floor(gx), Math.floor(gy - 3 + tick), '#d97706');
    }

    // Heavy Brass Chassis Head
    for (let y = -11; y <= -4; y++) {
      for (let x = -6; x <= 6; x++) {
        if (Math.abs(x) === 6 || y === -11 || y === -4) drawPx(x, y + tick, outline);
        else drawPx(x, y + tick, '#b45309');
      }
    }

    // Chrono Visor with Scanning Laser
    const scanX = Math.floor(Math.sin(frame * 0.1) * 3);
    for (let vx = -4; vx <= 4; vx++) {
      drawPx(vx, -8 + tick, vx === scanX ? '#ffffff' : '#06b6d4');
    }

    // Mechanical Torso & Steam Pipes
    for (let y = -3; y <= 6; y++) {
      for (let x = -8; x <= 8; x++) {
        if (Math.abs(x) === 8 || y === 6) drawPx(x, y + tick, outline);
        else drawPx(x, y + tick, (x + y) % 2 === 0 ? '#78716c' : '#a8a29e');
      }
    }

    // Core Clock Dial / Reactor
    drawPx(0, 1 + tick, '#38bdf8');
    drawPx(-1, 1 + tick, '#0284c7');
    drawPx(1, 1 + tick, '#0284c7');

    // Steam Vent Exhaust
    const steamY = -15 + Math.sin(frame * 0.1) * 3;
    drawPx(7, steamY, '#f8fafc', 0.7);
    drawPx(8, steamY - 2, '#e2e8f0', 0.5);
  }

  // 7. TENTACLE ABYSS / LEVIATHAN (심연의 포식자 레비아탄 & 공허 괴수)
  else if (monster.spriteType === 'tentacle_abyss') {
    const float = Math.sin(frame * 0.04) * 2;

    // 6 Writhing Animated Tentacles
    for (let t = -6; t <= 6; t += 2) {
      const wave = Math.sin(frame * 0.07 + t) * 4;
      for (let ty = 2; ty <= 12; ty++) {
        const tx = t + Math.floor(wave * (ty / 12));
        drawPx(tx, ty + float, ty > 8 ? '#a855f7' : c);
        drawPx(tx + 1, ty + float, '#3b0764'); // Sucker Cups
      }
    }

    // Central Cosmic Dark Eye Orb
    for (let y = -9; y <= 2; y++) {
      for (let x = -7; x <= 7; x++) {
        if (x * x + (y + 3) * (y + 3) <= 38) {
          drawPx(x, y + float, outline);
        }
        if (x * x + (y + 3) * (y + 3) <= 26) {
          drawPx(x, y + float, '#1e1b4b');
        }
      }
    }

    // Giant Bloodshot Crimson Evil Eye (Blinks & Dilates)
    const eyePulse = Math.sin(frame * 0.08) * 0.5;
    drawPx(0, -3 + float, '#ef4444');
    drawPx(-1, -3 + float, '#991b1b');
    drawPx(1, -3 + float, '#991b1b');
    drawPx(0, -4 + float, '#fca5a5');
    drawPx(0, -2 + float, '#000000'); // Slit Pupil

    // Eldritch Dark Void Particles
    for (let v = 0; v < 6; v++) {
      const vAng = frame * 0.05 + (v * Math.PI) / 3;
      const vx = Math.cos(vAng) * 16;
      const vy = Math.sin(vAng) * 11;
      drawPx(Math.floor(vx), Math.floor(vy + float), '#9333ea', 0.8);
    }
  }

  // 8. ANGEL / SERAPH (천상의 수호천사 & 엘리시온)
  else if (monster.spriteType === 'angel') {
    const float = Math.sin(frame * 0.03) * 2;
    const flap = Math.sin(frame * 0.05) * 2.5;

    // Glowing Double Halo
    for (let hx = -4; hx <= 4; hx++) {
      drawPx(hx, -14 + float, '#fde047');
      drawPx(hx, -15 + float, '#fef08a');
    }

    // 6 Glorious Wings (Pure Gold & White Feathering)
    for (let wy = -9; wy <= 3; wy++) {
      const span = 15 - Math.abs(wy);
      drawPx(-span - flap, wy + float, '#ffffff');
      drawPx(-span + 1 - flap, wy + float, '#fef08a');
      drawPx(span + flap, wy + float, '#ffffff');
      drawPx(span - 1 + flap, wy + float, '#fef08a');
    }

    // Holy Robes & Holy Sword
    for (let y = -9; y <= 6; y++) {
      const rw = Math.min(6, Math.floor((y + 10) * 0.5));
      for (let x = -rw; x <= rw; x++) {
        if (Math.abs(x) === rw || y === 6) drawPx(x, y + float, outline);
        else drawPx(x, y + float, y < -3 ? '#fef3c7' : '#ffffff');
      }
    }

    // Radiant Cyan Eyes
    drawPx(-2, -6 + float, '#0284c7');
    drawPx(2, -6 + float, '#0284c7');
  }

  // 9. CELESTIAL DRAGON / DEMON LORD / VOID GOD / WYRM
  else {
    const float = Math.sin(frame * 0.03) * 2;
    const wingFlap = Math.sin(frame * 0.06) * 3;

    // Massive Dragon Wings with Spikes
    for (let wy = -12; wy <= 4; wy++) {
      const wSpan = 16 - Math.abs(wy);
      drawPx(-wSpan - wingFlap, wy + float, c);
      drawPx(-wSpan + 1 - wingFlap, wy + float, '#1e1b4b');
      drawPx(wSpan + wingFlap, wy + float, c);
      drawPx(wSpan - 1 + wingFlap, wy + float, '#1e1b4b');
    }

    // Giant Dragon Head with Golden Horns
    drawPx(-6, -14 + float, '#fbbf24');
    drawPx(-7, -16 + float, '#f59e0b');
    drawPx(6, -14 + float, '#fbbf24');
    drawPx(7, -16 + float, '#f59e0b');

    // Head Body
    for (let y = -11; y <= 6; y++) {
      for (let x = -7; x <= 7; x++) {
        if (Math.abs(x) === 7 || y === -11 || y === 6) drawPx(x, y + float, outline);
        else drawPx(x, y + float, y < 0 ? c : '#171717');
      }
    }

    // Dragon Chest Scale Plates & Core Glow
    drawPx(0, 0 + float, '#fbbf24');
    drawPx(-1, 1 + float, '#f59e0b');
    drawPx(1, 1 + float, '#f59e0b');
    drawPx(0, 2 + float, '#ef4444');

    // Fierce Dragon Eyes
    drawPx(-3, -7 + float, '#fbbf24');
    drawPx(-2, -7 + float, '#ef4444');
    drawPx(3, -7 + float, '#fbbf24');
    drawPx(2, -7 + float, '#ef4444');

    // Galaxy / Cosmic Star Particles Ring
    for (let p = 0; p < 8; p++) {
      const pAngle = frame * 0.04 + (p * Math.PI) / 4;
      const px = Math.cos(pAngle) * 22;
      const py = Math.sin(pAngle) * 14;
      drawPx(Math.floor(px), Math.floor(py + float), p % 2 === 0 ? '#a855f7' : '#ec4899');
    }
  }

  // Stun / Groggy Visual Star Halo
  if (isStunned) {
    const starCount = 4;
    for (let i = 0; i < starCount; i++) {
      const sAng = frame * 0.12 + (i * Math.PI * 2) / starCount;
      const sx = Math.cos(sAng) * 16;
      const sy = Math.sin(sAng) * 7 - 14;
      drawPx(Math.floor(sx), Math.floor(sy), '#facc15');
      drawPx(Math.floor(sx), Math.floor(sy - 1), '#ffffff');
    }
  }

  ctx.restore();
}
