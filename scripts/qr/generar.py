"""QR de la app con Gastón (pose con el celular) saliendo de un sello al centro.

Uso: python scripts/qr/generar.py referencias/ui-v3/originales/gaston-destino.png docs/qr
La pose original está en referencias/, que no se sube a git; el resultado queda en docs/qr/.
Requiere segno y Pillow. Después: scripts/qr/comprobar.py (lectura) y scripts/qr/margen.py (margen de corrección).
DISC, FIGURE, CLIP, MASK, EYE y ROUND se pueden variar por entorno para probar.
"""
import base64
import io
import os
import sys
from pathlib import Path

import segno
from PIL import Image, ImageChops, ImageDraw, ImageFilter

# Mayúsculas: modo alfanumérico, versión 3 (29×29) con corrección H.
URL = 'HTTPS://USFQ-CAMPUS-NAV.VERCEL.APP'
INK = '#231f20'
EYE = os.environ.get('EYE', '#b5151b')
RED = '#e11b22'
QUIET = 4
M = 64                 # px por módulo en el PNG
AREA = 13              # lado del lienzo del sello, en módulos
DISC = float(os.environ.get('DISC', 8.8))           # diámetro del círculo
RING = 0.4             # grosor del aro rojo
FIGURE = float(os.environ.get('FIGURE', 8.1))      # ancho de Gastón
CLIP = float(os.environ.get('CLIP', 0.0))         # bajo esta altura (en radios) se recorta al círculo
BORDER = 0.3           # borde blanco tipo sticker alrededor de todo
ROUND = float(os.environ.get('ROUND', 0))  # esquinas redondeadas: OpenCV deja de leerlo de lejos
GAP = 0.15             # aire extra antes de los módulos

pose_path, out = Path(sys.argv[1]), Path(sys.argv[2])
MASK = os.environ.get('MASK', '6')  # la que menos palabras daña bajo el sello (ver margen.py)
qr = segno.make(URL, error='h', boost_error=False, mask=int(MASK) if MASK else None)
assert qr.version == 3 and qr.error == 'H', (qr.version, qr.error)
matrix = [list(row) for row in qr.matrix]
n = len(matrix)
c = n / 2


def badge(u):
    """Sello de AREA×AREA módulos a u px por módulo; devuelve la imagen y su silueta con aire."""
    s = round(AREA * u)
    pose = Image.open(pose_path).convert('RGBA')
    pose = pose.crop(pose.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
    scale = FIGURE * u / pose.width
    pose = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.LANCZOS)
    cx, cy, r = s / 2, s / 2 + 0.9 * u, DISC * u / 2       # círculo algo bajo: la cabeza sale por arriba
    disc_box = (cx - r, cy - r, cx + r, cy + r)
    ring = RING * u

    # Gastón: dentro del círculo abajo, libre arriba de su centro.
    layer = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    layer.alpha_composite(pose, (round(cx - pose.width / 2 + 0.25 * u), round(cy + r - ring - pose.height + 0.4 * u)))
    clip = Image.new('L', (s, s), 0)
    dc = ImageDraw.Draw(clip)
    dc.ellipse((cx - r + ring, cy - r + ring, cx + r - ring, cy + r - ring), fill=255)
    dc.rectangle((0, 0, s, cy + CLIP * r), fill=255)
    layer.putalpha(ImageChops.multiply(layer.getchannel('A'), clip))

    shape = Image.new('L', (s, s), 0)
    ImageDraw.Draw(shape).ellipse(disc_box, fill=255)
    shape = ImageChops.lighter(shape, layer.getchannel('A').point(lambda v: 255 if v > 8 else 0))
    grow = lambda mask, mods: mask.filter(ImageFilter.MaxFilter(2 * round(mods * u / 2) + 1))
    sticker = grow(shape, BORDER)

    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    img.paste((255, 255, 255, 255), (0, 0), sticker)
    d = ImageDraw.Draw(img)
    d.ellipse(disc_box, fill=RED)
    d.ellipse((cx - r + ring, cy - r + ring, cx + r - ring, cy + r - ring), fill='white')
    img.alpha_composite(layer)
    return img, grow(sticker, GAP)


# Silueta a 20 px por módulo para decidir qué módulos se quitan.
U = 20
_, keepout = badge(U)
origin = c - AREA / 2


def cleared(r, k):
    # Los lectores muestrean el centro del módulo: solo se quita si el centro queda bajo el sello.
    # El resto se dibuja y el sello lo tapa en parte.
    x0, y0 = round((k - origin) * U) + U // 4, round((r - origin) * U) + U // 4
    U2 = U // 2
    if x0 + U2 <= 0 or y0 + U2 <= 0 or x0 >= keepout.width or y0 >= keepout.height:
        return False
    box = keepout.crop((max(x0, 0), max(y0, 0), min(x0 + U2, keepout.width), min(y0 + U2, keepout.height)))
    return box.getextrema()[1] > 0


def is_eye(r, k):
    return (r < 7 and k < 7) or (r < 7 and k >= n - 7) or (r >= n - 7 and k < 7)


size = (n + 2 * QUIET) * M
img = Image.new('RGBA', (size, size), 'white')
d = ImageDraw.Draw(img)
removed = touched = 0
cells = []
for r in range(n):
    for k in range(n):
        if is_eye(r, k):
            continue
        if cleared(r, k):
            touched += 1
            removed += matrix[r][k]
            continue
        if matrix[r][k]:
            x, y = (k + QUIET) * M, (r + QUIET) * M
            d.rectangle((x, y, x + M - 1, y + M - 1), fill=INK)
            cells.append(f'M{k + QUIET} {r + QUIET}h1v1h-1z')

eyes = [(k0 + QUIET, r0 + QUIET) for r0, k0 in ((0, 0), (0, n - 7), (n - 7, 0))]
for x, y in eyes:
    x, y = x * M, y * M
    d.rounded_rectangle((x, y, x + 7 * M - 1, y + 7 * M - 1), radius=int(ROUND * 1.6 * M), fill=EYE)
    d.rounded_rectangle((x + M, y + M, x + 6 * M - 1, y + 6 * M - 1), radius=int(ROUND * 1.0 * M), fill='white')
    d.rounded_rectangle((x + 2 * M, y + 2 * M, x + 5 * M - 1, y + 5 * M - 1), radius=int(ROUND * 0.7 * M), fill=INK)

art, _ = badge(M)
img.alpha_composite(art, (round((origin + QUIET) * M),) * 2)
out.mkdir(parents=True, exist_ok=True)
img.convert('RGB').save(out / 'qr-gaston.png', dpi=(600, 600))

# Módulos que un lector leería al revés: se muestrea el centro de cada uno en gris.
gray = img.convert('L')
wrong = 0
for r in range(n):
    for k in range(n):
        x, y = (k + QUIET) * M, (r + QUIET) * M
        cell = gray.crop((x + M // 4, y + M // 4, x + 3 * M // 4, y + 3 * M // 4)).resize((1, 1), Image.BOX).getpixel((0, 0))
        wrong += (cell < 128) != bool(matrix[r][k])

# SVG para imprenta: módulos vectoriales y el sello incrustado en alta resolución.
if os.environ.get('NOSVG'):
    sys.exit()
hi = io.BytesIO()
badge(160)[0].save(hi, 'PNG', optimize=True)
w = n + 2 * QUIET
eye_svg = ''.join(
    f'<rect x="{x}" y="{y}" width="7" height="7" rx="{ROUND * 1.6:g}" fill="{EYE}"/>'
    f'<rect x="{x + 1}" y="{y + 1}" width="5" height="5" rx="{ROUND * 1:g}" fill="#fff"/>'
    f'<rect x="{x + 2}" y="{y + 2}" width="3" height="3" rx="{ROUND * 0.7:g}" fill="{INK}"/>' for x, y in eyes)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {w}" shape-rendering="crispEdges">'
       f'<rect width="{w}" height="{w}" fill="#fff"/><path fill="{INK}" d="{"".join(cells)}"/>'
       f'<g shape-rendering="geometricPrecision">{eye_svg}'
       f'<image x="{origin + QUIET}" y="{origin + QUIET}" width="{AREA}" height="{AREA}" '
       f'href="data:image/png;base64,{base64.b64encode(hi.getvalue()).decode()}"/></g></svg>')
(out / 'qr-gaston.svg').write_text(svg)
print(f'v{qr.version}-{qr.error} {n}×{n}; figura {FIGURE / n:.0%} del ancho; '
      f'zona tapada {touched} módulos ({touched / (n * n):.0%}), {removed} oscuros quitados, {wrong} leídos al revés, máscara {qr.mask}')
