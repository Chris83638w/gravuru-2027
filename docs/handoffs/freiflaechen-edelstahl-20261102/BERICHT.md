# Freiflächen-Nachkontrolle freigegebener Edelstahl-Designs – Bericht (02.11.2026)

Anlass: Chris 02.11.2026, 01:30 – „wir haben wieder viele Freiflächen, wie bei Amselweg 13, nicht mittig, Wiesenbach tiefer gesetzt“. Regel: DESIGN-MASTER §7 („Keine großen Freiflächen, Gestaltung mittig“; 1:1-Corel-Originale bleiben unverändert).

- Katalog-PR (Entwurf): https://github.com/Chris83638w/gravuru-katalog./pull/150 – Branch `dev/freiflaechen-edelstahl-20261102`
- Kein Merge, nichts auf main, keine Freigabe geändert, nichts live.

## Vorgehen

1. **Umfang:** alle in `designs/edelstahl-gravur-*` für `steel-door-signs` freigegebenen Designs mit `mode` = neu/Referenz (**458**) und zusätzlich **178** Designs, die laut `source` neu sind, aber kein `mode`-Feld haben (109 Andenken, 69 Katzen) – sie sind keine 1:1-Originale. Designs mit `source` = Corel-Bestand (1:1) wurden nicht angefasst. **Zusammen 636 geprüft.**
2. **Rendern:** native Konfi-Zielvorschau (Logik aus `app/workshop/design-target-preview.mjs`, Befestigung „ohne“) in der Mastergröße; bei allen geänderten Designs zusätzlich die größte Größe der Reihe (Layout identisch, Abweichung ≤ 1 %).
3. **Messen:** Logik von `flaeche-messen.py` je Einzelbild (Versatz der Gruppe, Fläche, Höhe). Auffällig = Richtwert verfehlt (Versatz > 3 %, Fläche < 30 %, Querformat-Höhe < 45 %). Danach jedes auffällige Design nach Augenmaß im Raster angesehen.
4. **Korrigieren:** Versatz > 3,5 % → ganze Gruppe mittig (Innenanordnung, bewusste Asymmetrie bleibt). Fläche/Höhe zu klein → Gruppe gleichmäßig vergrößert, begrenzt durch Rand (Rechteck 7 % Rand, Rund/Oval 90 % Kontur), Konfi-Schriftgrenze 100 mm auf der größten Größe und Passung. Linien bis an den Rand behalten ihre Länge (nur senkrecht verschoben); Ovallinie D807 neu an die Ovalkontur angepasst. Senkrechter Name an der Kante (D161/D803 8×5): nur der Textblock größer/verschoben, Kantenstreifen bleibt.
5. **Prüfen:** neu gerendert und gemessen; Passung (alle Größen) mit vorher verglichen. Wo eine Korrektur „passt“ → „prüfen“ (Bohrlochbereich bei Befestigung) gemacht hätte, zuerst halbiert, sonst zurückgenommen.
6. **Unverändert:** Schriften, Motive, Texte, IDs, Ziele, Freigaben. Je geändertem Design ein Eintrag in `deviations`.

## Ergebnis

| Set | geprüft | auffällig | korrigiert |
|---|---|---|---|
| Familien | 287 | 170 | 156 |
| Willkommen | 96 | 43 | 34 |
| Hunde | 73 | 37 | 33 |
| Katzen | 71 | 40 | 35 |
| Andenken | 109 | 28 | 22 |
| **Summe** | **636** | **318** | **280** |

(Rund D34/D35 und das neue 7×2-Design mit Katzen-Thema sind unter Katzen gezählt.)

Bögen: JPG ≤ 2 MB, je Set und Formatreihe nur geänderte Designs, links vorher, rechts nachher, darunter Messwerte vorher/nachher, Passung und Messung auf der größten Größe. Messung mit `flaeche-messen.py` je Bogen unten (vorher/nachher). Rest-Hinweise nach der Korrektur sind begründet: Rund/Oval/Retro-Rand bzw. Text füllt schon die Breite.

### Familien

- geprüft: **287** · auffällig (Messung): **170** · korrigiert: **156**

| Formatreihe | geprüft | auffällig | korrigiert |
|---|---|---|---|
| 50x20 | 6 | 3 | 3 |
| 60x20 | 6 | 4 | 3 |
| 65x65-rund | 83 | 60 | 51 |
| 70x23 | 6 | 4 | 3 |
| 80x20 | 6 | 5 | 5 |
| 80x35 | 7 | 4 | 4 |
| 80x53 | 23 | 8 | 8 |
| 80x80 | 23 | 17 | 15 |
| 90x30 | 7 | 5 | 5 |
| ab-80x53 | 23 | 8 | 8 |
| oval-120x40 | 7 | 4 | 4 |
| oval-150x80 | 22 | 15 | 15 |
| oval-90x60 | 22 | 14 | 14 |
| retro1-90x60 | 23 | 9 | 9 |
| retro2-91x61 | 23 | 10 | 9 |

**Kontaktbögen (vorher/nachher, nur geänderte Designs):**

- [familien-50x20.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-50x20.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 1/3
- [familien-60x20.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-60x20.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 1/3
- [familien-65x65-rund-1.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-65x65-rund-1.jpg?raw=true) – flaeche-messen.py: vorher 11/12 mit Hinweis → nachher 0/12
- [familien-65x65-rund-2.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-65x65-rund-2.jpg?raw=true) – flaeche-messen.py: vorher 12/12 mit Hinweis → nachher 0/12
- [familien-65x65-rund-3.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-65x65-rund-3.jpg?raw=true) – flaeche-messen.py: vorher 12/12 mit Hinweis → nachher 0/12
- [familien-65x65-rund-4.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-65x65-rund-4.jpg?raw=true) – flaeche-messen.py: vorher 12/12 mit Hinweis → nachher 2/12
- [familien-65x65-rund-5.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-65x65-rund-5.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 1/3
- [familien-70x23.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-70x23.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 0/3
- [familien-80x20.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-80x20.jpg?raw=true) – flaeche-messen.py: Platten auf dem Bogen zu schmal für die Bogenmessung – Einzelmessung je Design im Bogen beschriftet
- [familien-80x35.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-80x35.jpg?raw=true) – flaeche-messen.py: vorher 4/4 mit Hinweis → nachher 0/4
- [familien-80x53.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-80x53.jpg?raw=true) – flaeche-messen.py: vorher 8/8 mit Hinweis → nachher 2/8
- [familien-80x80-1.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-80x80-1.jpg?raw=true) – flaeche-messen.py: vorher 12/12 mit Hinweis → nachher 0/12
- [familien-80x80-2.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-80x80-2.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 1/3
- [familien-90x30.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-90x30.jpg?raw=true) – flaeche-messen.py: vorher 5/5 mit Hinweis → nachher 0/5
- [familien-ab-80x53.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-ab-80x53.jpg?raw=true) – flaeche-messen.py: vorher 8/8 mit Hinweis → nachher 2/8
- [familien-oval-120x40.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-oval-120x40.jpg?raw=true) – flaeche-messen.py: vorher 4/4 mit Hinweis → nachher 1/4
- [familien-oval-150x80-1.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-oval-150x80-1.jpg?raw=true) – flaeche-messen.py: vorher 12/12 mit Hinweis → nachher 2/12
- [familien-oval-150x80-2.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-oval-150x80-2.jpg?raw=true) – flaeche-messen.py: vorher 2/3 mit Hinweis → nachher 0/3
- [familien-oval-90x60-1.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-oval-90x60-1.jpg?raw=true) – flaeche-messen.py: vorher 11/12 mit Hinweis → nachher 2/12
- [familien-oval-90x60-2.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-oval-90x60-2.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 0/2
- [familien-retro1-90x60.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-retro1-90x60.jpg?raw=true) – flaeche-messen.py: vorher 9/9 mit Hinweis → nachher 0/9
- [familien-retro2-91x61.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/familien-retro2-91x61.jpg?raw=true) – flaeche-messen.py: vorher 8/9 mit Hinweis → nachher 0/9

**Auffällig, bewusst nicht geändert (Begründung):**

- TRE-V2A-6x2-D801: waagerecht -3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TR-V2A-6.5x6.5-D1: Fläche nur 25 % – Rund: Zeile füllt die Sehne schon, größer stößt an den Rand
- TR-V2A-6.5x6.5-D15: senkrecht +3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TR-V2A-6.5x6.5-D19: waagerecht +3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TR-V2A-6.5x6.5-D2: Fläche nur 25 % – Rund: Zeile füllt die Sehne schon, größer stößt an den Rand
- TR-V2A-6.5x6.5-D66: senkrecht -3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TR-V2A-6.5x6.5-D67: senkrecht +4 % – Korrektur würde Passung „passt“ verlieren (Bohrlochbereich), Versatz nur +4 %
- TR-V2A-6.5x6.5-D804: senkrecht -3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TR-V2A-6.5x6.5-D806: senkrecht -3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TR-V2A-6.5x6.5-D807: senkrecht +3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TRE-V2A-7x2-D801: waagerecht -3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TQ-V2A-8x8-D803: senkrecht -5 % – Korrektur würde Passung „passt“ verlieren (Bohrlochbereich), Versatz −5 % durch senkrechten Namen
- TQ-V2A-8x8-D807: senkrecht +3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TR2-V2A-9x6-D814: waagerecht -3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok

**Korrigiert, Rest-Hinweis nach Messung (begründet):**

- TRE-V2A-5x2-D819: B 95% H 30% F 29% | x +0.1% y +0.0% – Fläche nur 29 %, Höhe nur 30 %
- TRE-V2A-6x2-D819: B 96% H 43% F 41% | x +0.2% y +0.0% – Höhe nur 43 %
- TR-V2A-6.5x6.5-D73: B 86% H 34% F 29% | x +0.0% y +0.1% – Fläche nur 29 %
- TR-V2A-6.5x6.5-D75: B 57% H 50% F 28% | x +0.0% y -0.1% – Fläche nur 28 %
- TR-V2A-6.5x6.5-D819: B 66% H 36% F 24% | x -0.1% y +0.0% – Fläche nur 24 %
- TRE-V2A-8x5-D161: B 80% H 95% F 77% | x -3.3% y -0.0% – waagerecht -3 %
- TRE-V2A-8x5-D803: B 75% H 82% F 62% | x -0.2% y -5.8% – senkrecht -6 %
- TQ-V2A-8x8-D819: B 72% H 38% F 27% | x +0.1% y +0.0% – Fläche nur 27 %
- TAE-V2A-8x5-D161: B 80% H 95% F 77% | x -3.3% y -0.0% – waagerecht -3 %
- TAE-V2A-8x5-D803: B 75% H 82% F 62% | x -0.2% y -5.8% – senkrecht -6 %
- TO-V2A-12x4-D808: B 81% H 41% F 33% | x -0.1% y +0.0% – Höhe nur 41 %
- TO-V2A-15x8-D802: B 81% H 41% F 34% | x +0.0% y +0.2% – Höhe nur 41 %
- TO-V2A-15x8-D806: B 81% H 42% F 34% | x -0.1% y +0.0% – Höhe nur 42 %
- TO-V2A-9x6-D802: B 81% H 42% F 34% | x -0.1% y +0.0% – Höhe nur 42 %
- TO-V2A-9x6-D806: B 81% H 42% F 34% | x -0.1% y -0.1% – Höhe nur 42 %


### Willkommen

- geprüft: **96** · auffällig (Messung): **43** · korrigiert: **34**

| Formatreihe | geprüft | auffällig | korrigiert |
|---|---|---|---|
| 50x20 | 4 | 0 | 0 |
| 60x20 | 4 | 0 | 0 |
| 65x65-rund | 6 | 4 | 4 |
| 70x23 | 5 | 0 | 0 |
| 80x20 | 5 | 0 | 0 |
| 80x35 | 7 | 2 | 2 |
| 80x53 | 8 | 5 | 5 |
| 80x80 | 7 | 3 | 3 |
| 90x30 | 7 | 2 | 1 |
| ab-80x53 | 8 | 5 | 5 |
| oval-120x40 | 7 | 5 | 1 |
| oval-150x80 | 7 | 4 | 3 |
| oval-90x60 | 7 | 4 | 1 |
| retro1-90x60 | 6 | 4 | 4 |
| retro2-91x61 | 8 | 5 | 5 |

**Kontaktbögen (vorher/nachher, nur geänderte Designs):**

- [willkommen-65x65-rund.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/willkommen-65x65-rund.jpg?raw=true) – flaeche-messen.py: vorher 4/4 mit Hinweis → nachher 0/4
- [willkommen-80x35.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/willkommen-80x35.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 0/2
- [willkommen-80x53.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/willkommen-80x53.jpg?raw=true) – flaeche-messen.py: vorher 5/5 mit Hinweis → nachher 3/5
- [willkommen-80x80.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/willkommen-80x80.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 0/3
- [willkommen-90x30.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/willkommen-90x30.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 0/1
- [willkommen-ab-80x53.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/willkommen-ab-80x53.jpg?raw=true) – flaeche-messen.py: vorher 5/5 mit Hinweis → nachher 3/5
- [willkommen-oval-120x40.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/willkommen-oval-120x40.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 0/1
- [willkommen-oval-150x80.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/willkommen-oval-150x80.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 1/3
- [willkommen-oval-90x60.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/willkommen-oval-90x60.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 1/1
- [willkommen-retro1-90x60.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/willkommen-retro1-90x60.jpg?raw=true) – flaeche-messen.py: vorher 4/4 mit Hinweis → nachher 2/4
- [willkommen-retro2-91x61.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/willkommen-retro2-91x61.jpg?raw=true) – flaeche-messen.py: vorher 5/5 mit Hinweis → nachher 3/5

**Auffällig, bewusst nicht geändert (Begründung):**

- TRE-V2A-9x3-D205: senkrecht +3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TO-V2A-12x4-D201: Höhe nur 43 % – kein Spielraum (Text füllt Breite bzw. Rund-/Ovalrand), Versatz ≤ 3,5 %
- TO-V2A-12x4-D202: waagerecht +3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TO-V2A-12x4-D204: Höhe nur 38 % – kein Spielraum (Text füllt Breite bzw. Rund-/Ovalrand), Versatz ≤ 3,5 %
- TO-V2A-12x4-D205: senkrecht +3 %, Höhe nur 45 % – kein Spielraum (Text füllt Breite bzw. Rund-/Ovalrand), Versatz ≤ 3,5 %
- TO-V2A-15x8-D207: Höhe nur 42 % – kein Spielraum (Text füllt Breite bzw. Rund-/Ovalrand), Versatz ≤ 3,5 %
- TO-V2A-9x6-D200: Höhe nur 39 % – kein Spielraum (Text füllt Breite bzw. Rund-/Ovalrand), Versatz ≤ 3,5 %
- TO-V2A-9x6-D203: Höhe nur 39 % – kein Spielraum (Text füllt Breite bzw. Rund-/Ovalrand), Versatz ≤ 3,5 %
- TO-V2A-9x6-D207: Höhe nur 42 % – kein Spielraum (Text füllt Breite bzw. Rund-/Ovalrand), Versatz ≤ 3,5 %

**Korrigiert, Rest-Hinweis nach Messung (begründet):**

- TRE-V2A-8x5-D200: B 92% H 42% F 38% | x +0.0% y +0.0% – Höhe nur 42 %
- TRE-V2A-8x5-D203: B 92% H 40% F 37% | x +0.0% y +0.0% – Höhe nur 40 %
- TRE-V2A-8x5-D205: B 97% H 31% F 30% | x +0.0% y +0.0% – Fläche nur 30 %, Höhe nur 31 %
- TAE-V2A-8x5-D200: B 92% H 43% F 39% | x +0.0% y +0.0% – Höhe nur 43 %
- TAE-V2A-8x5-D203: B 92% H 40% F 37% | x +0.1% y +0.0% – Höhe nur 40 %
- TAE-V2A-8x5-D205: B 97% H 31% F 30% | x +0.0% y +0.0% – Fläche nur 30 %, Höhe nur 31 %
- TO-V2A-15x8-D205: B 88% H 33% F 29% | x +0.0% y +0.0% – Fläche nur 29 %, Höhe nur 33 %
- TO-V2A-9x6-D205: B 88% H 29% F 26% | x +0.1% y +0.0% – Fläche nur 26 %, Höhe nur 29 %
- TR1-V2A-9x6-D203: B 88% H 38% F 33% | x -0.0% y -0.1% – Höhe nur 38 %
- TR1-V2A-9x6-D205: B 98% H 31% F 30% | x +0.0% y +0.0% – Fläche nur 30 %, Höhe nur 31 %
- TR2-V2A-9x6-D200: B 88% H 41% F 36% | x +0.0% y +0.0% – Höhe nur 41 %
- TR2-V2A-9x6-D203: B 88% H 38% F 33% | x -0.1% y -0.1% – Höhe nur 38 %
- TR2-V2A-9x6-D205: B 96% H 30% F 29% | x -0.0% y +0.0% – Fläche nur 29 %, Höhe nur 30 %


### Hunde

- geprüft: **73** · auffällig (Messung): **37** · korrigiert: **33**

| Formatreihe | geprüft | auffällig | korrigiert |
|---|---|---|---|
| 50x20 | 2 | 1 | 1 |
| 60x20 | 2 | 1 | 1 |
| 65x65-rund | 9 | 6 | 5 |
| 70x23 | 2 | 1 | 1 |
| 80x20 | 2 | 1 | 0 |
| 80x35 | 5 | 1 | 1 |
| 80x53 | 7 | 3 | 3 |
| 80x80 | 7 | 5 | 3 |
| 90x30 | 5 | 1 | 1 |
| ab-80x53 | 7 | 3 | 3 |
| oval-120x40 | 4 | 3 | 3 |
| oval-150x80 | 5 | 2 | 2 |
| oval-90x60 | 5 | 4 | 4 |
| retro1-90x60 | 7 | 3 | 3 |
| retro2-91x61 | 4 | 2 | 2 |

**Kontaktbögen (vorher/nachher, nur geänderte Designs):**

- [hunde-50x20.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-50x20.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 0/1
- [hunde-60x20.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-60x20.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 1/1
- [hunde-65x65-rund.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-65x65-rund.jpg?raw=true) – flaeche-messen.py: vorher 5/5 mit Hinweis → nachher 0/5
- [hunde-70x23.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-70x23.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 0/1
- [hunde-80x35.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-80x35.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 1/1
- [hunde-80x53.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-80x53.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 1/3
- [hunde-80x80.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-80x80.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 0/3
- [hunde-90x30.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-90x30.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 0/1
- [hunde-ab-80x53.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-ab-80x53.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 1/3
- [hunde-oval-120x40.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-oval-120x40.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 0/3
- [hunde-oval-150x80.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-oval-150x80.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 1/2
- [hunde-oval-90x60.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-oval-90x60.jpg?raw=true) – flaeche-messen.py: vorher 4/4 mit Hinweis → nachher 1/4
- [hunde-retro1-90x60.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-retro1-90x60.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 1/3
- [hunde-retro2-91x61.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/hunde-retro2-91x61.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 1/2

**Auffällig, bewusst nicht geändert (Begründung):**

- TR-V2A-6.5x6.5-D33: senkrecht -3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TRE-V2A-8x2-D110: waagerecht -3 %, senkrecht -6 % – Korrektur würde Passung „passt“ verlieren (Bohrlochbereich 8×2)
- TQ-V2A-8x8-D110: senkrecht -3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TQ-V2A-8x8-D114: waagerecht +3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok

**Korrigiert, Rest-Hinweis nach Messung (begründet):**

- TRE-V2A-6x2-D110: B 70% H 67% F 47% | x -4.0% y -0.3% – waagerecht -4 %
- TRE-V2A-8x3,5-D113: B 95% H 39% F 37% | x +0.0% y +0.0% – Höhe nur 39 %
- TRE-V2A-8x5-D115: B 95% H 44% F 42% | x +0.0% y +0.0% – Höhe nur 44 %
- TAE-V2A-8x5-D115: B 95% H 44% F 42% | x +0.0% y +0.0% – Höhe nur 44 %
- TO-V2A-15x8-D115: B 95% H 37% F 35% | x +0.0% y +0.0% – Höhe nur 37 %
- TO-V2A-9x6-D115: B 95% H 38% F 36% | x +0.0% y +0.1% – Höhe nur 38 %
- TR1-V2A-9x6-D115: B 96% H 43% F 42% | x +0.0% y +0.0% – Höhe nur 43 %
- TR2-V2A-9x6-D115: B 93% H 43% F 40% | x +0.0% y -0.1% – Höhe nur 43 %


### Katzen

- geprüft: **71** · auffällig (Messung): **40** · korrigiert: **35**

| Formatreihe | geprüft | auffällig | korrigiert |
|---|---|---|---|
| 50x20 | 3 | 2 | 1 |
| 60x20 | 3 | 3 | 2 |
| 65x65-rund | 4 | 2 | 2 |
| 70x23 | 3 | 2 | 2 |
| 80x20 | 3 | 3 | 3 |
| 80x35 | 2 | 1 | 0 |
| 80x53 | 2 | 1 | 1 |
| 80x80 | 9 | 3 | 3 |
| 90x30 | 2 | 2 | 2 |
| ab-80x53 | 2 | 1 | 1 |
| oval-120x40 | 2 | 1 | 1 |
| oval-150x80 | 9 | 2 | 2 |
| oval-90x60 | 9 | 6 | 6 |
| retro1-90x60 | 9 | 5 | 3 |
| retro2-91x61 | 9 | 6 | 6 |

**Kontaktbögen (vorher/nachher, nur geänderte Designs):**

- [katzen-50x20.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-50x20.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 0/1
- [katzen-60x20.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-60x20.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 0/2
- [katzen-65x65-rund.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-65x65-rund.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 0/2
- [katzen-70x23.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-70x23.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 1/2
- [katzen-80x20.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-80x20.jpg?raw=true) – flaeche-messen.py: Platten auf dem Bogen zu schmal für die Bogenmessung – Einzelmessung je Design im Bogen beschriftet
- [katzen-80x53.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-80x53.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 1/1
- [katzen-80x80.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-80x80.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 0/3
- [katzen-90x30.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-90x30.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 0/2
- [katzen-ab-80x53.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-ab-80x53.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 1/1
- [katzen-oval-120x40.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-oval-120x40.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 0/1
- [katzen-oval-150x80.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-oval-150x80.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 1/2
- [katzen-oval-90x60.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-oval-90x60.jpg?raw=true) – flaeche-messen.py: vorher 6/6 mit Hinweis → nachher 3/6
- [katzen-retro1-90x60.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-retro1-90x60.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 0/3
- [katzen-retro2-91x61.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/katzen-retro2-91x61.jpg?raw=true) – flaeche-messen.py: vorher 6/6 mit Hinweis → nachher 2/6

**Auffällig, bewusst nicht geändert (Begründung):**

- TRE-V2A-5x2-D142: senkrecht +3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TRE-V2A-6x2-D140: waagerecht -6 % – Korrektur würde Passung „passt“ verlieren (Bohrlochbereich 6×2)
- TRE-V2A-8x3,5-D141: senkrecht +3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TR1-V2A-9x6-D141: Fläche nur 25 %, Höhe nur 33 % – Vergrößerung würde Passung „passt“ verlieren (Bohrlochbereich)
- TR1-V2A-9x6-D144: Fläche nur 28 %, Höhe nur 36 % – Vergrößerung würde Passung „passt“ verlieren (Bohrlochbereich)

**Korrigiert, Rest-Hinweis nach Messung (begründet):**

- TRE-V2A-7x2-D140: B 79% H 70% F 55% | x -3.0% y +0.3% – waagerecht -3 %
- TRE-V2A-8x5-D141: B 92% H 39% F 36% | x -0.1% y +0.0% – Höhe nur 39 %
- TAE-V2A-8x5-D141: B 92% H 39% F 36% | x -0.1% y +0.0% – Höhe nur 39 %
- TO-V2A-15x8-D141: B 80% H 43% F 34% | x +0.0% y +0.0% – Höhe nur 43 %
- TO-V2A-9x6-D140: B 80% H 44% F 35% | x +0.0% y -0.1% – Höhe nur 44 %
- TO-V2A-9x6-D141: B 79% H 34% F 27% | x +0.1% y +0.0% – Fläche nur 27 %, Höhe nur 34 %
- TO-V2A-9x6-D144: B 78% H 37% F 29% | x +0.0% y +0.0% – Fläche nur 29 %, Höhe nur 37 %
- TR2-V2A-9x6-D141: B 87% H 38% F 33% | x +0.0% y -0.1% – Höhe nur 38 %
- TR2-V2A-9x6-D144: B 88% H 42% F 37% | x -0.0% y +0.1% – Höhe nur 42 %


### Andenken

- geprüft: **109** · auffällig (Messung): **28** · korrigiert: **22**

| Formatreihe | geprüft | auffällig | korrigiert |
|---|---|---|---|
| 50x20 | 4 | 0 | 0 |
| 60x20 | 4 | 0 | 0 |
| 65x65-rund | 7 | 6 | 5 |
| 70x23 | 4 | 0 | 0 |
| 80x20 | 4 | 1 | 1 |
| 80x35 | 8 | 3 | 3 |
| 80x53 | 10 | 2 | 1 |
| 80x80 | 10 | 4 | 3 |
| 90x30 | 8 | 2 | 2 |
| ab-80x53 | 10 | 2 | 1 |
| oval-120x40 | 8 | 3 | 2 |
| oval-150x80 | 8 | 1 | 0 |
| oval-90x60 | 8 | 2 | 2 |
| retro1-90x60 | 8 | 1 | 1 |
| retro2-91x61 | 8 | 1 | 1 |

**Kontaktbögen (vorher/nachher, nur geänderte Designs):**

- [andenken-65x65-rund.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/andenken-65x65-rund.jpg?raw=true) – flaeche-messen.py: vorher 5/5 mit Hinweis → nachher 0/5
- [andenken-80x20.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/andenken-80x20.jpg?raw=true) – flaeche-messen.py: Platten auf dem Bogen zu schmal für die Bogenmessung – Einzelmessung je Design im Bogen beschriftet
- [andenken-80x35.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/andenken-80x35.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 0/3
- [andenken-80x53.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/andenken-80x53.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 0/1
- [andenken-80x80.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/andenken-80x80.jpg?raw=true) – flaeche-messen.py: vorher 3/3 mit Hinweis → nachher 0/3
- [andenken-90x30.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/andenken-90x30.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 0/2
- [andenken-ab-80x53.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/andenken-ab-80x53.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 0/1
- [andenken-oval-120x40.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/andenken-oval-120x40.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 0/2
- [andenken-oval-90x60.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/andenken-oval-90x60.jpg?raw=true) – flaeche-messen.py: vorher 2/2 mit Hinweis → nachher 1/2
- [andenken-retro1-90x60.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/andenken-retro1-90x60.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 0/1
- [andenken-retro2-91x61.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/freiflaechen-edelstahl-20261102/docs/handoffs/freiflaechen-edelstahl-20261102/andenken-retro2-91x61.jpg?raw=true) – flaeche-messen.py: vorher 1/1 mit Hinweis → nachher 0/1

**Auffällig, bewusst nicht geändert (Begründung):**

- TR-V2A-6.5x6.5-D406: senkrecht -3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TRE-V2A-8x5-D422: waagerecht -5 % – Linie läuft vom linken Rand, Tauben rechts als Gegengewicht – bewusste Asymmetrie
- TQ-V2A-8x8-D422: waagerecht -4 % – Linie läuft vom linken Rand, Tauben rechts als Gegengewicht – bewusste Asymmetrie
- TAE-V2A-8x5-D422: waagerecht -4 % – Linie läuft vom linken Rand, Tauben rechts als Gegengewicht – bewusste Asymmetrie
- TO-V2A-12x4-D407: waagerecht +3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok
- TO-V2A-15x8-D408: waagerecht -3 % – leichte Abweichung ≤ 3,5 %, Augenmaß ok

**Korrigiert, Rest-Hinweis nach Messung (begründet):**

- TO-V2A-9x6-D406: B 80% H 44% F 35% | x +0.0% y +0.0% – Höhe nur 44 %


## Offene Fragen / Selbstprüfung

1. **Willkommen D200/D203/D205 und Hunde D115 (Querformat):** Höhe bleibt 30–44 %, weil die Zeilen schon die Breite füllen (D205 Hauslinie: Name endet am Haus, Linie bis Rand). Mehr Fläche ginge nur mit neuer Anordnung (z. B. Name zweizeilig, Gruß darüber größer). Soll ich das als eigene Überarbeitung machen?
2. **Bohrlochbereich:** 7 Designs bewusst nicht oder nur halb korrigiert, damit die Passung „passt“ bleibt (Rund D67, 8×8 D803, 8×2/6×2 D110, 6×2 D140, Retro 1 D141/D144). Falls Chris die Bohrloch-Hinweise (Befestigung ist Kundenwahl, Elemente weichen aus) hier nicht wichtig sind, kann ich sie voll korrigieren.
3. **Katzen/Andenken ohne `mode`-Feld:** 178 neue Designs haben kein `mode`. Vorschlag: `mode: "neu"` nachtragen (nicht gemacht – Datenänderung außerhalb des Auftrags).
4. **Selbstprüfung:** Jede Korrektur ist eine reine Verschiebung bzw. gleichmäßige Vergrößerung der Gruppe; alle Nachher-Bilder im Bogen angesehen. Gefüllte Motive (z. B. Katze D152, Mond D144) wurden mit vergrößert, bleiben aber deutlich unter ca. 15 % der Platte. Die Messung erfasst die Gruppe als Hüllrechteck – bei Schreibschrift mit Unterlängen ist „mittig“ rechnerisch, nicht immer optisch; dort nach Augenmaß geprüft.
5. Freigaben bleiben stehen; da sich die Designs geändert haben, sollte Chris die Bögen vor dem Merge ansehen.

🤖 Claude · https://claude.ai/code/session_01TFZAfd3zBRL6y6PGwVXrsG
