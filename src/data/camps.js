// Baskıncı kampları. travel: tek yön yol süresi (s). Yenilince seviyesi artar, bir saat sonra yeniden kurulur.
export const CAMPS = {
  cakal:   { ad: 'Çakal sürüsü',     age: 1, beast: 'Çakal', travel: 60,  units: { mizrakci: 0, okcu: 0, atli: 3 },  loot: { meat: 120 },                          img: 'k_cakal' },
  yagma:   { ad: 'Yağmacı obası',    age: 1, travel: 120, units: { mizrakci: 5, okcu: 3, atli: 0 },  loot: { wheat: 220, wood: 160 },              img: 'k_yagma' },
  karaatli:{ ad: 'Kara atlılar',     age: 1, travel: 240, units: { mizrakci: 0, okcu: 6, atli: 8 },  loot: { meat: 300, felt: 120 },               img: 'k_karaatli' },
  haydut:  { ad: 'Dağ haydutları',   age: 1, travel: 420, units: { mizrakci: 14, okcu: 12, atli: 6 }, loot: { wood: 600, wheat: 500, felt: 200 },  img: 'k_haydut' },
  bey:     { ad: 'Yağmacı beyinin otağı', age: 1, travel: 600, units: { mizrakci: 25, okcu: 25, atli: 20 }, loot: { wheat: 900, wood: 900, felt: 450 }, img: 'k_bey' },
  demirci: { ad: 'Kaçak demirciler', age: 2, travel: 720, units: { mizrakci: 30, okcu: 30, atli: 25 }, loot: { iron: 200, wood: 800 },          img: 'k_demirci' },
  kurgan:  { ad: 'Kurgan bekçileri', age: 2, travel: 900, units: { mizrakci: 40, okcu: 45, atli: 40 }, loot: { iron: 350, felt: 600 },          img: 'k_kurgan' },
};
export const CAMP_GROW = 1.35;            // her yenilgide birlik sayısı ve ganimet çarpanı
export const CAMP_RESPAWN_MS = 3600 * 1000;
