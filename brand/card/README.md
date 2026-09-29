# Business card

Standard North American size: **3.5 × 2 in** trim, **3.75 × 2.25 in** with
bleed. Two pages — page 1 is the front, page 2 is the back.

| File | Give this to |
| --- | --- |
| `business-card-print.pdf` | **Most online printers** (Vistaprint, Moo, Jukebox, 4over). Bleed included, no marks. |
| `business-card-crop-marks.pdf` | A local print shop that asks for crop marks. |
| `business-card-PROOF-guides.pdf` | **Nobody.** Shows the trim and safe lines for checking. Never send it. |
| `preview-front.png`, `preview-back.png` | Looking at it on screen. 300 dpi. |

Regenerate everything:

```bash
python brand/card/generate_card.py
```

---

## Before it can be printed

The card currently shows `[ PHONE NUMBER ]` and `[ EMAIL ]` in orange. Those
are placeholders and they are deliberately ugly so they cannot slip through.
Open `generate_card.py`, fill in `CARD["phone"]` and `CARD["email"]` at the
top, and run it again. The script prints a warning while either is missing.

On the email: `arnobsarfraj@gmail.com` works, but a Gmail address on a card for
a business that owns `pcbuilderscanada.com` undersells it. Most registrars and
Cloudflare will forward `info@pcbuilderscanada.com` to an existing inbox for
nothing, and it is a five-minute job.

---

## Design decisions, so nobody has to re-derive them

**The front is dark and the back is light.** Two dark faces look expensive and
print badly: heavy full-bleed ink shows every fingerprint, and small type
reversed out of a dark ground fills in on anything but premium stock. The
deciding factor is the QR code — a dark code on a light ground is the only
version that scans reliably on older phones.

**The background purple is lighter than the website's.** On screen `#0e0918`
reads as deep purple. Converted to CMYK and printed it reads as flat black and
the brand colour disappears entirely. `#1C1338` survives the conversion.

**The front carries the logo and one address, nothing else.** A card that leads
with a mark and a URL reads as an established business. The same card with a
phone number, three services and a tagline crowded around the logo reads as a
flyer. Everything else is on the back, which has room for it.

**Layout positions are computed and asserted, not nudged by eye.** An early
version hard-coded offsets and the third row of services ended up underneath
the referral strip — invisible at preview size, obvious once printed. Adding a
seventh service would have done it again. The assertions in `draw_back` fail
the build instead.

---

## Print specifications

**Stock:** 16pt or heavier, matte or soft-touch. A 14pt card feels cheap in the
hand and that impression transfers to the work. Matte also matters for the QR —
gloss throws back the phone's own light, and a code under a shop spotlight is
exactly where a glossy finish fails to scan.

**Colour:** supply as-is and let the printer convert, or give them these if
they ask for CMYK. Ask for a **rich black** build on the purple, not a single
black plate, or it will print as a washed-out grey-black:

| Colour | Hex | Suggested CMYK |
| --- | --- | --- |
| Card purple | `#1C1338` | C 88 M 88 Y 45 K 55 |
| Gold | `#D4A03C` | C 15 M 36 Y 85 K 2 |
| Paper | `#FBFAFD` | leave unprinted |

**Finishes worth the money**, in order: soft-touch lamination, then spot UV on
the logo, then gold foil on the mark. Foil is the one people remember, and it
suits a brand whose mark is already gold. It roughly doubles the unit cost on
short runs.

**Finishes to skip:** rounded corners (dates quickly), and anything textured
behind the QR code.

---

## Test before ordering a thousand

Print **one** on the real stock at the real size, then scan it with an iPhone,
an Android, and one phone that is several years old. Confirm it reaches the
page and the page loads on mobile data rather than Wi-Fi.

A card is the only medium that cannot be patched after the fact.

The QR is verified against the generated PDF on every run — it decodes to
`https://www.pcbuilderscanada.com/scan` — but that proves the file is right,
not that a particular press and paper combination reproduced it well.
