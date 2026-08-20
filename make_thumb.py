"""
Make a dashboard thumbnail from any screenshot.

Center-crops the screenshot to the dashboard card shape (13:7), scales it to
1040x560 (2x for sharp display on high-DPI screens), and saves it into
static/images/tools/<tool-slug>.png -- the filename the dashboard expects.

Usage:
    python make_thumb.py <screenshot> <tool-slug>

Examples:
    python make_thumb.py "C:/Users/chris/Desktop/shot.png" candlestick-chart
    python make_thumb.py shot.png custom-data-chart

The tool slug is the image name from the tools list in app.py, without .png
(e.g. midday-charts, forward-heatmap). Requires Pillow: pip install pillow
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is not installed. Run: pip install pillow")

TARGET_W, TARGET_H = 1040, 560  # 13:7, 2x display size
OUT_DIR = Path(__file__).parent / "static" / "images" / "tools"


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)

    src = Path(sys.argv[1])
    slug = sys.argv[2]
    if slug.endswith(".png"):
        slug = slug[:-4]

    if not src.is_file():
        sys.exit(f"Screenshot not found: {src}")

    img = Image.open(src).convert("RGB")
    w, h = img.size

    # Center-crop to 13:7
    target_ratio = TARGET_W / TARGET_H
    if w / h > target_ratio:
        crop_w = round(h * target_ratio)          # too wide: trim sides
        left = (w - crop_w) // 2
        img = img.crop((left, 0, left + crop_w, h))
    else:
        crop_h = round(w / target_ratio)          # too tall: trim top/bottom
        top = (h - crop_h) // 2
        img = img.crop((0, top, w, top + crop_h))

    img = img.resize((TARGET_W, TARGET_H), Image.LANCZOS)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{slug}.png"
    img.save(out, optimize=True)

    kb = out.stat().st_size // 1024
    print(f"Saved {out} ({TARGET_W}x{TARGET_H}, {kb} KB)")
    print("Refresh the dashboard to see it. If the card still shows the old "
          "image, hard-refresh (Ctrl+F5) to clear the browser cache.")


if __name__ == "__main__":
    main()
