// The values of the records for the page (/priser), and how far the price run on GitHub has got.
// The values come from data/priser.js (saved by tools/discogs-priser.mjs when a run ends). While a
// run is going, it sends what it has found so far, and its progress, to this address; they are kept
// in Cloudflare KV (the ONSKELISTE store, as the wishlist) so the page can show them at once:
//   priser-live:   { rev, priser: { record key: value } }  values newer than the file (each has ts),
//                  sent and kept as text (it can be the whole collection), so it is never parsed here
//   priser-status: { running, done, total, started, updated, ... }  for the progress bar
// The page puts the live values over the file's ones when they are newer. Nothing big is parsed
// here, so it costs the server next to nothing.
const LIVE = "priser-live", STATUS = "priser-status";

// GET /priser: { priser: the file's values, live: newer ones as JSON text or null, status: the run or null }.
// GET /priser?status: only the status (the page asks every 15 seconds while a run is going).
// POST /priser { status, live: JSON text }: from the price run (logged in with the password like the page).
export async function handlePrices(context, request, url, file) {
  const store = context.env && context.env.ONSKELISTE;
  if (request.method === "POST") {
    if (!store) return reply({ fejl: "mangler-lager" }, 503);
    if (!/^application\/json/.test(request.headers.get("Content-Type") || "")) return reply({ fejl: "ukendt" }, 415);
    const text = await request.text();
    if (text.length > 4e6) return reply({ fejl: "for stor" }, 413);
    let body;
    try { body = JSON.parse(text); } catch (e) { return reply({ fejl: "ukendt" }, 400); }
    if (!body || typeof body !== "object") return reply({ fejl: "ukendt" }, 400);
    if (body.status && typeof body.status === "object") await store.put(STATUS, JSON.stringify(body.status));
    if (typeof body.live === "string" && /^\{"rev":\d+,"priser":\{/.test(body.live) && body.live.endsWith("}}")) await store.put(LIVE, body.live);
    return reply({ ok: true });
  }
  if (request.method !== "GET") return reply({ fejl: "ukendt" }, 405);
  const status = store ? await store.get(STATUS).catch(() => null) : null;
  if (url.searchParams.has("status")) return raw(`{"status":${status || "null"}}`, { "Cache-Control": "private, no-store" });
  const live = store ? await store.get(LIVE).catch(() => null) : null;
  // The same answer as last time (same file, nothing new from a run): nothing is sent.
  const rev = live ? (/"rev":(\d+)/.exec(live) || [])[1] || "0" : "0";
  const run = status ? (/"updated":(\d+)/.exec(status) || [])[1] || "0" : "0";
  const tag = `"${file.tag}.${rev}.${run}"`;
  if (request.headers.get("If-None-Match") === tag) return new Response(null, { status: 304, headers: { ETag: tag, "Cache-Control": "private, no-cache" } });
  return raw(`{"priser":${await file.text()},"live":${live ? JSON.stringify(live) : "null"},"status":${status || "null"}}`, { "Cache-Control": "private, no-cache", ETag: tag });
}

// When a catalogue number or year is saved, the page starts a run on GitHub; until it begins
// (GitHub can take half a minute), the progress bar says it is on its way.
export async function markQueued(context) {
  const store = context.env && context.env.ONSKELISTE;
  if (store) await store.put(STATUS, JSON.stringify({ running: true, queued: true, done: 0, total: 1, started: Date.now(), updated: Date.now() })).catch(() => {});
}

function raw(text, extra) {
  return new Response(text, { headers: Object.assign({ "Content-Type": "application/json; charset=utf-8", "X-Robots-Tag": "noindex" }, extra) });
}
function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
