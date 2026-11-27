// The key a record's price, chosen cover and copy's details are kept under. Shared by the server
// modules (lib/nils-egne.js, nils-udgaver.js, nils-omslag.js) and the price run.
const OWN_KEY = /^odense:[0-9a-f-]{36}$/;

// The key a record's price, cover and details are kept under: "odense:<id>" for own records,
// else artist, album, year and format exactly as in the Excel sheet.
export function recordKey(r) {
  if (!r || typeof r !== "object") return "";
  if (typeof r.k === "string" && OWN_KEY.test(r.k)) return r.k;
  const part = (v, max) => String(v == null ? "" : v).slice(0, max);
  return r.a || r.b ? [part(r.a, 200), part(r.b, 300), part(r.y, 10), part(r.m, 20)].join("|") : "";
}
export function isOwnKey(k) { return OWN_KEY.test(String(k || "")); }

