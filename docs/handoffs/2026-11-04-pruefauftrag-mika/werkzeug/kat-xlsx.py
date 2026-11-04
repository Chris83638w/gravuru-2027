import json,collections,re
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment
from openpyxl.utils import get_column_letter
R=json.load(open('kategorien.json'))
WF=Font(name='Arial',bold=True,color='FFFFFF');H=PatternFill('solid',fgColor='343E46');N=Font(name='Arial');B=Font(name='Arial',bold=True)
def head(ws,cols,w):
    ws.append(cols)
    for c in ws[ws.max_row]: c.font=WF;c.fill=H;c.alignment=Alignment(wrap_text=True,vertical='top')
    for i,x in enumerate(w,1): ws.column_dimensions[get_column_letter(i)].width=x
    ws.freeze_panes=ws.cell(row=ws.max_row+1,column=1)
ORDER=['Edelstahl-Schilder (+ Acryl 3 mm)','Grabstecker Edelstahl','Acryl mit Abstandshaltern (AA/AS/S/S)','Gedenktafeln AE','Schiefer-Gedenktafeln/-Schilder','AE-Türschilder','Gedenktafeln Edelstahl','Grabkreuze','Holz-Brettchen','Sonstige','Testbeispiele (kein Produkt)','Bestand (Corel-Altbestand)']
ok=lambda l:ORDER.index(l) if l in ORDER else 99
wb=Workbook();ws=wb.active;ws.title='Übersicht'
ws.append(['Alle Designs nach Kategorie – Stand 04.11.2026, 12:00 (Katalog-main 3c6051fb + alle offenen Katalog-PRs, jedes Design einmal)']);ws['A1'].font=Font(name='Arial',bold=True,size=13)
ws.append(['Kategorien: Linie → Unterkategorie → Zielgruppe → Foto → Form/Reihe. Grundlage: Felder in design.json (themes, targetGroup, withPhoto, form, formatreihe, ziele), sonst Ordnername. „Bestand“ = Corel-Rohdaten, kein Produkt.'])
ws.append([])
head(ws,['Linie','Unterkategorie','Designs gesamt','auf main','in offenen PRs','mit Zielen (im Produkt)','freigegeben','ohne Ziele'],[38,34,12,10,12,14,12,11])
agg=collections.defaultdict(lambda:[0,0,0,0,0])
for r in R:
    a=agg[(r['linie'],r['unterkategorie'])];a[0]+=1;a[1]+=r['quelle']=='main';a[2]+=r['quelle']!='main';a[3]+=r['ziele']>0;a[4]+=r['freigegeben']=='ja'
s0=ws.max_row+1;last=None
for (l,u),a in sorted(agg.items(),key=lambda x:(ok(x[0][0]),x[0][0],-x[1][0])):
    ws.append([l if l!=last else '',u,a[0],a[1],a[2],a[3],a[4],a[0]-a[3]]);last=l
    if l!=ws.cell(ws.max_row,1).value=='' : pass
r=ws.max_row;ws.append(['Summe','']+[f'=SUM({c}{s0}:{c}{r})' for c in 'CDEFGH'])
for c in ws[ws.max_row]: c.font=B
# Baum
w2=wb.create_sheet('Kategorien-Baum')
head(w2,['Linie','Unterkategorie','Zielgruppe','Foto','Form','Reihe / Serie','Designs','auf main','in PRs','mit Zielen','freigegeben','Quellen (PRs)'],[34,30,14,10,22,40,9,9,8,10,11,30])
t=collections.defaultdict(lambda:[0,0,0,0,0,set()])
for x in R:
    k=(x['linie'],x['unterkategorie'],x['zielgruppe'],x['foto'],x['form'],x['reihe'])
    a=t[k];a[0]+=1;a[1]+=x['quelle']=='main';a[2]+=x['quelle']!='main';a[3]+=x['ziele']>0;a[4]+=x['freigegeben']=='ja'
    if x['quelle']!='main': a[5].add(x['quelle'].replace('PR ',''))
for k,a in sorted(t.items(),key=lambda x:(ok(x[0][0]),)+x[0]):
    w2.append(list(k)+a[:5]+[' '.join(sorted(a[5],key=lambda s:int(s[1:])))])
w2.auto_filter.ref=f'A1:L{w2.max_row}'
# Prüfrunden-Plan
w3=wb.create_sheet('Prüfrunden-Plan')
head(w3,['Nr.','Runde (Kennung)','Linie','Unterkategorie','Zielgruppe','Foto','Designs','davon in offenen PRs','Stand'],[6,52,34,30,14,10,9,12,40])
grp=collections.defaultdict(list)
for x in R:
    if x['linie'] in('Bestand (Corel-Altbestand)','Testbeispiele (kein Produkt)'): continue
    if x['nichtAngeboten']=='ja': continue
    grp[(x['linie'],x['unterkategorie'],x['zielgruppe'],x['foto'])].append(x)
slug=lambda s:re.sub(r'[^a-z0-9]+','-',s.lower().replace('ä','ae').replace('ö','oe').replace('ü','ue').replace('ß','ss')).strip('-')
n=0;runden=[]
for k in sorted(grp,key=lambda k:(ok(k[0]),)+k):
    items=sorted(grp[k],key=lambda x:(x['reihe'],x['id']))
    for i in range(0,len(items),200):
        part=items[i:i+200];n+=1
        rid=f"{slug(k[0])[:18]}-{slug(k[1])[:22]}-{slug(k[2])[:10]}-{slug(k[3])}-{i//200+1}-20261104".replace('--','-')
        stand=('erst nach Chris\' Antwort zu PR #8' if 'PR #8' in k[1] else 'jetzt (Arbeitsliste Nr. 1)' if k[0].startswith('Edelstahl') else 'erst auf Chris\' Auftrag')+(' · enthält nicht gemergte PR-Designs' if any(x['quelle']!='main' for x in part) else '')
        w3.append([n,rid,*k,len(part),sum(1 for x in part if x['quelle']!='main'),stand])
        runden.append({'nr':n,'runde':rid,'linie':k[0],'unterkategorie':k[1],'zielgruppe':k[2],'foto':k[3],'designs':[{'id':x['id'],'pfad':x['pfad'],'quelle':x['quelle'],'familien':x['familien']} for x in part]})
w3.append(['','Summe','','','','',f'=SUM(G2:G{w3.max_row})',f'=SUM(H2:H{w3.max_row})'])
json.dump(runden,open('pruefrunden-plan.json','w'),ensure_ascii=False)
# alle
w4=wb.create_sheet('Alle Designs')
cols=['id','linie','unterkategorie','zielgruppe','foto','material','verfahren','form','reihe','quelle','ziele','familien','freigegeben','nichtAngeboten','pfad']
head(w4,['Design-ID','Linie','Unterkategorie','Zielgruppe','Foto','Material','Verfahren','Form','Reihe / Serie','Quelle','Ziele','Familien','freigegeben','nicht angeboten','Pfad im Katalog'],[30,30,26,12,10,14,9,18,30,9,6,40,10,10,60])
for x in sorted(R,key=lambda x:(ok(x['linie']),x['linie'],x['unterkategorie'],x['zielgruppe'],x['foto'],x['reihe'],x['id'])):
    w4.append([x[c] for c in cols])
w4.auto_filter.ref=f'A1:O{w4.max_row}'
for w in wb.worksheets:
    for row in w.iter_rows(min_row=1):
        for c in row:
            if not(c.fill and c.fill.fgColor and c.fill.fgColor.rgb=='00343E46'): c.font=Font(name='Arial',bold=c.font.bold,size=c.font.size)
wb['Übersicht']['A1'].font=Font(name='Arial',bold=True,size=13)
wb.save('Designs-Kategorien-2026-11-04.xlsx');print('runden',n)
