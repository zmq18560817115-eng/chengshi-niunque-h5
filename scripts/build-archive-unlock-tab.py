from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "design" / "final-v1" / "archive" / "module-1" / "archive-unlock-tab.webp"
OUTPUT = ROOT / "public" / "design" / "final-v1" / "motion" / "archive-unlock-tab"
EXPECTED_CANVAS = (1000, 1428)
EXPECTED_BOUNDS = (814, 1195, 883, 1422)
HEAD_HEIGHT = 32


def main() -> None:
    with Image.open(SOURCE) as source:
        image = source.convert("RGBA")
    if image.size != EXPECTED_CANVAS:
        raise ValueError(f"unexpected unlock canvas: {image.size}")
    bounds = image.getchannel("A").getbbox()
    if bounds != EXPECTED_BOUNDS:
        raise ValueError(f"unexpected unlock alpha bounds: {bounds}")

    tab = image.crop(bounds)
    head = tab.crop((0, 0, tab.width, HEAD_HEIGHT))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    tab.save(OUTPUT / "archive-unlock-tab.webp", "WEBP", lossless=True, method=6)
    head.save(OUTPUT / "archive-unlock-head.webp", "WEBP", lossless=True, method=6)
    print(f"tab={tab.size}, head={head.size}, master_bounds={bounds}")


if __name__ == "__main__":
    main()
