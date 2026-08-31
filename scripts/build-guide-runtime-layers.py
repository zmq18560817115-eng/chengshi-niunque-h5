"""Rebuild the guide character layers from the supplied semantic artwork.

The source files under docs/input stay read-only. Runtime assets are generated
on the shared 750x1625 master canvas so every responsive profile can map the
same coordinates without changing the established z-order.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "input" / "design" / "home-page-v2" / "homepage-guide-assets"
OUTPUT = ROOT / "public" / "design" / "guide"
MASTER_SIZE = (750, 1625)
SOURCE_SCALE = 0.375


def scaled(name: str) -> Image.Image:
    with Image.open(SOURCE / name) as source:
        rgba = source.convert("RGBA")
        size = (round(rgba.width * SOURCE_SCALE), round(rgba.height * SOURCE_SCALE))
        return rgba.resize(size, Image.Resampling.LANCZOS)


def composite(canvas: Image.Image, layer: Image.Image, x: int, y: int) -> None:
    canvas.alpha_composite(layer, dest=(x, y))


def promoted_hat_and_dha(body: Image.Image, x: int, y: int) -> Image.Image:
    placed = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))
    composite(placed, body, x, y)
    promoted = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))
    source_pixels = placed.load()
    target_pixels = promoted.load()

    for target_y in range(420, 700):
        for target_x in range(80, 700):
            red, green, blue, alpha = source_pixels[target_x, target_y]
            if alpha == 0:
                continue
            is_hat = target_x < 410 and target_y < 620 and max(red, green, blue) < 125
            is_warm_lettering = (
                red > 210
                and 100 < green < 235
                and blue < 175
                and red - green > 20
            )
            if is_hat or is_warm_lettering:
                target_pixels[target_x, target_y] = (red, green, blue, alpha)

    return promoted


def build_character(state: str) -> tuple[Image.Image, Image.Image]:
    body = scaled(f"guide-foreground-{state}.png.png")
    face = scaled(f"guide-foreground-{state}.png1.png")
    character = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))

    # Reference registration: move only the body/hat/DHA group. The face is
    # already correctly aligned and must not inherit this offset.
    composite(character, body, -14, 437)
    composite(character, face, 251, 628)
    return character, promoted_hat_and_dha(body, -14, 437)


def build_foreground(promoted: Image.Image) -> Image.Image:
    foreground = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))
    envelope = scaled("guide-envelope-sign.png.png")
    logo = scaled("资源 6.png")
    right_arm = scaled("guide-foreground-open.png2.png")
    left_arm = scaled("guide-foreground-open.png3.png")
    left_hand = scaled("guide-foreground-open.png4.png")

    # Keep the existing semantic overlap: envelope below the promoted
    # character details, then arms/hands on top of the envelope edge.
    composite(foreground, envelope, 0, 0)
    composite(foreground, logo, 136, 116)
    composite(foreground, promoted, 0, 0)
    composite(foreground, right_arm, 628, 381)
    composite(foreground, left_arm, 53, 838)
    composite(foreground, left_hand, 229, 947)
    return foreground


def main() -> None:
    open_character, promoted = build_character("open")
    closed_character, _ = build_character("closed")
    foreground = build_foreground(promoted)

    outputs = {
        "guide-character-open.webp": open_character,
        "guide-character-closed.webp": closed_character,
        "guide-foreground-top.webp": foreground,
    }
    for filename, image in outputs.items():
        image.save(OUTPUT / filename, "WEBP", lossless=True, method=6)

    # Keep the static first frame derived from exactly the same runtime layers.
    first_frame = Image.new("RGBA", MASTER_SIZE, (247, 225, 139, 255))
    for filename in (
        "guide-background.webp",
        "guide-arch.webp",
        "guide-character-open.webp",
        "guide-window-mask.webp",
        "guide-foreground-top.webp",
    ):
        with Image.open(OUTPUT / filename) as layer:
            first_frame.alpha_composite(layer.convert("RGBA"))
    first_frame.save(OUTPUT / "guide-first-frame.webp", "WEBP", quality=90, method=6)


if __name__ == "__main__":
    main()
