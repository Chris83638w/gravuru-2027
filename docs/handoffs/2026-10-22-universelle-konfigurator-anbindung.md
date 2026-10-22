# Universelle Konfigurator-Anbindung – geprüfter Einstieg, 22.10.2026

## Ergebnis und verbindlicher Umfang

Ein gemeinsamer Anschluss für alle Produktarten: **Shop + ProductGID + VariantGID → privater Datenbestand → bestehende Bindungs-ID → cfg-ID mit fester Revision → Kundenentwurf → unveränderlicher Prüfstand → Warenkorb-/Bestellposition → Fertigungsauftrag.**

Acryl ist die erste vollständig mit Shopify abgeglichene Serie, nicht die Begrenzung der Architektur. Bestehende Form- und native Konfiguratoren bleiben erhalten. Weder Produktkennungen noch freie Konturen, Designkorrekturen, Hilfslinien, Motivauswahl, Fotoverhalten oder Mitarbeiterfunktionen werden für den Anschluss ersetzt.

Dieses Paket ist der erste geprüfte Anschlussbaustein, **keine fertige Kunden- oder Liveanbindung**. Der neue Resolver arbeitet ausschließlich als private Planung. Auf dem laufenden Server und in Shopify wurde durch dieses Paket nichts geändert; Produkte wurden nicht veröffentlicht. Eine neue Gesamtsicherung wurde in dieser Prüfung noch nicht ausgeführt.

## Tatsächlich gelesene Ausgangsstände

| Quelle | Branch | Commit |
| --- | --- | --- |
| Neuer Konfigurator | dev/konfi-neu-20261019 | bf5c059f13e0868d7c554616b7c35ff7a328ae62 |
| Installierte Katalogübergabe | task/katalog-struktur-20261022 | b5a51053573647a9aff946020ef947e671512d71 |
| Parallele Anschlussanalyse | task/konfi-anbindung-20261022 | 1638bd2e95fced82129e12056201304e63f1d976 |
| Katalog, Repository Chris83638w/gravuru-katalog. | task/katalog-struktur-20261022 | 48a1a89b33756aa79a4e1f2b08d589483dedbaf7 |

Eigener Arbeitsbranch: **task/universelle-konfi-anbindung-20261022**, Ausgangsbasis 1638bd2.
Die vier Katalogcommits auf bf5 betreffen 77 Dateien; nur drei liegen im Konfiguratorbereich (Motivdialog und Routing). Der parallele Commit 1638bd2 ergänzt ausschließlich STATUS und eine Analyse. Er enthält keinen fertigen neuen Anschluss. Keine fremde Historie wurde zurückgesetzt.

Gelesen wurden Übergabe, Installationsbeleg, AGENTS.md, START_HERE.md, aktuelles STATUS.md, UMSETZUNGSPAKETE.md sowie gezielt die zugehörigen Katalog-, Kunden-, Warenkorb-, Bestell- und Fertigungsdateien. Keine Vollanalyse alter Backups.

## Frischer Shopify-Abgleich

Am 22.10.2026 zwischen 05:45:22 und 05:45:51 UTC wurden alle 798 Acrylvarianten über 16 Seiten gelesen. Shop: gravuru-design.myshopify.com, Währung EUR.

- Produkt **gid://shopify/Product/16175627665788**, weiterhin DRAFT.
- 798 eindeutige VariantGIDs und vollständige SKUs; keine fehlenden oder zusätzlichen Varianten, keine Preis- oder Produktzugehörigkeitsabweichung.
- 399 Schwarz-/Anthrazitpaare haben identische Preise. Shopify updatedAt blieb über alle Seiten unverändert.
- Schwarz 15×10 cm ohne Befestigung: VariantGID **gid://shopify/ProductVariant/57778071273852** → **cfg_d8bc2048-2f32-4e54-9134-7a0e8cfd38e0**, Revision 5, 1899 Cent.
- Anthrazit entsprechend: VariantGID **gid://shopify/ProductVariant/57778071306620** → **cfg_81380430-04a9-44f1-b604-5ef7c4f4cb91**, Revision 5, 1899 Cent.
- 79 Form-/Größenkombinationen. Die 81 Größenzeilen sind kein Anlass zum Löschen: RE/AB 30×20 unterscheiden sich in Bohrungs-/Befestigungsausführungen.
- Vier aktuelle Hunde-Hauptprodukte 16168868348284, 16168869429628, 16168869659004 und 16168869724540 wurden erneut als DRAFT mit jeweils 48 Varianten bestätigt. Ältere Entwürfe bleiben getrennt.
- 399 Edelstahlvarianten sind im Katalog vorbereitet; daraus entsteht keine automatische Bindung an alte Shopify-Artikel.

Der vollständige nichtprivate Abgleich aller 798 IDs liegt in [evidence/universal-binding-20261022/manifest.json](evidence/universal-binding-20261022/manifest.json) und dessen elf Kandidatendateien. Diese Daten sind ein datierter Prüfbeleg, **kein aktives Bindingregister**. Vor Aktivierung Shopify und Serverrevisionen erneut vergleichen. Die [Produktmatrix](evidence/universal-binding-20261022/catalog-product-matrix.json) benennt die weiteren Produktlinien und ihre Lücken.

## Frischer Serverabgleich

Plesk wurde nach erneuter Benutzeranmeldung ausschließlich lesend geprüft:

- App-Einstieg SHA-256: **0eadb4721352e67e5cb92bbc80df3b6d40e78ed0c810f3e5c6012facdc285452**.
- Die zehn Dateien des Katalog-Installationsbelegs vom 22.10.2026 04:33:05 UTC stimmen weiterhin mit ihren Prüfsummen überein.
- Acryl-Store: 799 nicht archivierte aktuelle Dokumente, davon ein Master und 798 Formprodukte; 3991 gespeicherte Produktrevisionen.
- Sieben Designkorrekturen sind vorhanden, jeweils Revision 1. Ihre Inhalte wurden weder überschrieben noch auf den lokalen Quellsnapshot zurückgesetzt.
- **Keine operativen Shop-Bindungen** im Acryl-Store.
- **Keine manufacturing_profiles / manufacturing_profile_revisions** im Acryl-Store und **kein productionProfile-Verweis in den 799 aktuellen Dokumenten**. Die Material-/Bearbeitungsangabe allein ersetzt keinen festen Fertigungsprofilstand.
- Aktuelle Datenbankgrößen: workshop.sqlite 258023424 Byte, profiles.sqlite 77824 Byte, design-assets.sqlite 10428416 Byte. Diese Größen sind Inventarwerte laufender Datenbanken, keine Sicherungsprüfsummen.

Der bisherige allgemeine Store wurde ebenfalls frisch lesend geprüft: 34 aktuelle nicht archivierte native Dokumente, 2295 bestehende Shop-Bindungen, aber ebenfalls keine manufacturing_profiles und keine productionProfile-Verweise. Das ist kein Anlass, bestehende Testbindungen zu löschen oder stillschweigend als livefertig zu markieren. Sein älteres Tabellenschema hat noch keine tenant_id-Spalte an Produktrevisionen; der Storeadapter muss den tatsächlichen Versionsstand berücksichtigen.

Die Hüllruntime betreibt den bisherigen allgemeinen Store und den Acryl-Store getrennt. Eine Shopify-ID darf daher nicht stillschweigend gegen die falsche Datenbank aufgelöst werden. Die heutige Prüfung enthält keine Kundeninhalte, Bestelldaten oder Zugangsdaten.

## Konkrete Schnittstelle

Neue private Funktionen in [shop-product-binding-plan.mjs](../../app/workshop/shop-product-binding-plan.mjs):

- **planShopProductBindings** prüft den aktuellen Shopify-Lesebeleg, feste cfg-Revision, Produktdokument, Variantenoptionen, bestehenden Basispreis, zugeordneten Fertigungsprofilstand und vorhandene Bindungen.
- **resolveShopProductBinding** verlangt exakt ProductGID und VariantGID sowie denselben Shop, Mandanten und privaten Store. Produkt-/Profil-/Bindungsänderungen und veraltete Belege werden erkannt.
- Ausgabe: Wiederverwendung einer vorhandenen Bindung oder ausdrücklich **bind-required**. Keine Speicherung, Freischaltung oder eigene Preisformel.
- Immer **mode: plan-only, publicAccess: false, checkoutEnabled: false**.
- Vorhandene historische Bindungen bleiben unverändert. Ein aktiver Zielstand darf später nur ausdrücklich und revisionsgesichert gewählt werden; nicht über Sortierung, erste Zeile oder „neueste cfg“.

Die Leseadapter verwenden bestehende Quellen: Repository, shopgefilterte orderIntake.bindings(), Produktionsprofil-Repository und die echte Variantenzeile aus prepareShopProduct. Native kundeneigene Zusatzfelder dürfen keine permanente Variantenwahl bilden. Bei Formprodukten bleibt die jeweilige feste Ausführung einschließlich Originalkontur und Designfreigaben bestehen.

Details und Betriebsgrenzen: [SHOP-PRODUCT-BINDING-PLAN.txt](../../app/workshop/SHOP-PRODUCT-BINDING-PLAN.txt).

## Korrekturen zur vorherigen Anschlussanalyse

- commerce/v2 verhindert nicht mehrere cfg unter einem Shopify-Hauptprodukt; die Variantenliste muss innerhalb der jeweiligen cfg vollständig sein.
- form_shop_binding_selections existiert bereits. Kein zweites Optionsregister ohne belegte Lücke anlegen.
- acryl-shop-service.mjs liest bereits echte VariantIDs, SKU, Preis und Optionen. Diesen Abgleich kontrolliert in bestehende Bindungen übernehmen.
- draft-cart-handoff.mjs unterstützt Form- und native Prüfstände. Ein gemeinsamer Anschluss benötigt keine Neuanlage aller cfg-IDs und keine Vereinfachung freier Retro-Konturen.
- Der native variant-m-Editor ersetzt den vorhandenen Formeditor nicht. Beide werden über die gemeinsame Verbindung bedient.

Die ältere Analyse bleibt als historische Quelle erhalten. Diese belegten Präzisierungen sind bei der Umsetzung maßgeblich.

## Änderungen und ausgeführte Prüfungen

1. Neuer privater, materialunabhängiger ID-Planer mit 21 Tests.
2. Einzige Änderung an vorhandenem Laufzeitcode: **commerce.mjs importiert optionFieldEntries aus contract.mjs**. Der bestehende Aufruf hatte keinen Import.
3. 13 bereits vorhandene Tests zu Commerce, Varianten-Zusatzfeldern und Warenkorbbearbeitung bestanden; commerce.mjs zusätzlich erfolgreich importiert.
4. Insgesamt **34 Tests bestanden**, unabhängiger Review des ID-Planers abgeschlossen.

Die 21 Planertests prüfen beide Produktschemata, historische/fehlende Bindungen, Varianten- und Produktzugehörigkeit, Preisabweichung, unveränderte Originalkennungen, Shop/Mandant/Store, Optionen, Profil-/Dokument-/Revisionsänderungen, Belegalter und Manipulation. Sie sind synthetisch und beweisen keine echte Shopify-Bestellung.

Die lokale Arbeitskopie wurde gezielt aus geprüften Git-Blobs zusammengestellt und ist noch kein vollständiger startfähiger Checkout. Die dafür gespeicherten Beschaffungsbelege sind lokale Nachweise. Der GitHub-Branch basiert dagegen auf dem vollständigen vorhandenen Repository. Der komprimierte Acryl-Quellsnapshot wurde in dieser Runde nicht erneut lokal heruntergeladen und entpackt; seine Manifestangaben sind nicht als neu geprüfter Snapshot zu behandeln.

## Noch erforderliche Anschlussarbeiten

| Bereich | Belegter Stand | Notwendiger nächster Schritt |
| --- | --- | --- |
| Sicherung | Katalogbeleg enthält eine DB, kein neuer vollständiger Zweistore-Restore | Beide aktuellen Stores konsistent sichern, getrennt wiederherstellen und neue Korrektur-/Variantenbezüge prüfen |
| IDs | Alle Acryl-VariantIDs abgeglichen; noch kein operatives Binding | Vorhandene bind/bindVariants-Validierungen nutzen; expliziten aktiven Store-/Binding-/cfg-Stand revisionsgesichert speichern |
| Profile | Acryl hat keine festen Fertigungsprofilzuordnungen | Geeignete vorhandene Profile prüfen/zuordnen; fehlende Maschinen-/ICC-Freigaben offen halten |
| Kundenpfad | Mitarbeiterwege geschützt; Kundengrenze fehlt | Eigene schmale Kundenroute und private Entwurfsberechtigung; Mitarbeiter-APIs geschützt lassen |
| Formeditor | Form-Prüfstand bereits vorhanden | Warenkorbbearbeitung unterstützt bisher nur native adraft; draft-Formadapter ergänzen |
| Fotos | Native Wiederöffnung unvollständig | editSourceUrl/photoEdit und ausgeblendete Elemente verlustfrei speichern/wiederöffnen |
| Gemeinsamer Warenkorb | Create/update vorhanden | Hinzufügen in bestehenden Warenkorb, eindeutige Gestaltungspositionen und kontrollierter Wiederabgleich bei unklarem Ausgang |
| Staffelpreis | Fotos werden in diesem Quellstand noch nach Rabatt addiert | Nutzerentscheidung 6 % bei 2 / 10 % ab 3 auf vollständigen Stückpreis umsetzen; je Stück einmal auf Cent runden |
| Bestelleingang | Legacy-Testpfad, API 2026-07, payload.test === true | Store-spezifische Zuordnung, Rohtext-HMAC, Idempotenz, Storno-/Erstattungswege und fehlende Zuordnungen prüfen |
| Fertigung | Export-/Freigabebausteine vorhanden | Bestellposition → Job automatisch zuordnen; alle erforderlichen Ausgabekontrollen erzwingen; requiresReview und Testbestellungen sperren |

Die neue Hunde-Serie hat 2599 Cent einschließlich erstem Foto, weitere Fotos 899 Cent und Motive 160 Cent laut aktuellem Katalog. Der ältere Testpilot mit 2299 + 999 Cent darf diese Serie nicht überschreiben. Die Hunde-Produktfamilie muss die aktuelle Serie einschließlich Bohrungs-/Randdaten treffen; keine alte Katalogfamilie als stillen Ersatz verwenden.

Die fünf Material-/Bearbeitungsvarianten der Oberfläche sind von den tatsächlich zugewiesenen versionierten Fertigungsprofilen zu unterscheiden. „Für alle Produkte anbindbar“ bedeutet ein gemeinsamer Anschluss mit expliziten IDs; ein Produkt mit fehlender Geometrie, Preis- oder Fertigungsfreigabe wird dadurch nicht automatisch verkaufsfertig.

## Abnahme und nächster begrenzter Schritt

Vor dem ersten serverseitigen Anschluss die **frische Sicherung beider Stores mit geprüftem Restore** erstellen. Danach den Resolver über reale Leseadapter in der geschützten Händleransicht verwenden und vorhandene Bindungen übernehmen; zuerst eine tatsächliche Formausführung und eine native Ausführung. Profil-/Datenlücken werden dabei sichtbar und müssen vor der Bestell-/Fertigungsfreigabe behoben werden.

Anschließend Abnahme über Schwarz/Anthrazit, freie Konturen, kleine Designs, alle Befestigungen, zwei verschiedene Gestaltungen derselben Variante, Mengen 1/2/3, Fotos, Warenkorbbearbeitung, Neuladen, Doppelklick/Timeout, wiederholte Webhooks, fehlerhafte Zuordnungen, Exportfehler, Storno/Erstattung und spätere Vorlagenkorrektur.

Keine Testbestellung darf eine physische Fertigungsfreigabe auslösen. Keine öffentliche Veröffentlichung vor vollständiger Gesamtabnahme und ausdrücklicher Freigabe durch Chris.
