// Record sleeves, vinyl discs, CDs and their cases, and the covers on them.
import * as THREE from "three";
import { canvas, texture, plainSleeve, stickers, grooves, recordLabel } from "./textures.js";
import { BASE, findCover } from "./data.js";
import { hash, rng } from "./util.js";

export const LP = { w: 0.315, h: 0.315, d: 0.0036 };
export const CD = { w: 0.142, h: 0.125, d: 0.0104 };

// A box whose six sides know what they are: 0 = edge, 1 = front, 2 = back.
export function sleeveGeometry(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const face = new Float32Array(24);
  for (let i = 0; i < 24; i++) { const side = Math.floor(i / 4); face[i] = side === 4 ? 1 : side === 5 ? 2 : 0; }
  g.setAttribute("aFace", new THREE.BufferAttribute(face, 1));
  return g;
}

// The sleeve's material: the cover on the front, the back print on the back, card on the edges,
// and a faint ring where the record inside has worn the cover over the years.
export function sleeveMaterial(front, { edge = [0.5, 0.45, 0.4], back = null, wear = 0.5, rough = 0.62 } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: front, roughness: rough, metalness: 0 });
  m.userData.uniforms = { backMap: { value: back || front }, hasBack: { value: back ? 1 : 0 }, uEdge: { value: new THREE.Color().setRGB(edge[0], edge[1], edge[2], THREE.SRGBColorSpace) }, uWear: { value: wear } };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, m.userData.uniforms);
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nattribute float aFace;\nvarying float vFace;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvFace = aFace;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vFace;\nuniform sampler2D backMap;\nuniform float hasBack;\nuniform vec3 uEdge;\nuniform float uWear;")
      .replace("#include <map_fragment>", `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  if ( vFace > 1.5 ) {
    vec4 bc = texture2D( backMap, vMapUv );
    sampledDiffuseColor = mix( vec4( sampledDiffuseColor.rgb * 0.28 + uEdge * 0.3, 1.0 ), bc, hasBack );
  }
  diffuseColor *= sampledDiffuseColor;
  if ( vFace > 0.5 && vFace < 1.5 ) {
    vec2 q = vMapUv - 0.5;
    float rr = length( q );
    float ring = smoothstep( 0.395, 0.415, rr ) * ( 1.0 - smoothstep( 0.425, 0.45, rr ) );
    float ang = atan( q.y, q.x );
    float n = 0.5 + 0.5 * sin( ang * 7.0 + uWear * 40.0 ) * sin( ang * 3.0 - uWear * 17.0 );
    float edgeWear = smoothstep( 0.475, 0.5, max( abs( q.x ), abs( q.y ) ) );
    diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.93, 0.91, 0.87 ), ( ring * 0.16 * n + edgeWear * 0.3 ) * uWear );
  }
#endif
if ( vFace < 0.5 ) diffuseColor.rgb = uEdge;
`);
  };
  m.customProgramCacheKey = () => "sleeve";
  return m;
}
export function setEdge(m, rgb) { m.userData.uniforms.uEdge.value.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace); }
export function setBack(m, tex) { m.userData.uniforms.backMap.value = tex; m.userData.uniforms.hasBack.value = tex ? 1 : 0; }

// A pleasant sleeve colour before the cover is known, the same for a record every time.
const SLEEVE_COLORS = [[214, 202, 182], [40, 38, 36], [168, 62, 48], [52, 84, 104], [200, 160, 70], [92, 110, 82], [230, 224, 212], [120, 70, 60], [70, 60, 90], [190, 120, 80], [32, 48, 70], [150, 150, 140]];
export function guessTint(rec) { return SLEEVE_COLORS[rec.seed % SLEEVE_COLORS.length]; }

let tintStore = {};
try { tintStore = JSON.parse(localStorage.getItem("nils3d:farver")) || {}; } catch (e) {}
let tintTimer = null;
export function knownTint(rec) { const t = tintStore[rec.key]; return t ? [parseInt(t.slice(0, 2), 16), parseInt(t.slice(2, 4), 16), parseInt(t.slice(4, 6), 16)] : null; }
function saveTint(rec, rgb) {
  tintStore[rec.key] = rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
  clearTimeout(tintTimer);
  tintTimer = setTimeout(() => { try { localStorage.setItem("nils3d:farver", JSON.stringify(tintStore)); } catch (e) {} }, 1500);
}

// Covers from Apple Music and Deezer come in many sizes; ask for the size that is needed.
export function sized(u, size) {
  return String(u).replace(/\/\d+x\d+bb\./, "/" + size + "x" + size + "bb.").replace(/\/\d+x\d+-(\d)/, "/" + size + "x" + size + "-$1").replace(/\/front-500$/, "/front-" + (size > 250 ? 500 : 250));
}
let proxyFirst = false;
function loadImage(url) {
  const tryLoad = (u, cors) => new Promise((ok, fail) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error("img"));
    img.src = u;
  });
  const viaProxy = () => tryLoad(BASE + "/billede?" + new URLSearchParams({ u: url }), false);
  if (url.indexOf(location.origin) === 0 || url.charAt(0) === "/") return tryLoad(url, false);
  if (proxyFirst) return viaProxy();
  // Straight from the catalogue when it allows it, else through the page's own address.
  return tryLoad(url, true).catch(() => viaProxy().then((img) => { proxyFirst = true; return img; }));
}

// The average colour of a picture, for the sleeve's edges and the record tops in the crates.
function averageColor(c) {
  const s = canvas(8, 8), g = s.getContext("2d");
  g.drawImage(c, 0, 0, 8, 8);
  const d = g.getImageData(0, 0, 8, 8).data;
  let r = 0, gg = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  return [r / n | 0, gg / n | 0, b / n | 0];
}

// Cover textures, kept while they are in use and let go of when there are too many.
const covers = new Map();
let MAX = 90;
export function setCoverBudget(n) { MAX = n; }
export function coverTexture(rec, size = 512, { priority = 1, withStickers = true } = {}) {
  const key = rec.key + "@" + size + (withStickers ? "s" : "");
  const hit = covers.get(key);
  if (hit) { hit.last = performance.now(); return hit.promise; }
  const entry = { last: performance.now(), tex: null };
  entry.promise = (async () => {
    let url = rec.cover;
    if (url === null || url === undefined) url = await findCover(rec, priority);
    const c = canvas(size, size), g = c.getContext("2d");
    let ok = false;
    if (url) {
      try {
        const img = await loadImage(sized(url, size > 300 ? 600 : 300));
        g.drawImage(img, 0, 0, size, size);
        ok = true;
      } catch (e) {}
    }
    if (!ok) g.drawImage(plainSleeve(rec, size), 0, 0);
    let tint;
    try { tint = averageColor(c); } catch (e) { tint = guessTint(rec); }
    rec.tint = tint;
    rec.hasCover = ok;
    saveTint(rec, tint);
    if (withStickers) stickers(g, size, rec);
    const t = texture(c);
    entry.tex = t;
    return t;
  })();
  covers.set(key, entry);
  trim();
  return entry.promise;
}
function trim() {
  if (covers.size <= MAX) return;
  const list = [...covers.entries()].filter(([, e]) => e.tex && !e.keep).sort((a, b) => a[1].last - b[1].last);
  for (let i = 0; i < list.length && covers.size > MAX; i++) { list[i][1].tex.dispose(); covers.delete(list[i][0]); }
}
export function touchCover(rec, size, withStickers = true) { const e = covers.get(rec.key + "@" + size + (withStickers ? "s" : "")); if (e) e.last = performance.now(); }

// Only the colour: a tiny version of the cover, fetched quietly in the background, so the tops of
// the records in the crates get their real colours.
export async function tintOnly(rec) {
  if (!rec.cover) return null;
  try {
    const img = await loadImage(sized(rec.cover, 60));
    const c = canvas(8, 8);
    c.getContext("2d").drawImage(img, 0, 0, 8, 8);
    const t = averageColor(c);
    rec.tint = t;
    saveTint(rec, t);
    return t;
  } catch (e) { return null; }
}

// A blank, card-coloured texture used until the cover has arrived.
let blank;
export function blankTexture() {
  if (!blank) { const c = canvas(4, 4), g = c.getContext("2d"); g.fillStyle = "#cfc6b8"; g.fillRect(0, 0, 4, 4); blank = texture(c, { mips: false }); }
  return blank;
}

// The direction of the grooves for every point of the record, so the light runs round it in an arc
// like on a real record.
let grooveDir;
function grooveDirections() {
  if (grooveDir) return grooveDir;
  const S = 256, c = canvas(S, S), g = c.getContext("2d"), img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - S / 2 + 0.5, dy = y - S / 2 + 0.5, l = Math.hypot(dx, dy) || 1;
    const i = (y * S + x) * 4;
    img.data[i] = (-dy / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dx / l * 0.5 + 0.5) * 255; img.data[i + 2] = 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grooveDir = texture(c, { srgb: false, mips: false });
  return grooveDir;
}

// A vinyl record: black grooves with an arc of light, and the paper label in the middle.
export function vinylDisc(rec, trackCount) {
  const group = new THREE.Group();
  const R = 0.1505;
  const top = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: grooves(trackCount || 5), roughness: 0.32, metalness: 0.0, anisotropy: 1, anisotropyMap: grooveDirections(), clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const side = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.4 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.0018, 96, 1), [side, top, top]);
  // the cylinder's caps use a square texture laid on the circle
  group.add(disc);
  const label = new THREE.Mesh(new THREE.CircleGeometry(0.05, 64), new THREE.MeshStandardMaterial({ map: recordLabel(rec), roughness: 0.75 }));
  label.rotation.x = -Math.PI / 2; label.position.y = 0.00095;
  group.add(label);
  const label2 = label.clone(); label2.rotation.x = Math.PI / 2; label2.position.y = -0.00095; group.add(label2);
  group.userData.dispose = () => { top.map.dispose(); label.material.map.dispose(); top.dispose(); side.dispose(); label.material.dispose(); };
  return group;
}

// A CD: shiny rainbow underneath, printed on top.
export function cdDisc(rec, front) {
  const group = new THREE.Group();
  const shiny = new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, metalness: 1, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 820], envMapIntensity: 1.6 });
  const printed = new THREE.MeshStandardMaterial({ map: front || null, color: front ? 0xffffff : 0xd8d8d8, roughness: 0.5, metalness: 0.1 });
  const ring = new THREE.RingGeometry(0.0075, 0.06, 96, 1);
  const a = new THREE.Mesh(ring, printed); a.rotation.x = -Math.PI / 2; a.position.y = 0.0006; group.add(a);
  const b = new THREE.Mesh(ring, shiny); b.rotation.x = Math.PI / 2; b.position.y = -0.0006; group.add(b);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.0012, 96, 1, true), shiny); group.add(rim);
  // the clear ring in the middle
  const hub = new THREE.Mesh(new THREE.RingGeometry(0.0075, 0.017, 48), new THREE.MeshStandardMaterial({ color: 0xcfd6dc, transparent: true, opacity: 0.55, roughness: 0.1, side: THREE.DoubleSide }));
  hub.rotation.x = -Math.PI / 2; hub.position.y = 0.0007; group.add(hub);
  group.userData.dispose = () => { shiny.dispose(); printed.dispose(); };
  return group;
}

// A CD case: the booklet behind clear plastic and a lid that opens on its hinge.
export function jewelCase(rec, front) {
  const group = new THREE.Group();
  const tint = rec.tint || guessTint(rec);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(CD.w, CD.h, CD.d * 0.55), new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(tint[0] / 600 + 0.04, tint[1] / 600 + 0.04, tint[2] / 600 + 0.04, THREE.SRGBColorSpace), roughness: 0.4 }));
  tray.position.z = -CD.d * 0.22;
  group.add(tray);
  const lid = new THREE.Group();
  lid.position.set(-CD.w / 2, 0, CD.d * 0.5);
  const booklet = new THREE.Mesh(sleeveGeometry(CD.w * 0.98, CD.h * 0.98, 0.0012), sleeveMaterial(front, { edge: [0.9, 0.9, 0.9], wear: 0, rough: 0.45 }));
  booklet.position.set(CD.w / 2, 0, -0.0012);
  lid.add(booklet);
  const plastic = new THREE.Mesh(new THREE.BoxGeometry(CD.w, CD.h, 0.0016), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, roughness: 0.04, metalness: 0, envMapIntensity: 2.2 }));
  plastic.position.set(CD.w / 2, 0, 0);
  lid.add(plastic);
  group.add(lid);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.004, CD.h, CD.d), new THREE.MeshStandardMaterial({ color: 0x222224, transparent: true, opacity: 0.75, roughness: 0.15 }));
  spine.position.x = -CD.w / 2 + 0.002;
  group.add(spine);
  group.userData.lid = lid;
  group.userData.booklet = booklet;
  return group;
}

export { hash, rng };
