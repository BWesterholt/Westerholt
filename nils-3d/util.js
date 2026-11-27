// Small helpers for the 3D record shop: maths, easing, springs, tweens and text.

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const ease = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  in: (t) => t * t * t,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

// A critically damped spring (no overshoot), stable for any time step. Returns [position, velocity].
export function spring(x, v, target, omega, dt) {
  const f = 1 + 2 * dt * omega, oo = omega * omega, hoo = dt * oo, hhoo = dt * hoo;
  const inv = 1 / (f + hhoo);
  return [(f * x + dt * v + hhoo * target) * inv, (v + hoo * (target - x)) * inv];
}

// A number from a text, the same every time (FNV-1a).
export function hash(s) {
  let h = 2166136261;
  s = String(s);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// Repeatable random numbers from a seed (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Tweens: small timed animations driven by the render loop.
export class Tweens {
  constructor() { this.list = []; }
  add({ dur = 1, delay = 0, ease: e = ease.inOut, update, done }) {
    return new Promise((resolve) => {
      const t = { t: -delay, dur, e, update, done: () => { if (done) done(); resolve(); }, dead: false };
      this.list.push(t);
      if (dur <= 0 && delay <= 0) { update && update(1); t.dead = true; this.list.pop(); t.done(); }
      else if (delay <= 0 && update) update(0);
    });
  }
  wait(s) { return this.add({ dur: s }); }
  tick(dt) {
    if (!this.list.length) return false;
    const now = this.list.slice();
    for (const t of now) {
      if (t.dead) continue;
      t.t += dt;
      if (t.t < 0) continue;
      const k = Math.min(1, t.t / t.dur);
      if (t.update) t.update(t.e(k));
      if (k >= 1) { t.dead = true; t.done(); }
    }
    this.list = this.list.filter((t) => !t.dead);
    return true;
  }
  get busy() { return this.list.length > 0; }
}

export const collator = new Intl.Collator("da", { sensitivity: "base", numeric: true });
export function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9æøå ]+/g, " ").replace(/\s+/g, " ").trim(); }
export function num(n) { return Math.round(n).toLocaleString("da-DK"); }
export function kr(n) { return num(n) + " kr."; }
export function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

// "Adams, Bryan" is filed under A; on a sleeve it reads "Bryan Adams". Compilations ("ÅÅ ...")
// are filed last and have no artist of their own.
export function displayArtist(a) {
  a = String(a || "").trim();
  if (/^ÅÅ\s*/.test(a)) return "Diverse kunstnere";
  // "Petty, Tom & The Heartbreakers" reads "Tom Petty & The Heartbreakers", "Cross, The (feat. Roger
  // Taylor)" reads "The Cross (feat. Roger Taylor)". Bands with commas in the name stay as they are.
  const m = a.match(/^([^,&]+),\s*([^,]+)$/);
  if (!m || /^(Emerson, Lake|Marvin, Welch|Beck, Bogert|Earth, Wind|Blood, Sweat)/i.test(a)) return a;
  const cut = m[2].search(/\s*(?:&|\+|\/|\(|\bw\/|\b(?:and|og|feat\.?|with)\s|\s[‑–-]\s)/i);
  const first = (cut > 0 ? m[2].slice(0, cut) : m[2]).trim(), rest = cut > 0 ? m[2].slice(cut).trim() : "";
  return (first + " " + m[1].trim() + (rest ? " " + rest : "")).replace(/\s+/g, " ");
}
export function isCompilation(a) { return /^ÅÅ/.test(String(a || "")); }
