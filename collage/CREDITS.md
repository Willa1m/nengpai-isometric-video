# Credits & licences — 领拍 LINGPAI collage film

| Asset | Source | Licence / status |
|---|---|---|
| Asset photos (`client/assets_crop/*.jpg`: container houses, restaurant furniture, laundry plant, wing-in-ground craft, paper-cutting machine, steel profiles, industrial park, glass factory, residential complex, office tower) | Client 广东领拍科技有限公司 (lingpai-video-assets.zip) | Client-provided and authorised for this film. Readable names, signs, ribbons and watermarks are cropped, in-painted or covered by baked paper patches (see `film/work/prep.py`). |
| `17_company-equity-docs.jpg` | Client | Used only as a heavily blurred (σ = 9 px), halftoned, unreadable paper scrap. Not committed to the repository. |
| 领拍科技 logo, LINGPAI colour wordmark | Client | Client brand, authorised. White logo keyed off black; colour wordmark un-mixed from its white page (colour unchanged). |
| 阿里资产 logo (`logo_ali.png`) | Client (authorised partnership lockup) | Byte-identical copy of the supplied PNG, drawn unaltered (no recolour, no effects, aspect preserved) on a clean flat panel, end card only. |
| Shenzhen outline | `apache/echarts` 4.9.0 `map/json/province/guangdong.json` (feature 深圳市) | Apache-2.0 |
| Paper texture `Paper001_4K_color.jpg` (tinted to kraft / newsprint) | ambientCG, via `mg-styles-15/assets/textures` | CC0 |
| Hand, sleeve, buyer silhouettes, big-headed puppet, pins, tapes, tags, notes, stamps, newsprint scraps, phone cards | Drawn procedurally for this film (`film/work/prep.py`, `film/js/main.js`) | Original work |
| Fonts: Noto Sans SC, Noto Serif SC (via `@fontsource`) | Google / Adobe | SIL OFL 1.1 |
| Font: ZCOOL QingKe HuangYou (`@fontsource/zcool-qingke-huangyou`) | ZCOOL | SIL OFL 1.1 |
| Font: LXGW WenKai (`lxgw-wenkai-webfont`) | LXGW | SIL OFL 1.1 |
| Font: Special Elite (`@fontsource/special-elite`, loaded as fallback for Latin digits) | Astigmatic | Apache-2.0 |
| Renderer `harness/render.mjs` | `Vincentwei1021/mg-styles-15` (adapted: 20 s / 600 frames via `window.DEMO`, Linux Chromium default, bitrate cap) | per that repository |
| Soundtrack toolkit `mgaudio` | `Vincentwei1021/mg-styles-15/lib/audio` | per that repository. All music and SFX are synthesised; sampled piano / glock / crash come from VCSL (Versilian Community Sample Library), CC0 |
| Segmentation masks | rembg (u2net), MIT, run locally; masks committed in `film/work/masks/` | MIT (tool) |

No third-party trademarks appear except the client-authorised 阿里资产 logo in the end-card lockup. Platform names (小红书 / 抖音 / 视频号) appear only as plain typed text on paper labels: no platform logos, icons, brand colours or app UI.
