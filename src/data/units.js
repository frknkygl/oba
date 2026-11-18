// Sınıflar: mizrak atı yener, at oku yener, ok mızrağı yener.
export const UNITS = {
  mizrakci: { ad: 'Mızrakçı', age: 1, cls: 'mizrak', atk: 8,  def: 12, cost: { wheat: 30, wood: 20 }, time: 20 },
  okcu:     { ad: 'Okçu',     age: 1, cls: 'ok',     atk: 12, def: 7,  cost: { wheat: 25, wood: 35 }, time: 25 },
  atli:     { ad: 'Atlı',     age: 1, cls: 'at',     atk: 14, def: 9,  cost: { wheat: 40, meat: 30 }, time: 40 },
  atliokcu: { ad: 'Atlı okçu', age: 2, cls: 'ok',    atk: 24, def: 14, cost: { meat: 50, wood: 40, iron: 15 }, time: 60, demirci: true },
  zirhli:   { ad: 'Zırhlı süvari', age: 2, cls: 'at', atk: 28, def: 28, cost: { meat: 60, wheat: 40, iron: 40 }, time: 90, demirci: true },
};
export const BEATS = { mizrak: 'at', at: 'ok', ok: 'mizrak' };
export const UNIT_KEYS = Object.keys(UNITS);
export const ARMY_PER_KISLA = 20;
export const TRAIN_PER_KISLA = 5;   // tek seferde eğitilebilecek asker, kışla seviyesi başına
