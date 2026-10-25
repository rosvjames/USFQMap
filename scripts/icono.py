"""Exporta los íconos de la app desde el logo. Requiere Pillow, NumPy y OpenCV.

Uso: python scripts/icono.py referencias/ui-v3/originales/logo.png
El logo es un cuadrado de esquinas redondeadas sobre fondo transparente.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/icono'


def clean(logo):
    """Quita las motas casi transparentes que quedan alrededor del cuadrado."""
    alpha = logo.getchannel('A')
    body = alpha.point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.MaxFilter(9))
    logo.putalpha(Image.fromarray(np.minimum(np.array(alpha), np.array(body))))
    return logo.crop(alpha.point(lambda v: 255 if v > 200 else 0).getbbox())


def rounded(logo, size):
    """El logo tal cual, con sus esquinas transparentes, centrado en un lienzo cuadrado."""
    side = max(logo.size)
    canvas = Image.new('RGBA', (side, side))
    canvas.alpha_composite(logo, ((side - logo.width) // 2, (side - logo.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def full_bleed(logo, size):
    """Opaco y a sangre: iOS recorta sus propias esquinas y pinta de negro lo transparente."""
    side = min(logo.size)
    square = logo.crop(((logo.width - side) // 2, (logo.height - side) // 2,
                        (logo.width - side) // 2 + side, (logo.height - side) // 2 + side))
    rgba = np.array(square)
    holes = (rgba[:, :, 3] < 250).astype(np.uint8) * 255
    rgb = cv2.inpaint(np.ascontiguousarray(rgba[:, :, :3]), holes, 12, cv2.INPAINT_TELEA)
    return Image.fromarray(rgb).resize((size, size), Image.LANCZOS)


logo = clean(Image.open(sys.argv[1]).convert('RGBA'))
OUT.mkdir(parents=True, exist_ok=True)
rounded(logo, 32).save(OUT / 'favicon-32.png', optimize=True)
for size in (192, 512):
    rounded(logo, size).save(OUT / f'icono-{size}.png', optimize=True)
full_bleed(logo, 180).save(OUT / 'apple-touch-icon.png', optimize=True)

manifest = {
    'name': 'USFQ Explora · Campus en 3D',
    'short_name': 'USFQ Explora',
    'start_url': '/',
    'background_color': '#faf9f6',
    'theme_color': '#faf9f6',
    'icons': [{'src': f'/icono/icono-{s}.png', 'sizes': f'{s}x{s}', 'type': 'image/png'} for s in (192, 512)],
}
(ROOT / 'public/manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
for path in sorted(OUT.iterdir()):
    print(path.relative_to(ROOT), Image.open(path).size, f'{path.stat().st_size / 1e3:.0f} kB')
