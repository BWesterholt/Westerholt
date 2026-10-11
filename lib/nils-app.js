// The record collection page shown on nils.westerholt.dk after login.
// Served by functions/_middleware.js, which replaces __BASE__ with the page's base path.
// Note: the page is one String.raw template, so the code inside avoids backticks and "${".
export default String.raw`<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Pladesamlingen</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400..700&display=swap" rel="stylesheet">
<style>
:root{--bg:#F6F1E9;--card:#FFFDF9;--ink:#221B16;--text:#4A403A;--muted:#85776C;--line:#E6DCCF;--accent:#C2532E;--accent-hi:#A8441F;--accent-soft:#F8E3D7;--cd:#2E6E8E;--cd-soft:#DDEBF2;--hover:#F1E8DC;--shadow:0 10px 30px rgba(60,40,20,.10)}
@media (prefers-color-scheme:dark){:root{--bg:#17130F;--card:#211B16;--ink:#F5EDE3;--text:#D6C9BA;--muted:#A0907F;--line:#382E26;--accent:#E9814F;--accent-hi:#F29466;--accent-soft:#3D2619;--cd:#6FB1D1;--cd-soft:#1C2E38;--hover:#2A221B;--shadow:0 10px 30px rgba(0,0,0,.4)}}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--text);font-family:"Schibsted Grotesk",Helvetica,Arial,sans-serif;font-size:16px;line-height:1.45}
button{font:inherit;color:inherit}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px}
.top{display:flex;align-items:center;gap:12px;padding:18px 0 6px}
.mark{width:38px;height:38px;border-radius:50%;background:radial-gradient(circle,var(--accent) 0 22%,var(--card) 22% 27%,var(--ink) 27%);color:transparent;display:flex;align-items:center;justify-content:center;font-weight:600}
.top h1{font-size:24px;color:var(--ink);margin:0;letter-spacing:-.01em;flex:1}
.logout{color:var(--muted);font-size:14px;text-decoration:none}
.logout:hover{color:var(--ink)}
.meta{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;color:var(--muted);font-size:14px;padding:2px 0 14px}
.pill{display:inline-flex;align-items:center;gap:6px;background:var(--accent-soft);color:var(--accent);border-radius:999px;padding:4px 10px;font-weight:600;font-size:13px}
.pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.toolbar{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0 12px;border-bottom:1px solid var(--line)}
.search{position:relative}
.search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted)}
.search input{width:100%;font:inherit;font-size:17px;padding:13px 44px 13px 44px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)}
.search input:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
.clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:none;width:32px;height:32px;border-radius:50%;cursor:pointer;color:var(--muted);font-size:20px;display:none}
.clear:hover{background:var(--hover);color:var(--ink)}
.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:10px}
.seg{display:inline-flex;background:var(--card);border:1px solid var(--line);border-radius:9px;padding:3px}
.seg button{border:0;background:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:14px;color:var(--muted)}
.seg button[aria-pressed=true]{background:var(--accent);color:#fff}
.seg .n{opacity:.7;font-size:12px;margin-left:4px}
select{font:inherit;font-size:14px;padding:7px 10px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink)}
.count{margin-left:auto;font-size:14px;color:var(--muted)}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:24px;align-items:start;padding:14px 0 40px}
.letter{position:sticky;top:var(--tb,120px);background:var(--bg);color:var(--accent);font-weight:700;font-size:15px;letter-spacing:.06em;padding:12px 12px 4px;z-index:1}
.row{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;width:100%;text-align:left;border:0;background:none;padding:9px 12px;border-radius:9px;cursor:pointer}
.row:hover{background:var(--hover)}
.row[aria-current=true]{background:var(--accent-soft)}
.row:focus-visible{outline:2px solid var(--accent)}
.badge{font-size:11px;font-weight:700;text-align:center;border-radius:6px;padding:4px 0;background:var(--cd-soft);color:var(--cd)}
.badge.v{background:var(--accent-soft);color:var(--accent)}
.album{display:block;color:var(--ink);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.artist{display:block;color:var(--muted);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.year{color:var(--muted);font-size:14px;font-variant-numeric:tabular-nums}
mark{background:none;color:var(--accent);font-weight:700}
.empty{padding:40px 12px;text-align:center;color:var(--muted)}
.more{display:block;margin:12px auto;border:1px solid var(--line);background:var(--card);border-radius:9px;padding:9px 16px;cursor:pointer}
.detail{position:sticky;top:calc(var(--tb,120px) + 14px);background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:20px;max-height:calc(100vh - var(--tb,120px) - 28px);overflow:auto}
.hint{color:var(--muted);text-align:center;padding:30px 10px}
.hint .disc{margin:0 auto 14px}
.close{display:none}
.cover{position:relative;aspect-ratio:1;border-radius:10px;box-shadow:var(--shadow);overflow:hidden;background:var(--hover);display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.cover img{width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .3s}
.cover img.ok{opacity:1}
.cover .msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:14px;text-align:center;padding:16px}
.cover .msg a{color:var(--accent)}
.disc{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,var(--accent) 0 14%,var(--card) 14% 16%,#1d2327 16% 100%);box-shadow:inset 0 0 0 6px #262e33,inset 0 0 0 14px #1d2327,inset 0 0 0 15px #2c353a,inset 0 0 0 26px #1d2327,inset 0 0 0 27px #2c353a}
.spin{animation:spin 1.6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.detail h2{color:var(--ink);font-size:22px;line-height:1.2;margin:0 0 4px;letter-spacing:-.01em}
.detail .by{font-size:16px;color:var(--text);margin:0 0 12px}
.by button{border:0;background:none;padding:0;color:var(--accent);cursor:pointer;font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.chips span{font-size:13px;background:var(--accent-soft);color:var(--accent);font-weight:600;border:0;border-radius:999px;padding:3px 10px}
dl{display:grid;grid-template-columns:auto 1fr;gap:0;margin:0;border-top:1px solid var(--line)}
dt,dd{padding:8px 0;border-bottom:1px solid var(--line);margin:0;font-size:15px}
dt{color:var(--muted);padding-right:16px}
dd{color:var(--ink);word-break:break-word}
.same h3{font-size:14px;color:var(--muted);margin:20px 0 6px;font-weight:600}
.same button{display:flex;justify-content:space-between;gap:10px;width:100%;border:0;background:none;text-align:left;padding:7px 8px;border-radius:7px;cursor:pointer}
.same button:hover{background:var(--hover)}
.same .y{color:var(--muted);font-size:14px}
.src{font-size:12px;color:var(--muted);margin:-8px 0 14px}
footer{color:var(--muted);font-size:13px;padding:0 0 30px;text-align:center}
@media (max-width:1100px) and (min-width:901px){.layout{grid-template-columns:minmax(0,1fr) 340px}}
@media (max-width:900px){
  .layout{grid-template-columns:1fr}
  .detail{display:none;position:fixed;inset:0;max-height:none;border-radius:0;border:0;z-index:20;padding:16px 16px 40px}
  body.open .detail{display:block}
  body.open{overflow:hidden}
  .close{display:inline-flex;align-items:center;gap:6px;border:0;background:none;color:var(--accent);font-weight:600;padding:4px 0 14px;cursor:pointer;font-size:16px}
  .cover{max-width:420px;margin-left:auto;margin-right:auto}
  .hint{display:none}
  .count{margin-left:0;width:100%}
  .controls{gap:8px}
  .seg button{padding:7px 10px}
  .seg .n{display:none}
  .row{padding:11px 8px}
  .detail{box-shadow:none}
}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="mark">N</div>
    <h1>Pladesamlingen</h1>
    <a class="logout" href="__BASE__/?log-ud">Log ud</a>
  </header>
  <div class="meta"><span id="stats">Henter samlingen…</span><span class="pill" id="version" hidden></span></div>
</div>
<div class="toolbar" id="toolbar">
  <div class="wrap">
    <div class="search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="q" type="search" placeholder="Søg efter kunstner, album, år eller note" autocomplete="off" aria-label="Søg i samlingen">
      <button class="clear" id="clear" aria-label="Ryd søgning">×</button>
    </div>
    <div class="controls">
      <div class="seg" role="group" aria-label="Vis">
        <button data-t="" aria-pressed="true">Alle<span class="n" id="n-all"></span></button>
        <button data-t="Vinyl" aria-pressed="false">Vinyl<span class="n" id="n-Vinyl"></span></button>
        <button data-t="CD" aria-pressed="false">CD<span class="n" id="n-CD"></span></button>
      </div>
      <select id="sort" aria-label="Sortér">
        <option value="artist">Kunstner A–Å</option>
        <option value="album">Album A–Å</option>
        <option value="new">År, nyeste først</option>
        <option value="old">År, ældste først</option>
      </select>
      <span class="count" id="count"></span>
    </div>
  </div>
</div>
<div class="wrap layout">
  <div id="list" role="list"></div>
  <aside class="detail" id="detail" aria-live="polite">
    <div class="hint"><div class="disc"></div>Klik på en plade for at se coveret og alle oplysninger fra Excel-arket.</div>
  </aside>
</div>
<footer class="wrap" id="foot"></footer>
<script>
(function () {
  var BASE = "__BASE__";
  var records = [], shown = [], kind = "", limit = 300, current = -1, pushed = false;
  var covers = {};
  var $ = function (id) { return document.getElementById(id); };
  var collator = new Intl.Collator("da", { sensitivity: "base", numeric: true });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function num(n) { return n.toLocaleString("da-DK"); }
  function dkDate(iso) { var d = new Date(iso + "T12:00:00"); return d.toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }); }
  function versionDate(v) { return v && /^\d{6}$/.test(v) ? v.slice(0, 2) + "." + v.slice(2, 4) + ".20" + v.slice(4) : v; }

  function setToolbarHeight() { document.documentElement.style.setProperty("--tb", $("toolbar").offsetHeight + "px"); }
  window.addEventListener("resize", setToolbarHeight);
  setToolbarHeight();

  fetch(BASE + "/samling.json", { credentials: "same-origin" })
    .then(function (r) { if (!r.ok) throw r; return r.json(); })
    .then(function (data) {
      records = data.records.map(function (r, i) {
        r.i = i;
        r.text = norm([r.a, r.b, r.y, r.m, r.t].concat(r.f.map(function (f) { return f[1]; })).join(" "));
        return r;
      });
      var counts = { Vinyl: 0, CD: 0 };
      records.forEach(function (r) { counts[r.t] = (counts[r.t] || 0) + 1; });
      $("n-all").textContent = num(records.length);
      $("n-Vinyl").textContent = num(counts.Vinyl);
      $("n-CD").textContent = num(counts.CD);
      $("stats").textContent = num(records.length) + " plader: " + num(counts.Vinyl) + " vinyl og " + num(counts.CD) + " CD";
      var v = $("version");
      v.hidden = false;
      v.textContent = "Excel-ark fra " + versionDate(data.version) + ", lagt ind " + dkDate(data.loaded);
      v.title = data.file;
      $("foot").textContent = "Data: " + data.file + " · lagt ind " + dkDate(data.loaded);
      render();
      fromHash();
    })
    .catch(function (r) {
      if (r && r.status === 401) { location.href = BASE + "/"; return; }
      $("stats").textContent = "Samlingen kunne ikke hentes. Prøv at genindlæse siden.";
    });

  function filter() {
    var words = norm($("q").value).split(/\s+/).filter(Boolean);
    var list = records.filter(function (r) {
      if (kind && r.t !== kind) return false;
      for (var i = 0; i < words.length; i++) if (r.text.indexOf(words[i]) < 0) return false;
      return true;
    });
    var s = $("sort").value;
    list.sort(function (a, b) {
      if (s === "album") return collator.compare(a.b, b.b) || collator.compare(a.a, b.a);
      if (s === "new" || s === "old") {
        var ya = +a.y || (s === "new" ? -1 : 9999), yb = +b.y || (s === "new" ? -1 : 9999);
        return (s === "new" ? yb - ya : ya - yb) || collator.compare(a.a, b.a);
      }
      return collator.compare(a.a, b.a) || (+a.y || 9999) - (+b.y || 9999) || collator.compare(a.b, b.b);
    });
    return { list: list, words: words };
  }

  function highlight(text, words) {
    var out = esc(text);
    if (!words.length) return out;
    var n = norm(text);
    var marks = [];
    words.forEach(function (w) { var at = n.indexOf(w); if (at >= 0 && n.length === text.length) marks.push([at, at + w.length]); });
    if (!marks.length) return out;
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var html = "", pos = 0;
    marks.forEach(function (m) { if (m[0] < pos) return; html += esc(text.slice(pos, m[0])) + "<mark>" + esc(text.slice(m[0], m[1])) + "</mark>"; pos = m[1]; });
    return html + esc(text.slice(pos));
  }

  function letterOf(r, s) {
    var t = (s === "album" ? r.b : r.a).trim().toUpperCase();
    var c = t.charAt(0);
    return /[A-ZÆØÅ]/.test(c) ? c : "#";
  }

  function render(keepLimit) {
    if (!keepLimit) limit = 300;
    var res = filter(), s = $("sort").value;
    shown = res.list;
    $("count").textContent = shown.length === records.length ? "" : "Viser " + num(shown.length) + " af " + num(records.length);
    $("clear").style.display = $("q").value ? "block" : "none";
    if (!shown.length) {
      $("list").innerHTML = '<div class="empty">Ingen plader matcher søgningen.</div>';
      return;
    }
    var html = "", last = null, grouped = s === "artist" || s === "album";
    shown.slice(0, limit).forEach(function (r) {
      if (grouped) {
        var l = letterOf(r, s);
        if (l !== last) { html += '<div class="letter">' + l + "</div>"; last = l; }
      }
      html += '<button class="row" role="listitem" data-i="' + r.i + '"' + (r.i === current ? ' aria-current="true"' : "") + ">" +
        '<span class="badge' + (r.t === "Vinyl" ? " v" : "") + '">' + esc(r.m || r.t) + "</span>" +
        '<span><span class="album">' + highlight(r.b || "Uden titel", res.words) + '</span><span class="artist">' + highlight(r.a, res.words) + "</span></span>" +
        '<span class="year">' + esc(r.y) + "</span></button>";
    });
    if (shown.length > limit) html += '<button class="more" id="more">Vis flere (' + num(shown.length - limit) + " tilbage)</button>";
    $("list").innerHTML = html;
  }

  function coverFor(r, box) {
    var key = r.a + "|" + r.b;
    var show = function (c) {
      if (!box.isConnected) return;
      if (c && c.url) {
        var img = new Image();
        img.alt = "Cover: " + r.b;
        img.onload = function () { box.querySelector(".msg").remove(); img.className = "ok"; };
        img.onerror = function () { noCover(r, box); };
        img.src = c.url;
        box.appendChild(img);
        if (c.kilde) $("src").textContent = "Cover fra " + c.kilde + ". Det er fundet automatisk og kan i sjældne tilfælde være forkert.";
      } else noCover(r, box);
    };
    if (covers[key]) return covers[key].then(show);
    covers[key] = fetch(BASE + "/cover?" + new URLSearchParams({ a: r.a, b: r.b }), { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { delete covers[key]; return null; });
    covers[key].then(show);
  }

  function noCover(r, box) {
    var q = encodeURIComponent(r.a + " " + r.b + " album cover");
    box.querySelector(".msg").innerHTML = '<div class="disc"></div>Intet cover fundet<a href="https://www.google.com/search?tbm=isch&q=' + q + '" target="_blank" rel="noopener">Søg efter coveret på Google</a>';
  }

  function open(i, fromHistory) {
    var r = records[i];
    if (!r) return;
    current = i;
    var rows = document.querySelectorAll(".row[aria-current]");
    for (var k = 0; k < rows.length; k++) rows[k].removeAttribute("aria-current");
    var row = document.querySelector('.row[data-i="' + i + '"]');
    if (row) row.setAttribute("aria-current", "true");

    var chips = [r.t, r.m && r.m !== r.t ? r.m : null, r.y].filter(Boolean).map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("");
    var fields = r.f.map(function (f) { return "<dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd>"; }).join("");
    var same = records.filter(function (o) { return o.a === r.a && o !== r; })
      .sort(function (a, b) { return (+a.y || 9999) - (+b.y || 9999); });
    var sameHtml = same.length ? '<div class="same"><h3>Mere af ' + esc(r.a) + " (" + same.length + ")</h3>" +
      same.slice(0, 40).map(function (o) { return '<button data-i="' + o.i + '"><span>' + esc(o.b) + " <small>(" + esc(o.m || o.t) + ')</small></span><span class="y">' + esc(o.y) + "</span></button>"; }).join("") + "</div>" : "";

    $("detail").innerHTML =
      '<button class="close" id="close">‹ Tilbage til listen</button>' +
      '<div class="cover" id="cover"><div class="msg"><div class="disc spin"></div>Finder cover…</div></div>' +
      '<p class="src" id="src"></p>' +
      "<h2>" + esc(r.b || "Uden titel") + "</h2>" +
      '<p class="by"><button data-artist="' + esc(r.a) + '">' + esc(r.a) + "</button></p>" +
      '<div class="chips">' + chips + "</div>" +
      "<dl>" + fields + "</dl>" + sameHtml;
    $("detail").scrollTop = 0;
    document.body.classList.add("open");
    coverFor(r, $("cover"));
    if (!fromHistory) {
      if (location.hash === "#r" + i) return;
      pushed = true;
      location.hash = "r" + i;
    }
  }

  function close() {
    document.body.classList.remove("open");
    if (pushed) { pushed = false; history.back(); }
    else if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  }

  function fromHash() {
    var m = location.hash.match(/^#r(\d+)$/);
    if (m) open(+m[1], true);
    else { document.body.classList.remove("open"); pushed = false; }
  }
  window.addEventListener("hashchange", fromHash);

  var timer;
  $("q").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { render(); }, 120); });
  $("clear").addEventListener("click", function () { $("q").value = ""; render(); $("q").focus(); });
  $("sort").addEventListener("change", function () { render(); });
  document.querySelector(".seg").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    kind = b.getAttribute("data-t");
    var all = this.querySelectorAll("button");
    for (var k = 0; k < all.length; k++) all[k].setAttribute("aria-pressed", String(all[k] === b));
    render();
  });
  $("list").addEventListener("click", function (e) {
    if (e.target.id === "more") { limit += 500; render(true); return; }
    var row = e.target.closest(".row");
    if (row) open(+row.getAttribute("data-i"));
  });
  $("detail").addEventListener("click", function (e) {
    if (e.target.closest("#close")) { close(); return; }
    var a = e.target.closest("[data-artist]");
    if (a) { $("q").value = a.getAttribute("data-artist"); $("sort").value = "old"; render(); if (window.innerWidth <= 900) close(); window.scrollTo(0, 0); return; }
    var b = e.target.closest("[data-i]");
    if (b) open(+b.getAttribute("data-i"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("open")) close();
    if (e.key === "/" && document.activeElement !== $("q")) { e.preventDefault(); $("q").focus(); }
  });
})();
</script>
</body>
</html>`;
