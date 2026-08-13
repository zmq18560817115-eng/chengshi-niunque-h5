from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "docs/input/design/final-v1/archive-档案首页/长图模块1"
OUTPUT_DIR = ROOT / "public/design/final-v1/motion/archive-module-one"
MASTER_SIZE = (1000, 5557)

# Pixel matching against the supplied 2000 x 3928 final reference establishes
# this shared crop in the original 3034 x 4334 design canvas. Every animated
# layer uses this one transform; browser-side independent positioning is banned.
DESIGN_CROP = (652, 408, 2652, 4336)
RUNTIME_MODULE_SIZE = (1000, 1964)


def find_source(fragment: str) -> Path:
    matches = [path for path in SOURCE_DIR.glob("*.png") if fragment in path.name]
    if len(matches) != 1:
        raise ValueError(f"expected one source matching {fragment!r}, got {matches}")
    return matches[0]


def convert(source: Path, output: Path) -> None:
    image = Image.open(source).convert("RGBA")
    if image.size != (3034, 4334) or image.getchannel("A").getextrema() != (0, 255):
        raise ValueError(f"invalid motion source: {source.name} {image.size}")
    cropped = image.crop(DESIGN_CROP).resize(RUNTIME_MODULE_SIZE, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", MASTER_SIZE)
    canvas.alpha_composite(cropped, (0, 0))
    canvas.save(output, "WEBP", lossless=True, method=6)
    print(f"{output.name}: {canvas.size}, alpha={canvas.getchannel('A').getbbox()}")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    convert(find_source("线圈"), OUTPUT_DIR / "archive-latest-circle-canvas.webp")
    convert(find_source("下滑条"), OUTPUT_DIR / "archive-unlock-tab-canvas.webp")


if __name__ == "__main__":
    main()
