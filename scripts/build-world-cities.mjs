// scripts/build-world-cities.mjs
//
// Source: https://download.geonames.org/export/dump/cities15000.zip (GeoNames, CC BY 4.0)
// Admin1 (state/province) names: https://download.geonames.org/export/dump/admin1CodesASCII.txt
// Regenerate with: curl both into .data-cache/, unzip cities15000.zip to
// .data-cache/world/cities15000.txt, then `node scripts/build-world-cities.mjs`.
// Korea (country code KR) is excluded — see scripts/build-korea-locations.mjs.
//
// Output is an array of tuples, not objects, to keep the shipped JSON small:
// [name, countryCode, lat, lng, admin1Name]. admin1Name disambiguates
// same-name cities within the same country (e.g. the 8 US "Springfield"s);
// it is "" when GeoNames has no admin1 code for the row, or the code
// doesn't resolve to a name (mostly small territories — verified against
// the live data: 25 rows with no code, 79 more with a code that doesn't
// resolve, out of ~34,000). src/lib/locationSearch.ts turns each tuple into
// a display-ready entry at load time using Intl.DisplayNames for the
// country name.

import { readFileSync, writeFileSync } from "node:fs";

const CITIES_PATH = ".data-cache/world/cities15000.txt";
const ADMIN1_PATH = ".data-cache/admin1CodesASCII.txt";
const OUTPUT_PATH = "public/data/world-cities.json";

const admin1Raw = readFileSync(ADMIN1_PATH, "utf8");
const admin1Names = new Map();
for (const line of admin1Raw.split("\n")) {
  if (!line) continue;
  const [code, name] = line.split("\t");
  admin1Names.set(code, name);
}

const raw = readFileSync(CITIES_PATH, "utf8");
const lines = raw.split("\n").filter(Boolean);

const rows = [];
for (const line of lines) {
  const cols = line.split("\t");
  const countryCode = cols[8];
  if (countryCode === "KR") continue;
  const name = cols[2];
  if (!name) throw new Error(`Row with empty asciiname: ${line}`);
  const admin1Code = cols[10];
  const admin1 = admin1Code ? (admin1Names.get(`${countryCode}.${admin1Code}`) ?? "") : "";
  rows.push([name, countryCode, Number(cols[4]), Number(cols[5]), admin1]);
}

rows.sort((a, b) => a[0].localeCompare(b[0]));

if (rows.length < 20000) {
  throw new Error(`Expected at least 20,000 non-Korean city rows, got ${rows.length}.`);
}

writeFileSync(OUTPUT_PATH, JSON.stringify(rows));
console.log(`Wrote ${rows.length} entries to ${OUTPUT_PATH}`);
