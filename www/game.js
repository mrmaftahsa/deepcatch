'use strict';
/* Deep Catch v2 - arcade fishing with hazards, power-ups, combos, missions (original art, drawn with canvas) */
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 450, PX = 10, RANGE = 9000;
let H = 800, sc = 1;
function resize() {
  const d = window.devicePixelRatio || 1;
  cv.width = Math.floor(innerWidth * d);
  cv.height = Math.floor(innerHeight * d);
  sc = cv.width / W;
  H = cv.height / sc;
}
addEventListener('resize', resize);
resize();

const rand = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- save data ---------- */
let S = { money: 0, ld: 0, lc: 0, lv: 0, lk: 0, caught: {}, ms: [], gift: '', mute: 0, dives: 0 };
try { Object.assign(S, JSON.parse(localStorage.getItem('deepcatch') || '{}')); } catch (e) {}
function save() { try { localStorage.setItem('deepcatch', JSON.stringify(S)); } catch (e) {} }
const today = () => { try { return new Date().toISOString().slice(0, 10); } catch (e) { return ''; } };

/* ---------- species ---------- */
const SP = [
  { n: 'Sardine', c: '#7fb3d5', a: '#2e86c1', min: 0, max: 90, v: 5, s: 14 },
  { n: 'Goldie', c: '#f5b041', a: '#e67e22', min: 0, max: 120, v: 8, s: 16 },
  { n: 'Clownfish', c: '#ff8c1a', a: '#ffffff', min: 10, max: 140, v: 12, s: 18, k: 'stripe' },
  { n: 'Blue Tang', c: '#2471d6', a: '#f4e04d', min: 20, max: 180, v: 20, s: 20 },
  { n: 'Pink Angel', c: '#ff8fc7', a: '#ffd1e8', min: 40, max: 230, v: 35, s: 22, k: 'tall' },
  { n: 'Mackerel', c: '#3fa796', a: '#1b4f4a', min: 60, max: 280, v: 60, s: 26, k: 'long' },
  { n: 'Zebra Fish', c: '#e8e8e8', a: '#222222', min: 100, max: 330, v: 90, s: 26, k: 'stripe' },
  { n: 'Flounder', c: '#7d8a4a', a: '#5a6633', min: 150, max: 400, v: 140, s: 30, k: 'flat' },
  { n: 'Treasure', c: '#8e4a5e', a: '#d4c44a', min: 120, max: 500, v: 250, s: 26, k: 'chest', still: 1, rare: 1 },
  { n: 'Swordfish', c: '#2f6fd0', a: '#9fd3f0', min: 200, max: 520, v: 300, s: 36, k: 'sword', rare: 1 },
  { n: 'Lantern Fish', c: '#6c4bd1', a: '#9be7ff', min: 320, max: 700, v: 500, s: 28, k: 'lamp' },
  { n: 'Anglerfish', c: '#4a2b5a', a: '#ffe14d', min: 450, max: 900, v: 1000, s: 34, k: 'angler', rare: 1 },
  { n: 'Golden Whale', c: '#e6b800', a: '#fff2a0', min: 650, max: 1200, v: 3000, s: 48, k: 'whale', rare: 1 }
];
const SHARK = { n: 'Shark', c: '#7a8c99', a: '#4d5d6a', s: 40, k: 'shark' };

const UP = [
  { k: 'ld', name: 'LINE LENGTH', max: 20, cost: l => Math.round(60 * Math.pow(1.6, l)), info: l => (60 + 40 * l) + 'm' },
  { k: 'lc', name: 'HOOK SIZE', max: 15, cost: l => Math.round(80 * Math.pow(1.5, l)), info: l => (3 + 2 * l) + ' fish' },
  { k: 'lv', name: 'FISH VALUE', max: 20, cost: l => Math.round(100 * Math.pow(1.65, l)), info: l => 'x' + (1 + 0.25 * l).toFixed(2) },
  { k: 'lk', name: 'LUCK', max: 10, cost: l => Math.round(120 * Math.pow(1.7, l)), info: l => (4 + 1.5 * l).toFixed(1).replace('.0', '') + '% GOLD' }
];

const depthMax = () => 60 + 40 * S.ld;
const cap = () => 3 + 2 * S.lc;
const mult = () => 1 + 0.25 * S.lv;

function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
  return '' + Math.floor(n);
}

/* ---------- sound & vibration ---------- */
let ac;
function beep(f, d) {
  if (S.mute) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = f; g.gain.value = 0.04;
    o.connect(g); g.connect(ac.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
    o.stop(ac.currentTime + d);
  } catch (e) {}
}
function vib(ms) { if (S.mute) return; try { navigator.vibrate(ms); } catch (e) {} }

/* ---------- missions ---------- */
function newMission() {
  const r = Math.random(), D = depthMax();
  if (r < 0.5) {
    const av = SP.filter(s => s.min <= D - 10 && !s.still);
    const sp = av[rint(0, av.length - 1)];
    const n = sp.rare ? rint(1, 2) : rint(3, 7);
    return { t: 'catch', sp: sp.n, n, p: 0, r: Math.max(25, Math.round(sp.v * n * mult() * 1.6)) };
  }
  if (r < 0.72) { const n = Math.max(3, cap() - rint(0, 2)); return { t: 'stack', n, p: 0, r: Math.round(n * 45 * mult()) }; }
  if (r < 0.9) { const n = rint(3, 6); return { t: 'combo', n, p: 0, r: Math.round(n * 70 * mult()) }; }
  return { t: 'gold', n: 1, p: 0, r: Math.round(250 * mult()) };
}
function missionText(m) {
  if (m.t === 'catch') return 'CATCH ' + m.n + ' ' + m.sp.toUpperCase();
  if (m.t === 'stack') return 'HOOK ' + m.n + ' FISH IN ONE DIVE';
  if (m.t === 'combo') return 'REACH COMBO x' + m.n;
  return 'CATCH A GOLDEN FISH';
}
function ensureMissions() {
  if (!Array.isArray(S.ms)) S.ms = [];
  while (S.ms.length < 3) S.ms.push(newMission());
}
ensureMissions();

/* ---------- game state ---------- */
let st = 'menu';
const hook = { x: W / 2, y: 40 };
let tx = W / 2, fish = [], hooked = [], floats = [], toasts = [], parts = [], drops = [], orbs = [], hazards = [], sharks = [];
let camY = -H * 0.42, t = 0, resT = 0, earned = 0, mbonus = 0, doneMs = 0, newTrophy = false, maxPx = 600;
let P = { magnet: 0, shield: 0, dbl: 0 };
let combo = 0, comboT = 0, maxCombo = 0, stun = 0, invul = 0, shake = 0, sharkT = 2, sharkN = 0;
const tro = { y: 0, max: 0 };
const btns = [];

function toast(s, c) { toasts.push({ txt: s, col: c || '#fff', life: 2 }); if (toasts.length > 3) toasts.shift(); }
function burst(x, y, c, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.283), sp = rand(spd * 0.3, spd);
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.9), c, r: rand(2, 4.5) });
  }
}

function pickW(pool) {
  let tot = 0;
  const w = s => s.rare ? 0.35 * (1 + 0.15 * S.lk) : 1;
  for (const s of pool) tot += w(s);
  let r = Math.random() * tot;
  for (const s of pool) { r -= w(s); if (r <= 0) return s; }
  return pool[0];
}

function mkFish(sp, x, y, vx, sch) {
  return { sp, x, y, vx: sp.still ? 0 : vx, h: 0, sch: sch || 0, gold: (!sp.still && Math.random() < 0.04 + 0.015 * S.lk) ? 1 : 0 };
}

function startDive() {
  st = 'down'; hook.x = W / 2; hook.y = 40; tx = W / 2;
  hooked = []; fish = []; floats = []; orbs = []; hazards = []; sharks = []; drops = []; parts = [];
  P = { magnet: 0, shield: 0, dbl: 0 };
  combo = 0; comboT = 0; maxCombo = 0; stun = 0; invul = 0; shake = 0; sharkT = rand(1, 2); sharkN = 0;
  const D = depthMax(); maxPx = D * PX;
  for (let m = 12; m <= D; m += 6) {
    const pool = SP.filter(s => m >= s.min && m <= s.max);
    if (!pool.length) continue;
    const spd = 1 + m / 700;
    if (m > 20 && Math.random() < 0.16) {
      const p2 = pool.filter(s => !s.still && !s.rare);
      if (p2.length) {
        const sp = pickW(p2), dir = Math.random() < 0.5 ? -1 : 1, n = rint(5, 8), bx = rand(60, W - 60), vx = dir * rand(35, 60) * spd;
        for (let i = 0; i < n; i++) fish.push(mkFish(sp, bx + (i - n / 2) * 18, clamp(m * PX + rand(-35, 35), 60, maxPx - 30), vx, 1));
        continue;
      }
    }
    const n = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const sp = pickW(pool), dir = Math.random() < 0.5 ? -1 : 1;
      fish.push(mkFish(sp, rand(0, W), clamp(m * PX + rand(-25, 25), 60, maxPx - 30), dir * rand(30, 70) * spd, 0));
    }
  }
  // hazards
  for (let m = 25; m <= D - 5; m += 16) {
    const p = Math.min(0.42, 0.18 + m / 2000);
    if (Math.random() < p) {
      hazards.push({ k: 'jelly', x: rand(30, W - 30), y: m * PX + rand(-30, 30), vx: rand(-28, 28), r: 18, ph: rand(0, 6), dead: 0 });
    }
    if (m >= 100 && Math.random() < p * 0.6) {
      hazards.push({ k: 'mine', x: rand(30, W - 30), y: m * PX + rand(-40, 40), vx: 0, r: 15, ph: rand(0, 6), dead: 0 });
    }
  }
  // power-up bubbles
  const types = ['magnet', 'shield', 'dbl', 'shield', 'magnet'];
  for (let m = 22; m <= D - 8; m += 40) {
    if (Math.random() < 0.55 + 0.03 * S.lk) {
      orbs.push({ x: rand(40, W - 40), y: m * PX + rand(-60, 60), k: types[rint(0, types.length - 1)], ph: rand(0, 6), got: 0 });
    }
  }
  if (S.dives < 2) { toast('DRAG TO STEER!', '#fff'); toast('AVOID THE JELLYFISH!', '#e6b3ff'); }
}

function finishDive() {
  let sum = 0; newTrophy = false;
  for (const h of hooked) {
    const n = h.f.sp.n;
    sum += h.val;
    if (!S.caught[n]) newTrophy = true;
    S.caught[n] = (S.caught[n] || 0) + 1;
    for (const m of S.ms) {
      if (m.t === 'catch' && m.sp === n) m.p++;
      if (m.t === 'gold' && h.f.gold) m.p++;
    }
  }
  for (const m of S.ms) {
    if (m.t === 'stack' && hooked.length >= m.n) m.p = m.n;
    if (m.t === 'combo' && maxCombo >= m.n) m.p = m.n;
  }
  mbonus = 0; doneMs = 0;
  S.ms = S.ms.map(m => {
    if (m.p >= m.n) { mbonus += m.r; doneMs++; return newMission(); }
    return m;
  });
  earned = sum; S.money += sum + mbonus; S.dives++; save();
  st = 'result'; resT = 0; hook.y = 30;
  if (sum > 0) beep(880, 0.25);
  if (mbonus > 0) setTimeout(() => beep(1100, 0.3), 250);
}

function buy(u) {
  const l = S[u.k];
  if (l >= u.max) return;
  const c = u.cost(l);
  if (S.money < c) { beep(150, 0.15); return; }
  S.money -= c; S[u.k]++; save(); beep(660, 0.15);
}

function claimGift() {
  if (S.gift === today()) { toast('COME BACK TOMORROW!', '#ffd24a'); return; }
  let r = Math.round((80 + 60 * (S.ld + S.lc + S.lv + S.lk)) * rand(1, 2.5));
  if (Math.random() < 0.12) { r *= 5; toast('JACKPOT!', '#ffe14d'); }
  S.money += r; S.gift = today(); save(); beep(900, 0.3);
  toast('DAILY GIFT +$' + fmt(r), '#ffe14d');
}

function dropFish(n, label) {
  n = Math.min(n, hooked.length);
  if (n <= 0) return;
  for (let i = 0; i < n; i++) {
    const h = hooked.pop();
    drops.push({ sp: h.f.sp, gold: h.f.gold, x: hook.x - 6 + h.ox * 0.7, y: hook.y + 30 + h.oy * 0.6, vx: rand(-70, 70), vy: -50, rot: h.r, life: 1.4 });
  }
  floats.push({ x: hook.x - 6, y: hook.y, txt: label, col: '#ff5a5a', life: 1.3 });
}

function hit(h) {
  if (invul > 0 || h.dead) return;
  const x = hook.x - 6, y = hook.y + 30;
  if (P.shield) {
    P.shield = 0; h.dead = 1; invul = 1;
    burst(x, y, '#7fd7ff', 16, 130); toast('SHIELD BROKE!', '#7fd7ff'); beep(300, 0.15);
    return;
  }
  invul = 1.3; shake = 0.5; vib(80); beep(110, 0.25);
  if (h.k === 'mine') { h.dead = 1; burst(x, y, '#ff7a30', 24, 220); } else burst(x, y, '#e6b3ff', 10, 110);
  if (st === 'down') {
    stun = h.k === 'mine' ? 1.3 : 0.9;
    floats.push({ x, y: y - 20, txt: h.k === 'mine' ? 'BOOM!' : 'ZAP!', col: '#ff5a5a', life: 1 });
  } else {
    const n = h.k === 'mine' ? 3 : 2;
    dropFish(n, hooked.length ? '-' + Math.min(n, hooked.length) + ' FISH!' : 'OUCH!');
  }
}

function sharkHit(sh) {
  if (invul > 0) return;
  const x = hook.x - 6, y = hook.y + 30;
  if (P.shield) {
    P.shield = 0; sh.dead = 1; invul = 1.2;
    burst(x, y, '#7fd7ff', 16, 130); toast('SHIELD SAVED YOU!', '#7fd7ff'); beep(300, 0.15);
    return;
  }
  invul = 1.5; shake = 0.7; vib(150); beep(90, 0.35);
  const n = Math.ceil(hooked.length / 2);
  if (n > 0) dropFish(n, 'SHARK ATE ' + n + '!'); else toast('CLOSE CALL!', '#ff9d5a');
}

function update(dt) {
  t += dt;
  shake = Math.max(0, shake - dt * 2.5); invul = Math.max(0, invul - dt); stun = Math.max(0, stun - dt);
  for (const f of floats) { f.life -= dt; f.y -= 35 * dt; }
  floats = floats.filter(f => f.life > 0);
  for (const q of toasts) q.life -= dt;
  toasts = toasts.filter(q => q.life > 0);
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy = p.vy * 0.96 - 20 * dt; p.life -= dt; }
  parts = parts.filter(p => p.life > 0);
  for (const d of drops) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 260 * dt; d.rot += dt * 3; d.life -= dt; }
  drops = drops.filter(d => d.life > 0);

  let fin = false;
  if (st === 'down' || st === 'up') {
    hook.x += (tx - hook.x) * Math.min(1, dt * 8);
    hook.x = clamp(hook.x, 15, W - 15);
    const sf = stun > 0 ? 0.3 : 1;
    if (st === 'down') {
      hook.y += 230 * dt * sf;
      if (hook.y >= maxPx) {
        hook.y = maxPx; st = 'up'; beep(400, 0.1); sharkT = rand(1, 2);
        if (S.dives < 2) toast('NOW HOOK EM ALL!', '#ffe14d');
      }
    } else {
      hook.y -= 150 * dt * sf;
      comboT -= dt; if (comboT < 0) { comboT = 0; if (combo > 0) combo = 0; }
      if (hook.y <= 30) fin = true;
    }
    const cx = hook.x - 6, cy = hook.y + 30;

    // fish
    for (const f of fish) {
      if (f.h) continue;
      f.x += f.vx * dt;
      if (f.x < -60) f.x = W + 60;
      if (f.x > W + 60) f.x = -60;
      let dx = f.x - cx, dy = f.y - cy;
      if (st === 'down') {
        if (!f.sp.still && !f.sch && Math.abs(dy) < 90 && Math.abs(dx) < 70) {
          const sg = Math.sign(dx) || 1;
          f.x += sg * 170 * dt;
          f.vx = Math.abs(f.vx || 40) * sg;
        }
      } else {
        if (P.magnet && hooked.length < cap()) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 170 && d > 1) { f.x -= dx / d * 120 * dt; f.y -= dy / d * 120 * dt; dx = f.x - cx; dy = f.y - cy; }
        }
        if (hooked.length < cap() && dx * dx + dy * dy < Math.pow(f.sp.s * 0.9 + 12 + (P.magnet ? 24 : 0), 2)) catchFish(f, cx, cy);
      }
    }

    // power-up bubbles
    for (const o of orbs) {
      if (o.got) continue;
      const dx = o.x - cx, dy = o.y + Math.sin(t * 2 + o.ph) * 4 - cy;
      if (dx * dx + dy * dy < 30 * 30) {
        o.got = 1; P[o.k] = 1; beep(740, 0.12); vib(20);
        burst(o.x, o.y, '#ffffff', 12, 110);
        floats.push({ x: o.x, y: o.y - 25, txt: o.k === 'magnet' ? 'MAGNET!' : o.k === 'shield' ? 'SHIELD!' : 'DOUBLE CASH!', col: '#ffe14d', life: 1.2 });
      }
    }

    // hazards
    for (const h of hazards) {
      if (h.dead) continue;
      if (h.k === 'jelly') {
        h.x += h.vx * dt; if (h.x < -30) h.x = W + 30; if (h.x > W + 30) h.x = -30;
        h.y += Math.sin(t * 2 + h.ph) * 12 * dt;
      }
      const dx = h.x - cx, dy = h.y - cy;
      if (dx * dx + dy * dy < Math.pow(h.r + 14, 2)) hit(h);
    }

    // shark attacks while rising
    if (st === 'up') {
      sharkT -= dt;
      if (sharkT <= 0) {
        sharkT = rand(3, 5);
        if (sharkN < 2 && hook.y / PX >= 90 && hook.y > 330 && Math.random() < 0.6) {
          sharkN++;
          const dir = Math.random() < 0.5 ? 1 : -1;
          sharks.push({ dir, x: dir > 0 ? -90 : W + 90, y: hook.y - 232 + rand(-20, 20), warn: 1, dead: 0 });
          toast('SHARK ATTACK!', '#ff5a5a'); beep(220, 0.3);
        }
      }
    }
    for (const sh of sharks) {
      if (sh.dead) continue;
      if (sh.warn > 0) { sh.warn -= dt; continue; }
      sh.x += sh.dir * 380 * dt;
      if (sh.x < -160 || sh.x > W + 160) { sh.dead = 1; continue; }
      if (Math.abs(sh.x - cx) < 50 && Math.abs(sh.y - cy) < 26) sharkHit(sh);
    }
    sharks = sharks.filter(s => !s.dead);
  } else if (st === 'result') {
    resT += dt;
    if (resT > 3.2) toMenu();
  }
  if (fin) finishDive();
  const target = (st === 'down' || st === 'up') ? Math.max(-H * 0.42, hook.y - H * 0.5) : -H * 0.42;
  camY += (target - camY) * Math.min(1, dt * 6);
}

function toMenu() { st = 'menu'; hooked = []; hook.x = W / 2; hook.y = 40; tx = W / 2; }

function catchFish(f, cx, cy) {
  f.h = 1;
  combo = comboT > 0 ? combo + 1 : 1;
  comboT = 1.4; if (combo > maxCombo) maxCombo = combo;
  const cm = Math.min(3, 1 + 0.15 * (combo - 1));
  let val = Math.round(f.sp.v * mult() * cm * (P.dbl ? 2 : 1) * (f.gold ? 8 : 1));
  if (f.sp.k === 'chest') {
    const r = Math.random();
    if (r < 0.5) { val *= 3; toast('TREASURE JACKPOT x3!', '#ffe14d'); }
    else if (r < 0.7) { P.shield = 1; toast('TREASURE: FREE SHIELD!', '#7fd7ff'); }
    else if (r < 0.85) { P.magnet = 1; toast('TREASURE: MAGNET!', '#ff7ad9'); }
    else { P.dbl = 1; toast('TREASURE: DOUBLE CASH!', '#ffe14d'); }
  }
  if (f.gold) toast('GOLDEN FISH! x8', '#ffd21f');
  hooked.push({ f, ox: rand(-22, 22), oy: rand(6, 40), r: rand(-1, 1), val });
  floats.push({ x: cx, y: cy - 20, txt: '$' + fmt(val), sub: combo >= 2 ? 'x' + combo : null, tag: f.gold ? 'GOLD!' : (f.sp.rare ? 'RARE!' : ''), life: 1.1 });
  burst(cx, cy, f.gold ? '#ffd21f' : '#ffffff', 6, 90);
  beep(500 + Math.min(combo, 10) * 40, 0.08); vib(12);
}

/* ---------- drawing helpers ---------- */
function txt(s, x, y, size, fill, align, stroke) {
  ctx.font = 'bold ' + size + 'px Impact,"Arial Black",sans-serif';
  ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function poly(pts, fill) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function btn(x, y, w, h, label, fn, size, on) {
  const c1 = on === false ? '#8a8a8a' : '#ffc400', c2 = on === false ? '#666' : '#ff6a00';
  rr(x, y, w, h, 12); ctx.fillStyle = c1; ctx.fill();
  ctx.save(); rr(x, y, w, h, 12); ctx.clip();
  ctx.fillStyle = c2; ctx.fillRect(x, y + h * 0.84, w, h * 0.16);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, w, h * 0.35);
  ctx.restore();
  rr(x, y, w, h, 12); ctx.lineWidth = 3; ctx.strokeStyle = '#ffe066'; ctx.stroke();
  txt(label, x + w / 2, y + h * 0.44, size || h * 0.5, '#000');
  if (fn) btns.push({ x, y, w, h, fn });
}

let silh = false;
const col = c => silh ? '#000' : c;
function drawFish(sp, x, y, dir, k, rot, gold) {
  const s = sp.s, kind = sp.k;
  const C = gold ? '#ffd21f' : sp.c, A = gold ? '#fff3a6' : sp.a;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(dir * k, k);
  if (kind === 'chest') {
    poly([[-s * 0.9, -s * 0.3], [s * 0.9, -s * 0.3], [s * 0.9, s * 0.7], [-s * 0.9, s * 0.7]], col(C));
    poly([[-s * 0.9, -s * 0.3], [s * 0.9, -s * 0.3], [s * 0.7, -s * 0.8], [-s * 0.7, -s * 0.8]], col('#a35a72'));
    poly([[-s * 0.55, -s * 0.8], [-s * 0.3, -s * 0.8], [-s * 0.3, s * 0.7], [-s * 0.55, s * 0.7]], col(A));
    poly([[s * 0.3, -s * 0.8], [s * 0.55, -s * 0.8], [s * 0.55, s * 0.7], [s * 0.3, s * 0.7]], col(A));
    ctx.restore(); return;
  }
  let kx = 1, ky = 0.55;
  if (kind === 'tall') { kx = 0.9; ky = 0.85; }
  if (kind === 'long') { kx = 1.25; ky = 0.4; }
  if (kind === 'flat') { kx = 1.1; ky = 0.45; }
  if (kind === 'sword') { kx = 1.1; ky = 0.4; }
  if (kind === 'angler') { kx = 0.95; ky = 0.8; }
  if (kind === 'whale') { kx = 1.3; ky = 0.7; }
  if (kind === 'shark') { kx = 1.7; ky = 0.5; }
  const rx = s * kx, ry = s * ky;
  poly([[-rx * 0.8, 0], [-rx - s * 0.6, -ry * 0.9], [-rx - s * 0.6, ry * 0.9]], col(A));
  poly([[-rx * 0.3, -ry * 0.8], [rx * 0.1, -ry - s * 0.35], [rx * 0.4, -ry * 0.8]], col(A));
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = col(C); ctx.fill();
  if (kind === 'shark' && !silh) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#e8eef2'; ctx.fillRect(-rx, ry * 0.25, rx * 2, ry);
    ctx.restore();
    poly([[rx * 0.55, ry * 0.2], [rx * 0.75, ry * 0.45], [rx * 0.65, ry * 0.2]], '#fff');
    poly([[rx * 0.75, ry * 0.2], [rx * 0.95, ry * 0.4], [rx * 0.85, ry * 0.2]], '#fff');
  }
  if (kind === 'stripe') {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = col(A);
    ctx.fillRect(-rx * 0.35, -ry, rx * 0.22, ry * 2);
    ctx.fillRect(rx * 0.2, -ry, rx * 0.22, ry * 2);
    ctx.restore();
  }
  if (kind === 'sword') poly([[rx * 0.9, -2], [rx + s * 1.2, 0], [rx * 0.9, 2]], col('#cfd8dc'));
  if (kind === 'lamp') { ctx.beginPath(); ctx.arc(0, -ry - 4, 5, 0, 7); ctx.fillStyle = col(A); ctx.fill(); }
  if (kind === 'angler') {
    ctx.beginPath(); ctx.moveTo(rx * 0.4, -ry * 0.8); ctx.quadraticCurveTo(rx * 0.9, -ry - s * 0.8, rx * 1.2, -ry - s * 0.5);
    ctx.lineWidth = 2; ctx.strokeStyle = col('#222'); ctx.stroke();
    ctx.beginPath(); ctx.arc(rx * 1.2, -ry - s * 0.5, 5, 0, 7); ctx.fillStyle = col(A); ctx.fill();
  }
  if (kind === 'whale') poly([[-rx * 0.2, -ry], [0, -ry - s * 0.4], [rx * 0.2, -ry]], col('#fff2a0'));
  if (!silh) {
    ctx.beginPath(); ctx.arc(rx * 0.55, -ry * 0.2, Math.max(2.5, s * 0.14), 0, 7); ctx.fillStyle = kind === 'shark' ? '#ff4040' : '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(rx * 0.6, -ry * 0.2, Math.max(1.4, s * 0.07), 0, 7); ctx.fillStyle = '#111'; ctx.fill();
  }
  if (gold && !silh) {
    const a = t * 4 + x * 0.1;
    ctx.fillStyle = '#fff';
    const sx = Math.cos(a) * rx * 0.6, sy = Math.sin(a * 1.3) * ry * 0.6, q = 3 + Math.sin(a * 3) * 1.5;
    poly([[sx, sy - q * 1.8], [sx + q * 0.6, sy], [sx, sy + q * 1.8], [sx - q * 0.6, sy]], '#fff');
    poly([[sx - q * 1.8, sy], [sx, sy + q * 0.6], [sx + q * 1.8, sy], [sx, sy - q * 0.6]], '#fff');
  }
  ctx.restore();
}

function drawJelly(h) {
  const x = h.x, y = h.y, p = Math.sin(t * 4 + h.ph) * 2;
  ctx.strokeStyle = 'rgba(214,160,255,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(x + i * 7, y + 4);
    for (let j = 1; j <= 5; j++) ctx.lineTo(x + i * 7 + Math.sin(t * 5 + j + i) * 4, y + 4 + j * 6 + p);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.ellipse(x, y, 20, 15 + p, 0, Math.PI, 0); ctx.closePath();
  ctx.fillStyle = '#c27bff'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - 6, y - 5, 6, 3.5, -0.4, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
}
function drawMine(h) {
  const x = h.x, y = h.y;
  ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); ctx.lineTo(x + Math.cos(a) * 21, y + Math.sin(a) * 21); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fillStyle = '#3a3a48'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = Math.sin(t * 8 + h.ph) > 0 ? '#ff4040' : '#7a1d1d'; ctx.fill();
}
function drawOrb(o) {
  const y = o.y + Math.sin(t * 2 + o.ph) * 4;
  const c = o.k === 'magnet' ? '#ff5ac8' : o.k === 'shield' ? '#4dd2ff' : '#ffd93b';
  ctx.beginPath(); ctx.arc(o.x, y, 21, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(o.x, y, 14, 0, 7); ctx.fillStyle = c; ctx.fill();
  txt(o.k === 'magnet' ? 'M' : o.k === 'shield' ? 'S' : 'x2', o.x, y + 1, o.k === 'dbl' ? 14 : 18, '#fff', 'center', 3);
}

const PAL = [[34, 222, 214], [16, 150, 210], [12, 70, 160], [8, 24, 80], [4, 8, 36]];
function pal(f) {
  f = clamp(f, 0, 1) * (PAL.length - 1);
  const i = Math.min(PAL.length - 2, Math.floor(f)), u = f - i, a = PAL[i], b = PAL[i + 1];
  return 'rgb(' + [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * u)).join(',') + ')';
}

let seed = 7;
function srnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
const decor = [];
for (let y = 250; y < 13000; y += 240) {
  decor.push({ y, left: srnd() < 0.5, w: 40 + srnd() * 90, h: 100 + srnd() * 160, weed: srnd() < 0.6, wx: 30 + srnd() * (W - 60) });
}

function cloud(x, y, k) {
  poly([[x, y + 20 * k], [x + 10 * k, y - 10 * k], [x + 35 * k, y - 25 * k], [x + 60 * k, y - 15 * k], [x + 80 * k, y + 5 * k], [x + 70 * k, y + 25 * k], [x + 30 * k, y + 30 * k]], '#fff7d6');
  poly([[x + 30 * k, y + 30 * k], [x + 70 * k, y + 25 * k], [x + 80 * k, y + 5 * k], [x + 50 * k, y + 12 * k]], '#c5f2d9');
}

function drawBoat() {
  const bob = Math.sin(t * 2) * 3;
  ctx.save(); ctx.translate(130, bob);
  poly([[-100, -40], [100, -48], [78, 8], [-72, 8]], '#a81414');
  poly([[-88, -14], [88, -22], [78, 8], [-72, 8]], '#ff6a14');
  poly([[-100, -40], [100, -48], [100, -42], [-100, -34]], '#d07a3a');
  poly([[-45, -38], [-40, -72], [-10, -80], [5, -45]], '#2b3f9c');
  poly([[-38, -92], [-5, -92], [-10, -70], [-30, -70]], '#ffffff');
  poly([[-4, -90], [6, -90], [6, -82], [-4, -82]], '#ff4fa3');
  poly([[-48, -98], [-25, -118], [0, -112], [20, -98]], '#ffc800');
  ctx.beginPath(); ctx.moveTo(-10, -60); ctx.lineTo(95, -145); ctx.lineWidth = 5; ctx.strokeStyle = '#111'; ctx.stroke();
  ctx.restore();
}

function drawHook() {
  const bob = Math.sin(t * 2) * 3;
  const blink = invul > 0 && Math.floor(t * 14) % 2 === 0;
  ctx.strokeStyle = blink ? '#ff5a5a' : '#111'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(225, -145 + bob); ctx.lineTo(hook.x, hook.y); ctx.stroke();
  ctx.beginPath(); ctx.arc(hook.x, hook.y, 5, 0, 7); ctx.lineWidth = 2; ctx.stroke();
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hook.x, hook.y + 5); ctx.lineTo(hook.x, hook.y + 32);
  ctx.bezierCurveTo(hook.x, hook.y + 48, hook.x - 26, hook.y + 48, hook.x - 26, hook.y + 30);
  ctx.lineTo(hook.x - 20, hook.y + 34); ctx.stroke();
  ctx.lineCap = 'butt';
  if (P.shield && (st === 'down' || st === 'up')) {
    ctx.beginPath(); ctx.arc(hook.x - 6, hook.y + 28, 34, 0, 7);
    ctx.fillStyle = 'rgba(100,210,255,0.18)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(140,225,255,0.9)'; ctx.stroke();
  }
  if (P.magnet && st === 'up') {
    ctx.beginPath(); ctx.arc(hook.x - 6, hook.y + 28, 50 + Math.sin(t * 6) * 4, 0, 7);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,120,220,0.6)'; ctx.setLineDash([6, 8]); ctx.stroke(); ctx.setLineDash([]);
  }
}

function drawHooked() {
  const p = st === 'result' ? clamp(resT / 1.0, 0, 1) : 0;
  for (const h of hooked) {
    const bx = hook.x - 6 + h.ox * 0.7, by = hook.y + 30 + h.oy * 0.6;
    const x = lerp(bx, 130, p), y = lerp(by, -30, p);
    const dir = h.f.vx < 0 ? -1 : 1;
    drawFish(h.f.sp, x, y + Math.sin(t * 8 + h.r * 5) * 2, dir, 0.8 * (1 - 0.5 * p), h.r, h.f.gold);
  }
}

function drawWorld() {
  const sy = -camY;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, pal(camY / RANGE)); g.addColorStop(1, pal((camY + H) / RANGE));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (sy > 0) {
    const sg = ctx.createLinearGradient(0, 0, 0, sy);
    sg.addColorStop(0, '#12d6e0'); sg.addColorStop(1, '#35ffd2');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, Math.min(H, sy));
  }
  ctx.save(); ctx.translate(0, -camY);
  if (sy > 0) { cloud(20, -310, 1.2); cloud(300, -250, 1); cloud(170, -170, 0.7); }
  for (const d of decor) {
    if (d.y < camY - 300 || d.y > camY + H + 100) continue;
    ctx.globalAlpha = 0.2;
    if (d.left) poly([[0, d.y], [d.w, d.y + d.h * 0.3], [d.w * 0.7, d.y + d.h], [0, d.y + d.h + 40]], '#000');
    else poly([[W, d.y], [W - d.w, d.y + d.h * 0.3], [W - d.w * 0.7, d.y + d.h], [W, d.y + d.h + 40]], '#000');
    ctx.globalAlpha = 1;
    if (d.weed) {
      ctx.strokeStyle = 'rgba(150,120,255,0.55)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const yy = d.y + 90 - i * 9, xx = d.wx + Math.sin(i * 0.9 + t * 1.5) * 9;
        if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
      }
      ctx.stroke(); ctx.lineCap = 'butt';
    }
  }
  for (const f of fish) {
    if (f.h || f.y < camY - 90 || f.y > camY + H + 90) continue;
    drawFish(f.sp, f.x, f.y, f.vx < 0 ? -1 : 1, 1, 0, f.gold);
  }
  for (const o of orbs) if (!o.got && o.y > camY - 40 && o.y < camY + H + 40) drawOrb(o);
  for (const h of hazards) {
    if (h.dead || h.y < camY - 50 || h.y > camY + H + 50) continue;
    if (h.k === 'jelly') drawJelly(h); else drawMine(h);
  }
  for (const sh of sharks) {
    if (sh.warn > 0) {
      const a = 0.12 + 0.1 * Math.sin(t * 16);
      ctx.fillStyle = 'rgba(255,40,40,' + a + ')'; ctx.fillRect(0, sh.y - 28, W, 56);
      const wx = sh.dir > 0 ? 30 : W - 30;
      poly([[wx, sh.y - 24], [wx + 22, sh.y + 16], [wx - 22, sh.y + 16]], '#ff3030');
      txt('!', wx, sh.y + 4, 24, '#fff');
    } else drawFish(SHARK, sh.x, sh.y, sh.dir, 1, 0, 0);
  }
  if (sy > -200) drawBoat();
  ctx.beginPath(); ctx.moveTo(0, 0);
  for (let x = 0; x <= W + 30; x += 30) ctx.lineTo(x, Math.sin(x * 0.05 + t * 2) * 4 + (((x / 30) | 0) % 2 ? -3 : 3));
  ctx.lineTo(W, 40); ctx.lineTo(0, 40); ctx.closePath(); ctx.fillStyle = 'rgba(190,255,255,0.35)'; ctx.fill();
  drawHook(); drawHooked();
  for (const d of drops) {
    ctx.globalAlpha = clamp(d.life, 0, 1);
    drawFish(d.sp, d.x, d.y, d.vx < 0 ? -1 : 1, 0.8, d.rot, d.gold);
    ctx.globalAlpha = 1;
  }
  for (const p of parts) {
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = p.c; ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of floats) {
    ctx.globalAlpha = clamp(f.life * 2, 0, 1);
    txt(f.txt, f.x, f.y, 28, f.col || '#fff', 'center', 5);
    if (f.sub) txt(f.sub, f.x - 46, f.y + 2, 24, '#ffe14d', 'center', 4);
    if (f.tag) txt(f.tag, f.x + 30, f.y + 22, 20, '#ffe14d', 'center', 4);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawToasts() {
  toasts.forEach((q, i) => {
    ctx.globalAlpha = clamp(q.life * 2, 0, 1);
    txt(q.txt, W / 2, H * 0.36 + i * 38, 30, q.col, 'center', 6);
  });
  ctx.globalAlpha = 1;
}

function drawIconBtn(x, y, draw, fn) {
  rr(x, y, 56, 44, 6); ctx.fillStyle = '#a31419'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#6e0d12'; ctx.stroke();
  draw(x + 28, y + 22);
  btns.push({ x, y, w: 56, h: 44, fn });
}

function drawMenuUI() {
  const y0 = H - 400;
  ctx.fillStyle = '#6e0d12'; ctx.fillRect(0, y0, W, 400);
  ctx.fillStyle = '#ff6a00'; ctx.fillRect(0, y0, W, 10);
  UP.forEach((u, i) => {
    const y = y0 + 22 + i * 62, l = S[u.k], maxed = l >= u.max, c = u.cost(l);
    rr(20, y, W - 40, 52, 10); ctx.fillStyle = '#a31419'; ctx.fill();
    txt(u.name + '  Lv' + (l + 1), 34, y + 18, 17, '#fff', 'left');
    txt(u.info(l) + (maxed ? '' : '  >  ' + u.info(l + 1)), 34, y + 38, 15, '#ffd24a', 'left');
    btn(W - 150, y + 6, 120, 40, maxed ? 'MAX' : '$' + fmt(c), maxed ? null : () => buy(u), 22, !maxed && S.money >= c);
  });
  btn(22, H - 110, W - 44, 90, 'GO FISH!', startDive, 56);

  drawIconBtn(20, 20, (x, y) => drawFish(SP[1], x, y, 1, 0.9, 0), () => { st = 'trophy'; tro.y = 0; });
  const ready = S.gift !== today();
  drawIconBtn(W - 142, 20, (x, y) => {
    const k = ready ? 1 + 0.12 * Math.sin(t * 6) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    poly([[-11, -2], [11, -2], [11, 12], [-11, 12]], ready ? '#ffc400' : '#777');
    poly([[-13, -8], [13, -8], [13, -2], [-13, -2]], ready ? '#ff6a00' : '#555');
    poly([[-2, -8], [2, -8], [2, 12], [-2, 12]], ready ? '#d41515' : '#444');
    ctx.restore();
  }, claimGift);
  drawIconBtn(W - 76, 20, (x, y) => {
    poly([[x - 12, y - 5], [x - 5, y - 5], [x + 3, y - 12], [x + 3, y + 12], [x - 5, y + 5], [x - 12, y + 5]], '#ff4040');
    if (S.mute) { ctx.strokeStyle = '#ffc400'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x + 15, y + 7); ctx.moveTo(x + 15, y - 7); ctx.lineTo(x + 7, y + 7); ctx.stroke(); }
    else { ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x + 4, y, 8, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 4, y, 14, -0.9, 0.9); ctx.stroke(); }
  }, () => { S.mute = S.mute ? 0 : 1; save(); });

  // missions
  ctx.globalAlpha = 0.6; rr(14, 80, W - 28, 92, 10); ctx.fillStyle = '#04202e'; ctx.fill(); ctx.globalAlpha = 1;
  S.ms.forEach((m, i) => {
    const y = 98 + i * 28;
    txt(missionText(m), 24, y, 15, '#fff', 'left');
    if (m.t === 'catch' && m.n > 1) txt(m.p + '/' + m.n, W - 96, y, 15, '#9fe8ff', 'right');
    txt('$' + fmt(m.r), W - 24, y, 15, '#ffd24a', 'right');
  });
  txt('TAP TO START FISHING!', W / 2, H * 0.28, 28, '#fff', 'center', 6);
}

function drawTrophy() {
  ctx.fillStyle = '#7a0d12'; ctx.fillRect(0, 0, W, H);
  const rows = Math.ceil(SP.length / 2);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 70, W, H - 130); ctx.clip();
  SP.forEach((sp, i) => {
    const cx = 15 + (i % 2) * 230, cy = 90 + Math.floor(i / 2) * 175 - tro.y;
    if (cy < -150 || cy > H) return;
    rr(cx, cy, 205, 125, 10); ctx.fillStyle = '#d41515'; ctx.fill();
    ctx.fillStyle = '#ffc400';
    [[8, 8], [197, 8], [8, 117], [197, 117]].forEach(p => { ctx.beginPath(); ctx.arc(cx + p[0], cy + p[1], 4, 0, 7); ctx.fill(); });
    silh = !S.caught[sp.n];
    drawFish(sp, cx + 102, cy + 62, 1, Math.min(2.2, 55 / sp.s), 0);
    silh = false;
    rr(cx + 15, cy + 130, 175, 30, 4); ctx.fillStyle = '#ffb400'; ctx.fill();
    txt(S.caught[sp.n] ? sp.n + ' x' + S.caught[sp.n] : '???', cx + 102, cy + 146, 17, '#6e0d12');
  });
  ctx.restore();
  ctx.fillStyle = '#a81316'; ctx.fillRect(0, 0, W, 70);
  txt('TROPHY ROOM', W / 2, 36, 34, '#ffc400');
  poly([[48, 20], [48, 50], [22, 35]], '#ffc400');
  btns.push({ x: 0, y: 0, w: 80, h: 70, fn: () => { st = 'menu'; } });
  ctx.fillStyle = '#a81316'; ctx.fillRect(0, H - 60, W, 60);
  const got = SP.filter(s => S.caught[s.n]).length;
  txt('COLLECTED ' + got + ' / ' + SP.length, W / 2, H - 30, 26, '#ffc400');
  tro.max = Math.max(0, 90 + rows * 175 + 10 - (H - 60));
}

function drawDiveUI() {
  txt('$' + fmt(S.money), W / 2, 50, 52, '#fff', 'center', 8);
  txt(hooked.length + '/' + cap(), 20, 110, 30, '#fff', 'left', 6);
  if (st === 'up' && combo >= 2 && comboT > 0) {
    const k = 1 + 0.15 * Math.sin(t * 20);
    ctx.save(); ctx.translate(W - 20, 112); ctx.scale(k, k);
    txt('COMBO x' + combo, 0, 0, 30, '#ffe14d', 'right', 6);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,225,77,0.9)'; ctx.fillRect(W - 20 - 110 * (comboT / 1.4), 132, 110 * (comboT / 1.4), 5);
  }
  let cxp = 34;
  [['magnet', 'M', '#ff5ac8'], ['shield', 'S', '#4dd2ff'], ['dbl', 'x2', '#ffd93b']].forEach(a => {
    if (!P[a[0]]) return;
    ctx.beginPath(); ctx.arc(cxp, 152, 17, 0, 7); ctx.fillStyle = a[2]; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    txt(a[1], cxp, 153, 15, '#fff', 'center', 3);
    cxp += 42;
  });
  const sy = hook.y - camY + 12;
  ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(W * 0.55, sy); ctx.lineTo(W * 0.92, sy); ctx.stroke(); ctx.setLineDash([]);
  txt(Math.round(hook.y / PX) + 'm', W * 0.92, sy - 22, 34, '#fff', 'right');
  btn(22, H - 110, W - 44, 90, st === 'down' ? 'GO DEEP!' : 'HOOK EM ALL!', null, 52);
}

function drawResult() {
  txt('$' + fmt(S.money), W / 2, 50, 52, '#fff', 'center', 8);
  const y = H * 0.28;
  txt('+$' + fmt(earned), W / 2, y, 64, '#ffe14d', 'center', 8);
  txt(hooked.length + ' FISH CAUGHT', W / 2, y + 50, 26, '#fff', 'center', 5);
  let yy = y + 86;
  if (maxCombo >= 3) { txt('BEST COMBO x' + maxCombo, W / 2, yy, 24, '#ffe14d', 'center', 5); yy += 34; }
  if (newTrophy) { txt('NEW TROPHY!', W / 2, yy, 28, '#ff8fc7', 'center', 6); yy += 38; }
  if (mbonus > 0) txt('MISSION COMPLETE!  +$' + fmt(mbonus), W / 2, yy, 26, '#7fffb0', 'center', 6);
}

function draw() {
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  btns.length = 0;
  if (st === 'trophy') { drawTrophy(); return; }
  if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);
  drawWorld();
  if (st === 'menu') { txt('$' + fmt(S.money), W / 2, 50, 52, '#fff', 'center', 8); drawMenuUI(); }
  else if (st === 'result') drawResult();
  else drawDiveUI();
  drawToasts();
}

/* ---------- input ---------- */
let pressed = false, lastY = 0;
function pt(e) { return { x: e.clientX / innerWidth * W, y: e.clientY / innerHeight * H }; }
cv.addEventListener('pointerdown', e => {
  const p = pt(e); pressed = true; lastY = p.y;
  try { if (ac && ac.state === 'suspended') ac.resume(); } catch (er) {}
  for (let i = btns.length - 1; i >= 0; i--) {
    const b = btns[i];
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { b.fn(); pressed = false; return; }
  }
  if (st === 'result' && resT > 0.8) { toMenu(); pressed = false; return; }
  if (st === 'menu' && p.y < H - 400 && p.y > 175) startDive();
  else if (st === 'down' || st === 'up') tx = p.x;
});
cv.addEventListener('pointermove', e => {
  if (!pressed) return;
  const p = pt(e);
  if (st === 'down' || st === 'up') tx = p.x;
  else if (st === 'trophy') { tro.y = clamp(tro.y - (p.y - lastY), 0, tro.max || 0); lastY = p.y; }
});
addEventListener('pointerup', () => { pressed = false; });
addEventListener('pointercancel', () => { pressed = false; });

/* ---------- loop ---------- */
let last = performance.now();
function loop(n) {
  const dt = Math.min(0.05, (n - last) / 1000); last = n;
  update(dt); draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
