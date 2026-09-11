#!/usr/bin/env python3
"""Endurece huellas (stipple suave → tinta legible) y regenera marks/icon/splash."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MOBILE = ROOT / "mobile" / "assets"
LANDING = ROOT / "landing"
MARCA = ROOT / "docs" / "design" / "marca"
IOS_ICON = (
    ROOT
    / "mobile"
    / "ios"
    / "InaIgar"
    / "Images.xcassets"
    / "AppIcon.appiconset"
    / "App-Icon-1024x1024@1x.png"
)
IOS_SPLASH = ROOT / "mobile" / "ios" / "InaIgar" / "Images.xcassets" / "SplashScreenLegacy.imageset"


def harden(src: Path, rgb: int, thresh: int = 18) -> Image.Image:
    a = np.array(Image.open(src).convert("RGBA"))
    alpha = a[:, :, 3].astype(np.float32)
    ink = alpha >= thresh
    soft = (alpha > 0) & ~ink
    out = np.zeros_like(alpha)
    out[ink] = 255
    out[soft] = np.clip(alpha[soft] * 3.5, 40, 220)
    a[:, :, 0] = rgb
    a[:, :, 1] = rgb
    a[:, :, 2] = rgb
    a[:, :, 3] = out.astype(np.uint8)
    return Image.fromarray(a, "RGBA")


def opaque_app_icon(blanco: Image.Image, size: int = 1024, mark_frac: float = 0.72) -> Image.Image:
    """iOS App Icon no admite alpha: negro + huellas blancas."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    m = int(size * mark_frac)
    mark = blanco.resize((m, m), Image.Resampling.LANCZOS)
    layer.alpha_composite(mark, ((size - m) // 2, (size - m) // 2))
    return layer.convert("RGB")


def main() -> None:
    blanco_src = MARCA / "ina-igar-huellas-blanco.png"
    negro_src = MARCA / "ina-igar-huellas-negro.png"
    blanco = harden(blanco_src, 255)
    negro = harden(negro_src, 0)

    blanco.save(MOBILE / "huellas-blanco.png", optimize=True)
    negro.save(MOBILE / "huellas-negro.png", optimize=True)
    blanco.save(LANDING / "huellas-blanco.png", optimize=True)
    negro.save(LANDING / "huellas-negro.png", optimize=True)

    # Expo/iOS icon: opaco. Android adaptive: huellas blancas transparentes.
    icon_rgb = opaque_app_icon(blanco)
    icon_rgb.save(MOBILE / "icon.png", optimize=True)
    icon_rgb.save(LANDING / "icon.png", optimize=True)
    blanco.resize((1024, 1024), Image.Resampling.LANCZOS).save(
        MOBILE / "adaptive-icon.png", optimize=True
    )
    blanco.resize((48, 48), Image.Resampling.LANCZOS).save(MOBILE / "favicon.png", optimize=True)
    blanco.resize((48, 48), Image.Resampling.LANCZOS).save(LANDING / "favicon.png", optimize=True)

    port = Image.new("RGBA", (720, 1280), (0, 0, 0, 255))
    mark = blanco.resize((520, 520), Image.Resampling.LANCZOS)
    port.alpha_composite(mark, ((720 - 520) // 2, 280))
    port.save(MOBILE / "splash-icon.png", optimize=True)
    port.save(LANDING / "splash.png", optimize=True)

    negro.save(LANDING / "huellas-mark.png", optimize=True)
    blanco.save(LANDING / "huellas-mark-blanco.png", optimize=True)
    negro.resize((256, 256), Image.Resampling.LANCZOS).save(
        LANDING / "huellas-mark-sm.png", optimize=True
    )

    if IOS_ICON.parent.is_dir():
        icon_rgb.save(IOS_ICON, optimize=True)
        print(f"iOS AppIcon → {IOS_ICON.relative_to(ROOT)}")
    if IOS_SPLASH.is_dir():
        for name in ("image.png", "image@2x.png", "image@3x.png"):
            port.save(IOS_SPLASH / name, optimize=True)
        print("iOS SplashScreenLegacy actualizado")

    print("harden-huellas: mobile + landing OK")


if __name__ == "__main__":
    main()
