// The shop itself: floorboards, painted brick walls, the big window onto a sunny street, the counter,
// the lights, the neon sign, the doorway to the time journey, posters and dust in the air.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three";
import * as T from "./textures.js";
import { rng } from "./util.js";

export const ROOM = { x0: -6, x1: 6, z0: -7, z1: 6, h: 3.3 };
export const COUNTER = { x: 0, z: -5.4, top: 1.0, len: 4.4, depth: 0.7 };

export function buildRoom(scene, { mobile = false, tables = [] } = {}) {
  const R = ROOM, W = R.x1 - R.x0, D = R.z1 - R.z0, H = R.h;
  const room = { lights: {}, fixtures: [], pendants: [], colliders: [], pick: [], anim: [] };
  const add = (o) => { scene.add(o); return o; };

  // Floor
  const fb = T.floorboards();
  fb.map.repeat.set(W / fb.size[0], D / fb.size[1]); fb.rough.repeat.set(W / fb.size[0], D / fb.size[1]);
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: fb.map, roughnessMap: fb.rough, roughness: 1, metalness: 0 })));
  floor.rotation.x = -Math.PI / 2; floor.position.set((R.x0 + R.x1) / 2, 0, (R.z0 + R.z1) / 2);
  floor.receiveShadow = true;
  floor.userData.floor = true;
  room.floor = floor;

  // Ceiling, beams and ducts
  const ceil = add(new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0xc9c0b2, roughness: 0.95 })));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, (R.z0 + R.z1) / 2);
  const beamMat = new THREE.MeshStandardMaterial({ map: T.darkWood(9, { hue: 28, lig: 34 }), roughness: 0.8 });
  const beams = new THREE.InstancedMesh(new THREE.BoxGeometry(W, 0.24, 0.2), beamMat, 7);
  for (let i = 0; i < 7; i++) { const m = new THREE.Matrix4().makeTranslation(0, H - 0.12, 5 - i * 1.8); beams.setMatrixAt(i, m); }
  add(beams);
  const duct = new THREE.MeshStandardMaterial({ color: 0xc4c8cc, metalness: 0.7, roughness: 0.4 });
  for (const x of [-3.9, 3.9]) { const d = add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, D, 20), duct)); d.rotation.x = Math.PI / 2; d.position.set(x, H - 0.36, (R.z0 + R.z1) / 2); }

  // Walls: white-painted brick on the sides and the front, warm ochre behind the counter
  const brick = T.bricks({ paint: { h: 34, s: 22, l: 73, mortar: "#c9bfb0" } });
  const brickMat = (rx, ry) => { const m = brick.map.clone(), b = brick.bump.clone(); m.repeat.set(rx, ry); b.repeat.set(rx, ry); m.needsUpdate = b.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: m, bumpMap: b, bumpScale: 2.2, roughness: 0.92 }); };
  const left = add(new THREE.Mesh(new THREE.PlaneGeometry(D, H), brickMat(D / 2.4, H / 2.4)));
  left.rotation.y = Math.PI / 2; left.position.set(R.x0, H / 2, (R.z0 + R.z1) / 2); left.receiveShadow = true;
  const right = add(new THREE.Mesh(new THREE.PlaneGeometry(D, H), brickMat(D / 2.4, H / 2.4)));
  right.rotation.y = -Math.PI / 2; right.position.set(R.x1, H / 2, (R.z0 + R.z1) / 2); right.receiveShadow = true;
  const back = add(new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: T.plaster("#b88d4a"), roughness: 0.9 })));
  back.position.set(0, H / 2, R.z0);
  room.backWall = back;

  // The front: the shop window and the glass door, onto a wet street at night
  const WIN = { x0: -5.2, x1: 1.6, y0: 0.55, y1: 2.7 }, DOOR = { x0: 2.5, x1: 3.75, y1: 2.45 };
  const shape = new THREE.Shape();
  shape.moveTo(-6, 0); shape.lineTo(6, 0); shape.lineTo(6, H); shape.lineTo(-6, H); shape.closePath();
  const hole = (x0, x1, y0, y1) => { const p = new THREE.Path(); p.moveTo(-x1, y0); p.lineTo(-x0, y0); p.lineTo(-x0, y1); p.lineTo(-x1, y1); p.closePath(); shape.holes.push(p); };
  hole(WIN.x0, WIN.x1, WIN.y0, WIN.y1); hole(DOOR.x0, DOOR.x1, 0, DOOR.y1);
  const fm = brick.map.clone(), fbm = brick.bump.clone(); fm.repeat.set(1 / 2.4, 1 / 2.4); fbm.repeat.set(1 / 2.4, 1 / 2.4); fm.needsUpdate = fbm.needsUpdate = true;
  const front = add(new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ map: fm, bumpMap: fbm, bumpScale: 2.2, roughness: 0.92 })));
  front.rotation.y = Math.PI; front.position.set(0, 0, R.z1);
  front.castShadow = true; // so the sun comes in through the window only
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f2a26, roughness: 0.55, metalness: 0.2 });
  const box = (w, h, d, x, y, z, mat) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); return m; };
  // window frame, sill and mullions
  box(WIN.x1 - WIN.x0 + 0.12, 0.08, 0.3, (WIN.x0 + WIN.x1) / 2, WIN.y0 - 0.02, R.z1 - 0.05, frameMat);
  box(WIN.x1 - WIN.x0 + 0.12, 0.07, 0.16, (WIN.x0 + WIN.x1) / 2, WIN.y1 + 0.02, R.z1, frameMat);
  for (const x of [WIN.x0, WIN.x0 + (WIN.x1 - WIN.x0) / 3, WIN.x0 + (2 * (WIN.x1 - WIN.x0)) / 3, WIN.x1]) box(0.06, WIN.y1 - WIN.y0, 0.14, x, (WIN.y0 + WIN.y1) / 2, R.z1, frameMat).castShadow = true;
  box(0.07, DOOR.y1, 0.14, DOOR.x0, DOOR.y1 / 2, R.z1, frameMat); box(0.07, DOOR.y1, 0.14, DOOR.x1, DOOR.y1 / 2, R.z1, frameMat); box(DOOR.x1 - DOOR.x0, 0.08, 0.14, (DOOR.x0 + DOOR.x1) / 2, DOOR.y1, R.z1, frameMat);
  box(DOOR.x1 - DOOR.x0 - 0.1, 0.25, 0.05, (DOOR.x0 + DOOR.x1) / 2, 0.13, R.z1, frameMat);
  const handle = box(0.03, 0.4, 0.04, DOOR.x0 + 0.16, 1.05, R.z1 - 0.06, new THREE.MeshStandardMaterial({ color: 0xc9a44c, metalness: 1, roughness: 0.25 }));
  handle.castShadow = false;
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.1, roughness: 0.03, metalness: 0, envMapIntensity: 1.4, depthWrite: false });
  const glass = add(new THREE.Mesh(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), glassMat)); glass.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, R.z1 + 0.01); glass.rotation.y = Math.PI;
  const dglass = add(new THREE.Mesh(new THREE.PlaneGeometry(DOOR.x1 - DOOR.x0, DOOR.y1 - 0.3), glassMat)); dglass.position.set((DOOR.x0 + DOOR.x1) / 2, 0.3 + (DOOR.y1 - 0.3) / 2, R.z1 + 0.01); dglass.rotation.y = Math.PI;
  const street = add(new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshBasicMaterial({ map: T.dayStreet(), color: 0xdedede })));
  street.position.set(-1, 2.2, R.z1 + 3.2); street.rotation.y = Math.PI;
  const sidewalk = add(new THREE.Mesh(new THREE.PlaneGeometry(16, 3.2), new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 0.8, metalness: 0 })));
  sidewalk.rotation.x = -Math.PI / 2; sidewalk.position.set(-1, -0.02, R.z1 + 1.6);
  // gold letters on the window, seen from inside (mirrored), and the blue "ÅBEN" neon
  {
    const c = T.canvas(2048, 256), g = c.getContext("2d");
    g.translate(2048, 0); g.scale(-1, 1);
    g.font = `800 150px ${T.FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#d8b25a"; g.shadowColor = "rgba(0,0,0,.4)"; g.shadowBlur = 6;
    g.fillText("PLADER  ·  KØB & SALG", 1024, 130);
    const letters = add(new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.7), new THREE.MeshStandardMaterial({ map: T.texture(c), transparent: true, roughness: 0.3, metalness: 0.6, depthWrite: false })));
    letters.position.set((WIN.x0 + WIN.x1) / 2, 2.25, R.z1 - 0.005); letters.rotation.y = Math.PI;
    const open = T.neon([{ text: "ÅBEN", font: `800 300px ${T.FONT}`, color: "#3fa9ff", width: 16, x: 1024, y: 320 }]);
    open.center.set(0.5, 0.5); open.repeat.x = -1; open.wrapS = THREE.RepeatWrapping;
    const sign = add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.34), new THREE.MeshBasicMaterial({ map: open, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.6, 1.6, 1.6) })));
    sign.position.set(-3.6, 1.45, R.z1 - 0.12);
    room.openSign = sign;
  }
  const mat = add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshStandardMaterial({ map: T.doormat(), roughness: 1 })));
  mat.rotation.x = -Math.PI / 2; mat.rotation.z = Math.PI; mat.position.set((DOOR.x0 + DOOR.x1) / 2, 0.004, R.z1 - 0.5); mat.receiveShadow = true;

  // Skirting boards
  const skirt = new THREE.MeshStandardMaterial({ color: 0x6a4a31, roughness: 0.7 });
  box(0.03, 0.12, D, R.x0 + 0.015, 0.06, (R.z0 + R.z1) / 2, skirt); box(0.03, 0.12, D, R.x1 - 0.015, 0.06, (R.z0 + R.z1) / 2, skirt); box(W, 0.12, 0.03, 0, 0.06, R.z0 + 0.015, skirt);

  // The tables under the crates
  const tableTop = new THREE.MeshStandardMaterial({ map: T.darkWood(4, { hue: 26, lig: 34 }), roughness: 0.6 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1b1410, roughness: 0.6 });
  const stock = new THREE.MeshStandardMaterial({ color: 0x9c7a52, roughness: 0.95 });
  for (const t of tables) {
    const top = box(t.w, 0.05, t.d, t.x, 0.775, t.z, tableTop); top.castShadow = true; top.receiveShadow = true;
    const apron = box(t.w - 0.06, 0.12, t.d - 0.06, t.x, 0.69, t.z, legMat); apron.castShadow = true;
    const shelf = box(t.w - 0.06, 0.03, t.d - 0.06, t.x, 0.16, t.z, tableTop); shelf.receiveShadow = true;
    for (const dx of [-1, 1]) for (let k = 0; k <= 3; k++) { const leg = box(0.06, 0.75, 0.06, t.x + dx * (t.w / 2 - 0.05), 0.375, t.z - t.d / 2 + 0.05 + (k * (t.d - 0.1)) / 3, legMat); leg.castShadow = true; }
    // boxes of stock on the shelf underneath
    const r = rng(t.side * 7 + 3);
    for (let z = t.z - t.d / 2 + 0.25; z < t.z + t.d / 2 - 0.25; z += 0.42 + r() * 0.1) {
      if (r() < 0.25) continue;
      const b = box(0.36, 0.2 + r() * 0.1, 0.36, t.x + (r() - 0.5) * 0.08, 0.28, z, stock);
      b.rotation.y = (r() - 0.5) * 0.2; b.castShadow = true; b.receiveShadow = true;
    }
    room.colliders.push({ x0: t.x - t.w / 2 - 0.3, x1: t.x + t.w / 2 + 0.3, z0: t.z - t.d / 2 - 0.3, z1: t.z + t.d / 2 + 0.3 });
  }

  // The counter
  const C = COUNTER;
  const counterWood = new THREE.MeshStandardMaterial({ map: panelWood(), roughness: 0.65 });
  const body = box(C.len, C.top - 0.05, C.depth, C.x, (C.top - 0.05) / 2, C.z, counterWood); body.castShadow = true; body.receiveShadow = true;
  const topMat = new THREE.MeshStandardMaterial({ map: T.darkWood(12, { hue: 22, lig: 32 }), roughness: 0.35, metalness: 0.05 });
  const ctop = add(new THREE.Mesh(new RoundedBoxGeometry(C.len + 0.12, 0.06, C.depth + 0.1, 3, 0.02), topMat));
  ctop.position.set(C.x, C.top - 0.03, C.z + 0.02); ctop.castShadow = true; ctop.receiveShadow = true;
  room.colliders.push({ x0: C.x - C.len / 2 - 0.35, x1: C.x + C.len / 2 + 0.35, z0: R.z0, z1: C.z + C.depth / 2 + 0.35 });

  // Big speakers either side of the wall behind the counter; their cones move with the music
  room.cones = [];
  const cab = new THREE.MeshStandardMaterial({ map: T.darkWood(17, { hue: 18, lig: 12 }), roughness: 0.7 });
  const grill = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.9 });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.6 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x8a7a62, metalness: 0.8, roughness: 0.35 });
  for (const x of [-3.1, 3.1]) {
    const s = new THREE.Group(); s.position.set(x, 0, R.z0 + 0.45); add(s);
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.62, 1.25, 0.5, 3, 0.03), cab); c.position.y = 0.66; c.castShadow = true; s.add(c);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 1.12), grill); face.position.set(0, 0.66, 0.251); s.add(face);
    for (const [y, r] of [[0.42, 0.2], [0.86, 0.12], [1.12, 0.05]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 48), ringMat); ring.position.set(0, y, 0.26); s.add(ring);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, r * 0.45, 40, 1, true), coneMat); cone.rotation.x = -Math.PI / 2; cone.position.set(0, y, 0.245); s.add(cone);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), coneMat); cap.rotation.x = Math.PI / 2; cap.position.set(0, y, 0.25); s.add(cap);
      room.cones.push({ cone, cap, base: 0.245, r });
    }
  }

  // Lights. The fluorescent tubes over the tables come on one by one when you arrive.
  const hemi = new THREE.HemisphereLight(0xfff0dc, 0x8a6a4a, 0.0); add(hemi); room.lights.hemi = hemi;
  const key = new THREE.DirectionalLight(0xffe3c2, 0.0);
  key.position.set(1.8, 7, 2.4); key.target.position.set(0, 0, 0.3);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -3.4, right: 3.4, top: 4.6, bottom: -4.6, near: 2, far: 12 });
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.025; key.shadow.radius = 3;
  add(key); add(key.target); room.lights.key = key;
  const tubeHouse = new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.5, metalness: 0.3 });
  const aisle = [];
  const zs = tables.length ? [tables[0].z + tables[0].d / 3, tables[0].z, tables[0].z - tables[0].d / 3] : [2, 0.5, -1];
  zs.forEach((z, i) => {
    const light = new THREE.PointLight(0xfff0dc, 0, 9, 2); light.position.set(0, 2.75, z); add(light); aisle.push(light);
    const mats = [];
    for (const x of [-1.5, 1.5]) {
      const g = new THREE.Group(); g.position.set(x, H - 0.42, z); add(g);
      const hs = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 1.3), tubeHouse); g.add(hs);
      const tm = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff3e2, emissiveIntensity: 0, roughness: 0.4 });
      for (const dx of [-0.045, 0.045]) { const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.22, 10), tm); tube.rotation.x = Math.PI / 2; tube.position.set(dx, -0.04, 0); g.add(tube); }
      for (const dz of [-0.6, 0.6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.42, 4), legMat); w.position.set(0, 0.23, dz); g.add(w); }
      mats.push(tm);
    }
    room.fixtures.push({ light, mats, base: 7.5, on: 0 });
  });
  room.lights.aisle = aisle;
  // Pendants over the counter: warm bulbs that glow
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x2b3b33, roughness: 0.45, metalness: 0.6, side: THREE.DoubleSide });
  for (const x of [-1.4, 0, 1.4]) {
    const g = new THREE.Group(); g.position.set(x, 2.35, C.z + 0.05); add(g);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 32, 1, true), shadeMat); shade.position.y = 0.05; g.add(shade);
    const bm = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffa04a, emissiveIntensity: 0, roughness: 0.3 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), bm); bulb.position.y = -0.04; g.add(bulb);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, H - 2.4, 5), legMat); cord.position.y = (H - 2.35) / 2 + 0.1; g.add(cord);
    room.pendants.push({ mat: bm, on: 0 });
  }
  const spot = new THREE.SpotLight(0xffb978, 0, 7, 0.62, 0.7, 2);
  spot.position.set(-0.2, 2.9, C.z + 0.6); spot.target.position.set(-0.4, C.top, C.z - 0.05);
  if (!mobile) { spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0008; spot.shadow.normalBias = 0.02; }
  add(spot); add(spot.target); room.lights.counter = spot;
  const wallSpot = new THREE.SpotLight(0xffd7a8, 0, 6, 0.75, 0.55, 2);
  wallSpot.position.set(0, 3.1, R.z0 + 1.9); wallSpot.target.position.set(0, 1.85, R.z0);
  add(wallSpot); add(wallSpot.target); room.lights.wall = wallSpot;
  const windowLight = new THREE.PointLight(0xfff1de, 0, 8, 2); windowLight.position.set(-1.8, 1.8, R.z1 - 0.6); add(windowLight); room.lights.window = windowLight;
  // Afternoon sun through the shop window: it falls in patches shaped like the window panes.
  const sun = new THREE.SpotLight(0xffeccc, 0, 16, 0.72, 0.45, 2);
  sun.position.set(-2.1, 3.5, R.z1 + 2.9); sun.target.position.set(-1.3, 0, 2.4);
  if (!mobile) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.camera.near = 1.5; sun.shadow.camera.far = 16; }
  add(sun); add(sun.target); room.lights.sun = sun;

  // The neon sign hanging over the counter
  const neonTex = T.neon([
    { text: "Westerholt", font: `italic 700 230px ${T.SERIF}`, color: "#ff9447", core: "#ffd9b8", width: 12, x: 1024, y: 200 },
    { text: "PLADER", font: `900 300px ${T.FONT}`, color: "#ff4b33", core: "#ffe9e2", width: 17, x: 1024, y: 470 },
  ]);
  const neonMat = new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0, 0, 0) });
  const neonSign = add(new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.72), neonMat));
  neonSign.position.set(0, 2.62, C.z + 0.9);
  const backing = add(new THREE.Mesh(new THREE.PlaneGeometry(2.36, 0.78), new THREE.MeshStandardMaterial({ color: 0x141211, roughness: 0.3 })));
  backing.position.set(0, 2.62, C.z + 0.885);
  for (const x of [-1, 1]) { const w = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, H - 2.98, 4), legMat)); w.position.set(x, 2.98 + (H - 2.98) / 2, C.z + 0.88); }
  const neonLight = new THREE.PointLight(0xff6a45, 0, 7, 2); neonLight.position.set(0, 2.3, C.z + 1.35); add(neonLight);
  room.neon = { mat: neonMat, light: neonLight, on: 0, base: 2.6 };

  // Soft light cones: from the counter lamp and the spotlight on the wall of treasures
  room.cones3d = [];
  room.cones3d.push(lightCone(add, 0.16, 1.05, 1.95, new THREE.Vector3(-0.2, 2.25, C.z + 0.25), 0xffb36b, 0.05));
  room.cones3d.push(lightCone(add, 0.08, 1.2, 2.2, new THREE.Vector3(0, 3.1, R.z0 + 1.0), 0xffe0b8, 0.035, -0.35));

  // Dust in the air
  room.dust = dust(add, mobile ? 260 : 700);

  // Plants and a rug, so it feels lived in
  const leaves = [1, 2, 3].map((k) => new THREE.MeshStandardMaterial({ map: T.leaf(k), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }));
  const pot = new THREE.MeshStandardMaterial({ color: 0xb0623d, roughness: 0.9 });
  for (const [x, z, sc, seed] of [[-5.35, 5.25, 1.15, 3], [2.95, -4.85, 0.95, 8], [4.6, 5.3, 1.05, 5], [-5.35, -6.35, 1.2, 11]]) {
    room.colliders.push(plant(add, x, z, sc, seed, leaves, pot, mobile));
  }
  const rugMesh = add(new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.75), new THREE.MeshStandardMaterial({ map: T.rug(), roughness: 1 })));
  rugMesh.rotation.x = -Math.PI / 2; rugMesh.position.set(0, 0.004, C.z + 1.55); rugMesh.receiveShadow = true;

  // The doorway to the time journey on the right wall
  room.portal = portal(add, R.x1, -0.35);
  room.pick.push(room.portal.mesh);

  return room;
}

// A potted plant: a terracotta pot and long leaves bending outwards. Returns its collider.
function plant(add, x, z, sc, seed, mats, potMat, mobile) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(sc); add(g);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.36, 24), potMat); p.position.y = 0.18; p.castShadow = true; p.receiveShadow = true; g.add(p);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 8, 24), potMat); rim.rotation.x = Math.PI / 2; rim.position.y = 0.36; g.add(rim);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 1 })); soil.rotation.x = -Math.PI / 2; soil.position.y = 0.34; g.add(soil);
  const r = rng(seed), n = mobile ? 11 : 16;
  for (let i = 0; i < n; i++) {
    const len = 0.45 + r() * 0.4, geo = new THREE.PlaneGeometry(0.2 + r() * 0.08, len, 1, 6);
    geo.translate(0, len / 2, 0);
    const pos = geo.attributes.position, bend = 0.5 + r() * 0.7;
    for (let k = 0; k < pos.count; k++) { const y = pos.getY(k) / len; pos.setZ(k, y * y * bend * len * 0.6); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mats[i % mats.length]);
    m.position.y = 0.33;
    m.rotation.order = "YXZ";
    m.rotation.y = i * 2.39996 + r() * 0.3; m.rotation.x = 0.15 + r() * 0.5 * (i % 3 ? 1 : 0.4);
    m.castShadow = true;
    g.add(m);
  }
  const s = 0.32 * sc;
  return { x0: x - s, x1: x + s, z0: z - s, z1: z + s };
}

// Vertical panels for the front of the counter.
function panelWood() {
  const t = T.darkWood(15, { hue: 24, lig: 30 });
  const c = t.image, g = c.getContext("2d");
  for (let x = 0; x < c.width; x += c.width / 12) { g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(x, 0, 3, c.height); g.fillStyle = "rgba(255,220,180,.06)"; g.fillRect(x + 3, 0, 2, c.height); }
  t.needsUpdate = true;
  t.repeat.set(1, 1);
  return t;
}

function lightCone(add, rTop, rBottom, h, at, color, strength, tilt = 0) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, 40, 1, true);
  geo.translate(0, -h / 2, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: 0 }, uMax: { value: strength } },
    vertexShader: "varying float vY; varying vec3 vN; varying vec3 vV; uniform float uH; void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "varying float vY; varying vec3 vN; varying vec3 vV; uniform vec3 uColor; uniform float uStrength; void main(){ float along = clamp(-vY / " + h.toFixed(3) + ", 0.0, 1.0); float edge = pow(abs(dot(vN, vV)), 1.6); float a = (1.0 - along) * (1.0 - along) * edge * uStrength; gl_FragColor = vec4(uColor * a, 1.0); }",
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = add(new THREE.Mesh(geo, mat));
  m.position.copy(at);
  m.rotation.x = tilt;
  return { mat, max: strength };
}

function dust(add, n) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  const r = rng(99);
  for (let i = 0; i < n; i++) { pos[i * 3] = -5.5 + r() * 11; pos[i * 3 + 1] = 0.3 + r() * 2.8; pos[i * 3 + 2] = -6.6 + r() * 12; seed[i] = r() * 100; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMap: { value: T.softDot() }, uScale: { value: 300 }, uAmount: { value: 0 }, uBeat: { value: 0 } },
    vertexShader: "attribute float aSeed; uniform float uTime; uniform float uScale; uniform float uBeat; varying float vA; void main(){ vec3 p = position; float t = uTime * (0.05 + uBeat * 0.2); p.x += sin(t + aSeed) * 0.35 + sin(t * 2.3 + aSeed * 1.7) * 0.08; p.y += sin(t * 0.7 + aSeed * 2.1) * 0.25; p.z += cos(t * 0.9 + aSeed) * 0.35; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = uScale * (0.006 + fract(aSeed) * 0.01) / -mv.z; vA = 0.4 + 0.6 * fract(aSeed * 7.13); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform sampler2D uMap; uniform float uAmount; varying float vA; void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(1.0, 0.86, 0.68) * c.a * vA * uAmount, 1.0); }",
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = add(new THREE.Points(g, mat));
  pts.frustumCulled = false;
  return { mat };
}

// An arched doorway full of slowly turning light: the way into the time journey.
function portal(add, x, z) {
  const w = 1.3, h = 2.3, r = w / 2;
  const arch = (ww, hh) => { const s = new THREE.Shape(); s.moveTo(-ww / 2, 0); s.lineTo(ww / 2, 0); s.lineTo(ww / 2, hh - ww / 2); s.absarc(0, hh - ww / 2, ww / 2, 0, Math.PI, false); s.lineTo(-ww / 2, 0); return s; };
  const outer = arch(w + 0.26, h + 0.13);
  outer.holes.push(arch(w, h));
  const frame = add(new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.12, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 32 }), new THREE.MeshStandardMaterial({ color: 0xb08a4a, metalness: 0.9, roughness: 0.32 })));
  frame.rotation.y = -Math.PI / 2; frame.position.set(x - 0.1, 0, z);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uHover: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uOn; uniform float uHover;
      void main(){
        vec2 p = vec2(vUv.x / ${w.toFixed(2)}, (vUv.y - ${(h * 0.55).toFixed(2)}) / ${w.toFixed(2)});
        float r = length(p); float a = atan(p.y, p.x);
        float sw = a + r * 6.0 - uTime * (0.6 + uHover * 1.2);
        float bands = 0.5 + 0.5 * sin(sw * 5.0) * sin(r * 14.0 - uTime * 2.0);
        vec3 warm = vec3(1.0, 0.55, 0.25), cool = vec3(0.25, 0.45, 1.0), pink = vec3(0.95, 0.3, 0.6);
        vec3 col = mix(cool, warm, 0.5 + 0.5 * sin(sw + uTime * 0.3));
        col = mix(col, pink, 0.3 + 0.3 * sin(a * 3.0 - uTime));
        float core = exp(-r * 2.6);
        vec3 c = col * (0.25 + bands * 0.75) * (0.55 + core * 1.6) + vec3(1.0, 0.92, 0.8) * core * core * 1.4;
        gl_FragColor = vec4(c * uOn * (1.0 + uHover * 0.6), 1.0);
      }`,
  });
  const g = new THREE.ShapeGeometry(arch(w, h), 32);
  const mesh = add(new THREE.Mesh(g, mat));
  mesh.rotation.y = -Math.PI / 2; mesh.position.set(x - 0.03, 0, z);
  mesh.userData.portal = true;
  const sign = add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.375), new THREE.MeshStandardMaterial({ map: T.portalSign(), roughness: 0.5, emissive: 0xffffff, emissiveMap: T.portalSign(), emissiveIntensity: 0 })));
  sign.rotation.y = -Math.PI / 2; sign.position.set(x - 0.02, h + 0.42, z);
  const light = new THREE.PointLight(0xff8a5a, 0, 4.5, 2); light.position.set(x - 0.7, 1.2, z); add(light);
  return { mesh, mat, sign, light, x, z, w, h };
}

// Posters for the artists with the most records.
export function addPosters(scene, artists) {
  const spots = [[3.6, 1.7], [2.1, 1.75], [-2.4, 1.7], [-4.0, 1.75]];
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.5, metalness: 0.4 });
  const out = [];
  artists.slice(0, spots.length).forEach((a, i) => {
    const [z, y] = spots[i];
    const g = new THREE.Group(); g.position.set(ROOM.x1 - 0.03, y, z); g.rotation.y = -Math.PI / 2; scene.add(g);
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.06, 0.03), frameMat); g.add(f);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.98), new THREE.MeshStandardMaterial({ map: T.poster(a.name, a.count, a.years, i), roughness: 0.55 }));
    p.position.z = 0.017; g.add(p);
    p.userData.poster = a;
    out.push(p);
  });
  return out;
}

// A hanging sign over a table: which letters are on it.
export function hangingSign(scene, text, sub, x, z, rotY) {
  const c = T.canvas(1024, 320), g = c.getContext("2d");
  g.fillStyle = "#14100d"; g.beginPath(); g.roundRect(0, 0, 1024, 320, 26); g.fill();
  g.strokeStyle = "#C8A25A"; g.lineWidth = 8; g.beginPath(); g.roundRect(14, 14, 996, 292, 18); g.stroke();
  g.fillStyle = "#F2E3C6"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `900 140px ${T.FONT}`; g.fillText(text, 512, 140);
  g.font = `600 52px ${T.FONT}`; g.fillStyle = "#C8A25A"; g.fillText(sub, 512, 250);
  const tex = T.texture(c);
  const grp = new THREE.Group(); grp.position.set(x, 2.28, z); grp.rotation.y = rotY; scene.add(grp);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.31, 0.03), [0, 0, 0, 0, 0, 0].map((_, i) => (i === 4 || i === 5 ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }) : new THREE.MeshStandardMaterial({ color: 0x14100d }))));
  grp.add(board);
  const wire = new THREE.MeshStandardMaterial({ color: 0x222222 });
  for (const dx of [-0.4, 0.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.7, 4), wire); w.position.set(dx, 0.5, 0); grp.add(w); }
  return grp;
}
