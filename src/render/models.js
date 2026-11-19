// Yapıların 3D modelleri: kodla kurulanlar ve Higgsfield'dan gelen GLB'ler.
import * as THREE from '../../vendor/three.module.js';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';

// ---------- malzemeler (paylaşılır) ----------
const mats = new Map();
export function mat(color, opt = {}) {
  const k = color + JSON.stringify(opt);
  if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color, ...opt }));
  return mats.get(k);
}
const C = {
  kece: '#efe2c4', kece2: '#d8c39a', kirmizi: '#a8452c', koyuKirmizi: '#7a2e22', mavi: '#2f5f86', gok: '#3d8fb0',
  tahta: '#7a5130', tahta2: '#5d3c22', tas: '#8e877a', tas2: '#6f695f', deri: '#a9774a', yun: '#f4efe2',
  toprak: '#7a5634', bugday: '#e2bb52', filiz: '#86a83e', kar: '#f4f7fb', ates: '#ffb340', demir: '#4a4a50',
};
const geoCache = new Map();
const G = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };

function part(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
const cyl = (rt, rb, h, s = 12, open = false) => G(`c${rt},${rb},${h},${s},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
const cone = (r, h, s = 12) => G(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
const box = (w, h, d) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const sph = (r, a = 8, b = 6) => G(`s${r},${a},${b}`, () => new THREE.SphereGeometry(r, a, b));
const dode = r => G('d' + r, () => new THREE.DodecahedronGeometry(r));
const plane = (w, h, sx = 1) => G(`p${w},${h},${sx}`, () => new THREE.PlaneGeometry(w, h, sx, 1));

// ---------- parçalar ----------
function yurt(r, belt, winter, roof = C.kece2) {
  const g = new THREE.Group();
  g.add(part(cyl(r, r, 1.9, 20), mat(C.kece), 0, 0.95, 0));
  g.add(part(cone(r * 1.06, 1.5, 20), mat(winter ? C.kar : roof), 0, 2.6, 0));
  g.add(part(cyl(r * 1.01, r * 1.01, 0.25, 20, true), mat(belt), 0, 1.55, 0));
  g.add(part(cyl(0.35, 0.35, 0.3, 10), mat(C.tahta), 0, 3.4, 0));
  g.add(part(box(0.9, 1.3, 0.2), mat(belt), 0, 0.65, r - 0.02));
  return g;
}
function banner(color, x, z, h = 4) {
  const g = new THREE.Group();
  g.add(part(cyl(0.08, 0.1, h, 6), mat(C.tahta2), x, h / 2, z));
  const f = part(plane(1.2, 0.8, 6), mat(color, { side: THREE.DoubleSide }), x + 0.6, h - 0.5, z); f.userData.flag = true; g.add(f);
  return g;
}
function palisade(r, n, gapFrom, gapTo, h = 2.2) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2; if (a > gapFrom && a < gapTo) continue;
    g.add(part(cyl(0.16, 0.2, h + (i % 2) * 0.3, 5), mat(C.tahta), Math.cos(a) * r, h / 2, Math.sin(a) * r));
  }
  return g;
}
function fenceRing(r, n) {
  const g = new THREE.Group(), step = Math.PI * 2 / n, len = 2 * r * Math.sin(step / 2) + 0.1;
  for (let i = 0; i < n; i++) {
    const a = i * step; if (Math.abs(a - Math.PI / 2) < step * 0.6) continue;
    g.add(part(cyl(0.09, 0.09, 1.1, 5), mat(C.tahta), Math.cos(a) * r, 0.55, Math.sin(a) * r));
    const m = a + step / 2, rr = r * Math.cos(step / 2);
    const rail = part(box(0.08, 0.08, len), mat(C.tahta2), Math.cos(m) * rr, 0.85, Math.sin(m) * rr); rail.rotation.y = -m; g.add(rail);
  }
  return g;
}
function logPile(rows, len = 3) {
  const g = new THREE.Group();
  for (let k = 0; k < rows; k++) for (let i = 0; i < rows + 1 - k; i++) {
    const o = part(cyl(0.3, 0.3, len, 7), mat('#8a6038'), 0, 0.3 + k * 0.52, (i - (rows - k) / 2) * 0.62); o.rotation.z = Math.PI / 2; g.add(o);
  }
  return g;
}
function snowCap(r, y) { return part(cyl(r * 0.2, r, 0.25, 16), mat(C.kar), 0, y, 0); }
function fire(scale = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.add(part(dode(0.45 * scale), mat(C.tas), Math.cos(a) * 1.4 * scale, 0.25, Math.sin(a) * 1.4 * scale)); }
  for (let i = 0; i < 4; i++) { const k = part(cyl(0.14, 0.14, 1.8 * scale, 6), mat(C.tahta2), 0, 0.35, 0); k.rotation.z = Math.PI / 2; k.rotation.y = i * Math.PI / 4; g.add(k); }
  const f = new THREE.Mesh(cone(0.7 * scale, 1.6 * scale, 8), new THREE.MeshBasicMaterial({ color: C.ates })); f.position.y = 1.0 * scale; f.userData.flame = true; g.add(f);
  return g;
}
function hearthLight(g, y = 2) { const l = new THREE.PointLight('#ff9a3c', 30, 18, 1.6); l.position.y = y; l.userData.flicker = true; g.add(l); }

// ---------- yapılar ----------
const B = {
  ocak(L, w) {
    const g = new THREE.Group(); g.add(fire(L >= 3 ? 1.25 : 1)); hearthLight(g);
    g.add(banner(C.gok, -2.6, -0.6, 6));
    if (L >= 3) { g.add(banner(C.kirmizi, 2.6, -0.6, 5)); g.add(palisade(4.6, 20, 1.1, 2.0, 0.9)); }
    if (w) g.add(part(cyl(4.2, 4.2, 0.06, 24), mat(C.kar), 0, 0.03, 0));
    return g;
  },
  cadir(L, w) {
    const g = yurt(L >= 3 ? 3 : 2.5, C.kirmizi, w);
    if (L >= 3) { const s = yurt(1.5, C.kirmizi, w); s.position.set(3.4, 0, -1.6); g.add(s); g.add(part(box(2.4, 0.05, 1.6), mat('#8c3b2b'), 0, 0.03, 3.6)); }
    return g;
  },
  avci(L, w) {
    const g = new THREE.Group(), tent = (x, z) => { const t = part(cone(1.8, 3.4, 8), mat(w ? C.kar : C.deri), x, 1.7, z); g.add(t); };
    tent(0, 0); if (L >= 3) tent(3.2, -1.2);
    g.add(part(cyl(0.07, 0.07, 2.2, 5), mat(C.tahta2), -2.4, 1.1, 1)); g.add(part(cyl(0.07, 0.07, 2.2, 5), mat(C.tahta2), -2.4, 1.1, 2.6));
    const bar = part(cyl(0.05, 0.05, 1.8, 5), mat(C.tahta2), -2.4, 2.1, 1.8); bar.rotation.x = Math.PI / 2; g.add(bar);
    for (let i = 0; i < 3; i++) g.add(part(box(0.25, 0.7, 0.15), mat('#8a3a2a'), -2.4, 1.6, 1.3 + i * 0.5));
    return g;
  },
  agil(L, w) {
    const g = fenceRing(L >= 3 ? 5.5 : 4.6, 20);
    g.add(part(box(2.6, 0.12, 1.8), mat(w ? C.kar : C.kece2), -2, 1.6, -2)); for (const [x, z] of [[-3.2, -2.8], [-0.8, -2.8], [-3.2, -1.2], [-0.8, -1.2]]) g.add(part(cyl(0.07, 0.07, 1.6, 5), mat(C.tahta2), x, 0.8, z));
    return g;
  },
  oduncu(L, w) {
    const g = logPile(L >= 3 ? 3 : 2); g.position.set(0, 0, 0);
    g.add(part(cyl(0.5, 0.55, 0.6, 8), mat('#9a7048'), 2.4, 0.3, 0));
    const axe = part(cyl(0.04, 0.04, 1, 5), mat(C.tahta2), 2.4, 0.95, 0); axe.rotation.z = 0.4; g.add(axe);
    if (L >= 3) { for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) g.add(part(cyl(0.1, 0.1, 2.6, 5), mat(C.tahta2), x, 1.3, z)); g.add(part(box(4.6, 0.15, 4.6), mat(w ? C.kar : C.tahta), 0, 2.65, 0)); }
    else if (w) g.add(part(box(2.2, 0.15, 2.8), mat(C.kar), 0, 1.4, 0));
    return g;
  },
  kececi(L, w) {
    const g = new THREE.Group();
    for (let i = 0; i < (L >= 3 ? 3 : 2); i++) {
      const x = -2 + i * 2;
      g.add(part(cyl(0.06, 0.06, 2, 5), mat(C.tahta2), x - 0.8, 1, 0)); g.add(part(cyl(0.06, 0.06, 2, 5), mat(C.tahta2), x + 0.8, 1, 0));
      g.add(part(box(1.5, 1.4, 0.06), mat(['#c9563a', '#e8d6a8', '#3d6f8f'][i % 3]), x, 1.2, 0));
    }
    for (let i = 0; i < 4; i++) g.add(part(sph(0.55), mat(w ? C.kar : C.yun), -1.5 + i * 0.9, 0.45, 2));
    if (L >= 3) { const y = yurt(1.8, C.mavi, w); y.position.set(0, 0, -3.4); g.add(y); }
    return g;
  },
  ambar(L, w) {
    const g = new THREE.Group(), s = L >= 3 ? 1.3 : 1;
    for (const [x, z] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) g.add(part(cyl(0.15, 0.15, 1, 5), mat(C.tahta2), x * s, 0.5, z * s));
    g.add(part(box(4 * s, 2 * s, 3 * s), mat(C.tahta), 0, 1 + s, 0));
    const roof = part(cyl(0.01, 2.4 * s, 4.4 * s, 4), mat(w ? C.kar : C.kece2), 0, 2.6 * s + 0.6, 0); roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.6); g.add(roof);
    for (let i = 0; i < (L >= 3 ? 5 : 3); i++) g.add(part(sph(0.45, 7, 5), mat('#d9c08a'), -1.6 + i * 0.8, 0.4, 2.4 * s));
    return g;
  },
  kisla(L, w) {
    const g = yurt(3.4, C.koyuKirmizi, w);
    g.add(palisade(5.6, 26, 1.2, 1.9));
    g.add(banner(C.kirmizi, -2.4, 4.4, 3)); g.add(banner(C.kirmizi, 2.4, 4.4, 3));
    for (let i = 0; i < 3; i++) { const m = part(cyl(0.04, 0.04, 2.4, 4), mat(C.tahta2), 4 - i * 0.35, 1.2, -2.5); m.rotation.z = 0.3; g.add(m); }
    if (L >= 3) for (const x of [-5.6, 5.6]) { g.add(part(cyl(0.12, 0.14, 4, 5), mat(C.tahta), x, 2, 3)); g.add(part(box(1.2, 0.15, 1.2), mat(C.tahta2), x, 4, 3)); }
    return g;
  },
  kam(L, w) {
    const g = yurt(2.7, C.mavi, w, '#2b4a66');
    g.add(part(cyl(0.1, 0.12, 6, 6), mat(C.tahta2), 3.4, 3, 0.4));
    for (let i = 0; i < 5; i++) { const r = part(plane(0.14, 1.6), mat(['#3d8fb0', '#e8d6a8', '#c9563a', '#7a9a3a', '#f0c040'][i], { side: THREE.DoubleSide }), 3.4 + Math.cos(i) * 0.25, 5.2 - i * 0.15, 0.4 + Math.sin(i) * 0.25); r.rotation.y = i; r.userData.flag = true; g.add(r); }
    g.add(part(cyl(0.6, 0.6, 0.25, 14), mat('#c9a46a'), -2.6, 0.7, 2.2)).rotation.x = 1.2;
    if (L >= 3) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.add(part(box(0.5, 1.2 + (i % 2) * 0.5, 0.4), mat(C.tas), Math.cos(a) * 4.8, 0.6, Math.sin(a) * 4.8)); }
    return g;
  },
  gozcu(L, w) {
    const g = new THREE.Group(), h = L >= 3 ? 9 : 7;
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(part(cyl(0.15, 0.2, h, 5), mat(C.tahta), x, h / 2, z));
    g.add(part(box(3, 0.3, 3), mat(C.tahta2), 0, h - 0.8, 0));
    const r = part(cone(2.3, 1.6, 4), mat(w ? C.kar : C.kece2), 0, h + 0.9, 0); r.rotation.y = Math.PI / 4; g.add(r);
    if (L >= 3) g.add(banner(C.gok, 0, 0, h + 3));
    return g;
  },
  demirocagi(L, w) {
    const g = new THREE.Group(), one = x => {
      g.add(part(cyl(1.0, 1.6, 3.4, 10), mat(C.tas2), x, 1.7, 0));
      g.add(part(cyl(0.45, 0.6, 1.4, 8), mat(C.tas), x, 4.0, 0));
      const glow = new THREE.Mesh(box(0.8, 0.7, 0.2), new THREE.MeshBasicMaterial({ color: '#ff7a2a' })); glow.position.set(x, 0.7, 1.45); glow.userData.flame = true; g.add(glow);
    };
    one(0); if (L >= 3) one(3.4);
    g.add(logPile(1, 2)); g.children[g.children.length - 1].position.set(-2.6, 0, 1);
    if (w) g.add(part(cyl(0.45, 0.6, 0.15, 8), mat(C.kar), 0, 4.75, 0));
    return g;
  },
  demirci(L, w) {
    const g = new THREE.Group();
    for (const [x, z] of [[-2.2, -1.6], [2.2, -1.6], [-2.2, 1.6], [2.2, 1.6]]) g.add(part(cyl(0.12, 0.14, 2.8, 5), mat(C.tahta2), x, 1.4, z));
    g.add(part(box(5, 0.18, 3.8), mat(w ? C.kar : C.tahta), 0, 2.9, 0));
    g.add(part(box(0.9, 0.5, 0.45), mat(C.demir), 0.6, 0.85, 0.3)); g.add(part(cyl(0.25, 0.35, 0.6, 6), mat(C.tahta2), 0.6, 0.3, 0.3));
    g.add(part(box(1.4, 1, 1.2), mat(C.tas2), -1.2, 0.5, -0.6));
    const glow = new THREE.Mesh(box(0.8, 0.12, 0.7), new THREE.MeshBasicMaterial({ color: '#ff7a2a' })); glow.position.set(-1.2, 1.05, -0.6); glow.userData.flame = true; g.add(glow);
    if (L >= 3) { const r = part(box(1.2, 1.6, 0.2), mat(C.demir), -2.8, 0.8, 0); g.add(r); }
    return g;
  },
};

function iskele(type) {
  const g = new THREE.Group(), r = type === 'tarla' ? 3.5 : type === 'gozcu' ? 1.6 : 2.6, h = type === 'gozcu' ? 5 : 3;
  for (const [x, z] of [[-r, -r], [r, -r], [-r, r], [r, r]]) g.add(part(cyl(0.09, 0.09, h, 5), mat('#b88a52'), x, h / 2, z));
  for (const y of [1, h - 0.2]) for (const [x, z, ry] of [[0, -r, 0], [0, r, 0], [-r, 0, Math.PI / 2], [r, 0, Math.PI / 2]]) { const b = part(box(r * 2, 0.08, 0.08), mat('#b88a52'), x, y, z); b.rotation.y = ry; g.add(b); }
  g.add(part(box(1.4, 0.5, 1), mat(C.tahta), -0.8, 0.25, 0.4)); g.add(part(box(1, 0.4, 0.8), mat(C.kece2), 0.9, 0.2, -0.5));
  return g;
}

function tarla(b, w) {
  const g = new THREE.Group(), W = 8.5, D = 6;
  g.add(part(box(W, 0.25, D), mat(w ? C.kar : C.toprak), 0, 0.05, 0));
  const state = cropState(b);
  if (state === 'bos' || w) {
    if (!w) for (let z = -D / 2 + 0.5; z < D / 2; z += 0.75) g.add(part(box(W - 0.4, 0.08, 0.18), mat('#5e4128'), 0, 0.2, z));
    return g;
  }
  const ripe = state === 'olgun', geo = ripe ? cone(0.16, 1.1, 4) : cone(0.2, 0.7, 4);
  const spots = []; for (let x = -W / 2 + 0.4; x < W / 2 - 0.2; x += 0.55) for (let z = -D / 2 + 0.4; z < D / 2 - 0.2; z += 0.7) spots.push([x, z, (x * 7.3 + z * 3.1) % 6]);
  const inst = new THREE.InstancedMesh(geo, mat(ripe ? C.bugday : C.filiz), spots.length); inst.castShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), y = ripe ? 0.7 : 0.5;
  const place = t => { spots.forEach(([x, z, f], i) => { e.set(Math.sin(t * 1.6 + x * 0.4 + f) * 0.12, 0, Math.sin(t * 1.3 + z * 0.5) * 0.08); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, one); inst.setMatrixAt(i, m4); }); inst.instanceMatrix.needsUpdate = true; };
  place(0); g.add(inst); g.userData.sway = place;
  return g;
}
const cropState = b => (!b.crop ? 'bos' : b.crop.prog >= 1 ? 'olgun' : 'filiz');

// ---------- Higgsfield modelleri ----------
const GLB_W = { ocak: 9, kisla: 12, ambar: 8, kam: 8 };
const glb = {};
export function setGlb(type, scene) {
  if (!scene || !scene.isObject3D) { delete glb[type]; return; }
  const t = scene.clone(true);
  t.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const box3 = new THREE.Box3().setFromObject(t), size = box3.getSize(new THREE.Vector3());
  const k = (GLB_W[type] || 8) / Math.max(size.x, size.z, 1e-6); t.scale.multiplyScalar(k);
  const b2 = new THREE.Box3().setFromObject(t), c = b2.getCenter(new THREE.Vector3());
  t.position.set(t.position.x - c.x, t.position.y - b2.min.y, t.position.z - c.z);
  glb[type] = t;
}
function fromGlb(type, L) {
  const g = new THREE.Group(), m = glb[type].clone(true); m.userData.glb = type; g.add(m);
  if (type === 'ocak') hearthLight(g, 3);
  if (L >= 3) { const r = (GLB_W[type] || 8) / 2 + 0.6; g.add(banner(C.kirmizi, -r, r * 0.6, 4)); g.add(banner(C.gok, r, r * 0.6, 4)); }
  return g;
}

// Hareketsiz parçaları malzemeye göre tek çizimde birleştirir (telefonda çizim sayısı düşer).
export function bake(g) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), byMat = new Map(), drop = [];
  g.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.flag || o.userData.flame) return;
    let p = o, glbPart = false; while (p && p !== g) { if (p.userData.glb) glbPart = true; p = p.parent; }
    if (glbPart || Array.isArray(o.material)) return;
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(geo); drop.push(o);
  });
  const dropByMat = new Map(); drop.forEach(o => { if (!dropByMat.has(o.material)) dropByMat.set(o.material, []); dropByMat.get(o.material).push(o); });
  for (const [m, list] of byMat) {
    let merged = null; try { merged = mergeGeometries(list, false); } catch { merged = null; }
    for (const geo of list) geo.dispose();
    if (!merged) continue;                       // birleşmezse parçalar olduğu gibi kalır
    for (const o of dropByMat.get(m)) o.parent.remove(o);
    const mesh = new THREE.Mesh(merged, m); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.own = true; g.add(mesh);
  }
  return g;
}

// Sahneden kaldırılan yapının yalnız kendine ait GPU kaynaklarını bırakır (paylaşılan geometri ve malzemelere dokunmaz).
export function disposeBuilding(g) {
  g.traverse(o => {
    if (o.isInstancedMesh) o.dispose();
    else if (o.isMesh && o.userData.own) o.geometry.dispose();
    if (o.isLight && o.dispose) o.dispose();
  });
}

// ---------- dışa açık ----------
export function sceneKey(b, winter) {
  const band = b.level >= 3 ? 2 : 1, st = b.level === 0 ? 'iskele' : b.type === 'tarla' ? cropState(b) : '-';
  return `${b.type}:${band}:${st}:${winter ? 1 : 0}`;
}
export function makeBuilding(b, winter) {
  let g;
  if (b.level === 0) g = iskele(b.type);
  else if (b.type === 'tarla') g = tarla(b, winter);
  else if (glb[b.type]) g = fromGlb(b.type, b.level);
  else g = (B[b.type] || B.cadir)(b.level, winter);
  const flags = [], flames = [], lights = [];
  g.traverse(o => { if (o.userData.flag) flags.push(o); if (o.userData.flame) flames.push(o); if (o.userData.flicker) lights.push(o); });
  bake(g);
  const sway = g.userData.sway;
  if (flags.length || flames.length || lights.length || sway) g.userData.anim = (t) => {
    for (const f of flags) { const p = f.geometry.attributes.position; if (!f.userData.base) f.userData.base = Float32Array.from(p.array); for (let i = 0; i < p.count; i++) { const x = f.userData.base[i * 3] + 0.6; p.setZ(i, Math.sin(t * 4 + x * 3 + f.id) * 0.12 * x); } p.needsUpdate = true; }
    for (const f of flames) f.scale.set(1 + Math.sin(t * 13 + f.id) * 0.08, 1 + Math.sin(t * 9 + f.id) * 0.15, 1);
    for (const l of lights) l.intensity = 26 + Math.sin(t * 17) * 5 + Math.sin(t * 7) * 3;
    if (sway) sway(t);
  };
  return g;
}
export function makePlotRing() {
  const m = new THREE.Mesh(G('ring', () => new THREE.RingGeometry(2.6, 3.0, 40)), new THREE.MeshBasicMaterial({ color: '#fff3c8', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 2;
  return m;
}
