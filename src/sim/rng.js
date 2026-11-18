// Durumda saklanan tohumdan deterministik rastgele sayı (sunucu ve telefon aynı sonucu alır).
export function rand(s) {
  let a = (s.rng = (s.rng + 0x6D2B79F5) | 0);
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const randf = s => () => rand(s);
