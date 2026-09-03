from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "public/design/final-v1/archive/runtime-layers"
MODULE_TWO = ROOT / "public/design/final-v1/长图输出/长图模块2"


CROPS = (
    (RUNTIME / "module-1-folder-back.webp", RUNTIME / "module-1-folder-back.runtime.webp", (118, 276, 1456, 2028)),
    (RUNTIME / "module-1-folder-front.webp", RUNTIME / "module-1-folder-front.runtime.webp", (194, 262, 1354, 1938)),
    (RUNTIME / "module-1-logo.webp", RUNTIME / "module-1-logo.runtime.webp", (475, 389, 735, 480)),
    (RUNTIME / "module-1-title.webp", RUNTIME / "module-1-title.runtime.webp", (447, 505, 1079, 908)),
    (RUNTIME / "module-1-badge.webp", RUNTIME / "module-1-badge.runtime.webp", (527, 591, 1489, 1749)),
    (RUNTIME / "module-1-batch-coil.webp", RUNTIME / "module-1-batch-coil.runtime.webp", (428, 1582, 893, 1682)),
    (RUNTIME / "module-1-batch.webp", RUNTIME / "module-1-batch.runtime.webp", (463, 1602, 865, 1760)),
    (RUNTIME / "module-1-passed-panel.webp", RUNTIME / "module-1-passed-panel.runtime.webp", (286, 1581, 1190, 2034)),
    (MODULE_TWO / "绿档.png", RUNTIME / "module-2-inspection-folder.runtime.webp", (283, 1167, 2609, 4148)),
    (MODULE_TWO / "黄档.png", RUNTIME / "module-2-review-folder.runtime.webp", (283, 1928, 2609, 4130)),
    (MODULE_TWO / "棕档.png", RUNTIME / "module-2-production-folder.runtime.webp", (283, 2641, 2609, 4384)),
    (MODULE_TWO / "资源 21.png", RUNTIME / "module-2-resource-21.runtime.webp", (4, 4, 1402, 533)),
)

RETINA_DOWNSAMPLE = {
    "module-2-inspection-folder.runtime.webp": 0.75,
    "module-2-review-folder.runtime.webp": 0.75,
    "module-2-production-folder.runtime.webp": 0.75,
}


def save_webp(image: Image.Image, destination: Path) -> None:
    image.save(destination, "WEBP", quality=86, method=6, exact=True)


def main() -> None:
    for source, destination, expected_bbox in CROPS:
        with Image.open(source) as raw:
            image = raw.convert("RGBA")
            actual_bbox = image.getchannel("A").getbbox()
            if actual_bbox != expected_bbox:
                raise ValueError(f"alpha bounds changed for {source.name}: {actual_bbox} != {expected_bbox}")
            crop = image.crop(expected_bbox)
            factor = RETINA_DOWNSAMPLE.get(destination.name)
            if factor is not None:
                crop = crop.resize(
                    (round(crop.width * factor), round(crop.height * factor)),
                    Image.Resampling.LANCZOS,
                )
            save_webp(crop, destination)
            print(f"{destination.name}\t{crop.width}x{crop.height}\t{destination.stat().st_size}")

    paper_source = RUNTIME / "archive-paper-texture.webp"
    paper_destination = RUNTIME / "archive-paper-texture.runtime.webp"
    with Image.open(paper_source) as raw:
        paper = raw.convert("RGBA")
        target_width = 750
        target_height = round(paper.height * target_width / paper.width)
        paper = paper.resize((target_width, target_height), Image.Resampling.LANCZOS)
        save_webp(paper, paper_destination)
        print(f"{paper_destination.name}\t{paper.width}x{paper.height}\t{paper_destination.stat().st_size}")

    # Public fallback: restore the supplied blank decorative result panel over
    # the baked fixed conclusions. The mascot, panel, border, and neutral
    # report disclaimer remain; only the misleading result copy is removed.
    fallback_source = ROOT / "public/design/final-v1/archive-reference.webp"
    fallback_destination = ROOT / "public/design/final-v1/archive-reference-public.webp"
    panel_source = RUNTIME / "module-1-passed-panel.runtime.webp"
    with Image.open(fallback_source) as fallback_raw, Image.open(panel_source) as panel_raw:
        fallback = fallback_raw.convert("RGBA")
        panel = panel_raw.convert("RGBA")
        fallback.alpha_composite(panel, (-120, 1581))
        fallback.save(fallback_destination, "WEBP", quality=90, method=6, exact=True)
        print(f"{fallback_destination.name}\t{fallback.width}x{fallback.height}\t{fallback_destination.stat().st_size}")


if __name__ == "__main__":
    main()
