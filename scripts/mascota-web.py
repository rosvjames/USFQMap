"""Exports the Gastón kit v2 PNGs (1254 px, ~1.3 MB each) as the light WebP files the app loads.

Every pose shares one 512 px square frame: the silhouette fits a 428 px box, centred, with its base
41 px above the bottom edge, so the interface can place any pose with the same CSS.
Needs Pillow: python3 scripts/mascota-web.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
KIT = ROOT / 'public/mascota/gaston-v2'
OUT = ROOT / 'public/mascota/gaston'

POSES = ['saludando', 'asomado', 'guiando', 'logrado', 'buscando', 'ubicacion']
FRAME, BOX, BASE = 512, 428, 471


def trimmed(name: str) -> Image.Image:
    image = Image.open(KIT / f'{name}.png').convert('RGBA')
    # Ignore the faint halo GPT Image leaves around the silhouette.
    alpha = image.getchannel('A').point(lambda a: 255 if a > 16 else 0)
    return image.crop(alpha.getbbox())


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob('*.webp'):
        old.unlink()
    for name in POSES:
        pose = trimmed(name)
        scale = min(BOX / pose.width, BOX / pose.height)
        pose = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.LANCZOS)
        frame = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
        frame.alpha_composite(pose, ((FRAME - pose.width) // 2, BASE - pose.height))
        frame.save(OUT / f'{name}.webp', quality=84, method=6)
        print(f'{name}.webp')

    # Browser tab and home-screen icons.
    head = trimmed('cabeza-2d')
    head.resize((64, round(head.height * 64 / head.width)), Image.LANCZOS).save(OUT / 'favicon.png', optimize=True)
    touch = Image.new('RGBA', (180, 180), '#faf9f6')
    face = head.resize((150, round(head.height * 150 / head.width)), Image.LANCZOS)
    touch.alpha_composite(face, ((180 - face.width) // 2, (180 - face.height) // 2))
    touch.convert('RGB').save(OUT / 'apple-touch-icon.png', optimize=True)


if __name__ == '__main__':
    main()
