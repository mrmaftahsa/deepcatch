'use strict';
/* Deep Catch - simple arcade fishing game (original art, drawn with canvas) */
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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- save data ---------- */
let S = { money: 0, ld: 0, lc: 0, lv: 0, caught: {} };
try { Object.assign(S, JSON.parse(localStorage.getItem('deepcatch') || '{}')); } catch (e) {}
function save() { try { localStorage.setItem('deepcatch', JSON.stringify(S)); } catch (e) {} }

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

const UP = [
  { k: 'ld', name: 'LINE LENGTH', max: 20, cost: l => Math.round(60 * Math.pow(1.6, l)), info: l => (60 + 40 * l) + 'm' },
  { k: 'lc', name: 'HOOK SIZE', max: 15, cost: l => Math.round(80 * Math.pow(1.5, l)), info: l => (3 + 2 * l) + ' fish' },
  { k: 'lv', name: 'FISH VALUE', max: 20, cost: l => Math.round(100 * Math.pow(1.65, l)), info: l => 'x' + (1 + 0.25 * l).toFixed(2) }
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

/* ---------- sound ---------- */
let ac;
function beep(f, d) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = f; g.gain.value = 0.04;
    o.connect(g); g.connect(ac.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
    o.stop(ac.currentTime + d);
  } catch (e) {}
}

/* ---------- game state ---------- */
let st = 'menu';
const hook = { x: W / 2, y: 40 };
let tx = W / 2, fish = [], hooked = [], floats = [], camY = -H * 0.42;
let t = 0, resT = 0, earned = 0, newTrophy = false, maxPx = 600;
const tro = { y: 0 };
const btns = [];

function pickW(pool) {
  let tot = 0;
  for (const s of pool) tot += s.rare ? 0.35 : 1;
  let r = Math.random() * tot;
  for (const s of pool) { r -= s.rare ? 0.35 : 1; if (r <= 0) return s; }
  return pool[0];
}

function startDive() {
  st = 'down'; hook.x = W / 2; hook.y = 40; tx = W / 2;
  hooked = []; fish = []; floats = [];
  const D = depthMax(); maxPx = D * PX;
  for (let m = 12; m <= D; m += 6) {
    const pool = SP.filter(s => m >= s.min && m <= s.max);
    if (!pool.length) continue;
    const n = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const sp = pickW(pool);
      const dir = Math.random() < 0.5 ? -1 : 1;
      fish.push({
        sp, x: rand(0, W),
        y: clamp(m * PX + rand(-25, 25), 60, maxPx - 30),
        vx: sp.still ? 0 : dir * rand(30, 70), h: 0
      });
    }
  }
}

function finishDive() {
  let sum = 0; newTrophy = false;
  for (const h of hooked) {
    const sp = h.f.sp;
    sum += Math.round(sp.v * mult());
    if (!S.caught[sp.n]) newTrophy = true;
    S.caught[sp.n] = (S.caught[sp.n] || 0) + 1;
  }
  earned = sum; S.money += sum; save();
  st = 'result'; resT = 0; hook.y = 30;
  if (sum > 0) beep(880, 0.25);
}

function buy(u) {
  const l = S[u.k];
  if (l >= u.max) return;
  const c = u.cost(l);
  if (S.money < c) { beep(150, 0.15); return; }
  S.money -= c; S[u.k]++; save(); beep(660, 0.15);
}

function update(dt) {
  t += dt;
  for (const f of floats) { f.life -= dt; f.y -= 35 * dt; }
  floats = floats.filter(f => f.life > 0);

  if (st === 'down' || st === 'up') {
    hook.x += (tx - hook.x) * Math.min(1, dt * 8);
    hook.x = clamp(hook.x, 15, W - 15);
    if (st === 'down') {
      hook.y += 230 * dt;
      if (hook.y >= maxPx) { hook.y = maxPx; st = 'up'; beep(400, 0.1); }
    } else {
      hook.y -= 150 * dt;
      if (hook.y <= 30) finishDive();
    }
    const cx = hook.x - 6, cy = hook.y + 30;
    for (const f of fish) {
      if (f.h) continue;
      f.x += f.vx * dt;
      if (f.x < -60) f.x = W + 60;
      if (f.x > W + 60) f.x = -60;
      const dx = f.x - cx, dy = f.y - cy;
      if (st === 'down') {
        if (!f.sp.still && Math.abs(dy) < 90 && Math.abs(dx) < 70) {
          const sg = Math.sign(dx) || 1;
          f.x += sg * 170 * dt;
          f.vx = Math.abs(f.vx || 40) * sg;
        }
      } else if (hooked.length < cap() && dx * dx + dy * dy < Math.pow(f.sp.s * 0.9 + 12, 2)) {
        f.h = 1;
        hooked.push({ f, ox: rand(-22, 22), oy: rand(6, 40), r: rand(-1, 1) });
        const val = Math.round(f.sp.v * mult());
        floats.push({ x: cx, y: cy - 20, txt: '$' + fmt(val), rare: !!f.sp.rare, life: 1.1 });
        beep(500 + hooked.length * 30, 0.08);
      }
    }
  } else if (st === 'result') {
    resT += dt;
    if (resT > 2.2) { st = 'menu'; hooked = []; hook.x = W / 2; hook.y = 40; tx = W / 2; }
  }
  const target = (st === 'down' || st === 'up') ? Math.max(-H * 0.42, hook.y - H * 0.5) : -H * 0.42;
  camY += (target - camY) * Math.min(1, dt * 6);
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
function drawFish(sp, x, y, dir, k, rot) {
  const s = sp.s, kind = sp.k;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(dir * k, k);
  if (kind === 'chest') {
    poly([[-s * 0.9, -s * 0.3], [s * 0.9, -s * 0.3], [s * 0.9, s * 0.7], [-s * 0.9, s * 0.7]], col(sp.c));
    poly([[-s * 0.9, -s * 0.3], [s * 0.9, -s * 0.3], [s * 0.7, -s * 0.8], [-s * 0.7, -s * 0.8]], col('#a35a72'));
    poly([[-s * 0.55, -s * 0.8], [-s * 0.3, -s * 0.8], [-s * 0.3, s * 0.7], [-s * 0.55, s * 0.7]], col(sp.a));
    poly([[s * 0.3, -s * 0.8], [s * 0.55, -s * 0.8], [s * 0.55, s * 0.7], [s * 0.3, s * 0.7]], col(sp.a));
    ctx.restore(); return;
  }
  let kx = 1, ky = 0.55;
  if (kind === 'tall') { kx = 0.9; ky = 0.85; }
  if (kind === 'long') { kx = 1.25; ky = 0.4; }
  if (kind === 'flat') { kx = 1.1; ky = 0.45; }
  if (kind === 'sword') { kx = 1.1; ky = 0.4; }
  if (kind === 'angler') { kx = 0.95; ky = 0.8; }
  if (kind === 'whale') { kx = 1.3; ky = 0.7; }
  const rx = s * kx, ry = s * ky;
  // tail
  poly([[-rx * 0.8, 0], [-rx - s * 0.6, -ry * 0.9], [-rx - s * 0.6, ry * 0.9]], col(sp.a));
  // top fin
  poly([[-rx * 0.3, -ry * 0.8], [rx * 0.1, -ry - s * 0.35], [rx * 0.4, -ry * 0.8]], col(sp.a));
  // body
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = col(sp.c); ctx.fill();
  if (kind === 'stripe') {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = col(sp.a);
    ctx.fillRect(-rx * 0.35, -ry, rx * 0.22, ry * 2);
    ctx.fillRect(rx * 0.2, -ry, rx * 0.22, ry * 2);
    ctx.restore();
  }
  if (kind === 'sword') poly([[rx * 0.9, -2], [rx + s * 1.2, 0], [rx * 0.9, 2]], col('#cfd8dc'));
  if (kind === 'lamp') { ctx.beginPath(); ctx.arc(0, -ry - 4, 5, 0, 7); ctx.fillStyle = col(sp.a); ctx.fill(); }
  if (kind === 'angler') {
    ctx.beginPath(); ctx.moveTo(rx * 0.4, -ry * 0.8); ctx.quadraticCurveTo(rx * 0.9, -ry - s * 0.8, rx * 1.2, -ry - s * 0.5);
    ctx.lineWidth = 2; ctx.strokeStyle = col('#222'); ctx.stroke();
    ctx.beginPath(); ctx.arc(rx * 1.2, -ry - s * 0.5, 5, 0, 7); ctx.fillStyle = col(sp.a); ctx.fill();
  }
  if (kind === 'whale') {
    poly([[-rx * 0.2, -ry], [0, -ry - s * 0.4], [rx * 0.2, -ry]], col('#fff2a0'));
  }
  if (!silh) {
    ctx.beginPath(); ctx.arc(rx * 0.55, -ry * 0.2, Math.max(2.5, s * 0.14), 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(rx * 0.6, -ry * 0.2, Math.max(1.4, s * 0.07), 0, 7); ctx.fillStyle = '#111'; ctx.fill();
  }
  ctx.restore();
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
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(225, -145 + bob); ctx.lineTo(hook.x, hook.y); ctx.stroke();
  ctx.beginPath(); ctx.arc(hook.x, hook.y, 5, 0, 7); ctx.lineWidth = 2; ctx.stroke();
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hook.x, hook.y + 5); ctx.lineTo(hook.x, hook.y + 32);
  ctx.bezierCurveTo(hook.x, hook.y + 48, hook.x - 26, hook.y + 48, hook.x - 26, hook.y + 30);
  ctx.lineTo(hook.x - 20, hook.y + 34); ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawHooked() {
  const p = st === 'result' ? clamp(resT / 1.0, 0, 1) : 0;
  for (const h of hooked) {
    const bx = hook.x - 6 + h.ox * 0.7, by = hook.y + 30 + h.oy * 0.6;
    const x = lerp(bx, 130, p), y = lerp(by, -30, p);
    const dir = h.f.vx < 0 ? -1 : 1;
    drawFish(h.f.sp, x, y + Math.sin(t * 8 + h.r * 5) * 2, dir, 0.8 * (1 - 0.5 * p), h.r);
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
    drawFish(f.sp, f.x, f.y, f.vx < 0 ? -1 : 1, 1, 0);
  }
  if (sy > -200) drawBoat();
  ctx.beginPath(); ctx.moveTo(0, 0);
  for (let x = 0; x <= W + 30; x += 30) ctx.lineTo(x, Math.sin(x * 0.05 + t * 2) * 4 + (((x / 30) | 0) % 2 ? -3 : 3));
  ctx.lineTo(W, 40); ctx.lineTo(0, 40); ctx.closePath(); ctx.fillStyle = 'rgba(190,255,255,0.35)'; ctx.fill();
  drawHook(); drawHooked();
  for (const f of floats) {
    ctx.globalAlpha = clamp(f.life * 2, 0, 1);
    txt(f.txt, f.x, f.y, 28, '#fff', 'center', 5);
    if (f.rare) txt('RARE!', f.x + 30, f.y + 22, 20, '#ffe14d', 'center', 4);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawMenuUI() {
  const y0 = H - 330;
  ctx.fillStyle = '#6e0d12'; ctx.fillRect(0, y0, W, 330);
  ctx.fillStyle = '#ff6a00'; ctx.fillRect(0, y0, W, 10);
  UP.forEach((u, i) => {
    const y = y0 + 22 + i * 62, l = S[u.k], maxed = l >= u.max, c = u.cost(l);
    rr(20, y, W - 40, 52, 10); ctx.fillStyle = '#a31419'; ctx.fill();
    txt(u.name + '  Lv' + (l + 1), 34, y + 18, 17, '#fff', 'left');
    txt(u.info(l) + (maxed ? '' : '  >  ' + u.info(l + 1)), 34, y + 38, 15, '#ffd24a', 'left');
    btn(W - 150, y + 6, 120, 40, maxed ? 'MAX' : '$' + fmt(c), maxed ? null : () => buy(u), 22, !maxed && S.money >= c);
  });
  btn(22, H - 110, W - 44, 90, 'GO FISH!', startDive, 56);
  // trophy button
  rr(20, 20, 56, 44, 6); ctx.fillStyle = '#a31419'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#6e0d12'; ctx.stroke();
  drawFish(SP[1], 48, 42, 1, 0.9, 0);
  btns.push({ x: 20, y: 20, w: 56, h: 44, fn: () => { st = 'trophy'; tro.y = 0; } });
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
  const sy = hook.y - camY + 12;
  ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(W * 0.55, sy); ctx.lineTo(W * 0.92, sy); ctx.stroke(); ctx.setLineDash([]);
  txt(Math.round(hook.y / PX) + 'm', W * 0.92, sy - 22, 34, '#fff', 'right');
  btn(22, H - 110, W - 44, 90, st === 'down' ? 'GO DEEP!' : 'HOOK EM ALL!', null, 52);
}

function drawResult() {
  txt('$' + fmt(S.money), W / 2, 50, 52, '#fff', 'center', 8);
  const y = H * 0.3;
  txt('+$' + fmt(earned), W / 2, y, 64, '#ffe14d', 'center', 8);
  txt(hooked.length + ' FISH CAUGHT', W / 2, y + 50, 26, '#fff', 'center', 5);
  if (newTrophy) txt('NEW TROPHY!', W / 2, y + 86, 28, '#ff8fc7', 'center', 6);
}

function draw() {
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  btns.length = 0;
  if (st === 'trophy') { drawTrophy(); return; }
  drawWorld();
  if (st === 'menu') { txt('$' + fmt(S.money), W / 2, 50, 52, '#fff', 'center', 8); drawMenuUI(); }
  else if (st === 'result') drawResult();
  else drawDiveUI();
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
  if (st === 'menu' && p.y < H - 330) startDive();
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
