// nils.westerholt.dk: a password-protected record collection served by this function.
// The password is checked here on the server, so it never appears in the page source.
// Only its SHA-256 hash is stored, because this repository is public.
// To change the password: replace PASSWORD_SHA256 with the SHA-256 hex of the new one,
// and re-run tools/opdater-samling.py with the new password (the collection is encrypted with it).
import samling from "../data/samling.js";
import appPage from "../lib/nils-app.js";
import { findInfo, findCredits } from "../lib/nils-lookup.js";
import searchCode from "../lib/nils-search.js";

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

  // The home screen icons for the Nils page are plain files, shown without the password.
  if (url.pathname.startsWith("/nils-ikon/")) {
    return context.next();
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
  // Song search and person pages run in the browser (lib/nils-search.js); these two only pass lookups on.
  if (path === "/mb") {
    // MusicBrainz, for browsers that can't ask it directly.
    const p = url.searchParams.get("p") || "";
    if (!/^(artist|recording|release|release-group)\/?[0-9a-f-]{0,36}\?/.test(p)) return json({ fejl: "ukendt" }, 400);
    return passThrough(`https://musicbrainz.org/ws/2/${p}`, true);
  }
  if (path === "/ext") {
    // Apple Music and Deezer song searches (they don't answer browsers on other sites).
    const u = url.searchParams.get("u") || "";
    if (!/^https:\/\/(itunes\.apple\.com\/search|api\.deezer\.com\/search)\?/.test(u)) return json({ fejl: "ukendt" }, 400);
    return passThrough(u, false);
  }
  if (path !== "/") {
    return Response.redirect(new URL(base, url), 302);
  }
  return page(appPage.replaceAll("__BASE__", prefix).replace("/*__SEARCH__*/", () => searchCode));
}

// The collection is gzipped JSON, encrypted with AES-GCM using a key made from the password.
async function decryptCollection(password) {
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("nils-samling:" + password));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(samling.iv) }, key, fromBase64(samling.data));
  return new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

// Forwards a lookup unchanged, without reading it, so it costs this server next to nothing.
async function passThrough(target, brainz) {
  const headers = brainz ? { "User-Agent": "westerholt.dk-pladesamling/1.0 ( https://westerholt.dk )", Accept: "application/json" } : {};
  const response = await fetch(target, { headers }).catch(() => null);
  if (!response) return json({ fejl: "ingen forbindelse" }, 502);
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, max-age=3600" },
  });
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
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
<link rel="apple-touch-icon" href="/nils-ikon/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="/nils-ikon/ikon-192.png">
<link rel="manifest" href="/nils-ikon/manifest.webmanifest">
<meta name="apple-mobile-web-app-title" content="Pladesamlingen">
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
