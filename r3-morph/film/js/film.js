// film.js — 「一锤定音」 NENGPAI 能拍法服, 15 s shape-morph film. Every frame is a pure function of t (window.renderAt).
import opentype from '/node_modules/opentype.js/dist/opentype.module.js';
import {
  W, H, FPS, FR, clamp, lerp, smooth, deg, EM, EO, EIO, EI, EB, bez, backOut, spring, mixC, tone, rgba, rng,
  NB, circ, makeShape, morph, makeM, applyM, polyPath, centroid, bbox, area, shapeArea, scaleAbout, rotP, translate, lerpP, alignTo,
} from './core.js';
import { C, SH, buildShapes, gavelGeom, LOGO, GLY, loadGlyphs, digitShape } from './shapes.js';

const cues = await (await fetch('./cues.json')).json();
window.DEMO = { width: W, height: H, fps: FPS, duration: 15, motionBlur: { samples: 6, shutter: 0.5 } };
const cv = document.getElementById('c');
let ctx = cv.getContext('2d');
const OCV = document.createElement('canvas'); OCV.width = W; OCV.height = H; const OCTX = OCV.getContext('2d');
const SHUT = 0.5 / FPS;   // shutter (s), for analytic smears
const qT = (t) => Math.round(t * FPS) / FPS;   // frame-centre time: identical for every motion-blur sub-sample
const P0 = [960, 468];    // hero home

buildShapes();
await loadGlyphs(opentype);

// ---------------------------------------------------------------- fonts
const SERIF = '"Noto Serif SC"', SANS = '"Noto Sans SC"', LAT = '"Inter"';
const CJK = '每一件沉睡的资产起拍价工业厂房住宅房产珠宝玉器即将开拍直播竞价中当前价溢价围观出价次金额为示意成交近家法院覆盖余个省市区直播拍卖成交率能拍法服让司法更高效焕资产新价值综合辅助服务·▲';
const LATIN = 'NENGPAI LIVE 0123456789,.+%¥';
const fontSpecs = [`600 40px ${SERIF}`, `900 40px ${SERIF}`, `500 40px ${SANS}`, `700 40px ${SANS}`, `500 40px ${LAT}`, `600 40px ${LAT}`, `700 40px ${LAT}`, `800 40px ${LAT}`];
for (const f of fontSpecs) await document.fonts.load(f, CJK + LATIN);
await document.fonts.ready;
window.__fontReport = fontSpecs.map((f) => [f, document.fonts.check(f, CJK)]);

// ---------------------------------------------------------------- text helpers
function text(str, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font || `500 32px ${SANS}`; ctx.fillStyle = o.color || C.ink; ctx.globalAlpha *= o.alpha ?? 1;
  const ls = o.ls || 0; ctx.letterSpacing = ls + 'px'; ctx.textBaseline = o.base || 'alphabetic';
  let w = ctx.measureText(str).width - ls;
  let x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  ctx.textAlign = 'left'; ctx.fillText(str, x0, y);
  ctx.restore(); return w;
}
function measure(str, font, ls = 0) { ctx.save(); ctx.font = font; ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(str).width - ls; ctx.restore(); return w; }
// rise-in through a slot mask: p 0..1
function reveal(str, x, y, o, p, h = 70) {
  if (p <= 0) return; const e = EO(clamp(p));
  ctx.save(); ctx.beginPath(); ctx.rect(-50, y - h, W + 100, h * 1.35); ctx.clip();
  text(str, x, y + (1 - e) * h * 0.8, { ...o, alpha: (o.alpha ?? 1) * clamp(p * 3) });
  ctx.restore();
}

// ---------------------------------------------------------------- glyph drawing (digits, ¥, comma) from Inter 800 outlines
const capC = () => (GLY.capTop + GLY.capBot) / 2;
function glyph(ch, cx, cyCap, fs, color, sx = 1, sy = 1, alpha = 1) {
  const g = GLY.d[ch]; if (!g) return; const k = fs / 1000;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cyCap); ctx.scale(k * sx, k * sy); ctx.translate(0, -capC());
  ctx.fillStyle = color; ctx.fill(g.path); ctx.restore();
}
function drawShapeAt(S, M, fill, alpha = 1) {   // S = morph result (body/holes/parts), M = transform
  const T = (p) => applyM(M, p);
  const path = new Path2D(); polyPath(path, S.body.map(T)); for (const h of S.holes) if (h.on) polyPath(path, h.pts.map(T));
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = fill; ctx.fill(path, 'evenodd'); ctx.restore();
  return path;
}

// ---------------------------------------------------------------- hero: hook + morph chain (0 – 6.02 s)
const MO = cues.morphs.map((m) => ({ ...m }));
const ROT0 = { gavel: -24 * deg };
const SWING = [0, 16, -20, 18, -10, 0];
const SQ = [0.10, 0.13, 0.13, 0.13, 0.08, 0.06];
const LAND = cues.land;
for (const [i, m] of MO.entries()) {
  const A = SH[m.a], B = SH[m.b];
  m.via = m.via ? clamp(Math.sqrt((shapeArea(A) + shapeArea(B)) / 2 / Math.PI), 165, 205) : 0;
  m.key = m.a + '>' + m.b; m.swing = SWING[i] * deg; m.sq = SQ[i];
}
// live sub-animation of each held shape (smoke drift, window lights, glint travel, sparkle twinkle)
function live(name, t) {
  const S0 = SH[name];
  if (name === 'factory') {
    const parts = S0.parts.map((p, i) => { if (!p.on) return p; const ph = 2 * Math.PI * (t * 0.85 + i / 3);
      const c = centroid(p.pts); const s = 1 + 0.07 * Math.sin(ph); return { ...p, pts: translate(scaleAbout(p.pts, c, s), 6 * Math.sin(ph * 0.7), -8 * Math.sin(ph) - 6 * (t - 1.6)) }; });
    return { ...S0, parts };
  }
  if (name === 'apartment') {
    const parts = S0.parts.map((p, i) => { if (!p.on || p.lit) return p; const r = rng(i * 7 + 3)(); if (r > 0.6) return p;
      const tl = 2.86 + r * 0.55; return { ...p, c: mixC(C.ink, C.gold, smooth(tl, tl + 0.07, t)) }; });
    return { ...S0, parts };
  }
  if (name === 'bracelet') {
    const τ = t - LAND.bracelet; const parts = S0.parts.slice();
    const a = (-30 + 120 * EIO(clamp(τ / 0.5))) * deg; parts[0] = { ...parts[0], pts: rotP(S0.parts[0].pts, a) };
    const tw = 1 + 0.35 * Math.sin(Math.PI * clamp(τ / 0.32)), st = parts[2], c = centroid(st.pts);
    parts[2] = { ...st, pts: rotP(scaleAbout(st.pts, c, tw), 45 * deg * EIO(clamp(τ / 0.4)), c) };
    return { ...S0, parts };
  }
  return S0;
}
function beatPulse(t) { const b = ((t - cues.anchor) % 0.6 + 0.6) % 0.6; return Math.exp(-b * 9) * (1 - Math.exp(-b * 70)); }
function impactQ(t, tl, A = 0.12) { const τ = t - (tl - 2 * FR); return τ > 0 && τ < 1 ? A * Math.sin((2 * Math.PI * τ) / 0.3) * Math.exp(-τ * 7) : 0; }
function anticQ(t, t0, A = 0.07) { const τ = t - (t0 - 0.2); if (τ <= 0) return 0; if (τ < 0.2) return A * EIO(τ / 0.2); if (τ < 0.32) return A * (1 - EO((τ - 0.2) / 0.12)) - 0.6 * A * Math.sin((Math.PI * (τ - 0.2)) / 0.12); return 0; }
const pivB = (S) => [0, bbox(S.body)[3]];

function heroAt(t) {
  const tap = cues.hook.tap;
  if (t < 1.0) {   // hook: grey dot → tapped → inflates to brand red
    const τ = t - tap;
    const r = τ < 0 ? 70 : lerp(70, 200, backOut(clamp(τ / 0.44), 2.0));
    const q = τ < 0 ? 0 : 0.30 * smooth(0, 0.03, τ) * Math.exp(-τ * 7.5) * Math.cos(2 * Math.PI * 2.3 * τ);
    const S = SH.circle, M = makeM(P0, 0, r / 200, Math.PI / 2, 1, q, [0, 200]);
    return { S, M, fill: C.grey, sweep: τ > 0 ? { to: C.red, p: EO(clamp((τ - 0.01) / 0.32)), radial: [0, -200] } : null, name: 'circle', anchorOK: false };
  }
  const m = MO.find((x) => t >= x.t0 && t < x.t1);
  if (m) {
    const u = (t - m.t0) / (m.t1 - m.t0), g = EM(u);
    const A = live(m.a, Math.min(t, m.t0)), B = live(m.b, Math.max(t, m.t1));
    const S = morph(A, B, u, { via: m.via, key: m.key });
    const lift = Math.sin(Math.PI * g), dx = (m.swing >= 0 ? 1 : -1) * 26 * lift;
    let pos = [P0[0] + dx, P0[1] - 46 * lift];
    let rot = lerp(ROT0[m.a] || 0, ROT0[m.b] || 0, g) + m.swing * lift;
    let k = 1 + m.sq * lift, sc = 1, q = anticQ(t, m.t0) ;
    if (m.b === 'capsule') { k = 1; }
    const piv = u < 0.5 ? pivB(A) : pivB(B);
    const M = makeM(pos, rot, sc, Math.PI / 2 + rot, k, q, piv);
    const fA = SH[m.a].fill, fB = SH[m.b].fill;
    const sweep = fA !== fB ? { to: fB, p: EIO(clamp((u - 0.36) / 0.28)), radial: [0, 0] } : null;
    return { S, M, fill: fA, sweep, name: u < 0.5 ? m.a : m.b, u, m };
  }
  // holds
  let cur = 'circle', tl = cues.hook.inflated; for (const x of MO) if (t >= x.t1) { cur = x.b; tl = x.t1; }
  if (cur === 'capsule') return null;
  const S = live(cur, t), nx = MO.find((x) => x.t0 > t);
  let q = impactQ(t, tl) + (nx ? anticQ(t, nx.t0) : 0), rot = ROT0[cur] || 0;
  if (cur === 'gavel') {   // the gavel knocks once on the downbeat (開拍) and recoils
    const τ = t - LAND.gavel; rot += 9 * deg * Math.sin(Math.PI * clamp(τ / 0.16)) * (τ > 0 ? 1 : 0) - 4 * deg * smooth(0.16, 0.22, τ);
  }
  const pul = cur === 'circle' ? 0 : 0.012 * beatPulse(t);
  const M = makeM(P0, rot, 1 + pul, Math.PI / 2, 1, q, pivB(S));
  return { S, M, fill: S.fill, sweep: null, name: cur };
}

function drawHero(t, h) {
  if (!h) return;
  const T = (p) => applyM(h.M, p);
  const body = h.S.body.map(T);
  const path = new Path2D(); polyPath(path, body); for (const ho of h.S.holes) if (ho.on) polyPath(path, ho.pts.map(T));
  const [x0, y0, x1, y1] = bbox(body);
  const grad = (col) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, tone(col, 0.025)); g.addColorStop(1, tone(col, -0.02)); return g; };
  // soft cast shadow (only reads on paper)
  ctx.save(); ctx.shadowColor = 'rgba(40,20,10,0.20)'; ctx.shadowBlur = 46; ctx.shadowOffsetY = 26; ctx.fillStyle = grad(h.fill); ctx.fill(path, 'evenodd'); ctx.restore();
  if (h.sweep && h.sweep.p > 0) {
    ctx.save(); ctx.clip(path, 'evenodd'); ctx.fillStyle = grad(h.sweep.to); ctx.beginPath();
    if (h.sweep.radial) { const o = T(h.sweep.radial); ctx.arc(o[0], o[1], Math.hypot(x1 - x0, y1 - y0) * 1.05 * h.sweep.p, 0, 2 * Math.PI); }
    else { const yy = lerp(y0 - 4, y1 + 4, h.sweep.p); ctx.rect(x0 - 50, y0 - 50, x1 - x0 + 100, yy - y0 + 50); }
    ctx.fill(); ctx.restore();
  }
  for (const p of h.S.parts) { if (!p.on || p.a <= 0.01) continue; const pp = new Path2D(); polyPath(pp, p.pts.map(T)); ctx.save(); ctx.globalAlpha *= p.a; ctx.fillStyle = p.c; ctx.fill(pp); ctx.restore(); }
}

// 起拍价 tag that rides along the morphs (anchor = top-right-most outline point, lagged swing)
function heroAnchor(t) { const h = heroAt(t); if (!h) return null; let best = -1e9, bp = null;
  for (const p of h.S.body) { const s = p[0] - p[1]; if (s > best) { best = s; bp = p; } } return applyM(h.M, bp); }
const TAGS = [[1.30, '工业厂房'], [2.45, '住宅房产'], [3.65, '珠宝玉器'], [4.85, '即将开拍']];
function drawTag(t) {
  const t0 = 1.40, t1 = 5.36; if (t < t0 || t > t1 + 0.2) return;
  const a = heroAnchor(t), al = heroAnchor(t - 0.07), a2 = heroAnchor(t - 0.14); if (!a || !al || !a2) return;
  const vx = (al[0] - a2[0]) / 0.07, vy = (al[1] - a2[1]) / 0.07;
  const swing = clamp(-vx * 0.0009 + vy * 0.0004, -0.5, 0.5) + 0.05 * Math.sin(2 * Math.PI * 1.3 * t);
  const pop = backOut(clamp((t - t0) / 0.22), 2.2) * (1 - EI(clamp((t - t1) / 0.18)));
  if (pop <= 0.001) return;
  let li = 0; for (let i = 0; i < TAGS.length; i++) if (t >= TAGS[i][0]) li = i;
  const flip = TAGS.slice(1).reduce((f, [tt]) => { const d = Math.abs(t - tt); return d < 0.09 ? Math.min(f, d / 0.09) : f; }, 1);
  const label = TAGS[li][1], final = li === 3;
  const L = 74 + 8 * Math.sin(2 * Math.PI * 0.9 * t);
  const hole = [al[0] + 46 + 14 * Math.sin(swing), al[1] - 30 + 6 * Math.cos(swing)];
  ctx.save();
  // string
  ctx.strokeStyle = 'rgba(120,110,100,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo((a[0] + hole[0]) / 2, Math.max(a[1], hole[1]) + 14, hole[0], hole[1]); ctx.globalAlpha = pop; ctx.stroke();
  ctx.translate(hole[0], hole[1]); ctx.rotate(swing * 0.6 - 0.12); ctx.scale(pop * Math.max(0.02, flip), pop);
  const w = 148, h2 = 62;
  const body = new Path2D(); body.moveTo(0, 0); body.lineTo(18, -h2 / 2); body.lineTo(w, -h2 / 2); body.arcTo(w + 8, -h2 / 2, w + 8, 0, 8); body.arcTo(w + 8, h2 / 2, w, h2 / 2, 8); body.lineTo(18, h2 / 2); body.closePath();
  ctx.fillStyle = final ? '#E8E0D3' : '#8D857B'; ctx.fill(body);
  ctx.fillStyle = final ? '#8D857B' : '#E8E0D3'; ctx.beginPath(); ctx.arc(16, 0, 5, 0, 2 * Math.PI); ctx.fill();
  const tc = final ? C.ink : '#FBF7F0';
  if (final) { ctx.fillStyle = C.rise; ctx.beginPath(); ctx.arc(40, 0, 6.5, 0, 2 * Math.PI); ctx.fill(); text(label, 56, 9, { font: `700 23px ${SANS}`, color: tc, ls: 1 }); }
  else { text('起拍价', 32, -6, { font: `700 21px ${SANS}`, color: tc, ls: 2 }); text(label, 32, 20, { font: `500 17px ${SANS}`, color: tc, ls: 1.5, alpha: 0.85 }); }
  ctx.restore();
}

// ---------------------------------------------------------------- hook gavel + strike gavel (the logo's gavel, flat gold)
const _gp = {};
function gavelPaths(R) { if (_gp[R]) return _gp[R]; const g = gavelGeom(R); return (_gp[R] = { body: new Path2D(g.body), top: new Path2D(g.top), bot: new Path2D(g.bot) }); }
function drawGavel(R, ox, oy, rot, alpha = 1, piv = [0, 0], shine = -1, col = C.gold) {
  const g = gavelPaths(R);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(ox + piv[0], oy + piv[1]); ctx.rotate(rot); ctx.translate(-piv[0], -piv[1]);
  ctx.fillStyle = col; ctx.fill(g.body); ctx.fill(g.top); ctx.fill(g.bot);
  if (shine >= 0 && shine <= 1) {   // a soft light band sweeping across the gold
    ctx.save(); const all = new Path2D(); all.addPath(g.body); all.addPath(g.top); all.addPath(g.bot); ctx.clip(all);
    const x = lerp(-0.6 * R, 1.3 * R, shine), gr = ctx.createLinearGradient(x - 0.18 * R, -0.3 * R, x + 0.18 * R, 0.3 * R);
    gr.addColorStop(0, 'rgba(255,250,225,0)'); gr.addColorStop(0.5, 'rgba(255,250,225,0.75)'); gr.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = gr; ctx.fillRect(-R, -R, 2.6 * R, 2 * R); ctx.restore();
  }
  ctx.restore();
}
// sub-frame smear for very fast rigid moves: draw n copies across the shutter around t
function smear(t, fn, n = 7) { ctx.save(); const a0 = ctx.globalAlpha; for (let i = 0; i < n; i++) { const ts = t + SHUT * 0.5 * ((i + 0.5) / n - 0.5); ctx.globalAlpha = a0 * (1 - Math.pow(1 - 0.9, 1 / n)) * 1.0; fn(ts); } ctx.restore(); fn(t, true); }

function hookGavel(t) {   // spins in (already moving on frame 0), taps the grey dot at 0.40, rebounds out
  const tap = cues.hook.tap, R = 150, contactY = P0[1] - 70, oy = contactY - (LOGO.band.yBot + LOGO.band.h) * R;
  const tgt = [P0[0] + 2, oy];
  if (t < tap) { const s = clamp((t + 0.06) / (tap + 0.06)), e = bez(0.45, 0, 0.85, 0.55)(s);
    const p = [lerp(1460, tgt[0], e), lerp(40, tgt[1], 1 - Math.pow(1 - e, 1.5))];
    return { x: p[0], y: p[1], rot: -1.6 * Math.PI * (1 - e), a: 1 }; }
  const τ = t - tap; if (τ > 0.62) return null;
  const e = bez(0.2, 0.55, 0.65, 1)(clamp(τ / 0.58));
  return { x: lerp(tgt[0], 1790, e), y: lerp(tgt[1], -300, e) - 60 * Math.sin(Math.PI * clamp(τ / 0.58)), rot: 1.6 * Math.PI * EI(clamp(τ / 0.58)) - 0.25 * Math.sin(Math.PI * clamp(τ / 0.12)), a: 1 };
}
function drawHookGavel(t) {
  if (t > cues.hook.tap + 0.62) return;
  smear(t, (ts, crisp) => { const g = hookGavel(ts); if (g) drawGavel(150, g.x, g.y, g.rot, crisp ? 1 : 1, [0.364 * 150, 0]); }, 6);
}
// knock accents at a contact point
function knock(t, t0, x, y, col, scale = 1, n = 3) {
  const τ = t - t0; if (τ < 0 || τ > 0.4) return;
  ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = 6 * scale;
  for (let i = 0; i < n; i++) { const a = (-90 + (i - (n - 1) / 2) * 42) * deg, r0 = (34 + 60 * EO(clamp(τ / 0.25))) * scale, r1 = r0 + 38 * scale * (1 - EO(clamp((τ - 0.05) / 0.3)));
    if (r1 - r0 < 1) continue; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); }
  ctx.restore();
}

// ---------------------------------------------------------------- auction screen
const BIDS = cues.bids, PR = cues.prices, P_START = 1000000;
const priceAt = (j) => (j < 0 ? P_START : PR[j]);
const FS = 214, PITCH = FS * 0.98;
const digitOf = (P, k) => Math.floor(P / 10 ** k) % 10;
// paddle bids: the first 8 bids arrive as paddles that morph into the leading digit
const NPAD = 8;
function leadCol(j) { const a = priceAt(j - 1), b = priceAt(j); for (let k = 6; k >= 0; k--) if (digitOf(a, k) !== digitOf(b, k)) return k; return 0; }
function rollDur(j) { const nx = j + 1 < BIDS.length ? BIDS[j + 1] - BIDS[j] : 0.3; return clamp(nx * 0.8, 0.09, 0.42); }
function colPos(k, t, rollOnly = false) {
  let p = digitOf(P_START, k);
  for (let j = 0; j < BIDS.length; j++) {
    const a = priceAt(j - 1), b = priceAt(j), d = ((digitOf(b, k) - digitOf(a, k)) % 10 + 10) % 10; if (!d) continue;
    const lc = leadCol(j);
    if (j < NPAD && k === lc) { if (!rollOnly) p += t >= BIDS[j] ? d : 0; continue; }   // delivered by the paddle morph
    const t0 = BIDS[j] - rollDur(j) * 0.75 + 0.02 * k, e = backOut(clamp((t - t0) / rollDur(j)), 1.25);
    p += d * e;
  }
  return p;
}
function bidIndex(t) { let j = -1; for (let i = 0; i < BIDS.length; i++) if (t >= BIDS[i]) j = i; return j; }
function priceKick(t) { let v = 0; for (let j = 0; j < BIDS.length; j++) { const τ = t - BIDS[j]; if (τ > 0 && τ < 0.6) v += Math.exp(-τ * 9) * Math.sin(2 * Math.PI * 2.4 * τ); } return v; }
// price layout: ¥ d , d d d , d d d
function priceLayout(fs) {
  const k = fs / 1000, cell = GLY.cell * fs, yen = GLY.d['¥'].adv * fs, com = GLY.d[','].adv * fs * 0.9, gap = 0.03 * fs;
  const slots = [{ t: '¥', w: yen + gap }]; for (let i = 6; i >= 0; i--) { slots.push({ t: 'd', k: i, w: cell }); if (i === 6 || i === 3) slots.push({ t: ',', w: com }); }
  const tot = slots.reduce((s, x) => s + x.w, 0); let x = -tot / 2; for (const s of slots) { s.cx = x + s.w / 2; x += s.w; }
  return { slots, tot, k };
}
const PL = priceLayout(FS);
const PRICE_Y = 560;   // cap centre
function screenRegion(t) {   // the capsule grows into the full-frame screen
  const t0 = cues.wipes.screen; if (t < t0) return null;
  const e1 = EB(clamp((t - t0) / 0.26)), e2 = EB(clamp((t - t0 - 0.06) / 0.34));
  if (e1 >= 1 && e2 >= 1) return 'full';
  const w = lerp(760, 2400, e1), h = lerp(192, 1500, e2), r = lerp(96, 0, e2);
  return { rr: [P0[0] - w / 2, P0[1] - h / 2, w, h, Math.min(r, h / 2)] };
}
function uiIn(t, i) { return EO(clamp((t - (cues.wipes.screen + 0.16 + 0.05 * i)) / 0.3)); }

function paddle(j) {   // flight of paddle j: from an edge, arcs into its column, lands at BIDS[j]
  const lc = leadCol(j), slot = PL.slots.find((s) => s.t === 'd' && s.k === lc);
  const tgt = [P0[0] + slot.cx, PRICE_Y], r = rng(j * 31 + 7);
  const side = [[-120, 980], [2040, 900], [-120, 160], [2040, 120], [300, 1200], [1650, 1200], [-120, 620], [2040, 560]][j % 8];
  const dur = j === 0 ? 0.3 : j < 2 ? 0.5 : 0.42, t0 = BIDS[j] - dur;
  const ctrl = [lerp(side[0], tgt[0], 0.5) + (r() - 0.5) * 200, Math.min(side[1], tgt[1]) - 260 - r() * 120];
  return { lc, tgt, side, t0, t1: BIDS[j], ctrl, ch: String(digitOf(priceAt(j), lc)), old: String(digitOf(priceAt(j - 1), lc)) };
}
const _cS = makeShape(circ(0, 0, 60, NB), [], [], C.paper);
const _dS = {};
const dShape = (ch, fs) => _dS[ch + fs] || (_dS[ch + fs] = digitShape(ch, fs, C.rise));
function drawPaddle(t, j) {
  const P = paddle(j); if (t < P.t0 || t > P.t1 + 0.001) return;
  const u = clamp((t - P.t0) / (P.t1 - P.t0)), e = bez(0.3, 0.1, 0.4, 1)(u);
  const qb = (s) => [lerp(lerp(P.side[0], P.ctrl[0], s), lerp(P.ctrl[0], P.tgt[0], s), s), lerp(lerp(P.side[1], P.ctrl[1], s), lerp(P.ctrl[1], P.tgt[1], s), s)];
  const pos = qb(e), p2 = qb(Math.min(1, e + 0.02)), p1 = qb(Math.max(0, e - 0.02));
  const phi = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]), speed = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const mu = clamp((u - 0.55) / 0.45);   // morph circle → digit in the last 45 % of the flight
  const S = morph(_cS, dShape(P.ch, FS), mu, { key: 'pad' + P.ch });
  const sc = lerp(0.95, 1, EO(mu));
  const k = 1 + clamp(speed / 40, 0, 0.35) * (1 - mu);
  const M = makeM(pos, (1 - mu) * 0.3 * Math.sin(u * 6), sc, phi, k, 0);
  const col = mixC(C.paper, C.rise, smooth(0.15, 0.7, mu));
  drawShapeAt(S, M, col);
  if (mu < 0.3) { ctx.save(); ctx.translate(pos[0], pos[1]); ctx.rotate(phi * 0); text('出价', 0, 11, { font: `700 34px ${SANS}`, color: C.ink, align: 'center', ls: 2, alpha: 1 - mu / 0.3 }); ctx.restore(); }
}
function drawSmallPaddle(t, j) {   // fast bids: small paddles dive into the price
  const r = rng(j * 13 + 5), side = [[-80, 300 + r() * 600], [2000, 250 + r() * 600], [400 + r() * 1100, 1160]][j % 3];
  const t1 = BIDS[j], t0 = t1 - 0.28; if (t < t0 || t > t1) return;
  const u = EI(clamp((t - t0) / (t1 - t0))), tgt = [P0[0] + (r() - 0.5) * 700, PRICE_Y - 60];
  const pos = [lerp(side[0], tgt[0], u), lerp(side[1], tgt[1], u)], rad = 26 * (1 - 0.8 * u * u);
  const phi = Math.atan2(tgt[1] - side[1], tgt[0] - side[0]);
  ctx.save(); ctx.translate(pos[0], pos[1]); ctx.rotate(phi); ctx.scale(1 + 0.6 * u, 1 / (1 + 0.6 * u)); ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
}

function viewersAt(t) { const e = Math.pow(clamp((t - 6.3) / (9.7 - 6.3)), 1.6); return Math.round(lerp(318420, 465000, e)); }
function bidsCountAt(t) { const j = bidIndex(t); const base = 386, steps = BIDS.length; if (j < 0) return base; const f = clamp((t - BIDS[j]) / 0.3);
  return Math.round(lerp(base, 452, Math.min(1, (j + f) / steps) ** 1.15)); }
const fmt = (n) => n.toLocaleString('en-US');
function tabular(str, x, y, fs, color, weight = 600, align = 'left', alpha = 1) {   // fixed cells → no jitter
  ctx.save(); ctx.font = `${weight} ${fs}px ${LAT}`; ctx.fillStyle = color; ctx.globalAlpha *= alpha; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const cw = fs * 0.64, nw = fs * 0.3; const ws = [...str].map((c) => (/[0-9]/.test(c) ? cw : nw)); const tot = ws.reduce((a, b) => a + b, 0);
  let xx = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x; [...str].forEach((c, i) => { ctx.fillText(c, xx + ws[i] / 2, y); xx += ws[i]; });
  ctx.restore(); return tot;
}

function drawScreen(t) {
  // ambient: a warm red glow behind the price that heats up with the bidding
  const heat = smooth(6.3, 9.7, t) * (t < cues.hit ? 1 : 1 - smooth(cues.hit + 0.3, cues.hit + 0.9, t));
  { const g = ctx.createRadialGradient(P0[0], PRICE_Y, 50, P0[0], PRICE_Y, 900); g.addColorStop(0, rgba('#7A1414', 0.15 + 0.5 * heat)); g.addColorStop(1, rgba('#7A1414', 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  // fine scanline texture of a broadcast screen (very faint)
  ctx.save(); ctx.globalAlpha = 0.035; ctx.fillStyle = '#FFFFFF'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1); ctx.restore();
  const hitT = cues.hit, frozen = qT(t) >= hitT;
  const tt = frozen ? hitT : t;
  // top bar
  const a0 = uiIn(t, 0);
  if (a0 > 0) {
    ctx.save(); ctx.translate(0, (1 - a0) * -20); ctx.globalAlpha = a0;
    const pulse = 0.55 + 0.45 * Math.cos(2 * Math.PI * (t - 6.3) / 0.6);
    ctx.fillStyle = C.rise; ctx.globalAlpha = a0 * (frozen ? 1 : pulse); ctx.beginPath(); ctx.arc(140, 112, 9, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = a0;
    text('直播竞价中', 164, 122, { font: `700 30px ${SANS}`, color: C.paper, ls: 4 });
    text('LIVE', 340, 121, { font: `700 20px ${LAT}`, color: C.rise, ls: 3 });
    text('金额为示意', W - 140, 120, { font: `500 20px ${SANS}`, color: C.paper, align: 'right', ls: 3, alpha: 0.45 });
    ctx.restore();
  }
  // label above the price
  const a1 = uiIn(t, 1);
  if (a1 > 0) { const j = bidIndex(t), lab = j < 0 ? '起拍价' : '当前价';
    text(lab, P0[0], PRICE_Y - FS * 0.5 - 52 + (1 - a1) * 20, { font: `500 30px ${SANS}`, color: C.paper, align: 'center', ls: 10, alpha: 0.6 * a1 }); }
  // the price odometer
  const kick = frozen ? 0 : priceKick(t);
  const hitSq = frozen ? 0.13 * Math.exp(-(t - hitT) * 9) * Math.cos(2 * Math.PI * 3 * (t - hitT)) : 0;
  // the odometer is drawn on its own layer and masked to a window with feathered top/bottom edges
  const main = ctx; ctx = OCTX; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.setTransform(main.getTransform()); ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(P0[0], PRICE_Y - 14 * kick); ctx.scale(1 + 0.03 * kick + hitSq * 0.5, 1 + 0.03 * kick - hitSq);
  const colsIn = (i) => EO(clamp((t - (cues.wipes.screen + 0.12 + 0.035 * i)) / 0.32));
  PL.slots.forEach((s, i) => {
    const ai = colsIn(i); if (ai <= 0) return; const dy = (1 - ai) * 90;
    ctx.save(); ctx.globalAlpha = ai;
    if (s.t !== 'd') { glyph(s.t, s.cx, dy + (s.t === ',' ? 0 : 0), FS, C.rise); ctx.restore(); return; }
    const k = s.k, p = colPos(k, tt), v = (colPos(k, tt + 0.004, true) - colPos(k, tt - 0.004, true)) / 0.008;
    const i0 = Math.floor(p + 1e-6), f = p - i0, blur = Math.min(90, Math.abs(v) * PITCH * SHUT);
    // paddle-delivered column: the old digit squashes away just before the paddle lands
    let jP = -1; for (let j = 0; j < NPAD; j++) if (leadCol(j) === k && tt > BIDS[j] - 0.14 && tt < BIDS[j]) jP = j;
    if (jP >= 0) { const sq = EI(clamp((tt - (BIDS[jP] - 0.14)) / 0.12)); glyph(String(((i0 % 10) + 10) % 10), s.cx, dy - 40 * sq, FS, C.rise, 1 - 0.5 * sq, 1 - sq, 1 - sq); }
    else {
      const n = blur > 2 ? Math.min(28, Math.ceil(blur / 2.5)) : 1;
      for (let c = 0; c < n; c++) {
        const off = n > 1 ? ((c + 0.5) / n - 0.5) * blur : 0, al = n > 1 ? 1 - Math.pow(0.1, 1 / n) : 1;
        const d0 = ((i0 % 10) + 10) % 10, d1 = (d0 + 1) % 10;
        let land = 0; for (let j = 0; j < NPAD; j++) if (leadCol(j) === k) land += impactQ(tt, BIDS[j] + 2 * FR, 0.16);
        glyph(String(d0), s.cx, dy - f * PITCH + off, FS, C.rise, 1 + land, 1 - land, al);
        if (f > 0.001) glyph(String(d1), s.cx, dy + (1 - f) * PITCH + off, FS, C.rise, 1, 1, al);
      }
    }
    ctx.restore();
  });
  { const WIN = 0.5 * (GLY.capBot - GLY.capTop) * FS / 1000 + 34, FE = 30;
    ctx.globalCompositeOperation = 'destination-in'; const g = ctx.createLinearGradient(0, -WIN, 0, WIN);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(FE / (2 * WIN), '#000'); g.addColorStop(1 - FE / (2 * WIN), '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(-W, -WIN, 2 * W, 2 * WIN); ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  ctx = main; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(OCV, 0, 0); ctx.restore();
  // ▲ + premium tag
  const j = frozen ? BIDS.length - 1 : bidIndex(t);
  const a3 = uiIn(t, 3);
  if (a3 > 0) {
    const prem = Math.round((priceAt(j) / P_START - 1) * 100);
    const big = frozen ? backOut(clamp((t - cues.premiumTag) / 0.25), 2.0) : 0;
    const tagKick = j >= 0 && !frozen ? Math.exp(-(t - BIDS[j]) * 12) : 0;
    const s = 1 + 0.12 * tagKick + 0.32 * big, y = PRICE_Y + FS * 0.5 + 92 + 10 * big;
    const str = j < 0 ? '溢价 +0%' : `溢价 +${prem}%`;
    ctx.save(); ctx.translate(P0[0], y); ctx.scale(s, s); ctx.globalAlpha = a3;
    const w = measure(str, `700 36px ${SANS}`, 2) + 74, h = 60;
    ctx.fillStyle = big > 0 ? mixC('#3A1714', C.rise, clamp(big)) : '#3A1714'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    const tri = (cx, cy, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.95, cy + r * 0.65); ctx.lineTo(cx - r * 0.95, cy + r * 0.65); ctx.closePath(); ctx.fill(); };
    tri(-w / 2 + 34, -2 - 4 * tagKick, 13 * (1 + 0.4 * tagKick), big > 0.5 ? C.paper : C.rise);
    text(str, -w / 2 + 58, 13, { font: `700 36px ${SANS}`, color: big > 0.5 ? C.paper : C.rise, ls: 2 });
    ctx.restore();
  }
  // rising ▲ particles on each bid
  for (let b = 0; b < BIDS.length; b++) { const τ = tt - BIDS[b]; if (τ < 0 || τ > 0.7) continue; const r = rng(b * 17 + 1);
    const x = P0[0] + PL.tot / 2 + 30 + r() * 60, y = PRICE_Y - 60 - 160 * EO(τ / 0.7); const s = 12 + 8 * r();
    ctx.save(); ctx.globalAlpha = (1 - τ / 0.7) * 0.9; ctx.fillStyle = C.rise; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.7); ctx.lineTo(x - s, y + s * 0.7); ctx.closePath(); ctx.fill(); ctx.restore(); }
  // bottom counters
  const a4 = uiIn(t, 4);
  if (a4 > 0) {
    ctx.save(); ctx.globalAlpha = a4; ctx.translate(0, (1 - a4) * 24);
    const y = 958;
    ctx.strokeStyle = rgba(C.paper, 0.14); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(140, y - 74); ctx.lineTo(W - 140, y - 74); ctx.stroke();
    text('围观', 140, y, { font: `500 28px ${SANS}`, color: C.paper, ls: 4, alpha: 0.6 });
    const vs = frozen ? '465,000+' : fmt(viewersAt(t));
    tabular(vs, 222, y + 2, 44, C.paper, 600);
    text('次', W - 140, y, { font: `500 28px ${SANS}`, color: C.paper, align: 'right', ls: 0, alpha: 0.6 });
    tabular(String(frozen ? 452 : bidsCountAt(t)), W - 182, y + 2, 44, C.paper, 600, 'right');
    text('出价', W - 182 - 3 * 44 * 0.64 - 18, y, { font: `500 28px ${SANS}`, color: C.paper, align: 'right', ls: 4, alpha: 0.6 });
    ctx.restore();
  }
  // a ring pulses out of the price on every bid (the circle keeps speaking)
  for (let b = 0; b < BIDS.length; b++) { const τ = tt - BIDS[b]; if (τ < 0 || τ > 0.45) continue; const slot = PL.slots.find((s) => s.t === 'd' && s.k === leadCol(b));
    const e = EO(τ / 0.45); ctx.save(); ctx.strokeStyle = C.rise; ctx.globalAlpha = 0.55 * (1 - τ / 0.45); ctx.lineWidth = 6 * (1 - e) + 1;
    ctx.beginPath(); ctx.arc(P0[0] + slot.cx, PRICE_Y, 90 + 260 * e, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }
  // paddles
  if (!frozen) { for (let b = 0; b < NPAD; b++) drawPaddle(t, b); for (let b = NPAD; b < BIDS.length; b++) drawSmallPaddle(t, b); }
}

// ---------------------------------------------------------------- the hit: gavel strike, burst, 成交 seal
const SG = { R: 410 };
SG.ox = P0[0] - 40; SG.oy = PRICE_Y - FS * 0.36 - (LOGO.band.yBot + LOGO.band.h) * SG.R;
SG.piv = [SG.R * 1.0, 0];
function strikeRot(t) {   // rotation about the hand (handle end)
  const { gavelRise: r0, gavelHold: h0, gavelSwing: s0, hit } = cues;
  if (t < 9.40) return null;
  if (t < r0) return { rot: 24 * deg, enter: EO(clamp((t - 9.40) / 0.36)) };
  if (t < h0) return { rot: lerp(24, 34, EO((t - r0) / (h0 - r0))) * deg, enter: 1 };
  if (t < s0) return { rot: 34 * deg + 1.2 * deg * Math.sin((t - h0) * 90), enter: 1 };
  if (t < hit) return { rot: lerp(34, 0, EI((t - s0) / (hit - s0))) * deg, enter: 1 };
  const τ = t - hit;
  if (τ < 0.55) return { rot: 7 * deg * Math.sin(Math.PI * clamp(τ / 0.2)) * Math.exp(-τ * 3), enter: 1 };
  return { rot: 70 * deg * EI(clamp((τ - 0.55) / 0.3)), enter: 1, exit: EI(clamp((τ - 0.55) / 0.3)) };
}
function drawStrikeGavel(t) {
  if (t < 9.40 || t > cues.hit + 0.9) return;
  smear(t, (ts) => { const s = strikeRot(ts); if (!s) return;
    const dx = (1 - s.enter) * 700 + (s.exit || 0) * 500, dy = (1 - s.enter) * -500 + (s.exit || 0) * -700;
    drawGavel(SG.R, SG.ox + dx, SG.oy + dy, s.rot, 1, SG.piv); }, 8);
}
function drawBurst(t) {
  const τ = t - cues.hit; if (τ < 0 || τ > 0.6) return;
  const o = [SG.ox, PRICE_Y - FS * 0.36];
  { const e = EO(clamp(τ / 0.5)); ctx.save(); ctx.strokeStyle = C.gold; ctx.globalAlpha = 1 - clamp(τ / 0.5); ctx.lineWidth = 22 * (1 - e) + 1.5;
    ctx.beginPath(); ctx.arc(o[0], o[1], 40 + 1000 * e, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }
  ctx.save(); ctx.strokeStyle = C.gold; ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) { const r = rng(i * 11 + 3), a = (-180 + (i + 0.5) * (180 / 16) + (r() - 0.5) * 6) * deg;
    const len = (160 + 220 * r()), r0 = 120 + 520 * EO(clamp(τ / 0.45)) * (0.7 + 0.3 * r()), r1 = r0 + len * (1 - EO(clamp(τ / 0.5)));
    if (r1 - r0 < 2) continue; ctx.lineWidth = 7 * (1 - τ / 0.6) + 1; ctx.beginPath(); ctx.moveTo(o[0] + Math.cos(a) * r0, o[1] + Math.sin(a) * r0); ctx.lineTo(o[0] + Math.cos(a) * r1, o[1] + Math.sin(a) * r1); ctx.stroke(); }
  for (let i = 0; i < 14; i++) { const r = rng(i * 23 + 9), a = (-170 + 160 * r()) * deg, v = 900 + 700 * r();
    const x = o[0] + Math.cos(a) * v * τ, y = o[1] + Math.sin(a) * v * τ + 1400 * τ * τ; ctx.fillStyle = C.gold; ctx.globalAlpha = 1 - τ / 0.6;
    ctx.beginPath(); ctx.arc(x, y, 7 + 6 * r(), 0, 2 * Math.PI); ctx.fill(); }
  ctx.restore();
  if (τ < 3 * FR) { ctx.save(); const g = ctx.createRadialGradient(o[0], o[1], 0, o[0], o[1], 900); const a = 0.55 * (1 - τ / (3 * FR));
    g.addColorStop(0, rgba('#FFF1C8', a)); g.addColorStop(0.35, rgba('#FFD46A', a * 0.35)); g.addColorStop(1, rgba('#FFD46A', 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
// 成交 seal: pre-rendered once with an eroded ink edge, then slammed
const SEAL = { R: 168, cx: 1395, cy: 760, rot: -11 * deg };
const sealCanvas = (() => {
  const S = 2 * SEAL.R + 40, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const m = S / 2;
  g.fillStyle = C.rise; g.strokeStyle = C.rise;
  g.lineWidth = 15; g.beginPath(); g.arc(m, m, SEAL.R - 8, 0, 2 * Math.PI); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(m, m, SEAL.R - 30, 0, 2 * Math.PI); g.stroke();
  g.font = `900 132px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '6px'; g.fillText('成交', m + 3, m - 6);
  g.font = `700 21px ${LAT}`; g.letterSpacing = '7px'; g.fillText('NENGPAI', m + 3, m + 92);
  g.font = `700 20px ${SANS}`; g.letterSpacing = '6px'; g.fillText('一锤定音', m + 3, m - 95);
  // ink texture: speckled erosion + rough edge
  const r = rng(4242); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) { const a = r() * 2 * Math.PI, rr = Math.sqrt(r()) * SEAL.R, x = m + Math.cos(a) * rr, y = m + Math.sin(a) * rr; g.globalAlpha = 0.25 + 0.6 * r(); g.beginPath(); g.arc(x, y, 0.6 + 2.2 * r() * r(), 0, 2 * Math.PI); g.fill(); }
  for (let i = 0; i < 260; i++) { const a = r() * 2 * Math.PI, rr = SEAL.R - 1 + r() * 3, x = m + Math.cos(a) * rr, y = m + Math.sin(a) * rr; g.globalAlpha = 0.9; g.beginPath(); g.arc(x, y, 1.5 + 3 * r(), 0, 2 * Math.PI); g.fill(); }
  for (let i = 0; i < 40; i++) { const x = m + (r() - 0.5) * 2 * SEAL.R, y = m + (r() - 0.5) * 2 * SEAL.R; g.globalAlpha = 0.35; g.save(); g.translate(x, y); g.rotate(r() * Math.PI); g.fillRect(-30 * r(), -1, 60 * r(), 2 + 2 * r()); g.restore(); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  return c;
})();
function drawSeal(t) {
  const t0 = cues.stamp; if (t < t0 - 0.1) return;
  const ir = irisAt(t); if (ir && ir.r > SEAL.R * 3.5) return;
  const τ = t - t0; let s, a, rot;
  if (τ < 0) { const e = EI(clamp((τ + 0.1) / 0.1)); s = lerp(1.9, 1.0, e); a = e; rot = SEAL.rot - 10 * deg * (1 - e); }
  else { s = 1 - 0.07 * Math.exp(-τ * 14) * Math.cos(2 * Math.PI * 3.2 * τ); a = 1; rot = SEAL.rot; }
  let grow = 1, fade = 1; if (ir) { grow = ir.r / SEAL.R; fade = 1 - smooth(1.0, 1.8, grow); }
  ctx.save(); ctx.translate(SEAL.cx, SEAL.cy); ctx.rotate(rot); ctx.scale(s * grow, s * grow); ctx.globalAlpha = a * fade;
  ctx.drawImage(sealCanvas, -sealCanvas.width / 2, -sealCanvas.height / 2); ctx.restore();
}

// ---------------------------------------------------------------- iris to paper (the seal's circle opens), proof figures
function irisAt(t) { const t0 = cues.wipes.paper; if (t < t0) return null; const far = Math.hypot(SEAL.cx, SEAL.cy) + 60;
  const e = EB(clamp((t - t0) / 0.55)); return { r: lerp(SEAL.R - 8, far, e), e, full: e >= 1 }; }
const FIG = [
  { x: 400, val: '400', seq: [['1', '2', '3', '4'], ['0'], ['0']], pre: '近', suf: '家', desc: '法院' },
  { x: 960, val: '20', seq: [['1', '2'], ['0']], pre: '覆盖', suf: '余个', desc: '省市区' },
  { x: 1520, val: '92', seq: [['3', '6', '8', '9', '9'], ['0', '0', '0', '0', '2']], pre: '', suf: '%', desc: '直播拍卖成交率' },
];
const FFS = 178, FY = 455;
const _circ40 = makeShape(circ(0, 0, 70, NB), [], [], C.rise);
function figGeom(f) { const cell = GLY.cell * FFS, n = f.seq.length, w = n * cell; return { cell, n, w, x0: f.x - w / 2 }; }
function figDigitAt(f, ci, t, tf) {   // returns {S (morph result), u0(stage)}
  const seq = f.seq[ci], tland = tf + 0.04 * ci; const steps = [0.24, 0.13, 0.13, 0.16, 0.22];
  if (t < tland - 0.24) return null;
  if (t < tland) { const u = (t - (tland - 0.24)) / 0.24; return { S: morph(_circ40, dShape(seq[0], FFS), u, { key: 'fc' + seq[0] + FFS }), stage: 0, u }; }
  let tt = tland; for (let i = 1; i < seq.length; i++) { const d = steps[i] || 0.2; if (t < tt + d) { const u = (t - tt) / d;
      if (seq[i] === seq[i - 1]) return { S: dShape(seq[i], FFS), stage: i, u: 1 };
      return { S: morph(dShape(seq[i - 1], FFS), dShape(seq[i], FFS), u, { key: 'dd' + seq[i - 1] + seq[i] + FFS }), stage: i, u }; } tt += d; }
  return { S: dShape(seq[seq.length - 1], FFS), stage: seq.length, u: 1 };
}
function figEnd(f) { const tf = cues.figures[FIG.indexOf(f)]; const steps = [0.24, 0.13, 0.13, 0.16, 0.22]; let tt = tf + 0.04 * (f.seq.length - 1); for (let i = 1; i < f.seq[0].length; i++) tt += steps[i] || 0.2; return tt; }
function drawFigures(t) {
  const conv = cues.converge;
  FIG.forEach((f, fi) => {
    const tf = cues.figures[fi], G = figGeom(f);
    // the circle flies out of the seal centre and divides into one circle per digit column
    const tl = tf - 0.24, tfly = tl - 0.38;
    if (t < tfly) return;
    const out = conv; const toCirc = clamp((t - out) / 0.2);
    if (t < tl) {   // flight
      const u = clamp((t - tfly) / 0.38), e = EO(u), dst = [f.x, FY];
      const ctrl = [lerp(SEAL.cx, dst[0], 0.5), Math.min(SEAL.cy, dst[1]) - 220];
      const pos = [lerp(lerp(SEAL.cx, ctrl[0], e), lerp(ctrl[0], dst[0], e), e), lerp(lerp(SEAL.cy, ctrl[1], e), lerp(ctrl[1], dst[1], e), e)];
      const r = lerp(30, 70 * 0.55, e) , split = smooth(0.6, 1, u);
      for (let ci = 0; ci < G.n; ci++) { const cx = lerp(pos[0], G.x0 + G.cell * (ci + 0.5), split);
        ctx.save(); ctx.fillStyle = C.rise; ctx.beginPath(); ctx.ellipse(cx, pos[1], r * (1 + 0.25 * (1 - split) * Math.sin(Math.PI * u)), r / (1 + 0.25 * (1 - split) * Math.sin(Math.PI * u)), 0, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }
      return;
    }
    for (let ci = 0; ci < G.n; ci++) {
      const d = figDigitAt(f, ci, t, tf); if (!d) continue;
      let S = d.S, sc = d.stage === 0 ? lerp(0.55, 1, EO(d.u)) : 1;
      if (toCirc > 0) { const last = f.seq[ci][f.seq[ci].length - 1]; S = morph(dShape(last, FFS), _circ40, toCirc, { key: 'dc' + last + FFS }); sc = lerp(1, 0.55, EO(toCirc)); }
      const q = impactQ(t, tf + 0.04 * ci, 0.14) + (d.stage > 0 && d.u < 1 ? 0 : 0);
      const M = makeM([G.x0 + G.cell * (ci + 0.5), FY], 0, sc, Math.PI / 2, 1, q, [0, FFS * 0.36]);
      if (toCirc < 1) drawShapeAt(S, M, C.rise);
    }
    // ▲, prefix / suffix / descriptor
    const ta = figEnd(f), hide = 1 - smooth(conv - 0.05, conv + 0.12, t);
    const ptri = backOut(clamp((t - ta) / 0.2), 2.4) * hide;
    if (ptri > 0) { const sw = f.suf === '%' ? FFS * 0.62 * GLY.d['%'].adv + 6 : measure(f.suf, `700 42px ${SANS}`) + 14, y = FY - FFS * 0.36 + 12, s = 14 * ptri;
      const tx = G.x0 + G.w + sw + 22;
      ctx.save(); ctx.fillStyle = C.rise; ctx.beginPath(); ctx.moveTo(tx, y - s); ctx.lineTo(tx + s, y + s * 0.7); ctx.lineTo(tx - s, y + s * 0.7); ctx.closePath(); ctx.fill(); ctx.restore(); }
    const pt = clamp((t - tf - 0.05) / 0.32);
    ctx.save(); ctx.globalAlpha = hide;
    if (f.pre) reveal(f.pre, G.x0 - 14, FY + FFS * 0.36, { font: `700 42px ${SANS}`, color: C.ink, align: 'right' }, pt, 60);
    if (f.suf === '%') { const ps = backOut(clamp((t - ta + 0.1) / 0.25), 1.8); if (ps > 0) { ctx.save(); ctx.translate(G.x0 + G.w + 6, FY + FFS * 0.36); ctx.scale(ps, ps); glyph('%', 50, -FFS * 0.36 * 0.62, FFS * 0.62, C.rise); ctx.restore(); } }
    else reveal(f.suf, G.x0 + G.w + 14, FY + FFS * 0.36, { font: `700 42px ${SANS}`, color: C.ink }, pt, 60);
    reveal(f.desc, f.x, FY + FFS * 0.36 + 102, { font: `700 40px ${SANS}`, color: C.ink, align: 'center', ls: 8, alpha: 0.85 }, clamp((t - ta + 0.05) / 0.35), 64);
    ctx.restore();
  });
}

// ---------------------------------------------------------------- end frame: converge into ONE circle, gavel lands → the logo
const LG = { cx: 652, cy: 470, R: 158 };
function convergeCircles(t) {   // each figure digit (now a circle) flies into the logo centre
  const out = [];
  FIG.forEach((f, fi) => { const G = figGeom(f); for (let ci = 0; ci < G.n; ci++) {
    const t0 = cues.converge + 0.2 + 0.035 * (fi * 3 + ci), d = 0.34, u = clamp((t - t0) / d); if (t < t0) continue; if (u >= 1) continue;
    const s = [G.x0 + G.cell * (ci + 0.5), FY], e = EI(u) * 0.6 + EIO(u) * 0.4, ctrl = [lerp(s[0], LG.cx, 0.5), Math.min(s[1], LG.cy) - 160 - 60 * ci];
    const p = [lerp(lerp(s[0], ctrl[0], e), lerp(ctrl[0], LG.cx, e), e), lerp(lerp(s[1], ctrl[1], e), lerp(ctrl[1], LG.cy, e), e)];
    out.push({ p, r: 38.5 * (1 - 0.3 * e), col: mixC(C.rise, C.red, e), u }); } });
  return out;
}
function logoR(t) {   // the logo circle grows as the circles merge in, with a pulse per arrival
  const t0 = cues.converge + 0.2; let n = 0, pulse = 0; const tot = 7;
  FIG.forEach((f, fi) => { const G = figGeom(f); for (let ci = 0; ci < G.n; ci++) { const ta = t0 + 0.035 * (fi * 3 + ci) + 0.34; if (t >= ta) { n++; pulse += spring(t - ta, 3, 9); } } });
  const base = n === 0 ? 0 : LG.R * Math.sqrt(n / tot);
  const g = n === 0 ? 0 : base * (1 + 0.06 * pulse);
  return { r: g, n };
}
function drawEnd(t) {
  if (t < cues.converge) return;
  const tl = cues.logoLand;
  for (const c of convergeCircles(t)) { ctx.save(); ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(c.p[0], c.p[1], c.r, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }
  const L = logoR(t); if (L.r <= 0) return;
  const τ = t - tl, q = τ > -2 * FR ? 0.10 * Math.sin((2 * Math.PI * (τ + 2 * FR)) / 0.28) * Math.exp(-(τ + 2 * FR) * 8) : 0;
  const breathe = t > tl + 0.4 ? 0.004 * Math.sin(2 * Math.PI * (t - tl) / 1.2) : 0;
  const R = L.r * (1 + breathe);
  ctx.save(); ctx.translate(LG.cx, LG.cy + R); ctx.scale(1 + q, 1 - q); ctx.translate(0, -R);
  ctx.shadowColor = 'rgba(60,20,10,0.16)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
  const g = ctx.createLinearGradient(0, -R, 0, R); g.addColorStop(0, tone(C.red, 0.015)); g.addColorStop(1, tone(C.red, -0.012));
  ctx.fillStyle = L.n < 7 ? mixC(C.rise, C.red, L.n / 7) : g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
  // gavel flies in and lands into its place on the beat
  const ge = cues.logoLand - 0.36;
  if (t >= ge) {
    const R0 = LG.R, sh = t > cues.shine ? clamp((t - cues.shine) / 0.55) : -1;
    smear(t, (ts) => {
      const u = clamp((ts - ge) / 0.36), e = EI(u);
      const x = lerp(LG.cx + 520, LG.cx, e), y = lerp(LG.cy - 420, LG.cy, 1 - Math.pow(1 - e, 1.4));
      const rot = lerp(-1.1 * Math.PI, 0, EO(u * 0.8 + 0.2 * e));
      const rb = ts > tl ? -4 * deg * Math.sin(Math.PI * clamp((ts - tl) / 0.18)) * Math.exp(-(ts - tl) * 4) : 0;
      ctx.save(); ctx.translate(LG.cx, LG.cy + R); ctx.scale(1 + q, 1 - q); ctx.translate(-LG.cx, -LG.cy - R);
      if (u >= 1) { ctx.beginPath(); ctx.arc(LG.cx, LG.cy, R * 1.0005, 0, 2 * Math.PI); ctx.clip(); }
      drawGavel(R0, x, y, rot + rb, 1, [0, 0], sh); ctx.restore(); }, 6);
  }
  knock(t, tl, LG.cx + 180, LG.cy - 80, C.gold, 0.8, 3);
}
function drawTitle(t) {
  const t0 = cues.title; if (t < t0) return;
  const x = 890, ttl = '能拍法服';
  ctx.save();
  [...ttl].forEach((ch, i) => { const p = clamp((t - t0 - 0.05 * i) / 0.36); reveal(ch, x + i * 150, 512, { font: `900 136px ${SERIF}`, color: C.ink }, p, 150); });
  reveal('NENGPAI · 综合司法辅助服务', x + 4, 590, { font: `500 26px ${SANS}`, color: C.ink, ls: 6, alpha: 0.62 }, clamp((t - t0 - 0.24) / 0.36), 40);
  const pr = EO(clamp((t - t0 - 0.3) / 0.5)); if (pr > 0) { ctx.fillStyle = C.gold; ctx.fillRect(960 - 60 * pr, 742, 120 * pr, 4); }
  reveal('让司法更高效 · 焕资产新价值', 960, 836, { font: `600 50px ${SERIF}`, color: C.red, align: 'center', ls: 10 }, clamp((t - t0 - 0.36) / 0.42), 70);
  ctx.restore();
}
function drawParticles(t) {   // faint rising digits / ▲ behind the end frame
  const a = smooth(cues.logoLand, cues.logoLand + 0.6, t); if (a <= 0) return;
  const r = rng(77); ctx.save();
  for (let i = 0; i < 28; i++) { const x = 60 + r() * 1800, sp = 26 + 30 * r(), ph = r(), ch = '0123456789▲'[Math.floor(r() * 11)], s = 18 + 16 * r();
    const y = 1100 - ((ph * 1200 + sp * (t - 13)) % 1200); if (y > 360 && y < 900 && x > 470 && x < 1500) continue;
    ctx.globalAlpha = a * 0.10 * (0.5 + 0.5 * r()); text(ch, x, y, { font: `700 ${s}px ${LAT}`, color: C.rise }); }
  ctx.restore();
}

// ---------------------------------------------------------------- fields (colour-block wipes) + per-field decor
function bloom(t, t0, o, r0, dur = 0.55) { if (t < t0) return null; const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map((c) => Math.hypot(c[0] - o[0], c[1] - o[1]))) + 80;
  const e = EB(clamp((t - t0) / dur)); if (e >= 1) return 'full'; return { circle: [o[0], o[1], lerp(r0, far, e)] }; }
const FIELDS = [
  { c: C.paper, ink: C.ink, reg: () => 'full', decor: 'chain' },
  { c: C.ink, ink: C.paper, reg: (t) => bloom(t, cues.wipes.ink, [P0[0], P0[1] - 40], 150), decor: 'chain' },
  { c: C.red, ink: C.paper, reg: (t) => bloom(t, cues.wipes.red, [P0[0], P0[1] - 40], 150), decor: 'chain' },
  { c: C.ink, ink: C.paper, reg: screenRegion, decor: 'screen' },
  { c: C.paper, ink: C.ink, reg: (t) => { const ir = irisAt(t); return !ir ? null : ir.full ? 'full' : { circle: [SEAL.cx, SEAL.cy, ir.r] }; }, decor: 'proof' },
];
function caption(t, ink) {
  const t0 = cues.hook.copy, p = clamp((t - t0) / 0.45), out = clamp((t - 5.30) / 0.3); if (p <= 0 || out >= 1) return;
  ctx.save(); ctx.globalAlpha = 1 - out; reveal('每一件沉睡的资产', 960, 948 + 30 * EI(out), { font: `600 40px ${SERIF}`, color: ink, align: 'center', ls: 14, alpha: 0.88 }, p, 60); ctx.restore();
}
function drawDecor(f, t) {
  if (f.decor === 'chain') caption(t, f.ink);
  else if (f.decor === 'screen') drawScreen(t);
  else if (f.decor === 'proof') { drawParticles(t); drawFigures(t); drawEnd(t); drawTitle(t); }
}
function drawFields(t) {
  let start = 0; for (let i = FIELDS.length - 1; i >= 0; i--) if (FIELDS[i].reg(t) === 'full') { start = i; break; }
  for (let i = start; i < FIELDS.length; i++) { const f = FIELDS[i], r = f.reg(t); if (!r) continue;
    ctx.save();
    if (r !== 'full') { ctx.beginPath(); if (r.circle) ctx.arc(r.circle[0], r.circle[1], r.circle[2], 0, 2 * Math.PI); else ctx.roundRect(...r.rr); ctx.clip(); }
    ctx.fillStyle = f.c; ctx.fillRect(-200, -200, W + 400, H + 400); drawDecor(f, t);
    ctx.restore();
    if (r !== 'full' && r.circle && i === 4) {   // the seal's red rim rides the iris edge
      const ir = irisAt(t), w = 15 * (1 - smooth(0.5, 1, ir.e)); if (w > 0.3) { ctx.save(); ctx.strokeStyle = C.rise; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(r.circle[0], r.circle[1], r.circle[2], 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }
    }
  }
}

// ---------------------------------------------------------------- camera + finish
function camAt(t) {
  t = qT(t);   // camera shake/punch stays constant within a frame (no doubled frames under motion blur)
  let dx = 0, dy = 0, z = 1;
  const shakes = [[cues.hook.tap, 7, 0.25], [LAND.gavel, 5, 0.2], [cues.hit, 16, 0.14], [cues.stamp, 7, 0.12], [cues.logoLand, 3, 0.2]];
  for (const [t0, A, d] of shakes) { const τ = t - t0; if (τ < 0 || τ > d) continue; const f = Math.floor(τ * FPS), r = rng(Math.round(t0 * 100) + f * 7);
    const k = A * (1 - τ / d); dx += (r() - 0.5) * 2 * k; dy += (r() - 0.5) * 2 * k; }
  z = 1 + 0.012 * Math.sin(2 * Math.PI * t / 7.5) * (1 - smooth(12.6, 13.2, t)) + 0.02 * smooth(13.2, 15, t);
  z += 0.075 * Math.pow(smooth(6.3, 9.8, t), 1.6) * (1 - EIO(clamp((t - cues.hit) / 0.6)));
  if (t >= cues.hit && t < cues.hit + 0.5) z += 0.045 * Math.exp(-(t - cues.hit) * 8);
  return { z, dx, dy };
}
const GT = 512, GN = new Int8Array(GT * GT);
{ const r = rng(987654321); const a = new Float32Array(GT * GT); for (let i = 0; i < a.length; i++) a[i] = Math.sqrt(-2 * Math.log(r())) * Math.cos(2 * Math.PI * r());
  const b = new Float32Array(GT * GT); let ss = 0;
  for (let y = 0; y < GT; y++) for (let x = 0; x < GT; x++) { let v = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) v += a[((y + j) & (GT - 1)) * GT + ((x + i) & (GT - 1))] * (2 - Math.abs(i)) * (2 - Math.abs(j)); b[y * GT + x] = v; ss += v * v; }
  const k = 2.2 / Math.sqrt(ss / b.length); for (let i = 0; i < b.length; i++) GN[i] = Math.max(-6, Math.min(6, Math.round(b[i] * k))); }
function finish(f) {
  const img = ctx.getImageData(0, 0, W, H), d = img.data, ox = (f * 197) % GT, oy = (f * 331) % GT;
  for (let y = 0; y < H; y++) { const row = ((y + oy) & (GT - 1)) * GT; let i = y * W * 4;
    for (let x = 0; x < W; x++, i += 4) { const n = GN[row + ((x + ox) & (GT - 1))]; d[i] += n; d[i + 1] += n; d[i + 2] += n; } }
  ctx.putImageData(img, 0, 0);
}
const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.05); vig.addColorStop(0, 'rgba(20,10,5,0)'); vig.addColorStop(1, 'rgba(20,10,5,0.16)');

window.renderAt = async (t) => {
  t = clamp(t, 0, 14.999);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.letterSpacing = '0px';
  const K = camAt(t);
  ctx.setTransform(K.z, 0, 0, K.z, W / 2 * (1 - K.z) + K.dx, H / 2 * (1 - K.z) + K.dy);
  drawFields(t);
  if (t < cues.wipes.screen + 0.01) { const h = heroAt(t); drawHero(t, h); drawTag(t); }
  if (t < 1.1) { drawHookGavel(t); knock(t, cues.hook.tap, P0[0], P0[1] - 76, C.ink, 1, 3); }
  drawStrikeGavel(t); drawBurst(t); drawSeal(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  finish(Math.round(t * FPS));
};
await window.renderAt(0);
window.__ready = true;
