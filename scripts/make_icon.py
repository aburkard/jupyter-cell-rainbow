"""Generate the extension icon: stacked rainbow bars on a rounded dark bg."""
from PIL import Image, ImageDraw
import colorsys
from pathlib import Path

SIZE = 128
BARS = 12
BAR_H = 8
BAR_GAP = 3
BAR_WIDTH_FRAC = 0.72
CORNER = 18
BG = (30, 30, 32)


def rainbow(n):
    return [
        tuple(int(c * 255) for c in colorsys.hls_to_rgb(i / n, 0.55, 0.65))
        for i in range(n)
    ]


def main():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded dark background
    draw.rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), CORNER, fill=BG)

    colors = rainbow(BARS)
    total_h = BARS * BAR_H + (BARS - 1) * BAR_GAP
    y0 = (SIZE - total_h) // 2
    bar_w = int(SIZE * BAR_WIDTH_FRAC)
    x0 = (SIZE - bar_w) // 2

    for i, rgb in enumerate(colors):
        y = y0 + i * (BAR_H + BAR_GAP)
        draw.rounded_rectangle(
            (x0, y, x0 + bar_w - 1, y + BAR_H - 1),
            BAR_H // 2,
            fill=rgb + (255,),
        )

    out = Path(__file__).resolve().parent.parent / "icon.png"
    img.save(out, "PNG")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
