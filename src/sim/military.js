import { UNITS, BEATS } from '../data/units.js';
import { CAMPS, CAMP_GROW, CAMP_RESPAWN_MS } from '../data/camps.js';
import { RAID } from '../data/ages.js';
import { RES } from '../data/resources.js';
import { BUILDINGS } from '../data/buildings.js';
import { rand } from './rng.js';
import { bonus, buildingLevel } from './research.js';
import { zeroUnits } from './state.js';

const BEATEN_BY = Object.fromEntries(Object.entries(BEATS).map(([a, b]) => [b, a]));
function strength(units, field, bonusFn) {
  const by = { mizrak: 0, ok: 0, at: 0 };
  for (const k in units) if (units[k] > 0 && UNITS[k]) by[UNITS[k].cls] += UNITS[k][field] * units[k] * (1 + bonusFn(UNITS[k].cls, k));
  return by;
}
const share = by => { const t = by.mizrak + by.ok + by.at; return t ? { mizrak: by.mizrak / t, ok: by.ok / t, at: by.at / t } : { mizrak: 0, ok: 0, at: 0 }; };
function effective(mine, theirs) {
  const sh = share(theirs); let v = 0;
  for (const c in mine) v += mine[c] * (1 + 0.5 * sh[BEATS[c]] - 0.33 * sh[BEATEN_BY[c]]);
  return v;
}
// opt: { atk(cls,unit), def(cls,unit), tower, defLossOnLose } ; rnd: () => [0,1)
export function battle(att, def, opt = {}, rnd = Math.random) {
  const A = strength(att, 'atk', opt.atk || (() => 0)), D = strength(def, 'def', opt.def || (() => 0));
  const aPow = effective(A, D) * (0.9 + 0.2 * rnd());
  const dPow = (effective(D, A) + (opt.tower || 0)) * (0.9 + 0.2 * rnd());
  const win = aPow > dPow;
  const wF = Math.min(0.9, 0.85 * Math.pow(Math.min(aPow, dPow) / Math.max(aPow, dPow, 1e-9), 1.5));
  const loss = (u, f) => Object.fromEntries(Object.keys(u).map(k => [k, Math.min(u[k], Math.round(u[k] * f))]));
  return { win, aPow: Math.round(aPow), dPow: Math.round(dPow), attLost: loss(att, win ? wF : 1), defLost: loss(def, win ? (opt.defLossOnLose ?? 1) : wF) };
}
const minus = (u, l) => Object.fromEntries(Object.keys(u).map(k => [k, Math.max(0, u[k] - (l[k] || 0))]));
const total = u => Object.values(u).reduce((a, b) => a + b, 0);
export function playerOpt(s) {
  const dem = buildingLevel(s, 'demirci');
  return {
    atk: (cls, k) => bonus(s, 'atk.' + cls) + (UNITS[k].demirci ? dem * 0.05 : 0),
    def: (cls, k) => bonus(s, 'def') + (UNITS[k].demirci ? dem * 0.05 : 0),
  };
}
export function campUnits(s, id) {
  const c = CAMPS[id], f = Math.pow(CAMP_GROW, s.camps[id].lvl);
  return { ...zeroUnits(), ...Object.fromEntries(Object.entries(c.units).map(([k, v]) => [k, Math.round(v * f)])) };
}
export function campLoot(s, id) { const f = Math.pow(CAMP_GROW, s.camps[id].lvl); return Object.fromEntries(Object.entries(CAMPS[id].loot).map(([k, v]) => [k, Math.round(v * f)])); }
export const campReady = (s, id) => CAMPS[id].age <= s.age && s.t >= s.camps[id].respawnAt;
const report = (s, r) => { s.reports.unshift({ id: s.nextId++, ...r }); s.reports.length = Math.min(s.reports.length, 20); };

export function towerPower(s) { let p = 0; for (const x of s.slots) if (x.b && x.b.type === 'gozcu') p += BUILDINGS.gozcu.tower * x.b.level; return p * (1 + bonus(s, 'tower')); }
export function towerWarn(s) { let L = 0; for (const x of s.slots) if (x.b && x.b.type === 'gozcu') L += x.b.level; return L * RAID.warnPerTower; }

// Zamanlı askerî olaylar; advance her bölüt sonunda çağırır.
export function stepMilitary(s, ev) {
  while (s.train.length && s.train[0].end <= s.t) { const q = s.train.shift(); s.army.home[q.unit] += q.n; ev.push({ type: 'trained', unit: q.unit, n: q.n }); }
  for (const o of s.army.out.slice()) {
    if (!o.result && o.arrive <= s.t && s.camps[o.camp].respawnAt > o.arrive) {
      o.result = { win: false, empty: true, lost: {}, killed: {}, loot: {}, aPow: 0, dPow: 0 };
    }
    if (!o.result && o.arrive <= s.t) {
      const def = campUnits(s, o.camp), b = battle(o.units, def, { ...playerOpt(s) }, () => rand(s));
      const left = minus(o.units, b.attLost), loot = b.win ? campLoot(s, o.camp) : {};
      o.result = { win: b.win, lost: b.attLost, killed: b.defLost, loot, aPow: b.aPow, dPow: b.dPow };
      if (b.win) { s.camps[o.camp].lvl++; s.camps[o.camp].respawnAt = o.arrive + CAMP_RESPAWN_MS; }
      o.units = left;
      if (!total(left)) { s.army.out.splice(s.army.out.indexOf(o), 1); report(s, { kind: 'sefer', t: o.arrive, camp: o.camp, ...o.result, loot: {} }); ev.push({ type: 'expedition', win: false, camp: o.camp }); }
    }
    if (o.result && o.back <= s.t) {
      s.army.out.splice(s.army.out.indexOf(o), 1);
      for (const k in o.units) s.army.home[k] += o.units[k];
      for (const r in o.result.loot) s.res[r] = Math.min(s.cap[r], s.res[r] + o.result.loot[r]);
      report(s, { kind: 'sefer', t: o.back, camp: o.camp, ...o.result });
      ev.push({ type: 'expedition', win: o.result.win, camp: o.camp });
    }
  }
  // baskın
  if (!s.raid && s.t >= s.nextRaidT) {
    const budget = Math.max(40, s.power * RAID.share), w = [rand(s) + 0.2, rand(s) + 0.2, rand(s) + 0.2], ws = w[0] + w[1] + w[2];
    const units = { ...zeroUnits(), mizrakci: Math.round(budget * w[0] / ws / 10), okcu: Math.round(budget * w[1] / ws / 9.5), atli: Math.round(budget * w[2] / ws / 11.5) };
    const arrive = s.t + 10 * 60e3;
    s.raid = { arrive, units, seen: false };
  }
  // gözcüler baskını kule gücüne göre önceden görür (baskın yoldayken kurulan kule de sayılır)
  if (s.raid && !s.raid.seen && towerWarn(s) > 0 && s.t >= s.raid.arrive - towerWarn(s) && s.t < s.raid.arrive) { s.raid.seen = true; s.raid.seenAt = s.t; ev.push({ type: 'raidSeen', arrive: s.raid.arrive }); }
  if (s.raid && s.raid.arrive <= s.t) {
    const raid = s.raid, opt = playerOpt(s);
    const b = battle(raid.units, s.army.home, { def: opt.def, tower: towerPower(s), defLossOnLose: 0.6 }, () => rand(s));
    s.army.home = minus(s.army.home, b.defLost);
    const stolen = {};
    if (b.win) { const f = 0.1 + 0.15 * rand(s); for (const r of RES) { stolen[r] = Math.floor(s.res[r] * f); s.res[r] -= stolen[r]; } }
    report(s, { kind: 'baskin', t: raid.arrive, win: !b.win, raiders: raid.units, lost: b.defLost, killed: b.attLost, stolen, aPow: b.dPow, dPow: b.aPow });
    ev.push({ type: 'raid', win: !b.win });
    s.raid = null;
    s.nextRaidT = raid.arrive + RAID.gapMin + rand(s) * (RAID.gapMax - RAID.gapMin);
  }
}
export function nextMilitaryT(s) {
  let n = Infinity;
  if (s.train.length) n = Math.min(n, s.train[0].end);
  for (const o of s.army.out) n = Math.min(n, o.result ? o.back : o.arrive);
  n = Math.min(n, s.raid ? (s.raid.seen || !towerWarn(s) ? s.raid.arrive : Math.max(s.t + 1, Math.min(s.raid.arrive - towerWarn(s), s.raid.arrive))) : s.nextRaidT);
  return n;
}
