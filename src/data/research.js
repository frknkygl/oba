// kam: gereken kam çadırı seviyesi. req: önce açılması gereken bilgiler.
// fx: { anahtar: oran } — anahtarlar: prod.<kaynak>, cap, train, atk.<sınıf>, def, tower, crop
export const RESEARCH = {
  saban:     { ad: 'Saban',            age: 1, kam: 1, req: [],                 cost: { wheat: 80, wood: 60 },   time: 60,    fx: { 'prod.wheat': 0.15, crop: 0.15 } },
  kement:    { ad: 'Kement',           age: 1, kam: 1, req: [],                 cost: { meat: 60, wood: 60 },    time: 60,    fx: { 'prod.meat': 0.15 } },
  balta:     { ad: 'Demir balta',      age: 1, kam: 1, req: [],                 cost: { wood: 100, wheat: 40 },  time: 90,    fx: { 'prod.wood': 0.15 } },
  kecedovme: { ad: 'Keçe dövme',       age: 1, kam: 2, req: ['kement'],         cost: { wool: 80, wood: 120 },   time: 300,   fx: { 'prod.felt': 0.2 } },
  kuyu:      { ad: 'Kuyu ambarı',      age: 1, kam: 2, req: ['saban'],          cost: { wood: 200, felt: 60 },   time: 360,   fx: { cap: 0.25 } },
  yay:       { ad: 'Çift kavisli yay', age: 1, kam: 2, req: [],                 cost: { wood: 220, felt: 40 },   time: 420,   fx: { 'atk.ok': 0.2 } },
  uzengi:    { ad: 'Üzengi',           age: 1, kam: 3, req: ['yay'],            cost: { wood: 300, meat: 200 },  time: 900,   fx: { 'atk.at': 0.2 } },
  talim:     { ad: 'Talim',            age: 1, kam: 3, req: [],                 cost: { wheat: 300, meat: 200 }, time: 900,   fx: { train: 0.25 } },
  nobet:     { ad: 'Nöbet töresi',     age: 1, kam: 3, req: [],                 cost: { wood: 300, wheat: 200 }, time: 900,   fx: { tower: 0.3, def: 0.1 } },
  sulama:    { ad: 'Arık açma',        age: 1, kam: 4, req: ['saban', 'kuyu'],  cost: { wood: 500, wheat: 400 }, time: 1800,  fx: { 'prod.wheat': 0.2, crop: 0.2 } },
  kurultay:  { ad: 'Kurultay töresi',  age: 1, kam: 4, req: ['uzengi', 'kuyu'], cost: { wheat: 800, felt: 300, meat: 400 }, time: 2400, fx: {}, ageKey: true },
  demirdovme:{ ad: 'Demir dövme',      age: 2, kam: 6, req: [],                 cost: { wood: 1200, felt: 300 }, time: 3600,  fx: { 'prod.iron': 0.25 } },
  pulluzirh: { ad: 'Pullu zırh',       age: 2, kam: 6, req: ['demirdovme'],     cost: { iron: 200, felt: 400 },  time: 5400,  fx: { def: 0.2 } },
  ok2:       { ad: 'Demir uçlu ok',    age: 2, kam: 7, req: ['demirdovme'],     cost: { iron: 250, wood: 1500 }, time: 7200,  fx: { 'atk.ok': 0.25 } },
  tamga:     { ad: 'Tamga ve sayım',   age: 2, kam: 8, req: [],                 cost: { wheat: 3000, felt: 800 }, time: 10800, fx: { cap: 0.3, 'prod.wheat': 0.15 } },
};
