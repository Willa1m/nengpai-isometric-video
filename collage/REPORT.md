# 领拍 LINGPAI「你要的，这里有」— 20 s collage / cut-out film

Final file: `collage/video.mp4` (round 2). Round-1 film = commit `collage film round 1` in git history. Reviews: `reviews/review_r1.md`, `reviews/review_r2.md`.

## Concept
A buyer's three handwritten wishes are slapped onto a kraft page, and hands answer them with an avalanche of real disposal assets (有货) until the page turns into a detective "matching board" where blue strings shoot from each wish, and then from a crowd of anonymous buyers, to the right asset (能配). The board rips into the two engines (Shenzhen intermediary network / self-media matrix) and a page flip lands on 「你要的资产，领拍帮你配上」 with the 领拍 | 阿里资产 lockup.

## Beat sheet (`film/cues.json` drives picture and sound; 90 bpm, bar lines 2.667 / 5.333 / 8.0 / 10.667 / 13.333 / 16.0)
| t (s) | picture | sound |
|---|---|---|
| 0.00 | Frame 0 already moving: a hand carries the first torn notebook note in (camera 2.1× on the notes) | vinyl crackle, piano intro |
| 0.33 / 1.00 / 1.67 | Three notes slapped on, overlapping: 想找一批二手设备？ / 想在深圳收厂房？ / 想低价拿写字楼？; blue highlighter draws under each key word | hand whoosh + paper slap + thud ×3, marker squeaks |
| 2.00–2.33 | Blue marker arrow draws itself toward the empty page; two scissor snips | pen, scissors |
| 2.17–2.67 | Camera pulls back 2.0× → 1.06× | air whoosh |
| **2.67** | Drums drop; first real asset (machine, 设备) slapped by a hand | kick + slap |
| 2.67–4.83 | Avalanche: 9 real asset cut-outs in accelerating slaps (0.5 → 0.17 s), each with a torn tag typed letter by letter and a masking-tape strip | slaps panned across, typewriter, tape |
| 4.92–5.33 | The wing-in-ground craft swoops in on an arc with stop-motion smear ghosts and POPs onto the page | heavy whoosh, slide whistle, cork pop, boing |
| 5.50–6.83 | Blue constructivist band tears across; 破产资产 · 公物处置 · 企业资产 punch in char by char; thumbnail avalanche (上千件) | tape rip, 3 text slams, paper rustle |
| 6.83–7.50 | 上千件标的 ransom chips (千 punch 7.25), marker underline; 有货 slammed | slaps, punch, rubber stamp |
| 7.75–8.0 | Band ripped away, chips and thumbnails blown off | tape rip, whoosh |
| 8.0–8.5 | Push pins drop into notes and assets | pin clicks |
| 8.67–10.0 | String 1 note → machine (twang 9.0), orange marker loop, 匹配 stamp 9.33; string 2 note → industrial park (twang 9.67), stamp 10.0 | steel-string twangs, rubber stamps |
| 10.25–10.58 | Orange disc + crowd of anonymous halftone buyers + a big-headed puppet buyer slapped in | slaps |
| **10.67** | HERO: ~27 strings shoot at once from the crowd to every asset and wish; camera punch; 4 mini 匹配 stamps; puppet raises its paddle (shoulder/elbow joints), jaw talks | strummed twang chord, crash, punch, sub, stamps, muted-horn "voice" |
| 11.33 / 12.17 | Camera push to the crowd: 1000+ (counts 600→1000) 精准买家; pan: 100+ (60→100) 线下合作渠道 | ticks while counting, chip pops |
| 13.33 | The board rips in two (jagged torn edge with white fibre), halves fly apart | long tape rip, whooshes |
| 13.67–14.67 | Left: Shenzhen map slapped by a hand, 16 blue/orange pins pop, a string network grows; 深圳中介服务网络 typed on a taped label | slap, pin pops, typewriter |
| 14.0–15.6 | Right: 全网自媒体矩阵 ransom chips; four paper phone cards dealt like playing cards, each photocopied by a scan bar and labelled 小红书 / 抖音 / 视频号 / 更多平台… (4th keeps sliding) | swishes, card slides, photocopier zips |
| 16.33–16.67 | Page flip (hinged left, 32-strip perspective) | cloth whoosh, page flip |
| 16.83–18.5 | 你要的资产， / 领拍帮你 land char by char; 配上 slammed as orange chips (17.83) + blue underline; lockup panel taped on (18.17); small line typed (18.5) | char ticks, big slap, warm button chord + glock |
| 18.8–20.0 | Hold with living micro-motion: 6 fps hand jitter on the type, tape corners lifting, the matching-string pin wobbling, grain/dust | chord rings out |

## Signature features → realisation
- **Photo cut-outs with white scissor edge**: every client photo is masked (rembg u2net masks for objects, hand-drawn polygon for the table, torn-edge rectangles / circles for scenes) and gets a polygonal 2–6 px white border made with `approxPolyDP` facets (scissor-cut look) and a baked soft shadow.
- **Halftone**: CMYK rosette halftone mixed ~40 % over the photos (they keep their own colour), mono halftone on the buyer silhouettes, the map, the puppet, photocopy halftone on the phone cards and thumbnails.
- **Newspaper texture**: kraft and newsprint grounds from a CC0 paper scan, greeked newsprint scraps, newsprint ransom chips.
- **Disproportionate surreal assembly**: giant hands slapping buildings; a huge-headed buyer with a tiny body; a wing-in-ground craft flying across a pin board.
- **Puppet joints / separate mouth**: the puppet buyer's jaw is a separate piece on a hinge (cavity behind it) that opens on the beat; its paddle arm rotates at shoulder and elbow.
- **Stepped frame rate**: every motion is held on a 12 fps grid (`Q(t)`); the "hand-placed" jitter is re-sampled at 6 fps (±1–1.3 px, ±0.3–0.6°).
- **Layer structure**: paper ground → big colour blocks (blue disc, orange strip, blue band, orange disc) → photo cut-outs → doodles / tape / tags / stamps → grain + dust.
- **Transitions by hand / paper**: elements are slapped on by hands, torn in, ripped off, blown away; the board rips in two; the last section is a page flip.

## Tech route
HTML page with one Canvas 2D (`film/js/main.js`); `window.renderAt(t)` draws any time t (pure function, seeded hashes, no clocks). Assets are baked once by `film/work/prep.py` (numpy/OpenCV): masks, halftone, scissor border, shadows, paper grounds, hand, silhouettes, map, cards. Frames are captured by the reference harness `harness/render.mjs` (headless Chromium, software raster) and encoded with libx264 (CRF 16, maxrate 17 Mb/s). Sound: `film/audio.py` with mgaudio (lofi boom-bap recipe at 90 bpm, piano, vinyl) plus synthesised SFX on the same cue sheet; mastered to −14 LUFS.
Why Canvas 2D rather than DOM: one deterministic draw path for the board, the rip and the page flip (the board is re-rendered into an offscreen canvas and torn / folded as a bitmap).

## Round 1 check numbers (`film/work/check.sh`, `film/work/framediff.py`)
| | measured |
|---|---|
| Duration / frames | 20.000 s, 600 frames |
| Video | 1920×1080, 30 fps, H.264 High, yuv420p, 17.95 Mb/s, 44.9 MB |
| Audio | AAC LC stereo 48 kHz, 320 kb/s |
| Loudness | −14.1 LUFS integrated (master −14.05) |
| True peak | −2.2 dBTP on the delivered AAC (master −2.75) |
| Black frames | none (blackdetect) |
| Static spans > 1 s | none (freezedetect, 3-frame-window frame difference) |
| Fonts | all glyphs pass `document.fonts.check` |

## Round 1 self-assessment (honest)
| style | concept | motion | design/type | finish | sound/sync | technical |
|---|---|---|---|---|---|---|
| 7 | 7 | 6 | 6 | 6.5 | 6 | 8 |

Top weaknesses after round 1:
1. The hand and the puppet are clean vector drawings with halftone; they read "illustrated" rather than the cut-from-old-photographs look of the canonical style.
2. The hero burst lacks a single unmistakable frame: the strings are thin and the orange disc + crowd is busy; the board is dense everywhere, so hierarchy suffers.
3. The end card is correct but plain; the engines section has generous empty newsprint and small type labels.

## Decisions made without asking (noted for the client)
- The new film lives in `collage/` so the earlier isometric project at the repository root stays intact.
- rembg could download its model, so it was used for the object masks; the table was cut by hand.
- The reference repo's recorded foley WAVs have no recorded provenance, so they were **not** used: all SFX are synthesised (mgaudio) or CC0 VCSL samples.
- Tag wording: 设备 / 厂房 / 写字楼 / 住宅 / 家具 / 型材 / 洗涤设备 plus 集装箱房, 整厂 (glass factory, written on the paper patch that covers its sign) and 地效翼船. 「有货」 was added as a single slammed key word (it is the brief's own message word, not a new claim).
- Numbers shown: 1000+ (精准买家, from 1000+ 精准存量客户), 100+ 线下合作渠道, 上千件标的 — all from case-data.txt.
- The colour LINGPAI wordmark is used in the lockup because its horizontal proportion matches the 阿里资产 logo; both are set at matching visual height on one clean flat white panel.


---

# Round 2

## Independent review scores
| round | style | concept | motion | design/type | finish | sound/sync | technical |
|---|---|---|---|---|---|---|---|
| R1 (jury) | 6 | 6 | 6 | 5 | 6 | 7 | 8 |
| R2 (new jury) | 6 | 6 | 6 | 6 | 7 | 6 (measured, not heard) | 9 |

## Fixes applied (by the R1 jury's priority)
| # | jury fix | what was done |
|---|---|---|
| C1 / F1 | End card read as a typed subtitle after an empty page | 8-step corner peel from bottom-right (fold line reflected flap with a newsprint back and a fold shadow); the headline is **slapped as torn paper strips** (130 % → 115 % → 96 % → 100 %, paper-dust puff), 配上 as two orange tiles slammed with a stamp thunk, boiling blue marker underline, matching-string pin; lockup panel taped on; small line slapped as a thin strip. No typed headline, no empty page (first strip lands while the peel finishes). Hold 18.17–20.0 = 1.83 s with tape corners lifting, pin wobble, 6 fps jitter on the strips, grain. |
| C2 / F2 | Rounded display font | ZCOOL QingKe HuangYou removed everywhere. Band: Noto Sans SC Black condensed to 82 %, −12° diagonal, black under-bar, tears in over 3 steps. Ransom "news" chips now Noto Serif SC Black. 匹配 stamp at 85 % ink with grunge. |
| C3 / F3 | Clip-art hand and crowd | No photographic hand or crowd source is reachable from this sandbox (network allows GitHub/npm only; Wikimedia/Met/LoC blocked), so photo cut-outs were not possible. Instead: hand redrawn with tapered knuckled fingers, key-light modelling, tendons, pinstripe suit and a **sepia mono halftone print layer** (reads as cut from an old magazine); buyers rebuilt with ears, shirt V + tie, three **big-headed** variants, dark lenses instead of "owl eyes", and a **separate hinged jaw on every bust that chatters** (2 replacement positions) while the strings fire; the front puppet is a **bowler-hat profile** with a hinged jaw and a shoulder/elbow-jointed **auction paddle marked 拍**. |
| C4 | 卖 glyph anomaly | Root cause: the typewriter "key strike" scale was applied to the wrong character index at 24 cps. Fixed (only the newest character punches) — and the end subline is now a slapped strip, not typed. |
| C5 / F6 | Clipped / occluded copy | 上千件标的 tiles re-spaced and kept below the band; camera framing on 1000+ 精准买家 keeps it fully in frame ≥ 1.2 s (11.33–12.42); 更多平台… label inside x ≤ 1805; fan tightened. The wish notes are still partly cropped by the left edge during the 1.24× push on the crowd (a deliberate camera move; the notes are background at that moment). |
| C6 | Lockup off-centre | Root cause: the supplied 阿里资产 PNG has 203 px of transparent padding on the left. The lockup now centres on the logo's alpha bounding box (drawn from the original pixels, unaltered): rule exactly on x = 960, equal 74 px gaps, both logos 92 px tall. The lockup is drawn in screen space, so it never jitters or scales. |
| F4 | Unreadable hero | Two string waves (10.67 / 11.33, 3 steps each, 3.4–4.2 px strings), constructivist cut-paper sunburst behind the crowd, only 3 匹配 stamps (machine, park, residential) + orange tick tags, unmatched photos washed back 34 % during the hero. |
| F5 | Photo treatment | Halftone period 5.6 → 4.4 px and mix 0.42 → 0.30 (photos keep detail and colour); machine baked at 600 px and shown at ~40 % frame height; the glass-factory crop (trees + asphalt behind a patch) dropped (8 assets + craft remain, within the brief's 8–10); 30 distinct thumbnails (3 crops × 10 sources) instead of 10 repeated. |
| F7 | Craft not a comic beat | 1.0 s Catmull-Rom swoop from off-frame left across the whole frame, path-aligned stretch (up to 128 %), 2 smear ghosts + cut-paper speed strips, POP with an 11-ray orange starburst + paper dust on the bar line (5.33), descending/ascending slide whistles + heavy whoosh + cork pop. |
| F8 | Weak hook | Frame 0 already holds a torn blue diagonal, newsprint scrap, a stray photo, tapes, and the first note + hand entering; paper-dust puffs + camera shake on every note slap. |
| F9 | Exits / act change / late stall | Exits now 5 steps (7.58–8.0), visible from the first step; act-change hit at 8.0 (camera snaps in 1.0 → 1.1, thud, pins); camera follows string 1 and pans to string 2; the engines page is kraft (matches the board); map pins pulse on 15.67 / 16.0 and a 5th card peeks in at 15.83. |

## Round 2 check numbers (`film/work/check.sh`, `film/work/framediff.py`)
| | measured |
|---|---|
| Duration / frames | 20.000 s, 600 frames |
| Video | 1920×1080, 30 fps, H.264 High, yuv420p, 16.9 Mb/s, 41 MB (cap 16 Mb/s maxrate) |
| Audio | AAC LC stereo 48 kHz 320 kb/s |
| Loudness | −14.1 LUFS integrated (master −14.06), LRA 2.8 LU |
| True peak | −2.1 dBTP on the delivered AAC (master −2.75) |
| Black frames / static spans > 1 s | none / none (frame-difference plots `reviews/framediff_r1.png`, `framediff_r2.png`) |
| Fonts | every glyph passes `document.fonts.check`; no rounded display face |
| Compressed preview | 1080p CRF 23, 21.6 MB |

## Round 2 beat changes (full cue sheet in `film/cues.json`)
0.00 frame 0 already a collage (blue diagonal, scraps, tape) + note 1 entering · 0.33 / 1.00 / 1.67 note slaps with dust puffs · 2.67 drums + machine · 2.67–4.67 eight assets · 4.33–5.33 craft swoop, POP on the bar line · 5.50 band tears in, 5.83 / 6.17 / 6.50 phrases · 6.83 上千件标的 (千 punch 7.08) · 7.33 有货 · 7.58–8.0 everything torn / blown off · **8.0** act hit, pins · 8.67–9.33 string 1 + stamp · 9.33–10.0 string 2 + stamp · 10.25 photos washed back · 10.33 sunburst + crowd + puppet · **10.67** wave 1 · 11.25 1000+ 精准买家 · **11.33** wave 2 · 12.58 100+ 线下合作渠道 · 13.33 rip · 13.67 map · 14.0 labels · 14.33–15.33 cards · 15.67 / 16.0 pin pulses, 15.83 5th card · 16.17–16.83 corner peel · 16.67 / 17.0 headline strips · **17.33** 配上 · 17.67 lockup · 18.0 small line · 18.17–20.0 hold.

## Honest self-assessment after round 2
The second jury scored round 2 almost the same as round 1 (design 5 → 6, finish 6 → 7, technical 8 → 9, sound 7 → 6 by measurement). The structural problems from round 1 are fixed and verified: no subtitle-style text, no empty page, a centred and still lockup, no rounded font, no glyph anomaly. The film still sits at "solid template" level rather than high-end for these reasons, in order:
1. **The figures are drawn, not photographic.** The canonical collage look comes from cut-up photographs and engravings. This sandbox could only reach GitHub and npm, so I could not source CC0 photos of hands or people, and the drawn hand and buyers still read as illustration or CG to an expert jury.
2. **The hero is a web, not an icon.** Two waves of strings, a sunburst and the crowd are busy. The single unforgettable frame the jury asks for (the strings snapping into 「配」 or the P-mark) does not exist yet.
3. **Copy collisions remain:**
   - During the 1.24–1.3× pushes at 12.3–13.3 s, the wish notes and the end of 1000+ 精准买家 / 洗涤设备 are cropped at the frame edge.
   - The card fan hides the last character of 小红书 and 视频号 for part of the hold.
   - 有货 overlaps 企业资产 in the band for ~0.5 s.
   - The flying craft lands partly under the band.

Further jury notes not yet done: the mix is dense (LRA 2.8 LU) with little air above 4 kHz; stamps need an ink-splatter accent; the stray blue arrow annotation on the machine stays on screen until 12 s; grain and dust specks fall on the logo panel (the logo pixels themselves are drawn unaltered).

## What I would do in a round 3
- **Source real hands and figures.** Use CC0 photos of hands in 2 poses and 12–20 anonymised engraved or photo heads at 1.8× head scale, with the same halftone and scissor-edge pipeline. This needs network access to Wikimedia / Met Open Access, or the client could supply photos.
- **Build the iconic hero beat.** After wave 2, pull back 0.5 s and let the strings snap into 「配」, hold 6 frames, then rip.
- **Fix the type collisions.**
  - Re-set the stats on their own torn strips inside the safe area, with no crop-push.
  - Widen the card fan to about 22° with 180 px offsets.
  - Move 有货 clear of the band.
  - Land the craft on the top layer.
  - Remove the arrow annotation.
- **Polish the mix and the end card.** Duck the bed 3–4 dB under hits (target LRA ~6 LU), add a +3 dB shelf above 6 kHz, and let the button chord ring to 19.6 s. Exclude the grain and dust layer from the logo panel.

## Decisions made without asking (round 2)
- No third full-resolution render. The brief allows one per round and both rounds are used; the remaining jury fixes are listed above for a round 3.
- The glass-factory photo was dropped from the film. Its usable framing is the sign it must hide, and the jury read the covered version as "trees and asphalt". The brief's 8–10 assets are met with 8 assets plus the craft.
- The 1000+ / 100+ count-ups start from about 60 % (600 → 1000, 60 → 100) as the brief asks. Intermediate values are display-only and never shown as claims.
