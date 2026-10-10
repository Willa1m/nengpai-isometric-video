# 领拍 LINGPAI「你要的，这里有」— 20 s collage / cut-out film

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
