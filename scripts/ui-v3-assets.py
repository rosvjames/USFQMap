#!/usr/bin/env python3
"""Exporta assets UI v3 desde PNG originales intactos. Requiere Pillow.

Uso desde el repositorio: python3 scripts/ui-v3-assets.py
No genera imágenes, no refleja, no segmenta ni modifica los originales.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

THRESHOLD = 16
MARGIN = 8
LANCZOS = Image.Resampling.LANCZOS
WARM = '#FAF9F6'
RESULTS = []


def visible_box(im):
    box = im.getchannel('A').point(lambda a: 255 if a > THRESHOLD else 0).getbbox()
    if box is None:
        raise ValueError('Imagen sin silueta visible')
    return box


def source(root, name):
    path = root / 'referencias/ui-v3/originales' / f'{name}.png'
    with Image.open(path) as im:
        rgba = im.convert('RGBA')
    if name != 'carga-fondo':
        assert rgba.getchannel('A').getextrema()[0] == 0, f'{path}: falta alpha real'
    return rgba


def export(root, relative, im, *, opaque=False, quality=86, expected=None):
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    if opaque:
        bg = Image.new('RGBA', im.size, WARM)
        bg.alpha_composite(im.convert('RGBA'))
        im = bg.convert('RGB')
    if path.suffix == '.webp':
        im.save(path, 'WEBP', quality=quality, method=6, exact=True)
    else:
        im.save(path, 'PNG', optimize=True)
    with Image.open(path) as check:
        assert check.size == (expected or im.size), f'{relative}: tamaño incorrecto'
        rgba = check.convert('RGBA')
        alpha = rgba.getchannel('A')
        corners = [alpha.getpixel(p) for p in [(0, 0), (check.width-1, 0),
                   (0, check.height-1), (check.width-1, check.height-1)]]
        if opaque:
            assert alpha.getextrema() == (255, 255), f'{relative}: debe ser opaco'
        else:
            assert 'A' in check.getbands(), f'{relative}: falta canal alpha'
            assert corners == [0]*4, f'{relative}: esquinas no transparentes {corners}'
            assert alpha.getextrema()[1] > 16, f'{relative}: vacío'
        RESULTS.append({'archivo': relative, 'tamano': list(check.size),
                        'opaco': opaque, 'alpha_esquinas': corners,
                        'bbox_alpha_mayor_16': list(visible_box(rgba)),
                        'bytes': path.stat().st_size})


def trimmed(im, *, width=None, height=None, bottom_margin=8, cut_y=None):
    # El corte de tarjetas es rectangular, en coordenadas del PNG original.
    if cut_y is not None:
        im = im.crop((0, 0, im.width, cut_y))
    content = im.crop(visible_box(im))
    if width is not None:
        content_width = width - 2*MARGIN
        content_height = round(content.height*content_width/content.width)
    elif height is not None:
        content_height = height-MARGIN-bottom_margin
        content_width = round(content.width*content_height/content.height)
    else:
        raise ValueError('Indicar ancho o alto')
    content = content.resize((content_width, content_height), LANCZOS)
    # El alpha suave original dentro del bbox se conserva; no hay extracción.
    out = Image.new('RGBA', (content_width+2*MARGIN,
                            content_height+MARGIN+bottom_margin))
    out.alpha_composite(content, (MARGIN, MARGIN))
    return out


def mascot_square(im):
    content = im.crop(visible_box(im))
    content.thumbnail((428, 428), LANCZOS)
    out = Image.new('RGBA', (512, 512))
    # y=471 es la fila inferior visible; 472 es el límite exclusivo.
    out.alpha_composite(content, ((512-content.width)//2, 472-content.height))
    return out


# SVG escrito a mano. Solo path/circle; sin filtros, imágenes ni texto.
SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100" fill="none">
  <path fill="#FBE3DF" d="M 12 87 C 12 79 18 73 27 74 C 25 60 43 56 49 68 C 57 60 70 66 69 76 C 79 75 85 81 85 87 Z"/>
  <path fill="#FBE3DF" d="M 97 25 C 98 18 105 16 111 18 C 111 6 130 4 133 17 C 142 14 149 19 149 25 Z"/>
  <path fill="#FBE3DF" d="M 194 96 C 194 88 201 83 210 86 C 210 71 230 68 236 81 C 244 72 261 77 262 89 C 275 86 282 90 282 96 Z"/>
  <path fill="#FBE3DF" d="M 259 46 C 259 39 265 36 271 38 C 271 29 284 26 289 37 C 295 35 299 40 299 46 Z"/>
  <path fill="#F6C9C4" d="M 35 100 C 49 79 76 72 110 69 C 138 66 151 61 139 56 C 114 46 124 38 152 32 C 173 27 197 28 219 24 L 222 31 C 198 36 177 34 160 38 C 141 42 145 45 163 51 C 192 61 167 75 125 80 C 94 84 76 89 69 100 Z"/>
  <path fill="#E11B22" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round" d="M 94 52 C 94 31 126 31 126 52 C 126 63 110 78 110 78 C 110 78 94 63 94 52 Z"/>
  <circle cx="110" cy="51" r="6" fill="#FFFFFF"/>
  <path fill="#E11B22" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round" d="M 211 19 C 211 -2 243 -2 243 19 C 243 30 227 45 227 45 C 227 45 211 30 211 19 Z"/>
  <circle cx="227" cy="18" r="6" fill="#FFFFFF"/>
</svg>
'''


def svg_preview():
    """Rasteriza solo los comandos M/L/C/Z de ESTE SVG para la hoja de revisión.

    No crea un asset raster alternativo ni necesita navegador/cairo/node.
    """
    import xml.etree.ElementTree as ET
    scale = 3
    out = Image.new('RGBA', (300*scale, 100*scale))
    draw = ImageDraw.Draw(out)
    for element in ET.fromstring(SVG):
        attrs = element.attrib
        if element.tag.endswith('circle'):
            x, y, r = [float(attrs[k])*scale for k in ('cx', 'cy', 'r')]
            draw.ellipse((x-r, y-r, x+r, y+r), fill=attrs['fill'])
            continue
        tokens = re.findall(r'[MLCZ]|-?\d+(?:\.\d+)?', attrs['d'])
        points = []
        i = 0
        while i < len(tokens):
            command = tokens[i]; i += 1
            if command in ('M', 'L'):
                points.append((float(tokens[i]), float(tokens[i+1]))); i += 2
            elif command == 'C':
                p0 = points[-1]
                p1, p2, p3 = [(float(tokens[i+j]), float(tokens[i+j+1])) for j in (0, 2, 4)]
                i += 6
                for step in range(1, 33):
                    t = step/32; s = 1-t
                    points.append(tuple(s**3*p0[k]+3*s*s*t*p1[k]+3*s*t*t*p2[k]+t**3*p3[k] for k in (0, 1)))
            elif command == 'Z':
                points.append(points[0])
            else:
                raise ValueError(command)
        points = [(x*scale, y*scale) for x, y in points]
        draw.polygon(points, fill=attrs['fill'])
        if 'stroke' in attrs:
            width = round(float(attrs['stroke-width'])*scale)
            draw.line(points, fill=attrs['stroke'], width=width, joint='curve')
            # El borde blanco se dibuja antes del círculo blanco central.
    return out


def font(size):
    for path in ('/System/Library/Fonts/Supplemental/Arial.ttf',
                 '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


def review(root):
    all_paths = [r['archivo'] for r in RESULTS] + ['public/ui/explorar-a-pie.svg']
    cell_w, cell_h, columns = 350, 370, 4
    sheet = Image.new('RGB', (columns*cell_w, 74+math.ceil(len(all_paths)/columns)*cell_h), '#888888')
    d = ImageDraw.Draw(sheet)
    d.text((22, 15), 'USFQ Explora · Assets UI v3', font=font(26), fill='white')
    d.text((22, 49), 'Finales sobre gris medio · alpha original · sin reflejos horizontales', font=font(15), fill='white')
    for i, relative in enumerate(all_paths):
        if relative.endswith('.svg'):
            im = svg_preview()
        else:
            im = Image.open(root/relative).convert('RGBA')
        size = im.size
        im.thumbnail((320, 295), LANCZOS)
        x = (i % columns)*cell_w
        y = 74+(i//columns)*cell_h
        sheet.paste(im, (x+(cell_w-im.width)//2, y+(298-im.height)//2), im)
        label = str(Path(relative).relative_to('public'))
        d.text((x+12, y+307), label, font=font(17), fill='white')
        d.text((x+12, y+333), f'{size[0]} × {size[1]} px' if not relative.endswith('.svg') else 'SVG · viewBox 0 0 300 100', font=font(15), fill='#eeeeee')
    sheet.save(root/'referencias/ui-v3/revision.png', optimize=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    root = parser.parse_args().root.resolve()
    (root/'referencias/ui-v3').mkdir(parents=True, exist_ok=True)
    RESULTS.clear()
    export(root, 'public/ui/carga-gaston.webp', trimmed(source(root, 'carga-gaston'), height=1200), expected=None)
    bg = ImageOps.fit(source(root, 'carga-fondo'), (1080, 1920), LANCZOS, centering=(0.5, 0.5))
    export(root, 'public/ui/carga-fondo.webp', bg, opaque=True, quality=82, expected=(1080, 1920))
    bushes = source(root, 'carga-arbustos')
    split = bushes.width//2
    # Separación rectangular de la pareja original, jamás espejo horizontal.
    for name, box in [('izq', (0, 0, split, bushes.height)),
                      ('der', (split, 0, bushes.width, bushes.height))]:
        export(root, f'public/ui/carga-arbustos-{name}.webp', trimmed(bushes.crop(box), width=600))
    # Líneas de corte anotadas al revisar los PNG; son límites exclusivos.
    # El original no se modifica, y no hay máscaras de silueta.
    cuts = json.loads((root/'referencias/ui-v3/originales/cortes.json').read_text())
    for name in ('gaston-asomado', 'gaston-destino'):
        export(root, f'public/ui/{name}.webp', trimmed(source(root, name), width=600, bottom_margin=0, cut_y=cuts[name]))
    for name in ('gaston-guia', 'gaston-llegada'):
        export(root, f'public/ui/{name}.webp', source(root, name).resize((480, 480), LANCZOS), expected=(480, 480))
    for name in ('buscando', 'ubicacion'):
        pose = mascot_square(source(root, name))
        export(root, f'public/mascota/gaston/{name}.webp', pose, expected=(512, 512))
        box = RESULTS[-1]['bbox_alpha_mayor_16']
        assert box[2]-box[0] <= 428 and box[3]-box[1] <= 428
        assert box[3] == 472, f'{name}: el borde inferior debe estar en y=471'
        assert abs((box[0]+box[2])/2-256) <= 1
    head = source(root, 'cabeza')
    export(root, 'public/mascota/gaston/cabeza.webp', trimmed(head, width=512))
    content = head.crop(visible_box(head))
    icon = Image.new('RGBA', (32, 32))
    small = ImageOps.contain(content, (30, 30), LANCZOS)
    icon.alpha_composite(small, ((32-small.width)//2, (32-small.height)//2))
    export(root, 'public/mascota/gaston/favicon.png', icon, expected=(32, 32))
    apple = Image.new('RGBA', (180, 180), WARM)
    small = ImageOps.contain(content, (153, 153), LANCZOS)
    apple.alpha_composite(small, ((180-small.width)//2, (180-small.height)//2))
    export(root, 'public/mascota/gaston/apple-touch-icon.png', apple, opaque=True, expected=(180, 180))
    (root/'public/ui/explorar-a-pie.svg').write_text(SVG, encoding='utf-8')
    review(root)
    report = {'archivos_raster': RESULTS, 'svg': 'public/ui/explorar-a-pie.svg',
              'reglas': {'alpha_umbral': THRESHOLD, 'margen_px_finales': MARGIN,
                        'webp_quality': 86, 'webp_method': 6, 'fondo_quality': 82}}
    (root/'referencias/ui-v3/validacion.json').write_text(json.dumps(report, indent=2)+'\n')
    for row in RESULTS:
        print(f"OK {row['archivo']} {row['tamano'][0]}x{row['tamano'][1]}")
    print('OK SVG y referencias/ui-v3/revision.png')


if __name__ == '__main__':
    main()
