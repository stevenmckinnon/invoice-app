#!/usr/bin/env python3
"""
Builds the App Store screenshots from the raw simulator captures in captures/.

    python3 -m venv .venv && .venv/bin/pip install pillow
    .venv/bin/python compose.py

Output goes to screenshots/iphone-6.9/ (1320x2868) and screenshots/ipad-13/ (2752x2064), the sizes
App Store Connect asks for. To refresh after a UI change: re-capture the screens in captures/ (see
README.md), then run this again. The words are in COPY below; the look is in the constants.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = Path(__file__).parent
FONT = HERE.parent.parent.parent / "src" / "fonts" / "pdf" / "Satoshi-Bold.ttf"
FONT_REG = HERE.parent.parent.parent / "src" / "fonts" / "pdf" / "Satoshi-Regular.ttf"

BRAND = (10, 97, 179)
BRAND_DEEP = (6, 58, 112)
CREAM = (250, 248, 242)
INK = (18, 18, 20)
WHITE = (255, 255, 255)

# (capture file, headline, supporting line, look)  look: "blue" or "cream"
IPHONE = [
    ("04-editor.png", "Paint the days.\nCaley does the maths.", "Tap the dates you worked. Rates, overtime and per diems fill in.", "blue"),
    ("05-assistant.png", "Describe the job.\nGet the invoice.", "Tell it what you worked. It drafts the invoice.", "cream"),
    ("01-dashboard.png", "See what you're\nowed at a glance.", "Invoiced, paid and outstanding, by tax year.", "blue"),
    ("02-invoices.png", "Every invoice,\nevery status.", "Draft, sent, paid or overdue. Change it with a tap.", "cream"),
    ("03-detail.png", "Itemised so\nclients can't argue.", "Day rates, overtime and per diems, line by line.", "blue"),
    ("00-signin.png", "Invoicing, built\nfor film and TV crew.", "Your data stays yours. Face ID lock included.", "cream"),
]
IPAD = [
    ("02-editor.png", "Paint the days. Caley does the maths.", "The calendar on one side, the bill building on the other.", "blue"),
    ("01-invoices-split.png", "Every invoice, with the detail beside it.", "Your whole invoice history in one view.", "cream"),
]


def font(path, size):
    return ImageFont.truetype(str(path), size)


def gradient(size, top, bottom):
    w, h = size
    base = Image.new("RGB", size, top)
    px = base.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        row = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = row
    return base


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return mask


def device(shot, width, bezel, radius):
    """The capture inside a black bezel with rounded corners and a soft shadow, as RGBA"""
    scale = width / shot.width
    inner = shot.resize((width, round(shot.height * scale)), Image.LANCZOS)
    outer_w, outer_h = inner.width + bezel * 2, inner.height + bezel * 2
    body = Image.new("RGBA", (outer_w, outer_h), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle([0, 0, outer_w - 1, outer_h - 1], radius=radius, fill=(14, 14, 16, 255))
    inner_r = max(radius - bezel, 8)
    body.paste(inner, (bezel, bezel), rounded_mask(inner.size, inner_r))
    return body


def paste_with_shadow(canvas, body, xy, blur, offset, opacity):
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    mask = Image.new("L", body.size, 0)
    mask.paste(body.split()[3], (0, 0))
    black = Image.new("RGBA", body.size, (0, 0, 0, opacity))
    shadow.paste(black, (xy[0], xy[1] + offset), mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(body, xy)


def wrap(text, f, max_width):
    """Word-wraps to max_width, keeping any line breaks already in the text"""
    draw = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    lines = []
    for paragraph in text.split("\n"):
        line = ""
        for word in paragraph.split():
            trial = f"{line} {word}".strip()
            if line and draw.textlength(trial, font=f) > max_width:
                lines.append(line)
                line = word
            else:
                line = trial
        lines.append(line)
    return "\n".join(lines)


def draw_text(canvas, text, xy, f, fill, spacing, max_width=None):
    """Draws centred text and returns the y just below it"""
    if max_width:
        text = wrap(text, f, max_width)
    draw = ImageDraw.Draw(canvas)
    draw.multiline_text(xy, text, font=f, fill=fill, spacing=spacing, align="center", anchor="ma")
    box = draw.multiline_textbbox(xy, text, font=f, spacing=spacing, anchor="ma")
    return box[3]


def compose_iphone(capture, headline, line, look, out):
    W, H = 1320, 2868
    if look == "blue":
        canvas = gradient((W, H), BRAND, BRAND_DEEP).convert("RGBA")
        head, sub = WHITE, (214, 228, 244)
    else:
        canvas = Image.new("RGBA", (W, H), CREAM + (255,))
        head, sub = INK, (88, 92, 100)
    bottom = draw_text(canvas, headline, (W // 2, 150), font(FONT, 112), head, 14, max_width=W - 160)
    draw_text(canvas, line, (W // 2, bottom + 44), font(FONT_REG, 48), sub, 10, max_width=W - 260)

    shot = Image.open(HERE / "captures" / "iphone" / capture).convert("RGB")
    body = device(shot, width=1060, bezel=20, radius=150)
    # The device runs off the bottom edge, as in most store listings
    paste_with_shadow(canvas, body, ((W - body.width) // 2, 640), blur=40, offset=24, opacity=110)
    canvas.convert("RGB").save(out, optimize=True)


# Captures where only a region matters, shown as a floating card instead of a whole device: the iPad
# editor is a sheet over a dimmed screen, and the dimmed part is noise. (left, top, right, bottom)
CARD_CROPS = {"02-editor.png": (282, 64, 2137, 1604)}


def card(shot, box, width, radius):
    cropped = shot.crop(box)
    scale = width / cropped.width
    cropped = cropped.resize((width, round(cropped.height * scale)), Image.LANCZOS).convert("RGBA")
    body = Image.new("RGBA", cropped.size, (0, 0, 0, 0))
    body.paste(cropped, (0, 0), rounded_mask(cropped.size, radius))
    return body


def compose_ipad(capture, headline, line, look, out):
    W, H = 2752, 2064
    if look == "blue":
        canvas = gradient((W, H), BRAND, BRAND_DEEP).convert("RGBA")
        head, sub = WHITE, (214, 228, 244)
    else:
        canvas = Image.new("RGBA", (W, H), CREAM + (255,))
        head, sub = INK, (88, 92, 100)
    bottom = draw_text(canvas, headline, (W // 2, 96), font(FONT, 104), head, 10, max_width=W - 300)
    draw_text(canvas, line, (W // 2, bottom + 30), font(FONT_REG, 46), sub, 8, max_width=W - 500)

    shot = Image.open(HERE / "captures" / "ipad" / capture).convert("RGB")
    if capture in CARD_CROPS:
        body = card(shot, CARD_CROPS[capture], width=1900, radius=64)
        paste_with_shadow(canvas, body, ((W - body.width) // 2, 440), blur=44, offset=26, opacity=120)
    else:
        body = device(shot, width=2330, bezel=22, radius=96)
        paste_with_shadow(canvas, body, ((W - body.width) // 2, 400), blur=36, offset=22, opacity=110)
    canvas.convert("RGB").save(out, optimize=True)


def main():
    for folder, items, fn in (("iphone-6.9", IPHONE, compose_iphone), ("ipad-13", IPAD, compose_ipad)):
        outdir = HERE / "screenshots" / folder
        outdir.mkdir(parents=True, exist_ok=True)
        for i, (capture, headline, line, look) in enumerate(items, start=1):
            out = outdir / f"{i:02d}-{Path(capture).stem.split('-', 1)[1]}.png"
            fn(capture, headline, line, look, out)
            print("wrote", out.relative_to(HERE), Image.open(out).size)


if __name__ == "__main__":
    main()
