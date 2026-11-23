// Covers chosen by hand: when the automatic search finds the wrong cover (or none), the page lets
// you pick the right one. The choices are kept in Cloudflare KV, in the same store as the wishlist
// (bound as ONSKELISTE), under one key. Used by functions/_middleware.js.

const KEY = "omslag";
const COVER_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(mzstatic\.com|dzcdn\.net|deezer\.com|coverartarchive\.org|archive\.org)\//;

// GET: all choices, as { "artist|album|year|format": { u: cover, k: source, t: tracks } }.
// POST { handling: "vaelg", r: {a, b, y, m}, cover, kilde, id }: choose a cover (and, when the
// album is known in Apple Music or Deezer, its track list). POST { handling: "nulstil", r }: undo.
export async function handleCovers(context, request) {
  const store = context.env && context.env.ONSKELISTE;
  if (!store) return reply({ fejl: "mangler-lager" }, 503);
  if (request.method === "GET") return reply({ omslag: await load(store) });
  if (request.method !== "POST") return reply({ fejl: "ukendt" }, 405);
  // Only the page's own scripts send JSON, so other websites can't change anything.
  if (!/^application\/json/.test(request.headers.get("Content-Type") || "")) return reply({ fejl: "ukendt" }, 415);
  let body;
  try { body = await request.json(); } catch (e) { return reply({ fejl: "ukendt" }, 400); }
  const key = keyOf(body.r);
  if (!key) return reply({ fejl: "ukendt" }, 400);
  const all = await load(store);
  if (body.handling === "nulstil") {
    delete all[key];
  } else if (body.handling === "vaelg") {
    const cover = String(body.cover || "").slice(0, 600);
    if (!COVER_HOSTS.test(cover)) return reply({ fejl: "Det billede kan ikke bruges." }, 400);
    const kilde = ["Apple Music", "Deezer"].includes(body.kilde) ? body.kilde : "";
    const tracks = await tracksOf(kilde, String(body.id || "")).catch(() => []);
    all[key] = { u: cover, k: kilde, at: new Date().toISOString() };
    if (tracks.length) all[key].t = tracks;
  } else {
    return reply({ fejl: "ukendt" }, 400);
  }
  await store.put(KEY, JSON.stringify(all));
  return reply({ omslag: all });
}

// The same key the page uses: artist, album, year and format exactly as in the sheet.
function keyOf(r) {
  if (!r || typeof r !== "object") return "";
  const part = (v, max) => String(v == null ? "" : v).slice(0, max);
  const key = [part(r.a, 200), part(r.b, 300), part(r.y, 10), part(r.m, 20)].join("|");
  return r.a || r.b ? key : "";
}

async function load(store) {
  const all = await store.get(KEY, "json").catch(() => null);
  return all && typeof all === "object" && !Array.isArray(all) ? all : {};
}

async function tracksOf(kilde, id) {
  if (!/^\d{1,15}$/.test(id)) return [];
  const tracks = [];
  if (kilde === "Apple Music") {
    const res = await fetch("https://itunes.apple.com/lookup?" + new URLSearchParams({ id, entity: "song", country: "DK" }), { signal: AbortSignal.timeout(8000) });
    const data = res.ok ? await res.json() : {};
    for (const t of data.results || []) if (t.wrapperType === "track") tracks.push({ d: t.discNumber || 1, n: t.trackNumber, t: t.trackName, ms: t.trackTimeMillis || 0 });
  } else if (kilde === "Deezer") {
    const res = await fetch(`https://api.deezer.com/album/${id}/tracks?limit=200`, { signal: AbortSignal.timeout(8000) });
    const data = res.ok ? await res.json() : {};
    (data.data || []).forEach((t, i) => tracks.push({ d: t.disk_number || 1, n: t.track_position || i + 1, t: t.title, ms: (t.duration || 0) * 1000 }));
  }
  return tracks.sort((x, y) => x.d - y.d || x.n - y.n).slice(0, 200);
}

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
