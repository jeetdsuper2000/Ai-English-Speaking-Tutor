export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const todayKey = () => new Date().toISOString().slice(0, 10);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const deepCopy = (o) => JSON.parse(JSON.stringify(o));
export const pick = (arr, avoid) => {
  if (!arr.length) return '';
  if (arr.length === 1) return arr[0];
  let v, g = 0;
  do { v = arr[Math.floor(Math.random() * arr.length)]; } while (v === avoid && ++g < 12);
  return v;
};
export const fmtDur = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
};
export const fmtClock = (ts) => {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
export const humanAgo = (ts) => {
  if (!ts) return 'before';
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return 'earlier today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 30) return 'a few weeks ago';
  return 'some time back';
};

let toastTimer = null;
export function toast(msg, ms = 2800) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}