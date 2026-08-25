from pathlib import Path

from PIL import Image, ImageDraw


EVIDENCE = Path(r"D:\chengshi-niunque-h5\design-qa-evidence\category-detail-v825")
SOURCE = Path(
    r"C:\Users\bu\AppData\Local\Temp\codex-report-click-v825-20260825-1235\报告点击页面输出"
)

PAGES = {
    "inspection": "报告点击页01.jpg",
    "review": "报告点击页02.jpg",
    "production": "报告点击页03.jpg",
}

NORMALIZED_SIZE = (750, 1625)


for name, source_name in PAGES.items():
    implementation = Image.open(EVIDENCE / f"implementation-{name}.png").convert("RGB")
    left = (implementation.width - NORMALIZED_SIZE[0]) // 2
    implementation = implementation.crop(
        (left, 0, left + NORMALIZED_SIZE[0], NORMALIZED_SIZE[1])
    )
    source = Image.open(SOURCE / source_name).convert("RGB")
    source = source.resize(NORMALIZED_SIZE, Image.Resampling.LANCZOS)

    comparison = Image.new("RGB", (1520, 1625), "white")
    comparison.paste(source, (0, 0))
    comparison.paste(implementation, (770, 0))
    ImageDraw.Draw(comparison).rectangle((750, 0, 769, 1624), fill="#1d1d1d")
    comparison.save(EVIDENCE / f"comparison-{name}-full.png", quality=95)

    focused = Image.new("RGB", (1520, 950), "white")
    focused.paste(source.crop((0, 250, 750, 1200)), (0, 0))
    focused.paste(implementation.crop((0, 250, 750, 1200)), (770, 0))
    ImageDraw.Draw(focused).rectangle((750, 0, 769, 949), fill="#1d1d1d")
    focused.save(EVIDENCE / f"comparison-{name}-cards.png", quality=95)
