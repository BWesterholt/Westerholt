// The counter: a turntable, a top-loading CD player, an amplifier with VU meters, the till and a
// "Spiller nu" stand, plus the sound: 30-second clips, the crackle of the needle and the light
// show that follows the music.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three";
import * as T from "./textures.js";
import { COUNTER } from "./room.js";
import { clamp, lerp, spring } from "./util.js";

const Y = COUNTER.top;

export function buildCounterGear(scene, { mobile = false } = {}) {
  const gear = {};
  const walnut = new THREE.MeshStandardMaterial({ map: T.darkWood(31, { hue: 24, lig: 24 }), roughness: 0.45 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.42, metalness: 0.3 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.28, metalness: 1 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 1 });

  // ---- Turntable
  const tt = new THREE.Group();
  tt.position.set(-0.55, Y, COUNTER.z + 0.02);
  scene.add(tt);
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.085, 0.37, 3, 0.012), walnut);
  plinth.position.y = 0.0425; plinth.castShadow = true; plinth.receiveShadow = true; tt.add(plinth);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.004, 0.35), black); plate.position.y = 0.086; plate.receiveShadow = true; tt.add(plate);
  const platterGroup = new THREE.Group(); platterGroup.position.set(-0.055, 0.088, 0.005); tt.add(platterGroup);
  const strobe = strobeTexture();
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.022, 96), [new THREE.MeshStandardMaterial({ map: strobe, color: 0xdfe2e6, roughness: 0.3, metalness: 1 }), alu, alu]);
  platter.position.y = 0.011; platter.castShadow = true; platterGroup.add(platter);
  const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.149, 0.149, 0.003, 96), new THREE.MeshStandardMaterial({ color: 0x1a1a1b, roughness: 0.95 }));
  mat.position.y = 0.0235; platterGroup.add(mat);
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.022, 12), chrome); spindle.position.y = 0.034; platterGroup.add(spindle);
  // the place a record lies on the platter
  const discSpot = new THREE.Object3D(); discSpot.position.y = 0.0262; platterGroup.add(discSpot);
  // tonearm
  const pivot = new THREE.Group(); pivot.position.set(0.155, 0.088, -0.115); tt.add(pivot);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.025, 32), alu); base.position.y = 0.0125; pivot.add(base);
  const arm = new THREE.Group(); arm.position.y = 0.05; pivot.add(arm);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 16), chrome); post.position.y = -0.025; arm.add(post);
  const L = 0.232;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, L, 12), chrome); tube.rotation.x = Math.PI / 2; tube.position.z = L / 2 - 0.02; arm.add(tube);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.006, 0.045), black); shell.position.set(-0.006, -0.004, L - 0.005); shell.rotation.y = 0.35; arm.add(shell);
  const stylus = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.012), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 })); stylus.position.set(-0.008, -0.011, L); arm.add(stylus);
  const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 24), alu); weight.rotation.x = Math.PI / 2; weight.position.z = -0.055; arm.add(weight);
  const rest = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.045, 8), black); rest.position.set(0.19, 0.11, 0.06); tt.add(rest);
  // the arm's angle for a point at a given distance from the record's centre
  const pc = new THREE.Vector2(platterGroup.position.x - pivot.position.x, platterGroup.position.z - pivot.position.z);
  const yawFor = (radius) => {
    let best = 0, bestErr = 9;
    for (let a = -1.2; a <= 1.2; a += 0.0025) { const sx = Math.sin(a) * L, sz = Math.cos(a) * L; const e = Math.abs(Math.hypot(sx - pc.x, sz - pc.y) - radius); if (e < bestErr && sz > 0) { bestErr = e; best = a; } }
    return best;
  };
  const yawOuter = yawFor(0.146), yawInner = yawFor(0.062), yawRest = 0.08;
  arm.rotation.y = yawRest;
  // buttons and a little red light
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 20), alu);
  btn.position.set(-0.19, 0.09, 0.15); tt.add(btn);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.004, 10, 8), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a1a, emissiveIntensity: 0 })); lamp.position.set(-0.19, 0.09, -0.15); tt.add(lamp);
  // dust cover, open
  const hinge = new THREE.Group(); hinge.position.set(0, 0.088, -0.185); tt.add(hinge);
  const lidMat = new THREE.MeshStandardMaterial({ color: 0x8090a0, transparent: true, opacity: 0.16, roughness: 0.05, envMapIntensity: 2, depthWrite: false, side: THREE.DoubleSide });
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.07, 0.36), lidMat); lid.position.set(0, 0.035, 0.18); hinge.add(lid);
  hinge.rotation.x = -1.25;
  gear.turntable = { group: tt, platter: platterGroup, arm, discSpot, lamp, yawOuter, yawInner, yawRest, spin: 0, speed: 0, armYaw: yawRest, armLift: 0.06, armV: 0, liftV: 0, target: { speed: 0, yaw: yawRest, lift: 0.06 } };
  arm.rotation.x = -0.06;

  // ---- Amplifier with two VU meters
  const amp = new THREE.Group(); amp.position.set(0.2, Y, COUNTER.z - 0.05); scene.add(amp);
  const ampBody = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.12, 0.3, 3, 0.01), new THREE.MeshStandardMaterial({ color: 0xbfc2c6, metalness: 1, roughness: 0.35 }));
  ampBody.position.y = 0.06; ampBody.castShadow = true; amp.add(ampBody);
  const vuTex = vuFace();
  gear.needles = [];
  for (const x of [-0.1, 0.06]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshStandardMaterial({ map: vuTex, emissive: 0xffffff, emissiveMap: vuTex, emissiveIntensity: 0.0, roughness: 0.4 }));
    face.position.set(x, 0.065, 0.151); amp.add(face);
    const n = new THREE.Group(); n.position.set(x, 0.04, 0.153); amp.add(n);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.05, 0.0005), new THREE.MeshBasicMaterial({ color: 0x1a1008 })); needle.position.y = 0.025; n.add(needle);
    n.rotation.z = 0.7;
    gear.needles.push({ n, face, v: 0, a: 0.7 });
  }
  for (const x of [0.15, 0.185]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.018, 24), alu); k.rotation.x = Math.PI / 2; k.position.set(x, 0.06, 0.158); amp.add(k); }

  // ---- Top-loading CD player
  const cd = new THREE.Group(); cd.position.set(0.82, Y, COUNTER.z + 0.02); scene.add(cd);
  const cdBody = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.06, 0.3, 3, 0.012), new THREE.MeshStandardMaterial({ color: 0x1b1c1f, metalness: 0.7, roughness: 0.3 }));
  cdBody.position.y = 0.03; cdBody.castShadow = true; cd.add(cdBody);
  const well = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.005, 64), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.6 })); well.position.set(0, 0.058, -0.02); cd.add(well);
  const cdSpin = new THREE.Group(); cdSpin.position.set(0, 0.064, -0.02); cd.add(cdSpin);
  const cdHinge = new THREE.Group(); cdHinge.position.set(0, 0.062, -0.1); cd.add(cdHinge);
  const cdLid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.006, 64), new THREE.MeshStandardMaterial({ color: 0x223344, transparent: true, opacity: 0.32, roughness: 0.05, envMapIntensity: 2, depthWrite: false }));
  cdLid.position.set(0, 0.004, 0.08); cdHinge.add(cdLid);
  const disp = T.display([{ text: "-- --:--" }], { w: 256, h: 64, color: "#9fe8ff", bg: "#020a10" });
  const cdDisp = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.0275), new THREE.MeshBasicMaterial({ map: disp.texture, color: new THREE.Color(1.4, 1.4, 1.4) }));
  cdDisp.rotation.x = -0.9; cdDisp.position.set(0, 0.062, 0.12); cd.add(cdDisp);
  gear.cdplayer = { group: cd, spin: cdSpin, hinge: cdHinge, display: disp, speed: 0, rot: 0, open: 0, openV: 0, openTarget: 0 };

  // ---- The till, showing what the whole collection is worth
  const till = new THREE.Group(); till.position.set(1.72, Y, COUNTER.z - 0.02); till.rotation.y = -0.35; scene.add(till);
  const cream = new THREE.MeshStandardMaterial({ color: 0xd8cbb3, roughness: 0.5, metalness: 0.2 });
  const tb = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.12, 0.34, 3, 0.02), cream); tb.position.y = 0.06; tb.castShadow = true; till.add(tb);
  const keys = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.06, 0.16, 2, 0.01), black); keys.position.set(0, 0.13, 0.06); keys.rotation.x = 0.35; till.add(keys);
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.11, 0.12, 2, 0.015), cream); head.position.set(0, 0.2, -0.1); till.add(head);
  const tillDisp = T.display([{ text: "VELKOMMEN" }], { w: 512, h: 128 });
  const tillScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.055), new THREE.MeshBasicMaterial({ map: tillDisp.texture, color: new THREE.Color(1.5, 1.5, 1.5) }));
  tillScreen.position.set(0, 0.21, -0.039); till.add(tillScreen);
  gear.till = { display: tillDisp };

  // ---- "Spiller nu" stand
  const stand = new THREE.Group(); stand.position.set(-1.45, Y, COUNTER.z - 0.08); scene.add(stand);
  const sb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.12), walnut); sb.position.y = 0.01; stand.add(sb);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.012), walnut); lip.position.set(0, 0.025, 0.045); stand.add(lip);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.015), walnut); back.position.set(0, 0.12, -0.03); back.rotation.x = -0.25; stand.add(back);
  const sc = T.canvas(512, 96), sg = sc.getContext("2d");
  sg.fillStyle = "#14100d"; sg.fillRect(0, 0, 512, 96); sg.fillStyle = "#F2E3C6"; sg.font = `800 54px ${T.FONT}`; sg.textAlign = "center"; sg.textBaseline = "middle"; sg.fillText("SPILLER NU", 256, 50);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.0375), new THREE.MeshStandardMaterial({ map: T.texture(sc), roughness: 0.5 })); plaque.position.set(0, 0.026, 0.052); stand.add(plaque);
  const slot = new THREE.Object3D(); slot.position.set(0, 0.17, 0.0); slot.rotation.x = -0.25; stand.add(slot);
  gear.stand = { group: stand, slot };

  // ---- A light strip on the front of the counter that follows the music
  const bars = 40, barGeo = new THREE.BoxGeometry(0.06, 1, 0.01);
  const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true });
  const strip = new THREE.InstancedMesh(barGeo, barMat, bars);
  const col = new THREE.Color();
  for (let i = 0; i < bars; i++) { col.setHSL(0.03 + (i / bars) * 0.1, 0.95, 0.55); strip.setColorAt(i, col.multiplyScalar(2)); }
  strip.position.set(0, 0, COUNTER.z + COUNTER.depth / 2 + 0.006);
  scene.add(strip);
  gear.strip = { mesh: strip, n: bars, levels: new Float32Array(bars) };
  gear.setStrip = (levels) => {
    const m = new THREE.Matrix4();
    let any = false;
    for (let i = 0; i < bars; i++) {
      // silent bars are left out altogether: even squashed flat they drew a dashed line
      const on = levels[i] > 0.004, h = on ? levels[i] * 0.55 : 0;
      any = any || on;
      if (on) m.makeScale(1, h, 1); else m.makeScale(0, 0, 0);
      m.setPosition(-COUNTER.len / 2 + 0.2 + i * ((COUNTER.len - 0.4) / (bars - 1)), 0.2 + h / 2, 0);
      strip.setMatrixAt(i, m);
    }
    strip.visible = any;
    strip.instanceMatrix.needsUpdate = true;
  };
  gear.setStrip(new Float32Array(bars));
  return gear;
}

function strobeTexture() {
  const c = T.canvas(1024, 32), g = c.getContext("2d");
  g.fillStyle = "#c9ccd1"; g.fillRect(0, 0, 1024, 32);
  for (let row = 0; row < 3; row++) { const n = [180, 150, 120][row]; for (let i = 0; i < n; i++) { g.fillStyle = "#6b6f75"; g.fillRect((i / n) * 1024, 2 + row * 10, 1024 / n / 2, 7); } }
  return T.texture(c);
}
function vuFace() {
  const c = T.canvas(256, 128), g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#ffdc9a"); gr.addColorStop(1, "#f0b45a");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "#2a1a08"; g.lineWidth = 2; g.beginPath(); g.arc(128, 150, 110, Math.PI * 1.22, Math.PI * 1.78); g.stroke();
  g.strokeStyle = "#b8231a"; g.lineWidth = 5; g.beginPath(); g.arc(128, 150, 110, Math.PI * 1.62, Math.PI * 1.78); g.stroke();
  g.fillStyle = "#2a1a08"; g.font = `700 18px ${T.FONT}`; g.textAlign = "center"; g.fillText("VU", 128, 96);
  for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.22 + i * 0.056); g.beginPath(); g.moveTo(128 + Math.cos(a) * 104, 150 + Math.sin(a) * 104); g.lineTo(128 + Math.cos(a) * 116, 150 + Math.sin(a) * 116); g.stroke(); }
  return T.texture(c);
}

// Moves the turntable, the CD player and the meters a little each frame.
export function updateGear(gear, dt, lv) {
  const tt = gear.turntable;
  [tt.speed] = spring(tt.speed, 0, tt.target.speed, tt.target.speed > tt.speed ? 2.2 : 1.4, dt);
  tt.spin += tt.speed * dt;
  tt.platter.rotation.y = -tt.spin;
  [tt.armYaw, tt.armV] = spring(tt.armYaw, tt.armV, tt.target.yaw, 3.2, dt);
  [tt.armLift, tt.liftV] = spring(tt.armLift, tt.liftV, tt.target.lift, 6, dt);
  tt.arm.rotation.y = tt.armYaw;
  tt.arm.rotation.x = -tt.armLift;
  tt.lamp.material.emissiveIntensity = tt.target.speed > 0 ? 3 : 0.2;
  const cd = gear.cdplayer;
  [cd.speed] = spring(cd.speed, 0, cd.target || 0, 3, dt);
  cd.rot += cd.speed * dt;
  cd.spin.rotation.y = -cd.rot;
  [cd.open, cd.openV] = spring(cd.open, cd.openV, cd.openTarget, 7, dt);
  cd.hinge.rotation.x = -cd.open * 1.6;
  for (let i = 0; i < gear.needles.length; i++) {
    const nd = gear.needles[i];
    const want = 0.7 - clamp((i ? lv.right : lv.left) * 1.5, 0, 1.4);
    [nd.a, nd.v] = spring(nd.a, nd.v, want, 14, dt);
    nd.n.rotation.z = nd.a;
    nd.face.material.emissiveIntensity = lv.on * 0.9;
  }
  const s = gear.strip;
  for (let i = 0; i < s.n; i++) { const b = lv.bands ? lv.bands[i] || 0 : 0; s.levels[i] = Math.max(b, s.levels[i] - dt * 1.6); }
  gear.setStrip(s.levels);
  return tt.speed > 0.01 || Math.abs(tt.armYaw - tt.target.yaw) > 0.001 || cd.speed > 0.01 || Math.abs(cd.open - cd.openTarget) > 0.002 || lv.on > 0;
}

export function setDisplay(d, lines) {
  const g = d.canvas.getContext("2d"), w = d.canvas.width, h = d.canvas.height;
  g.fillStyle = d.bg || "#06140d"; g.fillRect(0, 0, w, h);
  const color = d.color || "#7CFFB2";
  g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 10; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((l, i) => { g.font = `700 ${Math.round(h * (lines.length > 1 ? 0.34 : 0.46))}px ui-monospace, Menlo, Consolas, monospace`; g.fillText(l, w / 2, lines.length > 1 ? h * (0.3 + i * 0.42) : h * 0.53); });
  g.shadowBlur = 0;
  d.texture.needsUpdate = true;
}

// ---- Sound
export class Sound {
  constructor() { this.ctx = null; this.audio = null; this.real = false; this.fake = 0; this.data = null; this.on = false; this.t0 = 0; }
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
      this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 512; this.analyser.smoothingTimeConstant = 0.72;
      this.master.connect(this.analyser); this.analyser.connect(this.ctx.destination);
      this.data = new Uint8Array(this.analyser.frequencyBinCount);
      this.crackleGain = this.ctx.createGain(); this.crackleGain.gain.value = 0; this.crackleGain.connect(this.master);
      const src = this.ctx.createBufferSource(); src.buffer = crackleBuffer(this.ctx); src.loop = true; src.connect(this.crackleGain); src.start();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return true;
  }
  crackle(level, time = 0.3) { if (!this.ctx) return; const g = this.crackleGain.gain; g.cancelScheduledValues(this.ctx.currentTime); g.setTargetAtTime(level, this.ctx.currentTime, time / 3); }
  // Plays a clip; resolves when it starts, rejects when it can't be played.
  play(url, onEnd) {
    this.stopClip();
    const tryOne = (cors) => new Promise((ok, fail) => {
      const a = new Audio();
      if (cors) a.crossOrigin = "anonymous";
      a.preload = "auto";
      a.src = url;
      a.volume = 1;
      let done = false;
      a.addEventListener("canplay", () => { if (done) return; done = true; ok(a); }, { once: true });
      a.addEventListener("error", () => { if (done) return; done = true; fail(new Error("audio")); }, { once: true });
      setTimeout(() => { if (!done) { done = true; fail(new Error("timeout")); } }, 12000);
      a.load();
    });
    return tryOne(true).then((a) => ({ a, cors: true })).catch(() => tryOne(false).then((a) => ({ a, cors: false }))).then(({ a, cors }) => {
      this.audio = a;
      this.real = false;
      if (cors && this.ctx) {
        try { const node = this.ctx.createMediaElementSource(a); node.connect(this.master); this.real = true; this.node = node; } catch (e) {}
      }
      a.addEventListener("ended", () => { if (this.audio === a) { this.on = false; onEnd && onEnd(); } });
      this.on = true;
      this.t0 = performance.now();
      return a.play().then(() => a);
    });
  }
  stopClip() {
    if (this.audio) { const a = this.audio; this.audio = null; a.pause(); a.removeAttribute("src"); a.load(); if (this.node) { try { this.node.disconnect(); } catch (e) {} this.node = null; } }
    this.on = false;
  }
  progress() { return this.audio && this.audio.duration ? this.audio.currentTime / this.audio.duration : 0; }
  // Music from somewhere this page can't listen to (Spotify's player): the made-up beat keeps the lights going.
  external(on) { if (on && !this.on) this.t0 = performance.now(); this.on = on; this.real = false; }
  // How loud the music is right now: bass, middle and treble, plus 40 bands for the light strip.
  levels(out) {
    out.on = this.on ? 1 : 0;
    if (!this.on) { out.bass = out.mid = out.high = out.left = out.right = 0; out.bands = null; return out; }
    if (this.real && this.analyser) {
      this.analyser.getByteFrequencyData(this.data);
      const d = this.data, avg = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += d[i]; return s / (b - a) / 255; };
      out.bass = avg(1, 8); out.mid = avg(8, 40); out.high = avg(40, 120);
      const bands = out.bands || (out.bands = new Float32Array(40));
      for (let i = 0; i < 40; i++) { const a = Math.floor(Math.pow(i / 40, 1.7) * 180) + 1, b = Math.floor(Math.pow((i + 1) / 40, 1.7) * 180) + 2; bands[i] = avg(a, b) * 1.15; }
    } else {
      // The clip's address didn't allow listening in: a made-up beat that keeps the lights alive.
      const t = this.audio ? this.audio.currentTime : (performance.now() - this.t0) / 1000;
      const beat = (t * 2.0) % 1, kick = Math.exp(-beat * 7), hat = Math.exp(-((t * 4 + 0.5) % 1) * 12);
      out.bass = 0.35 + kick * 0.55; out.mid = 0.35 + 0.2 * Math.sin(t * 3.1) + hat * 0.15; out.high = 0.25 + hat * 0.4;
      const bands = out.bands || (out.bands = new Float32Array(40));
      for (let i = 0; i < 40; i++) { const f = i / 40; bands[i] = clamp((1 - f) * out.bass * 0.9 + out.mid * 0.5 * Math.sin(f * 9 + t * 5) ** 2 + f * out.high * 0.6 + Math.random() * 0.08, 0, 1); }
    }
    out.left = out.bass * 0.6 + out.mid * 0.6; out.right = out.bass * 0.5 + out.mid * 0.7 + out.high * 0.2;
    return out;
  }
}

// The crackle and hiss of a needle in the groove.
function crackleBuffer(ctx) {
  const sr = ctx.sampleRate, n = sr * 4, buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1;
    lp = lp * 0.96 + white * 0.04;
    let v = lp * 0.25;
    if (Math.random() < 0.0009) v += (Math.random() * 2 - 1) * 0.9;
    if (Math.random() < 0.00008) for (let k = 0; k < 40 && i + k < n; k++) d[i + k] += (Math.random() * 2 - 1) * 0.5 * Math.exp(-k / 8);
    d[i] += v;
  }
  // a soft rumble at 33⅓ rpm
  for (let i = 0; i < n; i++) d[i] += Math.sin((i / sr) * Math.PI * 2 * 0.555) * 0.02;
  return buf;
}
