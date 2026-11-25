// Looks up a guide price on Discogs for every vinyl record in the collection, and saves them
// encrypted in data/priser.js (gzipped + AES-GCM with the same key as the collection, because
// this repository is public). Records looked up less than 60 days ago are skipped, so a run
// only does what is new, old, or changed on the page: there you can type in your own copy's
// catalogue number (from the centre label) and year, and the next run (every hour) uses them.
// Run by .github/workflows/discogs-priser.yml.
//
// Run by hand: NILS_KODE=<password> DISCOGS_TOKEN=<token> node tools/discogs-priser.mjs
// Optional: MAX_MINUTTER=50 stops after that many minutes (what is found is saved).
import { writeFile } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import { webcrypto as crypto } from "node:crypto";
import samling from "../data/samling.js";
import gemte from "../data/priser.js";
import { lookUp, VERSION } from "../lib/nils-pris.js";
import { wanted } from "../lib/nils-lookup.js";

const password = process.env.NILS_KODE, token = process.env.DISCOGS_TOKEN;
if (!password || !token) { console.error("Mangler NILS_KODE eller DISCOGS_TOKEN"); process.exit(1); }
const maxMinutes = Number(process.env.MAX_MINUTTER || 300);
const OLD_DAYS = 60;

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
// The copies' own details typed in on the page (catalogue number, year), kept on the website.
const editions = await fetchEditions();
// If the website didn't answer, keep the details used last time.
const edOf = (r) => editions ? editions[keyOf(r)] || null : (prices[keyOf(r)] && prices[keyOf(r)].ed) || null;
// Only the catalogue number and year change which pressing is found; the grade is picked on the page.
const pressing = (e) => JSON.stringify(e && (e.c || e.y) ? { c: e.c || "", y: e.y || "" } : null);
const sameEd = (a, b) => pressing(a) === pressing(b);
const stale = (p) => !p || p.v !== VERSION || today - (p.t || 0) >= OLD_DAYS;
const jobs = vinyl.filter((r) => { const p = prices[keyOf(r)]; return stale(p) || !sameEd(p.ed, edOf(r)); })
  .map((r) => ({ key: keyOf(r), want: wanted(r.a, r.b, r.y, /^(LP|MX)/.test(r.m || "") ? r.m : "LP"), ed: edOf(r) }));
// The wishlist too (not CDs, not bought), so you know what a fair price is when shopping.
const wishes = (await fromSite("/onsker", "items")) || null;
const wishKeys = new Set();
for (const w of wishes || []) {
  if (!w || !w.id || w.bought || w.format === "CD" || !(w.a || w.b)) continue;
  const key = "ønske:" + w.id, q = w.a + "|" + w.b, p = prices[key];
  wishKeys.add(key);
  if (stale(p) || p.q !== q || !p.all) jobs.unshift({ key, q, all: true, want: wanted(w.a, w.b, w.y || "", "LP"), ed: null });
}
const todo = jobs;
console.log(`${vinyl.length} vinylplader og ${wishKeys.size} ønsker, ${todo.length} skal slås op.`);

const started = Date.now();
let done = 0, found = 0, failed = 0;
for (const r of todo) {
  if (Date.now() - started > maxMinutes * 60000) { console.log("Tiden er gået; resten tages næste gang."); break; }
  try {
    const res = await lookUp(token, r.want, r.ed || {}, !!r.all);
    prices[r.key] = { ...res, t: today, ...(r.ed ? { ed: r.ed } : {}), ...(r.q ? { q: r.q } : {}), ...(r.all ? { all: 1 } : {}) };
    if (res.p) found++;
  } catch (e) {
    if (e.denied) { console.error(e.message); break; }
    failed++;
  }
  if (++done % 50 === 0) { console.log(`${done}/${todo.length} (${found} med pris, ${failed} fejl)`); await save(); }
}
await save();
console.log(`Færdig: ${done} slået op, ${found} med pris, ${failed} fejl.`);

function keyOf(r) { return [r.a, r.b, r.y, r.m].join("|"); }

async function fetchEditions() {
  const d = await fromSite("/udgaver", "udgaver");
  return d ? d : null;
}

// Reads something from the website, logged in with the password. Null when it doesn't answer.
async function fromSite(path, field) {
  const site = process.env.NILS_SIDE || "https://nils.westerholt.dk";
  try {
    const res = await fetch(site + path, { headers: { Cookie: "nils_adgang=" + encodeURIComponent(password) }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json();
    return (d && d[field]) || (field === "items" ? [] : {});
  } catch (e) {
    console.log("Kunne ikke hente " + path + " fra siden:", e.message);
    return null;
  }
}

async function save() {
  // Only prices for records still in the collection are kept.
  const keep = {};
  for (const r of vinyl) { const k = keyOf(r); if (prices[k]) keep[k] = prices[k]; }
  // Wishes: the current ones, or all saved ones if the website didn't answer.
  for (const k in prices) if (k.startsWith("ønske:") && (wishes ? wishKeys.has(k) : true)) keep[k] = prices[k];
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, gzipSync(JSON.stringify(keep)));
  const box = { iv: Buffer.from(iv).toString("base64"), data: Buffer.from(data).toString("base64") };
  await writeFile(new URL("../data/priser.js", import.meta.url),
    "// Encrypted Discogs guide prices. Generated by tools/discogs-priser.mjs, do not edit.\nexport default " + JSON.stringify(box) + ";\n");
}
