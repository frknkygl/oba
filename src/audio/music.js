// Kodla bestelenen müzik: kopuz (koparılmış tel), kaval ve davul; ruh haline göre değişir.
import { makeRng } from '../core/rng.js';
const SCALE = [0, 3, 5, 7, 10], ROOT = 146.83; // re minör pentatonik
const hz = deg => ROOT * Math.pow(2, (SCALE[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5)) / 12);
const MOODS = {
  sakin: { bpm: 76, pluck: 0.34, drum: 0, flute: 0.22, drone: 0.05, lo: 3, hi: 11 },
  gerilim: { bpm: 116, pluck: 0.2, drum: 1, flute: 0, drone: 0.11, lo: 0, hi: 6 },
  gece: { bpm: 58, pluck: 0.14, drum: 0.25, flute: 0.3, drone: 0.08, lo: 0, hi: 8 },
  final: { bpm: 92, pluck: 0.62, drum: 0.6, flute: 0.4, drone: 0.06, lo: 4, hi: 13 },
  sessiz: { bpm: 70, pluck: 0, drum: 0, flute: 0, drone: 0.02, lo: 3, hi: 9 },
};
export function createMusic(audio) {
  let mood = 'sessiz', next = 0, step = 0, deg = 7, drone = null, bus = null; const rng = makeRng(2026), plucks = new Map();
  function init() {
    const ctx = audio.ctx; bus = ctx.createGain(); bus.gain.value = 0.55; bus.connect(audio.out);
    const g = ctx.createGain(); g.gain.value = 0; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    for (const [fr, det] of [[ROOT / 2, -4], [ROOT / 2, 5], [ROOT * 0.75, 0]]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = det; o.connect(f); o.start(); }
    f.connect(g); g.connect(bus); drone = g; next = ctx.currentTime + 0.1;
  }
  function pluckBuf(freq) { // Karplus-Strong
    const key = Math.round(freq * 10); if (plucks.has(key)) return plucks.get(key);
    const ctx = audio.ctx, sr = ctx.sampleRate, N = Math.round(sr / freq), len = Math.floor(sr * 1.8), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0), r = makeRng(key);
    for (let i = 0; i < N; i++) d[i] = (r() * 2 - 1) * (1 - i / N * 0.3);
    for (let i = N; i < len; i++) d[i] = (d[i - N] + d[i - N + 1]) * 0.4975;
    plucks.set(key, b); return b;
  }
  function pluck(freq, t, gain) { const ctx = audio.ctx, s = ctx.createBufferSource(), a = ctx.createGain(); s.buffer = pluckBuf(freq); a.gain.value = gain; s.connect(a); a.connect(bus); s.start(t); }
  function flute(freq, t, dur, gain) {
    const ctx = audio.ctx, o = ctx.createOscillator(), a = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(), n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq * 0.97, t); o.frequency.linearRampToValueAtTime(freq, t + 0.09); l.frequency.value = 4.8; lg.gain.value = freq * 0.008; l.connect(lg); lg.connect(o.frequency);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(gain, t + 0.1); a.gain.setValueAtTime(gain, t + dur - 0.2); a.gain.linearRampToValueAtTime(0, t + dur);
    n.buffer = audio.noise; nf.type = 'bandpass'; nf.frequency.value = freq * 2; nf.Q.value = 2; ng.gain.value = 0.18; n.connect(nf); nf.connect(ng); ng.connect(a);
    o.connect(a); a.connect(bus); o.start(t); l.start(t); n.start(t, 0.3); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05); n.stop(t + dur + 0.05);
  }
  function drum(t, kind, gain) {
    const ctx = audio.ctx, o = ctx.createOscillator(), a = ctx.createGain(); o.type = 'sine';
    const f0 = kind === 'dum' ? 118 : 300; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(kind === 'dum' ? 44 : 180, t + 0.22);
    a.gain.setValueAtTime(gain, t); a.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'dum' ? 0.4 : 0.12)); o.connect(a); a.connect(bus); o.start(t); o.stop(t + 0.45);
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = audio.noise; f.type = 'bandpass'; f.frequency.value = kind === 'dum' ? 260 : 1900; f.Q.value = 1; g.gain.setValueAtTime(gain * 0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09); n.connect(f); f.connect(g); g.connect(bus); n.start(t, rng(), 0.12);
  }
  function schedule(t) {
    const M = MOODS[mood], s = step % 16;
    if (M.drum > 0) {
      if (mood === 'gerilim') { if ([0, 3, 6, 8, 11, 14].includes(s)) drum(t, 'dum', 0.42); else if (s % 2 === 1) drum(t, 'tek', 0.12); }
      else if (mood === 'final') { if (s === 0 || s === 6 || s === 10) drum(t, 'dum', 0.3 * M.drum); else if (s === 4 || s === 12 || s === 14) drum(t, 'tek', 0.14); }
      else if (s === 0 && rng() < 0.6) drum(t, 'dum', 0.22);
    }
    if (M.pluck > 0) {
      if (s === 0) pluck(hz(Math.floor(M.lo / 5) * 5 - 5), t, 0.3);
      if (rng() < M.pluck || (mood === 'final' && s % 4 === 0)) { deg += Math.round((rng() - 0.5) * 4); if (deg < M.lo) deg = M.lo + 1; if (deg > M.hi) deg = M.hi - 1; pluck(hz(deg), t, 0.2 + rng() * 0.12); if (rng() < 0.25) pluck(hz(deg + 2), t + 0.09, 0.12); }
    }
    if (M.flute > 0 && s % 8 === 0 && rng() < M.flute * 1.6) { const d = M.lo + 2 + Math.floor(rng() * 5), sp = 60 / M.bpm / 2; flute(hz(d + 5), t, sp * (4 + Math.floor(rng() * 3) * 2), 0.07); if (rng() < 0.5) flute(hz(d + 6), t + sp * 6, sp * 4, 0.055); }
    step++;
  }
  return {
    setMood(m) { if (MOODS[m] && m !== mood) mood = m; }, get mood() { return mood; },
    update() {
      const ctx = audio.ctx; if (!ctx) return; if (!bus) init();
      const M = MOODS[mood]; drone.gain.setTargetAtTime(M.drone, ctx.currentTime, 1.2);
      if (next < ctx.currentTime - 0.5) next = ctx.currentTime + 0.05;
      while (next < ctx.currentTime + 0.25) { schedule(next); next += 60 / M.bpm / 2; }
    },
  };
}
