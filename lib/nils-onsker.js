// The shared wishlist on nils.westerholt.dk: records Benjamin and Nils want.
// The list is kept in Cloudflare KV (a small key-value store) under one key, bound to
// the Pages project as ONSKELISTE. Used by functions/_middleware.js.
import { findInfo } from "./nils-lookup.js";

const KEY = "liste";
const PEOPLE = ["Benjamin", "Nils"];
const FORMATS = ["Vinyl", "CD", ""];
const COVER_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(mzstatic\.com|dzcdn\.net|deezer\.com|coverartarchive\.org|archive\.org)\//;

// GET: the whole list. POST: one change, then the whole new list.
export async function handleWishlist(context, request) {
  const store = context.env && context.env.ONSKELISTE;
  if (!store) return reply({ fejl: "mangler-lager" }, 503);
  if (request.method === "GET") return reply({ items: await load(store) });
  if (request.method !== "POST") return reply({ fejl: "ukendt" }, 405);
  // Only the page's own scripts send JSON, so other websites can't change the list.
  if (!/^application\/json/.test(request.headers.get("Content-Type") || "")) return reply({ fejl: "ukendt" }, 415);

  let body;
  try { body = await request.json(); } catch (e) { return reply({ fejl: "ukendt" }, 400); }
  const items = await load(store);
  const now = new Date().toISOString();
  const find = () => items.find((x) => x.id === String(body.id || ""));
  let lookCover = null, newId = "";

  if (body.handling === "tilfoj") {
    const item = clean(body.item);
    if (!item) return reply({ fejl: "Skriv både kunstner og titel." }, 400);
    item.id = newId = crypto.randomUUID();
    item.added = now;
    item.bought = null;
    items.push(item);
    if (!item.cover) lookCover = item;
  } else if (body.handling === "ret") {
    const item = find();
    const changes = clean(body.item);
    if (!item) return reply({ fejl: "Pladen er ikke på listen længere.", items }, 404);
    if (!changes) return reply({ fejl: "Skriv både kunstner og titel." }, 400);
    const moved = item.a !== changes.a || item.b !== changes.b;
    Object.assign(item, changes, { changed: now });
    if (!item.cover && moved) lookCover = item;
  } else if (body.handling === "kobt") {
    const item = find();
    if (!item) return reply({ fejl: "Pladen er ikke på listen længere.", items }, 404);
    item.bought = { by: PEOPLE.includes(body.by) ? body.by : "", at: now };
  } else if (body.handling === "ikke-kobt") {
    const item = find();
    if (!item) return reply({ fejl: "Pladen er ikke på listen længere.", items }, 404);
    item.bought = null;
  } else if (body.handling === "slet") {
    const at = items.findIndex((x) => x.id === String(body.id || ""));
    if (at >= 0) items.splice(at, 1);
  } else {
    return reply({ fejl: "ukendt" }, 400);
  }

  // Typed in by hand: try to find the cover the same way the collection does.
  if (lookCover) {
    const target = lookCover;
    const search = findInfo(context, target.a, target.b, target.y || "", target.format || "")
      .then((info) => (info && info.url) || "")
      .catch(() => "");
    const quick = await Promise.race([search, new Promise((done) => setTimeout(() => done(null), 6000))]);
    if (quick) target.cover = quick;
    else if (quick === null) {
      // Slow answer: save now, and add the cover when it arrives.
      context.waitUntil(search.then(async (url) => {
        if (!url) return;
        const fresh = await load(store);
        const again = fresh.find((x) => x.id === target.id);
        if (again && !again.cover) { again.cover = url; await save(store, fresh); }
      }));
    }
  }

  await save(store, items);
  return reply(newId ? { items, id: newId } : { items });
}

// Album search for the "add" form: Apple Music and Deezer together, best matches first.
export async function searchAlbums(context, query) {
  const q = String(query || "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (q.length < 2) return reply({ results: [] });
  const cacheKey = new Request("https://lookup-cache.westerholt.dk/albumsog/v1?" + new URLSearchParams({ q: q.toLowerCase() }));
  const hit = await caches.default.match(cacheKey);
  if (hit) return reply(await hit.json());

  const [apple, deezer] = await Promise.all([
    getJson("https://itunes.apple.com/search?" + new URLSearchParams({ term: q, entity: "album", limit: "25", country: "DK" })).catch(() => null),
    getJson("https://api.deezer.com/search/album?" + new URLSearchParams({ q, limit: "25" })).catch(() => null),
  ]);
  const results = [], seen = new Set();
  const add = (r) => {
    const key = simple(r.a) + "|" + simple(r.b.replace(/\s*[([].*?[)\]]\s*/g, " "));
    if (!r.a || !r.b || seen.has(key)) return;
    seen.add(key);
    results.push(r);
  };
  const appleList = ((apple && apple.results) || []).map((r) => ({
    a: r.artistName || "", b: r.collectionName || "", y: String(r.releaseDate || "").slice(0, 4),
    cover: r.artworkUrl100 ? r.artworkUrl100.replace("100x100bb", "600x600bb") : "",
    n: r.trackCount || 0, kilde: "Apple Music",
  }));
  const deezerList = ((deezer && deezer.data) || []).map((r) => ({
    a: (r.artist && r.artist.name) || "", b: r.title || "", y: "",
    cover: r.cover_xl || r.cover_big || r.cover_medium || "", n: r.nb_tracks || 0, kilde: "Deezer",
  }));
  // Take turns between the two catalogues, so a good hit from either shows up near the top.
  for (let i = 0; i < Math.max(appleList.length, deezerList.length); i++) {
    if (appleList[i]) add(appleList[i]);
    if (deezerList[i]) add(deezerList[i]);
  }
  // Albums whose artist and title contain all the typed words come first.
  const words = simple(q).split(" ").filter(Boolean);
  const score = (r) => { const t = simple(r.a + " " + r.b); return words.filter((w) => t.includes(w)).length; };
  results.forEach((r, i) => { r.s = score(r) * 100 - i; });
  results.sort((x, y) => y.s - x.s);
  results.forEach((r) => delete r.s);

  const answer = { results: results.slice(0, 24) };
  if (!apple && !deezer) answer.retry = true;
  else context.waitUntil(caches.default.put(cacheKey, new Response(JSON.stringify(answer), {
    headers: { "Content-Type": "application/json", "Cache-Control": "max-age=86400" },
  })));
  return reply(answer);
}

async function load(store) {
  const list = await store.get(KEY, "json").catch(() => null);
  return Array.isArray(list) ? list : [];
}

async function save(store, items) {
  await store.put(KEY, JSON.stringify(items));
}

// Only keeps known fields, trimmed to sensible lengths.
function clean(input) {
  if (!input || typeof input !== "object") return null;
  const text = (v, max) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
  const item = {
    a: text(input.a, 160),
    b: text(input.b, 200),
    y: /^\d{4}$/.test(text(input.y, 4)) ? text(input.y, 4) : "",
    cover: COVER_HOSTS.test(String(input.cover || "")) ? String(input.cover).slice(0, 500) : "",
    who: PEOPLE.includes(input.who) ? input.who : "",
    format: FORMATS.includes(input.format) ? input.format : "",
    note: String(input.note == null ? "" : input.note).trim().slice(0, 500),
  };
  return item.a && item.b ? item : null;
}

function simple(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9æøå]+/g, " ").trim();
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
