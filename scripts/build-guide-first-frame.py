from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GUIDE = ROOT / "public" / "design" / "guide"
LAYERS = (
    "guide-background.webp",
    "guide-arch.webp",
    "guide-character-open.webp",
    "guide-window-mask.webp",
    "guide-foreground-top.webp",
)


canvas = Image.new("RGBA", (750, 1625), (247, 225, 139, 255))
for filename in LAYERS:
    with Image.open(GUIDE / filename) as layer:
        rgba = layer.convert("RGBA")
        if rgba.size != canvas.size:
            raise ValueError(f"{filename} must remain on the 750x1625 canvas")
        canvas.alpha_composite(rgba)

canvas.save(GUIDE / "guide-first-frame.webp", "WEBP", quality=90, method=6)
