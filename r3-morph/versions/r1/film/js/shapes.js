// shapes.js — every hero shape as morphable geometry (local px, y down, origin = visual centre).
import { tone, NPART, NB, NH, NP, polyD, rpoly, rrect, circ, makeShape, sampleD, orient, area, centroid, bbox, translate, resamplePoly } from './core.js';

export const C = {
  red: '#AB2524', gold: '#E8BC1F', rise: '#E8202A', ink: '#1A1210', paper: '#F4EEE3',
  grey: '#B9B0A5', smoke: '#CFC4B5', jade: '#F3ECDF', jadeShade: '#DCCDB5', jadeHi: '#FFFDF7', glint: '#FFF0C4', inkHi: '#2A201C',
};

// ---------------------------------------------------------------- the logo, rebuilt from measurements of nengpai-logo.jpg
// (640 px master, circle centre 320/320, R 320; everything below in units of R)
export const LOGO = {
  band: { x0: -0.272, x1: 0.270, h: 0.0766, r: 0.0195, yTop: -0.4375, yBot: 0.3594 },
  head: { x0: -0.209, x1: 0.206, y0: -0.294, y1: 0.291, r: 0.069 },
  handle: { x0: 0.206, x1: 1.0, y0: -0.0625, y1: 0.0606 },
};
// gavel silhouette (head ∪ handle) + its two bands, scaled to R, origin = logo circle centre
export function gavelGeom(R, handleEnd = 1.0) {
  const h = LOGO.head, d = LOGO.handle, b = LOGO.band;
  const body = rpoly([[h.x0 * R, h.y0 * R], [h.x1 * R, h.y0 * R], [h.x1 * R, d.y0 * R], [handleEnd * R, d.y0 * R], [handleEnd * R, d.y1 * R], [h.x1 * R, d.y1 * R], [h.x1 * R, h.y1 * R], [h.x0 * R, h.y1 * R]],
    [h.r * R, h.r * R, 1.5, 0.012 * R, 0.012 * R, 1.5, h.r * R, h.r * R]);
  const top = rrect(b.x0 * R, b.yTop * R, b.x1 * R, (b.yTop + b.h) * R, b.r * R);
  const bot = rrect(b.x0 * R, b.yBot * R, b.x1 * R, (b.yBot + b.h) * R, b.r * R);
  return { body, top, bot };
}

const part = (d, c, a = 1) => ({ pts: polyD(NP, d), c, a });
const circD = (cx, cy, r) => `M${cx - r},${cy}A${r},${r} 0 1 0 ${cx + r},${cy}A${r},${r} 0 1 0 ${cx - r},${cy}Z`;
function centreShape(S, dx, dy) {   // shift every layer of a shape
  S.body = translate(S.body, dx, dy); for (const h of S.holes) h.pts = translate(h.pts, dx, dy); for (const p of S.parts) p.pts = translate(p.pts, dx, dy); return S; }
function autoCentre(S, oy = 0) { const [x0, y0, x1, y1] = bbox(S.body); return centreShape(S, -(x0 + x1) / 2, -(y0 + y1) / 2 + oy); }

export const SH = {};
export function buildShapes() {
  // circles
  SH.circle = makeShape(circ(0, 0, 200, NB), [], [], C.red);
  SH.circle2 = makeShape(circ(0, 0, 190, NB), [], [], C.ink);
  SH.dot = makeShape(circ(0, 0, 70, NB), [], [], C.grey);

  // FACTORY — saw-tooth roof, chimney, annex; 3 windows + door as holes; 3 smoke puffs as sub-parts
  { const P = [[-250, 170], [-250, -30], [-150, -112], [-150, -30], [-50, -112], [-50, -30], [50, -112], [50, -30], [86, -30], [86, -268], [148, -268], [148, -62], [250, -62], [250, 170]];
    const R = [7, 7, 4, 3, 4, 3, 4, 3, 3, 6, 6, 3, 7, 7];
    const body = polyD(NB, rpoly(P, R));
    const holes = [rrect(-212, 34, -150, 96, 7), rrect(-118, 34, -56, 96, 7), rrect(-24, 34, 38, 96, 7), rrect(170, 62, 222, 156, 7)].map((d) => polyD(NH, d));
    const parts = [part(circD(122, -306, 24), C.smoke), part(circD(150, -356, 31), C.smoke), part(circD(194, -414, 38), C.smoke)];
    parts[NPART - 1] = part(rpoly([[117, -268], [148, -268], [148, -62], [250, -62], [250, -40], [117, -40]], [5, 6, 3, 6, 1, 1]), tone(C.red, -0.055));
    SH.factory = autoCentre(makeShape(body, holes, parts, C.red), 0);
  }
  // APARTMENT — stepped crown + mast; 24 windows (lit gold / dark) as sub-parts
  { const P = [[-150, 240], [-150, -196], [-100, -196], [-100, -250], [-9, -250], [-9, -330], [9, -330], [9, -250], [100, -250], [100, -196], [150, -196], [150, 240]];
    const R = [7, 7, 3, 7, 3, 5, 5, 3, 7, 3, 7, 7];
    const body = polyD(NB, rpoly(P, R));
    const lit = new Set([0, 1, 2, 5, 9, 12, 14, 19, 22]);
    const order = [];   // windows sorted so that slots 0..2 are lit ones (they are the smoke puffs' destinations)
    const cells = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) cells.push([c, r]);
    const litCells = [[1, 1], [2, 2], [1, 3]];
    for (const lc of litCells) order.push(cells.findIndex((q) => q[0] === lc[0] && q[1] === lc[1]));
    cells.forEach((_, i) => { if (!order.includes(i)) order.push(i); });
    const parts = order.map((ci, k) => { const [c, r] = cells[ci]; const x = -96 + 64 * c, y = -146 + 60 * r;
      return { ...part(rrect(x - 19, y - 17, x + 19, y + 17, 4), k < 3 || lit.has(ci) ? C.gold : C.ink), lit: k < 3 || lit.has(ci), cell: [c, r] }; });
    const holes = [rrect(-26, 186, 26, 236, 6)].map((d) => polyD(NH, d));
    parts[NPART - 1] = part(rpoly([[124, -196], [150, -196], [150, 240], [124, 240]], [1, 6, 6, 1]), tone(C.red, -0.055));
    SH.apartment = autoCentre(makeShape(body, holes, parts, C.red), 0);
    SH.apartment.parts.forEach((p, i) => { if (parts[i]) { p.lit = parts[i].lit; p.cell = parts[i].cell; } });
  }
  // JADE BRACELET — the ring: the circle with a hole (white jade, gold-white glint, no green)
  { const body = circ(0, 0, 214, NB), hole = circ(0, 0, 150, NH);
    const arcBand = (r0, r1, a0, a1) => { const n = 24, o = [];
      for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * Math.PI / 180, w = Math.sin((Math.PI * i) / n); const rr = r1 - (r1 - r0) * (0.5 + 0.5 * w); o.push([Math.cos(a) * r1, Math.sin(a) * r1]); }
      for (let i = n; i >= 0; i--) { const a = (a0 + ((a1 - a0) * i) / n) * Math.PI / 180, w = Math.sin((Math.PI * i) / n); const rr = lerp1(r1, r0, w); o.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      return 'M' + o.map((p) => p.join(',')).join('L') + 'Z'; };
    const star = (cx, cy, r) => { const o = []; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.2 : r; o.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return rpoly(o, 1.5); };
    const parts = [part(arcBand(162, 204, 196, 262), C.jadeHi, 0.95), part(arcBand(156, 210, 18, 112), C.jadeShade, 1), part(star(150, -152, 46), C.glint, 1)];
    SH.bracelet = makeShape(body, [hole], parts, C.jade);
  }
  // GAVEL — the logo's own gavel (head ∪ handle) + the two bands as sub-parts, gold
  { const g = gavelGeom(330);
    const pp = [part(g.top, C.gold), part(g.bot, C.gold)]; const h = LOGO.head;
    pp[NPART - 1] = part(rpoly([[0.11 * 330, h.y0 * 330 + 2], [h.x1 * 330, h.y0 * 330], [h.x1 * 330, h.y1 * 330], [0.11 * 330, h.y1 * 330 - 2]], [2, h.r * 330, h.r * 330, 2]), tone(C.gold, -0.06));
    const S = makeShape(polyD(NB, g.body), [], pp, C.gold);
    const [x0, y0, x1, y1] = bbox(S.body); S.gcx = (x0 + x1) / 2; centreShape(S, -(x0 + x1) / 2, 0);
    SH.gavel = S;
  }
  // CAPSULE — the flattened circle that becomes the auction screen
  SH.capsule = makeShape(polyD(NB, rrect(-380, -96, 380, 96, 96)), [], [], C.ink);
}
const lerp1 = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- digit glyphs (Inter 800 outlines via opentype.js)
export const GLY = { font: null, upm: 1000, d: {} };
export async function loadGlyphs(opentype) {
  const buf = await (await fetch('/node_modules/@fontsource/inter/files/inter-latin-800-normal.woff')).arrayBuffer();
  const f = opentype.parse(buf); GLY.font = f; GLY.upm = f.unitsPerEm;
  // cell advance: the widest of 0-9 (tabular cells, so a rolling column never jitters)
  let adv = 0; for (const ch of '0123456789') adv = Math.max(adv, f.charToGlyph(ch).advanceWidth);
  GLY.cell = adv / f.unitsPerEm;
  for (const ch of '0123456789¥,%+.') {
    const g = f.charToGlyph(ch), p = g.getPath(0, 0, 1000), cmds = p.commands;
    const subs = []; let cur = '';
    for (const c of cmds) { if (c.type === 'M') { if (cur) subs.push(cur + 'Z'); cur = `M${c.x},${c.y}`; }
      else if (c.type === 'L') cur += `L${c.x},${c.y}`; else if (c.type === 'Q') cur += `Q${c.x1},${c.y1} ${c.x},${c.y}`;
      else if (c.type === 'C') cur += `C${c.x1},${c.y1} ${c.x2},${c.y2} ${c.x},${c.y}`; }
    if (cur) subs.push(cur + 'Z');
    const adv1 = g.advanceWidth / f.unitsPerEm;
    // glyph space: size 1000, baseline y=0, x centred on the (tabular) cell centre
    const dx = ('0123456789'.includes(ch) ? (GLY.cell * 1000 - g.advanceWidth / f.unitsPerEm * 1000) / 2 : 0) - ('0123456789'.includes(ch) ? GLY.cell * 500 : adv1 * 500);
    const cont = subs.map((d) => sampleD(d, 160)).map((P) => translate(P, dx, 0));
    let oi = 0; cont.forEach((c, i) => { if (Math.abs(area(c)) > Math.abs(area(cont[oi]))) oi = i; });
    const outer = orient(resamplePoly(cont[oi], NB)), holes = cont.filter((_, i) => i !== oi).map((c) => orient(resamplePoly(c, NH)));
    const path = new Path2D(); for (const c of cont) { path.moveTo(c[0][0], c[0][1]); for (const q of c) path.lineTo(q[0], q[1]); path.closePath(); }
    const exact = new Path2D(); { let s = ''; for (const d of subs) s += d; const pp = new Path2D(s); exact.addPath(pp, new DOMMatrix([1, 0, 0, 1, dx, 0])); }
    GLY.d[ch] = { outer, holes, path: exact, adv: adv1 };
  }
  // cap height of the digits (for vertical centring)
  const b0 = bbox(GLY.d['0'].outer); GLY.capTop = b0[1]; GLY.capBot = b0[3];
}
// a digit as a morph shape at font size fs, centred on its cell centre and the digit cap-centre
export function digitShape(ch, fs, fill) {
  const g = GLY.d[ch], k = fs / 1000, cy = (GLY.capTop + GLY.capBot) / 2;
  const tr = (P) => P.map(([x, y]) => [x * k, (y - cy) * k]);
  return makeShape(tr(g.outer), g.holes.map(tr), [], fill);
}
