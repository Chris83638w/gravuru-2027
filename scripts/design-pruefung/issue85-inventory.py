"""Read-only source inventory; does not change or approve catalogue designs."""
import argparse, collections, hashlib, json, pathlib, subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--katalog', type=pathlib.Path, required=True)
parser.add_argument('--out', type=pathlib.Path, required=True)
parser.add_argument('--ref', default='origin/main')
args = parser.parse_args()
REPO = args.katalog.resolve()
OUT = args.out.resolve()
OUT.mkdir(parents=True, exist_ok=True)
def git(*args):
    return subprocess.check_output(['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=false', '-C', str(REPO), *args])
revision = git('rev-parse', args.ref).decode().strip()
paths = git('ls-tree', '-r', '--name-only', revision, 'designs/bestand').decode().splitlines()
selected = [p for p in paths if p.endswith('/design.json') and (
    p.startswith('designs/bestand/tierschilder/') or
    (p.split('/')[2] in {'hinweisschilder', 'tuerschilder', 'hausnummern'} and
     any('/Tiere/'+kind+'/' in p for kind in ('Hund', 'Katze', 'Kleintier'))))]
rows = []
for p in selected:
    raw = git('show', revision+':'+p)
    d = json.loads(raw)
    k = d.get('katalog', {})
    # Exact content candidates only: never infer identity just from the D number.
    signature = {key:d.get(key) for key in ('plate', 'texts', 'motifs', 'images')}
    digest = hashlib.sha256(json.dumps(signature,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    rows.append({'sourcePath':p, 'stockId':k.get('key',p.split('/')[-2]),
      'masterId':d.get('id'), 'package':p.split('/')[2], 'category':'/'.join(p.split('/')[3:5]),
      'process':k.get('process',d.get('process')), 'material':k.get('material'),
      'size':d.get('plate'), 'texts':[t.get('text') for t in d.get('texts',[])],
      'fonts':d.get('fonts'), 'fontsMissingAtImport':k.get('fontsMissing',[]),
      'motifCount':len(d.get('motifs',[])), 'imageCount':len(d.get('images',[])),
      'containsPhotoPlaceholder':any(t.get('hint') for t in d.get('texts',[])),
      'sourceVariantOf':k.get('variantOf'), 'exactContentHash':digest,
      'sourceSha256':hashlib.sha256(raw).hexdigest(), 'targetId':None,
      'status':'Quelle inventarisiert; Gestaltung, Dubletten und Ziele noch nicht freigegeben'})
    if len(rows)%25==0: print(f'{len(rows)}/{len(selected)} read',flush=True)
groups = collections.defaultdict(list)
for r in rows: groups[r['exactContentHash']].append(r['stockId'])
data = {'issue':'https://github.com/Chris83638w/gravuru-2027/issues/85',
 'catalogRevision':revision,'stage':'source-inventory-only','designs':rows,
 'exactContentCandidates':[v for v in groups.values() if len(v)>1]}
(OUT/'inventar.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
counts = collections.Counter((r['package'],r['category']) for r in rows)
lines = ['# Issue 85 – Hunde-/Katzen-Bestand: Quelleninventar','',
 'Vorprüfung vom 31.10.2026. Kein umgesetztes Designpaket, keine Freigabe, kein Import.',
 '',f'Katalogbasis: `{revision}`. {len(rows)} Bestandsdatensätze vollständig gelesen.',
 '', '| Bereich | Kategorie | Anzahl |','| --- | --- | ---: |']
lines += [f'| {a} | {b} | {n} |' for (a,b),n in sorted(counts.items())]
lines += ['', '## Abgrenzung', '',
 'Runde Schilder aus Nachricht 4 werden bereits parallel im Chat „Firmenschilder“ bearbeitet. Die Aufteilung wurde im aktuellen Chat angefragt. Dieses Inventar legt keine konkurrierenden Katalogeinträge an.',
 'Hinweisschilder bleiben Paket 1, Hausnummern Paket 5; Hunde-/Katzen-Daten dürfen nicht zusätzlich in Paket 3 dupliziert werden. Alle 35 Tierschilder sind zur Sichtung erfasst, auch Kategorien außerhalb Hund/Katze.',
 'Material- und Formatvarianten sind zunächst nur Kandidaten. Gleiche D-Nummern oder ähnliche Texte beweisen keine identischen Motive. `sourceVariantOf` ist ein übernommener Quellenhinweis. Die vollständige Zuordnung Bestands-ID → neues Design bleibt offen.',
 '', '## Befunde', '',
 f'{sum(bool(r["fontsMissingAtImport"]) for r in rows)} Datensätze melden fehlende Schriften im Importstand; mit aktueller Schriftliste erneut prüfen.',
 f'{sum(r["containsPhotoPlaceholder"] for r in rows)} Datensätze enthalten als Hinweis markierte Texte (u. a. Foto-Upload); nicht als fertiges Katzenmotiv übernehmen.',
 f'{len(data["exactContentCandidates"])} Gruppen mit exakt gleichen Text-/Motiv-/Plattendaten. Das ersetzt keine visuelle Dublettenprüfung.',
 '', '## Quelle für die runde Kennung', '',
 '`familien/edelstahl/quellen/edelstahl-serie-2027-abgleich.md`, Abschnitt „Neue Größen“, enthält bereits TR-V2A-6,5x6,5, TR-V2A-8,5x8,5, TR-V2A-12x12, TR-V2A-16x16 und TR-V2A-20x20. Dies ist ein vorhandener Quellenbeleg für TR; die Schreibweise der Design-IDs ist separat nach designs/README.md zu prüfen.',
 '', 'Detaildaten und Prüfsummen: [inventar.json](inventar.json).']
(OUT/'README.md').write_text('\n'.join(lines)+'\n',encoding='utf8',newline='\n')
print(json.dumps({'sources':len(rows),'counts':{str(k):v for k,v in counts.items()},'exactGroups':len(data['exactContentCandidates'])},ensure_ascii=False),flush=True)
