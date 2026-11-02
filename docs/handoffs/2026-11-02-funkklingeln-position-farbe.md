# Funkklingeln: Farbe neben Position · 02.11.2026 · Codex

Quelle vor Umsetzung: Chris im Funkklingel-Chat am 02.11.2026: Farbauswahl neben die Position der Klingel, damit die Befestigung nach oben rückt und alles sichtbar wird; Konfi um 6 % kleiner. Präzisiert: ausschließlich Funkklingeln. Darstellung als 94 % der bisherigen automatisch eingepassten Schildvorschau; echte Millimetermaße bleiben gleich. Vorhandene Master-Funktionen erhalten, insbesondere stabile Vorschau bei Textauswahl und verschiebbare Gestaltung auf Acryl. Bestehende Live-Freigabe für diesen Funkklingel-Ablauf liegt im Chat vor.

Eigener Branch `dev/funkklingeln-position-farbe-20261102-astra` auf main `06987af88ca0ff0e78f708873f6f36569ddbfebf`. Nur Funkklingel-Darstellung und zugehöriger bestehender Test; keine Änderung von Produktdaten, Designrechten, Preisen, Shop-Bindungen, Geometrie oder allgemeinen Master-Modulen. Keine Designänderung; [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich.

Geplante Anordnung: Format; Position und runde Farben nebeneinander; Edelstahlrahmen; Befestigung. Bei großem Desktop drei Befestigungen pro Reihe, bei schmalem Bildschirm zwei. Unter 380 px werden Position und Farbe zugunsten bedienbarer Felder untereinander angeordnet.

Lokale Abnahme unten; Linux- und Live-Nachweis werden nach tatsächlicher Durchführung ergänzt.

## Lokale Abnahme

Die Reihenfolge ist Format; Position und runde Acrylfarben nebeneinander; Edelstahlrahmen; Befestigung. Große Desktop-Formatkacheln zeigen die Silhouette neben Bezeichnung, Größe und Preis. Fünf Befestigungen passen in zwei Reihen. Unter 380 px stehen Position und Farbe untereinander, damit die Auswahl bedienbar bleibt.

Die native Schildvorschau verwendet 94 % der bisherigen Einpassung (Breite und Höhe). Kein zusätzlicher Transform, keine Änderung der Millimetermaße, Zoom-, Zieh- oder Produktionslogik. Der vorhandene feste Vorschau-/Werkzeugbereich bleibt erhalten.

- 14/14 bestehende gezielte Tests bestanden: `node --test app/configurator/variant-m/doorbell-presentation.test.mjs app/configurator/variant-m/doorbell-master-repair.test.mjs app/configurator/variant-m/doorbell-state.test.mjs`.
- Build: `node app/configurator/variant-m/build.mjs`, 76 Quellen geprüft; Paket `editor-ce0aec5019eba7f2.mjs`, 1.374.805 Bytes, gzip 466.176 Bytes. Lokaler Build auf aktuellem main; Serverpaket wird auf der tatsächlich aktiven Laufzeit separat gebaut.
- Chrome 1920×855: alle drei Formate gewechselt, Maße 160×280 / 240×200 / 350×180 mm korrekt. Position und Farbe auf gleicher Höhe; alle fünf Befestigungen oberhalb der Preisleiste sichtbar. 35×18 + Silikon: 74,98 EUR; Gegenposition und Anthrazit auswählbar.
- Wechsel zum Text und Auswahl von 12a: Vorschau unverändert (x 72,625; y 179; 959,328×493,375 px). Bestehende Rechte-, Format- und Kundentext-Tests grün; keine Master-Funktion neu implementiert.
- Chrome 390×844: Position und Farbe nebeneinander, Farbwahl bedienbar, kein horizontaler Überlauf (390/390 px). Weitere Ausführungen bleiben mobil scrollbar. Temporäre Bildschirmgrößen danach zurückgesetzt.
- Keine Warnungen/Fehler im lokalen Browserprotokoll. Kein neuer Warenkorb-/Bestelltest für diese Darstellungsänderung.

Bilder: [Desktop](assets/2026-11-02-position-farbe/desktop.jpg), [Handy](assets/2026-11-02-position-farbe/mobile.jpg), [Messwerte](assets/2026-11-02-position-farbe/browser-checks.json).

Die lokale Vorschau nutzt eine private Modellkopie vom 29.10. mit der vorhandenen Designrechte-Reparatur. Sie ist kein aktueller Live-Datenbankabzug. Der Screenshot belegt die lokale Bedienprüfung, noch keine Veröffentlichung.

## Kontrollierte Veröffentlichung

Nur `doorbell-presentation.mjs` als Laufzeitänderung und der angepasste bestehende Test werden in eine Kopie der aktuell aktiven Serverlaufzeit übertragen. Vorher: aktiven Einstieg, Wrapper und Modul-SHAs frisch lesen; bei Abweichung stoppen und vorhandene Änderungen integrieren. Danach Linux-Tests, Build und Vergleich aller übrigen Dateien. Einstieg sichern, atomar auf geprüfte Kopie umschalten, bestehende Plesk-Node-App neu starten. Öffentliche Bundle-Prüfsumme und normaler Shopify-Einstieg anschließend prüfen. Keine Katalog-, Shopify-, Bindungs- oder Datenbankmutation.

Rückweg: gesicherte `app.cjs.before` im privaten Nachweisordner am bestehenden Einstieg wiederherstellen und dieselbe Node-App neu starten. Veröffentlichung und Linux-Nachweis noch offen; bestehende Freigabe gilt, Plesk-Sitzung inzwischen angemeldet.

## Linux-Abnahme und Umschaltung

Aktiver Ausgang am 02.11.: `private/funkklingeln-stabile-bedienleiste-20261101`. Startup-SHA `fc3858ca56137384bd159d7718e6a5a82276846400c5cff3221f795d4cf62c65`, Wrapper-SHA `42cd0a64f2e8e2a48761aefac2c0323990dbfe667517c88497eb03ca243852dd`. Darstellungsmodul und Test stimmen mit dem erwarteten Ausgang überein.

- Kopie `private/funkklingeln-position-farbe-20261102`, Sicherungen/Nachweise im gleichnamigen Ordner mit Suffix `-nachweis`.
- 14/14 Tests auf dieser Serverkopie unter Node 24.22.2 bestanden, 0 Fehler, 0 Skip; Build erfolgreich.
- 3.274 Dateien verglichen: 3.272 unverändert; genau Darstellungsmodul und sein Test geändert. Vor Umschaltung sämtliche gespeicherten Ausgangs-/Zielprüfsummen erneut geprüft. Wrapper unverändert.
- [PR #140](https://github.com/Chris83638w/gravuru-2027/pull/140), Quelle `a9e1e2950a3c57571cffdcd65b003d7ee562c37f`, Merge `6ab0cd72508c6433c67f69e8f11ef9f601a34d83`.
- Einstieg atomar umgeschaltet: neue Startup-SHA `6227ba39cf89f86dedfe1dcacfc25ce1a5e778b4fa718394b7c6f8510a1cc154`.
- Server-Bundle `editor-94c6fa2a6eb4c544.mjs`, öffentliche Darstellung 1.331.706 Bytes, erwarteter SHA `4e294fad6fba05b73b6c932b8b7485a78fcc651883b66810e35a46154e4b010f`.

Servernachweise: `linux-tests.log`, `build.log`, `file-checks.json`, `manifest.json`, `switch.json`, `app.cjs.before`, `start-r5.cjs.before`. Nur einmalige Plesk-Ausführung; Formular anschließend abgebrochen, kein Zeitplan gespeichert. Neustart und tatsächliche öffentliche Abnahme werden nach Durchführung ergänzt.

## Öffentliche Live-Abnahme

Die bestehende Plesk-App wurde über „App neu starten“ neu gestartet. Öffentlicher Editor und Paket liefern HTTP 200; HTML verweist auf das neue Paket, dessen SHA exakt dem Linux-Build entspricht ([HTTP-Nachweis](assets/2026-11-02-position-farbe/live-http.json)).

Echter Chrome-Kundenweg: AOSU-Produktseite → „Jetzt personalisieren“. Beim ersten Aufruf nach dem Wechsel erschien wieder der bekannte Ladehinweis; der angebotene „Neu laden“-Button öffnete den Editor erfolgreich. Kein Eingriff in Authentifizierungs- oder Sicherheitsregeln. Der gespeicherte Entwurf wurde wiederhergestellt; Texte, Design, Optionen und Warenkorb dabei nicht verändert.

Live 1920×855: Farbe und Klingelposition auf gleicher Höhe (y=321,188 px), alle fünf Befestigungen bis y=783,453 px sichtbar. Neues 94-%-CSS im gerenderten Editor bestätigt; Schild 959,328×493,375 px bei echten 350×180 mm. Bei Auswahl von Text 12a bleiben Breite, Höhe und x identisch; y=180 →179 px ist die bereits bekannte 1-px-Dokumentrandbewegung. Preis 74,98 EUR für 35×18 mit Silikon. [Live-Bild](assets/2026-11-02-position-farbe/live-desktop.jpg), [Live-Messwerte](assets/2026-11-02-position-farbe/live-browser-checks.json). Mobile Bedienprüfung lokal (oben), kein zusätzlicher Live-Handy-/Warenkorb-/Bestelltest behauptet.

Die Änderung ist veröffentlicht. Rückweg bleibt `private/funkklingeln-position-farbe-20261102-nachweis/app.cjs.before` am bestehenden Einstieg plus Neustart derselben Plesk-App; er führt zur vorherigen stabilen Funkklingel-Bedienleiste zurück. Keine weitere Änderung an Shopify, Katalog, Bindungen oder Datenbank.
