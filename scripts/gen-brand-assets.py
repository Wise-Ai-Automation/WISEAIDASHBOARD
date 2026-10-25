#!/usr/bin/env python3
"""Generates mobile + web app icon/favicon/logo assets from the official
ONEWISE AI brand kit (ONEWISE_AI_Brand_Kit/). Source assets there are raster
(PNG), so this composites/resizes rather than hand-tracing vector paths.
Run from the repo root: python3 scripts/gen-brand-assets.py
"""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "ONEWISE_AI_Brand_Kit")
MOBILE_ASSETS = os.path.join(ROOT, "mobile", "assets")
WEB_PUBLIC = os.path.join(ROOT, "public")
WEB_BRAND = os.path.join(WEB_PUBLIC, "brand")

NAVY = (13, 42, 84, 255)  # #0D2A54
WHITE = (255, 255, 255, 255)

MARK_SRC = os.path.join(KIT, "app-icons", "onewise-app-icon-1024.png")


def load_mark_trimmed():
    """The source canvas has asymmetric padding; trim to the mark's real bbox
    so every composite below can center it precisely and control its own inset."""
    im = Image.open(MARK_SRC).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    return im.crop(bbox)


def square_canvas(size, bg=None):
    mode = "RGBA"
    fill = bg if bg is not None else (0, 0, 0, 0)
    return Image.new(mode, (size, size), fill)


def paste_centered(canvas, mark, fill_fraction):
    """Scale `mark` (RGBA, trimmed) so its longer side is `fill_fraction` of the
    canvas, then paste centered."""
    cw, ch = canvas.size
    mw, mh = mark.size
    target = int(min(cw, ch) * fill_fraction)
    scale = target / max(mw, mh)
    new_size = (max(1, round(mw * scale)), max(1, round(mh * scale)))
    resized = mark.resize(new_size, Image.LANCZOS)
    x = (cw - new_size[0]) // 2
    y = (ch - new_size[1]) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    print("wrote", os.path.relpath(path, ROOT))


def main():
    mark = load_mark_trimmed()

    # ---------------- Mobile (Expo) ----------------
    # iOS app icon: must be fully opaque (no alpha) — flatten onto white.
    icon = square_canvas(1024, WHITE)
    paste_centered(icon, mark, 0.82)
    save(icon.convert("RGB"), os.path.join(MOBILE_ASSETS, "icon.png"))

    # Android adaptive icon: foreground mark kept inside the ~66% safe zone so
    # it isn't clipped by circular/squircle/rounded-square launcher masks.
    fg = square_canvas(1024)
    paste_centered(fg, mark, 0.58)
    save(fg, os.path.join(MOBILE_ASSETS, "android-icon-foreground.png"))

    bg = square_canvas(1024, NAVY)
    save(bg.convert("RGB"), os.path.join(MOBILE_ASSETS, "android-icon-background.png"))

    # Android 13+ themed (monochrome) icon: single-tone silhouette, OS tints it.
    mono = square_canvas(1024)
    mono_mark = Image.new("RGBA", mark.size, WHITE)
    mono_mark.putalpha(mark.getchannel("A"))
    paste_centered(mono, mono_mark, 0.58)
    save(mono, os.path.join(MOBILE_ASSETS, "android-icon-monochrome.png"))

    # Splash screen: transparent mark: expo-splash-screen lays it over
    # app.json's splash backgroundColor (set to brand navy) and sizes it via imageWidth.
    splash = square_canvas(1024)
    paste_centered(splash, mark, 0.9)
    save(splash, os.path.join(MOBILE_ASSETS, "splash-icon.png"))

    # Web preview favicon (Expo web output, not the main dashboard's).
    fav = square_canvas(196, WHITE)
    paste_centered(fav, mark, 0.82)
    save(fav.convert("RGB"), os.path.join(MOBILE_ASSETS, "favicon.png"))

    # In-app header mark (used by the mobile logo component).
    header_mark = square_canvas(256)
    paste_centered(header_mark, mark, 0.92)
    save(header_mark, os.path.join(MOBILE_ASSETS, "brand", "onewise-mark.png"))

    # ---------------- Web dashboard ----------------
    # apple-touch-icon: opaque, light background per brand kit's neutral bg color.
    LIGHT_BG = (245, 247, 251, 255)  # #F5F7FB
    touch = square_canvas(180, LIGHT_BG)
    paste_centered(touch, mark, 0.82)
    save(touch.convert("RGB"), os.path.join(WEB_PUBLIC, "apple-touch-icon.png"))

    # favicon.ico: multi-size, opaque white bg (matches the mark's own window panel).
    ico_base = square_canvas(256, WHITE)
    paste_centered(ico_base, mark, 0.86)
    ico_base.convert("RGB").save(
        os.path.join(WEB_PUBLIC, "favicon.ico"),
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("wrote public/favicon.ico")

    # Header mark used by the React logo component (navbar / login hero).
    header = square_canvas(512)
    paste_centered(header, mark, 0.92)
    save(header, os.path.join(WEB_BRAND, "onewise-mark.png"))

    print("done")


if __name__ == "__main__":
    main()
