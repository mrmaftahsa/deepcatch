/* Deep Catch: expedition progression, elite encounters, premium canvas UI and booster FX */
(() => {
  const ZONES = [
    { name: 'SUNLIT REEF', depth: 0, color: '#36e2cf' },
    { name: 'CORAL LABYRINTH', depth: 150, color: '#ff8b79' },
    { name: 'MIDNIGHT TRENCH', depth: 300, color: '#a88bff' },
    { name: 'THERMAL VENTS', depth: 450, color: '#ffad59' },
    { name: 'ABYSSAL RIFT', depth: 600, color: '#69c9ff' },
    { name: 'LEVIATHAN GRAVEYARD', depth: 750, color: '#f4d16b' }
  ];
  const zoneIndex = () => clamp(Math.floor((Number(S.dives) || 0) / 4), 0, ZONES.length - 1);
  const zone = () => ZONES[zoneIndex()];
  const zoneName = () => zone().name;
  const zoneColor = () => zone().color;
  const fx = [];
  let currents = [];
  let boss = null;
  let extraSharkTimer = 2.2;
  let activeCurrent = -1;
  let previousPower = { magnet: 0, shield: 0, dbl: 0 };
  let lastBossReward = 0;
  let diveZoneIndex = 0;
  let bubbleSeed = 17;
  const bubbles = [];
  for (let i = 0; i < 34; i++) {
    bubbleSeed = (bubbleSeed * 16807) % 2147483647;
    const a = bubbleSeed / 2147483647;
    bubbleSeed = (bubbleSeed * 16807) % 2147483647;
    const b = bubbleSeed / 2147483647;
    bubbles.push({ x: 12 + a * (W - 24), y: b * 900, r: 1.2 + a * 2.2, drift: 4 + b * 13, phase: a * 6.28 });
  }

  SP.push(
    { n: 'Abyss Eel', c: '#42d9c5', a: '#b8fff3', min: 780, max: 1320, v: 950, s: 35, k: 'long', rare: 1 },
    { n: 'Crystal Ray', c: '#9b86ed', a: '#e5dcff', min: 900, max: 1500, v: 1500, s: 42, k: 'flat', rare: 1 },
    { n: 'Void Angler', c: '#35275e', a: '#e0a8ff', min: 1080, max: 1750, v: 2600, s: 38, k: 'angler', rare: 1 },
    { n: 'Abyss Leviathan', c: '#244e70', a: '#9be5ff', min: 1280, max: 1940, v: 4200, s: 58, k: 'shark', rare: 1 },
    { n: 'Golden Leviathan', c: '#d4a52a', a: '#fff1ab', min: 1500, max: 2200, v: 10000, s: 72, k: 'whale', rare: 1 }
  );

  function addBoosterFX(kind, x, y) {
    fx.push({ kind, x, y, life: 1.35, duration: 1.35, seed: Math.random() * 6.28 });
    const color = kind === 'magnet' ? '#ff75d5' : kind === 'shield' ? '#70e6ff' : '#ffd76a';
    burst(x, y, color, 26, 170);
    burst(x, y, '#ffffff', 10, 105);
    const title = kind === 'magnet' ? 'MAGNET POWER!' : kind === 'shield' ? 'SHIELD ACTIVATED!' : 'DOUBLE CASH!';
    floats.push({ x, y: y - 45, txt: title, col: color, life: 1.45 });
    beep(kind === 'magnet' ? 820 : kind === 'shield' ? 680 : 980, 0.22);
    vib(35);
  }

  const baseStartDive = startDive;
  startDive = function () {
    baseStartDive();
    const zi = zoneIndex();
    diveZoneIndex = zi;
    const baseDepth = maxPx / PX;
    const bonusDepth = ZONES[zi].depth;
    maxPx += bonusDepth * PX;

    // Populate the newly unlocked part of the ocean with species appropriate to its depth.
    for (let m = baseDepth + 24; m <= baseDepth + bonusDepth; m += 28) {
      const pool = SP.filter(s => m >= s.min && m <= s.max);
      if (!pool.length) continue;
      const count = 2 + Math.min(zi, 2);
      for (let i = 0; i < count; i++) {
        const sp = pickW(pool);
        const dir = Math.random() < 0.5 ? -1 : 1;
        fish.push(mkFish(sp, rand(35, W - 35), m * PX + rand(-18, 18), dir * rand(38, 82) * (1 + zi * 0.12), 0));
      }
    }

    // Each new region adds denser hazards and mines that sweep across the screen.
    const dangerChance = 0.07 + zi * 0.035;
    for (let m = 45; m < maxPx / PX - 20; m += Math.max(24, 38 - zi * 2)) {
      if (Math.random() < dangerChance) {
        const mine = Math.random() < 0.35 + zi * 0.06;
        hazards.push({
          k: mine ? 'mine' : 'jelly',
          x: rand(35, W - 35),
          y: m * PX + rand(-24, 24),
          vx: mine ? (Math.random() < 0.5 ? -1 : 1) * rand(28, 55 + zi * 18) : rand(-35, 35),
          r: mine ? 16 : 19,
          ph: rand(0, 6),
          dead: 0
        });
      }
    }

    // Strong lateral currents are visible, predictable hazards: steer against them.
    currents = [];
    for (let i = 0; i < Math.min(5, 1 + zi); i++) {
      currents.push({
        y: rand(maxPx * 0.2, maxPx * 0.88),
        dir: (i + zi) % 2 ? -1 : 1,
        strength: 34 + zi * 15,
        phase: rand(0, 6),
        id: i
      });
    }
    activeCurrent = -1;
    extraSharkTimer = 2.1;

    // Every fourth expedition ends with an avoidable Leviathan encounter.
    boss = (S.dives + 1) % 4 === 0 ? {
      x: W / 2, y: maxPx - Math.max(260, Math.min(420, maxPx * 0.28)),
      dir: 1, phase: 'idle', timer: 1.1, warn: 0, attacks: 0,
      hits: 0, defeated: false, rewardPaid: false, dead: 0
    } : null;
    lastBossReward = 0;

    if (zi > 0) toast('WELCOME TO ' + zoneName() + '!', zoneColor());
    if (boss) toast('WARNING: LEVIATHAN TERRITORY!', '#ff7777');
  };

  const baseSharkHit = sharkHit;
  function updateBoss(dt) {
    if (!boss || boss.dead || boss.phase === 'escaped' || boss.phase === 'defeated' || st !== 'up') return;
    const cy = hook.y + 30;
    const gapY = boss.y - cy;

    if (boss.phase === 'idle') {
      boss.x += Math.sin(t * 1.35) * 28 * dt;
      if (Math.abs(gapY) < 235 && boss.attacks < 3) {
        boss.phase = 'warn';
        boss.warn = 0.95;
        boss.attacks++;
        toast('LEVIATHAN CHARGING — DODGE!', '#ff7777');
        beep(190, 0.3);
      }
    } else if (boss.phase === 'warn') {
      boss.warn -= dt;
      if (boss.warn <= 0) {
        boss.dir = hook.x < W * 0.5 ? 1 : -1;
        boss.x = boss.dir > 0 ? -125 : W + 125;
        boss.phase = 'dash';
      }
    } else if (boss.phase === 'dash') {
      boss.x += boss.dir * 650 * dt;
      if (Math.abs(boss.x - hook.x + 6) < 76 && Math.abs(gapY) < 48) {
        boss.hits++;
        baseSharkHit(boss);
        if (boss.dead) {
          boss.defeated = true;
          boss.phase = 'defeated';
          toast('SHIELD BREAKS THE LEVIATHAN!', '#7deaff');
        } else {
          boss.phase = 'recover';
          boss.timer = 1.05;
        }
      } else if (boss.x < -180 || boss.x > W + 180) {
        boss.phase = 'recover';
        boss.timer = 1.0;
      }
    } else if (boss.phase === 'recover') {
      boss.timer -= dt;
      if (boss.timer <= 0) {
        boss.phase = boss.attacks >= 3 ? 'escaped' : 'idle';
        if (boss.phase === 'escaped') toast('LEVIATHAN SURVIVED — CLEAN ESCAPE!', '#ffe18a');
      }
    }
  }

  const baseUpdate = update;
  update = function (dt) {
    const wasResult = st === 'result';
    const before = { magnet: !!P.magnet, shield: !!P.shield, dbl: !!P.dbl };
    baseUpdate(dt);

    // Booster transitions trigger layered rings, particles, a title pop and sound.
    for (const key of ['magnet', 'shield', 'dbl']) {
      if (!before[key] && P[key] && !previousPower[key]) addBoosterFX(key, hook.x - 6, hook.y + 28);
      previousPower[key] = !!P[key];
    }

    if (st === 'down' || st === 'up') {
      // Moving mines sweep horizontally instead of acting as static obstacles.
      for (const h of hazards) {
        if (h.k !== 'mine' || !h.vx || h.dead) continue;
        h.x += h.vx * dt;
        if (h.x < 28 || h.x > W - 28) h.vx *= -1;
      }

      const near = currents.find(c => Math.abs(hook.y - c.y) < 82);
      if (near) {
        const pulse = 0.72 + 0.28 * Math.sin(t * 3.2 + near.phase);
        const drift = near.dir * near.strength * pulse * dt;
        hook.x = clamp(hook.x + drift, 15, W - 15);
        tx = clamp(tx + drift * 0.7, 15, W - 15);
        if (activeCurrent !== near.id) toast(near.dir > 0 ? 'STRONG CURRENT →' : '← STRONG CURRENT', zoneColor());
        activeCurrent = near.id;
      } else activeCurrent = -1;

      // Later regions add extra predator passes on top of the original shark attacks.
      const zi = zoneIndex();
      const sharkLimit = 2 + Math.min(3, Math.ceil(zi / 2));
      if (st === 'up' && zi > 0 && sharkN < sharkLimit && hook.y > 190 && hook.y < maxPx * 0.78) {
        extraSharkTimer -= dt;
        if (extraSharkTimer <= 0) {
          extraSharkTimer = Math.max(1.8, 3.2 - zi * 0.25);
          const dir = Math.random() < 0.5 ? 1 : -1;
          sharks.push({ dir, x: dir > 0 ? -100 : W + 100, y: hook.y - 110 + rand(-35, 35), warn: 0.72, dead: 0 });
          sharkN++;
          toast('PREDATOR INCOMING!', '#ff7777');
        }
      }
    }

    updateBoss(dt);

    // Resolve a flawless boss escape as a meaningful expedition reward.
    if (!wasResult && st === 'result' && boss && !boss.rewardPaid) {
      const clean = boss.hits === 0 && !boss.defeated;
      const reward = Math.round((clean ? 1800 : 450) * (diveZoneIndex + 1));
      S.money += reward;
      earned += reward;
      lastBossReward = reward;
      boss.rewardPaid = true;
      save();
      toast((clean ? 'PERFECT BOSS DODGE! ' : 'BOSS SURVIVED! ') + '+$' + fmt(reward), '#ffe18a');
    }

    for (const item of fx) item.life -= dt;
    while (fx.length && fx[0].life <= 0) fx.shift();
  };

  const baseDrawWorld = drawWorld;
  drawWorld = function () {
    baseDrawWorld();

    // Soft drifting bubbles add depth without obscuring gameplay.
    ctx.save();
    for (const b of bubbles) {
      const y = (((b.y - t * b.drift) % 960) + 960) % 960;
      ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 1.6 + b.phase);
      ctx.beginPath();
      ctx.arc(b.x + Math.sin(t + b.phase) * 5, y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = '#d6fff9';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Current lanes are indicated by moving chevrons near the hook.
    for (const c of currents) {
      const y = c.y - camY;
      if (y < -45 || y > H + 45 || Math.abs(hook.y - c.y) > 260) continue;
      ctx.globalAlpha = 0.48;
      ctx.strokeStyle = zoneColor();
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const x = 60 + i * 78 + Math.sin(t * 2 + c.phase) * 8;
        const d = c.dir;
        ctx.beginPath();
        ctx.moveTo(x - d * 10, y - 10);
        ctx.lineTo(x, y);
        ctx.lineTo(x - d * 10, y + 10);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Expanding booster shockwaves and orbiting sparkles (Candy-Crush-style feedback).
    for (const a of fx) {
      const p = 1 - a.life / a.duration;
      const y = a.y - camY;
      if (y < -160 || y > H + 160) continue;
      const color = a.kind === 'magnet' ? '#ff74d4' : a.kind === 'shield' ? '#70e8ff' : '#ffd66d';
      const radius = 18 + p * 116;
      const alpha = Math.max(0, 1 - p);
      const glow = ctx.createRadialGradient(a.x, y, 3, a.x, y, 76 + p * 48);
      glow.addColorStop(0, color + '66');
      glow.addColorStop(1, color + '00');
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(a.x, y, 76 + p * 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 5 - p * 3;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(a.x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, y, radius * 0.68, a.seed, a.seed + Math.PI * (1.2 + p));
      ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const angle = a.seed + i * Math.PI * 2 / 10 + p * 1.6;
        const rradius = radius * (0.55 + (i % 3) * 0.19);
        const sx = a.x + Math.cos(angle) * rradius;
        const sy = y + Math.sin(angle) * rradius;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + (1 - p) * 2, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? '#ffffff' : color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Giant predator, with a readable warning phase before each charge.
    if (boss && boss.phase !== 'escaped' && boss.phase !== 'defeated') {
      const by = boss.y - camY;
      if (by > -130 && by < H + 130) {
        if (boss.phase === 'warn') {
          ctx.globalAlpha = 0.2 + 0.18 * Math.sin(t * 20);
          ctx.fillStyle = '#ff3434';
          ctx.fillRect(0, by - 42, W, 84);
          ctx.globalAlpha = 1;
          txt('DODGE!', W / 2, by - 58, 25, '#ff7777', 'center', 5);
        }
        if (boss.phase === 'dash') {
          ctx.globalAlpha = 0.24;
          for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.ellipse(boss.x - boss.dir * i * 18, by, 58 - i * 7, 22 - i * 2, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#9be5ff';
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        drawFish(SHARK, boss.x, by, boss.dir, 1.65, 0, 0);
        txt('ABYSS LEVIATHAN', clamp(boss.x, 96, W - 96), by - 52, 17, '#ffffff', 'center', 4);
      }
    }
    ctx.restore();
  };

  // Make the power-up bubbles look collectible and alive.
  const baseDrawOrb = drawOrb;
  drawOrb = function (o) {
    const y = o.y + Math.sin(t * 2 + o.ph) * 4;
    const color = o.k === 'magnet' ? '#ff75d5' : o.k === 'shield' ? '#70e8ff' : '#ffd66d';
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(o.x, y, 25 + Math.sin(t * 5 + o.ph) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
    baseDrawOrb(o);
  };

  // Modern, soft-gradient controls.
  btn = function (x, y, w, h, label, fn, size, on) {
    const disabled = on === false;
    ctx.save();
    rr(x, y + 3, w, h, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.fill();
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, disabled ? '#536b78' : '#55f0d6');
    grad.addColorStop(1, disabled ? '#344b5a' : '#1398a8');
    rr(x, y, w, h, 14);
    ctx.shadowColor = disabled ? 'transparent' : 'rgba(30,220,205,0.28)';
    ctx.shadowBlur = disabled ? 0 : 15;
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = disabled ? '#718591' : '#a6fff0';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.23)';
    rr(x + 4, y + 4, w - 8, Math.max(7, h * 0.3), 9);
    ctx.fill();
    ctx.restore();
    txt(label, x + w / 2, y + h * 0.48, size || h * 0.46, disabled ? '#d4e0e5' : '#063a48', 'center', 2);
    if (fn) btns.push({ x, y, w, h, fn });
  };

  drawIconBtn = function (x, y, draw, fn) {
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x, y + 46);
    g.addColorStop(0, '#15566a');
    g.addColorStop(1, '#082b40');
    rr(x, y, 56, 46, 15);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(136,255,239,0.55)';
    ctx.stroke();
    ctx.restore();
    draw(x + 28, y + 23);
    btns.push({ x, y, w: 56, h: 46, fn });
  };

  drawMenuUI = function () {
    const y0 = H - 400;
    const zi = zoneIndex();
    ctx.save();
    const panel = ctx.createLinearGradient(0, y0, 0, H);
    panel.addColorStop(0, 'rgba(5,43,62,0.97)');
    panel.addColorStop(1, 'rgba(3,23,40,0.99)');
    rr(10, y0, W - 20, 390, 22);
    ctx.fillStyle = panel;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(84,235,218,0.46)';
    ctx.stroke();
    ctx.fillStyle = zoneColor();
    rr(28, y0 + 14, 4, 26, 2);
    ctx.fill();
    txt('CAPTAIN’S GEAR', 42, y0 + 28, 22, '#efffff', 'left');
    txt('UPGRADE YOUR NEXT EXPEDITION', W - 28, y0 + 28, 12, '#8fc7d3', 'right');
    UP.forEach((u, i) => {
      const y = y0 + 48 + i * 57;
      const level = S[u.k];
      const maxed = level >= u.max;
      const cost = u.cost(level);
      rr(20, y, W - 40, 51, 12);
      ctx.fillStyle = 'rgba(19,83,101,0.72)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(129,225,220,0.2)';
      ctx.stroke();
      txt(u.name, 34, y + 16, 16, '#f2ffff', 'left');
      txt('LV ' + (level + 1) + '  ·  ' + u.info(level) + (maxed ? '  ·  MAX' : '  →  ' + u.info(level + 1)), 34, y + 37, 13, '#9ed6df', 'left');
      btn(W - 145, y + 6, 112, 39, maxed ? 'MAXED' : '$' + fmt(cost), maxed ? null : () => buy(u), 18, maxed || S.money >= cost);
    });
    btn(22, H - 101, W - 44, 76, 'START EXPEDITION  ›', startDive, 29, true);
    ctx.restore();

    drawIconBtn(20, 20, (x, y) => {
      ctx.save();
      ctx.shadowBlur = 10; ctx.shadowColor = '#ffcf70';
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fillStyle = '#ffc969'; ctx.fill();
      ctx.fillStyle = '#8d541c'; ctx.fillRect(x - 8, y - 3, 16, 12);
      ctx.fillStyle = '#fff0b3'; ctx.fillRect(x - 2, y - 3, 4, 12);
      ctx.restore();
    }, () => { st = 'trophy'; tro.y = 0; });
    const ready = S.gift !== today();
    drawIconBtn(W - 142, 20, (x, y) => {
      const pulse = ready ? 1 + 0.1 * Math.sin(t * 6) : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
      rr(-12, -8, 24, 21, 4); ctx.fillStyle = ready ? '#ffd46d' : '#71838b'; ctx.fill();
      rr(-15, -13, 30, 7, 3); ctx.fillStyle = ready ? '#ff9f62' : '#526872'; ctx.fill();
      ctx.fillStyle = '#a83c5c'; ctx.fillRect(-2, -13, 4, 26);
      ctx.restore();
    }, claimGift);
    drawIconBtn(W - 76, 20, (x, y) => {
      ctx.strokeStyle = '#9af9ec'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 11, y - 6); ctx.lineTo(x - 4, y - 6); ctx.lineTo(x + 5, y - 13); ctx.lineTo(x + 5, y + 13); ctx.lineTo(x - 4, y + 6); ctx.lineTo(x - 11, y + 6); ctx.closePath(); ctx.stroke();
      if (S.mute) {
        ctx.beginPath(); ctx.moveTo(x + 9, y - 8); ctx.lineTo(x + 17, y + 8); ctx.moveTo(x + 17, y - 8); ctx.lineTo(x + 9, y + 8); ctx.strokeStyle = '#ff8888'; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x + 4, y, 10, -0.9, 0.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 4, y, 16, -0.9, 0.9); ctx.stroke();
      }
    }, () => { S.mute = S.mute ? 0 : 1; save(); });

    // Mission cards use clear progress and reward hierarchy.
    rr(14, 82, W - 28, 100, 16);
    ctx.fillStyle = 'rgba(4,32,49,0.84)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(115,221,218,0.24)';
    ctx.lineWidth = 1;
    ctx.stroke();
    S.ms.forEach((m, i) => {
      const y = 101 + i * 29;
      const label = missionText(m);
      txt(label, 27, y, 14, '#f4ffff', 'left');
      if (m.t === 'catch' && m.n > 1) txt(m.p + '/' + m.n, W - 112, y, 13, '#91e6e1', 'right');
      txt('$' + fmt(m.r), W - 25, y, 14, '#ffd46d', 'right');
    });

    txt('$' + fmt(S.money), W / 2, 52, 43, '#ffffff', 'center', 5);
    txt('EXPEDITION ' + (S.dives + 1) + '  ·  ZONE ' + (zi + 1), W / 2, 217, 16, '#d8ffff', 'center', 3);
    txt(zoneName(), W / 2, 247, 27, zoneColor(), 'center', 5);
    txt(zi < ZONES.length - 1 ? (4 - (S.dives % 4)) + ' DIVES TO NEXT REGION' : 'DEEPEST REGION UNLOCKED', W / 2, 278, 13, '#b0d6de', 'center');
    txt('SWIPE TO STEER  ·  DODGE HAZARDS  ·  COLLECT BOOSTERS', W / 2, 320, 12, '#b4dce3', 'center');
  };

  drawDiveUI = function () {
    const zi = zoneIndex();
    txt('$' + fmt(S.money), W / 2, 46, 39, '#ffffff', 'center', 5);
    txt(zoneName(), W / 2, 83, 16, zoneColor(), 'center', 4);
    rr(18, 108, 154, 35, 11);
    ctx.fillStyle = 'rgba(2,24,39,0.65)'; ctx.fill();
    txt('HAUL  ' + hooked.length + ' / ' + cap(), 95, 126, 18, '#f3ffff', 'center');
    rr(18, 151, 154, 7, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
    rr(18, 151, 154 * (hooked.length / Math.max(1, cap())), 7, 4);
    ctx.fillStyle = zoneColor(); ctx.fill();

    let bx = 22;
    [['magnet', 'M', '#ff75d5'], ['shield', 'S', '#70e8ff'], ['dbl', 'x2', '#ffd66d']].forEach(a => {
      if (!P[a[0]]) return;
      const pulse = 1 + 0.08 * Math.sin(t * 7);
      ctx.save(); ctx.translate(bx + 17, 190); ctx.scale(pulse, pulse);
      ctx.shadowBlur = 14; ctx.shadowColor = a[2];
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fillStyle = a[2]; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.restore();
      txt(a[1], bx + 17, 191, 14, '#073548', 'center', 2);
      bx += 42;
    });

    if (st === 'up' && combo >= 2 && comboT > 0) {
      const pulse = 1 + 0.1 * Math.sin(t * 18);
      ctx.save(); ctx.translate(W - 20, 120); ctx.scale(pulse, pulse);
      txt('COMBO x' + combo, 0, 0, 26, '#ffe18a', 'right', 5);
      ctx.restore();
      rr(W - 130, 143, 110, 5, 3); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
      rr(W - 130, 143, 110 * clamp(comboT / 1.4, 0, 1), 5, 3); ctx.fillStyle = '#ffe18a'; ctx.fill();
    }

    const sy = hook.y - camY + 12;
    ctx.setLineDash([7, 7]); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W * 0.56, sy); ctx.lineTo(W * 0.92, sy); ctx.stroke(); ctx.setLineDash([]);
    rr(W * 0.70, sy - 34, W * 0.27, 30, 9);
    ctx.fillStyle = 'rgba(1,22,36,0.68)'; ctx.fill();
    txt(Math.round(hook.y / PX) + ' m', W * 0.91, sy - 19, 22, '#ffffff', 'right', 3);

    if (boss && st === 'up' && boss.phase !== 'escaped' && boss.phase !== 'defeated') {
      txt('BOSS ' + Math.min(3, boss.attacks) + '/3', W - 18, 177, 15, '#ff9d91', 'right', 3);
    }
    btn(22, H - 91, W - 44, 67, st === 'down' ? 'DESCENDING  ↓' : 'RETURNING  ↑', null, 28, true);
  };

  drawResult = function () {
    const y = H * 0.27;
    txt('$' + fmt(S.money), W / 2, 48, 38, '#ffffff', 'center', 5);
    txt('EXPEDITION COMPLETE', W / 2, y - 35, 24, '#c9f8f3', 'center', 4);
    txt('+$' + fmt(earned), W / 2, y + 24, 64, '#ffdf7a', 'center', 7);
    txt(hooked.length + ' FISH RETURNED SAFELY', W / 2, y + 78, 19, '#f5ffff', 'center', 4);
    let yy = y + 120;
    if (maxCombo >= 3) { txt('BEST COMBO  x' + maxCombo, W / 2, yy, 21, '#ffe18a', 'center', 4); yy += 31; }
    if (newTrophy) { txt('NEW SPECIES DISCOVERED!', W / 2, yy, 21, '#ff9bd2', 'center', 4); yy += 31; }
    if (mbonus > 0) { txt('MISSIONS  +$' + fmt(mbonus), W / 2, yy, 20, '#8ef2c0', 'center', 4); yy += 30; }
    if (lastBossReward > 0) txt('LEVIATHAN BONUS  +$' + fmt(lastBossReward), W / 2, yy, 19, '#ffdf7a', 'center', 4);
    btn(32, H - 100, W - 64, 70, 'CONTINUE  ›', toMenu, 27, true);
    txt('TAP ANYWHERE TO CONTINUE', W / 2, H - 119, 11, '#b3d5dc', 'center');
  };

  drawTrophy = function () {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a4258'); g.addColorStop(1, '#041b30');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rows = Math.ceil(SP.length / 2);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 74, W, H - 140); ctx.clip();
    SP.forEach((sp, i) => {
      const x = 14 + (i % 2) * 211, y = 91 + Math.floor(i / 2) * 158 - tro.y;
      if (y < -155 || y > H) return;
      rr(x, y, 200, 142, 16);
      ctx.fillStyle = 'rgba(19,83,101,0.82)'; ctx.fill();
      ctx.strokeStyle = S.caught[sp.n] ? '#64e8d4' : 'rgba(255,255,255,0.13)';
      ctx.lineWidth = 1.5; ctx.stroke();
      silh = !S.caught[sp.n];
      drawFish(sp, x + 100, y + 59, 1, Math.min(1.9, 52 / sp.s), 0);
      silh = false;
      txt(S.caught[sp.n] ? sp.n : 'UNDISCOVERED', x + 100, y + 112, 14, S.caught[sp.n] ? '#eaffff' : '#829eaa', 'center');
      txt(S.caught[sp.n] ? 'CAUGHT  x' + S.caught[sp.n] : '???', x + 100, y + 129, 11, '#ffd77c', 'center');
    });
    ctx.restore();
    ctx.fillStyle = '#082d43'; ctx.fillRect(0, 0, W, 74);
    txt('TROPHY COLLECTION', W / 2, 28, 25, '#e9ffff', 'center', 4);
    txt('ZONE ' + (zoneIndex() + 1) + '  ·  ' + zoneName(), W / 2, 54, 11, zoneColor(), 'center');
    ctx.beginPath(); ctx.moveTo(48, 24); ctx.lineTo(48, 52); ctx.lineTo(25, 38); ctx.closePath();
    ctx.fillStyle = '#8af3e3'; ctx.fill();
    btns.push({ x: 0, y: 0, w: 78, h: 74, fn: () => { st = 'menu'; } });
    ctx.fillStyle = '#082d43'; ctx.fillRect(0, H - 62, W, 62);
    const got = SP.filter(s => S.caught[s.n]).length;
    txt('DISCOVERED  ' + got + ' / ' + SP.length, W / 2, H - 31, 19, '#e8ffff', 'center', 3);
    tro.max = Math.max(0, 92 + rows * 158 + 10 - (H - 62));
  };

  // A subtle highlight gives the original hand-drawn fish more depth.
  const baseDrawFish = drawFish;
  drawFish = function (sp, x, y, dir, scale, rot, gold) {
    baseDrawFish(sp, x, y, dir, scale, rot, gold);
    if (silh || sp.k === 'chest') return;
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.beginPath();
    ctx.ellipse(x - dir * sp.s * 0.08 * scale, y - sp.s * 0.18 * scale, sp.s * 0.38 * scale, Math.max(2, sp.s * 0.11 * scale), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  };

  // Keep old saves compatible while clearing stale booster transition state at each new run.
  const baseToMenu = toMenu;
  toMenu = function () {
    baseToMenu();
    boss = null;
    currents = [];
    fx.length = 0;
    previousPower = { magnet: 0, shield: 0, dbl: 0 };
  };
})();