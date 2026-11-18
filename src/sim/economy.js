import { BUILDINGS, PROD_PER_LEVEL, maxWorkers } from '../data/buildings.js';
import { RES, EAT_PER_S, WINTER_EAT, SEASON_MS, FOOD_ORDER } from '../data/resources.js';
import { bonus, buildingLevel } from './research.js';

export const seasonOf = (s, t = s.t) => Math.floor((t - s.t0) / SEASON_MS) % 4;
export const isWinter = (s, t) => seasonOf(s, t) === 3;
export const soldiers = s => { let n = 0; for (const k in s.army.home) n += s.army.home[k]; for (const o of s.army.out) for (const k in o.units) n += o.units[k]; for (const q of s.train) n += q.n; return n; };
export const food = s => s.res.meat + s.res.wheat;
export const levelMult = L => 1 + PROD_PER_LEVEL * (L - 1);
export const growMs = (s, L) => BUILDINGS.tarla.crop.grow * Math.pow(0.9, L - 1) / (1 + bonus(s, 'crop')) * 1000;
export function cropYield(s, b) { const L = (b.crop && b.crop.L) || b.level, w = b.crop && b.crop.w !== undefined ? Math.max(b.crop.w, Math.min(b.workers, 99)) : b.workers; return Math.round(BUILDINGS.tarla.crop.yield * L * (1 + 0.25 * w) * (1 + bonus(s, 'prod.wheat'))); }
export const seedCost = b => BUILDINGS.tarla.crop.seed * b.level;

export function workerSlots(s) { return s.slots.filter(x => x.b && x.b.level >= 1 && BUILDINGS[x.b.type].workers); }
export function idle(s) { let n = s.pop; for (const x of workerSlots(s)) n -= x.b.workers; return n; }
export function assignWorkers(s) {
  const list = workerSlots(s); let free = s.pop;
  for (const x of list) { x.b.workers = Math.min(x.b.workers, maxWorkers(x.b.type, x.b.level)); if (x.b.manual) free -= x.b.workers; }
  if (free < 0) { for (const x of list.slice().reverse()) { if (free >= 0) break; if (x.b.manual) { const d = Math.min(x.b.workers, -free); x.b.workers -= d; free += d; } } }
  const auto = list.filter(x => !x.b.manual);
  for (const x of auto) x.b.workers = 0;
  let given = true;
  while (free > 0 && given) { given = false; for (const x of auto) if (free > 0 && x.b.workers < maxWorkers(x.b.type, x.b.level)) { x.b.workers++; free--; given = true; } }
}

// Saniyelik üretim oranları (kaynak başına) — arayüz de bunu gösterir.
export function rates(s) {
  const out = Object.fromEntries(RES.map(r => [r, 0])), mult = s.hungry ? 0.5 : 1;
  for (const x of workerSlots(s)) {
    const d = BUILDINGS[x.b.type]; if (!d.prod || !x.b.workers) continue;
    const k = x.b.workers * levelMult(x.b.level) * mult;
    for (const r in d.prod) out[r] += d.prod[r] * k * (1 + bonus(s, 'prod.' + r));
    if (d.uses) for (const r in d.uses) out[r] -= d.uses[r] * k;
  }
  const eat = (s.pop + soldiers(s)) * EAT_PER_S * (isWinter(s) ? WINTER_EAT : 1);
  out.food = -eat;
  return out;
}

export function stepEconomy(s, dt, ev) {
  assignWorkers(s);
  s.hungry = food(s) <= 0.0001;
  const mult = s.hungry ? 0.5 : 1;
  for (const x of workerSlots(s)) {
    const d = BUILDINGS[x.b.type]; if (!d.prod || !x.b.workers) continue;
    const k = x.b.workers * levelMult(x.b.level) * mult * dt;
    let frac = 1;
    if (d.uses) for (const r in d.uses) { const need = d.uses[r] * k; if (need > 0) frac = Math.min(frac, s.res[r] / need); }
    frac = Math.max(0, Math.min(1, frac));
    if (d.uses) for (const r in d.uses) s.res[r] -= d.uses[r] * k * frac;
    for (const r in d.prod) s.res[r] += d.prod[r] * k * frac * (1 + bonus(s, 'prod.' + r));
  }
  // tarlalar
  const winter = isWinter(s), ambar = buildingLevel(s, 'ambar') > 0;
  for (const x of s.slots) {
    const b = x.b; if (!b || b.type !== 'tarla' || b.level < 1 || !b.crop) continue;
    if (!winter && b.crop.prog < 1) b.crop.prog = Math.min(1, b.crop.prog + dt * 1000 / growMs(s, b.level));
    if (b.crop.prog >= 1 && ambar) {
      const y = cropYield(s, b); s.res.wheat += y; b.crop = null; s.flags.hasat = true; ev.push({ type: 'harvest', slot: x.id, auto: true, n: y });
      if (s.res.wheat >= seedCost(b)) { s.res.wheat -= seedCost(b); b.crop = { prog: 0, L: b.level, w: b.workers }; }
    }
  }
  // yemek
  let eat = (s.pop + soldiers(s)) * EAT_PER_S * (winter ? WINTER_EAT : 1) * dt;
  for (const r of FOOD_ORDER) { const t = Math.min(s.res[r], eat); s.res[r] -= t; eat -= t; }
  // nüfus
  if (!s.hungry && s.pop < s.popCap) {
    s.growAcc += dt * Math.max(1 / 60, s.popCap * 0.6 / 3600);
    while (s.growAcc >= 1 && s.pop < s.popCap) { s.pop++; s.growAcc -= 1; ev.push({ type: 'popUp' }); }
  }
  if (s.pop >= s.popCap) s.growAcc = 0;
  for (const r of RES) s.res[r] = Math.max(0, Math.min(s.cap[r], s.res[r]));
}
