import { UNITS } from '../data/units.js';
export function armyPower(units) { let p = 0; for (const k in units) if (UNITS[k]) p += units[k] * (UNITS[k].atk + UNITS[k].def) / 2; return p; }
export function power(s) {
  let p = s.pop * 2;
  for (const x of s.slots) if (x.b && x.b.level) p += Math.pow(x.b.level, 1.5) * (x.b.type === 'ocak' ? 40 : 10);
  p += armyPower(s.army.home);
  for (const o of s.army.out) p += armyPower(o.units);
  for (const q of s.train) p += armyPower({ [q.unit]: q.n });
  p += Object.keys(s.researched).length * 25;
  p += (s.age - 1) * 500;
  return Math.round(p);
}
