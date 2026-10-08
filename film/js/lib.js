// Shared helpers: palette, geometry/material caches, canvas textures, the vector logo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PAL = {
  red: '#AB2524', redDeep: '#7E1818', gold: '#E8BC1F', goldDeep: '#B98D0E', ink: '#2A1F1D',
  cream: '#F6F1E7', ivory: '#FBF7EF', ivory2: '#F4ECDE', ivory3: '#EDE3D1', peach: '#F4CFB8', peach2: '#EDBEA3',
  road: '#4D403C', roadMark: '#F5E9D3', water: '#CFC2B3',
  dorm: '#CBC4BA', dorm2: '#C3BBB0', dormDark: '#A69D92', dormRoad: '#ADA49A', dormWin: '#958C82', dormMid: '#BAB2A7',
  winDark: '#5E504B', winLit: '#FFD066',
};
export const C = (h) => new THREE.Color(h);
export const L_SOLID = 0, L_FX = 1, L_BG = 2;

const gcache = new Map();
export function rbox(w, h, d, r = 0.04, seg = 2) {
  const k = `rb${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${r}_${seg}`;
  if (!gcache.has(k)) { const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)); g.translate(0, h / 2, 0); gcache.set(k, g); }
  return gcache.get(k);
}
export function box(w, h, d) {
  const k = `bx${w}_${h}_${d}`;
  if (!gcache.has(k)) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); gcache.set(k, g); }
  return gcache.get(k);
}
export function cyl(rt, rb, h, seg = 32) {
  const k = `cy${rt}_${rb}_${h}_${seg}`;
  if (!gcache.has(k)) { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1); g.translate(0, h / 2, 0); gcache.set(k, g); }
  return gcache.get(k);
}
// rounded-profile lathe (a cylinder with rounded rims), origin at the bottom
export function rcyl(R, h, rc, seg = 48) {
  const k = `rc${R}_${h}_${rc}_${seg}`;
  if (gcache.has(k)) return gcache.get(k);
  const pts = [new THREE.Vector2(0, 0)];
  const arc = (cx, cy, a0, a1) => { for (let i = 0; i <= 6; i++) { const a = a0 + (a1 - a0) * i / 6; pts.push(new THREE.Vector2(cx + rc * Math.cos(a), cy + rc * Math.sin(a))); } };
  arc(R - rc, rc, -Math.PI / 2, 0);
  arc(R - rc, h - rc, 0, Math.PI / 2);
  pts.push(new THREE.Vector2(0, h));
  const g = new THREE.LatheGeometry(pts, seg);
  gcache.set(k, g);
  return g;
}

export function std(hex, o = {}) {
  // no env map in software GL: gold gets a little self-light so it stays brand-gold instead of olive in shade
  if (hex === PAL.gold && !o.emissive) { o = { ...o, emissive: PAL.gold, ei: 0.22, metal: 0 }; }
  return new THREE.MeshStandardMaterial({
    color: C(hex), roughness: o.rough ?? 0.78, metalness: o.metal ?? 0, envMapIntensity: o.env ?? 0.3,
    emissive: o.emissive ? C(o.emissive) : new THREE.Color(0), emissiveIntensity: o.ei ?? 1, side: o.side ?? THREE.FrontSide,
  });
}
export function mesh(geo, mat, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
export function setLayer(obj, l) { obj.traverse((o) => o.layers.set(l)); }

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (draw) draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  return { c, g, t };
}

// ---------------------------------------------------------------- the NENGPAI logo, rebuilt as vector geometry
// Measured on the supplied 640 px JPG: disc r 320; caps x 233-407, y 180-205 / 435-460 (r ~9); head x 253-387, y 226-414 (r ~24);
// handle y 300-340 from the head to the disc edge. Colours: red #AB2524, gold #E8BC1F.
export const LOGO = {
  cap: { x0: 233, x1: 407, h: 25, r: 9, yTop: 180, yBot: 435 },
  head: { x0: 253, x1: 387, y0: 226, y1: 414, r: 24 },
  handle: { x0: 380, x1: 640, y0: 300, y1: 340 },
};
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function drawLogo(g, cx, cy, R, o = {}) {
  const s = R / 320;
  g.save(); g.translate(cx - 320 * s, cy - 320 * s); g.scale(s, s);
  g.beginPath(); g.arc(320, 320, 320, 0, Math.PI * 2); g.fillStyle = o.red || PAL.red; g.fill();
  g.save(); g.beginPath(); g.arc(320, 320, 320, 0, Math.PI * 2); g.clip();
  g.fillStyle = o.gold || PAL.gold;
  const { cap, head, handle } = LOGO;
  rrect(g, cap.x0, cap.yTop, cap.x1 - cap.x0, cap.h, cap.r); g.fill();
  rrect(g, cap.x0, cap.yBot, cap.x1 - cap.x0, cap.h, cap.r); g.fill();
  g.fillRect(handle.x0, handle.y0, handle.x1 - handle.x0 + 10, handle.y1 - handle.y0);
  rrect(g, head.x0, head.y0, head.x1 - head.x0, head.y1 - head.y0, head.r); g.fill();
  g.restore(); g.restore();
}
export function logoSVG(size = 1024) {
  const { cap, head, handle } = LOGO;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="${size}" height="${size}">
<defs><clipPath id="d"><circle cx="320" cy="320" r="320"/></clipPath></defs>
<circle cx="320" cy="320" r="320" fill="${PAL.red}"/>
<g fill="${PAL.gold}" clip-path="url(#d)">
<rect x="${cap.x0}" y="${cap.yTop}" width="${cap.x1 - cap.x0}" height="${cap.h}" rx="${cap.r}"/>
<rect x="${cap.x0}" y="${cap.yBot}" width="${cap.x1 - cap.x0}" height="${cap.h}" rx="${cap.r}"/>
<rect x="${handle.x0}" y="${handle.y0}" width="${handle.x1 - handle.x0 + 10}" height="${handle.y1 - handle.y0}"/>
<rect x="${head.x0}" y="${head.y0}" width="${head.x1 - head.x0}" height="${head.y1 - head.y0}" rx="${head.r}"/>
</g></svg>`;
}
