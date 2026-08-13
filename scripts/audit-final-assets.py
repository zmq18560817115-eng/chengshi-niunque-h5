from __future__ import annotations

import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "input" / "design" / "final-v1"


def inspect(path: Path) -> dict[str, object]:
    raw = path.read_bytes()
    with Image.open(path) as image:
        image.load()
        bands = image.getbands()
        has_alpha_channel = "A" in bands or "transparency" in image.info
        alpha_extrema = None
        has_effective_alpha = False
        if has_alpha_channel:
            rgba = image.convert("RGBA")
            alpha_extrema = rgba.getchannel("A").getextrema()
            has_effective_alpha = alpha_extrema[0] < 255
        return {
            "path": path.relative_to(ROOT).as_posix(),
            "extension": path.suffix.lower(),
            "format": image.format,
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "has_alpha_channel": has_alpha_channel,
            "has_effective_alpha": has_effective_alpha,
            "alpha_extrema": alpha_extrema,
            "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(),
        }


def main() -> None:
    records = [inspect(path) for path in sorted(SOURCE.rglob("*")) if path.is_file()]
    duplicates: dict[str, list[str]] = defaultdict(list)
    for record in records:
        duplicates[str(record["sha256"])].append(str(record["path"]))
    report = {
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "count": len(records),
        "total_bytes": sum(int(record["bytes"]) for record in records),
        "format_mismatches": [
            record["path"]
            for record in records
            if (record["extension"], record["format"])
            not in {(".png", "PNG"), (".jpg", "JPEG"), (".jpeg", "JPEG")}
        ],
        "double_extensions": [record["path"] for record in records if ".png.png" in str(record["path"]).lower() or ".jpg.jpg" in str(record["path"]).lower()],
        "duplicate_groups": [paths for paths in duplicates.values() if len(paths) > 1],
        "records": records,
    }
    output = json.dumps(report, ensure_ascii=False, indent=2)
    if len(sys.argv) > 1:
        destination = Path(sys.argv[1])
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(output, encoding="utf-8")
    else:
        print(output)


if __name__ == "__main__":
    main()
