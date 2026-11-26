'use strict';
/* Deep Catch v3 - game state & rules */
let st = 'menu', fade = 0, scrollY = 0, scrollMax = 0;
const hook = { x: W / 2, y: 40, hv: 0 };
let tx = W / 2, fish = [], hooked = [], floats = [], toasts = [], parts = [], drops = [], orbs = [], hazards = [], sharks = [], rapids = [], rings = [], flyers = [], chips = [];
let camY = -H * 0.42, t = 0, resT = 0, maxPx = 600;
let AP = {}, boostE = 0, combo = 0, comboT = 0, maxCombo = 0, stun = 0, tangle = 0, invul = 0, shake = 0, flash = 0;
let hp = 3, hpMax = 3, hurtT = 0, healT = 0, sharkT = 2, sharkN = 0, zoneIdx = 0, banner = null, dmgTaken = 0, vyNow = 200, rebirthArm = 0;
let res = {}, dispMoney = S.money;
const ambient = [], bubbles = [];
for (let i = 0; i < 7; i++) {
  const sp = SP[rint(0, 4)];
  ambient.push({ sp, x: rand(0, W), y: rand(120, 520), vx: (Math.random() < 0.5 ? -1 : 1) * rand(14, 40), ph: rand(0, 6), k: rand(0.9, 1.3) });
}
for (let i = 0; i < 26; i++) bubbles.push({ x: rand(0, W), y: rand(0, 1000), r: rand(1.5, 4), s: rand(14, 40), ph: rand(0, 6) });

function toast(s, c) { toasts.push({ txt: s, col: c || '#fff', life: 2.2, age: 0 }); if (toasts.length > 3) toasts.shift(); }
function burst(x, y, c, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(spd * 0.3, spd);
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.95), l0: 0.95, c, r: rand(2, 4.5) });
  }
}
function ring(x, y, c, max, w) { rings.push({ x, y, c, r: 6, max, life: 0.6, l0: 0.6, w: w || 3 }); }

function pickW(pool) {
  let tot = 0;
  const w = s => s.rare ? 0.35 * (1 + 0.15 * S.lk) : 1;
  for (const s of pool) tot += w(s);
  let r = Math.random() * tot;
  for (const s of pool) { r -= w(s); if (r <= 0) return s; }
  return pool[0];
}
function mkFish(sp, x, y, vx, sch) {
  return { sp, x, y, vx: sp.still ? 0 : vx, h: 0, sch: sch || 0, ph: rand(0, 6), pulled: 0, gold: (!sp.still && Math.random() < 0.04 + 0.015 * S.lk) ? 1 : 0 };
}
function mkHaz(k, x, y) {
  const h = { k, x, y, vx: 0, r: 15, ph: rand(0, 6), dead: 0 };
  if (k === 'jelly') { h.r = 18; h.vx = rand(-30, 30); }
  if (k === 'puffer') { h.r = 13; h.base = 13; h.vx = rand(-20, 20); }
  if (k === 'lure') { h.r = 12; }
  if (k === 'kelp') { h.h = rint(130, 210); h.r = 0; }
  if (k === 'eel') { h.side = Math.random() < 0.5 ? -1 : 1; h.reach = rand(0.5, 0.72) * W; h.s = 'idle'; h.ext = 0; h.tm = 0; h.r = 0; h.x = h.side < 0 ? 0 : W; }
  return h;
}

/* ---------- dive setup ---------- */
function startDive() {
  go('down');
  hook.x = W / 2; hook.y = 40; hook.hv = 0; tx = W / 2;
  hooked = []; fish = []; floats = []; orbs = []; hazards = []; sharks = []; drops = []; parts = []; rapids = []; rings = []; flyers = []; chips = [];
  AP = {}; boostE = 0; combo = 0; comboT = 0; maxCombo = 0; stun = 0; tangle = 0; invul = 0; shake = 0; flash = 0; dmgTaken = 0;
  hpMax = maxHp(); hp = hpMax; hurtT = 0; healT = 0; zoneIdx = 0; banner = null; sharkN = 0; sharkT = rand(1, 2);
  const D = depthMax(); maxPx = D * PX;
  const dens = Math.min(3, 1 + 0.1 * S.pearls) * ((typeof DENS_OVR !== 'undefined') ? DENS_OVR : 1);
  const ZD = [1.9, 1.4, 0.95, 0.7, 0.6];

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
      const f = mkFish(sp, rand(0, W), clamp(m * PX + rand(-25, 25), 60, maxPx - 30), dir * rand(30, 70) * spd, 0);
      fish.push(f);
      if (sp.rare && Math.random() < 0.65 && m > 40) {
        const gk = m >= 300 ? (Math.random() < 0.5 ? 'mine' : 'puffer') : (m >= 100 ? 'puffer' : 'jelly');
        hazards.push(mkHaz(gk, clamp(f.x + rand(-55, 55), 30, W - 30), f.y + rand(-45, 45)));
      }
    }
  }

  const HZ = {
    jelly: [0.24, 0.2, 0.17, 0.15, 0.14],
    puffer: [0, 0.12, 0.12, 0.1, 0.1],
    kelp: [0, 0.32, 0.1, 0, 0],
    mine: [0, 0, 0.22, 0.24, 0.26],
    eel: [0, 0, 0.13, 0.16, 0.2],
    lure: [0, 0, 0, 0.14, 0.18]
  };
  for (let m = 24; m <= D - 6; m += 14) {
    const z = zoneAt(m);
    for (const k in HZ) {
      if (Math.random() < HZ[k][z] * dens * ZD[z]) {
        const y = m * PX + rand(-60, 60);
        if (k === 'eel') hazards.push(mkHaz('eel', 0, y));
        else hazards.push(mkHaz(k, rand(30, W - 30), y));
      }
    }
  }
  for (let m = 130; m < D - 25;) {
    if (Math.random() < 0.7) rapids.push({ y0: m * PX, y1: m * PX + rint(170, 290), v: (Math.random() < 0.5 ? -1 : 1) * rand(190, 330) * (1 + m / 2500) });
    m += rint(55, 115);
  }
  const types = ['magnet', 'shield', 'dbl', 'shield', 'magnet', 'turbo', 'turbo', 'heal'];
  for (let m = 22; m <= D - 8; m += 40) {
    if (Math.random() < 0.5 + 0.03 * S.lk) {
      let k = types[rint(0, types.length - 1)];
      if (k === 'heal' && hpMax >= 9) k = 'shield';
      orbs.push({ x: rand(40, W - 40), y: m * PX + rand(-60, 60), k, ph: rand(0, 6), got: 0 });
    }
  }
  if (S.streak >= 2) { AP.shield = 1; addChip('shield').show = true; toast('LUCKY CHARM: FREE SHIELD!', '#7fe3ff'); }
  if (S.dives < 2) { toast('DRAG TO STEER!', '#fff'); toast('DODGE THE HAZARDS!', '#e6b3ff'); }
  banner = { n: ZONES[0].n, sub: ZONES[0].sub, t: 0 };
}

function go(s) { st = s; fade = 1; scrollY = 0; rebirthArm = 0; }
function toMenu() { hooked = []; hook.x = W / 2; hook.y = 40; hook.hv = 0; tx = W / 2; chips = []; flyers = []; AP = {}; go('menu'); }

/* ---------- speeds & currents ---------- */
function vDown() { return (200 + 0.3 * depthMax()) * Math.min(1, 0.45 + hook.y / 400); }
function vUp() { return (150 + 0.12 * depthMax()) * reel() * Math.max(0.6, 1 - 0.018 * hooked.length); }
function currentAt(y) {
  for (const b of rapids) {
    if (y >= b.y0 && y <= b.y1) return b.v * Math.min(1, (y - b.y0) / 40, (b.y1 - y) / 40);
  }
  return 0;
}

/* ---------- power-ups ---------- */
const chipX = i => 30 + i * 50;
function addChip(k) {
  let c = chips.find(c => c.k === k && !c.out);
  if (c) return c;
  c = { k, x: chipX(chips.length), y: 104, pop: 0, show: false, out: 0, os: 1 };
  chips.push(c);
  return c;
}
function expireChip(k) { const c = chips.find(c => c.k === k && !c.out); if (c) c.out = 1; }
function collectOrb(o) {
  o.got = 1;
  const k = o.k, P = PU[k], sy = o.y - camY;
  sfx.power(); vib(20);
  burst(o.x, o.y, P.c, 16, 150); ring(o.x, o.y, P.c, 70, 4); ring(o.x, o.y, '#ffffff', 40, 2);
  if (k === 'heal') {
    hp = Math.min(hpMax, hp + 1);
    flyers.push({ x0: o.x, y0: sy, k, t: 0, dur: 0.6, heal: 1 });
    floats.push({ x: o.x, y: o.y - 25, txt: 'REPAIRED!', col: P.c, life: 1.2 });
    return;
  }
  if (k === 'shield') AP.shield = 1; else AP[k] = P.dur;
  if (k === 'turbo') sfx.turbo();
  const c = addChip(k);
  flyers.push({ x0: o.x, y0: sy, k, t: 0, dur: 0.65, chip: c });
  floats.push({ x: o.x, y: o.y - 25, txt: P.n + '!', col: P.c, life: 1.2 });
}

/* ---------- damage ---------- */
function dropFish(n, label) {
  n = Math.min(n, hooked.length);
  if (n <= 0) return;
  for (let i = 0; i < n; i++) {
    const h = hooked.pop();
    drops.push({ sp: h.f.sp, gold: h.f.gold, x: h.px, y: h.py, vx: rand(-80, 80), vy: -60, rot: h.r, life: 1.5, ph: h.f.ph });
  }
  floats.push({ x: hook.x - 6, y: hook.y, txt: label, col: '#ff5a5a', life: 1.3 });
}
function damage(n) {
  if (invul > 0) return false;
  const x = hook.x - 6, y = hook.y + 30;
  if (AP.shield) {
    delete AP.shield; expireChip('shield'); invul = 1;
    sfx.shield(); vib(40); ring(x, y, '#7fe3ff', 100, 5); ring(x, y, '#ffffff', 60, 2); burst(x, y, '#7fe3ff', 26, 230);
    toast('SHIELD BROKE!', '#7fe3ff'); shake = 0.25;
    return false;
  }
  hp -= n; hurtT = 0.5; dmgTaken += n; invul = 1.15; shake = 0.55; flash = 1; vib(90); sfx.hit();
  if (hp <= 0) { hp = 0; snapLine(); return false; }
  return true;
}
function hit(h) {
  if (h.dead || invul > 0) return;
  const x = hook.x - 6, y = hook.y + 30;
  const shielded = !!AP.shield;
  const ok = damage(h.k === 'mine' ? 1 : 1);
  if (shielded) { if (h.k !== 'eel') h.dead = 1; return; }
  if (!ok) return;
  if (h.k === 'mine') { h.dead = 1; sfx.boom(); ring(x, y, '#ff9a40', 120, 6); burst(x, y, '#ff7a30', 30, 260); }
  else burst(x, y, h.k === 'jelly' ? '#e6b3ff' : '#ffffff', 10, 110);
  const wasDown = st === 'down';
  if (wasDown) {
    stun = h.k === 'mine' ? 1.2 : (h.k === 'eel' ? 0.8 : 0.7);
    floats.push({ x, y: y - 20, txt: h.k === 'mine' ? 'BOOM!' : 'ZAP!', col: '#ff5a5a', life: 1 });
  } else {
    const n = h.k === 'mine' || h.k === 'eel' ? 2 : 1;
    dropFish(n, hooked.length ? '-' + Math.min(n, hooked.length) + ' FISH!' : 'OUCH!');
  }
}
function sharkHit(sh) {
  if (invul > 0) return;
  const shielded = !!AP.shield;
  const ok = damage(1);
  if (shielded) { sh.dead = 1; return; }
  if (!ok) return;
  const n = Math.ceil(hooked.length / 2);
  if (n > 0) dropFish(n, 'SHARK ATE ' + n + '!'); else toast('CLOSE CALL!', '#ff9d5a');
}
function snapLine() {
  let lostVal = 0;
  for (const h of hooked) lostVal += h.val;
  res = { failed: true, lost: hooked.length, earned: Math.round(lostVal * 0.15), mbonus: 0, fish: 0, combo: maxCombo, newT: false };
  for (const h of hooked) drops.push({ sp: h.f.sp, gold: h.f.gold, x: h.px, y: h.py, vx: rand(-120, 120), vy: rand(-140, -40), rot: h.r, life: 1.6, ph: h.f.ph });
  hooked = [];
  burst(hook.x - 6, hook.y + 30, '#ffffff', 30, 260);
  ring(hook.x - 6, hook.y + 30, '#ff5a5a', 130, 6);
  sfx.snap(); vib(260); shake = 1; flash = 1;
  st = 'snap'; resT = 0;
  toast('LINE SNAPPED!', '#ff5a5a');
}

/* ---------- end of dive ---------- */
function finishDive() {
  let sum = 0, newT = false;
  for (const h of hooked) {
    const n = h.f.sp.n;
    sum += h.val;
    if (!S.caught[n]) newT = true;
    S.caught[n] = (S.caught[n] || 0) + 1;
    for (const m of S.ms) {
      if (m.t === 'catch' && m.sp === n) m.p++;
      if (m.t === 'gold' && h.f.gold) m.p++;
    }
  }
  for (const m of S.ms) {
    if (m.t === 'stack' && hooked.length >= m.n) m.p = m.n;
    if (m.t === 'combo' && maxCombo >= m.n) m.p = m.n;
    if (m.t === 'flawless' && dmgTaken === 0 && hooked.length > 0) m.p = 1;
  }
  let mbonus = 0, doneMs = 0;
  S.ms = S.ms.map(m => {
    if (m.p >= m.n) { mbonus += m.r; doneMs++; return newMission(); }
    return m;
  });
  res = { failed: false, earned: sum, mbonus, doneMs, fish: hooked.length, combo: maxCombo, newT, flawless: dmgTaken === 0 };
  S.streak = 0;
  S.money += sum + mbonus; S.dives++; S.best = Math.max(S.best || 0, depthMax()); save();
  AP = {}; chips = []; flyers = [];
  st = 'result'; resT = 0; hook.y = 30; fade = 0.6;
  if (sum > 0) sfx.sell();
}
function finishSnap() {
  S.streak = (S.streak || 0) + 1;
  S.money += res.earned; S.dives++; save();
  st = 'result'; resT = 0; hook.y = 30; fade = 0.6; chips = []; flyers = []; AP = {};
}

/* ---------- shop actions ---------- */
function buy(u) {
  const l = S[u.k];
  if (l >= u.max) return;
  const c = u.cost(l);
  if (S.money < c) { sfx.deny(); return; }
  S.money -= c; S[u.k]++; save(); sfx.buy(); vib(15);
  if (u.k === 'ld') for (const m of S.ms) if (m.t === 'catch') { /* keep */ }
}
function canRebirth() { return S.ld >= REBIRTH_LD; }
function rebirth() {
  if (!canRebirth()) return;
  if (!rebirthArm) { rebirthArm = 3; sfx.warn(); return; }
  S.pearls++; S.money = 0; S.ld = S.lc = S.lv = S.lk = S.ls = S.lr = 0;
  S.ms = []; ensureMissions(); save(); rebirthArm = 0; sfx.sell();
  toast('REBORN! PEARL x' + S.pearls, '#ffe9a8'); dispMoney = 0;
}
function claimGift() {
  if (S.gift === today()) { toast('COME BACK TOMORROW!', '#ffd24a'); sfx.deny(); return; }
  let r = Math.round((80 + 80 * (S.ld + S.lc + S.lv + S.lk + S.ls + S.lr)) * rand(1, 2.5) * (1 + S.pearls * 0.4));
  if (Math.random() < 0.12) { r *= 5; toast('JACKPOT!', '#ffe14d'); }
  S.money += r; S.gift = today(); save(); sfx.sell();
  toast('DAILY GIFT +$' + fmt(r), '#ffe14d');
}
function affordable() { return UP.some(u => S[u.k] < u.max && S.money >= u.cost(S[u.k])); }

/* ---------- catching ---------- */
function catchFish(f, cx, cy) {
  f.h = 1;
  combo = comboT > 0 ? combo + 1 : 1;
  comboT = 1.4; if (combo > maxCombo) maxCombo = combo;
  const cm = Math.min(3, 1 + 0.15 * (combo - 1));
  let val = Math.round(f.sp.v * mult() * cm * (AP.dbl ? 2 : 1) * (f.gold ? 8 : 1));
  if (f.sp.ex === 'chest') {
    const r = Math.random();
    if (r < 0.5) { val *= 3; toast('TREASURE JACKPOT x3!', '#ffe14d'); }
    else if (r < 0.7) { AP.shield = 1; addChip('shield').show = true; toast('TREASURE: FREE SHIELD!', '#7fe3ff'); }
    else if (r < 0.85) { AP.magnet = PU.magnet.dur; addChip('magnet').show = true; toast('TREASURE: MAGNET!', '#ff7ad9'); }
    else { AP.turbo = PU.turbo.dur; addChip('turbo').show = true; toast('TREASURE: TURBO!', '#ff8a3d'); }
  }
  if (f.gold) toast('GOLDEN FISH! x8', '#ffd21f');
  hooked.push({ f, ox: rand(-24, 24), oy: rand(4, 42), r: rand(-0.8, 0.8), val, a: 0, sx: f.x, sy: f.y, px: f.x, py: f.y });
  floats.push({ x: cx, y: cy - 20, txt: '$' + fmt(val), sub: combo >= 2 ? 'x' + combo : null, tag: f.gold ? 'GOLD!' : (f.sp.rare ? 'RARE!' : ''), life: 1.1 });
  ring(cx, cy, f.gold ? '#ffd21f' : '#ffffff', 36, 3);
  burst(cx, cy, f.gold ? '#ffd21f' : '#ffffff', 7, 100);
  sfx.catch(combo); vib(12);
}

/* ---------- main update ---------- */
function update(dt) {
  t += dt;
  shake = Math.max(0, shake - dt * 2.5); invul = Math.max(0, invul - dt); stun = Math.max(0, stun - dt);
  flash = Math.max(0, flash - dt * 2.2); hurtT = Math.max(0, hurtT - dt); healT = Math.max(0, healT - dt * 2);
  fade = Math.max(0, fade - dt * 3);
  if (rebirthArm > 0) { rebirthArm -= dt; if (rebirthArm < 0) rebirthArm = 0; }
  dispMoney += (S.money - dispMoney) * Math.min(1, dt * 7);
  if (Math.abs(S.money - dispMoney) < 0.6) dispMoney = S.money;

  for (const f of floats) { f.life -= dt; f.y -= 35 * dt; }
  floats = floats.filter(f => f.life > 0);
  for (const q of toasts) { q.life -= dt; q.age += dt; }
  toasts = toasts.filter(q => q.life > 0);
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy = p.vy * 0.96 - 18 * dt; p.life -= dt; }
  parts = parts.filter(p => p.life > 0);
  for (const d of drops) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 280 * dt; d.rot += dt * 3; d.life -= dt; }
  drops = drops.filter(d => d.life > 0);
  for (const r of rings) { r.life -= dt; r.r = lerp(r.max, 6, Math.pow(Math.max(r.life, 0) / r.l0, 1.6)); }
  rings = rings.filter(r => r.life > 0);
  if (banner) { banner.t += dt; if (banner.t > 2.8) banner = null; }
  for (const b of bubbles) { b.y -= b.s * dt; b.x += Math.sin(t + b.ph) * 8 * dt; if (b.y < -10) { b.y = 1000; b.x = rand(0, W); } }

  // chips and flyers
  let slot = 0;
  for (const c of chips) {
    if (c.out) { c.os -= dt * 4; continue; }
    c.x += (chipX(slot) - c.x) * Math.min(1, dt * 12); slot++;
    c.pop = Math.max(0, c.pop - dt * 3);
  }
  chips = chips.filter(c => c.os > 0);
  for (const f of flyers) {
    f.t += dt / f.dur;
    if (f.t >= 1 && !f.done) {
      f.done = 1;
      if (f.heal) { healT = 1; } else if (f.chip) { f.chip.show = true; f.chip.pop = 1; }
    }
  }
  flyers = flyers.filter(f => f.t < 1.05);

  for (const a of ambient) { a.x += a.vx * dt; if (a.x < -80) a.x = W + 80; if (a.x > W + 80) a.x = -80; }

  const diving = st === 'down' || st === 'up';
  if (!diving) boostE += (0 - boostE) * Math.min(1, dt * 5);
  let fin = false;
  if (diving) fin = updateDive(dt);
  else if (st === 'snap') {
    resT += dt; hook.y += 320 * dt; hook.hv *= 0.9;
    if (resT > 1.7) finishSnap();
  } else if (st === 'result') {
    resT += dt;
    if (resT > 9) toMenu();
  }

  // hooked fish follow the hook with spring lag
  for (const h of hooked) {
    h.a = Math.min(1, h.a + dt / 0.3);
    const ax = hook.x - 6 + h.ox * 0.7, ay = hook.y + 30 + h.oy * 0.6;
    if (h.a < 1) { const e = eBack(h.a); h.px = lerp(h.sx, ax, e); h.py = lerp(h.sy, ay, e); }
    else { h.px += (ax - h.px) * Math.min(1, dt * 16); h.py += (ay - h.py) * Math.min(1, dt * 16); }
  }
  if (fin) finishDive();

  const diveCam = st === 'down' || st === 'up' || st === 'snap';
  const target = diveCam ? Math.max(-H * 0.42, hook.y - H * 0.45 + (st === 'down' ? 60 : -40)) : -H * 0.42;
  camY += (target - camY) * Math.min(1, dt * 6);
}

function updateDive(dt) {
  const D = depthMax(), depth = hook.y / PX;
  for (const k in AP) {
    if (k === 'shield') continue;
    AP[k] -= dt;
    if (AP[k] <= 0) { delete AP[k]; expireChip(k); }
  }
  boostE += ((AP.turbo > 0 ? 1 : 0) - boostE) * Math.min(1, dt * 4);
  tangle = Math.max(0, tangle - dt);
  if (AP.magnet && Math.random() < dt * 1.8) ring(hook.x - 6, hook.y + 30, '#ff7ad9', 120, 2);
  const spdMul = (stun > 0 ? 0.35 : 1) * (1 + 0.7 * boostE);

  const tf = tangle > 0 ? 0.3 : 1;
  const want = clamp((tx - hook.x) * 9, -480 * tf, 480 * tf);
  const cur = currentAt(hook.y);
  hook.x = clamp(hook.x + (want + cur) * dt, 14, W - 14);
  hook.hv += ((want + cur) - hook.hv) * Math.min(1, dt * 10);

  let fin = false;
  if (st === 'down') {
    vyNow = vDown() * spdMul; hook.y += vyNow * dt;
    const z = zoneAt(depth);
    if (z > zoneIdx) { zoneIdx = z; banner = { n: ZONES[z].n, sub: ZONES[z].sub, t: 0 }; sfx.zone(); }
    if (hook.y >= maxPx) {
      hook.y = maxPx; st = 'up'; tone(400, 0.12, 'triangle', 0.06, 1.5); sharkT = rand(1, 2);
      toast('NOW HOOK \'EM ALL!', '#ffe14d');
      ring(hook.x - 6, hook.y + 30, '#ffe14d', 90, 4);
    }
  } else {
    vyNow = vUp() * spdMul; hook.y -= vyNow * dt;
    comboT -= dt; if (comboT < 0) { comboT = 0; combo = 0; }
    if (hook.y <= 30) fin = true;
  }
  const cx = hook.x - 6, cy = hook.y + 30;
  if (boostE > 0.2 && Math.random() < dt * 40) {
    parts.push({ x: cx + rand(-6, 6), y: cy + (st === 'down' ? -10 : 20), vx: rand(-20, 20), vy: st === 'down' ? -90 : 90, life: 0.5, l0: 0.95, c: '#ffae5e', r: rand(2, 4) });
  }
  if (AP.dbl && Math.random() < dt * 8) parts.push({ x: cx + rand(-26, 26), y: cy + rand(-10, 20), vx: 0, vy: -50, life: 0.7, l0: 0.95, c: '#ffe14d', r: rand(1.5, 3) });

  const MAGR = 200;
  for (const f of fish) {
    if (f.h) continue;
    f.x += f.vx * dt;
    if (f.x < -60) f.x = W + 60;
    if (f.x > W + 60) f.x = -60;
    let dx = f.x - cx, dy = f.y - cy;
    if (st === 'down') {
      if (!f.sp.still && !f.sch && Math.abs(dy) < 90 && Math.abs(dx) < 70) {
        const sg = Math.sign(dx) || 1;
        f.x += sg * (170 + depth * 0.1) * dt;
        f.vx = Math.abs(f.vx || 40) * sg;
      }
    } else {
      f.pulled = 0;
      if (AP.magnet && hooked.length < cap()) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MAGR && d > 1) {
          const pull = (50 + (1 - d / MAGR) * 360) * dt;
          f.x -= dx / d * pull; f.y -= dy / d * pull; f.pulled = 1;
          dx = f.x - cx; dy = f.y - cy;
        }
      }
      if (hooked.length < cap() && dx * dx + dy * dy < Math.pow(f.sp.s + 12 + (AP.magnet ? 24 : 0), 2)) catchFish(f, cx, cy);
    }
  }

  for (const o of orbs) {
    if (o.got) continue;
    const dx = o.x - cx, dy = o.y + Math.sin(t * 2 + o.ph) * 4 - cy;
    if (dx * dx + dy * dy < 32 * 32) collectOrb(o);
  }

  for (const h of hazards) {
    if (h.dead) continue;
    if (h.k === 'jelly' || h.k === 'puffer') {
      h.x += h.vx * dt; if (h.x < -30) h.x = W + 30; if (h.x > W + 30) h.x = -30;
      h.y += Math.sin(t * 2 + h.ph) * 12 * dt;
    }
    const dx = h.x - cx, dy = h.y - cy;
    if (h.k === 'puffer') {
      const near = dx * dx + dy * dy < 150 * 150;
      h.r += ((near ? 28 : h.base) - h.r) * Math.min(1, dt * (near ? 9 : 3));
    }
    if (h.k === 'kelp') {
      const sw = Math.sin(t * 1.4 + h.ph) * 8;
      if (cy > h.y && cy < h.y + h.h && Math.abs(cx - (h.x + sw)) < 20 && tangle <= 0) {
        tangle = 1; floats.push({ x: cx, y: cy - 20, txt: 'TANGLED!', col: '#9dffb0', life: 0.9 }); tone(180, 0.2, 'triangle', 0.05, 0.6);
      }
    } else if (h.k === 'eel') {
      const dyh = Math.abs(h.y - cy);
      if (h.s === 'idle') {
        if (dyh < vyNow * 0.9 + 70 && ((st === 'down' && h.y > cy) || (st === 'up' && h.y < cy))) { h.s = 'warn'; h.tm = 0.8; sfx.warn(); }
      } else if (h.s === 'warn') { h.tm -= dt; if (h.tm <= 0) { h.s = 'lunge'; h.ext = 0; } }
      else if (h.s === 'lunge') { h.ext += dt * 950; if (h.ext >= h.reach) { h.ext = h.reach; h.s = 'hold'; h.tm = 0.25; } }
      else if (h.s === 'hold') { h.tm -= dt; if (h.tm <= 0) h.s = 'retreat'; }
      else if (h.s === 'retreat') { h.ext -= dt * 380; if (h.ext <= 0) { h.ext = 0; h.s = 'done'; } }
      if (h.ext > 0) {
        const headX = h.side < 0 ? h.ext : W - h.ext;
        if (Math.abs(cy - h.y) < 20 && (h.side < 0 ? cx < headX + 12 : cx > headX - 12)) hit(h);
      }
    } else if (dx * dx + dy * dy < Math.pow(h.r + 14, 2)) hit(h);
  }

  if (st === 'up') {
    sharkT -= dt;
    if (sharkT <= 0) {
      sharkT = rand(2.6, 4.2);
      const maxS = 1 + Math.floor(depth / 350);
      if (sharkN < Math.min(maxS, 3) && depth >= 90 && hook.y > 330 && Math.random() < 0.75) {
        sharkN++;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const sp = 380 + depth * 0.1;
        sharks.push({ dir, x: dir > 0 ? -110 : W + 110, y: hook.y - (vyNow * 1.5 + 40) + rand(-20, 20), warn: 0.95, v: sp, dead: 0 });
        toast('SHARK ATTACK!', '#ff5a5a'); sfx.warn();
      }
    }
  }
  for (const sh of sharks) {
    if (sh.dead) continue;
    if (sh.warn > 0) { sh.warn -= dt; continue; }
    sh.x += sh.dir * sh.v * dt;
    if (sh.x < -190 || sh.x > W + 190) { sh.dead = 1; continue; }
    if (Math.abs(sh.x - cx) < 58 && Math.abs(sh.y - cy) < 24) sharkHit(sh);
  }
  sharks = sharks.filter(s => !s.dead);
  if (Math.random() < dt * 0.5) hazards = hazards.filter(h => !h.dead);
  return fin;
}
