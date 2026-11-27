// The CD wall: every CD in the collection standing spine out on long shelves along the left wall,
// filed A–Å. Up close the spines get their titles, and a CD can be pulled out.
import * as THREE from "three";
import { CD } from "./sleeve.js";
import { canvas, texture, FONT, neon, darkWood } from "./textures.js";
import { ROOM } from "./room.js";
import { clamp, spring, displayArtist, hash } from "./util.js";
import { guessTint, knownTint } from "./sleeve.js";

const ROWS = 6, ROW_H = 0.25, Y0 = 0.4, Z_START = 0.95, FACE_X = ROOM.x0 + 0.24, GAP = 0.014;

export class CdWall {
  constructor(scene, cds, { mobile = false } = {}) {
    this.scene = scene; this.cds = cds; this.mobile = mobile;
    this.group = new THREE.Group(); scene.add(this.group);
    this.cursor = 0; this.active = false; this.heroes = new Map(); this.pulled = new Map();
    this.build();
  }
  build() {
    const cds = this.cds;
    // spread the CDs over the rows, with a little space at each new letter
    let total = 0;
    cds.forEach((r, i) => { total += CD.d + (i && r.letter !== cds[i - 1].letter ? GAP : 0); });
    const perRow = total / ROWS + 0.02;
    const LEN = perRow + 0.12;
    this.len = LEN;
    let row = 0, z = 0;
    this.slots = [];
    cds.forEach((r, i) => {
      if (i && r.letter !== cds[i - 1].letter) z += GAP;
      if (z + CD.d > perRow && row < ROWS - 1) { row++; z = 0; }
      this.slots.push({ rec: r, row, z: Z_START - z - CD.d / 2, y: Y0 + row * ROW_H, newLetter: !i || r.letter !== cds[i - 1].letter });
      z += CD.d;
    });
    this.length = perRow;
    // shelves and sides
    const wood = new THREE.MeshStandardMaterial({ map: darkWood(41, { hue: 22, lig: 18 }), roughness: 0.6 });
    const add = (g, x, y, zz) => { const m = new THREE.Mesh(g, wood); m.position.set(x, y, zz); m.castShadow = true; m.receiveShadow = true; this.group.add(m); return m; };
    const zMid = Z_START - LEN / 2 + 0.05;
    for (let k = 0; k <= ROWS; k++) add(new THREE.BoxGeometry(0.24, 0.025, LEN + 0.1), ROOM.x0 + 0.12, Y0 - 0.0125 + k * ROW_H, zMid);
    add(new THREE.BoxGeometry(0.24, ROWS * ROW_H + 0.6, 0.04), ROOM.x0 + 0.12, (Y0 + ROWS * ROW_H) / 2 + 0.08, Z_START + 0.07);
    add(new THREE.BoxGeometry(0.24, ROWS * ROW_H + 0.6, 0.04), ROOM.x0 + 0.12, (Y0 + ROWS * ROW_H) / 2 + 0.08, Z_START - LEN - 0.03);
    add(new THREE.BoxGeometry(0.03, ROWS * ROW_H + 0.6, LEN + 0.1), ROOM.x0 + 0.015, (Y0 + ROWS * ROW_H) / 2 + 0.08, zMid);
    // the CDs, all in one mesh, with made-up "writing" on each spine until you come close
    const geo = new THREE.BoxGeometry(CD.w, CD.h, CD.d);
    const face = new Float32Array(24); for (let i = 0; i < 24; i++) face[i] = Math.floor(i / 4) === 0 ? 1 : 0;
    geo.setAttribute("aFace", new THREE.BufferAttribute(face, 1));
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.05 });
    mat.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nattribute float aFace;\nvarying float vFace;\nvarying vec2 vUv2;\nvarying float vSeed;")
        .replace("#include <uv_vertex>", "#include <uv_vertex>\nvFace = aFace; vUv2 = uv; vSeed = float(gl_InstanceID);");
      s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vFace;\nvarying vec2 vUv2;\nvarying float vSeed;\nfloat h1(float n){ return fract(sin(n) * 43758.5453); }")
        .replace("#include <color_fragment>", `#include <color_fragment>
  if (vFace > 0.5) {
    float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
    vec3 ink = lum > 0.35 ? diffuseColor.rgb * 0.25 : mix(diffuseColor.rgb, vec3(1.0), 0.75);
    float v = vUv2.y, u = vUv2.x;
    float cell = floor(v * 46.0);
    float letter = step(0.32, h1(cell * 3.7 + vSeed * 1.31));
    float word = step(0.12, h1(floor(v * 7.0 + h1(vSeed) * 3.0) + vSeed * 0.77));
    float a1 = step(0.09, v) * step(v, 0.52 + h1(vSeed) * 0.12);
    float a2 = step(0.62, v) * step(v, 0.9);
    float band = step(0.32, u) * step(u, 0.68);
    float text = letter * word * band * max(a1, a2 * 0.7) * (1.0 - step(0.5, fract(v * 46.0)) * 0.6);
    diffuseColor.rgb = mix(diffuseColor.rgb, ink, text * 0.8);
    float hingeLine = step(v, 0.025) + step(0.975, v);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05), hingeLine * 0.8);
  } else {
    diffuseColor.rgb = mix(diffuseColor.rgb * 0.35, vec3(0.04), 0.5);
  }`);
    };
    const im = new THREE.InstancedMesh(geo, mat, this.slots.length);
    const col = new THREE.Color();
    this.slots.forEach((s, i) => {
      const t = knownTint(s.rec) || guessTint(s.rec);
      s.rec.tint = s.rec.tint || t;
      im.setColorAt(i, col.setRGB(t[0] / 255, t[1] / 255, t[2] / 255, THREE.SRGBColorSpace));
      s.out = 0; s.outV = 0; s.target = 0;
      this.place(im, i, 0);
    });
    im.castShadow = false; im.receiveShadow = true;
    im.computeBoundingSphere();
    this.mesh = im; this.group.add(im);
    // a little tab at the start of each letter
    this.slots.forEach((s, i) => {
      if (!s.newLetter) return;
      const c = canvas(64, 48), g = c.getContext("2d");
      g.fillStyle = "#ECE7DE"; g.beginPath(); g.roundRect(0, 0, 64, 48, 6); g.fill();
      g.fillStyle = "#1D1D1F"; g.font = `800 ${s.rec.letter.length > 1 ? 20 : 30}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s.rec.letter, 32, 26);
      const tab = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.03), new THREE.MeshStandardMaterial({ map: texture(c), roughness: 0.8 }));
      tab.rotation.y = Math.PI / 2; tab.position.set(FACE_X + 0.003, s.y - 0.0125 - 0.003, s.z + CD.d / 2 + 0.012);
      this.group.add(tab);
    });
    // a blue neon "CD" over the shelves, and a light of its own
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.34), new THREE.MeshBasicMaterial({ map: neon([{ text: "CD", font: `900 400px ${FONT}`, color: "#4fb8ff", width: 18, x: 1024, y: 330 }]), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0, 0, 0) }));
    sign.rotation.y = Math.PI / 2; sign.position.set(ROOM.x0 + 0.05, Y0 + ROWS * ROW_H + 0.42, zMid);
    this.group.add(sign);
    this.sign = sign;
    this.light = new THREE.PointLight(0xfff0dc, 0, 5.5, 2); this.light.position.set(ROOM.x0 + 1.7, 2.45, zMid); this.group.add(this.light);
    this.signLight = new THREE.PointLight(0x4fb8ff, 0, 3, 2); this.signLight.position.set(ROOM.x0 + 0.5, Y0 + ROWS * ROW_H + 0.35, zMid); this.group.add(this.signLight);
    // something to tap
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(0.5, ROWS * ROW_H + 0.1, LEN + 0.1), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.set(FACE_X - 0.1, Y0 + (ROWS * ROW_H) / 2 - 0.05, zMid);
    proxy.userData.cdwall = true;
    this.group.add(proxy);
    this.proxy = proxy;
    this.zMid = zMid;
  }
  place(im, i, out) {
    const s = this.slots[i];
    const m = new THREE.Matrix4();
    if (s.hidden) { m.makeScale(0, 0, 0); im.setMatrixAt(i, m); return; }
    const tilt = out > 0.001 ? -out * 2.2 : 0;
    m.makeRotationZ(tilt);
    m.setPosition(FACE_X - CD.w / 2 + out + 0.004, s.y + CD.h / 2 + out * 0.15, s.z);
    im.setMatrixAt(i, m);
  }
  // The index of the CD under the finger.
  pickIndex(ray) {
    const hit = ray.intersectObject(this.mesh, false)[0];
    if (hit && hit.instanceId !== undefined) return hit.instanceId;
    const p = ray.intersectObject(this.proxy, false)[0];
    if (!p) return null;
    // nearest CD to the point
    let best = 0, bd = 9;
    this.slots.forEach((s, i) => { const d = Math.abs(s.z - p.point.z) + Math.abs(s.y + CD.h / 2 - p.point.y) * 3; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  view(i, aspect) {
    const s = this.slots[i];
    const far = aspect < 0.8 ? 1.55 : 1;
    return { pos: new THREE.Vector3(FACE_X + 0.42 * far, s.y + 0.1 + 0.05 * far, s.z - 0.02), look: new THREE.Vector3(FACE_X, s.y + CD.h / 2, s.z) };
  }
  enter(i) { this.active = true; this.setCursor(i); }
  leave() {
    this.active = false;
    this.slots.forEach((s) => { s.target = 0; });
    for (const [i, h] of this.heroes) { this.group.remove(h); h.material.map.dispose(); h.material.dispose(); }
    this.heroes.clear();
  }
  setCursor(i) {
    i = clamp(i, 0, this.slots.length - 1);
    this.cursor = i;
    this.slots.forEach((s, k) => { s.target = k === i ? 0.055 : Math.abs(k - i) === 1 ? 0.008 : 0; });
    // readable spines around the cursor
    const keep = new Set();
    for (let k = i - 16; k <= i + 16; k++) if (k >= 0 && k < this.slots.length) keep.add(k);
    for (const [k, h] of this.heroes) if (!keep.has(k)) { this.group.remove(h); h.material.map.dispose(); h.material.dispose(); this.heroes.delete(k); }
    for (const k of keep) if (!this.heroes.has(k)) this.heroes.set(k, this.spine(k));
  }
  step(d) { const n = clamp(this.cursor + d, 0, this.slots.length - 1); if (n === this.cursor) return false; this.setCursor(n); return true; }
  current() { return this.slots[this.cursor]; }
  spine(k) {
    const s = this.slots[k], r = s.rec, t = r.tint || guessTint(r);
    const c = canvas(40, 480), g = c.getContext("2d");
    g.fillStyle = `rgb(${t.join(",")})`; g.fillRect(0, 0, 40, 480);
    const lum = t[0] * 0.3 + t[1] * 0.59 + t[2] * 0.11;
    g.fillStyle = lum > 140 ? "#161210" : "#f6efe4";
    g.save(); g.translate(20, 14); g.rotate(Math.PI / 2);
    g.textBaseline = "middle";
    let text = displayArtist(r.a).toUpperCase(), size = 22;
    g.font = `800 ${size}px ${FONT}`;
    const aw = g.measureText(text).width;
    g.fillText(text, 0, 0);
    g.font = `500 ${size - 2}px ${FONT}`;
    let title = r.b;
    while (g.measureText(title).width > 440 - aw - 24 && title.length > 3) title = title.slice(0, -2);
    if (title !== r.b) title += "…";
    g.globalAlpha = 0.85; g.fillText(title, aw + 16, 0);
    g.restore();
    g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, 0, 40, 8); g.fillRect(0, 472, 40, 8);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(CD.d * 0.98, CD.h * 0.995), new THREE.MeshStandardMaterial({ map: texture(c), roughness: 0.3 }));
    m.matrixAutoUpdate = false;
    m.userData.k = k;
    this.group.add(m);
    return m;
  }
  update(dt) {
    let moving = false;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s.out === s.target && !s.outV) continue;
      [s.out, s.outV] = spring(s.out, s.outV, s.target, 16, dt);
      if (Math.abs(s.out - s.target) < 0.00005 && Math.abs(s.outV) < 0.0005) { s.out = s.target; s.outV = 0; }
      else moving = true;
      this.place(this.mesh, i, s.out);
      this.mesh.instanceMatrix.needsUpdate = true;
    }
    const m = new THREE.Matrix4(), off = new THREE.Matrix4().makeTranslation(CD.w / 2 + 0.0006, 0, 0).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    for (const [k, h] of this.heroes) {
      this.mesh.getMatrixAt(k, m);
      h.matrix.multiplyMatrices(m, off);
      h.matrixWorldNeedsUpdate = true;
    }
    return moving;
  }
  hideSlot(i, hidden) {
    this.slots[i].hidden = hidden;
    this.place(this.mesh, i, this.slots[i].out);
    this.mesh.instanceMatrix.needsUpdate = true;
    const h = this.heroes.get(i); if (h) h.visible = !hidden;
  }
  worldOf(i) {
    const s = this.slots[i], tilt = s.out > 0.001 ? -s.out * 2.2 : 0;
    const pos = new THREE.Vector3(FACE_X - CD.w / 2 + s.out + 0.004, s.y + CD.h / 2 + s.out * 0.15, s.z);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, tilt));
    return { pos, quat: q };
  }
  locate(rec) { return this.slots.findIndex((s) => s.rec === rec); }
  recolor(rec) {
    const i = this.locate(rec);
    if (i < 0 || !rec.tint) return;
    this.mesh.setColorAt(i, new THREE.Color().setRGB(rec.tint[0] / 255, rec.tint[1] / 255, rec.tint[2] / 255, THREE.SRGBColorSpace));
    this.mesh.instanceColor.needsUpdate = true;
  }
}
