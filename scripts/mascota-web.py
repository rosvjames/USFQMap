"""Exports the Gastón kit v2 PNGs (1254 px, ~1.3 MB each) as the light WebP files the app loads.

Each pose is cropped to its visible silhouette and sized at about twice its largest on-screen width.
Needs Pillow: python3 scripts/mascota-web.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
KIT = ROOT / 'public/mascota/gaston-v2'
OUT = ROOT / 'public/mascota/gaston'

# pose -> output width in px
POSES = {
    'saludando': 640,
    'asomado': 360,
    'guiando': 280,
    'logrado': 280,
    'buscando': 200,
    'ubicacion': 120,
    'pin-2d': 96,
}


def trimmed(name: str) -> Image.Image:
    image = Image.open(KIT / f'{name}.png').convert('RGBA')
    # Ignore the faint halo GPT Image leaves around the silhouette.
    alpha = image.getchannel('A').point(lambda a: 255 if a > 16 else 0)
    return image.crop(alpha.getbbox())


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for name, width in POSES.items():
        image = trimmed(name)
        height = round(image.height * width / image.width)
        image.resize((width, height), Image.LANCZOS).save(OUT / f'{name}.webp', quality=84, method=6)
        print(f'{name}.webp {width}x{height}')

    # Browser tab and home-screen icons.
    head = trimmed('cabeza-2d')
    head.resize((64, round(head.height * 64 / head.width)), Image.LANCZOS).save(OUT / 'favicon.png', optimize=True)
    touch = Image.new('RGBA', (180, 180), '#fff5f2')
    face = head.resize((150, round(head.height * 150 / head.width)), Image.LANCZOS)
    touch.alpha_composite(face, ((180 - face.width) // 2, (180 - face.height) // 2))
    touch.convert('RGB').save(OUT / 'apple-touch-icon.png', optimize=True)


if __name__ == '__main__':
    main()
