# 资产焕新岛 · NENGPAI 能拍法服 — 10 s isometric film

## Concept
One gavel strike wakes a frozen island: grey, dormant assets (a silent factory, a stack of machines, an empty office tower, a jade bracelet) are revived tile by tile by a courthouse that grows at the strike point and links every asset with gold data streams. The live auction closes 「成交」, the proof figures rise, and the camera pulls back to show the whole island is the logo's red circle, with the title set on the isometric plane.

## Beat sheet (cues.json drives both picture and sound; 120 bpm, bar lines 1.8 / 3.8 / 5.8 / 7.8)
| t (s) | picture | sound |
|---|---|---|
| 0.00–0.30 | Gold 3D gavel (rebuilt from the logo's geometry, handle pointing screen-right as in the logo) swings down onto a red seal disc | swish |
| **0.30** | **Strike**: seal squash, 4 % camera punch, double red ripple + blueprint tile seams run out | layered wooden gavel knock + sub |
| 0.56–1.43 | Grey tiles flip/drop in as a wave from the strike point; gavel exits up | granular wood clicks + rising marimba per ring |
| 1.16–1.46 | Dormant assets land (tower, factory, machines, jade) — desaturated | muted thunks (no pitch) |
| 1.50 | Island body extrudes: red rim + gold ring (the logo circle) | wooden thump |
| **1.80** | Courthouse: podium lands → walls scaleY with overshoot → columns stagger → beam caps 2–3 frames later → pediment + logo emblem | groove starts; marimba arpeggio per part |
| 2.30–3.60 | Colour floods outward tile by tile (gold rim-light front), houses/trees grow (base → walls scaleY 0→overshoot → roof cap 2.5 frames later), windows light bottom-up | pops, sparkle bed |
| 2.55–3.60 | Gold data streams arc courthouse → factory / machines / tower / jade; each asset revives with a gold flash; smoke, gear, turntable | data chirps, pops, glock |
| 3.30 | Trucks start on the ring road | blips |

(Round-2 retime: tiles land 0.70–1.34, flood from 2.06, streams 2.30–3.35, second gavel strike on the screen at 5.80, figures 5.95/6.15/6.35, panels fold 7.55, pull-back 7.60–8.45, title 8.00–8.40, final chord 8.30, end hold ≈ 8.5–10.0.)
| 3.80–5.60 | Floating live-auction screen: red live dot, bid bars climbing (no invented numbers) | bid blips/ticks, riser, snare roll |
| **5.80** | **成交**: screen card-flips to red/gold 「成交」, gold burst + shock ring, bloom | second gavel knock (落槌) + ding + shimmer |
| 6.05 / 6.30 / 6.55 | Three ink panels grow on iso planes (+X face), count-up 近 400 家法院 · 覆盖 20 余个省市区 · 直播拍卖成交率 92% | wood thock + decelerating ticks |
| 5.55–7.80 | Parallel camera slide, fg clouds/docs 1.0 : island 0.8 : bg docs + dot floor 0.6 | |
| 7.62–8.80 | Panels fold back down; pull-back + slide reveals the whole island floating in cream | air whoosh (peak 8.25) |
| 8.42–8.95 | Title rises out of slots on the iso plane: logo coin, 能拍法服 (layered red depth), gold rule, slogan, small line | cork pop, wood, swish |
| **8.80–10.0** | End hold 1.2 s: water shimmer, trucks, window blinks, smoke, island bob, stream beads | resolved Dmaj9 chord + glock |

## Signature features → realisation
- **30° isometric projection, no vanishing point, equal scale**: Three.js OrthographicCamera on the (1,1,1) diagonal (35.264° elevation, 45° azimuth). Every grid axis is a 30° line on screen.
- **SSR faces**: the ortho iso camera is mathematically the Scale-86.6 % → Shear 30° → Rotate 30° face matrix; all type (figures, 成交, title) is laid on +X faces, so it is SSR-mapped exactly (verticals stay vertical, baselines rise at 30°).
- **Z-order = screen depth**: true depth buffer; objects move only along grid axes.
- **Building growth**: base lands → walls scaleY 0→1 with easeOutBack overshoot → cap/roof lands 2.5 frames later (houses, courthouse, figure panels).
- **Parallel slide camera, no rotation**: camera only pans in the screen plane and zooms; fg/island/bg layers move 1 : 0.8 : 0.6.
- **Miniature world, information-dense yet cute**: 125 tiles, ~30 buildings, trucks, trees, smoke, data streams.

## Tech route
HTML page (Three.js 0.186) that draws any time t (`window.renderAt`), captured by `ref/harness/render.mjs` (headless Chromium, SwiftShader WebGL) and muxed with ffmpeg. Accumulation renderer: AO once per frame (2×16-tap SSAO) + 8 jittered beauty samples per frame (sub-pixel AA, jittered sun = soft shadows, sub-frame time = motion blur). Environment lighting was dropped because it cost ~40 % per sample in software GL. Sound: `film/audio.py` with mgaudio (sampled marimba/glock, FM, synthesised SFX), mastered to −14 LUFS / −1 dBTP.

## Check numbers (final `video.mp4`)
| | measured |
|---|---|
| Duration / frames | 10.000 s, 300 frames |
| Video | 1920×1080, 30 fps, H.264 High yuv420p (CRF 14) |
| Audio | AAC stereo 48 kHz |
| Loudness | −14.1 LUFS integrated |
| True peak | −1.2 dBTP after AAC (−1.69 dBTP on the 24-bit master) |
| Black / frozen frames | none (blackdetect, freezedetect) |
| Fonts | Noto Serif SC 900 / Noto Sans SC 500–900 via @fontsource; every glyph checked with `document.fonts.check` |

## Independent review (round 1, a fresh sub-agent that saw only the video and the prompt sections)
| style | concept | motion | design/type | finish | sound | technical |
|---|---|---|---|---|---|---|
| 7 | 5.5 | 5 | 6 | 6 | 6 | 7 |

## What changed in round 2
1. **Hook**: 3-frame raised hold, 6-frame cubic-in swing, 2-frame tile squash, 6 px camera shake, gavel recoils and exits by 0.64 s; tiles only start after it has left (no interpenetration).
2. **成交 hero**: the gavel returns and strikes the screen (落槌); 6-frame flip with ~8° overshoot, face flash, 4 % expo zoom punch, 40 gold shards and coins landing on the tiles, a flat iso ground ring racing to the rim, radial window flash; sub-drop + second knock + ding.
3. **Asset story**: machines rebuilt (lathe, C-frame press, clean extruded gears that turn), every asset pops when its stream connects, jade glint; 40 % fewer houses.
4. **Palette discipline**: trees pale peach/ivory, red roofs (gold only twice), roads warm grey; gold kept for gavel, streams, 成交 and the figures.
5. **Data streams**: halo tube, tower and jade arcs swing out so they no longer run down the tower facade or the pediment.
6. **Timing and framing**: flood starts during the roof settle (dead beat removed), tower stays inside the safe area, island fully in frame during the figures.
7. **End**: figures sit on the left and fold away where the title rises; a true pull-back (zoom 1.21→1.12 + short slide) instead of a whip; title lands by 8.4 s (≈1.5 s hold); coins and documents kept clear of the title; thinner name extrusion; small line larger and darker (#5E524C).
8. **Finish**: depth-aware blur on the AO (removes the screen-space stripes), grain 2 %, 16 samples per frame on the fastest moves.
9. **Sound**: pad HPF 90 Hz and −3 dB at 250 Hz, +3–3.5 dB at 3 kHz on marimba, wooden 2–5 kHz transient on the knock, lighter sub/bass, −1.5 dBTP ceiling.
10. **Count-ups** start at 60 % with ease-out-expo (no readable "0" frames) and hold ≥ 0.7 s.

## Self-assessment after round 2 (not re-reviewed by the jury)
style 8 · concept 7 · motion 6.5 · design 7.5 · finish 7 · sound 7 · technical 8

## Top-3 remaining weaknesses
1. **Motion blur is sampled** (8–16 sub-frames in software WebGL), so the fastest moves (screen flip, gavel swing, tile drops) still show stepped ghosting instead of smooth blur.
2. **The house/tree kit is still generic.** The four client assets are present but small; the jade bracelet in particular does not read as a hero object at phone size.
3. **Data streams are free 3D arcs, not orthogonal iso routing**, and the jade arc still passes over the courthouse steps; the opening 0.3 s is visually sparse (gavel + one tile on cream).
