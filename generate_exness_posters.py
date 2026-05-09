from __future__ import annotations

import math
import random
from pathlib import Path

from jinja2 import Template
from PIL import Image, ImageDraw, ImageFilter, ImageFont


DESKTOP = Path.home() / "Desktop"
PERSON_PATH = DESKTOP / "人物.png"
OUTPUT_DIR = DESKTOP / "exness_posters"

BG_COLOR = (212, 203, 192)
YELLOW = (255, 214, 0)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

HEADLINE_TEMPLATE = Template("{{ headline }}")
CTA_TEMPLATE = Template("{{ cta }}")

COPY = {
    "headline": "市场上最丝滑的出金体验。",
    "cta": "探索 Exness",
}

SIZES = [
    ("horizontal_970x250", 970, 250),
    ("square_800x800", 800, 800),
    ("vertical_1200x1500", 1200, 1500),
    ("story_628x1200", 628, 1200),
]


def font_path(bold: bool = False) -> str:
    candidates = [
        "/System/Library/Fonts/STHeiti Medium.ttc" if bold else "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return candidate
    raise FileNotFoundError("No usable CJK font found on this macOS system.")


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(font_path(bold), size=size)


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def fit_font(draw: ImageDraw.ImageDraw, text: str, target_width: int, start_size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    size = start_size
    while size > 8:
        font = load_font(size, bold=bold)
        if text_size(draw, text, font)[0] <= target_width:
            return font
        size -= 1
    return load_font(size, bold=bold)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        if char == "\n":
            if current:
                lines.append(current)
            current = ""
            continue
        test = current + char
        if current and text_size(draw, test, font)[0] > max_width:
            lines.append(current)
            current = char
        else:
            current = test
    if current:
        lines.append(current)
    return lines


def rounded_panel(size: tuple[int, int], radius: int, color: tuple[int, int, int, int]) -> Image.Image:
    panel = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(panel)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=color)
    return panel


def apply_background(canvas: Image.Image) -> None:
    width, height = canvas.size
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Soft radial warm-up so the beige/taupe background does not look flat.
    max_r = int(max(width, height) * 0.72)
    center = (int(width * 0.72), int(height * 0.15))
    for i in range(max_r, 0, -18):
        alpha = int(24 * (1 - i / max_r))
        color = (245, 237, 217, alpha)
        draw.ellipse((center[0] - i, center[1] - i, center[0] + i, center[1] + i), fill=color)

    # Subtle grain/paper grid in the same color family.
    step = max(18, min(width, height) // 28)
    for x in range(0, width, step):
        draw.line((x, 0, x, height), fill=(255, 255, 255, 10), width=1)
    for y in range(0, height, step):
        draw.line((0, y, width, y), fill=(255, 255, 255, 9), width=1)

    canvas.alpha_composite(overlay)


def draw_kline(canvas: Image.Image, area: tuple[int, int, int, int], seed: int) -> None:
    random.seed(seed)
    x0, y0, x1, y1 = area
    width = max(1, x1 - x0)
    height = max(1, y1 - y0)
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    spacing = max(18, width // 14)
    candle_w = max(7, spacing // 3)
    baseline = y0 + int(height * 0.54)
    points: list[tuple[int, int]] = []

    for i, x in enumerate(range(x0 + spacing // 2, x1 - spacing // 2, spacing)):
        body_h = random.randint(max(18, height // 8), max(28, height // 3))
        shift = int(math.sin(i * 0.85) * height * 0.17) + random.randint(-height // 10, height // 10)
        center_y = max(y0 + 25, min(y1 - 25, baseline + shift))
        top = max(y0 + 8, center_y - body_h // 2)
        bottom = min(y1 - 8, center_y + body_h // 2)
        wick_top = max(y0 + 3, top - random.randint(12, max(16, height // 7)))
        wick_bottom = min(y1 - 3, bottom + random.randint(12, max(16, height // 7)))
        alpha = random.randint(68, 132)
        draw.line((x, wick_top, x, wick_bottom), fill=(*YELLOW, alpha), width=max(2, width // 240))
        draw.rounded_rectangle((x - candle_w // 2, top, x + candle_w // 2, bottom), radius=3, fill=(*YELLOW, alpha))
        points.append((x, center_y + random.randint(-12, 12)))

    if len(points) > 1:
        draw.line(points, fill=(*YELLOW, 112), width=max(3, width // 150), joint="curve")
        for px, py in points[::3]:
            draw.ellipse((px - 4, py - 4, px + 4, py + 4), fill=(*YELLOW, 150))

    canvas.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(radius=0.25)))


def draw_logo(canvas: Image.Image) -> None:
    width, _ = canvas.size
    logo_width = width // 6
    x, y = 20, 20
    draw = ImageDraw.Draw(canvas)
    mark = max(14, logo_width // 5)

    # Yellow sparkle/mark + white brand text, following the supplied logo color rule.
    cx, cy = x + mark, y + mark
    pts = [
        (cx, cy - mark),
        (cx + mark // 3, cy - mark // 3),
        (cx + mark, cy),
        (cx + mark // 3, cy + mark // 3),
        (cx, cy + mark),
        (cx - mark // 3, cy + mark // 3),
        (cx - mark, cy),
        (cx - mark // 3, cy - mark // 3),
    ]
    draw.polygon(pts, fill=YELLOW)

    logo_text = "Exness"
    font = fit_font(draw, logo_text, max(50, logo_width - mark - 10), max(16, logo_width // 4), bold=True)
    tx = x + mark * 2 + 6
    ty = y + max(0, mark - text_size(draw, logo_text, font)[1] // 2 - 1)
    draw.text((tx + 1, ty + 1), logo_text, font=font, fill=(0, 0, 0, 38))
    draw.text((tx, ty), "Ex", font=font, fill=YELLOW)
    ex_w = text_size(draw, "Ex", font)[0]
    draw.text((tx + ex_w, ty), "ness", font=font, fill=WHITE)


def paste_person(canvas: Image.Image, person: Image.Image, layout: str) -> tuple[int, int, int, int]:
    width, height = canvas.size
    cropped = person.crop(person.getchannel("A").getbbox())

    if layout == "horizontal":
        target_w = int(width * 0.45)
        px = int(width * 0.52)
        py = int(height * -0.42)
    elif layout == "square":
        target_w = int(width * 0.52)
        px = int(width * 0.47)
        py = int(height * 0.075)
    else:
        target_w = int(width * 0.48)
        px = int(width * 0.50)
        py = int(height * 0.075)

    target_w = min(target_w, int(width * 0.50))
    target_h = int(cropped.height * (target_w / cropped.width))
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Anchor close to the visual center-top so portrait/square formats keep the person prominent.
    x = int(px - target_w * 0.45)
    y = py
    if layout == "horizontal":
        x = min(width - target_w - int(width * 0.06), max(int(width * 0.48), x))
    else:
        x = min(width - target_w - int(width * 0.03), max(int(width * 0.05), x))

    shadow_alpha = resized.getchannel("A").filter(ImageFilter.GaussianBlur(radius=max(7, width // 90)))
    shadow_alpha = shadow_alpha.point(lambda a: int(a * 0.22))
    shadow = Image.new("RGBA", resized.size, (0, 0, 0, 0))
    shadow.putalpha(shadow_alpha)
    canvas.alpha_composite(shadow, (x + max(4, width // 90), y + max(5, height // 80)))
    canvas.alpha_composite(resized, (x, y))
    return x, y, x + target_w, y + target_h


def draw_title_and_button(canvas: Image.Image, layout: str, title: str, cta: str) -> None:
    width, height = canvas.size
    draw = ImageDraw.Draw(canvas)

    if layout == "horizontal":
        title_font_size = int(width * 0.052)
        title_x = int(width * 0.055)
        title_y = int(height * 0.32)
        wrap_width = int(width * 0.42)
        align = "left"
    elif layout == "square":
        title_font_size = int(width * 0.058)
        wrap_width = int(width * 0.60)
        title_x = int((width - wrap_width) / 2)
        title_y = int(height * 0.665)
        align = "center"
    else:
        title_font_size = int(width * 0.060)
        wrap_width = int(width * 0.46)
        title_x = int(width * 0.075)
        title_y = int(height * 0.57)
        align = "left"

    title_font = load_font(title_font_size, bold=True)
    lines = wrap_text(draw, title, title_font, wrap_width)
    line_gap = max(6, int(title_font_size * 0.18))
    line_heights = [text_size(draw, line, title_font)[1] for line in lines]
    total_h = sum(line_heights) + line_gap * max(0, len(lines) - 1)

    # Transparent dark plate keeps white title legible while preserving the "no outline" rule.
    pad_x = max(16, width // 45)
    pad_y = max(12, height // 85)
    panel_w = wrap_width + pad_x * 2
    panel_h = total_h + pad_y * 2
    panel_x = title_x - pad_x
    panel_y = title_y - pad_y
    if align == "center":
        panel_x = int((width - panel_w) / 2)
        title_x = panel_x + pad_x
    panel = rounded_panel((panel_w, panel_h), radius=max(18, panel_h // 4), color=(52, 48, 43, 72))
    canvas.alpha_composite(panel, (panel_x, panel_y))

    y = title_y
    for line, line_h in zip(lines, line_heights):
        line_w = text_size(draw, line, title_font)[0]
        if align == "center":
            x = title_x + (wrap_width - line_w) // 2
        else:
            x = title_x
        draw.text((x + 2, y + 2), line, font=title_font, fill=(0, 0, 0, 50))
        draw.text((x, y), line, font=title_font, fill=WHITE)
        y += line_h + line_gap

    button_font = load_font(22 if width >= 800 else 18, bold=True)
    cta_w, cta_h = text_size(draw, cta, button_font)
    button_h = 50
    button_w = cta_w + 40
    if align == "center":
        button_x = int((width - button_w) / 2)
    else:
        button_x = title_x
    button_y = y + max(18, height // 45)

    draw.rounded_rectangle(
        (button_x + 3, button_y + 4, button_x + button_w + 3, button_y + button_h + 4),
        radius=button_h // 2,
        fill=(0, 0, 0, 42),
    )
    draw.rounded_rectangle(
        (button_x, button_y, button_x + button_w, button_y + button_h),
        radius=button_h // 2,
        fill=YELLOW,
    )
    draw.text(
        (button_x + 20, button_y + (button_h - cta_h) // 2 - 2),
        cta,
        font=button_font,
        fill=BLACK,
    )


def render_one(name: str, width: int, height: int, person: Image.Image) -> Path:
    layout = "horizontal" if width / height > 2.0 else "square" if width == height else "vertical"
    canvas = Image.new("RGBA", (width, height), (*BG_COLOR, 255))

    apply_background(canvas)

    if layout == "horizontal":
        kline_area = (int(width * 0.54), int(height * 0.05), width, int(height * 0.92))
    elif layout == "square":
        kline_area = (int(width * 0.18), int(height * 0.06), int(width * 0.92), int(height * 0.50))
    else:
        kline_area = (int(width * 0.24), int(height * 0.08), int(width * 0.96), int(height * 0.47))
    draw_kline(canvas, kline_area, seed=width * 7 + height)

    paste_person(canvas, person, layout)

    title = HEADLINE_TEMPLATE.render(**COPY)
    cta = CTA_TEMPLATE.render(**COPY)
    draw_title_and_button(canvas, layout, title, cta)
    draw_logo(canvas)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{name}.png"
    canvas.convert("RGB").save(output_path, "PNG", optimize=True)
    return output_path


def main() -> None:
    if not PERSON_PATH.exists():
        raise FileNotFoundError(f"Missing person image: {PERSON_PATH}")

    person = Image.open(PERSON_PATH).convert("RGBA")
    written = [render_one(name, width, height, person) for name, width, height in SIZES]

    print("Generated poster images:")
    for path in written:
        print(f"- {path}")


if __name__ == "__main__":
    main()
