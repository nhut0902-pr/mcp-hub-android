from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "images"
NAMES = ("icon.png", "splash-icon.png", "favicon.png", "android-icon-foreground.png")

for name in NAMES:
    path = ASSETS / name
    with Image.open(path) as image:
        image.convert("RGBA").save(path, format="PNG", optimize=True)
    print(f"Converted {path}")
