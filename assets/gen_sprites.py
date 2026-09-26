#!/usr/bin/env python3
"""
Fractured City: Night Run — sprite atlas generator.
Produces assets/atlas.png + assets/atlas.json (sprite name -> [x,y]) at 32x32 per cell,
plus assets/title.jpg (title screen key art).
Everything is drawn procedurally but deliberately: per-zone terrain palettes, per-enemy
silhouettes, per-item icons. Re-run to regenerate; edit functions to restyle.
"""
import json, math, random, os
from PIL import Image, ImageDraw, ImageFilter

S = 32
OUT = os.path.dirname(os.path.abspath(__file__))
SPRITES = {}   # name -> Image

def C(h, a=255):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c*2 for c in h)
    return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), a)

def mix(c1, c2, t):
    return tuple(int(c1[i]*(1-t)+c2[i]*t) for i in range(3)) + (c1[3] if len(c1) > 3 else 255,)

def shade(c, f):
    return (max(0,min(255,int(c[0]*f))), max(0,min(255,int(c[1]*f))), max(0,min(255,int(c[2]*f))), c[3] if len(c)>3 else 255)

def new(): return Image.new('RGBA', (S, S), (0,0,0,0))

def put(im, x, y, c):
    if 0 <= x < S and 0 <= y < S: im.putpixel((int(x), int(y)), c)

def rect(im, x0, y0, x1, y1, c):
    d = ImageDraw.Draw(im); d.rectangle([x0, y0, x1, y1], fill=c)

def ell(im, x0, y0, x1, y1, c):
    d = ImageDraw.Draw(im); d.ellipse([x0, y0, x1, y1], fill=c)

def line(im, pts, c, w=1):
    d = ImageDraw.Draw(im); d.line(pts, fill=c, width=w)

def poly(im, pts, c):
    d = ImageDraw.Draw(im); d.polygon(pts, fill=c)

def noise(im, box, base, var, seed, density=1.0):
    r = random.Random(seed)
    x0, y0, x1, y1 = box
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            if r.random() <= density:
                f = 1 + (r.random()-0.5)*var
                put(im, x, y, shade(base, f))

def speckle(im, box, col, n, seed):
    r = random.Random(seed)
    x0, y0, x1, y1 = box
    for _ in range(n):
        put(im, r.randint(x0, x1), r.randint(y0, y1), col)

def outline(im, col=(8,8,12,255)):
    src = im.copy(); px = src.load(); o = im.load()
    for y in range(S):
        for x in range(S):
            if px[x, y][3] == 0:
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < S and 0 <= ny < S and px[nx, ny][3] > 140:
                        o[x, y] = col; break
    return im

def shadow(im, cx=16, y=28, w=9, h=3, a=90):
    sh = new(); ell(sh, cx-w, y-h, cx+w, y+h, (0,0,0,a))
    sh.alpha_composite(im); return sh

def reg(name, im): SPRITES[name] = im

# ============================================================
# TERRAIN — per-zone palettes give each district its identity
# ============================================================
ZONES = {
 'ashgrove': dict(wall='#8a6a55', wall2='#6e4f3e', mortar='#3b2e27', floor='#5a4636', floor2='#4a392c', street='#2c2a2b', walk='#4c4844', roof='#2f2622', style='brick', fstyle='plank', accent='#ff6fa8'),
 'marrow':   dict(wall='#a08a5a', wall2='#86734a', mortar='#4a3f2a', floor='#6a5a3a', floor2='#5a4b30', street='#2e2b27', walk='#55504a', roof='#3a3122', style='stucco', fstyle='checker', accent='#ffd27a'),
 'mall':     dict(wall='#6a7a8a', wall2='#566574', mortar='#2e3640', floor='#8a96a2', floor2='#76828e', street='#2a2a2c', walk='#50545a', roof='#2a3038', style='panel', fstyle='tile', accent='#7ad8ff'),
 'sump':     dict(wall='#4a5a55', wall2='#3a4843', mortar='#1f2826', floor='#35443f', floor2='#2b3834', street='#1f2a26', walk='#3a4640', roof='#1a2220', style='stone', fstyle='wet', accent='#8fd6b0'),
 'verge':    dict(wall='#8a6a4a', wall2='#6e543a', mortar='#3a2c20', floor='#4e4234', floor2='#3e342a', street='#29251f', walk='#4a443c', roof='#2c241c', style='corrugated', fstyle='grating', accent='#ff9a4a'),
 'carbon':   dict(wall='#7a8a9a', wall2='#5c6b7a', mortar='#2a323c', floor='#aab4be', floor2='#949fa9', street='#1e2228', walk='#4a5260', roof='#232a33', style='glass', fstyle='marble', accent='#9ae6ff'),
 'docks':    dict(wall='#7a5a4a', wall2='#604538', mortar='#33251e', floor='#6a4e3a', floor2='#573f2e', street='#262322', walk='#4a4038', roof='#2a1f1a', style='boards', fstyle='plank', accent='#e0b070'),
 'static':   dict(wall='#6a5a8a', wall2='#54466e', mortar='#2a2238', floor='#3a2a4a', floor2='#2e2240', street='#1a1428', walk='#3a3050', roof='#1e1830', style='glitch', fstyle='glitch', accent='#c9c9ff'),
}

def t_floor(z, var):
    p = ZONES[z]; im = new(); base = C(p['floor']); b2 = C(p['floor2'])
    fs = p['fstyle']; seed = hash(z)%1000 + var*17
    if fs == 'plank':
        for i in range(4):
            y0 = i*8; c = base if (i+var)%2==0 else mix(base, b2, 0.5)
            noise(im, (0,y0,31,y0+7), c, 0.12, seed+i)
            rect(im, 0, y0+7, 31, y0+7, shade(b2, 0.7))
            off = (i*11+var*5) % 32
            rect(im, off, y0, off, y0+6, shade(b2, 0.7))
    elif fs == 'checker':
        for y in range(2):
            for x in range(2):
                c = base if (x+y)%2==0 else b2
                noise(im, (x*16, y*16, x*16+15, y*16+15), c, 0.08, seed+x+y*2)
        rect(im, 0, 15, 31, 16, shade(b2, 0.75)); rect(im, 15, 0, 16, 31, shade(b2, 0.75))
    elif fs == 'tile':
        noise(im, (0,0,31,31), base, 0.05, seed)
        for k in (0, 16): rect(im, 0, k, 31, k, shade(base, 0.8)); rect(im, k, 0, k, 31, shade(base, 0.8))
        for k in range(3): put(im, 4+k*9+var, 5+k*7, shade(base, 1.2))
    elif fs == 'wet':
        noise(im, (0,0,31,31), base, 0.18, seed)
        r = random.Random(seed)
        for _ in range(2):
            cx, cy = r.randint(6,26), r.randint(6,26)
            ell(im, cx-5, cy-2, cx+5, cy+2, shade(C('#3a6a6a'), 0.9))
            put(im, cx-2, cy-1, C('#6aa0a0'))
    elif fs == 'grating':
        noise(im, (0,0,31,31), base, 0.1, seed)
        for k in range(0, 32, 4): rect(im, 0, k, 31, k, shade(base, 0.6))
        for k in range(0, 32, 8): rect(im, k, 0, k, 31, shade(base, 0.6))
        if var: ell(im, 8, 18, 20, 24, C('#1c1812', 120))
    elif fs == 'marble':
        noise(im, (0,0,31,31), base, 0.05, seed)
        r = random.Random(seed)
        for _ in range(3):
            x, y = r.randint(0,31), r.randint(0,31)
            for s in range(10): x += r.choice((-1,0,1)); y += 1; put(im, x, y, shade(base, 0.85))
        rect(im, 0, 31, 31, 31, shade(base, 0.8)); rect(im, 31, 0, 31, 31, shade(base, 0.8))
    elif fs == 'glitch':
        noise(im, (0,0,31,31), base, 0.1, seed)
        for k in (0, 16): rect(im, 0, k, 31, k, shade(base, 0.7)); rect(im, k, 0, k, 31, shade(base, 0.7))
        r = random.Random(seed)
        for _ in range(2):
            y = r.randint(2, 29); x = r.randint(0, 20)
            rect(im, x, y, x+r.randint(4,10), y, C('#9a8ae0', 160))
    return im

def t_street(z, var):
    p = ZONES[z]; im = new(); base = C(p['street']); seed = hash(z)%999 + var*31
    noise(im, (0,0,31,31), base, 0.22, seed)
    speckle(im, (0,0,31,31), shade(base, 1.5), 10, seed+1)
    r = random.Random(seed)
    if var == 1:
        x, y = r.randint(4, 12), r.randint(4, 10)
        for s in range(14): x += r.choice((0,1,1)); y += r.choice((0,1)); put(im, x, y, shade(base, 0.55))
    if var == 2:
        rect(im, 14, 0, 17, 9, C('#b8a860', 150)); rect(im, 14, 20, 17, 31, C('#b8a860', 150))
    return im

def t_walk(z):
    p = ZONES[z]; im = new(); base = C(p['walk']); seed = hash(z)%777
    for y in range(2):
        for x in range(2):
            noise(im, (x*16, y*16, x*16+15, y*16+15), shade(base, 1 + ((x+y)%2)*0.05), 0.1, seed+x*3+y)
    rect(im, 0, 15, 31, 15, shade(base, 0.65)); rect(im, 15, 0, 15, 31, shade(base, 0.65))
    rect(im, 0, 0, 31, 0, shade(base, 1.2))
    return im

def t_wall_face(z, window=False):
    p = ZONES[z]; im = new(); w1 = C(p['wall']); w2 = C(p['wall2']); m = C(p['mortar']); st = p['style']; seed = hash(z)%555
    if st == 'brick':
        rect(im, 0, 0, 31, 31, m)
        for row in range(8):
            off = 0 if row%2==0 else 4
            for bx in range(-1, 5):
                x0 = bx*8+off; y0 = row*4
                c = w1 if (bx+row)%3 else w2
                noise(im, (max(0,x0), y0, min(31,x0+6), y0+2), c, 0.12, seed+row*7+bx)
    elif st == 'stucco':
        noise(im, (0,0,31,31), w1, 0.12, seed)
        rect(im, 0, 26, 31, 31, w2); rect(im, 0, 26, 31, 26, shade(w2, 0.7))
        speckle(im, (0,0,31,25), shade(w1, 0.8), 14, seed+2)
        line(im, [(5,3),(8,9),(7,14)], shade(w1, 0.6))
    elif st == 'panel':
        rect(im, 0, 0, 31, 31, w1)
        for x0 in (0, 16):
            rect(im, x0+1, 1, x0+14, 30, shade(w1, 1.08)); rect(im, x0, 0, x0, 31, shade(w1, 0.7))
        rect(im, 0, 22, 31, 23, C(p['accent'], 130))
    elif st == 'stone':
        rect(im, 0, 0, 31, 31, m)
        r = random.Random(seed)
        y = 0
        while y < 32:
            h = r.randint(5, 8); x = -r.randint(0, 6)
            while x < 32:
                w = r.randint(7, 12)
                noise(im, (max(0,x+1), y+1, min(31,x+w-1), min(31,y+h-1)), w1 if r.random()<0.6 else w2, 0.15, r.randint(0,999))
                x += w
            y += h
        for k in range(3): put(im, 5+k*9, 29, C('#6aa090'))
    elif st == 'corrugated':
        for x in range(32):
            c = w1 if (x//2)%2==0 else w2
            rect(im, x, 0, x, 31, c)
        noise(im, (0,0,31,31), C('#7a4a2a'), 0.3, seed, 0.08)
        rect(im, 0, 12, 31, 12, shade(w2, 0.6))
    elif st == 'glass':
        rect(im, 0, 0, 31, 31, shade(w2, 0.8))
        for x0 in (1, 11, 21):
            for y0 in (1, 16):
                rect(im, x0, y0, x0+8, y0+13, C('#2a3a4e'))
                line(im, [(x0+1, y0+12), (x0+7, y0+2)], C('#6a8aa8', 180))
    elif st == 'boards':
        for x in range(0, 32, 5):
            noise(im, (x, 0, min(31,x+4), 31), w1 if (x//5)%2 else w2, 0.15, seed+x)
            rect(im, x, 0, x, 31, m)
        for y in (6, 24): rect(im, 0, y, 31, y+1, shade(w2, 0.7))
    elif st == 'glitch':
        rect(im, 0, 0, 31, 31, m)
        for row in range(8):
            off = (row*3) % 8
            for bx in range(-1, 5):
                x0 = bx*8+off; y0 = row*4
                noise(im, (max(0,x0), y0, min(31,x0+6), y0+2), w1 if (bx+row)%2 else w2, 0.12, seed+row*5+bx)
        rect(im, 0, 13, 31, 13, C('#c9c9ff', 140)); rect(im, 7, 21, 25, 21, C('#ff7ad8', 110))
    # ground shadow line
    rect(im, 0, 31, 31, 31, shade(m, 0.6))
    if window:
        # lit/unlit window pane
        rect(im, 8, 5, 23, 22, shade(m, 0.6))
        rect(im, 9, 6, 22, 21, C('#1a2a3a'))
        rect(im, 9, 6, 22, 13, C('#2c4460'))
        rect(im, 15, 6, 16, 21, shade(m, 0.6)); rect(im, 9, 13, 22, 13, shade(m, 0.6))
        line(im, [(10, 12), (14, 7)], C('#8ab4d8', 200))
        rect(im, 7, 22, 24, 23, shade(w1, 1.2))
    return im

def t_wall_top(z, edge=False):
    p = ZONES[z]; im = new(); r = C(p['roof']); seed = 333
    noise(im, (0,0,31,31), r, 0.12, seed)
    speckle(im, (0,0,31,31), shade(r, 1.3), 5, seed)
    if edge: rect(im, 0, 0, 31, 1, shade(C(p['wall']), 0.9)); rect(im, 0, 2, 31, 2, shade(r, 0.7))
    return im

def t_rock(face, var):
    im = new(); base = C('#2a332f'); r = random.Random(50+var)
    noise(im, (0,0,31,31), base, 0.25, 60+var)
    for _ in range(5):
        x, y = r.randint(0, 28), r.randint(0, 28); ell(im, x, y, x+r.randint(3, 8), y+r.randint(2, 5), shade(base, 1.25 if r.random()<0.5 else 0.75))
    if face:
        rect(im, 0, 20, 31, 31, C('#3a4640')); noise(im, (0,20,31,31), C('#3a4640'), 0.2, 70+var)
        for x in range(0, 32, 5): rect(im, x, 21, x, 31, C('#26302b'))
        rect(im, 0, 20, 31, 20, C('#56665e')); rect(im, 0, 31, 31, 31, C('#101412'))
        for k in range(2): put(im, r.randint(3, 28), r.randint(23, 29), C('#6aa090'))
    return im

for z in ZONES:
    reg(f'floor_{z}_0', t_floor(z, 0)); reg(f'floor_{z}_1', t_floor(z, 1))
    reg(f'street_{z}_0', t_street(z, 0)); reg(f'street_{z}_1', t_street(z, 1)); reg(f'street_{z}_2', t_street(z, 2))
    reg(f'walk_{z}', t_walk(z))
    reg(f'wallface_{z}', t_wall_face(z)); reg(f'walltop_{z}', t_wall_top(z)); reg(f'walltopedge_{z}', t_wall_top(z, True)); reg(f'window_{z}', t_wall_face(z, True))

# ---------- shared terrain ----------
reg('rock_0', t_rock(False, 0)); reg('rock_1', t_rock(False, 1)); reg('rockface', t_rock(True, 0))
def t_rubble():
    im = new(); r = random.Random(4)
    for _ in range(14):
        x, y = r.randint(2, 28), r.randint(4, 28); w, h = r.randint(2, 6), r.randint(2, 4)
        c = r.choice([C('#7a6a55'), C('#5a4c3c'), C('#8a8070'), C('#4a4038')])
        ell(im, x, y, x+w, y+h, c); put(im, x+1, y, shade(c, 1.3))
    return outline(im, (20,16,12,200))
reg('rubble', t_rubble())

def t_water(deep, f):
    im = new(); base = C('#16304a') if deep else C('#24506e')
    noise(im, (0,0,31,31), base, 0.1, 5+f)
    for k in range(4):
        y = (k*8 + f*3) % 32; x = (k*13 + f*5) % 24
        rect(im, x, y, x+6, y, C('#5a8ab0' if not deep else '#3a6a90', 200))
    return im
reg('water_0', t_water(False, 0)); reg('water_1', t_water(False, 1))
reg('deep_0', t_water(True, 0)); reg('deep_1', t_water(True, 1))

def t_toxic(f):
    im = new(); noise(im, (0,0,31,31), C('#3a5a1a'), 0.2, 9+f)
    r = random.Random(f+3)
    for _ in range(5):
        x, y = r.randint(3, 28), r.randint(3, 28); ell(im, x-2, y-2, x+2, y+2, C('#8fdc3a', 220)); put(im, x-1, y-1, C('#dfff9a'))
    return im
reg('toxic_0', t_toxic(0)); reg('toxic_1', t_toxic(1))

def t_fire(f):
    im = new(); r = random.Random(f*7+1)
    for layer, col in ((0, '#a02800'), (1, '#ff6a00'), (2, '#ffc040'), (3, '#fff4a0')):
        for _ in range(9 - layer*2):
            x = r.randint(6+layer*2, 25-layer*2); h = r.randint(8, 22) - layer*4
            poly(im, [(x-3+layer, 29), (x+3-layer, 29), (x + r.randint(-2,2), 29-h)], C(col))
    return im
reg('fire_0', t_fire(0)); reg('fire_1', t_fire(1))

def t_echo(f):
    im = new(); noise(im, (0,0,31,31), C('#1c1c3a'), 0.2, 21+f)
    r = random.Random(f+11)
    for _ in range(6):
        y = r.randint(0, 31); x = r.randint(0, 24); rect(im, x, y, x+r.randint(3,9), y, C(r.choice(['#c9c9ff','#ff7ad8','#7affe0']), 200))
    for k in range(3): put(im, r.randint(4,28), r.randint(4,28), C('#ffffff'))
    return im
reg('echo_0', t_echo(0)); reg('echo_1', t_echo(1))

def t_grate():
    im = new(); rect(im, 3, 3, 28, 28, C('#1a2424'));
    for x in range(5, 27, 4): rect(im, x, 4, x+1, 27, C('#4a6a6a'))
    rect(im, 3, 3, 28, 3, C('#6a8a8a')); rect(im, 3, 28, 28, 28, C('#101818'))
    return im
reg('grate', t_grate())

def t_moss():
    im = new(); r = random.Random(8)
    for _ in range(40):
        x, y = r.randint(1, 30), r.randint(1, 30); c = r.choice([C('#d9c4e8', 200), C('#b09ac8', 180), C('#f0e0ff', 220)])
        ell(im, x-1, y-1, x+1, y+1, c)
    return im
reg('moss', t_moss())

def t_glass():
    im = new(); r = random.Random(12)
    for _ in range(12):
        x, y = r.randint(2, 29), r.randint(2, 29)
        poly(im, [(x, y), (x+r.randint(1,4), y+r.randint(-2,2)), (x+r.randint(-2,2), y+r.randint(1,4))], C('#a8d8f0', 200))
    return im
reg('glass', t_glass())

def t_rail():
    im = new();
    for y in range(2, 32, 6): rect(im, 2, y, 29, y+2, C('#4a3a2a'))
    rect(im, 8, 0, 9, 31, C('#8a8a90')); rect(im, 22, 0, 23, 31, C('#8a8a90'))
    rect(im, 8, 0, 8, 31, C('#c0c0c8')); rect(im, 22, 0, 22, 31, C('#c0c0c8'))
    return im
reg('rail', t_rail())

def t_pier():
    im = new()
    for y in range(0, 32, 6):
        noise(im, (0, y, 31, y+4), C('#8a6a4a'), 0.15, y)
        rect(im, 0, y+5, 31, y+5, C('#1a2a3a'))
    put(im, 3, 2, C('#2a1a10')); put(im, 28, 2, C('#2a1a10'))
    return im
reg('pier', t_pier())

def t_graffiti(seed):
    im = new(); r = random.Random(seed)
    cols = ['#ff5fd9', '#5fffd9', '#ffe25f', '#ff7a5f', '#9a7aff']
    c = C(r.choice(cols), 220)
    pts = [(r.randint(4, 12), r.randint(8, 24))]
    for _ in range(6): pts.append((pts[-1][0] + r.randint(1, 5), r.randint(6, 26)))
    line(im, pts, c, 2)
    if seed % 2: ell(im, 18, 6, 27, 15, (0,0,0,0)); d = ImageDraw.Draw(im); d.ellipse([18, 6, 27, 15], outline=C(r.choice(cols), 220), width=2)
    return im
reg('graffiti_0', t_graffiti(1)); reg('graffiti_1', t_graffiti(2)); reg('graffiti_2', t_graffiti(3))

def t_exit():
    im = new()
    for k in range(3):
        y = 6 + k*7; a = 120 + k*45
        poly(im, [(8, y), (16, y+6), (24, y), (24, y+3), (16, y+9), (8, y+3)], C('#ffe27a', a))
    return im
reg('exit', t_exit())

# ============================================================
# OBJECTS (transparent — drawn over the underlying ground)
# ============================================================
def o_door(state):
    im = new()
    if state == 'open':
        rect(im, 4, 2, 27, 31, C('#140f0a')); rect(im, 4, 2, 7, 31, C('#7a5a3a')); rect(im, 4, 2, 4, 31, C('#a07a50'))
        return im
    wood = C('#8a6038') if state != 'locked' else C('#6a3a3a')
    rect(im, 4, 2, 27, 31, shade(wood, 0.6)); rect(im, 6, 3, 25, 31, wood)
    for y in (6, 18): rect(im, 8, y, 23, y+8, shade(wood, 1.15)); rect(im, 8, y+8, 23, y+8, shade(wood, 0.7))
    rect(im, 21, 17, 22, 19, C('#e0c070'))
    if state == 'locked':
        rect(im, 12, 13, 19, 20, C('#c0c0c8')); rect(im, 13, 9, 18, 13, (0,0,0,0)); d = ImageDraw.Draw(im); d.arc([12, 8, 19, 16], 180, 360, fill=C('#c0c0c8'), width=2)
        rect(im, 15, 15, 16, 18, C('#402020')); put(im, 10, 5, C('#ff4040')); put(im, 11, 5, C('#ff4040'))
    return im
reg('door', o_door('closed')); reg('door_open', o_door('open')); reg('door_locked', o_door('locked'))

def o_gate():
    im = new(); rect(im, 1, 2, 30, 31, C('#3a3a44'))
    for x in range(3, 30, 4): rect(im, x, 3, x+1, 30, C('#8a8a99')); put(im, x, 3, C('#c0c0cc'))
    rect(im, 1, 14, 30, 16, C('#6a6a78')); rect(im, 13, 12, 18, 18, C('#d64545')); rect(im, 15, 14, 16, 16, C('#300'))
    return im
reg('gate', o_gate())

def o_terminal(col='#63e2a4'):
    im = new(); rect(im, 6, 20, 25, 29, C('#3a3f44')); rect(im, 6, 20, 25, 20, C('#5a6066'))
    rect(im, 8, 5, 23, 19, C('#22262a')); rect(im, 10, 7, 21, 17, C('#062014'))
    for y in range(8, 17, 2): rect(im, 11, y, 11 + (y*7)%9 + 1, y, C(col))
    rect(im, 9, 23, 22, 25, C('#262a2e'))
    for x in range(10, 22, 2): put(im, x, 24, C('#8a9096'))
    return outline(shadow(im, 16, 29, 10, 2))
reg('terminal', o_terminal()); reg('switch', o_terminal('#ffd06a'))

def o_bed():
    im = new(); rect(im, 5, 4, 26, 29, C('#4a3a2a')); rect(im, 6, 5, 25, 28, C('#6a5aa0'))
    rect(im, 8, 6, 23, 11, C('#e0dcd0')); rect(im, 6, 14, 25, 28, C('#8070c0'));
    for y in range(16, 28, 4): rect(im, 6, y, 25, y, C('#5a4a90'))
    return outline(im)
reg('bed', o_bed())

def o_bench():
    im = new(); rect(im, 3, 10, 28, 20, C('#8a6a3a')); rect(im, 3, 10, 28, 11, C('#b08a50'))
    rect(im, 4, 21, 6, 29, C('#4a3a20')); rect(im, 25, 21, 27, 29, C('#4a3a20'))
    rect(im, 6, 6, 12, 9, C('#9a9aa0')); rect(im, 16, 7, 18, 9, C('#d9b56a')); rect(im, 20, 5, 25, 9, C('#6a7a8a'))
    line(im, [(9, 15), (15, 13)], C('#c0c0c8'))
    return outline(shadow(im, 16, 29, 12, 2))
reg('bench', o_bench())

def o_container(col='#6a6a50'):
    im = new(); c = C(col); rect(im, 6, 4, 25, 28, shade(c, 0.7)); rect(im, 7, 5, 24, 27, c)
    for y in (6, 14, 21): rect(im, 8, y, 23, y+5, shade(c, 1.15)); rect(im, 14, y+2, 17, y+3, C('#d8c080'))
    return outline(shadow(im, 16, 29, 10, 2))
reg('container', o_container())

def o_crate():
    im = new(); c = C('#9a7040'); rect(im, 5, 7, 26, 28, c); rect(im, 5, 7, 26, 9, shade(c, 1.25))
    line(im, [(6, 10), (25, 27)], shade(c, 0.7), 2); line(im, [(25, 10), (6, 27)], shade(c, 0.7), 2)
    rect(im, 5, 7, 6, 28, shade(c, 0.75)); rect(im, 25, 7, 26, 28, shade(c, 0.75))
    return outline(shadow(im, 16, 29, 11, 2))
reg('crate', o_crate())

def o_cache():
    im = new(); rect(im, 7, 12, 24, 27, C('#2a4a4a')); rect(im, 7, 12, 24, 14, C('#4a8a8a'))
    rect(im, 14, 17, 17, 21, C('#a6ffe9'))
    for k in range(6): put(im, 16 + int(10*math.cos(k)), 14 + int(8*math.sin(k)), C('#a6ffe9', 200))
    return outline(shadow(im, 16, 28, 10, 2))
reg('cache', o_cache())

def o_vending():
    im = new(); rect(im, 7, 1, 24, 30, C('#a0305a')); rect(im, 9, 3, 19, 22, C('#2a1020'))
    for y in range(5, 21, 4):
        for x in (10, 14): rect(im, x, y, x+2, y+2, C(random.Random(x*y).choice(['#ffd040', '#40c0ff', '#ff6060', '#80ff80'])))
    rect(im, 20, 5, 22, 12, C('#e0e0e0')); rect(im, 9, 25, 19, 28, C('#100810'))
    rect(im, 7, 1, 24, 1, C('#ff80b0'))
    return outline(im)
reg('vending', o_vending())

def o_lamp():
    im = new(); rect(im, 15, 6, 16, 29, C('#4a4a50')); rect(im, 13, 28, 18, 30, C('#3a3a40'))
    rect(im, 12, 3, 20, 6, C('#5a5a60')); rect(im, 13, 6, 19, 7, C('#ffe9a6'))
    ell(im, 10, 5, 22, 10, C('#ffe9a6', 90))
    return outline(im)
reg('lamp', o_lamp())

def o_barricade():
    im = new();
    line(im, [(3, 26), (28, 10)], C('#a06a3a'), 4); line(im, [(3, 10), (28, 26)], C('#8a5a30'), 4)
    rect(im, 2, 20, 29, 23, C('#c0a040'));
    for x in range(4, 28, 6): rect(im, x, 20, x+2, 23, C('#202020'))
    return outline(shadow(im, 16, 28, 13, 2))
reg('barricade', o_barricade())

def o_car(seed):
    im = new(); r = random.Random(seed); col = C(r.choice(['#6a6a72', '#7a4a3a', '#3a4a6a', '#5a6a4a']))
    rect(im, 2, 9, 29, 26, shade(col, 0.7)); rect(im, 3, 10, 28, 24, col)
    rect(im, 8, 11, 23, 22, shade(col, 0.8)); rect(im, 9, 12, 13, 21, C('#1a2230')); rect(im, 19, 12, 22, 21, C('#1a2230'))
    rect(im, 4, 25, 8, 28, C('#141414')); rect(im, 23, 25, 27, 28, C('#141414'))
    speckle(im, (3, 10, 28, 24), C('#8a4a20'), 12, seed)
    line(im, [(10, 13), (12, 18)], C('#6a7a90'))
    return outline(shadow(im, 16, 28, 14, 3))
reg('car_0', o_car(1)); reg('car_1', o_car(2)); reg('car_2', o_car(3))

def o_helipad():
    im = new(); ell(im, 1, 1, 30, 30, C('#3a3a30')); d = ImageDraw.Draw(im); d.ellipse([2, 2, 29, 29], outline=C('#ffd93d'), width=2)
    rect(im, 10, 9, 12, 22, C('#ffd93d')); rect(im, 19, 9, 21, 22, C('#ffd93d')); rect(im, 12, 15, 19, 16, C('#ffd93d'))
    return im
reg('helipad', o_helipad())

def o_boat():
    im = new(); poly(im, [(3, 12), (28, 12), (25, 24), (6, 24)], C('#8a6a3a')); poly(im, [(5, 13), (26, 13), (24, 20), (7, 20)], C('#c4a26a'))
    rect(im, 7, 13, 24, 13, C('#e0c090')); rect(im, 12, 15, 19, 18, C('#5a4020')); rect(im, 26, 14, 29, 18, C('#404048'))
    return outline(im)
reg('boat', o_boat())

def o_train():
    im = new(); rect(im, 2, 3, 29, 29, C('#6a7a8a')); rect(im, 2, 3, 29, 5, C('#9aaab8'))
    for x in (5, 13, 21): rect(im, x, 8, x+5, 15, C('#1a2230')); line(im, [(x+1, 14), (x+4, 9)], C('#6a8aa8'))
    rect(im, 2, 19, 29, 21, C('#d0a040')); rect(im, 13, 17, 18, 28, C('#4a5a6a'))
    return outline(im)
reg('train', o_train())

def o_pipe():
    im = new(); rect(im, 0, 8, 31, 13, C('#5a6a7a')); rect(im, 0, 8, 31, 9, C('#8a9aaa'))
    rect(im, 0, 18, 31, 22, C('#4a5a6a')); rect(im, 0, 18, 31, 18, C('#7a8a9a'))
    for x in (6, 22): rect(im, x, 7, x+2, 14, C('#3a4a5a')); rect(im, x+4, 17, x+6, 23, C('#3a4a5a'))
    put(im, 12, 23, C('#6aa0c0')); put(im, 12, 25, C('#6aa0c0'))
    return im
reg('pipe', o_pipe())

def o_stall():
    im = new();
    for x in range(2, 30, 4): rect(im, x, 3, x+1, 9, C('#d9a85f')); rect(im, x+2, 3, x+3, 9, C('#a03a2a'))
    rect(im, 2, 9, 29, 10, C('#6a3a20')); rect(im, 3, 14, 28, 24, C('#8a6a40')); rect(im, 3, 14, 28, 15, C('#b08a58'))
    for k, col in enumerate(['#e05a3a', '#e0c040', '#70b050', '#c07ad0']): ell(im, 5+k*6, 11, 8+k*6, 14, C(col))
    rect(im, 4, 25, 5, 29, C('#4a3020')); rect(im, 26, 25, 27, 29, C('#4a3020'))
    return outline(im)
reg('stall', o_stall())

def o_chair():
    im = new(); rect(im, 10, 6, 21, 11, C('#7a7060')); rect(im, 10, 13, 21, 19, C('#8a8070'))
    rect(im, 10, 20, 11, 26, C('#4a4035')); rect(im, 20, 20, 21, 26, C('#4a4035')); rect(im, 10, 12, 21, 12, C('#5a5045'))
    return outline(shadow(im, 16, 26, 7, 2))
reg('chair', o_chair())

def o_table():
    im = new(); ell(im, 4, 8, 27, 22, C('#6a5a48')); ell(im, 5, 8, 26, 20, C('#8a7a60'))
    rect(im, 14, 20, 17, 27, C('#4a3a2a')); ell(im, 9, 11, 13, 14, C('#d0d0d0')); rect(im, 19, 11, 21, 15, C('#a05a30'))
    return outline(shadow(im, 16, 27, 8, 2))
reg('table', o_table())

def o_counter():
    im = new(); rect(im, 0, 8, 31, 24, C('#6a5040')); rect(im, 0, 8, 31, 12, C('#a08a6a')); rect(im, 0, 8, 31, 8, C('#c0aa88'))
    rect(im, 5, 4, 7, 8, C('#4a8a4a')); rect(im, 5, 3, 7, 3, C('#8ac08a')); rect(im, 20, 5, 23, 8, C('#d0d0d8'))
    for x in range(2, 30, 6): rect(im, x, 14, x+3, 22, shade(C('#6a5040'), 0.8))
    return im
reg('counter', o_counter())

def o_shelf():
    im = new(); rect(im, 3, 1, 28, 30, C('#5a4a38'));
    for y in (2, 10, 18, 26): rect(im, 4, y+6, 27, y+7, C('#8a7058'))
    r = random.Random(4)
    for y in (3, 11, 19):
        x = 5
        while x < 26:
            w = r.randint(2, 4); rect(im, x, y+1, x+w-1, y+5, C(r.choice(['#c05a3a', '#3a7ac0', '#c0b040', '#5aa050', '#a0a0a8'])));  x += w+1
    return outline(im)
reg('shelf', o_shelf())

def o_docchair():
    im = new(); rect(im, 13, 22, 18, 29, C('#6a6a70')); poly(im, [(8, 6), (23, 6), (25, 22), (6, 22)], C('#c0507a'))
    rect(im, 10, 3, 21, 8, C('#e070a0')); rect(im, 3, 12, 7, 14, C('#a0a0a8')); rect(im, 24, 12, 28, 14, C('#a0a0a8'))
    line(im, [(26, 2), (26, 11)], C('#a0a0a8')); ell(im, 23, 0, 29, 4, C('#ffffe0'))
    return outline(im)
reg('docchair', o_docchair())

def o_tree():
    im = new(); rect(im, 14, 14, 17, 29, C('#4a3a2a'))
    for (a, b, c, d) in ((15, 16, 6, 6), (16, 15, 26, 7), (15, 20, 5, 12), (16, 19, 27, 13), (15, 12, 12, 2), (16, 12, 20, 3)):
        line(im, [(a, b), (c, d)], C('#5a4a3a'), 2)
    return outline(shadow(im, 16, 29, 6, 2))
reg('tree', o_tree())

def o_sign():
    im = new(); rect(im, 15, 16, 16, 29, C('#5a5a60')); rect(im, 3, 3, 28, 16, C('#2a2a30')); rect(im, 4, 4, 27, 15, C('#e8c95f'))
    for y in (6, 9, 12): rect(im, 6, y, 6 + (y*5)%16 + 4, y, C('#3a2a10'))
    return outline(im)
reg('sign', o_sign())

def o_fence():
    im = new()
    for x in range(0, 32, 4):
        line(im, [(x, 4), (x+4, 26)], C('#8a9a9a'), 1); line(im, [(x+4, 4), (x, 26)], C('#6a7a7a'), 1)
    rect(im, 0, 3, 31, 4, C('#aabbbb')); rect(im, 0, 26, 31, 27, C('#aabbbb')); rect(im, 0, 3, 1, 29, C('#5a6a6a')); rect(im, 30, 3, 31, 29, C('#5a6a6a'))
    return im
reg('fence', o_fence())

def o_altar():
    im = new(); rect(im, 3, 12, 28, 27, C('#e8e8f0')); ell(im, 4, 10, 27, 17, C('#f8f8ff'))
    ell(im, 6, 11, 25, 16, C('#9ab8d0')); ell(im, 9, 12, 22, 15, C('#c0e0f0'))
    for x in (7, 13, 19, 24): rect(im, x, 19, x, 24, C('#8a7aa0'))
    rect(im, 5, 27, 8, 29, C('#b0b0c0')); rect(im, 23, 27, 26, 29, C('#b0b0c0'))
    return outline(im)
reg('altar', o_altar())

def o_generator():
    im = new(); rect(im, 3, 7, 28, 28, C('#8a7030')); rect(im, 3, 7, 28, 9, C('#c0a040'))
    for y in range(12, 26, 3): rect(im, 6, y, 18, y+1, C('#4a3a10'))
    rect(im, 21, 12, 26, 18, C('#1a1a1a')); put(im, 23, 14, C('#ff4040')); put(im, 24, 16, C('#40ff40'))
    rect(im, 22, 3, 24, 7, C('#5a5a5a'))
    return outline(shadow(im, 16, 29, 13, 2))
reg('generator', o_generator())

def o_server():
    im = new(); rect(im, 6, 1, 25, 30, C('#1a2226')); rect(im, 6, 1, 25, 2, C('#3a4a50'))
    for y in range(4, 29, 4):
        rect(im, 8, y, 23, y+2, C('#2a3a40'))
        for x in range(9, 22, 3): put(im, x, y+1, C(random.Random(x+y).choice(['#4ad9c4', '#4ad9c4', '#ff6060', '#ffd040'])))
    return outline(im)
reg('server', o_server())

def o_heart(f):
    im = new()
    for rr, col in ((14, '#30306a'), (11, '#6a6ad8'), (8, '#c9c9ff'), (5, '#ffffff')):
        rr2 = rr + (1 if f else 0) * (rr // 7)
        ell(im, 16-rr2, 16-rr2, 16+rr2, 16+rr2, C(col, 230))
    ell(im, 13, 13, 19, 19, C('#101030')); put(im, 15, 15, C('#ffffff'))
    return im
reg('heart_0', o_heart(0)); reg('heart_1', o_heart(1))

# ============================================================
# CHARACTERS — humanoid builder
# ============================================================
SKIN = ['#e8c0a0', '#c89878', '#a07050', '#6a4a36', '#f0d0b8']
def humanoid(skin, hair, top, pants, boots='#2a2420', acc=(), eyes='#101010', build=1.0, hood=None, robe=None, helmet=None, glow=None, scale=1.0):
    im = new(); sk = C(skin); tp = C(top); pt = C(pants)
    wide = 1 if build > 1.1 else 0; thin = 1 if build < 0.9 else 0
    # legs
    if not robe:
        rect(im, 12-wide, 21, 14, 27, pt); rect(im, 17, 21, 19+wide, 27, shade(pt, 0.85))
        rect(im, 12-wide, 26, 14, 28, C(boots)); rect(im, 17, 26, 19+wide, 28, C(boots))
    # torso
    tx0, tx1 = 10-wide+thin, 21+wide-thin
    if robe:
        rc = C(robe); poly(im, [(tx0, 12), (tx1, 12), (tx1+3, 28), (tx0-3, 28)], rc)
        rect(im, tx1-1, 13, tx1, 27, shade(rc, 0.8)); rect(im, tx0, 27, tx1, 28, shade(rc, 0.7))
    rect(im, tx0, 12, tx1, 21, tp); rect(im, tx1-2, 12, tx1, 21, shade(tp, 0.8)); rect(im, tx0, 12, tx1, 12, shade(tp, 1.15))
    if 'coat' in acc: rect(im, tx0, 12, tx1, 24, shade(tp, 0.95)); rect(im, 15, 13, 16, 24, shade(tp, 0.7))
    if 'belt' in acc or not robe: rect(im, tx0, 20, tx1, 20, shade(tp, 0.55))
    if 'vest' in acc: rect(im, tx0+1, 13, tx1-1, 19, C('#4a5a3a')); rect(im, tx0+2, 14, tx0+4, 16, C('#3a4a2a')); rect(im, tx1-4, 14, tx1-2, 16, C('#3a4a2a'))
    if 'apron' in acc: rect(im, tx0+1, 14, tx1-1, 25, C('#d8d0c8')); speckle(im, (tx0+1, 16, tx1-1, 25), C('#a02020'), 10, 3)
    if 'armor' in acc: rect(im, tx0, 12, tx1, 19, C('#9ab8c8')); rect(im, tx0, 12, tx1, 13, C('#d0e8f0')); rect(im, 14, 15, 17, 17, C('#4a6a80'))
    if 'overalls' in acc: rect(im, tx0+2, 14, tx1-2, 21, C('#3a5a8a')); rect(im, tx0+2, 12, tx0+3, 14, C('#3a5a8a')); rect(im, tx1-3, 12, tx1-2, 14, C('#3a5a8a'))
    if 'medcross' in acc: rect(im, 14, 14, 17, 15, C('#e02020')); rect(im, 15, 13, 16, 16, C('#e02020'))
    if 'armband' in acc: rect(im, 8-wide, 15, 9-wide, 16, C('#ffffff'))
    # arms
    armc = tp if 'sleeveless' not in acc else sk
    rect(im, 8-wide, 13, 9-wide, 20, armc); rect(im, 22+wide, 13, 23+wide, 20, shade(armc, 0.85))
    rect(im, 8-wide, 20, 9-wide, 21, sk); rect(im, 22+wide, 20, 23+wide, 21, sk)
    if 'chromearm' in acc:
        rect(im, 22+wide, 13, 23+wide, 21, C('#b8c8d8')); put(im, 22+wide, 14, C('#ffffff')); put(im, 23+wide, 18, C('#6a8aa0'))
    if 'backpack' in acc: rect(im, tx0-1, 11, tx0, 18, C('#5a4a30')); rect(im, tx1, 11, tx1+1, 18, C('#5a4a30'))
    # head
    ell(im, 11, 3, 20, 12, sk); rect(im, 18, 5, 20, 11, shade(sk, 0.85))
    if hair:
        hc = C(hair); ell(im, 11, 2, 20, 7, hc); rect(im, 11, 4, 12, 8, hc); rect(im, 19, 4, 20, 8, hc)
    if 'mohawk' in acc: rect(im, 15, 0, 16, 5, C(hair or '#ff5fd9'))
    if hood:
        hc = C(hood); ell(im, 10, 2, 21, 11, hc); ell(im, 12, 5, 19, 12, sk); rect(im, 10, 9, 11, 13, hc); rect(im, 20, 9, 21, 13, shade(hc, 0.8))
    if helmet:
        hc = C(helmet); ell(im, 10, 1, 21, 9, hc); rect(im, 10, 5, 21, 7, hc); rect(im, 11, 7, 20, 8, C('#1a2a3a' if 'visor' in acc else helmet))
        put(im, 12, 2, shade(hc, 1.4))
    # eyes
    ec = C(glow) if glow else C(eyes)
    if not (helmet and 'visor' in acc):
        put(im, 13, 8, ec); put(im, 17, 8, ec)
        if glow: put(im, 14, 8, C(glow, 160)); put(im, 18, 8, C(glow, 160))
    elif glow: rect(im, 12, 7, 19, 7, C(glow))
    if 'mask' in acc: rect(im, 12, 9, 19, 12, C('#3a3a3a')); put(im, 13, 11, C('#6a6a6a')); put(im, 18, 11, C('#6a6a6a'))
    if 'bandana' in acc: rect(im, 12, 9, 19, 11, C(top))
    if 'cap' in acc: rect(im, 11, 3, 20, 5, C(top)); rect(im, 11, 5, 22, 5, shade(C(top), 0.7))
    if 'hardhat' in acc: ell(im, 10, 1, 21, 7, C('#e0b020')); rect(im, 9, 5, 22, 6, C('#c09010'))
    if 'jawchrome' in acc: rect(im, 13, 10, 18, 11, C('#c0d0e0'))
    if 'ridges' in acc:
        for y in (5, 7): put(im, 12, y, C('#b090c0')); put(im, 19, y, C('#b090c0'))
    if 'halo' in acc: d = ImageDraw.Draw(im); d.ellipse([9, 0, 22, 4], outline=C('#c9c9ff', 200))
    # weapons / held items (right hand ~ x 23, y 20)
    hx = 23 + wide
    if 'pistol' in acc: rect(im, hx, 18, hx+4, 19, C('#2a2a2e')); rect(im, hx, 19, hx+1, 21, C('#2a2a2e')); put(im, hx+4, 18, C('#6a6a70'))
    if 'rifle' in acc: rect(im, hx-2, 17, hx+7, 18, C('#3a3028')); rect(im, hx+3, 17, hx+7, 17, C('#2a2a2e')); rect(im, hx-1, 19, hx, 20, C('#3a3028'))
    if 'shotgun' in acc: rect(im, hx-1, 17, hx+7, 19, C('#4a3a2a')); rect(im, hx+2, 17, hx+7, 17, C('#6a6a70'))
    if 'blade' in acc: line(im, [(hx, 21), (hx+5, 13)], C('#d8d8e0'), 1); put(im, hx, 21, C('#4a3020'))
    if 'bat' in acc: line(im, [(hx, 22), (hx+5, 11)], C('#a07850'), 2)
    if 'pipe' in acc: line(im, [(hx, 22), (hx+5, 12)], C('#7a7a88'), 2)
    if 'baton' in acc: line(im, [(hx, 22), (hx+4, 14)], C('#303040'), 2); put(im, hx+4, 13, C('#6ef'))
    if 'staff' in acc: rect(im, hx+1, 4, hx+1, 28, C('#8a7a60')); ell(im, hx-1, 2, hx+3, 6, C('#c9c9ff'))
    if 'deck' in acc: rect(im, 5, 18, 10, 22, C('#2a3a4a')); rect(im, 6, 19, 9, 20, C('#6ef'))
    if 'medkit' in acc: rect(im, 4, 18, 9, 23, C('#e0e0e0')); rect(im, 6, 19, 7, 22, C('#e02020')); rect(im, 5, 20, 8, 21, C('#e02020'))
    if 'lantern' in acc: rect(im, 5, 19, 8, 23, C('#ffd050')); put(im, 6, 18, C('#6a6a6a'))
    if 'shield' in acc: d = ImageDraw.Draw(im); d.arc([2, 4, 30, 32], 200, 340, fill=C('#9ae6ff', 200), width=2)
    if 'scalpels' in acc: line(im, [(4, 22), (6, 14)], C('#e0e0e8')); line(im, [(hx+1, 22), (hx+3, 14)], C('#e0e0e8'))
    if 'bottle' in acc: rect(im, hx, 16, hx+2, 21, C('#4a8a3a')); rect(im, hx+1, 14, hx+1, 16, C('#e0c080'))
    im = outline(im)
    return shadow(im, 16, 29, int(8*build), 2)

# ---------- player classes ----------
CLASS_SPR = {
 'streetkid': humanoid('#e8c0a0', '#ff5fd9', '#3a2a4a', '#2a3a5a', acc=('mohawk', 'blade', 'backpack')),
 'soldier':   humanoid('#c89878', '#3a3a2a', '#5a6a4a', '#4a5a3a', acc=('vest', 'pistol', 'cap'), build=1.1),
 'picker':    humanoid('#a07050', None, '#8a6a3a', '#5a4a3a', acc=('backpack', 'pipe', 'bandana'), hood='#6a5a3a'),
 'netjack':   humanoid('#f0d0b8', '#2a2a3a', '#1a2a3a', '#1a1a2a', acc=('deck', 'coat'), glow='#6ef'),
 'medic':     humanoid('#6a4a36', '#1a1a1a', '#e0e0e0', '#4a5a6a', acc=('medcross', 'medkit', 'coat')),
 'bruiser':   humanoid('#c89878', None, '#6a3a2a', '#3a3a3a', acc=('sleeveless', 'bat', 'belt'), build=1.3),
 'listener':  humanoid('#e8c0a0', '#c0c0d8', '#4a4a6a', '#2a2a3a', acc=('halo', 'lantern'), hood='#5a5a8a', glow='#ccf'),
}
for k, im in CLASS_SPR.items(): reg('pc_' + k, im)

# ---------- NPCs ----------
NPC_SPR = {
 'mags':   humanoid('#c89878', '#b0b0b0', '#6a4a3a', '#3a3030', acc=('apron', 'shotgun'), build=1.1),
 'wren':   humanoid('#a07050', '#1a1a1a', '#c04a7a', '#2a2a3a', acc=('chromearm', 'blade'), glow=None),
 'deacon': humanoid('#e8c0a0', '#d0d0d0', '#8a3a5a', '#2a2a2a', acc=('coat', 'chromearm'), glow='#ff6fa8', build=1.1),
 'tallow': humanoid('#f0d0b8', '#6a4a2a', '#c0a050', '#5a4a30', acc=('belt',), build=1.35),
 'juno':   humanoid('#6a4a36', '#3a2a6a', '#2a4a6a', '#2a2a3a', acc=('deck', 'cap'), glow='#6ef'),
 'pim2':   humanoid('#c89878', '#3a3a2a', '#4a5a3a', '#3a4a2a', acc=('rifle', 'vest')),
 'okafor': humanoid('#6a4a36', '#2a2a2a', '#e8e8e8', '#4a5a6a', acc=('coat', 'medcross')),
 'sable':  humanoid('#e8c0a0', '#1a1a1a', '#6a2a6a', '#2a1a2a', acc=('chromearm', 'scalpels'), glow='#f9f'),
 'pim':    humanoid('#a07050', '#4a2a1a', '#8a8a4a', '#4a4a3a', acc=('cap',), build=0.8),
 'ludo':   humanoid('#e8e0f0', None, '#b0a0c0', '#6a5a7a', acc=('ridges',), robe='#b0a0c0', glow='#dbe'),
 'dace':   humanoid('#c89878', '#6a3a1a', '#d07030', '#3a3a3a', acc=('overalls', 'hardhat', 'pipe'), build=1.25),
 'verity': humanoid('#f0d0b8', '#e8e0c0', '#f0f0f0', '#d0d0d0', acc=('armband',), robe='#f0f0f0'),
 'ives':   humanoid('#f0d0b8', '#3a3a3a', '#2a3a4a', '#1a2a3a', acc=('coat',), glow=None),
 'kesh':   humanoid('#a07050', '#e0e0e0', '#5a4a3a', '#3a3a4a', acc=('cap', 'bottle')),
 'cantor': humanoid('#e8e0f0', None, '#8a8ad0', '#4a4a7a', acc=('halo', 'staff'), robe='#8a8ad0', glow='#ffffff'),
}
for k, im in NPC_SPR.items(): reg('npc_' + k, im)

# ---------- enemies ----------
def quad(body, belly, eye, big=False, robot=False, seed=0):
    im = new(); b = C(body); s = 1 if big else 0
    ell(im, 6-s, 13-s, 23+s, 22+s, b); ell(im, 8, 17, 21, 22+s, shade(b, 0.8))
    ell(im, 19, 8-s, 28+s, 17, b); poly(im, [(25+s, 13), (31, 14), (30, 16), (25, 16)], shade(b, 0.9))
    poly(im, [(20, 9-s), (22, 4-s), (23, 9)], shade(b, 0.8)); poly(im, [(24, 9-s), (26, 4-s), (27, 9)], shade(b, 0.8))
    for x in (8, 11, 18, 21): rect(im, x, 21, x+1, 27, shade(b, 0.7))
    line(im, [(6, 15), (2, 10 if not robot else 15)], shade(b, 0.9), 2)
    put(im, 25, 11, C(eye)); put(im, 26, 11, C(eye, 150))
    if robot:
        for x in (10, 14, 18): rect(im, x, 14, x, 20, C('#4a5a6a'))
        rect(im, 12, 12, 17, 13, C('#c0d0e0')); put(im, 8, 16, C('#ff4040'))
    else:
        speckle(im, (7, 13, 22, 20), shade(b, 1.2), 8, seed)
    return shadow(outline(im), 16, 27, 11, 2)

def drone(col, eye):
    im = new(); c = C(col)
    for (x, y) in ((6, 7), (25, 7), (6, 24), (25, 24)):
        ell(im, x-5, y-2, x+5, y+2, C('#c0d0e0', 110)); rect(im, x, y-1, x, y+1, C('#3a3a40'))
    line(im, [(6, 7), (25, 24)], shade(c, 0.6), 2); line(im, [(25, 7), (6, 24)], shade(c, 0.6), 2)
    ell(im, 10, 10, 21, 21, c); ell(im, 11, 10, 20, 15, shade(c, 1.25)); ell(im, 14, 15, 18, 19, C('#101418')); put(im, 16, 17, C(eye)); put(im, 15, 17, C(eye, 160))
    return shadow(outline(im), 16, 30, 7, 1, 60)

def crawler(col, big=False):
    im = new(); c = C(col); s = 3 if big else 0
    for k in range(4):
        y = 14 + k*3; line(im, [(10, y), (3-s, y+4)], shade(c, 0.7)); line(im, [(21, y), (28+s, y+4)], shade(c, 0.7))
    ell(im, 8-s, 10-s, 23+s, 26+s, c); ell(im, 10-s, 11-s, 21+s, 18, shade(c, 1.2))
    ell(im, 11, 6-s, 20, 13, shade(c, 0.9))
    for x in (13, 17): put(im, x, 9-s, C('#ffe040'));
    if big:
        for x in range(8, 24, 4): poly(im, [(x, 12), (x+2, 5), (x+3, 12)], C('#2a4a2a'))
        put(im, 15, 8, C('#ff4040'))
    line(im, [(15, 26+s), (14, 31)], shade(c, 0.8))
    return shadow(outline(im), 16, 27, 11, 2)

def bloat(col, mother=False):
    im = new(); c = C(col)
    if mother:
        for k in range(7):
            a = k/7*math.pi*2; x = 16+int(14*math.cos(a)); y = 18+int(12*math.sin(a)); line(im, [(16, 18), (x, y)], shade(c, 0.6), 3)
        ell(im, 3, 4, 28, 29, c); ell(im, 5, 5, 24, 16, shade(c, 1.15))
        r = random.Random(3)
        for _ in range(7):
            x, y = r.randint(8, 23), r.randint(9, 24); ell(im, x-1, y-1, x+1, y+1, C('#fff8d0')); put(im, x, y, C('#200010'))
        ell(im, 11, 20, 20, 26, C('#400020'));
        for x in range(12, 20, 2): put(im, x, 21, C('#f0e0e0'))
    else:
        ell(im, 5, 8, 26, 29, c); ell(im, 7, 9, 22, 17, shade(c, 1.15)); ell(im, 12, 3, 19, 10, shade(c, 0.9))
        put(im, 14, 6, C('#200010')); put(im, 17, 6, C('#200010'))
        for (a, b2, cc, d) in ((9, 14, 14, 22), (20, 12, 18, 24), (13, 18, 22, 20)): line(im, [(a, b2), (cc, d)], shade(c, 0.7))
        rect(im, 9, 27, 11, 30, shade(c, 0.7)); rect(im, 20, 27, 22, 30, shade(c, 0.7))
    return shadow(outline(im), 16, 29, 12, 2)

def walker(col, shade_mode=False):
    base = humanoid('#ffffff' if shade_mode else '#8a8ad8', None, col, col, boots=col, glow='#ffffff' if not shade_mode else '#ff3060')
    im = base.copy(); px = im.load()
    r = random.Random(9 if shade_mode else 5)
    for y in range(S):
        if y % 3 == 0:
            for x in range(S):
                p = px[x, y]
                if p[3] > 0: px[x, y] = (p[0], p[1], p[2], 90)
    for _ in range(3):
        y0 = r.randint(4, 24); dx = r.choice((-2, 2))
        band = im.crop((0, y0, S, y0+3)); clear = Image.new('RGBA', (S, 3), (0,0,0,0)); im.paste(clear, (0, y0)); im.paste(band, (dx, y0), band)
    return im

def robot(col, eye, boss=False):
    im = new(); c = C(col)
    rect(im, 4, 22, 27, 29, C('#2a2a2e'));
    for x in range(5, 27, 3): put(im, x, 25, C('#6a6a70'))
    rect(im, 6, 8, 25, 22, c); rect(im, 6, 8, 25, 9, shade(c, 1.3)); rect(im, 22, 9, 25, 22, shade(c, 0.8))
    rect(im, 9, 11, 22, 18, C('#101010')); rect(im, 11, 13, 20, 16, C(eye)); rect(im, 14, 13, 17, 16, C('#ffffff'))
    rect(im, 1, 11, 5, 14, shade(c, 0.8)); rect(im, 26, 11, 30, 14, shade(c, 0.8)); rect(im, 0, 14, 2, 20, C('#6a6a70')); rect(im, 29, 14, 31, 20, C('#6a6a70'))
    rect(im, 15, 2, 16, 8, C('#6a6a70')); put(im, 15, 1, C('#ff4040')); put(im, 16, 1, C('#ff4040'))
    return shadow(outline(im), 16, 29, 13, 2)

ENEMY_SPR = {
 'scav_rat':    humanoid('#a07050', None, '#6a5a40', '#4a3a2a', acc=('pipe',), hood='#5a4a30', build=0.85),
 'scav_picker': humanoid('#c89878', '#3a2a1a', '#8a6a40', '#4a3a2a', acc=('pipe', 'bandana'), hood='#7a5a30'),
 'scav_gun':    humanoid('#e8c0a0', '#4a3a2a', '#9a7a40', '#3a3a2a', acc=('pistol', 'mask')),
 'dog':         quad('#8a8a8a', '#6a6a6a', '#ffe040', seed=1),
 'dog_alpha':   quad('#bababa', '#8a8a8a', '#ff4040', big=True, seed=2),
 'saint_runner': humanoid('#a07050', '#ff5fd9', '#d04a8a', '#2a2a3a', acc=('blade', 'mohawk'), build=0.9),
 'saint_blade': humanoid('#c89878', '#1a1a1a', '#c03a7a', '#2a2a3a', acc=('chromearm', 'blade', 'bandana')),
 'saint_gun':   humanoid('#6a4a36', '#1a1a1a', '#b02a6a', '#2a2a3a', acc=('pistol', 'cap')),
 'hands_zealot': humanoid('#f0d0b8', '#d8c8a0', '#e8e8e8', '#c0c0c0', acc=('bat', 'armband')),
 'hands_purifier': humanoid('#f0d0b8', None, '#ffffff', '#d0d0d0', acc=('shotgun', 'mask', 'armband'), helmet='#e0e0e0', build=1.15),
 'hal_sentry':  humanoid('#e8c0a0', None, '#6a8aa0', '#3a4a5a', acc=('armor', 'rifle', 'visor'), helmet='#9ab8c8', glow='#aef'),
 'hal_drone':   drone('#8ab8d8', '#ff3030'),
 'hal_enforcer': humanoid('#e8c0a0', None, '#4a7aa0', '#2a3a4a', acc=('armor', 'blade', 'visor'), helmet='#7cf', glow='#f33', build=1.3),
 'union_picket': humanoid('#c89878', '#4a2a1a', '#c07030', '#3a3a3a', acc=('overalls', 'pipe', 'hardhat'), build=1.15),
 'union_gun':   humanoid('#a07050', '#2a1a1a', '#b06028', '#3a3a3a', acc=('overalls', 'rifle', 'hardhat')),
 'drowned_acolyte': humanoid('#e8e0f0', None, '#c0b0d0', '#8a7a9a', acc=('ridges',), robe='#c0b0d0', glow='#dbe'),
 'drowned_bloat': bloat('#e0b0f0'),
 'crawler':     crawler('#7a9a7a'),
 'stalker':     crawler('#3a6a3a', big=True),
 'ghoul':       humanoid('#d0c8d8', None, '#4a3a4a', '#2a2a2a', acc=('jawchrome', 'chromearm', 'sleeveless'), glow='#f9f', build=0.85),
 'ghoul_king':  humanoid('#d0c8d8', None, '#4a3a4a', '#2a2a2a', acc=('jawchrome', 'chromearm', 'apron', 'scalpels'), glow='#f6f', build=1.3),
 'wirehound':   quad('#7a8a9a', '#5a6a7a', '#ff3030', robot=True),
 'static_walker': walker('#6a6ab8'),
 'echo_shade':  walker('#101018', shade_mode=True),
 'choir_cantor': humanoid('#e8e0f0', None, '#9a9ae0', '#5a5a9a', acc=('halo', 'staff'), robe='#9a9ae0', glow='#ccf'),
 'curator':     robot('#c0a830', '#ee6'),
 'warden':      humanoid('#e8c0a0', None, '#3a6a90', '#1a2a3a', acc=('armor', 'shield', 'blade', 'visor'), helmet='#aef', glow='#aef', build=1.35),
 'bloat_mother': bloat('#f0b8f0', mother=True),
 'shade_ally':  walker('#4a9a5a'),
 'drone_ally':  drone('#6ac08a', '#40ff60'),
}
for k, im in ENEMY_SPR.items(): reg('en_' + k, im)

# ============================================================
# ITEMS — per-item icons from ~60 base shapes, tinted by item colour
# ============================================================
def ic_blade(col, long=False, curved=False):
    im = new(); c = C(col); L = 22 if long else 14
    x0, y0 = 7, 25
    line(im, [(x0, y0), (x0+4, y0-4)], C('#4a3020'), 3)
    tip = (x0+4+L*0.7, y0-4-L*0.7)
    poly(im, [(x0+3, y0-6), (x0+6, y0-3), (int(tip[0]), int(tip[1]))], c)
    line(im, [(x0+4, y0-5), (int(tip[0])-1, int(tip[1])+1)], shade(c, 1.35))
    line(im, [(x0+1, y0-8), (x0+8, y0-1)], C('#8a8a90'), 2)
    return outline(im)

def ic_blunt(col, head=None, nails=False):
    im = new(); c = C(col)
    line(im, [(7, 26), (24, 7)], c, 4); line(im, [(8, 26), (24, 8)], shade(c, 1.3), 1)
    rect(im, 5, 25, 9, 28, shade(c, 0.6))
    if nails:
        for (x, y) in ((18, 9), (21, 12), (16, 13), (22, 7)): put(im, x, y, C('#d0d0d8')); put(im, x+1, y-1, C('#d0d0d8'))
    if head: rect(im, 19, 4, 28, 11, C(head))
    return outline(im)

def ic_axe(col):
    im = new(); line(im, [(8, 27), (22, 6)], C('#8a5a30'), 3)
    poly(im, [(18, 5), (28, 3), (29, 13), (21, 12)], C(col)); line(im, [(28, 3), (29, 13)], C('#e0e0e8'), 2)
    return outline(im)

def ic_hammer(col):
    im = new(); line(im, [(8, 27), (20, 9)], C('#7a5a3a'), 3); poly(im, [(14, 4), (27, 12), (23, 18), (10, 10)], C(col)); line(im, [(14, 4), (10, 10)], shade(C(col), 1.3), 2)
    return outline(im)

def ic_baton(col):
    im = new(); line(im, [(8, 25), (23, 8)], C('#303040'), 4); line(im, [(21, 10), (25, 6)], C(col), 3)
    for (x, y) in ((26, 4), (27, 7), (24, 3)): put(im, x, y, C(col))
    return outline(im)

def ic_chainblade(col):
    im = ic_blade(col, long=True)
    for k in range(0, 14, 3): put(im, 13+k, 17-k, C('#303030'))
    return im

def ic_gun(col, kind):
    im = new(); c = C(col); dk = C('#2a2a30')
    if kind == 'holdout':
        rect(im, 10, 13, 22, 16, c); rect(im, 10, 16, 14, 22, dk); rect(im, 21, 12, 22, 12, c)
    elif kind == 'pistol':
        rect(im, 7, 11, 25, 15, c); rect(im, 7, 11, 25, 11, shade(c, 1.3)); rect(im, 8, 15, 13, 24, dk); rect(im, 14, 15, 16, 18, dk)
    elif kind == 'revolver':
        rect(im, 12, 11, 27, 14, c); ell(im, 9, 10, 16, 17, shade(c, 0.9)); rect(im, 7, 15, 12, 24, C('#6a4a2a')); put(im, 12, 13, C('#000'))
    elif kind == 'smg':
        rect(im, 5, 11, 26, 16, c); rect(im, 11, 16, 14, 25, dk); rect(im, 17, 16, 19, 22, dk); rect(im, 26, 12, 29, 14, dk); rect(im, 2, 12, 5, 15, dk)
    elif kind == 'shotgun':
        rect(im, 2, 12, 20, 16, C('#6a4a2a')); rect(im, 14, 11, 30, 13, c); rect(im, 14, 14, 26, 15, shade(c, 0.8)); rect(im, 2, 16, 7, 21, C('#6a4a2a'))
    elif kind == 'sawedoff':
        rect(im, 5, 12, 16, 16, C('#6a4a2a')); rect(im, 12, 11, 24, 15, c); rect(im, 5, 16, 9, 22, C('#6a4a2a'))
    elif kind == 'rifle':
        rect(im, 1, 13, 18, 16, C('#6a4a2a')); rect(im, 16, 12, 31, 14, c); rect(im, 12, 9, 22, 11, C('#2a2a30')); ell(im, 11, 8, 14, 12, C('#4a8ab0')); rect(im, 1, 16, 6, 20, C('#6a4a2a'))
    elif kind == 'arifle':
        rect(im, 2, 12, 26, 16, c); rect(im, 26, 13, 31, 14, dk); rect(im, 12, 16, 15, 25, dk); rect(im, 2, 16, 7, 20, dk); rect(im, 14, 9, 20, 11, dk)
    elif kind == 'launcher':
        rect(im, 2, 10, 28, 18, c); ell(im, 24, 9, 31, 19, shade(c, 0.8)); ell(im, 26, 11, 30, 17, C('#101010')); rect(im, 10, 18, 13, 25, dk); rect(im, 6, 8, 10, 10, dk)
    elif kind == 'laser':
        rect(im, 3, 12, 25, 17, C('#d0dce8')); rect(im, 25, 13, 30, 15, c); rect(im, 8, 13, 22, 14, c); rect(im, 11, 17, 14, 24, C('#606878')); put(im, 30, 14, C('#ffffff'))
    elif kind == 'rail':
        rect(im, 7, 11, 24, 16, C('#9ab0c8')); rect(im, 14, 12, 30, 13, c); rect(im, 14, 15, 30, 15, c); rect(im, 8, 16, 12, 24, C('#404858'))
    return outline(im)

def ic_bottle(col, rag=False):
    im = new(); c = C(col, 230); rect(im, 12, 12, 20, 27, c); rect(im, 14, 6, 18, 12, c); rect(im, 13, 12, 14, 26, shade(c, 1.4))
    if rag: line(im, [(16, 6), (19, 1)], C('#e0d0b0'), 2); put(im, 19, 0, C('#ff9030')); put(im, 20, 1, C('#ffd040'))
    else: rect(im, 14, 5, 18, 6, C('#c0a060'))
    return outline(im)

def ic_bomb(col, kind):
    im = new(); c = C(col)
    if kind == 'pipe':
        rect(im, 7, 11, 25, 21, C('#6a6a70')); rect(im, 7, 11, 25, 12, C('#9a9aa0')); rect(im, 5, 10, 7, 22, C('#4a4a50')); rect(im, 25, 10, 27, 22, C('#4a4a50'))
        line(im, [(16, 11), (20, 4), (24, 5)], C('#c04040'), 1); put(im, 24, 4, C('#ffd040'))
    elif kind == 'flash':
        rect(im, 11, 9, 21, 27, C('#5a6a4a')); rect(im, 11, 9, 21, 11, C('#8a9a7a')); rect(im, 13, 5, 19, 9, C('#9a9aa0')); rect(im, 19, 5, 24, 7, c)
    elif kind == 'rock':
        ell(im, 7, 11, 25, 25, c); ell(im, 9, 12, 18, 18, shade(c, 1.3)); speckle(im, (9, 13, 23, 23), shade(c, 0.7), 8, 3)
    elif kind == 'breach':
        rect(im, 6, 10, 26, 23, C('#3a3a40')); rect(im, 8, 12, 24, 21, c); rect(im, 12, 14, 20, 19, C('#101010')); put(im, 14, 16, C('#ff3030')); put(im, 18, 16, C('#40ff40'))
    return outline(im)

def ic_ammo(col, kind):
    im = new(); c = C(col)
    if kind == 'box':
        rect(im, 7, 13, 25, 26, C('#5a5a3a')); rect(im, 7, 13, 25, 15, C('#7a7a5a'))
        for x in range(9, 24, 4): rect(im, x, 7, x+2, 13, c); put(im, x+1, 6, shade(c, 1.2))
    elif kind == 'shell':
        for i, x in enumerate((8, 14, 20)):
            rect(im, x, 8+i, x+4, 24, C('#c03a2a')); rect(im, x, 21, x+4, 25, C('#d0b040'))
    elif kind == 'rifle':
        for i, x in enumerate((9, 15, 21)):
            rect(im, x, 7, x+2, 24, C('#c8a040')); poly(im, [(x, 7), (x+2, 7), (x+1, 3)], c)
    elif kind == 'cell':
        rect(im, 10, 6, 22, 27, C('#2a3a4a')); rect(im, 13, 3, 19, 6, C('#8a9aaa')); rect(im, 12, 9, 20, 24, c); rect(im, 12, 9, 20, 13, shade(c, 1.4))
    return outline(im)

def ic_armor(col, kind):
    im = new(); c = C(col)
    if kind in ('vest', 'jacket', 'rags', 'hide'):
        poly(im, [(8, 6), (13, 6), (16, 10), (19, 6), (24, 6), (27, 12), (24, 14), (24, 27), (8, 27), (8, 14), (5, 12)], c)
        line(im, [(16, 10), (16, 27)], shade(c, 0.7))
        if kind == 'vest': rect(im, 10, 15, 14, 19, shade(c, 0.8)); rect(im, 18, 15, 22, 19, shade(c, 0.8))
        if kind == 'rags': speckle(im, (8, 8, 24, 27), shade(c, 0.6), 18, 4)
        if kind == 'hide':
            for y in (13, 18, 23): line(im, [(9, y), (23, y+1)], C('#e0c0f0'))
        if kind == 'jacket': rect(im, 8, 26, 24, 27, shade(c, 0.6)); put(im, 17, 14, C('#d0d0d0')); put(im, 17, 19, C('#d0d0d0'))
    elif kind == 'plate':
        poly(im, [(7, 6), (25, 6), (27, 12), (24, 27), (8, 27), (5, 12)], c); rect(im, 10, 9, 22, 16, shade(c, 1.2)); rect(im, 10, 19, 22, 24, shade(c, 0.85))
        put(im, 9, 8, C('#ffffff'))
    elif kind == 'scrap':
        poly(im, [(7, 6), (25, 6), (27, 12), (24, 27), (8, 27), (5, 12)], C('#6a5a4a'))
        r = random.Random(7)
        for _ in range(6):
            x, y = r.randint(7, 20), r.randint(7, 20); rect(im, x, y, x+r.randint(3, 6), y+r.randint(3, 6), C(r.choice(['#8a8a90', '#7a6a50', '#9a7a5a'])))
        for (x, y) in ((10, 10), (20, 12), (14, 22)): put(im, x, y, C('#d0d0d0'))
    elif kind in ('cap', 'helmet', 'riothelm'):
        ell(im, 6, 8, 25, 24, c); rect(im, 6, 17, 25, 24, (0, 0, 0, 0))
        if kind == 'cap': rect(im, 16, 16, 29, 18, shade(c, 0.7))
        else: rect(im, 5, 16, 26, 18, shade(c, 0.75))
        if kind == 'riothelm': rect(im, 8, 17, 23, 23, C('#3a5a7a', 200))
        put(im, 11, 11, shade(c, 1.4))
    elif kind == 'mask':
        ell(im, 8, 7, 24, 25, c); ell(im, 10, 11, 14, 15, C('#2a4a3a')); ell(im, 18, 11, 22, 15, C('#2a4a3a')); ell(im, 12, 19, 20, 27, C('#3a3a3a')); rect(im, 14, 22, 18, 24, C('#6a6a6a'))
    elif kind in ('satchel', 'backpack', 'framepack'):
        if kind == 'satchel':
            rect(im, 7, 13, 25, 26, c); rect(im, 7, 13, 25, 17, shade(c, 1.2)); line(im, [(9, 13), (16, 4), (23, 13)], shade(c, 0.7), 2); rect(im, 15, 17, 17, 19, C('#d0b060'))
        else:
            big = kind == 'framepack'
            rect(im, 8-big*2, 6, 24+big*2, 28, c); rect(im, 8-big*2, 6, 24+big*2, 11, shade(c, 1.2)); rect(im, 11, 16, 21, 24, shade(c, 0.85))
            if big: rect(im, 5, 4, 6, 29, C('#8a8a90')); rect(im, 26, 4, 27, 29, C('#8a8a90'))
    return outline(im)

def ic_tool(col, kind):
    im = new(); c = C(col)
    if kind == 'flashlight':
        rect(im, 6, 13, 20, 19, C('#3a3a40')); poly(im, [(20, 11), (26, 9), (26, 23), (20, 21)], C('#6a6a70')); rect(im, 26, 10, 27, 22, C('#ffffc0'))
        poly(im, [(28, 10), (31, 4), (31, 28), (28, 22)], C('#ffffc0', 90))
    elif kind == 'lockpicks':
        for k in range(3): line(im, [(6+k*3, 26), (18+k*3, 6)], C('#c0c0c8')); put(im, 18+k*3, 6, C('#ffffff'))
        rect(im, 4, 22, 14, 28, C('#6a3a2a'))
    elif kind == 'toolkit':
        rect(im, 4, 12, 28, 27, C('#b02a2a')); rect(im, 4, 12, 28, 15, C('#d04a4a')); rect(im, 12, 7, 20, 12, (0, 0, 0, 0)); line(im, [(12, 12), (12, 8), (20, 8), (20, 12)], C('#3a3a3a'), 2)
        rect(im, 14, 17, 18, 19, C('#e0e0e0'))
    elif kind == 'deck':
        rect(im, 3, 9, 29, 25, C('#2a3040')); rect(im, 5, 11, 18, 20, C('#061820'))
        for y in (12, 14, 16, 18): rect(im, 6, y, 6 + (y*3)%10 + 2, y, C('#6ef'))
        for x in range(20, 28, 3):
            for y in range(12, 24, 3): rect(im, x, y, x+1, y+1, C('#8a90a0'))
    elif kind == 'radio':
        rect(im, 7, 11, 25, 27, C('#4a4a3a')); rect(im, 9, 13, 18, 24, C('#2a2a20'))
        for y in range(14, 24, 2): rect(im, 10, y, 17, y, C('#6a6a50'))
        ell(im, 19, 13, 23, 17, C('#c0a040')); line(im, [(22, 11), (27, 2)], C('#8a8a8a'))
    elif kind == 'binocs':
        ell(im, 4, 10, 14, 24, C('#2a2a2a')); ell(im, 18, 10, 28, 24, C('#2a2a2a')); rect(im, 13, 14, 19, 18, C('#3a3a3a'))
        ell(im, 6, 12, 12, 18, C('#4a8ab0')); ell(im, 20, 12, 26, 18, C('#4a8ab0'))
    elif kind == 'jammer':
        rect(im, 8, 12, 24, 27, C('#3a2a3a')); rect(im, 10, 15, 22, 20, c)
        for x in (10, 16, 22): line(im, [(x, 12), (x-2+(x%3), 3)], C('#9a9aa0'))
        put(im, 12, 23, C('#ff4040'))
    elif kind == 'scanner':
        rect(im, 9, 5, 23, 28, C('#e0e0e8')); rect(im, 11, 8, 21, 18, C('#06201a')); line(im, [(11, 13), (14, 13), (15, 10), (17, 16), (18, 13), (21, 13)], C('#40ff80'))
        rect(im, 13, 21, 19, 24, C('#e02020'))
    elif kind == 'resonator':
        ell(im, 6, 6, 26, 26, C('#3a3a5a')); d = ImageDraw.Draw(im)
        for r2 in (9, 6, 3): d.ellipse([16-r2, 16-r2, 16+r2, 16+r2], outline=C(col), width=1)
        put(im, 16, 16, C('#ffffff'))
    return outline(im)

def ic_med(col, kind):
    im = new(); c = C(col)
    if kind == 'bandage':
        ell(im, 6, 8, 24, 26, C('#e8e0d0')); ell(im, 11, 13, 19, 21, C('#c8c0b0')); rect(im, 20, 16, 29, 22, C('#e8e0d0')); speckle(im, (21, 17, 28, 21), C('#c03030'), 3, 2)
    elif kind == 'medkit':
        rect(im, 5, 9, 27, 26, C('#e8e8e8')); rect(im, 5, 9, 27, 11, C('#ffffff')); rect(im, 14, 12, 18, 24, C('#e02020')); rect(im, 10, 16, 22, 20, C('#e02020')); rect(im, 13, 5, 19, 9, C('#9a9a9a'))
    elif kind == 'stitch':
        rect(im, 7, 10, 25, 24, C('#4a6a8a')); line(im, [(9, 20), (22, 13)], C('#e0e0e8')); d = ImageDraw.Draw(im); d.arc([18, 8, 26, 16], 90, 270, fill=C('#e0e0e8'))
    elif kind == 'splint':
        rect(im, 8, 4, 12, 28, C('#c09a60')); rect(im, 20, 4, 24, 28, C('#c09a60'));
        for y in (8, 16, 24): rect(im, 7, y, 25, y+2, C('#e8e0d0'))
    elif kind == 'pills':
        rect(im, 10, 8, 22, 27, c); rect(im, 9, 5, 23, 9, C('#f0f0f0')); rect(im, 12, 14, 20, 21, C('#f0f0f0')); rect(im, 13, 16, 19, 17, c)
    elif kind == 'syringe':
        line(im, [(6, 26), (24, 8)], C('#d0e0f0'), 4); line(im, [(9, 23), (19, 13)], c, 2); line(im, [(24, 8), (29, 3)], C('#c0c0c8')); line(im, [(4, 24), (8, 28)], C('#8a8a90'), 2)
    elif kind == 'gel':
        rect(im, 11, 6, 21, 26, c); rect(im, 13, 3, 19, 6, C('#e0e0e0')); rect(im, 12, 12, 20, 18, C('#ffffff')); rect(im, 15, 13, 17, 17, C('#e08030'))
    elif kind == 'nanite':
        rect(im, 11, 6, 21, 27, C('#c0d0e0')); rect(im, 12, 9, 20, 24, c)
        for k in range(8): put(im, 13 + (k*3)%7, 10 + k*2, C('#ffffff'))
    return outline(im)

def ic_food(col, kind):
    im = new(); c = C(col)
    if kind == 'can':
        rect(im, 9, 7, 23, 27, C('#a0a0a8')); rect(im, 9, 11, 23, 22, c); ell(im, 9, 5, 23, 9, C('#d0d0d8')); rect(im, 12, 14, 20, 18, C('#f0e0c0'))
    elif kind == 'ration':
        rect(im, 5, 11, 27, 23, C('#6a7a4a')); rect(im, 5, 11, 27, 13, C('#8a9a6a')); rect(im, 10, 15, 22, 20, C('#d0c090'))
    elif kind == 'jerky':
        for i in range(3): poly(im, [(5+i*3, 22-i*4), (24+i*2, 12-i*4), (27+i*2, 15-i*4), (8+i*3, 25-i*4)], shade(c, 1-i*0.1))
    elif kind == 'chips':
        poly(im, [(8, 5), (24, 5), (26, 27), (6, 27)], c); rect(im, 8, 5, 24, 7, shade(c, 0.7)); ell(im, 11, 12, 21, 21, C('#ffe060'))
    elif kind == 'water':
        rect(im, 11, 9, 21, 28, C('#a0d0f0', 200)); rect(im, 13, 5, 19, 9, C('#a0d0f0', 200)); rect(im, 13, 3, 19, 5, C('#3a6ae0')); rect(im, 11, 15, 21, 20, C('#3a8ae0')); rect(im, 12, 10, 13, 27, C('#e0f0ff'))
    elif kind == 'meat':
        ell(im, 6, 8, 24, 24, c); ell(im, 9, 10, 18, 18, shade(c, 1.3)); line(im, [(22, 21), (28, 27)], C('#f0e8d8'), 3); ell(im, 26, 25, 30, 29, C('#f0e8d8'))
    elif kind == 'stew':
        ell(im, 5, 12, 27, 28, C('#8a6a4a')); ell(im, 6, 11, 26, 19, c); speckle(im, (9, 13, 23, 17), C('#e0c060'), 6, 2); line(im, [(20, 14), (28, 4)], C('#c0c0c8'), 2)
    elif kind == 'beer':
        return ic_bottle(col)
    return outline(im)

def ic_drug(col, kind):
    im = new(); c = C(col)
    if kind == 'vial':
        rect(im, 12, 7, 20, 27, C('#e0f0ff', 180)); rect(im, 13, 13, 19, 26, c); rect(im, 11, 4, 21, 7, C('#3a3a3a')); rect(im, 13, 14, 14, 25, shade(c, 1.4))
    elif kind == 'wire':
        for k in range(3): ell(im, 6+k*7, 12+(k%2)*4, 12+k*7, 18+(k%2)*4, c); put(im, 8+k*7, 14+(k%2)*4, C('#ffffff'))
    elif kind == 'ash':
        poly(im, [(6, 10), (26, 8), (24, 26), (8, 24)], C('#d0c8b8')); ell(im, 11, 12, 21, 21, C('#6a6a6a')); speckle(im, (12, 13, 20, 20), C('#a0a0a0'), 8, 3)
    elif kind == 'bloom':
        for k in range(5):
            a = k/5*math.pi*2; ell(im, 16+int(7*math.cos(a))-4, 16+int(7*math.sin(a))-4, 16+int(7*math.cos(a))+4, 16+int(7*math.sin(a))+4, c)
        ell(im, 12, 12, 20, 20, C('#ffe0ff')); put(im, 16, 16, C('#a040a0'))
    return outline(im)

def ic_mat(col, kind):
    im = new(); c = C(col); r = random.Random(hash(kind) % 100)
    if kind == 'scrap':
        for _ in range(5):
            x, y = r.randint(5, 20), r.randint(8, 22); poly(im, [(x, y), (x+r.randint(4, 8), y+r.randint(-3, 3)), (x+r.randint(2, 7), y+r.randint(3, 7))], C(r.choice(['#8a8a90', '#6a6a70', '#9a7a5a', '#aaaab0'])))
    elif kind == 'circuit':
        rect(im, 5, 7, 27, 25, C('#1a6a3a'));
        for _ in range(8): x, y = r.randint(7, 24), r.randint(9, 22); rect(im, x, y, x+1, y+1, C('#d0b040'))
        rect(im, 12, 12, 19, 19, C('#1a1a1a')); line(im, [(7, 10), (12, 10), (12, 12)], C('#d0b040'))
    elif kind == 'jar':
        rect(im, 9, 9, 23, 27, C('#d0e0d0', 170)); rect(im, 10, 15, 22, 26, c); rect(im, 8, 6, 24, 9, C('#4a4a4a')); put(im, 12, 17, C('#ffffff'))
    elif kind == 'cloth':
        poly(im, [(5, 10), (26, 7), (27, 24), (6, 26)], c); line(im, [(8, 14), (24, 12)], shade(c, 0.7)); line(im, [(8, 19), (25, 18)], shade(c, 0.7))
    elif kind == 'fuel':
        rect(im, 7, 9, 25, 28, c); rect(im, 7, 9, 25, 11, shade(c, 1.3)); rect(im, 19, 4, 23, 9, C('#3a3a3a')); rect(im, 10, 5, 17, 8, (0, 0, 0, 0)); line(im, [(9, 9), (9, 5), (17, 5), (17, 9)], C('#3a3a3a'), 2)
        line(im, [(10, 14), (22, 24)], shade(c, 0.7)); line(im, [(22, 14), (10, 24)], shade(c, 0.7))
    elif kind == 'spool':
        rect(im, 8, 6, 24, 9, C('#6a4a2a')); rect(im, 8, 24, 24, 27, C('#6a4a2a')); rect(im, 10, 9, 22, 24, c)
        for y in range(10, 24, 2): rect(im, 10, y, 22, y, shade(c, 0.75))
    elif kind == 'powder':
        poly(im, [(8, 12), (24, 12), (26, 27), (6, 27)], C('#6a5a4a')); rect(im, 10, 7, 22, 12, C('#5a4a3a')); rect(im, 11, 16, 21, 22, C('#1a1a1a')); put(im, 16, 18, C('#ff4040'))
    return outline(im)

def ic_val(col, kind):
    im = new(); c = C(col)
    if kind == 'chip':
        rect(im, 6, 10, 26, 22, c); rect(im, 6, 10, 26, 12, shade(c, 1.3)); rect(im, 9, 14, 14, 19, C('#d0b040')); rect(im, 17, 15, 24, 16, shade(c, 0.6))
    elif kind == 'jewel':
        d = ImageDraw.Draw(im); d.ellipse([7, 7, 25, 25], outline=C('#e0c050'), width=3); poly(im, [(13, 3), (19, 3), (21, 7), (16, 12), (11, 7)], c)
    elif kind == 'shard':
        rect(im, 11, 4, 21, 28, C('#3a4a6a')); rect(im, 13, 6, 19, 26, c); rect(im, 13, 6, 14, 26, shade(c, 1.4))
    elif kind == 'tooth':
        poly(im, [(10, 8), (22, 8), (21, 18), (19, 26), (17, 18), (15, 18), (13, 26), (11, 18)], C('#f0d040')); put(im, 13, 10, C('#ffffc0'))
    elif kind == 'badge':
        rect(im, 7, 5, 25, 27, C('#e0e8f0')); rect(im, 7, 5, 25, 10, c); rect(im, 10, 13, 16, 20, C('#8a9aaa')); rect(im, 18, 14, 23, 15, C('#5a6a7a')); rect(im, 18, 18, 22, 19, C('#5a6a7a')); rect(im, 13, 2, 19, 5, C('#6a6a70'))
    return outline(im)

def ic_quest(col, kind):
    im = new(); c = C(col)
    if kind == 'package':
        rect(im, 6, 9, 26, 26, C('#a07a4a')); rect(im, 15, 9, 17, 26, C('#e0d0a0')); rect(im, 6, 16, 26, 18, C('#e0d0a0')); rect(im, 6, 9, 26, 10, C('#c09a60'))
        put(im, 9, 12, c); put(im, 10, 12, c)
    elif kind == 'rotor':
        ell(im, 12, 12, 20, 20, C('#4a4a50'))
        for a in (0, 2.09, 4.19): line(im, [(16, 16), (16+int(14*math.cos(a)), 16+int(14*math.sin(a)))], c, 3)
        put(im, 16, 16, C('#ffffff'))
    elif kind == 'outboard':
        rect(im, 9, 3, 23, 14, c); rect(im, 9, 3, 23, 5, shade(c, 1.3)); rect(im, 14, 14, 18, 26, C('#4a4a50')); ell(im, 10, 24, 22, 29, C('#6a6a70'))
    elif kind == 'powercell':
        rect(im, 6, 5, 26, 28, C('#3a3a2a')); rect(im, 9, 8, 23, 25, c); rect(im, 12, 2, 20, 5, C('#8a8a8a')); poly(im, [(17, 10), (12, 17), (16, 17), (14, 23), (20, 15), (16, 15)], C('#1a1a1a'))
    elif kind == 'book':
        rect(im, 6, 5, 25, 27, c); rect(im, 6, 5, 8, 27, shade(c, 0.6)); rect(im, 10, 9, 22, 12, shade(c, 1.3)); rect(im, 24, 7, 25, 25, C('#f0e8d0'))
    elif kind == 'keycard':
        rect(im, 5, 9, 27, 24, c); rect(im, 5, 9, 27, 11, shade(c, 1.3)); rect(im, 8, 14, 13, 20, C('#d0b040')); rect(im, 16, 19, 25, 20, C('#1a1a1a')); ell(im, 22, 12, 25, 15, C('#ffffff'))
    elif kind == 'core':
        ell(im, 5, 5, 27, 27, C('#2a2a3a')); ell(im, 8, 8, 24, 24, c); ell(im, 12, 12, 20, 20, C('#ffffff'))
        for a in range(6): put(im, 16+int(13*math.cos(a)), 16+int(13*math.sin(a)), C('#ffffff'))
    elif kind == 'brain':
        rect(im, 7, 7, 25, 27, C('#b0c0d0', 200)); ell(im, 9, 9, 23, 22, C('#e0a0c0')); line(im, [(16, 9), (16, 22)], C('#b07090')); line(im, [(10, 15), (14, 13), (18, 17), (22, 14)], C('#b07090'))
        rect(im, 7, 24, 25, 27, C('#4a5a6a'))
    elif kind == 'relic':
        poly(im, [(16, 3), (26, 14), (16, 29), (6, 14)], c); poly(im, [(16, 7), (22, 14), (16, 24), (10, 14)], shade(c, 0.7)); ell(im, 13, 11, 19, 17, C('#fff8e0')); put(im, 16, 14, C('#400020'))
    return outline(im)

def ic_chrome(col, kind):
    im = new(); c = C(col); m = C('#b8c8d8')
    if kind == 'eye':
        ell(im, 5, 8, 27, 24, m); ell(im, 9, 10, 23, 22, C('#1a1a2a')); ell(im, 12, 12, 20, 20, c); ell(im, 14, 14, 18, 18, C('#ffffff'))
        line(im, [(27, 16), (31, 16)], C('#6a7a8a'), 2)
    elif kind == 'arm':
        rect(im, 12, 3, 20, 20, m); rect(im, 12, 3, 13, 20, C('#ffffff')); rect(im, 11, 20, 21, 28, shade(m, 0.8))
        for y in (7, 12, 17): rect(im, 12, y, 20, y, C('#5a6a7a'))
        rect(im, 15, 9, 17, 10, c)
    elif kind == 'spine':
        for k in range(6): rect(im, 12, 3+k*4, 20, 5+k*4, m); put(im, 16, 4+k*4, c)
        line(im, [(16, 3), (16, 28)], C('#5a6a7a'))
    elif kind == 'chip':
        rect(im, 8, 8, 24, 24, C('#2a2a3a')); rect(im, 11, 11, 21, 21, c)
        for k in range(9, 24, 3): put(im, k, 6, m); put(im, k, 25, m); put(im, 6, k, m); put(im, 25, k, m)
    elif kind == 'lungs':
        ell(im, 5, 7, 15, 26, m); ell(im, 17, 7, 27, 26, m); rect(im, 15, 3, 17, 14, C('#6a7a8a')); ell(im, 7, 11, 13, 20, c); ell(im, 19, 11, 25, 20, c)
    elif kind == 'blade':
        rect(im, 10, 18, 22, 28, m); poly(im, [(13, 18), (19, 18), (16, 1)], C('#e8f0ff')); line(im, [(16, 3), (16, 17)], c)
    elif kind == 'legs':
        rect(im, 9, 3, 14, 27, m); rect(im, 18, 3, 23, 27, m); rect(im, 9, 13, 14, 15, c); rect(im, 18, 13, 23, 15, c); rect(im, 7, 26, 15, 29, shade(m, 0.7)); rect(im, 17, 26, 25, 29, shade(m, 0.7))
    elif kind == 'plate':
        for y in range(6, 26, 5):
            for x in range(6 + (y % 2) * 3, 24, 6): poly(im, [(x, y), (x+5, y), (x+6, y+3), (x+3, y+5), (x, y+3)], m)
        speckle(im, (6, 6, 26, 26), c, 6, 5)
    elif kind == 'jack':
        rect(im, 10, 5, 22, 20, m); rect(im, 13, 20, 19, 28, C('#4a5a6a')); rect(im, 12, 8, 20, 14, C('#1a1a2a')); rect(im, 14, 10, 18, 12, c)
        line(im, [(16, 28), (16, 31)], c, 2)
    return outline(im)

def ic_flesh(col, kind):
    im = new(); c = C(col)
    r = random.Random(hash(kind) % 50)
    ell(im, 5, 6, 27, 27, c); ell(im, 7, 7, 20, 17, shade(c, 1.2))
    for _ in range(4): line(im, [(r.randint(7, 25), r.randint(8, 25)), (r.randint(7, 25), r.randint(8, 25))], shade(c, 0.7))
    if kind == 'eyes':
        for (x, y) in ((11, 13), (19, 12), (15, 20)): ell(im, x-2, y-2, x+2, y+2, C('#fff8e0')); put(im, x, y, C('#200010'))
    elif kind == 'bone':
        for y in (10, 16, 22): rect(im, 8, y, 24, y+1, C('#f0e8d0'))
    elif kind == 'maw':
        ell(im, 10, 13, 22, 23, C('#400020'))
        for x in range(11, 22, 2): put(im, x, 14, C('#f0e8e0')); put(im, x, 22, C('#f0e8e0'))
    elif kind == 'blood': ell(im, 12, 12, 20, 20, C('#a01030'))
    elif kind == 'sinew':
        for y in range(9, 25, 3): line(im, [(8, y), (24, y+2)], C('#c04050'))
    elif kind == 'gland': ell(im, 12, 12, 20, 20, C('#e0e060')); put(im, 15, 15, C('#ffffff'))
    elif kind == 'mantle':
        for x in range(8, 24, 4): poly(im, [(x, 10), (x+2, 3), (x+3, 10)], shade(c, 0.8))
    return outline(im)

ITEM_ICON = {
 'shiv': (ic_blade, ('#aaaaaa',)), 'knife': (ic_blade, ('#d8d8e0',)), 'pipe': (ic_blunt, ('#8a8a99',)), 'bat': (ic_blunt, ('#b98a60',)),
 'nailbat': (ic_blunt, ('#b98a60', None, True)), 'machete': (ic_blade, ('#dddd99', True)), 'crowbar': (ic_blunt, ('#7a88aa', '#7a88aa')),
 'fireaxe': (ic_axe, ('#e05555',)), 'sledge': (ic_hammer, ('#9a9a9a',)), 'stunbaton': (ic_baton, ('#66eeff',)), 'chainblade': (ic_chainblade, ('#ff88aa',)),
 'blade_arm_wpn': (ic_chrome, ('#ff99cc', 'blade')),
 'holdout': (ic_gun, ('#bbbbbb', 'holdout')), 'pistol': (ic_gun, ('#9a9aa2', 'pistol')), 'revolver': (ic_gun, ('#b0a0a0', 'revolver')), 'smg': (ic_gun, ('#7a7a8a', 'smg')),
 'shotgun': (ic_gun, ('#8a8a90', 'shotgun')), 'sawedoff': (ic_gun, ('#8a8a90', 'sawedoff')), 'rifle': (ic_gun, ('#6a6a70', 'rifle')), 'arifle': (ic_gun, ('#4a5a4a', 'arifle')),
 'scraplauncher': (ic_gun, ('#c07a40', 'launcher')), 'laser': (ic_gun, ('#66ffff', 'laser')), 'railpistol': (ic_gun, ('#aaeeff', 'rail')),
 'molotov': (ic_bottle, ('#6a9a3a', True)), 'pipebomb': (ic_bomb, ('#ff5555', 'pipe')), 'flashbang': (ic_bomb, ('#ffff88', 'flash')), 'rock': (ic_bomb, ('#888888', 'rock')), 'breach': (ic_bomb, ('#ff66aa', 'breach')),
 '9mm': (ic_ammo, ('#e0c050', 'box')), 'shell': (ic_ammo, ('#e09660', 'shell')), 'rifle_rd': (ic_ammo, ('#c0c0c0', 'rifle')), 'cell': (ic_ammo, ('#66ffff', 'cell')),
 'rags': (ic_armor, ('#776655', 'rags')), 'jacket': (ic_armor, ('#6a5a4a', 'jacket')), 'leather': (ic_armor, ('#5a3a2a', 'jacket')), 'padded': (ic_armor, ('#5a6a4a', 'vest')),
 'kevlar': (ic_armor, ('#3a4a3a', 'vest')), 'riot': (ic_armor, ('#3a4a6a', 'plate')), 'scrapplate': (ic_armor, ('#6a5a4a', 'scrap')), 'halplate': (ic_armor, ('#9ab8d8', 'plate')),
 'drownhide': (ic_armor, ('#b090c0', 'hide')), 'cap': (ic_armor, ('#5a5a8a', 'cap')), 'helmet': (ic_armor, ('#5a6a4a', 'helmet')), 'riothelm': (ic_armor, ('#3a4a6a', 'riothelm')),
 'gasmask': (ic_armor, ('#5a6a5a', 'mask')), 'satchel': (ic_armor, ('#8a6a40', 'satchel')), 'backpack': (ic_armor, ('#5a6a3a', 'backpack')), 'framepack': (ic_armor, ('#7a5a3a', 'framepack')),
 'flashlight': (ic_tool, ('#ffffc0', 'flashlight')), 'lockpicks': (ic_tool, ('#c0c0c8', 'lockpicks')), 'toolkit': (ic_tool, ('#d04a4a', 'toolkit')), 'deck': (ic_tool, ('#66eeff', 'deck')),
 'radio': (ic_tool, ('#99bbdd', 'radio')), 'binocs': (ic_tool, ('#4a8ab0', 'binocs')), 'jammer': (ic_tool, ('#ff99ff', 'jammer')), 'medscanner': (ic_tool, ('#40ff80', 'scanner')), 'resonator': (ic_tool, ('#ccccff', 'resonator')),
 'bandage': (ic_med, ('#e8e0d0', 'bandage')), 'medkit': (ic_med, ('#e02020', 'medkit')), 'stitch': (ic_med, ('#4a6a8a', 'stitch')), 'splint': (ic_med, ('#c09a60', 'splint')),
 'antibiotics': (ic_med, ('#40a0e0', 'pills')), 'painkillers': (ic_med, ('#e0e040', 'pills')), 'burngel': (ic_med, ('#e08030', 'gel')), 'antitoxin': (ic_med, ('#60e060', 'syringe')),
 'stim': (ic_med, ('#ffff60', 'syringe')), 'nanite': (ic_med, ('#60c0ff', 'nanite')),
 'canned': (ic_food, ('#c05a3a', 'can')), 'ration': (ic_food, ('#6a7a4a', 'ration')), 'jerky': (ic_food, ('#8a4a2a', 'jerky')), 'chips': (ic_food, ('#e04a4a', 'chips')),
 'water': (ic_food, ('#3a8ae0', 'water')), 'meat': (ic_food, ('#b04a4a', 'meat')), 'stew': (ic_food, ('#a05a30', 'stew')), 'beer': (ic_food, ('#8a6a20', 'beer')),
 'glide': (ic_drug, ('#88ffff', 'vial')), 'wire': (ic_drug, ('#ffff88', 'wire')), 'ash': (ic_drug, ('#cccccc', 'ash')), 'bloom': (ic_drug, ('#ffaaff', 'bloom')),
 'scrap': (ic_mat, ('#8a8a90', 'scrap')), 'electronics': (ic_mat, ('#1a6a3a', 'circuit')), 'chems': (ic_mat, ('#8ae060', 'jar')), 'cloth': (ic_mat, ('#c0b090', 'cloth')),
 'fuel': (ic_mat, ('#c03a2a', 'fuel')), 'wire_spool': (ic_mat, ('#d08040', 'spool')), 'powder': (ic_mat, ('#3a3a3a', 'powder')),
 'credchip': (ic_val, ('#3a6ab0', 'chip')), 'jewelry': (ic_val, ('#60e0ff', 'jewel')), 'datashard': (ic_val, ('#40ffc0', 'shard')), 'goldtooth': (ic_val, ('#f0d040', 'tooth')), 'corpbadge': (ic_val, ('#9ae6ff', 'badge')),
 'wren_package': (ic_quest, ('#ff6fa8', 'package')), 'rotor': (ic_quest, ('#ffd93d', 'rotor')), 'avgas': (ic_mat, ('#e0c030', 'fuel')), 'outboard': (ic_quest, ('#d08030', 'outboard')),
 'powercell': (ic_quest, ('#ffd040', 'powercell')), 'shard': (ic_val, ('#ccccff', 'shard')), 'ledger': (ic_quest, ('#8a6a20', 'book')), 'dossier': (ic_quest, ('#c04030', 'book')),
 'halkey': (ic_quest, ('#9ae6ff', 'keycard')), 'ascension': (ic_quest, ('#ff66ff', 'core')), 'neuralunit': (ic_quest, ('#e0a0c0', 'brain')), 'relic': (ic_quest, ('#f0b8f0', 'relic')), 'mallkey': (ic_quest, ('#eeee66', 'keycard')),
 'c_optic': (ic_chrome, ('#ff4040', 'eye')), 'c_reflex': (ic_chrome, ('#ffd040', 'spine')), 'c_subderm': (ic_chrome, ('#66eeff', 'plate')), 'c_arms': (ic_chrome, ('#66eeff', 'arm')),
 'c_neural': (ic_chrome, ('#ff66ff', 'chip')), 'c_target': (ic_chrome, ('#40ff40', 'eye')), 'c_lungs': (ic_chrome, ('#60c0ff', 'lungs')), 'c_spine': (ic_chrome, ('#ffa040', 'spine')),
 'c_blade': (ic_chrome, ('#ff99cc', 'blade')), 'c_jack': (ic_chrome, ('#66eeff', 'jack')), 'c_legs': (ic_chrome, ('#ffd040', 'legs')), 'c_dermal': (ic_chrome, ('#aaaaff', 'plate')),
 'f_bone': (ic_flesh, ('#e0c8c0', 'bone')), 'f_blood': (ic_flesh, ('#d06080', 'blood')), 'f_eyes': (ic_flesh, ('#e0b0d0', 'eyes')), 'f_sinew': (ic_flesh, ('#d08090', 'sinew')),
 'f_gland': (ic_flesh, ('#c0b0e0', 'gland')), 'f_mantle': (ic_flesh, ('#b090c0', 'mantle')), 'f_maw': (ic_flesh, ('#d070a0', 'maw')),
}
for iid, (fn, args) in ITEM_ICON.items():
    reg('it_' + iid, fn(*args))

# generic floor-pile & misc
def misc_wounded():
    im = humanoid('#c89878', '#3a2a1a', '#6a5a4a', '#3a3a3a').rotate(90)
    speckle(im, (6, 8, 26, 26), C('#a01010'), 16, 2)
    return im
reg('obj_wounded', misc_wounded())
reg('obj_civilian', humanoid('#e8c0a0', '#6a4a2a', '#7a7a8a', '#4a4a5a', build=0.8))
reg('obj_caravan', o_crate())

def trap():
    im = new();
    for a in range(8): line(im, [(16, 16), (16+int(10*math.cos(a*0.785)), 16+int(10*math.sin(a*0.785)))], C('#8a8a90'), 1)
    ell(im, 12, 12, 20, 20, C('#5a5a60')); put(im, 16, 16, C('#ff4040'))
    return outline(im)
reg('trap', trap())

def fx_proj():
    im = new(); ell(im, 13, 13, 18, 18, C('#ffe080')); ell(im, 14, 14, 17, 17, C('#ffffff')); return im
reg('fx_bullet', fx_proj())
def fx_slash():
    im = new(); d = ImageDraw.Draw(im); d.arc([3, 3, 29, 29], 200, 320, fill=C('#ffffff'), width=3); d.arc([6, 6, 26, 26], 210, 310, fill=C('#ffd0a0'), width=1); return im
reg('fx_slash', fx_slash())
def fx_blood():
    im = new(); speckle(im, (6, 6, 26, 26), C('#a01010', 200), 30, 5); ell(im, 11, 12, 19, 18, C('#8a0a0a', 200)); return im
reg('fx_blood', fx_blood())
def fx_select():
    im = new(); c = C('#ffe27a')
    for (x, y, dx, dy) in ((1, 1, 1, 1), (30, 1, -1, 1), (1, 30, 1, -1), (30, 30, -1, -1)):
        for k in range(6): put(im, x+dx*k, y, c); put(im, x, y+dy*k, c)
    return im
reg('fx_select', fx_select())

# ============================================================
# PACK ATLAS
# ============================================================
names = sorted(SPRITES.keys())
COLS = 24
rows = (len(names) + COLS - 1) // COLS
atlas = Image.new('RGBA', (COLS*S, rows*S), (0, 0, 0, 0))
index = {}
for i, n in enumerate(names):
    x, y = (i % COLS) * S, (i // COLS) * S
    atlas.paste(SPRITES[n], (x, y), SPRITES[n])
    index[n] = [x, y]
atlas.save(os.path.join(OUT, 'atlas.png'), optimize=True)
with open(os.path.join(OUT, 'atlas.json'), 'w') as f: json.dump({'size': S, 'sprites': index}, f, separators=(',', ':'))

# large preview for inspection
atlas.resize((atlas.width*2, atlas.height*2), Image.NEAREST).save(os.path.join(OUT, 'atlas_preview.png'))

# ============================================================
# TITLE ART — a skyline in rain, one window that is still on
# ============================================================
def title_art():
    W, H = 1280, 720; im = Image.new('RGB', (W, H), (8, 8, 12)); d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H; col = mix(C('#07070c'), C('#3a1e2a'), t**1.8); d.line([(0, y), (W, y)], fill=col[:3])
    r = random.Random(42)
    # haze glow
    glow = Image.new('RGB', (W, H), (0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse([W*0.2, H*0.55, W*0.8, H*1.2], fill=(90, 40, 50)); glow = glow.filter(ImageFilter.GaussianBlur(120))
    im = Image.blend(im, Image.eval(glow, lambda v: v), 0.0); im = Image.composite(im, im, Image.new('L', (W, H), 255))
    from PIL import ImageChops
    im = ImageChops.add(im, glow)
    d = ImageDraw.Draw(im)
    for layer, (base, dark, hmin, hmax) in enumerate(((0.62, (22, 18, 28), 120, 300), (0.72, (14, 12, 18), 160, 420), (0.86, (6, 6, 9), 200, 520))):
        x = -20
        while x < W:
            w = r.randint(40, 110); h = r.randint(hmin, hmax); top = int(H*base) - h + 200*layer//2
            d.rectangle([x, top, x+w, H], fill=dark)
            if r.random() < 0.3: d.rectangle([x+w//2-2, top-r.randint(20, 60), x+w//2+1, top], fill=dark)
            for wy in range(top+8, H-10, 14):
                for wx in range(x+6, x+w-6, 10):
                    if r.random() < (0.05 if layer == 2 else 0.12):
                        c = r.choice([(255, 210, 120), (255, 180, 90), (140, 200, 255), (255, 110, 170)])
                        f = 0.35 + 0.4*r.random() - layer*0.12
                        d.rectangle([wx, wy, wx+4, wy+6], fill=tuple(int(v*f) for v in c))
            x += w + r.randint(-6, 8)
    # the one window
    d.rectangle([905, 470, 911, 479], fill=(255, 235, 170))
    halo = Image.new('RGB', (W, H), (0, 0, 0)); hd = ImageDraw.Draw(halo); hd.ellipse([880, 445, 936, 505], fill=(120, 90, 40)); halo = halo.filter(ImageFilter.GaussianBlur(14))
    im = ImageChops.add(im, halo)
    # rain
    d = ImageDraw.Draw(im)
    for _ in range(1400):
        x, y = r.randint(0, W), r.randint(0, H); L = r.randint(8, 22); a = r.randint(40, 110)
        d.line([(x, y), (x-3, y+L)], fill=(a, a, a+20))
    # vignette
    vig = Image.new('L', (W, H), 0); vd = ImageDraw.Draw(vig); vd.ellipse([-W*0.2, -H*0.3, W*1.2, H*1.3], fill=255); vig = vig.filter(ImageFilter.GaussianBlur(160))
    im = Image.composite(im, Image.new('RGB', (W, H), (0, 0, 0)), vig)
    im.save(os.path.join(OUT, 'title.jpg'), quality=78, optimize=True)
title_art()

print(f'{len(names)} sprites, atlas {atlas.width}x{atlas.height}')
