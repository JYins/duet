import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(label, condition, detail = "") {
  if (!condition) {
    console.error(`FAIL ${label}${detail ? ` - ${detail}` : ""}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${label}`);
}

const paperStyles = read("src/lib/paper-styles.ts");
const paperIds = [...paperStyles.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
const uniquePaperIds = new Set(paperIds);
assert("paper styles are unique", paperIds.length === uniquePaperIds.size);
assert("paper catalog is expanded", paperIds.length >= 12, `${paperIds.length} styles found`);

const fullSql = read("supabase-duet-full.sql");
const v5Sql = read("supabase-migration-v5.sql");
for (const id of paperIds) {
  assert(`paper SQL allows ${id}`, fullSql.includes(`'${id}'`) && v5Sql.includes(`'${id}'`));
}

const boothPage = read("src/app/booth/page.tsx");
const doneBlock = boothPage.slice(boothPage.indexOf('{phase === "done"'));
assert("solo Step 4 does not switch layouts", !doneBlock.includes("<LayoutPicker"));
assert("solo layout changes fit selected photos", boothPage.includes("fitSelectionToCount"));

const selector = read("src/components/photo-strip-preview.tsx");
assert("photo selector dedupes selection", selector.includes("uniqueSelection(selectedIndices)"));
assert("photo selector has paper-position map", selector.includes("strip-position-map"));

const selection = read("src/lib/selection.ts");
for (const fn of ["uniqueSelection", "toggleSelection", "moveSelection", "swapSelection", "fitSelectionToCount"]) {
  assert(`selection helper exports ${fn}`, selection.includes(`function ${fn}`));
}

if (process.exitCode) {
  console.error("\nUI contract check failed.");
} else {
  console.log("\nUI contract check passed.");
}
