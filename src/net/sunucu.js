// Sunucuyla konuşan katman: misafir girişi, oturum yenileme, sıralı komut gönderme, sunucu saati.
// Ek kütüphane kullanmaz; Supabase'in REST uçlarına doğrudan gider.
const OTURUM = 'oba-oturum';
const bekle = ms => new Promise(r => setTimeout(r, ms));
export function createSunucu({ url, key }) {
  let ses = null, fark = 0, cevrimici = true, isleniyor = false;
  const kuyruk = [], dinDurum = [], dinBag = [], dinOturum = [];
  try { ses = JSON.parse(localStorage.getItem(OTURUM)); } catch { ses = null; }
  const kaydet = () => { try { ses ? localStorage.setItem(OTURUM, JSON.stringify(ses)) : localStorage.removeItem(OTURUM); } catch { /* yok */ } };
  const baglanti = v => { if (v !== cevrimici) { cevrimici = v; dinBag.forEach(f => f(v)); } };
  const H = t => ({ apikey: key, 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) });
  async function auth(path, body, method = 'POST', t) {
    const r = await fetch(url + '/auth/v1/' + path, { method, headers: H(t), body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.msg || j.error_description || j.error || 'giris'); e.kod = j.error_code || j.code; e.durum = r.status; throw e; }
    return j;
  }
  const oturumAl = j => { ses = { at: j.access_token, rt: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, user: j.user }; kaydet(); };
  const oturumYok = () => Object.assign(new Error('oturum'), { kod: 'oturum' });
  // Yeni misafir hesabı yalnızca baslat'ta ve hiç oturum yokken açılır; başka hiçbir yerde sessizce açılmaz.
  async function hazirla(kayitIzni = false) {
    if (!ses) { if (!kayitIzni) throw oturumYok(); oturumAl(await auth('signup', {})); return ses.at; }
    if (ses.exp - Date.now() < 120e3) {
      try { const d = JSON.parse(localStorage.getItem(OTURUM)); if (d && d.exp > ses.exp) ses = d; } catch { /* yok */ }   // başka sekme yenilemiş olabilir
      if (ses.exp - Date.now() < 120e3) {
        try { oturumAl(await auth('token?grant_type=refresh_token', { refresh_token: ses.rt })); }
        catch (e) { if (e.durum >= 400 && e.durum < 500) { ses = null; kaydet(); throw oturumYok(); } throw e; }
      }
    }
    return ses.at;
  }
  async function cagir(body, kayitIzni, yeniden = true) {
    const t = await hazirla(kayitIzni);
    const r = await fetch(url + '/functions/v1/oyun', { method: 'POST', headers: H(t), body: JSON.stringify(body) });
    if (r.status === 401 && yeniden) { ses.exp = 0; return cagir(body, false, false); }
    if (r.status === 401) throw oturumYok();
    const j = await r.json().catch(() => ({ ok: false, hata: 'sunucu' }));
    if (Number.isFinite(j.simdi)) fark = fark ? fark * 0.7 + (j.simdi - Date.now()) * 0.3 : j.simdi - Date.now();
    return { status: r.status, j };
  }
  // Ağ hatası, sunucu hatası (5xx), çakışma (409) ve yavaşlatmada (429) yeniden dener; gerçek bir cevap gelince döner.
  async function dayanikli(body, kayitIzni = false) {
    for (let k = 0; ; k++) {
      let r = null;
      try { r = await cagir(body, kayitIzni); } catch (e) { if (e.kod === 'oturum') throw e; }
      if (r && r.status < 500 && r.status !== 409 && r.status !== 429) { baglanti(true); return r.j; }
      if (!r) baglanti(false);
      await bekle(r && r.status === 429 ? 300 : Math.min(30e3, 2000 * 2 ** Math.min(k, 4)));
    }
  }
  async function isle() {
    if (isleniyor) return; isleniyor = true;
    try {
      while (kuyruk.length) {
        const { cmd, coz } = kuyruk[0];
        const j = await dayanikli({ islem: 'komut', komut: cmd });
        kuyruk.shift(); coz(j);
        if (j.durum) dinDurum.forEach(f => f(j, cmd));
      }
    } catch (e) {
      // oturum düştü: sıradakiler gönderilemez; oyuncuya haber ver
      while (kuyruk.length) kuyruk.shift().coz({ ok: false, hata: 'oturum' });
      dinOturum.forEach(f => f());
    } finally { isleniyor = false; }
  }
  return {
    simdi: () => Date.now() + fark,
    get cevrimici() { return cevrimici; }, get bekleyen() { return kuyruk.length; },
    get eposta() { return ses && ses.user && !ses.user.is_anonymous ? ses.user.email || ses.user.new_email || null : null; },
    get bekleyenEposta() { return ses && ses.user && ses.user.new_email || null; },
    onDurum: f => dinDurum.push(f), onBaglanti: f => dinBag.push(f), onOturum: f => dinOturum.push(f),
    baslat: () => dayanikli({ islem: 'yukle' }, true),
    // e-posta onaylandıktan sonra hesabın güncel halini al
    async kullaniciYenile() { if (!ses) return; try { ses.user = await auth('user', undefined, 'GET', await hazirla()); kaydet(); } catch { /* sonra */ } },
    yenile: () => dayanikli({ islem: 'yukle' }),
    komut: cmd => new Promise(coz => { kuyruk.push({ cmd, coz }); isle(); }),
    ad: ad => dayanikli({ islem: 'ad', ad }),
    async siralama() {
      const r = await fetch(url + '/rest/v1/siralama?select=id,name,power,age&order=power.desc&limit=100', { headers: H(await hazirla()) });
      const liste = r.ok ? await r.json() : [];
      const r2 = await fetch(url + '/rest/v1/rpc/benim_siram', { method: 'POST', headers: H(await hazirla()), body: '{}' });
      return { liste, siram: r2.ok ? await r2.json() : null, ben: ses && ses.user && ses.user.id };
    },
    // Misafir hesabına e-posta bağlar: Supabase onay e-postası gönderir.
    async epostaBagla(adres) { const j = await auth('user', { email: adres }, 'PUT', await hazirla()); ses.user = j; kaydet(); return j; },
    // Başka cihazda: e-postaya 6 haneli kod iste, sonra kodla gir.
    kodIste: adres => auth('otp', { email: adres, create_user: false }),
    async kodlaGir(adres, kod) { oturumAl(await auth('verify', { type: 'email', email: adres, token: String(kod).trim() })); },
    cikis() { ses = null; kaydet(); },
  };
}
