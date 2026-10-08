// 资产焕新岛 — NENGPAI 能拍法服 · 10 s isometric film. Every frame is a pure function of t (window.renderAt).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Accumulator } from './render.js';
import * as A from './anim.js';
import { PAL, C, L_SOLID, L_FX, L_BG, rbox, box, cyl, rcyl, std, mesh, setLayer, canvasTex, drawLogo, LOGO } from './lib.js';

const q = new URLSearchParams(location.search);
const SPP = +(q.get('spp') || 16);
window.DEMO = { width: 1920, height: 1080, fps: 30, duration: 10 };
const FPS = 30, SHUTTER = 0.5;
const cues = await (await fetch(new URL('../cues.json', import.meta.url))).json();

const SERIF = "'Noto Serif SC'", SANS = "'Noto Sans SC'";
const COPY = '能拍法服让司法更高效·焕资产新价值NENGPAI综合司法辅助服务近家法院覆盖余个省市区直播拍卖成交率0123456789%';
await Promise.all([
  document.fonts.load(`900 100px ${SERIF}`, COPY), document.fonts.load(`700 100px ${SERIF}`, COPY),
  document.fonts.load(`500 100px ${SANS}`, COPY), document.fonts.load(`700 100px ${SANS}`, COPY), document.fonts.load(`900 100px ${SANS}`, COPY),
]);
await document.fonts.ready;
for (const f of [`900 100px ${SERIF}`, `500 100px ${SANS}`, `700 100px ${SANS}`, `900 100px ${SANS}`]) if (!document.fonts.check(f, COPY)) console.error('FONT MISSING', f);

// ================================================================== renderer, camera, light
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false });
const dpr = window.devicePixelRatio || 1;
renderer.setPixelRatio(dpr); renderer.setSize(1920, 1080, false);
renderer.shadowMap.enabled = q.get('noshadowmap') !== '1'; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
renderer.localClippingEnabled = true;
const glx = renderer.getContext();
const W = Math.round(1920 * dpr), H = Math.round(1080 * dpr);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
if (q.get('env') !== '1') scene.environment = null;   // env lighting costs ~40 % in software GL; hemi + fill replace it
if (q.get('lambert') === '1') scene.overrideMaterial = null;

const VH = 18;
const camera = new THREE.OrthographicCamera(-VH * 16 / 9 / 2, VH * 16 / 9 / 2, VH / 2, -VH / 2, 1, 400);
const DIR = new THREE.Vector3(1, 1, 1).normalize();            // true isometric: 35.264° elevation, 45° azimuth
const R_ = new THREE.Vector3(1, 0, -1).normalize(), U_ = new THREE.Vector3(-1, 2, -1).normalize();

const hemi = new THREE.HemisphereLight(C('#FFF7EC'), C('#D3C4B2'), 1.05); scene.add(hemi);
const SUN0 = new THREE.Vector3(0.62, 1.0, -0.22).normalize();   // key from the right: top > right face > left face
const sun = new THREE.DirectionalLight(C('#FFF0DC'), 2.15);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 90 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(C('#FFE3D2'), 0.42); fill.position.set(-2, 3, 6); scene.add(fill);

// ================================================================== camera choreography (screen-plane pan x,y + zoom)
function hermite(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length; if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (t > keys[i + 1][0]) i++;
  const slope = (k) => (keys[k][2] === 'e' || k === 0 || k === n - 1) ? 0 : (keys[k + 1][1] - keys[k - 1][1]) / (keys[k + 1][0] - keys[k - 1][0]);
  const [t0, v0] = keys[i], [t1, v1] = keys[i + 1]; const h = t1 - t0, u = (t - t0) / h;
  const m0 = slope(i) * h, m1 = slope(i + 1) * h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
}
const PB0 = cues.pullback[0], PB1 = cues.pullback[1];
const CAM = {
  x: [[0, 0.35], [0.55, 0.3, 'e'], [1.75, 0.0], [2.5, -0.9, 'e'], [4.6, 1.0], [5.45, 2.7, 'e'], [5.95, 2.8, 'e'], [6.55, -3.96], [PB0, -4.3, 'e'], [PB1, -5.55, 'e'], [10, -5.65]],
  y: [[0, 1.05], [0.55, 0.8, 'e'], [1.75, 0.65], [2.5, 2.2, 'e'], [4.6, 2.3], [5.45, 3.0, 'e'], [5.95, 2.95, 'e'], [6.55, 0.85], [PB0, 0.8, 'e'], [PB1, 0.62, 'e'], [10, 0.64]],
  z: [[0, 3.1], [0.55, 2.55, 'e'], [1.75, 1.55], [2.5, 1.55, 'e'], [4.6, 1.52], [5.45, 1.9, 'e'], [5.95, 1.86, 'e'], [6.55, 1.22], [PB0, 1.21, 'e'], [PB1, 1.12, 'e'], [10, 1.125]],
};
// camera shake on the two gavel hits: 6 px (strike) / 4 px (deal), alternating, decaying to 0 over 6 frames
function shake(t, t0, px) {
  const f = (t - t0) * 30; if (f < 0 || f >= 6) return [0, 0];
  const a = px * (1 - f / 6);
  return [a * Math.cos(Math.PI * f), 0.6 * a * Math.sin(Math.PI * f * 1.3 + 0.7)];
}
function camAt(t) {
  let zoom = hermite(CAM.z, t);
  const u = t - cues.strike;                                    // strike: 4 % punch-in in 2 frames, settles over 10
  if (u > 0) zoom *= 1 + 0.04 * (u < 0.066 ? A.easeOutCubic(u / 0.066) : 1 - A.easeOutCubic((u - 0.066) / 0.33));
  const v = t - cues.deal;                                      // deal: 4 % punch, ease-out-expo over 8 frames
  if (v > 0) zoom *= 1 + 0.04 * (v < 0.05 ? A.easeOutCubic(v / 0.05) : 1 - A.easeOutExpo((v - 0.05) / 0.27));
  const s1 = shake(t, cues.strike, 6), s2 = shake(t, cues.deal, 4);
  const k = 1 / (60 * zoom);
  return { x: hermite(CAM.x, t) + (s1[0] + s2[0]) * k, y: hermite(CAM.y, t) + (s1[1] + s2[1]) * k, zoom };
}
// world point at a given output-frame pixel for a layer with parallax factor m (island 1, fg 1.25, bg 0.75)
function worldAt(px, py, yW, t, m = 1) {
  const k = camAt(t);
  const a = (px - 960) / (60 * k.zoom) + m * k.x, b = -(py - 540) / (60 * k.zoom) + m * k.y;
  const lam = (yW - U_.y * b) / DIR.y;
  return new THREE.Vector3().addScaledVector(R_, a).addScaledVector(U_, b).addScaledVector(DIR, lam);
}

// ================================================================== groups (parallax 1 : 0.8 : 0.6 = fg : island : bg)
const island = new THREE.Group(); scene.add(island);
const fg = new THREE.Group(); scene.add(fg);
const bgG = new THREE.Group(); scene.add(bgG);
const TXT = { t: null };    // text canvases are drawn once per output frame (frame-centre time), not per sub-sample
const U = [], UL = [];      // updaters f(t); UL run after U (they read building state)
const on = (f) => U.push(f);
const late = (f) => UL.push(f);
const ease = A;

// ---------------------------------------------------------------- background (screen quad): cream void, iso dot floor, island shadow
const FLOOR = -9;
const bgU = {
  uInvVP: { value: new THREE.Matrix4() }, uFwd: { value: DIR.clone().negate() }, uOff: { value: new THREE.Vector2() },
  uTop: { value: C('#FBF8F1') }, uMid: { value: C('#F6F1E7') }, uLow: { value: C('#EEE5D6') }, uDot: { value: C('#DCCFBD') },
  uShadowC: { value: new THREE.Vector2() }, uShadow: { value: 0 }, uZoom: { value: 1 }, uFloorY: { value: FLOOR },
  uRipT: { value: 0 }, uRed: { value: C(PAL.red) },
};
{
  const m = new THREE.ShaderMaterial({
    uniforms: bgU, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vNdc; void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: /* glsl */`
      uniform mat4 uInvVP; uniform vec3 uFwd, uTop, uMid, uLow, uDot, uRed; uniform vec2 uOff, uShadowC; uniform float uShadow, uZoom, uFloorY, uRipT;
      varying vec2 vNdc;
      void main(){
        vec2 uv = vNdc * 0.5 + 0.5;
        vec3 col = mix(mix(uLow, uMid, smoothstep(0.0, 0.6, uv.y)), uTop, smoothstep(0.55, 1.0, uv.y));
        vec2 qq = vNdc; qq.x *= 1.7778;
        col = mix(col, uTop, 0.45 * exp(-dot(qq - vec2(0.1, 0.12), qq - vec2(0.1, 0.12)) * 0.8));
        vec4 p = uInvVP * vec4(vNdc, -1.0, 1.0); p.xyz /= p.w;
        float tt = (uFloorY - p.y) / uFwd.y; vec3 w = p.xyz + uFwd * tt;
        // island floor shadow (soft disc, projected along the sun)
        float sd = length(w.xz - uShadowC);
        col *= 1.0 - uShadow * 0.11 * (1.0 - smoothstep(4.0, 9.5, sd));
        // iso dot floor (moves at the bg parallax)
        vec2 g = w.xz - uOff;
        vec2 cc = g - floor(g + 0.5);
        float dd = length(cc);
        float r = 0.035 / sqrt(max(uZoom, 0.5));
        float aa = fwidth(dd) * 1.2 + 0.003;
        float dotm = 1.0 - smoothstep(r - aa, r + aa, dd);
        float fade = exp(-dot(w.xz, w.xz) * 0.0022);
        col = mix(col, uDot, dotm * 0.75 * fade);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const q2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  q2.frustumCulled = false; q2.renderOrder = -1000; q2.layers.set(L_BG);
  scene.add(q2);
}

// ================================================================== island layout
const tiles = [];
const POND = new Set(['1,4', '2,4', '1,5', '2,5']);
for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
  const d = Math.hypot(i, j); if (d > 6.35) continue;
  const m = Math.max(Math.abs(i), Math.abs(j));
  let type = 'g';
  if (m <= 1) type = 'c'; else if (m === 2) type = 'r'; else if (i === 0 || j === 0) type = 'r'; else if (POND.has(i + ',' + j)) type = 'w';
  if (type === 'g' && (i + j) % 2 === 0 && m <= 3) type = 'p';
  tiles.push({ i, j, d, type, dir: (m === 2 ? (Math.abs(i) === 2 && Math.abs(j) < 2 ? 'z' : Math.abs(j) === 2 && Math.abs(i) < 2 ? 'x' : 'c') : (i === 0 ? 'z' : 'x')) });
}
const TILE_H = 0.2;
const tileLand = (d) => d === 0 ? -1 : cues.tiles_t0 + (d - 1) * cues.tiles_dt;
const floodAt = (d) => cues.flood_t0 + d * cues.flood_dt;
const LIVE = { g: [PAL.ivory2, PAL.ivory3], p: [PAL.peach, PAL.peach2], c: [PAL.ivory, PAL.ivory], r: [PAL.road, PAL.road], w: [PAL.water, PAL.water] };
const DORM = { g: [PAL.dorm, PAL.dorm2], p: [PAL.dorm, PAL.dorm2], c: [PAL.dorm, PAL.dorm], r: [PAL.dormRoad, PAL.dormRoad], w: [PAL.dormMid, PAL.dormMid] };

const tileMesh = new THREE.InstancedMesh(rbox(0.965, TILE_H, 0.965, 0.035), std('#ffffff', { rough: 0.85 }), tiles.length);
tileMesh.castShadow = true; tileMesh.receiveShadow = true; island.add(tileMesh);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _c2 = new THREE.Color();
const tileCols = tiles.map((tl) => {
  const k = (tl.i + tl.j) & 1;
  return [C(DORM[tl.type][k]), C(LIVE[tl.type][k])];
});
// flood "wave" bump + colour, tile drop-in with a flip
function tileState(tl, t) {
  const land = tileLand(tl.d);
  const ax = A.hash(tl.i * 7.1 + tl.j * 3.3) > 0.5 ? 1 : -1;
  const dr = A.drop(t - land, 0.2, 1.4, 1.6 * ax, 0.06);
  const tf = floodAt(tl.d);
  const bump = t > tf ? 0.07 * Math.sin(Math.PI * A.clamp((t - tf) / 0.22)) : 0;
  const fS = (t - cues.strike) * 30;
  const sq0 = fS < 0 ? 1 : fS < 2 ? 0.85 : 1 + 0.03 * Math.exp(-(fS - 2) / 2.5) * Math.cos((fS - 2) * 1.3);
  return { y: (tl.d === 0 ? 0 : dr.y) + bump, rot: tl.d === 0 ? 0 : dr.rot, sy: tl.d === 0 ? sq0 : dr.sy, sxz: tl.d === 0 ? 1 : dr.sxz, vis: tl.d === 0 ? 1 : dr.vis, ax };
}
const isWater = (tl) => tl.type === 'w';
on((t) => {
  tiles.forEach((tl, n) => {
    const s = tileState(tl, t);
    const dropY = isWater(tl) ? -0.1 : 0;
    _e.set(tl.ax > 0 ? s.rot : 0, 0, tl.ax < 0 ? s.rot : 0); _q.setFromEuler(_e);
    _v.set(tl.i, s.y + dropY, tl.j);
    const vis = s.vis ? 1 : 0;
    _s.set(s.sxz * vis, s.sy * vis, s.sxz * vis);
    _m.compose(_v, _q, _s); tileMesh.setMatrixAt(n, _m);
    const k = A.smooth(A.inv(floodAt(tl.d), floodAt(tl.d) + 0.18, t));
    _c.copy(tileCols[n][0]).lerp(tileCols[n][1], k);
    // flood front: a warm gold rim-light passes over each tile
    const fl = Math.exp(-Math.pow((t - floodAt(tl.d) - 0.06) / 0.07, 2));
    _c.lerp(_c2.set(PAL.gold), 0.35 * fl);
    tileMesh.setColorAt(n, _c);
  });
  tileMesh.instanceMatrix.needsUpdate = true; tileMesh.instanceColor.needsUpdate = true;
});

// road markings (cream dashes, revived with the flood)
{
  const roads = tiles.filter((tl) => tl.type === 'r' && tl.dir !== 'c');
  const im = new THREE.InstancedMesh(box(1, 1, 1), std('#ffffff', { rough: 0.7 }), roads.length);
  im.receiveShadow = true; island.add(im);
  const cD = C(PAL.dormMid), cL = C(PAL.roadMark);
  on((t) => {
    roads.forEach((tl, n) => {
      const s = tileState(tl, t);
      _v.set(tl.i, s.y + TILE_H * s.sy, tl.j);
      _e.set(tl.ax > 0 ? s.rot : 0, 0, tl.ax < 0 ? s.rot : 0); _q.setFromEuler(_e);
      const v = s.vis ? 1 : 0;
      _s.set(tl.dir === 'x' ? 0.34 * v : 0.07 * v, 0.012 * v, tl.dir === 'z' ? 0.34 * v : 0.07 * v);
      _m.compose(_v, _q, _s); im.setMatrixAt(n, _m);
      im.setColorAt(n, _c.copy(cD).lerp(cL, A.smooth(A.inv(floodAt(tl.d), floodAt(tl.d) + 0.2, t))));
    });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  });
}

// pond water: shimmer bands (closed-form) on a glossy surface, revived with the flood
{
  const wm = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLive: { value: 0 }, uA: { value: C(PAL.dormMid) }, uB: { value: C('#C9BBAA') }, uHi: { value: C('#FFF6E4') }, uGold: { value: C(PAL.gold) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform float uTime, uLive; uniform vec3 uA, uB, uHi, uGold; varying vec3 vW;
      void main(){
        vec2 p = vW.xz;
        float edge = smoothstep(0.0, 0.18, min(min(p.x - 0.5, 2.5 - p.x), min(p.y - 3.5, 5.5 - p.y)));
        vec3 c = mix(uA, uB * 0.96, uLive);
        float band = sin((p.x + p.y) * 9.0 - uTime * 3.2 + sin(p.x * 3.1 - uTime * 1.3) * 1.3);
        float glint = smoothstep(0.86, 0.97, band) * uLive;
        float g2 = smoothstep(0.93, 0.99, sin((p.x * 1.7 - p.y) * 7.0 + uTime * 2.1)) * uLive;
        c = mix(c, uHi, glint * 0.7 * edge);
        c = mix(c, uGold, g2 * 0.45 * edge);
        c = mix(c * 0.9, c, edge);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const wp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), wm);
  wp.rotation.x = -Math.PI / 2; wp.position.set(1.5, 0.06, 4.5); island.add(wp);
  wp.receiveShadow = false;
  on((t) => {
    wm.uniforms.uTime.value = t;
    wm.uniforms.uLive.value = A.smooth(A.inv(floodAt(4.3), floodAt(4.3) + 0.3, t));
    const lt = tileLand(4.1);
    wp.visible = t > lt + 0.05;
  });
}

// ---------------------------------------------------------------- island body: the logo circle (red rim, gold ring)
const base = new THREE.Group(); island.add(base);
{
  const R = 6.95;
  const top = mesh(cyl(R, R, 0.02, 128), std(PAL.ivory3, { rough: 0.9 })); top.position.y = -0.02; base.add(top);
  const rim = mesh(cyl(R, R, 0.95, 128), std(PAL.red, { rough: 0.6 })); rim.position.y = -0.97; base.add(rim);
  const ring = mesh(cyl(R + 0.02, R + 0.02, 0.07, 128), std(PAL.gold, { rough: 0.3, metal: 0.5, env: 0.9 })); ring.position.y = -0.2; base.add(ring);
  const low = mesh(cyl(R - 0.15, R - 1.1, 0.75, 128), std(PAL.redDeep, { rough: 0.7 })); low.position.y = -1.72; base.add(low);
  on((t) => {
    const u = t - cues.base_rise;
    const s = u <= 0 ? 0 : A.easeOutBack(A.clamp(u / 0.34), 1.6);
    base.scale.set(1, Math.max(1e-4, s), 1); base.visible = u > 0;
  });
}
// the red seal disc on the centre tile (the logo circle at its smallest) + strike ripple
{
  const seal = mesh(rcyl(0.42, 0.06, 0.025), std(PAL.red, { rough: 0.5 })); seal.position.set(0, TILE_H, 0); island.add(seal);
  on((t) => {
    const u = t - cues.strike;
    const sq = u > 0 ? Math.exp(-u / 0.06) * Math.cos(u * 60) : 0;
    seal.scale.set(1 + 0.25 * sq, 1 - 0.5 * sq, 1 + 0.25 * sq);
    seal.visible = t < cues.court.base + 0.05;
  });
  const rm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: -1 }, uRed: { value: C(PAL.red) }, uLine: { value: C('#BFAF9D') } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */`
      uniform float uT; uniform vec3 uRed, uLine; varying vec2 vP;
      void main(){
        if (uT < 0.0) discard;
        float r = length(vP);
        float R1 = 0.5 + 8.0 * (1.0 - pow(1.0 - clamp(uT / 1.0, 0.0, 1.0), 3.0));
        float R2 = 0.5 + 6.5 * (1.0 - pow(1.0 - clamp((uT - 0.09) / 1.0, 0.0, 1.0), 3.0));
        float a1 = exp(-pow((r - R1) / 0.14, 2.0)) * (1.0 - smoothstep(0.35, 1.05, uT));
        float a2 = uT > 0.09 ? exp(-pow((r - R2) / 0.08, 2.0)) * (1.0 - smoothstep(0.3, 1.0, uT)) * 0.7 : 0.0;
        // blueprint: tile seams revealed inside the ripple, fading as the tiles land
        vec2 ce = abs(fract(vP + 0.5) - 0.5);
        float ld = 0.5 - max(ce.x, ce.y);
        float lw = fwidth(ld) * 1.1;
        float lm = 1.0 - smoothstep(0.012, 0.012 + lw, ld);
        float inside = (1.0 - smoothstep(R1 - 0.4, R1, r)) * (1.0 - smoothstep(6.2, 6.6, r));
        float bl = lm * inside * 0.55 * (1.0 - smoothstep(0.6, 1.3, uT));
        vec3 col = mix(uLine, uRed, clamp((a1 + a2) * 1.4, 0.0, 1.0));
        float a = clamp(max(a1 + a2, bl), 0.0, 1.0);
        if (a < 0.003) discard;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const rp = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), rm);
  rp.rotation.x = -Math.PI / 2; rp.position.y = 0.012; rp.layers.set(L_FX); island.add(rp);
  on((t) => { rm.uniforms.uT.value = t >= cues.strike ? t - cues.strike : -1; rp.visible = t < 2.0; });
}

// ================================================================== windows (one instanced pool)
const WIN_MAX = 1400;
const winMesh = new THREE.InstancedMesh(box(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), WIN_MAX);
winMesh.count = 0; island.add(winMesh);
const winDefs = [];   // {b (building), lx, ly, lz, sx, sy, sz, tLit, lit, seed}
const cWinD = C(PAL.dormWin), cWinDark = C(PAL.winDark), cWinLit = C(PAL.winLit);
function addWindows(b, o) {
  // windows on the two visible faces (+X right face, +Z left face)
  const { w, d, h } = b; const fh = o.floor ?? 0.3, colW = o.colW ?? 0.22, ww = o.ww ?? 0.1, wh = o.wh ?? 0.14;
  const y0 = o.y0 ?? 0.16, y1 = h - (o.top ?? 0.12);
  const nr = Math.max(1, Math.floor((y1 - y0) / fh));
  for (const face of o.faces ?? ['x', 'z']) {
    const span = face === 'x' ? d : w;
    const nc = Math.max(1, Math.floor((span - 0.16) / colW));
    for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
      const u = (c - (nc - 1) / 2) * colW, v = y0 + (r + 0.5) * ((y1 - y0) / nr);
      const seed = A.hash(winDefs.length * 1.37 + b.x * 3.1 + b.z * 7.7);
      winDefs.push({
        b, face, lx: face === 'x' ? w / 2 + 0.006 : u, lz: face === 'z' ? d / 2 + 0.006 : u, ly: v,
        sx: face === 'x' ? 0.02 : ww, sz: face === 'z' ? 0.02 : ww, sy: wh,
        r, seed, lit: seed < (o.litFrac ?? 0.78),
      });
    }
  }
}
late((t) => {
  let n = 0;
  for (const wd of winDefs) {
    const b = wd.b; const st = b.state;
    if (!st || !st.vis || st.sy < 0.02) continue;
    _v.set(b.x + wd.lx * st.sxz, st.y + b.y0 + wd.ly * st.sy, b.z + wd.lz * st.sxz);
    _q.identity(); _s.set(wd.sx, wd.sy * st.sy, wd.sz);
    _m.compose(_v, _q, _s); winMesh.setMatrixAt(n, _m);
    const tl = b.tRev + 0.12 + wd.r * 0.055 + wd.seed * 0.22;
    let k = wd.lit ? A.smooth(A.inv(tl, tl + 0.05, t)) : 0;
    if (wd.lit && t > 8.5 && A.hash(wd.seed * 91 + Math.floor(t * 2.5)) > 0.93) k *= 0.25;   // a few windows blink in the hold
    if (b.tRev > 50) k = 0;
    const dd = Math.hypot(b.x, b.z), tw = cues.deal + 0.03 + dd * 0.035;   // radial flash sweep from the courthouse, 8 frames
    const wf = t > tw ? Math.exp(-(t - tw) / 0.12) : 0;
    _c.copy(cWinD).lerp(cWinDark, A.smooth(A.inv(b.tRev, b.tRev + 0.2, t))).lerp(cWinLit, Math.max(k, wf));
    if (wf > 0.02) _c.lerp(_c2.set('#FFF6D8'), 0.6 * wf).multiplyScalar(1 + 0.8 * wf);
    winMesh.setColorAt(n, _c);
    n++;
  }
  winMesh.count = n;
  winMesh.instanceMatrix.needsUpdate = true; if (winMesh.instanceColor) winMesh.instanceColor.needsUpdate = true;
});

// ================================================================== buildings
// mode 'grow': base lands, walls scaleY 0 -> overshoot, cap 2-3 frames later.  mode 'dormant': lands grey at tLand, revives at tRev.
const revs = [];   // {mat, c0, c1, t}
function rmat(dorm, live, tRev, o = {}) {
  const m = std(dorm, o); revs.push({ m, c0: C(dorm), c1: C(live), t: tRev, flash: o.flash ?? 0.55 });
  return m;
}
on((t) => {
  for (const r of revs) {
    const k = A.smooth(A.inv(r.t, r.t + 0.22, t));
    r.m.color.copy(r.c0).lerp(r.c1, k);
    const f = t > r.t ? Math.exp(-(t - r.t) / 0.13) : 0;
    r.m.emissive.set(PAL.gold).multiplyScalar(r.flash * f * (t > r.t ? 1 : 0));
  }
});
const buildings = [];
function growState(t, tg) {
  // tg = moment the base slab lands
  if (t < tg - 0.14) return { vis: false, y: 0, sy: 0, sxz: 1, cap: 0, capY: 0.5 };
  const yb = t < tg ? 0.55 * (1 - A.easeInCubic((t - (tg - 0.14)) / 0.14)) : 0;
  const tw = tg + 0.033;
  const sy = t < tw ? 0 : A.easeOutBack(A.clamp((t - tw) / 0.3), 2.3);
  const tc = tw + 0.083;                                      // cap 2.5 frames after the walls start
  const cap = t < tc ? 0 : A.spring(t - tc, 26, 0.45);
  const capY = t < tc ? 0.4 : 0.4 * Math.max(0, 1 - A.easeOutCubic((t - tc) / 0.12));
  return { vis: true, y: yb, sy: Math.max(0, sy), sxz: 1, cap, capY };
}
function dormantState(t, tl) {
  const dr = A.drop(t - tl, 0.32, 3.2, 0, 0.05);
  return { vis: !!dr.vis, y: dr.y, sy: dr.sy, sxz: dr.sxz, cap: 1, capY: 0 };
}
function gableGeo(w, d, rh, ov = 0.06, along = 'z') {
  const sh = new THREE.Shape();
  const a = (along === 'z' ? w : d) / 2 + ov;
  sh.moveTo(-a, 0); sh.lineTo(a, 0); sh.lineTo(0, rh); sh.closePath();
  const L = (along === 'z' ? d : w) + 2 * ov;
  const g = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false });
  g.translate(0, 0, -L / 2);
  if (along === 'x') g.rotateY(Math.PI / 2);
  return g;
}
function makeBuilding(o) {
  const b = { x: o.x, z: o.z, w: o.w, d: o.d, h: o.h, y0: TILE_H, tRev: o.tRev ?? 99, state: null };
  const root = new THREE.Group(); root.position.set(o.x, 0, o.z); island.add(root);
  const walls = new THREE.Group(); root.add(walls);
  const cap = new THREE.Group(); root.add(cap);
  const dormant = o.mode === 'dormant';
  const wallM = dormant ? rmat(PAL.dorm, o.wall, b.tRev) : std(o.wall);
  const wl = mesh(rbox(o.w, o.h, o.d, 0.03), wallM); walls.add(wl);
  if (o.band) { const bm = dormant ? rmat(PAL.dormDark, o.band, b.tRev) : std(o.band); const bd = mesh(rbox(o.w + 0.02, 0.07, o.d + 0.02, 0.02), bm); bd.position.y = 0.0; walls.add(bd); }
  // roof / cap
  const roofCol = o.roof?.col || PAL.red;
  const roofM = dormant ? rmat(PAL.dormDark, roofCol, b.tRev) : std(roofCol, { rough: 0.6 });
  if (o.roof?.type === 'gable') {
    const g = mesh(gableGeo(o.w, o.d, o.roof.h ?? 0.38, 0.06, o.roof.along ?? 'z'), [std(dormant ? PAL.dorm : o.wall), roofM]);
    if (dormant) { g.material[0] = wallM; }
    cap.add(g);
  } else if (o.roof?.type === 'flat') {
    const p = mesh(rbox(o.w + 0.06, 0.08, o.d + 0.06, 0.025), roofM); cap.add(p);
    if (o.roof.ac) { const ac = mesh(rbox(0.22, 0.12, 0.2, 0.03), std(dormant ? PAL.dormMid : PAL.ivory)); ac.position.set(-o.w * 0.18, 0.08, -o.d * 0.15); cap.add(ac); }
  } else if (o.roof?.type === 'saw') {
    const n = 3; const tw = o.w / n;
    for (let k = 0; k < n; k++) {
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(tw, 0); sh.lineTo(tw, 0.36); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: o.d + 0.06, bevelEnabled: false }); g.translate(-o.w / 2 + k * tw, 0, -(o.d + 0.06) / 2);
      const sm = mesh(g, [roofM, roofM]); cap.add(sm);
      const glass = mesh(box(0.025, 0.3, o.d), dormant ? rmat(PAL.dormWin, PAL.gold, b.tRev + 0.15) : std(PAL.gold)); glass.position.set(-o.w / 2 + (k + 1) * tw - 0.02, 0.02, 0); cap.add(glass);
    }
  }
  if (o.extra) o.extra(cap, walls, dormant ? (d, l, dt = 0, oo) => rmat(d, l, b.tRev + dt, oo) : (d, l, dt, oo) => std(l, oo));
  if (o.win !== false) addWindows(b, o.win || {});
  b.update = (t) => {
    const st = dormant ? dormantState(t, o.tLand) : growState(t, o.tg);
    b.state = st;
    root.visible = st.vis;
    root.position.y = TILE_H + st.y;
    const pop = dormant && t > b.tRev ? 1 + 0.08 * Math.sin(Math.PI * A.clamp((t - b.tRev) / 0.2)) : 1;   // 6-frame pop when its stream connects
    root.scale.setScalar(pop);
    walls.scale.set(st.sxz, Math.max(1e-4, st.sy), st.sxz);
    cap.position.y = o.h * st.sy + st.capY;
    const cs = Math.max(1e-4, st.cap);
    cap.scale.set(cs, cs, cs); cap.visible = st.cap > 0.001;
  };
  on(b.update);
  buildings.push(b);
  return { b, root, walls, cap };
}

// ---------------------------------------------------------------- the four dormant assets
const D = cues.dormant, S = cues.streams, TR = cues.stream_travel;
const revAt = (k) => S[k] + TR;
// empty office tower (back)
const tower = makeBuilding({
  mode: 'dormant', x: -3.5, z: -3.5, w: 1.55, d: 1.55, h: 3.2, wall: PAL.ivory, band: PAL.gold, tLand: D.tower, tRev: revAt('tower'),
  roof: { type: 'flat', col: PAL.red }, win: { floor: 0.26, colW: 0.2, ww: 0.09, wh: 0.15, litFrac: 0.82 },
  extra: (cap, walls, M) => {
    const crown = mesh(rbox(1.0, 0.36, 1.0, 0.04), M(PAL.dormMid, PAL.ivory2)); crown.position.y = 0.08; cap.add(crown);
    const spire = mesh(cyl(0.02, 0.05, 0.75, 12), M(PAL.dormDark, PAL.gold, 0, { metal: 0.6, rough: 0.3 })); spire.position.y = 0.44; cap.add(spire);
    const orb = mesh(new THREE.SphereGeometry(0.07, 16, 12), M(PAL.dormDark, PAL.gold, 0.1, { metal: 0.6, rough: 0.3 })); orb.position.y = 1.22; cap.add(orb);
  },
});
// silent factory (left): sawtooth hall + banded chimney + smoke when revived
const factory = makeBuilding({
  mode: 'dormant', x: -3.5, z: 3.6, w: 1.75, d: 1.5, h: 0.75, wall: PAL.peach, band: PAL.red, tLand: D.factory, tRev: revAt('factory'),
  roof: { type: 'saw', col: PAL.red }, win: { floor: 0.5, colW: 0.3, ww: 0.16, wh: 0.22, y0: 0.12, top: 0.1, litFrac: 1 },
  extra: (cap, walls, M) => {
    const ch = new THREE.Group(); ch.position.set(-0.55, 0, -0.5); walls.add(ch);
    const c1 = mesh(cyl(0.16, 0.2, 2.1, 24), M(PAL.dorm, PAL.ivory)); ch.add(c1);
    for (const y of [1.2, 1.7]) { const bnd = mesh(cyl(0.175, 0.178, 0.16, 24), M(PAL.dormDark, PAL.red)); bnd.position.y = y; ch.add(bnd); }
  },
});
// machines (right): a lathe, a C-frame press and a clean 12-tooth gear on a workshop plinth
function gearGeo(R, r0, teeth, th) {
  const sh = new THREE.Shape();
  for (let k = 0; k < teeth * 4; k++) {
    const a = (k / (teeth * 4)) * Math.PI * 2, rr = (k % 4 === 1 || k % 4 === 2) ? R : R * 0.8;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr; k ? sh.lineTo(x, y) : sh.moveTo(x, y);
  }
  sh.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, r0, 0, Math.PI * 2, true); sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 16 });
  g.translate(0, 0, -th / 2); return g;
}
const machines = makeBuilding({
  mode: 'dormant', x: 3.5, z: -3.5, w: 1.6, d: 1.5, h: 0.22, wall: PAL.ivory2, band: PAL.gold, tLand: D.machines, tRev: revAt('machines'),
  roof: { type: 'flat', col: PAL.ivory }, win: false,
  extra: (cap, walls, M) => {
    const R = revAt('machines');
    // lathe along X (front-left)
    const bed = mesh(rbox(1.15, 0.16, 0.34, 0.03), M(PAL.dormMid, PAL.red)); bed.position.set(0.0, 0.08, 0.38); cap.add(bed);
    const legs = mesh(rbox(1.0, 0.08, 0.28, 0.02), M(PAL.dormDark, PAL.redDeep)); legs.position.set(0.0, 0.06, 0.38); cap.add(legs);
    const head = mesh(rbox(0.3, 0.32, 0.34, 0.04), M(PAL.dorm, PAL.ivory)); head.position.set(-0.4, 0.24, 0.38); cap.add(head);
    const tail = mesh(rbox(0.16, 0.2, 0.24, 0.03), M(PAL.dorm, PAL.ivory)); tail.position.set(0.45, 0.24, 0.38); cap.add(tail);
    const chuck = new THREE.Group(); chuck.position.set(-0.2, 0.42, 0.38); cap.add(chuck);
    const ch = mesh(cyl(0.12, 0.12, 0.1, 28), M(PAL.dormDark, PAL.gold)); ch.rotation.z = -Math.PI / 2; chuck.add(ch);
    const bar = mesh(cyl(0.035, 0.035, 0.55, 14), M(PAL.dormMid, PAL.ivory3)); bar.rotation.z = -Math.PI / 2; bar.position.x = 0.1; chuck.add(bar);
    // press (back-right): column + arm + moving ram
    const col = mesh(rbox(0.26, 0.86, 0.3, 0.03), M(PAL.dormMid, PAL.peach)); col.position.set(0.48, 0.08, -0.32); cap.add(col);
    const arm = mesh(rbox(0.56, 0.18, 0.3, 0.03), M(PAL.dormMid, PAL.peach)); arm.position.set(0.28, 0.76, -0.32); cap.add(arm);
    const anvil = mesh(rbox(0.36, 0.12, 0.3, 0.02), M(PAL.dormDark, PAL.ink)); anvil.position.set(0.16, 0.08, -0.32); cap.add(anvil);
    const ram = mesh(cyl(0.07, 0.07, 0.3, 18), M(PAL.dormDark, PAL.gold)); ram.position.set(0.14, 0.45, -0.32); cap.add(ram);
    // gear (left face), clean extruded teeth
    const gear = mesh(gearGeo(0.3, 0.07, 12, 0.07), M(PAL.dormDark, PAL.gold)); gear.position.set(-0.45, 0.42, -0.2); cap.add(gear);
    const gear2 = mesh(gearGeo(0.18, 0.05, 9, 0.07), M(PAL.dormDark, PAL.red)); gear2.position.set(-0.45 + 0.42, 0.42 + 0.2, -0.2); cap.add(gear2);
    on((t) => {
      const k = A.smooth(A.inv(R, R + 0.5, t)), w = Math.max(0, t - R);
      gear.rotation.z = -w * 2.2 * k; gear2.rotation.z = w * 2.2 * (0.3 / 0.18) * k + 0.17;
      chuck.rotation.x = w * 9 * k;
      ram.position.y = 0.45 - 0.17 * k * Math.pow(Math.max(0, Math.sin(w * 5.5)), 4);
    });
    const cr = mesh(rbox(0.3, 0.3, 0.3, 0.03), M(PAL.dorm, PAL.ivory)); cr.position.set(-0.35, 0, -0.5); cap.add(cr);
  },
});
// jade bracelet on a plinth (front)
const JADE = { x: 3.6, z: 3.4 };
const jade = makeBuilding({
  mode: 'dormant', x: JADE.x, z: JADE.z, w: 1.0, d: 1.0, h: 0.42, wall: PAL.ivory, band: PAL.gold, tLand: D.jade, tRev: revAt('jade'), win: false,
  roof: { type: 'flat', col: PAL.red },
  extra: (cap, walls, M) => {
    const cush = mesh(rbox(0.66, 0.12, 0.66, 0.06), M(PAL.dormMid, PAL.redDeep)); cush.position.y = 0.08; cap.add(cush);
    const jm = new THREE.MeshPhysicalMaterial({ color: C(PAL.dorm), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.0 });
    revs.push({ m: jm, c0: C(PAL.dorm), c1: C('#F3EEDF'), t: revAt('jade'), flash: 0.8 });
    const tor = mesh(new THREE.TorusGeometry(0.27, 0.075, 28, 72), jm);
    const tg = new THREE.Group(); tg.position.y = 0.48; cap.add(tg); tg.add(tor);
    tor.rotation.set(0.0, Math.PI / 4, 0);
    const gold = mesh(new THREE.TorusGeometry(0.27, 0.083, 16, 72, Math.PI * 0.18), M(PAL.dormDark, PAL.gold, 0, { metal: 0.7, rough: 0.25 }));
    gold.rotation.copy(tor.rotation); gold.rotateZ(-Math.PI * 0.09 - Math.PI / 2); tg.add(gold);
    on((t) => { const r = revAt('jade'); tg.rotation.y = t > r ? (t - r) * 0.9 * A.smooth(A.inv(r, r + 0.8, t)) : 0; tg.position.y = 0.48 + (t > r ? 0.05 * Math.sin((t - r) * 2.6) * A.smooth(A.inv(r, r + 0.5, t)) : 0); });
    for (const [bx, bz] of [[-0.42, 0.42], [0.42, 0.42], [0.42, -0.42], [-0.42, -0.42]]) {
      const bo = mesh(cyl(0.03, 0.03, 0.28, 10), M(PAL.dormDark, PAL.gold, 0, { metal: 0.6, rough: 0.3 })); bo.position.set(bx, -0.42 + 0.02, bz); cap.add(bo);
    }
  },
});

// jade revival glint: a 4-point gold star sweeps across the bracelet (and once more in the end hold)
{
  const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFF3C8').multiplyScalar(1.8) });
  const star = new THREE.Group(); island.add(star); star.layers.set(L_FX);
  for (const [sx, sy] of [[0.05, 0.6], [0.6, 0.05]]) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), gm); m.scale.set(sx, sy, 0.05); m.layers.set(L_FX); star.add(m); }
  star.lookAt(DIR); // faces the camera
  const T = [revAt('jade') + 0.05, 9.15];
  on((t) => {
    let s = 0, k0 = 0;
    for (const t0 of T) { const u = (t - t0) / 0.32; if (u > 0 && u < 1) { s = Math.sin(Math.PI * u); k0 = u; } }
    star.visible = s > 0.01;
    star.scale.setScalar(Math.max(1e-4, s * 0.9));
    star.position.set(JADE.x - 0.25 + 0.5 * k0, TILE_H + 1.2 + 0.1 * k0, JADE.z + 0.25 - 0.5 * k0);
    star.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), DIR); star.rotateZ(k0 * 0.8);
  });
}
// ---------------------------------------------------------------- new growth: houses, warehouses, trees (grow with the flood)
const growT = (x, z, j = 0) => floodAt(Math.hypot(x, z)) + 0.06 + j;
const HOUSES = [   // round 2: 40 % fewer, red carries the roofs, gold roofs only twice
  [-1, -4, 0.75, 'gable', PAL.ivory, PAL.red], [-4, -1, 0.95, 'flat', PAL.ivory, PAL.red], [-5, -2, 0.6, 'gable', PAL.peach, PAL.red],
  [-3, -5.0, 1.15, 'flat', PAL.ivory2, PAL.red],
  [1, -4, 0.85, 'flat', PAL.ivory, PAL.gold], [4, -1, 0.8, 'gable', PAL.ivory, PAL.red], [5, -2, 0.62, 'flat', PAL.peach, PAL.red],
  [-1, 4, 0.7, 'gable', PAL.ivory, PAL.red], [-5, 2, 0.75, 'gable', PAL.ivory, PAL.red], [-2, 5, 0.55, 'flat', PAL.peach, PAL.red],
  [4, 1, 0.55, 'flat', PAL.ivory, PAL.gold], [5, 2, 0.45, 'gable', PAL.peach, PAL.red], [-4, 1, 0.55, 'flat', PAL.ivory2, PAL.red],
];
HOUSES.forEach(([x, z, h, rt, wall, rc], n) => {
  makeBuilding({
    mode: 'grow', x, z, w: 0.74, d: 0.74, h, wall, tg: growT(x, z, A.hash(n * 3.7) * 0.08), tRev: growT(x, z, 0.12),
    roof: { type: rt, col: rc, h: 0.32, along: n % 2 ? 'x' : 'z', ac: rt === 'flat' }, win: { floor: 0.26, colW: 0.2, ww: 0.08, wh: 0.11, y0: 0.1, top: 0.08 },
  });
});
// gold ginkgo trees
const TREES = [[-2, -3], [-3, -2], [2, -3], [3, -1], [-2, 3], [-3, 1], [1, 3], [3, 2], [5, 1.0], [-6, -1], [-2, -4], [4, -2], [-4, 2], [-1, 5], [2, 6], [-6, 1], [1, -6], [-1, -6]];
{
  const trunkG = cyl(0.035, 0.05, 0.22, 8), crownG = new THREE.IcosahedronGeometry(0.21, 1);
  const crownM = std('#F2D9C4', { rough: 0.7 }), crownM2 = std('#F8EDE0', { rough: 0.7 }), trunkM = std('#B98F78');   // r2: gold is reserved for the hero accents
  TREES.forEach(([x, z], n) => {
    const g = new THREE.Group(); island.add(g);
    const ox = (A.hash(n * 5.1) - 0.5) * 0.25, oz = (A.hash(n * 9.3) - 0.5) * 0.25;
    g.position.set(x + ox, TILE_H, z + oz);
    const tr = mesh(trunkG, trunkM); g.add(tr);
    const cr = mesh(crownG, n % 3 ? crownM : crownM2); cr.position.y = 0.33; cr.scale.set(1, 1.15, 1); g.add(cr);
    const s2 = 0.75 + A.hash(n * 2.2) * 0.45;
    const tg = growT(x, z, 0.03 + A.hash(n) * 0.1);
    on((t) => { const s = t < tg ? 0 : A.spring(t - tg, 22, 0.42) * s2; g.scale.setScalar(Math.max(1e-4, s)); g.visible = s > 0.001; const ts = tileState({ i: x, j: z, d: Math.hypot(x, z), ax: 1 }, t); g.position.y = TILE_H + ts.y; cr.rotation.y = Math.sin(t * 1.3 + n) * 0.08; });
  });
}

// ---------------------------------------------------------------- courthouse (grows at the strike point)
const CT = cues.court;
const court = new THREE.Group(); island.add(court); court.position.y = TILE_H;
const courtParts = [];
{
  const ivory = std(PAL.ivory, { rough: 0.7 }), ivory2 = std(PAL.ivory2), red = std(PAL.red, { rough: 0.55 }), gold = std(PAL.gold, { rough: 0.3, metal: 0.55, env: 0.9 });
  const podium = new THREE.Group(); court.add(podium);
  podium.add(mesh(rbox(2.7, 0.18, 2.7, 0.04), ivory2));
  const p2 = mesh(rbox(2.4, 0.14, 2.45, 0.03), ivory); p2.position.y = 0.18; podium.add(p2);
  for (let k = 0; k < 3; k++) { const st = mesh(box(0.14, 0.32 - k * 0.1, 1.5), ivory); st.position.set(1.27 + k * 0.13, 0, 0); podium.add(st); }
  courtParts.push({ g: podium, kind: 'land', t: CT.base });
  const cella = new THREE.Group(); cella.position.y = 0.32; court.add(cella);
  const cm = mesh(rbox(1.45, 1.0, 2.0, 0.03), ivory); cm.position.x = -0.35; cella.add(cm);
  // door
  const door = mesh(box(0.02, 0.5, 0.4), std(PAL.red)); door.position.set(0.381, 0, 0); cella.add(door);
  courtParts.push({ g: cella, kind: 'wall', t: CT.walls });
  const colG = new THREE.Group(); colG.position.y = 0.32; court.add(colG);
  const cols = [];
  [-0.84, -0.42, 0, 0.42, 0.84].forEach((z, k) => {
    const c = new THREE.Group(); c.position.set(0.88, 0, z); colG.add(c);
    c.add(mesh(cyl(0.085, 0.095, 1.0, 20), ivory));
    const capT = mesh(box(0.24, 0.05, 0.24), ivory2); capT.position.y = 0.95; c.add(capT);
    cols.push({ g: c, t: CT.cols + k * 0.035 });
  });
  const beam = new THREE.Group(); beam.position.y = 1.32; court.add(beam);
  beam.add(mesh(rbox(2.1, 0.17, 2.25, 0.02), ivory));
  const frieze = mesh(box(2.12, 0.05, 2.27), gold); frieze.position.y = 0.05; beam.add(frieze);
  beam.position.x = -0.05;
  courtParts.push({ g: beam, kind: 'cap', t: CT.beam });
  const roof = new THREE.Group(); roof.position.set(-0.05, 1.49, 0); court.add(roof);
  const ped = mesh(gableGeo(2.1, 2.3, 0.62, 0.05, 'x'), [ivory, red]); roof.add(ped);
  // emblem: the logo on the tympanum (+X face), rebuilt from the vector logo
  const em = canvasTex(512, 512, (g) => drawLogo(g, 256, 256, 250));
  const emb = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), new THREE.MeshBasicMaterial({ map: em.t }));
  emb.rotation.y = Math.PI / 2; emb.position.set(1.137, 0.24, 0); roof.add(emb);
  const fin = mesh(new THREE.SphereGeometry(0.06, 16, 12), gold); fin.position.set(1.1, 0.64, 0); roof.add(fin);
  courtParts.push({ g: roof, kind: 'roof', t: CT.roof });
  on((t) => {
    for (const p of courtParts) {
      if (p.kind === 'land') { const s = A.drop(t - p.t, 0.18, 1.2, 0, 0.04); p.g.visible = !!s.vis; p.g.position.y = s.y; p.g.scale.set(s.sxz, s.sy, s.sxz); }
      else if (p.kind === 'wall') { const s = t < p.t ? 0 : A.easeOutBack(A.clamp((t - p.t) / 0.3), 2.0); p.g.visible = s > 0.001; p.g.scale.set(1, Math.max(1e-4, s), 1); }
      else if (p.kind === 'cap') { const s = t < p.t ? 0 : A.spring(t - p.t, 26, 0.45); p.g.visible = s > 0.001; p.g.scale.set(Math.max(1e-4, s), 1, Math.max(1e-4, s)); p.g.position.y = 1.32 + (t < p.t ? 0 : 0.3 * Math.max(0, 1 - A.easeOutCubic((t - p.t) / 0.1))); }
      else if (p.kind === 'roof') { const s = A.drop(t - p.t, 0.16, 1.0, 0, 0.05); p.g.visible = !!s.vis; p.g.position.y = 1.49 + s.y; p.g.scale.set(s.sxz, s.sy, s.sxz); }
    }
    for (const c of cols) { const s = t < c.t ? 0 : A.easeOutBack(A.clamp((t - c.t) / 0.24), 2.2); c.g.visible = s > 0.001; c.g.scale.set(1, Math.max(1e-4, s), 1); }
    const es = t < CT.emblem ? 0 : A.spring(t - CT.emblem, 24, 0.4); emb.scale.setScalar(Math.max(1e-4, es));
    emb.material.color.setScalar(1 + 0.6 * (t > CT.emblem ? Math.exp(-(t - CT.emblem) / 0.15) : 0));
  });
}
const COURT_TOP = new THREE.Vector3(-0.05, 2.4, 0);

// ---------------------------------------------------------------- the gavel (from the logo): drops in, strikes the seal, leaves
const gavel = new THREE.Group(); island.add(gavel);
const gavelPivot = new THREE.Group(); gavel.add(gavelPivot);
{
  const k = 0.0063, gm = std(PAL.gold, { rough: 0.32, metal: 0.45, env: 1.0 });
  const hd = LOGO.head, cp = LOGO.cap, hl = LOGO.handle;
  const bodyR = (hd.x1 - hd.x0) / 2 * k, bodyH = (hd.y1 - hd.y0) * k, capR = (cp.x1 - cp.x0) / 2 * k, capH = cp.h * k, gap = (hd.y0 - cp.yTop - cp.h) * k;
  const head = new THREE.Group();
  const tot = bodyH + 2 * (gap + capH);
  const body = mesh(rcyl(bodyR, bodyH, hd.r * k), gm); body.position.y = -bodyH / 2; head.add(body);
  for (const sgn of [1, -1]) {
    const c = mesh(rcyl(capR, capH, cp.r * k * 0.9), gm); c.position.y = sgn > 0 ? bodyH / 2 + gap : -bodyH / 2 - gap - capH; head.add(c);
    const n = mesh(cyl(bodyR * 0.55, bodyR * 0.55, gap + 0.02, 24), gm); n.position.y = sgn > 0 ? bodyH / 2 - 0.01 : -bodyH / 2 - gap - 0.01; head.add(n);
  }
  const L = 2.1, hr = (hl.y1 - hl.y0) / 2 * k;
  const handle = mesh(new THREE.CylinderGeometry(hr, hr * 1.05, L, 20), gm); handle.rotation.z = -Math.PI / 2; handle.position.x = L / 2; head.add(handle);
  const knob = mesh(new THREE.SphereGeometry(hr * 1.25, 18, 12), gm); knob.position.x = L; head.add(knob);
  head.position.x = -L;           // pivot (hand) at the handle end
  gavelPivot.add(head);
  gavel.userData = { L, half: tot / 2 };
  gavel.rotation.order = 'YXZ'; gavel.rotation.y = Math.PI / 4;   // handle points screen-right, as in the logo
}
// two strikes: the hook (on the seal, 0.30) and the 落槌 on the auction screen (5.80). Each: 3-frame raised hold,
// 6-frame cubic ease-in swing about the hand (last 2 frames carry ~70 % of the travel), squash on contact, recoil, exit up-right.
function strikePose(t, S0, headPos, enter) {
  const { L } = gavel.userData;
  const W0 = S0 - 0.2;
  let th, dy, dx = 0, vis = true;
  if (t < W0) { th = -0.95; dy = 0.9 + (enter ? 7 * Math.pow(1 - A.clamp((t - (W0 - 0.22)) / 0.22), 3) : 0) + 0.03 * Math.sin(t * 9); }
  else if (t < S0) { const u = (t - W0) / 0.2, e = u * u * u; th = -0.95 * (1 - e); dy = 0.9 * (1 - e); }
  else {
    const u = t - S0;
    th = -0.3 * Math.sin(Math.PI * Math.min(u, 0.1) / 0.2) - 0.6 * A.easeInCubic(A.clamp((u - 0.1) / 0.22));
    dy = 0.35 * Math.sin(Math.PI * Math.min(u, 0.1) / 0.2) + 10 * Math.pow(A.clamp((u - 0.08) / 0.24), 2);
    dx = 2.5 * Math.pow(A.clamp((u - 0.08) / 0.24), 2);
    if (u > 0.34) vis = false;
  }
  _v.copy(R_).multiplyScalar(L + dx);
  return { vis, x: headPos.x + _v.x, y: headPos.y + dy, z: headPos.z + _v.z, th };
}
on((t) => {
  const { half } = gavel.userData;
  const G2 = cues.gavel2[1];
  let p, S0;
  if (t < 2) { S0 = cues.strike; p = strikePose(t, S0, new THREE.Vector3(0, TILE_H + 0.06 + half, 0), false); }
  else {
    S0 = G2;
    const topY = SCREEN_P.y + (SH_ + 0.16) / 2 + 0.06 * Math.sin(S0 * 1.9) + half;
    p = strikePose(t, S0, new THREE.Vector3(SCREEN_P.x, topY, SCREEN_P.z), true);
    if (t < G2 - 0.45) p.vis = false;
  }
  gavel.visible = p.vis;
  gavel.position.set(p.x, p.y, p.z);
  gavelPivot.rotation.z = p.th;
  const u = t - S0, sq = u > 0 ? Math.exp(-u / 0.045) : 0;
  gavelPivot.scale.set(1 + 0.06 * sq, 1 - 0.1 * sq, 1 + 0.06 * sq);
});

// ---------------------------------------------------------------- data streams: gold arcs courthouse -> each asset
const streamTargets = {
  factory: new THREE.Vector3(-3.4, 1.35, 3.5), machines: new THREE.Vector3(3.3, 1.45, -3.6),
  tower: new THREE.Vector3(-3.5, 4.0, -3.5), jade: new THREE.Vector3(JADE.x, 1.3, JADE.z),
};
const streams = [];
{
  const sm = new THREE.MeshBasicMaterial({ color: C('#F2C83A') });
  const haloM = new THREE.MeshBasicMaterial({ color: C(PAL.gold), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
  const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.gold).multiplyScalar(2.6) });
  for (const [k, p1] of Object.entries(streamTargets)) {
    const p0 = COURT_TOP.clone();
    const mid = p0.clone().lerp(p1, 0.5); mid.y = Math.max(p0.y, p1.y) + 1.15;
    // r2: tower and jade arcs swing out to screen-right so they never run down the tower facade or the pediment
    if (k === 'tower') mid.set(1.6, 6.3, -4.2);
    if (k === 'jade') mid.set(4.2, 3.4, -0.6);
    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
    const SEG = 80, RAD = 6;
    const geo = new THREE.TubeGeometry(curve, SEG, 0.028, RAD, false);
    const tube = new THREE.Mesh(geo, sm); tube.layers.set(L_FX); island.add(tube);
    const hgeo = new THREE.TubeGeometry(curve, SEG, 0.075, RAD, false);
    const halo = new THREE.Mesh(hgeo, haloM); halo.layers.set(L_FX); island.add(halo);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), pm); head.layers.set(L_FX); island.add(head);
    const beads = [0, 1, 2].map(() => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), pm); b.layers.set(L_FX); island.add(b); return b; });
    const t0 = S[k];
    streams.push({ k, curve });
    on((t) => {
      const u = A.easeInOutCubic(A.clamp((t - t0) / TR));
      const n = Math.floor(u * SEG);
      geo.setDrawRange(0, n * RAD * 6); hgeo.setDrawRange(0, n * RAD * 6);
      tube.visible = t > t0 && n > 0; halo.visible = tube.visible;
      head.visible = t > t0 && t < t0 + TR + 0.05;
      if (head.visible) head.position.copy(curve.getPoint(Math.min(1, u)));
      beads.forEach((b, i) => {
        const age = t - t0 - TR;
        b.visible = age > 0.1 + i * 0.15;
        if (b.visible) b.position.copy(curve.getPoint(((age * 0.55 + i / 3) % 1)));
      });
    });
  }
}

// ---------------------------------------------------------------- trucks on the ring road
{
  const RS = 2, RC = 0.55;      // ring half-size, corner radius
  const per = 8 * RS - 8 * RC + 2 * Math.PI * RC;
  function ringAt(s) {
    s = ((s % per) + per) % per;
    const st = 2 * RS - 2 * RC, arc = Math.PI * RC / 2;
    const seg = [[-RS + RC, RS, 1, 0], [RS, RS - RC, 0, -1], [RS - RC, -RS, -1, 0], [-RS, -RS + RC, 0, 1]]; // start x,z + dir
    const cn = [[RS - RC, RS - RC, 0], [RS - RC, -RS + RC, Math.PI / 2], [-RS + RC, -RS + RC, Math.PI], [-RS + RC, RS - RC, Math.PI * 1.5]];
    for (let k = 0; k < 4; k++) {
      if (s < st) { const [x, z, dx, dz] = seg[k]; return { x: x + dx * s, z: z + dz * s, a: Math.atan2(-dz, dx) }; }
      s -= st;
      if (s < arc) { const [cx, cz, a0] = cn[k]; const a = a0 + s / RC; return { x: cx + RC * Math.sin(a), z: cz + RC * Math.cos(a), a: 0 }; }
      s -= arc;
    }
    return { x: 0, z: 0, a: 0 };
  }
  // heading from finite differences (robust)
  const posAt = (s) => { const a = ringAt(s), b = ringAt(s + 0.02); return { x: a.x, z: a.z, a: Math.atan2(-(b.z - a.z), b.x - a.x) }; };
  const trucks = [0, 1, 2].map((n) => {
    const g = new THREE.Group(); island.add(g);
    const body = new THREE.Group(); g.add(body);
    const ch = mesh(rbox(0.5, 0.06, 0.24, 0.02), std(PAL.ink)); ch.position.y = 0.04; body.add(ch);
    const cab = mesh(rbox(0.16, 0.2, 0.22, 0.04), std(n === 1 ? PAL.gold : PAL.red, { rough: 0.5 })); cab.position.set(0.17, 0.08, 0); body.add(cab);
    const ws = mesh(box(0.02, 0.08, 0.17), std(PAL.ink, { rough: 0.2 })); ws.position.set(0.25, 0.17, 0); body.add(ws);
    const cargo = mesh(rbox(0.3, 0.24, 0.24, 0.03), std(n === 1 ? PAL.ivory : PAL.ivory2)); cargo.position.set(-0.08, 0.08, 0); body.add(cargo);
    const stripe = mesh(box(0.31, 0.04, 0.245), std(n === 1 ? PAL.red : PAL.gold)); stripe.position.set(-0.08, 0.2, 0); body.add(stripe);
    return { g, body, s0: n * per / 3 };
  });
  on((t) => {
    for (const [n, tr] of trucks.entries()) {
      const ti = cues.trucks + n * 0.12;
      const land = A.drop(t - ti, 0.22, 1.4, 0, 0.04);
      const u = Math.max(0, t - ti - 0.15);
      const s = tr.s0 + 1.35 * (u < 0.6 ? u * u / 1.2 : u - 0.3);
      const p = posAt(s);
      tr.g.visible = !!land.vis;
      tr.g.position.set(p.x, TILE_H + land.y + 0.005, p.z);
      tr.g.rotation.y = p.a;
      tr.body.scale.set(land.sxz, land.sy, land.sxz);
      tr.body.position.y = 0.006 * Math.sin(t * 40 + n) * A.smooth(A.inv(ti, ti + 0.5, t));
    }
  });
}

// ---------------------------------------------------------------- factory smoke puffs (revived)
{
  const pm = std('#FFFBF4', { rough: 0.95 });
  const base = new THREE.Vector3(-3.5 - 0.55, TILE_H + 2.12, 3.6 - 0.5);
  const puffs = [0, 1, 2, 3, 4].map(() => { const m = mesh(new THREE.IcosahedronGeometry(0.16, 2), pm, false); island.add(m); return m; });
  on((t) => {
    const t0 = revAt('factory') + 0.2;
    puffs.forEach((p, i) => {
      const life = 1.7, per = 0.34;
      const age = ((t - t0 - i * per) % life + life) % life;
      const born = t - t0 - i * per;
      p.visible = born > 0;
      const k = age / life;
      p.position.set(base.x - 0.35 * k + 0.05 * Math.sin(age * 3 + i), base.y + 1.0 * k + 0.05, base.z + 0.15 * k);
      const s = Math.sin(Math.PI * Math.min(1, k * 1.1)) * (0.6 + 0.8 * k);
      p.scale.setScalar(Math.max(1e-4, s));
    });
  });
}

// ================================================================== live-auction screen (floating iso panel, faces +X)
const SCREEN_P = new THREE.Vector3(1.6, 4.3, -3.6);
const screen = new THREE.Group(); island.add(screen); screen.position.copy(SCREEN_P);
const scrFlip = new THREE.Group(); screen.add(scrFlip);
const SW_ = 3.5, SH_ = 2.18;
const scrTex = canvasTex(1024, 640);
const dealTex = canvasTex(1024, 640, (g, w, h) => {
  g.fillStyle = PAL.red; g.fillRect(0, 0, w, h);
  g.strokeStyle = PAL.gold; g.lineWidth = 10; g.strokeRect(30, 30, w - 60, h - 60);
  g.lineWidth = 3; g.strokeRect(50, 50, w - 100, h - 100);
  g.fillStyle = PAL.gold; g.font = `900 330px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillText('成交', w / 2, h / 2 + 118);
});
const BIDS = cues.bids;
function drawScreen(t) {
  const g = scrTex.g, w = 1024, h = 640;
  g.fillStyle = PAL.ink; g.fillRect(0, 0, w, h);
  // live dot
  const blink = 0.55 + 0.45 * Math.cos(t * 7);
  g.fillStyle = PAL.red; g.globalAlpha = blink; g.beginPath(); g.arc(78, 78, 22, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = PAL.red; g.lineWidth = 5; g.globalAlpha = 0.6 * (1 - ((t * 1.4) % 1)); g.beginPath(); g.arc(78, 78, 22 + 30 * ((t * 1.4) % 1), 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  // mini logo top-right
  drawLogo(g, w - 80, 78, 38);
  // rising bid bars
  const n = BIDS.length, x0 = 90, bw = 82, gapB = 22, yb = h - 70;
  g.fillStyle = 'rgba(232,188,31,0.16)'; g.fillRect(x0 - 20, yb + 8, n * (bw + gapB) + 20, 4);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const tb = BIDS[i];
    const k = t < tb ? 0 : A.easeOutBack(A.clamp((t - tb) / 0.18), 1.6);
    const hh = (110 + i * 48 + (i > 5 ? 30 : 0)) * k;
    const x = x0 + i * (bw + gapB);
    const fresh = t > tb ? Math.exp(-(t - tb) / 0.18) : 0;
    g.fillStyle = i === n - 1 || fresh > 0.2 ? '#FFE07A' : PAL.gold;
    g.globalAlpha = 0.55 + 0.45 * (i === n - 1 ? 1 : Math.min(1, 0.5 + i * 0.07));
    if (hh > 1) { g.beginPath(); g.roundRect(x, yb - hh, bw, hh, 8); g.fill(); }
    g.globalAlpha = 1;
    if (k > 0.5) pts.push([x + bw / 2, yb - hh - 26]);
  }
  if (pts.length > 1) {
    g.strokeStyle = '#FFF2C4'; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    const [lx, ly] = pts[pts.length - 1]; g.fillStyle = '#FFF2C4'; g.beginPath(); g.arc(lx, ly, 11, 0, Math.PI * 2); g.fill();
  }
  // bid pulse flash
  let fl = 0; for (const tb of BIDS) if (t > tb) fl = Math.max(fl, Math.exp(-(t - tb) / 0.08));
  if (fl > 0.01) { g.fillStyle = `rgba(232,188,31,${0.14 * fl})`; g.fillRect(0, 0, w, h); }
  scrTex.t.needsUpdate = true;
}
{
  const frameM = std(PAL.ink, { rough: 0.45 });
  const fr = mesh(rbox(0.14, SH_ + 0.16, SW_ + 0.16, 0.05), frameM); fr.position.y = -(SH_ + 0.16) / 2; scrFlip.add(fr);
  const goldEdge = mesh(box(0.15, 0.03, SW_ + 0.17), std(PAL.gold, { metal: 0.5, rough: 0.3 })); goldEdge.position.y = (SH_ + 0.16) / 2 - 0.03; scrFlip.add(goldEdge);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(SW_, SH_), new THREE.MeshBasicMaterial({ map: scrTex.t }));
  front.rotation.y = Math.PI / 2; front.position.x = 0.072; scrFlip.add(front);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(SW_, SH_), new THREE.MeshBasicMaterial({ map: dealTex.t }));
  back.rotation.y = -Math.PI / 2; back.position.x = -0.072; scrFlip.add(back);
  // stand: a thin gold mast down to the machines block
  const T0 = cues.screen_in, TD = cues.deal;
  on((t) => {
    const s = t < T0 ? 0 : A.spring(t - T0, 20, 0.5);
    screen.visible = s > 0.002;
    screen.scale.setScalar(Math.max(1e-4, s));
    screen.position.y = SCREEN_P.y + 0.06 * Math.sin(t * 1.9) * A.smooth(A.inv(T0, T0 + 0.6, t));
    // flip to 成交 on the gavel contact: 180° in 6 frames with ~8° overshoot, then settle
    const u = t - TD;
    let a = 0;
    if (u > 0) a = u < 0.2 ? Math.PI * (1 + 0.045) * A.easeOutCubic(u / 0.2) : Math.PI * (1 + 0.045 * Math.exp(-(u - 0.2) / 0.06) * Math.cos((u - 0.2) * 30));
    scrFlip.rotation.y = a;
    const fl = u > 0 ? Math.exp(-u / 0.05) : 0;                                  // 1-frame #FFF6D8 face flash
    front.material.color.setRGB(1 + 1.6 * fl, 1 + 1.5 * fl, 1 + 1.1 * fl); back.material.color.copy(front.material.color);
    drawScreen(TXT.t ?? t);
    // retire with the figures
    const out = A.smooth(A.inv(cues.fig_out + 0.05, cues.fig_out + 0.32, t));
    if (out > 0) screen.scale.setScalar(Math.max(1e-4, s * (1 - out)));
    if (out >= 1) screen.visible = false;
  });
}
// gold burst at the deal: shards + coins on parabolic arcs that land on the tiles, a flat iso ground ring racing to the rim
const DEAL_CLICKS = [];
{
  const sp = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.gold).multiplyScalar(2.0) });
  const sp2 = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFF0B8').multiplyScalar(1.6) });
  const coinM2 = std(PAL.gold, { rough: 0.35 });
  const R = A.rng(77);
  const G = 9.0, FLOOR_Y = TILE_H + 0.03;
  const parts = Array.from({ length: 40 }, (_, i) => {
    const coin = i % 4 === 0;
    const m = coin ? mesh(cyl(0.11, 0.11, 0.03, 24), coinM2, false) : new THREE.Mesh(new THREE.OctahedronGeometry(0.05 + R() * 0.05, 0), i % 3 ? sp : sp2);
    if (!coin) m.layers.set(L_FX);
    island.add(m);
    const a = R() * Math.PI * 2, sp0 = 2.2 + R() * 3.4;
    const v = new THREE.Vector3(Math.cos(a) * sp0, 2.5 + R() * 3.5, Math.sin(a) * sp0);
    // closed-form landing time on the tiles
    const y0 = SCREEN_P.y, dy = y0 - FLOOR_Y;
    const tl = (v.y + Math.sqrt(v.y * v.y + 2 * G * dy)) / G;
    if (i % 5 === 0 && tl < 1.3) DEAL_CLICKS.push(+(tl).toFixed(3));
    return { m, v, spin: 4 + R() * 10, tl, coin };
  });
  // flat ground ring (true iso ellipse) from the screen's footprint to the rim in 10 frames
  const rgM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE38A').multiplyScalar(1.3), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.0, 128), rgM); ring.rotation.x = -Math.PI / 2; ring.layers.set(L_FX); island.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 128), rgM); ring2.rotation.x = -Math.PI / 2; ring2.layers.set(L_FX); island.add(ring2);
  on((t) => {
    const u = t - cues.deal;
    for (const p of parts) {
      p.m.visible = u > 0 && u < p.tl + 0.5;
      if (!p.m.visible) continue;
      const uu = Math.min(u, p.tl);
      p.m.position.set(SCREEN_P.x + p.v.x * uu, SCREEN_P.y + p.v.y * uu - 0.5 * G * uu * uu, SCREEN_P.z + p.v.z * uu);
      const after = Math.max(0, u - p.tl);
      if (after > 0) p.m.position.y = FLOOR_Y + 0.06 * Math.abs(Math.sin(after * 18)) * Math.exp(-after * 12);
      const s = after > 0 ? 1 - A.smooth(A.clamp((after - 0.2) / 0.3)) : 1;
      p.m.scale.setScalar(Math.max(1e-4, s));
      p.m.rotation.set(after > 0 ? 0 : p.spin * uu, p.spin * uu * 0.7, after > 0 ? 0 : p.spin * uu * 0.4);
    }
    const g = u - 0.02;
    [ring, ring2].forEach((r, k) => {
      const gg = g - k * 0.08;
      r.visible = gg > 0 && gg < 0.42;
      if (!r.visible) return;
      const sc = 0.4 + 9.0 * A.easeOutCubic(gg / 0.34);
      r.scale.setScalar(sc); r.position.set(SCREEN_P.x * (1 - A.easeOutCubic(gg / 0.34)), TILE_H + 0.03, SCREEN_P.z * (1 - A.easeOutCubic(gg / 0.34)));
    });
    rgM.opacity = 0.85 * (1 - A.smooth(A.clamp((g - 0.12) / 0.3)));
  });
}
// ================================================================== proof figures on iso panels (faces +X), count-up
const FIG = [
  { pre: '近', num: 400, post: '家法院', fmt: (v) => String(Math.round(v)) },
  { pre: '覆盖', num: 20, post: '余个省市区', fmt: (v) => String(Math.round(v)) },
  { pre: '直播拍卖成交率', num: 92, post: '%', fmt: (v) => String(Math.round(v)), postBig: true },
];
const PL = 8.6, PH = 1.75, PX = 2048, PY = Math.round(2048 * PH / PL);
const figT = cues.figures;
const HERO_T = 6.9;
const figs = FIG.map((f, i) => {
  const ct = canvasTex(PX, PY);
  const grp = new THREE.Group(); island.add(grp);
  // authored in the hero frame: each panel's left foot at these px
  const anchor = worldAt([150, 215, 280][i], [470, 660, 850][i], -0.6, HERO_T);
  grp.position.copy(anchor);
  const slab = mesh(rbox(1.15, 0.16, PL + 0.5, 0.04), std(PAL.ivory)); slab.position.set(0, -0.16, -PL / 2); grp.add(slab);
  const edge = mesh(box(1.16, 0.035, PL + 0.52), std(PAL.gold, { metal: 0.5, rough: 0.3 })); edge.position.set(0, -0.06, -PL / 2); grp.add(edge);
  const wall = new THREE.Group(); grp.add(wall);
  const body = mesh(rbox(0.22, PH, PL, 0.03), std(PAL.ink, { rough: 0.5 })); body.position.set(-0.05, 0, -PL / 2); wall.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(PL, PH), new THREE.MeshBasicMaterial({ map: ct.t, toneMapped: false }));
  face.rotation.y = Math.PI / 2; face.position.set(0.062, PH / 2, -PL / 2); wall.add(face);
  const cap = mesh(box(0.26, 0.045, PL + 0.02), std(i === 1 ? PAL.gold : PAL.red, { rough: 0.5 })); cap.position.set(-0.05, 0, -PL / 2); grp.add(cap);
  let last = '';
  function draw(v) {
    const s = f.fmt(v); if (s === last) return; last = s;
    const g = ct.g; const u = PX / PL;      // px per unit
    g.fillStyle = PAL.ink; g.fillRect(0, 0, PX, PY);
    g.fillStyle = PAL.red; g.fillRect(0, 0, 0.14 * u, PY);
    const base = PY * 0.79; let x = 0.42 * u;
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#F6EEDF'; g.font = `700 ${0.6 * u}px ${SANS}`; g.fillText(f.pre, x, base); x += g.measureText(f.pre).width + 0.22 * u;
    g.fillStyle = PAL.gold; g.font = `900 ${1.55 * u}px ${SANS}`;
    // fixed-width digits during the count so the line does not jitter
    const full = f.fmt(f.num); const dw = g.measureText('0').width;
    const sx = x + (full.length - s.length) * dw;
    g.fillText(s, sx, base); x += full.length * dw + (f.postBig ? 0.04 * u : 0.22 * u);
    if (f.postBig) { g.font = `900 ${1.0 * u}px ${SANS}`; g.fillText(f.post, x, base); }
    else { g.fillStyle = '#F6EEDF'; g.font = `700 ${0.6 * u}px ${SANS}`; g.fillText(f.post, x, base); }
    ct.t.needsUpdate = true;
  }
  return { grp, wall, cap, slab, edge, draw, t: figT[i] };
});
on((t) => {
  figs.forEach((F, i) => {
    const tin = F.t, tout = cues.fig_out + i * 0.06;
    // slab slides in, wall grows (scaleY with overshoot), cap lands 2-3 frames later, then reverse out
    const sIn = t < tin - 0.12 ? 0 : A.easeOutCubic(A.clamp((t - tin + 0.12) / 0.2));
    const out = A.easeInCubic(A.clamp((t - tout) / 0.22));
    F.grp.visible = sIn > 0.001 && out < 0.999;
    F.grp.position.y = worldAt([150, 215, 280][i], [470, 660, 850][i], -0.6, HERO_T).y - 1.2 * (1 - sIn) - 1.5 * out;
    F.slab.scale.set(1, 1, Math.max(1e-4, sIn)); F.edge.scale.set(1, 1, Math.max(1e-4, sIn));
    const wg = t < tin ? 0 : A.easeOutBack(A.clamp((t - tin) / 0.3), 2.0) * (1 - out);
    F.wall.scale.set(1, Math.max(1e-4, wg), 1); F.wall.visible = wg > 0.002;
    const tc = tin + 0.083;
    const cs = t < tc ? 0 : A.spring(t - tc, 26, 0.45) * (1 - out);
    F.cap.visible = cs > 0.002; F.cap.position.y = PH * wg + (t < tc ? 0 : 0.3 * Math.max(0, 1 - A.easeOutCubic((t - tc) / 0.1)));
    F.cap.scale.set(1, 1, Math.max(1e-4, cs));
    const tt = TXT.t ?? t;
    const cnt = A.easeOutExpo(A.clamp((tt - tin - 0.03) / cues.count_dur));   // starts at 60 %: no readable '0' frames
    F.draw(FIG[i].num * (0.6 + 0.4 * cnt));
  });
});

// ================================================================== end title, set on the iso plane (+X face, baseline rises 30°)
const TITLE_T = 9.4;
const title = new THREE.Group(); island.add(title);
const titleParts = [];
{
  const O = worldAt(150, 790, 0.0, TITLE_T);        // left end of the name baseline, in the end frame
  title.position.copy(O);
  const mk = (w, h, draw, mat) => {
    const ct = canvasTex(w, h, draw);
    return ct;
  };
  // text helper -> plane on the +X face; u along -Z (reading direction), v up. Returns {mesh, wU, hU}
  function textPlane(str, font, emU, color, o = {}) {
    const pxu = o.pxu ?? 200;
    const c = document.createElement('canvas').getContext('2d'); c.font = font(emU * pxu);
    if (o.track) c.letterSpacing = `${o.track * emU * pxu}px`;
    const wpx = Math.ceil(c.measureText(str).width + str.length * (o.track ?? 0) * emU * pxu + emU * pxu * 0.5), hpx = Math.ceil(emU * pxu * 1.35);
    const ct = canvasTex(wpx, hpx, (g) => {
      g.font = font(emU * pxu); if (o.track) g.letterSpacing = `${o.track * emU * pxu}px`;
      g.fillStyle = '#ffffff'; g.textBaseline = 'alphabetic'; g.fillText(str, emU * pxu * 0.05, hpx - emU * pxu * 0.3);
    });
    const wU = wpx / pxu, hU = hpx / pxu;
    const geo = new THREE.PlaneGeometry(wU, hU); geo.translate(wU / 2, hU / 2 - 0.3 * emU, 0);
    const m = new THREE.MeshBasicMaterial({ map: ct.t, color: C(color), transparent: true, depthWrite: false, toneMapped: false });
    const me = new THREE.Mesh(geo, m); me.rotation.y = Math.PI / 2; me.layers.set(L_FX);
    return { me, wU, hU, m };
  }
  const place = (obj, u, v, x = 0) => { obj.position.set(x, v, -u); };
  // logo disc (vector, rebuilt) — laid on the same plane
  const LG = 2.9;
  const lt = canvasTex(1024, 1024, (g) => drawLogo(g, 512, 512, 508));
  const logo = new THREE.Mesh(new THREE.CircleGeometry(LG / 2, 96), new THREE.MeshBasicMaterial({ map: lt.t, toneMapped: false }));
  logo.rotation.y = Math.PI / 2; logo.layers.set(L_FX);
  const logoG = new THREE.Group(); logoG.add(logo); place(logoG, LG / 2, LG / 2 - 0.5, 0.0); title.add(logoG); logo.position.x = 0.075;
  // a thin coin edge behind the logo so it reads as an object on the plane
  const coin = mesh(cyl(LG / 2, LG / 2, 0.12, 96), std(PAL.redDeep, { rough: 0.5 })); coin.rotation.z = Math.PI / 2; coin.position.x = 0.0; logoG.add(coin);
  const coinRim = mesh(cyl(LG / 2 + 0.012, LG / 2 + 0.012, 0.03, 96), std(PAL.gold, { metal: 0.6, rough: 0.3 })); coinRim.rotation.z = Math.PI / 2; coinRim.position.x = -0.02; logoG.add(coinRim);
  titleParts.push({ kind: 'logo', g: logoG, t: cues.title.logo });
  // name: 能拍法服 with layered depth (fake extrusion along -X)
  const NAME_EM = 2.45;
  const nameG = new THREE.Group(); place(nameG, LG + 0.45, -0.1); title.add(nameG);
  const nameFront = textPlane('能拍法服', (px) => `900 ${px}px ${SERIF}`, NAME_EM, PAL.ink, { pxu: 260, track: 0.04 });
  nameG.add(nameFront.me); nameFront.me.position.x = 0.0;
  const depthN = 4;
  for (let k = 1; k <= depthN; k++) {
    const c = textPlane('能拍法服', (px) => `900 ${px}px ${SERIF}`, NAME_EM, '#7A1A19', { pxu: 260, track: 0.04 });
    c.me.position.set(-0.014 * k, 0, 0); c.m.depthTest = true; c.me.renderOrder = -k; nameG.add(c.me);
  }
  nameFront.me.renderOrder = 1;
  titleParts.push({ kind: 'rise', g: nameG, t: cues.title.name, clipY: null, h: NAME_EM * 1.1 });
  // gold rule
  const ruleL = 13.6;
  const rule = mesh(box(0.05, 0.05, ruleL), std(PAL.gold, { metal: 0.55, rough: 0.3 })); rule.geometry = rule.geometry.clone(); rule.geometry.translate(0, 0, -ruleL / 2);
  place(rule, 0.0, -0.72); title.add(rule);
  titleParts.push({ kind: 'rule', g: rule, t: cues.title.rule });
  const slogan = textPlane('让司法更高效 · 焕资产新价值', (px) => `500 ${px}px ${SANS}`, 0.86, PAL.ink, { pxu: 300, track: 0.06 });
  const sloG = new THREE.Group(); sloG.add(slogan.me); place(sloG, 0.0, -1.85); title.add(sloG);
  titleParts.push({ kind: 'rise', g: sloG, t: cues.title.slogan, h: 1.0 });
  const small = textPlane('NENGPAI · 综合司法辅助服务', (px) => `500 ${px}px ${SANS}`, 0.62, '#5E524C', { pxu: 360, track: 0.16 });
  const smG = new THREE.Group(); smG.add(small.me); place(smG, 0.0, -2.95); title.add(smG);
  titleParts.push({ kind: 'rise', g: smG, t: cues.title.small, h: 0.68 });
  // per-part world clip planes (text rises out of a slot at its own baseline)
  title.updateMatrixWorld(true);
  for (const p of titleParts) if (p.kind === 'rise') {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    p.plane = plane; p.baseV = p.g.position.y;
    p.g.traverse((o) => { if (o.material) o.material.clippingPlanes = [plane]; });
  }
  on((t) => {
    for (const p of titleParts) {
      const u = t - p.t;
      if (p.kind === 'logo') {
        const s = u < 0 ? 0 : A.spring(u, 18, 0.5);
        p.g.visible = s > 0.002; p.g.scale.setScalar(Math.max(1e-4, s));
        p.g.rotation.x = (1 - A.clamp(A.easeOutCubic(u / 0.5))) * -1.2;
      } else if (p.kind === 'rise') {
        const k = u < 0 ? 0 : A.easeOutQuart(A.clamp(u / 0.42));
        p.g.visible = u > 0;
        const drop = (1 - k) * p.h;
        p.g.position.y = p.baseV - drop;
        p.plane.constant = -(title.position.y + island.position.y + p.baseV - 0.3 * (p.h / 1.1) - 0.02);
        // clip-plane at the slot (just under the baseline descent)
      } else if (p.kind === 'rule') {
        const k = u < 0 ? 0 : A.easeInOutCubic(A.clamp(u / 0.45));
        p.g.visible = k > 0.001; p.g.scale.set(1, 1, Math.max(1e-4, k));
      }
    }
  });
}

// ================================================================== parallax layers: foreground clouds + floating documents, bg docs
function cloudGeo(seed) {
  const R = A.rng(seed); const geos = [];
  const blobs = [[0, 0, 0, 0.55], [0.55, -0.05, 0.1, 0.42], [-0.55, -0.08, -0.05, 0.4], [0.2, 0.25, -0.1, 0.42], [-0.25, 0.18, 0.15, 0.36]];
  for (const [x, y, z, r] of blobs) { const g = new THREE.IcosahedronGeometry(r * (0.9 + R() * 0.2), 3); g.translate(x, y, z); geos.push(g); }
  return geos;
}
const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
const cloudM = std('#FFFBF3', { rough: 0.95, env: 0.15, emissive: '#FFF6EA', ei: 0.28 });
const docTex = canvasTex(256, 330, (g, w, h) => {
  g.fillStyle = '#FFFCF5'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#CDBFAF'; for (let k = 0; k < 9; k++) g.fillRect(34, 60 + k * 24, k % 4 === 3 ? 110 : 186, 7);
  g.fillStyle = PAL.ink; g.fillRect(34, 28, 120, 12);
  g.strokeStyle = PAL.red; g.lineWidth = 7; g.beginPath(); g.arc(186, 268, 34, 0, Math.PI * 2); g.stroke();
  g.fillStyle = PAL.red; g.beginPath(); g.arc(186, 268, 16, 0, Math.PI * 2); g.fill();
});
function makeDoc(s = 1) {
  const g = new THREE.Group();
  const sheet = mesh(box(0.9 * s, 0.025, 1.16 * s), std('#FFFCF5', { rough: 0.9 })); g.add(sheet);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * s, 1.16 * s), new THREE.MeshStandardMaterial({ map: docTex.t, roughness: 0.9 }));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.026; g.add(top);
  return g;
}
const parallax = [];
// authored as end/hero-frame pixel positions; m = layer factor (fg 1.25, bg 0.75)
function addPar(obj, px, py, yW, tAuth, m, drift) {
  obj.userData.base = worldAt(px, py, yW, tAuth, m);   // layer-local position; the layer offset makes it land on (px, py) at tAuth
  obj.userData.m = m; obj.userData.drift = drift || [0, 0];
  parallax.push(obj);
  return obj;
}
{
  const c1 = mesh(mergeGeometries(cloudGeo(3)), cloudM, false); c1.scale.set(1.5, 1.1, 1.5); fg.add(c1); addPar(c1, 170, 175, 6, 9.4, 1.25, [0.05, 0]);
  const c2 = mesh(mergeGeometries(cloudGeo(8)), cloudM, false); c2.scale.set(1.25, 0.95, 1.25); fg.add(c2); addPar(c2, 1840, 1010, 2, 9.4, 1.25, [-0.06, 0]);
  const c3 = mesh(mergeGeometries(cloudGeo(13)), cloudM, false); c3.scale.set(1.1, 0.85, 1.1); fg.add(c3); addPar(c3, 1790, 905, 6, 5.8, 1.25, [0.04, 0]);
  const c4 = mesh(mergeGeometries(cloudGeo(21)), cloudM, false); c4.scale.set(1.0, 0.8, 1.0); fg.add(c4); addPar(c4, 90, 990, 2, 9.4, 1.25, [0.05, 0]);
  const d1 = makeDoc(1.0); fg.add(d1); addPar(d1, 1600, 260, 5, 9.4, 1.25, [0, 0]); d1.userData.spin = [0.6, 0.3, 0.2, 0];
  const d2 = makeDoc(0.85); fg.add(d2); addPar(d2, 1800, 700, 3, 6.6, 1.25, [0, 0]); d2.userData.spin = [0.3, -0.5, 0.4, 1];
  const d3 = makeDoc(0.9); fg.add(d3); addPar(d3, 120, 420, 4, 3.6, 1.25, [0, 0]); d3.userData.spin = [-0.4, 0.4, 0.3, 2];
  const d4 = makeDoc(0.6); bgG.add(d4); addPar(d4, 1480, 140, -2, 9.4, 0.75, [0, 0]); d4.userData.spin = [0.5, 0.2, -0.3, 3];
  const d5 = makeDoc(0.55); bgG.add(d5); addPar(d5, 620, 110, -2, 9.4, 0.75, [0, 0]); d5.userData.spin = [-0.3, 0.6, 0.2, 4];
  const d6 = makeDoc(0.5); bgG.add(d6); addPar(d6, 690, 980, -3, 9.4, 0.75, [0, 0]); d6.userData.spin = [0.2, -0.4, 0.5, 5];
  // bg coins (gold discs)
  const coinM = std(PAL.gold, { metal: 0.55, rough: 0.3 });
  [[1880, 460, 9.4], [1015, 975, 9.4], [870, 120, 9.4]].forEach(   // r2: all coins authored in the end frame, clear of the title
  ([px, py, ta], n) => {
    const c = mesh(cyl(0.3, 0.3, 0.06, 40), coinM, false); bgG.add(c); addPar(c, px, py, -2, ta, 0.75, [0, 0]); c.userData.spin = [0.7, 0.4, 0.3, 6 + n];
  });
}
on((t) => {
  for (const o of parallax) {
    const [ax, ay, az, ph] = o.userData.spin || [0, 0, 0, 0];
    o.position.copy(o.userData.base);
    o.position.y += 0.12 * Math.sin(t * 1.1 + ph * 1.7);
    o.position.addScaledVector(R_, o.userData.drift[0] * t);
    if (o.userData.spin) o.rotation.set(0.35 * Math.sin(t * ax + ph) + 0.25, t * ay * 0.5 + ph, 0.3 * Math.sin(t * az + ph * 0.5));
    // fade-in by scale for early-frame elements is not needed: the camera discovers them
  }
});
setLayer(fg, L_SOLID); setLayer(bgG, L_SOLID);

// ================================================================== frame update
function update(T, sub = { u: 0, v: 0 }, Tc) {
  for (const f of U) f(T);
  for (const f of UL) f(T);
  const k = camAt(Tc ?? T);
  const target = new THREE.Vector3().addScaledVector(R_, k.x).addScaledVector(U_, k.y);
  camera.position.copy(target).addScaledVector(DIR, 120); camera.up.set(0, 1, 0); camera.lookAt(target);
  camera.zoom = k.zoom; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  // parallax: fg 1.25, island 1, bg 0.75 (screen speeds 1 : 0.8 : 0.6)
  fg.position.copy(target).multiplyScalar(-0.25);
  const flat = (v) => v.addScaledVector(DIR, -v.y / DIR.y);
  bgG.position.copy(flat(target.clone().multiplyScalar(0.25)));
  bgU.uOff.value.set(bgG.position.x, bgG.position.z);
  bgU.uZoom.value = k.zoom;
  bgU.uInvVP.value.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
  const sh = SUN0.clone().multiplyScalar(-(0 - FLOOR) / SUN0.y);
  bgU.uShadowC.value.set(sh.x, sh.z);
  bgU.uShadow.value = A.smooth(A.inv(cues.base_rise, cues.base_rise + 0.5, T));
  // island bob in the hold
  island.position.y = 0.05 * Math.sin(Math.max(0, T - PB1) * 2.0) * A.smooth(A.inv(PB1, PB1 + 0.4, T));
  // soft sun (jittered per sub-sample)
  const L = SUN0.clone().add(new THREE.Vector3().addScaledVector(R_, sub.u * 0.05).addScaledVector(new THREE.Vector3(0.5, 0.3, 0.8).normalize(), sub.v * 0.05)).normalize();
  sun.target.position.set(0, 0, 0); sun.position.copy(L).multiplyScalar(40);
  sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
}

const acc = new Accumulator(renderer, W, H);
acc.aoMat.uniforms.uRadius.value = 0.42; acc.aoMat.uniforms.uStrength.value = 0.95;
window.renderAt = async (t) => {
  acc.finalMat.uniforms.uExposure.value = 1.0;
  acc.bloomOn = t > cues.deal - 0.05 && t < cues.deal + 1.0;   // only the deal burst needs bloom (saves ~2 s/frame in software GL)
  TXT.t = t;
  const fast = t < 0.75 || (t > 5.55 && t < 6.15) || (t > PB0 && t < PB1);
  const spp = q.get('spp') ? SPP : (fast ? 16 : 8);
  acc.frame(scene, camera, spp, (i, n, sub) => {
    const ts = Math.max(0, t + (sub.frac - 0.5) * SHUTTER / FPS);
    const tc = Math.max(0, t + (sub.frac - 0.5) * 0.15 / FPS);   // camera: ~27° shutter, objects keep 180°
    update(ts, sub, tc);
  }, t);
  glx.finish();
};
update(9.5); renderer.compile(scene, camera);
await window.renderAt(6.6);
window.__info = () => ({ ...renderer.info.render, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, progs: renderer.info.programs.length });
window.__ready = true;
