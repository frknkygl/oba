// Tam ekran pencereler: seferler, raporlar, menü, başlık, sen yokken, çağ geçişi, dikey uyarısı.
import { CAMPS } from '../data/camps.js';
import { UNITS } from '../data/units.js';
import { RES, RES_AD, RES_AGE } from '../data/resources.js';
import { AGES } from '../data/ages.js';
import { campUnits, campLoot, campReady } from '../sim/military.js';
import { armyPower } from '../sim/power.js';
import { ICON, fmt, dur, esc } from './format.js';

export function createModals(root, api) {
  const el = document.createElement('div'); el.className = 'modal hidden'; root.appendChild(el);
  let lastGo = 0, kind = null, data = null, sel = {}, campSel = null, sig = '';
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-m]'); if (!b || b.disabled) { if (e.target === el && !['title', 'gecis', 'baglan', 'ad', 'kod'].includes(kind)) close(); return; }
    const d = b.dataset, s = api.state(), now = performance.now();
    if (d.m === 'go' && now - lastGo < 800) return; if (d.m === 'go') lastGo = now;
    switch (d.m) {
      case 'close': close(); return;
      case 'camp': campSel = d.id; sel = { ...s.army.home }; break;
      case 'back': campSel = null; break;
      case 'u': sel[d.u] = Math.max(0, Math.min(s.army.home[d.u], (sel[d.u] || 0) + Number(d.n))); break;
      case 'all': sel = { ...s.army.home }; break;
      case 'none': sel = {}; break;
      case 'go': { const units = Object.fromEntries(Object.entries(sel).filter(([, v]) => v > 0)); if (api.cmd({ type: 'expedition', camp: campSel, units })) { campSel = null; sel = {}; } break; }
      default: api.action(d.m); return;
    }
    sig = ''; render();
  });
  function open(k, d) { kind = k; data = d || null; el.dataset.kind = k; el.classList.remove('hidden'); campSel = null; sig = ''; render(); }
  function close() { const k = kind; kind = null; data = null; delete el.dataset.kind; el.classList.add('hidden'); el.innerHTML = ''; api.closed && api.closed(k); }
  function render() {
    if (!kind) return; const s = api.state(); let html = '';
    if (kind === 'sefer') html = campSel ? campHtml(s, campSel, sel) : seferHtml(s);
    else if (kind === 'rapor') html = raporHtml(s);
    else if (kind === 'menu') html = menuHtml(api.settings());
    else if (kind === 'title') html = titleHtml(data);
    else if (kind === 'yokken') html = yokkenHtml(data);
    else if (kind === 'gecis') html = gecisHtml(data);
    else if (kind === 'baglan') html = baglanHtml(data);
    else if (kind === 'ad') html = adHtml(data);
    else if (kind === 'siralama') html = siralamaHtml(data);
    else if (kind === 'hesap') html = hesapHtml(data);
    else if (kind === 'kod') html = kodHtml(data);
    if (html !== sig) { const f = document.activeElement && document.activeElement.name, v = f && el.querySelector(`input[name=${f}]`) ? el.querySelector(`input[name=${f}]`).value : null; el.innerHTML = html; sig = html; if (f && v !== null && el.querySelector(`input[name=${f}]`)) { const i = el.querySelector(`input[name=${f}]`); i.value = v; i.focus(); } }
  }
  return { open, close, render, get kind() { return kind; }, get el() { return el; } };
}
const frame = (title, inner, cls = '') => `<div class="win ${cls}"><header><h2>${title}</h2><button class="x" data-m="close" aria-label="Kapat">✕</button></header><div class="body">${inner}</div></div>`;
const unitsTxt = (u, beast) => Object.entries(u || {}).filter(([, v]) => v > 0).map(([k, v]) => `${beast || UNITS[k].ad} ${v}`).join(', ') || 'yok';
const resTxt = r => Object.entries(r || {}).filter(([, v]) => v > 0).map(([k, v]) => `${ICON[k]} ${fmt(v)}`).join(' ') || '—';

function seferHtml(s) {
  const hp = armyPower(s.army.home);
  const out = s.army.out.map(o => `<div class="march"><img src="assets/${CAMPS[o.camp].img}.jpg" alt=""><div><b>${CAMPS[o.camp].ad}</b><small>${o.result ? (o.result.win ? 'Kazandı, dönüyor' : 'Yenildi, kalanlar dönüyor') + ' · ' + dur(o.back - s.t) : 'Yolda · varışa ' + dur(o.arrive - s.t)}</small><small>${unitsTxt(o.units)}</small></div></div>`).join('');
  const camps = Object.keys(CAMPS).filter(id => CAMPS[id].age <= s.age).map(id => {
    const c = CAMPS[id], cp = armyPower(campUnits(s, id)), ready = campReady(s, id), odds = hp > cp * 1.6 ? 'kolay' : hp > cp ? 'zor' : 'çok güçlü';
    return `<button class="camp" data-m="camp" data-id="${id}" ${ready ? '' : 'disabled'}><img src="assets/${c.img}.jpg" alt=""><div><b>${c.ad}${s.camps[id].lvl ? ` <small>${s.camps[id].lvl + 1}. kez</small>` : ''}</b>
      <small>⚔️ Güç ${fmt(cp)} · <span class="odds ${odds.replace(' ', '')}">${odds}</span> · yol ${dur(c.travel * 1000)}</small><small>Ganimet: ${resTxt(campLoot(s, id))}</small>${ready ? '' : `<em>Yeniden toplanıyorlar: ${dur(s.camps[id].respawnAt - s.t)}</em>`}</div></button>`;
  }).join('');
  return frame('Seferler', `<p class="eff">Evdeki ordu: ${unitsTxt(s.army.home)} · güç ${fmt(hp)}</p>${out ? `<h3>Yoldakiler</h3>${out}` : ''}<h3>Baskıncı kampları</h3><div class="camps">${camps}</div>`);
}
function campHtml(s, id, sel) {
  const c = CAMPS[id], cu = campUnits(s, id), sp = armyPower(sel), cp = armyPower(cu);
  const rows = Object.keys(s.army.home).filter(u => s.army.home[u] > 0).map(u => `<div class="row"><img src="assets/u_${u}.png" alt=""><span>${UNITS[u].ad} <b>${sel[u] || 0}</b>/${s.army.home[u]}</span>
    <button data-m="u" data-u="${u}" data-n="-10" aria-label="On azalt">−10</button><button data-m="u" data-u="${u}" data-n="-1" aria-label="Azalt">−</button><button data-m="u" data-u="${u}" data-n="1" aria-label="Artır">+</button><button data-m="u" data-u="${u}" data-n="10" aria-label="On artır">+10</button></div>`).join('');
  return frame(c.ad, `<div class="campHead"><img src="assets/${c.img}.jpg" alt=""><div><p>Karşındakiler: ${unitsTxt(cu, c.beast)}</p><p>Güçleri ${fmt(cp)} · Ganimet ${resTxt(campLoot(s, id))}</p><p>Yol ${dur(c.travel * 1000)} gidiş, aynı kadar dönüş.</p></div></div>
    ${rows || '<p class="empty">Evde asker yok. Kışlada asker eğit.</p>'}
    <div class="row end"><button data-m="back">← Geri</button><button data-m="none">Hiçbiri</button><button data-m="all">Hepsi</button><span>Seçilen güç <b>${fmt(sp)}</b></span><button class="go" data-m="go" ${sp > 0 ? '' : 'disabled'}>⚔️ Yola çıkar</button></div>
    <p class="hint">Mızrakçı atlıyı, atlı okçuyu, okçu mızrakçıyı yener. Ordu dışarıdayken oba savunmasız kalır.</p>`);
}
function raporHtml(s) {
  if (!s.reports.length) return frame('Raporlar', '<p class="empty">Henüz savaş olmadı.</p>');
  return frame('Raporlar', s.reports.map(r => {
    const ago = dur(s.t - r.t) + ' önce';
    if (r.kind === 'sefer') return `<div class="rep ${r.win ? 'zafer' : 'yenilgi'}"><img src="assets/${CAMPS[r.camp].img}.jpg" alt=""><div><b>${r.empty ? 'Kamp boş bulundu' : r.win ? 'Zafer' : 'Yenilgi'}: ${CAMPS[r.camp].ad}</b><small>${ago} · güç ${fmt(r.aPow)} / ${fmt(r.dPow)}</small><small>Kayıplar: ${unitsTxt(r.lost)}</small><small>Ganimet: ${resTxt(r.loot)}</small></div></div>`;
    return `<div class="rep ${r.win ? 'zafer' : 'yenilgi'}"><img src="assets/u_baskinci.png" alt=""><div><b>${r.win ? 'Baskın püskürtüldü' : 'Baskıncılar yağmaladı'}</b><small>${ago} · gelenler: ${unitsTxt(r.raiders)}</small><small>Kayıplar: ${unitsTxt(r.lost)}</small>${r.win ? '' : `<small>Götürülen: ${resTxt(r.stolen)}</small>`}</div></div>`;
  }).join(''));
}
function menuHtml(o) {
  return frame('Menü', `<div class="list"><button data-m="hesap">🔐 ${o.eposta ? 'Hesabın: ' + esc(o.eposta) : 'Hesabını koru (e-posta)'}</button><button data-m="siralama">🏆 Sıralama</button><button data-m="adDegistir">✏️ Oba adını değiştir</button><button data-m="ses">${o.muted ? '🔈 Sesi aç' : '🔇 Sesi kapat'}</button><button data-m="rehber">🐺 Gökbörü'nün yol göstermesini yeniden başlat</button>
    <button data-m="kur">📲 Ana ekrana ekle</button><button data-m="gizlilik">📄 Gizlilik</button><button data-m="cikis" class="bad">Bu cihazdan çık</button></div><p class="hint">Oba, sen yokken de yaşar: üretim sürer, baskıncılar gelebilir. Kapalıyken en çok 12 saat hesaplanır.</p>`);
}
function titleHtml(d) {
  return `<div class="title"><img src="assets/s_baslik.jpg" alt=""><div class="tt"><div class="kicker">Bozkırdan yıldızlara</div><h1>Oba</h1>
    <button class="go big" data-m="oyna">${d && d.oturum ? 'Obana dön' : 'Obanı kur'}</button><button data-m="kodla" class="ghost">Başka cihazdaki obama gir</button></div><a class="giz" href="gizlilik.html" target="_blank" rel="noopener">Gizlilik</a></div>`;
}
function yokkenHtml(d) {
  const gained = RES.filter(r => RES_AGE[r] <= d.age).map(r => [r, d.after[r] - d.before[r]]).filter(([, v]) => Math.abs(v) >= 1);
  return frame('Sen yokken', `<p>${dur(d.gap)} geçti${d.capped ? ' (en çok 12 saat hesaplandı)' : ''}.</p>
    <div class="gain">${gained.map(([r, v]) => `<span class="${v < 0 ? 'neg' : ''}">${ICON[r]} ${v > 0 ? '+' : ''}${fmt(v)}</span>`).join('') || '<span>Depolar zaten doluydu.</span>'}</div>
    <ul class="evs">${d.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul><button class="go" data-m="close">Obaya dön</button>`, 'small');
}
function gecisHtml(d) {
  return `<div class="gecis"><img src="assets/s_gecis.jpg" alt=""><div class="tx"><div class="kicker">Yeni çağ</div><h1>${AGES[d.age].ad}</h1>
    <p>Demir dağı ateşle erittiniz. Gökbörü önde, obanın bütün çadırları ardında, yarıktan geçip yeşil vadiye indiniz.</p>
    <p>Demir ocakları ve demirci açıldı; atlı okçular ve zırhlı süvariler eğitilebilir.</p><button class="go big" data-m="close">Vadiye in</button></div></div>`;
}

const HATA = { ad_kisa: 'Ad en az 3 harf olmalı.', ad_uzun: 'Ad en çok 16 harf olabilir.', ad_harf: 'Yalnızca harf, rakam ve boşluk kullan.', ad_kaba: 'Bu ad uygun değil.', ad_alinmis: 'Bu ad alınmış, başka bir ad dene.', ad: 'Ad kaydedilemedi.' };
function baglanHtml(d) {
  return `<div class="title"><img src="assets/s_baslik.jpg" alt=""><div class="tt"><h1>Oba</h1><p class="durum">${esc((d && d.mesaj) || 'Bozkıra bağlanılıyor…')}</p>${d && d.hata ? `<button class="go" data-m="oyna">${d.kodla ? 'Yeni oba kur' : 'Yeniden dene'}</button>${d.kodla ? '<button class="ghost" data-m="kodla">Başka cihazdaki obama gir</button>' : ''}` : ''}</div></div>`;
}
function adHtml(d) {
  return frame('Obana bir ad ver', `<p>Sıralamada bu adla görüneceksin. 3-16 harf.</p><div class="row"><input name="ad" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Örn. Kara Kurt Obası"><button class="go" data-m="adGonder">Kaydet</button></div>${d && d.hata ? `<p class="err">${HATA[d.hata] || 'Bir sorun çıktı, yeniden dene.'}</p>` : ''}`, 'small');
}
function siralamaHtml(d) {
  if (!d || d.yukleniyor) return frame('Sıralama', '<p class="empty">Yükleniyor…</p>');
  if (d.hata) return frame('Sıralama', '<p class="empty">Sıralama alınamadı. Bağlantını kontrol et.</p>');
  const rows = d.liste.map((r, i) => `<tr class="${r.id === d.ben ? 'ben' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.age}. çağ</td><td>⚔️ ${fmt(r.power)}</td></tr>`).join('');
  return frame('Sıralama', `${d.siram ? `<p class="eff">Senin sıran: <b>${d.siram}</b></p>` : '<p class="hint">Sıralamada görünmek için obana bir ad ver.</p>'}<table class="sira"><tbody>${rows || '<tr><td>Henüz kimse yok.</td></tr>'}</tbody></table>`);
}
function hesapHtml(d) {
  if (d && d.eposta) return frame('Hesabın', `<p>Oban <b>${esc(d.eposta)}</b> adresine bağlı. Başka bir telefondan girmek için başlık ekranında "Başka cihazdaki obama gir"i seç.</p>`, 'small');
  if (d && d.bekleyen) return frame('Hesabını koru', `<p><b>${esc(d.bekleyen)}</b> adresine bir onay bağlantısı gönderildi. Bağlantıya dokununca oban bu e-postaya bağlanır.</p><p class="hint">E-posta gelmediyse istenmeyen kutusuna bak.</p>`, 'small');
  return frame('Hesabını koru', `<p>Şu an misafirsin; telefonunu değiştirirsen oban kaybolur. E-postanı bağla, başka cihazdan da gir.</p><div class="row"><input name="eposta" type="email" autocomplete="email" placeholder="ornek@posta.com"><button class="go" data-m="epostaGonder">Bağla</button></div>${d && d.hata ? `<p class="err">${esc(d.hata)}</p>` : ''}`, 'small');
}
function kodHtml(d) {
  const adim = d && d.adim === 2;
  return frame('Başka cihazdaki obana gir', adim
    ? `<p><b>${esc(d.adres)}</b> adresine gelen 6 haneli kodu yaz.</p><div class="row"><input name="kod" inputmode="numeric" maxlength="8" autocomplete="one-time-code"><button class="go" data-m="kodGir">Gir</button></div>${d.hata ? `<p class="err">${esc(d.hata)}</p>` : ''}`
    : `<p>Obanı bağladığın e-postayı yaz; sana bir giriş kodu gönderelim.</p><div class="row"><input name="eposta" type="email" autocomplete="email" placeholder="ornek@posta.com"><button class="go" data-m="kodIste">Kod gönder</button></div>${d && d.hata ? `<p class="err">${esc(d.hata)}</p>` : ''}`, 'small');
}
