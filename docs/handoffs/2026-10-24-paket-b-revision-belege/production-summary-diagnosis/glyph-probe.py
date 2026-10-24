import json,pathlib,sys
import pymupdf as fitz
from fontTools.ttLib import TTFont
out=pathlib.Path(sys.argv[1]);out.mkdir(exist_ok=True)
results=[]
for label,font in [('Arial',fitz.Font(fontfile='C:/Windows/Fonts/arial.ttf')),('Helvetica',fitz.Font('helv'))]:
 doc=fitz.open();page=doc.new_page();writer=fitz.TextWriter(page.rect)
 texts=['Hallo Wörld','Anna & Lukas','UV-Druck']
 for i,s in enumerate(texts):writer.append((36,60+20*i),s,font=font,fontsize=12)
 writer.write_text(page);pdf=doc.tobytes();(out/(label+'-glyph-probe.pdf')).write_bytes(pdf);opened=fitz.open(stream=pdf,filetype='pdf');extracted=opened[0].get_text()
 cmaps=[]
 for info in opened[0].get_fonts(full=True):
  typ,value=opened.xref_get_key(info[0],'ToUnicode')
  if typ=='xref':
   cmap=opened.xref_stream(int(value.split()[0])).decode('ascii');(out/(label+'-ToUnicode.txt')).write_text(cmap,encoding='utf-8');cmaps.append({'fontXref':info[0],'toUnicode':value})
 results.append({'font':label,'source':texts,'extracted':extracted,'glyphIds':{hex(cp):font.has_glyph(cp) for cp in [0x20,0xa0,0x2d,0xad]},'toUnicode':cmaps})
cmap=TTFont('C:/Windows/Fonts/arial.ttf').getBestCmap();report={'pymupdf':fitz.VersionBind,'ArialCmap':{hex(cp):cmap[cp] for cp in [0x20,0xa0,0x2d,0xad]},'cases':results};(out/'glyph-probe.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,ensure_ascii=False))
