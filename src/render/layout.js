// 3D dünyanın yerleşimi: arazi yüksekliği, nehir ve yerlerin dünya konumu (three.js'siz, sınanabilir).
import { PLOTS } from '../data/plots.js';

export const WATER_Y = -1.2;
export const OBA_CENTER = { x: 0, z: 8 };
export const BOUNDS = { minX: -62, maxX: 68, minZ: -52, maxZ: 48 };

const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, z) => noise(x, z) * 0.6 + noise(x * 2.1, z * 2.1) * 0.3 + noise(x * 4.3, z * 4.3) * 0.1;
const smooth = (x, a, b) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Nehir, kıyı yerlerinin (nehir türü) yaklaşık 7 birim kuzeyinden akar.
export const riverZ = x => -38.9 + 0.3 * (x - 16.8) + 1.5 * Math.sin(x / 11);

export function height(x, z) {
  const r = Math.hypot(x - OBA_CENTER.x, (z - OBA_CENTER.z) * 1.2);
  const open = smooth(r, 40, 65);
  let h = (fbm(x / 18, z / 18) - 0.3) * 2.6 * (0.2 + open);
  const rz = riverZ(x), d = Math.abs(z - rz);
  if (d < 4.5) h = Math.min(h, -0.2) - (1 - d / 4.5) ** 1.2 * 2.6;
  const north = rz - z;                       // nehrin kuzeyi: dağ etekleri
  if (north > 8) h += Math.pow(north - 8, 1.3) * (0.75 + 0.5 * fbm(x / 10, z / 10));
  const side = Math.max(0, Math.abs(x - 3) - 62);
  if (side > 0) h += Math.pow(side, 1.3) * 0.6 * (0.6 + fbm(x / 12, z / 12));
  return h;
}

const cache = new Map();
export function plotWorld(id) {
  if (cache.has(id)) return { ...cache.get(id) };
  const p = PLOTS[id];
  const x = (p.u - 0.5) * 120 + OBA_CENTER.x, z = (p.v - 0.56) * 140 + OBA_CENTER.z;
  const out = { x, z, y: height(x, z) };
  cache.set(id, out);
  return { ...out };
}

// Kamera hedefinin gidebileceği alan.
export function clampTarget(x, z) {
  return { x: Math.max(BOUNDS.minX + 8, Math.min(BOUNDS.maxX - 8, x)), z: Math.max(BOUNDS.minZ + 14, Math.min(BOUNDS.maxZ - 6, z)) };
}
