// Modelleri yükler: her biri en çok `timeout` ms bekler, hata ya da bozuk modelde yine de devam eder.
export function loadAll(map, { load, use, timeout = 8000, retries = 2, onProgress = () => {} }) {
  let doneN = 0; const total = Object.keys(map).length;
  return Promise.all(Object.entries(map).map(([type, url]) => new Promise(resolve => {
    let over = false;
    const finish = () => { if (over) return; over = true; clearTimeout(timer); onProgress(++doneN / total); resolve(); };
    const timer = setTimeout(finish, timeout);
    const attempt = k => load(k ? url + '?r=' + k : url,
      g => { if (over) return; try { use(type, g && g.scene); } catch (e) { console.warn('model kullanılamadı', type, e); } finish(); },
      () => (over ? null : k < retries ? setTimeout(() => attempt(k + 1), 400 * (k + 1)) : finish()));
    attempt(0);
  })));
}
