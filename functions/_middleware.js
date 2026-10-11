// nils.westerholt.dk: a password-protected record collection served by this function.
// The password is checked here on the server, so it never appears in the page source.
// Only its SHA-256 hash is stored, because this repository is public.
// To change the password: replace PASSWORD_SHA256 with the SHA-256 hex of the new one,
// and re-run tools/opdater-samling.py with the new password (the collection is encrypted with it).
import samling from "../data/samling.js";
import appPage from "../lib/nils-app.js";

const PASSWORD_SHA256 = "629ff2a8c079344a59c0a0f604cbf9ff9cf2bf6273638ec85a31171c7c784724";
const COOKIE = "nils_adgang";

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const host = url.hostname;

  // Never serve the function source, the encrypted data or the tools as static files.
  if (/^\/(functions|data|lib|tools)(\/|$)/.test(url.pathname)) {
    return new Response("Ikke fundet", { status: 404 });
  }

  // The Nils page lives on nils.* hosts. On Cloudflare preview links (*.pages.dev)
  // it can also be reached at /nils, so it can be tried before it goes live.
  const isNilsHost = host.startsWith("nils.");
  const isPreview = host.endsWith(".pages.dev") && (url.pathname === "/nils" || url.pathname.startsWith("/nils/"));
  if (!isNilsHost && !isPreview) {
    return context.next();
  }
  const base = isNilsHost ? "/" : "/nils";
  const prefix = isNilsHost ? "" : "/nils";
  const path = url.pathname.slice(prefix.length) || "/";

  if (request.method === "POST") {
    const form = await request.formData();
    const password = String(form.get("kode") || "");
    if (await isCorrect(password)) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: base,
          "Set-Cookie": `${COOKIE}=${encodeURIComponent(password)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      });
    }
    return page(loginPage(base, true), 401);
  }

  if (url.searchParams.has("log-ud")) {
    return new Response(null, {
      status: 303,
      headers: { Location: base, "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` },
    });
  }

  const password = readCookie(request, COOKIE);
  if (!(await isCorrect(password))) {
    if (path !== "/") return json({ fejl: "Ikke logget ind" }, 401);
    return page(loginPage(base, false));
  }

  if (path === "/samling.json") {
    return new Response(await decryptCollection(password), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-cache", "X-Robots-Tag": "noindex" },
    });
  }
  if (path === "/info") {
    return json(await findInfo(context, url.searchParams.get("a") || "", url.searchParams.get("b") || "", url.searchParams.get("y") || "", url.searchParams.get("m") || ""));
  }
  if (path === "/medvirkende") {
    return json(await findCredits(context, url.searchParams.get("a") || "", url.searchParams.get("b") || "", url.searchParams.get("y") || "", url.searchParams.get("m") || ""));
  }
  if (path === "/person") {
    return json(await findPerson(context, url.searchParams.get("id") || ""));
  }
  if (path === "/kunstnere") {
    return json(await findArtistsOf(context, url.searchParams.get("rg") || "", url.searchParams.get("rel") || ""));
  }
  if (path === "/sang") {
    return json(await findSong(context, url.searchParams.get("q") || ""));
  }
  if (path !== "/") {
    return Response.redirect(new URL(base, url), 302);
  }
  return page(appPage.replaceAll("__BASE__", prefix));
}

// The collection is gzipped JSON, encrypted with AES-GCM using a key made from the password.
async function decryptCollection(password) {
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("nils-samling:" + password));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(samling.iv) }, key, fromBase64(samling.data));
  return new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

// Finds a cover picture and the track list: first in Apple's music catalogue, then in
// MusicBrainz / Cover Art Archive. Results are kept in Cloudflare's cache for a while.
async function findInfo(context, artist, album, year, medium) {
  const name = searchArtist(artist);
  const title = searchTitle(album);
  return cached(context, "info/v3", { a: artist, b: album, y: year, m: medium }, async () => {
    let failed = false;
    const apple = await fromItunes(name, title, year).catch(() => { failed = true; return null; });
    let result = apple || { url: null, tracks: [] };
    if (!apple || !apple.url || !apple.tracks.length) {
      const brainz = await fromMusicBrainz(name, title, year, medium).catch(() => { failed = true; return null; });
      if (brainz) {
        result = {
          url: result.url || brainz.url,
          kilde: result.url ? result.kilde : brainz.url && "Cover Art Archive",
          tracks: result.tracks.length ? result.tracks : brainz.tracks,
          spor: result.tracks.length ? result.spor : brainz.tracks.length ? "MusicBrainz" : undefined,
        };
      }
    }
    if (failed && !result.url && !result.tracks.length) result.retry = true;
    return result;
  });
}

// Finds records with a song of this title, in Apple's catalogue and MusicBrainz.
// Returns artist/album/track hits; the page matches them against the collection itself.
async function findSong(context, query) {
  const q = query.trim().slice(0, 80);
  if (q.length < 3) return { hits: [] };
  return cached(context, "song/v1", { q: q.toLowerCase() }, async () => {
    const wanted = normalize(q);
    const hits = [];
    const [apple, brainz] = await Promise.all([
      getJson("https://itunes.apple.com/search?" + new URLSearchParams({ term: q, entity: "song", attribute: "songTerm", limit: "200", country: "DK" })).catch(() => ({ failed: true })),
      getJson("https://musicbrainz.org/ws/2/recording/?fmt=json&limit=100&query=" + encodeURIComponent(`recording:"${q.replace(/"/g, "")}"`), true).catch(() => ({ failed: true })),
    ]);
    for (const r of (apple && apple.results) || []) {
      if (normalize(r.trackName).includes(wanted)) hits.push({ a: r.artistName, b: r.collectionName, t: r.trackName });
    }
    for (const r of (brainz && brainz.recordings) || []) {
      if (!normalize(r.title).includes(wanted)) continue;
      const by = (r["artist-credit"] || []).map((c) => c.name + (c.joinphrase || "")).join("");
      for (const release of r.releases || []) hits.push({ a: by, b: release.title, t: r.title });
    }
    const seen = new Set();
    if (apple.failed && brainz.failed) return { hits: [], retry: true };
    return { hits: hits.filter((h) => { const k = normalize(h.a) + "|" + normalize(h.b) + "|" + normalize(h.t); return !seen.has(k) && seen.add(k); }) };
  });
}

// Who produced and played on each song, from MusicBrainz. Credits for the whole album
// (release level) are returned separately from the per-song credits.
async function findCredits(context, artist, album, year, medium) {
  const name = searchArtist(artist);
  const title = searchTitle(album);
  return cached(context, "credits/v2", { a: artist, b: album, y: year, m: medium }, async () => {
    let group;
    try {
      group = await findReleaseGroup(name, title, year);
    } catch (e) {
      return { album: [], tracks: [], retry: true };
    }
    if (!group) return { album: [], tracks: [] };
    try {
      const pick = await pickReleases(group.id, year, medium);
      let best = null;
      for (const r of pick) {
        const inc = "recordings+artist-credits+artist-rels+recording-level-rels+work-rels+work-level-rels";
        const release = await getJson(`https://musicbrainz.org/ws/2/release/${r.id}?fmt=json&inc=${inc}`, true);
        const result = creditsOf(release);
        const count = result.album.length + result.tracks.reduce((n, t) => n + t.c.length, 0);
        if (!best || count > best.count) best = { count, result };
        if (count >= 5) break;
      }
      return best ? { ...best.result, mb: group.id } : { album: [], tracks: [] };
    } catch (e) {
      return { album: [], tracks: [], retry: true };
    }
  });
}

function creditsOf(release) {
  const album = credits(release.relations);
  const tracks = [];
  for (const medium of release.media || []) {
    for (const t of medium.tracks || []) {
      const rec = t.recording || {};
      const c = credits(rec.relations);
      for (const rel of rec.relations || []) {
        if (rel.work) c.push(...credits(rel.work.relations));
      }
      tracks.push({ t: t.title, c: merge(c) });
    }
  }
  return { album: merge(album), tracks };
}

// Finds the album in MusicBrainz. The title must match (ignoring edition words such as
// "Remastered"), and the album from the year in the Excel sheet wins over reissues and
// compilations with similar names.
async function findReleaseGroup(name, title, year) {
  const query = `artist:"${name.replace(/"/g, "")}" AND releasegroup:"${title.replace(/"/g, "")}"`;
  const { "release-groups": groups = [] } = await getJson("https://musicbrainz.org/ws/2/release-group/?fmt=json&limit=25&query=" + encodeURIComponent(query), true);
  const candidates = groups.filter((g) => g.score >= 60 && sameAlbum(g.title, title, name) &&
    (g["artist-credit"] || []).some((c) => similar(c.name, name) || similar((c.artist || {}).name, name)));
  return best(candidates, (g) => yearGap(g["first-release-date"], year) * 10 +
    ((g["secondary-types"] || []).includes("Compilation") ? 5 : 0) + ((g["secondary-types"] || []).includes("Live") ? 1 : 0));
}

// The release (edition) closest to the record: same year and format (vinyl or CD) first.
async function pickReleases(groupId, year, medium) {
  const { releases = [] } = await getJson(`https://musicbrainz.org/ws/2/release?fmt=json&limit=50&inc=media&release-group=${groupId}`, true);
  const wantVinyl = /^(LP|MX|Vinyl)/i.test(medium), wantCd = /^CD/i.test(medium);
  const cost = (r) => {
    const formats = (r.media || []).map((m) => m.format || "").join(" ");
    const formatGap = wantVinyl ? (/vinyl/i.test(formats) ? 0 : 3) : wantCd ? (/CD/.test(formats) ? 0 : 3) : 0;
    return yearGap(r.date, year) * 2 + formatGap + (r.status === "Official" ? 0 : 4);
  };
  return releases.slice().sort((x, y) => cost(x) - cost(y)).slice(0, 2);
}

function yearGap(date, year) {
  const found = parseInt(String(date || "").slice(0, 4), 10);
  const wanted = parseInt(year, 10);
  if (!found || !wanted) return 3;
  return Math.min(Math.abs(found - wanted), 20);
}

function best(list, cost) {
  let winner = null, lowest = Infinity;
  for (const item of list) {
    const c = cost(item);
    if (c < lowest) { lowest = c; winner = item; }
  }
  return winner;
}

// Turns MusicBrainz relationships into [{r: role, n: name, id}] entries.
function credits(relations) {
  const out = [];
  for (const rel of relations || []) {
    if (!rel.artist) continue;
    const attrs = plainAttributes(rel);
    let role = ROLES[rel.type];
    if (!role) continue;
    if ((rel.type === "instrument" || rel.type === "vocal") && attrs.length) role = attrs.map(instrument).join(", ");
    if (rel.type === "producer" && (rel.attributes || []).includes("executive")) role = "Executive producer";
    out.push({ r: role, n: rel.artist.name, id: rel.artist.id });
  }
  return out;
}

function plainAttributes(rel) {
  return (rel.attributes || []).filter((a) => !["additional", "guest", "solo", "co", "executive", "assistant", "lead"].includes(a));
}

function merge(list) {
  const seen = new Set();
  return list.filter((c) => { const k = c.r + "|" + c.id; return !seen.has(k) && seen.add(k); });
}

const ROLES = {
  producer: "Producer", instrument: "Spiller", vocal: "Vokal", performer: "Medvirkende", "performing orchestra": "Orkester",
  conductor: "Dirigent", engineer: "Lydtekniker", "recording": "Indspilning", mix: "Mix", mastering: "Mastering",
  arranger: "Arrangement", "instrument arranger": "Arrangement", "vocal arranger": "Arrangement", programming: "Programmering",
  composer: "Musik", lyricist: "Tekst", writer: "Skrevet af",
};

const INSTRUMENTS = {
  guitar: "Guitar", "electric guitar": "El-guitar", "acoustic guitar": "Akustisk guitar", "bass guitar": "Bas", bass: "Bas",
  "drums (drum set)": "Trommer", drums: "Trommer", "drum set": "Trommer", piano: "Klaver", keyboard: "Keyboard", organ: "Orgel",
  "lead vocals": "Forsanger", "background vocals": "Kor", "backing vocals": "Kor", vocals: "Vokal", percussion: "Percussion",
  harmonica: "Mundharmonika", saxophone: "Saxofon", trumpet: "Trompet", violin: "Violin", strings: "Strygere", synthesizer: "Synthesizer",
};

function instrument(name) {
  return INSTRUMENTS[name] || name.charAt(0).toUpperCase() + name.slice(1);
}

// Everything a person has released or is credited on, from MusicBrainz.
async function findPerson(context, id) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { error: "ukendt" };
  return cached(context, "person/v2", { id }, async () => {
    try {
      const [artist, own] = await Promise.all([
        getJson(`https://musicbrainz.org/ws/2/artist/${id}?fmt=json&inc=release-group-rels+release-rels`, true),
        getJson(`https://musicbrainz.org/ws/2/release-group?fmt=json&limit=100&artist=${id}&type=album|ep`, true),
      ]);
      const credited = [];
      for (const rel of artist.relations || []) {
        const target = rel["release-group"] || rel.release;
        if (!target || !ROLES[rel.type]) continue;
        const role = rel.type === "instrument" || rel.type === "vocal" ? plainAttributes(rel).map(instrument).join(", ") || ROLES[rel.type] : ROLES[rel.type];
        credited.push({ t: target.title, y: (target["first-release-date"] || target.date || "").slice(0, 4), r: role, id: target.id, k: rel["release-group"] ? "rg" : "rel" });
      }
      return {
        name: artist.name,
        about: artist.disambiguation || "",
        own: (own["release-groups"] || []).map((g) => ({ t: g.title, y: (g["first-release-date"] || "").slice(0, 4) })),
        credited: credited.filter((c, i) => credited.findIndex((o) => o.t === c.t && o.r === c.r) === i),
      };
    } catch (e) {
      return { retry: true };
    }
  });
}

// The main artist of some albums and releases (people's credits only give the album title).
async function findArtistsOf(context, rgIds, releaseIds) {
  const clean = (ids) => ids.split(",").filter((id) => /^[0-9a-f-]{36}$/.test(id)).slice(0, 40);
  const rg = clean(rgIds), rel = clean(releaseIds);
  return cached(context, "artists/v1", { rg: rg.join(","), rel: rel.join(",") }, async () => {
    const out = {};
    const credit = (x) => (x["artist-credit"] || []).map((c) => c.name + (c.joinphrase || "")).join("");
    try {
      if (rg.length) {
        const r = await getJson("https://musicbrainz.org/ws/2/release-group/?fmt=json&limit=100&query=" + encodeURIComponent(rg.map((id) => "rgid:" + id).join(" OR ")), true);
        for (const g of r["release-groups"] || []) out[g.id] = credit(g);
      }
      if (rel.length) {
        const r = await getJson("https://musicbrainz.org/ws/2/release/?fmt=json&limit=100&query=" + encodeURIComponent(rel.map((id) => "reid:" + id).join(" OR ")), true);
        for (const x of r.releases || []) out[x.id] = credit(x);
      }
    } catch (e) {
      return { artists: out, retry: true };
    }
    return { artists: out, found: Object.keys(out).length };
  });
}

async function cached(context, kind, params, work) {
  const cacheKey = new Request(`https://lookup-cache.westerholt.dk/${kind}?` + new URLSearchParams(params));
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();
  const result = await work();
  if (result.retry) return result; // a lookup failed: don't remember the empty answer
  const found = result.url || (result.tracks && result.tracks.length) || (result.hits && result.hits.length) || result.name || result.found;
  const days = found ? 30 : 2;
  context.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${days * 86400}` },
  })));
  return result;
}

async function getJson(url, brainz) {
  const headers = brainz ? { "User-Agent": "westerholt.dk-pladesamling/1.0 ( https://westerholt.dk )", Accept: "application/json" } : {};
  let response = await fetch(url, { headers });
  if (brainz && response.status === 503) {
    // MusicBrainz allows about one request per second; wait a moment and try once more.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    response = await fetch(url, { headers });
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function fromItunes(name, title, year) {
  const { results = [] } = await getJson("https://itunes.apple.com/search?" + new URLSearchParams({ term: `${name} ${title}`, entity: "album", limit: "50", country: "DK" }));
  const candidates = results.filter((r) => similar(r.artistName, name) && sameAlbum(r.collectionName, title, name));
  // Apple often dates remasters by the reissue, so the year only decides between equal titles.
  const pickR = best(candidates, (r) => yearGap(r.releaseDate, year) + (/compilation/i.test(r.collectionType || "") ? 5 : 0) + (r.collectionExplicitness === "cleaned" ? 1 : 0));
  if (!pickR) return null;
  const best_ = { r: pickR };
  const tracks = [];
  try {
    const lookup = await getJson("https://itunes.apple.com/lookup?" + new URLSearchParams({ id: best_.r.collectionId, entity: "song", country: "DK" }));
    for (const t of lookup.results || []) {
      if (t.wrapperType === "track") tracks.push({ d: t.discNumber || 1, n: t.trackNumber, t: t.trackName, ms: t.trackTimeMillis || 0 });
    }
    tracks.sort((x, y) => x.d - y.d || x.n - y.n);
  } catch (e) {}
  const url = best_.r.artworkUrl100 ? best_.r.artworkUrl100.replace("100x100bb", "600x600bb") : null;
  return { url, kilde: url ? "Apple Music" : undefined, tracks, spor: tracks.length ? "Apple Music" : undefined };
}

async function fromMusicBrainz(name, title, year, medium) {
  const group = await findReleaseGroup(name, title, year);
  if (!group) return null;
  const art = `https://coverartarchive.org/release-group/${group.id}/front-500`;
  const [check, releases] = await Promise.all([
    fetch(art, { method: "HEAD" }).catch(() => ({ ok: false })),
    pickReleases(group.id, year, medium)
      .then((list) => list.length ? getJson(`https://musicbrainz.org/ws/2/release/${list[0].id}?fmt=json&inc=recordings`, true) : null)
      .catch(() => null),
  ]);
  const tracks = [];
  const release = releases && (releases.media || []).some((m) => (m.tracks || []).length) ? releases : null;
  if (release) {
    release.media.forEach((m, i) => (m.tracks || []).forEach((t) => tracks.push({ d: m.position || i + 1, n: t.position, t: t.title, ms: t.length || 0 })));
  }
  return { url: check.ok ? art : null, tracks };
}

// "Adams, Bryan" -> "Bryan Adams" (but leave names like "Crosby, Stills & Nash" alone).
function searchArtist(artist) {
  const parts = artist.split(",");
  if (parts.length === 2 && parts[1].trim().split(/\s+/).length <= 3 && !/[&+]/.test(artist)) {
    return `${parts[1].trim()} ${parts[0].trim()}`;
  }
  return artist.trim();
}

function searchTitle(album) {
  return album.replace(/\(.*?\)|\[.*?\]/g, " ").replace(/\s+/g, " ").trim();
}

function normalize(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ").replace(/^the\s+/, "").replace(/[^a-z0-9æøå]+/g, " ").trim();
}

function similar(a, b) {
  const x = normalize(a), y = normalize(b);
  return x === y || x.includes(y) || y.includes(x);
}

// Same album title, ignoring brackets, edition words ("Remastered", "Deluxe Edition" …),
// a " - Remastered 2014"-style suffix and the artist's name in front ("Led Zeppelin IV" = "IV").
const EDITION = /\b(remaster(ed)?|deluxe|edition|expanded|anniversary|version|bonus|tracks?|mono|stereo|digital|legacy|special|collectors?|super|reissue|\d+(th|st|nd|rd))\b/g;
function bareAlbum(text, artist) {
  let x = normalize(String(text || "").replace(/\(.*?\)|\[.*?\]/g, " "));
  const dash = String(text || "").split(" - ");
  if (dash.length > 1 && EDITION.test(normalize(dash[dash.length - 1]))) x = normalize(dash.slice(0, -1).join(" - ").replace(/\(.*?\)|\[.*?\]/g, " "));
  EDITION.lastIndex = 0;
  x = x.replace(EDITION, " ").replace(/\s+/g, " ").trim() || x;
  const a = normalize(artist);
  if (a && x.startsWith(a + " ")) x = x.slice(a.length + 1);
  return x;
}

function sameAlbum(found, wanted, artist) {
  const x = bareAlbum(found, artist), y = bareAlbum(wanted, artist);
  return !!x && x === y;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}

async function isCorrect(password) {
  if (!password) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === PASSWORD_SHA256;
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function page(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

const STYLE = `
:root{--bg:#F6F1E9;--card:#FFFDF9;--ink:#221B16;--text:#4A403A;--muted:#85776C;--line:#E6DCCF;--accent:#C2532E;--accent-hi:#A8441F;--error:#A33A2E}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:var(--bg);color:var(--text);font-family:"Schibsted Grotesk",Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:16px}
.card{width:100%;max-width:380px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:32px 28px;text-align:center}
.mark{width:56px;height:56px;margin:0 auto 18px;border-radius:50%;background:radial-gradient(circle,var(--accent) 0 22%,var(--card) 22% 27%,var(--ink) 27%);color:transparent;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:18px}
h1{color:var(--ink);font-size:22px;margin:0 0 6px;letter-spacing:-.01em}
p{margin:0 0 22px;color:var(--muted);line-height:1.5}
input{width:100%;font:inherit;font-size:16px;padding:12px 14px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);margin-bottom:12px}
input:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
button,.btn{display:block;width:100%;font:inherit;font-weight:600;font-size:16px;padding:12px;border:0;border-radius:8px;background:var(--accent);color:#fff;cursor:pointer;text-decoration:none}
button:hover,.btn:hover{background:var(--accent-hi)}
.error{color:var(--error);font-size:14px;margin:-4px 0 12px}
`;

function shell(title, inner) {
  return `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400..700&display=swap" rel="stylesheet">
<style>${STYLE}</style>
</head>
<body>
<main class="card">
${inner}
</main>
</body>
</html>`;
}

function loginPage(base, wrong) {
  return shell("Nils", `
<div class="mark"></div>
<h1>Pladesamlingen</h1>
<p>Skriv koden for at komme ind.</p>
<form method="post" action="${base}">
  <input type="password" name="kode" placeholder="Kode" autocomplete="current-password" autofocus required aria-label="Kode">
  ${wrong ? '<div class="error">Forkert kode. Prøv igen.</div>' : ""}
  <button type="submit">Log ind</button>
</form>`);
}
