from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "input" / "design" / "final-v1"
OUTPUT = ROOT / "test-results" / "final-v1-assets"


def make_sheet(folder: Path) -> None:
    files = sorted(path for path in folder.iterdir() if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg"})
    if not files:
        return
    cell_w, cell_h = 320, 300
    columns = 4
    rows = math.ceil(len(files) / columns)
    sheet = Image.new("RGB", (cell_w * columns, cell_h * rows), "#ece7dc")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, path in enumerate(files):
        x = (index % columns) * cell_w
        y = (index // columns) * cell_h
        with Image.open(path) as source:
            preview = source.convert("RGBA")
            checker = Image.new("RGBA", preview.size, "#fffaf0")
            preview = Image.alpha_composite(checker, preview)
            preview.thumbnail((cell_w - 20, cell_h - 58), Image.Resampling.LANCZOS)
            px = x + (cell_w - preview.width) // 2
            py = y + 8 + (cell_h - 58 - preview.height) // 2
            sheet.paste(preview.convert("RGB"), (px, py))
        label = f"{path.name}\n{Image.open(path).size[0]}x{Image.open(path).size[1]}"
        draw.multiline_text((x + 8, y + cell_h - 46), label, fill="#342419", font=font, spacing=2)
    relative = folder.relative_to(SOURCE)
    name = "__".join(relative.parts).replace(" ", "-") + ".jpg"
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT / name, quality=90)


def main() -> None:
    for folder in sorted(path for path in SOURCE.rglob("*") if path.is_dir()):
        make_sheet(folder)


if __name__ == "__main__":
    main()
