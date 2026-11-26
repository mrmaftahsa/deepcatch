'use strict';
/* Deep Catch v3 - rendering of fish, hazards, world */
function txt(s, x, y, size, fill, align, stroke, sc2) {
  ctx.font = size + 'px ' + FONT;
  ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = sc2 || 'rgba(0,15,35,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function poly(pts, fill) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function glowAt(x, y, r, c, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/* ---------- icons ---------- */
function heartPath(x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.9, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.9, y - s * 1.1, x + s * 1.5, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}
function drawHeart(x, y, s, full) {
  heartPath(x, y, s);
  if (full) {
    const g = ctx.createLinearGradient(0, y - s, 0, y + s); g.addColorStop(0, '#ff7a8f'); g.addColorStop(1, '#e0213f');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(70,0,15,0.85)'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x - s * 0.45, y - s * 0.35, s * 0.22, s * 0.12, -0.6, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,10,25,0.45)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
  }
}
function drawCoin(x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#fff3a8'); g.addColorStop(0.6, '#ffc61a'); g.addColorStop(1, '#d68a00');
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#9a5b00'; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.68, 0, TAU); ctx.strokeStyle = 'rgba(154,91,0,0.6)'; ctx.stroke();
  txt('$', x, y + 1, r * 1.1, '#9a5b00');
}
function puIcon(k, x, y, s, c) {
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (k === 'magnet') {
    ctx.lineWidth = s * 0.42; ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.55, Math.PI, 0); ctx.lineTo(s * 0.55, s * 0.5); ctx.moveTo(-s * 0.55, -s * 0.05); ctx.lineTo(-s * 0.55, s * 0.5); ctx.stroke();
    ctx.lineWidth = s * 0.46; ctx.strokeStyle = '#ff3b3b';
    ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.32); ctx.lineTo(-s * 0.55, s * 0.55); ctx.moveTo(s * 0.55, s * 0.32); ctx.lineTo(s * 0.55, s * 0.55); ctx.stroke();
  } else if (k === 'shield') {
    ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(s * 0.7, -s * 0.5); ctx.quadraticCurveTo(s * 0.7, s * 0.4, 0, s * 0.85); ctx.quadraticCurveTo(-s * 0.7, s * 0.4, -s * 0.7, -s * 0.5); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(s * 0.4, -s * 0.3); ctx.quadraticCurveTo(s * 0.4, s * 0.25, 0, s * 0.5); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
  } else if (k === 'dbl') {
    txt('x2', 0, s * 0.05, s * 1.3, '#fff', 'center', s * 0.25, rgba(c, 1));
  } else if (k === 'turbo') {
    poly([[s * 0.15, -s * 0.9], [-s * 0.6, s * 0.1], [-s * 0.05, s * 0.1], [-s * 0.2, s * 0.9], [s * 0.6, -s * 0.2], [s * 0.05, -s * 0.2]], '#fff');
  } else if (k === 'heal') {
    drawHeart(0, -s * 0.05, s * 0.6, true);
  }
  ctx.restore();
}
function upIcon(k, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = s * 0.14;
  if (k === 'ld') {
    ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(0, s * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.arc(-s * 0.25, s * 0.35, s * 0.25, 0, Math.PI); ctx.stroke();
    poly([[-s * 0.55, -s * 0.15], [-s * 0.1, -s * 0.15], [-s * 0.32, s * 0.1]], '#fff');
  } else if (k === 'lc') {
    ctx.beginPath(); ctx.moveTo(s * 0.1, -s * 0.8); ctx.lineTo(s * 0.1, s * 0.2); ctx.arc(-s * 0.2, s * 0.2, s * 0.3, 0, Math.PI * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * 0.1, -s * 0.85, s * 0.1, 0, TAU); ctx.stroke();
  } else if (k === 'lv') {
    drawCoin(0, 0, s * 0.7);
  } else if (k === 'lk') {
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.33, Math.sin(a) * s * 0.33, s * 0.3, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.2, s * 0.5, s * 0.5, s * 0.8); ctx.stroke();
  } else if (k === 'ls') {
    drawHeart(0, 0, s * 0.62, true);
  } else if (k === 'lr') {
    poly([[s * 0.2, -s * 0.85], [-s * 0.55, s * 0.1], [-s * 0.05, s * 0.1], [-s * 0.25, s * 0.85], [s * 0.55, -s * 0.15], [s * 0.05, -s * 0.15]], '#fff');
  } else if (k === 'pearl') {
    const g = ctx.createRadialGradient(-s * 0.2, -s * 0.25, s * 0.05, 0, 0, s * 0.7);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#e7d8ff'); g.addColorStop(1, '#a98cd8');
    ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, TAU); ctx.fillStyle = g; ctx.fill();
  }
  ctx.restore();
}

/* ---------- fish ---------- */
let silh = false;
const fc = c => silh ? '#000' : c;
function bodyPath(L, Hh) {
  ctx.beginPath(); ctx.moveTo(L * 0.5, 0);
  ctx.bezierCurveTo(L * 0.36, -Hh * 0.62, -L * 0.12, -Hh * 0.66, -L * 0.38, -Hh * 0.16);
  ctx.lineTo(-L * 0.38, Hh * 0.16);
  ctx.bezierCurveTo(-L * 0.12, Hh * 0.62, L * 0.36, Hh * 0.58, L * 0.5, 0);
  ctx.closePath();
}
function tailPath(L, Hh, type) {
  const tl = L * 0.3, th = Hh * (type === 'lunate' ? 0.8 : type === 'round' ? 0.58 : 0.7);
  ctx.beginPath(); ctx.moveTo(0, -Hh * 0.13);
  if (type === 'round') { ctx.quadraticCurveTo(-tl * 0.9, -th, -tl, 0); ctx.quadraticCurveTo(-tl * 0.9, th, 0, Hh * 0.13); }
  else if (type === 'lunate') { ctx.quadraticCurveTo(-tl * 0.5, -th * 0.55, -tl * 1.15, -th); ctx.quadraticCurveTo(-tl * 0.5, 0, -tl * 1.15, th); ctx.quadraticCurveTo(-tl * 0.5, th * 0.55, 0, Hh * 0.13); }
  else { ctx.lineTo(-tl, -th); ctx.quadraticCurveTo(-tl * 0.6, 0, -tl, th); ctx.lineTo(0, Hh * 0.13); }
  ctx.closePath();
}
function drawFish(sp, x, y, dir, k, rot, gold, ph) {
  const ex = sp.ex;
  if (ex === 'chest') return drawChest(sp, x, y, k);
  if (ex === 'ray') return drawRay(sp, x, y, dir, k, rot, gold, ph);
  if (ex === 'squid') return drawSquid(sp, x, y, dir, k, rot, gold, ph);
  const L = sp.len, Hh = sp.hgt;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(dir * k, k);
  const C = gold ? '#ffcc1f' : sp.c, A = gold ? '#fff0a0' : sp.a, B = gold ? '#fff6c8' : sp.b;
  if (!silh) {
    if (gold) glowAt(0, 0, L * 0.85, '#ffd21f', 0.5);
    if (sp.glow) glowAt(L * 0.25, -Hh * 0.1, L * 0.55, '#7fe8ff', 0.22);
  }
  const sw = Math.sin(t * 7 + (ph || 0)) * 0.25;
  ctx.save(); ctx.translate(-L * 0.34, 0); ctx.rotate(sw);
  tailPath(L, Hh, sp.tail || 'fork'); ctx.fillStyle = fc(A); ctx.globalAlpha = silh ? 1 : 0.93; ctx.fill(); ctx.globalAlpha = 1;
  if (!silh) { ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.restore();

  const df = sp.dors || 0.3;
  if (ex === 'spikes') {
    ctx.strokeStyle = fc(A); ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const x0 = L * (0.22 - i * 0.075), w = Math.sin(t * 3 + i + (ph || 0)) * 2;
      ctx.beginPath(); ctx.moveTo(x0, -Hh * 0.46); ctx.lineTo(x0 - L * 0.07 + w, -Hh * 1.05); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) { const x0 = L * (0.05 - i * 0.07); ctx.beginPath(); ctx.moveTo(x0, Hh * 0.46); ctx.lineTo(x0 - L * 0.06, Hh * 0.95); ctx.stroke(); }
  } else if (ex === 'ribbon') {
    ctx.strokeStyle = fc(A); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= 16; i++) { const xx = L * 0.38 - i * L * 0.045, yy = -Hh * 0.5 - 3 - Math.abs(Math.sin(t * 5 + i * 0.7)) * Hh * 0.9; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
    ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(L * 0.2, -Hh * 0.5);
    ctx.quadraticCurveTo(-L * 0.02, -Hh * (0.5 + df * 1.5), -L * 0.32, -Hh * 0.28); ctx.closePath();
    ctx.fillStyle = fc(A); ctx.globalAlpha = silh ? 1 : 0.9; ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(L * 0.05, Hh * 0.5); ctx.quadraticCurveTo(-L * 0.08, Hh * (0.5 + df * 0.9), -L * 0.22, Hh * 0.4); ctx.closePath();
    ctx.fillStyle = fc(A); ctx.globalAlpha = silh ? 1 : 0.85; ctx.fill(); ctx.globalAlpha = 1;
  }
  if (ex === 'sword') poly([[L * 0.46, -Hh * 0.05], [L * 1.08, 0], [L * 0.46, Hh * 0.05]], fc('#d9e4ec'));
  if (ex === 'lure') {
    ctx.strokeStyle = fc('#1c0f24'); ctx.lineWidth = 2;
    const bx = L * 0.62 + Math.sin(t * 2 + (ph || 0)) * 3, by = -Hh * 1.05;
    ctx.beginPath(); ctx.moveTo(L * 0.28, -Hh * 0.45); ctx.quadraticCurveTo(L * 0.52, -Hh * 1.2, bx, by); ctx.stroke();
    if (!silh) { glowAt(bx, by, 26, '#ffe14d', 0.8); ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, TAU); ctx.fillStyle = '#fff6b0'; ctx.fill(); }
  }

  bodyPath(L, Hh);
  if (silh) { ctx.fillStyle = '#000'; ctx.fill(); ctx.restore(); return; }
  const g = ctx.createLinearGradient(0, -Hh * 0.6, 0, Hh * 0.6);
  g.addColorStop(0, shade(C, -0.22)); g.addColorStop(0.45, C); g.addColorStop(1, B);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); bodyPath(L, Hh); ctx.clip();
  const pat = sp.pat;
  if (pat === 'bands') {
    [[-L * 0.02], [L * 0.24]].forEach(b => {
      ctx.fillStyle = A; ctx.fillRect(b[0] - L * 0.05, -Hh, L * 0.1, Hh * 2);
      ctx.strokeStyle = 'rgba(20,10,0,0.6)'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(b[0] - L * 0.05, -Hh); ctx.lineTo(b[0] - L * 0.05, Hh); ctx.moveTo(b[0] + L * 0.05, -Hh); ctx.lineTo(b[0] + L * 0.05, Hh); ctx.stroke();
    });
  } else if (pat === 'zebra') {
    ctx.fillStyle = A;
    for (let i = 0; i < 6; i++) { const bx = -L * 0.32 + i * L * 0.125; poly([[bx, -Hh], [bx + L * 0.05, -Hh], [bx + L * 0.02, Hh], [bx - L * 0.03, Hh]], A); }
  } else if (pat === 'stripes') {
    ctx.strokeStyle = A; ctx.lineWidth = 2.2;
    for (let j = -1; j <= 1; j++) { ctx.beginPath(); for (let i = 0; i <= 10; i++) { const xx = -L * 0.35 + i * L * 0.075, yy = j * Hh * 0.2 - Hh * 0.12 + Math.sin(i * 1.2 + j) * 2; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); }
  } else if (pat === 'spots') {
    ctx.fillStyle = rgba(A, 0.6);
    for (let i = 0; i < 11; i++) { const xx = -L * 0.3 + ((i * 37) % 100) / 100 * L * 0.7, yy = (((i * 53) % 100) / 100 - 0.5) * Hh * 0.8; ctx.beginPath(); ctx.arc(xx, yy, 1.6 + (i % 3), 0, TAU); ctx.fill(); }
  }
  if (ex === 'whale') {
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(L * 0.3, Hh * (0.12 + i * 0.07)); ctx.lineTo(-L * 0.2, Hh * (0.16 + i * 0.09)); ctx.stroke(); }
  }
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(L * 0.05, -Hh * 0.28, L * 0.28, Hh * 0.1, -0.05, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
  bodyPath(L, Hh); ctx.lineWidth = 1.2; ctx.strokeStyle = rgba('#001020', 0.35); ctx.stroke();
  // pectoral fin
  ctx.save(); ctx.translate(L * 0.1, Hh * 0.12); ctx.rotate(Math.sin(t * 6 + (ph || 0)) * 0.3 + 0.4);
  ctx.beginPath(); ctx.ellipse(-L * 0.06, 0, L * 0.1, Hh * 0.09, 0, 0, TAU); ctx.fillStyle = rgba(A, 0.85); ctx.fill(); ctx.restore();
  // gill
  ctx.beginPath(); ctx.arc(L * 0.14, 0, Hh * 0.32, -0.9, 0.9); ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  // mouth specifics
  if (ex === 'shark') {
    for (let i = 0; i < 5; i++) poly([[L * 0.46 - i * 5, Hh * 0.1], [L * 0.43 - i * 5, Hh * 0.22], [L * 0.4 - i * 5, Hh * 0.1]], '#fff');
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(L * 0.1 - i * 5, -Hh * 0.12); ctx.lineTo(L * 0.1 - i * 5 - 2, Hh * 0.12); ctx.stroke(); }
  }
  if (ex === 'lure') for (let i = 0; i < 5; i++) poly([[L * 0.46 - i * 5, Hh * 0.05], [L * 0.43 - i * 5, Hh * 0.28], [L * 0.4 - i * 5, Hh * 0.06]], '#fff');
  if (ex === 'fangs') { poly([[L * 0.45, Hh * 0.08], [L * 0.43, Hh * 0.5], [L * 0.39, Hh * 0.1]], '#fff'); poly([[L * 0.36, Hh * 0.1], [L * 0.35, Hh * 0.45], [L * 0.31, Hh * 0.12]], '#fff'); }
  if (ex === 'glow' || ex === 'fangs' || sp.glow) {
    for (let i = 0; i < 6; i++) {
      const xx = L * 0.3 - i * L * 0.1, yy = Hh * 0.27 - Math.abs(i - 2.5) * 0.4;
      glowAt(xx, yy, 7, '#9be7ff', 0.7);
    }
  }
  // eye
  const er = Math.max(2.3, Hh * 0.13), ex2 = L * 0.31, ey = -Hh * 0.1;
  if (sp.glow && ex === 'whale') glowAt(ex2, ey, 14, '#7fe8ff', 0.9);
  ctx.beginPath(); ctx.arc(ex2, ey, er, 0, TAU); ctx.fillStyle = ex === 'shark' ? '#ffdede' : '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(ex2 + er * 0.2, ey, er * 0.58, 0, TAU); ctx.fillStyle = ex === 'shark' ? '#d01b1b' : '#10151f'; ctx.fill();
  ctx.beginPath(); ctx.arc(ex2 + er * 0.05, ey - er * 0.25, er * 0.22, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
  if (gold) {
    const a = t * 4 + x * 0.1, sx = Math.cos(a) * L * 0.25, sy = Math.sin(a * 1.3) * Hh * 0.3, q = 3 + Math.sin(a * 3) * 1.5;
    poly([[sx, sy - q * 1.8], [sx + q * 0.55, sy], [sx, sy + q * 1.8], [sx - q * 0.55, sy]], '#fff');
    poly([[sx - q * 1.8, sy], [sx, sy + q * 0.55], [sx + q * 1.8, sy], [sx, sy - q * 0.55]], '#fff');
  }
  ctx.restore();
}
function drawChest(sp, x, y, k) {
  const w = sp.len * 0.9, h = sp.hgt * 0.75;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  if (silh) {
    ctx.fillStyle = '#000'; rr(-w / 2, -h * 0.55, w, h * 1.1, 6); ctx.fill(); ctx.restore(); return;
  }
  glowAt(0, 0, w * 0.9, '#ffd24a', 0.28 + 0.12 * Math.sin(t * 3));
  const g = ctx.createLinearGradient(0, -h * 0.1, 0, h * 0.55); g.addColorStop(0, '#b0627a'); g.addColorStop(1, '#6f3548');
  rr(-w / 2, -h * 0.1, w, h * 0.65, 4); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(30,0,10,0.6)'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.1); ctx.quadraticCurveTo(0, -h * 1.05, w / 2, -h * 0.1); ctx.closePath();
  const g2 = ctx.createLinearGradient(0, -h * 0.8, 0, -h * 0.1); g2.addColorStop(0, '#c9788f'); g2.addColorStop(1, '#8e4a5e');
  ctx.fillStyle = g2; ctx.fill(); ctx.stroke();
  ctx.fillStyle = sp.a;
  [-w * 0.3, w * 0.2].forEach(bx => { ctx.fillRect(bx, -h * 0.1, w * 0.1, h * 0.65); });
  rr(-w * 0.07, -h * 0.18, w * 0.14, h * 0.3, 3); ctx.fillStyle = '#ffe48a'; ctx.fill(); ctx.stroke();
  const a = t * 3 + x, sx = Math.cos(a) * w * 0.35, sy = -h * 0.35 + Math.sin(a * 1.3) * h * 0.15, q = 2.5 + Math.sin(a * 3) * 1.2;
  poly([[sx, sy - q * 1.8], [sx + q * 0.5, sy], [sx, sy + q * 1.8], [sx - q * 0.5, sy]], '#fff');
  poly([[sx - q * 1.8, sy], [sx, sy + q * 0.5], [sx + q * 1.8, sy], [sx, sy - q * 0.5]], '#fff');
  ctx.restore();
}
function drawRay(sp, x, y, dir, k, rot, gold, ph) {
  const L = sp.len, Hh = sp.hgt, fl = Math.sin(t * 3 + (ph || 0)) * Hh * 0.16;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(dir * k, k);
  const C = gold ? '#ffcc1f' : sp.c, B = gold ? '#fff6c8' : sp.b;
  if (gold && !silh) glowAt(0, 0, L * 0.7, '#ffd21f', 0.5);
  ctx.strokeStyle = fc(sp.a); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-L * 0.3, 0); ctx.quadraticCurveTo(-L * 0.55, Math.sin(t * 4 + (ph || 0)) * 6, -L * 0.8, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(L * 0.5, 0);
  ctx.quadraticCurveTo(L * 0.2, -Hh * 0.25, -L * 0.05, -Hh * 0.5 - fl);
  ctx.quadraticCurveTo(-L * 0.22, -Hh * 0.52 - fl, -L * 0.34, -Hh * 0.08);
  ctx.lineTo(-L * 0.34, Hh * 0.08);
  ctx.quadraticCurveTo(-L * 0.22, Hh * 0.52 + fl, -L * 0.05, Hh * 0.5 + fl);
  ctx.quadraticCurveTo(L * 0.2, Hh * 0.25, L * 0.5, 0); ctx.closePath();
  if (silh) { ctx.fillStyle = '#000'; ctx.fill(); ctx.restore(); return; }
  const g = ctx.createLinearGradient(-L * 0.3, 0, L * 0.5, 0); g.addColorStop(0, shade(C, -0.2)); g.addColorStop(1, shade(C, 0.15));
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,10,25,0.4)'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(L * 0.18, 0, L * 0.2, Hh * 0.12, 0, 0, TAU); ctx.fillStyle = rgba(B, 0.55); ctx.fill();
  poly([[L * 0.5, -Hh * 0.05], [L * 0.62, -Hh * 0.16], [L * 0.48, Hh * 0.0]], shade(C, -0.1));
  poly([[L * 0.5, Hh * 0.05], [L * 0.62, Hh * 0.16], [L * 0.48, Hh * 0.0]], shade(C, -0.1));
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(L * 0.36, s * Hh * 0.1, 2.4, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.beginPath(); ctx.arc(L * 0.37, s * Hh * 0.1, 1.2, 0, TAU); ctx.fillStyle = '#111'; ctx.fill(); });
  ctx.restore();
}
function drawSquid(sp, x, y, dir, k, rot, gold, ph) {
  const L = sp.len, Hh = sp.hgt;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(dir * k, k);
  const C = gold ? '#ffcc1f' : sp.c, A = gold ? '#fff0a0' : sp.a;
  if (!silh) { glowAt(0, 0, L * 0.7, gold ? '#ffd21f' : '#ff7fb0', gold ? 0.5 : 0.18); }
  ctx.strokeStyle = fc(shade(C, -0.1)); ctx.lineCap = 'round';
  for (let i = -3; i <= 3; i++) {
    ctx.lineWidth = i % 2 ? 2 : 3; ctx.beginPath(); ctx.moveTo(-L * 0.1, i * Hh * 0.09);
    for (let j = 1; j <= 6; j++) ctx.lineTo(-L * 0.1 - j * L * 0.07, i * Hh * 0.1 + Math.sin(t * 5 + j * 0.9 + i + (ph || 0)) * 3);
    ctx.stroke();
  }
  poly([[L * 0.18, -Hh * 0.35], [L * 0.52, 0], [L * 0.18, Hh * 0.35], [L * 0.3, 0]], fc(A));
  ctx.beginPath(); ctx.moveTo(L * 0.5, 0); ctx.bezierCurveTo(L * 0.3, -Hh * 0.55, -L * 0.1, -Hh * 0.45, -L * 0.14, -Hh * 0.18); ctx.lineTo(-L * 0.14, Hh * 0.18); ctx.bezierCurveTo(-L * 0.1, Hh * 0.45, L * 0.3, Hh * 0.55, L * 0.5, 0); ctx.closePath();
  if (silh) { ctx.fillStyle = '#000'; ctx.fill(); ctx.restore(); return; }
  const g = ctx.createLinearGradient(0, -Hh * 0.5, 0, Hh * 0.5); g.addColorStop(0, shade(C, -0.15)); g.addColorStop(1, shade(C, 0.25));
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(40,0,20,0.35)'; ctx.stroke();
  ctx.fillStyle = rgba(A, 0.7);
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(L * 0.3 - i * L * 0.07, Math.sin(i * 2.1) * Hh * 0.18, 2 + (i % 2), 0, TAU); ctx.fill(); }
  ctx.beginPath(); ctx.arc(-L * 0.08, -Hh * 0.0, 5.5, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(-L * 0.07, 0, 3, 0, TAU); ctx.fillStyle = '#111'; ctx.fill();
  ctx.restore();
}

/* ---------- hazards & pickups ---------- */
function drawJelly(h) {
  const x = h.x, y = h.y, p = Math.sin(t * 3 + h.ph);
  ctx.save(); ctx.translate(x, y);
  glowAt(0, 4, 46, '#c58bff', 0.35);
  ctx.lineCap = 'round'; ctx.lineWidth = 2.5;
  for (let i = -3; i <= 3; i++) {
    ctx.strokeStyle = rgba('#e0b8ff', 0.7 - Math.abs(i) * 0.08);
    ctx.beginPath(); ctx.moveTo(i * 5, 5);
    for (let j = 1; j <= 6; j++) ctx.lineTo(i * 5 + Math.sin(t * 4 + j * 0.8 + i) * 4, 5 + j * 6 + p * 2);
    ctx.stroke();
  }
  const w = 21 + p * 1.5, hh = 16 - p * 1.5;
  ctx.beginPath(); ctx.moveTo(-w, 5); ctx.bezierCurveTo(-w, -hh * 1.7, w, -hh * 1.7, w, 5); ctx.quadraticCurveTo(0, 11, -w, 5); ctx.closePath();
  const g = ctx.createRadialGradient(-5, -hh * 0.6, 2, 0, 0, w * 1.2); g.addColorStop(0, 'rgba(250,225,255,0.95)'); g.addColorStop(0.6, 'rgba(190,120,255,0.8)'); g.addColorStop(1, 'rgba(130,70,230,0.7)');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-7, -hh * 0.7, 6, 3, -0.4, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
  ctx.restore();
}
function drawMine(h) {
  const x = h.x, y = h.y;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.8 + h.ph) * 0.2);
  ctx.strokeStyle = '#2b2f3d'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.stroke(); }
  const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, 16); g.addColorStop(0, '#6b7188'); g.addColorStop(1, '#222634');
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#12141c'; ctx.stroke();
  const on = Math.sin(t * 8 + h.ph) > 0;
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fillStyle = on ? '#ff4040' : '#7a1d1d'; ctx.fill();
  ctx.restore();
  if (on) glowAt(x, y, 34, '#ff4040', 0.55);
}
function drawPuffer(h) {
  const r = h.r, inf = clamp((r - h.base) / 15, 0, 1);
  ctx.save(); ctx.translate(h.x, h.y);
  if (inf > 0.1) glowAt(0, 0, r * 2.2, '#ff5a40', 0.18 * inf);
  ctx.strokeStyle = '#f7e3a0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); ctx.lineTo(Math.cos(a) * (r + 2 + inf * 8), Math.sin(a) * (r + 2 + inf * 8)); ctx.stroke(); }
  poly([[-r * 0.8, 0], [-r * 1.5, -r * 0.5], [-r * 1.5, r * 0.5]], '#d49a3a');
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 2, 0, 0, r * 1.1); g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.7, '#e5a94a'); g.addColorStop(1, '#b87323');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(70,35,0,0.6)'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.7, r * 0.45, 0, 0, Math.PI); ctx.fillStyle = 'rgba(255,245,210,0.8)'; ctx.fill();
  const er = Math.max(3, r * 0.22);
  ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.2, er, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.2, er * 0.55, 0, TAU); ctx.fillStyle = inf > 0.5 ? '#d01b1b' : '#111'; ctx.fill();
  if (inf > 0.5) { ctx.strokeStyle = '#4a1a00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.5); ctx.lineTo(r * 0.6, -r * 0.35); ctx.stroke(); }
  ctx.restore();
}
function drawKelp(h) {
  ctx.save(); ctx.lineCap = 'round';
  for (let b = -1; b <= 1; b++) {
    ctx.beginPath();
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const yy = h.y + (h.h * i) / n, xx = h.x + b * 9 + Math.sin(t * 1.4 + h.ph + i * 0.5 + b) * (3 + i * 1.5);
      if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
    }
    ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(18,110,80,0.9)'; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(80,220,140,0.85)'; ctx.stroke();
  }
  ctx.restore();
}
function drawEel(h) {
  const wallX = h.side < 0 ? 0 : W, d = -h.side;
  const peek = h.s === 'idle' ? 16 : 0;
  ctx.save();
  if (h.s === 'warn') {
    const a = 0.12 + 0.12 * Math.sin(t * 22);
    ctx.fillStyle = 'rgba(255,50,50,' + a + ')';
    const x0 = h.side < 0 ? 0 : W - h.reach;
    ctx.fillRect(x0, h.y - 20, h.reach, 40);
    ctx.fillStyle = 'rgba(255,60,60,0.8)';
    const ex = h.side < 0 ? h.reach : W - h.reach;
    poly([[ex, h.y - 18], [ex - h.side * 16, h.y], [ex, h.y + 18]], 'rgba(255,60,60,0.85)');
  }
  const ext = h.ext + peek + (h.s === 'warn' ? Math.sin(t * 40) * 3 + 12 : 0);
  const hx = wallX - d * 0 + (h.side < 0 ? ext : -ext);
  // body
  ctx.lineCap = 'round';
  const segs = 14;
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, xx = lerp(wallX, hx, u), yy = h.y + Math.sin(t * 8 + u * 6) * 4 * (h.s === 'lunge' ? 1.4 : 0.6);
    if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
  }
  ctx.lineWidth = 20; ctx.strokeStyle = '#1f4a38'; ctx.stroke();
  ctx.lineWidth = 15; ctx.strokeStyle = '#2f7a57'; ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(230,255,120,0.55)'; ctx.setLineDash([6, 12]); ctx.stroke(); ctx.setLineDash([]);
  // head
  ctx.save(); ctx.translate(hx, h.y); ctx.scale(-h.side, 1);
  ctx.beginPath(); ctx.ellipse(6, 0, 15, 11, 0, 0, TAU); ctx.fillStyle = '#2f7a57'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, 2); ctx.lineTo(26, 6); ctx.lineTo(12, 8); ctx.fillStyle = '#12281f'; ctx.fill();
  for (let i = 0; i < 3; i++) poly([[14 + i * 4, 3 + i], [15 + i * 4, 7], [17 + i * 4, 4]], '#fff');
  const hot = h.s !== 'idle';
  if (hot) glowAt(8, -3, 14, '#ff3030', 0.9);
  ctx.beginPath(); ctx.arc(8, -3, 3.4, 0, TAU); ctx.fillStyle = hot ? '#ff4040' : '#ffd24a'; ctx.fill();
  ctx.restore();
  ctx.restore();
}
function drawLure(h) {
  const f = 0.6 + 0.4 * Math.sin(t * 13 + h.ph);
  glowAt(h.x, h.y, 38, '#ffe14d', 0.7 * f);
  ctx.save(); ctx.translate(h.x, h.y);
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fillStyle = '#fff6b0'; ctx.fill();
  ctx.strokeStyle = 'rgba(70,40,0,0.9)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.stroke(); }
  ctx.restore();
}
function drawOrb(o) {
  const y = o.y + Math.sin(t * 2 + o.ph) * 4, P = PU[o.k], sp = 1 + 0.06 * Math.sin(t * 4 + o.ph);
  glowAt(o.x, y, 44, P.c, 0.45);
  ctx.save(); ctx.translate(o.x, y); ctx.scale(sp, sp);
  const g = ctx.createRadialGradient(-6, -7, 2, 0, 0, 22); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0.12)');
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
  const g2 = ctx.createRadialGradient(-3, -4, 1, 0, 0, 15); g2.addColorStop(0, shade(P.c, 0.35)); g2.addColorStop(1, P.c);
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fillStyle = g2; ctx.fill();
  puIcon(o.k, 0, 0, 10, P.c);
  ctx.restore();
}

/* ---------- world ---------- */
const decor = [], far = [];
let seed = 7;
function srnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
for (let y = 250; y < 20000; y += 240) decor.push({ y, left: srnd() < 0.5, w: 40 + srnd() * 90, h: 100 + srnd() * 160, weed: srnd() < 0.6, wx: 30 + srnd() * (W - 60) });
for (let y = 100; y < 20000; y += 330) far.push({ y, left: srnd() < 0.5, w: 90 + srnd() * 120, h: 200 + srnd() * 220 });

function cloud(x, y, k) {
  poly([[x, y + 20 * k], [x + 10 * k, y - 10 * k], [x + 35 * k, y - 25 * k], [x + 60 * k, y - 15 * k], [x + 80 * k, y + 5 * k], [x + 70 * k, y + 25 * k], [x + 30 * k, y + 30 * k]], '#fffbe6');
  poly([[x + 30 * k, y + 30 * k], [x + 70 * k, y + 25 * k], [x + 80 * k, y + 5 * k], [x + 50 * k, y + 12 * k]], '#cdf4dc');
}
function drawBoat() {
  const bob = Math.sin(t * 2) * 3;
  ctx.save(); ctx.translate(130, bob);
  ctx.beginPath(); ctx.ellipse(0, 12, 112, 10, 0, 0, TAU); ctx.fillStyle = 'rgba(0,60,70,0.25)'; ctx.fill();
  let g = ctx.createLinearGradient(0, -48, 0, 8); g.addColorStop(0, '#d12a2a'); g.addColorStop(1, '#8c1212');
  poly([[-100, -40], [100, -48], [78, 8], [-72, 8]], g);
  g = ctx.createLinearGradient(0, -22, 0, 8); g.addColorStop(0, '#ff8a2a'); g.addColorStop(1, '#e0590a');
  poly([[-88, -14], [88, -22], [78, 8], [-72, 8]], g);
  poly([[-100, -40], [100, -48], [100, -42], [-100, -34]], '#e0974a');
  poly([[-45, -38], [-40, -72], [-10, -80], [5, -45]], '#2b3f9c');
  poly([[-38, -92], [-5, -92], [-10, -70], [-30, -70]], '#fff1e6');
  poly([[-10, -80], [8, -88], [6, -70], [-10, -70]], '#f0d2c0');
  poly([[-4, -90], [6, -90], [6, -82], [-4, -82]], '#ff4fa3');
  poly([[-48, -98], [-25, -118], [0, -112], [20, -98]], '#ffc800');
  poly([[-25, -118], [0, -112], [-8, -104], [-30, -106]], '#ffe566');
  ctx.beginPath(); ctx.moveTo(-10, -60); ctx.lineTo(95, -145); ctx.lineWidth = 5; ctx.strokeStyle = '#1a1a1a'; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}

function drawBackground() {
  const d0 = camY / PX, d1 = (camY + H) / PX;
  const a = palAt(d0), b = palAt(d1);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgb(a)); g.addColorStop(1, rgb(b));
  ctx.fillStyle = g; ctx.fillRect(-40, -40, W + 80, H + 80);
  const sy = -camY;
  if (sy > 0) {
    const sg = ctx.createLinearGradient(0, 0, 0, sy);
    sg.addColorStop(0, '#26c8e4'); sg.addColorStop(0.6, '#4ff0d8'); sg.addColorStop(1, '#a8ffe8');
    ctx.fillStyle = sg; ctx.fillRect(-40, -40, W + 80, Math.min(H, sy) + 40);
    glowAt(350, sy - 270, 150, '#fff6b0', 0.55);
  }
  // bubbles
  ctx.lineWidth = 1.2;
  for (const bb of bubbles) {
    if (bb.y > H + 10 || bb.y < sy) continue;
    ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.r, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke();
  }
}

function drawRocks() {
  const dm = Math.max(0, camY / PX);
  const base = palAt(dm + 20);
  const rockFar = rgb(base.map(v => v * 0.62)), rockNear = rgb(base.map(v => v * 0.48));
  ctx.save(); ctx.translate(0, camY * 0.4);
  ctx.globalAlpha = 0.55;
  for (const d of far) {
    const yy = d.y; if (yy < camY * 0.6 - 450 || yy > camY * 0.6 + H + 300) continue;
    if (d.left) poly([[0, yy], [d.w, yy + d.h * 0.35], [d.w * 0.6, yy + d.h], [0, yy + d.h + 60]], rockFar);
    else poly([[W, yy], [W - d.w, yy + d.h * 0.35], [W - d.w * 0.6, yy + d.h], [W, yy + d.h + 60]], rockFar);
  }
  ctx.restore();
  ctx.globalAlpha = 0.6;
  for (const d of decor) {
    if (d.y < camY - 300 || d.y > camY + H + 100) continue;
    if (d.left) poly([[0, d.y], [d.w, d.y + d.h * 0.3], [d.w * 0.7, d.y + d.h], [0, d.y + d.h + 40]], rockNear);
    else poly([[W, d.y], [W - d.w, d.y + d.h * 0.3], [W - d.w * 0.7, d.y + d.h], [W, d.y + d.h + 40]], rockNear);
  }
  ctx.globalAlpha = 1;
  for (const d of decor) {
    if (!d.weed || d.y < camY - 300 || d.y > camY + H + 100) continue;
    ctx.strokeStyle = 'rgba(150,120,255,0.5)'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= 8; i++) { const yy = d.y + 90 - i * 9, xx = d.wx + Math.sin(i * 0.9 + t * 1.5) * 9; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
    ctx.stroke(); ctx.lineCap = 'butt';
  }
}
function drawRapids() {
  for (const b of rapids) {
    if (b.y1 < camY - 20 || b.y0 > camY + H + 20) continue;
    const g = ctx.createLinearGradient(0, b.y0, 0, b.y1);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.2, 'rgba(255,255,255,0.09)'); g.addColorStop(0.8, 'rgba(255,255,255,0.09)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, b.y0, W, b.y1 - b.y0);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const n = Math.floor((b.y1 - b.y0) / 26), dir = Math.sign(b.v);
    for (let i = 1; i < n; i++) {
      const yy = b.y0 + i * 26, off = ((t * Math.abs(b.v) * 0.7 + i * 97) % (W + 120)) * dir;
      const xx = dir > 0 ? off - 60 : W + 60 + off;
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + dir * 38, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xx + dir * 38, yy); ctx.lineTo(xx + dir * 30, yy - 5); ctx.moveTo(xx + dir * 38, yy); ctx.lineTo(xx + dir * 30, yy + 5); ctx.stroke();
    }
  }
}

function drawHook() {
  const bob = Math.sin(t * 2) * 3;
  const blink = invul > 0 && Math.floor(t * 14) % 2 === 0;
  const hx = hook.x, hy = hook.y, tilt = clamp(hook.hv / 1000, -0.35, 0.35);
  const lineCol = blink ? '#ff5a5a' : (st === 'snap' ? 'rgba(255,255,255,0)' : '#161616');
  if (boostE > 0.15) {
    ctx.save(); ctx.globalAlpha = boostE * 0.6;
    for (let i = 1; i <= 4; i++) { ctx.strokeStyle = '#ff9a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx - 3, hy - i * 16 * boostE); ctx.lineTo(hx + 3, hy - i * 16 * boostE - 10); ctx.stroke(); }
    ctx.restore();
    glowAt(hx - 6, hy + 28, 60 * boostE, '#ff8a3d', 0.55 * boostE);
  }
  ctx.strokeStyle = lineCol; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(225, -145 + bob);
  ctx.quadraticCurveTo((225 + hx) / 2 + tilt * -90, hy * 0.5, hx, hy); ctx.stroke();
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt);
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.lineWidth = 2.2; ctx.strokeStyle = blink ? '#ff5a5a' : '#161616'; ctx.stroke();
  ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = blink ? '#ff8a8a' : '#1b1b1b';
  ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, 32); ctx.bezierCurveTo(0, 48, -26, 48, -26, 30); ctx.lineTo(-20, 34); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.moveTo(1.5, 7); ctx.lineTo(1.5, 30); ctx.stroke();
  ctx.restore();
  ctx.lineCap = 'butt';
  const cx = hx - 6, cy = hy + 28;
  if (AP.shield && (st === 'down' || st === 'up')) {
    const pul = 1 + 0.05 * Math.sin(t * 5);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(pul, pul);
    const g = ctx.createRadialGradient(0, 0, 14, 0, 0, 38); g.addColorStop(0, 'rgba(120,220,255,0.02)'); g.addColorStop(0.75, 'rgba(120,220,255,0.18)'); g.addColorStop(1, 'rgba(150,235,255,0.55)');
    ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(190,245,255,0.9)'; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(0, 0, 38, t * 2, t * 2 + 0.8); ctx.stroke();
    ctx.restore();
    glowAt(cx, cy, 70, '#4dd2ff', 0.25);
  }
  if (AP.magnet && st === 'up') {
    glowAt(cx, cy, 80, '#ff5ac8', 0.22 + 0.08 * Math.sin(t * 6));
  }
}

function drawHooked() {
  const p = st === 'result' ? clamp(resT / 1.0, 0, 1) : 0, ep = eOut(p);
  for (const h of hooked) {
    const x = lerp(h.px, 130, ep), y = lerp(h.py, -30, ep);
    const dir = h.f.vx < 0 ? -1 : 1;
    const pop = h.a < 1 ? 0.6 + 0.4 * eBack(h.a) : 1;
    drawFish(h.f.sp, x, y + Math.sin(t * 8 + h.r * 5) * 2, dir, 0.82 * (1 - 0.55 * ep) * pop, h.r, h.f.gold, h.f.ph);
  }
}

function drawWorld() {
  drawBackground();
  const sy = -camY, depthC = (camY + H * 0.5) / PX;
  ctx.save(); ctx.translate(0, -camY);
  if (sy > 0) { cloud(20, -310, 1.2); cloud(300, -250, 1); cloud(170, -170, 0.7); }
  // god rays
  if (depthC < 260) {
    const a = clamp(1 - depthC / 260, 0, 1) * 0.13;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createLinearGradient(0, 0, 0, 1000); gg.addColorStop(0, 'rgba(255,255,230,' + a + ')'); gg.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = gg;
    for (let i = 0; i < 6; i++) {
      const x0 = 20 + i * 85 + Math.sin(t * 0.3 + i * 1.7) * 22;
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 36, 0); ctx.lineTo(x0 + 36 + 150, 1000); ctx.lineTo(x0 + 150, 1000); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  drawRocks();
  drawRapids();
  if (st === 'menu' || st === 'result') for (const a of ambient) drawFish(a.sp, a.x, a.y, a.vx < 0 ? -1 : 1, a.k, 0, 0, a.ph);
  for (const h of hazards) if (h.k === 'kelp' && h.y + h.h > camY - 30 && h.y < camY + H + 30) drawKelp(h);
  for (const f of fish) {
    if (f.h || f.y < camY - 110 || f.y > camY + H + 110) continue;
    drawFish(f.sp, f.x, f.y + Math.sin(t * 2 + f.ph) * 2, f.vx < 0 ? -1 : 1, 1, 0, f.gold, f.ph);
    if (f.pulled) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,120,220,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(hook.x - 6, hook.y + 30); ctx.stroke(); ctx.restore(); }
  }
  for (const o of orbs) if (!o.got && o.y > camY - 50 && o.y < camY + H + 50) drawOrb(o);
  for (const h of hazards) {
    if (h.dead || h.k === 'kelp' || h.y < camY - 60 || h.y > camY + H + 60) continue;
    if (h.k === 'jelly') drawJelly(h); else if (h.k === 'mine') drawMine(h); else if (h.k === 'puffer') drawPuffer(h);
    else if (h.k === 'eel') drawEel(h); else if (h.k === 'lure') drawLure(h);
  }
  for (const sh of sharks) {
    if (sh.warn > 0) {
      const a = 0.1 + 0.1 * Math.sin(t * 16);
      ctx.fillStyle = 'rgba(255,40,40,' + a + ')'; ctx.fillRect(0, sh.y - 28, W, 56);
      const wx = sh.dir > 0 ? 30 : W - 30, pul = 1 + 0.15 * Math.sin(t * 14);
      ctx.save(); ctx.translate(wx, sh.y); ctx.scale(pul, pul);
      poly([[0, -26], [24, 16], [-24, 16]], '#ff3030'); txt('!', 0, 4, 28, '#fff');
      ctx.restore();
    } else drawFish(SHARK, sh.x, sh.y, sh.dir, 1, 0, 0, 0);
  }
  if (sy > -200) drawBoat();
  // water surface
  ctx.beginPath(); ctx.moveTo(0, 0);
  for (let x = 0; x <= W + 30; x += 15) ctx.lineTo(x, Math.sin(x * 0.05 + t * 2) * 3.5);
  ctx.lineTo(W, 50); ctx.lineTo(0, 50); ctx.closePath();
  const wg = ctx.createLinearGradient(0, 0, 0, 50); wg.addColorStop(0, 'rgba(210,255,255,0.5)'); wg.addColorStop(1, 'rgba(210,255,255,0)');
  ctx.fillStyle = wg; ctx.fill();
  ctx.beginPath(); for (let x = 0; x <= W + 30; x += 15) { const yy = Math.sin(x * 0.05 + t * 2) * 3.5; if (x) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); }
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
  if (st !== 'snap' || resT < 0.2) drawHook();
  drawHooked();
  for (const d of drops) { ctx.globalAlpha = clamp(d.life, 0, 1); drawFish(d.sp, d.x, d.y, d.vx < 0 ? -1 : 1, 0.82, d.rot, d.gold, d.ph); ctx.globalAlpha = 1; }
  for (const r of rings) {
    ctx.globalAlpha = clamp(r.life / r.l0, 0, 1);
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.lineWidth = r.w * (r.life / r.l0 + 0.3); ctx.strokeStyle = r.c; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of parts) {
    ctx.globalAlpha = clamp(p.life / p.l0 * 1.6, 0, 1);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fillStyle = p.c; ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of floats) {
    ctx.globalAlpha = clamp(f.life * 2, 0, 1);
    const pop = 1 + Math.max(0, f.life - 0.9) * 2.5;
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(pop, pop);
    txt(f.txt, 0, 0, 28, f.col || '#fff', 'center', 6);
    if (f.sub) txt(f.sub, -48, 2, 24, '#ffe14d', 'center', 5);
    if (f.tag) txt(f.tag, 34, 22, 20, '#ffe14d', 'center', 5);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // darkness with a light cone around the hook; glowing things shine through it
  const dive = st === 'down' || st === 'up' || st === 'snap';
  if (dive && depthC > 200) {
    const dk = clamp((depthC - 200) / 800, 0, 0.86), lr = lerp(340, 150, clamp((depthC - 200) / 1100, 0, 1));
    const hx = hook.x - 6, hy = hook.y + 26;
    const g = ctx.createRadialGradient(hx, hy, lr * 0.3, hx, hy, lr);
    g.addColorStop(0, 'rgba(2,5,18,0)'); g.addColorStop(1, 'rgba(2,5,18,' + dk + ')');
    ctx.fillStyle = g; ctx.fillRect(-60, camY - 60, W + 120, H + 120);
    glowAt(hx, hy, lr * 0.5, '#bfe8ff', 0.1);
    for (const o of orbs) if (!o.got && o.y > camY - 50 && o.y < camY + H + 50) glowAt(o.x, o.y, 36, PU[o.k].c, 0.55);
    for (const h of hazards) if (h.k === 'lure' && !h.dead && h.y > camY - 50 && h.y < camY + H + 50) glowAt(h.x, h.y, 36, '#ffe14d', 0.55);
    for (const f of fish) if (!f.h && (f.gold || f.sp.ex === 'lure' || f.sp.glow || f.sp.ex === 'glow') && f.y > camY - 60 && f.y < camY + H + 60) glowAt(f.x, f.y, f.sp.len * 0.7, f.gold ? '#ffd21f' : '#8fe8ff', 0.4);
  }
  ctx.restore();
}
