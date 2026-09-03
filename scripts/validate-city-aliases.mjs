// scripts/validate-city-aliases.mjs
//
// Confirms every entry in src/data/cityAliasesKo.ts resolves to a real row in
// public/data/world-cities.json. Run after Task 2 and after editing the alias
// list. Not part of the app build — a manual data-quality check.

import { readFileSync } from "node:fs";

const worldRows = JSON.parse(readFileSync("public/data/world-cities.json", "utf8"));
const aliasesSource = readFileSync("src/data/cityAliasesKo.ts", "utf8");

const aliasPattern = /\{\s*ko:\s*"([^"]+)",\s*matchName:\s*"([^"]+)",\s*matchCountryCode:\s*"([^"]+)"\s*\}/g;
let match;
let missing = 0;
let count = 0;
while ((match = aliasPattern.exec(aliasesSource))) {
  count += 1;
  const [, ko, matchName, matchCountryCode] = match;
  const found = worldRows.some((row) => row[0] === matchName && row[1] === matchCountryCode);
  if (!found) {
    missing += 1;
    console.error(`MISSING: ${ko} -> ${matchName}, ${matchCountryCode}`);
  }
}

console.log(`Checked ${count} aliases, ${missing} missing.`);
if (missing > 0) process.exit(1);
