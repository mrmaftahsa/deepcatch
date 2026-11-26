'use strict';
/* Deep Catch v3 - data, helpers, save, audio */
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 450, PX = 10, TAU = Math.PI * 2;
const FONT = '"Lilita One","Arial Black",Impact,sans-serif';
let H = 800, sc = 1;
function resize() {
  const d = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.floor(innerWidth * d);
  cv.height = Math.floor(innerHeight * d);
  sc = cv.width / W;
  H = cv.height / sc;
}
addEventListener('resize', resize);
resize();
try { document.fonts.load('24px "Lilita One"'); } catch (e) {}

const rand = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const eBack = t => { t = clamp(t, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function hex(c) { if (c[0] !== '#') return [255, 255, 255]; const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgb(a) { return 'rgb(' + a.map(v => Math.round(clamp(v, 0, 255))).join(',') + ')'; }
function shade(c, k) { const a = hex(c); return rgb(k >= 0 ? a.map(v => v + (255 - v) * k) : a.map(v => v * (1 + k))); }
function rgba(c, al) { const a = hex(c); return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + al + ')'; }

/* ---------- save data ---------- */
let S = { money: 0, ld: 0, lc: 0, lv: 0, lk: 0, ls: 0, lr: 0, pearls: 0, caught: {}, ms: [], gift: '', mute: 0, dives: 0, best: 0 };
try { Object.assign(S, JSON.parse(localStorage.getItem('deepcatch3') || localStorage.getItem('deepcatch') || '{}')); } catch (e) {}
function save() { try { localStorage.setItem('deepcatch3', JSON.stringify(S)); } catch (e) {} }
const today = () => { try { return new Date().toISOString().slice(0, 10); } catch (e) { return ''; } };

/* ---------- species ---------- */
const SP = [
  { n: 'Sardine', c: '#8fb8d8', a: '#3d7fb0', b: '#eaf5fc', len: 30, hgt: 12, min: 0, max: 90, v: 5, tail: 'fork' },
  { n: 'Goldie', c: '#ffb43a', a: '#ff7a1a', b: '#ffe3a3', len: 36, hgt: 20, min: 0, max: 120, v: 9, tail: 'round' },
  { n: 'Clownfish', c: '#ff7a14', a: '#ffffff', b: '#ffa04d', len: 40, hgt: 22, min: 10, max: 150, v: 15, pat: 'bands', tail: 'round' },
  { n: 'Blue Tang', c: '#1f6fe0', a: '#ffe83a', b: '#5aa6ff', len: 44, hgt: 30, min: 20, max: 190, v: 25, tail: 'lunate', dors: 0.35 },
  { n: 'Pink Angel', c: '#ff7fbf', a: '#ffd1e8', b: '#ffc4e1', len: 42, hgt: 40, min: 40, max: 240, v: 40, tail: 'round', dors: 0.6 },
  { n: 'Lionfish', c: '#c4382b', a: '#f5e6c8', b: '#e8896f', len: 48, hgt: 28, min: 70, max: 300, v: 75, pat: 'bands', tail: 'round', ex: 'spikes' },
  { n: 'Mackerel', c: '#2fa58f', a: '#17635a', b: '#d9f4ee', len: 58, hgt: 20, min: 90, max: 330, v: 120, pat: 'stripes', tail: 'lunate' },
  { n: 'Zebra Fish', c: '#f1f1f1', a: '#1c1c1c', b: '#ffffff', len: 52, hgt: 30, min: 120, max: 380, v: 180, pat: 'zebra', tail: 'fork' },
  { n: 'Flounder', c: '#8c9852', a: '#5b6830', b: '#b9c27c', len: 60, hgt: 36, min: 160, max: 440, v: 280, pat: 'spots', tail: 'round', dors: 0.25 },
  { n: 'Treasure', c: '#8e4a5e', a: '#e0c24a', b: '#a35a72', len: 50, hgt: 40, min: 140, max: 650, v: 520, ex: 'chest', still: 1, rare: 1 },
  { n: 'Swordfish', c: '#2e6bd1', a: '#8fd0f5', b: '#e8f4ff', len: 78, hgt: 28, min: 220, max: 600, v: 650, tail: 'lunate', ex: 'sword', rare: 1, dors: 0.5 },
  { n: 'Manta Ray', c: '#364f6e', a: '#1d2e44', b: '#d0e0ee', len: 96, hgt: 64, min: 280, max: 760, v: 950, ex: 'ray' },
  { n: 'Lantern Fish', c: '#5a3fc0', a: '#8d6bff', b: '#9be7ff', len: 52, hgt: 30, min: 340, max: 820, v: 1400, tail: 'fork', ex: 'glow' },
  { n: 'Squid', c: '#d65b8a', a: '#ff9cc0', b: '#ffd0e0', len: 74, hgt: 38, min: 450, max: 1050, v: 2200, ex: 'squid' },
  { n: 'Anglerfish', c: '#4a2b5a', a: '#2a1636', b: '#7a4a8a', len: 58, hgt: 52, min: 520, max: 1150, v: 3800, tail: 'round', ex: 'lure', rare: 1, dors: 0.3 },
  { n: 'Viperfish', c: '#1f4558', a: '#0f2633', b: '#6fa9b5', len: 72, hgt: 24, min: 720, max: 1350, v: 6500, tail: 'fork', ex: 'fangs' },
  { n: 'Oarfish', c: '#d5dde6', a: '#ff4d5e', b: '#ffffff', len: 124, hgt: 15, min: 900, max: 1550, v: 11000, tail: 'fork', ex: 'ribbon', rare: 1, dors: 0.5 },
  { n: 'Golden Whale', c: '#e6b800', a: '#fff2a0', b: '#fff0b8', len: 112, hgt: 54, min: 1000, max: 1700, v: 22000, tail: 'lunate', ex: 'whale', rare: 1 },
  { n: 'Leviathan', c: '#1b2f4a', a: '#0b1626', b: '#3a6a8a', len: 140, hgt: 64, min: 1300, max: 1700, v: 65000, tail: 'lunate', ex: 'whale', rare: 1, glow: 1 }
];
SP.forEach(s => { s.s = Math.max(s.len * 0.3, s.hgt * 0.5); });
const SHARK = { n: 'Shark', c: '#7d8f9c', a: '#56677a', b: '#eef3f6', len: 112, hgt: 40, tail: 'lunate', dors: 0.9, ex: 'shark' };

/* ---------- progression ---------- */
const depthFor = l => l <= 10 ? 60 + 40 * l : 460 + 70 * (l - 10);
const depthMax = () => depthFor(S.ld);
const cap = () => 3 + 2 * S.lc;
const mult = () => (1 + 0.25 * S.lv) * (1 + 0.4 * S.pearls);
const maxHp = () => 3 + S.ls;
const reel = () => 1 + 0.05 * S.lr;
const REBIRTH_LD = 14;

const COSTK = (typeof COSTK_OVR !== 'undefined') ? COSTK_OVR : 2;
const GROW = (typeof GROW_OVR !== 'undefined') ? GROW_OVR : 1.35;
const UP = [
  { k: 'ld', name: 'LINE LENGTH', d: 'Dive deeper', max: 28, cost: l => Math.round(COSTK * 70 * Math.pow(1.78 * GROW, l)), info: l => depthFor(l) + 'm' },
  { k: 'lc', name: 'HOOK SIZE', d: 'Carry more fish', max: 15, cost: l => Math.round(COSTK * 90 * Math.pow(1.62 * GROW, l)), info: l => (3 + 2 * l) + ' fish' },
  { k: 'lv', name: 'FISH VALUE', d: 'Earn more per fish', max: 24, cost: l => Math.round(COSTK * 120 * Math.pow(1.7 * GROW, l)), info: l => 'x' + (1 + 0.25 * l).toFixed(2) },
  { k: 'lk', name: 'LUCK', d: 'More gold fish & power-ups', max: 10, cost: l => Math.round(COSTK * 150 * Math.pow(1.9 * GROW, l)), info: l => (4 + 1.5 * l).toFixed(1).replace('.0', '') + '% gold' },
  { k: 'ls', name: 'LINE STRENGTH', d: 'Extra hearts', max: 6, cost: l => Math.round(COSTK * 200 * Math.pow(2.2 * GROW, l)), info: l => (3 + l) + ' hearts' },
  { k: 'lr', name: 'REEL SPEED', d: 'Rise faster', max: 12, cost: l => Math.round(COSTK * 180 * Math.pow(1.8 * GROW, l)), info: l => 'x' + (1 + 0.05 * l).toFixed(2) }
];

const PU = {
  magnet: { n: 'MAGNET', c: '#ff5ac8', dur: 12 },
  shield: { n: 'SHIELD', c: '#4dd2ff', dur: 0 },
  dbl: { n: '2X CASH', c: '#ffd93b', dur: 15 },
  turbo: { n: 'TURBO', c: '#ff8a3d', dur: 6 },
  heal: { n: 'REPAIR', c: '#ff4d6d', dur: 0 }
};

const ZONES = [
  { n: 'SUNLIT REEF', sub: 'Watch for jellyfish', from: 0 },
  { n: 'KELP FOREST', sub: 'Kelp tangles, puffers swell', from: 120 },
  { n: 'TWILIGHT', sub: 'Mines, eels & rapids', from: 300 },
  { n: 'MIDNIGHT', sub: 'Darkness. Trust no light', from: 600 },
  { n: 'THE ABYSS', sub: 'Nothing here wants you alive', from: 1000 }
];
const zoneAt = m => { let z = 0; for (let i = 0; i < ZONES.length; i++) if (m >= ZONES[i].from) z = i; return z; };

const PALS = [[0, [52, 232, 214]], [120, [24, 178, 222]], [300, [16, 108, 192]], [600, [11, 58, 134]], [1000, [8, 30, 84]], [1700, [12, 8, 44]]];
function palAt(m) {
  if (m <= 0) return PALS[0][1];
  for (let i = 1; i < PALS.length; i++) {
    if (m <= PALS[i][0]) {
      const u = (m - PALS[i - 1][0]) / (PALS[i][0] - PALS[i - 1][0]), a = PALS[i - 1][1], b = PALS[i][1];
      return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
    }
  }
  return PALS[PALS.length - 1][1];
}

function fmt(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1).replace('.0', '') + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
  return '' + Math.floor(n);
}

/* ---------- missions ---------- */
function newMission() {
  const r = Math.random(), D = depthMax();
  if (r < 0.5) {
    const av = SP.filter(s => s.min <= D - 10 && !s.still);
    const sp = av[rint(0, av.length - 1)];
    const n = sp.rare ? rint(1, 2) : rint(3, 7);
    return { t: 'catch', sp: sp.n, n, p: 0, r: Math.max(25, Math.round(sp.v * n * mult() * 1.6)) };
  }
  if (r < 0.7) { const n = Math.max(3, cap() - rint(0, 2)); return { t: 'stack', n, p: 0, r: Math.round(n * 45 * mult() * (1 + S.ld * 0.3)) }; }
  if (r < 0.86) { const n = rint(3, 6); return { t: 'combo', n, p: 0, r: Math.round(n * 70 * mult() * (1 + S.ld * 0.3)) }; }
  if (r < 0.94) return { t: 'flawless', n: 1, p: 0, r: Math.round(180 * mult() * (1 + S.ld * 0.4)) };
  return { t: 'gold', n: 1, p: 0, r: Math.round(250 * mult() * (1 + S.ld * 0.3)) };
}
function missionText(m) {
  if (m.t === 'catch') return 'Catch ' + m.n + ' ' + m.sp;
  if (m.t === 'stack') return 'Hook ' + m.n + ' fish in one dive';
  if (m.t === 'combo') return 'Reach combo x' + m.n;
  if (m.t === 'flawless') return 'Flawless dive (no damage)';
  return 'Catch a golden fish';
}
function ensureMissions() {
  if (!Array.isArray(S.ms)) S.ms = [];
  while (S.ms.length < 3) S.ms.push(newMission());
}
ensureMissions();

/* ---------- audio & haptics ---------- */
let ac;
function tone(f, d, type, vol, slide) {
  if (S.mute) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, n);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), n + d);
    g.gain.setValueAtTime(vol || 0.05, n); g.gain.exponentialRampToValueAtTime(0.0001, n + d);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(n + d);
  } catch (e) {}
}
function later(fn, ms) { try { setTimeout(fn, ms); } catch (e) {} }
const sfx = {
  tap: () => tone(420, 0.06, 'triangle', 0.05, 1.3),
  buy: () => { tone(520, 0.1, 'triangle', 0.06, 1.4); later(() => tone(780, 0.14, 'triangle', 0.06, 1.3), 80); },
  deny: () => tone(150, 0.14, 'square', 0.04, 0.7),
  catch: c => tone(520 + Math.min(c, 12) * 45, 0.1, 'triangle', 0.06, 1.5),
  power: () => { tone(600, 0.12, 'sine', 0.07, 1.8); later(() => tone(900, 0.16, 'sine', 0.07, 1.4), 90); },
  turbo: () => { tone(200, 0.5, 'sawtooth', 0.04, 4); },
  hit: () => tone(170, 0.32, 'sawtooth', 0.07, 0.4),
  boom: () => { tone(90, 0.5, 'sawtooth', 0.09, 0.3); tone(60, 0.6, 'square', 0.05, 0.5); },
  warn: () => { tone(330, 0.12, 'square', 0.05, 1); later(() => tone(330, 0.12, 'square', 0.05, 1), 160); },
  shield: () => tone(300, 0.25, 'sine', 0.06, 2.5),
  sell: () => { tone(660, 0.1, 'triangle', 0.06, 1.3); later(() => tone(880, 0.1, 'triangle', 0.06, 1.3), 90); later(() => tone(1320, 0.2, 'triangle', 0.06, 1.2), 180); },
  snap: () => { tone(500, 0.2, 'sawtooth', 0.07, 0.2); },
  zone: () => { tone(260, 0.3, 'sine', 0.06, 1.6); }
};
function vib(ms) { if (S.mute) return; try { navigator.vibrate(ms); } catch (e) {} }
