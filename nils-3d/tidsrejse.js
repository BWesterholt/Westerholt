// Tidsrejsen: the whole collection on a tunnel through time. Every year is a ring of records
// that faces you as you fly towards it, so the tunnel is thick where there are many records
// (the seventies) and thin where there are few. Decades get their own colour and a glowing ring.
// Near the camera the records get their real covers; further away they are their cover colour.
import * as THREE from "three";
import { coverTexture, guessTint, knownTint } from "./sleeve.js";
import * as T from "./textures.js";
import { clamp, lerp, spring, smoothstep, num, hash, rng } from "./util.js";

export const YEAR = 1.7; // metres of tunnel per year
const R = 2.05; // radius of the tunnel
const LOOK = 2.6; // how far ahead the year you are looking at begins (jumpTo stops 2.2 before a year)
const SIZE = 0.36; // size of a record in the tunnel
const CD_SIZE = SIZE * 0.48; // a CD is much smaller than an LP (12.5 cm against 31 cm), but still easy to see
const SPINE = 0.085; // the dark hinge on the left of a CD's jewel case, as part of its width

// The look of a CD's jewel case on a flat square: the cover pushed right of a dark plastic hinge,
// a thin light edge of clear plastic and a little sheen. (vQ: the square's uv, vCd: 1 for a CD.)
const JEWEL = `
  if (vCd > 0.5) {
    float hinge = 1.0 - step(${SPINE.toFixed(3)}, vQ.x);
    float ridges = 0.5 + 0.5 * sin(vQ.y * 160.0);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.05, 0.06) + 0.05 * ridges * vec3(1.0), hinge);
    float rim = min(min(vQ.x, 1.0 - vQ.x), min(vQ.y, 1.0 - vQ.y));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.8, 0.84), (1.0 - smoothstep(0.0, 0.022, rim)) * 0.7);
    diffuseColor.rgb += vec3(0.07) * smoothstep(0.55, 0.95, vQ.y - vQ.x * 0.6 + 0.35) * (1.0 - hinge);
  }`;
const START = 4.5; // where you start, in front of the first year

export function yearOf(r) {
  const m = String(r.y || "").match(/(19[0-9]{2}|20[0-3][0-9])/);
  return m ? +m[1] : 0;
}

// The colours of the decades: the background of the tunnel and the glow of the rings.
const DECADES = {
  1900: { bg: 0x16120d, glow: 0xe8cf9a, name: "Før 1950" },
  1950: { bg: 0x1a1710, glow: 0xf0d59a, name: "50'erne" },
  1960: { bg: 0x1d1026, glow: 0xff8f4a, name: "60'erne" },
  1970: { bg: 0x22130a, glow: 0xffb03b, name: "70'erne" },
  1980: { bg: 0x10082a, glow: 0xff3fa4, name: "80'erne" },
  1990: { bg: 0x081d20, glow: 0x3fe0c5, name: "90'erne" },
  2000: { bg: 0x0d1424, glow: 0x7fb2ff, name: "00'erne" },
  2010: { bg: 0x170c2a, glow: 0xc48bff, name: "10'erne" },
  2020: { bg: 0x0c1a12, glow: 0x9cff7a, name: "20'erne" },
};
export function decadeOf(y) { const d = Math.floor(y / 10) * 10; return d < 1950 ? 1900 : Math.min(2020, d); }
export function decadeInfo(y) { return DECADES[decadeOf(y)]; }

function label(lines, { w = 1024, h = 360, color = "#fff" } = {}) {
  const c = T.canvas(w, h), g = c.getContext("2d");
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = color;
  g.shadowColor = color; g.shadowBlur = 24;
  g.font = `800 ${Math.round(h * 0.46)}px ${T.FONT}`;
  g.fillText(lines[0], w / 2, h * 0.4);
  if (lines[1]) { g.shadowBlur = 10; g.globalAlpha = 0.8; g.font = `600 ${Math.round(h * 0.15)}px ${T.FONT}`; g.fillText(lines[1], w / 2, h * 0.8); }
  return T.texture(c, { mips: true });
}

export class TimeTunnel {
  constructor(records, { mobile = false } = {}) {
    this.mobile = mobile;
    this.scene = new THREE.Scene();
    this.bg = new THREE.Color(DECADES[1970].bg);
    this.scene.background = this.bg;
    this.scene.fog = new THREE.FogExp2(this.bg.getHex(), 0.085);
    this.glow = new THREE.Color(DECADES[1970].glow);

    const list = records.map((r) => ({ rec: r, year: yearOf(r) })).filter((x) => x.year);
    list.sort((a, b) => a.year - b.year || String(a.rec.a).localeCompare(String(b.rec.a), "da") || String(a.rec.b).localeCompare(String(b.rec.b), "da"));
    this.items = list;
    this.withoutYear = records.length - list.length;
    this.y0 = list.length ? list[0].year : 1970;
    this.y1 = list.length ? list[list.length - 1].year : 2020;
    this.count = {};
    for (const it of list) this.count[it.year] = (this.count[it.year] || 0) + 1;
    this.decadeCount = {};
    for (const it of list) { const d = decadeOf(it.year); this.decadeCount[d] = (this.decadeCount[d] || 0) + 1; }
    this.max = Math.max(1, ...Object.values(this.count));

    // Place the records: each year is one or more rings, each ring turned a little more.
    // records per ring: room for each one turned a little (its diagonal), with air between
    const perRing = Math.floor((Math.PI * 2 * (R - 0.05)) / (SIZE * 1.18));
    let k = 0;
    for (let y = this.y0; y <= this.y1; y++) {
      const n = this.count[y] || 0;
      if (!n) continue;
      const rings = Math.ceil(n / perRing);
      const rand = rng(y * 7919);
      for (let j = 0; j < n; j++, k++) {
        const it = list[k];
        const ring = Math.floor(j / perRing), inRing = Math.min(perRing, n - ring * perRing);
        const slot = j - ring * perRing;
        // a little disorder, but never so much that two records in a ring touch: the random turn
        // is limited to the free space between them
        const rr0 = R + (inRing < 8 ? -0.25 : 0);
        const step = (Math.PI * 2) / inRing, need = (SIZE * 1.12) / (rr0 - 0.05);
        const wiggle = Math.max(0, Math.min(0.6, (step - need) * 0.85));
        const a = (slot / inRing) * Math.PI * 2 + y * 0.61 + ring * 0.9 + (rand() - 0.5) * wiggle;
        const rr = rr0 + (rand() - 0.5) * 0.08;
        it.angle = a;
        it.pos = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, this.zOf(y) - (ring + 0.5) * (YEAR / Math.max(rings, 1.6)) + (rand() - 0.5) * 0.06);
        // facing you, tipped in towards the middle of the tunnel
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(a) * 0.42, -Math.cos(a) * 0.42, (rand() - 0.5) * (wiggle > 0.05 ? 0.14 : 0.04), "XYZ"));
        it.quat = q;
        it.index = k;
        it.size = it.rec.t === "Vinyl" ? SIZE : CD_SIZE;
      }
    }

    // All the records, as their cover colour.
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.setAttribute("aCd", new THREE.InstancedBufferAttribute(new Float32Array(list.map((it) => (it.rec.t === "Vinyl" ? 0 : 1))), 1));
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, fog: true });
    this.mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vQ;\nattribute float aCd;\nvarying float vCd;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvQ = uv; vCd = aCd;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vQ;\nvarying float vCd;").replace("#include <color_fragment>", `#include <color_fragment>
        float e = min(min(vQ.x, 1.0 - vQ.x), min(vQ.y, 1.0 - vQ.y));
        diffuseColor.rgb *= (0.72 + 0.28 * smoothstep(0.0, 0.09, e)) * (0.88 + 0.2 * vQ.y);
        diffuseColor.rgb += vec3(0.05) * (1.0 - smoothstep(0.0, 0.015, e));` + JEWEL);
    };
    this.mesh = new THREE.InstancedMesh(geo, this.mat, Math.max(1, list.length));
    this.mesh.frustumCulled = false;
    const m = new THREE.Matrix4(), s = new THREE.Vector3(), col = new THREE.Color();
    list.forEach((it, i) => {
      s.set(it.size, it.size, 1);
      m.compose(it.pos, it.quat, s);
      this.mesh.setMatrixAt(i, m);
      const t = it.rec.tint || knownTint(it.rec) || guessTint(it.rec);
      col.setRGB(t[0] / 255, t[1] / 255, t[2] / 255, THREE.SRGBColorSpace).multiplyScalar(0.85);
      this.mesh.setColorAt(i, col);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.scene.add(this.mesh);

    // A thin ring at every year, a glowing one at every decade, and the decade's name to fly through.
    this.rings = [];
    const ringGeo = new THREE.TorusGeometry(R + 0.42, 0.006, 4, 96);
    const bigGeo = new THREE.TorusGeometry(R + 0.5, 0.03, 8, 128);
    for (let y = this.y0; y <= this.y1 + 1; y++) {
      const isDec = y % 10 === 0 || y === this.y0;
      const info = decadeInfo(y);
      const c = new THREE.Color(info.glow);
      const mat = new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(isDec ? (y === this.y0 ? 1.6 : 2.4) : 0.45), fog: true, transparent: !isDec, opacity: isDec ? 1 : 0.6 });
      const ring = new THREE.Mesh(isDec ? bigGeo : ringGeo, mat);
      ring.position.z = this.zOf(y) + 0.05;
      this.scene.add(ring);
      this.rings.push({ y, ring, isDec });
    }
    this.labels = [];
    for (let d = decadeOf(this.y0) + 10; d <= decadeOf(this.y1); d += 10) {
      const info = DECADES[d];
      const z = this.zOf(Math.max(this.y0, d === 1900 ? this.y0 : d)) + 0.6;
      const n = this.decadeCount[d] || 0;
      const tex = label([info.name.toUpperCase(), num(n) + (n === 1 ? " plade" : " plader")], { color: "#" + new THREE.Color(info.glow).getHexString() });
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.84), mat);
      p.position.set(0, 0.25, z);
      this.scene.add(p);
      this.labels.push({ mesh: p, mat, z, d });
    }
    // the first sign and the last
    {
      const first = DECADES[decadeOf(this.y0)];
      const tex = label(["TIDSREJSEN", num(list.length) + " plader fra " + this.y0 + " til " + this.y1 + " · først " + first.name.toLowerCase()], { color: "#ffe3c4" });
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xb0a090, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.74), mat);
      p.position.set(0, 0.2, START - 4.2);
      this.scene.add(p);
      this.labels.push({ mesh: p, mat, z: p.position.z, d: 0 });
    }

    // Light dust in the tunnel that streams past.
    const N = mobile ? 1400 : 2600, len = this.length() + 12;
    const pos = new Float32Array(N * 3), rnd = rng(42);
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (R - 0.25);
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(a) * r; pos[i * 3 + 2] = START + 4 - rnd() * len;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.dustMat = new THREE.PointsMaterial({ size: mobile ? 0.035 : 0.028, map: T.softDot(), color: this.glow.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7, sizeAttenuation: true, fog: true });
    this.dust = new THREE.Points(pg, this.dustMat);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);

    // The records near you, with their real covers.
    this.heroes = [];
    const HEROES = mobile ? 56 : 96;
    const hg = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < HEROES; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true, side: THREE.FrontSide });
      // a CD's cover sits right of the jewel case's hinge
      mat.userData.cd = { value: 0 };
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uCd = mat.userData.cd;
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vQ;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvQ = uv;");
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying vec2 vQ;\nuniform float uCd;\n#define vCd uCd")
          .replace("#include <map_fragment>", `#ifdef USE_MAP
            vec2 cu = vMapUv;
            if (uCd > 0.5) cu.x = clamp((vMapUv.x - ${SPINE.toFixed(3)}) / ${(1 - SPINE).toFixed(3)}, 0.0, 1.0);
            diffuseColor *= texture2D(map, cu);
          #endif`)
          .replace("#include <color_fragment>", "#include <color_fragment>" + JEWEL);
      };
      const mesh = new THREE.Mesh(hg, mat);
      mesh.visible = false;
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      this.heroes.push({ mesh, mat, item: null, want: 0 });
    }
    this.heroOf = new Map();
    this.plain = new Map();
    this.hidden = new Set();

    // camera state
    this.z = START; this.v = 0; this.target = START;
    this.sway = new THREE.Vector2(); this.swayV = new THREE.Vector2();
    this.selected = null;
    this.focus = null;
    this.lastHeroZ = Infinity;
    this.speed = 0;
  }

  zOf(y) { return -(y - this.y0) * YEAR; }
  // The year you are looking at: the records at the edges of the screen are a couple of metres ahead.
  yearAt(z) { return clamp(Math.floor(this.y0 + (LOOK - z) / YEAR), this.y0, this.y1); }
  length() { return (this.y1 - this.y0 + 1) * YEAR; }
  minZ() { return this.zOf(this.y1 + 1) + 1.2; }
  maxZ() { return START; }
  jumpTo(y) { this.focus = null; this.target = clamp(this.zOf(y) + 2.2, this.minZ(), this.maxZ()); }
  nudge(dz) { this.focus = null; this.target = clamp(this.target + dz, this.minZ(), this.maxZ()); }
  reset() { this.z = START + 7; this.v = 0; this.target = START; this.focus = null; this.selected = null; this.lastHeroZ = Infinity; }
  itemOf(rec) { return this.items.find((it) => it.rec === rec) || null; }

  // Where the camera should be to look at one record up close.
  viewOf(it) {
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(it.quat);
    // a little below the record, so it sits above the card at the bottom of the screen
    const down = new THREE.Vector3(0, this.mobile ? -0.12 : -0.08, 0);
    // a CD is small, so the camera comes closer
    const near = it.size < SIZE ? 0.55 : 1;
    const pos = it.pos.clone().addScaledVector(n, (this.mobile ? 1.05 : 0.85) * near).add(down.multiplyScalar(near));
    return { pos, look: it.pos.clone().add(down) };
  }

  // Covers: a real one when it is known, otherwise a made-up sleeve (no lookups while flying past).
  coverFor(it) {
    const rec = it.rec;
    if (rec.cover) return coverTexture(rec, 256, { withStickers: false, priority: 0 });
    let t = this.plain.get(rec.key);
    if (!t) { t = T.texture(T.plainSleeve(rec, 256)); this.plain.set(rec.key, t); if (this.plain.size > this.heroes.length + 24) { const [k, v] = this.plain.entries().next().value; v.dispose(); this.plain.delete(k); } }
    return Promise.resolve(t);
  }

  updateHeroes(camZ, force) {
    if (!force && Math.abs(camZ - this.lastHeroZ) < 0.25) return;
    this.lastHeroZ = camZ;
    // the records just in front of the camera, nearest first
    // Records right beside you are outside the picture; the ones from about 1.5 m ahead are the big ones you see.
    const ahead = 11, behind = 0.4;
    const want = [];
    for (const it of this.items) { const d = camZ - it.pos.z; if (d > -behind && d < ahead) want.push(it); }
    if (this.selected && want.indexOf(this.selected) < 0) want.unshift(this.selected);
    const score = (it) => { if (it === this.selected) return -1; const d = camZ - it.pos.z; return d < 1.4 ? 20 + (1.4 - d) : d; };
    want.sort((a, b) => score(a) - score(b));
    const keep = new Set(want.slice(0, this.heroes.length));
    // let go of the ones that are behind now
    for (const h of this.heroes) if (h.item && !keep.has(h.item)) { this.release(h); }
    for (const it of keep) {
      if (this.heroOf.has(it)) continue;
      const h = this.heroes.find((x) => !x.item);
      if (!h) break;
      this.assign(h, it);
    }
  }
  assign(h, it) {
    h.item = it; this.heroOf.set(it, h);
    h.mat.userData.cd.value = it.rec.t === "Vinyl" ? 0 : 1;
    const t = it.rec.tint || knownTint(it.rec) || guessTint(it.rec);
    h.mat.map = null; h.mat.color.setRGB(t[0] / 255, t[1] / 255, t[2] / 255, THREE.SRGBColorSpace).multiplyScalar(0.85); h.mat.needsUpdate = true;
    h.mesh.matrix.compose(it.pos.clone().add(new THREE.Vector3(0, 0, 0.004).applyQuaternion(it.quat)), it.quat, new THREE.Vector3(it.size, it.size, 1));
    h.mesh.matrixWorldNeedsUpdate = true;
    h.mesh.visible = true;
    const ticket = (h.want = (h.want || 0) + 1);
    this.coverFor(it).then((tex) => {
      if (h.item !== it || h.want !== ticket) return;
      h.mat.map = tex; h.mat.color.setRGB(1, 1, 1); h.mat.needsUpdate = true;
      if (this.onChange) this.onChange();
    }).catch(() => {});
  }
  release(h) {
    this.heroOf.delete(h.item);
    h.item = null; h.mesh.visible = false; h.mat.map = null;
  }

  pick(ray) {
    const hs = ray.intersectObjects(this.heroes.filter((h) => h.item).map((h) => h.mesh), false);
    if (hs.length) { const h = this.heroes.find((x) => x.mesh === hs[0].object); return h && h.item; }
    const hit = ray.intersectObject(this.mesh, false)[0];
    if (hit && hit.instanceId !== undefined && hit.distance < 12) return this.items[hit.instanceId];
    return null;
  }

  recolor(rec) {
    const i = this.items.findIndex((it) => it.rec === rec);
    if (i < 0 || !rec.tint) return;
    const t = rec.tint;
    this.mesh.setColorAt(i, new THREE.Color().setRGB(t[0] / 255, t[1] / 255, t[2] / 255, THREE.SRGBColorSpace).multiplyScalar(0.85));
    this.mesh.instanceColor.needsUpdate = true;
  }

  // Called every frame while you are in the tunnel. Moves the camera and the colours.
  update(dt, camera, pointer, t, drive) {
    let busy = false;
    if (drive) {
      const prev = this.z;
      [this.z, this.v] = spring(this.z, this.v, this.target, 2.6, dt);
      this.speed = lerp(this.speed, Math.abs(this.z - prev) / Math.max(dt, 1e-3), 0.15);
      [this.sway.x, this.swayV.x] = spring(this.sway.x, this.swayV.x, pointer.x * 0.35, 3, dt);
      [this.sway.y, this.swayV.y] = spring(this.sway.y, this.swayV.y, pointer.y * 0.22, 3, dt);
      const drift = Math.sin(t * 0.21) * 0.06;
      camera.position.set(this.sway.x + drift, this.sway.y + Math.cos(t * 0.17) * 0.05, this.z);
      camera.up.set(0, 1, 0);
      camera.lookAt(this.sway.x * 0.4, this.sway.y * 0.4, this.z - 6);
      camera.rotateZ(clamp(this.v * 0.012, -0.08, 0.08) + Math.sin(t * 0.13) * 0.015);
      busy = Math.abs(this.z - this.target) > 0.002 || Math.abs(this.v) > 0.002 || this.speed > 0.01;
    } else {
      this.speed = lerp(this.speed, 0, 0.1);
    }
    // a wider view when you go fast, like a jump through time
    const base = camera.userData.baseFov || camera.fov;
    camera.userData.baseFov = base;
    const fov = base + clamp(this.speed * 1.4, 0, 16);
    if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

    const camZ = camera.position.z;
    const y = this.yearAt(camZ);
    // colours of the decade you are in, blended into the next one
    const fy = this.y0 + (LOOK - camZ) / YEAR;
    const d0 = decadeOf(Math.floor(fy)), into = clamp((fy - Math.floor(fy / 10) * 10 - 8) / 2, 0, 1);
    const d1 = decadeOf(Math.floor(fy) + 10 - (Math.floor(fy) % 10));
    const a = DECADES[d0], b = DECADES[d1] || a;
    const bg = new THREE.Color(a.bg).lerp(new THREE.Color(b.bg), into);
    this.bg.lerp(bg, 0.08);
    this.scene.fog.color.copy(this.bg);
    const glow = new THREE.Color(a.glow).lerp(new THREE.Color(b.glow), into);
    this.glow.lerp(glow, 0.08);
    this.dustMat.color.copy(this.glow).multiplyScalar(1.2 + (this.beat || 0) * 1.4);
    this.dust.rotation.z += dt * 0.02;
    // the decade names fade in as you get near and out as you fly through
    for (const l of this.labels) {
      const dist = camZ - l.z;
      l.mat.opacity = smoothstep(0.6, 2.6, dist) * (1 - smoothstep(9, 16, dist));
      l.mesh.visible = l.mat.opacity > 0.01;
    }
    this.updateHeroes(camZ);
    // a record you have picked out shows its own year
    this.year = this.selected ? this.selected.year : y;
    return busy;
  }

  dispose() {
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map && !this.isCover(m.map)) m.map.dispose(); m.dispose(); }); });
    this.plain.forEach((t) => t.dispose());
  }
  isCover() { return true; }
}
void hash;
