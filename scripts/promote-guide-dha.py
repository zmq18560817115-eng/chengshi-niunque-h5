"""Promote the source DHA lettering above the animated right report paper."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GUIDE_DIR = ROOT / "public" / "design" / "guide"
CHARACTER_PATH = GUIDE_DIR / "guide-character-open.webp"
FOREGROUND_PATH = GUIDE_DIR / "guide-foreground-top.webp"


def main() -> None:
    character = Image.open(CHARACTER_PATH).convert("RGBA")
    foreground = Image.open(FOREGROUND_PATH).convert("RGBA")

    if character.size != (750, 1625) or foreground.size != (750, 1625):
        raise ValueError("guide layers must share the 750x1625 runtime canvas")

    source = character.load()
    promoted = Image.new("RGBA", character.size, (0, 0, 0, 0))
    target = promoted.load()

    # Fixed master-canvas bounds plus source-color selection retain the exact
    # antialiased DHA artwork without copying the cream character body.
    for y in range(450, 700):
        for x in range(420, 700):
            red, green, blue, alpha = source[x, y]
            if (
                alpha > 0
                and red > 220
                and 120 < green < 230
                and blue < 120
                and red - green > 25
            ):
                target[x, y] = (red, green, blue, alpha)

    dha_bbox = promoted.getchannel("A").getbbox()
    if dha_bbox != (449, 475, 671, 679):
        raise ValueError(f"unexpected DHA bounds: {dha_bbox}")

    Image.alpha_composite(foreground, promoted).save(
        FOREGROUND_PATH, "WEBP", lossless=True, method=6
    )
    print(f"updated {FOREGROUND_PATH.relative_to(ROOT)}; DHA bounds={dha_bbox}")


if __name__ == "__main__":
    main()
