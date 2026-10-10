// LINGPAI 领拍 — "你要的，这里有" collage / cut-out film. Every frame is a pure function of t (renderAt).
// All motion is held on a 12 fps grid (Q), hits sit on the 90 bpm 16th grid read from cues.json.
import { lib } from './lib.js';
const { Q, clamp, lerp, seg, eOut, eIn, eInOut, eBack, hash, rnd } = lib;

const W = 1920, H = 1080;
window.DEMO = { width: W, height: H, fps: 30, duration: 20 };
const C = await (await fetch('cues.json')).json();
const LAY = await (await fetch('assets/gen/layout.json')).json();
const cv = document.getElementById('c');
let ctx = cv.getContext('2d');
const mainCtx = ctx;

// ------------------------------------------------------------------ images
const IMG = {};
const loadImg = (name, file) => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => { IMG[name] = im; res(); };
  im.onerror = () => rej(new Error('img ' + file));
  im.src = 'assets/gen/' + file;
});
const loads = [];
for (const k of Object.keys(LAY)) {
  loads.push(loadImg(k, k + '.png'));
  if (LAY[k].sh_pad) loads.push(loadImg(k + '_sh', k + '_sh.png'));
}
for (const k of ['page_kraft', 'page_end', 'page_news']) loads.push(loadImg(k, k + '.jpg'));
await Promise.all(loads);
for (const im of Object.values(IMG)) if (im.decode) await im.decode();

// ------------------------------------------------------------------ fonts
const F = {
  hand: '"LXGW WenKai"', sans: '"Noto Sans SC"', serif: '"Noto Serif SC"', cond: '"ZCOOL QingKe HuangYou"', type: '"Special Elite"',
};
const ALLTEXT = '想找一批二手设备？想在深圳收厂房？想低价拿写字楼？设备厂房写字楼住宅家具型材洗涤设备集装箱房整厂地效翼船破产资产·公物处置企业资产上千件标的有货匹配1000+精准买家100+线下合作渠道深圳中介服务网络全网自媒体矩阵小红书抖音视频号更多平台…你要的资产，领拍帮你配上阿里资产入库服务商拍卖辅助撮合0123456789№';
const fontSpecs = [`700 60px ${F.hand}`, `900 60px ${F.sans}`, `700 60px ${F.sans}`, `500 60px ${F.sans}`, `900 60px ${F.serif}`,
  `700 60px ${F.serif}`, `400 60px ${F.type}`];
await Promise.all(fontSpecs.map((f) => document.fonts.load(f, ALLTEXT)));
await document.fonts.ready;
const missing = [];
for (const f of fontSpecs) for (const ch of ALLTEXT) if (!document.fonts.check(f, ch)) missing.push(f + ':' + ch);
if (missing.length) console.warn('font check failed', missing.slice(0, 20).join(' | '));
window.__fontsMissing = missing;

// ------------------------------------------------------------------ palette
const BLUE = '#00A0EA', ORANGE = '#EF8201', INK = '#17181d', PAPER = '#f5f1e7';

// ------------------------------------------------------------------ offscreen helpers
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };

// jagged scissor-cut polygon around a box (facets), seeded
function scissorPoly(w, h, seed, facet = 22, amp = 3) {
  const pts = [];
  const r = rnd(seed);
  const side = (x0, y0, x1, y1) => {
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / facet));
    for (let i = 0; i < n; i++) {
      const u = i / n;
      pts.push([lerp(x0, x1, u) + (r() - 0.5) * amp * 2, lerp(y0, y1, u) + (r() - 0.5) * amp * 2]);
    }
  };
  side(0, 0, w, 0); side(w, 0, w, h); side(w, h, 0, h); side(0, h, 0, 0);
  return pts;
}

// a ransom-note / cut-out character chip, pre-rendered with its own soft shadow
const CHIP_STYLES = {
  white: { bg: '#f4f0e6', fg: INK, font: `900 SZpx ${F.serif}` },
  black: { bg: '#18181c', fg: '#f4f0e6', font: `900 SZpx ${F.sans}` },
  orange: { bg: ORANGE, fg: '#fffaf0', font: `900 SZpx ${F.sans}` },
  blue: { bg: BLUE, fg: '#ffffff', font: `900 SZpx ${F.sans}` },
  news: { bg: '#e2dccd', fg: INK, font: `900 SZpx ${F.serif}`, news: true },
  strip: { bg: '#f4efe3', fg: INK, font: `900 SZpx ${F.sans}` },
  smallstrip: { bg: '#f4efe3', fg: '#2a2622', font: `700 SZpx ${F.sans}` },
  kraft: { bg: '#c9a46f', fg: INK, font: `900 SZpx ${F.sans}` },
  inkonly: { bg: null, fg: INK, font: `900 SZpx ${F.sans}` },
  orangeink: { bg: null, fg: ORANGE, font: `900 SZpx ${F.sans}` },
  type: { bg: '#f4f0e6', fg: INK, font: `700 SZpx ${F.serif}` },
};
const chipCache = new Map();
function chip(ch, style, size, seed) {
  const key = ch + '|' + style + '|' + size + '|' + seed;
  if (chipCache.has(key)) return chipCache.get(key);
  const S = CHIP_STYLES[style];
  const font = S.font.replace('SZ', size);
  const t = mk(4, 4).getContext('2d');
  t.font = font;
  const m = t.measureText(ch);
  const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
  const gl = m.actualBoundingBoxLeft, gr = m.actualBoundingBoxRight;
  const gw = gl + gr, gh = asc + desc;
  const r = rnd(seed);
  const px = size * (0.12 + r() * 0.1), py = size * (0.1 + r() * 0.08);
  const w = gw + px * 2, h = gh + py * 2;
  const M = 18;
  const c = mk(w + M * 2, h + M * 2), g = c.getContext('2d');
  const poly = scissorPoly(w, h, seed, Math.max(12, size * 0.28), Math.max(1.5, size * 0.03));
  const path = () => { g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x + M, y + M) : g.moveTo(x + M, y + M))); g.closePath(); };
  if (S.bg) {
    path();
    g.fillStyle = S.bg; g.fill();
    // paper grain inside the chip
    g.save(); path(); g.clip();
    g.globalAlpha = S.news ? 0.5 : 0.18; g.globalCompositeOperation = 'multiply';
    g.drawImage(IMG.page_news, (r() * 1500) | 0, (r() * 800) | 0, w + M * 2, h + M * 2, 0, 0, w + M * 2, h + M * 2);
    if (S.news) {   // newsprint chips: faint greeked lines behind the glyph
      g.globalAlpha = 0.18; g.fillStyle = '#333';
      for (let y = M + 4; y < h + M; y += 7) g.fillRect(M + 2, y, w - 4, 2);
    }
    g.restore();
  }
  g.font = font; g.fillStyle = S.fg; g.textBaseline = 'alphabetic';
  g.fillText(ch, M + px + gl, M + py + asc);
  // shadow canvas
  const sc = mk(w + M * 2, h + M * 2), sg = sc.getContext('2d');
  sg.filter = 'blur(5px)';
  if (S.bg) { sg.beginPath(); poly.forEach(([x, y], i) => (i ? sg.lineTo(x + M, y + M) : sg.moveTo(x + M, y + M))); sg.closePath(); sg.fillStyle = '#000'; sg.fill(); }
  else { sg.font = font; sg.fillStyle = '#000'; sg.fillText(ch, M + px + gl, M + py + asc); }
  const o = { c, sc, w, h, M };
  chipCache.set(key, o);
  return o;
}

// stamp 「匹配」: rubber-stamp ink with grunge, pre-rendered
function makeStamp(text, size, seed, color = ORANGE) {
  const t = mk(4, 4).getContext('2d');
  t.font = `900 ${size}px ${F.sans}`;
  const tw = t.measureText(text).width;
  const pw = tw + size * 0.7, ph = size * 1.45;
  const c = mk(pw + 20, ph + 20), g = c.getContext('2d');
  g.translate(10, 10);
  g.strokeStyle = color; g.fillStyle = color;
  g.lineWidth = size * 0.09;
  const rr = size * 0.18;
  const box = (ins) => {
    g.beginPath();
    g.roundRect(ins, ins, pw - ins * 2, ph - ins * 2, rr);
    g.stroke();
  };
  box(size * 0.05); g.lineWidth = size * 0.035; box(size * 0.17);
  g.font = `900 ${size}px ${F.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, pw / 2, ph / 2 + size * 0.04);
  g.globalCompositeOperation = 'destination-out';
  const r = rnd(seed);
  g.globalAlpha = 0.55;
  g.drawImage(IMG.grunge, (r() * 200) | 0, (r() * 100) | 0, 400, 200, -10, -10, pw + 20, ph + 20);
  return c;
}

// ------------------------------------------------------------------ drawing primitives
function drawShadow(name, x, y, rot, s, lift, alpha = 1) {
  const sh = IMG[name + '_sh'];
  if (!sh) return;
  const off = 5 + lift * 46, offy = 7 + lift * 58;
  ctx.save();
  ctx.translate(x + off, y + offy); ctx.rotate(rot); ctx.scale(s * (1 + lift * 0.06), s * (1 + lift * 0.06));
  ctx.globalAlpha = (0.42 - lift * 0.16) * alpha;
  ctx.drawImage(sh, -sh.width, -sh.height, sh.width * 2, sh.height * 2);
  ctx.restore();
}
function drawPiece(name, x, y, rot, s, lift = 0, alpha = 1, shadow = true) {
  const im = IMG[name];
  if (shadow) drawShadow(name, x, y, rot, s, lift, alpha);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.globalAlpha = alpha;
  ctx.drawImage(im, -im.width / 2, -im.height / 2);
  ctx.restore();
}
function drawChip(o, x, y, rot, s, lift = 0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = (0.4 - lift * 0.15) * alpha;
  ctx.translate(x + 4 + lift * 30, y + 6 + lift * 40); ctx.rotate(rot); ctx.scale(s, s);
  ctx.drawImage(o.sc, -o.sc.width / 2, -o.sc.height / 2);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.drawImage(o.c, -o.c.width / 2, -o.c.height / 2);
  ctx.restore();
}
const D2R = Math.PI / 180;
// "hand placed" living jitter, re-sampled at 6 fps
function jit(id, t, amp = 1.2, ramp = 0.35) {
  const k = Math.floor(t * 6 + 1e-4);
  return { x: (hash(id, k, 1) - 0.5) * 2 * amp, y: (hash(id, k, 2) - 0.5) * 2 * amp, r: (hash(id, k, 3) - 0.5) * 2 * ramp * D2R };
}

// slap kinematics: piece arrives over `nIn` steps from offset `from` (world px), lands at T with squash
function slap(T, t, from, nIn = 4, spin = 0) {
  const t0 = T - nIn / 12;
  if (t < t0) return null;
  if (t < T) {
    const u = (t - t0) / (T - t0);
    const lat = 1 - eOut(u);
    const lift = 1 - eIn(u) * 0.95;
    return { dx: from[0] * lat, dy: from[1] * lat, lift: Math.max(0.05, lift), rot: spin * lat * D2R, sq: 1 + 0.1 * lift, landed: false };
  }
  const k = Math.round((t - T) * 12);
  const sq = k === 0 ? 0.955 : k === 1 ? 1.018 : 1;
  return { dx: 0, dy: 0, lift: 0, rot: 0, sq, landed: true, k };
}

// hand that carries a piece in and slaps it: rendered last (top-most)
const handQueue = [];
function queueHand(T, t, px, py, from, opts = {}) {
  const nIn = opts.nIn || 4;
  const t0 = T - nIn / 12;
  const out0 = T + (opts.hold || 2) / 12, out1 = out0 + 3 / 12;
  if (t < t0 || t >= out1) return;
  const L = Math.hypot(from[0], from[1]) || 1;
  const ux = -from[0] / L, uy = -from[1] / L;
  let rot = Math.atan2(ux, -uy) + (opts.twist || 0) * D2R;
  let x = px, y = py, lift = 0.25, s = opts.scale || 0.5;
  const st = slap(T, t, from, nIn);
  if (t < T) { x += st.dx; y += st.dy; lift = 0.25 + st.lift * 0.75; }
  else if (t < out0) { lift = 0.18; s *= 0.985; }
  else {
    const u = (t - out0 + 1 / 12) / (out1 - out0 + 1 / 12);
    const e = eIn(u);
    x += -ux * 900 * e; y += -uy * 900 * e; lift = 0.2 + e * 0.8; rot += e * 6 * D2R * (opts.flip ? -1 : 1);
  }
  handQueue.push({ x, y, rot, s, lift, flip: !!opts.flip });
}
function drawHands() {
  const im = IMG.hand, sh = IMG.hand_sh, L = LAY.hand;
  for (const h of handQueue) {
    const sx = h.s * (1 + h.lift * 0.08) * (h.flip ? -1 : 1), sy = h.s * (1 + h.lift * 0.08);
    // shadow: the hand floats above the page, so its shadow is big and soft
    ctx.save();
    ctx.translate(h.x + 20 + h.lift * 70, h.y + 26 + h.lift * 90); ctx.rotate(h.rot); ctx.scale(sx, sy);
    ctx.globalAlpha = 0.34 - h.lift * 0.1;
    ctx.drawImage(sh, -L.palm[0] - L.sh_pad, -L.palm[1] - L.sh_pad, sh.width * 2, sh.height * 2);
    ctx.restore();
    ctx.save();
    ctx.translate(h.x, h.y); ctx.rotate(h.rot); ctx.scale(sx, sy);
    ctx.drawImage(im, -L.palm[0], -L.palm[1]);
    ctx.restore();
  }
  handQueue.length = 0;
}

// paper dust: cut-paper flecks burst out from a slap for 3 steps
function puff(x, y, T, t, seed = 1, n = 12, r = 150) {
  if (t < T - 1e-4) return;
  const k = Math.round((t - T) * 12);
  if (k > 3) return;
  const rr = rnd(seed * 31 + 7);
  for (let i = 0; i < n; i++) {
    const a = rr() * Math.PI * 2, sp = (0.5 + rr()) * r, sz = 4 + rr() * 9, spin = rr() * 6;
    const d = sp * (0.45 + 0.55 * eOut((k + 1) / 4));
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.7 + k * k * 4;
    ctx.save(); ctx.translate(px, py); ctx.rotate(spin + k * 0.8);
    ctx.globalAlpha = 1 - k / 4;
    ctx.fillStyle = i % 3 === 0 ? '#f6f1e4' : i % 3 === 1 ? '#c49a62' : '#e8dcc4';
    ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.4); ctx.lineTo(sz * 0.8, -sz * 0.6); ctx.lineTo(sz * 0.5, sz * 0.7); ctx.lineTo(-sz * 0.6, sz * 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// world-space helpers for pieces placed with a local frame
function withFrame(x, y, rot, s, fn) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); fn(); ctx.restore();
}

// ------------------------------------------------------------------ pins & strings
function drawPin(x, y, color, t0, t, seed = 0, wob = 0) {
  if (t < t0) return;
  const k = Math.round((t - t0) * 12);
  const s = k === 0 ? 1.9 : k === 1 ? 0.85 : k === 2 ? 1.08 : 1;
  const lift = k === 0 ? 1 : 0;
  const r = 12 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wob);
  // shadow + needle
  ctx.fillStyle = 'rgba(20,14,8,0.32)';
  ctx.beginPath(); ctx.ellipse(6 + lift * 14, 8 + lift * 18, r * 1.05, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,20,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(2, 3); ctx.lineTo(9, 13); ctx.stroke();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  if (color === 'blue') { g.addColorStop(0, '#9fe0ff'); g.addColorStop(0.35, BLUE); g.addColorStop(1, '#00618f'); }
  else if (color === 'orange') { g.addColorStop(0, '#ffd9a0'); g.addColorStop(0.35, ORANGE); g.addColorStop(1, '#8a4a00'); }
  else { g.addColorStop(0, '#888'); g.addColorStop(0.4, '#2a2a2e'); g.addColorStop(1, '#050505'); }
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.42, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// a taut string shot from p0 to p1 between tS and tL, twanging (alternating, decaying) after it lands
function drawString(p0, p1, tS, tL, t, opts = {}) {
  if (t < tS) return;
  const u = clamp((t - tS) / (tL - tS));
  const e = eOut(u);
  const x1 = lerp(p0[0], p1[0], e), y1 = lerp(p0[1], p1[1], e);
  const dx = x1 - p0[0], dy = y1 - p0[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  let amp = 0;
  if (t >= tL) {
    const k = Math.round((t - tL) * 12);
    amp = (opts.amp || 14) * Math.exp(-k * 0.55) * (k % 2 ? -1 : 1);
    if (k > 9) amp = 0;
  } else amp = (opts.amp || 14) * 0.5 * (1 - u);
  const sag = (opts.sag ?? 0.04) * L;
  const cx = (p0[0] + x1) / 2 + nx * amp, cy = (p0[1] + y1) / 2 + ny * amp + sag;
  const w = opts.w || 3.6;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(25,15,5,0.25)'; ctx.lineWidth = w + 1;
  ctx.beginPath(); ctx.moveTo(p0[0] + 5, p0[1] + 8); ctx.quadraticCurveTo(cx + 5, cy + 9, x1 + 5, y1 + 8); ctx.stroke();
  ctx.strokeStyle = opts.color || '#0587c4'; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
  ctx.strokeStyle = 'rgba(160,225,255,0.65)'; ctx.lineWidth = w * 0.35;
  ctx.beginPath(); ctx.moveTo(p0[0], p0[1] - 0.8); ctx.quadraticCurveTo(cx, cy - 0.8, x1, y1 - 0.8); ctx.stroke();
  ctx.restore();
  return [x1, y1];
}

// marker doodle: a hand-drawn stroke that draws itself over `steps` 12 fps steps and then boils (re-jittered at 6 fps)
function doodle(pts, t0, steps, t, opts = {}) {
  if (t < t0) return;
  const u = clamp((t - t0 + 1 / 12) / (steps / 12));
  const k6 = Math.floor(t * 6 + 1e-4);
  const P = pts.map(([x, y], i) => [x + (hash(i, k6, opts.seed || 1) - 0.5) * 2.6, y + (hash(i, k6, (opts.seed || 1) + 7) - 0.5) * 2.6]);
  let L = 0; const segL = [];
  for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); segL.push(d); L += d; }
  const target = L * eOut(u);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = opts.color || '#1b1d24'; ctx.lineWidth = opts.w || 6; ctx.globalAlpha = opts.alpha || 0.92;
  ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
  let acc = 0;
  for (let i = 1; i < P.length; i++) {
    if (acc + segL[i - 1] >= target) { const f = (target - acc) / segL[i - 1]; ctx.lineTo(lerp(P[i - 1][0], P[i][0], f), lerp(P[i - 1][1], P[i][1], f)); break; }
    ctx.lineTo(P[i][0], P[i][1]); acc += segL[i - 1];
  }
  ctx.stroke();
  ctx.restore();
}
function loopPts(cx, cy, rx, ry, turns = 1.15, n = 40, seed = 1, rot = 0) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = rot + i / n * Math.PI * 2 * turns;
    const w = 1 + (hash(seed, i) - 0.5) * 0.08 + i / n * 0.06;
    out.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]);
  }
  return out;
}

// ------------------------------------------------------------------ text helpers
function typed(text, t0, t, rate = 12) {     // letter-by-letter (1 char per 12 fps step by default)
  if (t < t0) return '';
  const n = Math.floor((t - t0) * rate + 1e-4) + 1;
  return [...text].slice(0, n).join('');
}
function typeText(text, x, y, size, t0, t, opts = {}) {   // typewriter on a tag: per-char ink & baseline wobble
  const rate = opts.rate || 12;
  const s = typed(text, t0, t, rate);
  const newest = Math.floor((t - t0) * rate + 1e-4);
  ctx.save();
  ctx.font = opts.font || `700 ${size}px ${F.serif}`;
  ctx.textBaseline = 'alphabetic';
  const chars = [...text];
  let total = 0;
  for (const ch of chars) total += ctx.measureText(ch).width + (opts.track || 1);
  let cx = opts.align === 'left' ? x : x - total / 2;
  [...s].forEach((ch, i) => {
    const r = hash(opts.seed || 7, i, 9);
    ctx.globalAlpha = 0.78 + 0.22 * r;
    ctx.fillStyle = opts.color || INK;
    const punch = i === newest && newest < chars.length ? 1.18 : 1;    // the key strike, newest character only
    ctx.save();
    ctx.translate(cx, y + (hash(opts.seed || 7, i, 4) - 0.5) * 2.2);
    ctx.scale(punch, punch);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    cx += ctx.measureText(ch).width + (opts.track || 1);
  });
  ctx.restore();
  return total;
}

// a ransom headline: chars land one per step (stagger), punch 1.25 -> 0.94 -> 1
function ransom(spec, t, opts = {}) {
  // spec: [{ch, style, size, x, y, rot}], world coords
  spec.forEach((c, i) => {
    const T = (opts.t0 ?? 0) + (c.dt ?? i * (opts.stagger ?? 1 / 12));
    if (t < T - 1 / 12) return;
    if (opts.exit && t >= opts.exit[0]) {
      // blown away: each chip flies off with spin, staggered
      const te = opts.exit[0] + (i % 4) / 24;
      const u = clamp((t - te + 1 / 12) / (opts.exit[1] - te + 1 / 12));
      if (u >= 1) return;
      const e = u * 0.55 + u * u * 0.45;
      const o = chip(c.ch, c.style, c.size, c.seed || (i + 1) * 31);
      const dir = opts.exitDir || [1, -0.5];
      drawChip(o, c.x + dir[0] * 1400 * e, c.y + dir[1] * 1400 * e + e * e * 100, (c.rot || 0) * D2R + e * (hash(i, 77) - 0.3) * 4, c.scale || 1, e);
      return;
    }
    const k = Math.round((t - T) * 12);
    const s = k < 0 ? 1.45 : k === 0 ? 0.93 : k === 1 ? 1.04 : 1;
    const lift = k < 0 ? 0.8 : 0;
    const j = jit(i * 13 + (opts.seed || 0), t, 1.0, 0.5);
    const o = chip(c.ch, c.style, c.size, c.seed || (i + 1) * 31);
    const pk = opts.punchIdx === i && opts.punchT !== undefined && Math.round((t - opts.punchT) * 12);
    const ps = pk === 0 ? 1.25 : pk === 1 ? 0.95 : 1;
    drawChip(o, c.x + j.x, c.y + j.y - lift * 30, (c.rot || 0) * D2R + j.r, (c.scale || 1) * s * ps, lift);
  });
}

// ------------------------------------------------------------------ the board layout (world = screen at zoom 1)
const NOTE_S = 0.7;
const NOTES = [
  { img: 'note0', x: 350, y: 236, rot: -4, text: '想找一批二手设备？', kw: [4, 8], T: C.notes[0], from: [330, 250] },
  { img: 'note1', x: 392, y: 372, rot: 3, text: '想在深圳收厂房？', kw: [5, 7], T: C.notes[1], from: [760, -600], flip: true },
  { img: 'note2', x: 336, y: 512, rot: -2.5, text: '想低价拿写字楼？', kw: [4, 7], T: C.notes[2], from: [-700, 600] },
];
const ASSETS = [
  { img: 'a_machine', tag: '设备', x: 838, y: 300, s: 0.95, rot: -3, from: [900, -500] },
  { img: 'a_park', tag: '厂房', x: 372, y: 842, s: 0.95, rot: 2.5, from: [-700, 700] },
  { img: 'a_office', tag: '写字楼', x: 1300, y: 205, s: 0.9, rot: 4, from: [300, -900] },
  { img: 'a_residential', tag: '住宅', x: 1645, y: 255, s: 0.85, rot: -5, from: [900, -400] },
  { img: 'a_furniture', tag: '家具', x: 1600, y: 868, s: 0.86, rot: -4, from: [900, 500] },
  { img: 'a_profiles', tag: '型材', x: 850, y: 870, s: 0.9, rot: -6, from: [-200, 900] },
  { img: 'a_laundry', tag: '洗涤设备', x: 1222, y: 952, s: 0.86, rot: 2, from: [400, 900] },
  { img: 'a_container', tag: '集装箱房', x: 1170, y: 640, s: 0.78, rot: 5, from: [600, -800] },
];
for (const a of ASSETS) a.T = C.assets[a.img];
const CRAFT = { img: 'a_craft', tag: '地效翼船', x: 1590, y: 600, s: 0.62, rot: -6 };
const assetBy = Object.fromEntries(ASSETS.map((a) => [a.img, a]));
const pieceHalf = (a) => [IMG[a.img].width * a.s / 2, IMG[a.img].height * a.s / 2];
function local(a, lx, ly) {    // piece-local (px from centre, unscaled) -> world
  const c = Math.cos(a.rot * D2R), s = Math.sin(a.rot * D2R);
  return [a.x + (lx * c - ly * s) * a.s, a.y + (lx * s + ly * c) * a.s];
}
function pinPoint(a) { const im = IMG[a.img]; return local(a, im.width * 0.08, -im.height / 2 + 34); }
function notePin(n) { return local({ ...n, s: NOTE_S }, 230, -40); }

// crowd of anonymous buyers + puppet
const CROWD_C = [1150, 600];
const BUSTS = [];
{
  const rows = [[5, 498, 0.46, 96], [4, 574, 0.5, 104]];
  let idx = 0;
  rows.forEach(([n, y, s, dx], ri) => {
    for (let i = 0; i < n; i++) {
      const x = CROWD_C[0] + (i - (n - 1) / 2) * dx + (ri ? 6 : 0);
      BUSTS.push({ img: 'bust' + (idx % 12), x, y: y + (hash(idx, 3) - 0.5) * 10, s, rot: (hash(idx, 5) - 0.5) * 8, T: C.crowd + (idx % 4) / 12, ri });
      idx++;
    }
  });
}
const PUP = { x: CROWD_C[0] + 20, y: 690, s: 0.5, T: C.crowd + 3 / 12 };

// ------------------------------------------------------------------ camera
function camKeys(t) {
  const K = [
    [0, 372, 262, 2.12, -0.8], [0.6666667, 384, 300, 2.08, -0.5], [1.1666667, 392, 352, 2.02, 0.3], [1.75, 380, 392, 1.97, -0.3],
    [2.1666667, 384, 396, 2.02, -0.2], [2.6666667, 985, 540, 1.06, 0.2], [5.3333333, 1000, 528, 1.025, -0.2],
    [7.5833333, 975, 540, 1.01, 0.2], [8.0, 900, 480, 1.1, -0.6], [8.6666667, 880, 470, 1.08, -0.3], [9.25, 870, 480, 1.08, 0.1],
    [9.5833333, 700, 600, 1.06, 0.3], [10.1666667, 960, 540, 1.0, 0], [10.6666667, 1000, 550, 1.065, 0], [11.0, 1015, 545, 1.08, 0.2],
    [11.5833333, 1080, 470, 1.24, 0.4], [12.4166667, 1100, 480, 1.27, 0.2], [12.75, 620, 640, 1.26, -0.4], [13.3333333, 600, 650, 1.3, -0.2],
  ];
  const ease = { 2.6666667: 'io', 8.0: 'out', 9.5833333: 'io', 10.1666667: 'io', 11.5833333: 'io', 12.75: 'io', 10.6666667: 'out' };
  if (t >= K[K.length - 1][0]) return K[K.length - 1];
  let i = 0; while (t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1];
  let u = (t - a[0]) / (b[0] - a[0]);
  const e = ease[b[0]];
  u = e === 'io' ? eInOut(u) : e === 'out' ? eOut(u) : u;
  return a.map((v, j) => lerp(v, b[j], u));
}
// impulse shakes on the big slaps
const SHAKES = [[C.notes[0], 7], [C.notes[1], 5], [C.notes[2], 6], [C.assets.a_machine, 9], [C.craft[1], 8], [C.youhuo, 10],
  [C.stamp1, 6], [C.stamp2, 6], [C.crowd, 6], [C.burst, 12], [C.burst2, 7], [C.rip, 10], [C.map, 6], [8.0, 7], [C.end_line1, 5], [C.end_line2, 4], [C.peishang, 8]];
function shake(t) {
  let x = 0, y = 0;
  for (const [T, a] of SHAKES) {
    const k = Math.round((t - T) * 12);
    if (t >= T - 1e-4 && k < 3) {
      const m = a * [1, 0.55, 0.22][k];
      x += (hash(T * 100, k, 1) - 0.5) * 2 * m; y += (hash(T * 100, k, 2) - 0.5) * 2 * m;
    }
  }
  return [x, y];
}
function applyCam(g, cam, sh = [0, 0]) {
  const [, cx, cy, z, r] = cam;
  g.translate(W / 2 + sh[0], H / 2 + sh[1]);
  g.rotate(r * D2R);
  g.scale(z, z);
  g.translate(-cx, -cy);
}

// ------------------------------------------------------------------ BOARD (0 – 13.33 s)
function drawBoard(t) {
  // kraft page bigger than the frame
  ctx.drawImage(IMG.page_kraft, -340, -210);
  // background scraps already on the page from frame 0 (newsprint, blurred doc scrap, constructivist disc)
  drawPiece('news1', 1795, 150, 9 * D2R, 0.8, 0, 1);
  drawPiece('news0', 130, 1000, -7 * D2R, 0.85);
  drawPiece('docscrap', 1840, 990, 12 * D2R, 0.8);
  drawPiece('news2', 980, 1060, 3 * D2R, 0.8);
  drawPiece('disc_blue', 600, 60, 0, 0.75, 0, 1);
  drawPiece('blk_orange', 1880, 700, 80 * D2R, 0.55, 0, 1);
  // frame 0 is already a collage: a big torn blue diagonal behind the notes, scraps, a stray photo, tape
  drawPiece('blk_blue', 430, 455, -16 * D2R, 0.62);
  drawPiece('th13', 700, 96, 14 * D2R, 0.72);
  drawPiece('th26', 60, 610, -12 * D2R, 0.66);
  drawPiece('news2', 40, 160, -8 * D2R, 0.5);
  for (const [n, x, y, r, sx] of [['tape_blue2', 150, 128, 32, 0.5], ['tape_cream1', 668, 520, -24, 0.5], ['tape_orange0', 760, 60, 70, 0.4]]) {
    const tp = IMG[n]; ctx.save(); ctx.translate(x, y); ctx.rotate(r * D2R); ctx.scale(sx, sx * 1.2); ctx.drawImage(tp, -tp.width / 2, -tp.height / 2); ctx.restore();
  }

  // ---- wish notes
  NOTES.forEach((n, i) => {
    const st = slap(n.T, t, n.from, 4, n.from[0] > 0 ? 14 : -14);
    if (!st) return;
    const j = st.landed ? jit(100 + i, t, 1.1, 0.4) : { x: 0, y: 0, r: 0 };
    const x = n.x + st.dx + j.x, y = n.y + st.dy + j.y, rot = n.rot * D2R + st.rot + j.r, s = NOTE_S * st.sq;
    drawPiece(n.img, x, y, rot, s, st.lift);
    withFrame(x, y, rot, s, () => {
      const im = IMG[n.img];
      ctx.translate(-im.width / 2, -im.height / 2);
      ctx.font = `700 50px ${F.hand}`;
      ctx.textBaseline = 'alphabetic';
      const chars = [...n.text];
      const x0 = 78;
      let xs = [x0];
      for (const ch of chars) xs.push(xs[xs.length - 1] + ctx.measureText(ch).width);
      // highlighter stroke draws itself under the key words
      const ht = C.highlight[i];
      if (t >= ht) {
        const u = clamp((t - ht + 1 / 12) / (4 / 12));
        const a0 = xs[n.kw[0]] - 6, a1 = xs[n.kw[1]] + 4;
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(0,160,234,0.55)';
        ctx.beginPath();
        const x1 = lerp(a0, a1, eOut(u));
        ctx.moveTo(a0, 128); ctx.lineTo(x1, 124); ctx.lineTo(x1 + 4, 162); ctx.lineTo(a0 + 3, 166); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#1b2333';
      chars.forEach((ch, k) => {
        ctx.save();
        ctx.translate(xs[k], 158 + (hash(i, k, 8) - 0.5) * 4);
        ctx.rotate((hash(i, k, 9) - 0.5) * 0.06);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      });
    });
    {
      const side = n.from[0] > 0 ? 1 : -1;
      const [hx, hy] = local({ x, y, rot: rot / D2R, s }, side * IMG[n.img].width * 0.44, 30);
      queueHand(n.T, t, hx, hy, n.from, { scale: 0.36, flip: !!n.flip, twist: n.flip ? -10 : 10 });
    }
    puff(n.x, n.y + 40, n.T, t, 10 + i, 12, 170);
  });

  // ---- real asset cut-outs, slapped in by hands, each with a torn tag typed on
  const pinsOn = t >= C.pins;
  ASSETS.forEach((a, i) => drawAsset(a, i, t));
  drawCraft(t);

  // ---- 上千件: thumbnail avalanche
  drawThumbs(t);
  // ---- constructivist type
  drawBand(t);
  ransom(THOUSAND, t, { t0: C.thousand, exit: C.clear, exitDir: [0.9, -0.7], punchIdx: 1, punchT: C.thousand_punch, seed: 400 });
  ransom(YOUHUO, t, { t0: C.youhuo, stagger: 0, exit: [C.clear[0] + 1 / 12, C.clear[1]], exitDir: [1, 0.4], seed: 500 });

  // ---- marker doodles (the hand-drawn layer)
  doodle([[590, 300], [640, 268], [700, 262], [750, 280]], 2.0, 3, t, { color: BLUE, w: 7, seed: 3 });
  doodle([[728, 258], [752, 281], [724, 300]], 2.25, 2, t, { color: BLUE, w: 7, seed: 4 });
  if (t >= C.thousand + 5 / 12 && t < C.clear[0]) doodle([[600, 990], [760, 980], [920, 994], [1080, 982], [1260, 995], [1500, 980]], C.thousand + 5 / 12, 3, t, { color: INK, w: 8, seed: 5 });
  // ---- detective board: pins, strings, stamps
  if (pinsOn) {
    doodle(loopPts(838, 300, 340, 250, 1.12, 44, 9, -2.4), C.stamp1 - 3 / 12, 3, t, { color: ORANGE, w: 8, seed: 9 });
    doodle(loopPts(372, 842, 290, 205, 1.12, 44, 11, -0.8), C.stamp2 - 3 / 12, 3, t, { color: ORANGE, w: 7, seed: 11 });
    drawMatching(t);
  }
}

function drawAsset(a, i, t) {
  const st = slap(a.T, t, a.from, a.nIn || 3, a.from[0] > 0 ? 12 : -12);
  if (!st) return;
  const j = st.landed ? jit(200 + i, t, 1.2, 0.45) : { x: 0, y: 0, r: 0 };
  const x = a.x + st.dx + j.x, y = a.y + st.dy + j.y, rot = a.rot * D2R + st.rot + j.r, s = a.s * st.sq;
  drawPiece(a.img, x, y, rot, s, st.lift);
  const im = IMG[a.img];
  if (st.landed && st.k >= 1 && !a.noTape) {      // a strip of masking tape slapped over one top corner
    const side = i % 2 ? 1 : -1;
    const [cx2, cy2] = local({ x, y, rot: rot / D2R, s }, side * im.width * 0.42, -im.height * 0.46);
    const tp = IMG['tape_cream' + (i % 2)];
    const tk = st.k === 1 ? 1.12 : 1;
    ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(rot + side * 40 * D2R); ctx.scale(0.42 * tk, 0.62 * tk);
    ctx.drawImage(tp, -tp.width / 2, -tp.height / 2); ctx.restore();
  }
  // tag: tucked under the bottom edge (or on the paper patch), taped with a strip of blue washi
  if (st.landed) {
    const fr = { x, y, rot: rot / D2R, s };
    let lx, ly, trot;
    if (a.tagOnPatch) { const p = LAY[a.img].patch; lx = (p[0] + p[2]) / 2 - im.width / 2; ly = (p[1] + p[3]) / 2 - im.height / 2; trot = 0; }
    else { lx = (hash(i, 21) - 0.5) * im.width * 0.4; ly = im.height / 2 - 6; trot = (hash(i, 22) - 0.5) * 10; }
    const [tx, ty] = local(fr, lx, ly);
    const nch = [...a.tag].length;
    const tw = 70 + nch * 36;
    ctx.save();
    ctx.translate(tx, ty); ctx.rotate((rot / D2R + trot) * D2R);
    if (!a.tagOnPatch) {
      const tg = IMG['tag' + (i % 4)];
      ctx.save(); ctx.scale(tw / tg.width, 0.68);
      ctx.globalAlpha = 0.35; ctx.drawImage(IMG['tag' + (i % 4) + '_sh'], -tg.width / 2 - 20, -tg.height / 2 - 18, IMG['tag0_sh'].width * 2, IMG['tag0_sh'].height * 2);
      ctx.globalAlpha = 1; ctx.drawImage(tg, -tg.width / 2, -tg.height / 2);
      ctx.restore();
      const tp = IMG['tape_blue' + (i % 3)];
      ctx.save(); ctx.translate(-tw / 2 + 6, -4); ctx.rotate(-58 * D2R); ctx.scale(0.24, 0.45);
      ctx.drawImage(tp, -tp.width / 2, -tp.height / 2); ctx.restore();
    }
    typeText(a.tag, 6, 12, a.tagOnPatch ? 40 : 32, a.T + 1 / 12, t, { seed: i + 3, font: `700 ${a.tagOnPatch ? 40 : 32}px ${F.serif}` });
    ctx.restore();
  }
  if (a.handFrom !== false && a.T) queueHand(a.T, t, x + 10, y + 20, a.from, { nIn: a.nIn || 3, scale: 0.42, flip: a.from[0] < 0, twist: a.from[0] < 0 ? -8 : 8, hold: 1 });
}

// the wing-in-ground craft swoops in on an arc (smear ghosts), POPs onto the page, gets its tag
function drawCraft(t) {
  const [t0, T] = C.craft;
  if (t < t0) return;
  const a = CRAFT;
  const KP = [[-260, 250], [330, 700], [880, 810], [1360, 430], [a.x, a.y]];
  const path = (v) => {     // Catmull-Rom through the key points
    const n = KP.length - 1, f = clamp(v) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
    const p0 = KP[Math.max(0, i - 1)], p1 = KP[i], p2 = KP[i + 1], p3 = KP[Math.min(n, i + 2)];
    const cr = (a0, a1, a2, a3) => 0.5 * ((2 * a1) + (-a0 + a2) * u + (2 * a0 - 5 * a1 + 4 * a2 - a3) * u * u + (-a0 + 3 * a1 - 3 * a2 + a3) * u * u * u);
    return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
  };
  const vOf = (u) => 1 - Math.pow(1 - u, 1.5);
  if (t < T) {
    const u = (t - t0) / (T - t0);
    const v = vOf(u), [x, y] = path(v);
    const [xa, ya] = path(Math.max(0, v - 0.02)), [xb, yb] = path(Math.min(1, v + 0.02));
    const ang = Math.atan2(yb - ya, xb - xa);
    const speed = clamp(Math.hypot(xb - xa, yb - ya) / 90);
    for (let g = 2; g >= 1; g--) {      // stop-motion smear: two ghost frames
      const vg = vOf(Math.max(0, u - g / 12)), [gx, gy] = path(vg);
      drawPiece(a.img, gx, gy, ang * 0.55 + a.rot * D2R, a.s * 1.1, 0.8, 0.22 / g, false);
    }
    // speed lines (cut paper strips) trailing
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = 'rgba(245,240,228,0.85)';
    for (let i = 0; i < 4; i++) ctx.fillRect(-260 - i * 40 - speed * 120, -40 + i * 26, 120 + speed * 140, 5);
    ctx.restore();
    const sx = 1 + 0.28 * speed, sy = 1 - 0.12 * speed;    // stretch along the flight path
    drawShadow(a.img, x, y, ang * 0.55 + a.rot * D2R, a.s * 1.1, 0.9);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sx, sy); ctx.rotate(-ang + ang * 0.55 + a.rot * D2R);
    const im = IMG[a.img]; const sc = a.s * 1.12; ctx.scale(sc, sc); ctx.drawImage(im, -im.width / 2, -im.height / 2);
    ctx.restore();
    return;
  }
  const k = Math.round((t - T) * 12);
  const sq = k === 0 ? 1.2 : k === 1 ? 0.9 : k === 2 ? 1.04 : 1;   // POP
  const j = jit(300, t, 1.3, 0.5);
  const x = a.x + j.x, y = a.y + j.y, rot = a.rot * D2R + j.r;
  if (k <= 2) {      // orange cut-paper starburst
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = ORANGE;
    for (let i = 0; i < 11; i++) {
      const ang = i / 11 * Math.PI * 2 + 0.3, r0 = 150 + k * 50, r1 = r0 + 90 - k * 20;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang - 0.07) * r0, Math.sin(ang - 0.07) * r0 * 0.62);
      ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1 * 0.62);
      ctx.lineTo(Math.cos(ang + 0.07) * r0, Math.sin(ang + 0.07) * r0 * 0.62);
      ctx.fill();
    }
    ctx.restore();
  }
  drawPiece(a.img, x, y, rot, a.s * sq, k === 0 ? 0.2 : 0);
  puff(x, y, T, t, 77, 14, 230);
  const fr = { x, y, rot: rot / D2R, s: a.s };
  const im = IMG[a.img];
  const [tx, ty] = local(fr, im.width * 0.1, im.height / 2 + 6);
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(rot + 5 * D2R);
  const tg = IMG.tag2; const tw = 70 + 4 * 36;
  ctx.save(); ctx.scale(tw / tg.width, 0.68); ctx.drawImage(tg, -tg.width / 2, -tg.height / 2); ctx.restore();
  typeText(a.tag, 6, 12, 32, T + 1 / 12, t, { seed: 33 });
  ctx.restore();
}

// thumbnails pour in (上千件), blown away at the clear
const THUMBS = [];
{
  const r = rnd(808);
  const spots = [];
  for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 10; gx++) {
    const x = 620 + gx * 132 + (r() - 0.5) * 50, y = 110 + gy * 168 + (r() - 0.5) * 50;
    spots.push([x, y]);
  }
  spots.forEach(([x, y], i) => {
    if (r() < 0.25) return;
    const k = Math.floor(r() * 6);
    THUMBS.push({ img: 'th' + (i % 30), x, y, rot: (r() - 0.5) * 30, s: 0.62 + r() * 0.2, T: C.thumbs[0] + k / 12, seed: i });
  });
}
function drawThumbs(t) {
  for (const th of THUMBS) {
    if (t < th.T - 1 / 12) continue;
    if (t >= C.clear[0]) {
      const te = C.clear[0] + (th.seed % 3) / 12;
      const u = clamp((t - te + 1 / 12) / (C.clear[1] - te + 1 / 12));
      if (u >= 1) continue;
      const e = u * 0.55 + u * u * 0.45;
      drawPiece(th.img, th.x + e * 1500, th.y - e * 500 + (hash(th.seed, 4) - 0.5) * e * 600, (th.rot + e * 200 * (hash(th.seed, 6) - 0.5)) * D2R, th.s, e);
      continue;
    }
    const k = Math.round((t - th.T) * 12);
    const s = k < 0 ? 1.3 : k === 0 ? 0.95 : 1;
    const j = jit(600 + th.seed, t, 0.8, 0.5);
    drawPiece(th.img, th.x + j.x, th.y + j.y - (k < 0 ? 20 : 0), th.rot * D2R + j.r, th.s * s, k < 0 ? 0.7 : 0);
  }
}

// blue constructivist band tears in across the board; three phrases punch on it; ripped away at the clear
const BAND = { x: 1040, y: 560, rot: -12, s: 1.12 };
const PHRASES = ['破产资产', '公物处置', '企业资产'];
const THOUSAND = [
  { ch: '上', style: 'white', size: 132, x: 640, y: 884, rot: -6 },
  { ch: '千', style: 'orange', size: 172, x: 852, y: 866, rot: 4 },
  { ch: '件', style: 'black', size: 132, x: 1095, y: 886, rot: -3 },
  { ch: '标', style: 'news', size: 140, x: 1265, y: 878, rot: 5 },
  { ch: '的', style: 'blue', size: 124, x: 1430, y: 890, rot: -4 },
];
const YOUHUO = [
  { ch: '有', style: 'orange', size: 200, x: 1430, y: 300, rot: -8, dt: 0 },
  { ch: '货', style: 'black', size: 200, x: 1640, y: 330, rot: 7, dt: 1 / 12 },
];
function drawBand(t) {
  const T = C.band;
  if (t < T) return;
  const im = IMG.blk_blue;
  let ox = 0, oy = 0, orot = 0;
  if (t >= C.clear[0]) {      // torn off diagonally, upward
    const u = clamp((t - C.clear[0] + 1 / 12) / (C.clear[1] - C.clear[0] + 1 / 12));
    if (u >= 1) return;
    const e = u * 0.5 + u * u * 0.5;
    ox = -420 * e; oy = -1000 * e; orot = -18 * e;
  }
  const rev = clamp((t - T + 1 / 12) / (3 / 12));   // tears in over 3 steps
  const j = jit(700, t, 1.0, 0.25);
  ctx.save();
  ctx.translate(BAND.x + ox + j.x, BAND.y + oy + j.y); ctx.rotate((BAND.rot + orot) * D2R + j.r); ctx.scale(BAND.s, BAND.s);
  const w = im.width, h = im.height;
  const tearClip = () => {
    if (rev >= 1) return;
    const xr = -w / 2 + w * eOut(rev);
    ctx.beginPath(); ctx.moveTo(-w / 2 - 40, -h);
    for (let i = 0; i <= 12; i++) ctx.lineTo(xr + (hash(i, 31) - 0.5) * 50, -h / 2 - 40 + i / 12 * (h + 120));
    ctx.lineTo(-w / 2 - 40, h * 1.5); ctx.closePath(); ctx.clip();
  };
  // black under-bar, offset down-right
  ctx.save(); tearClip();
  const bb = IMG.blk_black;
  ctx.globalAlpha = 0.4; ctx.drawImage(IMG.blk_black_sh, -bb.width / 2 - 24 + 30, -bb.height / 2 - 24 + 70, IMG.blk_black_sh.width * 2, IMG.blk_black_sh.height * 2);
  ctx.globalAlpha = 1; ctx.drawImage(bb, -bb.width / 2 + 24, -bb.height / 2 + 58);
  ctx.globalAlpha = 0.4; ctx.drawImage(IMG.blk_blue_sh, -w / 2 - 24 + 8, -h / 2 - 24 + 12, IMG.blk_blue_sh.width * 2, IMG.blk_blue_sh.height * 2);
  ctx.globalAlpha = 1; ctx.drawImage(im, -w / 2, -h / 2);
  ctx.restore();
  // phrases: condensed heavy sans (82 % width), each char punches in on its own step
  const SZ = 118, CX = 0.82;
  ctx.font = `900 ${SZ}px ${F.sans}`;
  ctx.textBaseline = 'middle';
  const parts = [PHRASES[0], '·', PHRASES[1], '·', PHRASES[2]];
  const widths = parts.map((p) => [...p].reduce((acc, ch) => acc + ctx.measureText(ch).width * CX - 4, 0));
  const gap = 30;
  const total = widths.reduce((a2, v) => a2 + v, 0) + gap * (parts.length - 1);
  let x = -total / 2;
  parts.forEach((p, pi) => {
    const isDot = p === '·';
    const pT = isDot ? C.phrases[(pi - 1) / 2] + 3 / 12 : C.phrases[pi / 2];
    [...p].forEach((ch, ci) => {
      const cT = pT + ci / 12;
      const cw = ctx.measureText(ch).width * CX - 4;
      if (t >= cT) {
        const k = Math.round((t - cT) * 12);
        const sc = k === 0 ? 1.3 : k === 1 ? 0.94 : 1;
        ctx.save();
        ctx.translate(x + cw / 2, 8 + (hash(pi, ci, 2) - 0.5) * 6);
        ctx.rotate((hash(pi, ci, 3) - 0.5) * 0.05);
        ctx.scale(sc * CX, sc);
        ctx.fillStyle = 'rgba(0,40,70,0.35)'; ctx.fillText(ch, -cw / 2 / CX + 4, 5);
        ctx.fillStyle = isDot ? ORANGE : '#ffffff';
        ctx.fillText(ch, -cw / 2 / CX, 0);
        ctx.restore();
      }
      x += cw;
    });
    x += gap;
  });
  ctx.restore();
}

// pins, the two matching strings + 匹配 stamps, the buyer crowd burst
const STAMP_BIG = [makeStamp('匹配', 128, 5)];
let STAMP_MINI = [];
function drawTick([x, y], rotDeg, T, t) {
  if (t < T - 1 / 12) return;
  const k = Math.round((t - T) * 12);
  const sc = k < 0 ? 1.6 : k === 0 ? 0.9 : k === 1 ? 1.06 : 1;
  const j = jit(x, t, 0.8, 0.4);
  const poly = scissorPoly(74, 62, 4242 + Math.round(x), 16, 2);
  ctx.save(); ctx.translate(x + j.x, y + j.y - (k < 0 ? 20 : 0)); ctx.rotate(rotDeg * D2R + j.r); ctx.scale(sc, sc);
  const tile = (dx, dy) => { ctx.beginPath(); poly.forEach(([px, py], i) => (i ? ctx.lineTo(px - 37 + dx, py - 31 + dy) : ctx.moveTo(px - 37 + dx, py - 31 + dy))); ctx.closePath(); };
  ctx.fillStyle = 'rgba(25,15,5,0.35)'; tile(4, 6); ctx.fill();
  ctx.fillStyle = ORANGE; tile(0, 0); ctx.fill();
  ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(-5, 13); ctx.lineTo(19, -15); ctx.stroke();
  ctx.restore();
}
function drawMatching(t) {
  const P = C.pins;
  const pinList = [];
  NOTES.forEach((n, i) => pinList.push({ p: notePin(n), col: 'blue', T: P + Math.floor(i / 2) / 12 }));
  ASSETS.forEach((a, i) => pinList.push({ p: pinPoint(a), col: i % 3 === 1 ? 'orange' : 'blue', T: P + (2 + Math.floor(i / 2)) / 12 }));
  const craftPin = local(CRAFT, 0, -IMG.a_craft.height / 2 + 30);
  pinList.push({ p: craftPin, col: 'blue', T: P + 6 / 12 });
  const crowdOn = t >= C.crowd - 1 / 12;

  // the two first matches: big 匹配 rubber stamps; the 3rd on the residential complex
  const st1 = assetBy.a_machine, st2 = assetBy.a_park, st3 = assetBy.a_residential;
  drawStampAt(STAMP_BIG[0], local(st1, -40, 50), -14, C.stamp1, t, 0.82);
  drawStampAt(STAMP_BIG[0], local(st2, 60, 10), 10, C.stamp2, t, 0.82);
  // hierarchy for the hero: the photos that are not yet matched are washed back (tracing-paper tone)
  if (t >= C.dim) {
    const k = Math.round((t - C.dim) * 12);
    const a = k === 0 ? 0.18 : 0.34;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#d8c3a0';
    for (const as of ASSETS) {
      if (as === st1 || as === st2) continue;
      const im = IMG[as.img];
      ctx.save(); ctx.translate(as.x, as.y); ctx.rotate(as.rot * D2R); ctx.scale(as.s, as.s);
      ctx.fillRect(-im.width / 2 + 18, -im.height / 2 + 18, im.width - 36, im.height - 36);
      ctx.restore();
    }
    ctx.restore();
  }
  drawStampAt(STAMP_BIG[0], local(st3, 0, 30), 9, C.mini_stamps[0], t, 0.6);
  const ticks = [['a_office', -8], ['a_furniture', -12], ['a_laundry', 10]];
  ticks.forEach(([n, r], i) => { const a = assetBy[n]; const im = IMG[a.img]; drawTick(local(a, im.width * 0.36, -im.height * 0.3), r, C.mini_stamps[i + 1], t); });

  // crowd backdrop (sunburst + orange disc) + busts + puppet
  if (crowdOn) drawCrowd(t);

  // strings
  const n1 = notePin(NOTES[0]), n2 = notePin(NOTES[1]), n3 = notePin(NOTES[2]);
  drawString(n1, pinPoint(assetBy.a_machine), C.string1[0], C.string1[1], t, { w: 4.2 });
  drawString(n2, pinPoint(assetBy.a_park), C.string2[0], C.string2[1], t, { w: 4.2, sag: 0.02 });
  // hero: strings shoot from the crowd to every asset in two waves (10.67, 11.33), 3 steps each
  const targets = [...ASSETS.map((a) => pinPoint(a)), craftPin, n1, n2, n3];
  const headPin = (b) => { const L = LAY[b.img]; return [b.x + (L.head_top[0] - L.w / 2) * b.s, b.y + (L.head_top[1] + 14 - L.h / 2) * b.s]; };
  [C.burst, C.burst2].forEach((TW, wv) => {
    if (t < TW - 1e-4) return;
    let k = 0;
    BUSTS.forEach((b, bi) => {
      if ((bi + wv) % 2 && wv === 1 && bi > 6) return;
      const tg = targets[(bi * 2 + wv * 5) % targets.length];
      const src = headPin(b);
      const tS = TW + (k % 3) / 12;
      drawString(src, tg, tS, tS + 2 / 12, t, { w: 3.4, amp: 10, sag: 0.03, color: (k + wv) % 4 === 0 ? '#e07800' : '#0587c4' });
      k++;
    });
    const pup = [PUP.x + 120 * PUP.s, PUP.y - 300 * PUP.s];
    [targets[0], targets[3], targets[8]].forEach((tg, q) => drawString(pup, tg, TW + q / 12, TW + (q + 2) / 12, t, { w: 3.4, amp: 10, color: '#0587c4' }));
  });
  if (t >= C.burst - 1 / 12) BUSTS.forEach((b, bi) => { const hp = headPin(b); drawPin(hp[0], hp[1], bi % 3 ? 'blue' : 'orange', C.burst - 1 / 12 + (bi % 3) / 12, t); });
  for (const pn of pinList) drawPin(pn.p[0], pn.p[1], pn.col, pn.T, t, 0, jit(pn.p[0], t, 0, 1.5).r);
  drawHeroType(t);
}

function drawStampAt(img, [x, y], rotDeg, T, t, s) {
  if (t < T - 1 / 12) return;
  const k = Math.round((t - T) * 12);
  const sc = k < 0 ? 1.7 : k === 0 ? 0.93 : k === 1 ? 1.03 : 1;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rotDeg * D2R); ctx.scale(s * sc, s * sc);
  if (k < 0) {    // the stamp block in the air: just its shadow + a faint ghost
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
    ctx.fillRect(-img.width / 2 + 30, -img.height / 2 + 40, img.width, img.height);
  } else {
    ctx.globalAlpha = k === 0 ? 0.95 : 0.85;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
  }
  ctx.restore();
}

function drawCrowd(t) {
  // orange constructivist disc behind the crowd, slapped first
  const dT = C.crowd - 1 / 12;
  const dk = Math.round((t - dT) * 12);
  const ds = dk <= 0 ? 0.88 : dk === 1 ? 1.05 : 1;
  // HERO: constructivist cut-paper sunburst slapped in behind the crowd on the burst, turning on the 12 fps grid
  if (t >= C.burst - 1 / 12) {
    const k = Math.round((t - C.burst) * 12);
    const sc = k < 0 ? 0.55 : k === 0 ? 1.12 : k === 1 ? 0.97 : 1;
    const turn = Math.max(0, k) * 0.6 * D2R;
    ctx.save();
    ctx.translate(CROWD_C[0], CROWD_C[1] + 30); ctx.rotate(turn); ctx.scale(sc, sc);
    for (let i = 0; i < 14; i++) {
      const a0 = i / 14 * Math.PI * 2, w = 0.085 + hash(i, 71) * 0.04;
      const r0 = 200, r1 = 470 + hash(i, 72) * 120;
      ctx.fillStyle = 'rgba(20,12,4,0.28)';
      ctx.beginPath(); ctx.moveTo(Math.cos(a0 - w) * r0 + 8, Math.sin(a0 - w) * r0 + 12); ctx.lineTo(Math.cos(a0) * r1 + 8, Math.sin(a0) * r1 + 12); ctx.lineTo(Math.cos(a0 + w) * r0 + 8, Math.sin(a0 + w) * r0 + 12); ctx.fill();
      ctx.fillStyle = i % 2 ? BLUE : '#f2ede2';
      ctx.beginPath(); ctx.moveTo(Math.cos(a0 - w) * r0, Math.sin(a0 - w) * r0); ctx.lineTo(Math.cos(a0) * r1, Math.sin(a0) * r1); ctx.lineTo(Math.cos(a0 + w) * r0, Math.sin(a0 + w) * r0); ctx.fill();
    }
    ctx.restore();
  }
  drawPiece('disc_orange', CROWD_C[0], CROWD_C[1] + 30, 0, 1.25 * ds, dk <= 0 ? 0.4 : 0);
  BUSTS.forEach((b, i) => {
    const st = slap(b.T, t, [0, -260], 2);
    if (!st) return;
    const j = st.landed ? jit(900 + i, t, 1.0, 0.6) : { x: 0, y: 0, r: 0 };
    const x = b.x + st.dx + j.x, y = b.y + st.dy + j.y, rot = b.rot * D2R + j.r, s = b.s * st.sq;
    drawShadow(b.img, x, y, rot, s, st.lift);
    // the jaw chatters (2 replacement positions) while the strings fire: Monty Python mouth flaps
    const step = Math.floor(t * 12 + 1e-4);
    const open = t >= C.burst - 1 / 12 && t < C.channels && (step + i * 2) % 3 === 0;
    const L = LAY[b.img];
    withFrame(x, y, rot, s, () => {
      const im = IMG[b.img], jw = IMG[b.img + '_jaw'];
      const ox = -im.width / 2, oy = -im.height / 2;
      if (open) {
        ctx.fillStyle = '#07080c';
        ctx.beginPath(); ctx.ellipse(ox + L.mouth[0], oy + L.mouth[1] + 6, L.hw * 0.55, 9, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.drawImage(jw, ox, oy + (open ? 13 : 0));
      ctx.drawImage(im, ox, oy);
    });
  });
  drawPuppet(t);
}

function drawPuppet(t) {
  const st = slap(PUP.T, t, [0, 300], 2);
  if (!st) return;
  const j = st.landed ? jit(990, t, 1.0, 0.5) : { x: 0, y: 0, r: 0 };
  const L = LAY.pup_head;
  const im = IMG.pup_head;
  const x = PUP.x + st.dx + j.x, y = PUP.y + st.dy + j.y, s = PUP.s * st.sq, rot = j.r - 4 * D2R;
  // body (tiny) – head (huge): all pieces share the head canvas frame
  const ox = -im.width / 2, oy = -im.height / 2;
  drawShadow('pup_body', x, y, rot, s, st.lift);
  drawShadow('pup_head', x, y, rot, s, st.lift);
  // paddle arm behind the body: shoulder rotation + elbow rotation (puppet joints)
  const aT = C.burst + 2 / 12;
  let sh = -12, el = -10;
  if (t >= aT) {
    const k = Math.round((t - aT) * 12);
    const curve = [-12, -70, -140, -118, -128, -125];
    sh = k < curve.length ? curve[k] : -125 + ((k % 4) < 2 ? -5 : 5);
    el = k < 3 ? [-10, -40, -18][k] : -22 + (k % 2) * 8;
  }
  withFrame(x, y, rot, s, () => {
    ctx.drawImage(IMG.pup_body, ox, oy);
    // mouth: cavity behind, jaw on a hinge, opens on the jaw cues
    let jaw = 0;
    for (const jt of C.jaw) { const k = Math.round((t - jt) * 12); if (t >= jt - 1e-4 && k < 3) jaw = Math.max(jaw, [16, 10, 3][k]); }
    ctx.drawImage(IMG.pup_cavity, ox, oy);
    ctx.save();
    ctx.translate(ox + L.hinge[0], oy + L.hinge[1]); ctx.rotate(jaw * D2R); ctx.translate(-(ox + L.hinge[0]), -(oy + L.hinge[1]));
    ctx.drawImage(IMG.pup_jaw, ox, oy);
    ctx.restore();
    ctx.drawImage(im, ox, oy);
    // paddle arm in front: shoulder + elbow joints (puppet rotation), the paddle goes up on the burst
    ctx.save();
    ctx.translate(ox + L.shoulder[0], oy + L.shoulder[1]);
    ctx.rotate(sh * D2R);
    const au = IMG.pup_arm_u, LU = LAY.pup_arm_u;
    ctx.drawImage(au, -LU.joint[0], -LU.joint[1]);
    ctx.translate(LU.end[0] - LU.joint[0], LU.end[1] - LU.joint[1]);
    ctx.rotate((180 + el) * D2R);
    const af = IMG.pup_arm_f, LF = LAY.pup_arm_f;
    ctx.drawImage(af, -LF.joint[0], -LF.joint[1]);
    ctx.translate(LF.paddle[0] - LF.joint[0], LF.paddle[1] - LF.joint[1]);
    ctx.rotate(-(sh + 180 + el) * D2R - rot);
    ctx.font = `900 84px ${F.sans}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fffaf0'; ctx.fillText('拍', 0, 4);
    ctx.restore();
  });
}

// 1000+ 精准买家 / 100+ 线下合作渠道 with counting numbers
function countChips(value, plus, x, y, size, t0, t, seed, styles) {
  const s = String(value) + (plus ? '+' : '');
  const out = [];
  let cx = x;
  [...s].forEach((ch, i) => {
    const style = styles[i % styles.length];
    out.push({ ch, style, size, x: cx, y: y + (hash(seed, i) - 0.5) * 16, rot: (hash(seed, i, 2) - 0.5) * 12, seed: seed * 10 + i, dt: ch === '+' ? 0 : 0 });
    cx += size * 0.78;
  });
  return out;
}
function counter(t, t0, from, to, steps) {
  const k = Math.floor((t - t0) * 12 + 1e-4);
  if (k >= steps - 1) return to;
  return Math.min(to - 7, Math.round(lerp(from, to, eOut(Math.max(0, k) / steps)) / 7) * 7);
}
function drawHeroType(t) {
  const T1 = C.buyers;
  if (t >= T1 - 1 / 12) {
    const v = counter(t, T1, 600, 1000, 6);
    const digits = countChips(v, t >= T1 + 6 / 12, 650, 268, 124, T1, t, 11, ['black', 'white', 'blue', 'black', 'white']);
    ransom(digits, t, { t0: T1, seed: 800 });
    const words = [...'精准买家'].map((ch, i) => ({ ch, style: ['white', 'news', 'orange', 'white'][i], size: 104, x: 1150 + i * 116, y: 282 + (i % 2) * 14, rot: (i % 2 ? 5 : -4) }));
    ransom(words, t, { t0: T1 + 3 / 12, seed: 810 });
  }
  const T2 = C.channels;
  if (t >= T2 - 1 / 12) {
    const v = counter(t, T2, 60, 100, 5);
    const digits = countChips(v, t >= T2 + 5 / 12, 210, 668, 110, T2, t, 21, ['orange', 'black', 'white', 'blue']);
    ransom(digits, t, { t0: T2, seed: 820 });
    const words = [...'线下合作渠道'].map((ch, i) => ({ ch, style: ['black', 'white', 'news', 'white', 'blue', 'white'][i], size: 82, x: 640 + i * 94, y: 690 + (i % 2) * 10, rot: (i % 2 ? 4 : -3) }));
    ransom(words, t, { t0: T2 + 3 / 12, seed: 830 });
  }
}

// ------------------------------------------------------------------ ENGINES (13.33 – 16.67 s)
const MAP = { x: 478, y: 610, s: 0.9, rot: -3 };
const CARDS = [
  { img: 'card0', label: '小红书', x: 1150, y: 640, rot: -13 },
  { img: 'card1', label: '抖音', x: 1330, y: 612, rot: -3 },
  { img: 'card2', label: '视频号', x: 1505, y: 632, rot: 8 },
  { img: 'card3', label: '更多平台…', x: 1650, y: 668, rot: 16, more: true },
];
function drawEngines(t) {
  ctx.drawImage(IMG.page_kraft, -340, -210);
  // background collage layer: newsprint scraps + constructivist blocks (already on the page under the rip)
  drawPiece('news1', 120, 980, -8 * D2R, 0.9);
  drawPiece('news2', 1840, 120, 6 * D2R, 0.85);
  drawPiece('disc_orange', 1640, 860, 0, 0.95);
  drawPiece('blk_black', 1460, 236, -4 * D2R, 0.62);
  drawPiece('news0', 760, 930, 5 * D2R, 0.6);
  // a torn blue seam down the middle: the two engines
  drawPiece('blk_blue', 960, 540, 90 * D2R + 1.5 * D2R, 0.85, 0, 1);
  // LEFT: Shenzhen map slapped from the left, blue pins pop across it, a network grows between them
  const st = slap(C.map, t, [-900, 120], 3, -10);
  if (st) {
    const j = st.landed ? jit(1200, t, 1.0, 0.3) : { x: 0, y: 0, r: 0 };
    const x = MAP.x + st.dx + j.x, y = MAP.y + st.dy + j.y, rot = MAP.rot * D2R + st.rot + j.r, s = MAP.s * st.sq;
    drawPiece('sz_map', x, y, rot, s, st.lift);
    queueHand(C.map, t, x - 120, y + 40, [-900, 120], { nIn: 3, scale: 0.55, flip: true, twist: -8 });
    if (st.landed) {
      const im = IMG.sz_map;
      const pins = LAY.sz_map.pins.map(([px, py]) => local({ x, y, rot: rot / D2R, s }, px - im.width / 2, py - im.height / 2));
      const [p0, p1] = C.map_pins;
      const nP = pins.length;
      // network strings between pins (built as pins land)
      const order = pins.map((p, i) => i);
      ctx.save();
      for (let i = 1; i < nP; i++) {
        const tp = lerp(p0, p1, i / (nP - 1));
        const a = pins[order[i]];
        let b = pins[0], bd = 1e9;
        for (let q = 0; q < i; q++) { const d = Math.hypot(pins[q][0] - a[0], pins[q][1] - a[1]); if (d < bd) { bd = d; b = pins[q]; } }
        drawString(b, a, Math.round(tp * 12) / 12, Math.round(tp * 12) / 12 + 1 / 12, t, { w: 2, amp: 5, sag: 0.02 });
      }
      ctx.restore();
      // pulses: every pin rings out on the two late beats (the network is alive)
      for (const pt of C.pulses) {
        const kk = Math.round((t - pt) * 12);
        if (t >= pt - 1e-4 && kk < 4) {
          ctx.save(); ctx.strokeStyle = kk % 2 ? ORANGE : BLUE; ctx.lineWidth = 5 - kk; ctx.globalAlpha = 1 - kk / 4;
          pins.forEach((pp) => { ctx.beginPath(); ctx.arc(pp[0], pp[1], 16 + kk * 14, 0, Math.PI * 2); ctx.stroke(); });
          ctx.restore();
        }
      }
      pins.forEach((p, i) => drawPin(p[0], p[1], i % 4 === 3 ? 'orange' : 'blue', Math.round(lerp(p0, p1, i / (nP - 1)) * 12) / 12, t, 0, jit(i + 40, t, 0, 2).r));
    }
  }
  // label tag typed: 深圳中介服务网络
  if (t >= C.map_label - 1 / 12) {
    const k = Math.round((t - C.map_label) * 12);
    const j = jit(1300, t, 0.8, 0.3);
    const s = k < 0 ? 1.3 : 1;
    ctx.save(); ctx.translate(478 + j.x, 236 + j.y); ctx.rotate(-2 * D2R + j.r); ctx.scale(s, s);
    const tg = IMG.tag_wide;
    ctx.save(); ctx.scale(1.25, 1.0);
    ctx.globalAlpha = 0.4; ctx.drawImage(IMG.tag_wide_sh, -tg.width / 2 - 18, -tg.height / 2 - 14, IMG.tag_wide_sh.width * 2, IMG.tag_wide_sh.height * 2);
    ctx.globalAlpha = 1; ctx.drawImage(tg, -tg.width / 2, -tg.height / 2); ctx.restore();
    const tp = IMG.tape_blue1;
    ctx.save(); ctx.translate(-320, -30); ctx.rotate(-35 * D2R); ctx.scale(0.45, 0.8); ctx.drawImage(tp, -tp.width / 2, -tp.height / 2); ctx.restore();
    ctx.save(); ctx.translate(320, -30); ctx.rotate(35 * D2R); ctx.scale(0.45, 0.8); ctx.drawImage(tp, -tp.width / 2, -tp.height / 2); ctx.restore();
    typeText('深圳中介服务网络', 0, 22, 62, C.map_label, t, { seed: 61, font: `900 62px ${F.serif}` });
    ctx.restore();
  }
  // RIGHT: headline 全网自媒体矩阵 (ransom), paper phone cards dealt like playing cards
  const head = [...'全网自媒体矩阵'].map((ch, i) => ({ ch, style: ['white', 'news', 'blue', 'white', 'orange', 'white', 'news'][i], size: 92,
    x: 1100 + i * 106, y: 232 + (i % 2 ? 12 : -6), rot: (hash(i, 51) - 0.5) * 12, seed: 900 + i }));
  ransom(head, t, { t0: C.matrix, seed: 950 });
  // a 5th card peeks in behind the fan: the list goes on
  if (t >= C.card5 - 2 / 12) {
    const u = clamp((t - C.card5 + 2 / 12) / (3 / 12));
    const x = lerp(2300, 1840, eOut(u)) + Math.max(0, t - C.card5) * 30, y = 700, rot = (24 + 2 * Math.max(0, t - C.card5)) * D2R;
    drawPiece('card1', x, y, rot, 0.8, t < C.card5 ? 0.4 : 0);
  }
  CARDS.forEach((c, i) => drawCard(c, i, t));
}

function drawCard(c, i, t) {
  const T = C.cards[i];
  if (t < T - 3 / 12) return;
  const u = clamp((t - (T - 3 / 12)) / (3 / 12));
  let x = lerp(2250, c.x, eOut(u)), y = lerp(c.y + 120, c.y, eOut(u)), rot = lerp(c.rot + 25, c.rot, eOut(u)) * D2R;
  if (c.more && t > T) { x += (t - T) * 30; rot += (t - T) * 2 * D2R; }   // the 4th card keeps sliding
  const k = Math.round((t - T) * 12);
  const s = 0.8 * (k === 0 ? 0.96 : 1);
  const j = t > T ? jit(1400 + i, t, 0.9, 0.35) : { x: 0, y: 0, r: 0 };
  x += j.x; y += j.y; rot += j.r;
  const lift = t < T ? 0.5 * (1 - u) + 0.1 : 0;
  const im = IMG[c.img], L = LAY[c.img];
  drawShadow(c.img, x, y, rot, s, lift);
  withFrame(x, y, rot, s, () => {
    ctx.drawImage(im, -im.width / 2, -im.height / 2);
    // photocopy: the scan bar sweeps down the screen, the copy appears behind it
    const [sx0, sy0, sx1, sy1] = L.screen;
    const sc = clamp((t - T + 1 / 12) / (4 / 12));
    const ox = -im.width / 2, oy = -im.height / 2;
    if (sc < 1) {
      const yb = lerp(sy0, sy1, sc);
      ctx.fillStyle = '#efece4';
      ctx.fillRect(ox + sx0, oy + yb, sx1 - sx0, sy1 - yb);
      const g = ctx.createLinearGradient(0, oy + yb - 26, 0, oy + yb + 8);
      g.addColorStop(0, 'rgba(160,230,255,0)'); g.addColorStop(0.8, 'rgba(190,240,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g; ctx.fillRect(ox + sx0 - 6, oy + yb - 26, sx1 - sx0 + 12, 34);
    }
    // label typed onto a torn paper label
    if (t >= T) {
      const tg = IMG['tag' + (i % 4)];
      const lw = c.more ? 0.86 : 0.82;
      ctx.save(); ctx.translate(0, oy + L.label[1]); ctx.rotate((hash(i, 61) - 0.5) * 6 * D2R);
      ctx.save(); ctx.scale(lw, 1.05); ctx.drawImage(tg, -tg.width / 2, -tg.height / 2); ctx.restore();
      typeText(c.label, 0, 16, c.more ? 40 : 46, T + 1 / 12, t, { seed: 70 + i, font: `900 ${c.more ? 40 : 46}px ${F.serif}` });
      ctx.restore();
    }
  });
}

// ------------------------------------------------------------------ END CARD (16.67 – 20 s)
const END = {
  l1: { text: '你要的资产，', x: 960, y: 318, rot: -2, size: 120, seed: 7101 },
  l2: { text: '领拍帮你', x: 0, y: 492, rot: 1.5, size: 120, seed: 7102 },
};
function slapScale(k) { return k <= -2 ? 1.3 : k === -1 ? 1.15 : k === 0 ? 0.96 : 1; }
function drawEnd(t) {
  ctx.drawImage(IMG.page_end, -140, -80);
  const o1 = chip(END.l1.text, 'strip', END.l1.size, END.l1.seed);
  const o2 = chip(END.l2.text, 'strip', END.l2.size, END.l2.seed);
  const p1 = chip('配', 'orange', 132, 7201), p2 = chip('上', 'orange', 132, 7202);
  // line 2 layout: strip + two orange tiles, centred as a group
  const gw = o2.w + 18 + p1.w + 8 + p2.w;
  const gx = 960 - gw / 2;
  const x2 = gx + o2.w / 2, xp1 = gx + o2.w + 18 + p1.w / 2, xp2 = xp1 + p1.w / 2 + 8 + p2.w / 2;
  const strip = (o, x, y, rot, T, id) => {
    if (t < T - 2 / 12) return;
    const k = Math.round((t - T) * 12);
    const j = k > 1 ? jit(id, t, 0.8, 0.25) : { x: 0, y: 0, r: 0 };
    drawChip(o, x + j.x, y + j.y - (k < 0 ? 26 * -k : 0), rot * D2R + j.r, slapScale(k), k < 0 ? 0.6 : 0);
  };
  strip(o1, END.l1.x, END.l1.y, END.l1.rot, C.end_line1, 1601);
  strip(o2, x2, END.l2.y, END.l2.rot, C.end_line2, 1602);
  puff(END.l1.x, END.l1.y + 40, C.end_line1, t, 91, 12, 330);
  // 配上: orange tiles slammed with a stamp, then a boiling blue marker underline under the whole line
  const TP = C.peishang;
  strip(p1, xp1, END.l2.y - 6, -5, TP, 1603);
  strip(p2, xp2, END.l2.y + 4, 4, TP + 1 / 12, 1604);
  puff(xp1 + 60, END.l2.y, TP, t, 92, 14, 260);
  doodle([[gx - 10, END.l2.y + 92], [gx + gw * 0.3, END.l2.y + 86], [gx + gw * 0.62, END.l2.y + 96], [gx + gw + 14, END.l2.y + 84]],
    TP + 2 / 12, 3, t, { color: BLUE, w: 9, seed: 93 });
  // the end of the matching string, pinned beside 上 (pin wobbles in the hold)
  const pT = TP + 4 / 12;
  if (t >= pT - 2 / 12) {
    const wob = Math.sin(Math.floor(t * 12) * 1.3) * 0.12 * Math.exp(-(t - pT) * 0.6) + Math.sin(Math.floor(t * 6) * 0.7) * 0.05;
    const px2 = xp2 + p2.w / 2 + 46, py2 = END.l2.y - 40;
    drawString([2100, 260], [px2, py2], pT - 2 / 12, pT, t, { w: 3.6, amp: 10, sag: 0.04 });
    drawPin(px2, py2, 'orange', pT, t, 0, wob);
  }
}
// the partnership lockup: screen space, never jittered or scaled (the 阿里资产 logo stays untouched)
function drawLockup(t) {
  const TL = C.lockup;
  if (t < TL - 2 / 12) return;
  const k = Math.round((t - TL) * 12);
  const lift = k < 0 ? (k === -2 ? 1 : 0.5) : 0;
  const dy = k < 0 ? (k === -2 ? -70 : -28) : 0;
  const sc = k < 0 ? 1.05 : k === 0 ? 0.99 : 1;
  const lp = IMG.logo_lingpai, al = IMG.logo_ali, bb = LAY.logo_ali.bbox;
  const LH = 92;
  const lw = lp.width * LH / lp.height;
  const ah = LH, aw = (bb[2] - bb[0]) * ah / (bb[3] - bb[1]);
  const gap = 74;
  const cx = 960, cy = 742;
  const pw = Math.max(lw, aw) * 2 + gap * 2 + 170, ph = 184;
  ctx.save();
  ctx.translate(cx, cy + dy); ctx.scale(sc, sc);
  ctx.fillStyle = `rgba(30,18,6,${0.3 - lift * 0.12})`;
  ctx.filter = 'blur(7px)';
  ctx.fillRect(-pw / 2 + 8 + lift * 22, -ph / 2 + 12 + lift * 32, pw, ph);
  ctx.filter = 'none';
  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  // rule exactly on the centre line, equal gaps either side
  ctx.drawImage(lp, -gap - lw, -LH / 2, lw, LH);
  ctx.fillStyle = INK; ctx.fillRect(-1, -50, 2, 100);
  ctx.drawImage(al, bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1], gap, -ah / 2, aw, ah);   // source rect = the logo's own pixels
  ctx.restore();
  if (k >= 0) {
    // tape on the panel's top corners: the free corners lift and settle through the hold
    const tapeAt = (tx, ty, ang, id) => {
      const tp = IMG.tape_cream0;
      const l2 = 0.5 + 0.5 * Math.sin(Math.floor(t * 6) * 0.9 + id * 2);
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(ang * D2R); ctx.scale(0.42, 0.62);
      ctx.drawImage(tp, -tp.width / 2, -tp.height / 2);
      ctx.fillStyle = `rgba(255,252,240,${0.55 + 0.2 * l2})`;
      ctx.beginPath(); ctx.moveTo(tp.width / 2 - 8, -tp.height / 2 + 2); ctx.lineTo(tp.width / 2 - 8 - 34 - l2 * 20, -tp.height / 2 + 2); ctx.lineTo(tp.width / 2 - 8, -tp.height / 2 + 30 + l2 * 18); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    tapeAt(cx - pw / 2 + 12, cy - ph / 2 + 6, -38, 1);
    tapeAt(cx + pw / 2 - 12, cy - ph / 2 + 6, 38, 2);
  }
  // the small line: a thin torn paper strip slapped under the panel
  const so = chip('阿里资产入库服务商 · 拍卖辅助 · 资产撮合', 'smallstrip', 38, 7301);
  const TS = C.small_line;
  if (t >= TS - 2 / 12) {
    const k2 = Math.round((t - TS) * 12);
    const j = k2 > 1 ? jit(1701, t, 0.6, 0.15) : { x: 0, y: 0, r: 0 };
    drawChip(so, 960 + j.x, 905 + j.y - (k2 < 0 ? 22 * -k2 : 0), -0.8 * D2R + j.r, slapScale(k2), k2 < 0 ? 0.6 : 0);
  }
}

// ------------------------------------------------------------------ transitions: rip (13.33) and page flip (16.33–16.67)
const off = mk(W, H), offg = off.getContext('2d');
const RIP = [];
{
  const r = rnd(1333);
  for (let i = 0; i <= 28; i++) RIP.push([960 + (r() - 0.5) * 70 + Math.sin(i * 0.7) * 30, -40 + i * (H + 80) / 28]);
}
function drawRip(t) {
  // render the board as it was the instant before the rip
  offg.setTransform(1, 0, 0, 1, 0, 0);
  drawScene(offg, C.rip - 1 / 12);
  const u = clamp((t - C.rip + 1 / 12) / (4 / 12));
  const e = eIn(u);
  drawEngines(t);
  const half = (side) => {
    ctx.save();
    const dx = side * (40 + 1300 * e), dy = 30 * e + e * e * 200, rot = side * 9 * e * D2R;
    ctx.translate(960 + dx, 540 + dy); ctx.rotate(rot); ctx.translate(-960, -540);
    ctx.beginPath();
    if (side < 0) { ctx.moveTo(-200, -200); RIP.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(-200, H + 200); }
    else { ctx.moveTo(W + 200, -200); RIP.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(W + 200, H + 200); }
    ctx.closePath();
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetX = side * 10; ctx.fillStyle = '#c9a77a'; ctx.fill(); ctx.restore();
    ctx.clip();
    ctx.drawImage(off, 0, 0);
    // white fibrous torn edge
    ctx.strokeStyle = 'rgba(250,246,236,0.95)'; ctx.lineWidth = 7;
    ctx.beginPath(); RIP.forEach(([x, y], i) => (i ? ctx.lineTo(x + side * 2, y) : ctx.moveTo(x + side * 2, y))); ctx.stroke();
    ctx.restore();
  };
  half(-1); half(1);
}
function drawFlip(t) {
  offg.setTransform(1, 0, 0, 1, 0, 0);
  drawScene(offg, C.flip[0] - 1 / 12);
  const u = clamp((t - C.flip[0] + 1 / 12) / (C.flip[1] - C.flip[0] + 1 / 12));
  const e = eInOut(u);
  drawEnd(t);
  const dn = Math.hypot(1, 0.62), dx = -1 / dn, dy = -0.62 / dn;    // peel direction (from the corner into the page)
  const Cx = W + 30, Cy = H + 30;
  const Lmax = (0 - Cx) * dx + (0 - Cy) * dy + 60;
  const sd = e * Lmax;
  const Fx = Cx + dx * sd, Fy = Cy + dy * sd;
  const tx = -dy, ty = dx, B = 5000;
  const half = (sgn) => {      // half-plane (p - F)·d  >= 0 (sgn 1) or < 0 (sgn -1)
    ctx.beginPath();
    ctx.moveTo(Fx + tx * B, Fy + ty * B); ctx.lineTo(Fx + tx * B + sgn * dx * B, Fy + ty * B + sgn * dy * B);
    ctx.lineTo(Fx - tx * B + sgn * dx * B, Fy - ty * B + sgn * dy * B); ctx.lineTo(Fx - tx * B, Fy - ty * B); ctx.closePath();
  };
  // the part of the page still lying flat
  ctx.save(); half(1); ctx.clip(); ctx.drawImage(off, 0, 0);
  // shadow cast by the lifted flap onto the flat page, along the fold
  const g = ctx.createLinearGradient(Fx, Fy, Fx + dx * 120, Fy + dy * 120);
  g.addColorStop(0, 'rgba(20,10,0,0.42)'); g.addColorStop(1, 'rgba(20,10,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // the flap: the lifted part reflected across the fold line, showing the kraft back of the page
  const dF = Fx * dx + Fy * dy;
  ctx.save();
  ctx.transform(1 - 2 * dx * dx, -2 * dx * dy, -2 * dx * dy, 1 - 2 * dy * dy, 2 * dF * dx, 2 * dF * dy);
  half(-1); ctx.clip();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 40; ctx.fillStyle = '#c9a77a'; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.drawImage(IMG.page_news, 100, 60, W, H, 0, 0, W, H);      // the back of the page is newsprint
  const g2 = ctx.createLinearGradient(Fx, Fy, Fx - dx * 500, Fy - dy * 500);
  g2.addColorStop(0, 'rgba(60,30,0,0.35)'); g2.addColorStop(0.25, 'rgba(255,240,210,0.18)'); g2.addColorStop(1, 'rgba(60,30,0,0.1)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ------------------------------------------------------------------ grain / dust (procedural, seeded)
const grain = mk(1024, 1024);
{
  const g = grain.getContext('2d'), id = g.createImageData(1024, 1024), r = rnd(4242);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 70; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
}
const dust = mk(W, H);
{
  const g = dust.getContext('2d'), r = rnd(777);
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(30,20,10,${0.08 + r() * 0.18})`;
    g.beginPath(); g.arc(r() * W, r() * H, 0.6 + r() * 1.6, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = `rgba(40,30,20,${0.08 + r() * 0.1})`; g.lineWidth = 0.8;
    const x = r() * W, y = r() * H;
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + r() * 40 - 20, y + r() * 40 - 20, x + r() * 60 - 30, y + r() * 60 - 30, x + r() * 80 - 40, y + r() * 80 - 40); g.stroke();
  }
}
function drawGrain(g, t) {
  const k = Math.floor(t * 12 + 1e-4);
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.globalAlpha = 0.16;
  const ox = (hash(k, 1) * 1024) | 0, oy = (hash(k, 2) * 1024) | 0;
  g.translate(-ox, -oy);
  for (let x = 0; x < W + 1024; x += 1024) for (let y = 0; y < H + 1024; y += 1024) g.drawImage(grain, x, y);
  g.restore();
  g.save();
  g.globalAlpha = 0.8;
  const dx = (hash(k >> 2, 5) - 0.5) * 30, dy = (hash(k >> 2, 6) - 0.5) * 30;
  g.drawImage(dust, dx, dy);
  g.restore();
  // soft vignette
  g.save();
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(40,20,0,0)'); vg.addColorStop(1, 'rgba(40,20,0,0.28)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.restore();
}

// ------------------------------------------------------------------ scene
function drawWorld(t) {
  if (t < C.rip) {
    const cam = camKeys(t);
    ctx.save();
    applyCam(ctx, cam, shake(t));
    drawBoard(t);
    drawHands();
    ctx.restore();
  } else if (t < C.flip[0]) {
    if (t < C.rip + 4 / 12) { drawRip(t); drawHands(); }
    else {
      const u = (t - C.rip) / (C.flip[0] - C.rip);
      const sh = shake(t);
      ctx.save();
      ctx.translate(W / 2 + sh[0], H / 2 + sh[1]); ctx.scale(1 + 0.035 * u, 1 + 0.035 * u); ctx.rotate((0.4 - 0.8 * u) * D2R); ctx.translate(-W / 2 - 20 * u, -H / 2);
      drawEngines(t); drawHands();
      ctx.restore();
    }
  } else if (t < C.flip[1] + 1 / 12) {
    drawFlip(t);
  } else {
    const u = (t - C.flip[1]) / (20 - C.flip[1]);
    const sh = shake(t);
    ctx.save();
    ctx.translate(W / 2 + sh[0], H / 2 + sh[1]); ctx.scale(1 + 0.025 * u, 1 + 0.025 * u); ctx.translate(-W / 2, -H / 2 + 5 * u);
    drawEnd(t); drawHands();
    ctx.restore();
    drawLockup(t);
  }
}
function drawScene(g, t) {
  // swap the module-level ctx so every draw helper renders into g (offscreen copies for the rip / flip)
  const prev = ctx;
  ctx = g;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  drawWorld(t);
  g.restore();
  ctx = prev;
}

window.renderAt = async (time) => {
  const t = Q(Math.min(time, 20 - 1e-6));
  ctx = mainCtx;
  const g = ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  drawWorld(t);
  drawGrain(g, t);
};
window.__ready = true;
