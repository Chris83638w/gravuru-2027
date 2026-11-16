import sys, json, asyncio
from pathlib import Path
from playwright.async_api import async_playwright
LF2=Path(sys.argv[1]).resolve(); KAT=Path(sys.argv[2]).resolve()
fonts=json.load(open(KAT/'schriften/schriften.json'))['fonts']
ff=''.join(f"@font-face{{font-family:'{f['name']}';src:url('file://{(KAT/f['file']).as_posix()}');}}" for f in fonts if f.get('file'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--allow-file-access-from-files'])
        pg=await b.new_page(viewport={'width':1200,'height':800})
        for d in sorted(LF2.glob('BSUV-*')):
            svg=(d/'design.svg').read_text()
            html=f"<html><head><style>{ff} body{{margin:0}} svg{{width:1200px;height:800px;display:block}}</style></head><body>{svg[svg.index('<svg'):]}</body></html>"
            (d/'_render.html').write_text(html)
            await pg.goto('file://'+str(d/'_render.html'))
            await pg.evaluate('document.fonts.ready')
            await pg.wait_for_timeout(150)
            await pg.screenshot(path=str(d/'preview.png'))
            (d/'_render.html').unlink()
        await b.close()
asyncio.run(main())
