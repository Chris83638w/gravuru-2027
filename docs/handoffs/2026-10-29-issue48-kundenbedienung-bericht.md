# Issue #48 – Teil D: Kundenbedienung

Stand: 29.10.2026, Codex/Astra. Entwurf auf `dev/konfi-bedienung-issue48-d-20261029-astra`, Basis Teil C `67dc7c5` / PR #54. Kein Merge, keine Bereitstellung, keine Shopify-/Katalog-/Live-Datenänderung. Auftrag: [Nachrichten 6–11](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6497400984); bei Widerspruch gilt die jüngste Entscheidung, insbesondere Nachricht 10. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt weiter.

## Umsetzung

| Punkt | Änderung und Grenze |
| --- | --- |
| D1 | Produktwechsel überträgt gewählte Optionen und Menge vor dem Einblenden des neuen Editors; unbekannte Optionen brechen ab und erhalten den alten Editor samt Foto. Aktives Design wird nicht neu geladen. Übernommene Gestaltung startet im Design-Schritt. Preisberechnung bleibt im bestehenden Vertrag. |
| D2 | Feldkennung und Beschriftung zusätzlicher Texte bleiben beim Tippen stabil. Der Inhalt verändert die Feldstruktur nicht mehr. |
| D7 | Schriftoptionen werden ausdrücklich unter der jeweiligen Zeile geöffnet. Kein Schließen beim Fokusverlust: Auf iOS kann der Fokuswechsel sonst den Knopf vor dem Klick entfernen. Schriftleiste über der Platte bleibt erhalten. |
| D3 | Autokorrektur und Rechtschreibprüfung aus; Wörter groß beginnen, bei Adresse/Spruch Satzanfang. |
| D4 | Freie Platzierung berücksichtigt die tatsächliche Kontur einschließlich Rundungen. Standard-Motivwahl ersetzt ein freigegebenes gewähltes/Vorlagenmotiv; Hinzufügen ausdrücklich, Kein Motiv prüft Löschrechte. Vor Weiter/Abschluss Randprüfung, bei Gravur zusätzlich Überlagerungsprüfung. Unveränderte bewusste Überlagerungen der Vorlage bleiben zulässig. Automatisch einpassen verschiebt bevorzugt Text; vorhandene Motive bleiben möglichst stehen. Vorlagendrehung beginnt ausgeschaltet und ist ausdrücklich einschaltbar. |
| D4 Bohrloch | Keine Kundensperre/kein Hinweis wegen Bohrungen. Physische Geometrie bleibt exakt. Kundenvorschau zeigt Loch/Beschlag; native Produktions-SVG/PDF und Weißdaten bleiben über dem zukünftigen Loch vollständig. Schnittkontur enthält die Bohrungen unverändert. Druck-/Gravurrezeptversionen erhöhen sich auf v7/v4, damit alte Ausgaben nicht aus dem Cache kommen. |
| D5 | Texte in der Warenkorb-Eigenschaft und Übersicht mit festen Feldnamen in Lesereihenfolge. Unabhängige Bild-/Medienvorbereitung läuft parallel; unveränderliche Speicherung und Preis-/Warenkorbprüfung bleiben erhalten. Ein Fortschritt 1/3 bis 3/3. Bestehende Bildvergrößerung im Theme bleibt. Bestätigungsbaustein erhält Bitte prüfe die Schreibweise. Danke-Seiten-Baustein unter ops/shopify/thank-you-preview vorbereitet, noch nicht in Shopify installiert. |
| D6 | Weiter hat Ladezustand mit Spinner/Lädt… und verhindert Doppelklicks. Bestehende Schrittflächen mindestens 48 px; direkte Schrittauswahl bleibt. |

Es werden keine Preise oder Lochabstände geändert. Die Preis-Excel aus Nachricht 7 bleibt verbindlich. Mechanische Regeln sind nur als spätere Erweiterung vorgesehen; keine geschätzte 8-mm-Sperrzone.

## Nachweise

- Neue gezielte Tests: alle Befestigungen der nativen Fixture mit Menge, Übersicht und identischem Preis; Wechsel mit tatsächlichem Koordinator einschließlich Abbruch/Fotoerhalt; stabile Texteingabe; Motiv-Array und gesicherte Rechte im echten UI-Handler; Rand/Überlagerung nach Verfahren und Oberfläche; Drehfreigabe; parallele Bildvorbereitung einschließlich Fehlerweitergabe.
- Exporttest: PDF physisch 20 × 15 mm, Druckfarbe innerhalb/außerhalb des Lochs gleich, Weiß dort vollständig, Schnittpfade exakt gleich. Gesicherte native Gestaltung durch tatsächliche SVG-Erstellung und Gravurworker: Raster- und Vektor-PDF behalten die Farbe im Loch; keine PDF-Schriften, Vektormodus ohne Rasterbilder.
- Windows-Zwischenvollauf: 1830 Tests, 1816 bestanden, 9 Fehler, 5 übersprungen. Acht Fehler waren ausdrücklich geänderte Loch-/Rezeptregeln, ein ECONNRESET im Webhooktest (isoliert bestanden). Erwartungen an der neuen Entscheidung ausgerichtet; Rand- und Manipulationsschutz bleiben geprüft.
- Abschließender Windows-Vollauf: läuft; Zähler werden vor Übergabe ergänzt.
- 27/27 gezielte UI-/Wechseltests nach abschließender Korrektur grün.
- Sichtprüfung lokal mit originalem D8-Produktstand: Chromium Desktop 1440 × 1000, iPhone-13-Größe 390 × 664, SE-Größe 375 × 548. Durchgehendes Feld Familie Müller behält Fokus und Kennung (ein Werkzeug-Timeout nach Familie, danach im selben Feld fortgesetzt); Schriftoptionen → Dialog → Cinzel → nur diesen Text übernommen. Randprüfung blockiert Weiter; Automatisch einpassen löst den Konflikt. Vorlage ohne Drehgriff, nach ausdrücklicher Freigabe mit Drehgriff. Preis 22,68 € bleibt.
- Bilder: [Desktop](issue48-d-20261029/desktop-schriftoptionen.png), [390 × 664 Schrift](issue48-d-20261029/iphone13-schriftdialog.png), [390 × 664 Motive](issue48-d-20261029/iphone13-motivauswahl.png), [375 × 548 Optionen](issue48-d-20261029/se-01-schriftoptionen.png), [Dialog](issue48-d-20261029/se-02-schrift-dialog.png), [übernommen](issue48-d-20261029/se-03-schrift-uebernommen.png), [Randprüfung](issue48-d-20261029/se-04-randpruefung.png). Die Screenshots zeigen den tatsächlichen lokalen Konfi, keine gebauten Bildattrappen.

## Vor Freigabe offen

1. **Safari/WebKit:** hier nicht verfügbar. Chromium in Handygröße beweist weder iOS-Tastatur noch Safari. Nachricht 11 bleibt ein echtes Abnahmekriterium: Feld → Optionen → Dialog → Auswahl → Übernahme; zusätzlich Familie Müller ohne Tastaturverlust.
2. **Neue Produktrevision:** Der eingefrorene D8-Stand hat für sein Motiv replace:false/delete:false. Die Bedienung umgeht diese Rechte nicht. Der Konverter setzt die neuen Rechte für künftig erzeugte, bewegliche Vorlagenmotive. Für D8 muss der Operator eine neue Produktrevision vorbereiten; Originalbestellungen bleiben unverändert. [Quellbefund und Rückfrage](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6498178394).
3. **Danke-Seite/Bestätigung:** vorbereitete Quellen, Modell-/Liquid-Prüfung lokal; TypeScript-Prüfung gegen offizielle @shopify/ui-extensions 2025.10.16 und esbuild-Bundle bestanden; keine echte versendete E-Mail, keine aktivierte Danke-Erweiterung. In bestehendes gravuru-shopify-App-Projekt übernehmen, bauen und in Shopify-Vorschau prüfen. Keine neue App oder zweite Cart-Transform-Funktion anlegen.
4. **Warenkorb unter 3 s:** Parallelisierung umgesetzt; keine belastbare Messung der echten Shopify-Strecke ohne Bereitstellung. Ziel nicht als erreicht ausgegeben. Später alle Befestigungen mit Gestaltung, Foto/Motiv, Menge und Rücklesen des Warenkorbs messen.
5. Finaler Linux-Lauf und Abnahme der PR-Abhängigkeit C. Kein Verkaufsstart/Live ohne Chris' ausdrücklichen Satz.

Nächster Schritt: Claude prüft diesen Entwurf und die gesondert genannten Abnahmegrenzen. Teil E folgt ausschließlich als Vorschlag; Schriftwahl und Werkzeugleiste nicht eigenmächtig reduzieren.
