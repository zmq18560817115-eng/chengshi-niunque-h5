from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/input/design/final-v1"
CATEGORY_SOURCE = SOURCE / "categories-三分类页"
REFERENCE_SOURCE = SOURCE / "references-最终效果"
OUTPUT = ROOT / "public/design/final-v1"


PAGES = {
    "inspection": {
        "reference": "报告点击页-01.jpg",
        "cards": [
            ("报告点击模块1/核心营养含量/1.png", (62, 530)),
            ("报告点击模块1/油脂新鲜度/资源 12.png", (62, 990)),
            ("报告点击模块1/安全底线/资源 20.png", (62, 1440)),
        ],
        "status": [],
    },
    "review": {
        "reference": "报告点击页-02.jpg",
        "cards": [
            ("报告点击模块2/配方与标签/资源 34.png", (62, 530)),
            ("报告点击模块2/原料与工艺/资源 44.png", (62, 990)),
            ("报告点击模块2/稳定性与感官/资源 55.png", (62, 1440)),
        ],
        "status": [],
    },
    "traceability": {
        "reference": "报告点击页-03.jpg",
        "cards": [
            ("报告点击模块3/生产资质/资源 73.png", (62, 530)),
            ("报告点击模块3/质量管理/资源 81.png", (62, 990)),
        ],
        "status": [],
    },
}


def runtime_layer(relative: str) -> Image.Image:
    with Image.open(CATEGORY_SOURCE / relative) as source:
        layer = source.convert("RGBA")
    return layer.resize((round(layer.width / 2), round(layer.height / 2)), Image.Resampling.LANCZOS)


def match(reference: Image.Image, layer: Image.Image, approximate: tuple[int, int], radius: int = 55) -> tuple[int, int]:
    target = np.asarray(reference.convert("RGB"), dtype=np.int16)
    rgba = np.asarray(layer, dtype=np.uint8)
    alpha = rgba[:, :, 3]
    sample = (alpha[::8, ::8] > 96)
    source = rgba[::8, ::8, :3].astype(np.int16)
    best: tuple[float, int, int] | None = None
    ax, ay = approximate
    for y in range(max(0, ay - radius), min(reference.height - layer.height, ay + radius) + 1, 2):
        for x in range(max(0, ax - radius), min(reference.width - layer.width, ax + radius) + 1, 2):
            candidate = target[y:y + layer.height:8, x:x + layer.width:8]
            score = float(np.abs(candidate[sample] - source[sample]).mean())
            if best is None or score < best[0]:
                best = (score, x, y)
    if best is None:
        raise ValueError(f"no match for {approximate}")
    return best[1], best[2]


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for slug, spec in PAGES.items():
        with Image.open(REFERENCE_SOURCE / spec["reference"]) as original:
            reference = original.convert("RGBA").resize((1000, 2166), Image.Resampling.LANCZOS)
        clean = reference.copy()
        placements: list[dict[str, object]] = []
        for relative, approximate in [*spec["cards"], *spec["status"]]:
            layer = runtime_layer(relative)
            x, y = match(reference, layer, approximate)
            clean.alpha_composite(layer, (x, y))
            placements.append({"source": relative, "x": x, "y": y, "width": layer.width, "height": layer.height})
        output = OUTPUT / f"category-{slug}-clean.webp"
        clean.convert("RGB").save(output, "WEBP", quality=90, method=6)
        print(slug, output.name, placements)


if __name__ == "__main__":
    main()
