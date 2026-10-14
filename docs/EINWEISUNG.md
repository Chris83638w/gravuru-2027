# Einweisung Gravuru 2027 · für neue Accounts

Stand 14.10.2026. Für Menschen und KI-Accounts, die neu im Projekt sind und bereits GitHub-Zugriff haben. Diese Datei ist der Einstieg; alle Details stehen in den verlinkten Dateien. Wenn etwas hier und in einem neueren `STATUS.md`-Abschnitt widerspricht, gilt `STATUS.md`.

---

## 1. Worum es geht

**gravuru** verkauft personalisierte Gravur- und Druckprodukte: Türschilder, Gedenktafeln, Acrylglasbilder, Funkklingel-Schilder – aus Edelstahl, Acrylglas, Schiefer, Holz und Leder. Hauptkanal ist heute Amazon, der bisherige Webshop läuft auf WooCommerce, der neue Shopify-Shop hat noch keine echten Kundenbestellungen.

**Gravuru 2027** ist die neue, eigene Anwendung für diesen Shopify-Shop. Sie besteht aus zwei Oberflächen auf derselben Datenbasis:

| Oberfläche | Für wen | Was man dort tut |
| --- | --- | --- |
| **Werkstatt** (Händler) | gravuru-Team, in Shopify eingebettet | Produkte und Master anlegen, Designs gestalten und importieren, Preise/Optionen/Bohrbilder pflegen, Excel-Serien, KI-Gestaltung, Bestellungen und Fertigungsdateien |
| **Konfigurator** (Kunde) | Shop-Kunden | Design wählen, Texte/Foto/Farbe ändern, Befestigung wählen, Preis sehen, in den Warenkorb |

Ziel: ein Ablauf **ohne Medienbruch** – Design entsteht, wird geprüft importiert, ist im Konfigurator bestellbar, die Bestellung erzeugt einen unveränderlichen Fertigungsstand.

### Verbindliche Begriffe

| Begriff | Bedeutung |
| --- | --- |
| **Design** | die gesamte Gestaltung einer Platte: Texte, Motive, Foto, Deko |
| **Motiv** | ein einzelnes hinzufügbares Element (Herz, Pfote, Ornament) |
| **Produkt** | ein verkaufbarer Artikel mit Geometrie, Material, Optionen, Preisen und einem oder mehreren Designs |
| **Master** | Vorlage, aus der Produkte kopiert werden |
| **Produktfamilie** | ein Material mit allen Größen, Formen, Bohrbildern, Preisen und Schriften; erzeugt Produkte |
| **Revision / Stand** | jede Speicherung legt einen neuen, unveränderlichen Stand an; nichts wird überschrieben |
| **Bestellstand** | eingefrorene Kopie von Produkt, Design und Kundeneingaben zum Zeitpunkt der Bestellung |

Maße immer in **mm**, Preise immer in **ganzen Cent**.

---

## 2. Systemlandschaft

```
 ChatGPT · Plugin „Product Design“          Werkstatt-KI (OpenAI API, Kostenlimit)
        │  Designs als SVG/PDF mit Ebenen            │
        ▼                                            ▼
 ┌──────────────────────────── Gravuru 2027 (Node 24 + Python, SQLite) ───────────────────────────┐
 │  Werkstatt (Händler)  ◄── gleiche Produktstände ──►  Konfigurator (Kunde)                       │
 │  Import · Familien · Excel-Serien · Bestellungen · Fertigungsdateien                            │
 └──────────────┬──────────────────────────────────────────────────────────────────────────────────┘
                │ läuft auf Plesk: https://app-2027.gravuru-designwerkstatt.de  (Händlerhost)
                │ eingebettet über die bestehende Shopify-App „Gravuru Konfigurator“
                ▼
 Shopify-Shop gravuru-design.myshopify.com  ── Produktentwürfe (DRAFT) · Testwarenkorb · Bestell-Webhook
```

| Baustein | Wo | Hinweis |
| --- | --- | --- |
| Quellcode (aktiv) | GitHub `Chris83638w/gravuru-2027` | dieses Repository |
| Altprojekt | GitHub `Chris83638w/gravuru-shopify` | Quelle für übernommene Daten (z. B. Stahl-Stammdaten, 148 Designs, 721 Motive). Nicht weiterentwickeln. |
| Händlerhost | Plesk-Server `gravuru-designwerkstatt.de`, Subdomain `app-2027` | ein einziger Node-Prozess, private Daten außerhalb des Webroots |
| Shopify-App | „Gravuru Konfigurator“, Client-ID `9640dd7a6907f0c73e7013ea8c24869b` | bestehende App, **keine neue anlegen** |
| Alte Werkstatt | Plesk, Ordner `gravuru-werkstatt` | bleibt unberührt, nichts kopieren oder ersetzen |
| KI in der Werkstatt | OpenAI Responses/Images API | Monatslimit 100 €, siehe [ops/plesk/AI-DESIGN.md](../ops/plesk/AI-DESIGN.md) |
| Designerstellung | ChatGPT-Plugin „Product Design“ | Rezept unter `design/product-design/` (Branch `task/product-design-recipe-20261013`) |

---

## 3. Repository und Branches – wichtig

- **`main` ist veraltet (Stand 30.09.2026). Nicht als Arbeitsbasis verwenden.**
- Gearbeitet wird auf **Aufgabenbranches** `task/<thema>-<JJJJMMTT>`, Doku auf `docs/…`, Tests auf `test/…`. Jede Aufgabe bekommt einen eigenen Branch. **Kein Force-Push, keine fremden Änderungen zurücksetzen.**
- Aktuelle Kette (neueste zuerst):

| Commit | Branch | Inhalt | Installiert? |
| --- | --- | --- | --- |
| `20154f0` | `task/go-live-preflight-20261013` | Go-Live-Abgleich, Zugang zu Plesk blockiert | – (nur Doku) |
| `4d7c150` | `task/plugin-design-pipeline-20261013` | Produktfamilien (Edelstahl/Acryl/Schiefer), Bohrloch-Schutzzone, P1-Korrekturen, Design-Probelauf | **nein** |
| `b1abcfb` | `task/product-design-recipe-20261013` | Designstudio/Rezept für Product Design, parallel entstanden | nein (nur Design-Werkzeuge) |
| `7a168bc` | (Vorfahr von `4e2713b`, `backup/account-recovery-20261010`) | **installierter Stand** auf dem Händlerhost, Version `0.1.0-recovery.20261010+7a168bc66adc` | **ja** |

- Neue Arbeit zweigt vom jeweils neuesten passenden Stand ab (heute: `20154f0` bzw. `4d7c150`). Vor dem Abzweigen `git ls-remote --heads origin` prüfen, ob es Neueres gibt.

### Wo was liegt

| Pfad | Inhalt |
| --- | --- |
| `app/configurator/variant-m/` | Server (`server.mjs`), Kundenkonfigurator, Vertrag/Preislogik (`contract.mjs`), Build |
| `app/workshop/` | Werkstatt: Produkte, Revisionen, Editor (`ui/`), Import (PDF/SVG/ZIP/Excel), Familien, Bestellungen, Shopify, KI, Fertigung |
| `app/platform/sources/app/shared/models/` | gemeinsame Modelle: Designinhalt und Platzierungsprüfung, Bohrbild-Regeln, Verfahren |
| `app/designs/` | mitgelieferte Stammdaten und Muster (z. B. `steel-door-signs/family.json`, `gedenktafeln-30x20/`) |
| `ops/plesk/` | Paketierung, Staging, Aktivierung, Konfiguration des Händlerhosts |
| `ops/shopify/` | App-Versionen, Erweiterungen, Bestellumfang |
| `scripts/` | Browser- und Paketprüfungen (`check-*.py`), Paketbau, Probeläufe |
| `docs/releases/<datum>/…/RELEASE.md` | Nachweis je Paket: was geändert, was geprüft, welche Grenzen |
| `docs/reviews/` | unabhängige Prüfberichte |
| `STATUS.md` | **laufender Stand, neueste Abschnitte oben** |

---

## 4. Lokal starten und prüfen

Voraussetzungen: Node.js **24+**, Python 3 mit PyMuPDF, Pillow, CairoSVG, fontTools, openpyxl (siehe `app/workshop/requirements-import.txt`). Keine npm-Pakete nötig.

```sh
node app/configurator/variant-m/server.mjs --port=8961
# Konfigurator:  http://127.0.0.1:8961/?model=acryl
# Werkstatt:     http://127.0.0.1:8961/werkstatt/
# Familien:      http://127.0.0.1:8961/werkstatt/familien
```

- Lokale Daten liegen in `.local-data/` (nicht im Repo). Für einen frischen Test den Ordner wegverschieben, nicht löschen.
- Python wählen mit `GRAVURU_PYTHON=/pfad/zu/python`.
- Tests: `npm test` (dauert ca. 10 Minuten; Ops-Tests brauchen zusätzlich `GRAVURU_MERCHANT_TEST_PYTHON`). Gezielt: `node --test app/workshop/product-families.test.mjs`.
- Browserprüfungen: lokalen Server aus einer **Wegwerfkopie** starten, dann z. B. `python3 scripts/check-product-families.py http://127.0.0.1:PORT`. Ergebnisse unter `.test-output/`.

Details: [LOKAL-STARTEN.md](../LOKAL-STARTEN.md).

---

## 5. Die Abläufe von Anfang bis Ende

### 5.1 Produkte anlegen

- **Einzeln:** Werkstatt → Produkte → neu oder „Aus Master“. Geometrie, Material, Optionen, Preise im Produkt.
- **Als Familie (empfohlen für Serien):** Verwaltung → Produktfamilien → Stammdaten übernehmen oder bearbeiten → „Produkte erzeugen“. Bohrlöcher werden aus **Regeln** berechnet (Lage, Anzahl, Ø, Randabstand bis Lochmitte), nicht als Koordinaten gepflegt. Familienänderungen gehen erst nach Vorschau und Bestätigung („Auf Produkte übernehmen“) auf erzeugte Produkte; Designs bleiben erhalten.
- **Offene Stammdaten** stehen als „offen“ in der Familie. Planen und Briefing gehen, Produkte entstehen erst, wenn alles ausgefüllt ist. Werte werden **nie geraten**.
- Massenanlage per Excel: Werkstatt → Produktserien, Vorlage herunterladen, Probelauf, dann anlegen. `import_key` verhindert Dubletten bei Wiederholung.

### 5.2 Designs erstellen und importieren

1. **Gestalten** im ChatGPT-Plugin „Product Design“ nach dem Rezept (`design/product-design/START.md`) und dem **Briefing der Familie** (Werkstatt → Familie → „Briefing herunterladen“: Maße, Schablonen je Größe mit Bohrlöchern und Schutzzonen, zugelassene Schriften). Gestaltet wird **schwarz auf weiß**; die Werkstatt stellt die Gravur je Material dar (Edelstahl dunkel, Acryl/Schiefer hell).
2. **Lieferformat:** SVG oder PDF in Endmaß mit getrennten, benannten Ebenen (`text-…` als echter Text, `motiv-…`, `deko-…`, `foto-…`).
3. **Importieren:** Produkt öffnen → Designs → „PDF / SVG importieren“, oder Ordner/ZIP bzw. Excel-Serie für viele. Originale bleiben bytegleich erhalten; Texte werden bearbeitbare Kundenfelder.
4. **Übertragen auf andere Größen/Materialien:** `node scripts/plan-family-designs.mjs --designs <datei> --out <ordner>` prüft ohne Schreiben, welche Designs auf welche Größe und welches Material passen (gleiches Verfahren, gleiche Grundform, gleiches Seitenverhältnis, Rand, Schrift ≤ 100 mm, Texte am Bohrloch). Ergebnis als CSV für Excel.

Regeln: Motive dürfen über Bohrlöcher gehen, **Texte** in der 1-mm-Schutzzone bekommen einen Hinweis (Kunde, Händler, Bestellvermerk). Kein pauschaler zusätzlicher Sicherheitsrand.

### 5.3 Konfigurator (Kunde)

- Zeigt dasselbe Produkt und denselben Preis wie die Werkstatt; Preise rechnet nur der Server.
- Kundenrechte je Element (Text ändern, verschieben, Größe, Farbe, löschen) legt der Händler fest.
- Hinweis am Bohrloch, Schutzzone in der Vorschau sichtbar.

### 5.4 Shop und Bestellung

- Werkstatt läuft **in Shopify eingebettet**; jede Anfrage prüft das Shopify-Sitzungstoken, Schreibzugriffe zusätzlich CSRF.
- Produkte gehen nur als **Entwurf (DRAFT)** nach Shopify. Es gibt bewusst keinen Code-Pfad, der Produkte öffentlich schaltet.
- **Testwarenkorb:** nur für eine festgelegte, geprüfte Gedenktafel-Revision, Zahlungstestmodus. Ein vollständiger Händler-Testkauf mit Foto war am 11.10. erfolgreich.
- **Bestelleingang:** signierter Webhook (HMAC) → unveränderlicher Bestellstand mit Medienkopie → Fertigungsausgabe (Druck/Gravur, Trenndateien).
- **Noch nicht vorhanden:** öffentlicher Kunden-Checkout für alle Produkte, Storno-/Erstattungsempfang, Produktbilder nach Shopify, Fertigungsfreigabe (`productionReady` ist überall `false`).

### 5.5 Upload und Installation auf dem Server

Nur nach **ausdrücklicher Freigabe „installieren“** durch den Projektinhaber.

1. Paket aus einem Commit bauen (enthält nur eingecheckte Laufzeitdateien, keine Daten oder Geheimnisse), Prüfsummen und Manifest festhalten.
2. Auf dem Server: `ops/plesk/stage-merchant-release.py` prüft Archiv und Prüfsummen und entpackt in ein frisches Release-Verzeichnis.
3. Händlerprozess stoppen → `ops/plesk/activate-merchant-release.py` sichert private Daten und Laufzeit und tauscht atomar nur den Einstieg.
4. Nur den Händlerdienst starten, dann prüfen (HTTPS, Anmeldung über Shopify, Produkte sichtbar, Speichern/Wiederöffnen).
5. Nachweis als `docs/releases/<datum>/<paket>/RELEASE.md`, Paket unter `deliverables/`, `STATUS.md` fortschreiben.

Rückweg: vorherigen Einstieg aus der Aktivierungssicherung wiederherstellen. Ein eigenes Restore-Skript mit Probe-Wiederherstellung fehlt noch.
Ausführlich: [ops/plesk/MERCHANT-README.md](../ops/plesk/MERCHANT-README.md), Shopify-App-Versionen: [ops/shopify/README.md](../ops/shopify/README.md).

**Aktuelle Sperre (13.10.):** Aus der Cloud-Laufzeit ist der Händlerhost nicht erreichbar (Proxy 403) und die Plesk-Zugangsvariablen sind nicht eingebunden. Siehe [GO-LIVE-ABGLEICH-20261013.md](releases/GO-LIVE-ABGLEICH-20261013.md). Ohne diese Freigaben kann niemand aus der Cloud installieren.

**Shopify-App-Release:** Eine neue App-Version wurde bisher von Shopify abgewiesen, weil das vollständige bestehende Theme-/Function-Erweiterungsprojekt fehlt. Kein `shopify app deploy` aus einem unvollständigen Projekt – fehlende Erweiterungen würden entfernt.

### 5.6 KI-Gestaltung in der Werkstatt

Produkt → Designs → „Mit KI gestalten“. Vorschlag ansehen, ausdrücklich übernehmen oder verwerfen. Jede Anfrage reserviert vorab Budget; Obergrenze 100 € pro Monat. Bekannte Schwäche: Reserven nach Fehlern werden nicht freigegeben. Die Tarifprüfung läuft am **10.11.2026** ab und muss erneuert werden.

---

## 6. Stand heute (14.10.2026)

**Live auf dem Händlerhost (`7a168bc`):** Produkt-/Masterverwaltung mit Revisionen, nativer Editor mit Hilfslinien, PDF/SVG-Import, Excel-Serien, Acryl- und Edelstahlmuster, schwarze Edelstahlgravur in der Händleransicht, KI-Gestaltung, Shopify-Anmeldung, Händler-Testkauf.

**Fertig, aber nicht installiert (`4d7c150`):**
- P1-Korrekturen: überlagerte Elemente anklickbar, Edelstahl-Schwarz auch beim Kunden, Fertigungsfarbe bei importierten Grafiken, vorbereitete Pakete 1:1.
- Produktfamilien mit Bearbeiten, Revisionen, Übernahme auf Produkte; Stahl-Türschilder (61 Größen) und Gedenktafel 30 × 20 in fünf Materialien.
- Bohrloch-Schutzzone mit Hinweisen für Kunde, Händler und Bestellung.

**Offen, in dieser Reihenfolge geplant** (Details: [docs/plans/PLUGIN-DESIGN-STRECKE-20261013.md](plans/PLUGIN-DESIGN-STRECKE-20261013.md)):
1. Materialien einzeln durchgehen (Logik zuerst, dann Stammdaten): Naturschiefer → Edelstahl-Gedenktafel → Premium-Schiefer → Acryl schwarz/anthrazit. Für Acryl-Gravurplatten fehlt noch das native Produktmodell.
2. Stammdaten-Excel des Inhabers einlesen.
3. Import-Schritt: übertragbare Designs mit Prüfliste in Produkte übernehmen.
4. PDF-Ebenen-Serienlauf für die Plugin-Designs 13–18, danach Mehrfachimport.
5. Shopify-Anbindung der neuen Produkte; öffentliche Verkaufsstrecke separat abnehmen.

**Nicht freigegeben:** Fertigungsdateien ohne reale Probe, öffentlicher Checkout, AOSU-Fertigung, Formprodukte mit Fotofeld. Bekannte Fehlerliste mit Prioritäten: [Prüfbericht vom 12.10.](reviews/CLAUDE-PRUEFBERICHT-20261012.md).

---

## 7. Arbeitsregeln – nicht verhandelbar

**Vom Projektinhaber festgelegt:**
- **Live-Systeme** (Shopify, Amazon, Server) nur **lesen und exportieren**. Nichts importieren, hochladen, veröffentlichen oder installieren ohne ausdrückliche Freigabe für genau diesen Schritt. Fertige Dateien werden übergeben, der Upload bleibt beim Inhaber.
- **Vor jedem Löschen informieren** – auch lokal und auf dem Server. Lieber verschieben als löschen.
- **Kosten sparen:** Massenarbeit per Skript, keine kostenpflichtigen KI-Aufrufe ohne Auftrag, keine Bildgenerierung „zum Probieren“.
- **Keine echten Bestellungen oder Zahlungen** auslösen.
- Der Inhaber will Klartext: Wenn eine Anweisung fachlich falsch ist, **widersprechen und begründen**.

**Aus [AGENTS.md](../AGENTS.md):**
- Ein Paket mit überprüfbarem Ergebnis nach dem anderen; keine neue Komplettplanung bei jeder Fortsetzung.
- Geeignete Tests **und** sichtbare Bedienprüfung je Änderung. Bei Fehlern die Ursache beheben, nicht den Sollwert anpassen.
- Fertige Funktion, synthetischer Test, historischer Nachweis und offene Voraussetzung **ausdrücklich unterscheiden**. Eine passende Oberfläche beweist keine funktionierende Bestellstrecke.
- Schriften, Produktionsprofile, Materialstärken und Preise **nicht erfinden**. Unbekanntes bleibt „offen“.
- Geheimnisse, Kunden-/Bestelldaten und Datenbanken gehören **nie** ins Repository. Veröffentlichte Bestellstände sind unveränderlich.
- Nach jedem Paket `STATUS.md` oben knapp fortschreiben: Dateien/Commit, Prüfungen, Grenzen, genau nächster Schritt.
- Kurze deutsche Updates, verständlich für Nicht-Entwickler.

---

## 8. Zugänge – wer braucht was

Keine Zugangsdaten in Chats, Dateien, Befehlsargumenten oder Screenshots. Hier stehen nur die **Orte**.

| Zugang | Wofür | Wo / wie |
| --- | --- | --- |
| GitHub | Code, Branches, Nachweise | vorhanden |
| Shopify Admin / Dev Dashboard | Produkte ansehen, App-Einstellungen | Konto beim Inhaber anfordern; App-Automation-Token liegt nur privat auf dem Server (`private/gravuru-shopify-app-automation-token`, 0600) |
| Plesk | Installation, Logs, Dateien | Konto beim Inhaber anfordern; für Cloud-Laufzeiten Variablen `GRAVURU_PLESK_USERNAME`/`GRAVURU_PLESK_PASSWORD` sicher binden und Host freigeben |
| Private Konfiguration des Händlerhosts | Verweise auf Datenablage, App-Schlüssel, Python | `private/gravuru-2027-merchant-shopify.json` (enthält nur Pfade) |
| OpenAI-Projektschlüssel | KI-Gestaltung der Werkstatt | nur auf dem Server, eigener Projektschlüssel |
| ChatGPT mit „Product Design“ | Designerstellung | eigener ChatGPT-Zugang; Rezept und Briefing aus dem Repo |

---

## 9. Erste Schritte (Tag 1)

1. Diese Datei, dann [STATUS.md](../STATUS.md) (nur die obersten 5 Abschnitte) und [AGENTS.md](../AGENTS.md) lesen.
2. `git ls-remote --heads origin` – neuesten Stand feststellen; Branch `task/plugin-design-pipeline-20261013` auschecken.
3. Lokal starten (Abschnitt 4), Werkstatt öffnen, unter **Verwaltung → Produktfamilien** „Gedenktafel 30 × 20 · Naturschiefer“ übernehmen, Produkt erzeugen, im Editor öffnen, Kundenansicht ansehen.
4. Einmal gezielt testen: `node --test app/workshop/product-families.test.mjs` (11 Tests, alle grün).
5. [Prüfbericht](reviews/CLAUDE-PRUEFBERICHT-20261012.md) Abschnitt 2 und 9 lesen: was gut ist, was nicht freigegeben ist.
6. Fehlende Zugänge (Shopify, Plesk, ChatGPT) beim Inhaber anfragen – ohne Zugangsdaten per Chat.
7. Erst dann eine eigene Aufgabe mit eigenem Branch beginnen.

---

## 10. Kopierfertige Startnachricht für einen KI-Account

> Du arbeitest im Projekt Gravuru 2027, Repository `Chris83638w/gravuru-2027`. Lies zuerst `docs/EINWEISUNG.md`, dann die obersten Abschnitte von `STATUS.md` und `AGENTS.md`. `main` ist veraltet; arbeite vom neuesten Aufgabenbranch aus und lege für jede Aufgabe einen eigenen Branch an. Live-Systeme nur lesen, nichts installieren, hochladen oder veröffentlichen ohne ausdrückliche Freigabe für genau diesen Schritt; vor jedem Löschen fragen; keine kostenpflichtigen KI-Aufrufe ohne Auftrag; keine Werte erfinden. Bestätige kurz, was du verstanden hast, und nenne den aktuell installierten und den neuesten Entwicklungsstand mit Commit, bevor du etwas änderst.

---

## 11. Weiterlesen

| Thema | Datei |
| --- | --- |
| Laufender Stand | [STATUS.md](../STATUS.md) |
| Arbeitsregeln | [AGENTS.md](../AGENTS.md) |
| Gesamtplan der Werkstatt | [NEUE-WERKSTATT-PLAN.md](../NEUE-WERKSTATT-PLAN.md) |
| Plugin-Designstrecke | [docs/plans/PLUGIN-DESIGN-STRECKE-20261013.md](plans/PLUGIN-DESIGN-STRECKE-20261013.md) |
| Materialfamilien | [docs/releases/20261013/material-families/RELEASE.md](releases/20261013/material-families/RELEASE.md) |
| Materialreferenzen | [MATERIALREFERENZEN.md](../MATERIALREFERENZEN.md) |
| Lokaler Start | [LOKAL-STARTEN.md](../LOKAL-STARTEN.md) |
| Installation Händlerhost | [ops/plesk/MERCHANT-README.md](../ops/plesk/MERCHANT-README.md) |
| Shopify-App | [ops/shopify/README.md](../ops/shopify/README.md) |
| KI-Gestaltung | [ops/plesk/AI-DESIGN.md](../ops/plesk/AI-DESIGN.md) |
| Prüfbericht | [docs/reviews/CLAUDE-PRUEFBERICHT-20261012.md](reviews/CLAUDE-PRUEFBERICHT-20261012.md) |
| Go-Live-Abgleich | [docs/releases/GO-LIVE-ABGLEICH-20261013.md](releases/GO-LIVE-ABGLEICH-20261013.md) |
