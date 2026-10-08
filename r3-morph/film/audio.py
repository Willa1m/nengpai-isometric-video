"""一锤定音 — soundtrack for the NENGPAI shape-morph film (15 s, 100 bpm, D minor → D major).
Auction-room tension: plucky 16th arpeggio + low 8th pulse; a pitched whoosh into every morph landing; mechanical odometer
ticks that speed up with the bidding over a rising riser; 6 frames of total silence; wooden gavel knock + low boom + bell on
成交; light ticks on the proof count-ups; a warm resolved Dmaj9 under the logo. Every time comes from cues.json."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'ref', 'lib', 'audio'))
import numpy as np
import mgaudio as mg
from mgaudio import synth, drums, sfx, fm
from mgaudio import samples as SM
from mgaudio.theory import midi, name

cu = json.load(open(os.path.join(HERE, 'cues.json')))
FR = 1 / 30
BEAT = cu['beat']; A0 = cu['anchor']
m = mg.Mix(15.0, bpm=cu['bpm'], anchor=A0)
m.group('music').level = -19.5
N = lambda s: midi(s) if isinstance(s, str) else s

# ------------------------------------------------------------------ harmony (one table drives arp, pulse, pads, tonal SFX)
CH = {
    'Dm9':    ['D3', 'F3', 'A3', 'C4', 'E4'], 'Bbmaj7': ['Bb2', 'D3', 'F3', 'A3', 'C4'], 'Gm9': ['G2', 'Bb2', 'D3', 'F3', 'A3'],
    'A7sus':  ['A2', 'D3', 'E3', 'G3', 'C4'], 'A7b9': ['A2', 'C#3', 'E3', 'G3', 'Bb3'],
    'Bbmaj9': ['Bb2', 'D3', 'F3', 'A3', 'C4'], 'Cadd9': ['C3', 'E3', 'G3', 'D4', 'E4'], 'Asus': ['A2', 'D3', 'E3', 'A3', 'C#4'],
    'Dmaj9':  ['D3', 'F#3', 'A3', 'C#4', 'E4'],
}
ROOT = {'Dm9': 'D2', 'Bbmaj7': 'A#1', 'Gm9': 'G1', 'A7sus': 'A1', 'A7b9': 'A1', 'Bbmaj9': 'A#1', 'Cadd9': 'C2', 'Asus': 'A1', 'Dmaj9': 'D2'}
SEG = [(0.0, 2.8, 'Dm9'), (2.8, 5.2, 'Bbmaj7'), (5.2, 7.6, 'Gm9'), (7.6, 8.8, 'A7sus'), (8.8, 10.0, 'A7b9'),
       (10.0, 11.2, 'Bbmaj9'), (11.2, 12.4, 'Cadd9'), (12.4, 13.6, 'Asus'), (13.6, 15.0, 'Dmaj9')]
def chord(t):
    for a, b, c in SEG:
        if a <= t < b: return c
    return SEG[-1][2]
def tones(t, oct=0): return [N(n.replace('#', '#')) + 12 * oct for n in CH[chord(t)]]
def hi(t, i=-1, oct=1): c = tones(t, oct); return c[i % len(c)]

SIL0, SIL1 = cu['silence']
HIT = cu['hit']
def in_sil(t): return SIL0 - 0.005 <= t < SIL1

# ------------------------------------------------------------------ music bed
# plucky 16th arpeggio (up-down over the chord + octave), opens up with the bidding
arp = m.track('arp', level=-23, sends={'delay': -12}, pan=0.08)
arp2 = m.track('arp_hi', level=-29, sends={'delay': -10}, pan=-0.2)
t = A0 + 2 * BEAT / 4 * 0   # start on the downbeat after the tap
k = 0
while t < 9.8 - 1e-6:
    if t >= 0.95:
        c = tones(t, 1) + [tones(t, 2)[0]]
        pat = [0, 2, 4, 5, 3, 1, 2, 4]
        n = c[pat[k % 8] % len(c)]
        acc = 1.0 if k % 4 == 0 else 0.68
        arp.add(synth.pluck(n, 0.2, acc, 'future'), t)
        if t >= 7.6:   # the frenzy: a 32nd-note double an octave up
            arp2.add(synth.pluck(n + 12, 0.1, 0.55 + 0.45 * (t - 7.6) / 2.2, 'bell'), t)
            if t >= 8.8: arp2.add(synth.pluck(c[(pat[k % 8] + 2) % len(c)] + 12, 0.08, 0.6, 'bell'), t + 0.075)
    t = round(t + BEAT / 4, 6); k += 1
arp.automate('lpf', [(0, 1500), (2.8, 2200), (5.2, 3000), (7.6, 4200), (9.75, 9000), (10, 3000), (15, 2500)])
# proof: lighter 8th arp, then the end chord as a slow glock spread
for i in range(14):
    tt = HIT + 0.9 + i * BEAT / 2
    if tt >= 12.75: break
    c = tones(tt, 1); arp.add(synth.pluck(c[[0, 2, 4, 3][i % 4] % len(c)], 0.25, 0.55, 'soft'), tt)

# low pulse: 8th-note bass on the root, from the first morph to the silence
pulse = m.track('pulse', level=-21, pan=0.0)
t = 1.0
while t < 9.8 - 1e-6:
    r = N(ROOT[chord(t)])
    pulse.add(synth.bass(r, 0.22, 0.95 if abs(((t - A0) / BEAT) % 1) < 1e-3 else 0.7, 'analog'), t)
    t = round(t + BEAT / 2, 6)
for tt, rr, d in [(HIT, 'A#1', 1.15), (11.2, 'C2', 1.15), (12.4, 'A1', 1.15), (13.6, 'D2', 1.4)]:
    pulse.add(synth.bass(N(rr), d, 0.8, 'sub'), tt)

# drums: soft kick from bar 1, full groove in the bid, snare roll into the silence
kick = m.track('kick', level=-20)
clap = m.track('clap', level=-27, sends={'room': -10})
hats = m.track('hats', level=-31, pan=0.15)
for b in range(40):
    tt = A0 + b * BEAT
    if tt >= SIL0 - 1e-6: break
    if tt < 2.8 - 1e-6: continue
    kick.add(drums.kick('soft' if tt < 5.2 else 'punchy', 0.8 if tt < 5.2 else 1.0), tt)
    if tt >= 6.4 and (b % 2 == 1): clap.add(drums.clap('tight', 0.8), tt)
for s in range(200):
    tt = 5.2 + s * BEAT / 4
    if tt >= SIL0 - 1e-6: break
    if tt >= 6.4 or s % 2 == 1: hats.add(drums.hat('closed', 0.5 + 0.3 * (s % 2 == 1), tune=1.1), tt)
roll = m.track('roll', level=-26, sends={'room': -12})
tt, step = 8.8, 0.15
while tt < SIL0 - 0.03:
    roll.add(drums.snare('tight', 0.35 + 0.65 * (tt - 8.8) / 1.0), tt); step = max(0.04, step * 0.86); tt += step
for tr in ('pulse', 'arp', 'arp_hi', 'hats', 'roll', 'clap'): m[tr].duck(by='kick', depth=3.5, release=0.16)

# pads: a quiet bed under the chain, a warm resolved Dmaj9 under the logo
pad = m.track('pad', level=-28, sends={'hall': -8})
for a, b, c in SEG:
    if a >= SIL0 - 0.01 and a < HIT: continue
    if a < 2.8: continue
    d = min(b, SIL0) - a if a < SIL0 else b - a
    pad.add(synth.pad([N(x) + 12 for x in CH[c][1:]], d + 0.05, 0.6 if c != 'Dmaj9' else 0.9, 'warm' if c != 'Dmaj9' else 'strings'), a)
pad.automate('gain', [(0, -6), (5.0, -4), (9.6, 0), (10.0, -5), (13.5, -2), (15, 0)])

# ------------------------------------------------------------------ sound design (sync points = the visual events)
def tone_at(t, i=-1, oct=1): return name(hi(t, i, oct))
# HOOK: the gavel spins in (swish), taps the grey dot (dry wooden knock), the dot inflates (rising rubber stretch + pop)
m.sfx(sfx.swish(0.3, direction=1, seed=3), at=0.22, gain=-9, pan=0.35)
m.sfx(sfx.whoosh(0.42, 'swish', direction=-1, peak=0.8, seed=4), at=cu['hook']['tap'] - 0.04, gain=-10, pan=0.25)
TAP = cu['hook']['tap'] - FR
m.sfx(drums.woodblock('block', 1.0), at=TAP, gain=-4, verb=-14)
m.sfx(sfx.click('wood'), at=TAP, gain=-2)
m.sfx(sfx.impact('soft'), at=TAP, gain=-9)
m.sfx(sfx.morph(0.42, up=True, note='D3'), at=0.86, gain=-10, verb=-14)
m.sfx(sfx.pop('bubble', pitch=0.9), at=0.80, gain=-8)
m.sfx(synth.pluck(N('D5'), 0.4, 1.0, 'future'), at=0.82, gain=-8, verb=-12)
m.sfx(sfx.whoosh(0.5, 'swish', direction=1, peak=0.3, seed=9), at=0.62, gain=-15, pan=0.4)   # the gavel rebounds out
# ASSET CHAIN: a pitched whoosh through each circle, landing on the beat with an in-key pluck + body sound
for i, mo in enumerate(cu['morphs'][:4]):
    t0, t1 = mo['t0'], mo['t1']
    m.sfx(sfx.whoosh(t1 - t0 + 0.15, 'air' if i % 2 else 'swoosh', direction=1 if i % 2 else -1, peak=0.55, seed=20 + i), at=(t0 + t1) / 2, gain=-9, pan=0.15 * (-1) ** i)
    m.sfx(sfx.morph(t1 - t0, up=True, note=name(hi(t1, 0, 0))), at=t1, gain=-12, verb=-14)
    m.sfx(sfx.blip(tone_at(t1, -1, 2), 'tri', dur=0.09, glide=1.0), at=t1 - FR, gain=-8, verb=-12)
    m.sfx(sfx.pop('soft', pitch=1.0 + 0.1 * i), at=t1 - FR, gain=-9)
m.sfx(sfx.impact('thud'), at=cu['land']['factory'] - FR, gain=-10)                                   # factory: heavy, industrial
for j in range(3): m.sfx(sfx.pop('soft', pitch=0.6 + 0.1 * j), at=1.70 + 0.12 * j, gain=-17, pan=0.3)   # smoke puffs
for j in range(7): m.sfx(sfx.click('switch'), at=2.88 + 0.07 * j, gain=-19 + j * 0.3, pan=-0.3 + 0.1 * j)   # window lights
m.sfx(sfx.shimmer_hit('A5'), at=cu['land']['bracelet'] + 0.02, gain=-10)                            # jade glint
m.sfx(sfx.ding('E7', 'glass', dur=0.8), at=cu['land']['bracelet'] + 0.12, gain=-15, pan=0.3)
# the chain's gavel lands = 开拍: a lighter knock on the downbeat
GL = cu['land']['gavel'] - FR
m.sfx(drums.woodblock('block', 0.9), at=GL, gain=-6); m.sfx(sfx.click('wood'), at=GL, gain=-6)
# gavel → circle → capsule → the screen switches on
m.sfx(sfx.whoosh(0.55, 'sci', direction=1, peak=0.6, seed=31), at=5.86, gain=-10)
m.sfx(sfx.ui('open'), at=cu['wipes']['screen'] + 0.1, gain=-9)
m.sfx(sfx.blip('D6', 'sine', dur=0.06), at=cu['screenOpen'], gain=-12)
# THE BID: paddles pop in, digits tick over, a riser climbs into the silence
BIDS, PR = cu['bids'], cu['prices']
P = [1000000] + PR
for j, tb in enumerate(BIDS):
    if j < 8:
        m.sfx(sfx.pop('bubble', pitch=1.0 + 0.05 * j), at=tb - FR, gain=-8, pan=(-0.4, 0.4)[j % 2])
        m.sfx(sfx.whoosh(0.3, 'swish', direction=(-1, 1)[j % 2], peak=0.8, seed=40 + j), at=tb - 0.08, gain=-15, pan=(-0.5, 0.5)[j % 2])
    else:
        m.sfx(sfx.pop('soft', pitch=1.2 + 0.03 * j), at=tb - FR, gain=-13, pan=(-0.3, 0.3)[j % 2])
    m.sfx(sfx.blip(name(hi(tb, j % 5, 2)), 'tri', dur=0.05, glide=1.2), at=tb, gain=-12 + 0.25 * j, verb=-14)
    # mechanical odometer ticks: one per digit that rolls past, spread over the roll
    a, b = P[j], P[j + 1]; nd = 0
    for kk in range(7):
        da, db = a // 10 ** kk % 10, b // 10 ** kk % 10; nd += (db - da) % 10
    nd = min(nd, 10)
    nx = BIDS[j + 1] - tb if j + 1 < len(BIDS) else 0.3
    dur = min(0.42, max(0.09, nx * 0.8))
    for q in range(nd):
        tq = tb - dur * 0.75 + dur * (q + 0.5) / nd
        if in_sil(tq): continue
        m.sfx(sfx.tick('hi' if q % 2 else 'clock'), at=tq, gain=-17 + 4 * min(1, j / 16), pan=-0.2 + 0.4 * (q / max(1, nd)))
m.sfx(sfx.riser(SIL0 - 7.6, 'tonal', note='A3', intensity=1.0, end='cut'), at=SIL0, gain=-8)
m.sfx(sfx.riser(SIL0 - 8.6, 'noise', end='cut', seed=5), at=SIL0, gain=-12)
# SILENCE 9.80-10.00: everything out (music + sound design), then the HIT
m.mute(SIL0, SIL1 - SIL0)
m.group('sfx').region('mute', SIL0, SIL1 - SIL0 - 0.004)
H0 = HIT - 0.004
m.sfx(drums.woodblock('block', 1.0), at=H0, gain=0, verb=-10)
m.sfx(sfx.click('wood'), at=H0, gain=0)
m.sfx(sfx.impact('punch', size=1.3), at=H0, gain=-1)
m.sfx(sfx.boom(2.4, 44), at=H0, gain=-2)
m.sfx(sfx.sub_drop(1.2, 90, 32), at=H0, gain=-8)
m.sfx(fm.bell(N('D6'), 2.6, 0.9, 'bell').loud(-18), at=H0 + 0.01, gain=-2, verb=-6)
m.sfx(fm.bell(N('A6'), 2.0, 0.7, 'bell').loud(-18), at=H0 + 0.01, gain=-8, verb=-6)
m.sfx(sfx.sparkle(1.0, key='D', lo=90, hi=106, seed=7), at=HIT + 0.05, gain=-12)
m.sfx(sfx.stamp('seal'), at=cu['stamp'] - FR, gain=-2)
m.sfx(sfx.stamp('rubber'), at=cu['stamp'] - FR, gain=-7)
# PROOF: the seal opens (whoosh), circles fly out, each count-up step ticks, ▲ pops
m.sfx(sfx.whoosh(0.6, 'air', direction=0, peak=0.45, seed=51), at=cu['wipes']['paper'] + 0.25, gain=-10)
steps = [0.24, 0.13, 0.13, 0.16, 0.22]
seqlen = [4, 2, 5]
for fi, tf in enumerate(cu['figures']):
    m.sfx(sfx.swish(0.25, direction=1, seed=60 + fi), at=tf - 0.36, gain=-15, pan=-0.4 + 0.4 * fi)
    tt = tf
    for s in range(seqlen[fi]):
        if s > 0: tt += steps[s]
        m.sfx(sfx.tick('hi'), at=tt - FR, gain=-13, pan=-0.4 + 0.4 * fi)
        m.sfx(sfx.blip(name(hi(tt, s, 2)), 'sine', dur=0.05, glide=1.5), at=tt - FR, gain=-15, pan=-0.4 + 0.4 * fi, verb=-12)
    m.sfx(sfx.pop('mouth', pitch=1.3), at=tt + 0.03, gain=-12, pan=-0.4 + 0.4 * fi)
# END: numbers become circles and converge (whoosh + arriving pops), the gavel lands into the logo on the downbeat
m.sfx(sfx.whoosh(0.6, 'soft', direction=-1, peak=0.65, seed=71), at=cu['converge'] + 0.45, gain=-11)
arr = sorted(cu['converge'] + 0.2 + 0.035 * (fi * 3 + ci) + 0.34 for fi, n in enumerate([3, 2, 2]) for ci in range(n))
for i, ta in enumerate(arr): m.sfx(sfx.pop('bubble', pitch=0.8 + 0.06 * i), at=ta - FR, gain=-14)
LL = cu['logoLand'] - FR
m.sfx(sfx.whoosh(0.4, 'swish', direction=-1, peak=0.8, seed=81), at=LL - 0.06, gain=-12, pan=0.3)
m.sfx(drums.woodblock('block', 0.9), at=LL, gain=-5, verb=-12); m.sfx(sfx.click('wood'), at=LL, gain=-6)
m.sfx(fm.bell(N('F#6'), 3.0, 0.6, 'glock').loud(-18), at=LL + 0.02, gain=-10, verb=-8)
for i, n in enumerate(['D5', 'F#5', 'A5', 'C#6', 'E6']):
    m.sfx(fm.bell(N(n), 1.6, 0.5, 'glock').loud(-18), at=cu['title'] + 0.06 * i, gain=-17, pan=-0.3 + 0.15 * i, verb=-8)
m.sfx(sfx.sparkle(0.9, key='D', lo=96, hi=110, seed=11), at=cu['shine'] + 0.25, gain=-17)

res = m.export(os.path.join(HERE, 'out', 'audio.wav'), lufs=-14, tp=-1.5, spectrogram=os.path.join(HERE, 'out', 'audio_spec.png'))
print({k: res.get(k) for k in ('duration', 'lufs', 'true_peak', 'stereo_corr', 'longest_gap', 'warnings')})
print('align', mg.hit_alignment(os.path.join(HERE, 'out', 'audio.wav'), [cu['hook']['tap'], 1.6, 2.8, 4.0, 5.2, HIT, cu['stamp'], cu['logoLand']]))
