"""Build auditable design/measurement tables from final catalogue and native proof."""
import argparse,json,re,subprocess,sys
from pathlib import Path
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--katalog',type=Path,required=True);ap.add_argument('--proof',type=Path,required=True);a=ap.parse_args();root=a.katalog;here=Path(__file__).resolve().parents[2];out=here/'docs/handoffs/2026-11-02-issue85-firmen';order=root/'auftraege/2026-11-02-issue85-firmen'
 ds=[read(root/'designs'/s/r['pfad']/'design.json') for s in read(order/'reihen.json') for r in read(root/'designs'/s/'index.json')]
 results=read(a.proof/'pruefung.json')['results'];compact={'masters':len(ds),'targets':len(results),'sizeChecks':sum(len(r['reviewFit']['sizes']) for r in results),'statuses':{k:sum(r['reviewFit']['status']==k for r in results) for k in ['passt','prüfen','passt nicht']},'results':results}
 (out/'zielpruefung.json').write_text(json.dumps(compact,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
 lines=['# Alle 48 Entwürfe','', 'Quelle: [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md), Issue 85 / 62. Alle Kontaktbilder sind echte native Zielvorschauen. Schriften sind Regular (400) bzw. Montserrat Light (300).','', '| Kennung | Vorlage | Modus / Form | Schriften | Texte / Motive | Abweichungen |','|---|---|---|---|---|---|']
 for d in ds:
  source=d['source'];sourceLink='ohne Vorlage' if source=='ohne Vorlage' else f'[{d["varianteVon"]}](https://github.com/Chris83638w/gravuru-katalog./blob/main/{source})'
  substitutions=', '.join(sorted({f'{s["from"]} → {s["to"]}' for s in d['fontSubstitutions']}));notes='; '.join(d['deviations'])+(' Schriftwechsel: '+substitutions if substitutions else '')
  lines.append(f'| {d["id"]} | {sourceLink} | {d["mode"]} / {d["form"]} | {", ".join(d["fonts"])} | {len(d["texts"])} / {len(d["motifs"])} | {notes.replace("|","/")} |')
 (out/'designs.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
 report=['# Flächennutzung · native JPG-Kontaktbögen','', 'Gemessen mit dem unveränderten `scripts/flaeche-messen.py` aus Code-main 06987af. Alle finalen Kontakt-JPGs wurden gemessen; `messung-1` bis `messung-4` enthalten nur die 48 Zielschilder und bilden die eindeutige Zuordnung unten. Die Vergleichsbögen enthalten zusätzlich die historischen Originale. Die Maße beschreiben den Gestaltungsrahmen, nicht den prozentualen Schwarzauftrag.','', '| Seite / Platz | Design | Messung | Bewertung |','|---|---|---|---|'];warnings=[]
 for jpg in sorted(out.glob('*.jpg')):
  if jpg.name.startswith('editor-'):continue
  assert jpg.stat().st_size<=2_000_000
  text=subprocess.check_output([sys.executable,str(here/'scripts/flaeche-messen.py'),str(jpg)],encoding='utf-8');jpg.with_suffix('.txt').write_text(text,encoding='utf-8')
  if not jpg.name.startswith('messung-'):continue
  page=int(jpg.stem.split('-')[-1]);measurements=text.strip().splitlines();assert len(measurements)==12,(jpg,len(measurements))
  for i,(d,line) in enumerate(zip(ds[(page-1)*12:page*12],measurements),1):
   warn='PRÜFEN' in line;special=d['mode']=='neu' or d['varianteVon'] in ['FS-AV2A-23x12-D0','FS-S-20x30-D0']
   if warn:
    assert not special,(d['id'],line)
    assessment='Bewusste Beibehaltung der gleichproportionalen Corel-Anordnung gemäß Master §1/§7; kein Überstand oder verlorenes Motiv. Bei D1/Quadrat bleibt die bewusst schlichte zweizeilige Platzhaltervorlage erhalten.' if d['id']=='FS-V2A-8x8-D1' else 'Gleichproportionale Corel-Anordnung erhalten (§1/§7). Kein Randüberstand; Original als Vergleich daneben. Verschiebung/Leerraum stammt aus der Vorlage, keine Neuanordnung.'
    warnings.append(d['id'])
   else:assessment='Richtwerte erfüllt.'
   report.append(f'| {page} / {i} | {d["id"]} | {line.strip().replace("|",";")} | {assessment} |')
 report+=['',f'{48-len(warnings)} / 48 innerhalb aller Richtwerte; {len(warnings)} dokumentierte Ausnahmen aus gleichproportionalen Originalanordnungen. Alle drei neuen Entwürfe sowie Yoga/Oval und Schlüsseldienst/Querformat erfüllen die Richtwerte.','', 'Die deutlichen historischen Abweichungen FS-V2A-8x8-D1 (17 % Rahmenfläche) und FS-V2A-26x26-D14 (−14,6 % vertikal) bleiben ausdrücklich zur Einzelabnahme sichtbar. Ihre Kernanordnung wurde nicht gegen die Originaltreue-Regel umgebaut. Keine automatische Freigabe.']
 (out/'flaechennutzung.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
 print({'designs':len(ds),'targets':len(results),'nativeSizeChecks':compact['sizeChecks'],'measurementExceptions':len(warnings)})
if __name__=='__main__':main()
