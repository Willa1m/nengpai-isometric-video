#!/bin/bash
# Reproduce the toolchain for this film (run from collage/).
set -e
[ -d ref ] || git clone --depth 1 https://github.com/Vincentwei1021/mg-styles-15 ref
[ -d lib ] || cp -r ref/lib lib
# the reference repo ships only a subset of the VCSL samples its index lists: keep the entries that exist
python3 - <<'PY'
import json, os
os.chdir('lib/audio/samples')
d = json.load(open('index.json'))
d = {k: [e for e in v if os.path.exists(e['file'])] for k, v in d.items()}
json.dump({k: v for k, v in d.items() if v}, open('index.json', 'w'), indent=1)
PY
npm install --no-audit --no-fund
pip install opencv-python-headless numba pedalboard pyloudnorm soundfile scipy librosa matplotlib "rembg[cpu]"
# client materials: unzip lingpai-video-assets.zip into client/ (17_company-equity-docs.jpg is not committed)
# python3 -I film/work/prep.py         # bake cut-outs (needs client/ + film/work/masks)
# python3 film/audio.py                # soundtrack -> film/out/audio.wav
# . ./env.sh && node harness/render.mjs film --out video.mp4 --crf 16 --maxrate 17M
