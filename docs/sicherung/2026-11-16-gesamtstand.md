# gravuru 2027 – Gesamtstand

**Stand: Montag, 16.11.2026, 11:00 Uhr** (korrigierte Fassung; die 09:00-Fassung enthielt einen Fehler beim Produktstatus)
Erstellt von Claude (Operator). Quellen: GitHub `gravuru-2027` (STATUS.md, Übergaben, Issues), die Entscheidungen von Chris, die Live-Systeme und Codex' Prüfbericht #239.

---

## 1. Worum es geht

**gravuru 2027** ist der komplette Neuaufbau des Shopify-Shops „Gravuru Design“ (gravuru-design.myshopify.com, Shopify Plus). Er hat einen eigenen Produktkonfigurator, den **Prio Konfi**, und eine eigene Design-Werkstatt.

Ziele:
- Das gesamte gravuru-Sortiment (Schilder, Gedenkartikel, Geschenkartikel, Hausnummern, Grabkreuze, Boxenschilder …) personalisierbar online verkaufen.
- Ein Konfi für alle Produkte und Materialien (Edelstahl, Acrylglas, Holz, Schiefer, Druck/UV). Reiter wie Foto oder Logo erscheinen nur, wenn das Produkt sie hat.
- Neue Produkte per Chat oder aus dem Katalog anlegen und direkt online stellen. In der Werkstatt geänderte Designs gehen automatisch in den Shop.
- Später: Konfi-Daten auch für Amazon Custom nutzen, Amazon-Bestellungen einlesen und den Konfi als Abo-App an andere Händler verkaufen.
- gravuru.de bleibt vorerst auf WooCommerce. WooCommerce ist aber kein Maßstab mehr.

---

## 2. Systeme und Ablageorte

| Bereich | Wo | Bemerkung |
|---|---|---|
| Shop | Shopify Plus „Gravuru Design“ | Theme Hyper als Basis. Neues Design in der Theme-Kopie „Produktseite 2027 – Kopie 10.11.“. Shop noch ohne Passwort (bewusst, für Tester). |
| App | „Gravuru Konfigurator“ (Dev Dashboard, App 423276544001) | Preisfunktion (Cart Transform), Kassen-Prüfung, Theme-Erweiterung, App-Proxy `/apps/konfigurator` |
| Konfi/Werkstatt-Laufzeit | Plesk `app-2027.gravuru-designwerkstatt.de` | Aktiv: `kandidat-a4616943-20261116` (seit 16.11., mit F01) |
| Code | GitHub `Chris83638w/gravuru-2027` | `main` plus Arbeitszweige `dev/<thema>-<datum>` |
| Katalog | GitHub `Chris83638w/gravuru-katalog` | Produktlinien, Familien, Designs, Schriften, Preise. Einzige Quelle für Preise und Lochabstände. |
| Große Dateien | Plesk-Server | Bilder, Vorschauen, Kontaktbögen (wegen GitHub-Größengrenze) |
| Corel-Bestand | Firmenserver `V:\Produkte` → Google Drive | Alle Corel-Dateien nach Drive, aussortiert wird später |
| Schneidvorlagen | Laptop `D:\Schneiden` | Sollen eine eigene GitHub-Ablage bekommen |

---

## 3. Rollen

- **Chris:** entscheidet und gibt frei, im Chat oder auf GitHub.
- **Claude (dieser Account):** Boss/Master-Operator. Plant, prüft, merged, macht Server (Plesk) und Shopify-Releases nach Freigabe. Ab 16.11. spielt Claude auch selbst ein („mach du das“).
- **Astra (ChatGPT/Codex)** auf dem anderen PC: programmiert Pakete per Pull Request und hat am 16.11. die Gesamtprüfung gemacht.
- **Astra Mika (Astra 3):** Hausnummern und Prio-Konfi-Pflege.
- **Astra 1:** QR-Seiten.
- Nachrichten zwischen den KIs laufen über **GitHub-Issues**. Der Hauptkanal ist #233, die Prüfung liegt in #239.
- Die anderen KIs haben keinen Zugriff auf den Firmenserver, nur auf den Katalog auf GitHub.

---

## 4. Zeitachse

### September 2026: Vorarbeiten
- Shopify-Metafelder für Mengenrabatte und FPD-Kartensteuerung, Lieferdatums-Logik in Liquid.
- Schriftenanalyse: rund 19 OFL-Schriften für den Konfigurator.
- Plan für den Massenimport (~4.000 Produkte) mit Matrixify, Skills für Produkttexte und SEO.
- Neues Theme „Gravuru Signs – Launch Candidate“ mit eigenen Sections.
- Eigener Konfigurator über ChatGPT/Codex begonnen (Edelstahl-Serie, Datenmodell als Metaobjects).

### Oktober 2026: Start gravuru 2027
- **09.10.:** Projekt „gravuru 2027“ gestartet. Claude wird Master-Operator. FPD wird nicht mehr genutzt.
- **10.–11.10.:** erste App-Versionen (Händlerwerkstatt, Test-Bestelleingang).
- **13.–20.10.:** Konfi-Grundregeln entschieden: Bohrlöcher, Zeichenlimits, Fotos immer annehmen, Überlagerung nur mit Hinweis, Freistellen kostenlos.
- **17.10.:** Katalog-Repo `gravuru-katalog` angelegt. Produktkürzel AA/AS und S/S festgelegt. Größen werden immer nach skalierbaren Größen geordnet.
- **19.10.:** Amazon-Custom-Import (Paket K15) gestartet.
- **22.10.:** Staffelpreis auf den kompletten Stückpreis. Claude übernimmt das gesamte Projekt inklusive Server.
- **23.10.:** Regeln für mehrere Accounts (AGENTS.md). Astra programmiert, Claude prüft und merged.
- **25.10.:** neues Design-System mit komplett neuen Farben und Schriften gewünscht. Amazon-Weg per Flat File.
- **26.10.:** Shop-Einstieg: App-Proxy und Block „Jetzt personalisieren“ live.
- **29.10.:**
  - Design-Master für alle KIs.
  - Für Preise und Lochabstände zählt nur die Preis-Excel.
  - Jedes Motiv ist löschbar und ersetzbar.
  - Funkklingel-Oberfläche live.
  - PR #42, #43, #49 und #52 live.
- **30.10.:** freigegebener Master (V2-Logopreis) live. Ein Konfi für alle Produkte.
- **31.10.:** Funkklingel-Reparatur live, Text an gekrümmten Rändern, 80 % der Produkte starten „ohne Befestigung“.

### November 2026: Produkte, Prio Konfi, Go-live-Vorbereitung
- **01.11.:**
  - Gestaltungsregeln aus Chris' Korrekturen.
  - Gedenkartikel-Acryl mit Rückplatte.
  - Fotogravur nur auf Acryl.
  - Knochenform.
  - Grabkreuze Acryl über Astra Mika.
- **02.11.:**
  - Issue #139: erste Türschilder live, Mengenrabatte, Hauptbilder/SEO, Handy-Bearbeiten.
  - Vier weitere Edelstahl-Produkte und Acryl-Produkte.
  - Funkklingeln zurück zu Dropdowns.
- **03.11.:** 102 Grabstecker-Entwürfe angelegt, Serienpipeline, Ausführungen als Icon-Kacheln.
- **05.11.:** Schiefer-Zubehörpreise (V3) vorbereitet, **nicht** freigegeben.
- **08.11.:** R15 als **Prio Konfi** gesichert. Preisreparatur Edelstahl (Logo-Preis) live als App-Version `steel-pricing-input-20261108-v2`.
- **09.11.:**
  - Verbindlicher Produktworkflow: vor jedem Produkt Module, Preise und Standardwerte bestätigen, je Produkt eine Excel.
  - Grabkreuze für UV-Druck.
  - Pferde-Boxenschilder 30×20.
- **10.11.:**
  - Neuaufbau: alle alten Produkte ignoriert und auf Entwurf gesetzt, mit Sicherung.
  - Produktkette Entwurf → Strecke → Freigabe → Veröffentlichung (#230). Erste Linie: Türschilder Acryl 3 mm mit den echten Corel-Designs.
  - Kleinformate 5×2/6×2/8×2 sind eigene Produkte mit eigenen Motiven.
  - „Schnellstraße“ für die Produktanlage.
  - Aufbewahrung: Fotos und Fertigungsdateien 45 Tage nach Versand, Bestellstand 2 Jahre.
  - Paket 1a (Konfi-Start beschleunigen), Vorgaben für die Produktseite.
  - Neues Shop-Design an Claude übergeben.
- **11.–12.11.:** neue Laufzeit-Kandidaten auf Plesk. Türschild-Designs (1.298) und schnelle Designliste gemergt (#233).
- **13.11.:**
  - Werkstatt-Dashboard mit Produktlinien-Baum und Reitern.
  - Chris' Konfi-Befunde aus Video und Testerliste aufgenommen.
- **14.11. ~02:56:** Konfi-Befunde live (`kandidat-68334981-20261113`):
  - Designwechsel ordnet Texte und Namen richtig zu.
  - Foto ohne Fotofunktion: Hinweis „Achtung, das Produkt hat keine Fotofunktion“.
  - Text 2 mm vom Rand, auch rund und oval.
  - Formwechsel behält eine vergleichbare Größe.
  - Menge nur 1–99 ganzzahlig.
  - Pflichtfeld Name wird geprüft.
  - Kleine Vorschau größer, Vergrößern-Knopf rechts daneben.
  - Diskette und Warenkorb-Knopf bleiben, wie sie sind.
- **15.11.:**
  - Warenkorb-Fehler am PC: Zwei alte Testpositionen haben jede Warenkorbänderung blockiert. Akut behoben, Testzeilen nach Freigabe entfernt.
  - Speicherhinweis statt Countdown, auch im Warenkorb.
- **16.11. (Nacht):** Preisfunktion „Einzelsperre“ live, siehe Abschnitt 5.
- **16.11. (früh):** Gesamtprüfung durch Codex abgeschlossen (#239). Amazon-Test aus dem Konfi angestoßen (eigener Chat).

---

## 5. Was heute live ist

### Shopify-App „Gravuru Konfigurator“
- **Aktive Version:** `gravuru-2027-preis-einzelsperre-20261116-b1` (1223825227777), 9 Module.
- **Preisfunktion:** Eine ungültige oder veraltete Position sperrt nur sich selbst. Der Rest des Warenkorbs wird normal bepreist. Grundlage ist exakt der Stand vom 08.11., die V3-Zubehörlogik ist nicht enthalten.
- **Kassen-Prüfung** `gravuru-checkout-guard` mit Checkout-Regel 218759548 (aktiv, Sperre bei App-Problem an). Eine Position ohne gültigen Konfi-Preis wird an der Kasse mit Hinweis blockiert: „… Diese Gestaltung ist nicht mehr bestellbar. Bitte aus dem Warenkorb entfernen und im Konfigurator neu gestalten.“
- **Getestet am 16.11.:** Hinzufügen klappt, die Kasse sperrt nur die Testposition. Nach dem Entfernen läuft die Kasse normal (56,35 €). Alle Funktionsläufe OK.
- **Grenze:** bis 14 verschiedene Gestaltungen pro Warenkorb, bisher 15. Die Menge pro Position spielt keine Rolle.
- **Rückweg:** Version A (1223817953281) oder 1199363391489 wieder freigeben.

### Konfi und Werkstatt (Plesk)
- Laufzeit `kandidat-a4616943-20261116` = `main` a4616943 (seit 16.11.). Enthält die Konfi-Befunde vom 13.11. und F01: Eine im Warenkorb geänderte Menge wird nur mit passendem Staffelpreis angenommen.
- Rückweg: `umschalten-f01.cjs --zurueck` → `kandidat-68334981-20261113`. Davor lag `kandidat-4572957-20261113`.

### Produkte
- **Korrektur:** Die 09:00-Fassung behauptete, alle Produkte stünden auf Entwurf. Das stimmte nicht. Morgens waren **1.196 Produkte aktiv**: 1.109 alte (angelegt vor dem 01.10.2026) und 87 neue gravuru-2027-Produkte.
- **16.11., ca. 10:45:** Die 1.109 alten Produkte wurden auf **Entwurf** gesetzt. Das war Chris' Entscheidung vom 10.11., die Sicherung liegt laut Chris vor. Gelöscht wurde nichts.
- Aktiv bleiben nur die **87 neuen Produkte**.
- Mengenrabatte: ab 3 Stück 5 %, ab 5 Stück 10 %, ab 10 Stück 15 %.
- Aufpreise wie in Chris' Excel (z. B. Motiv 1,69 €, Logo 12,99 €).

---

## 6. Wichtige Entscheidungen von Chris (Kurzfassung)

**Konfi**
- Ein Konfi für alle Produkte. Kein neuer Konfi je Produkt.
- Kundenfotos immer annehmen. Auflösung nur als Hinweis, nie als Sperre.
- Überlagerung ist erlaubt (nur Hinweis). Freistellen kostenlos, mit Wahl „nicht freistellen“.
- Bohrlöcher:
  - Motive und Texte dürfen darüber, kein Kundenhinweis.
  - Die Produktionsdatei bleibt vollständig, nur die Vorschau zeigt das Loch.
  - Rund 80 % der Produkte starten „ohne Befestigung“.
- Text mindestens 2 mm vom Schildrand (13.11.).
- Designwechsel: Ein Foto kommt mit, wenn das Produkt Fotos kann. Sonst wird es gelöscht, mit Hinweis.
- Warenkorb-Knopf unten rechts bleibt. Die Diskette bleibt.
- Speicherhinweis ohne Timer, auch im Warenkorb.
- Am Kunden-Konfi keine unbesprochenen Änderungen, weder optisch noch an der Bedienung.

**Gestaltung (Design-Master)**
- Katalog-Vorlage 1:1 übernehmen, wenn sie zur Größe passt. Sonst dient sie als starke Referenz.
- 1–3 Schriften je Design. Das Motiv geht nie verloren, bei Platzmangel weicht der Text.
- Kein Schild ohne Text. Unter 9×6 keine filigranen Motive.
- Der optische Gesamteindruck zählt. Bewusste Asymmetrie ist gewollt.

**Preise und Produkte**
- Für Preise und Lochabstände zählt nur die Preis-Excel im Katalog.
- Edelstahl- und Acryl-Türschilder 3 mm sind identisch (Formen, Größen, Designs).
- 5×2, 6×2 und 8×2 sind eigene Produkte mit eigenen Motiven.
- Fotogravur nur auf Acryl. 1. Foto bei Fotofeld gratis, jedes weitere 9,99 €.
- Hausnummern AA/AS/S/S nur in den Größen aus der Acryl-Excel. S/S kostet AA/AS-Preis + 2 €.

**Prozess**
- Produktkette Entwurf → Strecke → Freigabe → Veröffentlichung. Freigaben gehen auch im Chat.
- Neue Produktart: zuerst ein Pilotprodukt bis in den Warenkorb, dann die Serie.
- Fachlogik vor dem Bau gegen Chris' Entscheidungen prüfen. Nichts einbauen, was er nicht gesagt hat.
- Nichts löschen ohne Ankündigung. Jeder Befund kommt mit Screenshot.

---

## 7. Ergebnis der Gesamtprüfung (Codex, #239)

> Diese Befunde hat Codex gemeldet. Claude hat sie am 16.11. an der Quelle geprüft: F01, F02, F04 und F14 bestätigt, F03 im Code plausibel.
> **Erledigt:** F01 (live), F05 (Messung im Repo), F06 (FPD deinstalliert), F11 (Live-Stände in `main`).

| Nr. | Einstufung | Befund |
|---|---|---|
| F01 | **Kritisch** | Menge 4 kommt an der Kasse an, das Angebot steht aber auf 1. |
| F02 | **Kritisch** | Preis und Extras sind vor der Zahlung nicht fest an den tatsächlichen Entwurf gebunden. |
| F03 | Wichtig | „Bearbeiten“ scheitert beim gerade gespeicherten Entwurf. |
| F04 | Wichtig | Ein abgelaufenes Angebot wird erst nach der Zahlung erkannt. |
| F05 | Wichtig | Ein Laufzeitabbruch (sehr große Warenkörbe) kann die Kasse sperren. |
| F06 | Wichtig | Die FPD-Regel `copy-line-item-from-bundles` meldet Funktionsfehler. |
| F07 | Wichtig | Originalquellen für Preise und Bohrungen sind teilweise nicht verknüpft. |
| F08 | Wichtig | 7 Testfehler, 11 übersprungen. Ein allgemeiner Release-Check fehlt. |
| F09 | Wichtig | Wiederherstellung aus der Sicherung ist nicht erprobt. |
| F10 | Wichtig | Ein Testauftrag bis zur Fertigungsdatei fehlt. |
| F11 | Wichtig | Dokumentation und Betriebsstand weichen ab, es fehlt ein Betriebsmanifest. |
| F12 | Kleinigkeit | Testnavigation und interne Entwurfskennung sind öffentlich sichtbar. |
| F13 | Kleinigkeit | Linea-Eintrag hat 0,00 € und keinen Shop-Link. |
| F14 | Wichtig | Ohne beide Erkennungssignale wird eine Position übersprungen. |
| P01 | Wichtig | Klingelschild-Textur 1,44 MB, erst nach 18,9 s geladen. |
| P02 | Wichtig | Kernpaket 503 kB, doppelte Schrift- und Katalogabrufe beim Start. |
| P03 | Wichtig | Galeriekarten rund 303 kB, Designwechsel 3,98 s. |
| P04 | Wichtig | Serverantwort schwankt 0,21–2,54 s. |

Codex schlägt diese Reihenfolge vor:
1. Warenkorb und Entwurf zusammenführen (F01, F03)
2. Vor der Zahlung absichern (F02, F04, F14)
3. Kasse unter Last prüfen (F05, F06)
4. Kaltstart verbessern (P01, P02)
5. Designwechsel und Ausreißer verbessern (P03, P04)
6. Quellen und Release-Check schließen (F07, F08, F11)
7. Wiederherstellung und Fertigung abnehmen (F09, F10)
8. Shopdetails (F12, F13)

Bericht, Screenshots und Messdaten: `docs/reviews/2026-11-16-issue-239/` im Repo.

---

## 8. Offene Punkte (Stand 16.11., 11:00)

**Vor dem Go-live**
1. **F02/F04/F14** (Claude): Preis, Extras, Menge, Variante und Ablauf werden vor der Zahlung gebunden.
2. **Testbestellung F01 1 → 4** (Astra).
3. **F03** (Astra): „Bearbeiten“ in neuem Tab und am Handy.
4. **Acryl „Form und Größe selbst wählen“** (Astra): Für 8×8 und rund kommt der Fehler 409.
5. **Chris' Handy-Test**, ganz am Ende.
6. **Go-live-Reihenfolge:** welche Linien zuerst, Bilder und Texte prüfen.

**Aufräumen**
7. Offene PRs #210–#237: Astra listet je PR „live / überholt / nötig“ auf, Claude schließt danach.
8. Issues #229, #230 und #233 auf den echten Stand bringen.

**Nach dem Go-live**
- Ladezeiten (P01–P04), F07–F10, F12, F13. Für jede künftige Preisfunktions-Version gilt: Sie muss `gravuru-checkout-guard` enthalten.
- Eigene Projekte: neues Shop-Design und Produktseite (#236), Produkt-Agent (#238), Produktkette (#230), QR-Seiten (#234, #235), Amazon-Custom-Test, weitere Linien (Grabkreuze, Boxenschilder, Hausnummern, Gedenkartikel Acryl), Corel nach Drive, Werkstatt-Dashboard.

---

## 9. Aufgabenteilung

Steht in #239 (Kommentar vom 16.11.): Claude macht Punkte 1 und 8 sowie den Abschluss von 7. Astra macht 2, 3, 4, die Liste zu 7 und das Review von 1.
