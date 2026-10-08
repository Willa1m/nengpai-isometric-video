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

## Independent review #1 (fresh sub-agent; it saw only `video.mp4`, the Style / Output / Creative seed / Signature sections and the rubric's jury prompt)
| style_fidelity | concept_wow | motion_craft | design_typography | finish_texture | sound_sync | technical |
|---|---|---|---|---|---|---|
| 6 | 6 | 5 | 6 | 6 | 6 | 7 |

**Priority answers:** concept_wow was **not** ≥ 7, and 成交 did **not** read as a real climax. The price and premium were already final at 9.87 s, the gavel struck air, the shake rendered as a double exposure, and the stamp was small, in a corner, and collided with a digit. Other critical items:
- the rolling columns smeared into solid red blocks, and the commas were clipped;
- echo trails on the tags, paddles and premium text;
- the HUD sat outside the 6 % margin during the camera push;
- the tags and paddles were unreadable on a phone;
- only 4 truly silent frames before the hit;
- video bitrate 20.02 Mb/s, just over the cap.

## Round 2 — what changed (rubric step 2: critical issues and top-impact fixes first)
R1 is kept as `versions/r1/` (video, cover and source).
1. **成交 rebuilt as one strike.**
   - The last bid now lands on the impact frame (300): ¥2,120,000 → ¥2,180,000 and +112 % → +118 % happen on the hit, and the label flips 当前价 → 成交价, LIVE → 竞价结束.
   - The gavel enters raised and fully in frame, rises (2 f), holds with a 2 px tremble (2 f), and swings in 2 f with an analytic smear.
   - Its band lands on the cap line of the digits. The price squashes 0.85 high × 1.08 wide from the baseline and rebounds.
   - The shake is real, constant within each frame, on frames 300–303 (+18/−12/+8/−3 px). A brand-red 35 % wash plays for 2 frames, plus a gold flash, shockwave and burst.
   - The gavel lifts out. At 10.30 a **centre-screen 成交 seal (Ø ≈ 520 px, −8°)** drops from 1.6× to 1.0 in 4 frames with a 6 % undershoot, over the dimmed price. 溢价 +118 % drops under it as a solid red pill. The seal holds about 0.65 s, then its ring opens the paper iris.
2. **Silence**: 6 frames of true digital silence (9.800–9.998 s), applied after mastering so no reverb tail leaks in. The hit layers are louder, the bid bed is lighter (kick −2.5 dB, clap −2 dB, bid blips −3 dB), and the proof and end sit about 3–7 dB under the bid bed.
3. **Odometer**:
   - Blur is 0.5 × velocity, capped at 46 px, and minimum roll time is 0.12 s, so digits stay legible.
   - ¥ and commas are drawn outside the window mask.
   - ¥1,000,000 起拍价 holds 6.3–7.0 s before the first bid.
   - Discrete UI state (counters, premium, labels) uses frame-centre time, so there are no blended text echoes.
4. **Paddles**: 6 solid #E8202A discs (Ø 92 px, white 出价 at 30 px, handle stub). Each pops in inside the safe area, arcs to its column and morphs circle → digit over the last 10 frames, landing on the bid.
5. **Clean via-circle**:
   - Every A → circle → B now holds a geometrically clean circle for the middle 12 % (about 2.5 frames), with a 12 % squash on the circle beat.
   - Circle ↔ shape correspondence is radial (each vertex rides its own ray), so the saw-tooth roof grows out instead of crumpling.
   - Matched sub-parts shrink to specks through the circle. Shade facets collapse and grow instead of travelling outside it.
   - Fills use nonzero winding with reversed holes, so a fold can never punch a hole.
6. **Hook**: the logo-gavel is 240 px (was 150) and arcs in from frame-left, visible and spinning on frame 0. The grey dot is 168 px. The music bed starts on the tap.
7. **Bracelet & tags**: thinner ring (inner/outer 0.74), a two-tone ivory gradient and a soft specular that sweeps along the ring (the clip-art star is gone). Tags are 196 × 82 with 27 px 起拍价 and 20 px category.
8. **HUD** is drawn in screen space at 125 px left/right margins and is unaffected by the camera push.
9. **Proof**:
   - Each figure group (prefix + number + unit) is centred on its column axis, with the descriptor centred below.
   - ▲ is pinned 12 px off the number's top-right.
   - % is visible during the 92 count.
   - The complete row holds about 0.58 s.
10. **End**:
    - Converge → logo at 13.30 (was 13.60); the lockup is complete by about 13.9, so the hold is about 1.1 s.
    - The lockup is centred on the frame axis. The gap from the lockup to the slogan is about 110 px.
    - Shine sweep at 14.3. The end chord fades over the last 0.9 s.
11. Encode capped at 18 Mb/s. Motion blur is 8 sub-samples (was 4). The seeded RNG is hashed, so the confetti no longer lines up in a column.
12. After the R2 full render I found two defects in my own frame check, both in the hero window: the contact squash ghosted frame 300 (it varied inside the shutter), and the dimmed gold 「成交价」 label showed through the seal and garbled 「一锤定音」. I re-rendered **only the GOP 6.333–11.267 s** (148 frames) with the fixes (frame-centre contact squash, label hidden under the seal, a 72 % ink backing disc behind the seal). I encoded it with identical x264 settings and stream-copy spliced it at the existing IDR frames, so the rest of the film is bit-identical to the R2 render. This replaced a second full render.

## Round 2 — check numbers (final `video.mp4`)
| check | measured |
|---|---|
| Duration / frames | 15.000 s, 450 frames, splice points continuous (timestamps checked frame by frame) |
| Video | 1920×1080, 30 fps, H.264 High, 19.89 Mb/s (container 20.23 Mb/s incl. 320 kb/s AAC), 37.9 MB |
| Audio | AAC-LC stereo 48 kHz |
| Loudness | −14.1 LUFS integrated, LRA 2.9 LU |
| True peak | −1.7 dBTP |
| Silence | 9.799–9.995 s, exactly the 6 frames before the hit (true digital zero) |
| Black frames | 0 |
| Fonts | every CJK glyph resolves (`document.fonts.check`) |

## Independent review #2 (a new sub-agent, same prompt, on the R2 film)
| | style_fidelity | concept_wow | motion_craft | design_typography | finish_texture | sound_sync | technical |
|---|---|---|---|---|---|---|---|
| **Review 1 (R1)** | 6 | 6 | 5 | 6 | 6 | 6 | 7 |
| **Review 2 (R2)** | 6 | 6 | 5 | 6 | 6 | 6 | 7 |

**Priority answers (review 2):** concept_wow is still **6, not ≥ 7**, and 成交 still does **not** read as one climax. The scores did not move.

The reviewer's main points, as I read them against my own frames:
- **The hit is read as three events.** Strike (f300), gavel lift-off (f306–308, read as "a second swing"), then the seal (f309). My choice to land the last bid *on* the impact frame backfired: for ~5 frames the price still reads ¥2,120,000 while the pill already says +118 %, and it then rolls. That is a real logic error, and the brief says "the price freezes".
- **The seal is red-on-maroon** and hides the final price when it lands.
- **The odometer blur still reads as a box smear** at the fastest rolls.
- **Notches during circle ↔ factory / apartment.** The radial correspondence I introduced folds on the non-star-shaped saw-tooth and stepped crown.
- **The proof row reads as a stock three-up KPI row**, and its count steps look like ~8 fps.
- **The end gather is weak dot drift.**
- **The mix is still compressed** (LRA 2.9 LU) and the end chord is bass-heavy on a phone.
- **The bitrate sits at the ceiling.**
- **I disagree on one point:** the reviewer says the stamp has no sound. There is a seal + thud layer whose onset measures at 10.283 s, but it is masked by the hit's boom tail, so in practice it is inaudible.

## Honest self-critique (final)
**Concept (two sentences):** One red circle — the client's own logo — is tapped awake by its gavel and morphs through the assets a judicial auction sells, flattens into a live-auction screen whose red odometer climbs, and is struck 成交. The seal's ring opens onto the proof figures, which collapse back into the circle as the gavel lands: the logo.

**Strongest:** the idea is fully carried by shapes. Logo → asset chain → capsule → screen → seal ring → iris → logo, with the bracelet rhyme and the gavel pulled out of the logo. The engine itself is sound: equal arc-length resampling, first-vertex alignment, a held via-circle, sub-part and shade continuity. Spec compliance holds: 15.000 s, −14 LUFS, −1.7 dBTP, 6 silent frames.

**Top-3 weaknesses (agreeing with both juries):**
1. **The 成交 climax is still not one decisive event.** The fix is clear: price and +118 % reach the final value *before* the swing and freeze with zero blur. Strike and seal land on the same frame (or the seal exactly one 8th later with its own audible thock), and the gavel stays put instead of lifting out. Put the seal on a paper-coloured punch-out so it reads red-on-paper, offset so ¥2,180,000 stays readable.
2. **Motion craft scores 5 in both reviews.**
   - Morph halves are tight and holds are long ("shape, pause, shape").
   - The radial correspondence folds on concave outlines; per-shape star-centre selection or flubber-style segment matching would fix it.
   - Odometer smear at the fastest rolls.
   - The proof count steps too coarsely.
3. **Mix dynamics.** LRA ≈ 3 LU, the hit is only ~4–5 dB over the bid bed, and the end chord has little mid-range for phone speakers.

**What I would do with more time:**
- Rebuild the climax as described in weakness 1.
- Lengthen morph halves to 10–12 frames, shorten the holds, and add S-arc travel across frame.
- Continuous rolling count-ups in the proof.
- Gather the figures into a centre circle that then slides left as the wordmark wipes in.
- Re-voice the end chord in the 200 Hz–2 kHz band and leave real headroom before the hit.

**Final self-score:** style 6.5 · concept 6.5 · motion 5.5 · design 6.5 · finish 6.5 · sound 6 · technical 7.5. This is above both juries in five of seven dimensions, by 0.5 each. By their reading the film is still not at the 8–9 target; a third round would be needed.
