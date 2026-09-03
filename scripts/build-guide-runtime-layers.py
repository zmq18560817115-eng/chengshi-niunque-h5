"""Rebuild responsive guide layers from the supplied semantic artwork.

The source files under docs/input stay read-only. Runtime assets are generated
from the shared 750x1625 master canvas without changing the established
semantic z-order. Compact portrait assets are cropped, never stretched.
"""

from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "input" / "design" / "home-page-v2" / "homepage-guide-assets"
OUTPUT = ROOT / "public" / "design" / "guide"
MASTER_SIZE = (750, 1625)
SOURCE_SCALE = 0.375
WINDOW_MASK_SCALE = 0.3791907514
WINDOW_MASK_DEST = (-206, -262)


def scaled(name: str) -> Image.Image:
    with Image.open(SOURCE / name) as source:
        rgba = source.convert("RGBA")
        size = (round(rgba.width * SOURCE_SCALE), round(rgba.height * SOURCE_SCALE))
        return rgba.resize(size, Image.Resampling.LANCZOS)


def composite(canvas: Image.Image, layer: Image.Image, x: int, y: int) -> None:
    canvas.alpha_composite(layer, dest=(x, y))


def save_lossless(image: Image.Image, filename: str) -> None:
    image.save(OUTPUT / filename, "WEBP", lossless=True, method=6)


def build_window_mask() -> Image.Image:
    """Register the supplied yellow occlusion mask on the master canvas.

    The arch is intentionally transparent: it reveals the yellow background
    and the character below, while the opaque texture restores the foreground
    wall around the opening. The mask therefore belongs above the character
    and below the painted arch frame; it must never be flattened over white.
    """
    with Image.open(SOURCE / "guide-window-mask.png.png") as source:
        rgba = source.convert("RGBA")
        size = (
            round(rgba.width * WINDOW_MASK_SCALE),
            round(rgba.height * WINDOW_MASK_SCALE),
        )
        registered = rgba.resize(size, Image.Resampling.LANCZOS)

    mask = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))
    composite(mask, registered, *WINDOW_MASK_DEST)
    save_lossless(mask, "guide-window-mask.webp")
    return mask


def apply_window_cutout(character: Image.Image) -> Image.Image:
    """Keep the character inside the supplied window opening.

    The former runtime rendered the opaque window texture over every viewport.
    That works only when the whole 750x1625 canvas is distorted to the screen.
    Converting its transparent opening into an alpha mask lets the background
    remain full bleed while the character keeps its original proportions.
    """
    with Image.open(OUTPUT / "guide-window-mask.webp") as source:
        window_alpha = source.convert("RGBA").getchannel("A")
    opening = ImageChops.invert(window_alpha)
    masked = character.copy()
    masked.putalpha(ImageChops.multiply(character.getchannel("A"), opening))
    return masked


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


def build_foreground(promoted: Image.Image) -> tuple[Image.Image, Image.Image, Image.Image, Image.Image]:
    foreground = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))
    envelope = scaled("guide-envelope-sign.png.png")
    logo = scaled("资源 6.png")
    right_arm = scaled("guide-foreground-open.png2.png")
    left_arm = scaled("guide-foreground-open.png3.png")
    left_hand = scaled("guide-foreground-open.png4.png")

    logo_canvas = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))
    envelope_canvas = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))
    character_overlay = Image.new("RGBA", MASTER_SIZE, (0, 0, 0, 0))

    composite(logo_canvas, logo, 136, 116)
    composite(envelope_canvas, envelope, 0, 0)
    composite(character_overlay, promoted, 0, 0)
    composite(character_overlay, right_arm, 628, 381)
    composite(character_overlay, left_arm, 53, 838)
    composite(character_overlay, left_hand, 229, 947)

    # Keep the existing semantic overlap: envelope below the promoted
    # character details, then arms/hands on top of the envelope edge.
    foreground.alpha_composite(envelope_canvas)
    foreground.alpha_composite(logo_canvas)
    foreground.alpha_composite(character_overlay)
    return foreground, logo_canvas, envelope_canvas, character_overlay


def crop_master(image: Image.Image, box: tuple[int, int, int, int], filename: str) -> None:
    save_lossless(image.crop(box), filename)


def build_static_foreground(character: Image.Image, foreground: Image.Image, window_mask: Image.Image) -> Image.Image:
    with Image.open(OUTPUT / "guide-background.webp") as source:
        static = source.convert("RGBA")
    static.alpha_composite(character)
    static.alpha_composite(window_mask)
    for filename in (
        "guide-arch.webp",
        "report-paper-top.webp",
        "report-paper-left.webp",
        "report-paper-right.webp",
        "report-paper-bottom.webp",
    ):
        with Image.open(OUTPUT / filename) as layer:
            static.alpha_composite(layer.convert("RGBA"))
    static.alpha_composite(foreground)

    with Image.open(OUTPUT / "swipe-up-hint-v2.png") as source:
        hint = source.convert("RGBA")
        hint_width = round(MASTER_SIZE[0] * 0.434)
        hint_height = round(hint.height * hint_width / hint.width)
        hint = hint.resize((hint_width, hint_height), Image.Resampling.LANCZOS)
    hint_x = round((MASTER_SIZE[0] - hint_width) / 2)
    hint_y = round(MASTER_SIZE[1] - MASTER_SIZE[1] * 0.033 - hint_height)
    composite(static, hint, hint_x, hint_y)
    return static


def build_archive_transition_preview() -> None:
    source_path = ROOT / "public" / "design" / "final-v1" / "archive-reference.webp"
    with Image.open(source_path) as source:
        rgb = source.convert("RGB")
        # The former CSS showed the archive at top:-21.6cqw. Bake that offset
        # into a viewport-sized poster so the handoff never decodes 1000x5557.
        crop_top = round(rgb.width * 0.216)
        crop_height = round(rgb.width * MASTER_SIZE[1] / MASTER_SIZE[0])
        preview = rgb.crop((0, crop_top, rgb.width, crop_top + crop_height))
        preview = preview.resize(MASTER_SIZE, Image.Resampling.LANCZOS)
    preview.save(OUTPUT / "archive-transition-preview.webp", "WEBP", quality=90, method=6)


def main() -> None:
    window_mask = build_window_mask()
    open_character, promoted = build_character("open")
    closed_character, _ = build_character("closed")
    open_character = apply_window_cutout(open_character)
    closed_character = apply_window_cutout(closed_character)
    foreground, logo, envelope, character_overlay = build_foreground(promoted)

    outputs = {
        "guide-character-open.webp": open_character,
        "guide-character-closed.webp": closed_character,
        "guide-foreground-top.webp": foreground,
    }
    for filename, image in outputs.items():
        save_lossless(image, filename)

    compact_character_box = (0, 345, 750, 1193)
    with Image.open(OUTPUT / "guide-arch.webp") as arch:
        crop_master(arch.convert("RGBA"), compact_character_box, "guide-compact-arch.webp")
    crop_master(open_character, compact_character_box, "guide-compact-character-open.webp")
    crop_master(closed_character, compact_character_box, "guide-compact-character-closed.webp")
    crop_master(character_overlay, compact_character_box, "guide-compact-character-overlay.webp")
    crop_master(logo, (136, 116, 625, 268), "guide-compact-logo.webp")
    crop_master(envelope, (58, 966, 750, 1575), "guide-compact-envelope.webp")

    compact_paper_boxes = {
        "top": (328, 0, 744, 227),
        "left": (0, 207, 184, 553),
        "right": (506, 377, 750, 787),
        "bottom": (0, 1379, 378, 1625),
    }
    for direction, box in compact_paper_boxes.items():
        with Image.open(OUTPUT / f"report-paper-{direction}.webp") as paper:
            crop_master(paper.convert("RGBA"), box, f"guide-compact-paper-{direction}.webp")

    static_foreground = build_static_foreground(open_character, foreground, window_mask)
    save_lossless(static_foreground, "guide-static-foreground.webp")
    save_lossless(static_foreground, "guide-static-foreground-v2.webp")
    build_archive_transition_preview()

    # Keep the static first frame derived from exactly the same runtime layers.
    with Image.open(OUTPUT / "guide-background.webp") as source:
        first_frame = source.convert("RGBA")
    for filename in (
        "guide-character-open.webp",
        "guide-window-mask.webp",
        "guide-arch.webp",
        "guide-foreground-top.webp",
    ):
        with Image.open(OUTPUT / filename) as layer:
            first_frame.alpha_composite(layer.convert("RGBA"))
    first_frame.save(OUTPUT / "guide-first-frame.webp", "WEBP", quality=90, method=6)


if __name__ == "__main__":
    main()
