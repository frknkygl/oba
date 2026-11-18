// Yapı ve seviye -> resim anahtarı; yapı türüne göre göreli boy.
export function spriteFor(b, winter) {
  if (b.level === 0) return 'b_iskele';
  if (b.type === 'tarla') { if (!b.crop) return winter ? 'b_tarla_kar' : 'b_tarla_bos'; if (b.crop.prog >= 1) return 'b_tarla_olgun'; return winter ? 'b_tarla_kar' : 'b_tarla_filiz'; }
  if (b.type === 'ocak') return b.level >= 5 ? 'b_ocak3' : b.level >= 3 ? 'b_ocak2' : 'b_ocak1';
  if (b.type === 'demirocagi' || b.type === 'demirci') return 'b_' + b.type;
  return 'b_' + b.type + (b.level >= 3 ? '2' : '1');
}
export const SIZE = { ocak: 1.0, cadir: 0.8, tarla: 0.95, avci: 0.85, agil: 0.9, oduncu: 0.8, kececi: 0.85, ambar: 0.95, kisla: 1.05, kam: 0.9, gozcu: 0.7, demirocagi: 0.9, demirci: 1.0 };
export const ALL_SPRITES = ['b_iskele', 'b_tarla_bos', 'b_tarla_filiz', 'b_tarla_olgun', 'b_tarla_kar', 'b_ocak1', 'b_ocak2', 'b_ocak3', 'b_demirocagi', 'b_demirci',
  ...['cadir', 'avci', 'agil', 'oduncu', 'kececi', 'ambar', 'kisla', 'kam', 'gozcu'].flatMap(t => ['b_' + t + '1', 'b_' + t + '2']),
  'u_kadin', 'u_erkek', 'u_mizrakci', 'u_okcu', 'u_atli', 'u_atliokcu', 'u_zirhli', 'u_koyun', 'u_baskinci', 'u_kurt'];
