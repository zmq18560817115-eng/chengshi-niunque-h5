from pathlib import Path
from PIL import Image, ImageChops, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-results" / "static-visual-v1"
REF = ROOT / "docs" / "input" / "design" / "final-v1" / "references-最终效果"
SOURCES = {
    "guide": REF / "guide-final-reference.jpg.jpg",
    "archive": REF / "完整长图-共三个模块.jpg",
    "inspection": REF / "报告点击页-01.jpg",
    "review": REF / "报告点击页-02.jpg",
    "traceability": REF / "报告点击页-03.jpg",
}

for name, source_path in SOURCES.items():
    actual_path = OUT / f"{name}-actual.png"
    with Image.open(actual_path) as actual_source, Image.open(source_path) as reference_source:
        actual = actual_source.convert("RGB")
        reference = reference_source.convert("RGB").resize(actual.size, Image.Resampling.LANCZOS)
        reference.save(OUT / f"{name}-reference.png")
        difference = ImageEnhance.Contrast(ImageChops.difference(actual, reference)).enhance(3)
        difference.save(OUT / f"{name}-difference.png")
        Image.blend(reference, actual, 0.5).save(OUT / f"{name}-overlay.png")
