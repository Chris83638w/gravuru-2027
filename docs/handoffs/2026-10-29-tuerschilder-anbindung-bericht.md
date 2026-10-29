# Türschilder: Bestand und Anbindungsplan · 29.10.2026

**Nur gelesen und lokal ausgewertet. Keine Shopify-Schreibaktion, kein Import in eine bestehende DB, keine Bindung, kein Theme-Wechsel, keine Bereitstellung. Der Pilot ist nicht freigegeben.**

Auftrag: [Claudes vollständiger Auftrag](https://github.com/Chris83638w/gravuru-2027/blob/dev/tuerschilder-anbindung-20261029-claude/docs/handoffs/2026-10-29-tuerschilder-anbindung-auftrag.md).
Eigener Berichtsbranch: dev/tuerschilder-anbindung-20261029-astra.
Code: 26952e48e857c9ad08b23bf4e8557f27dfdbc3eb; Katalog: caf50a6151cb0251813e341193487b0d9c3a2be3.

## Ergebnis für Chris

Alle 104 Edelstahl-Hauptprodukte sind im Shop vorhanden; für 103 fehlt im gelesenen Katalog die Startdesign-Freigabe. Bei Acryl fehlen Familien-/Hauptproduktzuordnungen, obwohl Originale und eine vollständige Formserie existieren. **Bei 15 von 29 älteren Acryl-Produkten unterscheidet sich das Shopmotiv von der Acryl-Bestandsfassung derselben Kennung.** Eine automatische Übernahme nach D-Nummer würde falsche Motive anbinden.

Daneben gibt es GR-Serien und Variante C. Diese erhalten eigene Bestandszeilen; sie werden nicht durch neue Hauptprodukte ersetzt. Preise müssen entschieden werden: Shoppreise unterscheiden sich häufig vom Familienkatalog, auch Familien- und Zeichnungspreise sind bei Schrauben widersprüchlich.

Vorschlag: zuerst Quellen klären, dann drei Produkte pilotieren (Rechteck, Oval, Acryl-Retro). Weitere Schritte erst nach Chris' ausdrücklicher Freigabe.

## Umfang und Belege

Titel/Produkttyp und bekannte SKU-Präfixe vollständig paginiert gelesen, danach mit dem **vollständigen Index aller 1.324 Shopprodukte** gegengeprüft (6 Seiten, letzte Seite hasNextPage:false). Dadurch zusätzlich GV-Prüfentwurf und Variante C gefunden. Detailbestand: **649 Produkte / 8.641 Varianten**, alle Detail-Variantenverbindungen vollständig paginiert. Davon sind 362 Produkte / 1.094 Varianten andere Linien/Verfahren und ausdrücklich ausgeschlossen. UV-Testprodukte, Hausnummern, Klingelschilder und Materialkombinationen aus dem Gesamtindex werden nicht pauschal in die beiden Türschild-Linien aufgenommen.

Der normalisierte Export bleibt complete:false: ein vollständiger Produktindex ist kein vollständiger Variantenexport des gesamten Shops. Damit gibt es keine unbeabsichtigte create-Freigabe.

| Gruppe | Produkte | Varianten | Befund |
| --- | ---: | ---: | --- |
| Edelstahl-Hauptprodukte laut Linie | 104 | 120 | ACTIVE; D8 plus 103 offene Freigaben |
| Edelstahl GR-ES, Familie/Hochzeit/Firma | 141 | 5.907 | ACTIVE; Master-/Hauptproduktzuordnung offen |
| Edelstahl Variante C | 1 | 309 | ACTIVE; bestehenden Produktstand erhalten |
| Edelstahl GV-Prüfentwurf | 1 | 1 | DRAFT; ursprüngliche Quelle auflösen |
| Acryl-Bestandsmotive TRE/TAE/TO/TR/TQ-A | 29 | 29 | ACTIVE; Originale vorhanden, 15 Motivabweichungen |
| Acryl GR-AC | 1 | 70 | ACTIVE; kanonische Hauptproduktzuordnung fehlt |
| Acryl TS-Acryl-Formserie | 1 | 798 | DRAFT; 798 Preise entsprechen dem Serien-Snapshot |
| Ohne SKU, Zuordnung offen | 4 | 4 | ACTIVE; Material/Quelle zuerst klären |
| Edelstahl TEST-GR-ES | 5 | 309 | 4 UNLISTED, 1 ACTIVE; gesonderter Testbestand |
| Andere Linie/Verfahren im Detailbestand | 362 | 1.094 | außerhalb dieses Anbindungsplans |

[Produktregister: 287 Zeilen](2026-10-29-tuerschilder-produktbestand.csv) mit Produkt-ID, Titel, Handle, SKU, Status, Variantenanzahl, Hauptprodukt, möglichem Zielprofil, Vorlage und Hindernissen.
[Acryl-Motivabgleich](2026-10-29-tuerschilder-motivabgleich.csv) mit Foto-URL und Originalpfad.
[Belegmanifest](2026-10-29-tuerschilder-belege.json) mit Quellständen, Zählern, lokalen Pfaden und SHA-256 der vollständigen Exporte/Pläne.

Große Belege ausschließlich lokal:
C:/Users/Christopher Koch/Documents/Codex/2026-10-23/files-pasted-by-the-user-du/outputs/tuerschilder-anbindung-20261029/

- varianten-plan.csv / .json: jede der 8.641 gelesenen Varianten, Titel/Handle/SKU/Optionen, Shop-/Katalogpreis, Status und Grund; ungeklärte cfg-ID/Revision ausdrücklich leer.
- fehlende-shop-varianten.csv: **410 fehlende Befestigungsvarianten** zu den 104 vorhandenen Hauptprodukten (530 Soll minus 120 Ist). Keine 410 fehlenden Produkte, keine Neuanlagefreigabe.
- shop-gesamtindex.json, shop-products-complete.json, shop-export-normalized.json: nachvollziehbare Abdeckung.
- shop-sync-steel-plan.json, shop-sync-acryl-plan.json, shop-bind-plan-ohne-db.json: vorhandene Skripte ohne Apply/Live/DB.
- bildpruefung/: 280 gesichtete Shopbilder; 133 Original-Zuordnungen (104 Edelstahl, 29 Acryl) als lokale Motivvorschau. Keine Schriften im Code-Repo. Rasteransichten sind keine Schrift-, Maß- oder Fertigungsfreigabe.

## Geometrie, Preise, Freigaben

### Edelstahl

104 Hauptprodukte verwenden 102 verschiedene Startdesigns. Nur D8 ist freigegeben; die übrigen 101 Master betreffen 103 Hauptprodukte. Der bestehende shop-sync liefert **1 unverändert, 103 offen, 0 update/create/konflikt**. Keine Freigabeprüfung ausgeschaltet.

Die Familie enthält 80 Größen mit Basispreisen; geometrie.json 81 Quellzeilen. Maße stammen aus den Quellen, nicht aus gerundeten Shopnamen: beispielsweise 7×2 → 70×23,3 mm und 8×5 → 80×53,3 mm, wo die Quelle dies festlegt.

Von 120 vorhandenen Hauptprodukt-Varianten passen 20 Preise zur Familie, 100 weichen ab. GR-ES: 1.110 gleich, 4.797 abweichend. Variante C: 105 gleich, 204 abweichend. Unterschiede belegen nicht automatisch falsche Shoppreise.

| Beispiel | Shop | Familien-/Serienbasis | Entscheidung |
| --- | ---: | ---: | --- |
| TRE-V2A-5x2-D1 | 19,90 € | 7,99 € | verbindlichen Verkaufspreis festlegen |
| TO-V2A-9x6-D1 | 19,90 € | 14,99 € | vor Oval-Pilot entscheiden |
| TR1-A-9x6-D14 | 22,90 € | 11,99 € | vor Acryl-Pilot entscheiden |
| D8 12×8 K00 | 19,99 € | 19,99 € | Basis stimmt |

**Interner Quellenkonflikt:** B02S in der Familie 2,69 €, in der Zeichnungs-Preisliste 2,99 €; B04S entsprechend 3,09 / 3,39 €. Über die Hauptprodukt-Sollvarianten gibt es 96 solche 30-Cent-Unterschiede und zehn Befestigungen, deren Schlüssel in der zugeordneten Zeichnungs-Preiszeile fehlt. Fehlende Schlüssel wurden nicht als 0 € interpretiert. Details: preisquellen-konflikte.json. Maßgebliche Preisquelle bestätigen/vereinheitlichen.

„Unverändert“ beim Sync bedeutet deshalb nicht vollständige Quellenkonsistenz. Der unabhängige Variantenabgleich bewertet nur **vier D8-Varianten als passt**; die Schraubenvariante bleibt wegen des Quellenkonflikts offen. Auch passt bestätigt nur Katalog/Shopdaten, keine aktive cfg-Revision oder Warenkorbfähigkeit. shop-bind wählt fünf D8-Varianten aus; sein DB-Prüfschritt wurde nicht ausgeführt.

### Acryl und weitere Bestände

linien/acryl-tuerschilder.json hat keine Familie und keine Hauptprodukte. shop-sync liefert deswegen **0 Ziele**, nicht „alles erledigt“. Vorhanden sind:

- serien/acryl-tuerschilder-2027.json: 798 Ausführungen, 79 Form-/Größenkombinationen, SW/AN, 3 mm. Shopprodukt 16175627665788 ist DRAFT; alle 798 Preise passen.
- Serien-cfg-IDs und Revision 5 sind ein historischer Katalogsnapshot, kein aktueller DB-Beweis. Standarddesign D1 ist kein Ersatz für verkaufte D14-Motive.
- Alle 29 Acryl-SKUs sind im Bestandsindex auffindbar (28 Originaldateien). Noch keine freigegebenen Ziele für diese Hauptprodukte.
- 25 Basispreise weichen von passenden Seriengrößen ab. Vier Nennmaße ungeklärt: TRE-A-7x2-D1/D26 und TAE-A-8x5-D34/D11; Serie führt 7×2,33 / 8×5,33. Keine stille Rundung. TO-A-12x4 ist anhand vorhandener EL-120X40-Geometrie ein Vergleichskandidat; verbindliche Zuordnung bleibt offen.
- GR-AC-Produkt 16127284511100 (70 Varianten) und Acryl-Serienartikel ohne gelesenes Hauptbild. Kein behaupteter Foto-/Konfi-Abgleich.
- Ohne SKU: 16067894018428 V2A 5×2; 16068225073532 A 12×4 oval; 16068880367996 Kunststoff 9×6 a.E.; 16083969147260 Linea 8×3,5. Kunststoff ist nicht automatisch Acryl.
- GV-Prüfentwurf 16131897262460, SKU GV-b6520f0a08fa98bd22047ea2, 79,99 €, Foto Pusteblume: Herkunft/feste Revision zuerst lesen, DRAFT erhalten.
- Variante C 16121424773500: 309 Varianten, eigenes Optionssystem Form/Größe/Befestigung, Foto Herzbaum. Nicht ins 104-Hauptprodukt-Schema zwingen oder Varianten löschen.
- TEST-Ovalartikel 16120817156476 ist ACTIVE. Keine automatische Archivierung oder Aktivierung anderer Tests.

## Titel, Handle, Foto und Original

104 Edelstahl-Hauptprodukte gegen Startdesign-SVGs auf Motivniveau geprüft; kein Motivwechsel festgestellt. Textabweichungen:

- TO-V2A-12x4-D48: Titel Vögel, Foto/Original Schmetterlinge. Vorschlag Titel korrigieren und Handle darauf abstimmen.
- TRE-V2A-9x3-D39: Titel Schlichtes Design ohne Motiv, Foto/Original Herz-Schnörkel. Vorschlag Motiv nennen.
- TRE-V2A-24x8-D40: Vogel-Silhouette ist eine Eule; präzisere Bezeichnung möglich.

141 weitere GR-ES-Fotos gesichtet. Ohne belastbare GR-Design-ID → Master-Zuordnung bleibt der Abgleich zum tatsächlich gebundenen Konfi-Design offen; ebenso Variante C und GV-Entwurf.

| Genannter Fall | Befund | Vorschlag, erst nach Chris |
| --- | --- | --- |
| TAE-A-8x5-D34 | Titel Katze, Handle Hund; Foto/Original Katze | Handle Katze + 301 |
| TR2-A-9x6-D16 | Titel Rose, Handle Katze; Foto/Original Rose | Handle Rose + 301 |
| TRE-A-8x2-D30 | Titel Fisch, Handle Schmetterling; Foto Hundekopf, Original ganzer Hund | zuerst Motivfassung, dann Titel/Handle |
| TRE-A-8x3,5-D19 | Titel Rose, Handle Pusteblume; Foto Rose, Original Baum | Originalzuordnung zuerst entscheiden |
| TO-A-15x8-D57 | Titel Herz-Ranke, Handle Vögel; Foto/Original Herzranke | Handle Herzranke + 301 |
| TQ-A-8x8-D30 | Titel Hundekopf, Handle Schmetterling; Original ganzer Hund | Motivfassung entscheiden, Handle + 301 |

Zusätzlich TRE-A-9x3-D45: Titel Ornament-Schnörkel und Original Ornament, Foto Vogel. Kein automatischer Bildtausch.

Vollständiger Vergleich (Beispielnamen sind keine Abweichung):

| SKU | Shopfoto | Acryl-Original | Befund |
| --- | --- | --- | --- |
| TRE-A-5x2-D3 | Linie zwischen zwei Textzeilen | Linie zwischen zwei Textzeilen | Motiv passt |
| TRE-A-5x2-D42 | Vogel | Herzlinie | offen: Abweichung |
| TRE-A-6x2-D4 | Waagerechte Linie | Waagerechte Linie | Motiv passt |
| TRE-A-6x2-D53 | Herz | Pfeil nach oben | offen: Abweichung |
| TRE-A-7x2-D1 | Text ohne Motiv | Text ohne Motiv | Motiv passt |
| TRE-A-7x2-D26 | Glocke | Schlüssel | offen: Abweichung |
| TRE-A-8x2-D6 | Anker | Schmetterlinge | offen: Abweichung |
| TRE-A-8x2-D30 | Hundekopf | Ganzer Hund | offen: Abweichung |
| TAE-A-8x5-D34 | Katze | Katze | Motiv passt |
| TAE-A-8x5-D11 | Pusteblume | Zwei Vögel mit Herz | offen: Abweichung |
| TO-A-9x6-D38 | Zwei gefüllte Herzen | Verschlungene Konturherzen | offen: Abweichung |
| TO-A-9x6-D61 | Herz mit Zweigen | Herz mit Zweigen | Motiv passt |
| TO-A-9x6-D62 | Schlüssel | Schlüssel | Motiv passt |
| TO-A-12x4-D22 | Haus | Wichtel | offen: Abweichung |
| TO-A-12x4-D33 | Pfoten | Katze | offen: Abweichung |
| TO-A-15x8-D7 | Segelboot | Schmetterlinge | offen: Abweichung |
| TO-A-15x8-D13 | Pusteblume | Pusteblume | Motiv passt |
| TO-A-15x8-D57 | Herzranke | Herzranke | Motiv passt |
| TQ-A-8x8-D30 | Hundekopf | Ganzer Hund | offen: Abweichung |
| TQ-A-8x8-D53 | Herz | Pfeil nach oben | offen: Abweichung |
| TRE-A-8x3,5-D2 | Text ohne Motiv | Text ohne Motiv | Motiv passt |
| TRE-A-8x3,5-D32 | Pfote | Hund | offen: Abweichung |
| TRE-A-8x3,5-D19 | Rose | Baum | offen: Abweichung |
| TRE-A-9x3-D45 | Vogel | Ornament | offen: Abweichung |
| TRE-A-9x3-D4 | Waagerechte Linie | Waagerechte Linie | Motiv passt |
| TR1-A-9x6-D14 | Pusteblumen | Pusteblumen | Motiv passt |
| TR1-A-9x6-D54 | Lilie/Fleur-de-Lis | Lilie/Fleur-de-Lis | Motiv passt |
| TR2-A-9x6-D16 | Rose | Rose | Motiv passt |
| TR2-A-9x6-D60 | Ornament | Ornament | Motiv passt |


**15 Abweichungen, 14 Übereinstimmungen auf Motivniveau.** Konkrete Pfade und Fotos stehen in der CSV. Materialwechsel und identische D-Nummern beweisen keine Motividentität. Bilder und Kennungen bis zur Einzelentscheidung erhalten. Jede später freigegebene Handle-Änderung benötigt gesicherten alten Pfad, 301 und Prüfung alter Links.

## Einstieg im aktiven Theme

Lesend geprüft: Theme 185833718140, gravuru-shopify-theme/production, MAIN. In templates/product.test-temp-svenja-grid.json ist App-Block gravuru_konfigurator_jetzt_personalisieren_EeGMbz deaktiviert. Aktiver Einstieg: **custom_liquid_mTPWzc**.

- liest product.metafields.custom.customization_id.value;
- verwendet die ausgewählte Shopify-Variante;
- zeigt Jetzt personalisieren bei vorhandener CustomizationID/Variante;
- verlinkt /apps/konfigurator/start mit product, variant und back;
- blendet die bisherige Personalisierungskarte aus.

**Vier** Produkte haben eine CustomizationID: 3100000, 3200000, 3300000 und D8/4100000. Nur D8 besitzt außerdem den gelesenen Designhash. Damit erfüllen vier Produkte die Liquid-Bedingung; das beweist keine vier funktionierenden Bindungen. Die Auftragsskizze „nur D8“ ist insofern zu präzisieren. Keine Konfi-Starts/Kundenentwürfe ausgelöst.

Weitere Produkte brauchen passende feste Bindung, Preisvertrag, Metafelder und nachweislich eingebundenen Start im verwendeten Template. In product.json/product.konfigurator.json wurde kein entsprechender aktiver Gravuru-Start gefunden. Nicht alle Produkte ungeprüft umstellen. Vorhandene Start-/Variantenlogik wiederverwenden.

## Feste Revision und 1,69-€-Vertrag

Stabile Profil-ID und Import-Journal-Schlüssel für Edelstahl stehen im Variantenplan gemäß SHOP-SYNC.txt. Tatsächliche cfg-ID, Revision, Bindungs-ID und aktive Kopfversion müssen aus dem bestehenden Store aufgelöst werden; hier nicht erfunden und historische Revisionen nicht als aktuell übernommen.

Lesebeleg eng begrenzen: Import-Journal, feste Produktbelege, aktive Bindungsköpfe/Optionen, Store-ID, Preise, ggf. Freigabe. Keine Kundenentwürfe, Uploads, Bestellungen oder Tokens.

shop-bind --db ist kein garantiert schreibfreier Leser: Repository-/OrderIntake-/Profil-Konstruktoren können Schema anlegen/migrieren. Deshalb hier ohne --db. Schema/Mandant/Zieldatei vor späterem Import unabhängig prüfen; im gelesenen scripts/katalog-import.mjs existiert kein wirksamer --migrieren-Schalter. Diesen Schutz nicht voraussetzen.

Bestehenden [D8-Probelauf](2026-10-28-d8-preis-probelauf.md) weiterverwenden:

- aktuellen $app.personalization-Vertrag mit besitzender App gid://shopify/App/423276544001 lesen; leer unter anderer App beweist kein Fehlen;
- tatsächliche Cart-Transform-ID, Installation, Release, blockOnFailure lesen; Shop Plus allein genügt nicht;
- Vorlage inklusive, weiteres/geändertes Motiv 169 Cent: motifCharge:'additional', extraMotifCents:169, Grundpreis unverändert;
- generischer shop-bind-Persist-Pfad übergibt keinen personalizationPricingFor-Callback und reicht allein nicht; D8-Vertrags-/Bindungsweg verwenden;
- D8-Skript gilt nur für eine K00-Variante und erwartet bestätigten früheren 0-Cent-/fehlender-Vertrag-Stand. Bei geändertem Iststand abbrechen, keine Übertragung auf alle Varianten.

## Pilotvorschlag und Vorbereitung

| Pilot | Produkt / K00-Variante | Profilkandidat | Offen |
| --- | --- | --- | --- |
| TRE-V2A-7x2-D5 Rechteck | 16077793821052 / 57265872109948 | katalog-edelstahl-tuerschilder-familienschilder-gr-es-re-70x23p3-t15-3100000 | Freigabe, cfg/Revision/Vertrag; 8,99 € passen |
| TO-V2A-9x6-D1 Oval | 16077799588220 / 57265914872188 | katalog-edelstahl-tuerschilder-familienschilder-gr-es-ov-90x60-t15-4900000 | Freigabe, 19,90/14,99 €, cfg/Revision/Vertrag |
| TR1-A-9x6-D14 Retro | 16078721581436 / 57269416984956 | offen; Bestandsmaster TR1-A-D14, Foto/Original passen | Hauptprodukt/Familienziel, 22,90/11,99 €, Freigabe/Revision |

Vorzugsweise zunächst nur diese drei K00-Varianten. Weitere Befestigungen nach Quellenklärung und eigenem Prüfbeleg.

Operator setzt $Katalog, $Export, $Ausgabe und D8-Pfade auf geprüfte lokale Quellen:

~~~powershell
node scripts/shop-sync.mjs --katalog "$Katalog" --linie edelstahl-tuerschilder --export "$Export" --hauptprodukt 3100000 --out "$Ausgabe/rechteck-sync.json"
node scripts/shop-sync.mjs --katalog "$Katalog" --linie edelstahl-tuerschilder --export "$Export" --hauptprodukt 4900000 --out "$Ausgabe/oval-sync.json"
node --max-old-space-size=2048 scripts/katalog-import.mjs --katalog "$Katalog" --linie edelstahl-tuerschilder --hauptprodukt 3100000,4900000 --kunden-ux-20261028 --json "$Ausgabe/pilot-import-probelauf.json" --metrics "$Ausgabe/pilot-import-messung.json"
node scripts/shop-bind.mjs --plan "$Ausgabe/rechteck-sync.json" --out "$Ausgabe/rechteck-bind-plan.json"
node scripts/shop-bind.mjs --plan "$Ausgabe/oval-sync.json" --out "$Ausgabe/oval-bind-plan.json"
node scripts/d8-pricing-dry-run.mjs --input "$D8Lesebeleg" --out "$D8NeuerVorschlagsordner"
~~~

Pilotbefehle nur dokumentiert, nicht ausgeführt. Import ohne --commit arbeitet im Speicher und baut lokale Vorschau-Dateien: nur separate Arbeitskopie. Freigaben bleiben Pflicht; kein --alle-designs zur Umgehung. Für Acryl gibt es noch keinen korrekten Hauptprodukt-Befehl: zuerst kanonische Zuordnung beschließen.

Später, erst nach Chris' Satz und frischem Ist-Abgleich:

1. Code/Katalog, drei Varianten, Preise, Store/Mandant/Schema, alte Köpfe/Verträge/Theme dokumentieren; konsistente private Sicherung.
2. Nur genehmigte Produktstände mit Kunden-UX: 50 Zeichen je Zeile, Designs aller Formen/Größen innerhalb der zulässigen Linie, Vorlage inklusive, zusätzlich/geändert 1,69 €. Keine Kennung/Vorlage austauschen.
3. Shop-Abgleich nur genehmigter Produkte mit frischem Export, geprüftem productSet-Plan/Journal. Fehlende Befestigungen separat entscheiden.
4. Preisvertrag/Bindung über D8-Logik gemeinsam prüfen: erwartete Kopfversion, frischer Prüfplan (60 s), feste Revision. Keine ungeschützte Sammelaktivierung.
5. Vorhandenen Theme-Einstieg verwenden. Funkklingel-Batchmuster übernehmen; AOSU-festes doorbell-pilot-bind.mjs nicht unverändert für Türschilder ausführen.
6. Desktop/iPhone: Originalmotiv, Maße/Bohrungen, Schrift, Größenwechsel, Optionen, Preis, Warenkorb mit Vorschaubild/Bearbeiten und Gestaltungserhalt; 0/1/2 Zusatzmotive = Basis / Basis+1,69 / Basis+3,38 €. Keine Bestellung.
7. Je Variante protokollieren; weitere Pakete erst nach erneuter Freigabe.

Der neue Galerie-Nachtrag 6 auf PR #42 verlangt eigene Linie bzw. dasselbe Funkklingel-Modell. Umsetzung separat; hier kein Galeriecode geändert.

## Rückweg

Vor Pilot: Vorschlag verwerfen, Shop unverändert. Nach Aktivierung: betroffenen Einstieg schließen, ursprüngliches Dokument als neue Revision speichern, Zustand über neue geprüfte Bindung/Kopftransition herstellen. Alte Bindungen, Entwürfe/Angebote erhalten. Keine ganze DB über neu eingegangene Bestellungen zurückspielen.

Shopoptionen/Metafelder/Template gegen gesicherten Vorzustand und frischen Vergleich zurücknehmen. Preisverträge nicht pauschal löschen/auf 0 setzen, solange Angebote/Warenkörbe davon abhängen. Globale Cart-Transform-Funktion bleibt bestehen. Bei späterer Handle-Korrektur 301 gesondert prüfen. Rückprüfung vor Wiederöffnung.

## Nachweis und offene Prüfungen

Belegt: vollständiger Produktindex, paginierte Detailvarianten, Katalog-/Originalquellen, Preis-/Maßabgleich, Motivsichtung, tatsächlicher Theme-Code und erfolgreiche vorhandene Dry-run-Skripte. 764 benötigte lokale Quellen vor Nutzung gegen Git-Baum geprüft. Vorhandene Python-/FontTools-Umgebung verwendet, keine Schriftdateien veröffentlicht.

Offen: Preise, 15 Acryl-Motivfassungen, kanonische GR-/Acryl-/Variante-C-Zuordnungen, Freigaben, enger aktueller DB-/Vertrags-/Funktionslesebeleg, dann Pilotfreigabe/Live-Abnahme. **Nicht behauptet, dass alle Varianten bereits konfigurierbar oder warenkorbfähig sind.**

