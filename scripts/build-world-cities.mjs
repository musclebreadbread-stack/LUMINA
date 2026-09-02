// scripts/build-world-cities.mjs
//
// Source: https://download.geonames.org/export/dump/cities15000.zip (GeoNames, CC BY 4.0)
// Regenerate with: curl the zip into .data-cache/cities15000.zip, unzip to
// .data-cache/world/cities15000.txt, then `node scripts/build-world-cities.mjs`.
// Korea (country code KR) is excluded — see scripts/build-korea-locations.mjs.
//
// Output is an array of tuples, not objects, to keep the shipped JSON small:
// [name, countryCode, lat, lng]. src/lib/locationSearch.ts turns each tuple
// into a display-ready entry at load time using Intl.DisplayNames.

import { readFileSync, writeFileSync } from "node:fs";

const SOURCE_PATH = ".data-cache/world/cities15000.txt";
const OUTPUT_PATH = "public/data/world-cities.json";

const raw = readFileSync(SOURCE_PATH, "utf8");
const lines = raw.split("\n").filter(Boolean);

const rows = [];
for (const line of lines) {
  const cols = line.split("\t");
  const countryCode = cols[8];
  if (countryCode === "KR") continue;
  const name = cols[2];
  if (!name) throw new Error(`Row with empty asciiname: ${line}`);
  rows.push([name, countryCode, Number(cols[4]), Number(cols[5])]);
}

rows.sort((a, b) => a[0].localeCompare(b[0]));

if (rows.length < 20000) {
  throw new Error(`Expected at least 20,000 non-Korean city rows, got ${rows.length}.`);
}

writeFileSync(OUTPUT_PATH, JSON.stringify(rows));
console.log(`Wrote ${rows.length} entries to ${OUTPUT_PATH}`);
