// Dokunma ve fare: tek parmakla kaydır, iki parmakla yakınlaştır, kısa dokunuşla seç.
export function createInput(canvas, view, onTap) {
  const pts = new Map(); let moved = 0, downT = 0, pinch = null;
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) { moved = 0; downT = performance.now(); } if (pts.size >= 2) { moved = 99; pinch = pts.size === 2 ? dist() : null; } });
  canvas.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) { view.pan(dx, dy); moved += Math.abs(dx) + Math.abs(dy); }
    else if (pts.size === 2) { const d = dist(), c = mid(); if (pinch) view.zoomAt(d / pinch, c.x, c.y); pinch = d; moved += 99; }
  });
  const up = e => {
    const p = pts.get(e.pointerId); if (!p) return; pts.delete(e.pointerId);
    pinch = pts.size === 2 ? dist() : null;
    if (pts.size === 0 && moved < 12 && performance.now() - downT < 400) onTap(p.x, p.y);
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', e => { pts.delete(e.pointerId); pinch = pts.size === 2 ? dist() : null; moved = 99; });
  canvas.addEventListener('wheel', e => { e.preventDefault(); view.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
  function dist() { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); }
  function mid() { const [a, b] = [...pts.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
}
