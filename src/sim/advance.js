import { OFFLINE_CAP_MS } from '../data/resources.js';
import { stepEconomy } from './economy.js';
import { stepMilitary, nextMilitaryT } from './military.js';
import { recompute } from './state.js';

const SEG = 30000;
function stepJobs(s, ev) {
  let changed = false;
  for (const x of s.slots) {
    const b = x.b; if (!b || !b.job || b.job.end > s.t) continue;
    b.level++; ev.push({ type: b.job.kind === 'build' ? 'built' : 'upgraded', slot: x.id, b: b.type, level: b.level }); b.job = null; changed = true;
    if (b.type === 'tarla' && b.crop === undefined) b.crop = null;
  }
  if (s.research && s.research.end <= s.t) { s.researched[s.research.id] = true; ev.push({ type: 'researched', id: s.research.id }); s.research = null; changed = true; }
  if (changed) recompute(s);
}
function nextT(s) {
  let n = Infinity;
  for (const x of s.slots) if (x.b && x.b.job) n = Math.min(n, x.b.job.end);
  if (s.research) n = Math.min(n, s.research.end);
  return Math.min(n, nextMilitaryT(s));
}
// Durumu `now` anına ilerletir. Geri giden zamanı yok sayar; kapalıyken geçen süreyi en çok 12 saat telafi eder.
export function advance(s, now) {
  const ev = [];
  if (!(now > s.t)) return ev;
  const end = Math.min(now, s.t + OFFLINE_CAP_MS);
  while (s.t < end) {
    // bölüt sonları t0'dan itibaren sabit bir ızgaraya hizalı: ne sıklıkla çağrılırsa çağrılsın aynı sonuç (telefon = sunucu)
    let grid = s.t0 + (Math.floor((s.t - s.t0) / SEG) + 1) * SEG;
    if (!(grid > s.t) || grid - s.t > SEG) grid = s.t + SEG;   // bozuk t0'a karşı
    const next = Math.max(s.t + 1, Math.min(end, grid, nextT(s)));
    stepEconomy(s, (next - s.t) / 1000, ev);
    s.t = next;
    stepJobs(s, ev);
    stepMilitary(s, ev);
  }
  if (now > s.t) {
    // 12 saati aşan kısım atlanır: baskın sayaçları da ertelenir, o aralıkta biten işler şimdi bildirilir
    const skip = now - s.t; s.nextRaidT += skip;
    if (s.raid) { s.raid.arrive += skip; if (s.raid.seenAt) s.raid.seenAt += skip; }
    s.t = now; stepJobs(s, ev); stepMilitary(s, ev);
  }
  recompute(s);
  return ev;
}
