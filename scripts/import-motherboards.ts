/**
 * Imports a motherboard catalogue sheet into additive SQL.
 *
 *   npx vite-node scripts/import-motherboards.ts <path-to.csv>
 *
 * Writes supabase/seed/motherboards.sql, which ends in `on conflict (id) do
 * nothing` for the same reason supabase/seed/additions.sql does: it is safe to
 * run against a database that is already in service, and it cannot overwrite a
 * price, a stock count or an uploaded photo.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS DOES AND DOES NOT CLAIM
 * ---------------------------------------------------------------------------
 * A retail motherboard listing publishes socket, form factor, memory slot count
 * and maximum memory. It does not publish M.2 slot counts, SATA port counts or
 * PCIe generation. Those are left NULL rather than guessed, and the
 * compatibility engine reports "not enough data to check" for them, which is the
 * honest answer and the one it already gives for an unrecorded socket.
 *
 * Two fields ARE derived, and neither is a guess:
 *
 *   memory_type comes from the socket. AM5 and LGA1851 are DDR5 platforms;
 *   AM4 and the LGA115x/LGA1200 generations are DDR4. That is a property of the
 *   socket, not of the board. LGA1700 is the exception — it takes either, and
 *   the board decides — so an LGA1700 row gets DDR5 or DDR4 only when its own
 *   product name states one, and NULL otherwise.
 *
 *   chipset is parsed out of the product name, then CHECKED against the socket.
 *   A B650 board must be AM5 and a Z790 board must be LGA1700, so a mismatch is
 *   a data error in the sheet rather than something to import. Mismatches are
 *   reported and the chipset dropped.
 *
 * ---------------------------------------------------------------------------
 * WHY SOME ROWS ARRIVE AS DRAFTS
 * ---------------------------------------------------------------------------
 * Two conditions put a board in `draft`, where it lives in the database but not
 * on the storefront:
 *
 *   NO PRICE. `price_cents` is NOT NULL, so an unpriced row would list at
 *   $0.00. Ninety-five rows in the first sheet had no price, many of them
 *   because the board is discontinued.
 *
 *   NO PROCESSOR THAT FITS. The sheet spans fifteen sockets. Eleven of them —
 *   LGA1151, LGA1200, sTRX4, LGA2011-3, FM2+, AM3+ and the rest — have no
 *   processor in this catalogue and mostly none on sale anywhere. A customer who
 *   picks one reaches a build they cannot finish, and reads that as a broken
 *   configurator rather than a shop still stocking up. Keeping them as drafts
 *   means the data is there for repair and upgrade work without being
 *   selectable.
 *
 * ---------------------------------------------------------------------------
 * DUPLICATES
 * ---------------------------------------------------------------------------
 * EXISTING_BOARDS below is the set of boards already in the catalogue when this
 * was written. It has to be a hardcoded list because the id this script would
 * generate for a board is not the id an operator typed in by hand for the same
 * board, so `on conflict (id)` cannot catch it — it would insert a second
 * listing for one product.
 *
 * This is the argument for the identity columns in the catalogue plan. With an
 * `mpn` column and a unique index on it, duplicate detection stops depending on
 * a list somebody has to remember to update.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { SAMPLE_COMPONENTS } from '../src/lib/catalog/sample-catalog';

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error('Usage: vite-node scripts/import-motherboards.ts <path-to.csv>');
}

/** Minimal RFC4180 reader: quoted fields, embedded commas, doubled quotes. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------
const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110);

/** Canonical brand spellings. Fixes the GIGABYTE / Gigabyte split in one place. */
const BRANDS: Record<string, string> = {
  asus: 'ASUS',
  msi: 'MSI',
  gigabyte: 'Gigabyte',
  asrock: 'ASRock',
  supermicro: 'Supermicro',
  nzxt: 'NZXT',
  biostar: 'Biostar',
  evga: 'EVGA',
};

const FORM_FACTORS: Record<string, string | null> = {
  atx: 'atx',
  'micro atx': 'micro-atx',
  'microatx': 'micro-atx',
  'mini itx': 'mini-itx',
  'miniitx': 'mini-itx',
  eatx: 'e-atx',
  'e atx': 'e-atx',
  // A server standard with no value in the form_factor enum. Null rather than
  // mislabelled as E-ATX, which would let the engine clear it for an E-ATX case
  // it may not physically fit.
  'ssi eeb': null,
  'ssi ceb': null,
};

/** DDR generation implied by the socket. Absent means the board decides. */
const SOCKET_MEMORY: Record<string, 'ddr4' | 'ddr5'> = {
  AM5: 'ddr5',
  LGA1851: 'ddr5',
  AM4: 'ddr4',
  'AM3+': 'ddr4',
  'FM2+': 'ddr4',
  LGA1200: 'ddr4',
  LGA1151: 'ddr4',
  LGA1150: 'ddr4',
  LGA1155: 'ddr4',
};

/** Chipset -> the socket it must be paired with, for cross-validation. */
const CHIPSET_SOCKET: Record<string, string> = {
  X870E: 'AM5', X870: 'AM5', B850: 'AM5', B840: 'AM5', A620: 'AM5',
  X670E: 'AM5', X670: 'AM5', B650E: 'AM5', B650: 'AM5',
  X570: 'AM4', B550: 'AM4', A520: 'AM4', B450: 'AM4', X470: 'AM4',
  B350: 'AM4', A320: 'AM4', X370: 'AM4',
  Z890: 'LGA1851', B860: 'LGA1851', H810: 'LGA1851', H870: 'LGA1851',
  Z790: 'LGA1700', B760: 'LGA1700', H770: 'LGA1700', Z690: 'LGA1700',
  B660: 'LGA1700', H670: 'LGA1700', H610: 'LGA1700', W680: 'LGA1700',
  Z590: 'LGA1200', B560: 'LGA1200', H570: 'LGA1200', H510: 'LGA1200',
  Z490: 'LGA1200', B460: 'LGA1200', H470: 'LGA1200',
  Z390: 'LGA1151', B365: 'LGA1151', B360: 'LGA1151', Z370: 'LGA1151',
  H370: 'LGA1151', H310: 'LGA1151', Z270: 'LGA1151', B250: 'LGA1151',
  Z170: 'LGA1151', B150: 'LGA1151',
  Z97: 'LGA1150', H97: 'LGA1150', H81: 'LGA1150', B85: 'LGA1150',
  TRX40: 'sTRX4', TRX50: 'sTR5', WRX80: 'sWRX8', WRX90: 'sTR5',
  X399: 'sTR4', X299: 'LGA2066',
};

// Longest first, so B650E is matched before B650.
const CHIPSET_KEYS = Object.keys(CHIPSET_SOCKET).sort((a, b) => b.length - a.length);

/**
 * Sockets with at least one processor in the catalogue, READ FROM THE CATALOGUE.
 *
 * This was a hardcoded list, and a hardcoded list was wrong twice over. It
 * named LGA1700 as serviceable while no LGA1700 processor existed, which would
 * have published thirty orphan boards; and it would have gone stale again the
 * moment a socket was added or withdrawn.
 *
 * Deriving it means the import is self-correcting. Add a processor for a socket
 * and re-running this publishes its boards; withdraw the last one and they drop
 * back to draft. The catalogue decides what it can serve, rather than a
 * constant somebody has to remember.
 */
const SERVICEABLE_SOCKETS = new Set(
  SAMPLE_COMPONENTS.filter((c) => c.category === 'cpu' && c.socket).map((c) => c.socket as string),
);

/**
 * Boards already in the catalogue, by normalised product name.
 *
 * See the duplicates note in the header. Skipping these leaves the operator's
 * own rows — and the prices they set on them — completely untouched.
 */
const EXISTING_BOARDS = new Set(
  [
    'GIGABYTE B550M K',
    'Gigabyte B860 AORUS ELITE WIFI7 ICE',
    'ASUS TUF GAMING B650E-PLUS WIFI',
    'MSI MAG X870 TOMAHAWK WIFI',
    'ASUS ROG STRIX B850-F GAMING WIFI',
    'ASUS ROG STRIX B850-I GAMING WIFI',
    'MSI MPG Z890 CARBON WIFI',
    // Hand-verified into the seed catalogue instead, with real M.2 and SATA
    // counts from ASUS, so the LGA1700 platform has one board the engine can
    // check end to end.
    'Asus TUF GAMING Z790-PLUS WIFI D4',
    // Also hand-verified into the seed, so AM4 has a board whose M.2 and SATA
    // counts the engine can actually check.
    'Asus PRIME B550-PLUS AC-HES',
  ].map(normKey),
);

const CHECKED_ON = '2026-10-06';

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------
const sqlStr = (v: string | null) => (v === null ? 'null' : `'${v.replace(/'/g, "''")}'`);
const sqlNum = (v: number | null) => (v === null ? 'null' : String(v));
const sqlJson = (v: Record<string, unknown>) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------
interface Built {
  id: string;
  sku: string;
  brand: string;
  model: string;
  socket: string;
  chipset: string | null;
  formFactor: string | null;
  memoryType: string | null;
  memorySlots: number | null;
  maxMemoryGb: number | null;
  priceCents: number;
  status: 'published' | 'draft';
  description: string;
  specs: Record<string, unknown>;
}

const report = {
  total: 0,
  skippedExisting: [] as string[],
  chipsetMismatch: [] as string[],
  noChipset: [] as string[],
  unmappedFormFactor: [] as string[],
  draftNoPrice: 0,
  draftNoCpu: 0,
  published: 0,
};

const rows = parseCsv(readFileSync(resolve(inputPath), 'utf8'));
const built: Built[] = [];
const usedIds = new Set<string>();
const usedSkus = new Set<string>();

function unique(base: string, taken: Set<string>, max: number): string {
  let candidate = base.slice(0, max);
  let n = 2;
  while (taken.has(candidate)) {
    const suffix = `-${n}`;
    candidate = base.slice(0, max - suffix.length) + suffix;
    n += 1;
  }
  taken.add(candidate);
  return candidate;
}

for (const row of rows) {
  const name = row['Product Name'];
  if (!name) continue;
  report.total += 1;

  if (EXISTING_BOARDS.has(normKey(name))) {
    report.skippedExisting.push(name);
    continue;
  }

  const firstWord = name.split(/\s+/)[0];
  const brand = BRANDS[firstWord.toLowerCase()] ?? firstWord;
  const model = name.slice(firstWord.length).trim() || name;

  const socket = row['CPU Socket'] || '';

  // Chipset, parsed then cross-checked against the socket.
  const compact = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let chipset: string | null = CHIPSET_KEYS.find((k) => compact.includes(k)) ?? null;
  if (chipset && CHIPSET_SOCKET[chipset] !== socket) {
    report.chipsetMismatch.push(`${name}  [${chipset} implies ${CHIPSET_SOCKET[chipset]}, sheet says ${socket}]`);
    chipset = null;
  }
  if (!chipset) report.noChipset.push(name);

  const rawFf = (row['Form Factor'] || '').toLowerCase().trim();
  let formFactor: string | null = null;
  if (rawFf in FORM_FACTORS) formFactor = FORM_FACTORS[rawFf];
  else if (rawFf) report.unmappedFormFactor.push(`${name}  [${row['Form Factor']}]`);

  const maxMemEarly = Number.parseInt((row['Max Memory (Source)'] || '').replace(/[^0-9]/g, ''), 10);

  /**
   * Memory generation.
   *
   * Most sockets settle it outright. LGA1700 does not — it takes DDR4 or DDR5
   * and the board decides — so it gets two tests, and between them they resolve
   * every LGA1700 row in the first sheet without a guess:
   *
   *   THE NAME. Vendors label the DDR4 variants, because the DDR5 one is the
   *   default and the DDR4 one is the exception that needs calling out. ASUS
   *   uses a "D4" suffix, MSI and Gigabyte spell out "DDR4". Twenty of
   *   forty-six rows say so. Not one says D5 or DDR5.
   *
   *   THE MAXIMUM CAPACITY. The largest DDR4 UDIMM is 32 GB, so a four-slot
   *   DDR4 board cannot exceed 128 GB — the ceiling is arithmetic, not a
   *   preference. Every remaining LGA1700 row maxes at 96, 192 or 256 GB, all
   *   of which need DDR5 modules to reach. None of the DDR4-named rows exceeds
   *   128 GB, so the two tests agree rather than competing.
   */
  let memoryType: string | null = SOCKET_MEMORY[socket] ?? null;
  if (!memoryType && socket === 'LGA1700') {
    if (/\bD4\b|DDR4/i.test(name)) memoryType = 'ddr4';
    else if (/\bD5\b|DDR5/i.test(name)) memoryType = 'ddr5';
    else if (Number.isFinite(maxMemEarly) && maxMemEarly > 128) memoryType = 'ddr5';
  }

  const slots = Number.parseInt(row['Memory Slots'] || '', 10);
  const memorySlots = Number.isFinite(slots) && slots > 0 ? slots : null;

  const maxMem = Number.parseInt((row['Max Memory (Source)'] || '').replace(/[^0-9]/g, ''), 10);
  const maxMemoryGb = Number.isFinite(maxMem) && maxMem > 0 ? maxMem : null;

  const rawPrice = Number.parseFloat(row['Price CAD'] || '');
  const hasPrice = Number.isFinite(rawPrice) && rawPrice > 0;
  const priceCents = hasPrice ? Math.round(rawPrice * 100) : 0;

  const hasCpu = SERVICEABLE_SOCKETS.has(socket);
  let status: 'published' | 'draft' = 'published';
  if (!hasPrice) {
    status = 'draft';
    report.draftNoPrice += 1;
  } else if (!hasCpu) {
    status = 'draft';
    report.draftNoCpu += 1;
  } else {
    report.published += 1;
  }

  // Assembled from the row's own figures. Nothing about features, chipset
  // capability or performance, because the sheet does not say and a description
  // is the easiest place for an invented claim to hide.
  const descParts = [
    `${socket} motherboard`,
    formFactor ? `in ${row['Form Factor']} form factor` : null,
    memorySlots ? `with ${memorySlots} memory slots` : null,
    maxMemoryGb ? `supporting up to ${maxMemoryGb} GB` : null,
  ].filter(Boolean);
  const description = `${descParts.join(' ')}.`;

  const specs: Record<string, unknown> = {
    source: 'PBC motherboard catalogue sheet',
    price_checked: CHECKED_ON,
    // Deliberately records what is NOT known, because these are the columns the
    // engine would otherwise have compared.
    unverified:
      'Imported from a catalogue sheet. M.2 slot count, SATA port count and PCIe generation are not recorded, so the storage and PCIe checks report insufficient data rather than a result. Specifications have not been confirmed against manufacturer documentation.',
  };
  if (row['Color']) specs.colour = row['Color'];
  if (row['Stock Status'] === 'Out of stock') {
    specs.availability_note = 'Listed as out of stock at the source on the sheet date.';
  }
  // 'Review Count' is deliberately DROPPED. It is a retailer's review count, and
  // printing it on these product pages would present other people's reviews of
  // the part as reviews of this shop. The reviews system here is built on
  // verified purchases precisely so that number means something.

  const id = unique(`mb-${slug(name)}`, usedIds, 120);
  const skuBase = `MB-${brand.slice(0, 3).toUpperCase()}-${model.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)}`;
  const sku = unique(skuBase, usedSkus, 60);

  built.push({
    id, sku, brand, model, socket, chipset, formFactor, memoryType,
    memorySlots, maxMemoryGb, priceCents, status, description, specs,
  });
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------
const COLUMNS = [
  'id', 'sku', 'slug', 'category', 'brand', 'model', 'description',
  'price_cents', 'cost_cents', 'stock_quantity', 'low_stock_threshold',
  'image_url', 'status', 'data_confidence', 'condition',
  'socket', 'chipset', 'form_factor', 'memory_type', 'memory_slots',
  'max_memory_gb', 'm2_slots', 'sata_ports', 'pcie_version', 'specs',
];

const values = built
  .map((b) =>
    '  (' +
    [
      sqlStr(b.id), sqlStr(b.sku), sqlStr(b.id), `'motherboard'`,
      sqlStr(b.brand), sqlStr(b.model), sqlStr(b.description),
      sqlNum(b.priceCents), 'null', '5', '3',
      'null', sqlStr(b.status), `'sample'`, `'new'`,
      sqlStr(b.socket || null), sqlStr(b.chipset),
      b.formFactor ? `'${b.formFactor}'::form_factor` : 'null',
      b.memoryType ? `'${b.memoryType}'::memory_type` : 'null',
      sqlNum(b.memorySlots), sqlNum(b.maxMemoryGb),
      'null', 'null', 'null',
      sqlJson(b.specs),
    ].join(', ') +
    ')',
  )
  .join(',\n');

const header = `-- ===========================================================================
-- PC Builders Canada - motherboard catalogue import
-- ===========================================================================
-- GENERATED FILE - do not edit by hand.
-- Regenerate with: npx vite-node scripts/import-motherboards.ts <sheet.csv>
--
-- ADDITIVE ONLY. Ends in \`on conflict (id) do nothing\`, so running it against a
-- database already in service cannot change a price, a stock count, a status or
-- an uploaded photo on any row that already exists.
--
-- Rows: ${built.length}  (${report.published} published, ${built.length - report.published} draft)
--
-- Drafts are in the database but not on the storefront, for one of two reasons:
-- the sheet carried no price (price_cents is NOT NULL, so the row would list at
-- $0.00), or the board's socket has no processor in this catalogue and a
-- customer picking it could not finish a build.
--
-- m2_slots, sata_ports and pcie_version are NULL throughout. A retail listing
-- does not publish them. The compatibility engine reports insufficient data for
-- those checks rather than passing one it did not perform.
-- ===========================================================================

insert into components (
${COLUMNS.map((c) => `  ${c}`).join(',\n')}
) values
${values}
on conflict (id) do nothing;
`;

const outPath = resolve(process.cwd(), 'supabase/seed/motherboards.sql');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, header, 'utf8');

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log(`Read ${report.total} rows from ${inputPath}`);
console.log(`Wrote ${built.length} rows to supabase/seed/motherboards.sql`);
console.log(`  published            ${report.published}`);
console.log(`  draft, no price      ${report.draftNoPrice}`);
console.log(`  draft, no processor  ${report.draftNoCpu}`);
console.log(`  skipped, already listed ${report.skippedExisting.length}`);
for (const n of report.skippedExisting) console.log(`      ${n}`);

if (report.chipsetMismatch.length) {
  console.log(`\n  CHIPSET / SOCKET MISMATCH in the sheet (${report.chipsetMismatch.length}) - chipset dropped:`);
  for (const n of report.chipsetMismatch) console.log(`      ${n}`);
}
if (report.unmappedFormFactor.length) {
  console.log(`\n  FORM FACTOR with no enum value (${report.unmappedFormFactor.length}) - left null:`);
  for (const n of report.unmappedFormFactor) console.log(`      ${n}`);
}
console.log(`\n  chipset not parseable from the name: ${report.noChipset.length}`);

const noMem = built.filter((b) => !b.memoryType).length;
const noFf = built.filter((b) => !b.formFactor).length;
console.log(`  memory_type null (LGA1700 and HEDT): ${noMem}`);
console.log(`  form_factor null: ${noFf}`);
