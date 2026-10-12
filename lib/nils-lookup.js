// Looks things up about the records in other music catalogues: covers, track lists,
// who played on what, and which records have a given song. Used by functions/_middleware.js.

// Finds a cover picture and the track list: first in Apple's music catalogue, then in
// MusicBrainz / Cover Art Archive. Results are kept in Cloudflare's cache for a while.
export async function findInfo(context, artist, album, year, medium) {
  const name = searchArtist(artist);
  const title = searchTitle(album);
  return cached(context, "info/v4", { a: artist, b: album, y: year, m: medium }, async () => {
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

// Who produced and played on each song, from MusicBrainz. Credits for the whole album
// (release level) are returned separately from the per-song credits.
export async function findCredits(context, artist, album, year, medium) {
  const name = searchArtist(artist);
  const title = searchTitle(album);
  return cached(context, "credits/v3", { a: artist, b: album, y: year, m: medium }, async () => {
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
    const role = roleOf(rel);
    if (rel.artist && role) out.push({ r: role, n: rel.artist.name, id: rel.artist.id });
  }
  return out;
}

function roleOf(rel) {
  let role = ROLES[rel.type];
  if (!role) return "";
  const attrs = plainAttributes(rel);
  if ((rel.type === "instrument" || rel.type === "vocal") && attrs.length) role = attrs.map(instrument).join(", ");
  if (rel.type === "producer" && (rel.attributes || []).includes("executive")) role = "Executive producer";
  return role;
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

async function cached(context, kind, params, work) {
  const cacheKey = new Request(`https://lookup-cache.westerholt.dk/${kind}?` + new URLSearchParams(params));
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();
  const result = await work();
  if (result.retry || result.partial) return result; // a lookup failed: don't remember the incomplete answer
  const found = result.url || (result.tracks && result.tracks.length) || (result.songs && result.songs.length) || result.name;
  const days = found ? 30 : 2;
  context.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${days * 86400}` },
  })));
  return result;
}

async function getJson(url, brainz) {
  const headers = brainz ? { "User-Agent": "westerholt.dk-pladesamling/1.0 ( https://westerholt.dk )", Accept: "application/json" } : {};
  let response = await fetch(url, { headers });
  for (let tries = 0; brainz && response.status === 503 && tries < 2; tries++) {
    // MusicBrainz allows about one request per second; wait a moment and try again.
    await sleep(1200 + tries * 800);
    response = await fetch(url, { headers });
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

// MusicBrainz calls made one after another, about a second apart, as MusicBrainz asks.
let brainzFree = 0;
async function brainz(path) {
  const now = Date.now();
  const wait = brainzFree - now;
  brainzFree = Math.max(now, brainzFree) + 1050;
  if (wait > 0) await sleep(wait);
  return getJson("https://musicbrainz.org/ws/2/" + path, true);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  return coreTitle(album).replace(/\s+/g, " ").trim();
}

// The title without brackets and without a note after a dash, which the sheet often has
// ("Led Zeppelin II ‑ japanese version", "Listen to this, Eddie ‑ Live Bootleg").
const DASH = /\s+[-‐‑‒–—]\s+/;
const NOTE = /\b(remaster(ed)?|deluxe|edition|expanded|anniversary|version|bonus|mono|stereo|digital|legacy|special|collectors?|reissue|japanese|japan|bootleg|picture|import|promo|pressing|colou?red|definitive|uk|us|german|danish|dutch|french|italian|swedish|\d+(th|st|nd|rd))\b/;
function coreTitle(text) {
  let raw = String(text || "").replace(/\(.*?\)|\[.*?\]/g, " ");
  const parts = raw.split(DASH);
  if (parts.length > 1 && NOTE.test(normalize(parts[parts.length - 1])) && normalize(parts.slice(0, -1).join(" "))) {
    raw = parts.slice(0, -1).join(" - ");
  }
  return raw;
}

export function normalize(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`´]/g, "")
    .replace(/&/g, " and ").replace(/^the\s+/, "").replace(/[^a-z0-9æøå]+/g, " ").trim();
}

function similar(a, b) {
  const x = normalize(a), y = normalize(b);
  return x === y || x.includes(y) || y.includes(x);
}

// Same album title, ignoring brackets, edition words ("Remastered", "Deluxe Edition" …),
// a note after a dash, the artist's name in front ("Led Zeppelin IV" = "IV") and one typo.
const EDITION = /\b(remaster(ed)?|deluxe|edition|expanded|anniversary|version|bonus|tracks?|mono|stereo|digital|legacy|special|collectors?|super|reissue|\d+(th|st|nd|rd))\b/g;
export function bareAlbum(text, artist) {
  let x = normalize(coreTitle(text));
  x = x.replace(EDITION, " ").replace(/\s+/g, " ").trim() || x;
  const a = normalize(artist);
  if (a && x.startsWith(a + " ")) x = x.slice(a.length + 1);
  return x;
}

export function sameAlbum(found, wanted, artist) {
  const x = bareAlbum(found, artist), y = bareAlbum(wanted, artist);
  return !!x && (x === y || oneTypo(x, y));
}

// "wtih the beatles" = "with the beatles", but never "led zeppelin ii" = "led zeppelin iii" or "chicago 16" = "chicago 17".
function oneTypo(x, y) {
  const a = x.split(" "), b = y.split(" ");
  if (a.length !== b.length || a.length < 2) return false;
  const diff = a.map((w, i) => [w, b[i]]).filter(([v, w]) => v !== w);
  if (diff.length !== 1) return false;
  const [v, w] = diff[0];
  if (v.length < 4 || w.length < 4 || /\d/.test(v + w) || /^[ivxlc]+$/.test(v) || /^[ivxlc]+$/.test(w)) return false;
  return editDistance(v, w) <= 1;
}

function editDistance(a, b) {
  const d = [];
  for (let i = 0; i <= a.length; i++) d.push([i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// "Stairway to Heaven (Remaster)" and "Stairway to Heaven - Live" both count as "stairway to heaven".
export function songKey(title) {
  let raw = String(title || "").replace(/\(.*?\)|\[.*?\]/g, " ");
  const parts = raw.split(DASH);
  if (parts.length > 1 && normalize(parts[0])) raw = parts[0];
  return normalize(raw);
}

export function songMatches(title, wanted) {
  const t = songKey(title);
  return t === wanted || (" " + t + " ").includes(" " + wanted + " ");
}

// ---- Song search ----------------------------------------------------------------------
// Finds every record in the collection with a song of this title. MusicBrainz is asked about
// all the collection's artists at once (in a few batches), so popular songs by other artists
// can't crowd them out; Apple Music and Deezer then add the official albums of the artists found.
export async function findSongs(context, query, readCollection) {
  const q = query.replace(/\s+/g, " ").trim().slice(0, 80);
  const wanted = songKey(q);
  if (wanted.length < 3) return { songs: [], people: [] };
  const shelf = await openShelf(readCollection);
  return cached(context, "songs/v1", { q: wanted, v: shelf.version }, async () => {
    const hits = [];
    let failed = 0, asked = 0;
    const phrase = '"' + lucene(q) + '"';
    const keep = (rec, extra) => {
      if (!songMatches(rec.title, wanted)) return;
      const by = creditNames(rec["artist-credit"]);
      for (const rel of rec.releases || []) {
        hits.push({ by: rel["artist-credit"] ? creditNames(rel["artist-credit"]).concat(by) : by, album: rel.title, song: rec.title });
        const group = rel["release-group"] || {};
        if (group.title && group.title !== rel.title) hits.push({ by, album: group.title, song: rec.title });
      }
    };
    const apple = getJson("https://itunes.apple.com/search?" + new URLSearchParams({ term: q, entity: "song", attribute: "songTerm", limit: "200", country: "DK" }))
      .then((r) => (r.results || []).forEach((t) => hits.push({ by: [t.artistName], album: t.collectionName, song: t.trackName })))
      .catch(() => { failed++; });
    // 1. MusicBrainz, for the collection's artists (also finds bootlegs and live albums).
    const batches = batchNames(shelf.names, 5000);
    batches.push(null); // plus one search without the artist filter, for names spelt differently
    for (const names of batches) {
      for (let offset = 0; offset < 300; offset += 100) {
        const filter = names ? " AND (" + names.map((n) => 'artistname:"' + lucene(n) + '"').join(" OR ") + ")" : "";
        asked++;
        const res = await brainz("recording?fmt=json&limit=100&offset=" + offset + "&query=" + encodeURIComponent("recording:" + phrase + filter)).catch(() => null);
        if (!res) { failed++; break; }
        (res.recordings || []).forEach((rec) => keep(rec));
        if (!names || (res.count || 0) <= offset + 100) break;
      }
    }
    // 2. The collection artists that have the song: their albums in Apple Music and Deezer.
    await apple;
    const found = new Map();
    for (const h of hits) {
      for (const name of h.by) {
        const mine = recordsBy(shelf, name);
        if (mine.length) { found.set(shelf.records[mine[0]].a, (found.get(shelf.records[mine[0]].a) || 0) + 1); break; }
      }
    }
    const top = [...found.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([a]) => searchArtist(a));
    await Promise.all([...top.map((artist) => Promise.all([
      getJson("https://itunes.apple.com/search?" + new URLSearchParams({ term: artist + " " + q, entity: "song", limit: "200", country: "DK" }))
        .then((r) => (r.results || []).forEach((t) => hits.push({ by: [t.artistName], album: t.collectionName, song: t.trackName })))
        .catch(() => {}),
      getJson("https://api.deezer.com/search?" + new URLSearchParams({ q: 'artist:"' + artist.replace(/"/g, "") + '" track:"' + q.replace(/"/g, "") + '"', limit: "100" }))
        .then((r) => (r.data || []).forEach((t) => hits.push({ by: [(t.artist || {}).name], album: (t.album || {}).title, song: t.title })))
        .catch(() => {}),
    ]))]);
    // 3. Match the hits against the records.
    const songs = new Map();
    for (const h of hits) {
      if (!h.album || !songMatches(h.song, wanted) || isBonus(h.album, h.song)) continue;
      const seen = new Set();
      for (const name of h.by) {
        for (const i of recordsBy(shelf, name)) {
          if (seen.has(i)) continue;
          seen.add(i);
          const r = shelf.records[i];
          if (!sameAlbum(h.album, r.b, searchArtist(r.a)) && !sameAlbum(h.album, r.b, r.a)) continue;
          if (!songs.has(i)) songs.set(i, []);
          const titles = songs.get(i);
          const same = titles.findIndex((t) => songKey(t) === songKey(h.song));
          if (same < 0) titles.push(h.song);
          else if (h.song.length < titles[same].length) titles[same] = h.song; // "Stairway to Heaven" over "Stairway to Heaven (Remaster)"
        }
      }
    }
    const people = await findPeople(q).catch(() => []);
    const result = { songs: [...songs.entries()].map(([i, s]) => ({ i, s })), people };
    if (failed && failed >= asked + 1) result.retry = true;
    else if (failed) result.partial = true;
    return result;
  });
}

// A demo or alternate mix on the bonus disc of a deluxe edition isn't on the original record.
function isBonus(album, song) {
  return /deluxe|expanded|anniversary|bonus|super|legacy|special|companion/i.test(album) &&
    /\(([^)]*\b(mix|version|demo|take|rough|alternate|outtake|rehearsal|session|instrumental|reference|backing|work in progress))\b[^)]*\)|\[[^\]]*\b(mix|version|demo|take|rough|alternate|outtake)\b/i.test(song);
}

// People (or bands) with this name, so a search for "Jimmy Page" can open his page.
async function findPeople(q) {
  const wanted = normalize(q);
  const res = await brainz("artist?fmt=json&limit=8&query=" + encodeURIComponent('artist:"' + lucene(q) + '" OR alias:"' + lucene(q) + '"'));
  return (res.artists || [])
    .filter((a) => a.score >= 90 && (normalize(a.name) === wanted || (normalize(a["sort-name"]) === wanted) ||
      (a.aliases || []).some((x) => normalize(x.name) === wanted)))
    .slice(0, 3)
    .map((a) => ({ id: a.id, n: a.name, about: a.disambiguation || (a.type === "Group" ? "Band" : "") }));
}

// ---- A person's page ------------------------------------------------------------------
// Everything a person played on, produced or released: the records in the collection first,
// each with the songs and what they did, then other albums the same way.
export async function findPerson(context, id, readCollection) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { error: "ukendt" };
  const shelf = await openShelf(readCollection);
  return cached(context, "person/v3", { id, v: shelf.version }, async () => {
    let artist;
    try {
      artist = await brainz(`artist/${id}?fmt=json&inc=recording-rels+release-rels+release-group-rels+artist-rels+aliases`);
    } catch (e) {
      return { retry: true };
    }
    const mine = new Map(), other = new Map();
    const mineOf = (i) => {
      if (!mine.has(i)) mine.set(i, { i, album: [], songs: [] });
      return mine.get(i);
    };
    const addRole = (list, role) => { if (role && !list.includes(role)) list.push(role); };
    const addSong = (entry, song, roles) => {
      let s = entry.songs.find((x) => songKey(x.s) === songKey(song));
      if (!s) entry.songs.push((s = { s: song, r: [] }));
      roles.forEach((r) => addRole(s.r, r));
    };
    const otherOf = (key, title, by, date, group) => {
      if (!other.has(key)) other.set(key, { t: title, a: by, y: "", album: [], songs: [], type: groupType(group) });
      const o = other.get(key);
      const y = String(date || "").slice(0, 4);
      if (y && (!o.y || y < o.y)) o.y = y;
      return o;
    };
    const names = [artist.name, ...(artist.aliases || []).map((a) => a.name)];

    // 1. Their own records, and records by bands they were in.
    for (const name of names) for (const i of recordsBy(shelf, name)) addRole(mineOf(i).album, "Egen plade");
    const recordings = new Map(), albums = [];
    for (const rel of artist.relations || []) {
      if (rel.type === "member of band" && rel.artist && rel.direction !== "backward") {
        for (const i of recordsBy(shelf, rel.artist.name)) addRole(mineOf(i).album, "Medlem af " + rel.artist.name);
        continue;
      }
      const role = roleOf(rel);
      if (!role) continue;
      if (rel.recording) {
        if (!recordings.has(rel.recording.id)) recordings.set(rel.recording.id, []);
        addRole(recordings.get(rel.recording.id), role);
      } else if (rel.release || rel["release-group"]) {
        albums.push({ id: (rel.release || rel["release-group"]).id, group: !!rel["release-group"], role });
      }
    }

    // 2. The songs they're credited on, and which albums those songs are on.
    const ids = [...recordings.keys()];
    const limit = 800;
    let failed = false;
    for (let k = 0; k < Math.min(ids.length, limit); k += 80) {
      const part = ids.slice(k, k + 80);
      let res;
      try {
        res = await brainz("recording?fmt=json&limit=100&query=" + encodeURIComponent(part.map((x) => "rid:" + x).join(" OR ")));
      } catch (e) {
        failed = true;
        continue;
      }
      for (const rec of res.recordings || []) {
        const roles = recordings.get(rec.id) || [];
        const by = creditNames(rec["artist-credit"]);
        for (const rel of rec.releases || []) {
          const relBy = rel["artist-credit"] ? creditNames(rel["artist-credit"]) : by;
          const hits = matchRecords(shelf, relBy, [rel.title, (rel["release-group"] || {}).title]);
          if (hits.length) { hits.forEach((i) => addSong(mineOf(i), rec.title, roles)); continue; }
          const group = rel["release-group"] || {};
          if (!worthShowing(rel, group)) continue;
          addSong(otherOf(group.id || rel.id, group.title || rel.title, relBy[0] || "", rel.date, group), rec.title, roles);
        }
      }
    }

    // 3. Whole albums they're credited on (producer of the album, for example).
    const groupIds = albums.filter((a) => a.group).map((a) => a.id).slice(0, 60);
    const releaseIds = albums.filter((a) => !a.group).map((a) => a.id).slice(0, 60);
    const roleFor = (x) => albums.filter((a) => a.id === x).map((a) => a.role);
    try {
      if (groupIds.length) {
        const res = await brainz("release-group/?fmt=json&limit=100&query=" + encodeURIComponent(groupIds.map((x) => "rgid:" + x).join(" OR ")));
        for (const g of res["release-groups"] || []) {
          const by = creditNames(g["artist-credit"]);
          const hits = matchRecords(shelf, by, [g.title]);
          if (hits.length) hits.forEach((i) => roleFor(g.id).forEach((r) => addRole(mineOf(i).album, r)));
          else if (worthShowing({ status: "Official" }, g)) roleFor(g.id).forEach((r) => addRole(otherOf(g.id, g.title, by[0] || "", g["first-release-date"], g).album, r));
        }
      }
      if (releaseIds.length) {
        const res = await brainz("release/?fmt=json&limit=100&query=" + encodeURIComponent(releaseIds.map((x) => "reid:" + x).join(" OR ")));
        for (const x of res.releases || []) {
          const by = creditNames(x["artist-credit"]);
          const group = x["release-group"] || {};
          const hits = matchRecords(shelf, by, [x.title, group.title]);
          if (hits.length) hits.forEach((i) => roleFor(x.id).forEach((r) => addRole(mineOf(i).album, r)));
          else if (worthShowing(x, group)) roleFor(x.id).forEach((r) => addRole(otherOf(group.id || x.id, group.title || x.title, by[0] || "", x.date, group).album, r));
        }
      }
    } catch (e) {
      failed = true;
    }

    const byYear = (a, b) => (+a.y || 9999) - (+b.y || 9999) || a.t.localeCompare(b.t);
    const result = {
      name: artist.name,
      about: artist.disambiguation || "",
      mine: [...mine.values()],
      other: [...other.values()].sort(byYear).slice(0, 200).map((o) => ({ ...o, songs: o.songs.slice(0, 40) })),
      songsChecked: Math.min(ids.length, limit),
      songsTotal: ids.length,
    };
    if (failed) result.partial = true;
    return result;
  });
}

// Only proper albums and EPs in "other releases": no singles, compilations or bootlegs.
function worthShowing(release, group) {
  if (release.status && release.status !== "Official") return false;
  const type = group["primary-type"] || "";
  const extra = group["secondary-types"] || [];
  return (type === "Album" || type === "EP") && !extra.includes("Compilation") && !extra.includes("DJ-mix") && !extra.includes("Mixtape/Street");
}

function groupType(group) {
  const extra = (group && group["secondary-types"]) || [];
  if (extra.includes("Live")) return "Live";
  if (extra.includes("Soundtrack")) return "Soundtrack";
  return group && group["primary-type"] === "EP" ? "EP" : "";
}

// ---- The collection, indexed by artist ------------------------------------------------
let shelfMemo = null;
async function openShelf(readCollection) {
  const data = await readCollection();
  if (shelfMemo && shelfMemo.data === data) return shelfMemo;
  const byArtist = new Map();
  data.records.forEach((r, i) => {
    for (const key of artistKeys(r.a)) {
      if (!byArtist.has(key)) byArtist.set(key, []);
      byArtist.get(key).push(i);
    }
  });
  const names = [...new Set(data.records.map((r) => searchArtist(r.a)))].filter((n) => normalize(n));
  shelfMemo = { data, records: data.records, byArtist, names, version: String(data.version || "") + "-" + data.records.length };
  return shelfMemo;
}

export { openShelf as _openShelf };

function artistKeys(name) {
  return [...new Set([normalize(name), normalize(searchArtist(name))])].filter(Boolean);
}

// The records by this artist ("The Beatles" finds "Beatles", "Eva Cassidy" finds "Cassidy, Eva").
function recordsBy(shelf, name) {
  const out = [];
  for (const key of artistKeys(name || "")) for (const i of shelf.byArtist.get(key) || []) if (!out.includes(i)) out.push(i);
  return out;
}

function matchRecords(shelf, by, titles) {
  const out = [];
  for (const name of by) {
    for (const i of recordsBy(shelf, name)) {
      const r = shelf.records[i];
      if (out.includes(i)) continue;
      if (titles.some((t) => t && (sameAlbum(t, r.b, searchArtist(r.a)) || sameAlbum(t, r.b, r.a)))) out.push(i);
    }
  }
  return out;
}

// All the names in a MusicBrainz artist credit: the whole credit ("Page & Plant") and each artist.
function creditNames(credit) {
  const list = credit || [];
  const whole = list.map((c) => c.name + (c.joinphrase || "")).join("");
  const out = [whole];
  for (const c of list) {
    if (c.name) out.push(c.name);
    if (c.artist && c.artist.name) out.push(c.artist.name);
  }
  return [...new Set(out.filter(Boolean))];
}

function lucene(text) {
  return String(text).replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
}

function batchNames(names, maxLength) {
  const batches = [];
  let current = [], length = 0;
  for (const n of names) {
    const size = encodeURIComponent('artistname:"' + lucene(n) + '" OR ').length;
    if (current.length && length + size > maxLength) { batches.push(current); current = []; length = 0; }
    current.push(n);
    length += size;
  }
  if (current.length) batches.push(current);
  return batches;
}
