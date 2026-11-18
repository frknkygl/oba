// Açılış, ana döngü ve arayüzün oyun kurallarına bağlanması.
import { createState } from './sim/state.js';
import { advance } from './sim/advance.js';
import { apply } from './sim/commands.js';
import { isWinter, seasonOf } from './sim/economy.js';
import { BUILDINGS } from './data/buildings.js';
import { UNITS } from './data/units.js';
import { RESEARCH } from './data/research.js';
import { CAMPS } from './data/camps.js';
import { SEASONS, OFFLINE_CAP_MS } from './data/resources.js';
import { ALL_SPRITES } from './data/sprites.js';
import * as save from './core/save.js';
import * as clock from './core/clock.js';
import { createView } from './render/view.js';
import { createPeople } from './render/people.js';
import { createInput } from './input.js';
import { createHud } from './ui/hud.js';
import { createPanel } from './ui/panels.js';
import { createModals } from './ui/modals.js';
import { createGuide } from './ui/guide.js';
import { ERR, fmt } from './ui/format.js';
import { createAudio } from './audio/audio.js';
import { createMusic } from './audio/music.js';
import { createSunucu } from './net/sunucu.js';
import { SUPABASE_URL, SUPABASE_KEY } from './net/ayar.js';

const ui = document.getElementById('ui'), canvas = document.getElementById('c');
const audio = createAudio(), music = createMusic(audio);
const sunucu = createSunucu({ url: SUPABASE_URL, key: SUPABASE_KEY });
clock.setSource(sunucu.simdi);
let lastHint = null, s = null, sel = null, unread = 0, lastSave = 0, lastUi = 0, lastFrame = performance.now(), dirty = false;
let muted = false; try { muted = localStorage.getItem('oba-ses') === '0'; } catch { /* yok */ }
audio.setMuted(muted);
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => audio.unlock(), { passive: true });

function loadOnce(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error(src)); i.src = src; }); }
async function loadImg(src) { for (let k = 0; ; k++) { try { return await loadOnce(k ? src + '?r=' + k : src); } catch (e) { if (k >= 3) throw e; await new Promise(r => setTimeout(r, 400 * (k + 1))); } } }
const bar = document.querySelector('#loading s');
const names = ['map', ...ALL_SPRITES];
let loaded = 0;
const img = {};
try {
  await Promise.all(names.map(n => loadImg('assets/' + n + (n === 'map' ? '.jpg' : '.png')).then(i => { img[n] = i; bar.style.width = (++loaded / names.length * 100) + '%'; })));
} catch (e) {
  document.querySelector('#loading span').textContent = 'Resimler yüklenemedi. Bağlantını kontrol edip sayfayı yenile.';
  throw e;
}
document.getElementById('loading').remove();

const view = createView(canvas, img), people = createPeople(view);
const relayout = () => requestAnimationFrame(() => view.resize());
addEventListener('resize', relayout); addEventListener('orientationchange', () => setTimeout(relayout, 250));
if (window.visualViewport) visualViewport.addEventListener('resize', relayout);
const hud = createHud(ui, a => { audio.sfx('topla'); panel.close(); sel = null; if (a === 'rapor') unread = 0; if (a === 'siralama') return action('siralama'); modals.open(a); });
let uidN = 0;
const uid = () => Date.now().toString(36) + '-' + (++uidN);
function cmd(c, quiet) {
  if (!s) return false;
  const full = { id: uid(), ...c }, r = apply(s, full, clock.now());
  handle(r.events);
  if (!r.ok) { if (!quiet && ERR[r.error]) { hud.toast(ERR[r.error], 'bad'); audio.sfx('alarm'); } }
  else {
    if (!quiet) audio.sfx(c.type === 'build' || c.type === 'upgrade' ? 'odun' : 'topla'); dirty = true;
    // sunucu son sözü söyler: reddederse uyar, durum zaten sunucudan gelecek
    sunucu.komut(full).then(j => { if (!j.ok && j.hata !== 'tekrar') hud.toast(ERR[j.hata] || 'Sunucu bu işlemi kabul etmedi.', 'bad'); });
  }
  panel.render(); modals.render();
  return r.ok;
}
const panel = createPanel(ui, { state: () => s, cmd, close: () => { panel.close(); sel = null; }, open: k => { panel.close(); sel = null; modals.open(k); } });
const modals = createModals(ui, { state: () => s, cmd, settings: () => ({ muted, eposta: sunucu.eposta }), action,
  // kapatılan pencereye göre: ad ekranı kapanırsa oyuna gir, kod ekranı oyunsuz kapanırsa başlığa dön
  closed: k => { if (k === 'ad' && s) oyunaGir(); else if (k === 'kod' && !s) setTimeout(() => modals.open('title', { oturum: true }), 0); } });
const guide = createGuide(ui, { cmd, busy: () => !!modals.kind });

sunucu.onDurum(j => { if (sunucu.bekleyen === 0 && j.durum) { s = j.durum; panel.render(); } });
sunucu.onOturum(() => { panel.close(); sel = null; s = null; modals.open('baglan', { mesaj: 'Oturumun sona ermiş. E-postanla bağladıysan "Başka cihazdaki obama gir" ile dön; yoksa yeni oba kurabilirsin.', hata: true, kodla: true }); });
function handle(evs) {
  for (const e of evs) {
    switch (e.type) {
      case 'built': hud.toast(`${BUILDINGS[e.b].ad} kuruldu`); view.floatText(e.slot, '✓'); audio.sfx('bag'); break;
      case 'upgraded': hud.toast(`${BUILDINGS[e.b].ad} ${e.level}. seviye`); view.floatText(e.slot, '⬆ ' + e.level); audio.sfx('bag'); break;
      case 'harvest': view.floatText(e.slot, `+${fmt(e.n)} 🌾`); if (!e.auto) audio.sfx('ye'); break;
      case 'trained': hud.toast(`${e.n} ${UNITS[e.unit].ad} hazır`); break;
      case 'researched': hud.toast(`Yeni bilgi: ${RESEARCH[e.id].ad}`); audio.sfx('bag'); break;
      case 'expedition': unread++; hud.toast(e.win ? `Sefer kazandı: ${CAMPS[e.camp].ad}` : `Sefer yenildi: ${CAMPS[e.camp].ad}`, e.win ? '' : 'bad'); audio.sfx(e.win ? 'bag' : 'yakalandi'); break;
      case 'raidSeen': hud.toast('Gözcüler baskıncı gördü!', 'bad'); audio.sfx('alarm'); break;
      case 'raid': unread++; hud.toast(e.win ? 'Baskın püskürtüldü!' : 'Baskıncılar yağmaladı.', e.win ? '' : 'bad'); audio.sfx(e.win ? 'davul' : 'yakalandi'); break;
      case 'ageUp': panel.close(); sel = null; modals.open('gecis', { age: e.age }); audio.howl(1); break;
    }
  }
}
function persist() { lastSave = performance.now(); dirty = false; }   // kayıt sunucuda; burada saklanacak bir şey yok
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); else resume(); });
addEventListener('pagehide', persist);

// Uygulama yeniden açıldığında: geçen süreyi hesapla, "sen yokken" özetini göster.
async function resume() {
  if (!s || modals.kind === 'baglan') return;
  const gap = clock.now() - s.t;
  sunucu.kullaniciYenile();
  let j;
  try {
    if (gap < 3 * 60e3) { j = await sunucu.yenile(); if (j.durum && sunucu.bekleyen === 0) s = j.durum; return; }
    j = await sunucu.yenile();
  } catch { return; }   // oturum düştüyse onOturum zaten haber verdi
  if (!j.durum || sunucu.bekleyen > 0 || !s) return;
  const before = { ...s.res };
  s = j.durum; const evs = j.olaylar || []; handle(evs.filter(e => e.type === 'ageUp'));
  const c = t => evs.filter(e => e.type === t).length, lines = [];
  if (c('built') + c('upgraded')) lines.push(`${c('built') + c('upgraded')} yapım işi bitti.`);
  if (c('harvest')) lines.push(`Ambar ${c('harvest')} kez hasat yaptı.`);
  if (c('popUp')) lines.push(`${c('popUp')} kişi obaya katıldı.`);
  if (c('trained')) lines.push('Kışlada eğitim tamamlandı.');
  if (c('researched')) lines.push('Kam çadırında yeni bilgi açıldı.');
  for (const e of evs.filter(e => e.type === 'expedition')) { unread++; lines.push(`${CAMPS[e.camp].ad} seferi: ${e.win ? 'zafer' : 'yenilgi'}.`); }
  for (const e of evs.filter(e => e.type === 'raid')) { unread++; lines.push(e.win ? 'Bir baskın püskürtüldü.' : 'Baskıncılar obayı yağmaladı.'); }
  modals.open('yokken', { gap, capped: gap > OFFLINE_CAP_MS, before, after: { ...s.res }, lines, age: s.age });
}
let adim = null;   // kodla giriş için e-posta
// Sunucuya bağlan: misafir girişi (gerekirse), obayı yükle; aşama 1 kaydı varsa bir kez taşınır.
async function baglan() {
  modals.open('baglan', {});
  save.clear();   // aşama 1'in telefonda tutulan kaydı artık kullanılmıyor (sunucu kabul etmez)
  try {
    const j = await sunucu.baslat();
    if (!j.ok || !j.durum) { modals.open('baglan', { mesaj: 'Sunucu cevap vermedi.', hata: true }); return; }
    s = j.durum;
    if (!j.ad) { modals.open('ad', {}); return; }
    oyunaGir();
  } catch (e) {
    modals.open('baglan', { mesaj: e.kod === 'oturum' ? 'Oturumun sona ermiş. E-postanla girebilir ya da yeni oba kurabilirsin.' : e.kod === 'anonymous_provider_disabled' ? 'Sunucu henüz misafir girişine kapalı.' : 'Bağlanılamadı.', hata: true });
  }
}
function oyunaGir() { modals.close(); view.focus(0, 1.12); }
const girdi = n => { const i = modals.el.querySelector(`input[name=${n}]`); return i ? i.value.trim() : ''; };
async function action(a) {
  if (a === 'oyna') baglan();
  else if (a === 'kodla') modals.open('kod', { adim: 1 });
  else if (a === 'kodIste') { const ad = girdi('eposta'); if (!/^\S+@\S+\.\S+$/.test(ad)) return modals.open('kod', { adim: 1, hata: 'Geçerli bir e-posta yaz.' }); try { await sunucu.kodIste(ad); adim = ad; modals.open('kod', { adim: 2, adres: ad }); } catch { modals.open('kod', { adim: 1, hata: 'Bu e-postaya bağlı bir oba bulunamadı ya da kod gönderilemedi.' }); } }
  else if (a === 'kodGir') { try { await sunucu.kodlaGir(adim, girdi('kod')); baglan(); } catch { modals.open('kod', { adim: 2, adres: adim, hata: 'Kod yanlış ya da süresi dolmuş.' }); } }
  else if (a === 'adGonder') { let j; try { j = await sunucu.ad(girdi('ad')); } catch { return; } if (j.ok) { if (j.durum) s = j.durum; hud.toast(`Oban artık "${j.ad}"`); oyunaGir(); } else modals.open('ad', { hata: j.hata }); }
  else if (a === 'siralama') { modals.open('siralama', { yukleniyor: true }); try { modals.open('siralama', await sunucu.siralama()); } catch { modals.open('siralama', { hata: true }); } }
  else if (a === 'adDegistir') modals.open('ad', {});
  else if (a === 'hesap') modals.open('hesap', { eposta: sunucu.eposta, bekleyen: sunucu.bekleyenEposta });
  else if (a === 'epostaGonder') { const ad = girdi('eposta'); if (!/^\S+@\S+\.\S+$/.test(ad)) return modals.open('hesap', { hata: 'Geçerli bir e-posta yaz.' }); try { await sunucu.epostaBagla(ad); modals.open('hesap', { bekleyen: ad }); } catch (e) { modals.open('hesap', { hata: e.kod === 'email_exists' ? 'Bu e-posta başka bir obaya bağlı.' : 'E-posta bağlanamadı: ' + e.message }); } }
  else if (a === 'gizlilik') window.open('gizlilik.html', '_blank', 'noopener');
  else if (a === 'cikis') { if (confirm(sunucu.eposta ? 'Bu cihazdan çıkılacak. Obana e-postanla yeniden girebilirsin.' : 'Oban bir e-postaya bağlı değil. Çıkarsan bu obaya bir daha giremezsin. Yine de çık?')) { sunucu.cikis(); location.reload(); } }
  else if (a === 'ses') { muted = !muted; audio.setMuted(muted); try { localStorage.setItem('oba-ses', muted ? '0' : '1'); } catch { /* yok */ } modals.render(); }
  else if (a === 'rehber') { cmd({ type: 'guide', reset: true }, true); modals.close(); }
  else if (a === 'kur') { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; } else alert('iPhone: Safari\'de Paylaş düğmesine bas, "Ana Ekrana Ekle"yi seç.\nAndroid: Chrome menüsünden "Ana ekrana ekle"yi seç.'); }
}
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });

createInput(canvas, view, (x, y) => {
  if (!s || modals.kind) return;
  const id = view.hitSlot(s, x, y);
  audio.unlock();
  if (id === null) { panel.close(); sel = null; return; }
  sel = id; audio.sfx('topla');
  const b = s.slots[id].b;
  if (b && b.type === 'tarla' && b.level && b.crop && b.crop.prog >= 1) { cmd({ type: 'harvest', slot: id }, true); }
  panel.open(id); view.reveal(id);
});

let oturumVar = false; try { oturumVar = !!localStorage.getItem('oba-oturum'); } catch { /* yok */ }
modals.open('title', { oturum: oturumVar || !!save.load() });

function frame() {
  const t = performance.now(), dt = Math.min(0.1, (t - lastFrame) / 1000); lastFrame = t;
  if (s) {
    const now = clock.now(); handle(advance(s, now));
    const hint = guide.update(s);
    if (hint !== lastHint) { lastHint = hint; if (hint !== null && sel === null) view.glide(hint); }
    view.draw(s, t, { selected: sel, hint, showPlots: sel === null && !modals.kind, people: people.list(s, t), dt });
    if (t - lastUi > 250) {
      lastUi = t; hud.update(s, now, unread); hud.baglanti(sunucu.cevrimici, sunucu.bekleyen); panel.render(); if (modals.kind === 'sefer' || modals.kind === 'rapor') modals.render();
      music.setMood(s.raid && s.raid.seen ? 'gerilim' : isWinter(s) ? 'gece' : 'sakin'); audio.setWind(isWinter(s) ? 0.8 : 0.35);
    }
    if (t - lastSave > 10000 || (dirty && t - lastSave > 1500)) persist();
  } else {
    view.draw(createState.preview || (createState.preview = createState(1, 0)), t, { people: [], dt });
  }
  music.update(); audio.update(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__oba = { get s() { return s; }, view, clock, cmd, modals, panel, sunucu };
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !new URLSearchParams(location.search).has('nosw')) navigator.serviceWorker.register('sw.js').catch(() => {});
