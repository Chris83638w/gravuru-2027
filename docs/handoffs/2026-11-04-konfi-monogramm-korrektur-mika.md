# Monogramm: aktiver Konfi, Produktkorrekturen und Motivpreis

Stand 04.11.2026, Codex/Mika, eigener Branch `dev/mika-schiefer-upload-20261104`, PR #174. Dieser Stand ersetzt die offenen Import-/Bindungsangaben in der älteren Importübergabe; deren Abschnitte bleiben historische Nachweise.

## Auftrag und Quellen

Mikail hat in diesem Chat die Umsetzung ausdrücklich beauftragt: „kontrolliere den neuesten stand vom Konfi, übernehme alles …“. Seine vorherigen konkreten Korrekturen gelten:

- Designs sofort sichtbar; mit dem Design des Hauptproduktbildes starten.
- Je Bohrlochoption ein Rechteckbild; doppelte Quadratbilder und Bildunterschriften entfernen.
- „12 mm breit“ nicht in der Konfi-Auswahl anzeigen.
- Acrylständer ausschließlich für Gedenktafeln, ausgenommen 60×30 cm; bei Monogrammen entfernen.
- Foto ausschließlich im Foto-Reiter, nicht nochmals unter Ausführung.
- „Jedes Motiv was hinzugefügt wird, kostet 1,69 €“: zusätzliche Kundenmotive jeweils 169 Cent; das vorhandene Vorlagendesign bleibt im Grundpreis.

Oberflächenreferenz: [#48](https://github.com/Chris83638w/gravuru-2027/issues/48), [#161/db4f4a4](https://github.com/Chris83638w/gravuru-2027/tree/db4f4a4efdd411e8d28aec2d126e488a1b9b0c48/prototypes/produktprofile). Die native Funktionsbasis bleibt `app/configurator/variant-m`; der React-Prototyp wird nicht als Kundeneditor eingebaut. Grundplatten, Variantenpreise, Geometrie und alle 82 Originaldesigns stammen unverändert aus der bestehenden Katalogvorbereitung. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt weiterhin; hier wurden keine Designs neu gestaltet oder freigegeben.

## Tatsächlich ausgeführt

Aktiver Händlerhost: `https://app-2027.gravuru-designwerkstatt.de`. Die vorherige Laufzeit wurde kopiert, alle betroffenen Quelldateien vor und nach dem Patch per SHA-256 geprüft, vorhandene Hostanpassungen erhalten. Nach 64 erfolgreichen Servertests und Build wurde die Startdatei auf `private/mika-konfi-korrektur-20261104` umgestellt und die App über Plesk neu gestartet. Alte Laufzeit und Startdateisicherung bleiben erhalten.

Aktive Startdatei SHA-256: `fecfd7b0e663be3cd2c9b0270970a0b21b1f6169cd501976810784fafd70825a`. Ausgeliefertes Bundle: `/_acryl-bundle/editor-8efba92051cf4870.mjs`, HTTP 200; SHA-256 `597f062de83389eb5b2b8094374c9341852402e1afb3a3ebd6ff2256eb921d64`. Moderne CSS-Datei ebenfalls HTTP 200, SHA-256 `ec960f57a40a6d58b2722455d30e4fd40d9d189022b01134d7b739c1ce5bbbbc`.

Der native Monogramm-Import ist erfolgt: `cfg_65b85f16-c796-4476-9bdf-611e7c11997b`, jetzt Revision **3**, **82 Originaldesigns / 15 Varianten**. Startdesign `katalog-MG-S-22x14-D1` und Hauptbild unverändert. Einziger verbleibender Zubehör-Zusatz im Monogrammdokument ist Silikon. 1.039 andere native Produkte wurden anhand ID, Revision und Archivstatus unverändert bestätigt; keine zweite Monogrammanlage.

[Shopify-Produkt 16192353829244](https://admin.shopify.com/store/gravuru-design/products/16192353829244) bleibt **DRAFT**. Alle 15 vorhandenen Varianten sind an Revision 3 gebunden. Der Preisvertrag im Metafeld der bereits zuständigen App (`$app:personalization`, Schema `gravuru-personalization-pricing/v1`) enthält 169 Cent je zusätzlichem Motiv und wurde vollständig zurückgelesen. Vorhandene Cart-Transform-Funktion und Berechtigungen wurden weiterverwendet. Keine Produktveröffentlichung oder neue Produktionsfreigabe.

Revision 2 enthielt bereits die korrigierten Produktregeln. Weil vorhandene Bindungsverträge unveränderlich sind, wurde für den vollständigen Preisvertrag Revision 3 mit identischem Produktdokument angehängt. Der erste Bindungslauf lief in die vorhandene 60-Sekunden-Frischeprüfung; seine Bindungstransaktion wurde zurückgerollt. Die Wiederaufnahme führte fünf Blöcke mit je drei frisch geprüften Varianten erfolgreich aus. Der Frische-Schutz wurde nicht verändert.

## Implementierung

`slate-customer-rules.mjs` wendet die belegten Zubehör-/Motivregeln auf native Schiefergruppen an. `slate-catalog-product.mjs` setzt den Motivpreis für neue Schieferdokumente. `slate-accessory-media.mjs` reduziert Bohrlochbilder und bereinigt die Beschriftung; `memorial-execution.mjs` entfernt den doppelten Fotoabschnitt. Shopify-Variantenkennungen und gespeicherte Optionsbezeichnungen bleiben stabil; die verkürzte Beschriftung betrifft die Konfi-Anzeige.

`modern-layout.css`, `toolbar-hosts.mjs` und `ux.mjs` übertragen weißen Kopf, Werkzeugposition, helle Kacheln und blaugrauen Abschluss in den nativen Editor. Die Produktdesigngalerie wird direkt im Designs-Reiter geladen; verfügbare Designs bestimmen den Startreiter. Die thematische Motivauswahl aus #161 bleibt bei ausdrücklich festgelegter Werkstattauswahl erhalten, ansonsten passende Themen; „Mehr anzeigen“ ergänzt jeweils 18 Motive. Alle bisherigen Editoraktionen bleiben an ihren nativen Elementen.

Der zuvor korrigierte Shop-Einstieg ist ebenfalls im Commit: Shopify-Vorschauhosts öffnen direkt statt im fremden iframe; das Editorfenster erhält während des Ladens seine tatsächlichen Abmessungen unter einer Ladekarte.

## Prüfungen und Grenzen

64/64 gezielte Tests auf dem Server, 0 Fehler/Skips; zusätzlich lokale gezielte Läufe und Build erfolgreich. Geprüft sind insbesondere Motivzuschläge einschließlich Menge und Preisvertrag, Ständergrenzen auch im Hochformat, Zubehörbilder, Gruppenfilter, Toolbar-Eltern und Motivthemen. [Server-, Preis- und HTTP-Nachweis](2026-11-04-konfi-monogramm-korrektur-mika/verification.json).

**Die Sichtabnahme des neuen Starts ist noch offen.** Die Browsersteuerung hält die neue iframe-Dokumentantwort im Ladezustand an; der Editorinhalt bleibt dabei leer. Die bereits vorher manuell geöffnete Sitzung zeigt weiterhin den alten Stand. Daraus wird kein bestandener UI-Test und keine erfolgreiche Warenkorb-/Checkoutstrecke abgeleitet. Die neue HTML-/Bundle-/CSS-Auslieferung ist unabhängig davon mit HTTP 200 belegt.

**Kein realer Checkout geprüft.** Das Produkt ist weiterhin Entwurf und die Produktionszuordnung noch ausstehend. Der bestehende Personalisierungsvertrag deckt die Motivzuschläge; zusätzliche Optionsfelder wie Silikon (`fieldCents`) sind in der bestehenden Cart-Transform-Strecke nicht als unterstützt abgenommen. Kein unberechnetes Zubehör und keine Veröffentlichung als Umweg.

Dies ist der Monogramm-Pilot, kein Nachweis, dass sämtliche 48 Tafeln samt allen Zielgruppen bereits importiert oder kaufbar sind. Hunde-Altvarianten und dessen Fotoquellfehler bleiben separat in der älteren Übergabe dokumentiert.

## Abstimmung und nächster Schritt

Ankündigung [#48/6633453674](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6633453674), unmittelbarer Abgleich des bereits aktiven Standes mit Astras parallelem UI-Auftrag [#48/6634126176](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6634126176). Astra arbeitet inzwischen auf `dev/konfi-shop-modern-20261104-astra`. Bis zum Abgleich keine weiteren parallelen Änderungen am gemeinsamen UI-Rahmen. Vor einem neuen Laufzeitwechsel die aktive Startdatei frisch lesen und diese Änderungen bewahren.

Nächster Schritt ist die sichtbare Endprüfung einer frisch gestarteten Revision-3-Sitzung, einschließlich Desktop/Handy, sofortiger Galerie, Zubehör und ein/zwei zusätzlichen Motiven (21,99 → 23,68 → 25,37 €). Erst nach dieser Abnahme den gemeinsamen UI-Stand als vollständig geprüft melden; Produkt-/Produktionsfreigaben bleiben davon getrennt.

Rückweg: Vor jedem Wechsel neuen Iststand prüfen. Alte Codewurzel `private/mika-schiefer-runtime-20261104` und `private/mika-schiefer-import-20261104/correction-app.cjs.before` sind erhalten. Datenbanken nicht global zurückspielen, da andere Chats weiterarbeiten; bei fachlichem Rückweg neue Produktrevisionen und Bindungen anlegen. Sicherungen, vollständige Produktpakete und Zugangsdaten bleiben außerhalb Git.
