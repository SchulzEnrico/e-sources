#!/usr/bin/env python3
"""V136 (Enrico 12:31–12:39): Bildschirmhintergründe mit dem ES-Zeichen (ohne „ources“) für docs/Hintergrund/ –
neutral dunkel wie die Portfolio-Seite (#0c0c0f), Wasserringe wie von einem Stein, Glanz wie jQuery Ripples.
Braucht rsvg-convert, numpy und Pillow. Aufruf: python3 tools/wallpaper.py  (Vorschau: … preview)"""
import os, re, subprocess, sys, tempfile, pathlib, numpy as np
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
outdir = root / 'docs/Hintergrund'
src = (root / 'web/src/assets/e-sources-logo.svg').read_text(encoding='utf-8')
i = src.index('<path transform="translate(170.60')  # Schriftzug „ources“ weglassen
logo = src[:i] + src[src.index('/>', i) + 2:]
tmpdir = pathlib.Path(tempfile.mkdtemp())
inner = re.sub(r'^<svg[^>]*>', '', logo).replace('</svg>', '')
inner = re.sub(r'<title>.*?</title>', '', inner)
defs = re.search(r'<defs>.*?</defs>', inner, re.S).group(0)
body = inner.replace(defs, '')
LW, LH, OX, OY = 160.8, 155.8, 4.9, 9.8
def s2l(c): c=c/255; return np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
def l2s(c): c=np.clip(c,0,1); return np.where(c<=0.0031308,c*12.92,1.055*c**(1/2.4)-0.055)
def make(W, H, name, share=0.34):
    s = H*share/LH; w, h = LW*s, LH*s; cx, cy = W/2, H/2; x, y = cx-w/2, cy-h/2
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{defs}
<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="{h*0.03}"/></filter></defs>
<g transform="translate({x+h*0.02} {y+h*0.035}) scale({s}) translate({-OX} {-OY})" filter="url(#sh)" opacity="0.55"><g style="fill:#000;stroke:#000">{body.replace('fill="url','data-f="url').replace('stroke="url','data-s="url')}</g></g>
<g transform="translate({x} {y}) scale({s}) translate({-OX} {-OY})">{body}</g></svg>'''
    (tmpdir/'fg.svg').write_text(svg, encoding='utf-8'); subprocess.run(['rsvg-convert',str(tmpdir/'fg.svg'),'-o',str(tmpdir/'fg.png')],check=True)
    fg = np.asarray(Image.open(tmpdir/'fg.png').convert('RGBA')).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    R = max(W, H)*0.75
    d = np.sqrt(((xx-cx)/R)**2 + ((yy-cy)/R)**2); t = np.clip(d,0,1); t = t*t*(3-2*t)
    # neutral dunkel wie die Portfolio-Seite (--bg #0c0c0f), Mitte kaum heller
    c0, c1 = s2l(np.array([23,23,25.])).astype(np.float32), s2l(np.array([9,9,11.])).astype(np.float32)
    bg = c0*(1-t[...,None]) + c1*t[...,None]
    # Wasser: Ringe um das Zeichen (Höhenfeld aus gedämpften Wellenpaketen)
    U = h  # Maßeinheit = Logohöhe
    r = np.sqrt((xx-cx)**2 + (yy-cy)**2)/U
    hf = np.zeros_like(r)
    lam = 0.11
    # ein Stein: drei Wellenzüge, außen länger und flacher (Dispersion), dazwischen ruhiges Wasser
    for R0, A, sig, l in [(0.86,1.0,0.11,0.10),(1.5,0.5,0.16,0.14),(2.4,0.24,0.24,0.19)]:
        env = np.exp(-((r-R0)/sig)**2)
        hf += A*env*np.cos(2*np.pi*(r-R0)/l)*(l/lam)
    hf *= np.clip((r-0.55)/0.15, 0, 1)  # unter dem Zeichen ruhig
    gy_, gx_ = np.gradient(hf)
    gx_ *= U; gy_ *= U  # Steigung je Logohöhe
    # wie jQuery Ripples: Glanz = max(0, N·L)^4, Licht von oben links (vec3(-0.6, 1.0, 0.4)), zum Hintergrund addiert
    k = 0.42
    nx, ny = -gx_*k*lam/(2*np.pi), -gy_*k*lam/(2*np.pi)
    nz = 1.0
    nn = np.sqrt(nx*nx + ny*ny + nz*nz)
    Lv = np.array([-0.6, -0.4, 1.0]); Lv /= np.linalg.norm(Lv)
    dot = np.clip((nx*Lv[0] + ny*Lv[1] + nz*Lv[2])/nn, 0, 1)
    flat = Lv[2]**4
    spec = (dot**4 - flat)
    bgs = l2s(bg)*255 + (spec*255*0.30)[...,None]*np.array([0.97,0.98,1.0],np.float32)
    a = fg[...,3:4]/255
    out = fg[...,:3]*a + bgs*(1-a)
    rng = np.random.default_rng(1)
    out += rng.random(out.shape, dtype=np.float32) - rng.random(out.shape, dtype=np.float32)
    Image.fromarray(np.clip(np.round(out),0,255).astype(np.uint8)).save(outdir/(name+'.png'), optimize=True)
if sys.argv[1:] == ['preview']:
    make(1280, 720, 'pv')
else:
    make(5120, 2880, 'ES_Hintergrund_5K_5120x2880')
    make(3456, 2234, 'ES_Hintergrund_MacBook_3456x2234')
    make(5120, 1440, 'ES_Hintergrund_Ultrawide_5120x1440', share=0.42)
