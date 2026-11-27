// The vinyl crates: every LP in the collection stands in a wooden crate on the two long tables,
// filed A–Å with grey cardboard dividers. In a crate you dig: the records in front tip forward,
// one at a time, and the cover of the next one shows.
import * as THREE from "three";
import { LP, sleeveGeometry, sleeveMaterial, setEdge, guessTint, knownTint, coverTexture, blankTexture } from "./sleeve.js";
import { pine, divider, crateCard, darkWood, canvas, texture, FONT } from "./textures.js";
import { spring, clamp, rng, hash } from "./util.js";

const CAP = 56;
export const IN_W = 0.345, IN_D = 0.44, WALL = 0.014, BACK_H = 0.25, FRONT_H = 0.13, FLOOR = 0.02;
const OUT_W = IN_W + 2 * WALL, OUT_D = IN_D + 2 * WALL;
const PITCH = 0.41;
export const TABLE_H = 0.8;
const DIV_W = 0.33, DIV_H = 0.37;
// A little air between the records, so the small random turn of each one never makes two of them
// go through each other.
const GAP = 0.0011;
const FLIP = 0.016; // seconds per record when the pile catches up with a jump
const ROW_X = 1.5, ROW_MID_Z = 0.55;

// Which records go in which crate: whole letters where they fit, big letters split evenly.
export function planCrates(vinyl) {
  const groups = [];
  let cur = null;
  for (const r of vinyl) { if (!cur || cur.letter !== r.letter) { cur = { letter: r.letter, recs: [] }; groups.push(cur); } cur.recs.push(r); }
  const crates = [];
  let crate = null;
  const count = () => (crate ? crate.recs : 0);
  const start = () => { crate = { items: [], letters: [], recs: 0 }; crates.push(crate); };
  for (const g of groups) {
    const parts = Math.ceil(g.recs.length / CAP), size = Math.ceil(g.recs.length / parts);
    for (let p = 0; p < parts; p++) {
      const recs = g.recs.slice(p * size, (p + 1) * size);
      if (!crate || count() + recs.length > CAP || p > 0) start();
      crate.items.push({ div: g.letter, cont: p > 0 });
      if (crate.letters.indexOf(g.letter) < 0) crate.letters.push(g.letter);
      for (const r of recs) crate.items.push({ rec: r });
      crate.recs += recs.length;
    }
  }
  crates.forEach((c, k) => {
    c.k = k;
    const a = c.letters[0], b = c.letters[c.letters.length - 1];
    c.label = a === "Div." ? "Div." : a === b ? a : a + "–" + b;
    c.sub = a === "Div." ? "Opsamlinger" : c.recs + " plader";
    for (const it of c.items) {
      it.t = it.rec ? LP.d * (1 + 0.6 * ((it.rec.n || 1) - 1)) : 0.0016;
      const seed = hash((it.rec ? it.rec.key : it.div) + c.k);
      const r = rng(seed);
      // only a slight sideways shift and turn; a different tilt per record made neighbours cross
      it.jx = (r() - 0.5) * 0.008; it.jy = (r() - 0.5) * 0.006; it.jt = 0;
    }
  });
  return crates;
}

// Where each record stands with the cursor at c: the ones before it tipped forward against the
// front of the crate, the rest leaning back. Returns [{ s, th }] in the crate's own frame
// (s along the crate, + towards the front; th the tilt, + forward).
function solve(crate, c) {
  const items = crate.items, n = items.length, out = new Array(n);
  const thb = -0.14, cb = Math.cos(thb);
  // the last record leans on the top of the back wall, so it must stand far enough from it
  let s = -IN_D / 2 + BACK_H * Math.tan(-thb) + 0.004;
  for (let j = n - 1; j >= c; j--) { const t = items[j].t + GAP; s += t / 2 / cb; out[j] = { s, th: thb }; s += t / 2 / cb; }
  // the record you are looking at stands a few millimetres free of the pile
  if (c < n) out[c].s += 0.003;
  let sumF = 0;
  for (let j = 0; j < c; j++) sumF += items[j].t + GAP;
  const avail = IN_D / 2 - s - 0.016;
  let th = 0.72;
  while (th > 0.1 && FRONT_H * Math.tan(th) + sumF / Math.cos(th) + 0.01 > avail) th -= 0.02;
  let sf = IN_D / 2 - Math.max(0, Math.min(FRONT_H * Math.tan(th), avail - sumF / Math.cos(th)));
  // The ones tipped forward: the front one rests on the front wall, each one behind leans on the
  // one in front of it, a little more upright, so they fan out without crossing.
  for (let j = 0; j < c; j++) { const t = items[j].t + GAP; sf -= t / 2 / Math.cos(th); out[j] = { s: sf, th: th - 0.006 * Math.min(8, j) }; sf -= t / 2 / Math.cos(th); }
  return out;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _o = new THREE.Matrix4();
// The matrix of an item standing at s with tilt th in a crate.
function itemMatrix(crateObj, it, s, th, h, out) {
  _e.set(th + it.jt, it.jy, 0, "YXZ");
  _q.setFromEuler(_e);
  const up = new THREE.Vector3(0, h / 2, 0).applyQuaternion(_q);
  _p.set(it.jx, FLOOR + up.y, s + up.z);
  _p.x += up.x;
  _o.compose(_p, _q, _s);
  return out.multiplyMatrices(crateObj.matrixWorld, _o);
}

export class Crates {
  constructor(scene, crates, { coverSize = 512, mobile = false } = {}) {
    this.scene = scene;
    this.crates = crates;
    this.coverSize = coverSize;
    this.mobile = mobile;
    this.waiting = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.active = null;
    this.proxies = [];
    this.build();
  }

  build() {
    const crates = this.crates, half = Math.ceil(crates.length / 2);
    const rows = [crates.slice(0, half), crates.slice(half)];
    this.rows = rows;
    const pineMat = new THREE.MeshStandardMaterial({ map: pine("WESTERHOLT PLADER"), roughness: 0.82 });
    const pineMat2 = new THREE.MeshStandardMaterial({ map: pine(""), roughness: 0.85 });
    const parts = [
      { g: new THREE.BoxGeometry(OUT_W, FLOOR, OUT_D), p: [0, FLOOR / 2, 0], m: pineMat2 },
      { g: new THREE.BoxGeometry(WALL, BACK_H, OUT_D), p: [-OUT_W / 2 + WALL / 2, BACK_H / 2, 0], m: pineMat },
      { g: new THREE.BoxGeometry(WALL, BACK_H, OUT_D), p: [OUT_W / 2 - WALL / 2, BACK_H / 2, 0], m: pineMat },
      { g: new THREE.BoxGeometry(OUT_W, BACK_H, WALL), p: [0, BACK_H / 2, -OUT_D / 2 + WALL / 2], m: pineMat2 },
      { g: new THREE.BoxGeometry(OUT_W, FRONT_H, WALL), p: [0, FRONT_H / 2, OUT_D / 2 - WALL / 2], m: pineMat2 },
    ];
    // the side walls slope down towards the front, like real record crates
    {
      const g = parts[1].g, pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) { if (pos.getY(i) > 0 && pos.getZ(i) > 0) pos.setY(i, pos.getY(i) - (BACK_H - FRONT_H) * 0.85); }
      pos.needsUpdate = true; g.computeVertexNormals();
      parts[2].g = g;
    }
    this.crateObjs = [];
    rows.forEach((row, side) => {
      const n = row.length, z0 = ROW_MID_Z + ((n - 1) * PITCH) / 2;
      row.forEach((c, k) => {
        const o = new THREE.Object3D();
        o.position.set(side ? ROW_X : -ROW_X, TABLE_H, z0 - k * PITCH);
        o.rotation.y = side ? -Math.PI / 2 : Math.PI / 2;
        this.group.add(o);
        o.updateMatrixWorld(true);
        c.obj = o; c.side = side; c.row = k;
        this.crateObjs.push(o);
      });
    });
    for (const part of parts) {
      const im = new THREE.InstancedMesh(part.g, part.m, crates.length);
      crates.forEach((c, k) => {
        _o.makeTranslation(part.p[0], part.p[1], part.p[2]);
        im.setMatrixAt(k, _m.multiplyMatrices(c.obj.matrixWorld, _o));
      });
      im.castShadow = true; im.receiveShadow = true;
      im.computeBoundingSphere();
      this.group.add(im);
    }
    // the card on the front of each crate
    crates.forEach((c) => {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.065), new THREE.MeshStandardMaterial({ map: crateCard(c.label, c.sub), roughness: 0.8 }));
      card.position.set(0, FRONT_H * 0.52, OUT_D / 2 + 0.0015);
      c.obj.add(card);
      // an invisible box used to find the crate under the finger
      const proxy = new THREE.Mesh(new THREE.BoxGeometry(OUT_W + 0.03, 0.5, OUT_D + 0.12), new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.set(0, 0.22, 0.04);
      proxy.userData.crate = c;
      c.obj.add(proxy);
      c.obj.updateMatrixWorld(true);
      this.proxies.push(proxy);
    });
    // all the records, as one mesh with a copy per record
    const all = [];
    crates.forEach((c) => c.items.forEach((it, j) => { if (it.rec) { it.idx = all.length; all.push(it); } }));
    this.allItems = all;
    const im = new THREE.InstancedMesh(sleeveGeometry(LP.w, LP.h, LP.d), new THREE.MeshStandardMaterial({ roughness: 0.66 }), all.length);
    im.castShadow = true; im.receiveShadow = true;
    const col = new THREE.Color();
    all.forEach((it, k) => {
      const t = knownTint(it.rec) || guessTint(it.rec);
      it.rec.tint = it.rec.tint || t;
      im.setColorAt(k, col.setRGB(t[0] / 255, t[1] / 255, t[2] / 255, THREE.SRGBColorSpace));
    });
    this.sleeves = im;
    this.group.add(im);
    // dividers: one material per letter
    this.divMats = {};
    let dk = 0;
    crates.forEach((c) => c.items.forEach((it) => {
      if (it.rec) return;
      const tex = divider(it.div, dk++ % 5);
      const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.92 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(DIV_W, DIV_H), mat);
      mesh.castShadow = true;
      mesh.matrixAutoUpdate = false;
      it.mesh = mesh;
      this.group.add(mesh);
    }));
    // where each crate is "being browsed" when you walk in: some untouched, some halfway
    crates.forEach((c) => {
      const r = rng(hash("c" + c.k));
      const recIdx = c.items.map((it, j) => (it.rec ? j : -1)).filter((j) => j >= 0);
      c.cursor = r() < 0.4 ? recIdx[0] : recIdx[Math.floor(recIdx.length * (0.15 + r() * 0.55))];
      c.pose = solve(c, c.cursor);
      this.writeStatic(c);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    // the record showing in each crate gets its cover
    this.fronts = new Map();
    crates.forEach((c) => this.makeFront(c));
  }

  writeStatic(c) {
    c.items.forEach((it, j) => {
      const p = c.pose[j];
      if (it.rec) { if (it.out) _m.makeScale(0, 0, 0); else itemMatrix(c.obj, it, p.s, p.th, LP.h, _m); this.sleeves.setMatrixAt(it.idx, _m); }
      else { itemMatrix(c.obj, it, p.s, p.th, DIV_H, it.mesh.matrix); it.mesh.matrixWorldNeedsUpdate = true; }
    });
  }

  // A record taken out of its crate (in your hands or on the turntable) leaves its place empty.
  setOut(it, out) {
    it.out = out;
    if (it.hero) it.hero.visible = !out;
    else if (out) { this.hide(it); this.sleeves.instanceMatrix.needsUpdate = true; }
    else { const c = this.crates.find((x) => x.items.indexOf(it) >= 0); if (c && c !== this.active) { this.writeStatic(c); this.sleeves.instanceMatrix.needsUpdate = true; } }
  }
  hide(it) { _m.makeScale(0, 0, 0); this.sleeves.setMatrixAt(it.idx, _m); }

  // A record with its cover, standing where the plain copy was.
  hero(it, { priority = 1, size = this.coverSize } = {}) {
    const rec = it.rec;
    const mat = sleeveMaterial(blankTexture(), { edge: (rec.tint || guessTint(rec)).map((v) => v / 255), wear: 0.35 + (rec.seed % 100) / 160 });
    const mesh = new THREE.Mesh(this.heroGeo || (this.heroGeo = sleeveGeometry(LP.w, LP.h, LP.d)), mat);
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.item = it;
    mesh.visible = !it.out;
    this.group.add(mesh);
    it.hero = mesh;
    coverTexture(rec, size, { priority }).then((tex) => {
      if (it.hero !== mesh) return;
      mat.map = tex; mat.needsUpdate = true;
      setEdge(mat, rec.tint);
      this.tintChanged(it);
      this.onChange && this.onChange();
    });
    return mesh;
  }
  dropHero(it) {
    if (!it.hero) return;
    this.group.remove(it.hero);
    it.hero.material.dispose();
    it.hero = null;
  }
  tintChanged(it) {
    if (it.idx === undefined || !it.rec.tint) return;
    const t = it.rec.tint;
    this.sleeves.setColorAt(it.idx, new THREE.Color().setRGB(t[0] / 255, t[1] / 255, t[2] / 255, THREE.SRGBColorSpace));
    this.sleeves.instanceColor.needsUpdate = true;
  }
  // After a background colour lookup: give the plain copy its colour.
  recolor(rec) {
    const it = this.allItems.find((x) => x.rec === rec);
    if (it) this.tintChanged(it);
  }

  makeFront(c) {
    const old = this.fronts.get(c);
    if (old) { if (old.hero && this.active !== c) { this.dropHero(old); this.writeStatic(c); this.sleeves.instanceMatrix.needsUpdate = true; } this.fronts.delete(c); }
    let j = c.cursor;
    while (j < c.items.length && !c.items[j].rec) j++;
    if (j >= c.items.length) return;
    const it = c.items[j];
    const mesh = this.hero(it, { priority: 0.5, size: Math.min(256, this.coverSize) });
    const p = c.pose[j];
    itemMatrix(c.obj, it, p.s, p.th, LP.h, mesh.matrix);
    mesh.matrixWorldNeedsUpdate = true;
    this.hide(it);
    this.sleeves.instanceMatrix.needsUpdate = true;
    this.fronts.set(c, it);
  }

  // Where the camera goes to dig in a crate.
  view(c, aspect) {
    const far = aspect < 0.8 ? 1.5 : aspect < 1.2 ? 1.2 : 1;
    const pos = c.obj.localToWorld(new THREE.Vector3(0, 0.46 + 0.17 * far, 0.36 + 0.17 * far));
    const look = c.obj.localToWorld(new THREE.Vector3(0, 0.16, -0.03));
    return { pos, look };
  }

  // Start digging in a crate, at a given item.
  enter(c, at) {
    if (this.active === c) { if (at !== undefined) this.setCursor(at); return; }
    if (this.active) this.leave();
    this.active = c;
    const front = this.fronts.get(c);
    c.state = c.items.map((it, j) => ({ s: c.pose[j].s, th: c.pose[j].th, vs: 0, vt: 0 }));
    c.items.forEach((it) => {
      if (!it.rec) return;
      if (it !== front) { this.hero(it, { priority: 0 }); }
      else if (it.hero) this.upgrade(it);
      this.hide(it);
    });
    this.sleeves.instanceMatrix.needsUpdate = true;
    c.shown = c.cursor; c.target = c.pose; c.stepT = 0;
    this.setCursor(at === undefined ? c.cursor : at);
  }
  // The front record was drawn small; dig mode wants it sharp.
  upgrade(it) {
    const mesh = it.hero;
    coverTexture(it.rec, this.coverSize, { priority: 3 }).then((tex) => { if (it.hero === mesh) { mesh.material.map = tex; mesh.material.needsUpdate = true; this.onChange && this.onChange(); } });
  }
  leave() {
    const c = this.active;
    if (!c) return;
    this.active = null;
    c.pose = solve(c, c.cursor);
    c.items.forEach((it) => { if (it.rec) this.dropHero(it); });
    this.fronts.delete(c);
    this.writeStatic(c);
    this.makeFront(c);
    this.sleeves.instanceMatrix.needsUpdate = true;
  }

  setCursor(j) {
    const c = this.active;
    if (!c) return;
    j = clamp(Math.round(j), 0, c.items.length);
    c.cursor = j;
    // the pile itself follows one record per frame (see update), so a long jump flips through
    // the records instead of sweeping them through each other
    if (c.shown === undefined || !c.target) { c.shown = j; c.target = solve(c, j); }
    // covers for the records around the cursor, nearest first
    for (let d = -3; d <= 10; d++) {
      const it = c.items[j + d];
      if (it && it.rec && it.hero) {
        const size = Math.abs(d) <= 1 ? this.coverSize : Math.min(this.coverSize, 384);
        const mesh = it.hero;
        coverTexture(it.rec, size, { priority: 10 - Math.abs(d) }).then((tex) => {
          if (it.hero !== mesh) return;
          if (mesh.material.map !== tex) { mesh.material.map = tex; mesh.material.needsUpdate = true; setEdge(mesh.material, it.rec.tint); this.tintChanged(it); this.onChange && this.onChange(); }
        });
      }
    }
  }
  // The record (or divider) at the cursor.
  current() { const c = this.active; return c && c.items[c.cursor]; }
  // The next record in the whole shop after this crate's last one, and before its first one.
  neighbour(dir) {
    const c = this.active;
    if (!c) return null;
    const k = c.k + dir;
    return this.crates[k] || null;
  }
  // Step to the next or previous record, skipping over dividers. Returns false at the end of the crate.
  step(dir) {
    const c = this.active;
    if (!c) return false;
    let j = c.cursor + dir;
    while (j >= 0 && j < c.items.length && !c.items[j].rec) j += dir;
    if (j < 0 || j >= c.items.length) return false;
    this.setCursor(j);
    return true;
  }
  firstRecord(c) { return c.items.findIndex((it) => it.rec); }
  lastRecord(c) { for (let j = c.items.length - 1; j >= 0; j--) if (c.items[j].rec) return j; return 0; }

  // Moves the records towards where they should stand. Returns true while anything is moving.
  update(dt) {
    const c = this.active;
    if (!c || !c.target) return false;
    let moving = false;
    const n = c.items.length;
    if (c.shown !== c.cursor) {
      // at most one record per frame: two at once let them pass through each other
      c.stepT += dt;
      if (c.stepT >= FLIP) { c.stepT = Math.min(c.stepT - FLIP, FLIP); c.shown += Math.sign(c.cursor - c.shown); c.target = solve(c, c.shown); }
      moving = true;
    } else c.stepT = 0;
    for (let j = 0; j < n; j++) {
      const st = c.state[j], tg = c.target[j], it = c.items[j];
      // records near the cursor move first, the rest a moment later, like a wave
      const omega = 20 - Math.min(3, Math.abs(j - c.shown) * 0.3);
      [st.th, st.vt] = spring(st.th, st.vt, tg.th, omega, dt);
      [st.s, st.vs] = spring(st.s, st.vs, tg.s, omega, dt);
      if (Math.abs(st.th - tg.th) > 0.0005 || Math.abs(st.s - tg.s) > 0.00005 || Math.abs(st.vt) > 0.001) moving = true;
      let lift = 0;
      if (j === c.cursor && c.shown === c.cursor && this.lift) lift = this.lift;
      const target = it.rec ? it.hero && it.hero.matrix : it.mesh.matrix;
      if (!target) continue;
      itemMatrix(c.obj, it, st.s + lift * 0.1, st.th, it.rec ? LP.h : DIV_H, target);
      if (lift && j === c.cursor) { _o.makeTranslation(0, lift, 0); target.premultiply(_o); }
      (it.rec ? it.hero : it.mesh).matrixWorldNeedsUpdate = true;
    }
    if (this.waiting.length && c.shown === c.cursor) {
      const st = c.state[c.cursor], tg = c.target[c.cursor];
      if (!st || (Math.abs(st.th - tg.th) < 0.01 && Math.abs(st.s - tg.s) < 0.001)) { const w = this.waiting; this.waiting = []; w.forEach((f) => f()); }
    }
    return moving;
  }
  // Resolves when the pile has caught up with the cursor (or at once when no crate is open).
  settle() {
    const c = this.active;
    if (!c || c.shown === c.cursor) return Promise.resolve();
    return new Promise((res) => { this.waiting.push(res); setTimeout(res, 2500); });
  }

  // The world position and rotation of an item as it stands now.
  worldOf(it) {
    const m = it.hero ? it.hero.matrix : it.mesh ? it.mesh.matrix : null;
    const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), sc = new THREE.Vector3();
    if (m) m.decompose(pos, quat, sc);
    return { pos, quat };
  }

  // Which crate is under the finger (walking around), or which record (digging).
  pickCrate(ray) { const hit = ray.intersectObjects(this.proxies, false)[0]; return hit ? hit.object.userData.crate : null; }
  pickItem(ray) {
    const c = this.active;
    if (!c) return null;
    const meshes = c.items.map((it) => (it.rec ? it.hero : it.mesh)).filter(Boolean);
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    const it = hit.object.userData.item || c.items.find((x) => x.mesh === hit.object);
    return it ? c.items.indexOf(it) : null;
  }
  // Where a record is: its crate and place in it.
  locate(rec) {
    for (const c of this.crates) { const j = c.items.findIndex((it) => it.rec === rec); if (j >= 0) return { c, j }; }
    return null;
  }
  // The crate holding the first record of a letter.
  letterCrate(letter) {
    for (const c of this.crates) { const j = c.items.findIndex((it) => it.div === letter && !it.cont); if (j >= 0) return { c, j: Math.min(c.items.length - 1, j + 1) }; }
    return null;
  }
  get letters() { const out = []; this.crates.forEach((c) => c.letters.forEach((l) => { if (out.indexOf(l) < 0) out.push(l); })); return out; }
  // The tables the crates stand on, as boxes (for the room to build and for walking around them).
  tables() {
    return this.rows.map((row, side) => {
      const n = row.length, len = n * PITCH + 0.34;
      return { x: side ? ROW_X : -ROW_X, z: ROW_MID_Z, w: 0.66, d: len, side, first: row[0], last: row[row.length - 1] };
    });
  }
}
