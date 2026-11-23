// Checks the name and title matching used to find covers (lib/nils-lookup.js) and the copy used
// by the song search (lib/nils-search.js): known cases, and that both copies agree.
// Run: node tools/test-matching.mjs
import * as lookup from "../lib/nils-lookup.js";
import searchCode from "../lib/nils-search.js";
import { demoCollection } from "../lib/nils-demo.js";

const Search = new Function(searchCode + "; return Search;")();
let bad = 0;
const check = (label, got, want) => { if (got !== want) { bad++; console.log("FEJL", label, "gav", got, "ventede", want); } };

const artists = [
  ["Queensrÿche", "Queen", false], ["Queen", "Queen", true], ["Tom Robinson Band", "Band, The", false], ["The Band", "Band, The", true],
  ["Bruce Springsteen & The E Street Band", "Springsteen, Bruce", true], ["Robert Plant & Alison Krauss", "Plant, Robert & Krauss, Alison", true],
  ["Tom Petty and the Heartbreakers", "Petty, Tom & The  Heartbreakers", true], ["Kim Larsen & Bellami", "Larsen, Kim og Bellami", true],
  ["Emerson, Lake & Palmer", "Emerson, Lake & Palmer", true], ["Robert Palmer", "Emerson, Lake & Palmer", false],
  ["Kate & Anna McGarrigle", "McGarrigle, Kate & Anna", true], ["Kissing the Pink", "Kiss", false], ["Doctor Who", "Who", false],
  ["Tom Robinson Band", "TRB (Tom Robinson Band)", true], ["Alvin Lee & Ten Years Later", "Lee, Alvin ‑ Ten Years Later", true],
  ["Eric Burdon & War", "War ‑ featuring Eric Burdon", true], ["Various Artists", "ÅÅ Jul:", true], ["The Mamas & The Papas", "Mamas & Papas, The", true],
  ["Crosby, Stills, Nash & Young", "Crosby, Stills, Nash and Young", true], ["Jean-Michel Jarre", "Jarre, Jean‑Michel", true],
];
for (const [found, sheet, want] of artists) check(found + " = " + sheet, lookup.sameArtist(found, sheet), want);

const titles = [
  ["Chronicle: The 20 Greatest Hits", "Chronicle ‑ The 20 greatest hits", true], ["Deepest Purple: The Very Best of Deep Purple", "Deepest Purple ‑ The very best of", true],
  ["Greatest Hits, Vol. 2", "Greatest Hits", false], ["Led Zeppelin III", "Led Zeppelin II", false], ["Led Zeppelin II (Remaster)", "Led Zeppelin II ‑ japanese version", true],
  ["Dancing in the Street - Single", "Dancing in the street", true], ["Rock 'N' Roll", "Rock & Roll", true], ["Smiler", "Smiler (Box)", true],
  ["Fight Dirty", "Fight Dirty (picture disc", true], ["Live: Blood", "Live", false], ["Chicago 17", "Chicago 16", false],
  ["The Best of Electric Light Orchestra", "The Best of", true, "Electric Light Orchestra"],
];
for (const [found, sheet, want, artist] of titles) check(found + " = " + sheet, lookup.sameAlbum(found, sheet, artist || "x"), want);

// Both copies give the same answers, for every pair of records in the demo.
const recs = JSON.parse(demoCollection).records;
const extra = [...artists.map((x) => x[1]), ...titles.map((x) => x[1])];
for (const a of [...new Set([...recs.map((r) => r.a), ...extra])]) check("navne " + a, JSON.stringify(Search.artistNames(a)), JSON.stringify(lookup.artistNames(a)));
for (const r of recs) for (const o of recs.slice(0, 40)) {
  check("kunstner " + r.a + "/" + o.a, Search.sameArtist(r.a, o.a), lookup.sameArtist(r.a, o.a));
  check("titel " + r.b + "/" + o.b, Search.albumMatch(r.b, o.b, r.a), lookup.albumMatch(r.b, o.b, r.a));
}
for (const [found, sheet] of titles) check("kopi " + found, Search.albumMatch(found, sheet, "x"), lookup.albumMatch(found, sheet, "x"));
console.log(bad ? bad + " fejl" : "Alt i orden");
process.exit(bad ? 1 : 0);
