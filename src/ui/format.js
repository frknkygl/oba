import { RES_AD } from '../data/resources.js';
export const ICON = { wheat: '🌾', meat: '🍖', wood: '🪵', wool: '🐑', felt: '🧶', iron: '⚒️', pop: '👥', power: '⚔️' };
export function fmt(n) { n = Math.floor(n); if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' Mn'; if (n >= 1e4) return Math.round(n / 1e3) + ' B'; if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + ' B'; return String(n); }
export function dur(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000)); if (s < 60) return s + ' sn';
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d) return d + ' gün ' + (h % 24) + ' sa'; if (h) return h + ' sa ' + (m % 60) + ' dk'; return m + ' dk' + (s % 60 && m < 10 ? ' ' + (s % 60) + ' sn' : '');
}
export const ERR = {
  kaynak: 'Kaynak yetmiyor.', mesgul: 'Bütün ustalar çalışıyor; bir iş bitsin.', kilitli: 'Bu henüz açılmadı.', seviye: 'Önce ocağı yükselt.',
  sinir: 'Bu sınıra ulaştın; ocağı ya da kışlayı yükselt.', yer: 'Buraya kurulamaz.', nufus: 'Yeterli insan yok.', asker: 'Yeterli asker yok.',
  yok: 'Bu şimdi yapılamaz.', tekrar: '', yapildi: 'Bu bilgi zaten açık.',
};
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function costHtml(s, cost, n = 1) {
  return Object.keys(cost).map(r => { const need = cost[r] * n, ok = s.res[r] >= need; return `<span class="c${ok ? '' : ' eksik'}" title="${RES_AD[r]}">${ICON[r]} ${fmt(need)}</span>`; }).join('');
}
