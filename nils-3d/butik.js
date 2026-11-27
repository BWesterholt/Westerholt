// The 3D record shop ("eksperimentzonen") on nils.westerholt.dk: the whole collection as a shop
// you can walk around in. Records in crates you dig through, CDs on the wall, a turntable on the
// counter that plays a clip, the most valuable records framed on the wall, and a doorway to a
// journey through the decades. Three.js, no build step: these files are served as they are.
import * as THREE from "three";
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, RoomEnvironment } from "three";
import { loadCollection, findInfo, findPreviews, collectionLink } from "./data.js";
import { buildRoom, addPosters, hangingSign, ROOM, COUNTER } from "./room.js";
import { planCrates, Crates } from "./crates.js";
import { CdWall } from "./cdwall.js";
import { buildCounterGear, updateGear, setDisplay, Sound } from "./player.js";
import { LP, CD, sleeveGeometry, sleeveMaterial, setBack, setEdge, coverTexture, vinylDisc, cdDisc, jewelCase, setCoverBudget, tintOnly, guessTint } from "./sleeve.js";
import * as T from "./textures.js";
import { Tweens, ease, clamp, lerp, spring, esc, kr, num, norm, displayArtist, collator, hash } from "./util.js";
import { TimeTunnel, YEAR, decadeInfo, decadeOf } from "./tidsrejse.js";

const $ = (id) => document.getElementById(id);
const mobile = matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 560;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
// For testing: #test skips the opening, #hq keeps full quality even when frames are slow.
const TEST = /test/.test(location.hash), HQ = /hq/.test(location.hash);
const V3 = THREE.Vector3;
const tweens = new Tweens();
const sound = new Sound();
const lv = { on: 0, bass: 0, mid: 0, high: 0, left: 0, right: 0, bands: null };

// ---------------------------------------------------------------- renderer, camera, scene
const canvas = $("c");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("webgl2");
} catch (e) {
  $("lbox").style.display = "none"; $("fail").style.display = "block";
  throw e;
}
let dpr = Math.min(devicePixelRatio || 1, mobile ? 1.7 : 1.6);
renderer.setPixelRatio(dpr);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
T.setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
setCoverBudget(mobile ? 70 : 120);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe6ea);
scene.fog = new THREE.Fog(0x9a8a76, 14, 40);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0;

const camera = new THREE.PerspectiveCamera(fovFor(innerWidth / innerHeight), innerWidth / innerHeight, 0.02, 60);
function fovFor(a) { return a < 0.7 ? 68 : a < 1 ? 60 : 50; }

const rt = new THREE.WebGLRenderTarget(innerWidth * dpr, innerHeight * dpr, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(dpr);
composer.setSize(innerWidth, innerHeight);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.6, 0.5, 1.45);
composer.addPass(bloom);
composer.addPass(new OutputPass());
// A soft vignette and a little film grain, like an old photo of the shop.
const finish = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.24 }, uGrain: { value: mobile ? 0.022 : 0.03 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uVig; uniform float uGrain; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = vUv - 0.5;
      c.rgb *= clamp(1.0 - dot(q, q) * uVig * 2.4, 0.0, 1.0);
      c.rgb += (h(vUv * vec2(1931.0, 1173.0) + fract(uTime * 7.0) * 91.0) - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
});
composer.addPass(finish);

addEventListener("resize", resize);
function resize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h; camera.fov = fovFor(w / h); camera.userData.baseFov = undefined; camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  if (tunnel && mode === "time") drawTimeline();
  wake();
}

// ---------------------------------------------------------------- user interface helpers
const ui = {
  show(el, on) { (typeof el === "string" ? $(el) : el).classList.toggle("hide", !on); },
  hintTimer: 0,
  hint(text, ms = 6000) {
    clearTimeout(ui.hintTimer);
    if (!text) { ui.show("hint", false); return; }
    $("hint").textContent = text; ui.show("hint", !$("card").classList.contains("hide") ? false : true);
    if (ms) ui.hintTimer = setTimeout(() => ui.show("hint", false), ms);
  },
  toastTimer: 0,
  toast(text, ms = 3200) { clearTimeout(ui.toastTimer); $("toast").textContent = text; ui.show("toast", true); ui.toastTimer = setTimeout(() => ui.show("toast", false), ms); },
  card(rec, { actions = [], extra = "" } = {}) {
    if (!rec) { ui.show("card", false); return; }
    $("cartist").textContent = rec.artist;
    $("calbum").textContent = rec.b || "Uden titel";
    const meta = [rec.y, rec.fmt, rec.v].filter(Boolean).map(esc);
    if (rec.place === "Odense") meta.push(rec.lent ? '<span class="lent">Lånt</span>' : '<span class="od">Odense</span>');
    $("cmeta").innerHTML = meta.join(" · ");
    const p = $("cprice");
    p.hidden = !rec.value; if (rec.value) p.textContent = kr(rec.value);
    $("cextra").hidden = !extra; $("cextra").innerHTML = extra;
    $("actions").innerHTML = "";
    for (const a of actions) {
      const b = document.createElement(a.href ? "a" : "button");
      b.className = "btn" + (a.main ? " main" : "");
      b.innerHTML = (a.icon ? ICON[a.icon] : "") + "<span>" + esc(a.label) + "</span>";
      if (a.href) { b.href = a.href; } else b.addEventListener("click", (e) => { e.stopPropagation(); a.run(); });
      $("actions").appendChild(b);
    }
    $("actions").hidden = !actions.length;
    ui.show("card", true);
    ui.show("hint", false);
    requestAnimationFrame(() => document.documentElement.style.setProperty("--cardh", $("card").offsetHeight + "px"));
  },
};
const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
  flip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 5v14l9-7zM16 5h3v14h-3z"/></svg>',
};

// ---------------------------------------------------------------- the shop
let data, crates, cdwall, room, gear, treasures = [], arrivals = [], posters = [], pickables = [];
let mode = "intro";
const walk = { pos: new V3(0, 1.62, 4.4), yaw: 0, pitch: -0.12 };
let walkTarget = null;
let back = null; // where to go back to from a crate or the CD wall
let inspect = null, playing = null;
let tunnel = null;
let lastInput = performance.now();
function wake() { lastInput = performance.now(); }

boot().catch((e) => {
  console.error(e);
  $("lmsg").textContent = e && e.status === 401 ? "Du er logget ud. Gå tilbage og log ind igen." : "Butikken kunne ikke åbne. Prøv at genindlæse siden.";
});

async function boot() {
  data = await loadCollection((m) => { $("lmsg").textContent = m; });
  $("lmsg").textContent = "Stiller kasserne op …";
  await new Promise((r) => setTimeout(r, 30));
  const plan = planCrates(data.vinyl);
  crates = new Crates(scene, plan, { coverSize: mobile ? 384 : 512, mobile });
  crates.onChange = wake;
  room = buildRoom(scene, { mobile, tables: crates.tables() });
  cdwall = new CdWall(scene, data.cds, { mobile });
  gear = buildCounterGear(scene, { mobile });
  const total = data.vinyl.reduce((s, r) => s + (r.value || 0), 0);
  setDisplay(gear.till.display, ["SAMLINGEN", num(total) + " KR"]);
  // signs over the tables
  crates.tables().forEach((t) => {
    const a = t.first.letters[0], b = t.last.letters[t.last.letters.length - 1];
    const n = crates.rows[t.side].reduce((s, c) => s + c.recs, 0);
    hangingSign(scene, "VINYL " + a + "–" + (b === "Div." ? "Å" : b), num(n) + " plader", t.x, t.z + t.d * 0.08, 0);
  });
  // posters for the artists with most records
  const by = {};
  data.records.forEach((r) => { if (r.artist === "Diverse kunstnere") return; const k = r.artist; (by[k] = by[k] || { name: r.a, count: 0, ys: [] }).count++; if (+r.y) by[k].ys.push(+r.y); });
  const top = Object.values(by).sort((a, b) => b.count - a.count).slice(0, 4).map((a) => ({ name: a.name, count: a.count, years: a.ys.length ? Math.min(...a.ys) + "–" + Math.max(...a.ys) : "" }));
  posters = addPosters(scene, top);
  buildTreasures();
  buildArrivals();
  // things you can tap
  const gearProxy = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
  gearProxy.position.set(0.1, COUNTER.top + 0.15, COUNTER.z); gearProxy.userData.gear = true; scene.add(gearProxy);
  pickables = [...crates.proxies, cdwall.proxy, gearProxy, room.portal.mesh, room.floor, ...posters, ...treasures.map((t) => t.hit), ...arrivals.map((a) => a.hit)];
  // warm up the shaders so the first frames don't stutter
  $("lmsg").textContent = "Tænder lyset …";
  setLights(1); renderer.compile(scene, camera); setLights(0);
  placeCamera(new V3(0.15, 1.64, 5.55), new V3(0, 1.15, -3));
  requestAnimationFrame(loop);
  backgroundTints();
  await intro();
}

// The most valuable records, framed on the wall behind the counter under a spotlight.
function buildTreasures() {
  const top = data.vinyl.filter((r) => r.value).sort((a, b) => b.value - a.value).slice(0, 10);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.4, metalness: 0.3 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc29a52, metalness: 1, roughness: 0.3 });
  top.forEach((rec, i) => {
    const col = i % 5, row = i < 5 ? 1 : 0;
    const g = new THREE.Group();
    g.position.set(-1.92 + col * 0.96, row ? 2.2 : 1.53, ROOM.z0 + 0.03);
    scene.add(g);
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.04), frameMat); f.position.z = 0.02; f.castShadow = true; g.add(f);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xece4d6, roughness: 0.9 })); mat.position.z = 0.041; g.add(mat);
    const cm = sleeveMaterial(T.texture(T.plainSleeve(rec, 256)), { edge: (rec.tint || guessTint(rec)).map((v) => v / 255), wear: 0.4 });
    const cover = new THREE.Mesh(sleeveGeometry(LP.w * 0.94, LP.h * 0.94, 0.003), cm); cover.position.z = 0.045; g.add(cover);
    coverTexture(rec, 384, { withStickers: false, priority: 2 }).then((t) => { cm.map = t; cm.needsUpdate = true; setEdge(cm, rec.tint); wake(); });
    const c = T.canvas(256, 64), gg = c.getContext("2d");
    gg.fillStyle = "#2a1d0c"; gg.font = `800 34px ${T.FONT}`; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText(kr(rec.value), 128, 34);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.004), [brass, brass, brass, brass, new THREE.MeshStandardMaterial({ map: T.texture(c), color: 0xe8c77e, metalness: 0.8, roughness: 0.35 }), brass]);
    plate.position.set(0, -0.255, 0.01); g.add(plate);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.1), new THREE.MeshBasicMaterial({ visible: false })); hit.position.z = 0.05; g.add(hit);
    hit.userData.treasure = { rec, cover, g };
    treasures.push({ rec, cover, g, hit });
  });
}

// Benjamin's newest records in the Odense collection, face out on a stand by the window.
function buildArrivals() {
  const own = data.records.filter((r) => r.own).sort((a, b) => String(b.added).localeCompare(String(a.added))).slice(0, 4);
  if (!own.length) return;
  const wood = new THREE.MeshStandardMaterial({ map: T.darkWood(51, { hue: 24, lig: 30 }), roughness: 0.6 });
  const g = new THREE.Group(); g.position.set(ROOM.x0 + 0.02, 0, 3.75); g.rotation.y = Math.PI / 2; scene.add(g);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.2), wood); shelf.position.set(0, 1.08, 0.1); shelf.castShadow = true; g.add(shelf);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.015), wood); lip.position.set(0, 1.115, 0.2); g.add(lip);
  for (const x of [-0.75, 0.75]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.18), wood); b.position.set(x, 0.95, 0.09); g.add(b); }
  const c = T.canvas(1024, 200), gg = c.getContext("2d");
  gg.fillStyle = "#44597A"; gg.beginPath(); gg.roundRect(0, 0, 1024, 200, 30); gg.fill();
  gg.fillStyle = "#fff"; gg.font = `800 96px ${T.FONT}`; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("Nyt i Odense", 512, 104);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.176), new THREE.MeshStandardMaterial({ map: T.texture(c), roughness: 0.5 })); sign.position.set(0, 1.62, 0.02); g.add(sign);
  own.forEach((rec, i) => {
    const x = -0.57 + i * 0.38;
    const m = sleeveMaterial(T.texture(T.plainSleeve(rec, 256)), { edge: (rec.tint || guessTint(rec)).map((v) => v / 255), wear: 0.1 });
    const s = new THREE.Mesh(sleeveGeometry(LP.w * 0.98, LP.h * 0.98, LP.d), m);
    s.position.set(x, 1.1 + LP.h * 0.49 * Math.cos(0.18), 0.12 - LP.h * 0.49 * Math.sin(0.18)); s.rotation.x = -0.18; s.castShadow = true; g.add(s);
    coverTexture(rec, 384, { priority: 2 }).then((t) => { m.map = t; m.needsUpdate = true; setEdge(m, rec.tint); wake(); });
    s.userData.arrival = { rec, mesh: s };
    arrivals.push({ rec, mesh: s, hit: s });
  });
}

// Fetch the colours of records whose cover is already known, quietly, a few at a time.
async function backgroundTints() {
  await new Promise((r) => setTimeout(r, 6000));
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem("nils3d:farver") || "{}") || {}; } catch (e) {}
  const todo = data.records.filter((r) => r.cover && !stored[r.key]);
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const r = todo[i++];
      const t = await tintOnly(r);
      if (t) { if (r.t === "Vinyl") crates.recolor(r); else cdwall.recolor(r); if (tunnel) tunnel.recolor(r); wake(); }
      await new Promise((ok) => setTimeout(ok, 60));
    }
  };
  worker(); worker(); worker();
}

// ---------------------------------------------------------------- lights
const lightLevel = { fix: [0, 0, 0], hemi: 0, key: 0, neon: 0, pend: 0, wall: 0, cd: 0, portal: 0, dust: 0, window: 0.0, env: 0 };
function setLights(v) { lightLevel.fix = [v, v, v]; for (const k of ["hemi", "key", "neon", "pend", "wall", "cd", "portal", "dust", "window", "env"]) lightLevel[k] = v; applyLights(0); }
function applyLights(t) {
  const L = lightLevel, beat = lv.on ? lv.bass : 0;
  room.fixtures.forEach((f, i) => { const v = L.fix[i]; f.light.intensity = v * 4.6 * (1 + beat * 0.25); f.mats.forEach((m) => { m.emissiveIntensity = v * 2.4; }); });
  room.lights.hemi.intensity = 0.15 + L.hemi * 0.8;
  room.lights.key.intensity = L.key * 2.1;
  const buzz = L.neon >= 1 ? 0.94 + 0.06 * Math.sin(t * 61) * Math.sin(t * 7.3) - (Math.random() < 0.004 ? 0.4 : 0) : 1;
  const nv = L.neon * buzz * (1 + lv.high * 0.5 + beat * 0.3);
  room.neon.mat.color.setScalar(nv * 2.3);
  room.neon.light.intensity = nv * 4;
  room.pendants.forEach((p) => { p.mat.emissiveIntensity = L.pend * 4 * (1 + beat * 0.3); });
  room.lights.counter.intensity = L.pend * 26;
  room.lights.wall.intensity = L.wall * 30;
  room.cones3d[0].mat.uniforms.uStrength.value = room.cones3d[0].max * L.pend;
  room.cones3d[1].mat.uniforms.uStrength.value = room.cones3d[1].max * L.wall;
  cdwall.light.intensity = L.cd * 3.2;
  cdwall.sign.material.color.setScalar(L.cd * 3 * (1 + lv.mid * 0.4));
  cdwall.signLight.intensity = L.cd * 1.6;
  room.portal.mat.uniforms.uOn.value = L.portal;
  room.portal.light.intensity = L.portal * 3.5;
  room.portal.sign.material.emissiveIntensity = L.portal * 0.35;
  room.lights.window.intensity = 3.5 + L.window * 1.5;
  room.lights.sun.intensity = 60;
  room.openSign.material.color.setScalar(1.7);
  room.dust.mat.uniforms.uAmount.value = L.dust * 0.55;
  scene.environmentIntensity = 0.08 + L.env * 0.32;
  room.cones.forEach((c) => { const push = lv.on ? lv.bass * c.r * 0.12 : 0; c.cone.position.z = c.base + push; c.cap.position.z = c.base + 0.005 + push; });
}

// The lights come on one by one: tubes flicker, the neon buzzes, the bulbs warm up.
async function intro() {
  const quick = sessionStorage.getItem("nils3d:set") === "1" || reduce;
  if (TEST) { const p = startPose(); $("loader").classList.add("gone"); setLights(1); placeCamera(p.pos, p.look); syncWalkFromCamera(); mode = "walk"; return; }
  try { sessionStorage.setItem("nils3d:set", "1"); } catch (e) {}
  $("loader").classList.add("gone");
  let skipped = false;
  const skip = () => { skipped = true; };
  canvas.addEventListener("pointerdown", skip, { once: true });
  const end = startPose();
  const T0 = quick ? 0.35 : 1;
  const camMove = flyTo(end.pos, end.look, { dur: quick ? 2.2 : 6.5, easing: ease.inOutSine, arc: 0 });
  const wait = (s) => (skipped ? Promise.resolve() : tweens.wait(s * T0));
  const ramp = (k, to, dur) => tweens.add({ dur: dur * T0, update: (x) => { lightLevel[k] = x * to; } });
  const flicker = async (i) => {
    const seq = quick ? [[1, 0.05], [0, 0.05], [1, 0]] : [[0.7, 0.06], [0, 0.12], [1, 0.05], [0, 0.3], [0.5, 0.04], [0, 0.07], [1, 0]];
    for (const [v, d] of seq) { if (skipped) break; lightLevel.fix[i] = v; if (d) await tweens.wait(d); }
    lightLevel.fix[i] = 1;
  };
  ramp("env", 0.35, 1.2); ramp("hemi", 0.25, 1.4);
  await wait(0.7);
  flicker(0);
  ramp("key", 1, 2.5);
  await wait(0.45); flicker(1);
  await wait(0.45); flicker(2);
  ramp("hemi", 1, 2); ramp("env", 1, 2); ramp("dust", 1, 3);
  await wait(0.5); ramp("cd", 1, 0.8);
  await wait(0.5);
  // the neon sign stutters on
  for (const [v, d] of quick ? [[1, 0]] : [[0.6, 0.08], [0, 0.1], [0.9, 0.06], [0.2, 0.14], [1, 0]]) { if (skipped) break; lightLevel.neon = v; if (d) await tweens.wait(d); }
  lightLevel.neon = 1;
  ramp("pend", 1, 1.4); ramp("wall", 1, 1.6);
  await wait(0.6); ramp("portal", 1, 1.5);
  if (skipped) { setLights(1); }
  await (skipped ? Promise.resolve() : camMove);
  setLights(1);
  camera.updateMatrixWorld();
  syncWalkFromCamera();
  mode = "walk";
  canvas.removeEventListener("pointerdown", skip);
  ui.hint(mobile ? "Træk for at kigge rundt · Tryk på en kasse for at bladre" : "Træk for at kigge rundt · Klik på en kasse for at bladre · Scroll for at gå", 9000);
  if (!localStorage.getItem("nils3d:hjælp")) setTimeout(() => { if (mode === "walk") { try { localStorage.setItem("nils3d:hjælp", "1"); } catch (e) {} } }, 1000);
}

// Where you stand when the lights are on. A phone held upright sees too little of the room
// straight ahead, so there you look along the left table instead.
function startPose() {
  if (camera.aspect < 0.8) return { pos: new V3(0.45, 1.62, 4.7), look: new V3(-1.15, 0.98, 1.2) };
  return { pos: new V3(0, 1.62, 4.15), look: new V3(0, 1.08, -2.6) };
}

// ---------------------------------------------------------------- camera moves
const _mat = new THREE.Matrix4();
function quatLooking(pos, look) { _mat.lookAt(pos, look, new V3(0, 1, 0)); return new THREE.Quaternion().setFromRotationMatrix(_mat); }
function placeCamera(pos, look) { camera.position.copy(pos); camera.quaternion.copy(quatLooking(pos, look)); camera.updateMatrixWorld(); }
let flight = null;
function flyTo(pos, look, { dur, easing = ease.inOut, arc = 0.18 } = {}) {
  const p0 = camera.position.clone(), q0 = camera.quaternion.clone(), q1 = quatLooking(pos, look);
  const dist = p0.distanceTo(pos);
  if (dur === undefined) dur = clamp(0.75 + dist * 0.2, 0.8, 2.2);
  if (reduce) dur = Math.min(dur, 0.35);
  const mid = p0.clone().lerp(pos, 0.5); mid.y = Math.max(mid.y, Math.max(p0.y, pos.y) + arc * Math.min(dist, 4));
  const id = {};
  flight = id;
  return tweens.add({ dur, ease: easing, update: (k) => {
    if (flight !== id) return;
    const a = p0.clone().lerp(mid, k), b = mid.clone().lerp(pos, k);
    camera.position.copy(a.lerp(b, k));
    camera.quaternion.slerpQuaternions(q0, q1, k);
  } });
}
function lookDir(yaw, pitch) { return new V3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); }
function syncWalkFromCamera() {
  const d = new V3(0, 0, -1).applyQuaternion(camera.quaternion);
  walk.pos.copy(camera.position); walk.pos.y = 1.62;
  walk.yaw = Math.atan2(-d.x, -d.z); walk.pitch = Math.asin(clamp(d.y, -0.99, 0.99));
}
function applyWalk() {
  camera.position.copy(walk.pos);
  camera.quaternion.copy(quatLooking(walk.pos, walk.pos.clone().add(lookDir(walk.yaw, walk.pitch))));
}
function walkPose() { return { pos: walk.pos.clone(), look: walk.pos.clone().add(lookDir(walk.yaw, walk.pitch)) }; }
function free(x, z) {
  if (x < ROOM.x0 + 0.55 || x > ROOM.x1 - 0.5 || z < ROOM.z0 + 0.6 || z > ROOM.z1 - 0.45) return false;
  if (x < ROOM.x0 + 0.95 && z < 1.5 && z > -2.3) return false; // the CD wall
  for (const c of room.colliders) if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return false;
  return true;
}
function moveWalk(dx, dz) {
  const nx = walk.pos.x + dx, nz = walk.pos.z + dz;
  if (free(nx, nz)) { walk.pos.x = nx; walk.pos.z = nz; }
  else if (free(nx, walk.pos.z)) walk.pos.x = nx;
  else if (free(walk.pos.x, nz)) walk.pos.z = nz;
}
// The nearest free spot to a point on the floor.
function nearestFree(x, z) {
  if (free(x, z)) return new V3(x, 1.62, z);
  for (let r = 0.1; r < 3; r += 0.1) for (let a = 0; a < Math.PI * 2; a += 0.3) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (free(px, pz)) return new V3(px, 1.62, pz); }
  return walk.pos.clone();
}

// ---------------------------------------------------------------- render loop
let last = performance.now(), frames = 0, slowFrames = 0, perfT = 0, perfN = 0, perfSum = 0, frameNo = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  frameNo++;
  const t = now / 1000;
  let busy = tweens.tick(dt);
  if (crates) busy = crates.update(dt) || busy;
  if (cdwall) busy = cdwall.update(dt) || busy;
  sound.levels(lv);
  if (gear) busy = updateGear(gear, dt, lv) || busy;
  busy = modeTick(dt, t) || busy;
  if (mode === "time" || mode === "timefocus" || (mode === "fly" && renderPass.scene !== scene)) { tunnel.beat = lv.on ? lv.bass : 0; busy = tunnel.update(dt, camera, pointerNdc, t, mode === "time") || busy; updateTimeHud(); }
  if (room && renderPass.scene === scene) {
    room.dust.mat.uniforms.uTime.value = t;
    room.dust.mat.uniforms.uBeat.value = lv.on ? lv.bass : 0;
    room.portal.mat.uniforms.uTime.value = t;
    room.passers.update(dt);
    applyLights(t);
  }
  if (playing && lv.on) updateNow();
  const idle = !busy && !lv.on && now - lastInput > 3500 && mode !== "intro" && !TEST;
  if (idle && frameNo % 3) return;
  const start = performance.now();
  finish.uniforms.uTime.value = t;
  composer.render(dt);
  // Keep it smooth: if frames are slow, draw fewer pixels, and last of all turn off the glow.
  if (mode !== "intro" && !idle && !HQ) {
    perfSum += dt; perfN++;
    if (perfN >= 90) {
      const avg = perfSum / perfN;
      perfSum = 0; perfN = 0;
      if (avg > 1 / 40 && dpr > 1) { dpr = Math.max(1, dpr - 0.2); renderer.setPixelRatio(dpr); composer.setPixelRatio(dpr); resize(); }
      else if (avg > 1 / 32 && bloom.enabled) { bloom.enabled = false; }
    }
  }
  void start;
}

// ---------------------------------------------------------------- per-mode updates
const keys = new Set();
let inspectYaw = 0, inspectYawV = 0, inspectTarget = 0, inspectFloat = 0;
const pointerNdc = new THREE.Vector2();
function modeTick(dt, t) {
  let busy = false;
  if (mode === "walk") {
    let f = 0, s = 0, turn = 0;
    if (keys.has("w") || keys.has("arrowup")) f += 1;
    if (keys.has("s") || keys.has("arrowdown")) f -= 1;
    if (keys.has("a")) s -= 1;
    if (keys.has("d")) s += 1;
    if (keys.has("arrowleft") || keys.has("q")) turn += 1;
    if (keys.has("arrowright") || keys.has("e")) turn -= 1;
    if (f || s || turn) {
      walkTarget = null;
      walk.yaw += turn * dt * 1.6;
      const sp = 2.2 * dt, d = lookDir(walk.yaw, 0), r = new V3(-d.z, 0, d.x);
      moveWalk(d.x * f * sp + r.x * s * sp, d.z * f * sp + r.z * s * sp);
      busy = true;
    }
    if (walkTarget) {
      const dx = walkTarget.x - walk.pos.x, dz = walkTarget.z - walk.pos.z, dd = Math.hypot(dx, dz);
      if (dd < 0.02) walkTarget = null;
      else { const st = Math.min(dd, dt * Math.max(1.2, dd * 2.6)); moveWalk((dx / dd) * st, (dz / dd) * st); busy = true; }
    }
    applyWalk();
  } else if (mode === "inspect" && inspect && inspect.ready) {
    [inspectYaw, inspectYawV] = spring(inspectYaw, inspectYawV, inspectTarget, inspect.dragging ? 30 : 7, dt);
    inspectFloat += dt;
    const o = inspect.obj, base = inspect.at;
    o.position.copy(base.pos).add(new V3(0, Math.sin(inspectFloat * 1.3) * 0.004, 0));
    const tiltX = mobile ? 0 : -pointerNdc.y * 0.08, tiltY = mobile ? 0 : pointerNdc.x * 0.12;
    o.quaternion.copy(base.quat).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tiltX, inspectYaw + tiltY, 0)));
    if (inspect.disc && inspect.kind === "vinyl") inspect.disc.rotation.y += dt * 0.4;
    busy = true;
  }
  if (playing) busy = true;
  return busy;
}

// ---------------------------------------------------------------- input
const ray = new THREE.Raycaster();
function rayAt(x, y) { const v = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(v, camera); return ray; }
const pointers = new Map();
let drag = null, pinch = null, wheelAcc = 0, flingTimer = 0;
canvas.addEventListener("pointerdown", (e) => {
  wake();
  canvas.focus({ preventScroll: true });
  sound.ensure();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), moved: false, acc: 0, vx: 0, vy: 0, lt: performance.now() };
  else if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; drag = null; }
});
canvas.addEventListener("pointermove", (e) => {
  pointerNdc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (!pointers.has(e.pointerId)) { if (e.pointerType === "mouse") hover(e.clientX, e.clientY); return; }
  wake();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (mode === "walk") { const dir = lookDir(walk.yaw, 0); moveWalk(dir.x * (d - pinch.d) * 0.008, dir.z * (d - pinch.d) * 0.008); }
    pinch.d = d;
    return;
  }
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
  const ddt = Math.max(1, now - drag.lt);
  drag.vx = lerp(drag.vx, dx / ddt, 0.4); drag.vy = lerp(drag.vy, dy / ddt, 0.4); drag.lt = now;
  drag.x = e.clientX; drag.y = e.clientY;
  if (!drag.moved && Math.hypot(drag.x - drag.x0, drag.y - drag.y0) > 7) drag.moved = true;
  if (!drag.moved) return;
  onDrag(dx, dy);
});
const endPointer = (e) => {
  const had = pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (!had || !drag) return;
  const d = drag; drag = null;
  if (!d.moved && performance.now() - d.t0 < 600) onTap(e.clientX, e.clientY);
  else onDragEnd(d);
};
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", (e) => { pointers.delete(e.pointerId); drag = null; pinch = null; });
canvas.addEventListener("wheel", (e) => {
  e.preventDefault(); wake();
  const dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
  if (mode === "walk") { const dir = lookDir(walk.yaw, 0); walkTarget = null; moveWalk(dir.x * -dy * 0.0035, dir.z * -dy * 0.0035); }
  else if (mode === "crate" || mode === "cd") {
    wheelAcc += dy;
    const stepSize = mode === "cd" ? 30 : 46;
    while (Math.abs(wheelAcc) >= stepSize) { const dir = Math.sign(wheelAcc); wheelAcc -= dir * stepSize; dig(dir); }
  } else if (mode === "inspect") { inspectTarget += dy * 0.006; }
  else if (mode === "time") { tunnel.nudge(-dy * 0.011); }
  else if (mode === "timefocus" && Math.abs(dy) > 30) { timeUnfocus(); }
}, { passive: false });

function onDrag(dx, dy) {
  if (mode === "walk") {
    walkTarget = null;
    const k = mobile ? 0.0055 : 0.0042;
    walk.yaw += dx * k; walk.pitch = clamp(walk.pitch + dy * k * 0.8, -0.95, 0.6);
  } else if (mode === "crate") {
    drag.acc += dy;
    while (Math.abs(drag.acc) > 30) { const dir = drag.acc < 0 ? 1 : -1; drag.acc += dir * 30; dig(dir); }
  } else if (mode === "cd") {
    drag.acc += dx + dy * 0.6;
    while (Math.abs(drag.acc) > 16) { const dir = drag.acc < 0 ? 1 : -1; drag.acc += dir * 16; dig(dir); }
  } else if (mode === "inspect" && inspect) {
    inspect.dragging = true;
    inspectTarget += dx * 0.012;
  } else if (mode === "time") {
    tunnel.nudge((dy + dx * 0.8) * (mobile ? 0.028 : 0.02));
  }
}
function onDragEnd(d) {
  if (mode === "crate" || mode === "cd") {
    // a quick flick keeps going for a few records
    const v = mode === "crate" ? -d.vy : -(d.vx + d.vy * 0.6);
    let n = Math.min(12, Math.floor(Math.abs(v) * (mode === "crate" ? 4 : 7)));
    const dir = Math.sign(v);
    clearInterval(flingTimer);
    if (n > 1) flingTimer = setInterval(() => { if (n-- <= 0 || !dig(dir)) clearInterval(flingTimer); }, 55);
  } else if (mode === "inspect" && inspect) {
    inspect.dragging = false;
    const half = Math.round(inspectTarget / Math.PI + (d.vx || 0) * 0.6);
    inspectTarget = half * Math.PI;
    inspect.side = ((half % 2) + 2) % 2;
    showInspectCard();
  } else if (mode === "time") {
    // a flick keeps you flying for a while
    const v = (d.vy || 0) + (d.vx || 0) * 0.8;
    if (Math.abs(v) > 0.25) tunnel.nudge(clamp(v, -4, 4) * (mobile ? 11 : 8));
  }
}
addEventListener("keydown", (e) => {
  if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { if (e.key === "Escape") closeSearch(); return; }
  const k = e.key.toLowerCase();
  wake();
  if (k === "/" || ((e.metaKey || e.ctrlKey) && k === "k")) { e.preventDefault(); openSearch(); return; }
  if (k === "escape" || k === "backspace") { e.preventDefault(); goBack(); return; }
  if (mode === "crate" || mode === "cd") {
    if (k === "arrowdown" || k === "arrowright" || k === "j") { e.preventDefault(); dig(1); return; }
    if (k === "arrowup" || k === "arrowleft" || k === "k") { e.preventDefault(); dig(-1); return; }
    if (k === "enter" || k === " ") { e.preventDefault(); take(); return; }
  }
  if (mode === "time") {
    if (k === "arrowup" || k === "arrowright" || k === "w" || k === "d") { e.preventDefault(); tunnel.nudge(-YEAR); return; }
    if (k === "arrowdown" || k === "arrowleft" || k === "s" || k === "a") { e.preventDefault(); tunnel.nudge(YEAR); return; }
    if (k === "pagedown" || k === " ") { e.preventDefault(); tunnel.jumpTo(Math.min(tunnel.y1, decadeOf(tunnel.year) + 10)); return; }
    if (k === "pageup") { e.preventDefault(); const d0 = decadeOf(tunnel.year); tunnel.jumpTo(Math.max(tunnel.y0, tunnel.year > d0 + 1 ? d0 : d0 - 10)); return; }
    if (k === "home") { e.preventDefault(); tunnel.jumpTo(tunnel.y0); return; }
    if (k === "end") { e.preventDefault(); tunnel.jumpTo(tunnel.y1); return; }
    return;
  }
  if (mode === "timefocus") { if (k === "enter" || k === "p") { e.preventDefault(); leaveTunnelTo(tunnel.selected.rec, true); } return; }
  if (mode === "inspect") {
    if (k === "enter" || k === "p") { e.preventDefault(); playInspected(); return; }
    if (k === "f" || k === " ") { e.preventDefault(); flipInspected(); return; }
  }
  keys.add(k);
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => keys.clear());

// What is under the finger.
function pickAt(x, y) {
  const r = rayAt(x, y);
  const hits = r.intersectObjects(pickables, false);
  return hits[0] || null;
}
let hoverT = 0, hoverObj = null;
function hover(x, y) {
  if (mode === "time" && performance.now() - hoverT > 60) {
    hoverT = performance.now();
    const it = tunnel.pick(rayAt(x, y)), tip = $("tip");
    canvas.style.cursor = it ? "pointer" : "grab";
    if (it) { tip.innerHTML = esc(it.rec.artist + " – " + (it.rec.b || "")) + "<small>" + it.year + " · " + esc(it.rec.fmt || "") + "</small>"; tip.style.left = x + "px"; tip.style.top = y + "px"; ui.show(tip, true); }
    else ui.show(tip, false);
    return;
  }
  if (mode !== "walk" || performance.now() - hoverT < 50) return;
  hoverT = performance.now();
  const hit = pickAt(x, y);
  const tip = $("tip");
  let text = "", sub = "";
  const u = hit ? hit.object.userData : {};
  if (u.crate) { text = "Vinyl " + u.crate.label; sub = u.crate.sub + " · klik for at bladre"; }
  else if (u.cdwall) { const i = cdwall.pickIndex(rayAt(x, y)); const s = i !== null ? cdwall.slots[i] : null; text = "CD-væggen"; sub = s ? s.rec.letter + " · " + s.rec.artist : num(data.cds.length) + " CD'er"; }
  else if (u.treasure) { text = u.treasure.rec.artist + " – " + u.treasure.rec.b; sub = "Butikkens skatte · " + kr(u.treasure.rec.value); }
  else if (u.arrival) { text = u.arrival.rec.artist + " – " + u.arrival.rec.b; sub = "Nyt i Odense"; }
  else if (u.poster) { text = displayArtist(u.poster.name); sub = "Klik for at finde pladerne"; }
  else if (u.portal) { text = "Tidsrejsen"; sub = "Flyv gennem årtierne"; }
  else if (u.gear) { text = playing ? "Spiller nu: " + playing.rec.b : "Pladespilleren"; sub = playing ? "Klik for at gå hen til den" : "Tag en plade op og tryk Spil den"; }
  canvas.style.cursor = text ? "pointer" : u.floor ? "default" : "grab";
  if (text) { tip.innerHTML = esc(text) + (sub ? "<small>" + esc(sub) + "</small>" : ""); tip.style.left = x + "px"; tip.style.top = y + "px"; ui.show(tip, true); }
  else ui.show(tip, false);
  hoverObj = hit && hit.object;
  room.portal.mat.uniforms.uHover.value = u.portal ? 1 : 0;
}

function onTap(x, y) {
  ui.show("tip", false);
  if (mode === "time") { const it = tunnel.pick(rayAt(x, y)); if (it) timeFocus(it); return; }
  if (mode === "timefocus") { const it = tunnel.pick(rayAt(x, y)); if (it && it !== tunnel.selected) timeFocus(it); else if (!it) timeUnfocus(); return; }
  if (mode === "walk") {
    const hit = pickAt(x, y);
    if (!hit) return;
    const u = hit.object.userData;
    if (u.crate) return openCrate(u.crate);
    if (u.cdwall) { const i = cdwall.pickIndex(rayAt(x, y)); return openCd(i === null ? 0 : i); }
    if (u.treasure) return inspectFrom({ rec: u.treasure.rec, kind: "vinyl", source: "wall", object: u.treasure.cover });
    if (u.arrival) return inspectFrom({ rec: u.arrival.rec, kind: "vinyl", source: "arrival", object: u.arrival.mesh });
    if (u.poster) { const rec = data.records.find((r) => r.a === u.poster.name && r.t === "Vinyl") || data.records.find((r) => r.a === u.poster.name); if (rec) goTo(rec); return; }
    if (u.portal) return enterPortal();
    if (u.gear) return goToCounter();
    if (u.floor) { walkTarget = nearestFree(hit.point.x, hit.point.z); return; }
  } else if (mode === "crate") {
    const j = crates.pickItem(rayAt(x, y));
    if (j === null) { const h = pickAt(x, y); if (h && h.object.userData.crate && h.object.userData.crate !== crates.active) return openCrate(h.object.userData.crate); if (!h || h.object.userData.floor) return goBack(); return; }
    const c = crates.active;
    if (j === c.cursor) return take();
    const it = c.items[j];
    if (it && it.rec) { crates.setCursor(j); showCrateCard(); }
  } else if (mode === "cd") {
    const i = cdwall.pickIndex(rayAt(x, y));
    if (i === null) return goBack();
    if (i === cdwall.cursor) return take();
    cdwall.setCursor(i); followCd(); showCdCard();
  } else if (mode === "inspect") {
    // tapping the record flips it; tapping beside it puts it back
    const hit = inspect && rayAt(x, y).intersectObject(inspect.obj, true)[0];
    if (hit) flipInspected(); else putBack();
  } else if (mode === "play") {
    const hit = pickAt(x, y);
    if (!hit || !hit.object.userData.gear) goBack();
  }
}

// ---------------------------------------------------------------- crates
function openCrate(c, at, then) {
  if (mode === "walk") back = walkPose();
  mode = "fly";
  const v = crates.view(c, camera.aspect);
  crates.enter(c, at);
  ui.show("tip", false); ui.hint("");
  showCrateCard();
  mode = "crate";
  ui.show("crumb", true); ui.show("letters", true);
  return flyTo(v.pos, v.look, { arc: 0.15 }).then(() => {
    if (!localStorage.getItem("nils3d:bladret")) ui.hint(mobile ? "Swipe op og ned for at bladre" : "Scroll eller brug piletasterne for at bladre", 5000);
    then && then();
  });
}
function dig(dir) {
  wake();
  if (mode === "crate") {
    if (crates.step(dir)) { showCrateCard(); try { localStorage.setItem("nils3d:bladret", "1"); } catch (e) {} return true; }
    // past the end of the crate: on to the next one
    const next = crates.neighbour(dir);
    if (!next) return false;
    const j = dir > 0 ? crates.firstRecord(next) : crates.lastRecord(next);
    openCrate(next, j);
    return false;
  }
  if (mode === "cd") { if (cdwall.step(dir)) { followCd(); showCdCard(); return true; } return false; }
  return false;
}
function showCrateCard() {
  const c = crates.active;
  if (!c) return;
  const it = c.items[c.cursor];
  const recs = c.items.filter((x) => x.rec);
  const pos = it && it.rec ? recs.indexOf(it) + 1 : 0;
  $("crumbt").innerHTML = "Kasse " + esc(c.label) + "<small>" + (pos ? pos + " af " + recs.length : "") + "</small>";
  $("cprev").disabled = !crates.neighbour(-1); $("cnext").disabled = !crates.neighbour(1);
  drawLetters(it && it.rec ? it.rec.letter : c.letters[0]);
  if (it && it.rec) ui.card(it.rec, { actions: [{ label: "Tag den op", icon: "up", main: true, run: take }, { label: "Spil den", icon: "play", run: () => take().then(playInspected) }] });
  else ui.card(null);
}
let lettersDrawn = "";
function drawLetters(active) {
  const nav = $("letters");
  const list = crates.letters;
  if (lettersDrawn !== list.join()) {
    nav.innerHTML = list.map((l) => '<button data-l="' + esc(l) + '">' + esc(l === "Div." ? "…" : l) + "</button>").join("");
    lettersDrawn = list.join();
  }
  for (const b of nav.children) b.classList.toggle("on", b.getAttribute("data-l") === active);
}
$("letters").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const at = crates.letterCrate(b.getAttribute("data-l"));
  if (!at) return;
  if (crates.active === at.c) { crates.setCursor(at.j); showCrateCard(); } else openCrate(at.c, at.j);
});
$("cprev").addEventListener("click", () => { const n = crates.neighbour(-1); if (n) openCrate(n, crates.firstRecord(n)); });
$("cnext").addEventListener("click", () => { const n = crates.neighbour(1); if (n) openCrate(n, crates.firstRecord(n)); });

// ---------------------------------------------------------------- the CD wall
function openCd(i, then) {
  if (mode === "walk") back = walkPose();
  mode = "fly";
  cdwall.enter(i);
  ui.show("tip", false); ui.hint("");
  showCdCard();
  const v = cdwall.view(i, camera.aspect);
  mode = "cd";
  return flyTo(v.pos, v.look, { arc: 0.1 }).then(() => { ui.hint(mobile ? "Swipe til siden for at bladre" : "Scroll eller brug piletasterne for at bladre", 4500); then && then(); });
}
let cdFollow = null;
function followCd() {
  const v = cdwall.view(cdwall.cursor, camera.aspect);
  const from = camera.position.clone(), q0 = camera.quaternion.clone(), q1 = quatLooking(v.pos, v.look);
  const id = {}; cdFollow = id; flight = id;
  tweens.add({ dur: 0.35, ease: ease.out, update: (k) => { if (cdFollow !== id) return; camera.position.lerpVectors(from, v.pos, k); camera.quaternion.slerpQuaternions(q0, q1, k); } });
}
function showCdCard() {
  const s = cdwall.current();
  if (!s) return;
  ui.card(s.rec, { actions: [{ label: "Tag den ud", icon: "up", main: true, run: take }, { label: "Spil den", icon: "play", run: () => take().then(playInspected) }] });
}

// ---------------------------------------------------------------- taking a record out
function take() {
  if (mode === "crate") {
    const it = crates.current();
    if (!it || !it.rec) return Promise.resolve();
    return inspectFrom({ rec: it.rec, kind: "vinyl", source: "crate", item: it });
  }
  if (mode === "cd") {
    const s = cdwall.current();
    return inspectFrom({ rec: s.rec, kind: "cd", source: "cd", index: cdwall.cursor });
  }
  return Promise.resolve();
}
function inspectDistance(w, h) {
  const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const fitH = h / (vh * (mobile && camera.aspect < 1 ? 0.5 : 0.58)), fitW = w / (vh * camera.aspect * 0.86);
  return Math.max(fitH, fitW);
}
async function inspectFrom(src) {
  if (inspect) return;
  const rec = src.rec;
  const prevMode = mode;
  if (mode === "walk") back = walkPose();
  mode = "fly";
  ui.show("tip", false); ui.hint("");
  const obj = new THREE.Group();
  let start = { pos: new V3(), quat: new THREE.Quaternion() };
  let disc = null, sleeve = null, mat = null, lid = null;
  if (src.kind === "vinyl") {
    const front = await coverTexture(rec, mobile ? 512 : 768, { priority: 20 }).catch(() => null);
    mat = sleeveMaterial(front || T.texture(T.plainSleeve(rec, 512)), { edge: (rec.tint || guessTint(rec)).map((v) => v / 255), wear: 0.35 + (rec.seed % 100) / 160 });
    setBack(mat, T.texture(T.sleeveBack(rec, null, mobile ? 768 : 1024)));
    // held up close under the lamps, so a little less bright than in the crate (white sleeves glowed)
    mat.color.setScalar(0.8);
    sleeve = new THREE.Mesh(sleeveGeometry(LP.w, LP.h, LP.d), mat);
    sleeve.castShadow = true;
    obj.add(sleeve);
    disc = vinylDisc(rec, 5);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0, 0.002, 0);
    obj.add(disc);
    if (src.source === "crate") { await crates.settle(); const w = crates.worldOf(src.item); start = w; crates.setOut(src.item, true); }
    else { src.object.updateMatrixWorld(); src.object.matrixWorld.decompose(start.pos, start.quat, new V3()); src.object.visible = false; }
    findInfo(rec).then((info) => {
      if (!inspect || inspect.rec !== rec) return;
      inspect.info = info;
      setBack(mat, T.texture(T.sleeveBack(rec, info || { tracks: [] }, mobile ? 768 : 1024)));
      if (info && info.tracks && info.tracks.length) { const nd = vinylDisc(rec, Math.ceil(info.tracks.length / 2)); nd.rotation.copy(disc.rotation); nd.position.copy(disc.position); obj.remove(disc); disc.userData.dispose(); obj.add(nd); disc = nd; inspect.disc = nd; }
      wake();
    });
  } else {
    const front = await coverTexture(rec, mobile ? 384 : 512, { priority: 20, withStickers: false }).catch(() => null);
    const jc = jewelCase(rec, front || T.texture(T.plainSleeve(rec, 384)));
    obj.add(jc);
    lid = jc.userData.lid;
    disc = cdDisc(rec, front);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0, 0, -0.001);
    obj.add(disc);
    const w = cdwall.worldOf(src.index);
    start = { pos: w.pos, quat: w.quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))) };
    cdwall.hideSlot(src.index, true);
  }
  obj.position.copy(start.pos); obj.quaternion.copy(start.quat);
  scene.add(obj);
  const size = src.kind === "vinyl" ? [LP.w * 1.35, LP.h] : [CD.w * 1.6, CD.h];
  const d = inspectDistance(size[0], size[1]);
  const fwd = new V3(0, 0, -1).applyQuaternion(camera.quaternion), up = new V3(0, 1, 0).applyQuaternion(camera.quaternion);
  const shift = mobile && camera.aspect < 1 ? 0.12 : 0.07;
  const target = { pos: camera.position.clone().add(fwd.multiplyScalar(d)).add(up.multiplyScalar(d * shift)), quat: camera.quaternion.clone() };
  inspect = { obj, rec, kind: src.kind, src, prevMode, disc, sleeve, mat, lid, at: target, ready: false, side: 0 };
  inspectYaw = 0; inspectYawV = 0; inspectTarget = 0;
  // up out of the crate, then to you
  const lifted = start.pos.clone().add(new V3(0, src.kind === "vinyl" ? 0.3 : 0.05, 0));
  if (src.kind === "cd") lifted.add(new V3(0.18, 0, 0));
  await tweens.add({ dur: 0.32, ease: ease.out, update: (k) => { obj.position.lerpVectors(start.pos, lifted, k); } });
  const q0 = obj.quaternion.clone();
  await tweens.add({ dur: 0.62, ease: ease.inOut, update: (k) => { obj.position.lerpVectors(lifted, target.pos, k); obj.quaternion.slerpQuaternions(q0, target.quat, k); } });
  inspect.ready = true;
  mode = "inspect";
  ui.show("crumb", false); ui.show("letters", false);
  showInspectCard();
  // the record slides half out of its sleeve, like on the collection page
  if (src.kind === "vinyl") tweens.add({ dur: 0.9, ease: ease.outQuint, update: (k) => { if (inspect && inspect.disc) inspect.disc.position.x = k * LP.w * 0.42; } });
  else tweens.add({ dur: 0.7, ease: ease.out, update: (k) => { if (inspect && inspect.lid) inspect.lid.rotation.y = -k * 1.9; if (inspect && inspect.disc) { inspect.disc.position.z = k * 0.012; inspect.disc.position.x = k * 0.02; } } });
  ui.hint(mobile ? "Træk i pladen for at dreje den" : "Træk i pladen for at dreje den rundt", 3500);
}
function showInspectCard() {
  if (!inspect) return;
  const rec = inspect.rec, p = rec.price;
  const extra = [];
  if (p && p.d) extra.push("Udgave: " + esc(p.d));
  if (p && p.l && p.n) extra.push("Til salg nu: " + num(p.n) + " stk. fra " + kr(p.l));
  const links = ['<a href="' + esc(collectionLink(rec)) + '">Se den i samlingen ›</a>'];
  if (p && p.u) links.push('<a href="' + esc(p.u) + '" target="_blank" rel="noopener">Discogs ›</a>');
  extra.push(links.join(" &nbsp; "));
  ui.card(rec, { extra: extra.join("<br>"), actions: [
    { label: playing && playing.rec === rec ? "Spiller nu" : "Spil den", icon: "play", main: true, run: playInspected },
    { label: inspect.side ? "Se forsiden" : "Se bagsiden", icon: "flip", run: flipInspected },
    { label: "Læg den tilbage", icon: "down", run: putBack },
  ] });
}
function flipInspected() {
  if (!inspect || !inspect.ready) return;
  inspect.side = inspect.side ? 0 : 1;
  inspectTarget = Math.round(inspectTarget / Math.PI + 1) * Math.PI;
  showInspectCard();
  wake();
}
async function putBack() {
  if (!inspect || !inspect.ready) return;
  const I = inspect;
  I.ready = false;
  mode = "fly";
  ui.card(null);
  let to;
  if (I.src.source === "crate") to = crates.worldOf(I.src.item);
  else if (I.kind === "cd") { const w = cdwall.worldOf(I.src.index); to = { pos: w.pos, quat: w.quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))) }; }
  else { const p = new V3(), q = new THREE.Quaternion(); I.src.object.matrixWorld.decompose(p, q, new V3()); to = { pos: p, quat: q }; }
  const p0 = I.obj.position.clone(), q0 = I.obj.quaternion.clone(), dx0 = I.disc ? I.disc.position.x : 0;
  const above = to.pos.clone().add(new V3(I.kind === "cd" ? 0.18 : 0, I.kind === "vinyl" ? 0.3 : 0.05, 0));
  await tweens.add({ dur: 0.5, ease: ease.inOut, update: (k) => { I.obj.position.lerpVectors(p0, above, k); I.obj.quaternion.slerpQuaternions(q0, to.quat, k); if (I.disc && I.kind === "vinyl") I.disc.position.x = dx0 * (1 - k); if (I.lid) I.lid.rotation.y = -1.9 * (1 - k); } });
  await tweens.add({ dur: 0.3, ease: ease.in, update: (k) => { I.obj.position.lerpVectors(above, to.pos, k); } });
  dropInspect(I);
  inspect = null;
  if (I.prevMode === "crate") { mode = "crate"; ui.show("crumb", true); ui.show("letters", true); showCrateCard(); }
  else if (I.prevMode === "cd") { mode = "cd"; showCdCard(); }
  else { mode = "walk"; syncWalkFromCamera(); }
}
function dropInspect(I) {
  scene.remove(I.obj);
  if (I.src.source === "crate") crates.setOut(I.src.item, false);
  else if (I.kind === "cd") cdwall.hideSlot(I.src.index, false);
  else if (I.src.object) I.src.object.visible = true;
  I.obj.traverse((o) => { if (o.material && o.material !== I.keepMat) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose && m.dispose()); } });
}

// ---------------------------------------------------------------- playing
function playView() {
  const far = camera.aspect < 0.8 ? 1.55 : camera.aspect < 1.2 ? 1.2 : 1;
  const x = camera.aspect < 0.8 ? -0.45 : -0.2;
  return { pos: new V3(x, COUNTER.top + 0.5 + 0.2 * far, COUNTER.z + 0.75 + 0.35 * far), look: new V3(x, COUNTER.top + 0.06, COUNTER.z - 0.05) };
}
async function playInspected() {
  if (!inspect || !inspect.ready) return;
  const I = inspect;
  if (playing && playing.rec === I.rec) return;
  I.ready = false;
  inspect = null;
  mode = "fly";
  ui.card(null);
  sound.ensure();
  stopPlaying(true);
  const rec = I.rec, kind = I.kind;
  const pv = playView();
  if (I.prevMode === "walk" || !back) back = back || walkPose();
  const previews = findPreviews(rec).catch(() => []);
  const cam = flyTo(pv.pos, pv.look, { dur: 1.5, arc: 0.25 });
  // the sleeve goes on the "Spiller nu" stand, the record on the player
  const disc = I.disc;
  scene.attach(disc);
  const sleeveTo = { pos: new V3(), quat: new THREE.Quaternion() };
  gear.stand.slot.updateMatrixWorld(); gear.stand.slot.matrixWorld.decompose(sleeveTo.pos, sleeveTo.quat, new V3());
  if (kind === "cd") sleeveTo.pos.y -= 0.08;
  const sp0 = I.obj.position.clone(), sq0 = I.obj.quaternion.clone();
  const sleeveMove = tweens.add({ dur: 1.4, delay: 0.25, ease: ease.inOut, update: (k) => { I.obj.position.lerpVectors(sp0, sleeveTo.pos, k); I.obj.position.y += Math.sin(k * Math.PI) * 0.25; I.obj.quaternion.slerpQuaternions(sq0, sleeveTo.quat, k); if (I.lid) I.lid.rotation.y = -1.9 * (1 - k); } });
  const spot = kind === "vinyl" ? gear.turntable.discSpot : gear.cdplayer.spin;
  if (kind === "cd") gear.cdplayer.openTarget = 1;
  spot.updateMatrixWorld();
  const dTo = { pos: new V3(), quat: new THREE.Quaternion() };
  spot.matrixWorld.decompose(dTo.pos, dTo.quat, new V3());
  const hover = dTo.pos.clone().add(new V3(0, kind === "vinyl" ? 0.12 : 0.08, 0));
  const dp0 = disc.position.clone(), dq0 = disc.quaternion.clone();
  await tweens.add({ dur: 1.3, delay: 0.1, ease: ease.inOut, update: (k) => { disc.position.lerpVectors(dp0, hover, k); disc.position.y += Math.sin(k * Math.PI) * 0.2; disc.quaternion.slerpQuaternions(dq0, dTo.quat, k); } });
  await tweens.add({ dur: 0.45, ease: ease.inOut, update: (k) => { disc.position.lerpVectors(hover, dTo.pos, k); } });
  spot.attach(disc);
  await Promise.all([cam, sleeveMove]);
  playing = { rec, kind, sleeve: I.obj, disc, src: I.src, I, tracks: [], idx: 0 };
  mode = "play";
  if (kind === "cd") { gear.cdplayer.openTarget = 0; await tweens.wait(0.35); gear.cdplayer.target = 30; }
  else {
    gear.turntable.target.speed = (Math.PI * 2 * 33.333) / 60;
    gear.turntable.target.yaw = gear.turntable.yawOuter; gear.turntable.target.lift = 0.06;
    await tweens.wait(0.9);
    gear.turntable.target.lift = 0;
    await tweens.wait(0.35);
    sound.crackle(0.35, 0.05);
  }
  showPlayCard();
  showNow("Finder et lydklip …", rec.artist + " – " + rec.b);
  const tracks = await previews;
  if (!playing || playing.rec !== rec) return;
  playing.tracks = tracks;
  if (!tracks.length) { sound.crackle(kind === "vinyl" ? 0.12 : 0, 0.5); showNow("Fandt ikke et lydklip", rec.artist + " – " + rec.b); ui.toast("Der var ikke et lydklip til den her plade. Den drejer bare rundt."); return; }
  playTrack(0);
}
function playTrack(i) {
  if (!playing) return;
  const P = playing;
  if (i >= P.tracks.length) { stopPlaying(); return; }
  P.idx = i;
  const tr = P.tracks[i];
  showNow(tr.title, (tr.other ? tr.artist + " (ikke fra pladen)" : tr.artist + " – " + P.rec.b));
  if (P.kind === "vinyl") sound.crackle(0.05, 1.2);
  sound.play(tr.url, () => { if (playing === P) playTrack(i + 1); }).catch(() => { if (playing === P) { ui.toast("Klippet kunne ikke spilles."); playTrack(i + 1); } });
  if (P.kind === "cd") setDisplay(gear.cdplayer.display, [String(i + 1).padStart(2, "0") + "  0:00"]);
}
function stopPlaying(quiet) {
  sound.stopClip();
  sound.crackle(0, 0.3);
  const tt = gear.turntable;
  tt.target.lift = 0.06;
  setTimeout(() => { tt.target.yaw = tt.yawRest; tt.target.speed = 0; }, quiet ? 0 : 400);
  gear.cdplayer.target = 0;
  setDisplay(gear.cdplayer.display, ["-- --:--"]);
  if (playing) {
    const P = playing;
    playing = null;
    // the record goes back where it came from
    if (P.disc.parent) P.disc.parent.remove(P.disc);
    if (P.disc.userData.dispose) P.disc.userData.dispose();
    dropInspect(P.I);
  }
  ui.show("now", false);
  if (mode === "play") showPlayCard();
}
function showNow(title, sub) {
  $("nowt").textContent = title; $("nowa").textContent = sub;
  ui.show("now", true);
}
function updateNow() {
  const p = sound.progress();
  $("nowp").style.width = (p * 100).toFixed(1) + "%";
  if (playing.kind === "vinyl" && playing.tracks.length) {
    const tt = gear.turntable, n = Math.max(1, playing.tracks.length);
    tt.target.yaw = lerp(tt.yawOuter, tt.yawInner, clamp((playing.idx + p) / n, 0, 1) * 0.95);
  } else if (playing.kind === "cd" && sound.audio) {
    const s = Math.floor(sound.audio.currentTime);
    if (s !== playing.lastS) { playing.lastS = s; setDisplay(gear.cdplayer.display, [String(playing.idx + 1).padStart(2, "0") + "  0:" + String(s).padStart(2, "0")]); }
  }
}
function showPlayCard() {
  if (!playing) { ui.card(null); ui.hint("Pladen er stoppet. Find en ny i kasserne.", 4000); return; }
  ui.card(playing.rec, { actions: [{ label: "Tilbage til butikken", icon: "back", main: true, run: goBack }, { label: "Næste nummer", icon: "next", run: () => playTrack(playing.idx + 1) }] });
}
$("nownext").addEventListener("click", () => { if (playing) playTrack(playing.idx + 1); });
$("nowstop").addEventListener("click", () => stopPlaying());
function goToCounter() {
  if (mode === "walk") back = walkPose();
  mode = "fly";
  const pv = playView();
  flyTo(pv.pos, pv.look).then(() => { mode = "play"; showPlayCard(); });
}

// ---------------------------------------------------------------- going back
function goBack() {
  if ($("search").classList.contains("hide") === false) return closeSearch();
  if (!$("help").classList.contains("hide")) return ui.show("help", false);
  if (mode === "inspect") return putBack();
  if (mode === "timefocus") return timeUnfocus();
  if (mode === "time") return exitPortal();
  if (mode === "crate" || mode === "cd" || mode === "play") {
    const from = mode;
    mode = "fly";
    ui.card(null); ui.show("crumb", false); ui.show("letters", false);
    if (from === "crate") crates.leave();
    if (from === "cd") cdwall.leave();
    const to = back || { pos: new V3(0, 1.62, 2.5), look: new V3(0, 1.1, -3) };
    back = null;
    return flyTo(to.pos, to.look).then(() => { syncWalkFromCamera(); mode = "walk"; });
  }
}

// ---------------------------------------------------------------- search, surprise
function openSearch() {
  ui.show("search", true);
  $("sq").value = ""; $("sres").innerHTML = '<div class="none">Skriv en kunstner, et album eller et årstal.</div>';
  setTimeout(() => $("sq").focus(), 30);
}
function closeSearch() { ui.show("search", false); $("sq").blur(); canvas.focus({ preventScroll: true }); }
let found = [], sel = 0;
$("sq").addEventListener("input", () => {
  const words = norm($("sq").value).split(" ").filter(Boolean);
  if (!words.length) { $("sres").innerHTML = '<div class="none">Skriv en kunstner, et album eller et årstal.</div>'; found = []; return; }
  found = data.records.filter((r) => words.every((w) => r.text.indexOf(w) >= 0));
  const q = words.join(" ");
  found.sort((a, b) => (norm(a.artist).indexOf(q) === 0 ? 0 : 1) - (norm(b.artist).indexOf(q) === 0 ? 0 : 1) || collator.compare(a.a, b.a) || (+a.y || 0) - (+b.y || 0));
  sel = 0;
  drawResults();
});
$("sq").addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(found.length - 1, sel + 1); drawResults(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); drawResults(); }
  else if (e.key === "Enter" && found[sel]) { e.preventDefault(); const r = found[sel]; closeSearch(); find(r); }
});
function drawResults() {
  if (!found.length) { $("sres").innerHTML = '<div class="none">Ingen plader passer på det.</div>'; return; }
  $("sres").innerHTML = found.slice(0, 60).map((r, i) => {
    const t = r.tint || guessTint(r);
    return '<button data-i="' + r.i + '" class="' + (i === sel ? "on" : "") + '"><span class="sw" style="background:rgb(' + t.join(",") + ')">' + (r.t === "Vinyl" ? "LP" : "CD") + '</span><span class="st"><b>' + esc(r.b) + "</b><span>" + esc(r.artist) + (r.y ? " · " + esc(r.y) : "") + "</span></span>" + (r.value ? '<span class="sk">' + kr(r.value) + "</span>" : "") + "</button>";
  }).join("") + (found.length > 60 ? '<div class="none">… og ' + num(found.length - 60) + " flere. Skriv lidt mere.</div>" : "");
  const on = $("sres").querySelector(".on"); if (on) on.scrollIntoView({ block: "nearest" });
}
$("sres").addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; const r = data.records[+b.getAttribute("data-i")]; closeSearch(); find(r); });
// In the tunnel a search flies to the record there; in the shop it walks to it.
function find(r) { if ((mode === "time" || mode === "timefocus") && tunnel.itemOf(r)) timeFind(r); else goTo(r); }
$("search").addEventListener("click", (e) => { if (e.target === $("search")) closeSearch(); });
$("bsearch").addEventListener("click", openSearch);
$("bhelp").addEventListener("click", () => ui.show("help", true));
$("hclose").addEventListener("click", () => ui.show("help", false));
$("help").addEventListener("click", (e) => { if (e.target === $("help")) ui.show("help", false); });
$("bshuffle").addEventListener("click", () => {
  sound.ensure();
  const pool = data.records.filter((r) => r.cover);
  const list = pool.length > 20 ? pool : data.records;
  if (mode === "time" || mode === "timefocus") {
    const r = tunnel.items[Math.floor(Math.random() * tunnel.items.length)].rec;
    ui.toast("Tidsmaskinen vælger en plade …", 2000);
    timeFind(r);
    return;
  }
  const r = list[Math.floor(Math.random() * list.length)];
  ui.toast("Butikken vælger en plade til dig …", 2200);
  goTo(r, { play: true });
});

// Finds a record in the shop: walks to its crate (or the CD wall), digs to it and takes it out.
async function goTo(rec, { play = false } = {}) {
  if (mode === "time" || mode === "timefocus") await exitPortal({ quiet: true });
  if (mode === "intro" || mode === "fly") return;
  if (inspect) { await putBack(); }
  if (mode === "play") { mode = "walk"; ui.card(null); }
  if (rec.t === "Vinyl") {
    const at = crates.locate(rec);
    if (!at) return;
    if (mode === "cd") { cdwall.leave(); mode = "walk"; }
    if (crates.active === at.c && mode === "crate") crates.setCursor(at.j);
    else { if (mode === "walk") back = walkPose(); await openCrate(at.c, at.j); }
    showCrateCard();
    await tweens.wait(0.45);
  } else {
    const i = cdwall.locate(rec);
    if (i < 0) return;
    if (mode === "crate") { crates.leave(); mode = "walk"; ui.show("crumb", false); ui.show("letters", false); }
    if (mode === "cd") { cdwall.setCursor(i); followCd(); showCdCard(); await tweens.wait(0.45); }
    else { if (mode === "walk") back = walkPose(); await openCd(i); }
  }
  await take();
  if (play) { await tweens.wait(0.6); playInspected(); }
}

// ---------------------------------------------------------------- the time journey
// Through the glowing doorway: the whole collection on a tunnel through the years.
const fade = (to, dur) => { const el = $("fade"), from = +el.style.opacity || 0; return tweens.add({ dur, ease: ease.inOut, update: (k) => { el.style.opacity = String(lerp(from, to, k)); } }); };
let lastYear = 0;
async function enterPortal() {
  if (mode !== "walk") return;
  const P = room.portal;
  back = null;
  mode = "fly";
  ui.card(null); ui.show("tip", false); ui.show("hint", false);
  sound.ensure();
  // walk up to the doorway and through it
  await flyTo(new V3(P.x - 2.3, 1.45, P.z), new V3(P.x, 1.25, P.z), { dur: 1.1, arc: 0 });
  const through = flyTo(new V3(P.x + 0.4, 1.25, P.z), new V3(P.x + 3, 1.25, P.z), { dur: 1.0, easing: ease.in, arc: 0 });
  await tweens.wait(0.45);
  $("fade").style.background = "#fff1e0";
  await fade(1, 0.5);
  await through;
  if (!tunnel) {
    tunnel = new TimeTunnel(data.records, { mobile });
    tunnel.onChange = wake;
    renderer.compile(tunnel.scene, camera);
  }
  tunnel.reset();
  renderPass.scene = tunnel.scene;
  scene.visible = false;
  camera.userData.baseFov = undefined;
  camera.position.set(0, 0, tunnel.z); camera.quaternion.identity();
  tunnel.updateHeroes(tunnel.z, true);
  mode = "time";
  lastYear = 0;
  ui.show("tt", true); ui.show("ttbar", true);
  setBackLink(true);
  drawTimeline();
  fade(0, 1.1);
  const n = tunnel.items.length;
  ui.hint((mobile ? "Swipe" : "Scroll eller træk") + " for at rejse frem i tiden · Tryk på en plade", 7000);
  if (tunnel.withoutYear) setTimeout(() => { if (mode === "time") ui.toast(num(n) + " plader har et årstal. " + num(tunnel.withoutYear) + " uden årstal er blevet i butikken.", 4200); }, 2600);
}
async function exitPortal({ quiet = false } = {}) {
  if (mode !== "time" && mode !== "timefocus") return;
  mode = "fly";
  ui.card(null); ui.show("tip", false); ui.show("hint", false);
  ui.show("tt", false); ui.show("ttbar", false);
  setBackLink(false);
  await fade(1, quiet ? 0.3 : 0.45);
  renderPass.scene = scene;
  scene.visible = true;
  camera.fov = fovFor(camera.aspect); camera.userData.baseFov = undefined; camera.updateProjectionMatrix();
  const P = room.portal;
  placeCamera(new V3(P.x - 0.6, 1.5, P.z), new V3(P.x - 4, 1.3, P.z));
  const done = flyTo(new V3(P.x - 1.9, 1.62, P.z), new V3(P.x - 5, 1.25, P.z), { dur: 1.1, easing: ease.out, arc: 0 });
  fade(0, 0.8);
  await done;
  syncWalkFromCamera();
  mode = "walk";
}
// The "Samlingen" button at the top takes you out of the tunnel instead, while you are in it.
function setBackLink(inTime) {
  const b = $("back"), l = b.querySelector(".lbl");
  l.textContent = inTime ? "Butikken" : "Samlingen";
  document.body.classList.toggle("time", inTime);
  b.setAttribute("aria-label", inTime ? "Tilbage til butikken" : "Tilbage til samlingen");
}
$("back").addEventListener("click", (e) => { if (mode === "time" || mode === "timefocus" || (mode === "fly" && renderPass.scene !== scene)) { e.preventDefault(); if (mode !== "fly") exitPortal(); } });

function timeFocus(it) {
  if (!it) return;
  tunnel.selected = it;
  tunnel.updateHeroes(camera.position.z, true);
  const v = tunnel.viewOf(it);
  mode = "timefocus";
  ui.show("ttbar", false); ui.show("hint", false); ui.show("tt", false);
  camera.fov = camera.userData.baseFov || camera.fov; camera.updateProjectionMatrix();
  flyTo(v.pos, v.look, { dur: 1.0, arc: 0 });
  const rec = it.rec;
  const links = ['<a href="' + esc(collectionLink(rec)) + '">Se den i samlingen ›</a>'];
  if (rec.price && rec.price.u) links.push('<a href="' + esc(rec.price.u) + '" target="_blank" rel="noopener">Discogs ›</a>');
  const d = decadeInfo(it.year);
  ui.card(rec, { extra: "Fra " + it.year + ", en af " + num(tunnel.count[it.year]) + " plader fra det år i samlingen (" + d.name + ").<br>" + links.join(" &nbsp; "), actions: [
    { label: "Spil den", icon: "play", main: true, run: () => leaveTunnelTo(rec, true) },
    { label: "Find den i butikken", icon: "open", run: () => leaveTunnelTo(rec, false) },
    { label: "Videre", icon: "back", run: timeUnfocus },
  ] });
}
function timeUnfocus() {
  if (mode !== "timefocus") return;
  const it = tunnel.selected;
  tunnel.selected = null;
  ui.card(null); ui.show("ttbar", true); ui.show("tt", true);
  const z = clamp(it.pos.z + 2.4, tunnel.minZ(), tunnel.maxZ());
  mode = "fly";
  flyTo(new V3(0, 0, z), new V3(0, 0, z - 6), { dur: 0.9, arc: 0 }).then(() => {
    tunnel.z = tunnel.target = z; tunnel.v = 0; tunnel.sway.set(0, 0); tunnel.swayV.set(0, 0);
    mode = "time";
  });
}
async function leaveTunnelTo(rec, play) {
  await exitPortal({ quiet: true });
  goTo(rec, { play });
}
// Fly to a record inside the tunnel (from search or "Overrask mig").
function timeFind(rec) {
  const it = tunnel.itemOf(rec);
  if (!it) { ui.toast("Den plade har ikke et årstal, så den er ikke med på tidsrejsen."); return false; }
  if (mode === "timefocus") { tunnel.selected = null; ui.card(null); }
  const z = clamp(it.pos.z + 2.4, tunnel.minZ(), tunnel.maxZ());
  mode = "fly";
  ui.show("ttbar", false);
  const far = Math.abs(camera.position.z - z) > 12;
  tunnel.updateHeroes(it.pos.z + 1, true);
  flyTo(new V3(0, 0, z), new V3(0, 0, z - 6), { dur: far ? 2.2 : 1.1, easing: ease.inOut, arc: 0 }).then(() => {
    tunnel.z = tunnel.target = z; tunnel.v = 0;
    timeFocus(it);
  });
  return true;
}

// The bar at the bottom: how many records there are from each year, and where you are.
function drawTimeline() {
  const c = $("tth");
  if (!tunnel || !c.clientWidth) return;
  const d = Math.min(2, devicePixelRatio || 1), W = Math.round(c.clientWidth * d), H = Math.round(c.clientHeight * d);
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const g = c.getContext("2d");
  g.clearRect(0, 0, W, H);
  const n = tunnel.y1 - tunnel.y0 + 1, bw = W / n, base = H - 15 * d, top = 4 * d;
  for (let i = 0; i < n; i++) {
    const y = tunnel.y0 + i, k = tunnel.count[y] || 0;
    if (!k) continue;
    const h = Math.max(2 * d, Math.pow(k / tunnel.max, 0.75) * (base - top));
    const col = "#" + new THREE.Color(decadeInfo(y).glow).getHexString();
    g.globalAlpha = y === tunnel.year ? 1 : 0.5;
    g.fillStyle = y === tunnel.year ? "#ffffff" : col;
    g.fillRect(i * bw + Math.min(1, bw * 0.15) * d, base - h, Math.max(1, bw - Math.min(2, bw * 0.3) * d), h);
  }
  g.globalAlpha = 1;
  // where you are
  const x = (tunnel.year - tunnel.y0 + 0.5) * bw;
  g.fillStyle = "#fff"; g.fillRect(x - d, top - 2 * d, 2 * d, base - top + 4 * d);
  // the decades underneath
  g.font = `600 ${10.5 * d}px ${T.FONT}`; g.textBaseline = "bottom"; g.textAlign = "left";
  let lastX = -1e9;
  for (let y = Math.ceil(tunnel.y0 / 10) * 10; y <= tunnel.y1; y += 10) {
    const lx = (y - tunnel.y0) * bw;
    const txt = W / d < 420 ? "'" + String(y).slice(2) : String(y);
    if (lx - lastX < g.measureText(txt).width + 8 * d) continue;
    g.fillStyle = "rgba(255,244,230,.25)"; g.fillRect(lx, base + 2 * d, d, 4 * d);
    g.fillStyle = "rgba(255,244,230,.6)"; g.fillText(txt, lx + 3 * d, H);
    lastX = lx;
  }
}
function updateTimeHud() {
  if (!tunnel || tunnel.year === lastYear) return;
  lastYear = tunnel.year;
  const y = tunnel.year, k = tunnel.count[y] || 0, info = decadeInfo(y);
  $("tty").textContent = y;
  $("tty").style.setProperty("--g", "#" + new THREE.Color(info.glow).getHexString());
  $("tts").textContent = (k ? num(k) + (k === 1 ? " plade" : " plader") : "Ingen plader") + " · " + info.name;
  drawTimeline();
}
{
  const c = $("tth");
  let on = false;
  const at = (e) => {
    const r = c.getBoundingClientRect();
    const y = Math.round(tunnel.y0 - 0.5 + ((e.clientX - r.left) / r.width) * (tunnel.y1 - tunnel.y0 + 1));
    tunnel.jumpTo(clamp(y, tunnel.y0, tunnel.y1));
    wake();
  };
  c.addEventListener("pointerdown", (e) => { if (mode !== "time") return; on = true; try { c.setPointerCapture(e.pointerId); } catch (err) {} at(e); });
  c.addEventListener("pointermove", (e) => { if (on && mode === "time") at(e); });
  const off = () => { on = false; };
  c.addEventListener("pointerup", off); c.addEventListener("pointercancel", off);
}

window.__butik = { get mode() { return mode; }, get tunnel() { return tunnel; }, get room() { return room; }, exitPortal, timeFind, timeFocus, timeUnfocus, crates: () => crates, cdwall: () => cdwall, goTo: (i, o) => goTo(data.records[i], o), data: () => data, camera, scene, renderer, sound, walk, openCrate, openCd, take, playInspected, flipInspected, putBack, goBack, dig, enterPortal, get inspect() { return inspect; }, get playing() { return playing; }, tap: onTap };
