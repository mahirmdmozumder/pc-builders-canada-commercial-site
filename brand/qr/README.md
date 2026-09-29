# QR codes for printed material

All four files encode the same URL:

```
https://www.pcbuilderscanada.com/scan
```

| File | Use |
| --- | --- |
| `scan-qr.svg` | **Default.** Vector, black on white. Give this to a printer. |
| `scan-qr-transparent.png` | Dropping onto an existing card design that already has a light background. |
| `scan-qr-dark.svg` | Gold on midnight purple, for a dark card face. Read the warning below first. |
| `scan-qr.png` | Raster fallback for software that will not accept an SVG. |

## Print specifications

**Minimum printed size: 2 cm (0.8 in) square.** This code is version 5, 45
modules across. Below 2 cm each module falls under 0.4 mm and cheaper presses
start to bleed them together. 2.5 cm is more comfortable if the layout allows.

**Keep the quiet zone.** The white margin built into these files is four
modules wide and is part of the specification, not padding. Scanners use it to
find where the code ends. Cropping it in to save space is the single most
common reason a printed code will not scan, and it fails silently — it looks
fine to the eye.

**Do not stretch it.** Scale proportionally. A code squashed to fit a space
will not decode.

**Matte, not gloss**, if there is a choice. Gloss throws back the phone's own
light and torch, and a code under a spotlight in a shop is exactly where a
glossy finish fails.

## About the dark version

Black on white is the safe choice and should be the default. A light code on a
dark background is inverted relative to what scanners expect: current iPhone
and Android cameras handle it, but older handsets and some third-party scanner
apps do not. If the card is dark, the reliable approach is a light panel behind
the code rather than inverting it.

Contrast also matters more than colour. Gold on purple measures roughly 8:1,
which is enough — but do not swap in a mid-tone gold on a mid-tone purple to
suit a layout, because that will drop below what a camera can separate.

## Before printing a thousand of them

Print **one** on the actual stock, at the actual size, and scan it with:

- an iPhone camera,
- an Android camera,
- one phone that is several years old.

Then confirm it lands on the page and the page loads on mobile data rather than
Wi-Fi. A card is the one medium that cannot be patched after the fact.

## Regenerating

Error correction is set to **H** (30% recoverable). That is deliberate: printed
codes get creased, thumbed and smudged in a wallet, and H is what lets one keep
working afterwards. It also leaves room to place a logo over the centre later
without breaking the code.

If the URL ever changes, regenerate rather than editing:

```bash
pip install segno
python -c "import segno; segno.make('https://www.pcbuilderscanada.com/scan', error='h').save('brand/qr/scan-qr.svg', scale=10, border=4)"
```

Better still, do not change the URL. `/scan` is a permanent redirect target by
design — if the landing page ever needs to move, change what `/scan` renders
rather than reprinting every card in circulation.
