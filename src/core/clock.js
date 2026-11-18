// Oyun saati. Çevrimiçi oyunda esas olan sunucu saatidir; kaynak bağlanınca setSource ile verilir.
// Yerel geliştirmede ?saat=<dakika> saati ileri alır (yalnız localhost).
let offset = 0, source = () => Date.now();
try { const dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname), m = dev && new URLSearchParams(location.search).get('saat'); if (m) offset = Number(m) * 60e3 || 0; } catch { /* sunucu */ }
export const now = () => source() + offset;
export const shift = ms => { offset += ms; };
export const setSource = f => { source = f; };
