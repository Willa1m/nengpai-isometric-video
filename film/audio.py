"""资产焕新岛 — soundtrack. mgaudio custom composition, D major, 120 bpm, grid anchored on the deal (5.80 s);
the gavel strike (0.30) and every bar line (1.80 / 3.80 / 5.80 / 7.80) sit on the same grid. All timing from cues.json.
Warm FM/sampled marimba melody over a glass pad, soft kick + shaker groove; tactile wood for every landing."""
import sys, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'ref', 'lib', 'audio'))
import numpy as np
import mgaudio as mg
from mgaudio import synth, drums, sfx, seq, fm, samples as SM
from mgaudio.theory import midi

cues = json.load(open(os.path.join(HERE, 'cues.json')))
BPM = cues['bpm']; B = 60 / BPM; BAR = 4 * B
DEAL = cues['deal']; ST = cues['strike']; F = cues['final']
m = mg.Mix(10.0, bpm=BPM, anchor=DEAL)
m.group('music').level = -20
g = m.grid
N = lambda s: midi(s) if isinstance(s, str) else s
MAR = SM.inst('marimba'); GLK = SM.inst('glock')
def mar(n, v=0.7, d=None): return MAR.play(N(n), d, v)
def glk(n, v=0.6):
    n = N(n); return GLK.play(n, None, v) if 79 <= n <= 108 else fm.bell(n, 1.2, v, 'glock')

# ------------------------------------------------------------------ harmony
CH = {
    'Bm7': ['B2', 'D4', 'F#4', 'A4'], 'Asus': ['A2', 'D4', 'E4', 'A4'], 'A': ['A2', 'C#4', 'E4', 'A4'],
    'Gmaj7': ['G2', 'B3', 'D4', 'F#4'], 'Dmaj7': ['D3', 'F#4', 'A4', 'C#5'], 'Em7': ['E3', 'G4', 'B4', 'D5'],
    'Dmaj9': ['D3', 'F#4', 'A4', 'C#5', 'E5'], 'D/F#': ['F#2', 'D4', 'F#4', 'A4'],
}
SEG = [(0.3, 1.8, 'Bm7'), (1.8, 2.8, 'Gmaj7'), (2.8, 3.8, 'D/F#'), (3.8, 4.8, 'Bm7'), (4.8, 5.8, 'Asus'),
       (5.8, 6.8, 'Dmaj7'), (6.8, 7.8, 'Gmaj7'), (7.8, 8.3, 'Em7'), (8.3, 8.8, 'A'), (8.8, 10.0, 'Dmaj9')]
ROOT = {'Bm7': 'B1', 'Asus': 'A1', 'A': 'A1', 'Gmaj7': 'G1', 'Dmaj7': 'D2', 'Em7': 'E2', 'Dmaj9': 'D2', 'D/F#': 'F#1'}

pad = m.track('pad', level=-25, sends={'hall': -9})
for a, b, c in SEG:
    pad.add(synth.pad([N(n) for n in CH[c]], b - a + 0.4, 0.75, 'glass'), a)
pad.automate('lpf', [(0, 700), (1.8, 1600), (5.7, 4200), (5.8, 9000), (7.7, 9000), (8.3, 2600), (8.8, 7000), (10, 5200)])
pad.automate('gain', [(0, -14), (0.35, -6), (1.8, -2), (7.8, -1), (8.4, -5), (8.8, 0), (10, 0)])

# ------------------------------------------------------------------ HOOK: gavel falls, knocks at 0.30
m.sfx(sfx.swish(0.28, direction=-1, seed=2), at=ST - 0.05, gain=-12)
def knock(t, g0=0.0):
    m.sfx(drums.woodblock('block', 1.0).loud(-18), at=t, gain=g0 - 1, verb=-12)
    m.sfx(sfx.click('wood'), at=t, gain=g0 - 2)
    m.sfx(sfx.impact('thud', size=0.55), at=t, gain=g0 - 4)
    m.sfx(drums.tom('low', 0.9, 'acoustic').loud(-18), at=t, gain=g0 - 7)
    m.sfx(sfx.stamp('wood'), at=t, gain=g0 - 6)
knock(ST)
m.sfx(sfx.sub_drop(0.6, 80, 40), at=ST, gain=-10)
m.sfx(sfx.whoosh(0.9, 'soft', direction=1, peak=0.15, seed=4), at=ST + 0.12, gain=-15)     # red ripple runs out
m.sfx(sfx.swell(mar('B4', 0.5), 0.5), at=ST + 0.02, gain=-14)

# tiles: granular wood clicks per ring + rising marimba notes (16ths)
ev = m.track('events', level=-19.5, sends={'delay8': -14, 'room': -12})
R = np.random.default_rng(7)
ring_notes = ['B4', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6']
for k, t in enumerate(cues['tile_clicks']):
    n = 3 + k
    for i in range(n):
        dt = (i / n) * 0.1 + R.uniform(-0.004, 0.004)
        m.sfx(sfx.click('wood'), at=t + dt, gain=-15 - (i > 0) * 3 + R.uniform(-1.5, 1.5), pan=float(np.sin(i * 2.4) * (0.2 + 0.08 * k)))
    ev.add(mar(ring_notes[k], 0.45 + 0.04 * k), t, pan=-0.3 + 0.08 * k)
# dormant assets: dull, muted thunks (grey = no tone)
for k, (key, t) in enumerate(sorted(cues['dormant'].items(), key=lambda kv: kv[1])):
    m.sfx(sfx.impact('soft', size=0.45), at=t, gain=-7, pan=[-0.2, -0.5, 0.5, 0.15][k])
    m.sfx(drums.woodblock('muyu', 0.6).loud(-18), at=t, gain=-13)
# the island body extrudes
m.sfx(sfx.impact('thud', size=0.8), at=cues['base_rise'] + 0.12, gain=-6)
m.sfx(sfx.whoosh(0.4, 'heavy', direction=-1, seed=5), at=cues['base_rise'] + 0.1, gain=-14)

# ------------------------------------------------------------------ BUILD (1.80): courthouse grows, colour floods
CT = cues['court']
m.sfx(sfx.impact('punch', size=0.6), at=CT['base'], gain=-5)
for k, (t, n) in enumerate([(CT['walls'], 'D4'), (CT['cols'], 'F#4'), (CT['cols'] + 0.07, 'A4'), (CT['cols'] + 0.14, 'B4'), (CT['beam'], 'D5'), (CT['roof'], 'F#5')]):
    ev.add(mar(n, 0.7), t, pan=-0.2 + 0.08 * k)
    m.sfx(sfx.click('wood'), at=t - 1 / 30, gain=-11)
m.sfx(sfx.impact('soft', size=0.5), at=CT['roof'] + 0.02, gain=-8)
m.track('glock', level=-25, sends={'plate': -10}).add(glk('A6', 0.7), CT['emblem']).add(glk('D7', 0.5), CT['emblem'] + 0.125)
m.sfx(sfx.sparkle(1.6, 12, 'D', 'major_pentatonic', seed=5), at=cues['flood_t0'], gain=-13)
# data streams launch -> assets revive
for k, (key, t) in enumerate(sorted(cues['streams'].items(), key=lambda kv: kv[1])):
    pan = {'factory': -0.5, 'machines': 0.5, 'tower': -0.2, 'jade': 0.3}[key]
    m.sfx(sfx.data_chirp(5, seed=10 + k), at=t + 0.05, gain=-14, pan=pan * 0.5)
    m.sfx(sfx.pop('bubble', pitch=1.0 + 0.12 * k), at=t + cues['stream_travel'], gain=-7, pan=pan)
    ev.add(glk(['F#6', 'A6', 'B6', 'D7'][k], 0.5), t + cues['stream_travel'], pan=pan)
# new houses pop up with the flood (soft pops, pentatonic)
for k, t in enumerate(np.arange(2.55, 3.55, 0.125)):
    m.sfx(sfx.pop('soft', pitch=[1.0, 1.122, 1.26, 1.498, 1.682, 2.0, 1.682, 2.245][k % 8]), at=float(t), gain=-12, pan=float(np.sin(k * 1.9) * 0.5))
m.sfx(sfx.blip('A5', 'tri', 0.07), at=cues['trucks'] + 0.15, gain=-15, pan=0.2)
m.sfx(sfx.blip('D6', 'tri', 0.07), at=cues['trucks'] + 0.27, gain=-16, pan=-0.2)

# groove from the first bar line
kick = lambda v=1.0: drums.kick('soft', v, decay=0.24)
kt = m.track('kick', level=-18.5)
kt.loop(kick, 'x.......x.......', 1.8, 3.8, vel=0.8).loop(kick, 'x...x...x...x...', 3.8, 5.3, vel=0.85).loop(kick, 'x...x...x.x.x...', 5.3, 5.8, vel=0.9)
kt.loop(kick, 'x...x...x...x...', 5.8, 7.8)
sh = m.track('shaker', level=-31, pan=0.3)
sh.loop(lambda v: drums.shaker(v), 'x.xxx.xxx.xxx.xx', 1.8, 7.8, vel=0.55, vel_jitter=0.2)
sh.automate('gain', [(1.8, -8), (5.7, 0), (7.8, 0)])
bs = m.track('bass', level=-22)
for a, b, c in SEG:
    if a < 1.8 or a >= 7.8: continue
    for t, v in seq.step_times(g, a, b, 8, 'x..x..x.' if a < 5.8 else 'x.xx.x.x'):
        bs.add(synth.bass(N(ROOT[c]) + 12, 0.18, 0.8 * v, 'pluck'), t)
bs.duck(by='kick', depth=4, release=0.12)
sub = m.track('sub', level=-24)
for a, b, c in SEG:
    if 3.8 <= a < 7.8: sub.add(synth.bass(N(ROOT[c]), b - a, 0.7, 'sub'), a)
sub.duck(by='kick', depth=5, release=0.14)

# marimba melody (D major pentatonic, 8ths), confident and plucky
mel = m.track('melody', level=-21, sends={'delay8': -13, 'room': -13}, pan=-0.05)
MEL = [  # (bar-relative 8th index, note, len 8ths)
    (1.8, ['D5', '-', 'F#5', 'A5', '-', 'B5', 'A5', 'F#5', 'E5', '-', 'D5', 'E5', 'F#5', '-', 'A5', '-']),
    (3.8, ['B5', '-', 'A5', 'F#5', '-', 'E5', 'F#5', 'A5', 'B5', '-', 'D6', 'B5', 'A5', '-', 'E5', 'F#5']),
    (5.8, ['A5', '-', 'D6', 'A5', 'B5', '-', 'F#5', 'A5', 'B5', '-', 'D6', 'E6', 'D6', '-', 'B5', 'A5']),
]
for t0, notes in MEL:
    for j, n in enumerate(notes):
        if n == '-': continue
        t = t0 + j * B / 2
        v = 0.78 if j % 4 == 0 else 0.58
        mel.add(mar(n, v), t)
        if t0 >= 5.8: mel.add(mar(N(n) - 12, 0.38), t)
mel.automate('gain', [(1.8, -4), (3.8, -2), (5.8, 0), (7.8, 0)])

# ------------------------------------------------------------------ BUILD 2 (3.80): live auction, bids climb
m.sfx(sfx.ui('open'), at=cues['screen_in'], gain=-6, pan=0.35)
for k, t in enumerate(cues['bids']):
    m.sfx(sfx.blip(['D6', 'E6', 'F#6', 'A6', 'B6', 'D7', 'E7', 'F#7'][k], 'fm', 0.06), at=t, gain=-11 + 0.4 * k, pan=0.35)
    m.sfx(sfx.tick('hi'), at=t, gain=-17, pan=0.35)
m.track('riser', level=-25).add(sfx.riser(1.6, 'hybrid', note='A3', seed=2), DEAL)
sn = m.track('snare', level=-25, sends={'room': -12})
for t, v in seq.roll(5.3, DEAL, 8, 32, grid=g, vel0=0.3, vel1=0.85):
    sn.add(drums.snare('tight', v), t)

# ------------------------------------------------------------------ DEAL 5.80: 落槌 + 成交 ding + gold burst
knock(DEAL - 0.14 + 0.14, 1.0)
m.sfx(sfx.ding('A6'), at=DEAL + 0.02, gain=-1)
m.sfx(sfx.shimmer_hit('D7'), at=DEAL + 0.02, gain=-5)
m.sfx(sfx.impact('cinematic', size=0.7), at=DEAL, gain=-6)
m.sfx(sfx.sparkle(0.9, 22, 'D', 'major_pentatonic', seed=8), at=DEAL + 0.05, gain=-9, pan=0.3)
m.track('crash', level=-28, sends={'hall': -12}).add(drums.crash(0.75), DEAL)
kt.add(kick(1.0), DEAL)
m.track('glock2', level=-26, sends={'plate': -10}).add(glk('F#7', 0.6), DEAL + 0.25).add(glk('A7', 0.5), DEAL + 0.5)
# proof figures rise: wood thock + count-up ticks (decelerating like the count)
for k, t in enumerate(cues['figures']):
    pan = [0.45, 0.5, 0.55][k]
    m.sfx(sfx.click('wood'), at=t - 1 / 30, gain=-6, pan=pan)
    m.sfx(sfx.impact('soft', size=0.4), at=t, gain=-11, pan=pan)
    for j in range(9):
        u = j / 8; tt = t + 0.05 + cues['count_dur'] * (1 - (1 - u) ** (1 / 3))   # inverse easeOutCubic
        m.sfx(sfx.tick('hi'), at=tt, gain=-19 - j * 0.5, pan=pan)
    ev.add(glk(['D7', 'F#7', 'A7'][k], 0.45), t + 0.05 + cues['count_dur'], pan=pan)
cl = m.track('clap', level=-25, sends={'room': -10})
cl.loop(lambda v: drums.clap('tight', v), '....x.......x...', DEAL, 7.8)

# ------------------------------------------------------------------ OUTRO: figures fold, pull-back, title, final chord
m.sfx(sfx.swish(0.3, direction=-1, seed=6), at=cues['fig_out'] + 0.12, gain=-11, pan=0.4)
m.sfx(sfx.whoosh(1.1, 'air', direction=-1, peak=0.45, seed=12), at=cues['whoosh'], gain=-3)
TT = cues['title']
m.sfx(sfx.pop('cork', pitch=1.0), at=TT['logo'] + 0.03, gain=-8, pan=-0.45)
m.sfx(sfx.click('wood'), at=TT['name'] - 1 / 30, gain=-8, pan=-0.35)
m.sfx(sfx.swish(0.4, direction=1, seed=9), at=TT['rule'] + 0.2, gain=-14, pan=-0.2)
m.sfx(sfx.tick('wood'), at=TT['slogan'], gain=-15, pan=-0.3)
m.sfx(sfx.tick('hi'), at=TT['small'], gain=-18, pan=-0.3)
for j, n in enumerate(['D3', 'A3', 'F#4', 'C#5', 'E5']):
    ev.add(mar(n, 0.62), F + 0.02 * j)
m.track('glock3', level=-26, sends={'plate': -10}).add(glk('A7', 0.55), F).add(glk('F#7', 0.4), F + 0.25)
m.sfx(sfx.shimmer_hit('F#6'), at=F, gain=-7)
kt.add(kick(0.8), F)
sub.add(synth.bass(N('D2'), 1.1, 0.75, 'sub'), F)
# living hold: two soft blinks of glock in the end hold
m.track('glock4', level=-30, sends={'plate': -8}).add(glk('E7', 0.3), 9.3).add(glk('A7', 0.25), 9.55)

m.group('music').automate('gain', [(0, -4), (1.75, -3.5), (1.8, -2.0), (3.8, -2.0), (5.7, -3.5), (5.74, -14), (5.79, -14), (5.8, -1.0),
                                   (7.7, 0.5), (7.8, -2.0), (8.75, -2.5), (8.8, 0.5), (10, 0.5)])
m.master_kw.update(air=0.8)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
res = m.export(os.path.join(HERE, 'out', 'audio.wav'), spectrogram=os.path.join(HERE, 'out', 'audio_spec.png'))
m.report()
print({k: res[k] for k in ('duration', 'lufs', 'true_peak', 'bands', 'stereo_corr', 'warnings') if k in res})
hits = [ST, CT['base'], DEAL] + cues['figures'] + [F]
print(mg.hit_alignment(os.path.join(HERE, 'out', 'audio.wav'), hits))
