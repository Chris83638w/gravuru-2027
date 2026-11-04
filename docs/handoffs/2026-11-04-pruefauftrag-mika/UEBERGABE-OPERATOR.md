# Übergabe Claude Operator – Stand 04.11.2026, 11:30

Für den neuen Operator-Chat. Alles hier ist an der Quelle geprüft (GitHub, Katalog, Projekt-Doks), Stand 11:30.

---

## 0. Chris ist unzufrieden – das zuerst lesen
Chris, 04.11.: „Du bringst vieles durcheinander und machst viele Fehler. Die Ausgangslage war klar besprochen.“ Außerdem: „Das hat sehr viel Zeit gekostet und wir haben nichts gewonnen.“

**Was schiefging (nicht wiederholen):**
1. Ich habe gemeldet, bevor ich vollständig an der Quelle geprüft hatte:
   - „nur 3 Schiefer-Größen haben Designs“ – falsch;
   - „Kreuz ohne Designs / Menschen nur Herz“ – geprüft war nur main, nicht die offenen PRs;
   - „Linie nicht verschoben“ – falsch.
2. Feste Absprachen fehlten in Aufträgen:
   - Filigran-Regel „ab 9 × 6“;
   - blaue Haarlinien bei Schiefer;
   - „nur per Skripte“;
   - Konfi-Tabellen und Designaufbau in der Nachricht an Mika.
3. Live- und Merge-Freigabe weitergegeben, ohne zu prüfen, ob die PRs konfliktfrei mergen. Folge: Astra Schiefer gestoppt, und ich habe den Stopp nicht beantwortet.
4. Merge-Liste mit PRs, die Chris noch nicht freigegeben hatte.
5. Nachrichten in Etappen statt vollständig. Chris musste mehrfach nachfordern („du sollst ihm alles geben!!!“).
6. Ein Prüfbild war falsch beschriftet (9 × 6 als 8 × 5).

**Arbeitsregel daraus:**
- Vor jeder Meldung alle Quellen prüfen: main, **offene PRs**, Issues, alle Chats und Projekt-Doks.
- Erst vollständig, dann senden.
- Vor jeder Merge- oder Live-Freigabe `mergeable` aller betroffenen PRs prüfen (`gh api repos/.../pulls/N --jq .mergeable_state`).

## 1. Rolle und feste Regeln
- Claude ist **Boss/Operator**: entscheidet, prüft, nimmt ab, widerspricht Chris, wenn er falsch liegt.
- Immer Deutsch, Du-Form, „Chris“. Kurz und verständlich, Stichpunkte.
- **Live-Systeme:** lesen und exportieren. Schreiben oder live nur mit Chris' ausdrücklichem Satz.
- Vor jedem Löschen Chris informieren. Firmenserver V:/Y:: nur neue Dateien.
- Nichts erfinden: Maße und Preise nur aus Katalog oder Excel.
- **Befunde immer mit Screenshot**, vorher an der Quelle geprüft.
- „Wenn etwas ist, stell mir bitte eine Frage“ (7.17): fragen statt deuten.
- **Nachrichten an die KIs direkt auf GitHub** (Issue-Kommentar), nicht zum Kopieren. Chris braucht dann nur die Issue-Nummer.
- Freigabe der Designs setzt nur Chris.
- Massenarbeit per Skript. Chris (04.11.): „es wird nichts händisch angelegt, nur per Skripte oder andere schnelle Wege“.
- Vorschauen 1:1 aus dem echten Konfi oder Renderer, keine freien Skizzen.

## 2. Quellen (in dieser Reihenfolge lesen)
**Projekt „Shopify Konfi und Produkt“**
- `claude/Entscheidungsregister-Chris.md`: alles bis 4.62 / 5.27 / 7.21. Gilt vor allem, der neueste Eintrag gewinnt.
- Nachträge, noch nicht ins Register übernommen (**erste Aufgabe: einpflegen, dann die Nachtrag-Dateien leeren**):
  - `Entscheidungen-Nachtrag-2026-11-04c-Schiefer.md` (7.22, 7.23);
  - `Entscheidungen-Nachtrag-2026-11-04d-Edelstahl.md` (Filigran hart, Bildbeschriftung, Hinweis-/Boxenschilder 19 Ja / 52 Nein, Design Prüfung Skill).
  - Zusätzlich fehlen im Register:
    - **„Haarlinien!!! Bei Schiefer alles blau“** (Chris 03.11., 17:56): alle Schiefer-Konturen und -Löcher als blaue Haarlinie `#0000FF`, 0,076 mm;
    - **„es wird nichts händisch angelegt, nur per Skripte“** (Chris 04.11.);
    - **Konfi-Optik #161** (siehe 5.).
  - `Entscheidungen-Nachtrag-2026-11-04-Edelstahl.md` und `-04b-` sind leer; Chris darf sie löschen.
- `claude/Ablauf-Shopify-Konfi-und-Produkt.md`: 8 Stufen vom Auftrag bis live.
- `claude/Uebergabe-Schiefer.md` und `claude/Uebergabe-Edelstahl-Renderer.md`.
- `claude/Arbeitsliste-Designpruefung.md`: Prüfrunden Material für Material.

**Repos**
- `Chris83638w/gravuru-2027` (Code): `ENTSCHEIDUNGEN.md`, `AGENTS.md`, `STATUS.md`.
- `Chris83638w/gravuru-katalog.` (mit Punkt): `designs/DESIGN-MASTER.md`, Fassung in **Katalog-PR #172** (offen).

**Skill:** `gravuru-gestaltung` (Gestaltungsregeln und Prüfung).

## 3. Wer macht was
| Wer | Aufgabe | Postfach |
|---|---|---|
| Chris | entscheidet, gibt Designs frei, „live“ | – |
| Claude Operator (neuer Chat) | Aufträge, Abnahme, Register, Endkontrolle | #139, #85, #168 |
| Claude Edelstahl-Chat („Edelstahl-Renderer Übergabe“) | Designprüfung Edelstahl mit Renderer und Prüfseite „Designprüfung Edelstahl“; Design Prüfung Skill (#169) | #139 |
| Claude Schiefer-Chat („Schiefer GD“) | Upload aller Schiefer-Produkte und Schiefer-Designs; schreibt nur mit Astra Schiefer (7.22/7.23) | #85 |
| Astra 1 Edelstahl | Edelstahl-Konfi, Edelstahl-Merges, Edelstahl live | #139 |
| Astra Schiefer (zweiter Astra-1-Chat) | Schiefer-Konfi, Schiefer-Merges, Schiefer live (7.21) | #85 |
| Astra (Konfi-Optik) | Konfi-Studie PR #161 | #48 |
| Astra Mika | Prüfauftrag zu meiner Arbeit; 98 offene Katalog-PRs | **#168** (neu) |

Regel 7.21 (Chris: „EINER MACHT EDELSTAHL UND EINER SCHIEFER“): Jeder Astra-Chat mergt nur seine eigenen PRs.

## 4. Grundsätze (fest besprochen)
- **Ein Konfi für alle Produkte**, Ausführung als Modul je Produktart (1.13). Icon-Kacheln, Dropdown nur bei sehr vielen Optionen wie Funkklingeln (3.37).
- **Edelstahl-Schilder (4.42/4.43):**
  - ein Konfi je Material (Edelstahl, Acryl 3 mm) mit allen 80 Größen aus der Excel;
  - Form → Größe → Befestigung → Design;
  - Türschilder ohne Zielgruppen;
  - je Shop-Produkt ein Designfilter, serverseitig;
  - erst ohne Designs, dann Designs nachladen.
- **Eigene Motivreihen** (Familien mit Figuren, Hundeschilder …) = eigenes Produkt je Unterkategorie (4.4/4.42).
- **Ein Design-Pool für alle Materialien** (1.7).
- **Schiefer:** 48 Tafeln in 4 Familien (4.57/4.60):
  - `schiefer-tafeln-premium`: 12 mm, ohne Löcher;
  - `-geschnitten`: ca. 5 mm, ohne Bruchkante, ohne Löcher; Herz 24 × 19, Herz schief, Kreuz 21,5 × 30, Stern, Knochen, 7 × 2 / 8 × 3,5 / 8 × 5;
  - `-natur`: ca. 5 mm, Bruchkante;
  - `-kordel`: Bruchkante, feste Kordellöcher.
  - Jede Tafel bekommt alle passenden Designs. Chris: „wir wollen alle beim Schiefer“.
- **Fotos:** auf Acryl und Schiefer ja, Edelstahl nie (1.18/1.19). 1. Foto im Design inklusive, jedes weitere 9,99 € (4.59). Foto-Vorlagen Mensch und Hund (4.45).
- **Edelstahl immer 1,5 mm**, nur echte Klingelplatten 2 mm (4.54). Gedenktafel Edelstahl: alle Formen ab ca. 12 × 8. Acryl-Gedenktafeln kommen „extra“ (4.53).

## 5. Konfi – finalisierte Optik (Chris 04.11., 10:51)
- PR #161 (`dev/konfi-produktprofile-vorschau-20261103-astra`, Stand `db4f4a4`); Übergabe `docs/handoffs/2026-11-04-konfi-ohne-vorschauleiste.md`.
- **Werkzeugzeile:**
  - „Zum Produkt“ links;
  - Vollbild, Rückgängig, Wiederholen, Hilfe und Ebenen mittig über dem Schild;
  - „Entwurf speichern“ rechts.
  - Keine Produktüberschrift, keine Vorschau- bzw. Produktumschaltleiste.
- Das Schild füllt fast die ganze Fläche, mit Bemaßung. Zoom mit Rückstellung auf 100 %.
- **721 Originalmotive in 47 Kategorien.** Bestseller je Thema vorausgewählt:
  - Gedenktafel: Kreuz, Engel, Kerze, Herz, Rose, Flügel;
  - Türschild und Funkklingel: Haus, Leuchtturm, Anker, Baum;
  - Andenken getrennt nach Menschen und Tieren.
- Optionen als Icon-Kacheln. Moderne Optik: weiße Werkzeugzeile, ruhige Kacheln, schmaler blaugrauer Footer.
- **Stand:** lokale Studie, **nicht gemergt, nicht live**, Konflikt mit main. Offen bleiben die Integration in den Master, die Ladezeit- (2.10: Modell ≤ 600 KB, Desktop ≤ 4 s, Handy ≤ 6 s) und die Warenkorbabnahme.

## 6. Konfi-Tabelle je Produktlinie (4.44, 4.57)
**Grundsatz:** Je Produktlinie eine Tabelle. Sie ist der Bauplan für den Konfi.

**Inhalt je Größe:**
- Reihe, Form, Größe, SKU;
- Maße, Stärke, Gewicht;
- Grundpreis und Preis je Befestigung;
- Lochbilder (Ø, Abstände, Rand);
- SVG in mm (Kontur und Bohrbilder) und PNG freigestellt.
- Dazu ein Blatt „Optionen“: Kürzel, Name, Aufpreis, Icon bzw. Bild.

**Zubehör:**
- nur echtes Material aus Chris' Ordner „Produktbilder Zubehör“;
- im Konfi nur Draufsicht je Farbe;
- Abstandshalter 12 mm breit.

**Ablauf:**
1. Tabelle erstellen.
2. Prüfseite für Chris (claude.ai).
3. Chris gibt frei („Preise passen“).
4. Tabelle in den Katalog.
5. Astra baut den Konfi.
6. Entwürfe.
7. Live nur mit Chris' Satz.

**Muster Edelstahl** (Katalog main):
- `zeichnungen/edelstahl-schilder-2027/Edelstahl-Schilder-Liste.xlsx` (80 Größen, Blatt „Aufpreise“: K00 0, KGL 2,99, KRA 3,99, B02 2,49, B02S 2,69, B04 2,89, B04S 3,29, Logo 12,99 €);
- `grundplatten/svg|png`, `index.json`, `geometrie.json`.
- Prüfseiten:
  - „Edelstahl-Schilder“: RqZq43dFDorCgn3qQKHk8f;
  - „Preise Edelstahl“: BTQ5qhtZegAeDLUsFMXMDc.

**Muster Schiefer:**
- `zeichnungen/schiefer-tafeln-2027/schiefer-tafeln.json` (Katalog-PR #169, offen);
- Zubehör `materialien/zubehoer/` (Katalog-PR #162, offen, Konflikt);
- Prüfseite „Schiefer-Tafeln“: 8PRwPmwGX2g5h5P4fkGe7w.
- Schiefer-Regeln:
  - Löcher Ø 4 mm, Lochbild aus Excel Spalte M;
  - ohne Löcher: Premium, alle geschnittenen Formen, Herz-Reihe, 7 × 2 / 8 × 3,5 / 8 × 5;
  - Rund nur 2er;
  - 10 × 10 / 13 × 13 / 15 × 10 nur „ohne“ oder „2 Bohrlöcher“;
  - Abstandshalter in 5 Farben, 5,99 / 8,99 €, farbig +1 / +2 €;
  - **alles blaue Haarlinie**.

**Nächste Linien nach demselben Muster:** Gedenktafel Edelstahl, dann Acryl.

## 7. Designaufbau (DESIGN-MASTER #172 und Register Abschnitt 5)
**Grundsatz**
- „Wir verkaufen nur über das Optische“: jedes Design einzeln nach dem Gesamteindruck.

**Vorlage zuerst**
- 1:1 bei gleicher Formatreihe, sonst sehr starke Referenz. Frei nur ohne Vorlage. 2–3 neue Designs je Serie.
- Vorhandenes korrigieren statt neu gestalten (7.23).
- Ein Master je Formatreihe. Jedes Format bekommt eine eigene Anordnung.

**Tafel gefüllt (§7, 02.11.)**
- Text und Motiv als Gruppe ausgewogen mittig, keine großen Freiflächen.
- Prüfmaß mit `flaeche-messen.py`: mindestens ca. 30 % der Fläche, Querformat mindestens ca. 45 % der Höhe, Versatz höchstens 3 %.
- Wenig, aber groß: Name am größten, Motiv als Gegengewicht.

**Text**
- Kein Schild ohne Text. 1–3 der 84 Schriften.
- Gestrichene Schriften und Arial selbst ersetzen (5.26).
- Mindestschrift 3 mm. Datum nie zerreißen. Spruch nie größer als der Name. Realistische Beispieltexte.

**Motiv**
- Nie verzerren oder abschneiden. Nichts verdeckt etwas.
- **Keine Strichfiguren** (5.13).
- Schwarzfläche höchstens ca. 15 %. Linien ab 0,3 mm.

**Kleine Größen**
- Filigran-Liste (§7) erst ab 9 × 6, hart per `mindestFlaecheCm2: 54`.
- Bis 8 × 5 bzw. 12 × 4 nur einfache Designs.
- Schrift unter 3 mm erst ab 18 × 12 (5.5/5.27).

**Bohrung und Rand**
- Design ohne Befestigung gestalten. Der Konfi verkleinert und rückt als Block ein: 2 mm Abstand, Kopf 5 mm (3.39/3.40).
- Gravur bis an den Rand. Grabkreuze: mindestens 2 mm Abstand zur Kontur.

**Schiefer**
- Helle Gravur. Fotos in Graustufen. Kordellöcher freihalten.

**Mengen**
- Ab 10 × 10 je Zielgruppe mindestens 29 Designs (5.15).
- Kreuz auch bei Tieren. Stern nur Sternenkinder, Knochen nur Hunde (4.33).

**Technik**
- Jedes Design sofort mit `ziele`.
- Kontaktbögen nur mit `scripts/render-vorlagen.mjs`, beschriftet nach der gerenderten Größe.
- Viele Einzelentscheidungen als **Prüfrunde auf der Prüfseite „Designprüfung Edelstahl“** (41X3tZ1QMHyqEZNum3WPQo, Ja/Nein und Kommentar, Design Prüfung Skill #169).
- Freigabe nur Chris.

## 8. Werkzeuge
**Renderer** `scripts/render-vorlagen.mjs` (gravuru-2027, gemergt mit #163):
```
node scripts/render-vorlagen.mjs --katalog <Katalog> --familie steel-door-signs --reihe edelstahl-gravur-80x53 --png --bogen --out <Ordner>
node scripts/render-vorlagen.mjs --katalog <Katalog> --familie steel-door-signs --design "ID1;ID2" --befestigung B02S --png --out <Ordner>
node scripts/render-vorlagen.mjs --katalog <Katalog> --familie steel-door-signs --leer --kontur --png --out <Ordner>
```
- Design-IDs mit `;` trennen.
- `--groesse alle` rendert nur passende Größen, `familie` alle Größen.
- Befestigung: K00 / KGL / KRA / B02 / B02S / B04 / B04S.

**Vollauf Linux** (ca. 20 min, immer mit `run_in_background`, nie `&` und pkill):
`node --test --test-reporter=tap app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs`

**GitHub**
- Nur REST (`gh api repos/...`), GraphQL ist gesperrt.
- Kommentare mit `-F body=@datei.md`.
- Paginierung manuell mit `&page=N`.

**Shopify** nur lesend (GraphQL über MCP).

## 9. Hergang der Woche (kurz)
**Montag 02.11.**
- Alle Unterkategorie-Chats geliefert. Katalog gemergt:
  - Familie, Figuren, Eulen, Hunde, Katzen, Andenken, Willkommen, Hochzeit, Hinweis, Firmen, Hausnummern, Pferde;
  - AA/AS/S/S, Monogramme, Kordel;
  - Schiefer Tiere mit Foto 1.421, ohne Foto 974;
  - AE-Gedenktafeln, Grabstecker 2.680, Rasse 15 × 10.
- Regeln: Freiflächen §7, Strichfiguren-Stopp, 29 je Zielgruppe.
- Operator 2 prüft Mikas Schiefer-PRs in #128 (A1–A16).
- 10 Edelstahl- und Acryl-Produkte live, 126 Funkklingeln live.
- Ladezeit-Rückfall auf den 28.10.-Stand; Icons statt Dropdown.

**Dienstag 03.11.**
- Schlanker Start live (#153).
- 102 Grabstecker-Entwürfe.
- Türschild-Schnitt 4.42/4.43 (#156, 2 Entwürfe).
- Schiefer-Konfi ohne Designs, Bohrlöcher, Zubehör, blaue Haarlinien.
- Schraubenkopf 5 mm (#159).
- Konfi-Studie #161.
- Edelstahl: Logo 12,99 € und Icon „raue Flächen“ (#162), Preisrunde (Katalog #163).
- Renderer (#163), Block einrücken 2 mm (#164), 80 Grundplatten (Katalog #164).

**Mittwoch 04.11. (Nacht)**
- Code #165, Katalog #165–#169.
- Astra 1 hat Code #159/#164/#163/#158/#162/#165 und Katalog #163/#164/#166/#167/#168 gemergt. Vollauf 2116/2116.
- 0 Live-Änderungen, 95 Entwurfspreise.

**Mittwoch 04.11. (Vormittag)**
- Schiefer-Paket von Astra abgenommen (Code #166, Katalog #171, 48 Entwürfe, 2126/2126).
- 10:08 Live-Freigaben 4.61 und 4.62.
- 10:28 Regel 7.21.
- 10:30 Auftrag „alle Designs anbinden“.
- 10:32 Stopp wegen Konflikt.
- 10:40 Rollen 7.22/7.23.
- 10:51 Konfi #161 finalisiert.
- 10:58 Prüfrunde Hinweis- und Boxenschilder: 19 Ja / 52 Nein.
- 11:04 Prüfauftrag an Mika als Issue #168.

## 10. Stand jetzt (11:30)
**Edelstahl (#139)**
- Astra 1 **pausiert auf Chris' „warte“** (6626749551).
- Der Sammelentwurf 16190784438652 (Revision 2) öffnet im Shop nicht: „Noch nicht eingerichtet“. In `catalog_live_order_approvals` steht nur Revision 1.
- Chris hatte „Ja, Revision 2 für den Test freigeben“ gesagt, dann „warte“. Die Freigabe ist **nicht geschrieben**.
- 164 Live-Produkte und 1.530 Preise sind gesichert, **0 Preise geändert**.
- Weiter erst, wenn Chris „weiter“ sagt.

**Schiefer (#85)**
- Nichts gemergt, nichts live.
- **Katalog #162 und #165 haben Konflikte** in `kataloge/Stammdaten-Gravuru.xlsx` (erzeugte Datei: Branch auf main bringen und neu bauen, nicht mischen). Beide sind PRs des Schiefer-Chats; der Stopp ist **unbeantwortet**.
- Sauber mergebar: Code #160/#166, Katalog #169/#171/#172.
- Astra Schiefer:
  - hat in Code-PR **#170** (neu) und einem Katalog-Branch `dev/astra1-schiefer-designboegen-20261104` 2.815 Designs Ziele gegeben (3.238 Familienziele, 5.868 Größen);
  - Quelle: 3.166 Designs, 249 mit Ziel, 2.917 ohne;
  - ausgenommen sind `schiefer-menschen-*`, die übernimmt der Schiefer-Chat.
- Schiefer-Chat korrigiert Mikas 95 Menschen-PRs nach #128 (ca. 1.950 Master). Mit Chris bestätigter Plan:
  1. Menschen korrigieren;
  2. Edelstahl-Unterkategorien (Familie, Hausnummer, Andenken) auf Schiefer übertragen;
  3. 7 × 2 / 8 × 3,5 / 8 × 5 1:1 übernehmen;
  4. neu nur bei Lücken.
- Widerspruch offen: `schiefer-tiere-stern` (46 Designs) gegen 4.33 „Stern nur Sternenkinder“.

**Designprüfung Edelstahl**
- Arbeitsliste: Runde 1 = auffällige der 3.463 Edelstahl- und Acryl-Designs. Danach Grabstecker, AA/AS, AE und Schiefer, jeweils nur auf Chris' Auftrag.
- **Befund:** Der Edelstahl-Chat hat die 19 Hinweis-Ja (Commit `8d2ac3aab`, 11:05) auf den Branch des **schon gemergten** Katalog-PR #168 gepusht. Sie sind **nicht auf main** (0 Treffer für `mindestFlaecheCm2` in `hinweise-*`/`boxenschilder-*`). Er braucht einen neuen PR. Die Merge-Ansage in #139 (6627022068) läuft so ins Leere.

**Offene PRs zum Prüfen bzw. Mergen**
- Code:
  - #161 Konfi-Optik;
  - #166 / #160 Schiefer;
  - #167 Bericht Astra 1;
  - #169 Design Prüfung Skill;
  - #170 Schiefer-Ziele;
  - #157 Nachweis.
- Katalog:
  - #170 Ersatzschriften Allura/Bellefair und D57/D61, **von mir nie geprüft**;
  - #172 DESIGN-MASTER, in keiner Merge-Liste;
  - #169 / #171 / #162 / #165 Schiefer;
  - #139 AE-Türschilder 914;
  - #153 Firmen;
  - #157 Rasse;
  - Mikas 98 PRs.

**Mika (#168)**
- Prüfauftrag mit allem gestellt (Hergang, Konfi, Tabellen, Designaufbau, Stand, Ziel, 9 Prüfpunkte, meine Fehler).
- Noch keine Antwort.

## 11. Ziel
- **Edelstahl-Schilder live:**
  - Revision 2 und neue Preise auf allen 164 Produkten;
  - Designfilter je Produkt;
  - Filigran- und Kleingrößen-Regeln eingehalten.
- **Schiefer live:**
  - 48 Tafeln mit Zubehör und Fotopreis;
  - alle passenden Designs, auch Menschen, Familie, Hausnummer, Andenken;
  - Chris gibt die Designs frei.
- **Konfi #161** als Master für alle Linien, ohne Funktionsverlust, Ladezeit im Budget.
- **Danach:** Gedenktafel Edelstahl, Acryl, AE-Türschilder nach demselben Muster.
- Chris: „Wir müssen die Produkte hochladen“, „Es soll einfacher gehen“.

## 12. Nächste Schritte (Vorschlag, mit Chris abstimmen)
1. Register ergänzen: Nachtrag c/d, blaue Haarlinien, „nur per Skripte“, Konfi #161. Danach die Nachtrag-Dateien leeren.
2. Schiefer-Blocker lösen: Den Schiefer-Chat (#85) bitten, #162/#165 auf main zu bringen und die Stammdaten neu zu bauen. Danach `mergeable` aller Schiefer-PRs prüfen, dann Astra Schiefer weiter.
3. Edelstahl: Chris fragen, ob Astra 1 die Revision-2-Testfreigabe schreiben und den Warenkorbtest machen darf („warte“ aufheben?).
4. 19 Hinweis-Designs: Den Edelstahl-Chat um einen neuen PR bitten. Katalog #170 und #172 prüfen und in die Merge-Liste aufnehmen.
5. Antwort von Mika in #168 prüfen und umsetzen.
6. Stern-Widerspruch Schiefer mit Chris klären.

## 13. Liste aller Designs (gebaut 04.11., 11:45)
Die Datei `Alle-Designs-2026-11-04.xlsx` hat Chris im Chat bekommen. Die Zählung kommt direkt aus dem Katalog: jeder Ordner mit `design.json`, auf main und in allen offenen Katalog-PRs. Neu bauen mit den Skripten `scan.py`, `scan2.py` und `build.py`; Ablauf: alle PR-Köpfe mit `git fetch origin '+refs/pull/*/head:refs/remotes/pr/*'` holen, dann `git cat-file --batch`.

**Auf main: 30.272 Designs**
- Davon **10.722 am 01./02.11. fertiggestellt**: Unterkategorie-Chats, Sonntagnacht gemergt.
- 8.173 haben Ziele und erscheinen im Produkt. 7.846 sind freigegeben (Freigabe steht je Ziel in `ziele[].freigabe`).
- Grabstecker 2.680, Edelstahl-Schilder 2.573, Hinweis 1.344, Rasse 960, AA/AS/S/S 286, Monogramme 164 – alle mit Zielen.
- **Schiefer: 2.915 Designs ohne Ziele.** Sie erscheinen in keinem Produkt. Die Zuordnung steht in Code-PR #170 und einem Katalog-Branch von Astra Schiefer und ist nicht gemergt.
- Bestand (Corel-Rohdaten) 19.059, ohne Ziele.

**Nicht gemergt: 11.865 neue Designs in 104 offenen Katalog-PRs**
- Rasse-Schilder #8 (8.100, aus dem Oktober)
- AE-Türschilder #139 (914)
- Mika 2.052 (Schiefer Menschen/Sternenkinder, Grabkreuze)
- Firmen #153 (274), Tierbestand #14 (260), Boxenschilder #9 (200)
