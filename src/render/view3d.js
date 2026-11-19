// Obanın 3D sahnesi: arazi, yapılar, kamera ve yapı üstü göstergeler (eski 2D görünümün arayüzüyle).
import * as THREE from '../../vendor/three.module.js';
import { PLOTS } from '../data/plots.js';
import { isWinter } from '../sim/economy.js';
import { WATER_Y, OBA_CENTER, BOUNDS, riverZ, height, fbm, plotWorld, clampTarget } from './layout.js';
import { sceneKey, makeBuilding, makePlotRing, mat, disposeBuilding } from './models.js';
import { createFpsMonitor } from './fps.js';

const ZMIN = 0.32, ZMAX = 1.5;
export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let pr = Math.min(2, devicePixelRatio || 1);
  renderer.setPixelRatio(pr);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  canvas.addEventListener('webglcontextlost', e => e.preventDefault());

  const scene = new THREE.Scene();
  const SKY = { yaz: new THREE.Color('#e9d3a4'), kis: new THREE.Color('#dfe6ee') };
  scene.background = SKY.yaz.clone(); scene.fog = new THREE.Fog(SKY.yaz.clone(), 95, 230);
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 600);
  const target = new THREE.Vector3(OBA_CENTER.x, 0, OBA_CENTER.z + 4);
  let zoom = 0.75, animTo = null;
  function placeCamera() { camera.position.set(target.x, 46 * zoom + 2, target.z + 40 * zoom); camera.lookAt(target); camera.updateMatrixWorld(); }

  const hemi = new THREE.HemisphereLight('#fff1d0', '#7a6a3a', 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffd9a0', 2.2);
  sun.position.set(-40, 60, 30); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 220 }); sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  // ---------- arazi ----------
  const terrainGeo = new THREE.PlaneGeometry(340, 300, 170, 150); terrainGeo.rotateX(-Math.PI / 2); terrainGeo.translate(3, 0, 0);
  const tp = terrainGeo.attributes.position, colYaz = new Float32Array(tp.count * 3), colKis = new Float32Array(tp.count * 3);
  {
    const c = new THREE.Color(), k = new THREE.Color();
    const cimen = new THREE.Color('#9c9a4a'), sari = new THREE.Color('#d2ad5c'), yesil = new THREE.Color('#6f8a3c'), kaya = new THREE.Color('#8c7d6a'), kar = new THREE.Color('#f3efe6'), oba = new THREE.Color('#a8844f');
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i), h = height(x, z); tp.setY(i, h);
      const n = fbm(x / 7, z / 7); c.copy(cimen).lerp(sari, THREE.MathUtils.smoothstep(n, 0.3, 0.75));
      const d = Math.abs(z - riverZ(x)); if (d < 11) c.lerp(yesil, (1 - d / 11) * 0.8);
      const mo = Math.hypot(x - OBA_CENTER.x, z - OBA_CENTER.z); if (mo < 9) c.lerp(oba, (1 - mo / 9) * 0.7);
      if (h > 5) c.lerp(kaya, Math.min(1, (h - 5) / 6)); if (h > 14) c.lerp(kar, Math.min(1, (h - 14) / 5));
      c.toArray(colYaz, i * 3);
      k.set('#dde3e8').lerp(new THREE.Color('#b9c4cd'), n * 0.6); if (h > 5 && h < 12) k.lerp(kaya, 0.25); if (d < 4) k.lerp(new THREE.Color('#b8c6d0'), 0.5);
      k.toArray(colKis, i * 3);
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colYaz.slice(), 3)); terrainGeo.computeVertexNormals();
  }
  const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({ vertexColors: true })); terrain.receiveShadow = true; scene.add(terrain);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(340, 300), new THREE.MeshStandardMaterial({ color: '#5f9fb3', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.88 }));
  water.rotation.x = -Math.PI / 2; water.position.set(3, WATER_Y, 0); scene.add(water);

  const W = PLOTS.map(p => ({ ...p, ...plotWorld(p.id) }));
  const nearPlot = (x, z, r) => W.some(p => Math.hypot(p.x - x, p.z - z) < r);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ağaçlar: gövde + iki koni, üç çizimde
  const trees = [];
  for (let i = 0; trees.length < 110 && i < 2000; i++) {
    const x = BOUNDS.minX - 20 + rnd() * (BOUNDS.maxX - BOUNDS.minX + 40), near = rnd() < 0.7;
    const z = near ? riverZ(x) + (rnd() < 0.5 ? -1 : 1) * (5 + rnd() * 12) : 42 + rnd() * 50;
    const h = height(x, z); if (h < WATER_Y + 0.4 || h > 12 || nearPlot(x, z, 7.5) || Math.hypot(x - OBA_CENTER.x, z - OBA_CENTER.z) < 18) continue;
    trees.push([x, h, z, 0.75 + rnd() * 0.6, rnd() * 6]);
  }
  const treeParts = [[new THREE.CylinderGeometry(0.18, 0.25, 1.6, 5), '#5d3c22', 0.8], [new THREE.ConeGeometry(1.3, 2.8, 7), '#5e7a36', 2.6], [new THREE.ConeGeometry(1.0, 2.0, 7), '#7b9645', 3.6]];
  const treeMeshes = treeParts.map(([geo, color, y]) => {
    const m = new THREE.InstancedMesh(geo, mat(color, { flatShading: true }), trees.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    trees.forEach(([x, h, z, k, r], i) => { m4.compose(new THREE.Vector3(x, h + y * k, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r), s.set(k, k, k)); m.setMatrixAt(i, m4); });
    m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  });
  // çimen öbekleri ve taşlar
  const grassN = 1200, grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.2, 0.55, 4), mat('#ffffff'), grassN);
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(); let i = 0, guard = 0;
    while (i < grassN && guard++ < 20000) {
      const x = BOUNDS.minX + rnd() * (BOUNDS.maxX - BOUNDS.minX), z = BOUNDS.minZ + 10 + rnd() * (BOUNDS.maxZ - BOUNDS.minZ), h = height(x, z);
      if (h > 4 || h < WATER_Y + 0.5 || nearPlot(x, z, 3.5)) continue;
      m4.compose(new THREE.Vector3(x, h + 0.25, z), q.setFromEuler(e.set((rnd() - 0.5) * 0.4, rnd() * 6, (rnd() - 0.5) * 0.4)), new THREE.Vector3(1, 0.6 + rnd() * 0.9, 1));
      grass.setMatrixAt(i, m4); grass.setColorAt(i, c.set(['#b9ae5c', '#c8b766', '#a9a552'][i % 3])); i++;
    }
    grass.count = i; scene.add(grass);
  }
  const grassYaz = grass.instanceColor.array.slice(), grassKis = grass.instanceColor.array.map((v, i) => [0.93, 0.95, 0.97][i % 3]);
  {
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1), mat('#8e877a', { flatShading: true }), 40), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let i = 0;
    for (let k = 0; k < 400 && i < 40; k++) { const x = BOUNDS.minX + rnd() * 130, z = -30 + rnd() * 80, h = height(x, z); if (h < WATER_Y + 0.3 || nearPlot(x, z, 6)) continue; const s = 0.4 + rnd() * 1.1; m4.compose(new THREE.Vector3(x, h + 0.1, z), q.random(), new THREE.Vector3(s, s * 0.7, s)); rocks.setMatrixAt(i++, m4); }
    rocks.count = i; rocks.castShadow = true; scene.add(rocks);
  }
  // kar taneleri
  const snowN = 1400, snowGeo = new THREE.BufferGeometry(), snowPos = new Float32Array(snowN * 3);
  for (let i = 0; i < snowN; i++) { snowPos[i * 3] = rnd() * 140 - 70; snowPos[i * 3 + 1] = rnd() * 40; snowPos[i * 3 + 2] = rnd() * 120 - 60; }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.35, transparent: true, opacity: 0.9, depthWrite: false })); snow.visible = false; scene.add(snow);
  // ocak dumanı
  const smokeMat = new THREE.SpriteMaterial({ color: '#d9d2c6', transparent: true, opacity: 0.5, depthWrite: false });
  const smoke = Array.from({ length: 14 }, (_, i) => { const s = new THREE.Sprite(smokeMat.clone()); s.userData.t = i / 14; scene.add(s); return s; });

  // ---------- yapılar ve yer halkaları ----------
  const slots = W.map(p => {
    const ring = makePlotRing(); ring.position.set(p.x, p.y + 0.12, p.z); ring.visible = false; scene.add(ring);
    return { p, key: null, group: null, ring, h: 3 };
  });
  const selRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.15, 48), new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  selRing.rotation.x = -Math.PI / 2; selRing.visible = false; scene.add(selRing);
  const tmpBox = new THREE.Box3(), tmpV = new THREE.Vector3();
  function syncSlot(sl, b, winter) {
    const key = b ? sceneKey(b, winter) : null;
    if (key === sl.key) return;
    if (sl.group) { scene.remove(sl.group); disposeBuilding(sl.group); }
    sl.key = key; sl.group = null;
    if (!b) return;
    const g = makeBuilding(b, winter), p = sl.p;
    g.position.set(p.x, p.y, p.z);
    if (p.kind !== 'merkez' && b.type !== 'tarla') g.rotation.y = Math.atan2(OBA_CENTER.x - p.x, OBA_CENTER.z - p.z);
    g.userData.slot = p.id; scene.add(g); sl.group = g;
    tmpBox.setFromObject(g); sl.h = tmpBox.max.y - p.y; sl.r = Math.max(tmpBox.max.x - tmpBox.min.x, tmpBox.max.z - tmpBox.min.z) / 2;
  }

  // ---------- HTML göstergeler ----------
  const ov = document.createElement('div'); ov.className = 'ov3'; canvas.after(ov);
  const marks = new Map();
  function mark(id) {
    if (!marks.has(id)) { const el = document.createElement('div'); el.className = 'm3'; ov.appendChild(el); marks.set(id, { el, html: '' }); }
    return marks.get(id);
  }
  const floats = [];
  function floatText(id, text, color = '#fff6d8') {
    const el = document.createElement('div'); el.className = 'f3'; el.textContent = text; el.style.color = color; ov.appendChild(el);
    floats.push({ el, id, t: 0 });
  }

  // ---------- kamera ----------
  let Wd = 1, Hd = 1;
  function resize() {
    Wd = innerWidth; Hd = innerHeight;
    renderer.setSize(Wd, Hd, false); canvas.style.width = Wd + 'px'; canvas.style.height = Hd + 'px';
    camera.aspect = Wd / Hd; camera.fov = Wd < Hd ? 55 : 38; camera.updateProjectionMatrix(); placeCamera();
  }
  const ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2();
  function groundAt(sx, sy) { ndc.set(sx / Wd * 2 - 1, -(sy / Hd) * 2 + 1); ray.setFromCamera(ndc, camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(ground, p) ? p : null; }
  function clamp() {
    zoom = Math.max(ZMIN, Math.min(ZMAX, zoom));
    const c = clampTarget(target.x, target.z); target.x = c.x; target.z = c.z;
    placeCamera();
  }
  function pan(dx, dy) {
    animTo = null;
    const a = groundAt(Wd / 2, Hd / 2), b = groundAt(Wd / 2 - dx, Hd / 2 - dy);
    if (a && b) { target.add(b.sub(a)); clamp(); }
  }
  function zoomAt(f, sx, sy) {
    animTo = null; const a = groundAt(sx, sy); zoom /= f; clamp();
    const b = groundAt(sx, sy); if (a && b) { target.add(a.sub(b)); clamp(); }
  }
  function focus(id, z) { const p = W[id]; target.set(p.x, 0, p.z + 3); if (z) zoom = 1.05 / z; clamp(); }
  function project(x, y, z) { tmpV.set(x, y, z).project(camera); return [(tmpV.x + 1) / 2 * Wd, (1 - tmpV.y) / 2 * Hd, tmpV.z]; }
  function reveal(id) {
    const p = W[id], [sx, sy] = project(p.x, p.y, p.z), want = Hd * 0.32;
    if (sy <= want) return;
    const a = groundAt(sx, sy), b = groundAt(sx, want); if (a && b) aim(target.x + a.x - b.x, target.z + a.z - b.z);
  }
  function glide(id) { const p = W[id], [sx, sy] = project(p.x, p.y, p.z); if (sx < Wd * 0.12 || sx > Wd * 0.82 || sy < Hd * 0.15 || sy > Hd * 0.7) aim(p.x, p.z + 3); }
  function aim(x, z) { const c = clampTarget(x, z); animTo = new THREE.Vector3(c.x, 0, c.z); }
  function tick() { if (!animTo) return; target.lerp(animTo, 0.2); clamp(); if (target.distanceTo(animTo) < 0.05) animTo = null; }

  // Dokunulan yer: önce yapının kendisi, yoksa ekranda en yakın yer.
  const groups = () => slots.filter(s => s.group).map(s => s.group);
  function hitSlot(s, sx, sy) {
    ndc.set(sx / Wd * 2 - 1, -(sy / Hd) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(groups(), true)[0];
    if (hit) { let o = hit.object; while (o && o.userData.slot === undefined) o = o.parent; if (o) return o.userData.slot; }
    let best = null, bd = Infinity;
    for (const sl of slots) {
      const p = sl.p, [px, py] = project(p.x, p.y + 0.5, p.z), [qx] = project(p.x + 3, p.y + 0.5, p.z);
      const d = Math.hypot(px - sx, py - sy), r = Math.max(40, Math.abs(qx - px));
      if (d < r && d < bd) { bd = d; best = p.id; }
    }
    return best;
  }

  // ---------- kalite ----------
  let quality = 0;
  const fpsMon = createFpsMonitor({ onSlow: () => { if (quality < 3 && !document.hidden) stepQuality(); } });
  document.addEventListener('visibilitychange', () => fpsMon.reset());
  canvas.addEventListener('webglcontextrestored', () => { fpsMon.reset(); for (const sl of slots) sl.key = null; });
  function stepQuality() {
    quality++;
    if (quality === 1) { sun.castShadow = false; renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
    if (quality === 2) grass.count = Math.floor(grass.count / 2);
    if (quality === 3) { pr = 1; renderer.setPixelRatio(1); resize(); }
  }

  // ---------- çizim ----------
  let winterNow = null;
  function setWinter(w) {
    winterNow = w;
    terrainGeo.attributes.color.array.set(w ? colKis : colYaz); terrainGeo.attributes.color.needsUpdate = true;
    if (grass.instanceColor) { grass.instanceColor.array.set(w ? grassKis : grassYaz); grass.instanceColor.needsUpdate = true; }
    scene.background.copy(w ? SKY.kis : SKY.yaz); scene.fog.color.copy(w ? SKY.kis : SKY.yaz);
    sun.color.set(w ? '#e6eeff' : '#ffd9a0'); sun.intensity = w ? 1.3 : 2.2; hemi.color.set(w ? '#eef4ff' : '#fff1d0');
    water.material.color.set(w ? '#9fbccb' : '#5f9fb3'); snow.visible = w;
  }
  function draw(s, now, opt) {
    tick();
    const t = now / 1000, dt = opt.dt || 0.016, winter = isWinter(s, s.t);
    if (winter !== winterNow) setWinter(winter);
    for (const sl of slots) {
      const b = s.slots[sl.p.id] && s.slots[sl.p.id].b; syncSlot(sl, b, winter);
      const id = sl.p.id, sel = opt.selected === id, hint = opt.hint === id;
      sl.ring.visible = !b && (sel || hint || !!opt.showPlots);
      if (sl.ring.visible) { sl.ring.material.opacity = sel || hint ? 0.95 : 0.45; sl.ring.scale.setScalar(hint ? 1 + 0.08 * Math.sin(t * 5) : 1); }
      if (sl.group && sl.group.userData.anim) sl.group.userData.anim(t, dt);
      // göstergeler
      let html = '';
      if (b && b.job) { const u = Math.max(0, Math.min(1, (s.t - b.job.start) / (b.job.end - b.job.start))); html = `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" class="bg"/><circle cx="18" cy="18" r="14" class="fg" stroke-dasharray="${(u * 88).toFixed(1)} 88"/></svg><i>⚒</i>`; }
      else if (b && b.type === 'tarla' && b.level && b.crop && b.crop.prog >= 1) html = '<b class="bub">🌾</b>';
      else if (b && b.type === 'tarla' && b.level >= 1 && !b.crop) html = '<b class="bub">🌱</b>';
      if (html || marks.has(id)) {
        const m = mark(id); if (m.html !== html) { m.html = html; m.el.innerHTML = html; }
        if (html) { const p = sl.p, bob = html.includes('bub') ? Math.sin(t * 4) * 4 : 0, [x, y, zz] = project(p.x, p.y + (sl.h || 3) + 0.8, p.z); m.el.style.transform = `translate(${x}px, ${y - bob}px)`; m.el.style.display = zz < 1 ? 'block' : 'none'; }
        else m.el.style.display = 'none';
      }
    }
    // seçili yapının halkası
    const ss = opt.selected != null ? slots[opt.selected] : null;
    selRing.visible = !!(ss && ss.group);
    if (selRing.visible) { selRing.scale.setScalar((ss.r || 3) + 0.8); selRing.position.set(ss.p.x, ss.p.y + 0.15, ss.p.z); selRing.material.opacity = 0.6 + Math.sin(t * 5) * 0.3; }
    // duman ve kar
    const h0 = W[0];
    for (const sp of smoke) { sp.userData.t = (sp.userData.t + dt * 0.12) % 1; const k = sp.userData.t; sp.position.set(h0.x + Math.sin(k * 5) * 0.6 + k * 2, h0.y + 1.8 + k * 9, h0.z - k * 1.5); sp.scale.setScalar(0.8 + k * 3); sp.material.opacity = 0.45 * (1 - k); }
    if (snow.visible) { const a = snowGeo.attributes.position.array; for (let i = 0; i < snowN; i++) { a[i * 3 + 1] -= dt * 4; a[i * 3] += Math.sin(t + i) * dt * 0.5; if (a[i * 3 + 1] < -1) a[i * 3 + 1] = 40; } snowGeo.attributes.position.needsUpdate = true; snow.position.set(target.x, 0, target.z); }
    // yüzen yazılar
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.t += dt; if (f.t > 1.8) { f.el.remove(); floats.splice(i, 1); continue; }
      const sl = slots[f.id], [x, y] = project(sl.p.x, sl.p.y + (sl.h || 3) + 1.5, sl.p.z);
      f.el.style.transform = `translate(${x}px, ${y - f.t * 50}px)`; f.el.style.opacity = Math.min(1, 2 * (1.8 - f.t));
    }
    renderer.render(scene, camera);
    fpsMon.frame();
  }

  resize(); focus(0);
  return { scene, camera, P: W, resize, pan, zoomAt, focus, reveal, glide, hitSlot, draw, floatText, project, get fps() { return fpsMon.fps; }, get quality() { return quality; } };
}
