// Alttan açılan panel: boş yerde yapı menüsü, dolu yerde yapı paneli.
import { BUILDINGS, MAX_LEVEL, levelCost, levelTime, maxWorkers, countLimit, PROD_PER_LEVEL } from '../data/buildings.js';
import { UNITS, TRAIN_PER_KISLA } from '../data/units.js';
import { RESEARCH } from '../data/research.js';
import { AGES } from '../data/ages.js';
import { RES_AD } from '../data/resources.js';
import { spriteFor } from '../data/sprites.js';
import { checkBuild, checkUpgrade, checkTrain, checkAgeUp, countOf, armyCap, trainMs, hasRes } from '../sim/commands.js';
import { buildingLevel, canResearch, bonus } from '../sim/research.js';
import { idle, growMs, cropYield, seedCost, soldiers, levelMult, isWinter } from '../sim/economy.js';
import { ICON, fmt, dur, ERR, costHtml, esc } from './format.js';

const KIND_AD = { cayir: 'Çayır', nehir: 'Nehir kıyısı', dag: 'Dağ eteği', merkez: 'Obanın merkezi' };
export function createPanel(root, api) {
  const el = document.createElement('div'); el.className = 'sheet hidden'; root.appendChild(el);
  let slot = null, sig = '', trainN = {}, lastKey = '', lastT = 0;
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b || b.disabled) return;
    const d = b.dataset, c = d.c, key = c + (d.u || d.b || d.r || ''), now = performance.now();
    if (c !== 'n' && c !== 'close' && key === lastKey && now - lastT < 450) return;
    lastKey = key; lastT = now;
    if (c === 'close') return api.close();
    if (c === 'build') api.cmd({ type: 'build', slot, b: d.b });
    else if (c === 'upgrade') api.cmd({ type: 'upgrade', slot });
    else if (c === 'w') { const x = api.state().slots[slot].b; api.cmd({ type: 'setWorkers', slot, n: d.n === 'auto' ? null : x.workers + Number(d.n) }); }
    else if (c === 'plant') api.cmd({ type: 'plant', slot });
    else if (c === 'harvest') api.cmd({ type: 'harvest', slot });
    else if (c === 'n') { const L = buildingLevel(api.state(), 'kisla'); trainN[d.u] = Math.max(1, Math.min(5 * L, (trainN[d.u] || 1) + Number(d.n))); sig = ''; render(); return; }
    else if (c === 'train') api.cmd({ type: 'train', unit: d.u, n: trainN[d.u] || 1 });
    else if (c === 'research') api.cmd({ type: 'research', r: d.r });
    else if (c === 'ageUp') api.cmd({ type: 'ageUp' });
    else if (c === 'sefer') api.open('sefer');
    sig = ''; render();
  });
  function open(id) { slot = id; sig = ''; el.classList.remove('hidden'); render(); }
  function close() { slot = null; el.classList.add('hidden'); }
  function render() {
    if (slot === null) return;
    const s = api.state(), x = s.slots[slot], b = x.b;
    const html = b ? buildingHtml(s, x, b, trainN) : buildMenuHtml(s, x);
    if (html !== sig) { el.innerHTML = html; sig = html; }
  }
  return { open, close, render, get slot() { return slot; } };
}
function head(title, sub, img) {
  return `<header>${img ? `<img src="assets/${img}.png" alt="">` : ''}<div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="x" data-c="close" aria-label="Kapat">✕</button></header>`;
}
function buildMenuHtml(s, x) {
  const ocak = buildingLevel(s, 'ocak');
  const types = Object.keys(BUILDINGS).filter(t => BUILDINGS[t].kind === x.kind && t !== 'ocak');
  const cards = types.map(t => {
    const d = BUILDINGS[t], e = checkBuild(s, x.id, t), cnt = countOf(s, t), lim = countLimit(t, ocak);
    let note = '';
    if (d.age > s.age) note = `${d.age}. çağda açılır`; else if (d.unlock > ocak) note = `Ocak ${d.unlock} gerekli`; else if (cnt >= lim) note = lim < d.count ? `Ocak yükselince daha fazla` : 'Sınıra ulaştın';
    const locked = d.age > s.age || d.unlock > ocak;
    return `<button class="card${e ? ' off' : ''}${locked ? ' locked' : ''}" data-c="build" data-b="${t}" ${e ? 'disabled' : ''}>
      <img src="assets/${spriteFor({ type: t, level: 1, crop: null }, false)}.png" alt=""><b>${d.ad}</b><small>${d.desc}</small>
      ${note ? `<em>${note}</em>` : `<span class="cost">${costHtml(s, levelCost(t, 1))}<span class="c">⏱ ${dur(levelTime(t, 1))}</span></span>`}
      ${!note ? `<i>${cnt}/${lim}</i>` : ''}</button>`;
  }).join('');
  return head('Yeni yapı', KIND_AD[x.kind]) + `<div class="cards">${cards || '<p class="empty">Buraya kurulabilecek bir yapı yok.</p>'}</div>`;
}
function effectLine(s, b) {
  const d = BUILDINGS[b.type];
  if (d.prod) {
    const k = b.workers * levelMult(b.level) * (s.hungry ? 0.5 : 1);
    const parts = Object.keys(d.prod).map(r => `${ICON[r]} +${fmt(d.prod[r] * k * (1 + bonus(s, 'prod.' + r)) * 3600)}/sa`);
    if (d.uses) parts.push(...Object.keys(d.uses).map(r => `${ICON[r]} −${fmt(d.uses[r] * k * 3600)}/sa`));
    return parts.join(' · ');
  }
  if (d.popCap) return `👥 +${d.popCap * b.level} nüfus yeri`;
  if (d.cap) return `Depo +${500 * b.level} (demir +${150 * b.level}) · olgun ekini kendiliğinden hasat eder`;
  if (d.tower) return `Savunma +${d.tower * b.level} · baskını ${b.level * 5} dk önceden görür`;
  if (b.type === 'kisla') return `Ordu sınırı ${armyCap(s)} · bir seferde ${TRAIN_PER_KISLA * b.level} asker`;
  if (b.type === 'kam') return `Bilgeler ${b.level}. seviye bilgileri araştırabilir`;
  if (b.type === 'demirci') return `Demirli birimler +%${5 * b.level} güçlü`;
  return '';
}
function buildingHtml(s, x, b, trainN = {}) {
  const d = BUILDINGS[b.type], winter = isWinter(s);
  let body = `<p class="desc">${d.desc}</p>`;
  if (b.level === 0) {
    return head(d.ad, 'Yapılıyor', 'b_iskele') + `<div class="body">` + body + `<div class="job">⚒ Bitmesine <b>${dur(b.job.end - s.t)}</b><i><s style="width:${(100 * (s.t - b.job.start) / (b.job.end - b.job.start)).toFixed(1)}%"></s></i></div></div>`;
  }
  const eff = effectLine(s, b); if (eff) body += `<p class="eff">${eff}</p>`;
  // çalışanlar
  if (d.workers) {
    const mx = maxWorkers(b.type, b.level), free = idle(s);
    body += `<div class="row workers"><span>Çalışan <b>${b.workers}/${mx}</b> <small>${b.manual ? 'elle' : 'otomatik'} · boşta ${Math.max(0, free)}</small></span>
      <button data-c="w" data-n="-1" ${b.workers < 1 ? 'disabled' : ''} aria-label="Azalt">−</button><button data-c="w" data-n="1" ${b.workers >= mx ? 'disabled' : ''} aria-label="Artır">+</button>${b.manual ? '<button data-c="w" data-n="auto" class="small">Otomatik</button>' : ''}</div>`;
  }
  // tarla
  if (b.type === 'tarla') {
    if (!b.crop) body += `<div class="row"><span>Tarla boş. Tohum: ${ICON.wheat} ${seedCost(b)}</span><button class="go" data-c="plant" ${s.res.wheat < seedCost(b) ? 'disabled' : ''}>🌱 Ek</button></div>`;
    else if (b.crop.prog >= 1) body += `<div class="row"><span>Ekin olgun: ${ICON.wheat} ${cropYield(s, b)}</span><button class="go" data-c="harvest">🌾 Hasat et</button></div>`;
    else body += `<div class="job">🌱 ${winter ? 'Kışın ekin büyümez.' : `Olgunlaşmasına <b>${dur((1 - b.crop.prog) * growMs(s, b.level))}</b>`}<i><s style="width:${(b.crop.prog * 100).toFixed(1)}%"></s></i></div>`;
  }
  // kışla
  if (b.type === 'kisla') {
    const q = s.train.map(t => `${UNITS[t.unit].ad} ×${t.n} <small>${dur(t.end - s.t)}</small>`).join(' · ');
    body += `<div class="units">${Object.keys(UNITS).filter(u => UNITS[u].age <= s.age).map(u => {
      const U = UNITS[u], n = trainN[u] || 1, e = checkTrain(s, u, n), locked = U.demirci && buildingLevel(s, 'demirci') < 1;
      return `<div class="unit${locked ? ' locked' : ''}"><img src="assets/u_${u}.png" alt=""><div><b>${U.ad}</b><small>⚔️ ${U.atk} 🛡 ${U.def} · ${clsAd(U.cls)} · evde ${s.army.home[u]}</small>
        <span class="cost">${locked ? '<em>Demirci gerekli</em>' : costHtml(s, U.cost) + `<span class="c">⏱ ${dur(trainMs(s, u))}</span>`}</span></div>
        ${locked ? '' : `<div class="trainer"><button data-c="n" data-u="${u}" data-n="-1" aria-label="Azalt">−</button><button class="go" data-c="train" data-u="${u}" ${e ? 'disabled' : ''}>Eğit ×${n}</button><button data-c="n" data-u="${u}" data-n="1" aria-label="Artır">+</button></div>`}</div>`;
    }).join('')}</div><p class="eff">Ordu ${soldiers(s)}/${armyCap(s)}${q ? ' · Eğitimde: ' + q : ''}</p><div class="row"><span>Askerlerini baskıncı kamplarına gönder.</span><button class="go" data-c="sefer">⚔️ Seferler</button></div>`;
  }
  // kam
  if (b.type === 'kam') {
    const cur = s.research ? `<div class="job">📜 ${RESEARCH[s.research.id].ad}: <b>${dur(s.research.end - s.t)}</b><i><s style="width:${(100 * (s.t - s.research.start) / (s.research.end - s.research.start)).toFixed(1)}%"></s></i></div>` : '';
    const list = Object.keys(RESEARCH).filter(id => RESEARCH[id].age <= s.age).map(id => {
      const R = RESEARCH[id], e = canResearch(s, id), done = s.researched[id];
      const why = done ? 'Açıldı' : e === 'kilitli' ? (buildingLevel(s, 'kam') < R.kam ? `Kam çadırı ${R.kam}` : 'Önce: ' + R.req.filter(q => !s.researched[q]).map(q => RESEARCH[q].ad).join(', ')) : '';
      const fx = Object.entries(R.fx).map(([k, v]) => fxAd(k) + ' +%' + Math.round(v * 100)).join(', ') || (R.ageKey ? 'Demir çağına geçişi açar' : '');
      return `<button class="card r${done ? ' done' : ''}${e && !done ? ' off' : ''}" data-c="research" data-r="${id}" ${e || !hasRes(s, R.cost) ? 'disabled' : ''}><b>${R.ad}</b><small>${fx}</small>
        ${why ? `<em>${why}</em>` : `<span class="cost">${costHtml(s, R.cost)}<span class="c">⏱ ${dur(R.time * 1000)}</span></span>`}</button>`;
    }).join('');
    body += cur + `<div class="cards">${list}</div>`;
  }
  // ocak: çağ hedefi
  if (b.type === 'ocak' && AGES[s.age + 1]) {
    const A = AGES[s.age + 1], e = checkAgeUp(s);
    body += `<div class="goal"><b>Kurultay: ${A.ad}</b><ul>
      <li class="${buildingLevel(s, 'ocak') >= A.need.ocak ? 'ok' : ''}">Ocak ${A.need.ocak}. seviye</li>
      <li class="${s.researched[A.need.research] ? 'ok' : ''}">Bilgi: ${RESEARCH[A.need.research].ad}</li>
      <li>${costHtml(s, A.cost)}</li></ul>
      <button class="go big" data-c="ageUp" ${e ? 'disabled' : ''}>🔥 Kurultayı topla</button></div>`;
  }
  // yükseltme
  const next = b.level + 1, ue = checkUpgrade(s, x.id);
  if (b.job) body += `<div class="job">⚒ ${next - 1 + 1}. seviyeye: <b>${dur(b.job.end - s.t)}</b><i><s style="width:${(100 * (s.t - b.job.start) / (b.job.end - b.job.start)).toFixed(1)}%"></s></i></div>`;
  else if (next <= MAX_LEVEL[s.age]) body += `<div class="row up"><span>${next}. seviye <span class="cost">${costHtml(s, levelCost(b.type, next))}<span class="c">⏱ ${dur(levelTime(b.type, next))}</span></span>${ue && ue !== 'kaynak' ? `<em>${ERR[ue]}</em>` : ''}</span><button class="go" data-c="upgrade" ${ue ? 'disabled' : ''}>⬆ Yükselt</button></div>`;
  else body += `<p class="eff">Bu çağın en yüksek seviyesi.</p>`;
  const sp = spriteFor(b, false);
  return head(`${d.ad} <small>${b.level}. seviye</small>`, '', sp) + `<div class="body">${body}</div>`;
}
const clsAd = c => ({ mizrak: 'atlıyı yener', at: 'okçuyu yener', ok: 'mızrakçıyı yener' }[c]);
function fxAd(k) {
  if (k.startsWith('prod.')) return RES_AD[k.slice(5)] + ' üretimi';
  if (k.startsWith('atk.')) return { ok: 'Okçu saldırısı', at: 'Atlı saldırısı', mizrak: 'Mızrakçı saldırısı' }[k.slice(4)];
  return { cap: 'Depo', train: 'Eğitim hızı', def: 'Savunma', tower: 'Kule gücü', crop: 'Ekin hızı' }[k] || k;
}
