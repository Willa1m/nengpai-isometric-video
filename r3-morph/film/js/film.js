// film.js — 「一锤定音」 NENGPAI 能拍法服, 15 s shape-morph film. Every frame is a pure function of t (window.renderAt).
import opentype from '/node_modules/opentype.js/dist/opentype.module.js';
import {
  W, H, FPS, FR, clamp, lerp, smooth, deg, EM, EO, EIO, EI, EB, bez, backOut, spring, mixC, tone, rgba, rng,
  NB, circ, makeShape, morph, makeM, applyM, polyPath, centroid, bbox, area, shapeArea, scaleAbout, rotP, translate, lerpP, alignTo,
} from './core.js';
import { C, SH, buildShapes, gavelGeom, LOGO, GLY, loadGlyphs, digitShape } from './shapes.js';

const cues = await (await fetch('./cues.json')).json();
window.DEMO = { width: W, height: H, fps: FPS, duration: 15, motionBlur: { samples: 8, shutter: 0.5 } };
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
  const path = new Path2D(); polyPath(path, S.body.map(T)); for (const h of S.holes) if (h.on) polyPath(path, h.pts.map(T).reverse());
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = fill; ctx.fill(path, 'nonzero'); ctx.restore();
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
    const st = parts[2], sw = EIO(clamp((τ - 0.04) / 0.3));
    parts[2] = { ...st, pts: rotP(st.pts, (-80 + 120 * sw) * deg), a: 0.9 * Math.sin(Math.PI * clamp(0.15 + 0.85 * sw)) + 0.25 };
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
  if (t < MO[0].t0) {   // hook: grey dot → tapped → inflates to brand red
    const τ = t - tap;
    const r = τ < 0 ? 84 : lerp(84, 200, backOut(clamp(τ / 0.4), 2.0));
    const q = τ < 0 ? 0 : 0.30 * smooth(0, 0.03, τ) * Math.exp(-τ * 7.5) * Math.cos(2 * Math.PI * 2.3 * τ);
    const S = SH.circle, M = makeM(P0, 0, r / 200, Math.PI / 2, 1, q, [0, 200]);
    return { S, M, fill: C.grey, sweep: τ > 0 ? { to: C.red, p: EO(clamp((τ - 0.01) / 0.32)), radial: [0, -200] } : null, name: 'circle', anchorOK: false };
  }
  const m = MO.find((x) => t >= x.t0 && t < x.t1);
  if (m) {
    const u = (t - m.t0) / (m.t1 - m.t0), g = EM(u);
    const A = live(m.a, Math.min(t, m.t0)), B = live(m.b, Math.max(t, m.t1));
    const rad = m.a === 'circle' || m.a === 'circle2' ? 'A' : m.b === 'circle2' ? 'B' : null;
    const S = morph(A, B, u, { via: m.via, key: m.key, radial: rad, r: rad === 'A' ? (m.a === 'circle' ? 200 : 190) : 190, partShrink: m.via ? 0.85 : 0.42 });
    const lift = Math.sin(Math.PI * g), dx = (m.swing >= 0 ? 1 : -1) * 26 * lift;
    let pos = [P0[0] + dx, P0[1] - 46 * lift];
    let rot = lerp(ROT0[m.a] || 0, ROT0[m.b] || 0, g) + m.swing * lift;
    let k = 1 + m.sq * lift, sc = 1, q = anticQ(t, m.t0) + (m.via ? 0.12 * Math.sin(Math.PI * clamp((u - 0.4) / 0.2)) : 0);   // squash on the circle beat
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
  const path = new Path2D(); polyPath(path, body); for (const ho of h.S.holes) if (ho.on) polyPath(path, ho.pts.map(T).reverse());
  const [x0, y0, x1, y1] = bbox(body);
  const grad = (col) => { const g = ctx.createLinearGradient(x0, y0, x1 * 0.3 + x0 * 0.7, y1); const two = col === C.jade;
    g.addColorStop(0, two ? '#FFFDF8' : tone(col, 0.025)); g.addColorStop(1, two ? '#E4D5BC' : tone(col, -0.02)); return g; };
  // soft cast shadow (only reads on paper)
  ctx.save(); ctx.shadowColor = 'rgba(40,20,10,0.20)'; ctx.shadowBlur = 46; ctx.shadowOffsetY = 26; ctx.fillStyle = grad(h.fill); ctx.fill(path, 'nonzero'); ctx.restore();
  if (h.sweep && h.sweep.p > 0) {
    ctx.save(); ctx.clip(path, 'nonzero'); ctx.fillStyle = grad(h.sweep.to); ctx.beginPath();
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
  const w = 196, h2 = 82;
  const body = new Path2D(); body.moveTo(0, 0); body.lineTo(18, -h2 / 2); body.lineTo(w, -h2 / 2); body.arcTo(w + 8, -h2 / 2, w + 8, 0, 8); body.arcTo(w + 8, h2 / 2, w, h2 / 2, 8); body.lineTo(18, h2 / 2); body.closePath();
  ctx.fillStyle = final ? '#E8E0D3' : '#8D857B'; ctx.fill(body);
  ctx.fillStyle = final ? '#8D857B' : '#E8E0D3'; ctx.beginPath(); ctx.arc(16, 0, 5, 0, 2 * Math.PI); ctx.fill();
  const tc = final ? C.ink : '#FBF7F0';
  if (final) { ctx.fillStyle = C.rise; ctx.beginPath(); ctx.arc(44, 0, 8, 0, 2 * Math.PI); ctx.fill(); text(label, 62, 10, { font: `700 28px ${SANS}`, color: tc, ls: 2 }); }
  else { text('起拍价', 36, -6, { font: `700 27px ${SANS}`, color: tc, ls: 3 }); text(label, 36, 26, { font: `500 20px ${SANS}`, color: tc, ls: 2, alpha: 0.88 }); }
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

const HG_R = 240;
function hookGavel(t) {   // spins in (already moving on frame 0), taps the grey dot at 0.40, rebounds out
  const tap = cues.hook.tap, R = HG_R, contactY = P0[1] - 84, oy = contactY - (LOGO.band.yBot + LOGO.band.h) * R;
  const tgt = [P0[0] + 2, oy];
  if (t < tap) { const s = clamp((t + 0.08) / (tap + 0.08)), e = bez(0.45, 0, 0.85, 0.55)(s);
    const ctrl = [560, 60], p = [lerp(lerp(170, ctrl[0], e), lerp(ctrl[0], tgt[0], e), e), lerp(lerp(420, ctrl[1], e), lerp(ctrl[1], tgt[1], e), e)];
    return { x: p[0], y: p[1], rot: 1.7 * Math.PI * (1 - e), a: 1 }; }
  const τ = t - tap; if (τ > 0.62) return null;
  const e = bez(0.2, 0.55, 0.65, 1)(clamp(τ / 0.58));
  return { x: lerp(tgt[0], 1950, e), y: lerp(tgt[1], -420, e) - 80 * Math.sin(Math.PI * clamp(τ / 0.58)), rot: -1.4 * Math.PI * EI(clamp(τ / 0.58)) - 0.3 * Math.sin(Math.PI * clamp(τ / 0.12)), a: 1 };
}
function drawHookGavel(t) {
  if (t > cues.hook.tap + 0.62) return;
  smear(t, (ts) => { const g = hookGavel(ts); if (g) drawGavel(HG_R, g.x, g.y, g.rot, 1, [0.364 * HG_R, 0]); }, 6);
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
const BIDS = cues.bids, PR = cues.prices, P_START = 1000000, LASTB = BIDS.length - 1;
const priceAt = (j) => (j < 0 ? P_START : PR[j]);
const FS = 214, PITCH = FS * 0.98, CAPH = (0.5 * (GLY.capBot - GLY.capTop) * FS) / 1000;
const digitOf = (P, k) => Math.floor(P / 10 ** k) % 10;
// paddle bids: the first 6 bids arrive as red 出价 paddles that morph into the leading digit
const NPAD = 6;
function leadCol(j) { const a = priceAt(j - 1), b = priceAt(j); for (let k = 6; k >= 0; k--) if (digitOf(a, k) !== digitOf(b, k)) return k; return 0; }
function rollDur(j) { if (j === LASTB) return 0.16; return clamp((BIDS[j + 1] - BIDS[j]) * 0.8, 0.12, 0.42); }
// the last bid is driven by the gavel itself: its roll starts on the impact frame
function rollStart(j, k) { return j === LASTB ? BIDS[j] + 0.012 * k : BIDS[j] - rollDur(j) * 0.75 + 0.02 * k; }
function colPos(k, t, rollOnly = false) {
  let p = digitOf(P_START, k);
  for (let j = 0; j < BIDS.length; j++) {
    const a = priceAt(j - 1), b = priceAt(j), d = ((digitOf(b, k) - digitOf(a, k)) % 10 + 10) % 10; if (!d) continue;
    if (j < NPAD && k === leadCol(j)) { if (!rollOnly) p += t >= BIDS[j] ? d : 0; continue; }   // delivered by the paddle morph
    p += d * backOut(clamp((t - rollStart(j, k)) / rollDur(j)), 1.25);
  }
  return p;
}
function bidIndex(t) { let j = -1; for (let i = 0; i < BIDS.length; i++) if (t >= BIDS[i]) j = i; return j; }
function priceKick(t) { let v = 0; for (let j = 0; j < LASTB; j++) { const τ = t - BIDS[j]; if (τ > 0 && τ < 0.6) v += Math.exp(-τ * 9) * Math.sin(2 * Math.PI * 2.4 * τ); } return v; }
function priceLayout(fs) {   // ¥ d , d d d , d d d
  const cell = GLY.cell * fs, yen = GLY.d['¥'].adv * fs, com = GLY.d[','].adv * fs * 0.9, gap = 0.03 * fs;
  const slots = [{ t: '¥', w: yen + gap }]; for (let i = 6; i >= 0; i--) { slots.push({ t: 'd', k: i, w: cell }); if (i === 6 || i === 3) slots.push({ t: ',', w: com }); }
  const tot = slots.reduce((s, x) => s + x.w, 0); let x = -tot / 2; for (const s of slots) { s.cx = x + s.w / 2; x += s.w; }
  return { slots, tot };
}
const PL = priceLayout(FS);
const PRICE_Y = 600;   // cap centre
function screenRegion(t) {   // the capsule grows into the full-frame screen
  const t0 = cues.wipes.screen; if (t < t0) return null;
  const e1 = EB(clamp((t - t0) / 0.26)), e2 = EB(clamp((t - t0 - 0.06) / 0.34));
  if (e1 >= 1 && e2 >= 1) return 'full';
  const w = lerp(760, 2400, e1), h = lerp(192, 1500, e2), r = lerp(96, 0, e2);
  return { rr: [P0[0] - w / 2, P0[1] - h / 2, w, h, Math.min(r, h / 2)] };
}
function uiIn(t, i) { return EO(clamp((t - (cues.wipes.screen + 0.16 + 0.05 * i)) / 0.3)); }
function hud(fn) { ctx.save(); ctx.setTransform(1, 0, 0, 1, CAM.dx, CAM.dy); fn(); ctx.restore(); }   // HUD ignores the camera push: safe margins hold

const PAD_R = 46, PAD_START = [[250, 830], [1670, 300], [250, 300], [1670, 830], [640, 900], [1290, 250]];
function paddle(j) {   // pops in inside the safe area, then arcs into its column and lands on BIDS[j] as the new digit
  const lc = leadCol(j), slot = PL.slots.find((s) => s.t === 'd' && s.k === lc), st = PAD_START[j];
  const tgt = [P0[0] + slot.cx, PRICE_Y];
  return { lc, tgt, st, tPop: BIDS[j] - 0.62, tFly: BIDS[j] - 0.42, t1: BIDS[j], ctrl: [lerp(st[0], tgt[0], 0.45), Math.min(st[1], tgt[1]) - 190], ch: String(digitOf(priceAt(j), lc)) };
}
const _cS = makeShape(circ(0, 0, 60, NB), [], [], C.rise);
const _dS = {};
const dShape = (ch, fs) => _dS[ch + fs] || (_dS[ch + fs] = digitShape(ch, fs, C.rise));
function paddleHead(x, y, s, rot, label, stub) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  if (stub > 0) { ctx.globalAlpha *= stub; ctx.fillStyle = tone(C.rise, -0.12); ctx.beginPath(); ctx.roundRect(-8, PAD_R - 6, 16, 58, 7); ctx.fill(); ctx.globalAlpha /= stub; }
  ctx.fillStyle = C.rise; ctx.beginPath(); ctx.arc(0, 0, PAD_R, 0, 2 * Math.PI); ctx.fill();
  if (label > 0) text('出价', 0, 11, { font: `700 30px ${SANS}`, color: '#FFFFFF', align: 'center', ls: 2, alpha: label });
  ctx.restore();
}
function drawPaddle(t, j) {
  const P = paddle(j); if (t < P.tPop || t > P.t1 + 0.001) return;
  if (t < P.tFly) {   // pop in (back-out), a small bob
    const s = backOut(clamp((t - P.tPop) / 0.14), 2.4), bob = 6 * Math.sin(2 * Math.PI * (t - P.tPop) / 0.4);
    paddleHead(P.st[0], P.st[1] + bob, s, 0.12 * Math.sin(2 * Math.PI * (t - P.tPop) / 0.5), 1, 1); return;
  }
  const u = clamp((t - P.tFly) / (P.t1 - P.tFly)), e = bez(0.45, 0, 0.35, 1)(u);
  const qb = (s) => [lerp(lerp(P.st[0], P.ctrl[0], s), lerp(P.ctrl[0], P.tgt[0], s), s), lerp(lerp(P.st[1], P.ctrl[1], s), lerp(P.ctrl[1], P.tgt[1], s), s)];
  const pos = qb(e), p2 = qb(Math.min(1, e + 0.02)), p1 = qb(Math.max(0, e - 0.02));
  const phi = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]), speed = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const mu = clamp((u - 0.2) / 0.8);   // the last 10 frames: circle → digit (brief curve inside morph())
  if (mu <= 0) { paddleHead(pos[0], pos[1], 1, 0, 1, 1 - u / 0.2); return; }
  const S = morph(_cS, dShape(P.ch, FS), mu, { key: 'pad' + P.ch });
  const k = 1 + clamp(speed / 40, 0, 0.3) * Math.sin(Math.PI * mu);
  drawShapeAt(S, makeM(pos, 0, lerp(PAD_R / 60, 1, EO(mu)), phi, k, 0), C.rise);
  if (mu < 0.25) { ctx.save(); ctx.translate(pos[0], pos[1]); text('出价', 0, 11, { font: `700 30px ${SANS}`, color: '#FFFFFF', align: 'center', ls: 2, alpha: 1 - mu / 0.25 }); ctx.restore(); }
}
function drawSmallPaddle(t, j) {   // the frenzy: small paddles dive into the price
  const r = rng(j * 13 + 5), st = [[180, 300 + r() * 520], [1740, 260 + r() * 520], [420 + r() * 1080, 880]][j % 3];
  const t1 = BIDS[j], t0 = t1 - 0.3; if (t < t0 || t > t1) return;
  const pop = backOut(clamp((t - t0) / 0.08), 2), u = EI(clamp((t - t0 - 0.06) / (t1 - t0 - 0.06))), tgt = [P0[0] + (r() - 0.5) * 700, PRICE_Y - 40];
  const pos = [lerp(st[0], tgt[0], u), lerp(st[1], tgt[1], u)], rad = 24 * pop * (1 - 0.8 * u * u), phi = Math.atan2(tgt[1] - st[1], tgt[0] - st[0]);
  ctx.save(); ctx.translate(pos[0], pos[1]); ctx.rotate(phi); ctx.scale(1 + 0.6 * u, 1 / (1 + 0.6 * u)); ctx.fillStyle = C.rise; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
}

function viewersAt(t) { const e = Math.pow(clamp((t - 6.3) / (9.8 - 6.3)), 1.6); return Math.round(lerp(318420, 464870, e)); }
function bidsCountAt(t) { const j = bidIndex(t); const base = 386; if (j < 0) return base; const f = clamp((t - BIDS[j]) / 0.3);
  return Math.min(452, Math.round(lerp(base, 452, Math.min(1, (j + f) / LASTB) ** 1.15))); }
const fmt = (n) => n.toLocaleString('en-US');
function tabular(str, x, y, fs, color, weight = 600, align = 'left', alpha = 1) {   // fixed cells → no jitter
  ctx.save(); ctx.font = `${weight} ${fs}px ${LAT}`; ctx.fillStyle = color; ctx.globalAlpha *= alpha; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const cw = fs * 0.64, nw = fs * 0.3; const ws = [...str].map((c) => (/[0-9]/.test(c) ? cw : c === '+' ? fs * 0.62 : nw)); const tot = ws.reduce((a, b) => a + b, 0);
  let xx = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x; [...str].forEach((c, i) => { ctx.fillText(c, xx + ws[i] / 2, y); xx += ws[i]; });
  ctx.restore(); return tot;
}
function contactEnv(t) { const τ = qT(t) - cues.hit; return τ < 0 || τ > 0.8 ? 0 : Math.exp(-τ * 11) * Math.cos(2 * Math.PI * 2.6 * τ); }
function priceXf(kick, t) {   // price transform: bid kicks + the gavel's contact squash (pivot on the baseline)
  const c = contactEnv(t), sx = (1 + 0.03 * kick) * (1 + 0.08 * c), sy = (1 + 0.03 * kick) * (1 - 0.15 * c);
  ctx.translate(P0[0], PRICE_Y - 14 * kick + CAPH); ctx.scale(sx, sy); ctx.translate(0, -CAPH);
}

function drawScreen(t) {
  const tq = qT(t), hitT = cues.hit, frozen = tq >= hitT, stampOn = smooth(cues.stamp - 0.05, cues.stamp + 0.03, tq);
  // ambient: a warm red glow behind the price that heats up with the bidding
  const heat = smooth(6.3, 9.7, t) * (t < hitT ? 1 : 1 - smooth(hitT + 0.3, hitT + 0.9, t));
  { const g = ctx.createRadialGradient(P0[0], PRICE_Y, 50, P0[0], PRICE_Y, 900); g.addColorStop(0, rgba('#7A1414', 0.15 + 0.5 * heat)); g.addColorStop(1, rgba('#7A1414', 0)); ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400); }
  ctx.save(); ctx.globalAlpha = 0.035; ctx.fillStyle = '#FFFFFF'; for (let y = -100; y < H + 100; y += 4) ctx.fillRect(-200, y, W + 400, 1); ctx.restore();
  const tt = t, j = bidIndex(tq);
  // top bar (screen space, 6 % margins)
  const a0 = uiIn(t, 0);
  if (a0 > 0) hud(() => {
    ctx.translate(0, (1 - a0) * -20); ctx.globalAlpha = a0;
    const pulse = 0.55 + 0.45 * Math.cos(2 * Math.PI * (t - 6.3) / 0.6);
    ctx.fillStyle = C.rise; ctx.globalAlpha = a0 * (frozen ? 1 : pulse); ctx.beginPath(); ctx.arc(132, 108, 9, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = a0;
    text(frozen ? '竞价结束' : '直播竞价中', 156, 119, { font: `700 30px ${SANS}`, color: C.paper, ls: 4 });
    if (!frozen) text('LIVE', 156 + measure('直播竞价中', `700 30px ${SANS}`, 4) + 18, 118, { font: `700 20px ${LAT}`, color: C.rise, ls: 3 });
    text('金额为示意', W - 125, 117, { font: `500 22px ${SANS}`, color: C.paper, align: 'right', ls: 3, alpha: 0.5 });
  });
  // label above the price: 起拍价 → 当前价 → 成交价
  const a1 = uiIn(t, 1);
  if (a1 > 0) { const lab = frozen ? '成交价' : j < 0 ? '起拍价' : '当前价';
    text(lab, P0[0], PRICE_Y - CAPH - 64 + (1 - a1) * 20, { font: `${frozen ? 700 : 500} 30px ${SANS}`, color: frozen ? C.gold : C.paper, align: 'center', ls: 10, alpha: (frozen ? 0.95 : 0.6) * a1 * (1 - stampOn) }); }
  // the price odometer, drawn on its own layer and masked to a window with feathered top/bottom edges
  const kick = priceKick(t), dim = 1 - 0.62 * stampOn;
  const main = ctx; ctx = OCTX; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.setTransform(main.getTransform()); ctx.globalAlpha = 1;
  ctx.save(); priceXf(kick, t);
  const colsIn = (i) => EO(clamp((t - (cues.wipes.screen + 0.12 + 0.035 * i)) / 0.32));
  const statics = [];
  PL.slots.forEach((s, i) => {
    const ai = colsIn(i); if (ai <= 0) return; const dy = (1 - ai) * 90;
    if (s.t !== 'd') { statics.push([s, dy, ai]); return; }
    ctx.save(); ctx.globalAlpha = ai;
    const k = s.k, p = colPos(k, tt), v = (colPos(k, tt + 0.004, true) - colPos(k, tt - 0.004, true)) / 0.008;
    const i0 = Math.floor(p + 1e-6), f = p - i0, blur = Math.min(46, 0.5 * Math.abs(v) * PITCH * SHUT);
    let jP = -1; for (let b = 0; b < NPAD; b++) if (leadCol(b) === k && tt > BIDS[b] - 0.14 && tt < BIDS[b]) jP = b;
    if (jP >= 0) { const sq = EI(clamp((tt - (BIDS[jP] - 0.14)) / 0.12)); glyph(String(((i0 % 10) + 10) % 10), s.cx, dy - 40 * sq, FS, C.rise, 1 - 0.5 * sq, 1 - sq, 1 - sq); }
    else {
      const n = blur > 2 ? Math.min(20, Math.ceil(blur / 2.5)) : 1;
      let land = 0; for (let b = 0; b < NPAD; b++) if (leadCol(b) === k) land += impactQ(tt, BIDS[b] + 2 * FR, 0.16);
      for (let c = 0; c < n; c++) {
        const off = n > 1 ? ((c + 0.5) / n - 0.5) * blur : 0, al = n > 1 ? 1 - Math.pow(0.1, 1 / n) : 1;
        const d0 = ((i0 % 10) + 10) % 10, d1 = (d0 + 1) % 10;
        glyph(String(d0), s.cx, dy - f * PITCH + off, FS, C.rise, 1 + land, 1 - land, al);
        if (f > 0.001) glyph(String(d1), s.cx, dy + (1 - f) * PITCH + off, FS, C.rise, 1, 1, al);
      }
    }
    ctx.restore();
  });
  { const WIN = CAPH + 34, FE = 30;
    ctx.globalCompositeOperation = 'destination-in'; const g = ctx.createLinearGradient(0, -WIN, 0, WIN);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(FE / (2 * WIN), '#000'); g.addColorStop(1 - FE / (2 * WIN), '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(-W, -WIN, 2 * W, 2 * WIN); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  ctx = main; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = dim; ctx.drawImage(OCV, 0, 0); ctx.restore();
  ctx.save(); ctx.globalAlpha = dim; priceXf(kick, t); for (const [s, dy, ai] of statics) glyph(s.t, s.cx, dy, FS, C.rise, 1, 1, ai); ctx.restore();
  // ▲ + premium tag (jumps to +118 % on the impact frame, then drops under the seal as a solid pill)
  const a3 = uiIn(t, 3);
  if (a3 > 0) {
    const prem = Math.round((priceAt(j) / P_START - 1) * 100);
    const big = frozen ? backOut(clamp((t - hitT) / 0.22), 2.0) : 0;
    const tagKick = j >= 0 && !frozen ? Math.exp(-(t - BIDS[j]) * 12) : 0;
    const s = 1 + 0.12 * tagKick + 0.3 * big, y = lerp(PRICE_Y + CAPH + 100, 938, EO(clamp((t - cues.stamp + 0.12) / 0.3)));
    const str = j < 0 ? '溢价 +0%' : `溢价 +${prem}%`;
    ctx.save(); ctx.translate(P0[0], y); ctx.scale(s, s); ctx.globalAlpha = a3;
    const w = measure(str, `700 36px ${SANS}`, 2) + 78, h = 62;
    ctx.fillStyle = big > 0 ? mixC('#3A1714', C.rise, clamp(big)) : '#3A1714'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    const tri = (cx, cy, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.95, cy + r * 0.65); ctx.lineTo(cx - r * 0.95, cy + r * 0.65); ctx.closePath(); ctx.fill(); };
    tri(-w / 2 + 36, -2 - 4 * tagKick, 13 * (1 + 0.4 * tagKick), big > 0.5 ? C.paper : C.rise);
    text(str, -w / 2 + 60, 13, { font: `700 36px ${SANS}`, color: big > 0.5 ? C.paper : C.rise, ls: 2 });
    ctx.restore();
  }
  // rising ▲ particles + a ring pulsing out of the price on every bid (the circle keeps speaking)
  for (let b = 0; b < BIDS.length; b++) { const τ = tt - BIDS[b]; if (τ < 0 || τ > 0.7) continue; const r = rng(b * 17 + 1);
    const x = P0[0] + PL.tot / 2 + 30 + r() * 60, y = PRICE_Y - 60 - 160 * EO(τ / 0.7), s = 12 + 8 * r();
    ctx.save(); ctx.globalAlpha = (1 - τ / 0.7) * 0.9 * dim; ctx.fillStyle = C.rise; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.7); ctx.lineTo(x - s, y + s * 0.7); ctx.closePath(); ctx.fill(); ctx.restore(); }
  for (let b = 0; b < LASTB; b++) { const τ = tt - BIDS[b]; if (τ < 0 || τ > 0.45) continue; const slot = PL.slots.find((s) => s.t === 'd' && s.k === leadCol(b));
    const e = EO(τ / 0.45); ctx.save(); ctx.strokeStyle = C.rise; ctx.globalAlpha = 0.55 * (1 - τ / 0.45); ctx.lineWidth = 6 * (1 - e) + 1;
    ctx.beginPath(); ctx.arc(P0[0] + slot.cx, PRICE_Y, 90 + 260 * e, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }
  // bottom counters (screen space)
  const a4 = uiIn(t, 4);
  if (a4 > 0) hud(() => {
    ctx.globalAlpha = a4; ctx.translate(0, (1 - a4) * 24);
    const y = 975;
    ctx.strokeStyle = rgba(C.paper, 0.14); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(125, y - 66); ctx.lineTo(W - 125, y - 66); ctx.stroke();
    text('围观', 125, y, { font: `500 28px ${SANS}`, color: C.paper, ls: 4, alpha: 0.6 });
    tabular(frozen ? '465,000+' : fmt(viewersAt(t)), 207, y + 2, 44, C.paper, 600);
    text('次', W - 125, y, { font: `500 28px ${SANS}`, color: C.paper, align: 'right', alpha: 0.6 });
    tabular(String(frozen ? 452 : bidsCountAt(tq)), W - 165, y + 2, 44, C.paper, 600, 'right');
    text('出价', W - 165 - 3 * 44 * 0.64 - 18, y, { font: `500 28px ${SANS}`, color: C.paper, align: 'right', ls: 4, alpha: 0.6 });
  });
  if (!frozen) { for (let b = 0; b < NPAD; b++) drawPaddle(t, b); for (let b = NPAD; b < LASTB; b++) drawSmallPaddle(t, b); }
}

// ---------------------------------------------------------------- the hit: gavel strike, burst, 成交 seal
const SG = { R: 340 };
SG.ox = P0[0] - 30; SG.oy = PRICE_Y - CAPH - (LOGO.band.yBot + LOGO.band.h) * SG.R;
SG.piv = [SG.R * 1.0, 0];
function strikeRot(t) {   // rotation about the hand (handle end)
  const { gavelRise: r0, gavelHold: h0, gavelSwing: s0, hit } = cues;
  if (t < 9.40) return null;
  if (t < r0) return { rot: 20 * deg, enter: EO(clamp((t - 9.40) / 0.34)) };
  if (t < h0) return { rot: lerp(20, 30, EO((t - r0) / (h0 - r0))) * deg, enter: 1 };
  if (t < s0) return { rot: 30 * deg, enter: 1, tr: Math.round((t - h0) * FPS) % 2 ? 2 : -2 };   // the hold: a 2 px tremble
  if (t < hit) return { rot: lerp(30, 0, EI((t - s0) / (hit - s0))) * deg, enter: 1 };
  const τ = t - hit;
  if (τ < 0.12) return { rot: 6 * deg * Math.sin(Math.PI * clamp(τ / 0.12)), enter: 1 };
  const x = EI(clamp((τ - 0.12) / 0.2)); return { rot: 55 * deg * x, enter: 1, exit: x };
}
function drawStrikeGavel(t) {
  if (t < 9.40 || t > cues.hit + 0.34) return;
  smear(t, (ts) => { const s = strikeRot(ts); if (!s) return;
    const dx = (1 - s.enter) * 600 + (s.exit || 0) * 520 + (s.tr || 0), dy = (1 - s.enter) * -450 + (s.exit || 0) * -760;
    drawGavel(SG.R, SG.ox + dx, SG.oy + dy, s.rot, 1, SG.piv); }, 8);
}
function drawBurst(t) {
  const τ = t - cues.hit; if (τ < 0 || τ > 0.6) return;
  const o = [SG.ox, PRICE_Y - CAPH];
  if (τ < 2 * FR) { ctx.save(); ctx.fillStyle = rgba(C.red, 0.35); ctx.fillRect(-200, -200, W + 400, H + 400); ctx.restore(); }
  { const e = EO(clamp(τ / 0.5)); ctx.save(); ctx.strokeStyle = C.gold; ctx.globalAlpha = 1 - clamp(τ / 0.5); ctx.lineWidth = 22 * (1 - e) + 1.5;
    ctx.beginPath(); ctx.arc(o[0], o[1], 40 + 1000 * e, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }
  ctx.save(); ctx.strokeStyle = C.gold; ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) { const r = rng(i * 11 + 3), a = (-180 + (i + 0.5) * (180 / 16) + (r() - 0.5) * 6) * deg;
    const len = 160 + 220 * r(), r0 = 120 + 520 * EO(clamp(τ / 0.45)) * (0.7 + 0.3 * r()), r1 = r0 + len * (1 - EO(clamp(τ / 0.5)));
    if (r1 - r0 < 2) continue; ctx.lineWidth = 7 * (1 - τ / 0.6) + 1; ctx.beginPath(); ctx.moveTo(o[0] + Math.cos(a) * r0, o[1] + Math.sin(a) * r0); ctx.lineTo(o[0] + Math.cos(a) * r1, o[1] + Math.sin(a) * r1); ctx.stroke(); }
  for (let i = 0; i < 14; i++) { const r = rng(i * 23 + 9), a = (-170 + 160 * r()) * deg, v = 900 + 700 * r();
    const P = (q) => [o[0] + Math.cos(a) * v * q, o[1] + Math.sin(a) * v * q + 1400 * q * q], pa = P(Math.max(0, τ - SHUT / 2)), pb = P(τ + SHUT / 2), rr = 6 + 5 * r();
    ctx.globalAlpha = (1 - τ / 0.6) * Math.min(1, (2.2 * rr) / (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) + 2 * rr)); ctx.lineWidth = 2 * rr;
    ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke(); }
  ctx.restore();
  if (τ < 3 * FR) { ctx.save(); const g = ctx.createRadialGradient(o[0], o[1], 0, o[0], o[1], 900); const a = 0.55 * (1 - τ / (3 * FR));
    g.addColorStop(0, rgba('#FFF1C8', a)); g.addColorStop(0.35, rgba('#FFD46A', a * 0.35)); g.addColorStop(1, rgba('#FFD46A', 0)); ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400); ctx.restore(); }
}
// 成交 seal: pre-rendered once with an eroded ink edge, then slammed centre-screen over the dimmed price
const SEAL = { R: 262, cx: 960, cy: 585, rot: -8 * deg };
const sealCanvas = (() => {
  const R = SEAL.R, K = R / 168, S = 2 * R + 60, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const m = S / 2;
  g.fillStyle = C.rise; g.strokeStyle = C.rise;
  g.lineWidth = 15 * K; g.beginPath(); g.arc(m, m, R - 8 * K, 0, 2 * Math.PI); g.stroke();
  g.lineWidth = 4 * K; g.beginPath(); g.arc(m, m, R - 30 * K, 0, 2 * Math.PI); g.stroke();
  g.font = `900 ${Math.round(132 * K)}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = `${Math.round(6 * K)}px`; g.fillText('成交', m + 3 * K, m - 6 * K);
  g.font = `700 ${Math.round(21 * K)}px ${LAT}`; g.letterSpacing = `${Math.round(7 * K)}px`; g.fillText('NENGPAI', m + 3 * K, m + 92 * K);
  g.font = `700 ${Math.round(20 * K)}px ${SANS}`; g.letterSpacing = `${Math.round(6 * K)}px`; g.fillText('一锤定音', m + 3 * K, m - 95 * K);
  const r = rng(4242); g.globalCompositeOperation = 'destination-out';   // ink texture: speckled erosion + rough edge + dry streaks
  for (let i = 0; i < 6000; i++) { const a = r() * 2 * Math.PI, rr = Math.sqrt(r()) * R, x = m + Math.cos(a) * rr, y = m + Math.sin(a) * rr; g.globalAlpha = 0.25 + 0.6 * r(); g.beginPath(); g.arc(x, y, (0.6 + 2.2 * r() * r()) * K, 0, 2 * Math.PI); g.fill(); }
  for (let i = 0; i < 520; i++) { const a = r() * 2 * Math.PI, rr = R - 1 + r() * 3 * K, x = m + Math.cos(a) * rr, y = m + Math.sin(a) * rr; g.globalAlpha = 0.9; g.beginPath(); g.arc(x, y, (1.5 + 3 * r()) * K, 0, 2 * Math.PI); g.fill(); }
  for (let i = 0; i < 70; i++) { const x = m + (r() - 0.5) * 2 * R, y = m + (r() - 0.5) * 2 * R; g.globalAlpha = 0.35; g.save(); g.translate(x, y); g.rotate(r() * Math.PI); g.fillRect(-30 * K * r(), -1, 60 * K * r(), (2 + 2 * r()) * K); g.restore(); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  return c;
})();
function drawSeal(t) {
  const t0 = cues.stamp, D = 4 * FR; if (t < t0 - D) return;
  const ir = irisAt(t); if (ir && ir.r > SEAL.R * 3.5) return;
  const τ = t - t0; let s, a, rot;
  if (τ < 0) { const e = EI(clamp((τ + D) / D)); s = lerp(1.6, 1.0, e); a = clamp(e * 1.6); rot = SEAL.rot - 7 * deg * (1 - e); }
  else { s = 1 - 0.06 * Math.exp(-τ * 12) * Math.cos(2 * Math.PI * 3 * τ); a = 1; rot = SEAL.rot; }
  let grow = 1, fade = 1; if (ir) { grow = ir.r / SEAL.R; fade = 1 - smooth(1.0, 1.8, grow); }
  ctx.save(); ctx.translate(SEAL.cx, SEAL.cy); ctx.rotate(rot); ctx.scale(s * grow, s * grow); ctx.globalAlpha = a * fade;
  if (!ir) { ctx.save(); ctx.globalAlpha = a * 0.72; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, SEAL.R - 6, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }   // ink backing: the dimmed digits never read through the seal
  ctx.drawImage(sealCanvas, -sealCanvas.width / 2, -sealCanvas.height / 2); ctx.restore();
}

// ---------------------------------------------------------------- iris to paper (the seal's circle opens), proof figures
const FARC = (o) => Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map((c) => Math.hypot(c[0] - o[0], c[1] - o[1]))) + 80;
function irisAt(t) { const t0 = cues.wipes.paper; if (t < t0) return null;
  const e = EB(clamp((t - t0) / 0.55)); return { r: lerp(SEAL.R - 8, FARC([SEAL.cx, SEAL.cy]), e), e, full: e >= 1 }; }
const FIG = [
  { x: 400, seq: [['1', '2', '3', '4'], ['0'], ['0']], pre: '近', suf: '家', desc: '法院' },
  { x: 960, seq: [['1', '2'], ['0']], pre: '覆盖', suf: '余个', desc: '省市区' },
  { x: 1520, seq: [['3', '6', '8', '9', '9'], ['0', '0', '0', '0', '2']], pre: '', suf: '', pct: true, desc: '直播拍卖成交率' },
];
const FFS = 178, FY = 455, FCAP = (0.5 * (GLY.capBot - GLY.capTop) * FFS) / 1000, STEPS = [0.22, 0.11, 0.11, 0.13, 0.18], FUNIT = `700 42px ${SANS}`;
const _circ40 = makeShape(circ(0, 0, 70, NB), [], [], C.rise);
function figGeom(f) {   // the whole group (prefix + number + unit) is centred on the column axis
  const cell = GLY.cell * FFS, n = f.seq.length, pctW = f.pct ? GLY.d['%'].adv * FFS * 0.62 + 6 : 0, numW = n * cell + pctW;
  const preW = f.pre ? measure(f.pre, FUNIT) + 14 : 0, sufW = f.suf ? measure(f.suf, FUNIT) + 14 : 0, tot = preW + numW + sufW;
  const x0 = f.x - tot / 2 + preW; return { cell, n, w: n * cell, numW, x0 };
}
const GIDX = []; FIG.forEach((f, fi) => f.seq.forEach((_, ci) => GIDX.push([fi, ci])));
const gidx = (fi, ci) => GIDX.findIndex((q) => q[0] === fi && q[1] === ci);
const flyStart = (fi, ci) => cues.converge + 0.12 + 0.03 * gidx(fi, ci), FLYD = 0.28;
function figDigitAt(f, ci, t, tf) {
  const seq = f.seq[ci], tland = tf + 0.04 * ci;
  if (t < tland - STEPS[0]) return null;
  if (t < tland) { const u = (t - (tland - STEPS[0])) / STEPS[0]; return { S: morph(_circ40, dShape(seq[0], FFS), u, { key: 'fc' + seq[0] + FFS, radial: 'A', r: 70 }), stage: 0, u }; }
  let tt = tland; for (let i = 1; i < seq.length; i++) { const d = STEPS[i] || 0.2; if (t < tt + d) { const u = (t - tt) / d;
      if (seq[i] === seq[i - 1]) return { S: dShape(seq[i], FFS), stage: i, u: 1 };
      return { S: morph(dShape(seq[i - 1], FFS), dShape(seq[i], FFS), u, { key: 'dd' + seq[i - 1] + seq[i] + FFS }), stage: i, u }; } tt += d; }
  return { S: dShape(seq[seq.length - 1], FFS), stage: seq.length, u: 1 };
}
function figEnd(f) { const tf = cues.figures[FIG.indexOf(f)]; let tt = tf + 0.04 * (f.seq.length - 1); for (let i = 1; i < f.seq[0].length; i++) tt += STEPS[i] || 0.2; return tt; }
const tri = (cx, cy, s, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 0.95, cy + s * 0.65); ctx.lineTo(cx - s * 0.95, cy + s * 0.65); ctx.closePath(); ctx.fill(); };
function drawFigures(t) {
  const conv = cues.converge;
  FIG.forEach((f, fi) => {
    const tf = cues.figures[fi], G = figGeom(f), tl = tf - STEPS[0], tfly = tl - 0.34;
    if (t < tfly) return;
    if (t < tl) {   // one circle flies out of the seal's centre on an arc and divides into one circle per digit
      const u = clamp((t - tfly) / 0.34), e = EO(u), dst = [G.x0 + G.w / 2, FY];
      const ctrl = [lerp(SEAL.cx, dst[0], 0.5), Math.min(SEAL.cy, dst[1]) - 220];
      const pos = [lerp(lerp(SEAL.cx, ctrl[0], e), lerp(ctrl[0], dst[0], e), e), lerp(lerp(SEAL.cy, ctrl[1], e), lerp(ctrl[1], dst[1], e), e)];
      const r = lerp(30, 38.5, e), split = smooth(0.55, 1, u), st = 0.25 * (1 - split) * Math.sin(Math.PI * u);
      for (let ci = 0; ci < G.n; ci++) { const cx = lerp(pos[0], G.x0 + G.cell * (ci + 0.5), split);
        ctx.save(); ctx.fillStyle = C.rise; ctx.beginPath(); ctx.ellipse(cx, pos[1], r * (1 + st), r / (1 + st), 0, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }
      return;
    }
    const toCirc = clamp((t - conv) / 0.12);
    for (let ci = 0; ci < G.n; ci++) {
      if (t >= flyStart(fi, ci)) continue;
      const d = figDigitAt(f, ci, t, tf); if (!d) continue;
      let S = d.S, sc = d.stage === 0 ? lerp(0.55, 1, EO(d.u)) : 1;
      if (toCirc > 0) { const last = f.seq[ci][f.seq[ci].length - 1]; S = morph(dShape(last, FFS), _circ40, toCirc, { key: 'dc' + last + FFS, radial: 'B', r: 70 }); sc = lerp(1, 0.55, EO(toCirc)); }
      const M = makeM([G.x0 + G.cell * (ci + 0.5), FY], 0, sc, Math.PI / 2, 1, impactQ(t, tf + 0.04 * ci, 0.14), [0, FCAP]);
      drawShapeAt(S, M, C.rise);
    }
    const ta = figEnd(f), hide = 1 - smooth(conv - 0.04, conv + 0.08, t), base = FY + FCAP;
    if (f.pct) { const ps = backOut(clamp((t - tf + 0.06) / 0.22), 1.8) * hide; if (ps > 0) { ctx.save(); ctx.translate(G.x0 + G.w + 6 + GLY.d['%'].adv * FFS * 0.31, base); ctx.scale(ps, ps); glyph('%', 0, -FCAP * 0.62, FFS * 0.62, C.rise); ctx.restore(); } }
    const ptri = backOut(clamp((t - ta) / 0.2), 2.4) * hide;   // ▲ pinned 12 px off the number's top-right
    if (ptri > 0) { const s = 15 * ptri; ctx.save(); tri(G.x0 + G.numW + 12 + 15, FY - FCAP + 15, s, C.rise); ctx.restore(); }
    const pt = clamp((t - tf - 0.05) / 0.3);
    ctx.save(); ctx.globalAlpha = hide;
    if (f.pre) reveal(f.pre, G.x0 - 14, base, { font: FUNIT, color: C.ink, align: 'right' }, pt, 60);
    if (f.suf) reveal(f.suf, G.x0 + G.numW + 14, base, { font: FUNIT, color: C.ink }, pt, 60);
    reveal(f.desc, f.x, base + 100, { font: `700 40px ${SANS}`, color: C.ink, align: 'center', ls: 8, alpha: 0.85 }, clamp((t - ta + 0.08) / 0.32), 64);
    ctx.restore();
  });
}

// ---------------------------------------------------------------- end frame: converge into ONE circle, gavel lands → the logo
const LG = { cx: 627, cy: 470, R: 158 };
function convergeCircles(t) {   // each figure digit (now a circle) flies into the logo centre
  const out = [];
  FIG.forEach((f, fi) => { const G = figGeom(f); for (let ci = 0; ci < G.n; ci++) {
    const t0 = flyStart(fi, ci), u = clamp((t - t0) / FLYD); if (t < t0 || u >= 1) continue;
    const s = [G.x0 + G.cell * (ci + 0.5), FY], e = EI(u) * 0.6 + EIO(u) * 0.4, ctrl = [lerp(s[0], LG.cx, 0.5), Math.min(s[1], LG.cy) - 160 - 60 * ci];
    const p = [lerp(lerp(s[0], ctrl[0], e), lerp(ctrl[0], LG.cx, e), e), lerp(lerp(s[1], ctrl[1], e), lerp(ctrl[1], LG.cy, e), e)];
    out.push({ p, r: 38.5 * (1 - 0.3 * e), col: mixC(C.rise, C.red, e), u }); } });
  return out;
}
function logoR(t) {   // the logo circle grows as the circles merge in, with a pulse per arrival
  let n = 0, pulse = 0; const tot = GIDX.length;
  GIDX.forEach(([fi, ci]) => { const ta = flyStart(fi, ci) + FLYD; if (t >= ta) { n++; pulse += spring(t - ta, 3, 9); } });
  const base = n === 0 ? 0 : LG.R * Math.sqrt(n / tot);
  return { r: n === 0 ? 0 : base * (1 + 0.06 * pulse), n };
}
function drawEnd(t) {
  if (t < cues.converge) return;
  const tl = cues.logoLand, tot = GIDX.length;
  for (const c of convergeCircles(t)) { ctx.save(); ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(c.p[0], c.p[1], c.r, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); }
  const L = logoR(t); if (L.r <= 0) return;
  const τ = t - tl, q = τ > -2 * FR ? 0.10 * Math.sin((2 * Math.PI * (τ + 2 * FR)) / 0.28) * Math.exp(-(τ + 2 * FR) * 8) : 0;
  const breathe = t > tl + 0.4 ? 0.004 * Math.sin((2 * Math.PI * (t - tl)) / 1.2) : 0;
  const R = L.r * (1 + breathe);
  ctx.save(); ctx.translate(LG.cx, LG.cy + R); ctx.scale(1 + q, 1 - q); ctx.translate(0, -R);
  ctx.shadowColor = 'rgba(60,20,10,0.16)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
  const g = ctx.createLinearGradient(0, -R, 0, R); g.addColorStop(0, tone(C.red, 0.015)); g.addColorStop(1, tone(C.red, -0.012));
  ctx.fillStyle = L.n < tot ? mixC(C.rise, C.red, L.n / tot) : g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
  const ge = tl - 0.36;   // the gavel spins in and lands into its place on the beat
  if (t >= ge) {
    const sh = t > cues.shine ? clamp((t - cues.shine) / 0.55) : -1;
    smear(t, (ts) => {
      const u = clamp((ts - ge) / 0.36), e = EI(u);
      const x = lerp(LG.cx + 520, LG.cx, e), y = lerp(LG.cy - 420, LG.cy, 1 - Math.pow(1 - e, 1.4));
      const rot = lerp(-1.1 * Math.PI, 0, EO(u * 0.8 + 0.2 * e));
      const rb = ts > tl ? -4 * deg * Math.sin(Math.PI * clamp((ts - tl) / 0.18)) * Math.exp(-(ts - tl) * 4) : 0;
      ctx.save(); ctx.translate(LG.cx, LG.cy + R); ctx.scale(1 + q, 1 - q); ctx.translate(-LG.cx, -LG.cy - R);
      if (u >= 1) { ctx.beginPath(); ctx.arc(LG.cx, LG.cy, R * 1.0005, 0, 2 * Math.PI); ctx.clip(); }
      drawGavel(LG.R, x, y, rot + rb, 1, [0, 0], sh); ctx.restore(); }, 6);
  }
  knock(t, tl, LG.cx + 180, LG.cy - 80, C.gold, 0.8, 3);
}
function drawTitle(t) {
  const t0 = cues.title; if (t < t0) return;
  const x = 865;
  [...'能拍法服'].forEach((ch, i) => reveal(ch, x + i * 150, 512, { font: `900 136px ${SERIF}`, color: C.ink }, clamp((t - t0 - 0.04 * i) / 0.3), 150));
  reveal('NENGPAI · 综合司法辅助服务', x + 4, 590, { font: `500 26px ${SANS}`, color: C.ink, ls: 6, alpha: 0.62 }, clamp((t - t0 - 0.15) / 0.32), 40);
  const pr = EO(clamp((t - t0 - 0.2) / 0.45)); if (pr > 0) { ctx.fillStyle = C.gold; ctx.fillRect(960 - 60 * pr, 676, 120 * pr, 4); }
  reveal('让司法更高效 · 焕资产新价值', 960, 768, { font: `600 48px ${SERIF}`, color: C.red, align: 'center', ls: 10 }, clamp((t - t0 - 0.24) / 0.36), 70);
}
function drawParticles(t) {   // faint rising digits / ▲ behind the end frame
  const a = smooth(cues.logoLand, cues.logoLand + 0.6, t); if (a <= 0) return;
  const r = rng(77); ctx.save();
  for (let i = 0; i < 28; i++) { const x = 60 + r() * 1800, sp = 26 + 30 * r(), ph = r(), ch = '0123456789▲'[Math.floor(r() * 11)], s = 18 + 16 * r();
    const y = 1100 - ((ph * 1200 + sp * (t - 13)) % 1200); if (y > 280 && y < 830 && x > 430 && x < 1530) continue;
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
let CAM = { z: 1, dx: 0, dy: 0 };
const HIT_SHAKE = [[18, -10], [-12, 8], [8, -5], [-3, 2]];
function camAt(t) {
  t = qT(t);   // camera shake/punch stays constant within a frame (no doubled frames under motion blur)
  let dx = 0, dy = 0, z = 1;
  const shakes = [[cues.hook.tap, 7, 0.2], [LAND.gavel, 5, 0.17], [cues.stamp, 8, 0.1], [cues.logoLand, 3, 0.14]];
  { const f = Math.round((t - cues.hit) * FPS); if (f >= 0 && f < 4) { dx += HIT_SHAKE[f][0]; dy += HIT_SHAKE[f][1]; } }
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
  const K = camAt(t); CAM = K;
  ctx.setTransform(K.z, 0, 0, K.z, W / 2 * (1 - K.z) + K.dx, H / 2 * (1 - K.z) + K.dy);
  drawFields(t);
  if (t < cues.wipes.screen + 0.01) { const h = heroAt(t); drawHero(t, h); drawTag(t); }
  if (t < 1.1) { drawHookGavel(t); knock(t, cues.hook.tap, P0[0], P0[1] - 92, C.ink, 1.2, 3); }
  drawStrikeGavel(t); drawBurst(t); drawSeal(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  finish(Math.round(t * FPS));
};
await window.renderAt(0);
window.__ready = true;
