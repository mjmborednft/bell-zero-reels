import resvg_py, glob, sys, io
from PIL import Image
files=sorted(glob.glob('tools/svg_preview/out/f*.svg'))
for f in files:
    try:
        png=resvg_py.svg_to_bytes(svg_path=f, width=540, height=960)
        open(f.replace('.svg','.png'),'wb').write(bytes(png))
        print("ok",f)
    except Exception as e:
        print("ERR",f,str(e)[:200])
