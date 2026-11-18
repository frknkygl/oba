import { START_RES, BASE_CAP, RES } from '../data/resources.js';
import { BUILDINGS } from '../data/buildings.js';
import { PLOTS } from '../data/plots.js';
import { CAMPS } from '../data/camps.js';
import { UNIT_KEYS } from '../data/units.js';
import { RAID } from '../data/ages.js';
import { rand } from './rng.js';
import { bonus, buildingLevel } from './research.js';
import { power } from './power.js';

export const START_TENT = 10;   // ocağın sol önündeki yer
export const zeroUnits = () => Object.fromEntries(UNIT_KEYS.map(k => [k, 0]));
export function createState(seed = 1, now = 0) {
  const slots = PLOTS.map(p => ({ id: p.id, kind: p.kind, b: null }));
  slots[0].b = { type: 'ocak', level: 1, workers: 0, manual: false, job: null };
  slots[START_TENT].b = { type: 'cadir', level: 1, workers: 0, manual: false, job: null };
  const s = {
    v: 1, seed, rng: (seed >>> 0) || 1, t0: now, t: now, age: 1,
    res: { ...START_RES }, cap: {}, pop: 5, popCap: 0, growAcc: 0, hungry: false,
    slots, train: [], research: null,
    army: { home: zeroUnits(), out: [] },
    researched: {}, raid: null, nextRaidT: 0,
    camps: Object.fromEntries(Object.keys(CAMPS).map(k => [k, { lvl: 0, respawnAt: 0 }])),
    reports: [], power: 0, best: 0, guide: { step: 0 }, seen: [], nextId: 1, flags: {},
  };
  s.nextRaidT = now + RAID.firstMin + rand(s) * 3600e3;
  recompute(s);
  return s;
}
// Ambar seviyesi L ve bilgi artışıyla depo sınırı. 5'e kadar doğrusal, ikinci çağda katlanarak.
export function capFor(amb, bonusCap = 0) {
  const grow = L => (L <= 5 ? L : 5 * Math.pow(1.95, L - 5)), out = {};
  for (const r of RES) out[r] = Math.round((BASE_CAP[r] + grow(amb) * (r === 'iron' ? 150 : 500)) * (1 + bonusCap));
  return out;
}
export function recompute(s) {
  Object.assign(s.cap, capFor(buildingLevel(s, 'ambar'), bonus(s, 'cap')));
  if (s.dev && s.capBoost) for (const r of RES) s.cap[r] = s.capBoost;   // yalnız testlerde
  let pc = 0;
  for (const x of s.slots) if (x.b && x.b.level && BUILDINGS[x.b.type].popCap) pc += BUILDINGS[x.b.type].popCap * x.b.level;
  s.popCap = pc;
  s.power = power(s); s.best = Math.max(s.best, s.power);
}
export const serialize = s => JSON.stringify(s);
export function deserialize(str) {
  try {
    const s = JSON.parse(str);
    if (!s || s.v !== 1 || !Array.isArray(s.slots) || !s.res || !s.army || typeof s.t !== 'number') return null;
    // sonradan eklenen alanları varsayılanlarla tamamla
    const d = createState(s.seed || 1, s.t);
    for (const k in d) if (!(k in s)) s[k] = d[k];
    for (const k of ['res', 'cap', 'camps']) for (const j in d[k]) if (!(j in s[k])) s[k][j] = d[k][j];
    for (const j in d.army.home) if (!Number.isFinite(s.army.home[j])) s.army.home[j] = 0;
    if (!Array.isArray(s.army.out)) s.army.out = [];
    for (const r in s.res) if (!Number.isFinite(s.res[r])) s.res[r] = 0;
    if (s.slots.length < d.slots.length) for (let i = s.slots.length; i < d.slots.length; i++) s.slots.push(d.slots[i]);
    return s;
  } catch { return null; }
}
