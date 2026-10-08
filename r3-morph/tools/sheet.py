"""Contact sheet: python3 tools/sheet.py out.png img1.png img2.png ... (3 columns, 640x360 tiles, labelled)."""
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
cols = int(__import__('os').environ.get('COLS', 3)); tw, th = int(__import__('os').environ.get('TW', 640)), 0
ims = [Image.open(f).convert('RGB') for f in files]
th = int(tw * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * tw, rows * (th + 18)), (40, 40, 40)); d = ImageDraw.Draw(S)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * tw, (i // cols) * (th + 18)
    S.paste(im.resize((tw, th), Image.LANCZOS), (x, y + 18)); d.text((x + 4, y + 3), f.split('/')[-1], fill=(255, 255, 255))
S.save(out)
