# Traces the walls of the Galileo, Einstein, Darwin and Newton complex from photos of the
# evacuation plans and writes src/data/academicComplexWalls.ts.
#
# The photos stay local in referencias/planos-evacuacion/ (third-party material, see .gitignore);
# only the derived geometry is committed. Calibration lives in scripts/planos-evacuacion.json:
#   sheetHomography  photo -> common sheet frame, fitted on the identical legend and title block
#   floorToFloor1    [scale, rotation°, tx, ty] aligning floors 2 and 3 to floor 1 (chamfer match
#                    of walls, columns and stairs, all rotated so the plan title reads upright)
#   georef           [a, b, tx, ty]: campus metres = (a·u + b·v + tx, b·u − a·v + ty) for floor-1
#                    pixel (u, v); fitted on the star garden and Galileo's lagoon corner against
#                    Esri World Imagery, checked against roofs, skylights and the lagoon shore.
#
# Usage: python3 -m venv .venv && .venv/bin/pip install pillow opencv-python-headless numpy
#        .venv/bin/python scripts/trazar-planos-evacuacion.py

import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
CAL = json.loads((ROOT / 'scripts/planos-evacuacion.json').read_text())
PHOTOS = ROOT / 'referencias/planos-evacuacion'
OUT = ROOT / 'src/data/academicComplexWalls.ts'

# Galileo, Newton, Einstein, Darwin and the Newton wing that OSM tags as "Casa Blanca".
FOOTPRINTS = {'way/395847788', 'way/395847789', 'way/395847790', 'way/395848711', 'way/395849376'}
# Each sheet repeats a detached stair tower in a corner, off its true position: crop it out (floor-1 px).
MIN_U = {1: 0, 2: 1260, 3: 1900}
FLOORS = (1, 2, 3)

ORIGIN = (-78.4357, -0.1968)  # src/lib/geo.ts
M_LAT = 110574
M_LON = 111320 * math.cos(math.radians(ORIGIN[1]))

a, b, gx, gy = CAL['georef']
TO_CAMPUS = np.array([[a, b, gx], [b, -a, gy], [0, 0, 1]])
FROM_CAMPUS = np.linalg.inv(TO_CAMPUS)
METRES_PER_PX = math.hypot(a, b)


def floor_transform(n):
    s, r, tx, ty = CAL['floorToFloor1'][str(n)]
    c, sn = math.cos(math.radians(r)), math.sin(math.radians(r))
    return np.array([[s * c, -s * sn, tx], [s * sn, s * c, ty], [0, 0, 1]])


def load_sheet(n):
    """Photo of floor n rectified to the sheet frame, rotated upright and with flat white paper."""
    photo = np.array(ImageOps.exif_transpose(Image.open(PHOTOS / f'evacuacion-piso-{n}.jpg')).convert('RGB'))
    size = (CAL['sheet']['width'], CAL['sheet']['height'])
    sheet = cv2.warpPerspective(cv2.cvtColor(photo, cv2.COLOR_RGB2BGR), np.array(CAL['sheetHomography'][str(n)]), size,
                                flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
    sheet = cv2.rotate(sheet, cv2.ROTATE_90_COUNTERCLOCKWISE)
    paper = cv2.medianBlur(cv2.resize(sheet, None, fx=.1, fy=.1), 21)
    paper = cv2.resize(paper, (sheet.shape[1], sheet.shape[0]), interpolation=cv2.INTER_LINEAR)
    return np.clip(sheet.astype(np.float32) / np.maximum(paper.astype(np.float32), 1) * 230, 0, 255).astype(np.uint8)


def complex_mask(shape, to_floor1, k):
    """The complex's OSM footprints in this sheet's pixels, grown ~1.5 m to keep the outer walls."""
    features = json.loads((ROOT / 'src/data/campus.json').read_text())['features']
    to_sheet = np.linalg.inv(to_floor1) @ FROM_CAMPUS
    mask = np.zeros(shape, np.uint8)
    for feature in features:
        if feature['properties'].get('osm_id') not in FOOTPRINTS:
            continue
        ring = [(to_sheet @ [(lon - ORIGIN[0]) * M_LON, (lat - ORIGIN[1]) * M_LAT, 1])[:2]
                for lon, lat in feature['geometry']['coordinates'][0]]
        cv2.fillPoly(mask, [np.array(ring, np.int32)], 255)
    return cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(75 * k),) * 2))


def ink(sheet, k):
    """Dark linework without the green routes, red equipment icons and blue labels."""
    gray = cv2.cvtColor(sheet, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(sheet, cv2.COLOR_BGR2HSV)
    dark = gray.astype(int) < cv2.blur(gray, (int(61 * k) | 1,) * 2).astype(int) - 28
    # Tinted wall lines are thin, so an opening keeps only the solid colour blobs. Route dashes
    # are narrower than icons but still several pixels wide, so green gets a smaller opening.
    blobs = cv2.morphologyEx(((hsv[..., 1] > 90) & (hsv[..., 2] < 235)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    green = ((hsv[..., 0] > 35) & (hsv[..., 0] < 95) & (hsv[..., 1] > 60)).astype(np.uint8)
    green = cv2.morphologyEx(green, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    colour = cv2.dilate(blobs | green, np.ones((int(7 * k) | 1,) * 2, np.uint8)) > 0
    return (dark & ~colour).astype(np.uint8) * 255


def walls(lines, k):
    """Orthogonal wall runs. Walls are drawn as double lines, so closing across them leaves bands
    5–11 px thick (floor-1 px); single lines (stair treads, furniture, text) stay at 1–4 px."""
    min_run, gap = int(22 * k), int(7 * k) | 1
    runs = []
    for horizontal in (True, False):
        band = cv2.morphologyEx(lines, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (1, gap) if horizontal else (gap, 1)))
        band = cv2.morphologyEx(band, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (min_run, 1) if horizontal else (1, min_run)))
        count, _, stats, _ = cv2.connectedComponentsWithStats(band, 8)
        for x, y, w, h, area in stats[1:count]:
            length = w if horizontal else h
            thickness = area / length / k
            if length < min_run or not 5 <= thickness <= 11:
                continue
            ends = ((x, y + h / 2), (x + w, y + h / 2)) if horizontal else ((x + w / 2, y), (x + w / 2, y + h))
            runs.append((ends, thickness))
    return runs


def outline(runs_px, shape):
    """Floor plates: the walls closed over gaps up to ~6 m, so rooms with an untraced facade still count."""
    mask = np.zeros(shape, np.uint8)
    for (p0, p1), _ in runs_px:
        cv2.line(mask, tuple(map(int, p0)), tuple(map(int, p1)), 255, 6)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (151, 151)))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    rings = []
    for contour in contours:
        if cv2.contourArea(contour) < 200 / METRES_PER_PX ** 2:  # skip pieces under 200 m²
            continue
        rings.append(cv2.approxPolyDP(contour, 6, True).reshape(-1, 2))
    return rings


def campus(point):
    x, y, _ = TO_CAMPUS @ [point[0], point[1], 1]
    return round(float(x), 2), round(float(y), 2)


def main():
    floors = {}
    for n in FLOORS:
        sheet = load_sheet(n)
        to_floor1 = floor_transform(n)
        k = 1 / to_floor1[0, 0]  # sheet px per floor-1 px
        lines = ink(sheet, k) & complex_mask(sheet.shape[:2], to_floor1, k)
        runs = []
        for (p0, p1), thickness in walls(lines, k):
            q0, q1 = (to_floor1 @ [*p0, 1])[:2], (to_floor1 @ [*p1, 1])[:2]
            if min(q0[0], q1[0]) >= MIN_U[n]:
                runs.append(((q0, q1), thickness))
        slab = outline(runs, sheet.shape[:2])
        # Stray lines outside the building (the Hall's colonnade, paving) form no plate of their own.
        middle = lambda run: tuple(float(v) for v in (run[0][0] + run[0][1]) / 2)
        runs = [run for run in runs if any(cv2.pointPolygonTest(ring.astype(np.float32), middle(run), True) > -8 for ring in slab)]
        floors[n] = {
            'walls': [[*campus(p0), *campus(p1), round(min(.3, max(.15, t * METRES_PER_PX * .6)), 2)] for (p0, p1), t in runs],
            'slabs': [[campus(p) for p in ring] for ring in slab],
        }
        print(f'piso {n}: {len(runs)} muros, {len(slab)} losas')

    body = ',\n'.join(
        f"  {n}: {{\n    walls: {json.dumps(f['walls'], separators=(',', ':'))},\n"
        f"    slabs: {json.dumps(f['slabs'], separators=(',', ':'))},\n  }}"
        for n, f in floors.items())
    OUT.write_text(
        '// Generated by scripts/trazar-planos-evacuacion.py from photos of the evacuation plans. Do not edit.\n'
        '// Campus metres. A wall is [x0, y0, x1, y1, thickness]; a slab is the outline of one floor plate.\n'
        "import type { Vec2 } from '../types'\n\n"
        'export interface ComplexFloor { walls: [number, number, number, number, number][]; slabs: Vec2[][] }\n\n'
        f'export const ACADEMIC_COMPLEX_FLOORS: Record<number, ComplexFloor> = {{\n{body},\n}}\n')


if __name__ == '__main__':
    main()
