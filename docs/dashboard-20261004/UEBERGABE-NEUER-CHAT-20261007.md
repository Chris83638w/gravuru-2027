# Verbindliche Arbeitsübergabe an „gravuru-2027 NEU“
Stand: 07.10.2026. Zusammenführung des verfügbaren Verlaufs mit dem direkt gelesenen Zielchat und dem verifizierten GitHub-Stand. Keine Live-Veröffentlichung.

## 1. Genau hier weiterarbeiten
- Bestehender Chat: **gravuru-2027 NEU**, Thread-ID `01a115b2-0173-7419-9c03-1af745f5c07c`, Host `durable`.
- Repository: **Chris83638w/gravuru-2027**. Checkout im Zielchat: `/workspace/gravuru-2027`.
- Neuester bei Erstellung bestätigter Produktstand: **dd42faf55df44686d3b6185807c35497ceba8df0**, Branch **feat/design-folder-import-20261007**. GitHub-Vergleich von Commit und Branch: identisch.
- Der Zielchat hat diesen Stand selbst erstellt und bestätigt. Nicht auf die früheren Basen 72b7041, 79c… oder den alten Branch work zurücksetzen. Eventuell inzwischen hinzugekommene Arbeit erhalten.
- **Nächstes bereits im Zielchat dokumentiertes Paket: ZIP-Import als bewusst ausgewählte Designquelle.** Vorhandene Ordner-/Pfadzuordnung und private Originalablage wiederverwenden; begrenzte Entpackung und sichere relative Pfade; erst prüfen, dann Produktanlage ausdrücklich auslösen.
- Keine neue Gesamtplanung, keine Wiederholung unveränderter bestandener Prüfungen. Anforderungen/Dateien nur bei konkretem Bedarf nachlesen. Selbstständig umsetzen, passende Prüfungen durchführen und auf eigenem Branch sichern. Nur konkrete fachliche Entscheidungen und nötige Veröffentlichungsfreigaben zum Nutzer geben.
- **Plesk bleibt pausiert. Echte Shopify-Anbindung bleibt ausdrücklich offen.** Keine Änderungen an der laufenden Werkstatt, keine Live-Veröffentlichung, kein Merge in main und kein Force-Push.
- Diese Dokumentationsübergabe ist ein separater Branch auf obiger Basis. Bei neuerem Produktstand nur die zusätzlichen Übergabedokumente übernehmen, keinen älteren STATUS über neuere Arbeit schreiben.

## 2. Bereits erledigt – nicht erneut als offene Aufgabe behandeln
| Paket | Gesicherter Stand | Nachweis |
|---|---|---|
| Cloud-Browserabnahme: Dashboard/Konfigurator, Versionen, Foto, Entwurf, Mimaki | 0202493f715d53316eb893e94fb672c4ac8eeb04 | [Bericht](CLOUD-BROWSER-ABNAHME-20261007.md) |
| Excel speichern/wiederaufnehmen, Teilanwendung, verlorene Antwort, Prozess-/SQLite-Neustart, Konflikte; UI-Fix gegen veralteten Prüfstand nach Ladefehler | cc2e7d8812a4c2036e3f381e918707660e77bc1e | [Excel-Abnahme](GESPEICHERTE-EXCEL-ABNAHME-20261007.md) |
| Kaufgebundene Test-Dateifreigaben, korrekter/falscher Kunde, PDF/ZIP, Widerruf, verspätete Antwort, Erstattung | 72b70416ecf16040b19ab774b43f5f5a67d5680d | [Dateifreigaben](TEST-DATEIFREIGABE-ABNAHME-20261007.md) |
| Design-Ordnerimport mit exakten relativen Pfaden, private Originale, aktualisierte Excel-Anleitung | dd42faf55df44686d3b6185807c35497ceba8df0 | [Ordnerimport](DESIGN-ORDNERIMPORT-20261007.md) |

Ordnerpaket: 29 gezielte Node-Tests und fünf Browser-Prüfgruppen; Desktop/390/768 ohne Überlauf oder JavaScript-Fehler. GitHub-Push zunächst fehlgeschlagen, anschließend erfolgreich und Remote-Commit bestätigt; kein noch offener Pushfehler.
Dateifreigabeabnahme arbeitet mit synthetischen Kunden, Händlersitzungen und Bestellungen. Sie bestätigt **keine echte Shopify-Anmeldung/Testbestellung**. Browserprüfungen bestätigen keine physische Maschinenabnahme.

## 3. Einstieg und vorhandene Dateien
Die beigefügte [UEBERGABE-DATEIEN-20261007.json](UEBERGABE-DATEIEN-20261007.json) enthält sämtliche vom GitHub-Gitbaum gelieferten Einträge des Produktstands, einschließlich Pfad, Größe und Git-Objekt-ID. Der Baum war nicht abgeschnitten. Git-Blob-IDs sind keine SHA256-Dateiprüfsummen. Dieses Verzeichnis belegt GitHub-Verfügbarkeit, nicht die Übertragung privater Laufzeitdaten.

Zuerst diese Übergabe und die aktuellen Kopfabschnitte von START_HERE.md/STATUS.md verwenden. AGENTS.md beachten. NEUE-WERKSTATT-PLAN.md enthält die fachlichen Anforderungen; UMSETZUNGSPAKETE.md ist teilweise historisch und ersetzt nicht den aktuellen Erledigungsstand.

Wichtige Bereiche:
- `app/workshop/`: Dashboard, Import, private Speicherung, Bestellungen, Dateifreigaben, Shopify-Testhost.
- `app/workshop/ui/`: Dashboard-Oberfläche; `batch-ui.mjs`, `variant-batch-ui.mjs`, `batch-reader.mjs`.
- `app/workshop/design-source-path.mjs`: gemeinsame Pfadregeln des neuen Ordnerimports.
- `app/configurator/variant-m/`: vorhandener Konfigurator; keine zweite konkurrierende Kundenoberfläche entwickeln.
- `app/workshop/templates/produktserie.xlsx`: **aktuelle** Vorlage einschließlich neuer Ordnerpfad-Anleitung. Ältere Sichtprüfungs-Kopien nicht als aktuelle Vorlage ausliefern.
- `app/workshop/templates/ausfuehrungen.xlsx`: Ausführungsimport.
- `scripts/build-product-series-template.mjs`: Generator/Anleitung.
- `scripts/check-design-folder-import.py`, `check-saved-excel-resume.py`, `check-saved-excel-conflicts.py`, `check-customer-file-grants.py`: gezielte Nachweise, bei relevanten Änderungen verwenden.
- `docs/dashboard-20261004/`: Berichte, Screenshots, Masterregeln, Exportentscheidungen und Anforderungen.

Bestehende Startbefehle laut package.json: Node >=24, `npm start`, `npm run build`, `npm test`, `npm run shopify:check`, `npm run shopify:test`. Kein pauschaler Neuaufbau der Umgebung erforderlich. Bereits installierte Browser-/Python-Abhängigkeiten des Zielchats verwenden.

Im Repo vorhanden: Gravuru-2027-Quellstand-20261003.zip, REFERENZ-MATERIALIEN-20260930.zip, REFERENZ-MOTIVE-UND-ACRYL-20260930.zip, REFERENZ-OBERFLAECHE-20260930.zip, REFERENZ-QUELLCODE-20260930.zip, SCREENSHOT-REFERENZEN-20261003.zip. Pfade/Größen/Blob-IDs stehen im Inventar. Diese Archive sind Referenzen und Sicherungen, kein Auftrag zur Wiederherstellung der alten Pipeline.

## 4. Fachliche Masterentscheidungen aus dem Verlauf
Diese Liste sichert Anforderungen; sie behauptet nicht, dass jeder Einzelpunkt bereits vollständig implementiert/physisch abgenommen ist. Implementierungsstand anhand aktueller Dateien und Berichte beurteilen.

### Design, Motiv, Bedienung
- **Motiv** = einzelnes hinzufügbares Element. **Design** = komplette Gestaltung der Platte/des Acrylglases. Diese Begriffe durchgehend verwenden.
- Bestehendes Originaldesign geometrisch übernehmen; Beispielfoto und „Pia & Rafael“ bleiben bis zur Änderung durch Kunden erhalten. Beispielbild mit Hinweis auf eigenes Foto.
- Massiver Holzsockel verdeckt unten **7 mm**. Vorschau korrekt; Inhalte nicht unbeabsichtigt verdecken. Das ist Einstecktiefe, keine Plattenformatänderung.
- Große vollständige Vorschau oben links, bündiger Rahmen. Bei Bearbeitung kurze sichtbare Hervorhebung der Vorschau. Foto-Upload darf nicht nach unten scrollen.
- Foto im festen Uploadbereich hinter Overlay verschiebbar/ausrichtbar; Zuschnitt und Farbkorrekturen einschließlich Graustufen, Original erhalten. Bearbeiten vor Ersetzen und Entfernen anbieten.
- Text direkt/doppelklick bearbeiten; beim ersten Fokus vollständigen Inhalt markieren. Schriftart, Fett, Kursiv und Schriftgröße in **ganzen Millimetern**. Größenänderung verändert nicht das Plattenformat.
- Auswahlgriffe für Größe, Rotation, Verschieben und Entfernen erhalten. Neue Motive auf freier Fläche platzieren. Kompakte Motivübersicht, Farbauswahl mit Voreinstellungen und freier Farbe.
- Default: Foto, Texte, hinzugefügte Motive/Texte frei beweglich; eigentliches Design fest. Rechte im **Backend** konfigurierbar: festes Textfeld oder frei, Inhalt/Farbe/Position/Größe/Löschen getrennt.
- Spätere Ergänzung: Bestandteile eines Designs nach ausdrücklich erlaubtem Entsperren löschbar; Master unverändert erhalten, Rückgängig möglich. Schöne Bestellgestaltung soll Grundlage eines neuen Produkts werden können.
- Bei 0 oder 1 auswählbaren Designs Designauswahl/Tab ausblenden, produktübergreifend. Weißer Seitenbereich außerhalb großer Vorschau schließt diese.
- Überlappungen beim Druck erlaubt; entsprechende Warnung nur bei Gravur.
- Neutrale moderne Oberfläche mit Weiß/Hellgrau/Graphit anstelle dominanter dunkelgrüner Flächen.
- Standard-Kundenansicht ist der bestehende Konfigurator. Freier Produktionsdownload später nur Backend, Kunden erst nach Kauf und Berechtigungsprüfung im Konto. Temporärer Download im Testkonfigurator wurde ausdrücklich gestattet.

### Materialdarstellung
- Farbiger UV-Druck auch vollflächig berücksichtigen.
- Aufdruck wirkt matt mit feiner typischer UV-Druckstruktur/Stippchen; Hinterdruck durch Acryl wirkt glänzend.
- „Marker“ meint hier die optische Druckstruktur, keine erfundenen Passermarken im Export.
- Acrylgravur hell/neutral darstellen; braune Holzgravurfarbe nicht auf Acryl übertragen.

### Produktionsausgabe – neueste Korrekturen haben Vorrang
- Standard **nur PDF, CMYK, 300 dpi**. 600 dpi optional als Empfehlung für sehr feine gerasterte Details; Vektoren bleiben Vektoren.
- Weiß nur unter tatsächlich gedrucktem Foto, Text, Dekoration und hinzugefügten Elementen. Unbedruckte transparente Bereiche bleiben ohne Weiß. Frühere „vollflächig innerhalb der Kontur“-Vorgabe wurde vom Nutzer korrigiert.
- **RDG_WHITE stets als gefüllte Vektorfläche**, auch unter Bitmap-Fotos. Text, Linien und Weiß nicht durch Gruppierung rasterisieren.
- Roland: gemeinsame Datei mit Farbdruck, RDG_WHITE und Außen-/Schnittkontur. Texteingaben sinnvoll gruppieren, dabei Corel-Vektoren erhalten; aktuelle dokumentierte Glyphenpfadlösung beachten.
- Mimaki: **zwei separate PDFs**: Farbe ohne RDG_WHITE; Weißdatei mit RDG_WHITE-Vektorflächen **einschließlich Außenkontur und ggf. Löchern**. Identische Maße, Ursprung und Spiegelung. Das ersetzt die frühere Anforderung einer einzigen gemeinsamen Mimaki-Datei.
- Überdruck/Beschnitt standardmäßig **aus**. Optional 1 mm nur bei randberührendem bzw. vollflächigem Druck, nicht um beliebige freistehende Motive. Weißbeschnitt separat, dokumentierter Default 0.
- Optional ZIP mit allen Daten und Originalfoto extra. Kein erzwungenes ZIP im normalen PDF-Download.
- Geräte: Roland LEF 200 und MO 240, VersaWorks; Mimaki 2513 EX und Mimaki-RIP (genaue Version nicht bestätigt).
- Einzelner früherer Roland-/Corel-Drucktest vom Nutzer als gut bestätigt. Nicht auf pauschale Freigabe aller neuen PDFs/RIPs/ICC-Profile schließen.

Verbindliche Detailquellen: [Masterregeln](MASTER-BEDIENREGELN.md), [Muster](MUSTER-ACRYLGLASBILD.md), [Vektoren/Kontur-Korrektur](PDF-VEKTOREN-KONTUR-20261006.md).
**Historische Widersprüche:** Ältere RGB/600-dpi-Absätze sowie Mimaki-Weiß ohne Außenkontur sind überholt. COREL-MIMAKI-TRENNDATEIEN-20261006.md nur zusammen mit der neueren Vektoren/Kontur-Korrektur lesen. Alte „noch nicht implementiert“-Texte in Quellenübersichten nicht als heutigen Gesamtstatus ausgeben.

## 5. Originalmaterial und Muster – Zugriff sauber unterscheiden
### GitHub-Release (Metadaten erneut geprüft)
Quelle ist das separate Referenzrepo **Chris83638w/gravuru-shopify**, Release `resources-acrylglas-150x200-20260929`. Die neue Entwicklung bleibt in gravuru-2027.

- [Master-Acrylglas-Roland-mit-Beispiel.zip](https://github.com/Chris83638w/gravuru-shopify/releases/download/resources-acrylglas-150x200-20260929/Master-Acrylglas-Roland-mit-Beispiel.zip), **15.316.863 Bytes**. Historisch dokumentierter SHA256: `f49918022cb88612ea001935d8ec6db5397cfb393c0989999e1b4da684ab8f36`.
- [Uebergabe-Acrylglas-Corel-und-FPD-Beispiele.zip](https://github.com/Chris83638w/gravuru-shopify/releases/download/resources-acrylglas-150x200-20260929/Uebergabe-Acrylglas-Corel-und-FPD-Beispiele.zip), **78.506.141 Bytes**. Historisch dokumentierter SHA256: `4be42ad70972e808983dd38eab12c8067d843173156fb2b215b75a874aa86ffa`.

Bei dieser Übergabe wurden Release-Namen und Größen bestätigt, die Binärdateien nicht erneut heruntergeladen/gehasht. Private Release-Links verlangen passende GitHub-Anmeldung; anonymer 404 beweist keinen Verlust.
Master enthält die bearbeitbare Pia-und-Rafael-SVG, austauschbares Foto, transparente Dekoration und Referenzmockup. Benutzerupload ursprünglich `file_00000000f9208210b35944c5fbfa888e`; nicht voraussetzen, dass derselbe Upload in jedem Chat verfügbar bleibt.

Weitere Quelle: Commit `084412b43204cf080764a0ef0becea8c251713fd` im Referenzrepo, `PROJECT/ACRYLGLAS-150X200-20260929`.
[UV-Pilot](UV-DESIGN-PILOT.md), [Vorlagenformat](VORLAGENFORMAT.md), [Mapping](uv-pilot-mapping.json), [Product-Design-Auftrag](PRODUCT-DESIGN-AUFTRAG.md) erklären Import und Grenzen. Nicht behaupten, alle 18 Designs seien vollständig/Corel-fertig verfügbar. Design 18 war Importpilot, keine pauschale visuelle 1:1-Abnahme aller Designs.

Muster-Vorschau: [Muster Acrylglasbild](https://gravuru-design-test-mika.gravur4you-cy.chatgpt.site/?model=acryl&v=0608ef1).
Dokumentierter Sites-Stand: Projekt `appgprj_6ac29c8cd604819197cc8af2da80d6f4`, Version 12, Quellcommit `0608ef15298568de840ea2d2314a090b2b4f76db`.
Statische geschützte Vorschau, **kein Shopify-Backend**. Der v-Parameter allein garantiert keine unveränderliche Bereitstellung.

### Nicht automatisch im anderen Chat vorhanden
Secrets/Tresorwerte, private Datenbanken, ursprüngliche Kundenuploads, ungespeicherte Browsergestaltung, private lokale Druckproben und private erzeugte Pilotdateien werden nicht durch Git-Handover übertragen. Keine solchen Daten ins Repository aufnehmen.
Insbesondere alte Pfade wie `/workspace/gravuru-druckproben-getrennt-20261006-final/` beschreiben die damalige Laufzeit, keine dauerhafte Freigabe.
Die obigen Originalquellen erlauben autorisierte Wiederbeschaffung; echte private Produktionsdaten brauchen bei tatsächlichem Bedarf einen gesicherten Transfer. Fehlende private Daten nicht durch Beispielmaterial ersetzen und dann als Original ausgeben.

## 6. Offene Shopify-/Hostinggrenze und Zugangsdiagnose
Bestehende App **Gravuru Konfigurator**, App-ID **423276544001**, Shop **gravuru-design.myshopify.com**.
[Dev-Dashboard](https://dev.shopify.com/dashboard/172197140/apps/423276544001).
Laufende URL **https://gravuru-designwerkstatt.de/produktanlage.html**, unverändert lassen. „Gravuru 2027 – Cloud – Mikail“ ist Chatname, nicht Name einer zweiten Shopify-App.

Für echten Backend-Test fehlen weiterhin bestätigte sichere Bindungen:
- GRAVURU_SHOPIFY_CLIENT_SECRET
- GRAVURU_SHOPIFY_APP_ORIGIN: geeignete HTTPS-Testinstanz mit Backend
- GRAVURU_PRIVATE_DATA_DIR: dauerhaft private Ablage außerhalb Git
- optional GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN für bestehenden Produktentwurf-Transfer

Zusätzlich echte Händlersitzung/Installation, Testvarianten-Zuordnung zur gesicherten Gestaltung, verifizierter Bestellwebhook und Testzahlung ohne echte Belastung prüfen. Funktionierender Shopify-Connector ersetzt keine App-Anmeldung.
[Anschlussvorbereitung](SHOPIFY-ANSCHLUSS-VORBEREITUNG-20261007.md) dokumentiert den damaligen Stand. Der private Testordner war beschreibbar; Dauerhaftigkeit außerhalb der Cloud-Aufgabe nicht bestätigt.

Plesk **https://gravuru.highspeed.cloud:8443** bleibt **pausiert**. Die bisherigen widersprüchlichen Zugangsberichte stammen aus unterschiedlichen Laufzeiten:
- Zielchat: HTTPS ohne Anmeldung HTTP 401, Proxy/TLS funktionierten, persönliche Variablen fehlten.
- separater Chat „Plesk-Zugang und API prüfen“: beide persönlichen Variablen vorhanden, aber curl 7 zum konfigurierten Proxy:8080; HTTP 000, Plesk nicht erreicht.
- Kein bestätigter authentifizierter Plesk-Erfolg. HTTP 401 ohne Zugangsdaten ist kein Netzwerkausfall. HTTP 000/curl 7 zum Proxy ist keine Ablehnung des Plesk-Passworts.
Nicht erneut Passwörter ändern, pauschal Internet öffnen, TLS abschalten oder den vorgeschriebenen Proxy umgehen. Browser-Login des Nutzers erzeugt keinen fernsteuerbaren Browser oder API-Zugang im anderen Chat.

Optionale lesende Prüfhilfe liegt separat in Commit `fe1086192b4c5efbce3486ce55f100c9c12746db`, Branch `task/access-preflight-20261007`: `scripts/check-cloud-access.py` und `docs/dashboard-20261004/CLOUD-ARBEITSWEISE-UND-ZUGANG-20261007.md`. Nur bei Wiederaufnahme des Zugangsthemas verwenden; dessen älteren STATUS nicht über aktuelle Produktarbeit kopieren.
Nutzer wollte später an Begrenzung des vorübergehend uneingeschränkten Internets erinnert werden. Nur erinnern, Einstellungen nicht selbst ändern.

## 7. Übergabeprüfung und ehrlicher Empfangsstatus
- Zielchat direkt gelesen; aktuelle Entwicklungsbasis und nächste Arbeit ermittelt.
- GitHub-Branch und Commit identisch; vollständiger Gitbaum inventarisiert.
- Original-Release-Metadaten erreichbar; private Binärdateien nicht erneut kopiert.
- Alle hier referenzierten Repo-Dokumente und Einstiegspfade gegen den Gitbaum geprüft.
- Keine Produktdateien, Secrets, Hosting- oder Live-Einstellungen durch diese Übergabe geändert.
- Ein Zugriff auf den Zielchat zum Lesen ist vorhanden; ein Werkzeug zum direkten Senden einer Nachricht an ihn ist in dieser Sitzung **nicht verfügbar**. Die Erstellung dieses Dokuments beweist daher noch nicht, dass der Zielchat es gelesen hat.
- Aktivierung: dem bestehenden Chat den Link zu diesem Dokument geben, auf seinem aktuellen Stand weiterarbeiten lassen und diese ergänzende Übergabe lesen lassen. Keine neue Umgebung nötig. Beim Empfang einmal Basis/Dateiquellen bestätigen, dann ZIP-Paket umsetzen.
