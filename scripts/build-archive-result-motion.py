from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "docs" / "input" / "design" / "final-v1"
OUTPUT = ROOT / "public" / "design" / "final-v1" / "motion" / "archive-module-one"
DESIGN_CROP = (652, 408, 2652, 4336)
RUNTIME_MODULE_SIZE = (1000, 1964)
MASTER_SIZE = (1000, 5557)


def source(name: str) -> Path:
    matches = list(SOURCE_ROOT.rglob(name))
    if len(matches) != 1:
        raise ValueError(f"expected one source named {name!r}, got {matches}")
    return matches[0]


def convert(name: str, output_name: str) -> None:
    image = Image.open(source(name)).convert("RGBA")
    if image.size != (3034, 4334) or image.getchannel("A").getextrema() != (0, 255):
        raise ValueError(f"invalid motion source: {name} {image.size}")
    crop = image.crop(DESIGN_CROP).resize(RUNTIME_MODULE_SIZE, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", MASTER_SIZE)
    canvas.alpha_composite(crop)
    target = OUTPUT / output_name
    canvas.save(target, "WEBP", lossless=True, method=6)
    print(output_name, canvas.getchannel("A").getbbox(), target.stat().st_size)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    convert("h5长图-已通过模块文案-无绿色字.png", "archive-result-normal-canvas.webp")
    convert("h5长图-已通过模块文案.png", "archive-result-passed-canvas.webp")


if __name__ == "__main__":
    main()
