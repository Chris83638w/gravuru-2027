# Übergabe an den prüfenden Chat: Astra und Claude, 17.–18. November 2026

Historischer Grundstand: 18.11.2026, 10:35 UTC; aktuelle Ausführung siehe Nachträge. Vollständig auch als [Issue #262](https://github.com/Chris83638w/gravuru-2027/issues/262) veröffentlicht. Diese Übersicht ist auf Chris' Wunsch für eine andere KI erstellt. Maßgeblich bleiben die verlinkten Belege und spätere Einträge in STATUS.md / Issue #254. Die private Serverprobe beginnt erst nach diesem Stand; Ergebnisse unten nachtragen. Keine Kundendaten, Zugangsdaten oder Datenbankdateien weitergeben.

## Ziel, Entscheidungen und Freigabe

- Auftrag: [Issue #254](https://github.com/Chris83638w/gravuru-2027/issues/254). Prio-Konfi soll sich so direkt bedienen wie Variante C, möglichst fertige Ressourcen aus Shopify/CDN und möglichst wenig Warten auf den eigenen Server. Darstellung, Bedienung, Preise, Prüfungen und Produkt-/Variantenbindungen bleiben erhalten.
- Chris hat die frühere feste Fünf-Sekunden-Vorgabe ausdrücklich verworfen. Variante C ist das Zielbild; Fancy Product Designer ist sein Erfahrungsvergleich, kein von uns erhobener Benchmark.
- Ausgangspunkt war Live-Basis `be163c5d` auf `dev/claude-warenkorb-v4-20261116`, ausdrücklich nicht main. Letzter überprüfter aktiver Stand: Diagnoseversion `9af3a1ac`; neue Umbauten sind nicht dauerhaft aktiviert.
- A/V2 wurde am 17.11. nur in einem ausdrücklich freigegebenen kurzen Live-Messfenster getestet und anschließend zurückgestellt. Diese Freigabe ist keine Erlaubnis für weitere Deployments.
- Am 18.11. bestätigt Chris das **private Kopierpaket** im Claude-Chat und hier bei Astra. [Claude dokumentiert den genauen Umfang](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6975961005): Prüfwerkzeug, etwa 9,73 GB private Sicherung und nochmals etwa 9,73 GB Wiederherstellungsprobe auf demselben Server; App läuft weiter. Diese Bestätigung muss nicht erneut eingeholt werden.
- Weiterhin kein neues „live“ für App-Stopp/Neustart, produktive Schriftgruppen-/Produkt-/Katalogänderungen oder Shopaktivierung. Kein Merge von uns ausgeführt. Keine automatische Löschung oder Wiederholung eines abgebrochenen Kopierlaufs. 45 Tage Aufbewahrung beziehen sich auf unbenutzte Kundenentwürfe; weitere Löschdetails sind offen, nicht auf Prüfbelege übertragen.

## Am 17.11.: Warenkorb messen und Doppelarbeit reduzieren

In [PR #255](https://github.com/Chris83638w/gravuru-2027/pull/255) zuerst Abschnittszeiten für die vier eigenen HTTP-Anfragen und die Bildvorbereitung ergänzt. Claudes B1 verlangte außerdem die Blockade des Serverprozesses; danach kamen CPU-, Ressourcen-, GC-, Heap-/Puffer- und Dokumentlesezähler hinzu. Diagnose enthält feste Namen/Zahlen, keine Kundentexte, Bilder oder Tokens.

Die freigegebene 1b-Messung zeigte beim öffentlichen Messprodukt ein Dokument von **31.205.183 Bytes** und **33 instrumentierte Dokumentlesungen** pro Übergabe. Rund 1,03 GB zurückgegebene Dokumentbytes sind dabei kein gemessener Plattenverkehr und keine exklusiv bewiesene Ursache.

Anschließend implementiert und mit Claude geprüft:

- **Teil A:** gleiche Produktstände in synchronen Lesephasen wiederverwenden; nach jedem `await` erneut prüfen. Keine Preis-/Bindungs-/Revisionsprüfung entfernen.
- **V2:** bytegleiches Warenkorbbild früher nach erfolgreicher Sicherung vorbereiten; signierte unveränderliche Quelle und bestehender Pflichtweg bei Fehlern bleiben.
- **V3:** stilles Vorabsichern auf der vorhandenen Übersicht, identischen Zustand wiederverwenden, Änderungen seriell abarbeiten. Implementiert/getestet, aber **ausgeschaltet**. Mehrlast und Priorisierung sind nicht gelöst; keine neuen Kapazitätswerte erfunden.

Freigegebene A/V2-Live-Messung: gleiches Chrome-Profil **390×844, CPU ×4, keine Netzdrossel**, drei vollständige Warenkörbe. Median vom letzten Klick bis geladenem Warenkorb **22,579 → 18,403 s (−18,5 %)**; Kontrolllauf nach Rückstellung 21,875 s. Jeweils eine Position, Menge 1, 14,99 €, Bild geladen, keine Bestellung. Dokumentlesungen 33 → 15. [Bericht und Grenzen](2026-11-17-konfi-tempo-p1-av2-live.md). Das Zielbild ist damit nicht erreicht.

Weitere ausschließlich lokale Verbesserung: bytegleicher nativer ZIP-Schreiber, PNG-Puffer vom großen Archiv trennen, reine begrenzte Wiederverwendung des Digests frisch gelesener Dokumentbytes. Isolierter Serverkandidat **`1c6b6df`**, Browser-Build identisch zum Live-Stand. Im gleichen synthetischen SQLite-Profil sank die Summe der vier eigenen HTTP-Zeiten **5.600,02 → 4.516,45 ms (−19,3 %)**; größte gemessene RSS-Stichprobe nach Aufwärmung **1.063,53 → 816,80 MiB**, Ruhemedian **647,09 → 560,51 MiB**. Das sind keine Handy-Endzeiten und kein Kapazitäts- oder Langzeitnachweis. 153 gezielte Tests; zusätzliche betroffene Diagnosefälle erneut geprüft. [Speicherbericht](2026-11-17-konfi-tempo-p1-speicher.md).

Wichtige Speicherklärung: Im echten Produktdokument entfallen **24.047.954 Bytes auf 57 Schriften**, **6.322.525 Bytes auf 265 Motive**; zusammen 97,3 %. 208 Designs, 32.444 Schriftobjekte. Das erklärt die Quellgröße, nicht die genaue Verteilung des laufenden RSS. Alter Live-Prozess laut Claudes Lesemessung bereits 925 MiB Ruhe-RSS und 2.626 MiB bisheriger Höchstwert. Die frühere A/V2-Stichprobe von 1.590 MiB war während Aktivität; daraus keine bewiesene A/V2-Speicherregression ableiten. Weitere strukturgerechte Profilierung/K5 bleibt offen.

## Am 18.11.: Schriftwahl und spätes Nachladen

Vollständige Schriftübersicht mit echten Proben erstellt; Chris reduzierte seine Auswahl auf 66 und arbeitete anschließend Gruppen aus. Für drei Gruppen gilt seine bestätigte **29er-Standardliste plus die Originalschriften des tatsächlich geöffneten Designs/Formats**. „Bis 35 wäre egal“ ist keine harte Abschneidegrenze. Keine pauschale Ersetzung von Designschriften.

Browser-/Serverauswahl vereinheitlicht; „Text hinzufügen“ lädt nur die tatsächlich benötigte Startschrift, Vorladen bleibt innerhalb der Gruppe. Alte Entwürfe behalten ihren festen Produkt-/Schriftstand. 93/93 gezielte Fälle bei Astra und Claude. Identischer lokaler Desktop-Test mit warmer Startschrift: 27 zusätzliche Schriftanfragen / 3.950.428 Bytes → 0 / 0; ein Lauf 738,1 → 246,7 ms. Kein Warenkorb-/Mobil-Benchmark. [Schriftladen](2026-11-18-schriftladen-gruppen.md).

Die zwischenzeitlich für einen hypothetisch leeren Schriftbestand ergänzte Meldungsverzweigung wurde auf Chris' ausdrücklichen Einwand mit **`f84433f` zurückgenommen**. Sie gehört nicht zum gewünschten Endstand. Tatsächliche Ladefehler werden weiter behandelt. Manche älteren PR-Beschreibungspassagen nennen noch den verworfenen Zwischenstand `452e4ba`.

Bestätigte 29 Schriften: Alex Brush, Allura, Audiowide, Bebas Neue, Caveat, Caviar Dreams, Cinzel, Comfortaa, Comic Neue, Dancing Script, Daniel, Dream Orphans, Fineliner Script, Great Vibes, Homage, Kaushan Script, Lato, Magnolia Script, Michroma, Montserrat, Pacifico, Permanent Marker, Roboto Slab, Rounded Elegance, Sacramento, Stylish, Tangerine, Zentenar Fraktur, Poppins.

Chris bestätigte folgende Zuordnung der acht alten Sets zu fünf Gruppen:

| Bestehende Set-Kennung(en) | Gruppe | Auswahl |
|---|---|---|
| `tuerschilder` | Tür & Familie | bestätigte 29er-Liste |
| `hausnummern`, `firmenschilder` | Hausnummer & Firma | bestätigte 29er-Liste |
| `andenken` | Andenken & Hochzeit, einschließlich Tierandenken | bestätigte 29er-Liste |
| `geschenkartikel`, bisher ungenutztes `schluesselanhaenger` | Geschenke & Kinder | endgültige Auswahl offen |
| `hundeschilder`, `pferdeschilder` | Tiere & Hof | endgültige Auswahl offen |

Die letzten beiden Listen nicht erfinden. Produkt-/Linienausnahmen erhalten. Poppins benötigt [Katalog-PR #192](https://github.com/Chris83638w/gravuru-katalog./pull/192), geprüfter Commit `58d1ec358cbae206a9fa0a133d5cc36fced94293`; nur für den isolierten Probekatalog abgestimmt, kein Merge/Live-Katalogimport erfolgt. Schriftdateien kommen bisher weiterhin vom eigenen Server: Shopify-CDN bleibt offen. Nachladen allein entfernt keine eingebetteten Schriftdaten aus alten Produktdokumenten.

## Fertige Folgepakete und echter Bestand

Die PRs bauen aufeinander auf, sind offen/unveröffentlicht und dürfen nicht beliebig gegen main geprüft oder einzeln ohne ihre Abhängigkeiten aktiviert werden.

| PR | Ergebnis | Geprüfter Code / Dokumentationsstand |
|---|---|---|
| [255](https://github.com/Chris83638w/gravuru-2027/pull/255) | Diagnose, A/V2/V3, lokale Serververbesserungen, gezieltes Schriftladen | aktueller Head `f84433f`; V3 aus |
| [256](https://github.com/Chris83638w/gravuru-2027/pull/256) | Schriftgruppen dauerhaft im Katalog pflegen, Herkunft und Import erhalten | Code `6dab1ea`, Head `2cb93c6`; Claude 43/43, lokal 116 unterschiedliche Fälle |
| [257](https://github.com/Chris83638w/gravuru-2027/pull/257) | Begrenzter Anschluss alter Produkte nur über neue geprüfte Revisionen | Code `43603dd`, Head `286ff2d`; Claude 103/103 plus Gegenproben |
| [258](https://github.com/Chris83638w/gravuru-2027/pull/258) | Privater Wartungsaufruf unter derselben nativen Datensperre | Code `b0baaee`, Head `b3f9725`; Claude 106/106 |
| [261](https://github.com/Chris83638w/gravuru-2027/pull/261) | Private Online-Kopie/Restore samt konkretem Plesk-Transport | Werkzeug `cbb7f2c`, Operator-Texte `e69d975`, konkretes Restore-Paket `df0a6eb`; Claude 17/17 und Startprobe |

PR256: `schriften/sets.json` ist Pflegequelle; Profilherkunft mandantenbezogen über feste Set-ID, nicht Anzeigename. Allgemeine Profilverwaltung darf abgeleitete Gruppen nicht parallel verändern. Katalogdatei/Audit und SQLite sind keine gemeinsame atomare Transaktion; ausstehende Profilübernahme wird angezeigt und ohne doppelte Auditzeile nachgeholt. Wiederholter Import behält Auswahl/Reihenfolge. Schema v3 und Rückweg nach v2 sind offline geprüft. [Backend](2026-11-18-schriftgruppen-backend.md).

Rein lesend ermittelter Serverbestand: **1.071 native Produkte**, ein 16er-Türschildprofil; bestehende Produkte werden durch reine Profilpflege nicht automatisch umgestellt. **248 Konfigurationen**, **249 Produkt-/Revisionspaare**, **16.725 gespeicherte Variantenbindungen**. 113 Themenpaare, davon 15 bereits freigegeben und 98 nicht freigegeben. Keine neue Verkaufsfreigabe für diese 98, kein Massenlauf über alle Produkte. Klingel-/Form-/Mischbindungsfälle separat. Pilot: **Leuchtturm 12×8, gebundene Revision R4, fünf Varianten**. [Zuordnung](2026-11-18-schriftgruppen-bestand-zuordnung.md), [Produktanschluss](2026-11-18-schriftgruppen-bestandsanschluss.md).

PR257 ändert nur Schriftzuordnung; Preisverträge, Bindungsstand und Freigaben bleiben geprüft. Exakt gepinnter Plan-SHA, Wiederanlauf und Rückweg über neue Revision; niemals eine alte DB über inzwischen neue Kundenbestellungen zurückspielen. PR258 nutzt dieselbe vorhandene Sperre, prüft tatsächlichen Einstieg/Code-/Daten-/Katalog-/Pythonpfad und öffnet einen frühen Wartungsmodus ohne Kundenserver, AI-/Exportjobs oder Timer. [Wartungsaufruf](2026-11-18-schriftgruppen-hostanschluss.md).

## Warum die private Kopie und was zum Speicher bewiesen ist

Der echte native Bestand muss isoliert auf Profilherkunft, Import, Produktplan, Ausführung, Wiederanlauf und Rückweg geprüft werden. Eine rohe Kopie laufender SQLite-Dateien wäre unzureichend; der vorhandene Offline-Helfer würde die Live-Sperre benötigen. Deshalb PR261: drei WAL-Lesesnapshots in einem geprüften gemeinsamen Pin-Fenster, Backup-API, Integritäts-/FK-/Zählerprüfungen, gehashter Katalog, Erfolgsbeleg erst zuletzt. Wiederherstellung nur mit extern festgehaltenem Beleg-SHA in neues privates Ziel.

Claude fand zunächst einen falschen Reserveabbruch durch mitgezählten sauberen Dateicache. Korrigiert: sauberen rückholbaren Datei-LRU abziehen, dirty/writeback und begrenzte Eltern konservativ weiter belasten. Cachehinweise nur für eigene private Zieldateien nach Synchronisierung, nie für Live-DB/Katalogquelle, keine globale Cacheleerung. Ziel-DB zusätzlich alle 256 MiB synchronisieren.

Linux-Belege bei Claude: 17/17 Tests; große Probe mit 81.750 Dateien erfolgreich, Spitzen-RSS etwa 246 MiB. Gleicher DB-Bestand: dirty-Spitze 760 → 256 MiB, gepinnte Zeit 8,3 → 10,4 s. Das betrifft **das Kopierwerkzeug, nicht den Speicherverbrauch des Kunden-Konfis**. [Abnahme Werkzeug](https://github.com/Chris83638w/gravuru-2027/pull/261#issuecomment-6974748941), [Abnahme Operatorbefehle](https://github.com/Chris83638w/gravuru-2027/pull/261#issuecomment-6974936177).

Tatsächlicher Server-Vorabcheck 09:37 UTC ohne Dateiablage/SQLite-Öffnung: 353,83 GB Platte frei, etwa 10,8 GiB Reserve in der beobachteten 12-GiB-cgroup, WAL 37.953.472 Bytes; Einstiegshashes unverändert. Reine 1-GiB-Kataloglektüre über 24.808 Dateien in 20,486 s, rund 16 MiB Prozess-RSS, gemessene Gruppe vor/nach ohne Datei-LRU/dirty/writeback. **App-PID/-Startzeit, individueller App-RSS, gemeinsame cgroup und Cacheanrechnung unter Schreiblast bleiben unbewiesen.** Keine Umgehung gesperrter Prozessinformationen.

Gemeinsam bestätigte Probegrenzen: 300 s gepinnt, 1.800 s gesamt, 1 GiB WAL; mindestens 6 GiB Host-/cgroup-Reserve und 28 GiB freie Platte, Python-Adressraum 512 MiB. Keine P3-Kapazitätsregeln. Claude zog eine unbelegt vorgeschlagene Verdopplung der Zeitgrenzen zurück. Plesk verträgt die langen Übergaben nicht; fünf kurze gehashte Schritte und der einmalige Hintergrundstart sind exakt hinterlegt und von Claude nachgerechnet. [Konkrete Operatorbefehle](2026-11-18-font-online-operator/README.md).

## Aktuell laufender Auftrag / nächster Schritt

Chris' Bestätigung des privaten Kopierpakets liegt jetzt vor; Astra führt aus, Claude prüft nach Vorabcheck und Kopie die Belege. Bitte keine zweite KI gleichzeitig dieselben Plesk-Befehle starten lassen oder Zielordner bearbeiten. Jeder Start ist einmalig; bei fehlendem Ergebnis zuerst Startbeleg, PID, Log und Exit prüfen. Neue Serveraktivität hier und in STATUS/Issue dokumentieren.

Geplant: geprüftes Werkzeug privat ablegen → vollständiger CLI-Vorabcheck → einmal Online-Kopie → Erfolgs-SHA prüfen → Wiederherstellung in getrenntes privates Ziel → Integrität/Dateihashes vergleichen. Beide Kopien bleiben ausschließlich auf diesem Server. Noch nicht behaupten, dass die Kopie oder die native Schriftgruppen-Generalprobe bereits erfolgreich abgeschlossen sei.

Danach: isolierten Kandidatencode/Probekatalog vorbereiten, Herkunft und 29er-Synchronisierung, echte gegenseitige Sperrwirkung, Produktplan/Ausführung/Abbruch/Rückweg an Kopie prüfen. Ein voller normaler Hoststart darf keine kopierten AI-/Exportjobs gegen echte Dienste starten oder Live-Legacy-Daten verwenden. Ein auf der Kopie erzeugter Plan-SHA ist wegen IDs/Zeitstempeln nicht automatisch live verwendbar; momentan zwei getrennte Live-Wartungsfenster vorsehen, keine Unterbrechungsdauer erfinden.

Noch nicht erledigt: Zielbild Variante C im ganzen Kundenweg, vollständige Speicheraufschlüsselung des Konfis, Shopify-CDN für Schriften, P2 (vorgefertigte WebP-Designvorschauen samt SVG/WebP-Mustervergleich und Erneuerung nach Synchronisieren), P3 (Kapazitätsgrenzen aus Lasttest), später P4. Keine dieser offenen Aufgaben durch einen bestandenen Kopiertest als erledigt werten.

Arbeitskopie dieses Pakets: `work/gravuru-font-generalprobe`, Branch `dev/astra-fontgruppen-generalprobe-20261118`. Schriftgruppen-/Wartungscode: `work/gravuru-font-backend`. Gemeinsame Quelle: GitHub `Chris83638w/gravuru-2027`; aktuelles Logbuch STATUS.md auf dem Aufgabenbranch. Direkter Claude-Chat: <https://claude.ai/chat/4f2c5694-5f6b-4742-8563-cbdecf36624a>.

## Nachträge zum aktuellen Lauf

- 10:39 UTC: Nach Chris' bestätigtem Ja alle fünf geprüften Ablageschritte einmal erfolgreich ausgeführt. Werkzeug und capture.json stimmen bytegenau mit den abgenommenen SHAs überein; privater Ordner 700, Dateien 600. Transportteile bleiben erhalten.
- 10:42 UTC: Vollständiger CLI-Vorabcheck der abgelegten Datei bestanden, Exit 0, 49 ms, 0 Datenbanken geöffnet/0 Pfade angelegt. 353,76 GB frei, 10,8 GiB gemessene cgroup-Reserve. Beide App-Einstiegshashes vorher/nachher identisch. [JSON-Belege](../measurements/2026-11-18-font-online-server-staged.json).
- Claude hat auch diese Gesamtübergabe gegengelesen und ihre Darstellung der Abnahmen/Grenzen bestätigt. Claude hat die Vorabbelege technisch bestätigt ([Einmalfreigabe](https://github.com/Chris83638w/gravuru-2027/pull/261#issuecomment-6976182797)). Capture genau einmal um 10:44:11 UTC gestartet, PID 4126327. Letzte lesende Kontrolle 10:56:52 UTC: Prozess vorhanden, noch kein Exit/Erfolgsbeleg. Die drei privaten Ziel-DBs liegen vor; WAL und Einstiegshashes unverändert. Wiederherstellung noch nicht gestartet. Kein App-/Shopwechsel.
- Zusätzliche lesende Messung 10:54:49 UTC: 344,32 GB Platte frei, 10,7 GiB Reserve in der beobachteten 12-GiB-Messprozessgruppe, Datei-LRU/dirty/writeback weiterhin 0. Kein Nachweis der App-/Kopierprozesszuordnung.

- 10:59 UTC: Capture beendet, Exit 0. 81.756 Dateien / 9.732.780.913 Bytes, 875,772 s; gepinnt 98,833 s, größter WAL-Stand 37.953.472 Bytes, 232,3 MiB Spitzen-RSS, 18 Ziel-Zwischensynchronisierungen. Erfolgsbeleg extern nachgerechnet und passend: `fd476927108f2e382f9e96e3214fda06015742cacd78b542397691f562b014e6`. [Abschlussbeleg](../measurements/2026-11-18-font-online-capture-result.json). Restore-Konfiguration konkret vorbereitet, Prüfung durch Claude vor Start.

- 11:24 UTC: Wiederherstellung erfolgreich, Exit 0; 81.756 Dateien / 9.732.780.913 Nutzbytes, 1.191,199 s, 192,9 MiB Spitzen-RSS. Extern gehashter Restore-Beleg exakt gleich Capture-SHA; Werkzeug hat Inventar, Dateihashes und DB-Prüfungen vor/nach Kopie bestätigt. Platte 332,78 GB frei, Einstiegshashes unverändert. Restore-Prozess und Messprozess gehören nach identischen Memory-cgroup-Kennungen zur selben Gruppe; Kunden-Appzuordnung weiterhin offen. [Vollständiger Serverlauf](2026-11-18-font-online-server-run.md). Claudes Abschlussprüfung der Endbelege folgt; native Schriftgruppen-Generalprobe bleibt der nächste eigene Schritt.
