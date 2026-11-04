# Liste aller Designs neu bauen

Die Skripte erwarten den Katalog unter `/home/claude/gravuru-katalog` und arbeiten im aktuellen Ordner.

```
git -C /home/claude/gravuru-katalog fetch origin main '+refs/pull/*/head:refs/remotes/pr/*'
git -C /home/claude/gravuru-katalog ls-tree -r --name-only origin/main designs/ | grep '/design\.json$' > ../woche/main-designs.txt   # Pfad in scan.py ggf. anpassen
gh api "repos/Chris83638w/gravuru-katalog./pulls?state=open&per_page=100&page=1|2" → open.json   # siehe scan2.py
git -C /home/claude/gravuru-katalog log origin/main --diff-filter=A --name-only --format='@%ci' -- 'designs/*design.json' > addlog.txt   # daraus dates.json
python3 scan.py      # main.json: Designs je Serie, mit Zielen, freigegeben (Freigabe je Ziel in ziele[].freigabe)
python3 scan2.py     # open-designs.json: neue/geänderte Designs je offenem PR
python3 build.py     # Alle-Designs-<Datum>.xlsx
```
