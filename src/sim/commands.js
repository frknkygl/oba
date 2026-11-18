import { BUILDINGS, MAX_LEVEL, levelCost, levelTime, maxWorkers, countLimit } from '../data/buildings.js';
import { UNITS, ARMY_PER_KISLA, TRAIN_PER_KISLA } from '../data/units.js';
import { CAMPS } from '../data/camps.js';
import { RESEARCH } from '../data/research.js';
import { AGES } from '../data/ages.js';
import { advance } from './advance.js';
import { recompute } from './state.js';
import { idle, seedCost, cropYield, soldiers } from './economy.js';
import { canResearch, bonus, buildingLevel } from './research.js';
import { campReady } from './military.js';

export const hasRes = (s, cost, n = 1) => Object.keys(cost).every(r => s.res[r] >= cost[r] * n);
export function missing(s, cost, n = 1) { const m = {}; for (const r in cost) if (s.res[r] < cost[r] * n) m[r] = Math.ceil(cost[r] * n - s.res[r]); return m; }
const pay = (s, cost, n = 1) => { for (const r in cost) s.res[r] -= cost[r] * n; };
export const jobCount = s => s.slots.filter(x => x.b && x.b.job).length;
export const jobLimit = s => { const L = buildingLevel(s, 'ocak'); return L >= 4 ? 3 : L >= 2 ? 2 : 1; };
export const countOf = (s, type) => s.slots.filter(x => x.b && x.b.type === type).length;
export const armyCap = s => buildingLevel(s, 'kisla') * ARMY_PER_KISLA;
export const trainMs = (s, unit) => UNITS[unit].time * 1000 / (1 + 0.1 * (buildingLevel(s, 'kisla') - 1)) / (1 + bonus(s, 'train'));

// Bir yapının kurulup kurulamayacağını ve nedenini söyler (arayüz de kullanır).
const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
export function checkBuild(s, slotId, type) {
  const x = Number.isInteger(slotId) ? s.slots[slotId] : null, d = own(BUILDINGS, type) ? BUILDINGS[type] : null;
  if (!x || !d || x.b || d.kind !== x.kind) return 'yer';
  if (d.age > s.age || d.unlock > buildingLevel(s, 'ocak')) return 'kilitli';
  if (countOf(s, type) >= countLimit(type, buildingLevel(s, 'ocak'))) return 'sinir';
  if (jobCount(s) >= jobLimit(s)) return 'mesgul';
  if (!hasRes(s, levelCost(type, 1))) return 'kaynak';
  return null;
}
export function checkUpgrade(s, slotId) {
  const x = Number.isInteger(slotId) ? s.slots[slotId] : null, b = x && x.b;
  if (!b || b.level < 1) return 'yok';
  if (b.job) return 'mesgul';
  const next = b.level + 1;
  if (next > MAX_LEVEL[s.age] || (b.type !== 'ocak' && next > buildingLevel(s, 'ocak'))) return 'seviye';
  if (jobCount(s) >= jobLimit(s)) return 'mesgul';
  if (!hasRes(s, levelCost(b.type, next))) return 'kaynak';
  return null;
}
export function checkTrain(s, unit, n) {
  const u = own(UNITS, unit) ? UNITS[unit] : null, L = buildingLevel(s, 'kisla');
  if (!u || !(n >= 1) || !Number.isInteger(n)) return 'yok';
  if (L < 1 || u.age > s.age || (u.demirci && buildingLevel(s, 'demirci') < 1)) return 'kilitli';
  if (n > TRAIN_PER_KISLA * L || soldiers(s) + n > armyCap(s)) return 'sinir';
  if (s.pop - n < 1) return 'nufus';
  if (!hasRes(s, u.cost, n)) return 'kaynak';
  return null;
}
export function checkAgeUp(s) {
  const a = AGES[s.age + 1]; if (!a) return 'yok';
  if (buildingLevel(s, 'ocak') < a.need.ocak || !s.researched[a.need.research]) return 'kilitli';
  if (!hasRes(s, a.cost)) return 'kaynak';
  return null;
}

const ok = ev => ({ ok: true, events: ev });
const no = (error, ev) => ({ ok: false, error, events: ev });

// Oyuncunun isteğini `now` anında doğrular ve uygular. Aynı kimlikli komut ikinci kez uygulanmaz.
export function apply(s, cmd, now) {
  const ev = advance(s, now);
  if (!cmd || typeof cmd.type !== 'string') return no('yok', ev);
  if (cmd.id !== undefined && (typeof cmd.id !== 'string' || cmd.id.length > 40)) return no('yok', ev);
  if (cmd.id && s.seen.includes(cmd.id)) return no('tekrar', ev);
  const t = s.t, x = Number.isInteger(cmd.slot) ? s.slots[cmd.slot] : null, b = x && x.b;
  let e = null;
  switch (cmd.type) {
    case 'build':
      if ((e = checkBuild(s, cmd.slot, cmd.b))) return no(e, ev);
      pay(s, levelCost(cmd.b, 1));
      x.b = { type: cmd.b, level: 0, workers: 0, manual: false, job: { kind: 'build', start: t, end: t + levelTime(cmd.b, 1) } };
      if (cmd.b === 'tarla') x.b.crop = null;
      break;
    case 'upgrade':
      if ((e = checkUpgrade(s, cmd.slot))) return no(e, ev);
      pay(s, levelCost(b.type, b.level + 1));
      b.job = { kind: 'upgrade', start: t, end: t + levelTime(b.type, b.level + 1) };
      break;
    case 'setWorkers': {
      if (!b || !BUILDINGS[b.type].workers || b.level < 1) return no('yok', ev);
      if (cmd.n === null) { b.manual = false; break; }
      if (!Number.isFinite(cmd.n)) return no('yok', ev);
      const want = Math.max(0, Math.min(maxWorkers(b.type, b.level), Math.floor(cmd.n)));
      const nw = Math.min(want, b.workers + Math.max(0, idle(s)) + countAutoWorkers(s, x.id));
      if (nw !== b.workers) { b.workers = nw; b.manual = true; }
      break;
    }
    case 'plant':
      if (!b || b.type !== 'tarla' || b.level < 1 || b.crop) return no('yok', ev);
      if (s.res.wheat < seedCost(b)) return no('kaynak', ev);
      s.res.wheat -= seedCost(b); b.crop = { prog: 0, L: b.level, w: b.workers };
      break;
    case 'harvest':
      if (!b || b.type !== 'tarla' || !b.crop || b.crop.prog < 1) return no('yok', ev);
      { const y = cropYield(s, b); s.res.wheat = Math.min(s.cap.wheat, s.res.wheat + y); b.crop = null; s.flags.hasat = true; ev.push({ type: 'harvest', slot: x.id, n: y }); }
      break;
    case 'train': {
      if ((e = checkTrain(s, cmd.unit, cmd.n))) return no(e, ev);
      pay(s, UNITS[cmd.unit].cost, cmd.n); s.pop -= cmd.n;
      const start = s.train.length ? s.train[s.train.length - 1].end : t;
      s.train.push({ unit: cmd.unit, n: cmd.n, start, end: start + trainMs(s, cmd.unit) * cmd.n });
      break;
    }
    case 'research':
      if ((e = canResearch(s, cmd.r))) return no(e, ev);
      if (!hasRes(s, RESEARCH[cmd.r].cost)) return no('kaynak', ev);
      pay(s, RESEARCH[cmd.r].cost); s.research = { id: cmd.r, start: t, end: t + RESEARCH[cmd.r].time * 1000 };
      break;
    case 'expedition': {
      const c = own(CAMPS, cmd.camp) ? CAMPS[cmd.camp] : null, u = cmd.units && typeof cmd.units === 'object' ? cmd.units : {};
      if (!c || !campReady(s, cmd.camp)) return no('kilitli', ev);
      if (s.army.out.some(o => o.camp === cmd.camp && !o.result)) return no('mesgul', ev);
      let n = 0;
      for (const k of Object.keys(u)) { if (!own(s.army.home, k) || !Number.isInteger(u[k]) || u[k] < 0 || u[k] > s.army.home[k]) return no('asker', ev); n += u[k]; }
      if (n < 1) return no('asker', ev);
      const units = { ...Object.fromEntries(Object.keys(s.army.home).map(k => [k, 0])), ...u };
      for (const k in u) s.army.home[k] -= u[k];
      s.army.out.push({ id: s.nextId++, camp: cmd.camp, units, depart: t, arrive: t + c.travel * 1000, back: t + 2 * c.travel * 1000, result: null });
      break;
    }
    case 'ageUp':
      if ((e = checkAgeUp(s))) return no(e, ev);
      pay(s, AGES[s.age + 1].cost); s.age++; ev.push({ type: 'ageUp', age: s.age });
      break;
    case 'guide': s.guide.step = cmd.reset ? 0 : Math.max(s.guide.step, cmd.step | 0); break;
    default: return no('yok', ev);
  }
  if (cmd.id) { s.seen.push(cmd.id); if (s.seen.length > 64) s.seen.shift(); }   // yalnızca başarılı komut hatırlanır
  recompute(s);
  return ok(ev);
}
function countAutoWorkers(s, exceptId) { let n = 0; for (const x of s.slots) if (x.id !== exceptId && x.b && !x.b.manual && x.b.workers) n += x.b.workers; return n; }
