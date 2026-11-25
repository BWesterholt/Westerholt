// Your own copy of a record: the catalogue number from the centre label, the year this pressing
// came out and its condition (grade), typed in on the page. The weekly/hourly Discogs price lookup (tools/discogs-priser.mjs)
// reads them from here and uses them to find exactly that pressing. Kept in Cloudflare KV, in the
// same store as the wishlist (bound as ONSKELISTE), under one key. Used by functions/_middleware.js.

const KEY = "udgaver";

// GET: { udgaver: { "artist|album|year|format": { c: catalogue number, y: year, s: grade } } }
// POST { r: {a, b, y, m}, c, y, s }: save (all empty: forget). The grade only changes which of
// Discogs' prices is shown, so the page uses it at once; the others take the next lookup.
const GRADES = ["M", "NM", "VG+", "VG", "G+", "G", "F", "P"];
export async function handleEditions(context, request) {
  const store = context.env && context.env.ONSKELISTE;
  if (!store) return reply({ fejl: "mangler-lager" }, 503);
  const all = (await store.get(KEY, "json").catch(() => null)) || {};
  if (request.method === "GET") return reply({ udgaver: all });
  if (request.method !== "POST") return reply({ fejl: "ukendt" }, 405);
  // Only the page's own scripts send JSON, so other websites can't change anything.
  if (!/^application\/json/.test(request.headers.get("Content-Type") || "")) return reply({ fejl: "ukendt" }, 415);
  let body;
  try { body = await request.json(); } catch (e) { return reply({ fejl: "ukendt" }, 400); }
  const r = body && body.r;
  if (!r || typeof r !== "object") return reply({ fejl: "ukendt" }, 400);
  const part = (v, max) => String(v == null ? "" : v).slice(0, max);
  const key = [part(r.a, 200), part(r.b, 300), part(r.y, 10), part(r.m, 20)].join("|");
  const c = String(body.c || "").replace(/\s+/g, " ").trim().slice(0, 40);
  const y = String(body.y || "").trim();
  const g = GRADES.includes(body.s) ? body.s : "";
  if (y && !/^(19|20)\d\d$/.test(y)) return reply({ fejl: "Årstallet skal være fire cifre, fx 1975." }, 400);
  const before = all[key] || {};
  const moved = (before.c || "") !== c || (before.y || "") !== y;
  if (c || y || g) all[key] = Object.assign({}, c ? { c } : {}, y ? { y } : {}, g ? { s: g } : {});
  else delete all[key];
  await store.put(KEY, JSON.stringify(all));
  // A new catalogue number or year: start the price lookup on GitHub now instead of waiting for
  // the hourly run. Needs the Cloudflare secret GITHUB_TOKEN (fine-grained, this repository only,
  // "Actions: Read and write"; added 2026-11-25). Without it the hourly run picks the change up.
  const started = moved && (await startLookup(context));
  return reply({ udgaver: all, opslag: started });
}

async function startLookup(context) {
  const token = context.env && context.env.GITHUB_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch("https://api.github.com/repos/BWesterholt/Westerholt/actions/workflows/discogs-priser.yml/dispatches", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "User-Agent": "westerholt.dk", "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main" }),
    });
    return res.status === 204;
  } catch (e) {
    return false;
  }
}

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
