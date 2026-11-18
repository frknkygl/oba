import { RES, RES_AD, RES_AGE, SEASONS, SEASON_MS } from '../data/resources.js';
import { ICON, fmt, dur } from './format.js';
import { rates, seasonOf, soldiers } from '../sim/economy.js';
import { AGES } from '../data/ages.js';
export function createHud(root, on) {
  const el = document.createElement('div'); el.className = 'hud';
  el.innerHTML = `<div class="bar res"></div>
    <div class="bar side"><div class="power"></div><div class="season"><b></b><i><s></s></i></div></div>
    <div class="btns"><button data-a="sefer" aria-label="Seferler">⚔️<span>Sefer</span></button><button data-a="rapor" aria-label="Raporlar">📜<span>Rapor</span><em></em></button><button data-a="siralama" aria-label="Sıralama">🏆<span>Sıra</span></button><button data-a="menu" aria-label="Menü">☰</button></div>
    <div class="net hidden">📡 Bağlantı bekleniyor…</div><div class="raid hidden"></div><div class="toasts"></div>`;
  root.appendChild(el);
  for (const b of el.querySelectorAll('[data-a]')) b.onclick = () => on(b.dataset.a);
  el.querySelector('.raid').onclick = () => on('sefer');
  const resEl = el.querySelector('.res');
  let lastRes = '';
  return {
    update(s, now, unread) {
      const r = rates(s), list = RES.filter(k => RES_AGE[k] <= s.age);
      const html = list.map(k => {
        const full = s.res[k] >= s.cap[k] - 0.5, rate = (k === 'wheat' || k === 'meat') ? null : r[k] * 3600;
        return `<div class="r${full ? ' full' : ''}" title="${RES_AD[k]}"><span>${ICON[k]}</span><b>${fmt(s.res[k])}</b>${rate ? `<small>${rate > 0 ? '+' : ''}${fmt(rate)}/sa</small>` : ''}</div>`;
      }).join('') + `<div class="r${s.hungry ? ' bad' : ''}" title="Nüfus"><span>${ICON.pop}</span><b>${s.pop}/${s.popCap}</b>${s.hungry ? '<small>aç</small>' : soldiers(s) ? `<small>⚔️ ${soldiers(s)}</small>` : ''}</div>`;
      if (html !== lastRes) { resEl.innerHTML = html; lastRes = html; }
      el.querySelector('.power').innerHTML = `${ICON.power} <b>${fmt(s.power)}</b> <small>${AGES[s.age].ad}</small>`;
      const se = seasonOf(s), u = ((s.t - s.t0) % SEASON_MS) / SEASON_MS;
      el.querySelector('.season b').textContent = SEASONS[se];
      el.querySelector('.season s').style.width = (u * 100).toFixed(1) + '%';
      el.querySelector('.season').className = 'season s' + se;
      const em = el.querySelector('[data-a=rapor] em'); em.textContent = unread || ''; em.style.display = unread ? '' : 'none';
      const rd = el.querySelector('.raid');
      if (s.raid && s.raid.seen) { rd.classList.remove('hidden'); rd.innerHTML = `🔥 Baskıncılar geliyor! <b>${dur(s.raid.arrive - s.t)}</b> <small>Askerlerini evde tut</small>`; }
      else rd.classList.add('hidden');
    },
    baglanti(v, bekleyen) { const n = el.querySelector('.net'); n.classList.toggle('hidden', v); n.textContent = '📡 Bağlantı bekleniyor…' + (bekleyen ? ` (${bekleyen} işlem sırada)` : ''); },
    toast(text, kind = '') { const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = text; el.querySelector('.toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3200); },
  };
}
