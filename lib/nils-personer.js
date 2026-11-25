// A person's page (everything they made or played on, matched against the collection), kept on the
// server once someone has opened it, so it opens at once on every device afterwards. Finding it
// takes MusicBrainz up to half a minute. Kept in Cloudflare KV (bound as ONSKELISTE), one key per
// person, for 60 days. The collection's version is stored with it: after a new Excel file the
// page finds it again. Used by functions/_middleware.js.

const MAX_BYTES = 600000;

// GET ?id=<MusicBrainz id>&v=<collection version>: { person } or { person: null }.
// POST { id, v, person }: remember it.
export async function handlePeople(context, request, url) {
  const store = context.env && context.env.ONSKELISTE;
  if (!store) return reply({ fejl: "mangler-lager" }, 503);
  const id = request.method === "GET" ? url.searchParams.get("id") || "" : null;
  if (request.method === "GET") {
    if (!/^[0-9a-f-]{36}$/.test(id)) return reply({ fejl: "ukendt" }, 400);
    const v = url.searchParams.get("v") || "";
    const saved = await store.get("person:" + id, "json").catch(() => null);
    return reply({ person: saved && saved.v === v ? saved.d : null });
  }
  if (request.method !== "POST") return reply({ fejl: "ukendt" }, 405);
  // Only the page's own scripts send JSON, so other websites can't change anything.
  if (!/^application\/json/.test(request.headers.get("Content-Type") || "")) return reply({ fejl: "ukendt" }, 415);
  const text = await request.text();
  if (text.length > MAX_BYTES) return reply({ fejl: "for-stor" }, 413);
  let body;
  try { body = JSON.parse(text); } catch (e) { return reply({ fejl: "ukendt" }, 400); }
  const d = body && body.person;
  if (!/^[0-9a-f-]{36}$/.test(String(body && body.id)) || !d || typeof d !== "object" || !Array.isArray(d.mine) || !Array.isArray(d.other)) return reply({ fejl: "ukendt" }, 400);
  await store.put("person:" + body.id, JSON.stringify({ v: String(body.v || "").slice(0, 100), d }), { expirationTtl: 60 * 864e2 });
  return reply({ ok: true });
}

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
