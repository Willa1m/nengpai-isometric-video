"""LINGPAI collage soundtrack: dusty 90 bpm jazzy boom-bap (mgaudio lofi recipe, piano, vinyl) + paper / desk sound
design locked to cues.json (the same cue sheet the picture reads).  All sounds are synthesised or from the CC0 VCSL
samples shipped with mgaudio — no third-party recordings.
Run from collage/:  python3 film/audio.py  -> film/out/audio.wav (+ audio_spec.png, hits.json)"""
import sys, json, os
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(D, '..', 'lib', 'audio'))
import numpy as np
import mgaudio as mg
from mgaudio import recipes, sfx, fm, drums, pluck, samples
from mgaudio.core import Sound

C = json.load(open(os.path.join(D, 'cues.json')))
SR = 48000
DUR = 20.0
END = C['peishang']                     # the warm button chord lands on 配上
os.makedirs(os.path.join(D, 'out'), exist_ok=True)

m = recipes.lofi(duration=DUR, bpm=90, key='F', drop=C['assets']['a_machine'], build=C['notes'][1], outro=END,
                 keys='piano', flavor='boombap', vinyl=True)
f = m.form
print('form bpm', f.bpm, 'build', f.build, 'drop', f.drop, 'outro', f.outro, 'tracks', list(m.tracks))
HITS = []


def S(snd, at, gain=0.0, pan=0.0, verb=None, hit=True):
    m.sfx(snd, at=at, gain=gain, pan=pan, verb=verb)
    if hit:
        HITS.append(at)


def paper_slap(t, gain=0.0, pan=0.0, body=-7, seed=0):
    """cut paper slapped onto the page by a hand: sticker slap + paper smack + a low thud for weight"""
    S(sfx.sticker_slap(seed=seed), t, gain, pan)
    S(sfx.paper('flip', 0.18, seed=seed + 50), t, gain - 7, pan, hit=False)
    S(sfx.impact('thud', size=0.8, seed=seed), t, gain + body, pan, hit=False)


def hand_in(t_land, n_steps=4, pan=0.0, gain=-11, seed=0):
    """the hand's air whoosh, peaking just before the slap"""
    s = sfx.whoosh(0.32, 'cloth', direction=1 if pan >= 0 else -1, peak=0.8, seed=seed)
    S(s, t_land - 0.03, gain, pan, hit=False)


def twang(t, note='A2', gain=-2, pan=0.0, seed=0):
    """taut string twang: bright low steel string with a fast downward bend from the tension overshoot"""
    n = int(0.9 * SR)
    bend = np.concatenate([np.linspace(2.0, 0.0, int(0.07 * SR)), np.zeros(n)])
    g = pluck.guitar(note, 0.9, 0.95, 'steel', bend=bend, seed=seed)
    S(g.loud(-18), t, gain, pan)
    S(sfx.click('hard').pitch(5), t, gain - 10, pan, hit=False)


def photocopier(t, gain=-6, pan=0.4, seed=0):
    """copier zip: band-limited noise sweep + motor hum (0.33 s), synthesised"""
    n = int(0.36 * SR)
    tt = np.arange(n) / SR
    r = np.random.default_rng(900 + seed)
    noise = r.standard_normal(n)
    from mgaudio import filters as FL
    sweep = FL.bpf(noise, 1200, 4800)
    env = np.minimum(1, tt / 0.02) * np.minimum(1, (0.36 - tt) / 0.06)
    hum = 0.35 * np.sin(2 * np.pi * 110 * tt) + 0.15 * np.sin(2 * np.pi * 220 * tt)
    y = (sweep * 0.6 * (0.5 + 0.5 * np.sin(2 * np.pi * 26 * tt)) + hum) * env
    snd = Sound(np.stack([y, y]) * 0.3).loud(-18)
    S(snd, t, gain, pan, hit=False)
    S(sfx.zip_(up=True, dur=0.2), t + 0.12, gain - 3, pan, hit=False)


# ------------------------------------------------------------------ HOOK: three wish notes slapped on
for i, t in enumerate(C['notes']):
    pan = [0.35, 0.45, -0.4][i]
    hand_in(t, pan=pan, seed=10 + i)
    paper_slap(t, gain=2 - i * 0.5, pan=pan * 0.5, body=-5, seed=20 + i)
for i, t in enumerate(C['highlight']):              # highlighter squeak-stroke under the key words
    S(sfx.pen('marker', 0.28), t, -9, 0.1, hit=False)
S(sfx.pen('marker', 0.3), 2.0, -8, 0.3, hit=False)  # the blue marker arrow
S(sfx.scissors(seed=3), 2.1666667, -3, -0.2)
S(sfx.scissors(seed=4), 2.3333333, -4, 0.2)
s = sfx.whoosh(0.5, 'air', direction=1, peak=0.85, seed=5)
S(s, C['pullback'][1] - 0.04, -6, 0.0, hit=False)

# ------------------------------------------------------------------ 有货: the avalanche of real assets
for i, (name, t) in enumerate(C['assets'].items()):
    pan = [0.3, -0.5, 0.15, 0.55, 0.6, -0.2, 0.25, 0.7, -0.35][i]
    hand_in(t, pan=pan, gain=-13, seed=30 + i)
    paper_slap(t, gain=(3 if i == 0 else -1 + i * 0.25), pan=pan, body=-4 if i == 0 else -8, seed=40 + i)
    S(sfx.typing(n_keys=3, rate=12, kind='typewriter', seed=60 + i), t + 1 / 12, -12, pan, hit=False)   # the tag gets typed
    S(sfx.tape_rip(0.12, seed=70 + i), t + 1 / 12, -15, pan, hit=False)
# the wing-in-ground craft: cartoon whoosh in + POP + boing
s = sfx.whoosh(1.0, 'heavy', direction=1, peak=0.9, seed=81)
S(s, C['craft'][1] - 0.06, -2, 0.2, hit=False)
s = sfx.slide_whistle(up=False, dur=0.45)
S(s, C['craft'][0] + 0.3, -10, -0.4, hit=False)
s = sfx.slide_whistle(up=True, dur=0.4)
S(s, C['craft'][1] - 0.3, -9, 0.4, hit=False)
S(sfx.cork_pop(), C['craft'][1], 3, 0.25)
S(sfx.boing(pitch=1.2, dur=0.45), C['craft'][1] + 1 / 12, -9, 0.25, hit=False)
# constructivist band tears in, phrases slam, avalanche of thumbnails, 上千件 chips, 有货
S(sfx.tape_rip(0.32, seed=90), C['band'], 0, -0.2)
for i, t in enumerate(C['phrases']):
    S(sfx.text_hit('slam', seed=91 + i), t, 1, [-0.3, 0.0, 0.3][i])
S(sfx.paper('rustle', 0.5, seed=95), C['thumbs'][0], -5, 0.4)
for k in range(6):
    S(sfx.sticker_slap(seed=96 + k), C['thumbs'][0] + k / 12, -12 + k * 0.5, 0.6 - k * 0.2, hit=False)
for i in range(5):
    S(sfx.sticker_slap(seed=110 + i), C['thousand'] + i / 12, -3, -0.3 + i * 0.15, hit=(i == 0))
S(sfx.impact('punch', seed=120), C['thousand_punch'], -2, 0.0)
S(sfx.stamp('rubber', seed=121), C['youhuo'], 3, 0.3)
S(sfx.impact('thud', seed=122), C['youhuo'], -3, 0.3, hit=False)
# clear: everything torn / blown off
S(sfx.tape_rip(0.3, seed=123), C['clear'][0], -1, -0.2)
s = sfx.whoosh(0.45, 'air', direction=1, peak=0.6, seed=124)
S(s, C['clear'][0] + 0.12, -6, 0.3, hit=False)

# ------------------------------------------------------------------ 能配: the matching board
S(sfx.impact('thud', size=1.2, seed=125), C['pins'], 0, 0.0)          # act change: the board snaps into a pin board
for i in range(7):                                   # push pins drop in (2 per step)
    S(sfx.click('hard').pitch(i * 0.7 - 2), C['pins'] + i / 12, -8, -0.5 + i * 0.16, hit=(i == 0))
S(sfx.pen('marker', 0.25), C['stamp1'] - 0.25, -9, -0.1, hit=False)
S(sfx.pen('marker', 0.25), C['stamp2'] - 0.25, -9, -0.4, hit=False)
twang(C['string1'][1], 'A2', -1, -0.2, seed=1)
S(sfx.stamp('rubber', seed=131), C['stamp1'], 2, -0.1)
twang(C['string2'][1], 'E2', -1, -0.45, seed=2)
S(sfx.stamp('rubber', seed=132), C['stamp2'], 2, -0.45)
# crowd lands
paper_slap(C['crowd'] - 1 / 12, gain=0, pan=0.1, body=-5, seed=140)
for k in range(4):
    S(sfx.sticker_slap(seed=141 + k), C['crowd'] + k / 12, -6, 0.3 - k * 0.15, hit=False)
# HERO burst: dozens of strings at once — a strummed twang chord + crash + punch
ch = sorted(f.chord_at(C['burst']))
for k in range(4):
    notes = [n - 12 for n in ch[:4]]
    tt = C['burst'] + k / 12
    for j, n in enumerate(notes):
        n2 = int(n) - 12 * (k % 2)
        bend = np.concatenate([np.linspace(1.5, 0, int(0.06 * SR)), np.zeros(SR)])
        S(pluck.guitar(n2, 1.0, 0.9, 'steel', bend=bend, seed=200 + k * 4 + j).loud(-20), tt + j * 0.012, -4 - k, -0.6 + j * 0.4, hit=False)
HITS.append(C['burst'])
S(drums.crash(0.9).loud(-18), C['burst'], -1, 0.0, hit=False)
S(sfx.impact('punch', seed=210), C['burst'], 0, 0.0, hit=False)
S(sfx.sub_drop(0.8), C['burst'], -6, 0.0, hit=False)
S(sfx.paper('slide', 0.3, seed=219), C['dim'], -9, 0.2, hit=False)
S(sfx.stamp('rubber', seed=220), C['mini_stamps'][0], 1, 0.6)
for i, t in enumerate(C['mini_stamps'][1:]):
    S(sfx.sticker_slap(seed=221 + i), t, -3, [0.3, 0.6, 0.2][i])
# second wave of strings: another strummed twang chord, an octave up
ch2 = sorted(f.chord_at(C['burst2']))
for k in range(3):
    for j, n in enumerate(ch2[:4]):
        bend = np.concatenate([np.linspace(1.5, 0, int(0.06 * SR)), np.zeros(SR)])
        S(pluck.guitar(int(n) - 12 + 12 * (k % 2), 0.9, 0.85, 'steel', bend=bend, seed=260 + k * 4 + j).loud(-21), C['burst2'] + k / 12 + j * 0.012, -5 - k, -0.5 + j * 0.35, hit=False)
HITS.append(C['burst2'])
# the crowd chatters (muted-horn babble on the open-jaw steps)
babble = m.track('babble', level=-31, sends={'room': -10}, lp=2000, group='sfx')
rr = np.random.default_rng(77)
cb = sorted(f.chord_at(C['burst']))
tt = C['burst']
while tt < C['channels'] - 0.05:
    babble.add(fm.brass(int(cb[int(rr.integers(0, len(cb)))]) + 12 * int(rr.integers(0, 2)), 0.07, 0.6), tt + rr.uniform(-0.005, 0.005))
    tt += 2 / 12
# the big-headed buyer talks: muted-horn blips on the jaw flaps (the puppet's voice)
horn = m.track('horn', level=-26, sends={'plate': -12}, lp=2400, group='sfx')
for t, n in zip(C['jaw'], ['C5', 'E5', 'D5', 'G4']):
    horn.add(fm.brass(n, 0.16, 0.8), t)
# counters: rapid ticks while the numbers count up, a chip slap when the "+" lands
for k in range(6):
    S(sfx.tick('clock'), C['buyers'] + k / 12, -10 + k, 0.2, hit=(k == 0))
S(sfx.text_hit('pop', seed=230), C['buyers'] + 6 / 12, -3, 0.2)
for k in range(5):
    S(sfx.tick('clock'), C['channels'] + k / 12, -10 + k, -0.3, hit=(k == 0))
S(sfx.text_hit('pop', seed=231), C['channels'] + 5 / 12, -3, -0.3)
s = sfx.whoosh(0.4, 'swish', direction=1, peak=0.7, seed=232)
S(s, 11.45, -10, 0.2, hit=False)
s = sfx.whoosh(0.4, 'swish', direction=-1, peak=0.7, seed=233)
S(s, 12.3, -10, -0.3, hit=False)

# ------------------------------------------------------------------ TWO ENGINES
S(sfx.tape_rip(0.4, seed=300), C['rip'], 3, 0.0)
S(sfx.paper('crumple', 0.35, seed=301), C['rip'] + 0.05, -6, 0.0, hit=False)
s = sfx.whoosh(0.45, 'air', direction=-1, peak=0.5, seed=302)
S(s, C['rip'] + 0.2, -7, -0.6, hit=False)
s = sfx.whoosh(0.45, 'air', direction=1, peak=0.5, seed=303)
S(s, C['rip'] + 0.22, -7, 0.6, hit=False)
hand_in(C['map'], pan=-0.5, seed=304)
paper_slap(C['map'], gain=3, pan=-0.45, body=-4, seed=305)
p0, p1 = C['map_pins']
for i in range(16):
    tt = round((p0 + (p1 - p0) * i / 15) * 12) / 12
    S(sfx.pop('soft', pitch=0.9 + 0.04 * (i % 6)), tt, -10, -0.6 + 0.04 * i, hit=(i == 0))
S(sfx.typing(n_keys=8, rate=12, kind='typewriter', seed=310), C['map_label'], -6, -0.4)
for i in range(7):
    S(sfx.sticker_slap(seed=320 + i), C['matrix'] + i / 12, -9, 0.5, hit=False)
for i, t in enumerate(C['pulses']):
    S(fm.bell(['A5', 'C6'][i], 0.4, 0.5, 'glock').loud(-20), t, -8, -0.5)
s = sfx.swish(0.25, direction=-1, seed=345)
S(s, C['card5'] - 0.04, -10, 0.85, hit=False)
for i, t in enumerate(C['cards']):
    s = sfx.swish(0.22, direction=-1, seed=330 + i)
    S(s, t - 0.04, -6, 0.7, hit=False)
    S(sfx.paper('slide', 0.2, seed=340 + i), t, -2, 0.55 - i * 0.05)
    photocopier(t, gain=-7, pan=0.45, seed=i)
    S(sfx.typing(n_keys=3, rate=12, seed=350 + i), t + 1 / 12, -12, 0.5, hit=False)

# ------------------------------------------------------------------ END CARD
S(sfx.paper('slide', 0.6, seed=399), C['flip'][0] + 0.05, -6, 0.4, hit=False)          # the corner peels up
s = sfx.whoosh(0.6, 'cloth', direction=-1, peak=0.6, seed=400)
S(s, C['flip'][0] + 0.38, -3, -0.2, hit=False)
S(sfx.paper('flip', 0.35, seed=401), C['flip'][1], 0, -0.1)
S(sfx.impact('soft', seed=402), C['flip'][1], -6, 0.0, hit=False)
paper_slap(C['end_line1'], gain=1, pan=-0.1, body=-5, seed=410)
paper_slap(C['end_line2'], gain=1, pan=-0.2, body=-5, seed=411)
paper_slap(C['peishang'], gain=3, pan=0.15, body=-4, seed=430)
S(sfx.stamp('rubber', seed=431), C['peishang'], 0, 0.15, hit=False)
S(sfx.sticker_slap(seed=432), C['peishang'] + 1 / 12, -2, 0.3, hit=False)
S(sfx.pen('marker', 0.3), C['peishang'] + 2 / 12, -10, 0.0, hit=False)
S(sfx.click('soft'), C['peishang'] + 4 / 12, -8, 0.4, hit=False)
S(sfx.impact('soft', seed=440), C['lockup'], -4, 0.0)
S(sfx.tape_rip(0.1, seed=441), C['lockup'] + 1 / 12, -12, -0.4, hit=False)
S(sfx.sticker_slap(seed=450), C['small_line'], -6, 0.0)
bell = m.track('bell', level=-27, sends={'plate': -9}, group='sfx')
chord = sorted(f.chord_at(END))
for j, n in enumerate(chord[-3:]):
    bell.add(fm.bell(int(n) + 12, 1.6, 0.6, 'glock'), END + j * 0.04)

res = m.export(os.path.join(D, 'out/audio.wav'), tp=-2.6, spectrogram=os.path.join(D, 'out/audio_spec.png'))
print({k: res[k] for k in ('duration', 'lufs', 'true_peak', 'stereo_corr', 'longest_gap') if k in res})
print('warnings', res.get('warnings'))
HITS = sorted(set(round(h, 4) for h in HITS))
json.dump(HITS, open(os.path.join(D, 'out/hits.json'), 'w'))
try:
    al = mg.hit_alignment(os.path.join(D, 'out/audio.wav'), HITS)
    bad = [a for a in al if not a['ok']]
    print('alignment: %d hits, %d off by > 40 ms' % (len(al), len(bad)), [(round(a['hit'], 3), round(a['err'], 3) if a['err'] is not None else None) for a in bad][:12])
except Exception as e:
    print('alignment check failed', e)
