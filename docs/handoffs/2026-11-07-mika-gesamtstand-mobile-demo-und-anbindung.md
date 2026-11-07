# Mika · Gesamtstand, mobile Demo, Galerie und Shopanbindung

**Neuester Nachtrag, veröffentlicht:** [R9 – Überlagerung bewusst übernehmen und mit kleinem Abstand einpassen](2026-11-07-mobile-demo-r9-ueberlagerung.md), [frischer Testlink](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r9/22x14.html?fresh=1). 203 gezielte Tests und öffentliche Mobil-/Desktop-Bedienprüfung; statische Demo, keine echte Bestellverbindung. Der ausführliche Stand unten enthält historische Zwischenstände; für die aktuell geprüfte Oberfläche zuerst R9 und R8 lesen. Backend-/Synchronisierungsentscheidungen dieser Gesamtakte bleiben bestehen.

Stand: **07.11.2026, getrennte mobile Demo R4 veröffentlicht und geprüft**. Verfasser: Codex / Mika. Wissenssicherung auf dem neuen Aufgabenbranch `dev/mika-mobile-demo-20261107`, Ausgangscommit **`8ffeed8d90191cb89f1188a336751de2b2a4e0c0`** aus Draft-PR #192. Diese Datei beschreibt Entscheidungen, belegte Ergebnisse, Sicherungen und offene Anschlüsse. Die Demo-Veröffentlichung und ihre Prüfgrenzen stehen in Abschnitt 13; sie ist keine Verkaufsfreigabe oder Übernahme in den Kundenkonfi.

## 1. Zuerst lesen und Stände auseinanderhalten

**Aktueller Auftrag:** Eine getrennte mobile Demo nach der besprochenen Zakeke-Bedienreferenz erstellen: große Produktfläche, Plus-Auswahl für Werkzeuge und ein von unten öffnender Bearbeitungsbereich. Der vollständige bestehende Gravuru-Konfi liefert weiterhin alle Designs, Motive, Schriften, Foto-/Logowerkzeuge, Ausführungen, Preise, Speichern und Abschlusslogik. Keine zweite Fachlogik und keine reduzierte Attrappe. Im Test werden die vorhandenen 43 Hundedesigns und die Schiefergrößen 22 × 14 / 30 × 20 cm verwendet. **R4 ist jetzt getrennt veröffentlicht:** [22×14 – frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r4/22x14.html?fresh=1), [30×20 – frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r4/30x20.html?fresh=1). Die statische Demo hat keine echte Konto-/Galerie-/Checkoutverbindung und ersetzt den bestehenden Konfi nicht. Fertige Prüfungen und verbleibende Gerätefälle siehe Abschnitt 13.

Parallel verlangt Mikail ausdrücklich eine vollständige Sicherung des besprochenen und erledigten Stands, besonders der Anbindung. Die vorherige Dokumentation bleibt erhalten:

- [MIKA-START-HIER auf dem Dokumentationsbranch](https://github.com/Chris83638w/gravuru-2027/blob/docs/mika-konfi-gesamtstand-20261106/docs/handoffs/MIKA-START-HIER.md).
- [Gesamtakte vom 06.11., einschließlich Nachträge 11–17](https://github.com/Chris83638w/gravuru-2027/blob/docs/mika-konfi-gesamtstand-20261106/docs/handoffs/2026-11-06-mika-konfi-gesamtstand-und-sicherung.md). Die ersten Abschnitte sind historische Zwischenstände; spätere Nachträge haben dort markierte offene Punkte bereits erledigt.
- [Issue #168](https://github.com/Chris83638w/gravuru-2027/issues/168), insbesondere [Astras ursprünglicher vollständiger Anschlussvertrag](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6683765158).
- [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md): Katalogvorlagen, Originalmotive, passende Formate und echte Konfi-Kontaktbögen bleiben maßgeblich. In diesem Paket werden keine Designs neu gestaltet.

**Wichtig für jede Fortsetzung:** GitHub-Code, lokale Testkopie, private Online-Galerie, veröffentlichte Schiefer-Prüfseite und echter Shopify-Kundenweg sind verschiedene Stände. Ein erfolgreicher lokaler Test beweist keine Hostübernahme. Ein erreichbarer Prüfseiten-Link beweist keinen kaufbaren Shopify-Artikel. Die hier genannten Testzahlen stammen aus den jeweils verlinkten Paketabnahmen; sie wurden für diese Dokumentation nicht erneut ausgeführt und dürfen nicht zu einem neuen Gesamt-Testlauf addiert werden.

## 2. Verbindliche Nutzerentscheidungen

### Produkt- und Verwaltungsziel

- Ein universeller Konfi zuerst für den eigenen Shopify-Shop, später erweiterbar. Gemeinsame Module für Texte, Motive und Fotos/Logos; Produktprofile bestimmen Material, Form, echte Maße, zulässige Größen, Ausführung, Preise, Rechte und Ressourcen. Nicht für jedes Produkt einen neuen Konfi bauen.
- Galerie/Werkstatt sollen die zentrale Bearbeitungsstelle sein: Design ändern, prüfen, bewusst **Synchronisieren** drücken; die eindeutig zugeordneten Shop-Produkte übernehmen den neuen Stand. Galeriespeichern und Shopübernahme bleiben getrennte Schritte.
- Unterkategorien sollen angebotene Materialfamilien auswählen können, beispielsweise Edelstahl, Acrylglas, AA und AS. Eine Materialauswahl erzeugt nicht automatisch einen fertigen Format-/Fertigungsadapter.
- **Vor jeder Produktneuanlage alle tatsächlichen Optionen bestätigen lassen.** Es gibt keine pauschale feste Liste aus Befestigung, Zubehör, Klebeband oder Bohrungen. Diese waren Beispiele. Eine konkrete Gruppe kann weitere Optionsbereiche, Abhängigkeiten, Pflichtfelder und Aufpreise besitzen. Bestehende Daten sind ein zu prüfender Vorschlag, keine neue Nutzerfreigabe.
- Eine reine Designänderung ändert nicht nebenbei Preise, Varianten-IDs, Bestand, Produkttitel, Beschreibungen oder SEO. Historische Bestellungen und ihre Produktionsstände bleiben unveränderlich.
- Ein „Shop-Spiegel“ bedeutet bisher keine vollständige automatische Zweiwege-Synchronisierung beliebiger Shopify-Felder und keine neue Lagerverwaltung.

### Erster Schieferumfang und Preise

- Tiere/Hund zuerst; 22 × 14 und 30 × 20 cm. Alle 43 vorhandenen Ohne-Foto-Vorlagen erst nach Mikails Sichtprüfung. Das historische Drei-Stunden-Ziel war eine erste kaufbare Produktgruppe einschließlich geprüftem Warenkorb; es ersetzt keine ausstehende Abnahme.
- Basispreis 22 × 14: **19,99 €**. Basispreis 30 × 20: **24,99 €**, also **5,00 €** Unterschied. Diese ausdrückliche Preisentscheidung gilt dieser Schiefergruppe, nicht automatisch anderen Materialien.
- Nur passende Zielgruppen/Designs anbieten. Der Konfi soll mit dem Design des angeklickten Hauptproduktbilds starten. Geeignete skalierbare Größen sind im Konfi mit dem jeweiligen Aufpreis auswählbar.
- Für Naturschiefer-Gedenktafeln 22 × 14 bestätigt: ohne Bohrung; zwei oder vier Bohrlöcher; jeweils auch mit Schrauben; zwei oder vier Abstandshalter in Edelstahl, Schwarz, Bronze, Gold, Weiß; Silikon; Acrylständer klar oder schwarz. Acrylständer ausschließlich für Gedenktafeln, nicht 60 × 30 cm und nicht Monogramme. Keine technischen Zusätze wie „12 mm breit“ in Kundenlabels.

### Bedienung, die erhalten bleiben muss

| Bereich | Bestätigter Wunsch / Erhaltungsgrenze |
|---|---|
| Produktfläche | Große gut gestaltbare Tafel; am PC sticky. Keine Sprünge durch Werkzeugwechsel, Textauswahl oder Hinweise. Unnötige reservierte Flächen vermeiden. |
| Neue mobile Demo | Bestehenden vollständigen Konfi verwenden. Große Produktfläche, Plus-Werkzeugwahl und unterer Bearbeitungsbereich nach Zakeke als Bedienreferenz. Keine festgelegte Drei-Schritt-Folge. Alle bisherigen Funktionen müssen erreichbar bleiben. |
| Werkzeuge | Foto-/Motiv-/Logo-Bearbeitung kompakt; klare Farbakzente; Drehen mittig. Regler und Zurücksetzen sauber auf gleicher Höhe. Hilfe-, Frage- und Warnzeichen gut erkennbar. |
| Text | Textoptionen beim bewussten Auswählen darunter öffnen; bewusster Klick außerhalb darf schließen. Scrollen darf nicht als bewusster Außenklick gelten. Keine Layoutsprünge. Schriftwahl direkt übernehmen und Auswahl schließen. Mehrzeilige/längere Inhalte sichtbar machen. |
| Designwahl | Passende Designs sofort sichtbar, zusätzliche störende Designsuche/-Vorschau vermeiden. Vorlagenmotive bleiben Bestandteil der vorhandenen Designs. |
| Motive | Suchtext hat Vorrang vor der gewählten Kategorie. Kategorien deutlich auffindbar. Nur Kategorie **Grundmotive samt Inhalt** aus der Auswahl entfernen; nicht alle Motive oder Designvorlagen löschen. Kleiner schwarzer Text **„Je Motiv 1,69 €.“** ohne Kasten-/Buttonoptik. Keine zweite Preisberechnung in der Demo. |
| Abstandshalter | Beim Auswählen visuelle Farbauswahl öffnen; Farbklick übernimmt sofort. Kein zusätzliches redundantes Dropdown und kein Bestätigungsbutton. |
| Löschen | Papierkorb für bearbeitbare Texte, Motive, Fotos und Logos sichtbar und wirksam. Technische Geometrie/geschützte Produktionsbestandteile nicht als frei löschbare Kundenelemente umdeuten. |
| Fotos | Neue Uploads vollständig, größer und mittiger einsetzen; ohne Kundenaktion kein ungewollter Zuschnitt. Verschiebbar, löschbar und mit Eckgriffen skalierbar. Ein versehentlicher Tap auf ein vorhandenes Foto darf keinen neuen Uploaddialog auslösen. |
| Fotoeditor | Originalformat sowie bestehende Zuschnitte erhalten, einschließlich Herz, Oval hochkant, Stern und Wolke. Original, bearbeitete Fassung, erneute Bearbeitungsquelle, Rezept und Masken dürfen beim Speichern nicht verloren gehen. |
| Zoom | Ansichtszoom nur über Regler, nicht Mausrad oder Zwei-Finger-Zoom. Später ausdrücklich bestätigte Foto-Eckgriffe bleiben erlaubt. Ansicht und tatsächliche Fotoabmessungen sind verschiedene Funktionen. Fotogrößenregler ohne mm-Zusatz. |
| Überlagerung | Ein knapper Hinweis direkt unter dem Produkt, nur einmal und ohne die Tafel/Navigation zu verdrängen. Überflüssige Rechte-Erklärungen entfernen. |
| Neustart/Reset | Nutzer will von vorn testen können. Zurücksetzen auf die **gewählte Originalvorlage nach Bestätigung**; Größe/Ausführung bleiben erhalten. Kein ungefragtes Löschen aller anderen gespeicherten Entwürfe. |
| Vollbild | Klarer Rückweg „Zurück zur Konfiguration“, gut erkennbar; kurzer Hinweis auf verschiebbare Elemente. |
| Kaufleiste | Modern, kompakt, Warenkorbbutton grün; Preise/Menge und echte Validierung erhalten. Eine Demo darf keinen echten Kauferfolg vortäuschen. |
| Suchauswertung | Häufige Motiv-Suchbegriffe in der Shopify-App sichtbar. Nutzer bestätigte die Funktion zwischenzeitlich. Das ist kein neuer Live-Analytics-Nachweis dieses Pakets. |

Die frühere Grenze „nur besprochene Punkte ändern“ gilt für den bestehenden Konfi weiter. Mikail erlaubt in der **getrennten Demo** nützliche Ergänzungen, verlangt aber ausdrücklich seine vorhandenen Funktionen, Motive und Schriften. Dies ist keine Freigabe für neue Produktregeln, heimliche Änderungen am Bestand oder automatischen Live-Rollout. Optimierungsvorschläge weiterhin benennen und von bereits umgesetzten Änderungen unterscheiden.

## 3. Code- und Veröffentlichungsstände

| Paket | Festgehaltener Stand | Ergebnis / Grenze |
|---|---|---|
| Sicherungsakte | [Draft-PR #183](https://github.com/Chris83638w/gravuru-2027/pull/183), Dokumentationsbranch | Entscheidungen, Sicherungen, Nachträge. Keine Funktion oder Hostumschaltung. Nicht mit Katalog-PR #183 verwechseln. |
| Feste Werkzeuge, reversibler Test | [PR #178](https://github.com/Chris83638w/gravuru-2027/pull/178), `4548fa6790bc871b97ad6d80ad12bf770bb6c146` | `tools=fixed` nur in zugelassenen Prüfmodellen; 57 Tests und zwei Browseransichten. Nicht live. |
| Galerie-Saveback | [Draft-PR #184](https://github.com/Chris83638w/gravuru-2027/pull/184), `f8e55358272fe9fabdb29de7db15c6592f2cfecc` | Voll-Konfi → dieselbe native Galerievorlage, Konflikt-/Foto-/Maskenprüfung. 150 betroffene Regressionen. |
| Produktgruppen und Design-Sync | [Draft-PR #185](https://github.com/Chris83638w/gravuru-2027/pull/185), `fa48154232816c8a31768107208231d5c190e574` | Private Verwaltung, Bestätigung, native Entwürfe, gezielter Shopadapter. 203 unterschiedliche Tests; Shopify simuliert. |
| Astras Gesamtbestand / Navigation | [#186](https://github.com/Chris83638w/gravuru-2027/pull/186) → [#187](https://github.com/Chris83638w/gravuru-2027/pull/187), Kopf `6b799d9a79c789d097c970c6283cd4369d02f97b` | Enthält #185. Dokumentierter privater Online-Code `e166741ccfea9f487fdd578ddfff22ab7875e1a8`; spätere Commits ergänzen Nachweise. Kein Shop-Sync eingeschaltet. |
| Quellenauflösung / Materialidentität | [Draft-PR #189](https://github.com/Chris83638w/gravuru-2027/pull/189), `3ad2cdc3947db211c1c5864c3acb8faa1883fa62` | Getrennt auf #187. 43 Tests; keine neue Hostübernahme. |
| Gemeinsame interne Ressourcen | [Draft-PR #190](https://github.com/Chris83638w/gravuru-2027/pull/190), `6f859471603c74948dc441db85131b477ab2e8bc` | Schema V5, exakte Wiederherstellung, Migration in Kopien/Rückweg. 194 Tests, lokale Browserabnahme. |
| Gemeinsame Browserressourcen | [Draft-PR #192](https://github.com/Chris83638w/gravuru-2027/pull/192), `8ffeed8d90191cb89f1188a336751de2b2a4e0c0` | Nur private Galerie/lokale Vorschau optiert ein; 84 Tests, 78 Modelle/236 Designs exakt. Sichtbare Abnahme dieses Pakets offen. |
| Mobile Demo | `dev/mika-mobile-demo-20261107`, Basis #192 | Eigene Arbeitskopie `work/konfi-mobile-demo-20261107`. R4 separat veröffentlicht, 22/22 gezielte Tests und dokumentierte Browser-/HTTP-Prüfungen; Kundenkonfi unverändert. Physische Touch-/iOS-Prüfung offen, Code und Nachweise sind mit `78a30547` auf GitHub in [Draft-PR #193](https://github.com/Chris83638w/gravuru-2027/pull/193) gesichert; kein Main-Merge. Abschnitt 13 enthält Nachweise. |

Historischer veröffentlichter Kundenstand aus der älteren Sicherungsakte: R12 `8cb8c3caa63f9066020252e79932a5c984e951dc`, Bundle `editor-f5c81c94a6bbe07a.mjs`. Dies ist ein dokumentierter früherer Stand, keine hier erneut ausgelesene aktuelle Deployment-ID. Vor einer späteren Übernahme den tatsächlich laufenden Host erneut vergleichen.

## 4. Galerie: vollständiger Konfi und Rückspeichern

**Vorhandener Vertrag:** Kataloglieferung → geprüfte Quelle/Original-ID → explizites Material-/Formatziel → native versionierte Konfiguration → derselbe Konfi/Renderer. Keine flache Gesamtbild-Kopie als Ersatz für bearbeitbare Objekte.

Der private Einstieg `/originale/editor?configuration=…&design=…&originalId=…` öffnet den vollständigen Konfi. Quelle und Ziel enthalten echte `cfg_*`, native Design-ID, Original-ID, Material, Größe und erwartete Revision. Original-ID wird nicht aus einem Slug erraten. Speichern ersetzt genau das adressierte Design in derselben Produktgruppe; andere Designs, Preis-/Optionsdaten und Kundenrechte bleiben erhalten. Konkurrierendes Speichern führt zu Konflikt statt Überschreiben.

Nach dem Speichern gehen Karte, Filter, Material und Größe nicht verloren. Vorschau und Schnellbearbeitung lesen den neuen Stand. Tatsächliche Designänderungen machen die zugehörige Sichtfreigabe prüfbedürftig; Kommentare bleiben unabhängig. Identische Wiederlieferungen dürfen bearbeitete Köpfe nicht mit alten Katalogdaten überschreiben. „Für die Werkstattprüfung sichern“ ist ein eigener Kundenentwurfs-/Prüfweg und **keine Galerie-Rückspeicherung**.

Fotooriginal, verarbeitete Fassung, erneute Bearbeitungsquelle, Zuschnittrezept und Originalmasken werden in der vorhandenen Assetablage dauerhaft gehalten. Flüchtige Blob-URLs sind keine persistente Quelle. Der Betreiber-Konfi nutzt Betreiberrechte, ohne daraus gelockerte Kundenrechte zu speichern. Seine Kaufleiste ist getrennt entfernt.

**Belege #184:** 146/146 echte Edelstahlformatziele geöffnet, acht anfängliche No-op-Fälle; danach 150 Regressionen, PC-/mobile Browserläufe, kleine Ovale, Text-/Schrift-/Motivwechsel, No-op ohne neue Revision, Zwei-Tab-Konflikt, sichtbarer Ressourcenfehler mit gesperrtem Speichern. Synthetischer Foto-/Masken-Roundtrip mit Herz, Spiegelung, erneutem Öffnen, Stern und zweitem Upload; Originalbytes erhalten. Keine echten Verkaufsfreigaben daraus ableiten.

**Logo-Grenze:** Die geprüften 73 Stahlpilotprodukte haben Foto/Logo deaktiviert, das geprüfte Hundemodell Logo deaktiviert. Neue native Galerie-Logo-Uploads haben noch keinen vollständigen Original-/Vektor-/Ersetzen-Nachweis; der Adapter lehnt sie ausdrücklich ab. Eine vorhandene Kunden-Logofunktion darf in der Demo für entsprechend erlaubte Profile erhalten bleiben, ohne Logos pauschal bei allen Profilen einzuschalten oder die Galerie-Lücke zu verschweigen.

**Astras dokumentierter privater Stand #187:** 462 Originale, 370 nativ bearbeitbar, 2.449 Ziele, 348 Produktgruppen, 240 Rohlinge. Vorlagen/Rohlinge/Alles, direkter Schnellstart mit vier 1-mm-Richtungstasten und voller Konfi-Rückweg. 52 unterschiedliche Tests; private Onlineaktivierung samt 91/91 HTTPS-/Bestandsprüfungen und No-op-Rückkehr dokumentiert. Nicht in diesem aktuellen Paket neu online abgenommen. Die separate Chrome-Frame-Störung und weitere Importstapel bleiben ausdrücklich offen.

Quellen: [Saveback-Übergabe](https://github.com/Chris83638w/gravuru-2027/blob/f8e55358272fe9fabdb29de7db15c6592f2cfecc/docs/handoffs/2026-11-06-mika-galerie-rueckspeicherung.md), [Astras Navigation/Onlinebelege](https://github.com/Chris83638w/gravuru-2027/blob/6b799d9a79c789d097c970c6283cd4369d02f97b/docs/handoffs/2026-11-06-galerie-navigation-astra.md).

## 5. Produktgruppen, Optionen und Materialangebot

Die private Verwaltung liegt unter `/originale/verwaltung` und enthält Produktgruppen, Produkte anlegen und Synchronisieren. Vorlagen, Revisionen, Anlagepläne und Bestätigungen liegen in `product_group_*`-Tabellen der privaten Werkstattdatenbank. Produkte entstehen über das vorhandene `repository.importBatch` einschließlich Journal, nicht in einer zweiten Produktdatenbank.

Vor der Anlage werden konkrete Quellen, Produkte, Größen, Materialfamilien und **sämtliche** Optionsbereiche samt Werten, Standards, Pflichtfeldern, Abhängigkeiten, Aufpreisen und Zusatzfeldern angezeigt. Offene Angaben verhindern die Anlage. Das Bestätigungshäkchen bindet genau diesen Plan, Vorlagenstand, Quellrevisionen und Materialstand. Relevante Änderungen entwerten es. Der letzte Vergleich erfolgt innerhalb der echten Importtransaktion; Wiederholung erzeugt keine Duplikate. Neue Produkte sind zunächst **interne native Entwürfe**, nicht neue Shopify-Angebote.

Materialauswahl: `subcategories[].familyIdsOffered` fehlt/ist `null` → Linienvorgabe; `[]` → keine neuen Materialangebote; Liste echter IDs → ausdrücklich diese Familien. Abwahl löscht keine vorhandenen Artikel. AA und AS sind eigene vorhandene 5-mm-Acrylfamilien mit rückseitiger Gravur, nicht stillschweigend andere 3-mm-Acrylgruppen. Neue technische Optionstypen brauchen echte Stammdaten und ihren nativen Anschluss.

Das private Neuanlage-Gate leitet alte direkte Anlagewege mit HTTP 428 auf die Bestätigungsstrecke; alte Tabellen-Commits sind dort vollständig gesperrt. Bestehende Einzelbearbeitungen bleiben möglich. CLI-Importe und Planungswerkzeuge sind gesonderte Wege, keine automatische Freigabe.

#189 verbessert die Auflösung: Registry einmal pro Vorgang, begrenzter Cache von höchstens zwei vollständigen nativen Datensätzen insgesamt, frische Prüfung vor Bestätigung/Ausführung. Die synthetische 348-Gruppen-/2.449-Ziele-Fixture benötigt 696 Reads statt rechnerisch 855.049 im alten erfolgreichen Pfad. Dies ist ein gemessener Zugriffszähler, keine reale Browser- oder Server-RAM-Messung.

Quellen: [#185-Übergabe](https://github.com/Chris83638w/gravuru-2027/blob/fa48154232816c8a31768107208231d5c190e574/docs/handoffs/2026-11-06-mika-galerie-synchronisierung-und-produktgruppen.md), [#189-Übergabe](https://github.com/Chris83638w/gravuru-2027/blob/3ad2cdc3947db211c1c5864c3acb8faa1883fa62/docs/handoffs/2026-11-07-mika-verwaltung-sync-und-gemeinsame-grundplatten.md).

## 6. Gezielter Galerie→Shop-Abgleich: implementiert und noch anzuschließen

### Vorhandener Ausführungsweg

1. Aktuell sichtgeprüfte native Galeriequelle festhalten: Original-ID, cfg-/Design-ID, Quellrevision, Fingerprint und Ressourcen. Ein alter Katalog-SVG-Reimport ersetzt diese Quelle nicht.
2. Ausschließlich serverseitig registrierte bestehende Ziele auswählen: native cfg-/Design-ID, echte Shopify-Produkt-/Varianten-IDs, MediaImage-IDs, erwartete Ziel- und Bindungsrevisionen. Keine frei getippten Browser-IDs und keine Titel-/Dateinamen-Inferenz.
3. Unveränderlichen Plan mit Alt/Neu-Vorschau, Änderungen und konkreten Hindernissen speichern. Gleiches Original an Profil und Formatbank, tatsächliches Startdesign, Geometrie, Material/Variante/Stärke, Gravurseite, Katalogfamilie und Verfahren prüfen. Keine blinde Skalierung oder Materialkonvertierung.
4. Foto-/Masken-/Schrift-/Motivressourcen erhalten und neue Zielrevision als Entwurf anlegen. #189 prüft die Identität **vor** Assetübernahme und erneut bei Ausführung älterer Pläne.
5. Nur zugeordnete Produktbilder und `gravuru.gallery_release` gezielt übertragen. Kein Gesamt-`productSet`, keine Varianten-/Metafeldlisten anderer Funktionen ersetzen. Preise, Bestand, Titel, SEO und Ausführung bleiben bei reinem Design-Sync unverändert.
6. Tatsächlichen Shopstand erneut lesen: Metafeld-CAS und echte Bildbytes/SHA, nicht bloß eine unveränderte CDN-Adresse oder READY-Meldung als Erfolg behandeln.
7. Erst nach bestätigtem Ergebnis vorhandene Bindungen und Katalogfreigabe gemeinsam in einer Datenbanktransaktion auf die neue Revision umstellen. Frühere Produkt-/Bestellstände bleiben erhalten.

Das separate private Sync-Journal hält Pläne, Vorgänge, Teilstände und dauerhafte Besitzsperren pro Konfi-/Shopprodukt. Nach Neuladen kann derselbe Plan erneut geöffnet werden. Unbekannte Remoteantworten führen nur zum Rücklesen; kein blindes erneutes Schreiben. Eine ungeklärte Operation verliert ihre Sperre nicht allein durch Zeitablauf. Es gibt **keine** verteilte atomare Transaktion oder automatischen Rollback zwischen Shopify und SQLite. Rücknahme muss als kontrollierter neuer Vorgang erfolgen.

### Konkreter Anschlussvertrag

`scripts/lib/gallery-shop-connection.mjs` exportiert `createGalleryShopConnection`. Er verbindet `sourceWorkshop`, `targetWorkshop`, `tenantId`, `shopDomain`, autoritative `targets`, eigenes `journalFilename` bzw. eigene Journal-DB, authentifizierten serverseitigen `graphql`-Transport, `imagePreparation`, `mediaAdapter` und `sourceApproval`. `executionEnabled` und `writesEnabled` sind standardmäßig **false**. Konstruktion sendet keinen Shopify-Aufruf. Journal und Produkt-/Bestelldatenbank bleiben getrennt.

Montagepunkt ist `management.synchronizer: ({workshop, sourceApproval}) => …` des privaten Galeriehandlers. Die aktuelle Standard-Prüfgalerie errät keine echten Shopbindungen. Der echte private Onlinehost hat diesen Synchronisierer nach den geprüften Übergaben noch nicht angeschlossen.

Bildweg: vorhandenes natives SVG → isolierter Offline-Chromium → unveränderliches abgeleitetes PNG → kontrollierte GET/HEAD-Route `/galerie-produktbilder/<tenant>/<sha>/<HMAC>.png`. Keine Originalfotos oder beliebigen Dateien über diese Route. `createGallerySyncShopifyMedia` verwendet ausschließlich registrierte MediaImage-IDs und gezieltes `fileUpdate`. Vollständige Medienreferenzprüfung vor/nach Übernahme; gemeinsam benutzte Dateien blockieren. Zusätzlich braucht es ausdrücklich `dedicatedProductFiles:true`, weil die externe API keine atomare Referenzsperre liefert. Origin-Freigaben, Signierschlüssel, Browserprozess und Tokens gehören ausschließlich in Serverkonfiguration.

**Getestet:** echter nativer Repository-/Binding-/Freigabeweg und Medienadapter mit simuliertem Shopify-GraphQL/Download; zusätzlich echte lokale Offline-Rasterisierung. Original-/Startdesignidentität, Fotos/Masken, Materialkonflikte vor Schreibwirkung, CAS, konkurrierende Pläne, Unterbrechungen, Wiederholung, historische synthetische Bestellungen. Das ist ein lauffähiger lokaler Ende-zu-Ende-Anschluss, kein echter Live-Schreibnachweis.

### Vor dem ersten realen Anschluss noch erforderlich

- Reale, ausdrücklich geprüfte Source/Target-/Shop-/Varianten-/Medienregistry für eine Produktgruppe; keine geratenen IDs. Die Zielkonfiguration braucht gültige Varianten/Preise und Katalogfreigabe.
- Aktuelle Sichtfreigabe genau der zu synchronisierenden Original-/Material-/Größenfassung. Galerieproduktrevision ist noch keine universelle Masterrevision für alle Materialien. Verschiedene Proportionen/Materialien benötigen ausdrücklich geprüfte Zieladapter.
- Authentifizierter serverseitiger Transport, kontrollierte HTTPS-PNG-Auslieferung, private Speicher und echte Hostmontage; Schreibschalter erst im freigegebenen Umfang aktivieren.
- Frische konsistente Hostsicherung und Sicherung der betroffenen Shopfelder/Bilder; keine bearbeitete Testdatenbank auf Hostdaten kopieren.
- Sichtbare Übernahme, Rücklesen, Wiederanlauf und vollständiger Warenkorbablauf mit exakt derselben aktivierten Revision. Laufende Kundensitzungen und ihre Neulade-/Entwurfsbehandlung bewusst prüfen.
- Neue Shopify-Produkte/erste Bindung sind ein eigener Prozess. `shop-draft-transfer` bietet Entwurfsübertragung; die bestätigte interne Produktanlage alleine veröffentlicht keine Shopangebote.

Shopify bleibt für echte Bestellungen und Bestände zuständig. Die alte allgemeine Katalog-Sync-Strecke darf nicht unverändert als universeller Spiegel eingeschaltet werden; ihre vollständigen Listen und unklaren Wiederholungen waren ausdrücklich als Risiko dokumentiert. Kein bestehender Schutz wurde für den neuen Anschluss abgeschwächt.

## 7. Gemeinsame Grundplatten und Schriften

### Interne Ablage, #190

Identische vollständige Schriftobjekte und eingebettete Materialbilder werden je Mandant einmal in `product_document_resources` derselben `workshop.sqlite` gehalten. Unveränderliche Referenzen enthalten Art und SHA-256. Whitelist ausschließlich am jeweiligen Produktdokument: `config.localResources.fonts[Name]` und eingebettete Data-URLs in `config.materialSurface`. Keine pauschale rekursive Auslagerung in Formatbanken oder beliebigen Foto-/Masken-/Objektfeldern; Designgeometrie nicht normalisieren.

`product-document-resources.mjs` stellt `initializeProductDocumentResources`, `encodeStoredDocument`, `readStoredDocumentText`, `parseStoredDocument` bereit. Alle aktiven SQL-Leser, Import-, Hash-/HMAC-, Bestell-, Binding- und Cloudbackupwege lösen über denselben Vertrag auf. Fehlende/falsche Ressourcen oder Mandantenmix blockieren. Älterer nicht kanonischer JSON-Text bleibt inline und bytegleich. Schema **V5** hält alte Anwendungen vom falschen Lesen kompakter Dokumente ab.

Neue Revisionen nutzen den Pool; bestehende Revisionen werden beim Öffnen nicht umgeschrieben. Migration nur als ausdrücklich beauftragte neue Kopie mit neuer vorheriger Sicherung; Quelle unverändert, WAL-Inhalte gesichert, Tabellen-/Zeilen-/Hashparität, Rückweg in eine neue vollständig expandierte V4-Kopie. Keine aktive DB ungeprüft in-place umstellen und V5 nicht mit altem Code öffnen. Ein fehlgeschlagener Kopierversuch bleibt als fehlgeschlagen erkennbar.

**Nachweis:** 90 historische Dokumenttexte bytegleich auflösbar; 78 Köpfe, Preise/Optionen und 236 native Vorschauen; sieben repräsentative Fertigungs-SVGs/Konturen identisch. Bei 14 Konturvorschauen nur generierte lokale Masken-ID-Zähler für den Vergleich vereinheitlicht. Alle 90 Revisionen nach Expansion auch mit unverändertem alten Repository geöffnet. 194 Tests. Desktop und 390×844-Browseransicht mit Foto-/Masken-Speichern/Rücksprung geprüft; kein physisches Handy-/Maschinennachweis.

Gemessene lokale Werkstattdateien: Edelstahl 179.855.360 → 5.386.240 Bytes; Schiefer 86.564.864 → 46.997.504 Bytes. 73 Stahlgruppen teilen ein vorhandenes Bild. Die zwei vorhandenen Schieferbilder sind **verschieden und bleiben getrennt**. Diese Speicherersparnis ist keine gemessene Browserbeschleunigung.

### Browsertransport, #192

Nur private Galerie und lokale `models.json`-Vorschau nutzen opt-in `X-Gravuru-Resources: lazy-v1`. Gleiche vollständige Fonts/Materialdaten teilen private Inhaltsadressen pro Serverinstanz. Zufälliger Namensraum, gebundene Quellrevision, SHA-Prüfung, begrenzte Cache-/Wiederherstellungsbeschreibungen. Keine öffentliche Poolabfrage. Material vor Renderer wieder dieselbe originale Data-URL; sämtliche Schriftzeichen/-varianten erhalten, keine Ersatzschrift.

Start benötigt nur tatsächlich verwendete Produktschriften; weitere bei Bedarf. Gleichnamige eigene Fonts behalten Vorrang. Nicht exakt rekonstruierbare Profilzusätze, lange Kennungen oder Indexüberschuss bleiben inline statt verloren zu gehen. Alte API-Aufrufer erhalten vollständige Modelle. Speicherung und Designs bleiben unverändert.

**Nachweis:** 84 Tests, 78 Modelle/236 Designs nach Nachladen inhaltlich exakt. Schiefer D1000/30×20: 3 statt 30 Produktschriften zum Start; Modell plus Startressourcen 9.668.186 statt 21.379.825 unkomprimierte Bytes. Editor-/Bibliotheksdateien nicht eingerechnet; keine Handy-Ladezeit daraus ableiten.

**Offen:** Sichtbare Desktop-/Handyabnahme von #192 scheiterte an einer von der Browsersteuerung angehaltenen iframe-Dokumentantwort; Parent sah `about:blank`, null Skripte. Speichern blieb korrekt gesperrt. Nicht als bestandene Abnahme ausgeben. Der private Plesk-Proxy reicht den neuen Header bislang nicht weiter und setzt `no-store`. Hosted-/Plesk-/Shopwege wurden nicht umgestellt.

Grundsätzlich: 9×6 und 30×20 besitzen 3:2 und können einen geeigneten ausreichend aufgelösten Bildmaster teilen; 22×14 hat ein anderes Verhältnis. Echte Millimeter, Konturen, Bohrdurchmesser/-positionen und Beschläge bleiben getrennte Daten. Größen nur durch scheinbare Lochgröße zu simulieren reicht nicht. Gleiche reale Löcher erscheinen bei gleicher Bildbreite auf 9×6 etwa 3,33-mal größer als auf 30×20. Eine fertige Vorschau pro Angebot darf existieren, ohne den Grundplattenmaster in jeder Revision zu duplizieren.

Quellen: [#190-Übergabe samt Paritäts-/Rückwegbelegen](https://github.com/Chris83638w/gravuru-2027/blob/6f859471603c74948dc441db85131b477ab2e8bc/docs/handoffs/2026-11-07-mika-gemeinsame-grundplatten-und-schriften.md), [#192-Übergabe samt Browsergrenze](https://github.com/Chris83638w/gravuru-2027/blob/8ffeed8d90191cb89f1188a336751de2b2a4e0c0/docs/handoffs/2026-11-07-mika-browser-grundplatten-schriften.md).

## 8. Performanceprüfung vom 07.11.: gemessen und empfohlen

Vollständiger Nutzerbericht lokal: `outputs/2026-11-07-konfi-performance-pruefung.md`. Mika mit zwei Unteragenten hat nur gelesen/gemessen; keine Server-/Shopoptimierung umgesetzt. Das Folgende sichert seine Kernergebnisse auch in dieser GitHub-Datei.

- Veröffentlichte Schiefer-Prüfseite: drei HTTP-200-Abrufe; erster Antwortinhalt 0,323/0,429/0,352 s; HTML vollständig in 1,321/1,444/1,364 s; jeweils 1.149.677 übertragene Bytes, entpackt 3.602.251 Bytes. Rund 3,13 MB Konfigurationsdaten, davon etwa 2,82 MB lokale Ressourcen. Prüf-HTML bewusst `no-store, no-cache`.
- Editor-Paket 535.841 Byte gzip, langfristig immutable gecacht. Referenzierte Cinzel-Datei 58.255 Byte gzip mit ETag/Last-Modified, ohne beobachteten ausdrücklichen Cache-Control-Header. TLS 1.3/HTTP/2 separat bestätigt; die curl-Zeitmessungen selbst liefen über HTTP/1.1.
- Plesk-Momentaufnahme: 16 Kerne, Last 1,28/1,60/1,68; 96 GB RAM, 65,74 GB verfügbar; Dateisystem 72,98 % belegt, 243,76 GB verfügbar. Daraus folgt kein Engpassbeweis und keine garantierte Lastkapazität. Ein größerer Server ist anhand dieser Momentaufnahme nicht die erste Empfehlung.
- Plesk zeigte Backup vom 07.11. um 02:11 und täglichen Plan. Inhalt und Wiederherstellbarkeit wurden nicht getestet. „Inaktiv“ mit Start bei nächster Anfrage bei gleichzeitig HTTP 200 ist kein nachgewiesener Ausfall; echter Kaltstart/Lasttest noch offen.
- Lokale Artefakte: 30 Standardschriften zusammen ca. 4,35 MB gzip; gesamte Bibliothek 703 Motive ca. 4,34 MB gzip; Beispiel 15 Kreuzmotive ca. 43,5 KB gzip. Bibliotheksmotivzahl nicht mit 43 Hundedesigns verwechseln.

**Bestehende Ladefolge:** Theme-Block aktualisiert Variantenlinks; eigentlicher Shop-Einstieg bereitet kleine Startkarten nach Laden/Leerlauf oder Kundeninteraktion vor. Vollständiges iframe-Vorladen ist ausdrücklich deaktiviert. Nach Klick werden Modell, Kernkatalog und Startfonts parallel angefragt; der vorhandene Warmup-Helfer könnte Code vorziehen, aktuell steht nur Kernkatalog in der Liste. Hintergrundwarteschlange existiert. Motivtab lädt weiterhin die ganze Motivbibliothek, Schriftwahl wartet auf alle angebotenen Schriften. Datensparmodus vermeidet noch nicht alle optionalen Abrufe.

**Empfehlung, noch kein fertiges Kunden-Performancepaket:** Produktseite/Hauptbild/Preis zuerst; danach bei freier Kapazität gemeinsamen Code, Grundplatte und Startdesign-Ressourcen mit niedriger Priorität vorbereiten. Beim bewussten Personalisieren-Klick priorisieren. Laufende Vorbereitung wiederverwenden, damit weder Startkarte noch iframe doppelt angefordert werden. Zusätzliche Motive/Suchtreffer/Schriftproben bedarfsgerecht. Unveränderliche Inhaltsdateien separat cachen, Sitzungs-/Produktrevisionen beim Öffnen prüfen. Keine privaten Modelle pauschal öffentlich cachen. Passenden Browser-/Origin-Kontext für Cachewiederverwendung erhalten.

**Messgrenzen:** Abrufe vom Arbeitsrechner sind keine vollständigen Handy-Bedienzeiten. Der dokumentierte Shopify-Testartikel Leuchtturm 12×8 gab automatisiert HTTP 429; vollständige Produktseite→Proxy→Editor-Strecke daher nicht erfolgreich gemessen. Kein Beweis für generellen Kundenfehler. Kein Lasttest, keine gemessenen Core-Web-Vitals für den Konfi. Vor Freigabe kalten/warmen Start, Klick während Vorladen, Variantenwechsel, langsames Netz, Datensparen, Android/iPhone und Zeit bis bearbeitbare Tafel messen.

Quellbereiche: `app/workshop/ui/shop-embed.mjs`, `shop-entry-page.mjs`, `shop-entry-client.mjs`, `app/workshop/shop-entry.mjs`, `ops/shopify/theme-block/assets/gravuru-personalisieren.js`, `background-loading.mjs`, `preload-queue.mjs`, `lazy-resources.mjs`. Die Referenzempfehlung nutzt die im Performancebericht geprüften offiziellen Shopify-/MDN-/web.dev-/Chrome-Quellen; diese Dokumentationsarbeit ist keine erneute externe Performanceprüfung.

## 9. Mobile Demo: Erhaltungsschnittstellen und Abnahmeplan

Die technische Hookprüfung auf Basis `8ffeed8d` erfolgte nur lesend. Kein neuer Testlauf, kein Browser-/Hosteingriff durch diesen ursprünglichen Prüfauftrag. Die folgende Schnittstellen-/Prüfliste bleibt als Implementierungsgrundlage erhalten; die inzwischen ausgeführten Tests, Browserhandlungen und getrennte R4-Veröffentlichung stehen in Abschnitt 13. Code und Nachweise sind mit `78a30547` auf GitHub in [Draft-PR #193](https://github.com/Chris83638w/gravuru-2027/pull/193) gesichert; kein Main-Merge.

**Integration:** vorhandenes Element `gravuru-configurator` mit offener `shadowRoot` wiederverwenden. Native Knoten und Handler verschieben, nicht klonen oder mit `innerHTML` neu erfinden. Alle Delegationen bleiben in derselben ShadowRoot. Komplette `.stage-wrap` / `.stage` / `.plate-holder` / `.scene` samt Auswahlgriffen erhalten; nur das SVG zu versetzen würde Koordinaten und Overlays auseinanderziehen. Fertigsignal `gravuru-ux-ready` abwarten. Bestehende `el.sync`-Kette nicht ersetzen.

| Funktion | Vorhandener Anschluss |
|---|---|
| Ausführung, Designs, Text, Motive, Foto/Logo | `el.uxShowSection('options'|'design'|'text'|'motif'|'upload')`; native `#ux-tab-*` / `#ux-panel-*`, hidden/disabled/aria-selected maßgeblich. |
| Undo / Redo | `[data-ux=undo]`, `[data-ux=redo]` oder `await el.action(...)`; native history/future und disabled-Zustand erhalten. |
| Speichern | `[data-ux=account]` delegiert je Kontext an Kundenentwurf/Konto, Werkstattprüfung oder Galerie. Kein universeller neuer Save-Endpunkt. |
| Vollbild, Hilfe, Ebenen, Rückweg | `[data-ux=enlarge|help|contents|back]`, bestehende Dialoge und same-origin Parent-Messages erhalten. |
| Designs / Optionen | `[data-c-design]`, `.fk-options`, `[data-picture-option]`, `[data-slate-accessory]`; Produkt-/Preiszustand bleibt nativ. |
| Texte / Schrift | `[data-ux-text]`, `[data-text-options]`, `[data-ux=fonts]`, `[data-ux-font]`; Felder werden dynamisch ersetzt, keine veralteten Referenzen halten. |
| Motive | `#panel-motif`, `[data-library-search]`, `[data-library-category]`; native Suche, Kategorien und Zählung weiterverwenden. |
| Upload / Bearbeiten | `[data-ux=photo-upload|logo-upload]`, originale Dateieingabe `[data-ux-file]`, `[data-ux=edit-upload|replace-upload|remove-content]`; Dateiauswahl an direkte Nutzeraktion binden. |
| Fotoform / Fotoabmessung / Ansicht | `[data-photo-shape]` und Fotoeditor; `[data-photo-object-size]` für tatsächliche Größe; `.ux-view-zoom input` nur Ansicht. Eck-/Drehgriffe `[data-ux-handle=scale|rotate]`. |
| Reset | `[data-ux=reset-design]` öffnet native Bestätigung; `[data-ux=reset-design-confirm]` stellt Original wieder her und erhält Ausführung/Größe. |
| Menge / Preis | `[data-fk-quantity]`, `[data-fk-total]`; echtes Mengenfeld und Preisberechnung nicht duplizieren. |
| Abschluss | `.completion-finish` öffnet die native Prüfübersicht; echte Shopübergabe erst `[data-shop-cart]` oder bei älterer Bridge `.fk-buy-button` im Reviewdialog. Ohne echte Verbindung bleibt `[data-unconnected-cart]` deaktiviert. |

**Besonderes Layoutrisiko:** `installModernMobileNavigation` hat schon Dock-Verschiebung, Scrollzustand, ResizeObserver und visualViewport-/Tastaturlogik, aber keinen allgemeinen Teardown. Eine zweite konkurrierende Shell kann Sprünge erzeugen. Demoaktivierung isolieren, Layoutverantwortung eindeutig halten, doppelte Handler vermeiden. Originale Dialoge, Fokus-/Escape-/Zurück-Verhalten und elementabhängige Rechte bleiben verbindlich.

**Gezielte Abnahme vor Demoabschluss:**

1. 360/390/430 CSS-Pixel und Querformat; Tastatur öffnen/schließen; Browserleisten; keine verdeckte Tafel oder unzugänglichen Werkzeuge.
2. Alle vorhandenen Sektionen und produktbedingt angebotenen Optionen bedienen; Design/Größe wechseln; Preis- und Personalisierungsstand stimmen. Nicht angebotene Fotos/Logos nicht künstlich aktivieren.
3. Textauswahl, Schrift sofort übernehmen, mehrzeilige Inhalte, Pflichtfeldfehler; kein Sprung beim Auf-/Zuklappen und kein versehentliches Schließen durch Scrollen.
4. Motivsuche trotz anderer Kategorie, Kategorie deutlich finden, Motiv hinzufügen/löschen, richtige native Preiswirkung.
5. Foto vollständig/zentriert, über Ecken skalieren, bewegen, maskieren, erneut bearbeiten, löschen; vorhandener Fototap löst keinen Upload aus. Logoablauf in tatsächlich erlaubtem Profil gesondert.
6. Ansichtsregler und Fotoabmessung getrennt; kein Pinch-/Mausradzoom; Undo/Redo, Ebenen und Löschen nach jeder Bearbeitungsart; Reset Abbrechen/Bestätigen mit Größe/Ausführung erhalten.
7. Vollbild/Hilfe/Zurück, Fokus und Tastaturzugänglichkeit; Speichern nur über realen Kontext. Lade-/Ressourcenfehler sperren unvollständige Sicherung sichtbar.
8. Menge/Preis → echte native Prüfübersicht; Demo bleibt ohne echten Shopcheckout. Keine Test-Erfolgsmeldung als erfolgreiche Kundenbestellung ausgeben.
9. Mehrfaches Öffnen/Schließen und Neuinitialisieren ohne doppelte Listener, verlorene Inhalte oder versteckte Werkzeuge. PC-Bestand und normaler Einstieg bleiben unverändert.

Passende bestehende Regressionen: `mobile-preview-layout`, `mobile-standard-plate`, `text-field-dismissal`, `toolbar-hosts`, `ui-event-regressions`, `view-zoom`, `photo-position-ui`, `photo-upload-geometry`, `photo-editor`, `logo-upload`, `template-deletion`, `design-reset`, `motif-browser-model`, `shop-cart`, `cart-edit`, `account-drafts`, `gallery-workbench` unter `app/configurator/variant-m/` (jeweils `.test.mjs`). Testauswahl an tatsächlichen Demodiff anpassen; keine pauschale neue Bestehensbehauptung.

## 10. Sicherungen und Wiederherstellung

Private Backups liegen außerhalb von Git. Diese MD sichert Wissen und Verweise; sie ist keine Datenbank-/Shop-/Servervollsicherung und kein Ersatz für eine unabhängige zweite Datenkopie. Keine Tokens, Kunden-/Bestelldaten oder privaten SQLite-Dateien ins Repository laden.

| Sicherung | Inhalt und belegter Zustand |
|---|---|
| `work/checkpoints/konfi-20261106T121351Z/` | UI-/Galerie-Dateistände, Patches, Inventare, zehn konsistente SQLite-Sicherungen inkl. WAL, Medien/Zuordnungen. `CHECKPOINT.json` SHA-256 `8548107bdff4b54ad2d2b8079f5a1bd6823114fa05184d281d4a20948c7c6029`. |
| `work/checkpoints/konfi-20261106T121351Z-git-complete/` | Zusätzliche Archive der sparse ausgeblendeten versionierten Dateien; ursprüngliche Sicherung unverändert. `GIT-COMPLETION.json` SHA-256 `de12d77f4d702e932853c6f01a34caec347c91518385d9f2e545055d5f40298e`. |
| `work/checkpoints/shared-resources-20261107T090130Z/` | Vor #190 vollständiges Codearchiv plus initial 237 Dateien/13 DBs, danach zwei weitere Fünf-DB-Sätze. Nach Abschluss 251 manifestierte Dateien hashgleich. Erstmanifest SHA-256 `a1b16d58fd03b8de7fcaf0a7f49167dadb4e5cce6b2a86ac74b7ee86c1abf05d`. Codearchiv SHA-256 `c1431f000ffcedab9f52a979c24bdc222b401e7a5028690fb96241019dce30b8`. |
| `work/checkpoints/browser-ressourcen-20261107/` | Vor #192 vollständiger Code und eigene Edelstahl-/Schiefer-/Foto-Testdaten; 34 Dateien, 439.694.495 Bytes, nach Abschluss hashgleich. `BACKUP.json` SHA-256 `682a73717977b302ca2f54ac4ab6c66643fb05df90ff69b7578d8383a0edd8e4`; Codearchiv SHA-256 `3478b6a3be34e058e20b6f784aa3079f1be5f7b48c90133073038b9abf231ef9`. |
| `work/checkpoints/mobile-demo-20261107/baseline-8ffeed8d.zip` | Vor der neuen Demo erfolgreiches vollständiges Git-Archiv des Ausgangscommits 8ffeed8d. Von Root bestätigter SHA-256 `e62c495dbe6544b6eb6735787ad6dd39cc8ca7e29ececaefc95d093edb0a3714`. **Codebaseline**, keine neue Host-/DB-Sicherung. |
| `/var/www/vhosts/gravuru-designwerkstatt.de/private/mobil-20261107-r4-before-publication` | Vor der getrennten statischen R4-Veröffentlichung vier Originalkopien (`start-r5.cjs`, `app.cjs`, `22x14.html`, `30x20.html`) und vollständiges Inventar der 58 bisherigen öffentlichen Dateien. Nach Veröffentlichung Originale und Public-Inventar hashgleich; `host-publication-r4.json` bestätigt `verified:true`. **Keine Datenbanksicherung**, keine Shopvollsicherung. |

Die früheren Dateizähler und Hashnachweise stammen aus den abgeschlossenen Paketberichten. In diesem Schreibauftrag wurden sie nicht nochmals sämtlich gelesen. Die neue Demo arbeitet in einer anderen Arbeitskopie; keine bestehenden Sicherungen überschreiben.

Wiederaufnahme immer in **neuem** Verzeichnis: passenden Code/Commit plus zusammengehörigen Daten-/Asset-/Importzuordnungssatz verwenden; Integrität und Hashes prüfen. Sicherungen nicht direkt als aktive Anwendung öffnen. Für V5→V4 den dokumentierten Expand-Rückweg in neuer Kopie verwenden. Ein Rückwechsel von #192 auf #190 braucht keine neue Datenmigration. Der Demo-Rückweg ist ihr getrenntes Layout/ihren separaten Einstieg wieder zu entfernen; nicht den bestehenden Konfi ersetzen. Vor jeder späteren echten Hoständerung neue konsistente Hostdaten-Sicherung erstellen; niemals lokale Testdaten auf laufende Daten schreiben.

## 11. Offene Punkte und sichere nächste Schritte

| Thema | Nächster konkreter Schritt |
|---|---|
| Mobile Demo | R4 ist getrennt veröffentlicht und geprüft; Mikails Sichtprüfung sowie physische Touch-/iOS-Tastaturfälle stehen aus. Code und Nachweise: [Draft-PR #193](https://github.com/Chris83638w/gravuru-2027/pull/193), Stand `78a30547`. Keine automatische Kundenkonfi-Übernahme. |
| #192-Sichtprüfung | Voller Editor, Schriftwechsel, Speichern, richtige Karte und erneutes Öffnen auf PC/Handyansicht nach Lösung der Browsersteuerungsstörung abnehmen. Kein Bestehen aus Paritätstests ableiten. |
| Integration | Gestapelte #189/#190/#192/Demo später gegen Astras **dann aktuellen** Stand prüfen; keine fremden Dateien oder laufenden Daten ersetzen. Aktuelle Weisung: Astra nicht stören/kontaktieren. |
| Gemeinsame Ressourcen online | Erst bei genehmigter Übernahme frische Hostsicherung, Kopier-/Paritätsprüfung, privater Proxy-/Cacheanschluss und sichtbare Abnahme. Der Code allein schaltet nichts um. |
| Tatsächlicher Galerie-Shop-Sync | Reale Registry, Freigaben, dedizierte Bilder, Hostfactory/HTTPS-Route und anschließende geprüfte Bindungs-/Warenkorbübernahme für genau eine Gruppe. Schreibschalter sind aus. |
| Neue Angebote | Alle produktspezifischen Optionen bestätigen, interne Entwürfe prüfen, erster Shopify-Anschluss/Veröffentlichung gesondert. Materialhäkchen erzeugen keine ungeprüften Angebote. |
| Native Logo-Rückspeicherung | Nur bei tatsächlich angebotenem Profil und gesondertem vollständigem Provenienz-/Original-/Ersetzen-Vertrag ergänzen; nicht ungefragt aktivieren. |
| Kundenperformance | Empfohlenes gestuftes Vorladen als eigenes Paket; doppelte Auflösungen und iframe-Schlüssel vor Aktivierung beheben. Danach echte Klick-bis-bearbeitbar-Messung, langsames Netz und Datensparmodus. |
| Produktionsfreigabe | Native Tests/Vorschauen ersetzen keine echte RIP-/Maschinenprobe und keine Design-/Verkaufsfreigabe. |

## 12. Erinnerung zuverlässig fortführen

Nach jedem abgeschlossenen Paket eine kurze überprüfbare Ergänzung mit **Nutzerentscheidung, tatsächlichem Commit/PR, Code-/Host-/Datenstand, ausgeführten Tests, offenen Grenzen und genau nächstem Schritt**. Den festen Einstieg `MIKA-START-HIER.md` anschließend auf die jüngste Übergabe verweisen lassen; frühere Sicherungen erhalten. Diese Datei und die Nachweise wurden auf GitHub gesichert: [Draft-PR #193](https://github.com/Chris83638w/gravuru-2027/pull/193), Implementierung `3afb5923`, veröffentlichte Prüfbelege `78a30547`. Dokumentationsnachträge stehen in der PR-Historie. Der ältere Dokumentationsbranch bleibt als historische Sicherung erhalten; neue Chats sollen diese aktuelle Übergabe direkt als Einstieg erhalten.

Für einen neuen Chat: zuerst diese aktuelle Übergabe, dann den aktuellen PR-Kopf/STATUS und neuere Nutzerentscheidungen lesen; den älteren festen Einstieg auf dem Dokumentationsbranch ergänzend für historische Quellen verwenden. Autorisierte laufende Aufgaben nicht durch eine neue Komplettplanung ersetzen. Entscheidungen und Testbefunde nicht vermischen; bei Widerspruch die jüngste belegte Nutzerentscheidung prüfen. Ein Chatgedächtnis allein ersetzt diese versionierte Akte nicht.

Weiterer Vorschlag, nicht als aktiv eingerichtet behaupten: eine knappe versionierte Übersicht **Code / private Galerie / Kundenhost / Produktrevisionen / letzte getestete Sicherung** und eine regelmäßige Wiederherstellungsprobe auf unabhängiger Kopie. Keine neue Automation oder zusätzliche externe Speicherung ohne besprochenen Umfang.

---

Erstellt nach Lesen der bisherigen Gesamtakte, Astras #187-Übergabe, der #185/#189/#190/#192-Übergaben, des Performanceberichts und der nativen UI-/Shop-/Galerieanschlüsse auf 8ffeed8d. Der ursprüngliche Dokumentationsschritt erstellte ausschließlich diese neue MD und ihre identische Nutzerkopie unter `outputs/`; keine Appdatei, bestehende Übergabe, Datenbank, Shop-/Hostkonfiguration oder fremde Arbeitskopie wurde dabei geändert. Der anschließend autorisierte Nachtrag ergänzt zusätzlich eigene neue Abschnitte in `STATUS.md` und `design-qa.md`; deren bisherige Historie bleibt erhalten.

## 13. Nachtrag: Mobile Demo R4 veröffentlicht und geprüft

Dieser Abschnitt aktualisiert den zuvor offenen lokalen Demo-Stand einschließlich der inzwischen abgeschlossenen getrennten Veröffentlichung. Die Aussagen zu noch fehlender Shopaktivierung, privater Ressourcen-Hostübernahme und Verkaufsfreigabe bleiben bestehen. Die Tests und sichtbaren Bedienfolgen wurden durch Root bzw. die beauftragten Implementierungsagenten durchgeführt und dem dokumentierenden Agenten mitgeteilt; dieser hat sie für die Niederschrift nicht erneut ausgeführt. Die Veröffentlichungs-/HTTP-Berichte wurden für diesen Nachtrag gelesen.

### Fertiges lokales Paket und Isolation

- Branch `dev/mika-mobile-demo-20261107`, Engine-Grundstand `8ffeed8d90191cb89f1188a336751de2b2a4e0c0`. Eigene Demo-Module und statischer Paketbau; keine neue Kunden-Preis-/Geometrielogik und kein Austausch des bisherigen Konfis.
- R4-Namespace **`/konfi-demo/mobil-20261107-r4/`**. Manifest-SHA256 **`f354482b23fb6635a1cec1621390649a6836cd2f7815e67def3f04ce0641ba06`**. ZIP **`outputs/mobile-demo-20261107/gravuru-mobile-demo-r4.zip`**, SHA256 **`713bac99dd7372eca7780f5634ac5410e47b2dfc5595670802f449c118afda94`**.
- Vollständige vorhandene Modelle: beide Schiefergrößen, 43 Hundedesigns je Größe, alle 30 Produktschriften und vorhandene Options-/Zubehörbilder. Originalmodelle bleiben unverändert; Paketkopien besitzen eigenen Namespace und eigene Browserablage.
- Die statische Demo hat **keine echte Shopify-Verbindung, keine Bestellanlage, keine Galerie-Rückspeicherung und keine Serverdatenbank**. Die nativen Funktionen bleiben Engine-Bestandteil; fehlende Konten-/Serveranschlüsse werden nicht als aktiv vorgetäuscht. Die Prüfübersicht ist benutzbar, der endgültige Checkout ist gesperrt. Daraus keine Abnahme der realen Warenkorb- oder Syncstrecke ableiten.
- Getrennte Demo veröffentlicht: [22×14 cm – frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r4/22x14.html?fresh=1), [30×20 cm – frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r4/30x20.html?fresh=1). Kein Main-Merge und kein Austausch des bestehenden Kundenkonfis oder des Shops. Astras Arbeitskopie bleibt unangetastet.
- Tatsächliche Servervorprüfung **`outputs/mobile-demo-20261107/host-preflight-r4.json`**: `verify-only`, `changesPerformed:0`, unveränderte ZIP-/Manifest-Hashes, 58 bereits bestehende öffentliche Dateien. Ihr Inventar-SHA256 ist `d3506ad4391b42069b6a44fb9c33dbbc4bcbdf4576007abb3e3e0347f2c8f6ed`. Danach getrennt ausgeführte Veröffentlichung, siehe folgende Nachweise.
- **`outputs/mobile-demo-20261107/host-publication-r4.json`** bestätigt `verified:true`, `originalFilesUnchanged:true`, `oldPublicInventoryUnchanged:true`. Alle 58 bisherigen öffentlichen Dateien plus `start-r5.cjs`, `app.cjs` und beide alten HTMLs sind hashgleich. Kein Neustart, keine Routeränderung, `shopWrites:0`, `databaseWrites:0`. Der neue Demo-Namespace enthält 2002 Paketdateien und die getrennte Auslieferungsregel `.htaccess`.
- Private Sicherung **`/var/www/vhosts/gravuru-designwerkstatt.de/private/mobil-20261107-r4-before-publication`** enthält vier Originalkopien und das vollständige Public-Inventar. Dies ist keine Datenbanksicherung und keine Shopvollsicherung. Der bestehende öffentliche Datenbestand wurde vor/nach Veröffentlichung vollständig auf die gleichen Inhalts-Hashes geprüft.
- **`outputs/mobile-demo-20261107/http-public-r4.json`**: sechs Stichproben über HTTPS (beide Einstiegs-HTMLs, JS, CSS, Katalogsegment, Motiv-JSON) liefern HTTP 200, gzip, passende MIME-Typen, `manifestMatch:true`, `no-store` und `noindex, nofollow, noarchive`; Gesamtergebnis `allMatch:true`. Die einzelnen PC-Abrufzeiten sind kein physischer Handy- oder Lasttest.
- Öffentliche Demo zusätzlich in Chrome bei 390 px bedient: Start zeigt Bruno und 19,99 €, fünf Werkzeuge vorhanden; Kategorie Blumen plus „kreuz“ liefert 18 Treffer. Keine Konsolenwarnungen oder -fehler in diesem Ablauf. Die weiteren dokumentierten Bedienprüfungen verteilen sich auf lokale R1–R4-Stände mit gleicher Engine; kein vollständiger zweiter R4-/Online-Durchlauf aller Fälle behauptet. Die öffentlichen R4-Dateihashes entsprechen dem fertigen R4-Paket.
- Repositorykopien der HTTP-/Hostnachweise und Screenshots stehen in `docs/reviews/2026-11-07-mobile-demo/`. Lokale Demo-Server 8217–8220 sind nach Prüfabschluss beendet, der öffentliche statische Demolink bleibt erreichbar.

### Abgleich mit den neuesten Kundenfunktionen

Die alte lokale `scalable-*.json`-Quelle hatte bei jedem der 43 Namen je Größe noch `workshopElementRights[designId]['text-1'].delete:false`. Die veröffentlichten Kundenvorschau-HTMLs enthielten schon das vom Nutzer bestätigte `delete:true`; außerdem war dort der Sammlungsfilter deaktiviert. Der Paketbau übernimmt genau diese bereits bestehenden Einstellungen in seine Kopien. Designs, tatsächliche Geometrie, Fonts, Bilder, Preise und andere Optionen bleiben erhalten. Das Namensfeld bleibt im Datenmodell `required:true`; die native Löschfunktion unterstützt ausdrücklich ein löschbares Pflichtfeld. Kein pauschales Abschalten von Pflichtfeldern oder globalen Rechten.

Das am 07.11. gesicherte Live-Hauptbundle hat SHA256 `e0ff77fa2b515c62d0db230d4905c015327bba9b084027daf0f70a2fe893a12d` und entspricht dem dokumentierten R12-Paket `editor-f5c81c94a6bbe07a.mjs`. Lesender Vergleich: **16/16 eingebettete CSS-Dateien gleich**, **141/149 Hauptmodule nach den belegten Host-URL-Umschreibungen und derselben Bundlertransformation identisch**. Die übrigen Unterschiede sind aktuelle Galerie-/Ressourcen-/Sortier-/Kontur-Erweiterungen sowie der neuere getrennte KGL/KRA-Iconstand. Es wurde kein zurückgenommener veröffentlichter R6–R12-Kundenfix gefunden. Keine neue Live-Browser- oder Einzelprüfung sämtlicher Lazy-Nebenbundles damit behaupten.

Der überflüssige Text „Für dieses Element änderbar …“ steckt bereits im echten R12 (`customer-rights.mjs`). Seine Ausblendung war bisher nur im unveröffentlichten festen-Werkzeugtest `4548fa67`, `fixed-tools-preview.css`, an dessen Testflag gebunden. Die neue Demo blendet ihn ausschließlich in ihrem eigenen Layout aus; die Rechteprüfung bleibt erhalten. Das komplette alte feste-Werkzeuglayout wird nicht zusätzlich zur neuen mobilen Shell eingeschaltet.

### Tatsächliche lokale Bedienprüfung

Gemeinsame Prüfbilanz aus **R1 bis R4 mit gleicher Engine**: R1 Design/Größe/Schrift/Maske/Vollbild; R2 Undo/Namenlöschen; R4 Foto-Eckdrag/Regler/Fotolöschen/Reset/Querformat sowie öffentliche Suche/Werkzeuge. Nicht jede Handlung wurde in R4 erneut ausgeführt. Grundplatten- und 43-Design-Datenhashes sind erhalten; nicht alle 43 Designs einzeln visuell geprüft.

| Ablauf | Belegtes Ergebnis |
|---|---|
| Designs | 43 Designs verfügbar, Bruno → Emma gewechselt. |
| Größe / Preis | 22×14 → 30×20, Basispreis 19,99 → 24,99 €. |
| Suche über Kategorie | Blumen gewählt, „kreuz“ gesucht: 18 Treffer. |
| Motiv hinzufügen/löschen | Aufpreis 1,69 €; nach Löschen vorheriger Preis wiederhergestellt. |
| Schriftwahl | Cinzel direkt übernommen; Auswahl schließt. |
| Foto | Original vollständig eingefügt; Herzmaske gewählt und Übernehmen ausgelöst. |
| Foto-Eckgriff / Bedienung | Chrome-Mauseingabe zog den Eckgriff tatsächlich: Größe 130 → 156; Bildrechteck 197,36×138,15 → 236,80×165,76 px; Seitenverhältnis 1,4286 unverändert. Fotoklick öffnet keinen Upload; Pfeiltaste nach rechts verschiebt; Größenregler per Pfeiltaste nach links 156 → 155,9. PC-/Chrome-Nachweis, keine physische Touch-Abnahme. |
| Reset | Bestätigung vor Rückkehr zur gewählten Originalvorlage. |
| Rückgängig / Wiederholen | Namensänderung Luna ↔ Bruno über native Historie. |
| Namensfeld löschen | Tatsächlich gelöscht und mit Undo wiederhergestellt. |
| Vollbild | Native Ansicht geöffnet und sicher in die Demo zurückgekehrt. |
| Abschluss | Prüfübersicht zeigt Werte; endgültiger Checkout bleibt gesperrt. |

Visuell geprüfte CSS-Viewports: **360×740, 390×844, 430×932, 844×390** (rechter Werkzeugbereich im Querformat) sowie **1440×900** mit zentrierter **600-px-Demo**. Keine physische Smartphone-Abnahme. Lokale Screenshots: `outputs/mobile-demo-20261107/demo-start-390.jpg`, `demo-werkzeuge-390.jpg`, `demo-text-430.jpg`, `demo-text-844x390.jpg`, `demo-desktop-1440.jpg`. Das Foto ist die neutrale Testdatei `foto-test-komplett.png`, kein Kundenfoto. Zakeke wurde zuvor mit eigenem neutralem Testtext und Referenzmotiv tatsächlich bedient; dessen Produktgrafiken werden nicht in die Gravuru-Demo kopiert. Details und Grenzen stehen im neuen Abschnitt von `design-qa.md`.

### Automatisierte Prüfungen und verbleibende Grenzen

**22/22 gezielte Tests bestanden:** zehn Fälle in `app/configurator/mobile-demo/demo.test.mjs`, sechs in `ops/mobile-demo/build.test.mjs` und sechs in `ops/mobile-demo/publication.test.mjs`. Unter anderem native Knoten/Callbacks und Produktrechte, Undo/Redo, Vollbild samt Rückkehr/Fehler, Validierung/Fokus, rückbaubare Installation, vollständige Modell-/Font-/Bilddaten, Namespace-/Symlinkschutz, inventarisierte statische Auslieferung, erlaubte Lesewege und gesperrte Shop-/API-Schreibwege. Die sechs Veröffentlichungsfälle sichern standardmäßig lesenden Modus, additive Bereitstellung mit privater Sicherung und bytegleichem Bestand, Abbruch bei geänderten Vorbedingungen vor jeder Sicherung/Schreibaktion, Überschreibschutz, vollständige ZIP-Manifestrekonstruktion und Abwehr von Traversal-, doppelten, nicht inventarisierten oder Symlink-Einträgen ab. Der öffentliche Abruf-/Bestandsschutz-Nachweis wurde zusätzlich tatsächlich erbracht und ist oben getrennt dokumentiert.

**Noch offen und nicht wegzuformulieren:**

- Physische Touchgesten und iOS-Bildschirmtastatur.
- Foto-Eckgriff ist per PC-Mauseingabe geprüft; Fingerbedienung auf einem physischen Smartphone bleibt offen.
- Kein neuer Einzel-Sichtfreigabelauf über alle 43 Designs.
- Keine echte Konto-/Galeriespeicherung und kein Shopify-Kauf aus dieser Demo. Deren reale Anschlüsse bleiben wie in Abschnitt 6 separat zu aktivieren und abnehmen.
- GitHub: [Draft-PR #193](https://github.com/Chris83638w/gravuru-2027/pull/193), Implementierung `3afb5923`, Prüfbelege `78a30547`; kein Main-Merge.

Genau nächster Schritt: Mikails Sichtprüfung der getrennten Demo und verfügbare physische Touch-/iOS-Tastaturfälle. Code und Nachweise sind in Draft-PR #193 gesichert. Eine spätere Übernahme in den Kundenkonfi bleibt ein eigener abgestimmter Schritt. Bestehenden Kundenkonfi, Live-Shop und Astras Arbeit weiterhin unangetastet lassen.


## 14. Nachtrag: Demo R5 mit Textbearbeitung und PC-Ansicht

Die von Mikail gesammelten Bedienwünsche sind ausschließlich in der Demo umgesetzt. Die aktuelle [R5-Übergabe](2026-11-07-mobile-demo-r5-bedienung.md) enthält Umfang, Codesicherung, Paket- und Servernachweise sowie Grenzen. [Neue Demo](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r5/22x14.html?fresh=1); [PC-Screenshot](../reviews/2026-11-07-mobile-demo/demo-r5-desktop-online-1440.jpg).

38 gezielte Tests bestanden. Native Eingabefelder/Schrift-/Fotofunktionen und fachliche Daten bleiben erhalten. 2061 bisherige öffentliche Dateien und vier Originale nach separater R5-Bereitstellung unverändert; private Sicherung vorab. Keine Änderung an den in dieser Akte beschriebenen Galerie-/Sync-Verträgen, Produktgruppen-Bestätigungen oder ursprünglichen Kundenwegen. Konto, Galerie-Rückspeicherung und tatsächlicher Kauf bleiben in der statischen Demo unverbunden. Kein Main-Merge, kein Astra-Eingriff.

Nächster Schritt: Mikails physischer Handy-Tastaturtest und Sichtprüfung, danach gesonderte Entscheidung über die spätere Integration. Physische Android-/iOS-Tastatur und Touchgesten sind durch den simulierten 390×430-Test nicht abgenommen.

## Nachtrag: Demo R8, 07.11.2026

Desktop-Werkzeuge oben, Ansicht/Fotogröße/Reset unten, Foto-Panel vor Upload und Canvas-Auswahl öffnet zugehöriges Werkzeug. Material/Größe/Befestigung scrollen im Auswahlpanel, i-Informationen bleiben erhalten. 93/93 Tests, getrennt veröffentlicht mit privater Hostsicherung. [R8-Übergabe mit Nachweisen und zusätzlichem Vollbild-Befund](2026-11-07-mobile-demo-r8-desktop-und-sprunglinks.md). R7 und Kunden-Konfi unverändert. Designgruppen-/Shop-Synchronisierungsregeln bleiben unverändert; Backend ist der nachgelagerte Arbeitsschritt.
