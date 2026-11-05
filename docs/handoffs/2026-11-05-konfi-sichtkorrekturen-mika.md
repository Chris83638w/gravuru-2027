# Konfi: beauftragte Sichtkorrekturen – Mika, 05.11.2026

Ausgangspunkt: `0ad0ef02bddb8268670091df91bdf36f77fd2188`, PR #178. Arbeitsauftrag im Chat: „Setze alles um“. Abstimmung und Zuständigkeit in Issue #168, Kommentar 6657091213. Keine weiteren Änderungen am Konfigurator außerhalb der unten genannten Korrekturen.

## Fachliche Regeln und Quellen vor Implementierung

- Nutzer, Screenshots 62–85 und anschließender Auftrag: Desktopvorschau bleibt beim Scrollen sichtbar; mobile Vorschau wächst/schrumpft ruhig; Überlagerungshinweise kompakt außerhalb der Vorschau; farbige Textwerkzeugleiste mit reserviertem Platz nur während der Textbearbeitung.
- Nutzer: moderne kompakte Warenkorbleiste; visuelle Abstandshalterfarben nach Antippen, direkte Übernahme ohne Bestätigen und ohne doppeltes Dropdown; Designsuche und wiederholte Bedienhinweise entfernen; Vollbildrückweg „Zurück zur Konfiguration“ hervorheben und Verschieben kurz erklären.
- Nutzer: skalierbare Größen innerhalb eines Konfigurators auswählen. Für diesen Test ausschließlich Naturschiefer Hund ohne Foto als Vorlage, 22 × 14 und 30 × 20 cm. Maße und Befestigungen stammen aus den vorhandenen Tabellenprofilen.
- Nachtrag des Nutzers im selben Chat, 05.11.2026: „mach die 22x14 als Basispreis für 19,99 und die 30x20 cm Tafel als Basispreis für 24,99€“. Diese Preisentscheidung ersetzt 2199/2399 Cent für genau diese beiden Naturschiefer-Größen: jetzt 1999/2499 Cent, Größenaufschlag 500 Cent. Zusatzpreise bleiben erhalten. Änderung in der Katalogquelle und den daraus abgeleiteten Prüfmodellen; keine Änderung veröffentlichter Bestellrevisionen.
- Nutzer: Fotomodul bleibt gemeinsam; eine Ohne-Foto-Vorlage darf mit dem freigegebenen Fotomodul ergänzt werden. Bestehende Uploadprüfung, Fotoentgelt und Mengenbegrenzung bleiben erhalten. Nur irrtümliche Ablehnung eines gültigen Uploads korrigieren.
- Nutzer: jedes zusätzlich eingefügte Motiv 169 Cent; Vorlagenmotive inklusive. Optionen bereits bestätigt, Acrylständer nur Gedenktafeln, nicht 60 × 30 cm. Automatisches proportionales Einrücken um Befestigungen bestätigt.
- Nutzer: alle 43 Designs erst nach seiner Sichtprüfung. Dieser Auftrag ist keine Verkaufsfreigabe und keine Freigabe einer neuen Shopify-Preisversion.
- Design-Master: https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md . Keine neuen Designs oder Grundplatten-Master. Größenansichten sind abgeleitete Geometrie derselben Ressourcen.

## Umsetzung und Prüfungen

Auf der bestehenden Server-Prüfstrecke aktiviert. Keine weiteren Produkt-/Designfreigaben. Der bestehende Codebranch und PR #178 enthalten die Änderungen; Katalognachtrag [PR #182](https://github.com/Chris83638w/gravuru-katalog./pull/182), Commit `83909367110b14f6cb17e077a2fcb75a0e42183f`, auf Astras Schieferquelle `43fe1f23d`.

- Zwei explizite Größenprofile steuern Preis, Maße, reale Bohrbilder und dieselben 43 Originaldesigns im gemeinsamen Editor. Ressourcen bleiben gemeinsam; keine Grundplatten-/Design-Master dupliziert. Texte, Kundenelemente, Uploads, Auswahl und relative Positionen bleiben beim Größenwechsel erhalten. Vorhandene automatische Lochanpassung wird vor der Übertragung berücksichtigt; eine durch das andere Seitenverhältnis notwendige Einpassung bewegt/verkleinert die gesamte Gestaltung proportional.
- Desktopvorschau bleibt sticky. Mobil 280-ms-Übergang mit begrenztem Scrollfortschritt; die mobile Resize-Beobachtung scrollt nicht mehr bei jedem Animationsschritt das ausgewählte Textfeld nach. Bewegungsreduktion wird berücksichtigt.
- Hinweise stehen eingeklappt im rechten/unteren Editorbereich außerhalb der Produktvorschau; ignorierte Hinweise sind dort wieder aufrufbar. Bestehende Bestell-/Geometrieprüfung bleibt erhalten.
- Rosa Textwerkzeugleiste, 48 px reservierter Platz nur während Textbearbeitung. Andere Reiter belegen diesen Platz nicht. Weiße kompakte Warenkorbleiste, vorhandene Mengen- und Warenkorbsteuerung weiterverwendet.
- Abstandshalter öffnen die visuelle Farbwahl; Antippen übernimmt und schließt. Kein zweites sichtbares Dropdown und kein Bestätigungsschritt. Designsuche verborgen; Motivsuche bleibt. Redundante Hinzufügen-/Erfolgstexte entfernt.
- Ein gültig hochgeladenes zusätzliches Foto wird bei aktivem Fotomodul nicht mehr fälschlich als unzulässiges neues Element abgelehnt. Uploadkennung, Modultyp, Mengen-/Preis-/Formatprüfung bleiben verbindlich; beliebige Photoobjekte ohne Uploadkennung bleiben abgewiesen.
- Vollbildrückweg „Zurück zur Konfiguration“ farbig, kurzer Verschiebehinweis darüber. Desktop-Vollbild passt die Platte in den verbleibenden Platz ein, statt sie am unteren Rand abzuschneiden.

### Tatsächlich ausgeführte Prüfungen

- Linux auf der neuen, noch nicht aktivierten Serverkopie: **141/141 Tests**, 0 Fehler/Skips (13 betroffene Testsuiten einschließlich Preis-/Geometrievertrag, Rechte, Mobilnavigation, Toolbox, Ausführungen, Ereignisse, Workflow und Build). Zuerst fehlte ausschließlich die unveränderte Vergleichsdatei `legacy-patches/memorial-editor-compat.mjs`; nach Ergänzung des exakten Repositoryinhalts ist der vollständige Lauf grün.
- Echte Katalogdaten: **43 Designs × 2 Größen × 7 Befestigungen = 602 Fälle**, zusätzlich 602 Speichern-/Laden-Prüfungen, 0 Fehler. Kundentext „Alima“, Rechteprüfung und Befestigungspassung einbezogen. [Bericht](schiefer-konfi-anschluss-20261105/scalable-size-verification.json).
- Mobiles Textscrollen bei 390×664: gemessene stetige Größenfolge 220 → 187,59 px und zurück, ohne nachträgliches Springen der Scrollposition. [Messung](schiefer-konfi-anschluss-20261105/scroll-correction-verification.json).
- Nach Aktivierung live: 30×20 ohne Zubehör **24,99 €**, Wechsel 22×14 **19,99 €**, zwei Abstandshalter **25,98 €**, Schwarz **26,98 €**, drei Zusatzmotive **32,05 €** (= +5,07 €). Farbfenster geschlossen, 0 sichtbare Dropdowns. Testeingaben anschließend zurückgenommen; keine Bestellung erzeugt.
- Live fünf absichtlich ausgelöste Überlagerungshinweise: eingeklappt außerhalb der Vorschau, Plattenhöhe vorher/nachher exakt **155,1875 px**; Bearbeitung und Vollbildrückkehr weiter möglich. [Nachweis](schiefer-konfi-anschluss-20261105/live-warning-check.json).
- Live Textbearbeitung: Werkzeugfarbe rgb(252,234,241), Rand rgb(217,121,158), Textplatz 48 px; beim Wechsel zu Designs 0 px und keine sichtbare Designsuche.
- Live Desktop 1440×700, nach 850 px Scrollen: Vorschau oben 0 px, Platte endet bei 504 px, Warenkorbleiste beginnt bei 643 px. Vollbildplatte vollständig zwischen 229,84 und 593 px; Hinweis, Zurückbutton und Werkzeugleiste überdecken einander nicht. [Sticky-Nachweis](schiefer-konfi-anschluss-20261105/live-desktop-check.json).
- Optionaler Foto-Upload zuvor im lokalen identischen Editor erfolgreich: kein Rechtefehler, 9,99 € bestehender Fotoaufschlag. Kein Upload in einen echten Kundenwarenkorb.
- Preise auch in zwei neuen lokalen Produktrevisionen 2 und der Katalogquelle gespeichert. [Preisnachtrag](schiefer-konfi-anschluss-20261105/base-price-correction.json); Excel mit **9.490 Zellen**, exakt zwei Änderungen. [Zellvergleich](schiefer-konfi-anschluss-20261105/catalog-price-cell-check.json). 20 Familien validiert, KATALOG.md neu gebaut; PDF-Neubau lokal mangels CairoSVG nicht abgeschlossen. Zeichnungs-PDFs enthalten keine numerischen Grundpreise und bleiben erhalten.

### Aktivierung und Grenzen

Aktiver Runtimeordner `private/mika-konfi-hundetest-r4-20261105`, Paket `editor-d5097a3ba9e83c82.mjs`, Startup-SHA256 `1165d5aae21d8a994b4a7daf55ae1455aa3171bc058cf034cd5c5e6755d5ed87`. 21 geänderte Quelldateien per SHA256 gegen lokalen Stand geprüft, 50 gemeinsame Bild-/Schriftressourcen unverändert. Alter Startpunkt und vorherige öffentliche Dateien unter `before-ui-correction` gesichert. Keine Datenbank-Rücksetzung, kein Shopify-Schreibzugriff.

Beim ersten Live-Aufruf waren die aus dem lokalen Build stammenden Assetpfade noch unpräfixiert (404). Mit der vorhandenen Hostfunktion `acrylAssetText` berichtigt; gültiger öffentlicher Paketpfad `/_acryl-bundle/editor-d5097a3ba9e83c82.mjs`, HTTP 200, 1.399.230 Bytes. Danach beide Einstiegspreise und die genannten Bedienwege direkt am veröffentlichten Konfi geprüft. Künftige Generierung muss dieselbe Hostumschreibung verwenden.

[22×14-Einstieg](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/22x14.html) · [30×20-Einstieg](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/30x20.html). Beide bieten die gemeinsame Größenwahl.

**Weiter offen:** Mikails Sichtfreigabe der 43 Vorlagen; Astra übernimmt den Katalognachtrag in die gemeinsame Quelle. Die Prüfseiten sind weiterhin ohne Warenkorbanbindung. Der V3-Preisfunktionskandidat wurde durch diese UI-/Preiskorrektur nicht veröffentlicht; echte Produktbindung, Warenkorb und Produktionsübergabe bleiben das anschließende Arbeitspaket. Keine Kaufbarkeit behaupten.
