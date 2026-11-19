# Schriftgruppen aus Chris’ Auswahl – Vorschlag, nicht aktiviert

Stand: 18.11.2026, Astra (Codex), Ausgangscode `3ba476d`, Katalog `8236b8b`.

Chris: „ich habe die liste aktualisiert. es sind jetzt 66. Wir können die aber noch gruppieren, sprich für Andenken andere nutzen wie für Geschenke oder Schilder. Dass jede Gruppe nachher ca. 25 hat.“

Die gespeicherte Auswahl im [Claude-Artefakt](https://claude.ai/code/artifact/7111895a-3a62-4004-83a5-aa60a57048b1) zeigt 66 bleiben / 27 raus. Die 27 Nummern stimmen mit [Claudes Abhängigkeitsprüfung](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6967999027) überein. Dies ist eine Vorauswahl für neue Kunden-Schriftwahlen, keine Lösch- oder Ersetzungsfreigabe für bestehende Designs. Die unveränderte Gestaltung ist weiterhin Vorgabe.

## Konkreter Vorschlag

[Maschinenlesbare Auswahl mit ursprünglichen Nummern](2026-11-18-konfi-schriften/schriftgruppen-66-vorschlag.json) und [lesbare Gruppenliste](2026-11-18-konfi-schriften/schriftgruppen-66-vorschlag.txt).

| Gruppe | Anzahl | Ausrichtung |
| --- | ---: | --- |
| Andenken | 25 | Klassische Serifenschriften, persönliche Schreibschriften, traditionelle Akzente |
| Geschenke | 25 | Handschriften, Pinselzüge und verspielte Formen |
| Schilder | 25 | Sachliche und markante Schriften, ergänzt um rustikale Varianten |

Alle 66 behaltenen Namen sind mindestens einmal enthalten. Überschneidungen sind beabsichtigt; Lato und Michroma sind als bisherige gemeinsame Katalogschriften in den 25 bereits mitgezählt. Keine der 27 abgewählten Schriften ist im Vorschlag enthalten. Die drei groben Gruppen sind zunächst eine Durchsicht; vorhandene acht Set-IDs werden nicht ersetzt oder umgedeutet. Genauere Unterteilung von Schildern bleibt offen.

Fehlende Dateien bleiben sichtbar: Ashley Marie, Daniel Black und Soulmate sind drei **vorläufige Plätze** in Geschenke, keine geprüften verfügbaren Schriftproben. Ashley, Minimalist, Sunflower und Sweetie bleiben entsprechend Chris’ Auswahl enthalten und mit den nachgewiesenen fehlenden Umlautpunkten markiert. Homage fehlen ß und €. Keine stille Entfernung, Reparatur, Ersatzschrift oder neue Sperre.

Die lokale HTML-Durchsicht nutzt die echten Proben der bestehenden 93er-Übersicht, bietet drei Gruppen und Suche, und ändert keine Shopdaten. Ihre Prüfwerte: 66 ausgewählte Namen, je Gruppe 25 eindeutige Einträge, vollständige Abdeckung aller 66, keine abgewählte Nummer, drei fehlende Originaldateien kenntlich. Dies ist keine Eignungsfreigabe jeder Schrift für jedes Material oder jede Größe.

## Vorhandener technischer Anschluss und Grenzen

- `app/workshop/katalog-source.mjs`: `fontSet(subcategory, theme)` löst vorhandene Set-IDs mit Lato/Michroma auf. Die konkreten Katalogdaten bleiben allein im Katalog-Repository; dieser Vorschlag ist keine neue Laufzeitquelle.
- `app/configurator/variant-m/profile-selection.mjs`: `selectionIds` begrenzt neue Wahlmöglichkeiten. Bestehende Designressourcen sollen ausdrücklich nicht beschnitten werden.
- `app/configurator/variant-m/ux.mjs`, `renderFontPage`: Schriftauswahl wird mit `profileChoices.fonts` gefiltert; sichtbare Vorschauen laden über `observeVisibleResources` nach.
- `app/configurator/variant-m/lazy-resources.mjs`: `uxEnsureDesignResources` und `uxEnsureDraftResources` bestimmen Ressourcen anhand der Gestaltung bzw. des Entwurfs, unabhängig vom Auswahlfilter. Benötigte alte Schriften müssen deshalb im Ressourcenindex und auf der Quelle erhalten bleiben.
- **Offener Nachladepunkt:** `ux.mjs` Aktion `add-text` lädt bei explizitem Profil aktuell die gesamte erlaubte Schriftliste vor und verwendet anschließend den bestehenden Standard Montserrat bzw. Nunito. Ein 25er-Profil garantiert daher noch kein ausschließlich bedarfsweises Laden; außerdem ist der Standard nicht in jedem vorgeschlagenen Set enthalten. Keine neue Standardregel erfunden oder Code geändert. Mit Claude klären und gesondert gezielt prüfen.
- Kleinere Auswahllisten entfernen nicht automatisch die gemessenen 24 MB Schriften aus gespeicherten Produktdokumenten. Die gemeinsame versionierte Ressourcenauslieferung bleibt eine eigene Aufgabe. Kein neuer Geschwindigkeits- oder Speichergewinn behauptet.

Claude bestätigt im direkten Chat die Wiederverwendung der vorhandenen Sets und die Trennung von Kundenwahl und Designressourcen (Codeprüfung, keine Messung). Seine zusätzlichen offenen Punkte: Vorladen nennt derzeit auch die abgewählte Nunito; die bestehende 64-Schriften-Grenze je Produkt gegen die Vereinigungsmenge aus Set und Designschriften prüfen; Wirksamwerden geänderter Sets beim Synchronisieren klären. Die bestehende Design-Master-Formulierung „aus allen 84“ muss mit Chris’ neuer Auswahl abgestimmt werden. Diese Punkte sind keine neuen Regeln und wurden nicht durch automatische Ersatz- oder Löschentscheidungen gelöst.

## Abnahme und nächster Schritt

Nur Vorschlag und Dokumentation; keine Runtime-, Katalog-, Produkt-, Preis- oder Bindungsänderung, kein Merge/Deploy. Keine neue Live-Freigabe. Keine Vorher-/Nachher-Geschwindigkeitsmessung für diese reine Auswahlhilfe. Gruppierung mit Chris durchsehen; technische Anschlussprüfung mit Claude abschließen. Produktzuordnung und die offene Behandlung fehlender/fehlerhafter Schriftdateien vor einer tatsächlichen Aktivierung konkret klären. Maßstab bleibt Variante C, ohne feste Fünf-Sekunden-Regel.
