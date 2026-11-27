// Benjamin's own records, added on the page, and the records he has borrowed from Rødby.
// The collection is split by where the records are: "Rødby" is Nils' collection from the Excel
// sheet (tools/opdater-samling.py, the default, shown without a mark), "Odense" is Benjamin's own
// records plus those he has borrowed from Rødby. Kept in Cloudflare KV, in the same store as the
// wishlist (bound as ONSKELISTE), so a new Excel sheet never touches them:
//   egne: [ { id, t: "Vinyl"|"CD", a, b, y, m: "LP"|"MX"|"CD", n, v, note, added, changed } ]
//   laan: { "artist|album|year|format" of a Rødby record: { a, b, at } }
// Each own record has its own key "odense:<id>" (recordKey), used for its price, its chosen cover
// and its copy's details, so they stay with the record when its title is corrected.
// Used by functions/_middleware.js; the price run (tools/discogs-priser.mjs) reads GET /egne.

import { startLookup } from "./nils-udgaver.js";
import { markQueued } from "./nils-priser.js";
import { readEdition } from "./nils-udgavefelt.js";
import { recordKey, isOwnKey } from "./nils-noegle.js";

const OWN = "egne", LENT = "laan";
const COVER_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(mzstatic\.com|dzcdn\.net|deezer\.com|coverartarchive\.org|archive\.org|discogs\.com)\//;
const GRADES = ["M", "NM", "VG+", "VG", "G+", "G", "F", "P"];
const VERSIONS = ["", "Original", "Kopi", "Bootleg"];
// GET: { plader, laan }. POST JSON { handling: tilfoj | ret | slet | laan, ... }: one change,
// answered with the new { plader, laan } (and id, and opslag when a price lookup was started).
export async function handleOwn(context, request, password) {
  const store = context.env && context.env.ONSKELISTE;
  if (!store) return reply({ fejl: "mangler-lager" }, 503);
  const [own, lent] = await Promise.all([loadList(store), loadMap(store, LENT)]);
  if (request.method === "GET") return reply({ plader: own, laan: lent });
  if (request.method !== "POST") return reply({ fejl: "ukendt" }, 405);
  // Only the page's own scripts send JSON, so other websites can't change anything.
  if (!/^application\/json/.test(request.headers.get("Content-Type") || "")) return reply({ fejl: "ukendt" }, 415);
  let body;
  try { body = await request.json(); } catch (e) { return reply({ fejl: "ukendt" }, 400); }
  if (!body || typeof body !== "object") return reply({ fejl: "ukendt" }, 400);
  const now = new Date().toISOString();

  if (body.handling === "laan") {
    const key = recordKey(body.r);
    if (!key || isOwnKey(key)) return reply({ fejl: "ukendt" }, 400);
    if (body.til) lent[key] = { a: String(body.r.a || "").slice(0, 200), b: String(body.r.b || "").slice(0, 300), at: now };
    else delete lent[key];
    await store.put(LENT, JSON.stringify(lent));
    return reply({ plader: own, laan: lent });
  }

  if (body.handling === "slet") {
    const at = own.findIndex((x) => x.id === String(body.id || ""));
    if (at >= 0) {
      const key = "odense:" + own[at].id;
      own.splice(at, 1);
      await store.put(OWN, JSON.stringify(own));
      await forget(store, key);
    }
    return reply({ plader: own, laan: lent });
  }

  if (body.handling !== "tilfoj" && body.handling !== "ret") return reply({ fejl: "ukendt" }, 400);
  const rec = clean(body.plade);
  if (typeof rec === "string") return reply({ fejl: rec }, 400);
  let item, moved = false;
  if (body.handling === "tilfoj") {
    item = Object.assign({ id: crypto.randomUUID() }, rec, { added: now });
    own.push(item);
    moved = true;
  } else {
    item = own.find((x) => x.id === String(body.id || ""));
    if (!item) return reply({ fejl: "Pladen findes ikke længere.", plader: own, laan: lent }, 404);
    moved = ["t", "a", "b", "y", "m"].some((f) => (item[f] || "") !== (rec[f] || ""));
    for (const f of ["v", "note"]) delete item[f];
    Object.assign(item, rec, { changed: now });
  }
  await store.put(OWN, JSON.stringify(own));
  const key = "odense:" + item.id;

  // The cover picked in the form becomes the record's chosen cover (lib/nils-omslag.js).
  const cover = String((body.plade && body.plade.cover) || "").slice(0, 600);
  if (cover && COVER_HOSTS.test(cover)) {
    const covers = await loadMap(store, "omslag");
    if (!covers[key] || covers[key].u !== cover) {
      const kilde = ["Apple Music", "Deezer", "Discogs"].includes(body.plade.kilde) ? body.plade.kilde : "";
      covers[key] = { u: cover, k: kilde === "Discogs" ? "" : kilde, at: now };
      await store.put("omslag", JSON.stringify(covers));
    }
  }

  // The copy's details from the form (only sent when adding): kept like the price box's (lib/nils-udgaver.js).
  let edition = body.handling === "ret" ? (await loadMap(store, "udgaver"))[key] || null : null;
  if (body.handling === "tilfoj" && (body.c || body.s || body.y)) {
    const c = readEdition(String(body.c || "").slice(0, 2000)).text.slice(0, 120);
    const s = GRADES.includes(body.s) && body.s !== "VG+" ? body.s : "";
    // The year this pressing came out (the record's own year is when the album first came out).
    const y = /^(19|20)\d\d$/.test(String(body.y || "").trim()) ? String(body.y).trim() : "";
    if (c || s || y) {
      const editions = await loadMap(store, "udgaver");
      editions[key] = Object.assign({}, c ? { c } : {}, y ? { y } : {}, s ? { s } : {});
      await store.put("udgaver", JSON.stringify(editions));
      edition = editions[key];
    }
  }

  // A new vinyl record (or a corrected title): look its price up on GitHub at once instead of
  // waiting for the hourly run. The record goes along with the start, as the page's catalogue
  // numbers do, so the run doesn't depend on reading it back from KV, which can lag a little.
  let started = false;
  if (moved && item.t === "Vinyl") {
    started = await startLookup(context, password, { k: key, c: (edition && edition.c) || "", y: (edition && edition.y) || "", o: item });
    if (started) await markQueued(context);
  }
  return reply({ plader: own, laan: lent, id: item.id, opslag: started });
}

// A record as typed in the form, or an error text.
function clean(p) {
  if (!p || typeof p !== "object") return "ukendt";
  const s = (v, max) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
  const a = s(p.a, 200), b = s(p.b, 300), y = s(p.y, 4);
  if (!a || !b) return "Skriv både kunstner og album.";
  if (y && !/^(19|20)\d\d$/.test(y)) return "Året skal være fire tal, fx 1975.";
  const t = p.t === "CD" ? "CD" : "Vinyl";
  const m = t === "CD" ? "CD" : p.m === "MX" ? "MX" : "LP";
  const n = Math.max(1, Math.min(12, parseInt(p.n, 10) || 1));
  const v = VERSIONS.includes(p.v) ? p.v : "";
  const note = String(p.note == null ? "" : p.note).trim().slice(0, 1000);
  return Object.assign({ t, a, b, y, m, n }, v ? { v } : {}, note ? { note } : {});
}

// A deleted record takes its chosen cover and its copy's details with it.
async function forget(store, key) {
  for (const name of ["omslag", "udgaver"]) {
    const all = await loadMap(store, name);
    if (all[key]) { delete all[key]; await store.put(name, JSON.stringify(all)); }
  }
}

async function loadList(store) {
  const all = await store.get(OWN, "json").catch(() => null);
  return Array.isArray(all) ? all : [];
}
async function loadMap(store, name) {
  const all = await store.get(name, "json").catch(() => null);
  return all && typeof all === "object" && !Array.isArray(all) ? all : {};
}

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
