from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "input" / "design" / "final-v1" / "archive-档案首页"
OUTPUT = ROOT / "public" / "design" / "final-v1"

ASSETS = {
    "archive-batch-circle.webp": SOURCE / "长图模块1" / "h5长图-最新公开批次信息-线圈.png",
    "archive-pass-green.webp": SOURCE / "长图模块1" / "h5长图-已通过模块文案.png",
    "archive-unlock-ribbon.webp": SOURCE / "长图模块1" / "h5长图-下滑条.png",
    "archive-story-copy.webp": SOURCE / "长图模块3" / "资源 19.png",
    "archive-story-fish.webp": SOURCE / "长图模块3" / "资源 1.png",
}

FULL_CANVAS_ASSETS = {
    "archive-module1-circle-canvas.webp": SOURCE / "长图模块1" / "h5长图-最新公开批次信息-线圈.png",
    "archive-module1-pass-canvas.webp": SOURCE / "长图模块1" / "h5长图-已通过模块文案.png",
    "archive-module1-unlock-canvas.webp": SOURCE / "长图模块1" / "h5长图-下滑条.png",
}

MODULE1_SIZE = (2000, 4334)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, source in ASSETS.items():
        with Image.open(source) as original:
            image = original.convert("RGBA")
            bbox = image.getchannel("A").getbbox()
            if not bbox:
                raise RuntimeError(f"transparent asset has no visible pixels: {source.name}")
            image = image.crop(bbox)
            image.save(OUTPUT / name, "WEBP", lossless=True, method=6)
            print(f"{name}\t{image.width}x{image.height}\t{(OUTPUT / name).stat().st_size}")
    for name, source in FULL_CANVAS_ASSETS.items():
        with Image.open(source) as original:
            image = original.convert("RGBA").resize(MODULE1_SIZE, Image.Resampling.LANCZOS)
            image.save(OUTPUT / name, "WEBP", lossless=True, method=6)
            print(f"{name}\t{image.width}x{image.height}\t{(OUTPUT / name).stat().st_size}")


if __name__ == "__main__":
    main()
