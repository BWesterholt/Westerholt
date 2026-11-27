// The records for the shop: the same collection, own records, covers and prices as the
// collection page, read from the same addresses behind the password.
import { collator, displayArtist, isCompilation, hash, norm } from "./util.js";

export const BASE = (window.NILS && window.NILS.base) || "";
const get = (path, opts) => fetch(BASE + path, Object.assign({ credentials: "same-origin" }, opts)).then((r) => (r.ok ? r.json() : null)).catch(() => null);

export async function loadCollection(progress) {
  progress("Henter samlingen …");
  const [sheet, own, covers, prices] = await Promise.all([
    fetch(BASE + "/samling.json", { credentials: "same-origin" }).then((r) => { if (!r.ok) throw r; return r.json(); }),
    get("/egne", { cache: "no-store" }),
    get("/omslag"),
    get("/priser"),
  ]);
  progress("Sætter pladerne i kasserne …");
  const chosen = (covers && covers.omslag) || {}, found = (covers && covers.fundne) || {};
  let thumbs = {};
  try { thumbs = JSON.parse(localStorage.getItem("nils2:thumbs")) || {}; } catch (e) {}
  const ownList = (own && own.plader) || [], lent = (own && own.laan) || {};
  // The same order as the collection page, so links to a record stay the same.
  const mine = ownList.slice().sort((a, b) => String(a.added).localeCompare(String(b.added))).map((o) => {
    const t = o.t === "CD" ? "CD" : "Vinyl";
    return { t, a: o.a, b: o.b, m: o.m || (t === "CD" ? "CD" : "LP"), n: o.n || 1, y: o.y || "", v: o.v || "", own: true, id: o.id, k: "odense:" + o.id, note: o.note || "", added: o.added, f: [] };
  });
  const copies = {};
  const records = sheet.records.concat(mine).map((r, i) => {
    const rec = { i, t: r.t, a: r.a, b: r.b, m: r.m, n: r.n || 1, y: r.y || "", v: r.v || "", own: !!r.own, id: r.id, added: r.added, f: r.f || [] };
    rec.key = r.k || [r.a, r.b, r.y, r.m].join("|");
    if (!rec.own) { const bk = [r.a, r.b, r.y, r.m].join("|"); rec.copy = copies[bk] = (copies[bk] || 0) + 1; }
    return rec;
  });
  // Records borrowed from Rødby count as being in Odense (same rule as the collection page).
  const byLend = {}, left = [];
  records.forEach((r) => { if (!r.own) byLend[[r.a, r.b, r.y, r.m].join("|") + (r.copy > 1 ? "#" + r.copy : "")] = r; });
  for (const k in lent) { if (byLend[k]) byLend[k].lent = lent[k]; else if (lent[k]) left.push(lent[k]); }
  left.forEach((l) => { const r = records.find((x) => !x.own && !x.lent && x.a === l.a && x.b === l.b); if (r) r.lent = l; });
  const priceMap = takePrices(prices);
  for (const r of records) {
    r.place = r.own || r.lent ? "Odense" : "Rødby";
    r.artist = displayArtist(r.a);
    r.fmt = (r.n > 1 ? r.n + "×" : "") + (r.m || r.t);
    const p = priceMap[r.key];
    if (r.t === "Vinyl" && p && p.p) { r.value = (p.s && p.s["VG+"]) || p.p; r.price = p; r.pressing = p.d || ""; }
    const c = chosen[r.key];
    const t = thumbs[r.key];
    // chosen by hand, else found by the search, else Discogs' photo of the pressing (saved by the
    // price run), else what this browser found before; null: not looked for yet.
    const dc = p && p.c ? p.c : "";
    r.cover = c ? c.u : found[r.key] || (t && t.u && Date.now() - t.t < 30 * 864e5 ? t.u : dc || (t && !t.u && t.t > NEG_SINCE && Date.now() - t.t < 3 * 864e5 ? "" : null));
    if (dc) r.discogsCover = dc;
    r.letter = letterOf(r);
    r.text = norm([r.a, r.artist, r.b, r.y, r.m, r.place].join(" "));
    r.seed = hash(r.key);
  }
  const sorter = (x, y) => collator.compare(x.a, y.a) || (+x.y || 9999) - (+y.y || 9999) || collator.compare(x.b, y.b);
  const vinyl = records.filter((r) => r.t === "Vinyl").sort(sorter);
  const cds = records.filter((r) => r.t !== "Vinyl").sort(sorter);
  return { sheet, records, vinyl, cds, ownCount: mine.length, prices: priceMap, chosen, found, wishes: Object.keys(priceMap).filter((k) => /^ønske:/.test(k)).length };
}

// The values from the price run (data/priser.js), with the newer ones a run that is still going has
// sent (as on the collection page).
function takePrices(d) {
  if (!d || !d.priser) return {};
  const p = Object.assign({}, d.priser);
  if (d.live) {
    try { const l = JSON.parse(d.live).priser || {}; for (const k in l) if (!p[k] || (l[k].ts || 0) > (p[k].ts || 0)) p[k] = l[k]; } catch (e) {}
  }
  return p;
}
// Covers not found before the search got more places to look (Cover Art Archive) are looked for again.
export const NEG_SINCE = Date.UTC(2026, 10, 27, 18);

// Filed like the collection page: by the first letter, compilations ("ÅÅ ...") under "Div.".
export function letterOf(r) {
  if (isCompilation(r.a)) return "Div.";
  const c = String(r.a || "").trim().charAt(0).toUpperCase();
  return /[A-ZÆØÅ]/.test(c) ? c : "#";
}

// Covers that aren't known yet are looked up a few at a time, like the list on the collection
// page does, and new finds are saved for both pages.
const queue = [], waiting = new Map();
let busy = 0, pauseUntil = 0, newFound = {}, foundTimer = null;
export function findCover(rec, priority = 0) {
  if (rec.cover !== null && rec.cover !== undefined) return Promise.resolve(rec.cover);
  if (waiting.has(rec.key)) { const w = waiting.get(rec.key); w.priority = Math.max(w.priority, priority); return w.promise; }
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  const job = { rec, priority, resolve, promise };
  waiting.set(rec.key, job);
  queue.push(job);
  pump();
  return promise;
}
function pump() {
  if (Date.now() < pauseUntil) { setTimeout(pump, pauseUntil - Date.now() + 20); return; }
  queue.sort((a, b) => b.priority - a.priority);
  while (busy < 3 && queue.length) {
    const job = queue.shift();
    busy++;
    const r = job.rec;
    fetch(BASE + "/coversog?" + new URLSearchParams({ a: r.a, b: r.b, y: r.y, m: r.m }), { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((c) => {
        busy--;
        waiting.delete(r.key);
        if (!c || c.retry) { pauseUntil = Date.now() + 4000; job.resolve(null); pump(); return; }
        r.cover = c.url || "";
        if (c.url) { newFound[r.key] = c.url; clearTimeout(foundTimer); if (Object.keys(newFound).length >= 250) sendFound(); else foundTimer = setTimeout(sendFound, 8000); }
        job.resolve(r.cover);
        pump();
      });
  }
}
function sendFound() {
  const batch = newFound;
  if (!Object.keys(batch).length) return;
  newFound = {};
  fetch(BASE + "/omslag", { method: "POST", keepalive: true, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handling: "fundet", fundne: batch }) }).catch(() => {});
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { clearTimeout(foundTimer); sendFound(); } });

// The songs on a record (for the back of the sleeve).
const infos = new Map();
export function findInfo(rec) {
  if (!infos.has(rec.key)) {
    infos.set(rec.key, get("/info?" + new URLSearchParams({ a: rec.a, b: rec.b, y: rec.y, m: rec.m })).then((d) => { if (!d || d.retry) infos.delete(rec.key); return d; }));
  }
  return infos.get(rec.key);
}

// The album on Spotify, for Spotify's own player in the shop. Asked in turn: the site (Deezer or
// Apple Music, then Odesli), Odesli from this browser, and MusicBrainz from this browser (its
// releases link to Spotify). Gives { id } for the album, { artist } when only the artist is on
// Spotify, or { id: null }. Answers are remembered in this browser (found: 30 days, not: 2 days).
const spots = new Map();
let spotSaved = {};
try { spotSaved = JSON.parse(localStorage.getItem("nils3d:spotify-ids")) || {}; } catch (e) {}
export function findSpotify(rec) {
  if (!spots.has(rec.key)) spots.set(rec.key, lookSpotify(rec).then((d) => { if (!d || d.retry) spots.delete(rec.key); return d; }));
  return spots.get(rec.key);
}
async function lookSpotify(rec) {
  const old = spotSaved[rec.key];
  if (old && Date.now() - old.t < (old.d.id || old.d.artist ? 30 : 2) * 864e5) return old.d;
  const why = [];
  const site = await get("/spotify?" + new URLSearchParams({ a: rec.a, b: rec.b, y: rec.y, m: rec.m }));
  why.push("site:" + (!site ? "fejl" : site.id ? "ok" : site.why || (site.retry ? "prøv igen" : "ingen")));
  let found = site && site.id ? site : null;
  if (!found && site && site.link) {
    // The site couldn't ask Odesli (it only answers a few times a minute per address): ask it from here.
    const o = await fetch("https://api.song.link/v1-alpha.1/links?" + new URLSearchParams({ url: site.link, userCountry: "DK" })).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const id = o && spotifyId(o.linksByPlatform && o.linksByPlatform.spotify && o.linksByPlatform.spotify.url, "album");
    why.push("odesli:" + (id ? "ok" : o ? "ingen" : "fejl"));
    if (id) found = { id, name: "spotify" };
  }
  let mbFailed = false;
  if (!found) found = await spotifyFromBrainz(rec, why).catch((e) => { mbFailed = true; why.push("mb:fejl " + e.message); return null; });
  const d = found || { id: null, retry: mbFailed && !!(site && site.retry) };
  d.why = why.join(", ");
  if (!d.retry) { spotSaved[rec.key] = { d, t: Date.now() }; try { localStorage.setItem("nils3d:spotify-ids", JSON.stringify(spotSaved)); } catch (e) {} }
  return d;
}
const SPOTIFY = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(album|artist)\/([A-Za-z0-9]{10,})/;
function spotifyId(url, kind) { const m = SPOTIFY.exec(url || ""); return m && m[1] === kind ? m[2] : null; }
function spotifyIn(relations, kind) { for (const x of relations || []) { const id = x.url && spotifyId(x.url.resource, kind); if (id) return id; } return null; }
// MusicBrainz allows about one question a second.
let mbNext = 0;
async function brainz(path) {
  const wait = mbNext - Date.now();
  mbNext = Math.max(Date.now(), mbNext) + 1100;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  const r = await fetch("https://musicbrainz.org/ws/2/" + path + (path.indexOf("?") < 0 ? "?" : "&") + "fmt=json", { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
const lucene = (t) => String(t).replace(/[\\+\-!(){}\[\]^"~*?:\/]|&&|\|\|/g, " ").replace(/\s+/g, " ").trim();
async function spotifyFromBrainz(rec, why) {
  const name = rec.artist === "Diverse kunstnere" ? "" : rec.artist;
  const title = cleanTitle(rec.b);
  if (!title) return null;
  const q = 'release:"' + lucene(title) + '"' + (name ? ' AND artist:"' + lucene(name) + '"' : "");
  const res = await brainz("release?limit=25&query=" + encodeURIComponent(q));
  // the digital releases first: those are the ones with links to the streaming services
  const digital = (r) => ((r.media || []).some((m) => /digital/i.test(m.format || "")) ? 1 : 0);
  const list = (res.releases || []).filter((r) => r.score >= 80 && same(r.title, title)).sort((a, b) => digital(b) - digital(a) || b.score - a.score);
  for (const r of list.slice(0, 4)) {
    const full = await brainz("release/" + r.id + "?inc=url-rels");
    const id = spotifyIn(full.relations, "album");
    if (id) { why.push("mb:ok"); return { id, name: "spotify" }; }
  }
  // Not the album: the artist, so you still hear whole songs by them.
  if (name) {
    const a = await brainz("artist?limit=3&query=" + encodeURIComponent('artist:"' + lucene(name) + '"'));
    const best = (a.artists || []).find((x) => x.score >= 90 && same(x.name, name));
    if (best) {
      const full = await brainz("artist/" + best.id + "?inc=url-rels");
      const id = spotifyIn(full.relations, "artist");
      if (id) { why.push("mb:kunstner"); return { id: null, artist: id, name: "spotify" }; }
    }
  }
  why.push("mb:ingen (" + list.length + " udgaver)");
  return null;
}
const cleanTitle = (b) => String(b).replace(/\(.*?\)|\[.*?\]/g, " ").split(" - ")[0].replace(/\s+/g, " ").trim();
function same(x, y) { x = norm(x); y = norm(y); return !!(x && y && (x === y || x.indexOf(y) === 0 || y.indexOf(x) === 0)); }

// Short sound clips (30 seconds) from Deezer, else Apple Music, through the page's own address.
export async function findPreviews(rec) {
  const name = rec.artist === "Diverse kunstnere" ? "" : rec.artist;
  const title = String(rec.b).replace(/\(.*?\)|\[.*?\]/g, " ").split(" - ")[0].replace(/\s+/g, " ").trim();
  const same = (x, y) => { x = norm(x); y = norm(y); return x && y && (x === y || x.indexOf(y) === 0 || y.indexOf(x) === 0); };
  const out = [];
  const q = (name ? 'artist:"' + name.replace(/"/g, "") + '" ' : "") + 'album:"' + title.replace(/"/g, "") + '"';
  const dz = await get("/ext?" + new URLSearchParams({ u: "https://api.deezer.com/search?" + new URLSearchParams({ q, limit: "25" }) }));
  for (const t of (dz && dz.data) || []) {
    if (t.preview && (!t.album || same(t.album.title, title))) out.push({ title: t.title, artist: (t.artist && t.artist.name) || name, url: t.preview, rank: t.rank || 0 });
  }
  if (!out.length) {
    const it = await get("/ext?" + new URLSearchParams({ u: "https://itunes.apple.com/search?" + new URLSearchParams({ term: (name + " " + title).trim(), entity: "song", limit: "25", country: "DK" }) }));
    for (const t of (it && it.results) || []) if (t.previewUrl && same(t.collectionName, title)) out.push({ title: t.trackName, artist: t.artistName, url: t.previewUrl, rank: 0, n: t.trackNumber });
  }
  if (!out.length && name) {
    // Not the album itself: songs by the same artist, so the turntable still plays something by them.
    const any = await get("/ext?" + new URLSearchParams({ u: "https://api.deezer.com/search?" + new URLSearchParams({ q: 'artist:"' + name.replace(/"/g, "") + '"', limit: "10" }) }));
    for (const t of (any && any.data) || []) if (t.preview && t.artist && same(t.artist.name, name)) out.push({ title: t.title, artist: t.artist.name, url: t.preview, rank: t.rank || 0, other: true });
  }
  const seen = new Set();
  return out.filter((t) => { const k = norm(t.title); if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => b.rank - a.rank).slice(0, 12);
}

// The link to the record on the collection page.
export function collectionLink(rec) { return BASE + "/" + (rec.own ? "#e" + rec.id : "#r" + rec.i); }
