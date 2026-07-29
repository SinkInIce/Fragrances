#!/usr/bin/env python3
"""Generate a shelf of fragrance bottles as inline SVG, in the app's palette.

Varied silhouettes and liquid levels so it reads as a real shelf rather than
a repeated stamp. Colours reference CSS custom properties so the band
re-themes with the rest of the app.
"""
import random

W, H = 680.0, 132.0
SHELF_Y = 112.0          # top of the shelf plank
random.seed(7)           # fixed so the art is stable across rebuilds

# (body width, body height, neck w, neck h, cap w, cap h, shoulder, fill fraction)
SPECS = [
    (46, 62, 15, 11, 21, 9,  'round',  0.72),
    (34, 78, 11, 14, 16, 11, 'square', 0.55),
    (54, 50, 18, 9,  24, 8,  'taper',  0.86),
    (30, 66, 10, 16, 15, 10, 'round',  0.34),
    (44, 84, 14, 10, 20, 12, 'square', 0.64),
    (38, 56, 13, 12, 18, 9,  'taper',  0.90),
    (50, 72, 16, 13, 22, 10, 'round',  0.47),
    (32, 60, 11, 10, 16, 8,  'square', 0.78),
    (42, 88, 14, 15, 19, 11, 'taper',  0.58),
    (36, 54, 12, 11, 17, 9,  'round',  0.40),
    (48, 68, 15, 12, 21, 10, 'square', 0.68),
]


def bottle(cx, spec):
    bw, bh, nw, nh, cw, ch, shoulder, fill = spec
    parts = []
    bx, by = cx - bw / 2, SHELF_Y - bh
    r = 4 if shoulder != 'square' else 2

    if shoulder == 'taper':
        # Body narrows toward the shoulder rather than meeting the neck squarely
        inset = bw * 0.16
        parts.append(
            f'<path d="M{bx:.1f},{SHELF_Y:.1f} L{bx:.1f},{by + bh * 0.30:.1f} '
            f'L{bx + inset:.1f},{by:.1f} L{bx + bw - inset:.1f},{by:.1f} '
            f'L{bx + bw:.1f},{by + bh * 0.30:.1f} L{bx + bw:.1f},{SHELF_Y:.1f} Z" '
            f'fill="var(--ink)" opacity=".88"/>'
        )
    else:
        parts.append(
            f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" '
            f'rx="{r}" fill="var(--ink)" opacity=".88"/>'
        )

    # Liquid, inset from the glass edge
    pad = 5.0
    lh = (bh - pad) * fill
    ly = SHELF_Y - lh - 2
    lw = bw - pad * 2
    if shoulder == 'taper':
        lw = bw - pad * 2 - 3
    parts.append(
        f'<rect x="{cx - lw / 2:.1f}" y="{ly:.1f}" width="{lw:.1f}" height="{lh:.1f}" '
        f'rx="2" fill="var(--accent)" opacity=".95"/>'
    )

    # Neck and cap
    ny = by - nh
    parts.append(
        f'<rect x="{cx - nw / 2:.1f}" y="{ny:.1f}" width="{nw:.1f}" height="{nh + 3:.1f}" '
        f'fill="var(--ink)" opacity=".88"/>'
    )
    cy = ny - ch
    parts.append(
        f'<rect x="{cx - cw / 2:.1f}" y="{cy:.1f}" width="{cw:.1f}" height="{ch:.1f}" '
        f'rx="2" fill="var(--ink)" opacity=".8"/>'
    )
    return ''.join(parts)


def build():
    total = sum(s[0] for s in SPECS)
    gap = (W - 24 - total) / (len(SPECS) - 1)
    out = []
    x = 12.0
    for spec in SPECS:
        out.append(bottle(x + spec[0] / 2, spec))
        x += spec[0] + gap

    shelf = (
        f'<rect x="0" y="{SHELF_Y:.1f}" width="{W:.0f}" height="5" fill="var(--ink)" opacity=".55"/>'
        f'<rect x="0" y="{SHELF_Y + 5:.1f}" width="{W:.0f}" height="4" fill="var(--ink)" opacity=".18"/>'
    )
    return (
        f'<svg class="shelf-band" viewBox="0 0 {W:.0f} {H:.0f}" role="img" '
        f'aria-label="A shelf of fragrance bottles" preserveAspectRatio="xMidYMax meet">'
        + ''.join(out) + shelf + '</svg>'
    )


if __name__ == '__main__':
    svg = build()
    print(svg)
    print(f'\n<!-- {len(svg)} bytes -->', file=__import__('sys').stderr)
