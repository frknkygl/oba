import { RESEARCH } from '../data/research.js';
export function bonus(s, key) {
  let v = 0;
  for (const id in s.researched) if (s.researched[id]) { const f = RESEARCH[id].fx[key]; if (f) v += f; }
  return v;
}
export function canResearch(s, id) {
  const r = typeof id === 'string' && Object.hasOwn(RESEARCH, id) ? RESEARCH[id] : null;
  if (!r) return 'yok';
  if (s.researched[id]) return 'yapildi';
  if (r.age > s.age || buildingLevel(s, 'kam') < r.kam || !r.req.every(q => s.researched[q])) return 'kilitli';
  if (s.research) return 'mesgul';
  return null;
}
export function buildingLevel(s, type) {
  let L = 0; for (const x of s.slots) if (x.b && x.b.type === type) L = Math.max(L, x.b.level); return L;
}
