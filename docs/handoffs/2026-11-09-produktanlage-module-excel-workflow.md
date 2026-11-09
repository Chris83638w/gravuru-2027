# Neue Produkte im Prio-Konfi: verbindlicher Workflow

Stand 09.11.2026 · Mika/Codex im ausdrücklichen Auftrag von Mikail. Gilt für Astra, Claude, Codex und alle Vorlagen-, Katalog- und Produktchats. Diese Anweisung dokumentiert den Arbeitsablauf; sie behauptet keine bereits fertige automatische Excel-Freigabe oder neue Live-Aktivierung.

## 1. Aktuelle Nutzerentscheidungen

Mikail hat heute ausdrücklich verlangt:

- Die anderen Produkt-/Vorlagenchats sollen nach diesem gemeinsamen Workflow arbeiten.
- **Vor jedem neuen Produkt Module, Optionen und sämtliche Preise vorlegen und von Mikail bestätigen lassen.** Er kann weitere Module nennen. Ein konkret aufgelisteter Stapel darf gemeinsam bestätigt werden; keine pauschale Freigabe künftiger Produkte.
- **Zu jedem Produkt eine Excel als dauerhafte, versionierte Referenz anfertigen.**
- Den schnellsten geeigneten vorhandenen Weg benutzen, gern Shell/Skript/API; **keinen neuen Konfi pro Produkt programmieren oder kopieren.**
- Unmögliche Funktionen nicht anbieten: kein Foto → kein Foto-Reiter; keine Bohrungen → keine Bohrungsoptionen. Zulässige Alternativen bleiben sichtbar. Regeln können von Material, Form und Größe abhängen.

Der freigegebene Prio-Konfi bleibt die gemeinsame Kundenoberfläche. Andere Produktchats bearbeiten nur die beauftragten Vorlagen und zuvor bestätigten Produktdaten. Änderungen am gemeinsamen Editor, Layout, Verhalten, Ressourcenlader oder Preis-/Checkout-Kern bleiben Mika in Abstimmung mit Mikail vorbehalten. Es gibt keinen Auftrag zur eigenständigen Kunden-UI-Optimierung.

Designarbeit folgt dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Ein Bild, eine fertige Vorlage oder eine technisch gültige Datei ist noch keine Verkaufsfreigabe.

## 2. Der kurze Ablauf

**Vorlage und Quellen sammeln → Produkt-Excel und konkreten Anlageplan vorbereiten → Mikail bestätigt Module, Optionen und Preise → Produktentwürfe über bestehende Dienste → Vorschau/Preis/Warenkorb/Produktion prüfen → freigegeben mit Shopify abgleichen.**

Vor der Bestätigung sind Recherche, Quellprüfung, Designentwürfe, Excel und ein unverbindlicher Plan erlaubt. Keine neue native Produktanlage oder Shopify-Anlage aus einem unbestätigten Plan. Das Speichern einer Gruppen-Vorlage oder das Auswählen eines vorhandenen Modulprofils ersetzt die Bestätigung nicht.

Bereits beauftragte reine Quellvorlagen-/Galeriearbeit darf weiterlaufen. Ihre Entwürfe und Vorschauen sind keine neue Verkaufsproduktanlage und erhalten dadurch keine Verkaufsfreigabe. Diese Anleitung soll parallele Designvorbereitung koordinieren, nicht stoppen.

Bereits existierende Produkte und Bindungen zuerst suchen. Ein wiederholter Auftrag oder Importlauf darf keine Dubletten erzeugen. Änderungen an vorhandenen Produkten werden als eigener Änderungsplan mit Vorher/Nachher dargestellt; sie sind keine verdeckte Neuanlage.

## 3. Was Mikail vor der Anlage sehen muss

Eine lesbare Übersicht plus die zugehörige Excel, keine technische JSON-Frage an den Nutzer:

| Gegenstand | Konkret vorlegen |
| --- | --- |
| Anlageumfang | Jedes Produkt mit eindeutiger Arbeitskennung, Produktgruppe/Unterkategorie, Titel; bei Stapeln vollständige Liste und Anzahl |
| Verfahren und Material | Tatsächliches Material, Stärke und Druck-/Gravurverfahren; erlaubte Materialien je Unterkategorie |
| Ausführung | Alle angebotenen Formen, genaue Maße, skalierbare Reihen und Ausnahmen |
| Befestigung/Zubehör | Erlaubte Optionen, Farben, Stückzahlen, Größenabhängigkeiten, unzulässige Kombinationen; kein Beispielsatz als vollständige Liste |
| Module | Ausführung, Designs, Text/Schriften, Motive, Foto, Logo, Farben: jeweils an, aus oder noch offen; begründete Verfügbarkeit |
| Preise | Basispreis je verkaufter Variante, alle Aufpreise und deren Einheit (je Motiv/Foto/Logo/Stück/Set), Währung, Steuer-/Bruttokontext und Preisquelle |
| Standardauswahl | Startform/-größe/-befestigung und erlaubte Standardwerte ausdrücklich nennen |
| Designs | Designgruppe, freigegebene Originale, Zielmaterial/-format und Startdesign passend zum Hauptproduktbild |
| Neue Wünsche | Explizit fragen, ob weitere Module oder Optionen fehlen |
| Freigabe | Excel-Version, Quellstände und exakt zugehöriger Plan; noch offene Punkte sichtbar |

Verbindliche Frage: **„Bestätigst du für diese aufgelisteten Produkte die Module, Optionen und Preise in dieser Excel-Version? Was soll geändert werden, und fehlt dir ein weiteres Modul?“**

Bekannte Entscheidungen als Vorschlag übernehmen und referenzieren, nicht erneut erfinden. Die Bestätigung muss dennoch genau die neuen Produkte umfassen. „Alles wie bisher“ nur mit benannter Vorgängerversion und sichtbarer vollständiger Zielübersicht verwenden. Leere Preise bleiben offen; niemals still 0 €, kostenlos oder einen ähnlichen Produktpreis einsetzen.

## 4. Ein Konfi, vorhandene Module und produktspezifische Auswahl

Aktueller Kundenvertrag: `gravuru-configurator-modules/v1`, `config.moduleProfile` mit fester `id`, `revision` und sieben vollständig angegebenen booleschen Schaltern. Prüfstand: Kundenquelle `f69c8dbf` / veröffentlichter Code `767701ee`.

| Technischer Schlüssel | Bedeutung | Produktdaten bestimmen |
| --- | --- | --- |
| `options` | Ausführung | Material, Form, Größe, Befestigung, Zubehör und deren gültige Kombinationen |
| `designs` | Designwahl | Zulässige Designgruppe/Originale und Startdesign |
| `text` | Text und Schriften | Felder, erlaubte Schriften und bestehende Bearbeitungsrechte |
| `motifs` | Motive | Erlaubte Motivauswahl und bestätigter Aufpreis |
| `photo` | Foto | Upload zulässig, Anzahl, bestätigter Preis und vorhandene Bearbeitung |
| `logo` | Logo | Upload zulässig, Dateitypen, Anzahl und bestätigter Preis |
| `colors` | Farbwahl | Freigegebene Farben passend zum tatsächlichen Verfahren |

Die Schalter sind eine zusätzliche Freigabegrenze. `true` macht aus einem Produkt ohne native Foto-/Farb-/Fertigungsfähigkeit kein geeignetes Produkt. Die vorhandenen fachlichen Prüfungen bleiben maßgeblich. Fehlende oder widersprüchliche Fähigkeiten vor dem Plan klären.

Eine vorhandene Vorlage mit Foto-/Logo-Uploadbereich passt nicht automatisch zu „Foto/Logo aus“. Der aktuelle Vertrag meldet solche Konflikte. Passende Designgruppe auswählen und bestätigen lassen; vorhandene Gestaltungselemente nicht still löschen, um den Schalter durchzusetzen.

### Sichtbarkeitsregel

- Foto nicht erlaubt: kompletter Foto-Reiter und dessen Kundenaktionen fehlen.
- Logo nicht erlaubt: kompletter Logo-Reiter fehlt; Foto und Logo getrennt behandeln.
- Im bestehenden Konfi teilen Foto/Logo einen Uploadbereich: nur Logo erlaubt → „Logo“, nur Foto erlaubt → „Foto“, beide aus → Bereich entfällt. Keine zusätzlichen Reiter oder neue Oberfläche daraus ableiten.
- Bohrungen nicht erlaubt: sämtliche entsprechenden Bohrungs-/Beschlagoptionen aus der Auswahl nehmen. Kleben oder andere bestätigte Befestigungen bleiben verfügbar.
- Bohrungen nur bei bestimmten Maßen/Formen möglich: Anzeige für die **aktuell gewählte Variante** filtern. Ein früher gewählter unzulässiger Wert darf nicht im gespeicherten Zustand oder Preis verbleiben; das konkrete Wechselverhalten mit dem vorhandenen Adapter prüfen.
- Ein Bereich ohne zulässige Auswahl erscheint nicht als leere Gruppe oder leeres Menü. Feststehendes Material/Format kann weiterhin in der Produktinformation stehen, ohne einen leeren Auswahlreiter zu erzeugen.
- Kundenanzeige, gespeicherte Gestaltung, serverseitige Prüfung, Preis und Fertigung müssen dieselben Regeln verwenden. Nur per CSS verstecken reicht nicht.

**Bohrlöcher sind kein zusätzlicher v1-Modulschlüssel**, sondern Optionen unter `options`. Keine neue allgemeine Boolesche „holes“-API neben dem bestehenden Vertrag erfinden. Diese Sichtbarkeitsregeln sind für jedes neue Produkt nachzuweisen; die Vollständigkeit sämtlicher Adapter ist damit nicht pauschal als live geprüft erklärt.

### Wenn Mikail ein neues Modul nennt

Wunsch im Excel-/Planabschnitt „Offene Fragen/Neue Module“ erfassen: Zweck, gewünschte Bedienung, erlaubte Produkte, Variantenabhängigkeiten, Preisregel, Beispiel und Quelle. Prüfen, ob es bereits durch ein Modul plus Produktdaten abbildbar ist (z. B. Ständer/Füße unter Ausführung). Falls eine echte neue Fähigkeit nötig ist, erstellt Mika eine getrennte Erweiterung des gemeinsamen Modulsystems nach Abstimmung. Kein Produktkonfi-Fork, kein unbekannter JSON-Schlüssel und keine künstliche Aktivierung eines noch nicht gebauten Moduls. Betroffene Produktanlage bleibt bis Klärung offen; unabhängige vollständig bestätigte Produkte können weiter vorbereitet werden.

## 5. Excel je Produkt: Referenz und Eingabegrundlage

Start mit [Produktfreigabe-Vorlage.xlsx](../templates/Produktfreigabe-Vorlage.xlsx). Die Vorlage ist unbestätigt und enthält keine gültigen neuen Produktpreise oder Verkaufsfreigaben. Pro künftigem Shopify-Angebot/Produkt eine eigene Datei; alle zugehörigen Varianten darin. Nicht für jedes Design eine neue Excel anlegen, wenn die Designs zur selben Produkt-ID gehören. Der Produktschnitt selbst gehört zum bestätigten Plan.

[Feldschema und Verwendung](../templates/Feldschema-Produktfreigabe.md), [Prüfbeleg der Leervorlage](../templates/Produktfreigabe-Vorlage.pruefung.json). Vier Blätter: Freigabe, Module, Varianten und Optionen. Die bestätigte Plan-ID und der Plan-Hash sowie feste Gruppen-/Modulprofilrevisionen haben eigene Referenzfelder. Der Dateihash und der tatsächliche Zustimmungsbeleg werden außerhalb der XLSX geführt.

Empfohlene Ablage im **Katalog-Repo**, sobald eine echte Produktkennung vorliegt:

`produktfreigaben/<produkt-kennung>/r<version>/Produktfreigabe.xlsx`

Daneben gehören der maschinenlesbare konkrete Plan, Quellen-/Dateiprüfsummen und der Freigabebeleg. Das ist die neue Arbeitskonvention, kein bereits implementierter automatischer Ordnerimport. Keine Kundenfotos, Geheimnisse, Sitzungstokens oder personenbezogenen Bestelldaten in GitHub ablegen.

Pflichtinhalt: Produktkennung/Version, Gruppe, Quellrevisionen, Original-/Designverweise, Modulschalter, Varianten/Material/Maße, zulässige Optionen, Basis- und Zusatzpreise, Standardwerte, offene Fragen, Plan-ID/-Hash und Freigabequelle. Excel-Beträge lesbar in EUR; Import und native Prüfung rechnen in ganzen Cent, Maße in mm.

**Keine zweite unabhängig gepflegte Preisliste:** Excel und Entwurf der zuständigen Katalog-/Produktquelle aus denselben vorgeschlagenen Werten vorbereiten; daraus den nativen Plan erzeugen und zeilenweise gegen die Excel abgleichen. Keine produktiven Preise dabei verändern. Bei Widerspruch stoppen, nicht einen der Werte still bevorzugen. Der endgültige Plan und die Excel müssen vor Bestätigung übereinstimmen. Die von Mikail bestätigten Excel-Werte sind anschließend die menschliche Preisreferenz. Datei einfrieren; Änderung ergibt eine neue Version und neue Bestätigung.

Die Bestätigung enthält Plan-ID/-Hash, Excel-Prüfsumme, Quell-/Profilrevisionen, Datum und den Verweis auf Mikails tatsächliche Antwort. Eine gemeinsam bestätigte Stapeldatei ersetzt nicht die verlangte Excel pro Produkt. Ein rein vom Agenten erzeugtes `accepted:true` ist kein Beleg für eine persönliche Zustimmung.

**Statusgrenze:** Automatischer vollständiger XLSX-Export/-Import samt Freigabeverknüpfung ist in den geprüften Gruppen-/Moduldiensten noch nicht vorhanden. Die Vorlage und dieser Arbeitsablauf sind sofort nutzbar. Ein späterer Adapter muss diese Daten in die bestehenden Dienste überführen; keine zweite Preis- oder Anlage-Engine bauen.

## 6. Designstrecke und gemeinsame Ressourcen

1. Katalogoriginal über stabile Original-ID und Revision zuordnen. Bestehende Originale, Fotos/Masken, Texte, Fonts, Motive und Rechte unverändert übernehmen; keine Gestaltungsänderung als Nebenprodukt der Anbindung.
2. Designgruppe mit erlaubten Zielmaterialien und Formaten ausdrücklich festlegen. Sichtprüfung und Freigabe beziehen sich auf konkrete Stände; keine pauschale Übertragung auf alle Materialien/Größen.
3. Das Hauptproduktbild und das im Konfi zuerst geöffnete Design verweisen auf dasselbe Original. Keine Zuordnung durch Bildvergleich, Namen oder Dateinamen raten.
4. Gleiche Grundplatten und Schriften über vorhandene gemeinsame Ressourcen-IDs referenzieren, nicht pro Design kopieren. Designabhängige Vorschaubilder dürfen abgeleitet je Design entstehen.
5. Echte Maße und Seitenverhältnisse behalten. Bohrungen/Beschläge in realen mm berechnen; eine andere Lochdarstellung ersetzt kein korrektes Produktmaß. Unterschiedliche Seitenverhältnisse nicht verzerren. Neue Form-/Materialquelle vorher prüfen.
6. Galerieänderungen in dieselbe native Vorlage zurückspeichern, neue Revision erzeugen, Vorschau/Schnellbearbeitung/Freigabestatus neu bestimmen. Erst ein bewusster bestätigter Synchronisierungsplan ändert den Shop. Historische Bestellstände bleiben unverändert.

## 7. Bestehende technische Anschlussstellen benutzen

Diese Verträge wurden auf den aktuellen, getrennten Entwicklungs-/Verwaltungsständen gelesen. Sie sind nicht alle im alten main-Quellbaum enthalten. **Nicht fehlende Dateien durch einen kompletten Branch-/Runtimeaustausch nachziehen.**

| Zweck | Vorhandener Vertrag / Stelle |
| --- | --- |
| Kundenmodulschutz | `app/configurator/variant-m/module-profile.mjs`: `validateModuleProfile`, `nativeModuleAvailability`, `moduleProfileIssue`, `applyModuleProfile` |
| Profilbibliothek | `app/workshop/configurator-module-profiles.mjs`: `createConfiguratorModuleProfiles`, feste IDs/Revisionen |
| Gruppen-Vorlagen | `app/workshop/product-group-templates.mjs`: `createProductGroupTemplates`, Schema `gravuru-product-group-template/v1` |
| Konkrete Neuanlage | `plan` → `confirm({planId,planHash,accepted:true})` → `execute({planId,planHash,confirmationId})`; `gravuru-product-group-creation-plan/v1` |
| Varianten und Preis | `productGroupVariantReview` in `product-group-templates.mjs`; `prepareShopProduct(record)` in `shop-preparation.mjs`; Plan enthält `unitCents` |
| Bestehende Galerie synchronisieren | `createGalleryModuleSync` / `createGalleryShopSync`, `gravuru-gallery-shop-sync/v1` |
| Shop-Bindungen | `planShopProductBindings`, `gravuru-shop-product-binding-plan/v1`; `createShopProductBindingStore().persist`, erwartete aktuelle Bindungsköpfe |

`ProductGroupTemplate` verwendet `scope:{lineId,subcategoryId}` und je Ziel `source:{productId,revision}`, `familyId`, `sizeKey`, `material`, `optionGroups`, `optionFields`; bei vorhandener Profilintegration eine feste `moduleProfile:{id,revision}`-Zuordnung. Offene Angaben gehören in `openQuestions`.

**Die Vorlage hat kein eigenes `designGroup`-/`startDesign`-Feld.** Designzuordnung in der tatsächlichen Quelle prüfen: Katalog `subcategories[].mainProducts[].startDesign`; nativ `config.profile.defaultDesignId`; Mehrformatprodukt `config.familyFormats.designs` plus `formats[].variants[].designIds`; Herkunft `design.katalog.originalId` bzw. `design.katalog.designId`. Der spätere Designabgleich nutzt `source:{productId,designId,originalId}` → `target:{productId,designId}`. Keine Fantasiefelder an strikte Schemas hängen.

Der konkrete Plan prüft Quellen, Vorlagen-/Profilrevisionen, Materialangebot, Varianten und Preise. Nach geänderter Quelle/Preis/Profil/Umfang neuen Plan erzeugen, neue Excel-Version erstellen und erneut bestätigen. Entwürfe benutzen feste Versionen statt bewegliche „latest“-Verweise.

`ProductGroupTemplate.execute` erstellt **lokale Entwürfe** (`published:false`, `shopifyWrites:0`). Es ist kein Shopify-Publisher. `scripts/shop-sync.mjs` enthält einen vorhandenen Katalog-/`productSet`-Weg, ersetzt aber nicht die Modulbestätigung oder die native Varianten-/Preisbindung. Keine ungeprüfte Massenanlage über einen vermeintlich universellen Befehl.

## 8. Schnellster geeigneter Weg nach Bestätigung

Bestehende Daten einmal vorbereiten; Prüfplan und Excel daraus abgleichen. Danach vorhandene native Dienste und den zuständigen Shopify-Adapter per Skript/API aufrufen. Eine manuelle Klickserie ist nur sinnvoll, wenn der vorhandene Dienst die konkrete Aufgabe nicht unterstützt. Shopify CLI ist für App/Theme-Auslieferung geeignet; sie ersetzt keine Produkt-, Preis- und Variantenregeln.

Pro Produkt/Stapel genau einen zuständigen Schreiber benennen. Vor dem ersten Schreibzugriff Bestand/Revisionen/Bilder/Bindungen lesen und sichern, planbare Änderungen anzeigen. Stabile IDs und bestehendes Importjournal/Versionsvergleich verwenden. Wiederholung und Wiederaufnahme müssen ohne Dubletten funktionieren. Fremde Änderungen werden als Konflikt gemeldet, nicht überschrieben.

Shopify-Zuordnung verlangt tatsächliche `shopifyProductId`, `shopifyVariantId`, native `productId/productRevision` und vollständige `options`. Basispreise müssen exakt passen. Motiv-/Foto-/Logo-Aufpreise zusätzlich durch den vorhandenen Preisvertrag prüfen, nicht nur als unverbindliches Texteigenschaftsfeld an die Bestellung hängen.

Zunächst der bestätigte Pilot im ausdrücklich vereinbarten Zielstatus, danach der bestätigte Stapel. DRAFT-Anlage, native Bindung, Aktivierung und Verkaufsabnahme auseinanderhalten. Kein Theme-Neubau und keine neue App-Version allein wegen eines weiteren Produkts, wenn es mit den vorhandenen Fähigkeiten darstellbar ist.

## 9. Nachweise vor Verkaufsfreigabe

- Angebot → richtige Form/Größe/Material/Befestigung, vollständiger Preis und richtiges Startdesign.
- Alle vorgesehenen Module sichtbar; nicht freigegebene Foto-/Logo-Funktionen und unzulässige Bohrungsoptionen fehlen tatsächlich. Direkte Aufrufe umgehen die Einschränkung nicht.
- Wechsel aller angebotenen Form-/Größenklassen respektiert gültige Optionen, Quellen und Preise; kein unzulässiger Restwert.
- Vorlagen bleiben 1:1 erhalten. Schrift, Motiv, Foto/Logo gemäß erlaubter Funktionen bearbeiten, speichern, erneut öffnen; Handy und PC prüfen.
- Preis mit Excel vergleichen: Basis, jeder Aufpreis, Kombinationen, Stückzahl, Warenkorb, Wiederöffnung/Bearbeitung und Rücksprung. Keine Bestellung nötig, um eine Warenkorbprüfung zu belegen.
- Original-/Masken-/Schrift-/Produktionsreferenzen und maßhaltigen Export nach vorhandenem Fertigungsprofil prüfen. Browserprüfung ersetzt keine erforderliche Maschinenprobe.
- Wiederholungsimport erzeugt keine zweite Anlage. Synchronisieren ändert nur bestätigte Ziele; Konflikte und fehlende Medien werden konkret ausgewiesen.
- Startressourcen begrenzt vorbereiten, sichtbare Karten priorisieren. Nicht sämtliche Motive/Schriften/Designs jedes Produktbesuchers auf einmal herunterladen.

Nachweise je Produkt zur Excel-Version verlinken. Technischer Test, Sichtfreigabe, veröffentlichter Stand und Fertigungsabnahme bleiben unterscheidbar.

## 10. Tatsächlicher Stand und Übergabe an die anderen

- Der gemeinsame R15-Kundenkonfi mit Modulschutz ist veröffentlicht; aktuelle Quellen-/Übertragungsbelege stehen in der [Live-Übergabe vom 09.11.](https://github.com/Chris83638w/gravuru-2027/blob/f69c8dbfd1703e4abe2da80c1955d086cddbe547/docs/handoffs/2026-11-09-server-hit-live-and-transfer.md).
- Private Verwaltung und zwei gespeicherte Stahlprofile „mit Logo“/„ohne Logo“ existieren. Bestehende Kundenprodukte wurden dadurch nicht automatisch umgestellt.
- Geschützte Profilaktivierung [PR223](https://github.com/Chris83638w/gravuru-2027/pull/223) und privater Vorschau-/Bestätigungsanschluss [PR224](https://github.com/Chris83638w/gravuru-2027/pull/224) sind vorbereitet, noch nicht produktiv aktiviert. Die Schreibschalter bleiben aus. Lokale Tests sind keine Live-Abnahme.
- Bereits angelegten Edelstahl-Andenken-Piloten aus [PR191](https://github.com/Chris83638w/gravuru-2027/pull/191) und die bestehenden Türschildbindungen nicht erneut anlegen.
- Bestehende Stahlfreigabe (8 Formen/80 Größen, kein Foto, SVG-Logo 12,99 €) gilt für ihren bestätigten Umfang; sie ist keine Preis-/Modulfreigabe beliebiger neuer Produkte.
- Neue UI-Rückmeldungen des Nutzers werden derzeit gesammelt. Dieser Workflowauftrag implementiert sie nicht und veröffentlicht keine Kundenänderung.

**Arbeitsverteilung:** Vorlagenchats liefern Quellen, echte Design-/Ressourcenreferenzen, Excel und offene Fragen. Mikail bestätigt Produkte/Module/Optionen/Preise und kann neue Module ergänzen. Mika koordiniert die gemeinsame Modul-/Konfi-Anbindung und den abgegrenzten Schreibweg. Der benannte Importverantwortliche führt exakt den bestätigten Plan aus und liefert Rücklesenachweise. Keine parallelen Produktanlagen durch mehrere Agenten.

## 11. Server und Google Drive

Die aktuellen Messungen belegen einen noch offenen Ladeengpass: gleiche vollständige Coredatei servernah 51 ms, extern rund 44 s; ein Browsertransfer brach nach rund 116 s ab und lud anschließend viele Einzelmodule. Getrennte Zeitpunkte, daher keine eindeutige Schuldzuweisung an Server, Provider oder Endgerät. Auch Modell-/Galerieantworten bleiben zu untersuchen.

Kein Komplettumzug zu Google Drive. Google hat das Websitehosting über Drive eingestellt ([Google-Quelle](https://workspaceupdates.googleblog.com/2015/08/deprecating-web-hosting-support-in.html)). Drive kann gegebenenfalls eine zusätzliche Arbeits-/Sicherungsablage sein; es löst die Laufzeit- und Übertragungsdiagnose nicht.

Nächster technischer Schritt: zeitnahe Gegenmessung derselben Datei aus Servernähe und zwei äußeren Netzen, Abbruch mit Zugriffs-/Fehlerprotokollen vergleichen. Danach öffentlich vorgesehene, fertig erzeugte, gehashte und vorkomprimierte Konfi-Dateien statisch ausliefern. Bei Bedarf später ein CDN vergleichen; Googles dafür passender Dienst wäre etwa [Cloud Storage mit HTTPS/CDN](https://docs.cloud.google.com/storage/docs/hosting-static-website), nicht Drive. Private APIs, Kundendaten und freigabeabhängige Galerieinhalte bleiben geschützt. Dies ist eine Empfehlung, kein beauftragter Hostingumzug und keine pauschale öffentliche Freigabe bisher geschützter Vorschauen.
