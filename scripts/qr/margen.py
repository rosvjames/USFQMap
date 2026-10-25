"""Palabras de código dañadas por bloque en un QR v3-H ya dibujado.

Uso: python margen.py <dir>... Cada dir contiene qr-gaston.png y termina en m<máscara> (p. ej. salida_m6).
"""
import sys

import segno
from PIL import Image

URL = 'HTTPS://USFQ-CAMPUS-NAV.VERCEL.APP'
N, QUIET, M = 29, 4, 64
BLOCKS, DATA, CORRECTABLE = 2, 13, 11      # v3-H: 2 bloques de 13 datos + 22 de corrección


def function_modules():
    f = [[False] * N for _ in range(N)]
    mark = lambda r0, k0, h, w: [f[r].__setitem__(k, True) for r in range(r0, r0 + h) for k in range(k0, k0 + w)]
    mark(0, 0, 9, 9); mark(0, N - 8, 9, 8); mark(N - 8, 0, 8, 9)   # buscadores, separadores e info de formato
    mark(6, 0, 1, N); mark(0, 6, N, 1)                              # temporización
    mark(20, 20, 5, 5)                                              # alineación en (22, 22)
    return f


def placement():
    """Posiciones de los bits de datos en el orden de lectura en zigzag."""
    f, order, up, col = function_modules(), [], True, N - 1
    while col > 0:
        if col == 6:
            col -= 1
        rows = range(N - 1, -1, -1) if up else range(N)
        for r in rows:
            for k in (col, col - 1):
                if not f[r][k]:
                    order.append((r, k))
        up, col = not up, col - 2
    return order


for d in sys.argv[1:]:
    mask = int(d.rsplit('m', 1)[-1])
    matrix = segno.make(URL, error='h', boost_error=False, mask=mask).matrix
    gray = Image.open(f'{d}/qr-gaston.png').convert('L')
    wrong = set()
    for r in range(N):
        for k in range(N):
            x, y = (k + QUIET) * M, (r + QUIET) * M
            v = gray.crop((x + M // 4, y + M // 4, x + 3 * M // 4, y + 3 * M // 4)).resize((1, 1), Image.BOX).getpixel((0, 0))
            if (v < 128) != bool(matrix[r][k]):
                wrong.add((r, k))
    order = placement()
    bad = [0] * BLOCKS
    for i in range(70):
        if any(p in wrong for p in order[i * 8:i * 8 + 8]):
            bad[i % BLOCKS if i < BLOCKS * DATA else (i - BLOCKS * DATA) % BLOCKS] += 1
    print(f'máscara {mask}: palabras dañadas por bloque {bad} (corrige {CORRECTABLE} por bloque), módulos al revés {len(wrong)}')
