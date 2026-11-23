// A public demo of the record collection, shown in a window on westerholt.dk.
// It uses a made-up collection of classic rock albums, not the real (private) one.
// The wishlist in the demo is kept in each visitor's own browser, so nobody can change
// the real list or see anyone else's changes. Used by functions/_middleware.js.

// [artist, album, year, "LP" | "CD", discs, version]
const ALBUMS = [
  ["Beatles", "Rubber Soul", 1965, "LP"],
  ["Beatles", "Revolver", 1966, "LP"],
  ["Beatles", "Revolver", 1966, "CD"],
  ["Beatles", "Sgt. Pepper's Lonely Hearts Club Band", 1967, "LP"],
  ["Beatles", "The Beatles (White Album)", 1968, "LP", 2],
  ["Beatles", "Abbey Road", 1969, "LP"],
  ["Beatles", "Abbey Road", 1969, "CD"],
  ["Beatles", "Let It Be", 1970, "LP"],
  ["Rolling Stones", "Aftermath", 1966, "LP"],
  ["Rolling Stones", "Beggars Banquet", 1968, "LP"],
  ["Rolling Stones", "Let It Bleed", 1969, "LP"],
  ["Rolling Stones", "Sticky Fingers", 1971, "LP"],
  ["Rolling Stones", "Exile on Main St.", 1972, "LP", 2],
  ["Led Zeppelin", "Led Zeppelin", 1969, "LP"],
  ["Led Zeppelin", "Led Zeppelin II", 1969, "LP"],
  ["Led Zeppelin", "Led Zeppelin III", 1970, "LP"],
  ["Led Zeppelin", "Led Zeppelin IV", 1971, "LP"],
  ["Led Zeppelin", "Led Zeppelin IV", 1971, "CD"],
  ["Led Zeppelin", "Houses of the Holy", 1973, "LP"],
  ["Led Zeppelin", "Physical Graffiti", 1975, "LP", 2],
  ["Pink Floyd", "The Piper at the Gates of Dawn", 1967, "LP"],
  ["Pink Floyd", "Meddle", 1971, "LP"],
  ["Pink Floyd", "The Dark Side of the Moon", 1973, "LP"],
  ["Pink Floyd", "The Dark Side of the Moon", 1973, "CD"],
  ["Pink Floyd", "Wish You Were Here", 1975, "LP"],
  ["Pink Floyd", "Animals", 1977, "LP"],
  ["Pink Floyd", "The Wall", 1979, "LP", 2],
  ["Who", "Tommy", 1969, "LP", 2],
  ["Who", "Who's Next", 1971, "LP"],
  ["Who", "Quadrophenia", 1973, "LP", 2],
  ["Hendrix, Jimi", "Are You Experienced", 1967, "LP"],
  ["Hendrix, Jimi", "Axis: Bold as Love", 1967, "LP"],
  ["Hendrix, Jimi", "Electric Ladyland", 1968, "LP", 2],
  ["Doors", "The Doors", 1967, "LP"],
  ["Doors", "L.A. Woman", 1971, "LP"],
  ["Dylan, Bob", "Highway 61 Revisited", 1965, "LP"],
  ["Dylan, Bob", "Blonde on Blonde", 1966, "LP", 2],
  ["Dylan, Bob", "Blood on the Tracks", 1975, "CD"],
  ["Bowie, David", "Hunky Dory", 1971, "LP"],
  ["Bowie, David", "The Rise and Fall of Ziggy Stardust and the Spiders from Mars", 1972, "LP"],
  ["Bowie, David", "Heroes", 1977, "LP"],
  ["Bowie, David", "Let's Dance", 1983, "CD"],
  ["Queen", "A Night at the Opera", 1975, "LP"],
  ["Queen", "News of the World", 1977, "LP"],
  ["Fleetwood Mac", "Rumours", 1977, "LP"],
  ["Fleetwood Mac", "Rumours", 1977, "CD"],
  ["Fleetwood Mac", "Tusk", 1979, "LP", 2],
  ["Eagles", "Hotel California", 1976, "LP"],
  ["Springsteen, Bruce", "Born to Run", 1975, "LP"],
  ["Springsteen, Bruce", "Darkness on the Edge of Town", 1978, "LP"],
  ["Springsteen, Bruce", "The River", 1980, "LP", 2],
  ["Springsteen, Bruce", "Born in the U.S.A.", 1984, "CD"],
  ["Deep Purple", "Machine Head", 1972, "LP"],
  ["Black Sabbath", "Paranoid", 1970, "LP"],
  ["Creedence Clearwater Revival", "Green River", 1969, "LP"],
  ["Creedence Clearwater Revival", "Cosmo's Factory", 1970, "LP"],
  ["Cream", "Disraeli Gears", 1967, "LP"],
  ["Beach Boys", "Pet Sounds", 1966, "LP"],
  ["Simon & Garfunkel", "Bridge over Troubled Water", 1970, "LP"],
  ["Young, Neil", "Harvest", 1972, "LP"],
  ["Young, Neil", "Rust Never Sleeps", 1979, "CD"],
  ["Dire Straits", "Dire Straits", 1978, "LP"],
  ["Dire Straits", "Brothers in Arms", 1985, "CD"],
  ["AC/DC", "Highway to Hell", 1979, "LP"],
  ["AC/DC", "Back in Black", 1980, "LP"],
  ["AC/DC", "Back in Black", 1980, "CD"],
  ["Lynyrd Skynyrd", "Pronounced 'Lĕh-'nérd 'Skin-'nérd", 1973, "LP"],
  ["Allman Brothers Band", "At Fillmore East", 1971, "LP", 2],
  ["Derek and the Dominos", "Layla and Other Assorted Love Songs", 1970, "LP", 2],
  ["Clapton, Eric", "Slowhand", 1977, "LP"],
  ["Steely Dan", "Aja", 1977, "LP"],
  ["Clash", "London Calling", 1979, "LP", 2],
  ["Police", "Synchronicity", 1983, "CD"],
  ["U2", "The Joshua Tree", 1987, "CD"],
  ["Guns N' Roses", "Appetite for Destruction", 1987, "CD"],
  ["Van Halen", "Van Halen", 1978, "LP"],
  ["Boston", "Boston", 1976, "LP"],
  ["Meat Loaf", "Bat Out of Hell", 1977, "LP"],
  ["Supertramp", "Breakfast in America", 1979, "LP"],
  ["Genesis", "Selling England by the Pound", 1973, "LP"],
  ["Yes", "Close to the Edge", 1972, "LP"],
  ["King Crimson", "In the Court of the Crimson King", 1969, "LP"],
  ["Jethro Tull", "Aqualung", 1971, "LP"],
  ["Santana", "Abraxas", 1970, "LP"],
  ["Joplin, Janis", "Pearl", 1971, "LP"],
  ["Velvet Underground", "The Velvet Underground & Nico", 1967, "LP"],
  ["ZZ Top", "Eliminator", 1983, "CD"],
  ["Toto", "Toto IV", 1982, "CD"],
  ["Gasolin'", "Gasolin' 3", 1973, "LP"],
  ["Gasolin'", "Gas 5", 1975, "LP"],
  ["Larsen, Kim", "Værsgo", 1973, "LP"],
  ["Shu-bi-dua", "Shu-bi-dua", 1974, "LP"],
];

export const demoCollection = JSON.stringify({
  version: "demo",
  file: "Eksempelsamling",
  loaded: "2026-11-23",
  records: ALBUMS.map(([a, b, y, m, n = 1, v = "Original"], k) => {
    const t = m === "CD" ? "CD" : "Vinyl";
    return {
      t, a, b, m, n, y: String(y), v,
      f: [["Kunstner", a], ["Album", b], ["Format", m], ["Antal", String(n)], ["År", String(y)], ["Version", v], ["Række i Excel", (t === "CD" ? "CD" : "Vinyl") + ", række " + (k + 2)]],
    };
  }),
});

const WISHES = [
  { id: "d1", a: "Pink Floyd", b: "Atom Heart Mother", y: "1970", who: ["Benjamin"], format: "Vinyl", note: "", added: "2026-11-20T10:00:00Z" },
  { id: "d2", a: "Rolling Stones", b: "Some Girls", y: "1978", who: ["Nils"], format: "Vinyl", note: "Gerne en original presning", added: "2026-11-21T10:00:00Z" },
  { id: "d3", a: "Led Zeppelin", b: "Physical Graffiti", y: "1975", who: ["Benjamin"], format: "CD", note: "", added: "2026-11-22T10:00:00Z" },
  { id: "d4", a: "David Bowie", b: "Station to Station", y: "1976", who: ["Benjamin", "Nils"], format: "", note: "", added: "2026-11-23T08:00:00Z" },
  { id: "d5", a: "The Who", b: "Live at Leeds", y: "1970", who: ["Nils"], format: "Vinyl", note: "", added: "2026-11-15T10:00:00Z", bought: { by: "Benjamin", at: "2026-11-19T10:00:00Z" } },
];

// Runs in the visitor's browser before the page: answers the page's wishlist calls from
// localStorage instead of the server. The first time, it looks up covers for the examples.
export const demoScript = `<script>
(function () {
  var KEY = "pladesamling-demo:onsker:v1", realFetch = window.fetch.bind(window);
  var START = ${JSON.stringify(WISHES)};
  function load() { try { var v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v)) return v; } catch (e) {} return null; }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  function reply(body, status) { return new Response(JSON.stringify(body), { status: status || 200, headers: { "Content-Type": "application/json" } }); }
  function text(v, max) { return String(v == null ? "" : v).replace(/\\s+/g, " ").trim().slice(0, max); }
  function clean(x) {
    if (!x || !text(x.a, 160) || !text(x.b, 200)) return null;
    var who = (Array.isArray(x.who) ? x.who : [x.who]).filter(function (w) { return w === "Benjamin" || w === "Nils"; });
    return { a: text(x.a, 160), b: text(x.b, 200), y: /^\\d{4}$/.test(text(x.y, 4)) ? text(x.y, 4) : "", cover: /^https:\\/\\//.test(String(x.cover || "")) ? String(x.cover).slice(0, 500) : "",
      who: who.length ? who : ["Benjamin"], format: ["Vinyl", "CD"].indexOf(x.format) >= 0 ? x.format : "", note: text(x.note, 500) };
  }
  var first = null;
  function start(base) {
    if (!first) first = Promise.all(START.map(function (w) {
      var item = JSON.parse(JSON.stringify(w));
      return realFetch(base + "/info?" + new URLSearchParams({ a: item.a, b: item.b, y: item.y, m: "" }))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (c) { if (c && c.url) item.cover = c.url; return item; })
        .catch(function () { return item; });
    })).then(function (items) { save(items); return items; });
    return first;
  }
  window.fetch = function (input, options) {
    var url = String((input && input.url) || input);
    var at = url.indexOf("/onsker");
    if (at < 0) return realFetch(input, options);
    var base = url.slice(0, at);
    var method = (options && options.method) || "GET";
    var stored = load();
    var ready = stored ? Promise.resolve(stored) : start(base);
    return ready.then(function (list) {
      if (method === "GET") return reply({ items: list });
      var body = {};
      try { body = JSON.parse((options && options.body) || "{}"); } catch (e) {}
      var now = new Date().toISOString(), id = "";
      var item = list.filter(function (x) { return x.id === String(body.id || ""); })[0];
      if (body.handling === "tilfoj") {
        var add = clean(body.item);
        if (!add) return reply({ fejl: "Skriv både kunstner og titel." }, 400);
        add.id = id = "d" + Date.now(); add.added = now; add.bought = null;
        list.push(add);
      } else if (body.handling === "ret") {
        var changes = clean(body.item);
        if (!item) return reply({ fejl: "Pladen er ikke på listen længere.", items: list }, 404);
        if (!changes) return reply({ fejl: "Skriv både kunstner og titel." }, 400);
        if (!changes.cover) delete changes.cover;
        for (var k in changes) item[k] = changes[k];
      } else if (body.handling === "kobt" || body.handling === "ikke-kobt") {
        if (!item) return reply({ fejl: "Pladen er ikke på listen længere.", items: list }, 404);
        item.bought = body.handling === "kobt" ? { by: body.by === "Nils" ? "Nils" : "Benjamin", at: now } : null;
      } else if (body.handling === "slet") {
        list = list.filter(function (x) { return x !== item; });
      } else {
        return reply({ fejl: "ukendt" }, 400);
      }
      save(list);
      return reply(id ? { items: list, id: id } : { items: list });
    });
  };
})();
</script>`;
