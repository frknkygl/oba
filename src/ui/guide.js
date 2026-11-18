// Gökbörü'nün yol göstermesi. Adım, oyuncu istenen şeyi yapınca kendiliğinden ilerler.
import { buildingLevel } from '../sim/research.js';
import { checkBuild } from '../sim/commands.js';
const has = (s, t) => s.slots.some(x => x.b && x.b.type === t);
export const STEPS = [
  { text: 'Hoş geldin. Ben Gökbörü. Önce karnımızı doyuralım: parlayan boş bir yere dokun ve bir tarla kur.', done: s => has(s, 'tarla'), build: 'tarla' },
  { text: 'Tarla bitince üstüne dokun ve buğday ek.', done: s => s.slots.some(x => x.b && x.b.type === 'tarla' && (x.b.crop || s.flags.hasat)) },
  { text: 'Kışın odun gerekir. Nehir kıyısındaki yerlerden birine oduncu kur.', done: s => has(s, 'oduncu'), build: 'oduncu' },
  { text: 'Ekin olgunlaşınca tarlanın üstünde 🌾 belirir. Dokunup hasat et.', done: s => !!s.flags.hasat },
  { text: 'Nüfus artarsa daha çok iş görülür. Bir çadır daha kur.', done: s => s.slots.filter(x => x.b && x.b.type === 'cadir').length >= 2, build: 'cadir' },
  { text: 'Obanın kalbi ocaktır. Ocağa dokun ve yükselt; yeni yapılar açılır.', done: s => buildingLevel(s, 'ocak') >= 2 || s.slots[0].b.job, slot: 0 },
  { text: 'Bozkır tehlikeli. Bir kışla kur ve asker eğit.', done: s => has(s, 'kisla'), build: 'kisla' },
  { text: 'Askerlerini sağ üstteki ⚔️ Sefer düğmesiyle baskıncı kamplarına gönder, ganimet getir.', done: s => s.army.out.length > 0 || s.reports.some(r => r.kind === 'sefer') },
  { text: 'Kam çadırı kur ve bilgi araştır. Kurultay töresini öğrenince yeni çağın kapısı açılır.', done: s => !!s.research || Object.keys(s.researched).length > 0, build: 'kam' },
];
export function createGuide(root, api) {
  const el = document.createElement('div'); el.className = 'guide hidden'; root.appendChild(el);
  el.innerHTML = `<img src="assets/portre.jpg" alt="Gökbörü"><div class="bub"><b>Gökbörü</b><p></p><button class="skip">Atla</button></div>`;
  el.querySelector('.skip').onclick = () => api.cmd({ type: 'guide', step: 99 });
  let shown = -1;
  return {
    update(s) {
      let st = s.guide.step;
      while (st < STEPS.length && STEPS[st].done(s)) st++;
      if (st !== s.guide.step) api.cmd({ type: 'guide', step: st }, true);
      if (st >= STEPS.length || api.busy()) { el.classList.add('hidden'); return null; }
      el.classList.remove('hidden');
      if (st !== shown) { el.querySelector('p').textContent = STEPS[st].text; shown = st; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
      const S = STEPS[st];
      if (S.slot !== undefined) return S.slot;
      if (S.build) { const x = s.slots.find(x => !x.b && !checkBuild(s, x.id, S.build)) || s.slots.find(x => !x.b && x.kind === (S.build === 'oduncu' ? 'nehir' : 'cayir')); return x ? x.id : null; }
      if (st === 1 || st === 3) { const x = s.slots.find(x => x.b && x.b.type === 'tarla' && x.b.level); return x ? x.id : null; }
      return null;
    },
  };
}
