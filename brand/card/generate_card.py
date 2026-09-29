"""
Business card generator for PC Builders Canada.

Produces print-ready PDFs at the North American standard 3.5 x 2 inch trim,
with 0.125 inch bleed on every edge, plus a crop-marked version for a local
print shop and PNG previews for checking on screen.

Everything that could be wrong is in CARD, at the top. Regenerate with:

    python brand/card/generate_card.py

DESIGN NOTES, so nobody has to re-derive them
---------------------------------------------
* Front is dark, back is light. Two dark faces look expensive and print badly:
  heavy full-bleed ink shows every fingerprint, and small type reversed out of
  a dark ground fills in on anything but premium stock. More importantly the
  QR code lives on the back, and a dark QR on a light ground is the only
  version that scans reliably on older phones.

* The background purple is LIGHTER than the website's. On screen #0e0918 reads
  as deep purple; converted to CMYK and printed it reads as flat black and the
  brand colour disappears. The value here survives the conversion.

* Text sits inside a 0.125 inch safe margin from the trim. Guillotines drift by
  up to a millimetre or so, and anything closer to the edge risks being sliced.

* Placeholders render in alarm orange with brackets. They are meant to be
  impossible to send to a printer by accident.
"""

from __future__ import annotations

import pathlib

import segno
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas

# ---------------------------------------------------------------------------
# What goes on the card
# ---------------------------------------------------------------------------

CARD = {
    "name": "Arnob Sarfraj",
    "role": "Custom PC Builds · Repairs · Upgrades",
    "website": "pcbuilderscanada.com",
    "scan_url": "https://www.pcbuilderscanada.com/scan",
    # None renders a marked placeholder instead of a wrong value.
    "phone": None,
    "email": None,
    "instagram": None,
    "services": [
        "Custom PC builds",
        "Repairs & diagnostics",
        "Upgrades & tuning",
        "Windows & software setup",
        "Networking & NAS",
        "Mini PCs & Raspberry Pi",
    ],
    "referral_headline": "REFER A FRIEND",
    "referral_detail": "$25 for them, $25 for you",
    "referral_url": "pcbuilderscanada.com/refer",
    "service_area": "Greater Toronto Area",
}

# ---------------------------------------------------------------------------
# Geometry. reportlab works in points; 72 points to the inch.
# ---------------------------------------------------------------------------

PT = 72.0
TRIM_W, TRIM_H = 3.5 * PT, 2.0 * PT          # 252 x 144
BLEED = 0.125 * PT                            # 9
SAFE = 0.125 * PT                             # inside the trim
DOC_W, DOC_H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED

# Origin of the trimmed card inside the bleed page.
X0, Y0 = BLEED, BLEED

# ---------------------------------------------------------------------------
# Colour
# ---------------------------------------------------------------------------

PURPLE = HexColor("#1C1338")       # card ground; survives CMYK as purple
PURPLE_DEEP = HexColor("#120C26")  # shadow tone
GOLD = HexColor("#D4A03C")
GOLD_LIGHT = HexColor("#E8BE6A")
GOLD_PALE = HexColor("#F2D89A")
PAPER = HexColor("#FBFAFD")
INK = HexColor("#1C1338")
MUTED = HexColor("#6B5F85")
GOLD_DARK = HexColor("#8A6A24")   # gold that still reads on white
HAIRLINE = HexColor("#D9D3E6")
ALARM = HexColor("#C2410C")        # placeholders only

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "brand" / "card"
LOGO_LOCKUP = ROOT / "public" / "logo-lockup.png"
LOGO_MARK = ROOT / "public" / "logo-mark.png"

# ---------------------------------------------------------------------------
# Fonts
# ---------------------------------------------------------------------------

FONTS = {
    "sans": ("PBC-Sans", r"C:\Windows\Fonts\segoeui.ttf"),
    "sans-bold": ("PBC-Sans-Bold", r"C:\Windows\Fonts\segoeuib.ttf"),
    "sans-light": ("PBC-Sans-Light", r"C:\Windows\Fonts\segoeuil.ttf"),
    "sans-semi": ("PBC-Sans-Semi", r"C:\Windows\Fonts\seguisb.ttf"),
    "serif": ("PBC-Serif", r"C:\Windows\Fonts\georgia.ttf"),
    "serif-bold": ("PBC-Serif-Bold", r"C:\Windows\Fonts\georgiab.ttf"),
}


def register_fonts() -> dict[str, str]:
    """Registers each font, falling back to Helvetica if one is missing."""
    resolved: dict[str, str] = {}
    for key, (name, path) in FONTS.items():
        if pathlib.Path(path).exists():
            pdfmetrics.registerFont(TTFont(name, path))
            resolved[key] = name
        else:
            resolved[key] = "Helvetica-Bold" if "bold" in key or "semi" in key else "Helvetica"
            print(f"  ! font missing for {key}: {path} -> {resolved[key]}")
    return resolved


# ---------------------------------------------------------------------------
# Drawing helpers
# ---------------------------------------------------------------------------


def tracked(c, x, y, text, font, size, colour, tracking, align="left"):
    """
    Draws letterspaced text.

    reportlab has no tracking control, so the string is drawn a character at a
    time. Small caps set tight look cramped and cheap; a little tracking is
    most of what separates a typeset card from a typed one.
    """
    c.setFont(font, size)
    c.setFillColor(colour)
    widths = [pdfmetrics.stringWidth(ch, font, size) for ch in text]
    total = sum(widths) + tracking * max(0, len(text) - 1)

    if align == "center":
        x -= total / 2
    elif align == "right":
        x -= total

    for ch, w in zip(text, widths):
        c.drawString(x, y, ch)
        x += w + tracking
    return total


def tracked_width(text, font, size, tracking):
    return sum(pdfmetrics.stringWidth(ch, font, size) for ch in text) + tracking * max(
        0, len(text) - 1
    )


def value_or_placeholder(c, x, y, value, placeholder, font, size, colour):
    """
    Draws a real value, or a loud placeholder when it is not configured yet.

    The placeholder is deliberately ugly. A card is the one medium that cannot
    be corrected after printing, so a missing phone number should stop the eye
    rather than blend in.
    """
    if value:
        c.setFont(font, size)
        c.setFillColor(colour)
        c.drawString(x, y, value)
        return True

    c.setFont(font, size)
    c.setFillColor(ALARM)
    c.drawString(x, y, f"[ {placeholder} ]")
    return False


def qr_image(url: str) -> pathlib.Path:
    """
    Renders the QR at error correction H.

    H recovers 30% of the symbol, which is what lets a card creased in a wallet
    still scan. The quiet zone of four modules is part of the specification and
    is the usual reason a printed code fails, so it stays.
    """
    path = OUT / "_qr-card.png"
    # The quiet zone is filled with the PAPER tone rather than pure white, so
    # the code sits on the card instead of in a faintly visible white box.
    # Contrast against the dark modules is still about 16:1, far more than any
    # scanner needs.
    segno.make(url, error="h").save(
        str(path), scale=40, border=4, dark="#16102E", light="#FBFAFD"
    )
    return path


# ---------------------------------------------------------------------------
# Front
# ---------------------------------------------------------------------------


def draw_front(c, F):
    """
    Logo, a rule, and the URL. Nothing else.

    The restraint is the point. A card that leads with a mark and one address
    reads as an established business; the same card with a phone number, three
    services and a tagline crammed round the logo reads as a flyer. Everything
    else lives on the back, where there is room for it.
    """
    c.setFillColor(PURPLE)
    c.rect(0, 0, DOC_W, DOC_H, stroke=0, fill=1)

    cx = DOC_W / 2

    # Logo width is set in inches; height follows the source aspect ratio, so
    # the mark can never end up stretched.
    logo = ImageReader(str(LOGO_LOCKUP))
    lw_px, lh_px = logo.getSize()
    lw = 1.95 * PT
    lh = lw * lh_px / lw_px
    logo_bottom = Y0 + 63
    c.drawImage(logo, cx - lw / 2, logo_bottom, width=lw, height=lh, mask="auto")

    # Tapered rule, built from three segments rather than a gradient. Flat
    # tints reproduce identically on any press; gradients band on cheap ones.
    rule_y = Y0 + 49
    for half_in, tone in ((0.30, GOLD), (0.40, HexColor("#8A6A24")), (0.48, HexColor("#4A3914"))):
        c.setStrokeColor(tone)
        c.setLineWidth(0.6)
        c.line(cx - half_in * PT, rule_y, cx + half_in * PT, rule_y)

    tracked(
        c, cx, Y0 + 33, CARD["website"].upper(), F["sans"], 6.4, GOLD_PALE, 2.0, align="center"
    )

    # Where the business operates belongs on the face people look at first,
    # and moving it off the back bought the room the service list needed.
    tracked(
        c, cx, Y0 + 21, CARD["service_area"].upper(), F["sans-light"], 4.9,
        HexColor("#9E8FC0"), 1.6, align="center",
    )


def draw_back(c, F, qr_path):
    """
    Information side.

    Vertical positions are COMPUTED and then checked, rather than nudged by
    eye. The first version of this hard-coded offsets, and the third row of
    services ended up underneath the referral strip — invisible on screen at
    small sizes and obvious only once printed. Adding a seventh service would
    have done it again. The assertion at the end of the layout block is what
    stops that reaching a press.
    """
    c.setFillColor(PAPER)
    c.rect(0, 0, DOC_W, DOC_H, stroke=0, fill=1)

    left = X0 + SAFE
    right = X0 + TRIM_W - SAFE
    top = Y0 + TRIM_H - SAFE

    STRIP_H = 22.0
    strip_top = Y0 + STRIP_H
    CLEARANCE = 4.0          # minimum gap between content and the strip

    # --- layout ------------------------------------------------------------
    name_y = top - 32
    role_y = top - 41
    rule_y = top - 48

    contact_gap = 8.4
    contact_ys = [rule_y - 9.5 - i * contact_gap for i in range(3)]
    header_y = contact_ys[-1] - 10.0

    service_rows = (len(CARD["services"]) + 1) // 2
    service_gap = 6.5
    first_service_y = header_y - 7.2
    last_service_y = first_service_y - (service_rows - 1) * service_gap

    # Descenders sit roughly 1.5pt below the baseline at this size.
    lowest = last_service_y - 1.5
    assert lowest >= strip_top + CLEARANCE, (
        f"Back layout overflows into the referral strip by "
        f"{strip_top + CLEARANCE - lowest:.1f}pt. Shorten the service list or "
        f"tighten the spacing above."
    )

    # --- referral strip ----------------------------------------------------
    # Bleeds off the bottom edge. One line, not two: the safe margin leaves
    # only about 11pt of usable height inside this strip, and two stacked lines
    # in that space sit close enough to the cut to look like a mistake.
    c.setFillColor(PURPLE)
    c.rect(0, 0, DOC_W, strip_top, stroke=0, fill=1)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.6)
    c.line(0, strip_top, DOC_W, strip_top)

    # Text inside a bleed strip still has to respect the safe margin. The
    # first version centred it in the band, which put it BELOW the safe line
    # and one drifting cut away from being clipped. In a bottom strip the type
    # belongs in the upper part of the band; the space beneath it is the same
    # margin every other edge of the card leaves.
    baseline = Y0 + SAFE + 3.6
    assert baseline - 1.6 >= Y0 + SAFE, "referral strip text breaks the safe margin"
    used = tracked(
        c, left, baseline, CARD["referral_headline"], F["sans-bold"], 5.2, GOLD_LIGHT, 1.2
    )
    c.setFont(F["sans"], 6.1)
    c.setFillColor(PAPER)
    c.drawString(left + used + 7.0, baseline, CARD["referral_detail"])

    c.setFont(F["sans-light"], 4.8)
    c.setFillColor(HexColor("#BCB0D6"))
    c.drawRightString(right, baseline, CARD["referral_url"])

    # --- QR ----------------------------------------------------------------
    qr_size = 0.78 * PT
    qr_x = right - qr_size
    qr_y = strip_top + 29
    c.drawImage(ImageReader(str(qr_path)), qr_x, qr_y, width=qr_size, height=qr_size, mask=None)

    qr_mid = qr_x + qr_size / 2
    tracked(
        c, qr_mid, qr_y + qr_size + 5.0, "SCAN ME", F["sans-bold"], 5.0, GOLD_DARK, 1.5,
        align="center",
    )

    c.setFont(F["sans-light"], 4.5)
    c.setFillColor(MUTED)
    for i, line in enumerate(("Services, quotes", "& booking")):
        c.drawCentredString(qr_mid, qr_y - 6.4 - i * 5.2, line)

    # --- identity ----------------------------------------------------------
    col_right = qr_x - 10.0

    mark = ImageReader(str(LOGO_MARK))
    mw_px, mh_px = mark.getSize()
    mh = 15.0
    mw = mh * mw_px / mh_px
    c.drawImage(mark, left, top - mh, width=mw, height=mh, mask="auto")
    tracked(c, left + mw + 5.0, top - mh + 4.4, "PC BUILDERS CANADA", F["sans-bold"], 5.9, INK, 1.2)

    c.setFont(F["serif-bold"], 10.4)
    c.setFillColor(INK)
    c.drawString(left, name_y, CARD["name"])

    tracked(c, left, role_y, CARD["role"], F["sans-light"], 5.2, MUTED, 0.5)

    c.setStrokeColor(HAIRLINE)
    c.setLineWidth(0.5)
    c.line(left, rule_y, col_right, rule_y)

    # --- contact -----------------------------------------------------------
    # Labels are right-aligned in their own column so the values share a left
    # edge. Left-aligning both ran "MAIL" into the address beside it.
    label_col = left + 21.0
    value_col = left + 26.0

    rows = (
        ("TEL", CARD["phone"], "PHONE NUMBER"),
        ("WEB", CARD["website"], "WEBSITE"),
        ("MAIL", CARD["email"], "EMAIL"),
    )
    for (label, value, placeholder), y in zip(rows, contact_ys):
        w = tracked_width(label, F["sans-bold"], 4.5, 0.8)
        tracked(c, label_col - w, y, label, F["sans-bold"], 4.5, GOLD_DARK, 0.8)
        value_or_placeholder(c, value_col, y, value, placeholder, F["sans"], 6.3, INK)

    # --- services ----------------------------------------------------------
    tracked(c, left, header_y, "WHAT WE DO", F["sans-bold"], 4.5, MUTED, 1.1)

    col_w = (col_right - left) / 2
    for i, service in enumerate(CARD["services"]):
        col, row = divmod(i, service_rows)
        sx = left + col * col_w
        sy = first_service_y - row * service_gap
        c.setFillColor(GOLD)
        c.circle(sx + 1.2, sy + 1.5, 0.8, stroke=0, fill=1)
        c.setFont(F["sans-light"], 5.1)
        c.setFillColor(HexColor("#3B2B61"))
        c.drawString(sx + 4.0, sy, service)


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------


def crop_marks(c, offset, length):
    """Standard corner marks, set back from the trim so they never print on the card."""
    c.setStrokeColor(HexColor("#000000"))
    c.setLineWidth(0.25)
    tx0, ty0 = offset + BLEED, offset + BLEED
    tx1, ty1 = tx0 + TRIM_W, ty0 + TRIM_H
    gap = 3.0
    for x in (tx0, tx1):
        c.line(x, ty0 - gap, x, ty0 - gap - length)
        c.line(x, ty1 + gap, x, ty1 + gap + length)
    for y in (ty0, ty1):
        c.line(tx0 - gap, y, tx0 - gap - length, y)
        c.line(tx1 + gap, y, tx1 + gap + length, y)


def draw_guides(c):
    """
    Overlays the trim line and the safe margin. Proof only.

    Red is where the guillotine aims: anything crossing it gets cut, and
    anything outside it is bleed that is meant to be cut off. Nothing that has
    to survive should sit outside the blue line, because presses drift by up to
    a millimetre and a card trimmed slightly off-centre should still look
    deliberate.
    """
    c.saveState()
    c.setDash(2, 2)
    c.setLineWidth(0.4)

    c.setStrokeColor(HexColor("#FF3B30"))
    c.rect(X0, Y0, TRIM_W, TRIM_H, stroke=1, fill=0)

    c.setStrokeColor(HexColor("#0A84FF"))
    c.rect(X0 + SAFE, Y0 + SAFE, TRIM_W - 2 * SAFE, TRIM_H - 2 * SAFE, stroke=1, fill=0)
    c.restoreState()

    c.setFont("Helvetica", 3.4)
    c.setFillColor(HexColor("#FF3B30"))
    c.drawString(2.0, 2.0, "PROOF ONLY - trim (red), safe area (blue). Do not send to print.")


def build(path, F, qr_path, with_marks=False, guides=False):
    margin = 0.35 * PT if with_marks else 0.0
    page_w, page_h = DOC_W + 2 * margin, DOC_H + 2 * margin
    c = rl_canvas.Canvas(str(path), pagesize=(page_w, page_h))
    c.setTitle("PC Builders Canada - business card")

    for draw in (draw_front, draw_back):
        c.saveState()
        c.translate(margin, margin)
        draw(c, F) if draw is draw_front else draw(c, F, qr_path)
        c.restoreState()
        if with_marks:
            crop_marks(c, margin, 0.16 * PT)
        if guides:
            c.saveState()
            c.translate(margin, margin)
            draw_guides(c)
            c.restoreState()
        c.showPage()

    c.save()


def preview(pdf_path, dpi=300, names=("front", "back")):
    import pymupdf

    doc = pymupdf.open(str(pdf_path))
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=dpi)
        out = OUT / f"preview-{names[i]}.png"
        pix.save(str(out))
        print(f"  {out.name:24} {pix.width} x {pix.height} px @ {dpi} dpi")
    doc.close()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print("Fonts:")
    F = register_fonts()

    qr_path = qr_image(CARD["scan_url"])

    print("\nPDFs:")
    bleed_pdf = OUT / "business-card-print.pdf"
    build(bleed_pdf, F, qr_path)
    print(f"  {bleed_pdf.name:24} {DOC_W/PT:.3f} x {DOC_H/PT:.3f} in  (bleed, no marks)")

    proof_pdf = OUT / "business-card-PROOF-guides.pdf"
    build(proof_pdf, F, qr_path, guides=True)
    print(f"  {proof_pdf.name:24} trim + safe guides (NOT for printing)")

    marks_pdf = OUT / "business-card-crop-marks.pdf"
    build(marks_pdf, F, qr_path, with_marks=True)
    print(f"  {marks_pdf.name:24} with crop marks")

    print("\nPreviews:")
    preview(bleed_pdf)
    preview(proof_pdf, names=("proof-front", "proof-back"))

    missing = [k for k in ("phone", "email") if not CARD[k]]
    if missing:
        print(
            "\n  PLACEHOLDERS STILL ON THE CARD: "
            + ", ".join(missing)
            + "\n  Fill these in at the top of this file and regenerate before printing."
        )


if __name__ == "__main__":
    main()
