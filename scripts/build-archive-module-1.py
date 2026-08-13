from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "design" / "final-v1" / "archive" / "module-1"
TEXTURE = ROOT / "docs" / "input" / "design" / "final-v1" / "archive-档案首页" / "三个模块共同的底图（肌理）" / "底图纹理.png"
EXPECTED_SIZE = (3034, 4334)
ZIP_INDICES = {
    "archive-unlock-tab.webp": 1,
    "archive-logo.webp": 2,
    "archive-badge.webp": 3,
    "archive-result-passed.webp": 5,
    "archive-result-normal.webp": 6,
    "archive-folder.webp": 7,
    "archive-latest-circle.webp": 8,
    "archive-title.webp": 10,
    "archive-base.webp": 11,
}


def load_png(archive: zipfile.ZipFile, index: int) -> Image.Image:
    name = archive.namelist()[index]
    data = archive.read(name)
    image = Image.open(io.BytesIO(data))
    if image.format != "PNG" or image.size != EXPECTED_SIZE or image.mode != "RGBA":
        raise ValueError(f"invalid source at ZIP index {index}: {image.format} {image.size} {image.mode}")
    if image.getchannel("A").getextrema() != (0, 255):
        raise ValueError(f"missing effective alpha at ZIP index {index}")
    return image.copy()


def save_runtime(image: Image.Image, destination: Path) -> None:
    height = round(image.height * 1000 / image.width)
    runtime = image.resize((1000, height), Image.Resampling.LANCZOS)
    runtime.save(destination, "WEBP", lossless=True, method=6)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: build-archive-module-1.py <source.zip>")
    source = Path(sys.argv[1])
    OUTPUT.mkdir(parents=True, exist_ok=True)
    texture_source = Image.open(TEXTURE).convert("RGBA")
    texture = Image.new("RGBA", texture_source.size, "#f3efe6")
    texture.alpha_composite(texture_source)
    texture = texture.resize((1000, 2020), Image.Resampling.LANCZOS).convert("RGB")
    texture.save(OUTPUT / "archive-texture.webp", "WEBP", lossless=True, method=6)
    with zipfile.ZipFile(source) as archive:
        if archive.testzip() is not None:
            raise ValueError("ZIP integrity failed")
        for destination, index in ZIP_INDICES.items():
            save_runtime(load_png(archive, index), OUTPUT / destination)

        latest = load_png(archive, 4)
        latest.alpha_composite(load_png(archive, 9))
        save_runtime(latest, OUTPUT / "archive-latest-info.webp")

        # The extra complete composition is retained only as a stable fallback.
        save_runtime(load_png(archive, 11), OUTPUT / "archive-module-fallback.webp")

    for path in sorted(OUTPUT.glob("*.webp")):
        with Image.open(path) as image:
            print(f"{path.name}\t{image.width}x{image.height}\t{image.mode}\t{path.stat().st_size}")


if __name__ == "__main__":
    main()
