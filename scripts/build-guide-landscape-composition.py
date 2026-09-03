from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/design/guide"
DESTINATION = SOURCE / "guide-landscape-composition.webp"
CANVAS = (1500, 800)


def open_rgba(name: str) -> Image.Image:
    with Image.open(SOURCE / name) as source:
        return source.convert("RGBA")


def paste_fit(canvas: Image.Image, layer: Image.Image, box: tuple[int, int, int, int]) -> None:
    x, y, width, height = box
    fitted = layer.resize((width, height), Image.Resampling.LANCZOS)
    canvas.alpha_composite(fitted, (x, y))


def main() -> None:
    background = open_rgba("guide-background.webp").resize(CANVAS, Image.Resampling.LANCZOS)
    canvas = background.copy()

    # Keep the supplied loose-paper language at the outer edges without
    # introducing any new illustration.
    paste_fit(canvas, open_rgba("report-paper-left.webp").crop((0, 190, 210, 590)), (-20, 220, 210, 400))
    paste_fit(canvas, open_rgba("report-paper-top.webp").crop((300, 0, 750, 260)), (1110, -18, 390, 225))

    arch = open_rgba("guide-arch.webp").crop((0, 330, 750, 1210))
    character = open_rgba("guide-character-open.webp").crop((0, 330, 750, 1210))
    foreground = open_rgba("guide-foreground-top.webp")
    character_overlay = Image.new("RGBA", (750, 880))
    character_overlay.alpha_composite(foreground.crop((0, 330, 750, 1210)), (0, 0))
    # The supplied foreground also contains the portrait report and a partial
    # left arm.  Keep only the complete raised arm so the derived landscape
    # composition has no clipped black fragments beside the mascot.
    mask = Image.new("L", character_overlay.size)
    mask.paste(character_overlay.getchannel("A").crop((600, 0, 750, 650)), (600, 0))
    character_overlay.putalpha(mask)
    character_group = Image.new("RGBA", (750, 880))
    character_group.alpha_composite(arch)
    character_group.alpha_composite(character)
    character_group.alpha_composite(character_overlay)
    # Keep every semantic element inside the common 55..745 vertical safe crop
    # used by the widest supported 956x440 landscape viewport.
    paste_fit(canvas, character_group, (60, 78, 650, 650))

    envelope = foreground.crop((45, 900, 750, 1585))
    paste_fit(canvas, envelope, (760, 95, 700, 640))

    logo = foreground.crop((115, 90, 645, 305))
    paste_fit(canvas, logo, (55, 62, 365, 148))

    canvas.save(DESTINATION, "WEBP", quality=88, method=6, exact=True)
    print(f"{DESTINATION.name}\t{canvas.width}x{canvas.height}\t{DESTINATION.stat().st_size}")


if __name__ == "__main__":
    main()
