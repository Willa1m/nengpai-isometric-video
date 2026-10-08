# R3 · 「一锤定音」 — NENGPAI 能拍法服 · 形变动画 / Shape Morph (15 s)

R1 and R2 of the earlier isometric film are left untouched at the repository root. R3 lives entirely in `r3-morph/`.

## Concept
The client's logo is a red circle with a gold gavel, and that circle is the only hero shape in the film. The gavel taps a dormant grey dot awake. The dot then morphs through the assets a judicial auction sells (factory → apartment → white-jade bracelet → gavel, each passing through the circle) and flattens into a live-auction screen whose red odometer climbs. The gavel strikes 成交 and the circle closes back into the logo.

## Beat sheet (`film/cues.json` drives both picture and `film/audio.py`; 100 bpm, beat k = 0.4 + 0.6k)
| t (s) | picture | sound |
|---|---|---|
| 0.00–0.40 | Frame 0 is already moving: the gold logo-gavel spins in and taps a small grey dot | swish → dry wooden knock (0.40) |
| 0.40–0.95 | Squash 30 % on contact. The dot inflates to brand red (back-out overshoot) and red radiates from the contact point. Knock marks. 「每一件沉睡的资产」 rises in | rubber stretch, pop, first pluck |
| 1.00–1.60 | circle → **factory** (saw-tooth roof, chimney, 3 windows + door as holes, smoke puffs as sub-parts). 起拍价 tag pops in on its string | whoosh → landing on beat 2 |
| 2.10–2.80 | factory → circle → **apartment**. Smoke puffs travel into lit windows. An ink colour field blooms out of the circle (2.45) | pitched whoosh, land on bar 1. Window-switch clicks |
| 3.30–4.00 | apartment → circle → **white-jade bracelet** (the ring is the circle with a hole, ivory on a red field; the colour blooms from the centre at the circle stage). Lit windows become the glint and shade | whoosh, shimmer + glass ding on the glint |
| 4.50–5.20 | bracelet → circle → **gold gavel** (the glint and shade become the gavel's two bands). The tag flips to 「即将开拍」. On the bar-2 downbeat the gavel knocks once (开拍) | whoosh, lighter knock |
| 5.42–6.02 | gavel → circle (gold → ink bloom) → wide capsule | sci whoosh |
| 6.02–6.36 | The capsule grows into the full-frame ink auction screen. UI staggers in. ¥1,000,000 起拍价 | UI open, blip |
| 6.40–9.70 | **The bid**: 17 bids on an accelerating grid (beats → 8ths → 16ths → 32nds). Odometer columns roll with overshoot and analytic motion blur. The first 8 bids arrive as 「出价」 paddles that fly in from the edges and morph into the new leading digit. Each bid kicks the price up, sends a ring out from the column and lifts a ▲. 溢价 +x%, 围观 and 出价 count up. The red glow heats and the camera pushes in | 16th pluck arp + 8th bass pulse, kick/clap/hats, odometer ticks (one per digit rolled), paddle pops, tonal + noise riser, snare roll |
| 9.40–9.80 | The big gavel enters raised | frenzy |
| **9.80–10.00** | **6 frames of silence**. The gavel rises (2 f), holds (3 f) and swings (1 f) | silence |
| **10.00** | **HIT (66.7 %)**: the gavel slams onto the price. 4-frame shake, zoom punch, gold flash + shockwave + burst. The price squashes and freezes. 465,000+ / 452 次 | woodblock + wood click + punch + low boom + sub drop + D6/A6 bells + sparkle |
| 10.10–10.15 | The 成交 round seal slams on (ink-eroded edge, −11°). 溢价 +118 % grows into a solid red pill | seal + rubber stamp |
| 10.72–11.3 | The seal's ring opens as a paper iris | air whoosh |
| 10.95 / 11.20 / 11.50 | Circles fly out of the seal, divide into one circle per digit, and each morphs into its digit, then counts up by digit-to-digit morphs (100→400, 10→20, 30→92). ▲, units and descriptors rise in | tick + in-key blip per count step, pop on ▲ |
| 12.75–13.25 | The numbers morph back into circles and fly into ONE red circle that grows with each arrival | soft whoosh, rising pops |
| **13.60** | The gold gavel spins in and lands into its place: the logo. 「能拍法服」, NENGPAI · 综合司法辅助服务, gold rule, 「让司法更高效 · 焕资产新价值」 | knock, Dmaj9 (picardy) strings + glock spread |
| 13.9–15.0 | End hold (~1.1 s): the logo breathes, a shine sweeps the gavel (14.15), faint red digits / ▲ rise, slow push-in | sparkle tail |

## Signature features → realisation
- **Continuous outline, no jumps**: every shape is a 300-point polygon resampled at equal arc length (SVG `getPointAtLength`). Holes (up to 4) and 26 sub-part slots are resampled the same way, so the morphs interpolate point by point.
- **Path alignment / first vertex**: before each morph, `bestShift` picks the cyclic shift of B (and of the via-circle) that minimises the summed squared distance to A. This is the AE "set first vertex" step, done the way flubber does it. Hole and sub-part pairs are aligned the same way.
- **Intermediate bridge**: complex A → B always runs A → circle → B. Each half is 10.5 frames (0.7 s morphs), inside the 8–12 frame spec. The circle's radius is area-preserving between A and B. The capsule is the bridge into the screen. Digits are bridged from circles.
- **Morph + displacement + rotation**: each morph lifts on an arc (46 px) with a ±16–20° swing. Squash & stretch is 10–13 % along the motion axis, with anticipation squash 0.2 s before and a decaying impact squash on landing.
- **Speed curve**: `cubic-bezier(0.7, 0, 0.3, 1)` on every morph half. It is fastest mid-way, with ~3 frames of cushion each end.
- **Colour-field wipes**: paper → ink → red → ink screen → paper iris. All are carried by the shape (fields bloom out of the circle, the capsule becomes the screen, the seal ring opens the iris). There are no crossfades.
- Sub-parts morph in sync: smoke → window lights → jade glint/shade → gavel bands. Shade facets morph into each other.

## Tech route
A canvas-2D page draws any time t (`window.renderAt`, pure function of t, seeded randomness, closed-form physics). It is captured by an adapted `ref/harness/render.mjs` (headless Chromium, 15 s / 450 frames, motion-blur sub-samples) and encoded with x264 capped at ~20 Mb/s. Digit morph targets are real Inter 800 outlines read with opentype.js. The 成交 seal is pre-rendered once with seeded ink erosion. Grain is seeded per frame. Sound is `film/audio.py` (mgaudio), mastered to −14 LUFS.

## Round 1 — check numbers (`film/out/video_r1.mp4`, committed as `video.mp4`)
| check | measured |
|---|---|
| Duration / frames | 15.000 s, 450 frames |
| Video | 1920×1080, 30 fps, H.264 High, 20.0 Mb/s (38.2 MB) |
| Audio | AAC-LC stereo 48 kHz |
| Loudness | −14.1 LUFS integrated, LRA 3.1 |
| True peak | −1.7 dBTP |
| Black frames | 0 |
| Silence | 9.837–9.994 s (the planned gap) |
| Fonts | `document.fonts.check` true for every family/weight and every CJK glyph used |

## Round 1 — self-critique (before the independent review)
Self-score: style 7.5 · concept 7 · motion 6.5 · design 7 · finish 6.5 · sound 6.5 · technical 7.
- **Strongest**: the logo-as-circle idea carries the whole film. The bracelet ring rhyme and the gavel → capsule → screen → seal-iris → logo chain are all carried by shapes. The 成交 still is poster-grade.
- **Weakest** (some already found in my own frame-by-frame QC and fixed in source for R2, not yet rendered):
  1. On the hit frames (10.00–10.13) the camera shake and zoom punch varied across the motion-blur sub-samples, so the whole frame doubled, including the counters' 465,000 → 465,000+ swap. *Fixed in source: camera and UI state now use frame-centre time.*
  2. In the factory → apartment via stage, the chimney shade facet travelled outside the circle as a dark-red bracket. *Fixed: shade facets collapse/grow through the via circle.*
  3. The screen-reveal roundrect shows stepped bands under 4-sample blur. The bid section is still compositionally static for ~3 s. The commas are clipped by the odometer's window mask. The confetti strobes into dotted lines.
- I cannot listen to the mix; sync was checked with onset analysis (visual hits land 0–1 frame after the audio onsets).
