from __future__ import annotations

import io
import json
import tempfile
import zipfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SEARCH_ROOTS = [ROOT / "docs/input/design", ROOT / "public/design"]
EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def inspect_image(path: Path, source: str | None = None) -> dict[str, object]:
    with Image.open(path) as image:
        alpha = image.convert("RGBA").getchannel("A") if "A" in image.getbands() else None
        return {
            "path": str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
            "source": source,
            "format": image.format,
            "mode": image.mode,
            "width": image.width,
            "height": image.height,
            "alphaExtrema": alpha.getextrema() if alpha else None,
            "alphaBounds": alpha.getbbox() if alpha else None,
            "bytes": path.stat().st_size,
        }


def main() -> None:
    records: list[dict[str, object]] = []
    for root in SEARCH_ROOTS:
        for path in root.rglob("*"):
            if path.is_file() and path.suffix.lower() in EXTENSIONS:
                try:
                    records.append(inspect_image(path))
                except Exception as error:
                    records.append({"path": str(path.relative_to(ROOT)), "error": str(error)})
            elif path.is_file() and path.suffix.lower() == ".zip":
                with zipfile.ZipFile(path) as archive, tempfile.TemporaryDirectory() as directory:
                    for index, member in enumerate(archive.infolist()):
                        suffix = Path(member.filename).suffix.lower()
                        if member.is_dir() or suffix not in EXTENSIONS:
                            continue
                        data = archive.read(member)
                        target = Path(directory) / f"{index}{suffix}"
                        target.write_bytes(data)
                        try:
                            record = inspect_image(target, f"{path.relative_to(ROOT)}::{member.filename}")
                            record["path"] = f"ZIP:{path.relative_to(ROOT)}::{member.filename}"
                            record["bytes"] = len(data)
                            records.append(record)
                        except Exception as error:
                            records.append({"path": f"ZIP:{path.relative_to(ROOT)}::{member.filename}", "error": str(error)})
    output = ROOT / "test-results" / "animation-asset-inventory.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(output)
    print(f"records={len(records)}")


if __name__ == "__main__":
    main()
