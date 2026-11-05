#!/usr/bin/env python3
"""Da a una foto el aspecto de un rollo de 1998 y le quita todos los metadatos.

Uso:    pip install pillow numpy
        python3 tools/film98.py assets/images/foto.jpg

Sobrescribe la foto y crea su miniatura en assets/images/mini.
Pásala una sola vez por foto: otra pasada acumula grano y deslave.
"""
import sys
import zlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

MAX_SIDE = 640      # como un escaneo de 1998
THUMB_SIDE = 200
GRAIN = 0.04        # súbelo para más grano
FADE = 0.085        # negros deslavados
VIGNETTE = 0.30     # esquinas oscuras
HALATION = 0.16     # resplandor rojizo en las luces
QUALITY = 74


def fit(img, side):
    scale = min(1, side / max(img.size))
    return img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)


def blur(a, radius):
    img = Image.fromarray((a.clip(0, 1) * 255).astype("uint8"))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), dtype=float) / 255


def luma(a):
    return (a * [0.299, 0.587, 0.114]).sum(-1)


def film(img, seed):
    img = fit(ImageOps.exif_transpose(img).convert("RGB"), MAX_SIDE)
    a = blur(np.asarray(img, dtype=float) / 255, 0.7)  # lente de plástico
    rng = np.random.default_rng(seed)

    # La luz fuerte atraviesa la película y rebota: resplandor rojizo.
    glow = blur(a * (luma(a) > 0.72)[..., None], 9)
    a = a + glow * np.array([1.0, 0.45, 0.2]) * HALATION

    # Contraste suave en S, color cálido y sombras apenas azuladas.
    a = a.clip(0, 1)
    a = a * a * (3 - 2 * a) * 0.55 + a * 0.45
    a = a * np.array([1.07, 1.0, 0.85])
    l = luma(a)[..., None]
    a = l + (a - l) * 0.88
    a = a + (1 - l) ** 2 * np.array([0.0, 0.02, 0.05])
    a = FADE + a * (1 - FADE * 1.6)

    # Viñeta del lente.
    h, w = a.shape[:2]
    y, x = np.ogrid[-1:1:h * 1j, -1:1:w * 1j]
    a = a * (1 - VIGNETTE * ((x * x + y * y) / 2) ** 1.2)[..., None]

    # Grano: casi todo en luminosidad y más visible en los tonos medios.
    l = luma(a.clip(0, 1))[..., None]
    grain = blur(rng.normal(0.5, 0.17, (h, w)), 0.5)[..., None] - 0.5
    speck = rng.normal(0, 0.012, a.shape)
    a = a + (grain / 0.17 * GRAIN + speck) * (0.55 + 1.8 * l * (1 - l))

    return Image.fromarray((a.clip(0, 1) * 255).astype("uint8"))


def save(img, path):
    # Sin exif= ni icc_profile=: la imagen nueva no lleva ningún metadato.
    img.save(path, "JPEG", quality=QUALITY, subsampling=2, optimize=True)
    with Image.open(path) as check:
        assert not check.getexif() and "icc_profile" not in check.info, path


def main(paths):
    for name in paths:
        path = Path(name)
        with Image.open(path) as img:
            out = film(img, zlib.crc32(path.name.encode()))
        save(out, path)
        mini = path.parent / "mini"
        mini.mkdir(exist_ok=True)
        save(fit(out, THUMB_SIDE), mini / path.name)
        print(f"{path.name}: {out.width}x{out.height}, {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
