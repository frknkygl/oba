// Kare hızı ölçer: 2 sn'lik pencerelerle bakar; arka plandan dönüş gibi uzun boşlukları saymaz.
export function createFpsMonitor({ now = () => performance.now(), onSlow, warmup = 4000, span = 2000, threshold = 26 } = {}) {
  const born = now(); let since = born, n = 0, last = 0, fps = 0;
  const reset = () => { since = now(); n = 0; last = 0; };
  return {
    reset,
    get fps() { return fps; },
    frame() {
      const t = now();
      if (last && t - last > 1000) { since = t; n = 0; }
      last = t; n++;
      if (t - since >= span) { fps = n * 1000 / (t - since); since = t; n = 0; if (fps < threshold && t - born >= warmup && onSlow) onSlow(fps); }
    },
  };
}
