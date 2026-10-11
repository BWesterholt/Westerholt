// nils.westerholt.dk: a password-protected page served by this function.
// The password is checked here on the server, so it never appears in the page source.
// Only its SHA-256 hash is stored, because this repository is public.
// To change the password: replace PASSWORD_SHA256 with the SHA-256 hex of the new one.
const PASSWORD_SHA256 = "629ff2a8c079344a59c0a0f604cbf9ff9cf2bf6273638ec85a31171c7c784724";
const COOKIE = "nils_adgang";

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const host = url.hostname;

  // Never serve the function source as a static file.
  if (url.pathname.startsWith("/functions")) {
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

  if (await isCorrect(readCookie(request, COOKIE))) {
    return page(successPage(base));
  }
  return page(loginPage(base, false));
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
:root{--bg:#ECEEEF;--card:#F4F5F6;--ink:#161D22;--text:#3B454C;--muted:#5D6870;--line:#D6DADC;--accent:#2A6158;--accent-hi:#337A6E;--error:#A33A2E}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:var(--bg);color:var(--text);font-family:"Schibsted Grotesk",Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:16px}
.card{width:100%;max-width:380px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:32px 28px;text-align:center}
.mark{width:44px;height:44px;margin:0 auto 18px;border-radius:9px;background:var(--ink);color:var(--bg);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:18px}
h1{color:var(--ink);font-size:22px;margin:0 0 6px;letter-spacing:-.01em}
p{margin:0 0 22px;color:var(--muted);line-height:1.5}
input{width:100%;font:inherit;font-size:16px;padding:12px 14px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);margin-bottom:12px}
input:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
button,.btn{display:block;width:100%;font:inherit;font-weight:600;font-size:16px;padding:12px;border:0;border-radius:8px;background:var(--accent);color:#fff;cursor:pointer;text-decoration:none}
button:hover,.btn:hover{background:var(--accent-hi)}
.error{color:var(--error);font-size:14px;margin:-4px 0 12px}
.check{width:56px;height:56px;margin:0 auto 18px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px}
.small{display:inline-block;margin-top:18px;color:var(--muted);font-size:14px}
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
<div class="mark">N</div>
<h1>Velkommen</h1>
<p>Skriv koden for at komme ind.</p>
<form method="post" action="${base}">
  <input type="password" name="kode" placeholder="Kode" autocomplete="current-password" autofocus required aria-label="Kode">
  ${wrong ? '<div class="error">Forkert kode. Prøv igen.</div>' : ""}
  <button type="submit">Log ind</button>
</form>`);
}

function successPage(base) {
  return shell("Nils", `
<div class="check">✓</div>
<h1>Du er inde!</h1>
<p>Koden var rigtig. Her er ikke noget endnu, men siden er klar til at blive fyldt ud.</p>
<a class="small" href="${base}?log-ud">Log ud</a>`);
}
