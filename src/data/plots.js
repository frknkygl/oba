// Yapı yerleri: harita resminin oransal koordinatları (u: soldan, v: yukarıdan, 0..1).
// Harita perspektifli: uzaktaki (v küçük) yapılar daha küçük çizilir.
const rows = [
  [0.37, [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.82]],
  [0.46, [0.19, 0.31, 0.42, 0.58, 0.69, 0.81]],
  [0.56, [0.12, 0.25, 0.37, 0.63, 0.75, 0.88]],
  [0.67, [0.10, 0.23, 0.36, 0.50, 0.64, 0.77, 0.90]],
  [0.78, [0.18, 0.34, 0.50, 0.66, 0.82]],
];
const CAYIR = rows.flatMap(([v, us]) => us.map(u => [u, v]));
// Kimlik = dizideki sıra (durumdaki slots dizisi bu sırayla kurulur).
export const PLOTS = [
  { kind: 'merkez', u: 0.50, v: 0.56 },
  ...CAYIR.map(([u, v]) => ({ kind: 'cayir', u, v })),
  ...[[0.64, 0.275], [0.72, 0.30], [0.80, 0.32], [0.88, 0.34], [0.96, 0.36]].map(([u, v]) => ({ kind: 'nehir', u, v })),
  ...[[0.925, 0.195], [0.975, 0.21]].map(([u, v]) => ({ kind: 'dag', u, v })),
].map((p, id) => ({ id, ...p }));
export const HORIZON = 0.15;
// Perspektif ölçeği: v'ye göre 0.42 (ufuk yakını) .. 1.2 (ön)
export const depthScale = v => 0.42 + (v - 0.18) * 1.3;
