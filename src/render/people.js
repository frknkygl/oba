// Obada dolaşan insanlar, koyunlar, kurt, askerler ve baskıncılar (yalnızca görüntü; kurallara dokunmaz).
import * as THREE from '../../vendor/three.module.js';
import { UNITS } from '../data/units.js';
import { height } from './layout.js';
import { mat, bake } from './models.js';

const lerp = (a, b, t) => a + (b - a) * t;
const geo = { body: new THREE.CylinderGeometry(0.28, 0.42, 1.2, 7), head: new THREE.SphereGeometry(0.26, 8, 6), hat: new THREE.CylinderGeometry(0.3, 0.3, 0.18, 8), stick: new THREE.CylinderGeometry(0.04, 0.04, 2.4, 4),
  horse: new THREE.BoxGeometry(0.6, 0.7, 1.8), leg: new THREE.CylinderGeometry(0.07, 0.07, 0.8, 4), neck: new THREE.BoxGeometry(0.35, 0.8, 0.35), wool: new THREE.SphereGeometry(0.55, 8, 6), small: new THREE.SphereGeometry(0.25, 6, 5) };
const mesh = (g, color, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(g, mat(color)); m.position.set(x, y, z); m.castShadow = true; return m; };
const CLOTH = ['#a8452c', '#3d6f8f', '#7a5a2a', '#5a7a3a', '#8a3a5a', '#c9883a'];

function person(cloth, hat = '#4a2e1a') {
  const g = new THREE.Group();
  g.add(mesh(geo.body, cloth, 0, 0.85, 0)); g.add(mesh(geo.head, '#d9a77a', 0, 1.68, 0)); g.add(mesh(geo.hat, hat, 0, 1.9, 0));
  return g;
}
function horse(color = '#6b4a2e') {
  const g = new THREE.Group();
  g.add(mesh(geo.horse, color, 0, 1.15, 0)); const n = mesh(geo.neck, color, 0, 1.6, 0.85); n.rotation.x = 0.5; g.add(n);
  for (const [x, z] of [[-0.2, -0.65], [0.2, -0.65], [-0.2, 0.65], [0.2, 0.65]]) g.add(mesh(geo.leg, '#3a2a1a', x, 0.4, z));
  return g;
}
function soldier(unit) {
  const U = UNITS[unit], cloth = { mizrakci: '#7a2e22', okcu: '#3d6f8f', atli: '#6a5a2a', atliokcu: '#2f5f86', zirhli: '#4a4a50' }[unit] || '#7a2e22';
  const g = new THREE.Group(), mounted = U.cls === 'at' || unit === 'atliokcu';
  const p = person(cloth, '#3a2a1a');
  if (mounted) { g.add(horse(unit === 'zirhli' ? '#55555c' : '#6b4a2e')); p.position.y = 1.0; p.scale.setScalar(0.85); }
  g.add(p);
  if (U.cls === 'mizrak' || unit === 'zirhli') g.add(mesh(geo.stick, '#5d3c22', 0.4, (mounted ? 1.9 : 1.2), 0.1));
  if (U.cls === 'ok') { const bow = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 4, 10, Math.PI), mat('#5d3c22')); bow.position.set(0.35, mounted ? 2.0 : 1.2, 0); bow.rotation.z = Math.PI / 2; g.add(bow); }
  return g;
}
function sheep() {
  const g = new THREE.Group();
  g.add(mesh(geo.wool, '#f4efe2', 0, 0.7, 0)); g.add(mesh(geo.small, '#3a2e26', 0, 0.85, 0.55));
  for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) g.add(mesh(geo.leg, '#3a2e26', x, 0.22, z));
  g.scale.setScalar(0.85); return g;
}
function wolf() {
  const g = new THREE.Group(), c = '#8d8a84';
  const b = mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.6, 6), c, 0, 0.7, 0); b.rotation.x = Math.PI / 2; g.add(b);
  const h = mesh(new THREE.ConeGeometry(0.3, 0.8, 6), c, 0, 0.95, 1.1); h.rotation.x = Math.PI / 2; g.add(h);
  for (const x of [-0.18, 0.18]) g.add(mesh(new THREE.ConeGeometry(0.1, 0.3, 4), c, x, 1.3, 0.85));
  const t = mesh(new THREE.ConeGeometry(0.15, 1, 5), c, 0, 0.6, -1.1); t.rotation.x = -2.2; g.add(t);
  return g;
}
function raider() { const g = new THREE.Group(); g.add(horse('#2a2a2a')); const p = person('#3a2a2a', '#1a1a1a'); p.position.y = 1.0; p.scale.setScalar(0.85); g.add(p); g.add(mesh(geo.stick, '#3a2a1a', 0.4, 1.9, 0.1)); return g; }

export function createPeople(view) {
  const P = view.P, pool = new Map();
  function get(key, make) { let o = pool.get(key); if (!o) { o = bake(make()); pool.set(key, o); view.scene.add(o); } o.visible = true; o.userData.used = true; return o; }
  function put(o, x, z, rotY, bob = 0) { o.position.set(x, height(x, z) + bob, z); o.rotation.y = rotY; }
  return {
    update(s, now) {
      const t = now / 1000, home = P[0];
      for (const o of pool.values()) o.userData.used = false;
      // işçiler: ocak ile işyeri arasında gidip gelir
      let n = 0;
      for (const x of s.slots) {
        const b = x.b; if (!b || !b.workers || x.id === 0) continue;
        const p = P[x.id];
        for (let i = 0; i < Math.min(2, b.workers) && n < 40; i++, n++) {
          const period = 14 + (x.id % 5) * 2, ph = (t / period + i * 0.47 + x.id * 0.13) % 1, there = ph < 0.5, u = there ? ph * 2 : (1 - ph) * 2, k = u * u * (3 - 2 * u);
          const hx = home.x + (i ? 3 : -3), hz = home.z + 3, dx = home.x - p.x, dz = home.z - p.z, dl = Math.hypot(dx, dz) || 1;
          const tx = p.x + dx / dl * 3.5, tz = p.z + dz / dl * 3.5, wx = lerp(hx, tx, k), wz = lerp(hz, tz, k);
          const walking = k > 0.04 && k < 0.96, dir = there ? Math.atan2(tx - hx, tz - hz) : Math.atan2(hx - tx, hz - tz);
          put(get(`w${x.id}:${i}`, () => person(CLOTH[(x.id + i) % CLOTH.length])), wx, wz, dir, walking ? Math.abs(Math.sin(t * 9 + i)) * 0.15 : 0);
        }
        if (b.type === 'agil' && b.level) for (let i = 0; i < 2 + Math.min(3, b.level); i++) {
          const a = t * 0.15 + i * 2.1 + x.id, r = 1.6 + 1.2 * Math.abs(Math.sin(i * 3.1));
          put(get(`k${x.id}:${i}`, sheep), p.x + Math.cos(a) * r, p.z + Math.sin(a) * r, -a);
        }
      }
      // kurt ocağın yanında
      put(get('kurt', wolf), home.x + 6.2, home.z + 4.2, -0.8);
      // evdeki askerler kışlanın önünde
      const ks = s.slots.find(x => x.b && x.b.type === 'kisla' && x.b.level);
      if (ks) {
        const p = P[ks.id], dx = home.x - p.x, dz = home.z - p.z, dl = Math.hypot(dx, dz) || 1, fx = dx / dl, fz = dz / dl; let i = 0;
        for (const u in s.army.home) for (let j = 0; j < Math.min(3, Math.ceil(s.army.home[u] / 10)) && i < 8; j++, i++) {
          const side = (i - 3.5) * 1.6, row = 7.5 + (i % 2) * 1.6;
          put(get(`a${u}:${j}`, () => soldier(u)), p.x + fx * row - fz * side, p.z + fz * row + fx * side, Math.atan2(fx, fz));
        }
      }
      // görülen baskın: batıdan oba merkezine doğru
      if (s.raid && s.raid.seen) {
        const left = Math.max(0, (s.raid.arrive - s.t) / Math.max(1, s.raid.arrive - s.raid.seenAt));
        for (let i = 0; i < 5; i++) put(get('r' + i, raider), lerp(home.x - 14, -75, left) - i * 3.2, home.z + 6 + (i % 2) * 3, Math.PI / 2, Math.abs(Math.sin(t * 10 + i)) * 0.25);
      }
      for (const o of pool.values()) if (!o.userData.used) o.visible = false;
    },
  };
}
