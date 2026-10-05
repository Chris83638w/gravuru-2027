# Gravuru 2027 – vollständige fachliche und technische Chat-Übergabe

**Aktualisierung während der Sicherung:** Der Nutzer meldet „Ist wieder da“. Wir bleiben im bestehenden Chat. Die Zusammenfassung/Sicherung wird trotzdem fertiggestellt; ein neuer Chat wird derzeit nicht angelegt. Die Startnachricht ist eine vorsorgliche Wiederaufnahmehilfe.

Stand der Sicherung: 05.10.2026, UTC. Auftraggeber und Kontozuordnung: Mikail / „mika“ (Nutzerangabe). Anlass: Der laufende Chat ist auf dem Handy noch erreichbar, auf dem Laptop nicht mehr auffindbar; der vorgeschlagene direkte Chat-Link liefert laut Nutzer 404. Der Nutzer verlangt eine detaillierte Sicherung und einen neuen Chat. Diese Übergabe bewahrt den vorhandenen Neuaufbau, statt eine neue Migration oder alte Pipeline zu beginnen.

## 1. Was diese Sicherung belegt – und was nicht

Die Übergabe wurde aus dem hier verfügbaren Gesprächsverlauf und dem tatsächlich gelesenen aktuellen Repository erstellt. Sie ist eine ausführliche Zusammenfassung, **kein wortgetreuer vollständiger Chat-Export**. Ein Chat-Lesewerkzeug antwortete beim Sicherungsversuch nicht. Andere Chats wurden nicht erfolgreich durchsucht. Die Ursache des verschwundenen Chats ist unbestätigt; aus einem 404 folgt kein nachgewiesener Verlust des Quellcodes.

GitHub wurde in diesem Sicherungslauf mit `git ls-remote` und `git fetch` tatsächlich erreicht. Die Sicherung enthält den aktuellen versionierten Quellstand, vorhandene Referenzen und Entscheidungen. Sie enthält **keine privaten Werkstattdatenbanken, Browserentwürfe, persönlichen Uploads, Passwörter oder Tokens**. Vorhandene private Laufzeitdateien werden weder gelöscht noch überschrieben. Deren dauerhafte Sicherung ist mit dieser Code-/Dokumentsicherung nicht bewiesen. Keine Produktänderung, Installation, neue Testserie oder Veröffentlichung gehört zu diesem Rettungsschritt.

## 2. Verbindlicher Einstieg und gesicherter Code

| Angabe | Nachgewiesener Stand |
| --- | --- |
| Repository | https://github.com/Chris83638w/gravuru-2027 |
| Aktueller Produktbranch | `task/form-direct-edit-20261005` |
| Remote-Codecommit, am 05.10.2026 erneut gelesen und abgerufen | `0265ed5ad83c05fd3d7569ccb522b75e8b464e94` |
| Git-Baum dieses Commits | `d08741d8057ba22959d272f96d9f00e3ee2ff235` |
| Bestehender Arbeitsbereich | `/workspace/gravuru-form-products-20261005` |
| Lokaler Commit dieses Arbeitsbereichs | `ef6468cf922316fc1cd7950f1a7d1357dca6c75c` |
| Grund der verschiedenen Commit-IDs | Lokaler Commit dokumentiert den vorherigen GitHub-API-Commit; beide besitzen denselben vollständigen Git-Baum. Kein abweichender Produktinhalt. |
| Sicherungsbranch | `docs/chat-recovery-mika-20261005`, direkt vom abgerufenen Remote-Codecommit abgezweigt |
| Isolierter Arbeitsbereich der Sicherung | `/workspace/gravuru-chat-recovery-20261005-repo` |
| Erhaltene Arbeitsänderungen | `CLOUD-AKTUELL.md` und `README.md` im ursprünglichen Arbeitsbereich; nur Zeilenenden unterscheiden sich, `git diff --ignore-space-at-eol` ist leer. Nicht zurückgesetzt. |

Der Sicherungscommit ergänzt Dokumente und einen Verweis in den Einstiegen; er verändert keinen Produktcode. Seine endgültige SHA steht im mitgelieferten Sicherungsmanifest. **Nicht auf `main`, G27-01, den historischen Migrationsbranch oder `1b4626e…` zurücksetzen.** Der zuletzt gemeinsam entwickelte Stand ist maßgeblich. Historische „nächste Schritte“ in älteren Abschnitten sind keine aktuellen Blocker.

Cloud: Die vorhandene Arbeitsaufgabe war zuvor durch Laufzeitstatus als verbunden/running, Provider cloud bestätigt; Linux/Node 24.19.0 und Python 3.12.14 waren dokumentiert. Beim jetzigen Rettungsschritt reagierte das Statuswerkzeug nicht erneut, die Cloud-Shell und Git-Fernabfrage funktionieren. Ein `/workspace`-Pfad allein wird nicht als neuer Konto-/Cloud-Nachweis ausgegeben. Der Anzeigename „mika“ stammt vom Nutzer. Kein Laptopzugriff.

## 3. Projektziel und Arbeitsweise

Wir bauen die **neu konzipierte Gravur-Designwerkstatt mit Dashboard** auf und verwenden brauchbare bestehende Teile weiter: Kundenkonfigurator, Werkstatt, Profile, SVG/PDF-Import, Excel-Stapelanlage und geprüfte Ressourcen. Die alte Pipeline war unzureichend. Das Ziel ist weder eine bloße Wiederherstellung dieser Pipeline noch ein Neustart von null.

M01 (Übersicht), M02 (Bearbeitung), C01–C04 und die nachfolgenden Nutzerentscheidungen bestimmen die Oberfläche. Der Screenshot mit „Unser Anfang“, sechs Sockeln und früher 57 Tests war ein älterer G27-01-Stand, kein Auftrag zum Rückbau. Aktuelle G27-02-Funktionen bleiben erhalten. Nur 2D; AR ist vertagt.

Ausschließlich in der vorhandenen Cloud entwickeln, unabhängig vom eingeschalteten Laptop. GitHub bewahrt Code und Entscheidungen zwischen Konten/Chats. Work darf Bilder, Gestaltung und ausdrücklich übergebene Entwürfe liefern; automatischer gemeinsamer Chatverlauf oder automatisch identischer Dateizugriff wird nicht versprochen. Pro Umsetzungspaket eigener Branch, prüfbarer Abschluss und dokumentierte Grenzen. Bei klarer Aufgabe selbstständig fortfahren; nur für tatsächlich notwendige Entscheidungen unterbrechen.

Keine Geheimnisse/Kundendaten in Git oder veröffentlichte Snapshots. Kein Reset, Force-Push, Merge, eigenmächtiges Live-Deployment, Plesk-/Serverumbau, Kauf oder neue Cloud-Umgebung. Spätere echte Shopify-Installation erst nach Entwicklungsstore-Test und Abnahme. Ein gemeinsamer neuer Server ist **keine Voraussetzung**, um mit synthetischen Daten am Code weiterzuarbeiten.

## 4. Verbindliche Begriffe und Originaltreue

- **Motiv:** ein einzelnes Element, das einer Gestaltung hinzugefügt wird.
- **Design:** die gesamte Gestaltung einer Platte/eines Acrylglases einschließlich Fotos, Texten und Motiven.
- Originaldesign 1:1 als Vorlage erhalten: Linien, Farben, Fotobeispiel und Beispieltexte nicht ungefragt ersetzen oder neu zeichnen. „Pia & Rafael“ bleibt zunächst sichtbar und ist erst bei Kundeneingabe zu ändern.
- Das Originalfoto bleibt mit einem Hinweis zum Hochladen eines eigenen Fotos sichtbar. Ein Foto-Slot ist kein Ersatz für das gesamte Design.
- Der massive Holzblock verdeckt unten **7 mm**, vom Nutzer ausdrücklich bestätigt. Szenen-/Sockelgeometrie muss in normaler und großer Vorschau übereinstimmen. Der verdeckte Plattenbereich wird nicht allein deswegen aus dem Druck entfernt. Für weitere Sockel gelten deren dokumentierte Maße, keine pauschale Übertragung.
- Flache Rasterbilder/Pfad-PDFs sind nicht automatisch in echte Text-/Fotoobjekte zerlegbar. Vorhandene getrennte Ebenen übernehmen; fehlende Semantik ausdrücklich zuordnen und visuell prüfen. Keine angeblich verlustfreie automatische Rekonstruktion.

## 5. Kundeneditor und Backend-Rechte

### Bedienung

- Das eigentliche importierte Design bleibt fest. Kundentexte, Kundenfoto und hinzugefügte Texte/Motive sind standardmäßig frei bearbeitbar/positionierbar, soweit das Backend die entsprechenden Rechte erlaubt.
- Im Backend je Feld wählen: fester Textbereich mit veränderbarem Inhalt oder frei verschiebbares Feld. Inhalt, Farbe, Ersetzen, Verschieben, Skalieren, Löschen sind getrennte Rechte und auch serverseitig durchzusetzen.
- Vorlagenelemente nur nach ausdrücklicher Freigabe im Backend und bewusstem Entsperren in der Kundensitzung löschen. Rückgängig stellt sie wieder her und sperrt erneut. Originalvorlage und historische Bestellungen unverändert lassen. Pflicht-/technische Elemente nicht freigeben. Ein flaches Design enthält dadurch nicht plötzlich separat löschbare Einzelobjekte.
- Direkter Doppelklick/Doppeltipp auf Text öffnet Live-Bearbeitung; erster Fokus markiert den gesamten Beispieltext, spätere Klicks ermöglichen Cursorpositionierung. Schriftfamilien, verfügbare Fettschnitte und Kursiv; fehlende echte Fettschnitte nicht erfinden. Schriftgröße **nur ganze mm**, Plattenformat unverändert.
- Foto hinter festem Ausschnitt verschieben, vergrößern/verkleinern, zuschneiden, drehen, Graustufen und weitere freigegebene Filter wie Sepia. Original erhalten. Kein Scrollsprung nach Upload. Foto-Karte: **Bearbeiten vor Ersetzen und Entfernen**.
- Auswahlgriffe, Größenänderung, Drehung und Entfernen entsprechend Rechten erhalten. Kein störender dauerhafter grüner Rahmen um das Foto.
- Im Bearbeitungsfenster oben links große Gesamtvorschau mit Foto, Texten und Design; bündiger Hinweisrahmen leuchtet bei ersten Änderungen kurz auf, nicht dauerhaft. Reduzierte Bewegung beachten.
- Vorschau durch Klick auf die seitlichen freien weißen Außenflächen schließen; Produkt, Editor und dessen innere weiße Bereiche bleiben bedienbar.
- Bei **null oder einem auswählbaren Design** kein Designs-Tab und keine leere Designauswahl, bei allen Produkten. Ab zwei Designs Vorschauauswahl anzeigen.
- Motive in kompakterem Raster zeigen. Neu hinzugefügtes Motiv möglichst auf freie Fläche setzen. Motivfarbe direkt wählbar; runde Vorgaben Schwarz, Weiß, Grau, Terrakotta, Dunkelgrün und Goldton plus eigene Farbe. Goldton ist Druckfarbe, kein metallischer Druckkanal.
- Oberfläche neutral in Weiß/Hellgrau/Graphit; Druckfarben und Originalbilder bleiben davon unabhängig.
- Druck darf überlagerte Elemente enthalten: keine Überlagerungswarnung. Gravur behält entsprechende Hinweise. Mechanische Kontur-/Loch-/Randfehler davon getrennt prüfen.

### Verwaltung und Modelle

M01 soll tatsächliche vollständige Produkt-/Designvorschauen zeigen. M02 verbindet Elementauswahl, große Vorschau und Eigenschaften; vorhandene Revisionen, Kopien, Master und Importwege wiederverwenden. Entwurf speichern, neu laden, Historie, Konflikte und Wiederherstellung funktionieren gemeinsam mit stabilen IDs.

Maße in mm, Preise in Cent. Produkt-, Größen-, Sockel-, Halterungs-, Material-, Kontur-/Bohrungs-, Design-, Profil- und Preislogik nicht duplizieren. Bestehende 28 Acrylkombinationen erhalten. Referenzpreise stehen in `UMSETZUNGSPAKETE.md` (u. a. 150×200×3 mm 1499 Cent, 200×266,7×3 mm 1999 Cent, groß/Eiche/Wandhalterung 3697 Cent).

Gelungene Bestellgestaltung als **privaten neuen Produktentwurf** übernehmen können. Vorher Vorschau/Prüfung; Kundentexte nur ausdrücklich übernehmen, Kundenfotos zu austauschbaren Bereichen machen. Keine automatische Veröffentlichung einer Kundengestaltung.

## 6. Druck, Gravur und Download – letzte gültige Entscheidungen

Standard der technischen Druckausgabe: **nur PDF, CMYK, 300 dpi, Roland `RDG_WHITE`, Weiß ausschließlich unter bedruckten Flächen, kein Farbüberdruck**. Mimaki-Vektorfüllung als Weißersatz beim Download auswählbar. Optional ZIP mit gesicherten Daten und Originalfoto separat. Frühere RGB-/600-dpi- oder vollflächige Weiß-Defaults sind durch die späteren Festlegungen überholt.

Weiß liegt unter Text, Foto, festem Design und hinzugefügten Elementen, soweit sie drucken. Freies durchsichtiges Acryl, transparente Fotoanteile und Bohrungen bleiben frei. Eine weiße PDF-Seitendarstellung ist kein Beleg für einen Weißkanal. Die ursprüngliche Corel-Meldung „immer vollflächig“ führte zu technischer Prüfung; eine echte Corel-/RIP-Freigabe wurde nicht durchgeführt.

Optionaler Farbüberdruck bis 1 mm nur dort, wo Druck an die äußere Kontur reicht bzw. vollflächig gedruckt wird. Kein pauschaler Zusatzrand um jedes innere Motiv und kein Skalieren der ganzen Gestaltung. Schnittmaß und Innenkonturen erhalten. Weißüberdruck separat, Default 0 mm. Ein älterer Wunsch „1 mm umlaufend, vollflächig“ ist nicht der aktuelle Weiß-Default.

300 dpi betrifft Rasteranteile. 600 dpi bei besonders feinen Rasterdetails empfehlen, nicht ungefragt aktivieren; geringe Fotoauflösung wird damit nicht repariert. Echte Schrift-/Konturpfade bleiben Vektoren. Materialszene, Holzsockel, Uploadhinweise und Bearbeitungsgriffe gehören nicht in die Produktionsdatei. Originalbilder, Alpha, physische Kontur und genau einmalige Spiegelung anhand des konkreten Profils beachten.

Gravur: getrennte Raster-/Vektorausgabe ohne Druckweiß. Flache Fotos nicht als echte Vektoren deklarieren. Farbumwandlung ist derzeit generisch DeviceCMYK, **kein gemessenes/freigegebenes Material-ICC-Profil**. Halbton-/Weißregeln und Maschinenparameter müssen real abgenommen werden.

Produktionsdownload künftig im Backend. Kundenkonto-Download nur mit authentifiziertem Kunden und nachgewiesenem bezahlten eigenen Auftrag. Vorübergehender Downloadbutton auf der privaten Acryl-Testseite war ausdrücklich zum Testen erlaubt, keine öffentliche Downloadberechtigung.

Bestätigte Maschinen: **Roland LEF-200, Roland MO-240, VersaWorks; Mimaki 2513 EX.** Der Nutzer sagte zur Mimaki-Software „die von Mimaki“. Genauer RIP-Name/Version ist nicht bestätigt; RasterLink nicht als Tatsache einsetzen. Gravurmaschine, konkrete ICC-/Materialparameter und physische Druck-/Gravurprobe fehlen.

## 7. Tatsächlich implementierter neuester Stand

Das aktuelle Repository umfasst Werkstattverwaltung, Profile/Revisionen, Designimport mit ausdrücklichen Kundenfeldern, Excel-Stapel, freie Formkonturen/Bohrungen, Formprodukte, Materialvorschauen, Kundenentwürfe, unveränderliche Prüfstände, technische Druck-/Gravurausgaben, versionierte Fertigungsprofile, persistente Ausgabeaufträge, Shop-Vorbereitung sowie synthetische Bestell-/Warenkorbprüfungen.

Zuletzt abgeschlossen: direkte Formprodukt-Text-/Fotobearbeitung mit vollständiger Produktvorschau, ganzen Schrift-mm, Farben, echten Schriftvarianten, Feldrechten, Auswahlgriffen, expliziter Löschfreigabe, Übernehmen/Abbrechen und Touch. Abbrechen stellt auch bei verspäteten Antworten den vorherigen Entwurf wieder her. Eiche/Buche/Kirsche/Leder verwenden vier getrennt aus vorhandenen Referenzen abgeleitete leere Materialtexturen; Edelstahl bleibt erhalten. Herkunft und Prüfsummen stehen unter `app/workshop/ui/material-surfaces/`. Diese Bilder sind keine Hersteller- oder Materialfreigabe und gelangen nicht in Druckseparationen.

Detaillierter Abschluss: `docs/dashboard-20261004/DASHBOARD-DIREKTBEARBEITUNG-ABSCHLUSS.md`. Aktuelle Aufnahmen: `form-direct-text.png`, `form-direct-photo.png`, `form-direct-mobile.png`, `material-four-cards.png` im selben Verzeichnis. Nicht sämtliche historischen Wünsche sind damit pauschal als vollständig abgenommen erklärt.

### Nachgewiesene Paketfolge (Auszug, jeweils GitHub-Commit)

| Paket | Commit | damalige Tests |
| --- | --- | ---: |
| Direkte Bearbeitung/Materialbilder | `0265ed5ad83c05fd3d7569ccb522b75e8b464e94` | 226 |
| Produktentwurf aus Testbestellung | `2c932f013332f827ec7471aab1b8bbb42186ae6a` | 222 |
| Warenkorbvorbereitung | `7786a685bb8d4e876805a5196f88280abdca601c` | 219 |
| Signierte synthetische Testbestellungen | `0785d0fe7bfe2f6266996382b09220139ddfd642` | 215 |
| Shop-Vorbereitung | `a06d821bd5389016d92d0ff0087c7f066c4f864a` | 211 |
| Technische Gravur | `82db3b5798ae9b27443e041f94c4517fd3b2f0a7` | 208 |
| Persistente Ausgabeaufträge | `6a23acc56a7f98f629107dd4f8769a901a2af164` | 204 |
| Fertigungsprofile | `720d0d1243375109cc237dac4ef9d7d87e416f0a` | 201 |

Diese Angaben stammen aus den bestehenden Paketnachweisen und der verfügbaren Übergabe; in diesem Rettungsschritt wurden nicht alle früheren Remote-Commits erneut einzeln abgefragt.

## 8. Prüfstand sauber getrennt von aktueller Rettung

Dokumentierter letzter vollständiger Cloud-Check: **05.10.2026, 15:32:54–15:33:48 UTC (17:32:54–17:33:48 Berlin)**. `node scripts/cloud-check.mjs`: Referenzen und Python/PyMuPDF 1.28.2 geprüft, dieselben Testdateien wie `npm test`, **226 Tests / 0 Fehler / 0 Skips**; Build **76 Ressourcen / 1 Modell / 461440 Editorbytes**. Der zusätzliche Materialatlas gehört zum Werkstattbaum; 76 ist nicht die Gesamtdateizahl des Projekts.

Dokumentierte Browserprüfung: Cloud-Chromium Desktop 1536, Mobil 390, Tablet 768, tatsächliche Touch-Doppeltipps, Text/Fotos/Griffe, Feldrechte, Speichern/Neuladen, Abbruch mit verzögerter Antwort, Entsperren/Löschen/Rückgängig, Designauswahl und Materialkarten. Synthetische Daten; keine echten Bestellungen. Frühere Fehler (veraltete Eichen-Testannahme, `fitz`-Deprecation in JSON, verlorenes Doppelklickziel) wurden im damaligen Lauf behoben und nachgeprüft.

**Jetzt neu geprüft:** Remote-Branch/SHA/Baum, vorhandene Dokumente und Referenzen, ungesicherte Änderungen sowie Integrität/Umfang der Sicherung. **Jetzt nicht erneut ausgeführt:** npm-Tests, Build, Browser-, Corel-, RIP- oder Maschinenprüfung. Der damalige rohe JSON-Report war am angegebenen lokalen Berichtspfad beim Rettungslauf nicht vorhanden; der versionierte Abschlussnachweis und die Aufnahmen sind vorhanden. Keine erfundene neue Abnahme.

## 9. Originale, Screenshots und Muster

| Quelle | Verfügbarkeit / Rolle |
| --- | --- |
| `docs/dashboard-20261004/referenzen/M01.png`, `M02.png`, `C01.png` bis `C04.png`, `MANIFEST.json` | Tatsächlich versionierte Bildreferenzen; M01 Übersicht, M02 Bearbeitung. |
| `SCREENSHOT-REFERENZEN-20261003.zip` | Versionierter Referenzcontainer, in Vollsicherung enthalten. |
| `REFERENZ-MATERIALIEN-20260930.zip` | Versionierte Materialreferenzen. Dekorierte Muster nicht als reine unbedruckte Oberfläche ausgeben; Edelstahl v4 verwenden. |
| Weitere `REFERENZ-*.zip` und `Gravuru-2027-Quellstand-20261003.zip` | Eingefrorene historische Quellen, keine neuere aktive App als der aktuelle Quellbaum. |
| `docs/dashboard-20261004/MUSTER-ACRYLGLASBILD.md` | Nachweis des separat gesicherten privaten Acrylmusters. |
| `docs/dashboard-20261004/UV-DESIGN-PILOT.md`, `UV-ORIGINAL-KORREKTUR.md`, `VORLAGENFORMAT.md`, `PRODUCT-DESIGN-AUFTRAG.md` | Quellen, Pilot, Importformat und Auftrag an Product Design; aktuelle Korrekturen überstimmen frühe Pilotnotizen. |

Das Acrylmuster „Unser kleines Glück / Pia & Rafael“ wurde laut Nachweis unter `task/unlock-design-elements-20261005`, Commit `f4c9a2068f7d159def5f88f2a841bf01c1a59bd8`, als private Site-Version 12 bewahrt. Historische Vorschau: https://gravuru-design-test-mika.gravur4you-cy.chatgpt.site/?model=acryl&v=0608ef1 . **Erreichbarkeit heute nicht neu geprüft.** Der Parameter `v` pinnt keine unveränderliche Version. Site-Version 12 erhalten; dies ist kein neuer Dashboard-/Backend-Link.

Der Nutzer hat `Master-Acrylglas-Roland-mit-Beispiel.zip` als Anhang gegeben. Laut Pilotnachweis 15316863 Bytes, SHA-256 `f49918022cb88612ea001935d8ec6db5397cfb393c0989999e1b4da684ab8f36`, 17 geprüfte Dateien einschließlich editierbarer SVG, separatem Foto und transparenter Dekoration. Historische autorisierte Quelle: privates Ressourcenrelease im **Referenzrepository** `Chris83638w/gravuru-shopify`, Tag `resources-acrylglas-150x200-20260929`. Dieses Repository nicht als Entwicklungsziel übernehmen. Originalpaket mit Personenbildern ist nicht in die neue Git-Sicherung kopiert worden; seine erneute Verfügbarkeit wird nicht behauptet.

Rund 18 UV-Designbeispiele wurden besprochen. Laut versionierter Quellenübersicht sind 13–18 teilweise mit getrennten Originalen dokumentiert, 1–12 nicht als Corel-fertige Originale belegt. Der funktionsfähige Ebenenimport eines Piloten beweist keine automatische Umwandlung aller 18 flachen Bilder. Vor einem Serienlauf verfügbare Originale und Pixel-/Schrift-/Feldtreue prüfen; keine fehlenden Entwürfe erfinden.

## 10. Datenmigration und frühere Cloudnachweise – historisch

Migrationsbasis `infra/gravuru-2027-cloud-20261003`, `f7c3f24db55003c28fec5274dfc5df2736926b6b`. Neue damalige Cloud-Abnahme: Marker `5e40517a85a07d7226989b3863ce025f382aaa20`, 137 Tests ohne Fehler/Skips, Build 76/1, HTTP-/Host-/Origin-/CSRF-Prüfungen und Cloud-Push. Historischer Einstieg `infra/cloud-only-handoff-20261004`, `1b4626eab6cc2e7d22f815754583cc678e57d558`, ist inzwischen überholt, nicht Rücksetzziel.

Chris' **isolierter Restore ist bestanden**, Nachweis `docs/cloud-migration-20261003/CLOUD-RESTORE-NACHWEIS-20261004.md`, Commit `e624833aecf6382f9b5edb4c432eb4e7c81a5cb2`, Testbranch `test/cloud-restore-20261004`. Gemeldet am 04.10. um 14:13: 16 Teile / 528682206 verschlüsselte Bytes, Archive und drei SQLite-Datenbanken geprüft. Workshop 7 Produkte / 17 Revisionen / 4 Importitems; Profile 2 Profile / 2 Profilrevisionen / 1 Bibliothekseinstellung / 5 Einstellungsrevisionen; Assets 2 Originalquellen / 3 Designassets. Der dokumentierte GitHub-Leseübergabetest um 14:25 übernahm diesen Nachweis. Das sind historische Nachweise, keine Wiederherstellung in diesem Rettungslauf.

Chris' Dateien lagen privat in seiner laufenden Aufgabe. Das ist kein Beleg, dass Mikail sie hier lesen kann oder dass eine dauerhafte gemeinsame Schreibdatenbank besteht. Die Cloud-VM allein ist keine zugesicherte dauerhafte gemeinsame Ablage. Synthetische Entwicklung bleibt unabhängig davon möglich. `gravuru.de` war in der damaligen Dokumentation eine Backupquelle, **kein neu bestimmter Hostingort dieser Werkstatt**. Keine neue Serverplanung daraus ableiten.

## 11. Noch offen – konkreter nächster Entwicklungsstand

1. **Weitere Formprodukt-Parität:** zusätzliche freie Motive/neue Felder und verbleibende Kundenabläufe gezielt aus dem vorhandenen Acryl-Konfigurator übernehmen. Aktuelle Rechte, feste Vorlagen und Rückgängig beibehalten. Dies ist mit synthetischen Daten möglich, ohne neue Datenmigration.
2. **Shopify echt anbinden und testen:** Warenkorb wurde vorbereitet und GraphQL-Schema geprüft, synthetische signierte Bestellnachrichten und feste Positionen getestet. Noch kein echter Store-Checkout, keine bezahlte Kundenkonto-Downloadberechtigung, kein produktiver Storno-/Erstattungsabgleich, keine vollständige wiederholbare Produktübertragung.
3. **Wichtige Nutzerkorrektur:** Der Nutzer hat die angeforderte Shopify-Adresse bereits in einem **anderen neuen Chat** geschickt. In diesem Kontext stehen weder die genaue Adresse noch dessen Chat-ID. Nicht behaupten, er habe sie noch nie geliefert, und keine Shopadresse raten. Falls der Folgechat diese Nachricht nicht lesen kann, nur diese Adresse erneut übernehmen lassen; keine Passwörter erfragen.
4. **Echte Fertigungsabnahme:** genaue Mimaki-RIP-Angabe, reale Material-/ICC-/Maschinenparameter und Corel-/RIP-/Druckprobe. Drei bekannte Druckermodelle sind kein Gravurprofil.
5. **Gestaltung/Material:** weitere Acryl-/Schieferansichten, Materialtiefe und Szenen sowie restliche UV-Originale/Importvorlagen. Materialreferenzen und aktuelle leere Ableitungen getrennt halten.
6. **Integrationen/Zugang:** Drive-/KI-Stapel nicht als angeschlossen behaupten. Backend bisher in geschütztem Cloud-Entwicklungsserver geprüft; kein neuer extern bedienbarer Dashboard-Link. Eine spätere gehostete Operator-/Kundenanmeldung und private dauerhafte Datenablage müssen konkret umgesetzt und geprüft werden, ohne unabhängige Codearbeit zu blockieren.

Keine Prozentzahl oder „alles fertig“ erfinden. Das Projekt hat eine breite getestete Grundlage, aber keine Live-/Maschinenfreigabe.

## 12. Weiterarbeiten: Dateien, Befehle und Schutz

Zuerst diese Übergabe, `AGENTS.md`, den aktuellen Kopf von `START_HERE.md`, `STATUS.md`, `CLOUD-HANDOVER.md` und den jüngsten Paketabschluss lesen. Der Masterplan steht in `NEUE-WERKSTATT-PLAN.md`, historische Paketgliederung in `UMSETZUNGSPAKETE.md`, Bedienregeln in `docs/dashboard-20261004/MASTER-BEDIENREGELN.md`. Ältere Abschnitte ausdrücklich als historische Stände lesen.

Kernmodule unter `app/workshop/`: `http.mjs`, Formprodukt-/Design-/Kundenmodell und Stores, Prüfstände, Druck-/Gravurmodule, Fertigungsprofile, Ausgabeaufträge, Warenkorb-, Bestell- und Produktentwurfslogik. Oberfläche unter `app/workshop/ui/`, gemeinsamer bestehender Konfigurator unter `app/configurator/variant-m/`. Maß-/Preis-/Rechtelogik gemeinsam verwenden.

Dokumentierte Befehle für eine tatsächlich benötigte neue Installation in der vorhandenen Cloud, **in dieser Rettung nicht erneut ausgeführt**:

```sh
# Im eindeutig zugeordneten Checkout; vorhandene Änderungen vorher lesen und erhalten.
git status --short --branch
git remote get-url origin
git rev-parse HEAD
git ls-remote --heads origin task/form-direct-edit-20261005

# Node >=24, Python >=3.10; systemseitiges libcairo für CairoSVG erforderlich.
python3 -m pip install --target .local-data/python \
  -r app/workshop/requirements-import.txt \
  -r app/workshop/requirements-contours.txt \
  -r app/workshop/requirements-photos.txt \
  -r app/workshop/requirements-print.txt

node verify-reference.mjs
node scripts/cloud-check.mjs
# Einzelbefehle nur bei konkretem Anlass statt unnötig direkt danach alles zu wiederholen:
npm test
npm run build
npm start
```

`npm start` bindet den vorhandenen Server an `127.0.0.1:8961` und legt/benutzt private Entwicklungsdaten unter `.local-data/`. Keine solche Datei ungeprüft ersetzen; vor echter Bestandsöffnung private Sicherung/Zuordnung klären. Loopback-/Host-/Origin-/CSRF-Schutz ist keine öffentliche Benutzeranmeldung. Eine freigegebene Cloud-Vorschau nur mit tatsächlich verfügbaren Werkzeugen einrichten, Schutz nicht abschalten.

Relevante Pfade: `/werkstatt`, `/werkstatt/formprodukt`, `/konfigurator/form?configuration=<gesicherte-id>`, `/werkstatt/serien`, `/werkstatt/profile`, `/werkstatt/konturen`, `/werkstatt/pruefstaende`, `/werkstatt/fertigung`, `/werkstatt/ausgaben`, `/werkstatt/shopvorbereitung`, `/werkstatt/bestellungen`, `/werkstatt/warenkorbpruefung`. Eine localhost-Adresse in einer Cloud ist kein vom Nutzer direkt erreichbarer Browserlink.

## 13. Chatübergabe und Bediengrenze

Bisheriger Titel auf dem Handy-Screenshot: **Gravuru 2027 – Cloud – Mikail**. Bekannte Chat-ID: `01a101bb-342f-750b-b481-82c3c3a5c072`. Der aus ihr vorgeschlagene `/local/`-Link liefert laut Nutzer 404 und wird nicht erneut als funktionierender Einstieg ausgegeben. Kein Nachweis, dass ein bestimmtes Menü, anderes Konto oder Archiv die Ursache ist.

Beim Rettungsschritt ist kein Werkzeug `create_thread`, `fork_thread` oder `handoff_thread` verfügbar. Bestehende Chat-Lesewerkzeuge antworteten nicht rechtzeitig. Ein neuer Chat kann deshalb hier **nicht als angelegt bestätigt werden**. Kein Unteragent und kein geteilter Snapshot wird als echter neuer Arbeitschat ausgegeben. Die Datei `START-NACHRICHT.txt` liefert eine sofort nutzbare Übergabe für einen neuen Chat in der vorhandenen Cloud; die separate kompakte ZIP enthält diese Zusammenfassung, Startanweisung und ausgewählte vorhandene Nachweise/Ansichten.

Der neue Chat soll zuerst den Sicherungsbranch und dessen aktuellen Remote-Stand lesen, vorhandenen Checkout erhalten und die ausführbare Cloud-Zuordnung mit seinen tatsächlichen Werkzeugen bestätigen. Das ist ein kurzer Zugriffstest, keine neue allgemeine Migrationsplanung. Danach am bestehenden Neuaufbau fortfahren. Falls nur GitHub-Lesen möglich ist, diese Grenze ehrlich nennen, statt einen ausführbaren Checkout zu behaupten.
