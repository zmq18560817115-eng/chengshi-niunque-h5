from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "docs/input/design/final-v1/motion/archive-story-copy"
OUTPUT = ROOT / "public/design/final-v1/motion/archive-story-copy"
ARCHIVE = ROOT / "public/design/final-v1/archive-reference.webp"
MODULE_THREE = ROOT / "docs/input/design/final-v1/archive-档案首页/长图模块3"

LINE_NAMES = [f"story-line-{index:02d}" for index in range(1, 5)]
GROUP_X = 250
GROUP_Y = 4797
GROUP_SCALE = 0.5
MODULE_THREE_Y = 4164


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("transparent image has no visible pixels")
    return bbox


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    lines = [Image.open(INPUT / f"{name}.png").convert("RGBA") for name in LINE_NAMES]
    reference = Image.open(INPUT / "story-final-reference.png").convert("RGBA")
    if reference.size != (1078, 430):
        raise ValueError(f"unexpected reference size: {reference.size}")
    composed = Image.new("RGBA", reference.size)
    for line in lines:
        if line.size != reference.size:
            raise ValueError(f"line canvas mismatch: {line.size}")
        composed.alpha_composite(line)
    composed_array = np.asarray(composed)
    reference_array = np.asarray(reference)
    visible = reference_array[:, :, 3] > 0
    if not np.array_equal(composed_array[:, :, 3], reference_array[:, :, 3]) or not np.array_equal(
        composed_array[:, :, :3][visible], reference_array[:, :, :3][visible]
    ):
        raise ValueError("line order does not reproduce the supplied final reference")

    placements: list[dict[str, int | str]] = []
    for name, line in zip(LINE_NAMES, lines, strict=True):
        left, top, right, bottom = alpha_bbox(line)
        cropped = line.crop((left, top, right, bottom))
        cropped.save(OUTPUT / f"{name}.webp", "WEBP", lossless=True, method=6)
        placements.append(
            {
                "name": name,
                "x": round(GROUP_X + left * GROUP_SCALE),
                "y": round(GROUP_Y + top * GROUP_SCALE),
                "width": round((right - left) * GROUP_SCALE),
                "height": round((bottom - top) * GROUP_SCALE),
            }
        )

    # The production long image already contains the final copy. Remove only the
    # supplied copy pixels using the official blank stationery texture. This
    # preserves the title, character, envelope, paper clip, and hotspot geometry.
    archive = Image.open(ARCHIVE).convert("RGBA")
    blank_source = Image.open(MODULE_THREE / "信封-03.png").convert("RGBA")
    blank = blank_source.resize((1000, 1393), Image.Resampling.LANCZOS)
    group = composed.resize((539, 215), Image.Resampling.LANCZOS)
    mask = Image.new("L", archive.size)
    glyph_mask = group.getchannel("A").filter(ImageFilter.MaxFilter(7))
    mask.paste(glyph_mask, (GROUP_X, GROUP_Y))
    blank_canvas = Image.new("RGBA", archive.size)
    blank_canvas.alpha_composite(blank, (0, MODULE_THREE_Y))
    archive.paste(blank_canvas, (0, 0), mask)
    archive.save(OUTPUT / "archive-story-base.webp", "WEBP", lossless=True, method=6)

    import json

    (OUTPUT / "placements.json").write_text(
        json.dumps(
            {
                "masterWidth": 1000,
                "masterHeight": 5557,
                "group": {"x": GROUP_X, "y": GROUP_Y, "width": 539, "height": 215},
                "lines": placements,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
