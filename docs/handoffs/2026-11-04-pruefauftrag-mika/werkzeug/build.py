import json,collections
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment
from openpyxl.utils import get_column_letter
M=json.load(open('main.json')); D=json.load(open('dates.json')); O=json.load(open('open-designs.json'))
def linie(s):
    t=s.lower()
    for k,v in [('bestand/','Bestand (Corel-Altbestand, Rohdaten)'),('grabstecker','Grabstecker Edelstahl'),('rasse','Rasseschilder 15 × 10'),('monogramme','Schiefer (Monogramme)'),('schiefer','Schiefer'),('gedenktafeln-ae','Gedenktafeln AE'),('gedenktafeln-edelstahl','Gedenktafeln Edelstahl'),('gedenktafeln','Gedenktafeln Schiefer (Bestand 22x14/30x20)'),('acryl-abstandshalter','Acryl AA/AS/S/S'),('edelstahl-gravur','Edelstahl-Schilder (+ Acryl 3 mm)'),('hinweise','Hinweisschilder Edelstahl'),('boxenschilder','Boxenschilder'),('brettchen','Holz-Brettchen')]:
        if k in t: return v
    return 'Sonstige'
WF=Font(name='Arial',bold=True,color='FFFFFF'); H=PatternFill('solid',fgColor='343E46'); B=Font(name='Arial',bold=True); N=Font(name='Arial')
gelb=PatternFill('solid',fgColor='FFF2CC')
def head(ws,cols,widths):
    ws.append(cols)
    for c in ws[ws.max_row]: c.font=WF;c.fill=H;c.alignment=Alignment(wrap_text=True,vertical='top')
    for i,w in enumerate(widths,1): ws.column_dimensions[get_column_letter(i)].width=w
    ws.freeze_panes=ws.cell(row=ws.max_row+1,column=1)
wb=Workbook(); ws=wb.active; ws.title='Übersicht'
ws.append(['Alle Designs gravuru-Katalog – Stand 04.11.2026, 11:45 (Quelle: Katalog-Repo main 3c6051fb + alle offenen Katalog-PRs)'])
ws.append(['Gezählt: jeder Ordner mit design.json. „Mit Zielen“ = erscheint in einem Produkt. „Freigegeben“ = mindestens ein Ziel von Chris freigegeben.'])
ws.append([])
head(ws,['Linie','Designs auf main','mit Zielen (im Produkt)','ohne Ziele (erscheinen nirgends)','freigegeben (Chris)','nicht angeboten','Serien'],[46,14,16,18,14,12,8])
agg=collections.defaultdict(lambda:[0,0,0,0,0])
for s,v in M.items():
    a=agg[linie(s)]; a[0]+=v['n'];a[1]+=v['ziele'];a[2]+=v['frei'];a[3]+=v['nicht'];a[4]+=1
s0=ws.max_row+1
for k,a in sorted(agg.items(),key=lambda x:-x[1][0]):
    ws.append([k,a[0],a[1],a[0]-a[1],a[2],a[3],a[4]])
    if a[0]-a[1]: ws.cell(ws.max_row,4).fill=gelb
r=ws.max_row; ws.append(['Summe main']+[f'=SUM({c}{s0}:{c}{r})' for c in 'BCDEFG'])
ws.append([])
ws.append(['Nicht gemergt: neue Designs in offenen Katalog-PRs',sum(x.get('neu',0) for x in O),None,None,None,None,sum(1 for x in O if x.get('neu'))])
ws.append(['  davon Astra Mika: 1.977 Menschen/Sternenkinder (95 PRs) + 25 Grabkreuze Hunde + 25 Katzen = 2.027 (die 25 Hunde stecken auch in #126 und sind nur einmal gezählt)',2027])
ws.append(['  Mika gesamt laut seinem Index (master-index.json, 01.11.): 2.097 Menschen/Sternenkinder = 120 auf main (9 gemergte Herz-mit-Foto-PRs) + 1.977 offen',2097])
ws.append(['  davon Astra gravuru / Astra (Bestand, Boxen, Firmen, Tierbestand, Pferde, Hausnummern-Pilot)',sum(x.get('neu',0) for x in O if x['n'] in (9,13,14,16,153))])
ws.append(['  davon Rasse-Schilder (#8, Okt.)',sum(x.get('neu',0) for x in O if x['n']==8)])
ws.append(['  davon AE-Türschilder (#139)',sum(x.get('neu',0) for x in O if x['n']==139)])
ws.append([]); ws.append(['Auf main hinzugefügt nach Tag (Commit-Datum)'])
day=collections.Counter()
for k,v in D['per'].items(): day[k.split('|')[1]]+=v
for d in sorted(day): ws.append([d,day[d]])
ws.append(['Sonntag 01.11. abends bis Montag 02.11. früh: Unterkategorie-Chats gemergt (2.238 + 8.484). Mikas Schiefer-PRs vom 01.11. sind NICHT gemergt → Blatt „Offene PRs“.'])
w2=wb.create_sheet('Serien main')
head(w2,['Linie','Serie (Ordner designs/…)','Designs','mit Zielen','ohne Ziele','freigegeben','nicht angeboten','Material','erstmals hinzugefügt','zuletzt hinzugefügt'],[36,50,9,10,10,11,11,24,13,13])
for s,v in sorted(M.items(),key=lambda x:(linie(x[0]),x[0])):
    w2.append([linie(s),s,v['n'],v['ziele'],v['n']-v['ziele'],v['frei'],v['nicht'],', '.join(f'{k or "–"} {c}' for k,c in v['mat'].items()),D['first'].get(s,''),D['last'].get(s,'')])
    if v['ziele']<v['n']: w2.cell(w2.max_row,5).fill=gelb
w2.auto_filter.ref=f'A1:J{w2.max_row}'
w3=wb.create_sheet('01.–02.11. fertiggestellt')
head(w3,['Datum','Linie','Serie','Designs hinzugefügt'],[12,36,50,12])
for k,v in sorted(D['per'].items(),key=lambda x:(x[0].split('|')[1],x[0])):
    s,d=k.split('|')
    if d>='2026-11-01': w3.append([d,linie(s),s,v])
w3.append(['Summe',None,None,f'=SUM(D2:D{w3.max_row})'])
w4=wb.create_sheet('Offene PRs (nicht gemergt)')
head(w4,['PR','von','Titel','Branch','erstellt','neue Designs','geänderte Designs','Serien (neu)','davon mit Zielen'],[7,16,60,52,11,10,10,70,10])
def von(x):
    r=x['ref']
    if 'mika' in r: return 'Astra Mika'
    if 'claude' in r: return 'Claude'
    if 'astra1' in r: return 'Astra 1'
    if x['n'] in (139,): return 'Claude (AE-Chat)'
    if 'issue85' in r or 'astra-gravuru' in r: return 'Astra gravuru'
    if 'astra' in r: return 'Astra'
    return 'Astra/Claude'
for x in sorted(O,key=lambda x:x['n']):
    ser=x.get('serien',{})
    w4.append([x['n'],von(x),x['title'],x['ref'],x['created'][:10],x.get('neu',0),x.get('geaendert',0),'; '.join(f'{k} ({v["n"]})' for k,v in ser.items()),sum(v['ziele'] for v in ser.values())])
    w4.cell(w4.max_row,1).hyperlink=f"https://github.com/Chris83638w/gravuru-katalog./pull/{x['n']}"
w4.auto_filter.ref=f'A1:I{w4.max_row}'
for w in wb.worksheets:
    for row in w.iter_rows():
        for c in row:
            if c.font.color is None or c.font.color.rgb!='00FFFFFF' and not (c.fill and c.fill.fgColor.rgb=='00343E46'):
                c.font=Font(name='Arial',bold=c.font.bold,size=13 if (w.title=='Übersicht' and c.row==1) else 11)
ws['A1'].font=Font(name='Arial',bold=True,size=13)
wb.save('Alle-Designs-2026-11-04.xlsx')
