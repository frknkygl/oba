// Haritada yürüyen insanlar, koyunlar, kurt, askerler ve baskıncılar (yalnızca görüntü; kurallara dokunmaz).
import { depthScale } from '../data/plots.js';
import { UNITS } from '../data/units.js';
const lerp = (a, b, t) => a + (b - a) * t;
export function createPeople(view) {
  const P = view.P;
  return {
    list(s, now) {
      const t = now / 1000, out = [], home = P[0];
      let n = 0;
      for (const x of s.slots) {
        const b = x.b; if (!b || !b.workers || x.id === 0) continue;
        const p = P[x.id];
        for (let i = 0; i < Math.min(2, b.workers) && n < 40; i++, n++) {
          const period = 14 + (x.id % 5) * 2, ph = ((t / period + i * 0.47 + x.id * 0.13) % 1), there = ph < 0.5, u = there ? ph * 2 : (1 - ph) * 2;
          const k = u * u * (3 - 2 * u), wx = lerp(home.x + 40 * (i ? 1 : -1), p.x, k), wy = lerp(home.y + 20, p.y + 10, k), ds = depthScale(wy / view.map[1]);
          const walking = k > 0.04 && k < 0.96;
          out.push({ kind: 'f', img: (x.id + i) % 2 ? 'u_kadin' : 'u_erkek', x: wx, y: wy, h: 115 * ds, flip: there ? p.x < home.x : p.x > home.x, bob: walking ? Math.abs(Math.sin(t * 9 + i)) * 4 * ds : 0 });
        }
        if (b.type === 'agil') for (let i = 0; i < 2 + Math.min(3, b.level); i++) {
          const a = t * 0.15 + i * 2.1 + x.id, r = 70 + 25 * Math.sin(i * 3.1), ds = depthScale(p.v);
          out.push({ kind: 'f', img: 'u_koyun', x: p.x + Math.cos(a) * r * ds, y: p.y + 20 * ds + Math.sin(a) * r * 0.4 * ds, h: 52 * ds, flip: Math.sin(a) > 0 });
        }
      }
      // kurt ocağın yanında
      out.push({ kind: 'f', img: 'u_kurt', x: home.x + 175, y: home.y + 40, h: 120 * depthScale(home.v) });
      // evdeki askerlerden birkaçı kışlanın önünde
      const k = s.slots.find(x => x.b && x.b.type === 'kisla' && x.b.level);
      if (k) { const p = P[k.id], ds = depthScale(p.v); let i = 0;
        for (const u in s.army.home) for (let j = 0; j < Math.min(3, Math.ceil(s.army.home[u] / 10)) && i < 8; j++, i++)
          out.push({ kind: 'f', img: 'u_' + u, x: p.x - 120 * ds + i * 34 * ds, y: p.y + 60 * ds + (i % 2) * 18 * ds, h: (UNITS[u].cls === 'at' || u === 'atliokcu' ? 125 : 105) * ds }); }
      // yaklaşan baskın
      if (s.raid && s.raid.seen) {
        const left = Math.max(0, (s.raid.arrive - s.t) / Math.max(1, s.raid.arrive - s.raid.seenAt));
        for (let i = 0; i < 5; i++) { const x = lerp(home.x - 260, -80, left) - i * 70, y = home.y + 80 + (i % 2) * 50, ds = depthScale(y / view.map[1]);
          out.push({ kind: 'f', img: 'u_baskinci', x, y, h: 135 * ds, bob: Math.abs(Math.sin(t * 10 + i)) * 6 * ds }); }
      }
      for (const f of out) f.kind = 'f';
      return out;
    },
  };
}
