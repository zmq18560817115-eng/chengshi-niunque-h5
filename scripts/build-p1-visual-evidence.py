from __future__ import annotations

import re
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "artifacts/p1-repair-v2/raw"
SCREENS = ROOT / "artifacts/p1-repair-v2/screens"
CONTACTS = ROOT / "artifacts/p1-repair-v2/contacts"
SOURCE = Path("C:/Users/bu/AppData/Local/Temp/codex-clipboard-c1b4ca94-815e-415f-9094-21d72fa399d7.jpg")
PATTERN = re.compile(r"guide-(\d+)x(\d+)-p(\d{3})\.png")


def main() -> None:
    SCREENS.mkdir(parents=True, exist_ok=True)
    CONTACTS.mkdir(parents=True, exist_ok=True)
    grouped: dict[tuple[int, int], list[tuple[int, Path]]] = {}
    for path in sorted(RAW.glob("guide-*.png")):
        match = PATTERN.fullmatch(path.name)
        if not match:
            continue
        width, height, progress = map(int, match.groups())
        with Image.open(path) as raw:
            # Codex Desktop's in-app browser captures this local tab at a .5
            # raster scale. Preserve the iframe's real CSS viewport by cropping
            # its measured raster box, then restore the requested dimensions.
            raster_width = math.ceil(width / 2)
            raster_height = math.ceil(height / 2)
            if raw.width < raster_width or raw.height < raster_height:
                raise ValueError(f"capture is smaller than target: {path.name} {raw.size}")
            screen = raw.convert("RGB").crop((0, 0, raster_width, raster_height)).resize((width, height), Image.Resampling.LANCZOS)
            destination = SCREENS / path.name
            screen.save(destination, "PNG", optimize=True)
        grouped.setdefault((width, height), []).append((progress, destination))

    for (width, height), frames in grouped.items():
        frames.sort()
        label_height = 32
        sheet = Image.new("RGB", (width * len(frames), height + label_height), "#202020")
        draw = ImageDraw.Draw(sheet)
        for index, (progress, path) in enumerate(frames):
            with Image.open(path) as frame:
                sheet.paste(frame.convert("RGB"), (index * width, label_height))
            draw.text((index * width + 8, 9), f"{progress}%", fill="white")
        sheet.save(CONTACTS / f"guide-{width}x{height}-five-frames.png", "PNG", optimize=True)

    if SOURCE.exists():
        with Image.open(SOURCE) as original:
            # The supplied screenshot contains 72 CSS px of host-browser chrome
            # at 3x density. The product viewport beneath it is 375x812 CSS px.
            reference_crop = original.convert("RGB").crop((50, 285, 1175, 2700)).resize((375, 805), Image.Resampling.LANCZOS)
            reference = Image.new("RGB", (375, 812), "#f8e89d")
            reference.paste(reference_crop, (0, 0))
        implementation_path = SCREENS / "guide-375x812-p000.png"
        with Image.open(implementation_path) as implementation_raw:
            implementation = implementation_raw.convert("RGB")
        difference = ImageChops.difference(reference, implementation)
        difference = ImageEnhance.Contrast(difference).enhance(2.2)
        comparison = Image.new("RGB", (1125, 844), "#202020")
        comparison.paste(reference, (0, 32))
        comparison.paste(implementation, (375, 32))
        comparison.paste(difference, (750, 32))
        labels = ImageDraw.Draw(comparison)
        labels.text((8, 9), "SOURCE", fill="white")
        labels.text((383, 9), "LOCAL", fill="white")
        labels.text((758, 9), "DIFF x2.2", fill="white")
        comparison.save(CONTACTS / "guide-375x812-source-local-diff.png", "PNG", optimize=True)

    print(f"screens={len(list(SCREENS.glob('*.png')))} contacts={len(list(CONTACTS.glob('*.png')))}")


if __name__ == "__main__":
    main()
