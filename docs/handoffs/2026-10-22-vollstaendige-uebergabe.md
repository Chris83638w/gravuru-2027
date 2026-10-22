# Vollständige Arbeitsübergabe Gravuru · 22.10.2026

Diese Übergabe bündelt die aktuelle Shopify-/Serveranbindung, vollständige Quellpakete, private Datensicherungen, ältere Edelstahl-/Doppelplattenarbeiten, bestätigte Entscheidungen und belegte Restarbeiten. Sie ist keine Freigabe für einen vollständigen öffentlichen Verkauf. Die Regionalhomepage ist ein getrenntes Projekt.

## 1. Verbindlicher Einstieg und Stand

- Aktuelles Repository: **Chris83638w/gravuru-2027**, privat.
- Aufgabenbranch: **task/universelle-konfi-anbindung-20261022**.
- Zu Beginn und vor Veröffentlichung erneut gelesener Ausgangscommit: **b4d944e1409bc66647d582cc3d00710549d9d3f5**. Der Übergabecommit ist dessen dokumentarischer Nachfolger; seine vollständige Kennung steht im privaten Übertragungsbeleg und in GitHub.
- Letzter in dieser Arbeit installierter Foto-/Preiskorrekturstand: **5301ce97d8170c08f05033deeed25df61c61da1b**. Die späteren Commits `1382509d689a954f6f7801f7f52c94b2dbacdd92` und `b4d944e1409bc66647d582cc3d00710549d9d3f5` ergänzen Nachweise, nicht weiteren Anwendungscode.
- Der lokale Aufgabenordner und sein gezielter Quellunterordner sind **keine Git-Checkouts**. Es gibt dort keinen belegbaren lokalen Branch/HEAD oder Git-Arbeitsbaumstatus. Veröffentlichung erfolgt über den GitHub-Connector mit erwarteter Branchspitze. Nichts zurückgesetzt, kein Force-Push, kein Merge nach `main`.
- Gezielter Vergleich `app/`, `ops/`, `legacy-patches/`: 497 lokale Dateien bytegleich, fünf nach Normalisierung ausschließlich abschließender Leerzeichen/Zeilenenden textgleich. 263 weitere Dateien liegen auf GitHub, fehlen aber in dieser absichtlich partiellen lokalen Kopie. Daraus keine fehlenden GitHub-Quellen ableiten. Lokale private Wartungsnachweise und generierte Vorschauen sind gesondert inventarisiert.
- Die zentrale Koordination bleibt **Gravuru Neustart 1**. Andere Chats und Konten erhalten Änderungen erst durch Abruf des Branches und gesonderte private Paketübertragung. Keine automatische Synchronisierung behaupten.

Lesereihenfolge: diese Datei → [Entscheidungen und Funktionserhalt](2026-10-22-entscheidungen-und-funktionserhalt.md) → [unabhängiger Prüfauftrag](2026-10-22-pruefauftrag.md) → [maschinenlesbare Nachweise](2026-10-22-uebergabe-nachweise.json). Anschließend nur die benötigten verlinkten Quellen lesen. `AGENTS.md` und aktive Umsetzungspakete beachten; ältere Statusabschnitte sind datiert und teils überholt.

## 2. Ergebnis und noch nicht erledigte Arbeit

| Bereich | Tatsächlich erreicht | Grenze |
| --- | --- | --- |
| Zwei Werkstätten | Vorhandene Legacy- und Acryl-/Formwerkstatt gemeinsam auf dem bestehenden Testhost, Datenbestände getrennt | Kein Ersatz durch eine neue leere Datenbank; keine vollständige neue Linux-Serverinstallation bewiesen |
| Anbindung über IDs | Gemeinsamer Planer, Prüfung, Register, Editor-/Warenkorbanschluss für beide Schemata | Aktiv belegt: **neun Legacy-Varianten und eine Acryl-Variante**; nicht der gesamte Katalog |
| Staffelpreise | Gedenk-Pilot: 6 % ab zwei, 10 % ab drei auf vollständigen Stückpreis inklusive Foto | Andere Kategorien haben eigene Regeln; Formprodukte besitzen noch keinen allgemeinen variablen Aufschlags-/Staffelvertrag |
| Testbestellungen | Zwei/drei Exemplare bis Shopify-Testzahlung und automatischem Werkstatteingang; zusätzlicher Kauf mit neuem Nutzerfoto | Keine Fertigung, kein Versand, kein öffentlicher Gesamtverkauf freigegeben |
| Foto | Bis 15 MiB, Original erhalten, beide Linux-Fotoworker aktualisiert | Keine automatische Freistellung; vollständige Wiederöffnung aller Bearbeitungsparameter noch gesondert prüfen |
| Sichtbarer Preis | Gespeicherter Editor: zwei Stück 62,00 €, drei 89,04 €, Leiste und Details gleich | Letzte Sichtprüfung erzeugte keine neue Bestellung und keine neue Revision |
| Konfiguratorstart | Gespeicherter Entwurf nach manueller Adressbestätigung wieder sichtbar; gesondertes Start-HTML HTTP 200 | **Dauerhafter Fix für den leeren Start nicht nachgewiesen** |
| Sicherung | Konsistente Zweistore-Sicherung, getrennte Datenwiederherstellung, vollständige neue Quellpakete und spätere Bestellnachweise lokal | Die große Datensicherung liegt zeitlich vor späteren Preis-/Bestelländerungen. **Kein neuer vollständiger Live-Datenbankabzug am Ende dieser Übergabe** |
| Funktionsumfang | Originalfassungen, ältere Quellen und verbindliche Erhaltungsregeln gesichert | Keine erneute vollständige Prüfung jedes UI-Details, aller Produkte oder sämtlicher Maschinenprozesse |

## 3. Laufzeit und Architektur

Bestehender Host: `https://app-2027.gravuru-designwerkstatt.de`. Shopify-App: `https://admin.shopify.com/store/gravuru-design/apps/gravuru-konfigurator`. Wege: `/werkstatt/`, `/werkstatt/acryl/`, `/werkstatt/katalog/`, geschützte Händlervorschau `/werkstatt/kundenansicht/`.

Es gibt weiterhin zwei getrennte Stores mit je `workshop.sqlite`, `profiles.sqlite`, `design-assets.sqlite`. Der kombinierte Host nutzt die vorhandenen Verbindungen; kein dritter Bestell-/Datenbankserver. Private absolute Serverpfade, Startkette, Sicherungsorte und IDs der gespeicherten Gestaltung stehen ausschließlich in `PRIVATE-UEBERNAHME.txt` im privaten Paket. Bestehende Plesk-Instanz und Shopify-App wiederverwenden. Node 24 und die vorhandene Linux-/Python-Laufzeit sind Voraussetzungen; Browseranmeldungen und Geheimnisse werden nicht mitgeliefert.

Quellschwerpunkte:

- `app/workshop/shop-product-binding-{plan,check,adapter,legacy,store}.mjs`: feste Zuordnung Shop, Store, Mandant, `cfg_`-Produktrevision, Shopify ProductGID/VariantGID, Optionen, Preis und erwartete Bindungsrevision. Keine Zuordnung allein über Titel/SKU/Materialnamen.
- `POST /api/workshop/shop-product-bindings/check`: private Prüfung von bis zu 100 ausgewählten Zuordnungen, 64 KiB; keine vertrauenswürdigen Preise/Mandantenangaben aus beliebigem Browserpayload ableiten.
- `app/workshop/configurator-integration.mjs` und Test-Gateway `/api/configurator-test/…`: vorhandene Händlerauthentifizierung, Origin/CSRF und private Entwurfs-/Konfigurationstokens erhalten. Eine feste Produktbindung je Sitzung; Produktwechsel verlangt korrekte neue Kennungen.
- Vorhandene Sicherungs-/Prüfstanddienste speichern Originale, Bearbeitungen und unveränderliche Konfigurationsrevisionen. Renderer/Editor bleiben mit ihrer jeweiligen Geometrie verbunden.
- `draft-cart-handoff.mjs`, `cart-edit-revision.mjs`, `cart-handoff-journal.mjs`: bestehende Warenkorbposition gezielt ersetzen, fremde Positionen bewahren, vor/nach Mutationen lesen, unklaren Versand nicht blind wiederholen. Persistentes Übergabejournal; Sitzungskontexte bleiben begrenzter Arbeitsspeicher, kein behauptetes dauerhaftes Kundenkonto.
- Bestelleingang: bestehendes Abonnement, HMAC über Originalbytes, bezahlte EUR-Testbestellungen, genaue IDs/Preise/Revisionen; wiederholsichere Verarbeitung je Store. Keine atomare Transaktion über beide SQLite-Stores versprechen.
- Händler-Token wird unmittelbar zum Request frisch bezogen; keine Tokens in URLs oder dauerhaftem Browserstorage. Ein begrenzter lesender Wiederholungsversuch nach 401 ersetzt kein unkontrolliertes Wiederholen von Schreibaktionen.
- `legacy-patches/` und `ops/legacy-host-overlay/`: gezielte, per Quellhash abgesicherte Anschlüsse an die ältere Originalanwendung. Nicht den gesamten alten Editor durch den neueren Formeditor ersetzen.

Shopify-App-Version `gravuru-2027-ids-tier-20261022-v1` (interne Kennung im privaten Paket): sieben vorhandene Module und 19 Theme-Dateien erhalten. Keine zweite Cart-Transform-Instanz. Bestehendes Webhook-Abonnement (interne Kennung im privaten Paket) nach Sicherung nur um `line_items.product_id` ergänzt; Filter `test:true`, Ziel, HMAC und API-Version 2026-07 erhalten. Ein HTTP-200-GraphQL-Resultat ohne Prüfung auf `errors`/`userErrors` ist kein Erfolgsnachweis.

Aktive Zuordnungen und exakte interne Kennungen stehen im privaten Paket. Legacy-Pilot: Produktrevision 6, Preisvertrag 31, neun Bindungen Revision 2; vorherige Revision 5/Vertrag 30 bleiben historisch bestehen. Acryl-Pilot: eine Variante, Produktrevision 5 laut Bindungsbeleg.

## 4. Preise und echte Bestellnachweise

Für den geprüften Gedenkartikel gilt Grundpreis 22,99 € + Foto 9,99 € = 32,98 € je Stück vor Staffel. Rabatt auf den vollständigen Stückpreis, einmal je Stück in Cent runden, danach Menge multiplizieren:

| Menge | Rabatt | Stück | Artikel gesamt | geprüfter Versand | Bestellsumme |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 % | 32,98 € | 32,98 € | nicht neu bestellt | — |
| 2 | 6 % | 31,00 € | 62,00 € | 4,99 € | 66,99 € |
| 3 | 10 % | 29,68 € | 89,04 € | 0,00 € | 89,04 € |

Diese Versandbeträge sind Bestellnachweise, keine allgemeine neue Versandregel. Der alte Wunsch „15 % auf das zweite identische Exemplar“ ist durch die bestätigten neuen Staffelpreise überholt.

GitHub-Standardregeln in `app/workshop/quantity-tier-defaults.json`:

- Gedenktafeln/Tiergedenktafeln: 2/3 Stück → 6/10 %.
- Brettchen, Schlüsselanhänger, Pferdeschilder sowie Firmen-/Hinweisschilder: 5/10/25 → 5/10/15 %.
- Edelstahl-/Acryl-Türschilder sowie Hausnummern: 3/5/10 → 5/10/15 %.

Explizite Kategorieentscheidung und passende Produktfamilie/Größe haben Vorrang. Leere Staffelliste bedeutet ausdrücklich keine Staffel; offener Prozentsatz wird nicht erfunden. Diese Katalogvorgaben sind **keine Aussage, dass jede Shopify-Variante bereits entsprechend gebunden ist**. Formprodukte behalten ihren vorhandenen Festpreisvertrag; variable Zusatzfotos/-motive, Zusatzfelder, Rückseiten und Mengenstaffeln benötigen einen belegten passenden Vertrag. Nicht unterstützte kostenpflichtige Optionen nicht kostenlos durchreichen oder aus der UI entfernen.

Echte Shopify-Testbestellungen, danach lesend in Shopify und Werkstatt kontrolliert:

- Testbestellung mit zwei Stück: 62,00 € Artikel + 4,99 € Versand.
- Testbestellung mit drei Stück: 89,04 €, Versand 0,00 €.
- Weiterer Kauf mit neu hochgeladenem Nutzerfoto: zwei Stück, 66,99 € einschließlich Versand. Bestellkennungen nur im privaten Paket.

Jeweils `test=true`, `PAID`, `UNFULFILLED`; genau eine zugehörige Werkstattposition, Originalfoto und unveränderliche Konfigurationsrevision zugeordnet. `productionReady=false`, `customerDownloadAllowed=false`. Die ersten zwei Tests scheiterten bei der Zustellung mit 422 wegen fehlendem `line_items.product_id`; deren Belege bleiben erhalten, nicht blind erneut verarbeiten. Nach Korrektur wurden neue vollständige Bestellnachweise erstellt. Drei Stück mit dem zuletzt neu hochgeladenen Foto wurden sichtbar im Editor geprüft, aber nicht nochmals bestellt; Der Drei-Stück-Bestellbeleg bestätigt den vorherigen Foto-Prüfstand.

## 5. Foto, erhaltene Gestaltung und leerer App-Start

Dateiformate JPEG/PNG/WebP, bis vier Fotos/Logos. Technische Obergrenze je Upload **15.728.640 Bytes (15 MiB, Oberfläche „15 MB“)**; die Zusatz-Megapixelgrenze beim Upload entfällt. Linux: zwei Workerplätze je Nutzer, 512 MiB Adressraum, 20 CPU-Sekunden, 30 Sekunden Wandzeit, Vorschau höchstens 1600 Pixel. Originalbytes bleiben erhalten. Lokale Windows-Tests und Linux-Grenzen unterscheiden.

Letzte bestätigte Datei-SHA-256 auf beiden installierten Fassungen:

| Quelle | SHA-256 |
| --- | --- |
| Legacy `ux.mjs` | `9f7e9ce0c589d76b957c0cf356a707594b7598efb1e6a7e646b9457fe60b2dff` |
| Acryl `ux.mjs` | `5e566c881caf34b04deff523215239ac571d89602eebf17beb56f9b596aaa170` |
| beide `photo-import.py` | `5316af4e529d6b18999d18cc72e824878e8f4ee2459979cc544ac31240588822` |

Die gespeicherte Nutzerkonfiguration bleibt Revision 1, vier Ebenen, ein Originalfoto, zwei Texte, Format 220 × 140 mm, ohne Befestigung, Freistellwunsch vorhanden. Nach Sichtprüfung wieder Menge 2. Exakte private Kennungen und Dateihashes befinden sich im geschützten Paket. Den bestehenden Browser-Tab mit seinem sitzungsgebundenen Entwurfszugang nicht schließen, leeren oder durch einen anderen Tab ersetzen. Tokens nicht herauskopieren, protokollieren oder in URLs transportieren.

Offener Startbefund: In einem getrennten gesteuerten Chrome-Tab blieb das App-Frame leer. Browsersteuerung meldete eine pausierte Dokumentantwort; rohe CDP-Abfragen waren deshalb blockiert. Ein unabhängiger HTTPS-Abruf lieferte HTTP 200 mit vollständigem Start-HTML, App-Bridge, Modul und passenden Einbettungsheadern. Manuelle Adressbestätigung im bestehenden Tab brachte die gespeicherte Gestaltung zurück. Auch der gesteuerte Wechsel über die Shopify-Navigation ist **kein bestätigter Workaround**. Kein belegter Anwendungscodefehler, kein belegter dauerhafter Fix; weder das Toolproblem noch HTTP 200 beweisen einen fehlerfreien Kundenstart. [Detaillierte Diagnose](../APP-START-DIAGNOSE-20261022.md).

## 6. Private Sicherungen und vollständige Quellen

Alle folgenden ZIPs sind private Transferdateien, **nicht verschlüsselt**, gehören nicht in GitHub/Release/öffentliche Webverzeichnisse. Ein geschützter Übertragungsweg muss auf dem Zielrechner hergestellt werden. Die neue Gesamtdatei bündelt diese Pakete samt Anleitungen, Prüfern, Originalressourcen und Bestellbelegen. Ihr endgültiger Hash steht neben der ZIP-Datei und im lokalen Transferbeleg; keine selbstreferenzierende Hashangabe in ihrem eigenen Inhalt.

| Paket | Größe Bytes | SHA-256 | Aussage |
| --- | ---: | --- | --- |
| `gravuru-two-stores-20261022.zip` | 473613729 | `07746a50adc6ba101cc5a5e2a241864d7154c55d68e9746a4fb78790d99baaf2` | Sechs konsistente SQLite-Backups, vollständige damalige Quellen beider Stores, 1758 Dateien |
| `Gravuru-Vollquellen-20261022-v2.zip` | 74930132 | `73dcb4c4df29c396500a88820e3597bbb61af4ac9e38baa16fe05add7c3bccb2` | 1877 vollständige bekannte aktuelle Quelldateien/Prüfmittel einschließlich späterer Preis-/Fotokorrekturen; keine DB |
| `ABSCHLUSS-TESTBESTELLUNGEN-20261022.zip` | 15532771 | `462288f74873bc5afc6c44e55e528b3d0058b75a14d6da50371f8a3152cc42d0` | Historische Zwei-/Drei-Stück-Prüfpakete und Abschlussbelege; kein neuer DB-Gesamtabzug |
| jüngstes Foto-Prüfpaket | 5692074 | `555af712aaf11d592b314213079fba590afe1adc63b7015198e0a5a3aa5f1b23` | Gespeicherte neue Gestaltung einschließlich Originalfoto; private Kennung im Paketverzeichnis |
| `Gravuru-private-Datenuebergabe-2026-09-23.zip` | 23398513 | `6eb02fa2bf3c59bc10e9ddfa6c7efd5b2fe2098b27c177fda36370706cd369ff` | Getrennter historischer Werkstattbestand mit 171 Designs/sieben Plattenvorlagen |
| `REFERENZ-MATERIALIEN-20260930.zip` | 18647989 | `4623981f3825be5b04830f1e88c041c48476bc365753a84c80cbf169cf7c793d` | Materialquellen; außerdem acht zugeordnete Original-PNGs separat |

Zusätzlich `Gravuru-Historische-Vollquellen-20261022.zip`: rekonstruierte September-Werkstatt einschließlich GV-005–007, damalige Bedienfassung und getrennte spätere lokale Updatefassung samt Screenshots. Größe/Hash in `HISTORISCHE-QUELLEN-PRUEFUNG.json`. Die alten Fassungen sind Erhaltungs-/Vergleichsquellen, keine Aufforderung zum Deployment.

Stand der großen Zweistore-Datensicherung **vor** späteren Preis-, Bindungs- und Bestelländerungen. Ergänzende Prüfstandpakete ersetzen keine aktuelle komplette DB. Vor Wiederanlauf mit neuestem Geschäftsbestand oder weiterer Serveränderung ist ein frischer konsistenter Snapshot samt aktueller nicht geheimer Laufzeitzuordnung erforderlich. Zugangskonfiguration, private Schlüssel, Browserprofile/Sitzungen, Systeminstallation und Plesk-Einstellungen sind bewusst ausgeschlossen und müssen getrennt bereitgestellt werden. Datenbanksicherungen können private Inhalte und geschützte Entwurfsdaten enthalten; nicht öffentlich verwenden.

## 7. Datenbestände: nicht verwechseln

| Bestand und Zeitpunkt | Belegter Umfang |
| --- | --- |
| Legacy-Server, Zweistore-Sicherung 22.10. | 34 Produkte einschließlich drei Master, 94 Produktrevisionen, 102 Design-Assets, 36 aktuelle Designzuordnungen, ein Materialoriginal, ein Profil mit zwei Revisionen, 16 Prüfstände |
| Acryl-Server, gleiche Sicherung | 799 Produkte einschließlich eines Masters, 3991 Produktrevisionen, 90 Design-Assets, 30997 Zuordnungen, 161 Konturen, sieben Korrekturrevisionen; eine Variantengruppe mit fünf Revisionen und 798 aktuellen Mitgliedschaften |
| Lokale historische Werkstatt, 23.09. | 72 Produkte, 171 Designs, 175 Revisionen, 729 Motive, eine Anfrage; sieben Plattenvorlagen, davon fünf aktiv/zwei entfernt; 163 draft/acht deferred |

Designzuordnungen sind keine zusätzlichen Originaldateien. Die sieben Korrekturen im Acryl-Store sind nicht die sieben alten Plattenvorlagen. Den Septemberbestand nie in die zwei aktuellen Stores hineinkopieren. Alle historischen Ablehnungen/Entfernungen erhalten. Vier historische Acrylaufbauten, drei mit Klingelposition, und individuelle Bohrungen sind im Septemberpaket geprüft; keine neue Maschinenabnahme damit verbunden.

## 8. Tatsächlich ausgeführte Prüfungen

Neu für diese Übergabe:

1. GitHub-Branchspitze und gezielte lokale Quellhashes verglichen; aktuelle Dokumente gelesen.
2. Aus vollständigen Originalreleases und 66 gezielten Quellübernahmen eine **neue getrennte** vollständige Kopie beider Anwendungen erstellt. Keine Originaldatenbank geöffnet oder geändert.
3. Beide Konfigurator-Builds ausgeführt. Mit gesonderten Kopien der bereits restaurierten Sicherungen beide Werkstätten und gemeinsamen ID-Anschluss initialisiert. Keine öffentliche Netzwerkbindung, keine Shopify-Anfragen.
4. Alle bestehenden Dateninhalte in **50 Legacy- und 65 Acryl-Tabellen** vor/nach verglichen; SQLite-Integrität bestanden. Ausgenommen allein `tenant_settings.updated_at`, weil die Originalruntime diesen Betriebszeitstempel beim Start aktualisiert; alle Einstellungswerte verglichen. Bindungsregister und Warenkorbjournal verfügbar.
5. Aktuelles Quellarchiv: CRC und SHA-256 jedes Mitglieds geprüft. Historische Originalquellen separat anhand ihres ursprünglichen Inventars geprüft. Transfermanifest enthält jeden verpackten Bestandteil.

Historische, zum jeweiligen Änderungsstand tatsächlich ausgeführte Prüfgruppen: 118 ID-Anbindung, 126 Warenkorb/Revision/Preis, 40 Gateway/Host, neun Legacy-Kompatibilität, fünf Browser-Helfer, acht Snapshot-Dateiprüfungen lokal und Server, 15 Webhook-Prüfungen lokal/fünf davon Server, sechs Preisprüfungen **je Editor** plus 29 Staffelprüfungen, acht lokale und zehn Linux-Fotoprüfungen. Diese Mengen überschneiden sich; **nicht als Summe eindeutiger Gesamtregressionen ausgeben**. Einzelbelege in den verlinkten Fachübergaben und privaten Quittungen.

Die große Sicherung wurde zuvor über SQLite-Backup bei pausierten Schreibern erstellt, alle sechs Datenbanken getrennt restauriert, Hashes/Integrität/Fremdschlüssel geprüft. Der ältere Legacy-Zusatzprüfer hatte zunächst einen Schemafehler; `LEGACY-ZUSATZPRUEFUNG-V2.json` belegt die Korrektur des Prüfers, keine Datenmigration. Die heutige neue Laufzeitprüfung ersetzt weder den vollständigen isolierten Linux/Plesk-Wiederanlauf noch eine neue Live-/Browser-/Maschinenabnahme.

## 9. Ältere Quellen, die erhalten bleiben müssen

- [GV-005–007 und vollständige September-Werkstatt](https://github.com/Chris83638w/gravuru-shopify/blob/771ead19412979e8782e302262e13127dee044da/handover/werkstatt-2026-09-23/README.md), Branch `task/werkstatt-uebergabe-2026-09-23`. Commit/README in dieser Übergabe erneut gelesen. Materialoriginale, Doppelplatten, Klingel-/Bohrpositionen, Schriften/Kerning, Geometrie und maßhaltige Ausgaben eingeschlossen. Historische Installationslücken stehen dort, nicht verschweigen.
- [Bedienübergabe September](https://github.com/Chris83638w/gravuru-shopify/blob/d299ddfa139971130ec59996cc6365709435d3e5/PROJECT/UEBERGABE-KONFIGURATOR-2026-09-27.md), Branch `task/konfigurator-bedienung-20260927`: 234 gezielte Quellen, damalige Prüfungen/Entscheidungen. Checkout-/Rabatt-Status darin durch diesen aktuellen Stand teilweise überholt.
- Lokale additive Updatefassung `konfigurator-update-bis-20261016`: umgesetzt am 21.10., fachlicher Stichtag bis 16.10.; Direktbearbeitung, runde UV-Farbpunkte, Fotoeditor und Taupevergleich. Nicht ungeprüft durch die neue Gesamt-UI ersetzen. Vollkopie und `UPDATE-20261021.json` im historischen Quellpaket.
- [Getrennter Anschluss-Pilot 21.10.](https://github.com/Chris83638w/gravuru-2027/blob/a3fbaef116d67aeaf7ed9a5b07c2066112830880/tools/bestand-konfi-pilot-20261021/README.md): historischer Architektur-/Sicherungsnachweis, kein aktuell zu deployender Ersatz.
- Aktuelle Materialherkunft: [MATERIALREFERENZEN.md](../../MATERIALREFERENZEN.md). Originale und Ableitungen auseinanderhalten. Keine eigene Ersatztextur erzeugen.

## 10. Nächste Schritte in sinnvoller Reihenfolge

1. Übergabecommit und privates Gesamtpaket bestätigen, Hash und Inventar prüfen. Zugangslücken konkret nennen; nicht mit `main`, einem alten Demoport oder fremden Kundendaten auffüllen.
2. Unabhängiger normaler Chrome-Start im selben angemeldeten Browser, bestehende Gestaltung schonen; leeren Start zuerst reproduzieren/eingrenzen. Ein Codefix erst bei belegtem Fehler. Gespeicherter Tab bleibt erhalten.
3. Vor Serveränderung aktuelle konsistente Sicherung beider Stores einschließlich letzter Bestellungen und aktuellen Bindungen, getrennte Restaurierung. Keine Kopie laufender SQLite-Hauptdateien.
4. Bestehende Pilotstrecke vom Editor über Wiederöffnung/Warenkorbbearbeitung bis Bestelleingang überprüfen. Bestehende Bestellnachweise nutzen; neue Tests nur bei geänderter Strecke oder offener Nachweislücke. Foto-Bearbeitungsparameter und keine Zeilenduplikate ausdrücklich prüfen.
5. Weitere **konkrete** Produkt-/Varianten-IDs anhand ihrer eigenen Modelle und Preisverträge anbinden. Formpreis-/Zusatzoptionen schließen, fünf Bearbeitungsverfahren und echte Material-/Befestigungsdaten erhalten. Fertigungsprofil-Vererbung aus Unterkategorie als getrennte noch offene Bedienfunktion behandeln.
6. Öffentlichen Kundenstart, Berechtigungsgrenze, Aufbewahrung, Betriebsüberwachung, Wiederanlauf und repräsentative Lastprüfung separat abnehmen. Cloudreserve/AWS/GCP ist vom Nutzer vorerst zurückgestellt. Keine Zusage 100 % Verfügbarkeit.

Keine Anwendung, Shopify-Einstellung, Produktion, Datenbank oder laufende Browsergestaltung wurde für diese **Übergabeveröffentlichung** geändert. Frühere ausdrücklich beauftragte Installationen/Testkäufe sind oben datiert dokumentiert. Die nächste KI soll erst Analyse/Befunde liefern und echte neue Konflikte mit dem Nutzer besprechen; bereits bestätigte Vorgaben nicht nochmals abfragen.

## Weiterführende Belege

- [ID-Vertrag und anfänglicher Stand](../ID-ANBINDUNG-20261022.md) – historische Voraktivierung, nicht aktueller Abschlussstatus.
- [Installierter Preis-/ID-Stand und Shopify-Testkäufe](../ID-PREISSTAND-20261022.md).
- [Browserpreis/Fotoprüfung](../BROWSER-PREIS-ABNAHME-20261022.md).
- [Leerer Start: Diagnose und Nachweisgrenzen](../APP-START-DIAGNOSE-20261022.md).
- [Sicherung/ID-Prüfung](2026-10-22-private-sicherung-und-id-pruefung.md), [universelle Schnittstelle](2026-10-22-universelle-konfigurator-anbindung.md), [Katalogübergabe](2026-10-22-katalog-und-neuer-konfigurator.md).
- `ops/prepare-combined-id-release.mjs`, `maintenance/check-combined-id-release.mjs` (privates Quellpaket), `ops/plesk/upgrade-order-webhook-fields.mjs`, `legacy-patches/LEGACY-COMPATIBILITY.txt`.

Die Rekonstruktion benötigt vollständige private Originalreleases **und** zwei benachbarte Preis-/Vertragsquellen aus `tier-update-20261021`. Beides liegt im privaten Gesamtpaket. Ein Git-Clone allein ist keine vollständig eingerichtete Produktionsumgebung. Historische Installationsskripte haben feste Vorzustands-/Hashschutzprüfungen und dürfen nicht als allgemeines Wiederholungs-Deployment ausgeführt werden.
