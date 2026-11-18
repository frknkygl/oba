// Bütün sesler Web Audio ile kodda üretilir; ses dosyası yoktur.
export function createAudio() {
  let ctx = null, master = null, noise = null, wind = null, windF = null, fireG = null, muted = false, fireLevel = 0, crack = 0;
  const A = {
    get ctx() { return ctx; }, get out() { return master; }, get noise() { return noise; },
    unlock() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; return; }
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true; windF = ctx.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 420; windF.Q.value = 0.5;
      wind = ctx.createGain(); wind.gain.value = 0; src.connect(windF); windF.connect(wind); wind.connect(master); src.start();
      const fs = ctx.createBufferSource(); fs.buffer = noise; fs.loop = true; const ff = ctx.createBiquadFilter(); ff.type = 'lowpass'; ff.frequency.value = 520; fireG = ctx.createGain(); fireG.gain.value = 0; fs.connect(ff); ff.connect(fireG); fireG.connect(master); fs.start();
    },
    setMuted(b) { muted = b; if (master) master.gain.setTargetAtTime(b ? 0 : 0.85, ctx.currentTime, 0.05); }, get muted() { return muted; },
    setWind(v) { if (!ctx) return; wind.gain.setTargetAtTime(0.03 + v * 0.1, ctx.currentTime, 0.6); windF.frequency.setTargetAtTime(320 + v * 520, ctx.currentTime, 0.8); },
    setFire(v) { fireLevel = v; if (ctx) fireG.gain.setTargetAtTime(v * 0.16, ctx.currentTime, 0.3); },
    update(dt) { if (!ctx || fireLevel <= 0.02) return; crack -= dt; if (crack <= 0) { crack = 0.05 + Math.random() * 0.35 / fireLevel; burst(2500 + Math.random() * 3000, 3, 0.02, 0.05 + Math.random() * 0.1 * fireLevel); } },
    step(surface, vol = 1) { if (surface === 'water') burst(700, 0.8, 0.16, 0.09 * vol); else if (surface === 'tall') burst(3200, 0.9, 0.11, 0.05 * vol); else burst(1500, 1.2, 0.07, 0.045 * vol); },
    howl(age = 0) {
      if (!ctx) return; const f0 = age === 0 ? 560 : 330, dur = age === 0 ? 1.3 : 2.6, t = ctx.currentTime;
      for (const [type, mul, g] of [['sine', 1, 0.2], ['triangle', 2, 0.035]]) {
        const o = ctx.createOscillator(), a = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f0 * mul * 0.8, t); o.frequency.exponentialRampToValueAtTime(f0 * mul * 1.42, t + dur * 0.3); o.frequency.setValueAtTime(f0 * mul * 1.42, t + dur * 0.6); o.frequency.exponentialRampToValueAtTime(f0 * mul * 1.12, t + dur);
        if (age === 0) { o.frequency.setValueAtTime(f0 * mul * 1.75, t + dur * 0.42); o.frequency.setValueAtTime(f0 * mul * 1.42, t + dur * 0.47); }
        lfo.frequency.value = 5.5; lg.gain.value = f0 * 0.012 * mul; lfo.connect(lg); lg.connect(o.frequency);
        a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + 0.15); a.gain.setValueAtTime(g, t + dur * 0.7); a.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(a); a.connect(master); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
      }
    },
    growl(age = 0) {
      if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), am = ctx.createOscillator(), ag = ctx.createGain(), a = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = age === 0 ? 150 : 85; am.frequency.value = 31; ag.gain.value = 0.5; a.gain.value = 0; f.type = 'lowpass'; f.frequency.value = age === 0 ? 900 : 520;
      am.connect(ag); ag.connect(a.gain); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.22, t + 0.1); a.gain.linearRampToValueAtTime(0, t + 0.9);
      o.connect(f); f.connect(a); a.connect(master); o.start(t); am.start(t); o.stop(t + 1); am.stop(t + 1);
    },
    whimper() { tone(980, 720, 0.22, 0.09, 'sine'); setTimeout(() => tone(900, 640, 0.3, 0.08, 'sine'), 300); },
    yip() { tone(520, 300, 0.12, 0.1, 'triangle'); },
    sfx(id) {
      if (!ctx) return;
      if (id === 'tas') { burst(2400, 2, 0.03, 0.2); setTimeout(() => tone(180, 80, 0.12, 0.2, 'sine'), 30); }
      else if (id === 'firlat') burst(900, 1.5, 0.18, 0.08);
      else if (id === 'davul') { tone(130, 46, 0.5, 0.6, 'sine'); burst(300, 0.8, 0.2, 0.25); setTimeout(() => { tone(120, 44, 0.45, 0.5, 'sine'); burst(300, 0.8, 0.2, 0.2); }, 230); }
      else if (id === 'yakalandi') { tone(196, 98, 1.1, 0.22, 'sawtooth', 600); tone(147, 73, 1.3, 0.2, 'sawtooth', 500); }
      else if (id === 'bag') { [587, 880, 1174].forEach((f, i) => setTimeout(() => tone(f, f, 0.9, 0.13, 'sine'), i * 140)); }
      else if (id === 'isirik') { burst(1800, 1.5, 0.08, 0.3); tone(220, 110, 0.15, 0.2, 'square', 900); }
      else if (id === 'topla') { tone(440, 660, 0.12, 0.1, 'triangle'); }
      else if (id === 'odun') { burst(700, 1, 0.2, 0.2); burst(3000, 2, 0.5, 0.08); }
      else if (id === 'ye') { [0, 110, 220].forEach(d => setTimeout(() => burst(1300, 2, 0.05, 0.12), d)); }
      else if (id === 'alarm') { tone(330, 392, 0.18, 0.14, 'square', 1400); }
      else if (id === 'kutuk') { burst(180, 1, 0.3, 0.14); }
    },
  };
  function tone(f0, f1, dur, gain, type = 'sine', lp = 0) {
    if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), a = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(gain, t + 0.012); a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); f.connect(a); } else o.connect(a);
    a.connect(master); o.start(t); o.stop(t + dur + 0.03);
  }
  function burst(freq, q, dur, gain) {
    if (!ctx) return; const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
    s.buffer = noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; a.gain.setValueAtTime(gain, t); a.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    s.connect(f); f.connect(a); a.connect(master); s.start(t, Math.random() * 1.5, dur + 0.03);
  }
  A.tone = tone; A.burst = burst;
  return A;
}
