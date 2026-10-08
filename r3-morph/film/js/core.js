// core.js — math, easing, colour and the morph engine (flubber-style: equal arc-length resampling + best first-vertex
// rotation, A → circle → B via an intermediate, sub-parts and holes that collapse to / bloom from points).
export const W = 1920, H = 1080, FPS = 30, FR = 1 / FPS;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const deg = Math.PI / 180;
export function bez(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 40; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-7) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t); };
}
export const EM = bez(0.7, 0, 0.3, 1);     // the brief's morph curve: fastest mid-way, ~3 frames of cushion each end
export const EO = bez(0.16, 1, 0.3, 1);    // expo-out
export const EIO = bez(0.45, 0, 0.55, 1);
export const EI = bez(0.6, 0, 0.9, 0.4);   // ease-in (anticipation, falls)
export const EB = bez(0.42, 0, 0.12, 1);   // field bloom
export const backOut = (x, s = 1.70158) => { x = clamp(x); const y = x - 1; return 1 + y * y * ((s + 1) * y + s); };
export const spring = (τ, f = 2.2, z = 6) => (τ <= 0 ? 0 : Math.sin(2 * Math.PI * f * τ) * Math.exp(-z * τ));   // decaying oscillation, starts at 0

// ---------------------------------------------------------------- colour (OKLab mixes, no muddy midpoints)
export const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const _ok = {};
export function oklab(h) { if (_ok[h]) return _ok[h]; const [r, g, b] = hexRgb(h).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return (_ok[h] = [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]); }
export function fromOklab([L, a, b]) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return '#' + [r, g, bb].map((c) => Math.round(clamp(toSrgb(clamp(c))) * 255).toString(16).padStart(2, '0')).join(''); }
export const mixC = (h1, h2, t) => (t <= 0 ? h1 : t >= 1 ? h2 : fromOklab(oklab(h1).map((v, i) => lerp(v, oklab(h2)[i], t))));
export const tone = (h, dL) => { const A = oklab(h).slice(); A[0] += dL; return fromOklab(A); };
export const rgba = (h, a) => { const [r, g, b] = hexRgb(h).map((v) => Math.round(v * 255)); return `rgba(${r},${g},${b},${a})`; };

// ---------------------------------------------------------------- seeded random
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return (s + 0.5) / 4294967296; }; }

// ---------------------------------------------------------------- polygons
export const NB = 300, NH = 48, NP = 40, NHOLE = 4, NPART = 26;
let SVG = null;
export function sampleD(d, n, closed = true) {
  if (!SVG) { SVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); SVG.setAttribute('width', '0'); SVG.setAttribute('height', '0'); SVG.style.position = 'absolute'; document.body.appendChild(SVG); }
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); SVG.appendChild(p);
  const L = p.getTotalLength(), o = [], den = closed ? n : n - 1;
  for (let i = 0; i < n; i++) { const q = p.getPointAtLength((L * i) / den); o.push([q.x, q.y]); }
  SVG.removeChild(p); return o;
}
export const area = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
export const orient = (P) => (area(P) < 0 ? P.slice().reverse() : P);
export const centroid = (P) => { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; };
export const bbox = (P) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; };
export function resamplePoly(P, n) {
  const L = [0]; for (let i = 1; i <= P.length; i++) { const a = P[i - 1], b = P[i % P.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const tot = L[P.length], o = []; let j = 0;
  for (let i = 0; i < n; i++) { const s = (tot * i) / n; while (L[j + 1] < s) j++; const a = P[j], b = P[(j + 1) % P.length], u = (s - L[j]) / (L[j + 1] - L[j] || 1); o.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]); }
  return o;
}
export const circ = (cx, cy, r, n, a0 = -Math.PI / 2) => Array.from({ length: n }, (_, i) => { const a = a0 + (2 * Math.PI * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
// first-vertex correspondence: the cyclic shift of B that minimises the summed squared distance to A (AE "set first vertex")
export function bestShift(A, B) { const n = A.length; let best = Infinity, bs = 0;
  for (let s = 0; s < n; s++) { let e = 0; for (let i = 0; i < n; i += 2) { const b = B[(i + s) % n], dx = A[i][0] - b[0], dy = A[i][1] - b[1]; e += dx * dx + dy * dy; if (e >= best) break; } if (e < best) { best = e; bs = s; } }
  return bs; }
export const shiftP = (B, s) => B.map((_, i) => B[(i + s) % B.length]);
export const alignTo = (A, B) => shiftP(B, bestShift(A, B));
export const lerpP = (A, B, t) => A.map((a, i) => [lerp(a[0], B[i][0], t), lerp(a[1], B[i][1], t)]);
export const rep = (p, n) => Array.from({ length: n }, () => [p[0], p[1]]);
export const scaleAbout = (P, c, s) => P.map((p) => [c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s]);
export const translate = (P, dx, dy) => P.map((p) => [p[0] + dx, p[1] + dy]);
export const rotP = (P, a, c = [0, 0]) => { const co = Math.cos(a), si = Math.sin(a); return P.map(([x, y]) => [c[0] + co * (x - c[0]) - si * (y - c[1]), c[1] + si * (x - c[0]) + co * (y - c[1])]); };
// rounded polygon → SVG path d (quadratic corners)
export function rpoly(pts, r) { const n = pts.length; let d = '';
  for (let i = 0; i < n; i++) { const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], rr = Array.isArray(r) ? r[i] : r;
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]), k1 = Math.min(rr, da / 2) / da, k2 = Math.min(rr, db / 2) / db;
    d += (i ? 'L' : 'M') + (p[0] + (a[0] - p[0]) * k1) + ',' + (p[1] + (a[1] - p[1]) * k1) + 'Q' + p[0] + ',' + p[1] + ' ' + (p[0] + (b[0] - p[0]) * k2) + ',' + (p[1] + (b[1] - p[1]) * k2); }
  return d + 'Z'; }
export const rrect = (x0, y0, x1, y1, r) => rpoly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], r);
export const polyD = (n, d) => orient(sampleD(d, n));

// ---------------------------------------------------------------- shape model
// { body: NB pts, holes: NHOLE × {pts NH, on}, parts: NPART × {pts NP, on, c, a}, fill }
export const offHole = (p = [0, 0]) => ({ pts: rep(p, NH), on: false });
export const offPart = (p = [0, 0]) => ({ pts: rep(p, NP), on: false, c: '#000000', a: 0 });
export function makeShape(body, holes = [], parts = [], fill = '#AB2524', extra = {}) {
  const c = centroid(body);
  const H = Array.from({ length: NHOLE }, (_, i) => (holes[i] ? { pts: orient(holes[i]), on: true } : offHole(c)));
  const P = Array.from({ length: NPART }, (_, i) => (parts[i] ? { pts: orient(parts[i].pts), on: true, c: parts[i].c, a: parts[i].a ?? 1, shade: i === NPART - 1 } : offPart(c)));
  return { body: orient(body), holes: H, parts: P, fill, ...extra };
}
export function shapeArea(S) { let a = Math.abs(area(S.body)); for (const h of S.holes) if (h.on) a -= Math.abs(area(h.pts)); return a; }

const _al = new Map();
function cachedAlign(key, A, B) { if (key && _al.has(key)) return _al.get(key); const r = alignTo(A, B); if (key) _al.set(key, r); return r; }

// morph A → B at linear fraction u. opts: { via: R (radius of the circle intermediate) | 0, key: cache key, stagger }
export function morph(A, B, u, opts = {}) {
  const via = opts.via || 0, key = opts.key;
  const g = EM(u), gA = EM(clamp(u / 0.5)), gB = EM(clamp((u - 0.5) / 0.5));
  let body;
  if (via) {
    const c = circ(opts.vc ? opts.vc[0] : 0, opts.vc ? opts.vc[1] : 0, via, NB);
    const Ca = cachedAlign(key && key + ':ca', A.body, c), Cb = cachedAlign(key && key + ':cb', B.body, c);
    body = u < 0.5 ? lerpP(A.body, Ca, gA) : lerpP(Cb, B.body, gB);
  } else body = lerpP(A.body, cachedAlign(key && key + ':ab', A.body, B.body), g);
  const holes = A.holes.map((ha, i) => {
    const hb = B.holes[i];
    if (ha.on && hb.on && !via) return { pts: lerpP(ha.pts, cachedAlign(key && key + ':h' + i, ha.pts, hb.pts), g), on: true };
    if (via) {
      if (u < 0.5) return ha.on ? { pts: scaleAbout(ha.pts, centroid(ha.pts), 1 - EM(clamp(u / 0.42))), on: true } : ha;
      return hb.on ? { pts: scaleAbout(hb.pts, centroid(hb.pts), EM(clamp((u - 0.58) / 0.42))), on: true } : hb;
    }
    if (ha.on) return { pts: scaleAbout(ha.pts, centroid(ha.pts), 1 - EM(clamp(u / 0.6))), on: true };
    if (hb.on) return { pts: scaleAbout(hb.pts, centroid(hb.pts), EM(clamp((u - 0.4) / 0.6))), on: true };
    return ha;
  });
  const st = opts.stagger ?? 0.012;
  const parts = A.parts.map((pa, i) => {
    const pb = B.parts[i], o = st * i;
    const matched = pa.on && pb.on && !(via && (pa.shade || pb.shade));
    if (matched) {   // matched sub-part: travels with the body, shrinks a little in flight
      const gk = EIO(clamp((u - 0.04 - o) / 0.72)), Bp = cachedAlign(key && key + ':p' + i, pa.pts, pb.pts);
      const P = lerpP(pa.pts, Bp, gk), c = centroid(P), sh = 1 - 0.42 * Math.sin(Math.PI * gk);
      return { pts: scaleAbout(P, c, sh), on: true, c: mixC(pa.c, pb.c, smooth(0.3, 0.7, gk)), a: lerp(pa.a, pb.a, gk) };
    }
    const collapseA = pa.on && (!via || u < 0.5), growB = pb.on && (!via || u >= 0.5);
    if (collapseA && !(growB && !via && u >= 0.5)) {   // A's unmatched part shrinks to its own centre
      const k = via ? clamp((u - o * 0.5) / 0.4) : clamp((u - o * 0.5) / 0.55); const s = 1 - EM(k);
      if (s > 0.01 || !growB) return { pts: scaleAbout(pa.pts, centroid(pa.pts), s), on: s > 0.01, c: pa.c, a: pa.a };
    }
    if (growB) { const k = via ? clamp((u - 0.56 - o * 0.6) / 0.38) : clamp((u - 0.4 - o * 0.6) / 0.5); const s = backOut(k, 1.6); return { pts: scaleAbout(pb.pts, centroid(pb.pts), s), on: k > 0, c: pb.c, a: pb.a }; }
    if (pa.on) return { ...pa, on: false };
    return pa;
  });
  return { body, holes, parts };
}

// local → world affine: impact squash q about pivot (local axes), rotation + scale, stretch k along direction phi
export function makeM(pos, rot = 0, sc = 1, phi = Math.PI / 2, k = 1, q = 0, piv = [0, 0]) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const R = [c * sc, -s * sc, s * sc, c * sc];
  const D = [1 + q, 0, 0, 1 - q];
  const cp = Math.cos(phi), sp = Math.sin(phi), ik = 1 / k;
  const Q = [cp * cp * k + sp * sp * ik, cp * sp * (k - ik), cp * sp * (k - ik), sp * sp * k + cp * cp * ik];
  const mul = (a, b) => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]];
  const QR = mul(Q, R), A = mul(QR, D);
  const dp = [piv[0] - D[0] * piv[0], piv[1] - D[3] * piv[1]];
  return { A, b: [pos[0] + QR[0] * dp[0] + QR[1] * dp[1], pos[1] + QR[2] * dp[0] + QR[3] * dp[1]] };
}
export const applyM = (M, p) => [M.A[0] * p[0] + M.A[1] * p[1] + M.b[0], M.A[2] * p[0] + M.A[3] * p[1] + M.b[1]];
export const qbez = (a, c, b, t) => [lerp(lerp(a[0], c[0], t), lerp(c[0], b[0], t), t), lerp(lerp(a[1], c[1], t), lerp(c[1], b[1], t), t)];
export function polyPath(path, P) { path.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) path.lineTo(P[i][0], P[i][1]); path.closePath(); }
