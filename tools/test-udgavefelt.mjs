// Checks how the "Kat.nr." field of a record is understood (lib/nils-udgavefelt.js), also in the
// form the page gets it (as text). Run: node tools/test-udgavefelt.mjs
import { readEdition } from "../lib/nils-udgavefelt.js";

const onPage = new Function("return (" + readEdition.toString() + ");")();
let bad = 0;
const short = (e) => {
  const o = {};
  if (e.release) o.release = e.release;
  if (e.master) o.master = e.master;
  if (e.codes.length) o.codes = e.codes;
  if (e.barcode) o.barcode = e.barcode;
  if (e.ident) o.ident = true;
  if (e.country) o.country = e.country.name;
  if (e.year) o.year = e.year;
  if (e.first) o.first = true;
  if (e.words.length) o.words = e.words;
  return o;
};
const cases = [
  ["r4014443", { release: 4014443 }],
  ["[r4014443]", { release: 4014443 }],
  ["R4014443", { release: 4014443 }],
  ["https://www.discogs.com/release/4014443-Black-Sabbath-Black-Sabbath", { release: 4014443 }, "r4014443"],
  ["discogs.com/da/release/4014443-Black-Sabbath", { release: 4014443 }, "r4014443"],
  ["https://www.discogs.com/sell/release/4014443?ev=rb", { release: 4014443 }, "r4014443"],
  ["https://www.discogs.com/master/2588-Black-Sabbath-Black-Sabbath", { master: 2588 }, "m2588"],
  ["m2588 uk", { master: 2588, country: "UK" }],
  ["release 4014443", { release: 4014443 }],
  ["PCS 7088", { codes: ["PCS 7088"] }],
  ["pcs7088", { codes: ["pcs7088"] }],
  ["VO 6", { codes: ["VO 6"] }],
  ["Vertigo VO 6", { codes: ["VO 6"], words: ["vertigo"] }],
  ["6360 011", { codes: ["6360 011"] }],
  ["Vertigo 6360 011", { codes: ["6360 011"], words: ["vertigo"] }],
  ["spanish pressing", { country: "Spain" }],
  ["Spansk udgave", { country: "Spain" }],
  ["tysk presning", { country: "Germany" }],
  ["Made in Germany", { country: "Germany" }],
  ["dansk", { country: "Denmark" }],
  ["UK first pressing", { country: "UK", first: true }],
  ["original", { first: true }],
  ["Hispavox HHS 11-245 spansk", { codes: ["HHS 11-245"], country: "Spain", words: ["hispavox"] }],
  ["5 099749 433911", { barcode: "5099749433911" }],
  ["0 75992-72822 5", { barcode: "075992728225" }],
  ["matrix VO 6 A//1 420", { codes: ["VO 6 A//1 420"], ident: true }],
  ["PCS 7088 / 7C 062-04243", { codes: ["PCS 7088", "7C 062-04243"] }],
  ["SR LPS 4321", { codes: ["SR LPS 4321"] }],
  ["spansk 1972", { country: "Spain", year: "1972" }],
  ["6360 011 1972", { codes: ["6360 011"], year: "1972" }],
  ["SHVL 1970", { codes: ["SHVL 1970"] }],
  ["bogklub", { words: ["club"] }],
  ["Club Edition", { words: ["club"] }],
  ["180g genudgivelse", { words: ["180", "reissue"] }],
  ["mono", { words: ["mono"] }],
  ["kat.nr. SKL 5009", { codes: ["SKL 5009"] }],
  ["LP 503", { codes: ["LP 503"] }],
  ["made in 1972", { year: "1972" }],
  ["MRP6516", { codes: ["MRP6516"] }],
  ["Sonet SLP-1525", { codes: ["SLP-1525"], words: ["sonet"] }],
  ["", {}],
  ["  ", {}],
];
for (const [input, want, text] of cases) {
  for (const [where, fn] of [["", readEdition], [" (på siden)", onPage]]) {
    const e = fn(input), got = JSON.stringify(short(e)), exp = JSON.stringify(want);
    if (got !== exp) { bad++; console.log("FEJL" + where, JSON.stringify(input), "gav", got, "ventede", exp); }
    if (text && e.text !== text) { bad++; console.log("FEJL" + where, JSON.stringify(input), "gemmes som", e.text, "ventede", text); }
  }
}
console.log(bad ? bad + " fejl." : "Alt OK (" + cases.length + " eksempler).");
process.exit(bad ? 1 : 0);
