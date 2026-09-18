# The compatibility engine

`src/lib/compatibility/engine.ts`. Tests: `engine.test.ts`.

## Contract

```ts
checkCompatibility(build: ResolvedBuild): CompatibilityReport
```

A `ResolvedBuild` is a list of `{ category, component, quantity }`. The report contains every
check, the subset that failed, the subset that warned, the categories still missing, and the power
estimate.

The function is pure: same build in, same report out. No I/O, no model call, no randomness. It runs
unchanged in a server component, a route handler, and the browser.

## Status values

| Status | Meaning | Effect |
| --- | --- | --- |
| `pass` | Compared and compatible | — |
| `warning` | Will work, but worth knowing | Cart allowed |
| `fail` | Will not work | Blocks adding to cart and blocks checkout |
| `unknown` | The data needed is not recorded | Shown as "not enough data to check" |
| `skipped` | A part this rule needs is not selected yet | Collapsed in the UI |

**`unknown` is the important one.** If a cooler has no socket list recorded, the rule says it cannot
check rather than assuming it fits. A silent pass on missing data is worse than no check: it looks
like verification and is not.

## The rules

### CPU / Motherboard
Compares `cpu.socket` to `motherboard.socket`, case-insensitively. Mismatch fails. The passing
message notes that a BIOS update may still be needed for a newer CPU on an older board, because
socket compatibility does not imply out-of-box support.

### Memory / Motherboard
Three comparisons, in order of severity:
1. DDR generation must match. DDR4 and DDR5 are keyed differently.
2. Total modules (`memory_modules x quantity`, summed) must fit `memory_slots`.
3. Total capacity must not exceed `max_memory_gb`.

The pass message mentions that speeds above the CPU's rated support are an overclock (XMP/EXPO) and
not guaranteed. True, and relevant, so it is said.

### CPU Cooler / Socket
The cooler's `supported_sockets` array must contain the CPU socket. Separately, if
`cooling_capacity_watts` is below the CPU's `tdp_watts`, a **warning** is raised — it will run, but
throttle under sustained load.

Note the two distinct fields. On a cooler, `tdp_watts` is the power its own fans and pump draw;
`cooling_capacity_watts` is the heat it can move. Conflating them was a real bug caught by the test
suite, which is why they are separate columns with comments saying so.

### Motherboard / Case
`case.supported_form_factors` must include `motherboard.form_factor`.

### Graphics card / PCIe
A card of a newer generation than the slot produces a **warning**, not a failure: PCIe is backward
compatible, so it works at the slower link speed. Reporting this as incompatible would be wrong.

### Graphics card / Case
`gpu_length_mm` against `max_gpu_length_mm`. Over the limit fails; under 15 mm of clearance warns,
because front radiators and fan mounts commonly eat the remainder.

### Cooling / Case
Branches on cooler type. Liquid: at least one of the radiator's sizes must appear in the case's
`radiator_support_mm`. Air: `cooler_height_mm` must be within `max_cooler_height_mm`.

### Storage / Motherboard
Counts NVMe M.2 drives against `m2_slots` and SATA drives against `sata_ports`. The pass message
warns that populating M.2 slots disables SATA ports on many boards — lane sharing is real and
board-specific, so it is flagged rather than modelled.

### Power supply / Case
An ATX unit in a case that only accepts SFX fails. An SFX unit in an ATX case passes with a note
about the adapter bracket.

### Power supply capacity
Delegates to the power estimator. Below the estimate fails; above the estimate but over the load
threshold, or under a vendor-stated minimum, warns.

## Candidate pre-checking

The configurator does something the engine makes cheap: for the category currently open, it runs
the whole engine once per candidate part with that part swapped in.

```ts
const hypothetical = [...others, { category, component: option, quantity: 1 }];
const result = checkCompatibility(hypothetical);
```

That is what lets the picker label a card *too long for this case* before selection, and hide
non-fitting parts by default. Fifty candidates times ten checks is a trivial amount of work for
pure functions over small objects.

## Adding a rule

1. Add the field it compares to `ComponentRecord`, the SQL schema, and the seed generator column
   list. Keep it a typed column, not JSON.
2. Write the rule as a function returning a `CompatibilityCheck`. Return `unknown` when the data is
   missing; never assume.
3. Add it to the array in `checkCompatibility`.
4. Write tests in both directions, plus one for the missing-data path.

## What the engine does not do

- It does not check BIOS version support lists. That data is not machine-readable per board, so the
  UI says to check the manufacturer's list.
- It does not model M.2/SATA lane sharing per chipset. It warns instead.
- It does not verify that recorded specifications are correct. It checks the data it is given, which
  is why unverified rows are labelled as such throughout the UI.
