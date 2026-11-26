'use strict';
/* Deep Catch v3 - HUD, screens, input, main loop */
const btns = [];
let pressedId = null;

function glass(x, y, w, h, r, a) {
  rr(x, y, w, h, r); ctx.fillStyle = 'rgba(6,22,44,' + (a == null ? 0.62 : a) + ')'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(160,215,255,0.28)'; ctx.stroke();
}
const PAL_BTN = {
  amber: ['#ffd84a', '#ff9a14', '#3a1d00'], green: ['#62e883', '#1ba84a', '#04260f'],
  grey: ['#8b97a6', '#5a6574', '#1c232c'], blue: ['#59c8ff', '#1d78dd', '#031a35'], red: ['#ff6b6b', '#c91f3a', '#33000c']
};
function button(x, y, w, h, label, fn, o) {
  o = o || {};
  const id = Math.round(x) + '|' + Math.round(y) + '|' + label;
  const pr = pressedId === id && !o.disabled;
  const pal = PAL_BTN[o.disabled ? 'grey' : (o.color || 'amber')];
  const k = pr ? 0.95 : 1;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(k, k); ctx.translate(-w / 2, -h / 2);
  const r = o.r || Math.min(16, h / 2);
  rr(0, 5, w, h, r); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fill();
  rr(0, 0, w, h, r); const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); ctx.fillStyle = g; ctx.fill();
  ctx.save(); rr(0, 0, w, h, r); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(0, 0, w, h * 0.45);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, h * 0.86, w, h * 0.14);
  if (o.shine) { const sx = ((t * 0.5) % 1.6 - 0.3) * w; ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 26, 0); ctx.lineTo(sx + 6, h); ctx.lineTo(sx - 20, h); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  rr(0, 0, w, h, r); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
  const sz = o.size || h * 0.46;
  if (o.light) txt(label, w / 2 + (o.dx || 0), h / 2 + 1, sz, '#fff', 'center', Math.max(3, sz * 0.18), rgba(pal[2], 0.9));
  else txt(label, w / 2 + (o.dx || 0), h / 2 + 1, sz, pal[2], 'center');
  if (o.draw) o.draw(w, h);
  if (o.badge) { ctx.beginPath(); ctx.arc(w - 4, 4, 9 + Math.sin(t * 6) * 1.2, 0, TAU); ctx.fillStyle = '#ff3b3b'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
  ctx.restore();
  if (fn) btns.push({ x, y, w, h, fn, id, disabled: !!o.disabled });
}
function moneyPill(cx, y) {
  const txtS = '$' + fmt(dispMoney), w = Math.max(120, 56 + txtS.length * 17), h = 40;
  const gold = AP.dbl ? 0.5 + 0.5 * Math.sin(t * 8) : 0;
  if (gold) glowAt(cx, y + h / 2, w * 0.8, '#ffd93b', 0.35);
  glass(cx - w / 2, y, w, h, 20, 0.7);
  drawCoin(cx - w / 2 + 22, y + h / 2, 13);
  txt(txtS, cx + 14, y + h / 2 + 2, 30, gold ? '#ffe56a' : '#fff', 'center', 4);
}

/* ---------- HUD during dive ---------- */
function drawHUD() {
  moneyPill(W / 2, 14);
  // hearts
  for (let i = 0; i < hpMax; i++) {
    const x = 18 + i * 25, y = 78, lost = i >= hp, justLost = lost && i === hp && hurtT > 0, gained = !lost && i === hp - 1 && healT > 0;
    let s = 9.5;
    if (justLost) s *= 1 + hurtT * 0.9;
    if (gained) s *= 1 + healT * 0.7;
    ctx.save(); ctx.translate(x + (justLost ? Math.sin(t * 60) * 2 : 0), y);
    drawHeart(0, 0, s, !lost || justLost);
    ctx.restore();
  }
  const dn = hp <= 1 && Math.floor(t * 4) % 2 === 0;
  if (hp <= 1 && !dn) { /* low-hp blink */ }
  // fish count
  const full = hooked.length >= cap();
  txt(hooked.length + '/' + cap(), W - 18, 78, 26, full ? '#ffe14d' : '#fff', 'right', 5);
  drawFish(SP[1], W - 18 - 12 - (hooked.length + '/' + cap()).length * 13, 78, 1, 0.55, 0, 0, 0);
  // combo
  if (st === 'up' && combo >= 2 && comboT > 0) {
    const k = 1 + 0.12 * Math.sin(t * 20);
    ctx.save(); ctx.translate(W - 18, 114); ctx.scale(k, k);
    txt('COMBO x' + combo, 0, 0, 30, '#ffe14d', 'right', 6);
    ctx.restore();
    rr(W - 18 - 110, 134, 110, 6, 3); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    rr(W - 18 - 110 * (comboT / 1.4), 134, 110 * (comboT / 1.4), 6, 3); ctx.fillStyle = '#ffe14d'; ctx.fill();
  }
  // power-up chips
  for (const c of chips) {
    if (!c.show && !c.out) continue;
    const P = PU[c.k], frac = c.k === 'shield' ? 1 : clamp((AP[c.k] || 0) / P.dur, 0, 1), left = AP[c.k] || 0;
    const sc2 = (c.out ? c.os : 1) * (1 + 0.45 * c.pop);
    if (!c.out && c.k !== 'shield' && left < 2 && Math.floor(t * 8) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(sc2, sc2);
    glowAt(0, 0, 36, P.c, 0.3 + 0.4 * c.pop);
    ctx.beginPath(); ctx.arc(0, 0, 19, 0, TAU); ctx.fillStyle = 'rgba(5,15,35,0.75)'; ctx.fill();
    const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, 16); g.addColorStop(0, shade(P.c, 0.3)); g.addColorStop(1, P.c);
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fillStyle = g; ctx.fill();
    puIcon(c.k, 0, 0, 10, P.c);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 19, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
    if (c.pop > 0.01) { ctx.globalAlpha = c.pop; ctx.beginPath(); ctx.arc(0, 0, 19 + (1 - c.pop) * 18, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = P.c; ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
    if (!c.out && c.k !== 'shield') txt(Math.ceil(left) + 's', c.x, c.y + 31, 14, '#fff', 'center', 4);
  }
  // depth rail
  const D = depthMax(), top = 150, bot = H - 100, fr = clamp(hook.y / (D * PX), 0, 1);
  rr(W - 12, top, 6, bot - top, 3); ctx.fillStyle = 'rgba(0,10,25,0.35)'; ctx.fill();
  rr(W - 12, top, 6, (bot - top) * fr, 3); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
  const my = top + (bot - top) * fr;
  poly([[W - 14, my], [W - 24, my - 6], [W - 24, my + 6]], '#ffe14d');
  // depth marker next to hook
  const sy = hook.y - camY + 12;
  ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(W * 0.56, sy); ctx.lineTo(W * 0.9, sy); ctx.stroke(); ctx.setLineDash([]);
  txt(Math.round(hook.y / PX) + 'm', W * 0.9, sy - 20, 32, '#fff', 'right', 5);
  // bottom pill
  const down = st === 'down';
  glass(W / 2 - 100, H - 70, 200, 42, 21, 0.55);
  txt(down ? 'GO DEEP!' : 'HOOK \'EM ALL!', W / 2 + 10, H - 49, 24, '#fff');
  const ph = (t * 2.2) % 1;
  for (let i = 0; i < 2; i++) {
    const a = 1 - Math.abs(((ph + i * 0.5) % 1) - 0.5) * 2, ax = W / 2 - 78, ay = H - 49 + (down ? 1 : -1) * (((ph + i * 0.5) % 1) - 0.5) * 12;
    ctx.globalAlpha = a; ctx.lineWidth = 3.5; ctx.strokeStyle = '#ffe14d'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ax - 8, ay - (down ? 4 : -4)); ctx.lineTo(ax, ay + (down ? 4 : -4)); ctx.lineTo(ax + 8, ay - (down ? 4 : -4)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawFlyers() {
  for (const f of flyers) {
    const u = clamp(f.t, 0, 1);
    let tx2, ty2;
    if (f.heal) { tx2 = 18 + Math.max(0, hp - 1) * 25; ty2 = 78; } else { tx2 = f.chip.x; ty2 = f.chip.y; }
    const col = PU[f.k].c;
    for (let i = 5; i >= 0; i--) {
      const uu = clamp(u - i * 0.035, 0, 1), e = eOut(uu);
      const cx1 = f.x0 + (tx2 - f.x0) * 0.2, cy1 = Math.min(f.y0, ty2) - 90;
      const x = (1 - e) * (1 - e) * f.x0 + 2 * (1 - e) * e * cx1 + e * e * tx2, y = (1 - e) * (1 - e) * f.y0 + 2 * (1 - e) * e * cy1 + e * e * ty2;
      const r = lerp(22, 11, e) * (1 - i * 0.09);
      ctx.globalAlpha = (1 - i / 6) * (i === 0 ? 1 : 0.5);
      glowAt(x, y, r * 2.4, col, 0.55);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = i === 0 ? col : rgba(col, 0.6); ctx.fill();
      if (i === 0) { ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); puIcon(f.k, x, y, r * 0.65, col); }
    }
    ctx.globalAlpha = 1;
  }
}
function drawBanner() {
  if (!banner) return;
  const u = banner.t, a = u < 0.4 ? u / 0.4 : (u > 2.2 ? Math.max(0, 1 - (u - 2.2) / 0.6) : 1);
  const off = (1 - eOut(u / 0.55)) * -120;
  ctx.globalAlpha = a;
  const y = H * 0.24;
  ctx.fillStyle = 'rgba(0,8,22,0.38)'; ctx.fillRect(0, y - 44, W, 92);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, y - 44, W, 2); ctx.fillRect(0, y + 46, W, 2);
  txt(banner.n, W / 2 + off, y - 8, 44, '#fff', 'center', 7);
  txt(banner.sub, W / 2 - off, y + 28, 20, '#bfe6ff', 'center', 4);
  ctx.globalAlpha = 1;
}
function drawToasts() {
  toasts.forEach((q, i) => {
    ctx.globalAlpha = clamp(q.life * 2, 0, 1);
    const pop = 1 + Math.max(0, 0.3 - q.age) * 1.4;
    ctx.save(); ctx.translate(W / 2, H * 0.36 + i * 38); ctx.scale(pop, pop);
    txt(q.txt, 0, 0, 30, q.col, 'center', 6);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}
function drawScreenFX() {
  if (boostE > 0.05) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,' + 0.3 * boostE + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x = (i * 97 + 31) % W, len = 40 + (i * 53) % 90, sp = 1100 + (i % 5) * 220;
      const y = st === 'down' ? H - ((t * sp + i * 83) % (H + len)) : ((t * sp + i * 83) % (H + len)) - len;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
    }
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, 'rgba(255,140,50,0)'); g.addColorStop(1, 'rgba(255,140,50,' + 0.3 * boostE + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (flash > 0.01 || (hp === 1 && (st === 'down' || st === 'up'))) {
    const a = Math.max(flash * 0.55, hp === 1 && (st === 'down' || st === 'up') ? 0.12 + 0.08 * Math.sin(t * 6) : 0);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.72);
    g.addColorStop(0, 'rgba(255,20,40,0)'); g.addColorStop(1, 'rgba(255,20,40,' + a + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

/* ---------- screens ---------- */
function screenBg() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0c2c52'); g.addColorStop(1, '#04101f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const bb of bubbles) { if (bb.y > H) continue; ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.r, 0, TAU); ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.2; ctx.stroke(); }
}
function header(title) {
  ctx.fillStyle = 'rgba(2,12,28,0.85)'; ctx.fillRect(0, 0, W, 76);
  ctx.fillStyle = 'rgba(160,215,255,0.25)'; ctx.fillRect(0, 76, W, 1.5);
  button(12, 14, 52, 46, '', () => { sfx.tap(); go('menu'); }, { color: 'blue', r: 14, draw: () => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(30, 12); ctx.lineTo(16, 23); ctx.lineTo(30, 34); ctx.closePath(); ctx.fill(); } });
  txt(title, 82, 38, 36, '#fff', 'left', 5);
}
function menuMoneyRight() { moneyPill(W - 100, 18); }

function drawShop() {
  screenBg();
  const items = [];
  if (canRebirth()) items.push({ t: 'rebirth', h: 126 });
  UP.forEach(u => items.push({ t: 'up', u, h: 108 }));
  if (!canRebirth()) items.push({ t: 'rebirth', h: 126 });
  let total = 92; items.forEach(i => { total += i.h + 12; });
  scrollMax = Math.max(0, total - H + 20);
  scrollY = clamp(scrollY, 0, scrollMax);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 78, W, H - 78); ctx.clip();
  let y = 92 - scrollY;
  for (const it of items) {
    if (y + it.h > 70 && y < H) { if (it.t === 'up') shopCard(it.u, y, it.h); else rebirthCard(y, it.h); }
    y += it.h + 12;
  }
  ctx.restore();
  header('SHOP');
  moneyPill(W - 100, 18);
}
function shopCard(u, y, h) {
  const l = S[u.k], maxed = l >= u.max, c = u.cost(l), can = !maxed && S.money >= c, x = 14, w = W - 28;
  glass(x, y, w, h, 18, can ? 0.78 : 0.6);
  if (can) { rr(x, y, w, h, 18); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(120,255,160,0.55)'; ctx.stroke(); }
  const ic = ctx.createRadialGradient(x + 34, y + h / 2 - 8, 4, x + 40, y + h / 2, 32); ic.addColorStop(0, '#59c8ff'); ic.addColorStop(1, '#1d5fc0');
  ctx.beginPath(); ctx.arc(x + 44, y + h / 2, 30, 0, TAU); ctx.fillStyle = ic; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke();
  upIcon(u.k, x + 44, y + h / 2, 24);
  txt(u.name, x + 88, y + 24, 24, '#fff', 'left');
  txt(u.d, x + 88, y + 45, 15, '#9bc4e8', 'left');
  rr(x + 88, y + 60, 150, 9, 4.5); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  if (l > 0) { rr(x + 88, y + 60, Math.max(9, 150 * l / u.max), 9, 4.5); ctx.fillStyle = '#5be07a'; ctx.fill(); }
  txt('Lv ' + (l + 1 > u.max ? u.max : l + 1) + (maxed ? ' MAX' : '/' + (u.max + 1)), x + 246, y + 65, 14, '#cfe8ff', 'left');
  txt(u.info(l) + (maxed ? '' : '  >  ' + u.info(l + 1)), x + 88, y + 88, 18, '#ffd24a', 'left');
  button(x + w - 118, y + h / 2 - 24, 106, 48, maxed ? 'MAX' : '$' + fmt(c), maxed ? null : () => buy(u), { color: 'green', disabled: maxed || !can, size: maxed ? 22 : (('$' + fmt(c)).length > 6 ? 18 : 22) });
}
function rebirthCard(y, h) {
  const x = 14, w = W - 28, can = canRebirth();
  glass(x, y, w, h, 18, 0.72);
  rr(x, y, w, h, 18); ctx.lineWidth = 2.5; ctx.strokeStyle = can ? 'rgba(255,230,150,0.9)' : 'rgba(255,255,255,0.18)'; ctx.stroke();
  if (can) glowAt(x + 44, y + h / 2, 60, '#e7d8ff', 0.4 + 0.15 * Math.sin(t * 3));
  ctx.beginPath(); ctx.arc(x + 44, y + h / 2, 30, 0, TAU); ctx.fillStyle = 'rgba(50,30,90,0.8)'; ctx.fill();
  upIcon('pearl', x + 44, y + h / 2, 30);
  txt('REBIRTH', x + 88, y + 26, 26, can ? '#ffe9a8' : '#8fa3bb', 'left');
  txt('Reset upgrades for a Pearl:', x + 88, y + 50, 15, '#9bc4e8', 'left');
  txt('+40% cash, +10% hazards', x + 88, y + 68, 15, '#9bc4e8', 'left');
  txt('Pearls: ' + S.pearls + (can ? '' : '   (needs Line Lv ' + (REBIRTH_LD + 1) + ')'), x + 88, y + 98, 16, '#ffd24a', 'left');
  button(x + w - 118, y + h / 2 - 24, 106, 48, rebirthArm > 0 ? 'SURE?' : 'REBIRTH', can ? rebirth : null, { color: rebirthArm > 0 ? 'red' : 'amber', disabled: !can, size: rebirthArm > 0 ? 24 : 18 });
}

function drawTrophyScreen() {
  screenBg();
  const rows = Math.ceil(SP.length / 2);
  scrollMax = Math.max(0, 96 + rows * 178 - H + 20);
  scrollY = clamp(scrollY, 0, scrollMax);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 78, W, H - 78); ctx.clip();
  SP.forEach((sp, i) => {
    const cx = 14 + (i % 2) * 222, cy = 94 + Math.floor(i / 2) * 178 - scrollY, cw = 210;
    if (cy < -170 || cy > H) return;
    const got = !!S.caught[sp.n];
    glass(cx, cy, cw, 166, 18, 0.7);
    if (got) glowAt(cx + cw / 2, cy + 66, 90, sp.c, 0.18);
    silh = !got;
    drawFish(sp, cx + cw / 2, cy + 66, 1, Math.min(2.3, 120 / Math.max(sp.len, sp.hgt * 1.6)), 0, 0, 0);
    silh = false;
    rr(cx + 12, cy + 124, cw - 24, 30, 15); ctx.fillStyle = got ? '#ffb829' : 'rgba(255,255,255,0.12)'; ctx.fill();
    txt(got ? sp.n + ' x' + S.caught[sp.n] : '???', cx + cw / 2, cy + 140, 17, got ? '#4a2600' : '#8fa3bb');
    if (got) txt('$' + fmt(sp.v), cx + cw - 12, cy + 16, 14, '#ffd24a', 'right');
  });
  ctx.restore();
  header('TROPHIES');
  const got = SP.filter(s => S.caught[s.n]).length;
  txt(got + '/' + SP.length, W - 18, 38, 28, '#ffd24a', 'right', 4);
}

function drawMenu() {
  drawWorld();
  const bg = ctx.createLinearGradient(0, H - 260, 0, H); bg.addColorStop(0, 'rgba(4,16,31,0)'); bg.addColorStop(0.5, 'rgba(4,16,31,0.7)'); bg.addColorStop(1, 'rgba(4,16,31,0.92)');
  ctx.fillStyle = bg; ctx.fillRect(0, H - 260, W, 260);
  // top bar
  button(12, 14, 52, 46, '', () => { sfx.tap(); go('trophy'); }, { color: 'blue', r: 14, draw: () => {} });
  drawFish(SP[1], 38, 37, 1, 0.8, 0, 0, 0);
  moneyPill(W / 2, 14);
  const ready = S.gift !== today();
  button(W - 124, 14, 52, 46, '', claimGift, { color: ready ? 'amber' : 'grey', r: 14, badge: ready, draw: (w, h) => {
    const k = ready ? 1 + 0.1 * Math.sin(t * 6) : 1; ctx.save(); ctx.translate(26, 24); ctx.scale(k, k);
    poly([[-11, -2], [11, -2], [11, 13], [-11, 13]], '#d9261c'); poly([[-13, -8], [13, -8], [13, -2], [-13, -2]], '#ff5a4a'); poly([[-2.5, -8], [2.5, -8], [2.5, 13], [-2.5, 13]], '#ffe27a');
    ctx.beginPath(); ctx.arc(-4, -11, 4, 0, TAU); ctx.arc(4, -11, 4, 0, TAU); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffe27a'; ctx.stroke(); ctx.restore();
  } });
  button(W - 64, 14, 52, 46, '', () => { S.mute = S.mute ? 0 : 1; save(); sfx.tap(); }, { color: 'blue', r: 14, draw: () => {
    poly([[14, 19], [20, 19], [28, 12], [28, 36], [20, 29], [14, 29]], '#fff');
    ctx.lineCap = 'round';
    if (S.mute) { ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(33, 18); ctx.lineTo(42, 30); ctx.moveTo(42, 18); ctx.lineTo(33, 30); ctx.stroke(); }
    else { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.arc(28, 24, 7, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(28, 24, 13, -0.9, 0.9); ctx.stroke(); }
  } });
  if (S.pearls > 0) { glass(72, 18, 62, 34, 17, 0.7); upIcon('pearl', 90, 35, 13); txt('x' + S.pearls, 116, 36, 20, '#e7d8ff', 'center', 3); }
  // missions card
  glass(14, 72, W - 28, 112, 18, 0.55);
  txt('MISSIONS', 28, 90, 16, '#9bd7ff', 'left');
  S.ms.forEach((m, i) => {
    const y = 114 + i * 25;
    txt(missionText(m), 28, y, 16, '#fff', 'left');
    if (m.t === 'catch' && m.n > 1) txt(m.p + '/' + m.n, W - 98, y, 15, '#9fe8ff', 'right');
    rr(W - 88, y - 11, 66, 22, 11); ctx.fillStyle = 'rgba(255,200,40,0.2)'; ctx.fill();
    txt('$' + fmt(m.r), W - 55, y + 1, 15, '#ffd24a');
  });
  const ty = H * 0.5;
  const ph = 1 + 0.04 * Math.sin(t * 3);
  ctx.save(); ctx.translate(W / 2, ty); ctx.scale(ph, ph); txt('TAP TO START FISHING!', 0, 0, 30, '#fff', 'center', 7); ctx.restore();
  // bottom buttons
  const bw = (W - 28 - 12) / 2;
  button(14, H - 196, bw, 62, 'SHOP', () => { sfx.tap(); go('shop'); }, { color: 'blue', light: true, size: 28, badge: affordable() });
  button(14 + bw + 12, H - 196, bw, 62, 'TROPHIES', () => { sfx.tap(); go('trophy'); }, { color: 'blue', light: true, size: 26 });
  button(14, H - 118, W - 28, 88, 'GO FISH!', () => { sfx.tap(); startDive(); }, { size: 52, shine: 1 });
}

function drawResultPanel() {
  const u = eOut(resT / 0.5), fail = res.failed;
  ctx.fillStyle = 'rgba(2,10,24,' + 0.45 * u + ')'; ctx.fillRect(0, 0, W, H);
  const rows = [];
  if (fail) { rows.push(['LOST FISH', '' + res.lost, '#ff9a9a']); }
  else {
    rows.push(['FISH CAUGHT', '' + res.fish, '#fff']);
    if (res.combo >= 3) rows.push(['BEST COMBO', 'x' + res.combo, '#ffe14d']);
    if (res.flawless && res.fish > 0) rows.push(['FLAWLESS', 'NO DAMAGE', '#7fffb0']);
    if (res.newT) rows.push(['NEW TROPHY!', '', '#ff8fc7']);
    if (res.mbonus > 0) rows.push(['MISSION BONUS', '+$' + fmt(res.mbonus), '#7fffb0']);
  }
  const ph = 190 + rows.length * 34, pw = W - 50, px = 25, py = Math.max(100, H * 0.5 - ph / 2) + (1 - u) * 140;
  ctx.globalAlpha = u;
  glass(px, py, pw, ph, 24, 0.82);
  rr(px, py, pw, ph, 24); ctx.lineWidth = 2.5; ctx.strokeStyle = fail ? 'rgba(255,90,90,0.8)' : 'rgba(255,220,120,0.8)'; ctx.stroke();
  txt(fail ? 'LINE SNAPPED!' : 'DIVE COMPLETE', W / 2, py + 38, 36, fail ? '#ff6b6b' : '#fff', 'center', 6);
  const cu = clamp((resT - 0.45) / 1.0, 0, 1), shown = Math.round(res.earned * eOut(cu));
  txt((fail ? 'SALVAGED  +$' : '+$') + fmt(shown), W / 2, py + 100, fail ? 40 : 62, '#ffe14d', 'center', 8);
  rows.forEach((r, i) => {
    const y = py + 160 + i * 34;
    txt(r[0], px + 26, y, 20, r[2], 'left', 4); txt(r[1], px + pw - 26, y, 22, r[2], 'right', 4);
  });
  if (fail) txt('Dodge hazards or grab a SHIELD / REPAIR!', W / 2, py + ph - 24, 15, '#9bc4e8');
  if (resT > 1) { ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 5); txt('TAP TO CONTINUE', W / 2, py + ph + 34, 24, '#fff', 'center', 5); }
  ctx.globalAlpha = 1;
}

/* ---------- frame ---------- */
function draw() {
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  btns.length = 0;
  if (st === 'shop') drawShop();
  else if (st === 'trophy') drawTrophyScreen();
  else {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);
    if (boostE > 0.01) { const z = 1 - 0.05 * boostE; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); }
    if (st === 'menu') drawMenu(); else drawWorld();
    ctx.restore();
    if (st === 'down' || st === 'up') { drawScreenFX(); drawHUD(); drawFlyers(); drawBanner(); }
    else if (st === 'snap') { drawScreenFX(); moneyPill(W / 2, 14); }
    else if (st === 'result') { moneyPill(W / 2, 14); drawResultPanel(); }
    drawToasts();
  }
  if (fade > 0.01) { ctx.fillStyle = 'rgba(2,10,24,' + fade * 0.7 + ')'; ctx.fillRect(0, 0, W, H); }
}

/* ---------- input ---------- */
let pDown = null;
function pt(e) { return { x: e.clientX / innerWidth * W, y: e.clientY / innerHeight * H }; }
function findBtn(p) {
  for (let i = btns.length - 1; i >= 0; i--) {
    const b = btns[i];
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
  }
  return null;
}
cv.addEventListener('pointerdown', e => {
  const p = pt(e);
  try { if (ac && ac.state === 'suspended') ac.resume(); } catch (er) {}
  const b = findBtn(p);
  pDown = { x: p.x, y: p.y, ly: p.y, moved: 0, b };
  pressedId = b ? b.id : null;
  if (st === 'down' || st === 'up') tx = p.x;
});
cv.addEventListener('pointermove', e => {
  if (!pDown) return;
  const p = pt(e);
  pDown.moved += Math.abs(p.x - pDown.x) + Math.abs(p.y - pDown.ly); pDown.x = p.x;
  if (st === 'down' || st === 'up') tx = p.x;
  else if (st === 'shop' || st === 'trophy') { scrollY = clamp(scrollY - (p.y - pDown.ly), 0, scrollMax); }
  pDown.ly = p.y;
  if (pDown.moved > 14 && (st === 'shop' || st === 'trophy')) pressedId = null;
});
function release(e) {
  if (!pDown) return;
  const p = e && e.clientX != null ? pt(e) : { x: pDown.x, y: pDown.ly };
  const d = pDown; pDown = null;
  const tap = d.moved <= 14;
  const b = d.b && pressedId === d.b.id ? d.b : null;
  pressedId = null;
  if (b && tap && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { if (b.disabled) sfx.deny(); else b.fn(); return; }
  if (d.b) return;
  if (st === 'result' && resT > 0.9) { toMenu(); return; }
  if (st === 'menu' && tap && p.y > 190 && p.y < H - 210) { sfx.tap(); startDive(); }
}
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', () => { pDown = null; pressedId = null; });

/* ---------- loop ---------- */
let last = performance.now();
function loop(n) {
  const dt = Math.min(0.05, (n - last) / 1000); last = n;
  update(dt); draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
