// Her yapı: seviye L'nin maliyeti cost×c^(L-1), süresi time×g^(L-1) saniye.
// kind: yapının kurulabileceği yer türü. count: en çok kaç tane. unlock: gereken ocak seviyesi.
export const BUILDINGS = {
  ocak:      { ad: 'Ocak', age: 1, kind: 'merkez', count: 1, unlock: 1, cost: { wood: 80, felt: 30, wheat: 60 }, c: 2.0, time: 30, g: 2.6, popCap: 6,
               desc: 'Obanın merkezi. Diğer yapılar ocaktan yüksek seviyeye çıkamaz.' },
  cadir:     { ad: 'Çadır', age: 1, kind: 'cayir', count: 8, counts: [2, 4, 6, 8, 8], unlock: 1, cost: { wood: 40, felt: 15 }, c: 1.75, time: 12, g: 2.3, popCap: 5,
               desc: 'Ailelere yuva. Nüfus sınırını artırır.' },
  tarla:     { ad: 'Tarla', age: 1, kind: 'cayir', count: 6, counts: [2, 3, 4, 5, 6], unlock: 1, cost: { wood: 25, wheat: 10 }, c: 1.7, time: 10, g: 2.2, workers: 1,
               crop: { grow: 150, yield: 50, seed: 10 }, desc: 'Buğday ek, büyüyünce hasat et.' },
  avci:      { ad: 'Avcı çadırı', age: 1, kind: 'cayir', count: 3, counts: [1, 2, 2, 3, 3], unlock: 1, cost: { wood: 30 }, c: 1.7, time: 15, g: 2.3, workers: 2,
               prod: { meat: 0.03 }, desc: 'Avcılar et getirir.' },
  agil:      { ad: 'Ağıl', age: 1, kind: 'cayir', count: 3, counts: [1, 1, 2, 3, 3], unlock: 1, cost: { wood: 50, wheat: 30 }, c: 1.75, time: 20, g: 2.3, workers: 2,
               prod: { meat: 0.015, wool: 0.025 }, desc: 'Koyunlar et ve yün verir.' },
  oduncu:    { ad: 'Oduncu', age: 1, kind: 'nehir', count: 5, counts: [2, 3, 4, 5, 5], unlock: 1, cost: { wood: 15, wheat: 20 }, c: 1.7, time: 12, g: 2.3, workers: 2,
               prod: { wood: 0.04 }, desc: 'Nehir kıyısındaki ağaçlardan odun keser.' },
  kececi:    { ad: 'Keçe yeri', age: 1, kind: 'cayir', count: 2, counts: [1, 1, 2, 2, 2], unlock: 1, cost: { wood: 40, wool: 20 }, c: 1.75, time: 20, g: 2.3, workers: 2,
               prod: { felt: 0.02 }, uses: { wool: 0.025 }, desc: 'Yünü döverek keçe yapar.' },
  ambar:     { ad: 'Ambar', age: 1, kind: 'cayir', count: 1, unlock: 2, cost: { wood: 120, felt: 30 }, c: 1.8, time: 40, g: 2.4, cap: true,
               desc: 'Depoyu büyütür, olgun ekini kendiliğinden hasat edip yeniden eker.' },
  kisla:     { ad: 'Kışla', age: 1, kind: 'cayir', count: 1, unlock: 2, cost: { wood: 150, felt: 40, wheat: 80 }, c: 1.8, time: 45, g: 2.4,
               desc: 'Asker eğitir. Seviyesi ordunun büyüklüğünü belirler.' },
  kam:       { ad: 'Kam çadırı', age: 1, kind: 'cayir', count: 1, unlock: 2, cost: { wood: 120, felt: 60 }, c: 1.8, time: 45, g: 2.4,
               desc: 'Bilgeler burada yeni bilgiler araştırır.' },
  gozcu:     { ad: 'Gözcü kulesi', age: 1, kind: 'cayir', count: 2, counts: [0, 0, 1, 2, 2], unlock: 3, cost: { wood: 100, wheat: 40 }, c: 1.8, time: 30, g: 2.4, tower: 40,
               desc: 'Baskıncıları önceden görür, savunmaya güç katar.' },
  demirocagi:{ ad: 'Demir ocağı', age: 2, kind: 'dag', count: 2, unlock: 6, cost: { wood: 400, felt: 150 }, c: 1.7, time: 120, g: 2.2, workers: 3,
               prod: { iron: 0.01 }, uses: { wood: 0.02 }, desc: 'Dağ eteğinde odun yakarak demir eritir.' },
  demirci:   { ad: 'Demirci', age: 2, kind: 'cayir', count: 1, unlock: 6, cost: { wood: 500, felt: 100, iron: 60 }, c: 1.7, time: 180, g: 2.2,
               desc: 'Demirli birimleri eğitmeyi açar; seviyesi onları güçlendirir.' },
};
export const MAX_LEVEL = { 1: 5, 2: 10 };
export const PROD_PER_LEVEL = 0.4;     // seviye başına üretim artışı
export const round5 = v => Math.max(5, Math.round(v / 5) * 5);
export function levelCost(type, L) {
  const b = BUILDINGS[type], out = {};
  for (const r in b.cost) out[r] = round5(b.cost[r] * Math.pow(b.c, L - 1));
  return out;
}
export const levelTime = (type, L) => Math.round(BUILDINGS[type].time * Math.pow(BUILDINGS[type].g, L - 1)) * 1000;
// ocak seviyesine göre izin verilen adet
export function countLimit(type, ocakL) { const b = BUILDINGS[type]; return b.counts ? b.counts[Math.min(b.counts.length, Math.max(1, ocakL)) - 1] : b.count; }
export const maxWorkers = (type, L) => (BUILDINGS[type].workers ? BUILDINGS[type].workers + (L - 1) : 0);
