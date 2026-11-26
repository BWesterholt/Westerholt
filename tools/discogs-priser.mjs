// Works out what every vinyl record in the collection (and on the wishlist) is worth on Discogs,
// and saves it encrypted in data/priser.js (gzipped + AES-GCM with the same key as the collection,
// because this repository is public). How the value is worked out: lib/nils-pris.js.
//
// Each record is only asked about again when it needs it:
//   - the pressing is searched for once, and again when your own catalogue number or year is
//     typed in on the page (those come first in the queue, so the page gets them quickly),
//   - the market figures (cheapest for sale, how many) are asked again after 14 days: 1 request,
//   - have/want and Discogs' suggestion change slowly and are asked every 90 days.
// While it runs, it tells the website how far it has got and sends the new values along, so the
// page shows a progress bar and the prices change as they come in (only on the main branch).
// Run by .github/workflows/discogs-priser.yml.
//
// Run by hand: NILS_KODE=<password> DISCOGS_TOKEN=<token> node tools/discogs-priser.mjs
// Optional: MAX_MINUTTER=50 stops after that many minutes (what is found is saved);
// STIKPROVE=40 only looks up that many records (for testing changes).
import { writeFile } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import { webcrypto as crypto } from "node:crypto";
import samling from "../data/samling.js";
import gemte from "../data/priser.js";
import { lookUp, VERSION, MODEL_VERSION, WISH_VERSION } from "../lib/nils-pris.js";
import { wanted } from "../lib/nils-lookup.js";

const password = process.env.NILS_KODE, token = process.env.DISCOGS_TOKEN;
if (!password || !token) { console.error("Mangler NILS_KODE eller DISCOGS_TOKEN"); process.exit(1); }
const maxMinutes = Number(process.env.MAX_MINUTTER || 300);
const site = process.env.NILS_SIDE || "https://nils.westerholt.dk";
// Only the real run (on main) tells the website; test runs on other branches only save the file.
const tellSite = process.env.SEND_TIL_SIDEN === "1";
const MARKET_DAYS = 14, RETRY_DAYS = 60;

const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("nils-samling:" + password));
const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
const b64 = (t) => Uint8Array.from(Buffer.from(t, "base64"));
async function open(box) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(box.iv) }, key, b64(box.data));
  return JSON.parse(gunzipSync(Buffer.from(plain)).toString());
}

const { records } = await open(samling);
const prices = gemte ? await open(gemte) : {};
const today = Math.floor(Date.now() / 864e5);
const vinyl = records.filter((r) => r.t === "Vinyl" && (r.a || r.b));

// What the website has: values sent during earlier runs that the file doesn't have yet (the
// file is saved when a run ends), and the copies' own details typed in on the page.
const fromSiteNow = await fromSite("/priser");
const live = {};
for (const [k, e] of Object.entries(liveOf(fromSiteNow))) {
  if (e && (e.ts || 0) > ((prices[k] && prices[k].ts) || 0)) { prices[k] = e; live[k] = e; }
}
const editions = await fromSite("/udgaver").then((d) => (d ? d.udgaver || {} : null));
// The page also sends the record that was just changed along with the start of the run (encrypted,
// because the run's details are public): then it doesn't matter if the website's copy is a moment behind.
const hint = await readHint(process.env.UDGAVE);
if (hint && editions) {
  const e = Object.assign({}, editions[hint.k]);
  delete e.c; delete e.y;
  if (hint.c) e.c = hint.c;
  if (hint.y) e.y = hint.y;
  editions[hint.k] = e;
}
// If the website didn't answer, keep the details used last time.
const edOf = (r) => editions ? editions[keyOf(r)] || null : (prices[keyOf(r)] && prices[keyOf(r)].ed) || null;
// Only the catalogue number and year change which pressing is found; the grade is picked on the page.
const pressing = (e) => JSON.stringify(e && (e.c || e.y) ? { c: e.c || "", y: e.y || "" } : null);
const sameEd = (a, b) => pressing(a) === pressing(b);
const old = (p) => !p || p.mv !== MODEL_VERSION || today - (p.t || 0) >= MARKET_DAYS;

const first = [], wishJobs = [], rest = [];
for (const r of vinyl) {
  const k = keyOf(r), p = prices[k], ed = edOf(r);
  const changed = !!p && !sameEd(p.ed, ed);
  const search = !p || p.v !== VERSION || changed || (!p.id && today - (p.t || 0) >= RETRY_DAYS);
  const market = !!p && !!p.id && old(p);
  if (!search && !market) continue;
  const job = { key: k, want: wanted(r.a, r.b, r.y, /^(LP|MX)/.test(r.m || "") ? r.m : "LP"), ed, prev: search ? null : p };
  (changed || (hint && hint.k === k) ? first : rest).push(job);
}
// The wishlist too (not CDs, not bought), so you know what a fair price is when shopping.
const wishes = (await fromSite("/onsker").then((d) => (d ? d.items || [] : null))) || null;
const wishKeys = new Set();
for (const w of wishes || []) {
  if (!w || !w.id || w.bought || w.format === "CD" || !(w.a || w.b)) continue;
  const k = "ønske:" + w.id, q = w.a + "|" + w.b, p = prices[k];
  wishKeys.add(k);
  const same = p && p.q === q && p.v === VERSION;
  if (!same || old(p) || p.all !== WISH_VERSION) wishJobs.push({ key: k, q, all: true, want: wanted(w.a, w.b, w.y || "", "LP"), ed: null, prev: same && p.id ? p : null });
}
// The wishes go last: each one checks up to 12 versions, so they are slow, and the progress bar
// guesses the time left from the pace so far.
let todo = [...first, ...rest, ...wishJobs];
// A test run (STIKPROVE=40): only that many records spread over the collection, two wishes, and
// a few of them searched for from scratch, so every part is tried without a full run.
const sample = Number(process.env.STIKPROVE || 0);
if (sample > 0) {
  const step = Math.max(1, Math.floor(rest.length / sample));
  const picked = rest.filter((_, i) => i % step === Math.floor(step / 2)).slice(0, sample);
  picked.slice(0, Math.min(5, Math.floor(sample / 8))).forEach((j) => { j.prev = null; });
  todo = [...first, ...picked, ...wishJobs.slice(0, 2)];
}
console.log(`${vinyl.length} vinylplader og ${wishKeys.size} ønsker, ${todo.length} skal slås op (${first.length} ændret på siden).`);

const started = Date.now();
let done = 0, found = 0, failed = 0, lastReport = 0, stopped = false;
// A run started from the page always tells it when it ends, even with nothing to do.
const tell = todo.length > 0 || !!process.env.UDGAVE;
if (tell) await report();
for (const r of todo) {
  if (Date.now() - started > maxMinutes * 60000) { console.log("Tiden er gået; resten tages næste gang."); stopped = true; break; }
  try {
    const res = await lookUp(token, r.want, r.ed || {}, !!r.all, r.prev, today);
    const entry = { ...res, t: today, ts: Date.now(), ...(r.ed && (r.ed.c || r.ed.y) ? { ed: { ...(r.ed.c ? { c: r.ed.c } : {}), ...(r.ed.y ? { y: r.ed.y } : {}) } } : {}), ...(r.q ? { q: r.q } : {}), ...(r.all ? { all: WISH_VERSION } : {}) };
    prices[r.key] = entry;
    live[r.key] = entry;
    if (res.p || res.ml) found++;
  } catch (e) {
    if (e.denied) { console.error(e.message); break; }
    failed++;
  }
  done++;
  // The ones changed on the page are sent at once; the rest every 30 seconds.
  if (first.includes(r) || Date.now() - lastReport > 30000) await report();
  if (done % 100 === 0) { console.log(`${done}/${todo.length} (${found} med pris, ${failed} fejl)`); await save(); }
}
await save();
if (tell) await report(true);
console.log(`Færdig: ${done} slået op, ${found} med pris, ${failed} fejl.`);

function keyOf(r) { return [r.a, r.b, r.y, r.m].join("|"); }
function liveOf(d) { try { return (d && typeof d.live === "string" && JSON.parse(d.live).priser) || {}; } catch (e) { return {}; } }

// Reads something from the website, logged in with the password. Null when it doesn't answer.
async function fromSite(path) {
  try {
    const res = await fetch(site + path, { headers: { Cookie: "nils_adgang=" + encodeURIComponent(password) }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch (e) {
    console.log("Kunne ikke hente " + path + " fra siden:", e.message);
    return null;
  }
}

// Tells the website how far the run has got, with the values found so far in this run (and those
// from earlier runs that aren't in the file yet). The page shows the progress bar from it.
async function report(end = false) {
  lastReport = Date.now();
  if (!tellSite) return;
  const status = { running: !end, done, total: todo.length, found, first: first.length, started, updated: Date.now(), ...(end ? { finished: Date.now(), left: todo.length - done, stopped } : {}) };
  try {
    const res = await fetch(site + "/priser", {
      method: "POST",
      headers: { Cookie: "nils_adgang=" + encodeURIComponent(password), "Content-Type": "application/json" },
      body: JSON.stringify({ status, live: JSON.stringify({ rev: Date.now(), priser: live }) }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch (e) {
    console.log("Kunne ikke sende status til siden:", e.message);
  }
}

// The record changed on the page, sent along when the page started the run: "iv.data", encrypted
// with the collection's key. Gives { k: record key, c: catalogue number, y: year } or null.
async function readHint(text) {
  if (!text || !/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/.test(text)) return null;
  try {
    const [iv, data] = text.split(".");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(iv) }, key, b64(data));
    const h = JSON.parse(new TextDecoder().decode(plain));
    return h && typeof h.k === "string" ? { k: h.k, c: String(h.c || ""), y: String(h.y || "") } : null;
  } catch (e) {
    return null;
  }
}

async function save() {
  // Only values for records still in the collection are kept.
  const keep = {};
  for (const r of vinyl) { const k = keyOf(r); if (prices[k]) keep[k] = prices[k]; }
  // Wishes: the current ones, or all saved ones if the website didn't answer.
  for (const k in prices) if (k.startsWith("ønske:") && (wishes ? wishKeys.has(k) : true)) keep[k] = prices[k];
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, gzipSync(JSON.stringify(keep)));
  const box = { iv: Buffer.from(iv).toString("base64"), data: Buffer.from(data).toString("base64") };
  await writeFile(new URL("../data/priser.js", import.meta.url),
    "// Encrypted Discogs values. Generated by tools/discogs-priser.mjs, do not edit.\nexport default " + JSON.stringify(box) + ";\n");
}
