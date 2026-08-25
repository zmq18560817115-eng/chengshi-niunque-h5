from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "input" / "design" / "final-v1"
OUTPUT = ROOT / "public" / "design" / "final-v1"

ASSETS = {
    "archive-reference.webp": SOURCE / "references-最终效果" / "完整长图-共三个模块.jpg",
}

REPORT_TEXTURE_SOURCE = SOURCE / "categories-三分类页" / "三个模块的底图（都是一样的）.jpg"


def resize_to_width(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, source in ASSETS.items():
        with Image.open(source) as original:
            image = resize_to_width(original.convert("RGB"), 1000)
            image.save(OUTPUT / name, "WEBP", quality=88, method=6)
            print(f"{name}\t{image.width}x{image.height}\t{(OUTPUT / name).stat().st_size}")

    # The source canvas ends with a large flat-color tail. Repeating the whole
    # canvas creates visible texture/blank bands on long report pages, so the
    # runtime tile uses only the continuous paper-texture region.
    with Image.open(REPORT_TEXTURE_SOURCE) as original:
        texture = original.convert("RGB").crop((0, 0, original.width, round(original.height * 0.76)))
        texture = resize_to_width(texture, 1000)
        texture.save(OUTPUT / "report-texture.webp", "WEBP", quality=90, method=6)
        print(f"report-texture.webp\t{texture.width}x{texture.height}\t{(OUTPUT / 'report-texture.webp').stat().st_size}")


if __name__ == "__main__":
    main()
