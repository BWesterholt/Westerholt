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
  if (request.method === "GET") {
    const items = await load(store);
    if (items.merged) await save(store, items);
    fillYears(context, store, items);
    return reply({ items });
  }
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
    // Already wished for by the other one: put both names on the same record instead of a second copy.
    const same = items.find((x) => !x.bought && keyOf(x) === keyOf(item));
    if (same) {
      combine(same, item);
      newId = same.id;
    } else {
      item.id = newId = crypto.randomUUID();
      item.added = now;
      item.bought = null;
      items.push(item);
      if (!item.cover) lookCover = item;
    }
  } else if (body.handling === "ret") {
    const item = find();
    const changes = clean(body.item);
    if (!item) return reply({ fejl: "Pladen er ikke på listen længere.", items }, 404);
    if (!changes) return reply({ fejl: "Skriv både kunstner og titel." }, 400);
    const moved = item.a !== changes.a || item.b !== changes.b;
    Object.assign(item, changes, { changed: now });
    if (moved) delete item.noYear;
    // Renamed into a record that is already on the list: join the two.
    const twin = items.find((x) => x !== item && !x.bought && !item.bought && keyOf(x) === keyOf(item));
    if (twin) { combine(twin, item); items.splice(items.indexOf(item), 1); newId = twin.id; }
    else if (!item.cover && moved) lookCover = item;
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
  fillYears(context, store, items);
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
  // Deezer's search doesn't say the year, but its album page does: ask for the first few.
  const deezerRaw = ((deezer && deezer.data) || []).slice(0, 25);
  const years = await Promise.all(deezerRaw.map((r, i) => i < 10 && r.id
    ? getJson("https://api.deezer.com/album/" + r.id).then((d) => String(d.release_date || "").slice(0, 4)).catch(() => "")
    : ""));
  const deezerList = deezerRaw.map((r, i) => ({
    a: (r.artist && r.artist.name) || "", b: r.title || "", y: /^\d{4}$/.test(years[i]) && years[i] !== "0000" ? years[i] : "",
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

// Reads the list. Older entries had one name in "who"; now it is a list of names.
// Records that are on the list twice (not bought yet) are joined into one, and items.merged says so.
async function load(store) {
  const list = await store.get(KEY, "json").catch(() => null);
  const items = [];
  let merged = false;
  for (const x of Array.isArray(list) ? list : []) {
    if (!Array.isArray(x.who)) { x.who = whoList(x.who); merged = true; }
    const same = !x.bought && items.find((y) => !y.bought && keyOf(y) === keyOf(x));
    if (same) { combine(same, x); merged = true; } else items.push(x);
  }
  if (merged) items.merged = true;
  return items;
}

// Same record: same artist and title, ignoring case, accents and things like "(Remastered)".
function keyOf(x) {
  return simple(x.a) + "|" + simple(String(x.b || "").replace(/\s*[([].*?[)\]]\s*/g, " "));
}

// Puts a second wish for the same record into the first one.
function combine(into, other) {
  into.who = whoList([].concat(into.who || [], other.who || []));
  if (!into.cover && other.cover) into.cover = other.cover;
  if (!into.y && other.y) into.y = other.y;
  if (into.format !== other.format) into.format = into.format && other.format ? "" : into.format || other.format || "";
  const notes = [into.note, other.note].map((n) => String(n || "").trim()).filter(Boolean);
  into.note = [...new Set(notes)].join("\n").slice(0, 1000);
  if (other.added && (!into.added || other.added < into.added)) into.added = other.added;
}

// Records without a year get one looked up in the background (a few at a time), so it can be shown.
function fillYears(context, store, items) {
  const missing = items.filter((x) => !x.y && !x.noYear).slice(0, 4);
  if (!missing.length) return;
  context.waitUntil((async () => {
    const found = {};
    for (const x of missing) found[x.id] = await yearOf(x.a, x.b).catch(() => null);
    if (Object.values(found).every((y) => y === null)) return; // the catalogues didn't answer: try another time
    const fresh = await load(store);
    let changed = false;
    for (const x of fresh) {
      if (x.y || !(x.id in found) || found[x.id] === null) continue;
      if (found[x.id]) x.y = found[x.id]; else x.noYear = true;
      changed = true;
    }
    if (changed) await save(store, fresh);
  })());
}

// The year of an album: Apple Music first, then Deezer. "" when not found, null when nobody answered.
async function yearOf(artist, title) {
  const want = simple(String(title).replace(/\s*[([].*?[)\]]\s*/g, " "));
  const who = simple(artist);
  const match = (a, b) => simple(String(b).replace(/\s*[([].*?[)\]]\s*/g, " ")) === want && (simple(a).includes(who) || who.includes(simple(a)));
  let answered = false;
  const apple = await getJson("https://itunes.apple.com/search?" + new URLSearchParams({ term: artist + " " + title, entity: "album", limit: "25", country: "DK" })).catch(() => null);
  if (apple) {
    answered = true;
    const years = (apple.results || []).filter((r) => match(r.artistName || "", r.collectionName || ""))
      .map((r) => String(r.releaseDate || "").slice(0, 4)).filter((y) => /^\d{4}$/.test(y)).sort();
    if (years.length) return years[0];
  }
  const deezer = await getJson("https://api.deezer.com/search/album?" + new URLSearchParams({ q: artist + " " + title, limit: "10" })).catch(() => null);
  if (deezer) {
    answered = true;
    const hit = (deezer.data || []).find((r) => match((r.artist && r.artist.name) || "", r.title || ""));
    if (hit) {
      const album = await getJson("https://api.deezer.com/album/" + hit.id).catch(() => null);
      const y = album && String(album.release_date || "").slice(0, 4);
      if (y && /^\d{4}$/.test(y) && y !== "0000") return y;
    }
  }
  return answered ? "" : null;
}

function whoList(value) {
  const names = Array.isArray(value) ? value : [value];
  return PEOPLE.filter((p) => names.includes(p));
}

async function save(store, items) {
  await store.put(KEY, JSON.stringify([...items]));
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
    who: whoList(input.who),
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
