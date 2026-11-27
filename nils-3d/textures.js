// Pictures drawn in the browser for the record shop: floorboards, bricks, crates, cardboard
// dividers, the neon sign, sleeves without a cover, price stickers, record labels and the backs
// of the sleeves. Nothing is downloaded for these, so the shop opens quickly.
import * as THREE from "three";
import { rng, hash, displayArtist, isCompilation, kr } from "./util.js";

export const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif';
export const SERIF = 'Georgia, "Times New Roman", serif';
let ANISO = 4;
export function setAnisotropy(n) { ANISO = n; }

export function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
export function texture(c, { srgb = true, repeat = null, aniso = ANISO, mips = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = aniso;
  if (!mips) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  return t;
}
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

// Old oak floorboards running the length of the room: 1.6 x 3.2 m per picture, boards of
// different lengths, drawn so the picture repeats without a seam. Returns colours and roughness.
export function floorboards() {
  const W = 1024, H = 2048, c = canvas(W, H), r = canvas(W / 4, H / 4), g = c.getContext("2d"), q = r.getContext("2d");
  const rand = rng(7);
  const planks = 10, w = W / planks;
  q.fillStyle = "#909090"; q.fillRect(0, 0, W / 4, H / 4);
  for (let p = 0; p < planks; p++) {
    const x0 = p * w;
    let y = -rand() * 900;
    const startY = y;
    while (y < startY + H) {
      const len = 520 + rand() * 640;
      const hue = 25 + rand() * 8, sat = 22 + rand() * 12, lig = 19 + rand() * 11;
      for (const off of [0, -H, H]) {
        const yy = y + off;
        if (yy > H || yy + len < 0) continue;
        const grad = g.createLinearGradient(x0, 0, x0 + w, 0);
        grad.addColorStop(0, hsl(hue, sat, lig - 2)); grad.addColorStop(0.5, hsl(hue, sat, lig + 1.5)); grad.addColorStop(1, hsl(hue, sat, lig - 3));
        g.fillStyle = grad; g.fillRect(x0, yy, w, len);
        const gr = rng(Math.floor(y * 13 + p * 7));
        for (let k = 0; k < 30; k++) {
          const xx = x0 + gr() * w, amp = 0.8 + gr() * 3, f = 0.003 + gr() * 0.008, ph = gr() * 9;
          g.strokeStyle = gr() < 0.6 ? hsl(hue - 3, sat + 6, lig - 9, 0.16 + gr() * 0.18) : hsl(hue + 3, sat, lig + 9, 0.06 + gr() * 0.08);
          g.lineWidth = 0.6 + gr() * 1.4;
          g.beginPath();
          for (let t = 0; t <= len; t += 12) { const xv = xx + Math.sin(t * f + ph) * amp + Math.sin(t * f * 2.7 + ph) * amp * 0.35; t ? g.lineTo(xv, yy + t) : g.moveTo(xv, yy); }
          g.stroke();
        }
        if (gr() < 0.3) {
          const ky = yy + 60 + gr() * (len - 120), kx = x0 + 18 + gr() * (w - 36);
          for (let k = 5; k > 0; k--) { g.strokeStyle = hsl(hue - 6, sat + 8, lig - 12, 0.22); g.lineWidth = 1.1; g.beginPath(); g.ellipse(kx, ky, k * 2, k * 4.5, 0, 0, Math.PI * 2); g.stroke(); }
        }
        // the end of the board, and how worn its finish is
        g.fillStyle = "rgba(10,6,3,.8)"; g.fillRect(x0, yy + len - 2, w, 2.5);
        const rv = 105 + rand() * 80 | 0;
        q.fillStyle = `rgb(${rv},${rv},${rv})`; q.fillRect(x0 / 4, yy / 4, w / 4, len / 4);
        q.fillStyle = "#fff"; q.fillRect(x0 / 4, (yy + len - 2) / 4, w / 4, 1);
      }
      y += len;
    }
    // the joint between the boards: a dark gap with a lighter worn edge
    g.fillStyle = "rgba(8,5,3,.92)"; g.fillRect(x0 - 1.5, 0, 3, H);
    g.fillStyle = "rgba(255,220,180,.05)"; g.fillRect(x0 + 1.5, 0, 2, H);
    q.fillStyle = "#fff"; q.fillRect(x0 / 4 - 0.5, 0, 1, H / 4);
  }
  for (let k = 0; k < 4000; k++) { g.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,230,200"},${rand() * 0.05})`; g.fillRect(rand() * W, rand() * H, 1 + rand() * 3, 1 + rand() * 2); }
  return { map: texture(c, { repeat: [1, 1] }), rough: texture(r, { srgb: false, repeat: [1, 1] }), size: [1.6, 3.2] };
}

// Old red bricks with mortar: 2.4 x 2.4 m per picture, with a bump map for the mortar lines.
export function bricks({ paint = null } = {}) {
  const S = 1024, c = canvas(S, S), b = canvas(S, S), g = c.getContext("2d"), q = b.getContext("2d");
  const rand = rng(11);
  const courses = 32, ch = S / courses, bw = ch * 3.05, mortar = 4;
  g.fillStyle = paint ? paint.mortar : "#57504a"; g.fillRect(0, 0, S, S);
  q.fillStyle = "#000"; q.fillRect(0, 0, S, S);
  for (let row = 0; row < courses; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -off; x < S; x += bw) {
      const y = row * ch;
      let hue = 9 + rand() * 13, sat = 20 + rand() * 16, lig = 21 + rand() * 12;
      if (rand() < 0.1) lig -= 7;
      if (rand() < 0.06) { sat -= 10; lig += 6; }
      if (paint) { hue = paint.h + rand() * 4; sat = paint.s; lig = paint.l + rand() * 5; }
      g.fillStyle = hsl(hue, sat, lig);
      const bx = x + mortar / 2 + (rand() - 0.5) * 1.5, by = y + mortar / 2 + (rand() - 0.5) * 1.2;
      g.beginPath(); g.roundRect(bx, by, bw - mortar, ch - mortar, 2.5); g.fill();
      // texture inside the brick
      for (let k = 0; k < 26; k++) { g.fillStyle = rand() < 0.5 ? hsl(hue, sat, lig - 8, 0.35) : hsl(hue + 6, sat - 8, lig + 9, 0.25); g.fillRect(bx + rand() * (bw - mortar), by + rand() * (ch - mortar), 1 + rand() * 4, 1 + rand() * 2); }
      const sh = g.createLinearGradient(0, by, 0, by + ch);
      sh.addColorStop(0, "rgba(255,255,255,.06)"); sh.addColorStop(1, "rgba(0,0,0,.14)");
      g.fillStyle = sh; g.fillRect(bx, by, bw - mortar, ch - mortar);
      const v = 170 + rand() * 60 | 0;
      q.fillStyle = `rgb(${v},${v},${v})`; q.beginPath(); q.roundRect(bx, by, bw - mortar, ch - mortar, 3); q.fill();
    }
  }
  for (let k = 0; k < 9000; k++) { const v = rand() * 255 | 0; q.fillStyle = `rgba(${v},${v},${v},.12)`; q.fillRect(rand() * S, rand() * S, 2, 2); }
  // soot and age, darker near the floor
  const age = g.createLinearGradient(0, 0, 0, S);
  age.addColorStop(0, "rgba(10,6,4,.12)"); age.addColorStop(1, "rgba(20,10,5,.28)");
  g.fillStyle = age; g.fillRect(0, 0, S, S);
  return { map: texture(c, { repeat: [1, 1] }), bump: texture(b, { srgb: false, repeat: [1, 1] }) };
}

// Painted plaster in one colour with a little life in it.
export function plaster(color) {
  const S = 512, c = canvas(S, S), g = c.getContext("2d"), rand = rng(5);
  g.fillStyle = color; g.fillRect(0, 0, S, S);
  for (let k = 0; k < 220; k++) {
    const x = rand() * S, y = rand() * S, r = 20 + rand() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const a = rand() * 0.05;
    gr.addColorStop(0, rand() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.7})`); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return texture(c, { repeat: [1, 1] });
}

// Wood for tables and the counter: dark stained, grain along the length.
export function darkWood(seed = 3, { hue = 22, lig = 18 } = {}) {
  const W = 1024, H = 256, c = canvas(W, H), g = c.getContext("2d"), rand = rng(seed);
  g.fillStyle = hsl(hue, 38, lig); g.fillRect(0, 0, W, H);
  for (let k = 0; k < 140; k++) {
    const y = rand() * H, amp = 2 + rand() * 6, f = 0.002 + rand() * 0.006, ph = rand() * 7;
    g.strokeStyle = rand() < 0.6 ? hsl(hue - 4, 40, lig - 9, 0.25) : hsl(hue + 6, 34, lig + 12, 0.12);
    g.lineWidth = 0.6 + rand() * 2;
    g.beginPath();
    for (let x = 0; x <= W; x += 12) { const yy = y + Math.sin(x * f + ph) * amp; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
    g.stroke();
  }
  return texture(c, { repeat: [1, 1] });
}

// Light pine for the crates, with a burnt-in stamp on the side.
export function pine(stamp) {
  const W = 512, H = 256, c = canvas(W, H), g = c.getContext("2d"), rand = rng(hash(stamp || "x"));
  g.fillStyle = "#C79A62"; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 70; k++) {
    const y = rand() * H, amp = 2 + rand() * 5, f = 0.005 + rand() * 0.01, ph = rand() * 7;
    g.strokeStyle = rand() < 0.7 ? "rgba(140,90,40,.28)" : "rgba(255,235,200,.18)";
    g.lineWidth = 0.6 + rand() * 1.8;
    g.beginPath();
    for (let x = 0; x <= W; x += 8) { const yy = y + Math.sin(x * f + ph) * amp; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
    g.stroke();
  }
  // slat joints
  g.fillStyle = "rgba(60,35,15,.5)"; g.fillRect(0, H / 2 - 1.5, W, 3);
  if (stamp) {
    g.save(); g.translate(W / 2, H * 0.27); g.rotate(-0.02);
    g.font = `800 34px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(55,28,10,.55)"; g.fillText(stamp, 0, 0);
    g.restore();
  }
  const sh = g.createLinearGradient(0, 0, 0, H);
  sh.addColorStop(0, "rgba(255,240,210,.1)"); sh.addColorStop(1, "rgba(50,25,8,.25)");
  g.fillStyle = sh; g.fillRect(0, 0, W, H);
  return texture(c);
}

// A grey cardboard divider with its tab, like the dividers on the collection page.
// The tab sits at one of five places (k = 0..4), so the tabs are staggered.
export function divider(letter, k) {
  const W = 256, H = 320, c = canvas(W, H), g = c.getContext("2d");
  const tabW = 78, tabH = 48, body = H - tabH, tx = 6 + (W - tabW - 12) * (k / 4);
  g.clearRect(0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#ECE7DE"); grad.addColorStop(1, "#CFC8BB");
  g.fillStyle = grad;
  g.beginPath(); g.roundRect(tx, 0, tabW, tabH + 12, [12, 12, 0, 0]); g.fill();
  g.beginPath(); g.roundRect(0, tabH, W, body, [8, 8, 2, 2]); g.fill();
  const rand = rng(hash(letter));
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},${rand() * 0.07})`; g.fillRect(rand() * W, tabH + rand() * body, 2, 2); }
  g.fillStyle = "#1D1D1F"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `800 ${letter.length > 2 ? 22 : 36}px ${FONT}`;
  g.fillText(letter, tx + tabW / 2, tabH / 2 + 3);
  const t = texture(c);
  t.userData = { tabX: tx / W, tabW: tabW / W, tabH: tabH / H };
  return t;
}

// The card on the front of a crate: which letters are inside.
export function crateCard(text, sub) {
  const W = 256, H = 128, c = canvas(W, H), g = c.getContext("2d");
  g.fillStyle = "#F3EBDD"; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 10); g.fill();
  g.strokeStyle = "rgba(60,40,20,.25)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#1D1D1F"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `800 ${text.length > 5 ? 44 : 64}px ${FONT}`; g.fillText(text, W / 2, sub ? 52 : H / 2 + 2);
  if (sub) { g.font = `600 20px ${FONT}`; g.fillStyle = "#7a6a58"; g.fillText(sub, W / 2, 100); }
  return texture(c);
}

// A neon sign: glass tubes drawn as light, with a dark backboard behind.
export function neon(lines, { w = 2048, h = 640 } = {}) {
  const c = canvas(w, h), g = c.getContext("2d");
  g.clearRect(0, 0, w, h);
  for (const L of lines) {
    g.save();
    g.font = L.font; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineJoin = "round"; g.lineCap = "round";
    // outer glow, then the tube, then the hot core
    g.shadowColor = L.color; g.shadowBlur = 60; g.strokeStyle = L.color; g.globalAlpha = 0.55; g.lineWidth = L.width * 2.2; g.strokeText(L.text, L.x, L.y);
    g.shadowBlur = 24; g.globalAlpha = 1; g.lineWidth = L.width; g.strokeText(L.text, L.x, L.y);
    g.shadowBlur = 0; g.strokeStyle = L.core || "#fff6ea"; g.lineWidth = L.width * 0.38; g.strokeText(L.text, L.x, L.y);
    g.restore();
  }
  return texture(c, { mips: true });
}

// A plain sleeve for a record without a cover: one colour, the title in type, like a test pressing
// or a generic company sleeve. Drawn on the given canvas size.
export function plainSleeve(rec, S = 512) {
  const c = canvas(S, S), g = c.getContext("2d");
  const h = hash(rec.a + "|" + rec.b), rand = rng(h);
  const styles = [["#E9E1D3", "#1D1D1F", "#AE633D"], ["#1D1D1F", "#F3EBDD", "#D9A441"], ["#2F4858", "#F6E7CB", "#E07A5F"], ["#7A2E2A", "#F4E9DA", "#E8C07D"], ["#3E5641", "#F1EAD8", "#D4A373"], ["#D9CBB5", "#3A2E28", "#8C3B2E"], ["#20324B", "#E8EEF5", "#F2B134"]];
  const [bg, fg, ac] = styles[h % styles.length];
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  const k = S / 512;
  const kind = (h >> 3) % 3;
  if (kind === 0) { g.fillStyle = ac; g.beginPath(); g.arc(S * 0.5, S * 0.42, S * 0.24, 0, Math.PI * 2); g.fill(); g.fillStyle = bg; g.beginPath(); g.arc(S * 0.5, S * 0.42, S * 0.05, 0, Math.PI * 2); g.fill(); }
  else if (kind === 1) { for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? fg : ac; g.globalAlpha = 0.85; g.fillRect(0, S * (0.12 + i * 0.09), S, S * 0.045); } g.globalAlpha = 1; }
  else { g.strokeStyle = ac; g.lineWidth = 10 * k; g.strokeRect(S * 0.08, S * 0.08, S * 0.84, S * 0.84); }
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "alphabetic";
  const artist = displayArtist(rec.a).toUpperCase();
  fitText(g, artist, S * 0.84, 46 * k, `800 {s}px ${FONT}`);
  g.fillText(artist, S / 2, S * 0.8);
  g.fillStyle = fg; g.globalAlpha = 0.85;
  fitText(g, rec.b, S * 0.84, 30 * k, `italic 400 {s}px ${SERIF}`);
  g.fillText(rec.b, S / 2, S * 0.88);
  g.globalAlpha = 1;
  return c;
}
function fitText(g, text, max, size, font) {
  let s = size;
  g.font = font.replace("{s}", s);
  while (s > 10 && g.measureText(text).width > max) { s -= 2; g.font = font.replace("{s}", s); }
  return s;
}

// The pale yellow price sticker from the collection page, put on the sleeve's corner,
// and the navy "Odense" sticker for records in Odense.
export function stickers(g, S, rec) {
  const k = S / 512;
  if (rec.value) {
    const text = kr(rec.value);
    g.save();
    g.translate(S * 0.86, S * 0.085); g.rotate(-0.06);
    g.font = `800 ${26 * k}px ${FONT}`;
    const w = g.measureText(text).width + 22 * k, hh = 38 * k;
    g.shadowColor = "rgba(60,40,10,.35)"; g.shadowBlur = 4 * k; g.shadowOffsetY = 1.5 * k;
    g.fillStyle = "#FBEFB6"; g.beginPath(); g.roundRect(-w / 2, -hh / 2, w, hh, 5 * k); g.fill();
    g.shadowColor = "transparent";
    g.fillStyle = "#6A4A12"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 0, 1.5 * k);
    g.restore();
  }
  if (rec.place === "Odense") {
    const text = rec.lent ? "Lånt" : "Odense";
    g.save();
    g.translate(S * 0.12, S * 0.085); g.rotate(0.04);
    g.font = `700 ${20 * k}px ${FONT}`;
    const w = g.measureText(text).width + 20 * k, hh = 30 * k;
    g.fillStyle = rec.lent ? "#AE633D" : "#44597A"; g.beginPath(); g.roundRect(-w / 2, -hh / 2, w, hh, 15 * k); g.fill();
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 0, 1 * k);
    g.restore();
  }
}

// The back of a sleeve: title, the songs, the pressing and the value.
export function sleeveBack(rec, info, S = 1024) {
  const c = canvas(S, S), g = c.getContext("2d"), k = S / 1024;
  const base = rec.tint || [40, 34, 30];
  const dark = (base[0] + base[1] + base[2]) / 3 < 140;
  const bg = `rgb(${base.map((v) => Math.round(dark ? v * 0.55 + 18 : v * 0.35 + 150)).join(",")})`;
  const fg = dark ? "#F4ECE0" : "#211A15", mute = dark ? "rgba(244,236,224,.62)" : "rgba(33,26,21,.62)";
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  const rand = rng(hash(rec.key));
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},${rand() * 0.05})`; g.fillRect(rand() * S, rand() * S, 2, 2); }
  g.fillStyle = fg; g.textAlign = "left"; g.textBaseline = "alphabetic";
  const pad = 70 * k;
  const artist = displayArtist(rec.a).toUpperCase();
  fitText(g, artist, S - pad * 2, 54 * k, `800 {s}px ${FONT}`);
  g.fillText(artist, pad, pad + 40 * k);
  g.fillStyle = mute;
  fitText(g, rec.b, S - pad * 2, 40 * k, `italic 400 {s}px ${SERIF}`);
  g.fillText(rec.b, pad, pad + 92 * k);
  g.fillStyle = fg; g.globalAlpha = 0.25; g.fillRect(pad, pad + 120 * k, S - pad * 2, 2 * k); g.globalAlpha = 1;
  const tracks = (info && info.tracks) || [];
  let y = pad + 180 * k;
  if (!info) { g.fillStyle = mute; g.font = `500 ${30 * k}px ${FONT}`; g.fillText("Henter sanglisten …", pad, y); }
  else if (!tracks.length) { g.fillStyle = mute; g.font = `500 ${30 * k}px ${FONT}`; g.fillText("Ingen sangliste fundet.", pad, y); }
  else {
    const two = tracks.length > 9, colW = two ? (S - pad * 2) / 2 : S - pad * 2;
    const lines = Math.ceil(tracks.length / (two ? 2 : 1));
    const lh = Math.min(48 * k, (S - y - 210 * k) / Math.max(1, lines));
    const fs = Math.max(16 * k, Math.min(30 * k, lh * 0.66));
    const half = Math.ceil(tracks.length / 2);
    tracks.forEach((t, i) => {
      const col = two && i >= half ? 1 : 0, row = two && col ? i - half : i;
      const x = pad + col * colW, yy = y + row * lh;
      const side = rec.t === "Vinyl" ? (i < Math.ceil(tracks.length / 2) ? "A" : "B") + (i < Math.ceil(tracks.length / 2) ? i + 1 : i - Math.ceil(tracks.length / 2) + 1) : String(i + 1);
      g.fillStyle = mute; g.font = `700 ${fs * 0.8}px ${FONT}`; g.fillText(side, x, yy);
      g.fillStyle = fg; g.font = `500 ${fs}px ${FONT}`;
      let title = t.t, maxW = colW - 70 * k - (t.ms ? 80 * k : 0);
      while (g.measureText(title).width > maxW && title.length > 4) title = title.slice(0, -2);
      if (title !== t.t) title = title.replace(/\s+\S?$/, "") + "…";
      g.fillText(title, x + 58 * k, yy);
      if (t.ms) { g.fillStyle = mute; g.textAlign = "right"; g.font = `500 ${fs * 0.85}px ${FONT}`; g.fillText(Math.floor(t.ms / 60000) + ":" + String(Math.floor(t.ms / 1000) % 60).padStart(2, "0"), x + colW - 24 * k, yy); g.textAlign = "left"; }
    });
  }
  // the small print at the bottom: pressing, value, barcode
  const foot = S - pad;
  g.fillStyle = mute; g.font = `500 ${24 * k}px ${FONT}`;
  const bits = [rec.y, rec.fmt, rec.v].filter(Boolean).join(" · ");
  g.fillText(bits, pad, foot - 46 * k);
  if (rec.pressing) { let p = rec.pressing; while (g.measureText(p).width > S - pad * 2 - 220 * k && p.length > 6) p = p.slice(0, -2); g.fillText(p, pad, foot - 10 * k); }
  // barcode
  const bx = S - pad - 180 * k, by = foot - 90 * k;
  g.fillStyle = dark ? "#F4ECE0" : "#fff"; g.fillRect(bx - 10 * k, by - 10 * k, 200 * k, 110 * k);
  g.fillStyle = "#111";
  let x = bx;
  const br = rng(hash(rec.key + "bar"));
  while (x < bx + 178 * k) { const w = (1 + (br() * 3 | 0)) * 1.6 * k; if (br() < 0.55) g.fillRect(x, by, w, 72 * k); x += w + 1.6 * k; }
  g.font = `500 ${15 * k}px ${FONT}`; g.textAlign = "center"; g.fillText(String(hash(rec.key)).padStart(12, "5").slice(0, 12), bx + 90 * k, by + 92 * k);
  return c;
}

// The paper label in the middle of the record.
export function recordLabel(rec, S = 512) {
  const c = canvas(S, S), g = c.getContext("2d"), k = S / 512;
  const t = rec.tint || [174, 99, 61];
  const lum = (t[0] * 0.3 + t[1] * 0.59 + t[2] * 0.11);
  const col = lum > 200 || lum < 40 ? [174, 99, 61] : t;
  g.fillStyle = "#0b0b0c"; g.fillRect(0, 0, S, S);
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, `rgb(${col.map((v) => Math.min(255, v + 25)).join(",")})`);
  grad.addColorStop(1, `rgb(${col.map((v) => v * 0.8 | 0).join(",")})`);
  g.fillStyle = grad; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 3 * k; g.beginPath(); g.arc(S / 2, S / 2, S * 0.44, 0, Math.PI * 2); g.stroke();
  const fg = lum > 150 && lum <= 200 ? "#1d1d1f" : "#fff";
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  const artist = displayArtist(rec.a).toUpperCase();
  fitText(g, artist, S * 0.62, 40 * k, `800 {s}px ${FONT}`); g.fillText(artist, S / 2, S * 0.27);
  fitText(g, rec.b, S * 0.7, 32 * k, `italic 400 {s}px ${SERIF}`); g.fillText(rec.b, S / 2, S * 0.71);
  g.font = `700 ${20 * k}px ${FONT}`; g.globalAlpha = 0.8;
  g.fillText(rec.t === "Vinyl" ? "33⅓ RPM" : "COMPACT DISC", S * 0.25, S / 2);
  g.fillText(rec.t === "Vinyl" ? "SIDE A" : rec.y || "", S * 0.75, S / 2);
  g.font = `600 ${17 * k}px ${FONT}`; g.fillText(rec.y ? "℗ " + rec.y : "", S / 2, S * 0.83);
  g.globalAlpha = 1;
  return texture(c);
}

// The grooves of a record seen from above: fine rings, with a lighter gap between the songs.
export function grooves(trackCount = 5, S = 1024) {
  const c = canvas(S, S), g = c.getContext("2d");
  g.fillStyle = "#070708"; g.fillRect(0, 0, S, S);
  const R = S / 2, inner = R * 0.36, outer = R * 0.985;
  const rand = rng(trackCount * 31 + 7);
  const gaps = [];
  for (let i = 1; i < trackCount; i++) gaps.push(outer - (outer - inner * 1.05) * (i / trackCount) * (0.9 + rand() * 0.2));
  for (let r = inner; r < outer; r += 1.1) {
    const nearGap = gaps.some((gr) => Math.abs(gr - r) < 3.2);
    const v = nearGap ? 34 : 10 + rand() * 8;
    g.strokeStyle = `rgb(${v},${v},${v + 1})`; g.lineWidth = 0.9;
    g.beginPath(); g.arc(R, R, r, 0, Math.PI * 2); g.stroke();
  }
  g.strokeStyle = "#151517"; g.lineWidth = 6; g.beginPath(); g.arc(R, R, outer, 0, Math.PI * 2); g.stroke();
  return texture(c);
}

// A gig poster for one of the collection's big artists.
export function poster(name, count, years, style) {
  const W = 512, H = 720, c = canvas(W, H), g = c.getContext("2d");
  const pal = [["#E8D8B8", "#B23A2A", "#1D1D1F"], ["#1F2A3A", "#F2C14E", "#F4EDE1"], ["#F3E9D2", "#2F5D62", "#D96C3D"], ["#2B1E2F", "#F28C6A", "#F6E7D8"]][style % 4];
  g.fillStyle = pal[0]; g.fillRect(0, 0, W, H);
  const rand = rng(hash(name));
  if (style % 2) { for (let i = 0; i < 12; i++) { g.strokeStyle = pal[1]; g.globalAlpha = 0.9; g.lineWidth = 10; g.beginPath(); g.arc(W / 2, H * 0.38, 40 + i * 22, 0, Math.PI * 2); g.stroke(); } g.globalAlpha = 1; }
  else { g.fillStyle = pal[1]; g.beginPath(); g.moveTo(0, H * 0.62); g.lineTo(W, H * 0.4); g.lineTo(W, H * 0.7); g.lineTo(0, H * 0.84); g.fill(); g.beginPath(); g.arc(W * 0.7, H * 0.24, 80, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = pal[2]; g.textAlign = "center";
  g.font = `700 22px ${FONT}`; g.fillText("I BUTIKKEN NU", W / 2, 60);
  const words = displayArtist(name).toUpperCase().split(" ");
  let y = H * 0.66;
  const lines = [];
  let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; g.font = `900 70px ${FONT}`; if (g.measureText(t).width > W - 60 && cur) { lines.push(cur); cur = w; } else cur = t; }
  lines.push(cur);
  lines.forEach((l, i) => { fitText(g, l, W - 50, 84, `900 {s}px ${FONT}`); g.fillText(l, W / 2, y + i * 78); });
  g.font = `600 26px ${FONT}`;
  g.fillText(count + " plader · " + years, W / 2, H - 50);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},${rand() * 0.06})`; g.fillRect(rand() * W, rand() * H, 2, 2); }
  return texture(c);
}

// Soft round light for dust specks and glows.
export function softDot(S = 64, inner = "rgba(255,240,220,1)") {
  const c = canvas(S, S), g = c.getContext("2d");
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, inner); gr.addColorStop(0.4, inner.replace(/,1\)$/, ",.35)")); gr.addColorStop(1, "rgba(255,240,220,0)");
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return texture(c, { mips: false });
}

// The night street outside the window: dark sky, houses and blurry street lights.
export function nightStreet() {
  const W = 1024, H = 512, c = canvas(W, H), g = c.getContext("2d"), rand = rng(21);
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#070b17"); sky.addColorStop(0.55, "#16203a"); sky.addColorStop(1, "#1c1712");
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // houses across the street
  for (let x = -20; x < W;) {
    const w = 120 + rand() * 160, h = 150 + rand() * 140;
    g.fillStyle = `rgb(${12 + rand() * 10},${14 + rand() * 10},${24 + rand() * 12})`;
    g.fillRect(x, H * 0.62 - h, w, h + 40);
    for (let wx = x + 14; wx < x + w - 24; wx += 34) for (let wy = H * 0.62 - h + 18; wy < H * 0.58; wy += 42) {
      if (rand() < 0.38) { g.fillStyle = rand() < 0.7 ? "rgba(255,196,120,.75)" : "rgba(170,200,255,.55)"; g.fillRect(wx, wy, 18, 24); }
    }
    x += w + 6;
  }
  g.fillStyle = "#0c0b0b"; g.fillRect(0, H * 0.66, W, H);
  // street lights and passing cars, out of focus
  for (let i = 0; i < 26; i++) {
    const x = rand() * W, y = H * (0.45 + rand() * 0.3), r = 10 + rand() * 34;
    const col = rand() < 0.6 ? "255,190,110" : rand() < 0.5 ? "255,80,60" : "160,200,255";
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},.55)`); gr.addColorStop(0.6, `rgba(${col},.18)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // wet street reflections
  const wet = g.createLinearGradient(0, H * 0.66, 0, H);
  wet.addColorStop(0, "rgba(255,190,110,.12)"); wet.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = wet; g.fillRect(0, H * 0.66, W, H);
  return texture(c);
}

// A doormat: "Velkommen".
export function doormat() {
  const W = 512, H = 256, c = canvas(W, H), g = c.getContext("2d"), rand = rng(4);
  g.fillStyle = "#5b4330"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,220,170"},${rand() * 0.12})`; g.fillRect(rand() * W, rand() * H, 2, 3); }
  g.strokeStyle = "#2c1f15"; g.lineWidth = 10; g.strokeRect(14, 14, W - 28, H - 28);
  g.fillStyle = "#2c1f15"; g.font = `800 64px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("VELKOMMEN", W / 2, H / 2 + 4);
  return texture(c);
}

// Text on a small display (the till, the amplifier, the CD player).
export function display(lines, { w = 512, h = 128, color = "#7CFFB2", bg = "#06140d" } = {}) {
  const c = canvas(w, h), g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 10;
  g.textBaseline = "middle"; g.textAlign = "center";
  lines.forEach((l, i) => { g.font = l.font || `700 ${h * 0.42}px ui-monospace, Menlo, Consolas, monospace`; g.fillText(l.text, w / 2, h * (lines.length === 1 ? 0.52 : 0.3 + i * 0.42)); });
  return { canvas: c, texture: texture(c, { mips: false }) };
}

// The swirl in the doorway to the time journey.
export function portalSign() {
  const W = 1024, H = 256, c = canvas(W, H), g = c.getContext("2d");
  g.fillStyle = "#14100d"; g.beginPath(); g.roundRect(0, 0, W, H, 24); g.fill();
  g.strokeStyle = "#C8A25A"; g.lineWidth = 6; g.beginPath(); g.roundRect(10, 10, W - 20, H - 20, 18); g.stroke();
  g.fillStyle = "#F2E3C6"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `800 92px ${FONT}`; g.fillText("TIDSREJSEN", W / 2, H * 0.42);
  g.font = `500 36px ${FONT}`; g.fillStyle = "#C8A25A"; g.fillText("Flyv gennem årtierne  →", W / 2, H * 0.76);
  return texture(c);
}
