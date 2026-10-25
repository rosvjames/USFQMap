"""Lee el QR con zxing-cpp y OpenCV en condiciones degradadas. Requiere zxing-cpp y opencv-python-headless.

Uso: python scripts/qr/comprobar.py docs/qr/qr-gaston.png
"""
import sys

import cv2
import numpy as np
import zxingcpp
from PIL import Image, ImageEnhance, ImageFilter

EXPECTED = 'HTTPS://USFQ-CAMPUS-NAV.VERCEL.APP'
detector = cv2.QRCodeDetector()


def variants(im):
    im = im.convert('RGB')
    yield 'original 2368px (solo zxing)', im
    for px in (1200, 300, 160, 110, 85):
        yield f'{px}px', im.resize((px, px), Image.LANCZOS)
    yield 'desenfoque', im.resize((400, 400)).filter(ImageFilter.GaussianBlur(2.2))
    yield 'poco contraste', ImageEnhance.Contrast(im.resize((400, 400))).enhance(0.45)
    yield 'oscuro', ImageEnhance.Brightness(im.resize((400, 400))).enhance(0.45)
    yield 'girado 17°', im.resize((400, 400)).rotate(17, expand=True, fillcolor='white')
    a = np.array(im.resize((500, 500)))
    src = np.float32([[0, 0], [500, 0], [500, 500], [0, 500]])
    dst = np.float32([[60, 30], [450, 0], [500, 500], [20, 440]])
    warped = cv2.warpPerspective(a, cv2.getPerspectiveTransform(src, dst), (520, 520), borderValue=(255, 255, 255))
    yield 'perspectiva', Image.fromarray(warped)
    noisy = np.clip(np.array(im.resize((400, 400))).astype(int) + np.random.default_rng(1).normal(0, 28, (400, 400, 3)), 0, 255)
    yield 'ruido', Image.fromarray(noisy.astype(np.uint8))


fails = 0
for path in sys.argv[1:]:
    print(path)
    for name, v in variants(Image.open(path)):
        z = [r.text for r in zxingcpp.read_barcodes(v)]
        o, *_ = detector.detectAndDecode(np.array(v)[:, :, ::-1])
        ok_z, ok_o = EXPECTED in z, o == EXPECTED
        fails += not ok_z or (not ok_o and "solo zxing" not in name)
        print(f'  {name:28} zxing {"✓" if ok_z else "✗"}  opencv {"✓" if ok_o else "✗"}')
sys.exit(1 if fails else 0)
