// Haritayı, yapıları ve figürleri tuvale çizer; kamera (kaydırma, yakınlaştırma) burada.
import { PLOTS, depthScale, HORIZON } from '../data/plots.js';
import { spriteFor, SIZE } from '../data/sprites.js';
import { isWinter } from '../sim/economy.js';

const BASE_W = 300;   // haritada önde duran yapının genişliği (harita pikseli)
export function createView(canvas, img) {
  const ctx = canvas.getContext('2d');
  const MW = img.map.width, MH = img.map.height;
  const cam = { x: MW * 0.5, y: MH * 0.52, z: 1 };
  let W = 0, H = 0, dpr = 1, zMin = 1, zMax = 3;
  const P = PLOTS.map(p => ({ ...p, x: p.u * MW, y: p.v * MH, s: depthScale(p.v) }));
  const fx = [];   // yüzen yazılar
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    zMin = Math.max(W / MW, H / MH); zMax = zMin * 3.2; cam.z = Math.max(zMin, Math.min(zMax, cam.z)); clamp();
  }
  function clamp() {
    const hw = W / 2 / cam.z, hh = H / 2 / cam.z;
    cam.x = Math.max(hw, Math.min(MW - hw, cam.x)); cam.y = Math.max(hh, Math.min(MH - hh, cam.y));
  }
  const toScreen = (x, y) => [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2];
  const toWorld = (sx, sy) => [(sx - W / 2) / cam.z + cam.x, (sy - H / 2) / cam.z + cam.y];
  function pan(dx, dy) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clamp(); }
  function zoomAt(f, sx, sy) { const [wx, wy] = toWorld(sx, sy); cam.z = Math.max(zMin, Math.min(zMax, cam.z * f)); const [nx, ny] = toWorld(sx, sy); cam.x += wx - nx; cam.y += wy - ny; clamp(); }
  function focus(slotId, z) { const p = P[slotId]; cam.x = p.x; cam.y = p.y - 60; if (z) cam.z = Math.max(zMin, Math.min(zMax, zMin * z)); clamp(); }
  function spriteBox(p, b) {
    const key = b ? spriteFor(b, false) : null, im = key && img[key];
    const w = BASE_W * p.s * (b ? SIZE[b.type] || 0.9 : 0.8), h = im ? w * im.height / im.width : w * 0.7;
    return { w, h, x: p.x - w / 2, y: p.y - h * 0.82 };
  }
  // Dokunulan yeri bul: önce yapının resmi, sonra yer işaretinin çevresi.
  function hitSlot(s, sx, sy) {
    const [wx, wy] = toWorld(sx, sy); let best = null, bd = Infinity;
    for (const p of P) {
      const b = s.slots[p.id].b, bx = spriteBox(p, b);
      const inBox = b && wx >= bx.x + bx.w * 0.12 && wx <= bx.x + bx.w * 0.88 && wy >= bx.y + bx.h * 0.1 && wy <= p.y + bx.h * 0.12;
      const d = Math.hypot(wx - p.x, (wy - (b ? p.y - bx.h * 0.35 : p.y)) * 1.4);
      const r = Math.max(30 / cam.z, (b ? bx.w * 0.45 : 70 * p.s));
      const score = inBox ? d * 0.5 : d;
      if ((inBox || d < r) && score < bd) { bd = score; best = p.id; }
    }
    return best;
  }
  // Seçilen yeri, alttaki panelin üstünde kalacak şekilde ekranın üst kısmına kaydır.
  function reveal(slotId) {
    const p = P[slotId], [, sy] = toScreen(p.x, p.y), want = H * 0.3;
    if (sy > want) { const tx = cam.x, ty = cam.y + (sy - want) / cam.z; animTo = { x: tx, y: ty }; }
  }
  let animTo = null;
  // Ekran dışındaki bir yeri ortala (Gökbörü bir yer gösterdiğinde).
  function glide(slotId) { const p = P[slotId], [sx, sy] = toScreen(p.x, p.y); if (sx < W * 0.12 || sx > W * 0.82 || sy < H * 0.15 || sy > H * 0.7) animTo = { x: p.x, y: p.y - 40 }; }
  function tick() { if (!animTo) return; const y0 = cam.y, x0 = cam.x; cam.x += (animTo.x - cam.x) * 0.2; cam.y += (animTo.y - cam.y) * 0.2; clamp(); if (Math.abs(cam.y - y0) + Math.abs(cam.x - x0) < 0.3) animTo = null; }
  function floatText(slotId, text, color = '#fff6d8') { const p = P[slotId]; fx.push({ x: p.x, y: p.y - 140 * p.s, text, color, t: 0 }); }

  function draw(s, now, opt) {
    tick();
    const t = now / 1000, winter = isWinter(s, s.t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#c99a45'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * (W / 2 - cam.x * cam.z), dpr * (H / 2 - cam.y * cam.z));
    ctx.drawImage(img.map, 0, 0);
    if (winter) {
      const y0 = HORIZON * MH, g = ctx.createLinearGradient(0, y0 - 40, 0, y0 + 80);
      g.addColorStop(0, 'rgba(235,242,255,0)'); g.addColorStop(1, 'rgba(235,242,255,0.62)');
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = g; ctx.fillRect(0, y0 - 40, MW, MH - y0 + 40);
      ctx.fillStyle = 'rgba(40,70,140,0.10)'; ctx.fillRect(0, 0, MW, MH);
    }
    // boş yerler
    for (const p of P) {
      const x = s.slots[p.id]; if (x.b) continue;
      const sel = opt.selected === p.id, hint = opt.hint === p.id;
      if (!sel && !hint && !opt.showPlots) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.5);
      const r = 70 * p.s * (hint ? 1 + 0.08 * Math.sin(t * 5) : 1);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = sel ? 'rgba(255,236,170,0.35)' : 'rgba(255,240,200,0.14)'; ctx.fill();
      ctx.setLineDash([10 * p.s, 8 * p.s]); ctx.lineWidth = (sel || hint ? 6 : 3.5) * p.s;
      ctx.strokeStyle = sel || hint ? 'rgba(255,240,190,0.95)' : 'rgba(255,245,215,0.55)'; ctx.stroke();
      ctx.restore();
    }
    // yapılar ve figürler, uzaktan yakına
    const items = [];
    for (const p of P) { const b = s.slots[p.id].b; if (b) items.push({ y: p.y, kind: 'b', p, b }); }
    if (opt.people) for (const f of opt.people) items.push(f);
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.kind !== 'b') { const im = img[it.img]; if (!im) continue; const h = it.h, w = h * im.width / im.height;
        ctx.save(); ctx.translate(it.x, it.y); if (it.flip) ctx.scale(-1, 1); ctx.globalAlpha = it.a ?? 1;
        ctx.drawImage(im, -w / 2, -h - (it.bob || 0), w, h); ctx.restore(); continue; }
      const { p, b } = it, key = spriteFor(b, winter), im = img[key], bx = spriteBox(p, b);
      if (opt.selected === p.id) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.45); ctx.beginPath(); ctx.arc(0, 0, bx.w * 0.55, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,236,170,0.32)'; ctx.fill(); ctx.lineWidth = 6 * p.s; ctx.strokeStyle = 'rgba(255,240,190,0.95)'; ctx.stroke(); ctx.restore(); }
      if (im) ctx.drawImage(im, bx.x, bx.y, bx.w, bx.h);
      if (winter && im && b.type !== 'tarla') { ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#eef4ff'; ctx.beginPath(); ctx.ellipse(p.x, bx.y + bx.h * 0.3, bx.w * 0.32, bx.h * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      // iş ilerleme halkası
      if (b.job) {
        const u = Math.max(0, Math.min(1, (s.t - b.job.start) / (b.job.end - b.job.start))), cx = p.x, cy = bx.y - 6 * p.s, r = 30 * p.s;
        ctx.lineWidth = 9 * p.s; ctx.strokeStyle = 'rgba(30,20,10,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff3d0'; ctx.font = `700 ${22 * p.s}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚒', cx, cy + 1);
      }
      if (b.type === 'tarla' && b.crop && b.crop.prog >= 1) { const cy = bx.y - 10 * p.s + Math.sin(t * 4) * 5 * p.s; bubble(p.x, cy, 30 * p.s, '🌾'); }
      if (b.type === 'tarla' && b.level >= 1 && !b.crop && !b.job) { const cy = bx.y - 10 * p.s + Math.sin(t * 4) * 5 * p.s; bubble(p.x, cy, 30 * p.s, '🌱'); }
      if (opt.badges && opt.badges[p.id]) { const cy = bx.y - 10 * p.s; bubble(p.x + bx.w * 0.3, cy, 24 * p.s, opt.badges[p.id]); }
    }
    // yüzen yazılar
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += opt.dt || 0.016; if (f.t > 1.8) { fx.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, 2 * (1.8 - f.t)); ctx.font = '800 34px system-ui'; ctx.textAlign = 'center';
      ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(40,24,10,0.8)'; ctx.strokeText(f.text, f.x, f.y - f.t * 70); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - f.t * 70); ctx.globalAlpha = 1;
    }
    // ekran kenarı: kenar kararması
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(30,15,5,0.35)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  function bubble(x, y, r, emoji) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,248,226,0.95)'; ctx.fill(); ctx.lineWidth = r * 0.12; ctx.strokeStyle = 'rgba(120,70,20,0.8)'; ctx.stroke();
    ctx.font = `${r * 1.15}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji, x, y + r * 0.06);
  }
  resize(); cam.z = zMin * 1.35; focus(0);
  return { cam, P, resize, pan: (dx, dy) => { animTo = null; pan(dx, dy); }, zoomAt, focus, reveal, glide, hitSlot, draw, floatText, toWorld, spriteBox, get size() { return [W, H]; }, get map() { return [MW, MH]; } };
}
