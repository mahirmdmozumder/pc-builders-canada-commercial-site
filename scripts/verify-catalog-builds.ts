/**
 * Walks the catalogue and asserts that every processor can reach a complete,
 * compatible build using only parts the catalogue actually contains.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Adding a processor is not adding a row. A socket that has no motherboard, or
 * a DDR5 board with no DDR5 kit listed, puts a part in the configurator that a
 * customer can select and then cannot finish a build around. They do not read
 * that as "the shop is still stocking up"; they read it as the configurator
 * being broken, and they leave.
 *
 * The compatibility engine already reports that per build. What it cannot do is
 * tell you the CATALOGUE has a hole, because it only ever sees the build in
 * front of it. So this runs the real engine — not a copy of its rules — over a
 * best-effort build per processor and fails if any processor is stranded.
 *
 * It is deliberately a script rather than a unit test. It is an assertion about
 * the shape of the catalogue, which is data that changes when stock changes, and
 * a red test suite is the wrong way to say "you should list a DDR4 kit".
 *
 *   npx vite-node scripts/verify-catalog-builds.ts
 */
import { SAMPLE_COMPONENTS } from '../src/lib/catalog/sample-catalog';
import { checkCompatibility } from '../src/lib/compatibility/engine';
import {
  REQUIRED_CATEGORIES,
  stripCost,
  type ComponentCategory,
  type PublicComponent,
  type ResolvedBuild,
} from '../src/lib/catalog/types';

const rows = SAMPLE_COMPONENTS.map(stripCost);
const byCategory = (c: ComponentCategory) => rows.filter((r) => r.category === c);

/**
 * Picks the cheapest part in a category that is compatible with what is already
 * chosen. Cheapest rather than best, because the question being asked is whether
 * a build is POSSIBLE at all, and the cheapest path is the one most likely to
 * exist.
 */
function pick(
  category: ComponentCategory,
  predicate: (c: PublicComponent) => boolean,
): PublicComponent | null {
  const candidates = byCategory(category)
    .filter(predicate)
    .sort((a, b) => a.price_cents - b.price_cents);
  return candidates[0] ?? null;
}

interface Outcome {
  cpu: string;
  socket: string | null;
  status: string;
  missing: ComponentCategory[];
  failures: string[];
  parts: Record<string, string>;
}

const outcomes: Outcome[] = [];

for (const cpu of byCategory('cpu')) {
  const board = pick('motherboard', (b) => b.socket === cpu.socket);
  const ram = pick('ram', (r) => !board || r.memory_type === board.memory_type);
  const cooler = pick('cooler', (c) => (c.supported_sockets ?? []).includes(cpu.socket ?? ''));
  const gpu = pick('gpu', () => true);
  const storage = pick('storage', () => true);
  const psu = pick('psu', () => true);

  // The case has to take the board AND the chosen card, which is the pairing
  // most likely to have no answer in a small catalogue.
  const pcCase = pick(
    'case',
    (k) =>
      (!board?.form_factor || (k.supported_form_factors ?? []).includes(board.form_factor)) &&
      (!gpu?.gpu_length_mm || (k.max_gpu_length_mm ?? 0) >= gpu.gpu_length_mm),
  );

  const chosen: [ComponentCategory, PublicComponent | null][] = [
    ['cpu', cpu],
    ['motherboard', board],
    ['ram', ram],
    ['cooler', cooler],
    ['gpu', gpu],
    ['storage', storage],
    ['psu', psu],
    ['case', pcCase],
  ];

  const build: ResolvedBuild = chosen
    .filter((entry): entry is [ComponentCategory, PublicComponent] => entry[1] !== null)
    .map(([category, component]) => ({ category, component, quantity: 1 }));

  const report = checkCompatibility(build);
  const unlisted = REQUIRED_CATEGORIES.filter((c) => !chosen.some(([k, v]) => k === c && v));

  outcomes.push({
    cpu: `${cpu.brand} ${cpu.model}`,
    socket: cpu.socket,
    status: report.status,
    missing: unlisted,
    failures: report.failures.map((f) => `${f.title}: ${f.message}`),
    parts: Object.fromEntries(
      chosen.filter(([, v]) => v).map(([k, v]) => [k, `${v!.brand} ${v!.model}`]),
    ),
  });
}

let broken = 0;
for (const o of outcomes) {
  const ok = o.status === 'compatible' || o.status === 'warnings';
  if (!ok) broken += 1;
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${o.cpu}  [${o.socket ?? 'no socket'}]  -> ${o.status}`);
  if (o.missing.length) {
    console.log(`        nothing listed for: ${o.missing.join(', ')}`);
  }
  for (const f of o.failures) console.log(`        ${f}`);
  if (!ok) {
    for (const [k, v] of Object.entries(o.parts)) console.log(`          ${k}: ${v}`);
  }
}

console.log(
  `\n${outcomes.length - broken}/${outcomes.length} processors can reach a complete build ` +
    `from parts in the catalogue.`,
);

// ---------------------------------------------------------------------------
// The other direction: a board nobody can put a processor in
// ---------------------------------------------------------------------------
// The loop above walks processors, so it catches a socket with no motherboard.
// It is blind to the reverse, and the reverse is what a bulk import produces: a
// spreadsheet of 300 boards spans fifteen sockets, eleven of which have no
// processor here and most of which have no processor on sale anywhere.
//
// A customer reaching an orphan board does not conclude the shop is still
// stocking up. They conclude the configurator is broken, which is the same
// outcome as a stranded processor and costs the same sale.
const cpuSockets = new Set(
  byCategory('cpu')
    .map((c) => c.socket?.toLowerCase())
    .filter((s): s is string => Boolean(s)),
);

const orphanBoards = byCategory('motherboard').filter(
  (b) => !b.socket || !cpuSockets.has(b.socket.toLowerCase()),
);

const boardCount = byCategory('motherboard').length;
console.log(
  `${boardCount - orphanBoards.length}/${boardCount} motherboards have a processor ` +
    `in the catalogue that fits them.`,
);

if (orphanBoards.length > 0) {
  const bySocket = new Map<string, number>();
  for (const b of orphanBoards) {
    const key = b.socket ?? '(no socket recorded)';
    bySocket.set(key, (bySocket.get(key) ?? 0) + 1);
  }
  console.error(`\n${orphanBoards.length} motherboard(s) have no processor that fits:`);
  for (const [socket, n] of [...bySocket].sort((a, b) => b[1] - a[1])) {
    console.error(`        ${socket}: ${n} board(s)`);
  }
  console.error(
    `      Either list a processor for those sockets or keep the boards as drafts, ` +
      `so they are not selectable.`,
  );
}

if (broken > 0 || orphanBoards.length > 0) {
  if (broken > 0) {
    console.error(
      `\n${broken} processor(s) are stranded: selectable in the configurator but with no path ` +
        `to a finished machine. Either list the missing part or withdraw the processor.`,
    );
  }
  process.exit(1);
}
