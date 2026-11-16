# Vorschau mit dem Upload-Knopf, nachgebaut nach examplePhotoMarkup (photo-placeholder.mjs, R15): nur Vorschau.
import sys, json, re, asyncio
from pathlib import Path
from playwright.async_api import async_playwright
D=Path(sys.argv[1]).resolve(); KAT=Path(sys.argv[2]).resolve(); OUT=Path(sys.argv[3]); OUT.mkdir(parents=True,exist_ok=True)
fonts=json.load(open(KAT/'schriften/schriften.json'))['fonts']
ff=''.join(f"@font-face{{font-family:'{f['name']}';src:url('file://{(KAT/f['file']).as_posix()}');}}" for f in fonts if f.get('file'))
def button(win):
    x,y,w,h=map(float,win.split()); cx,cy=x+w/2,y+h/2
    words='Foto-Upload hier klicken'.split(); lines=['']
    for wd in words:
        if lines[-1] and len(lines[-1]+' '+wd)>21: lines.append(wd)
        else: lines[-1]+=(' ' if lines[-1] else '')+wd
    bw=min(w*.9,98); font=min(4.5,w/12); hh=len(lines)*font*1.25+4; by=cy+h*.28
    t=''.join(f'<tspan x="{cx}" y="{by-hh/2+2+font+i*font*1.25}">{l}</tspan>' for i,l in enumerate(lines))
    return f'<g><rect x="{cx-bw/2}" y="{by-hh/2}" width="{bw}" height="{hh}" rx="2" fill="white" fill-opacity=".94"/><text text-anchor="middle" font-family="Arial,sans-serif" font-size="{font}" fill="#244d3c">{t}</text></g>'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--allow-file-access-from-files'])
        pg=await b.new_page(viewport={'width':1200,'height':800})
        for d in sorted(D.glob('BSUV-*')):
            svg=(d/'design.svg').read_text()
            wins=re.findall(r'data-upload-window="([^"]+)"',svg)
            if not wins: continue
            svg=svg.replace('</svg>',''.join(button(w) for w in wins)+'</svg>')
            html=f"<html><head><style>{ff} body{{margin:0}} svg{{width:1200px;height:800px;display:block}}</style></head><body>{svg[svg.index('<svg'):]}</body></html>"
            h=d/'_k.html'; h.write_text(html); await pg.goto('file://'+str(h)); await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(150)
            await pg.screenshot(path=str(OUT/(d.name+'.png'))); h.unlink()
        await b.close()
asyncio.run(main())
