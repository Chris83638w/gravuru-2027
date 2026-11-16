# Ein Konfigurator mit wiederverwendbaren Modulen · 08.11.2026

## Auftrag und verbindlicher Rahmen

Mikails Vorgabe: Für neue Produktgruppen wird kein neuer Konfigurator gebaut. Der freigegebene Kundenkonfigurator bleibt die gemeinsame Oberfläche. Produktgruppen verwenden wiederverwendbare Modulprofile und ihre bestätigten Ausführungen. Beispielsweise entstehen Edelstahl-Türschilder mit und ohne Logo aus derselben Produktquelle; Gedenktafeln können eine passende Designgruppe mit oder ohne Fotobereich verwenden.

Die vom Nutzer genannten Materialien, Füße, Klebebänder und weiteren Zubehörteile sind Beispiele, keine allgemeine Freigabe für alle Produkte. Vor jeder Neuanlage müssen die tatsächlich angebotenen Optionen, Preise und Module für den jeweiligen Umfang sichtbar bestätigt werden. Vorhandene Designs werden weder entfernt noch umgestaltet, um ein Modulprofil passend zu machen.

Für sämtliche Designs gilt weiterhin der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Technische Tests ersetzen weder die Sichtprüfung echter Originaldesigns noch deren Freigabe.

## Arbeitsstand und Sicherung

- Arbeitsbranch: `dev/mika-universal-module-profiles-20261108`.
- Gesicherte Ausgangsbasis: `4d2f5bec14e685c7e39c29befc28bf757aba00a9`, R15 einschließlich Edelstahl-Textkorrektur und Logo-Preisreparatur aus PR #200.
- Sicherungsnachweis: [2026-11-08-universal-module-baseline.md](2026-11-08-universal-module-baseline.md).
- Die bestehende Produktgruppen-Engine wurde gezielt aus `dev/mika-verwaltung-sync-absicherung-20261107`, Stand `3ad2cdc`, übernommen und um die Modulbindung ergänzt.
- Dieses Paket arbeitet ausschließlich lokal. Keine Veröffentlichung, kein Shopify-Produktimport, keine Änderung des Live-Shops oder seiner Datenbank. Astra-Arbeitskopien bleiben unberührt.

Die Sicherung ist eine Quellstandsicherung mit erhaltener Git-Historie. Es wurde dafür keine neue Sicherung der Live-Datenbank behauptet oder durchgeführt. Abschluss: **212/212 Tests aus 18 Dateien bestanden**, Build mit 76 geprüften Ressourcen erfolgreich, UI-Syntaxprüfung und `git diff --check` sauber. [Prüfprotokoll und Quellhashes](../reviews/2026-11-08-module-profiles/README.md).

## Die sieben Module

| Modul | Zweck | Wirkung beim Ausschalten |
| --- | --- | --- |
| Ausführungen (`options`) | Native Material-, Form-, Größen-, Befestigungs- und Zubehörwahl des Produkts | Kundenwahl wird auf die native Vorauswahl begrenzt. Nicht erfüllbare Pflichtzusatzfelder führen zu einem Konflikt. |
| Designs (`designs`) | Auswahl vorhandener vollständiger Gestaltungen | Das Standarddesign bleibt fest; die vorhandenen Designobjekte werden nicht gelöscht. |
| Text und Schriften (`text`) | Texte hinzufügen und Inhalt/Schrift bearbeiten | Neue Texte und Inhalts-/Schriftänderungen werden gesperrt. Bereits vorhandene Elemente bleiben nach ihren ursprünglichen Rechten beweg- und löschbar. Eine Vorlage mit persönlichem Pflichttext wird als unvereinbar gemeldet. |
| Motive (`motifs`) | Motive hinzufügen oder ersetzen | Neue und ersetzte Motive werden gesperrt. Vorhandene Motive bleiben erhalten; ihre ursprünglichen Bewegungs-/Löschrechte bleiben maßgeblich. |
| Foto (`photo`) | Freigegebene Foto-Funktionen | Foto-Upload wird ausgeschaltet. Eine Originalvorlage mit Fotobereich darf nicht stillschweigend in ein Ohne-Foto-Produkt umgewandelt werden. |
| Logo (`logo`) | Freigegebener Logo-Upload, etwa SVG bei Edelstahl | Logo-Upload wird ausgeschaltet. Vorhandene Logo-Upload-Bereiche einer Vorlage werden als Konflikt gemeldet. |
| Farbwahl (`colors`) | Farbänderungen bei dafür freigegebenem Verfahren | Farbänderungen werden gesperrt; native Gestaltungs-/Verfahrensfarben bleiben erhalten. |

Die Module sind zusätzliche Freigabeschalter. Ein eingeschaltetes Modul kann keine zuvor fehlende Material- oder Verfahrensfreigabe erzeugen: Foto auf Edelstahl oder Farbwahl bei einem dafür ungeeigneten Verfahren werden dadurch nicht erlaubt. Preise werden weiter aus der nativen Produktquelle übernommen. Für Edelstahl bleibt ein freigegebenes SVG-Logo bei dem vorhandenen Preis von 12,99 €; der Schalter erfindet keinen neuen Zuschlag.

Schriften, Motive, Grundplatten und Produktionsgeometrie werden weiter über die bestehende Produkt-/Ressourcenstruktur verwendet. Dieses Paket baut keine zweite Schriftbibliothek und keine neue Gestaltung pro Modulkombination.

## Verwaltung und Ablauf vor einer Produktanlage

Die neue lokale Werkstattseite liegt unter `/werkstatt/module/` und verwendet die bestehende geschützte Werkstattanbindung. Sie enthält drei Schritte:

1. **Modulprofil wählen oder anlegen:** Name vergeben und alle sieben Module ausdrücklich festlegen. Die vorhandene Produktquelle begrenzt die zulässigen Möglichkeiten.
2. **Produktgruppen-Vorlage vorbereiten:** Gespeicherte native Produktquelle(n), Modulprofil und zulässige Optionen verbinden. Die konkreten Quellen werden über feste Kennungen zugeordnet, nicht aus Namen oder Artikelnummern erraten.
3. **Anlageumfang prüfen und bestätigen:** Module, Produktentwürfe, native Optionen, Vorauswahl und Preise prüfen. Die Variantenübersicht verwendet dieselben gültigen Kombinationen und dieselbe Preisberechnung wie der Konfigurator. Erst die ausdrückliche Bestätigung erlaubt die Anlage lokaler Entwürfe.

Die vollständige Variantenübersicht zeigt Form, tatsächliche Maße, Befestigung beziehungsweise weitere Auswahlen und den jeweiligen Preis vor zusätzlichen Kundenmotiven, Fotos oder Logos. Ein bloßer Grundpreis reicht nicht als Optionsfreigabe. Der gezielte Nachweis aller 404 Einträge ist im bestandenen Abschlusslauf enthalten.

Wird nach der Vorschau oder Bestätigung eine relevante Quelle, das Modulprofil, die Produktgruppen-Vorlage oder die bestätigte Materialzuordnung geändert, muss erneut geprüft und bestätigt werden. Der Stand wird unmittelbar vor dem Schreiben innerhalb der Anlage-Transaktion nochmals kontrolliert. Wiederholung derselben erfolgreichen Anlage erzeugt keine doppelten Produkte.

Die Standardanbindung der neuen Seite verwendet bereits gespeicherte native Produkte als Quellen. Ein eigener Adapter kann die verbindliche Galerie-/Unterkategorien- und Materialzuordnung liefern. Die dortigen Kennungen müssen aus der tatsächlichen Quelle stammen.

### Grenze bei komplexen Ausführungsmodellen

Die vollständigen nativen Ausführungen von `familyFormats`, skalierbaren Größen, Edelstahlformaten und Klingelformaten werden erhalten. Änderungen nur an einer obersten Optionsliste dürfen nicht scheinbar erfolgreich gespeichert werden, wenn die eigentlichen Optionen in den einzelnen Formaten liegen. Solche nicht unterstützten Teiländerungen werden abgewiesen.

Damit lässt sich ein vorhandenes, bestätigtes Gesamtangebot mit anderem Modulprofil wiederverwenden. Beliebige neue Teilmengen oder neue Zubehörregeln innerhalb solcher Formatmodelle benötigen weiterhin den passenden nativen Adapter und eine erneute Optionsbestätigung. Dieses Paket behauptet keine freie Verwaltung aller künftigen Materialien und Zubehörarten ohne deren Produktdaten.

## Versionierung und Schutz bestehender Produkte

Ein Produkt erhält optional einen vollständigen Snapshot in `config.moduleProfile` mit Schema `gravuru-configurator-modules/v1`, Profil-ID, fester Revision und genau sieben booleschen Modulwerten. Unvollständige oder unbekannte Felder werden abgelehnt.

Produkte ohne Modulprofil behalten ihr bisheriges Verhalten. Eine Änderung in der Modulbibliothek schreibt nicht automatisch bereits angelegte Produkte um. Die Bibliothek speichert unveränderliche Revisionen; Produktgruppen-Vorlagen binden einen festen Versionsstand. Bestehende Produkt-Snapshots und Bestellstände bleiben erhalten.

Die Schalter wirken sowohl auf die verfügbaren Werkzeuge als auch auf die serverseitige Validierung und Preis-/Warenkorbstrecke. Ein versteckter Logo- oder Foto-Tab allein wäre kein ausreichender Schutz; entsprechend manipulierte direkte Eingaben werden ebenfalls geprüft.

Ein eingeschränktes Produkt wird nicht als neue Quelle verwendet, um verlorene Freigaben zu erraten. Für ein späteres Wiedereinschalten wird erneut die gespeicherte ursprüngliche Produktquelle mit dem gewünschten Modulprofil verbunden.

## Implementierte Bausteine

- `app/configurator/variant-m/module-profile.mjs`: strenger Modulvertrag, native Verfügbarkeit, Kompatibilitätsprüfung, Kopie mit festem Profil-Snapshot.
- `app/configurator/variant-m/module-runtime.mjs` sowie gezielte bestehende Laufzeit-Anbindungen: Werkzeugfreigaben und Prüfung direkter Gestaltungseingaben.
- `app/workshop/configurator-module-profiles.mjs`: mandantengebundene, versionierte Modulbibliothek in der vorhandenen Werkstatt-Datenbank.
- `app/workshop/product-group-templates.mjs`: wiederverwendbare Vorlagen, native Varianten-/Preisvorschau, bestätigte Anlagepläne und transaktionale Konfliktprüfung.
- `app/workshop/configurator-module-http.mjs` und die vorhandene Werkstatt-HTTP-Anbindung: Verwaltung hinter den bestehenden Sitzungs- und CSRF-Prüfungen.
- `app/workshop/ui/module-profiles.*`: neue Verwaltungsseite. Ihre eigenen Stile betreffen diese Verwaltung; der freigegebene Kundenaufbau und dessen R15-/Layout-CSS werden nicht umgebaut.
- `scripts/run-module-profile-demo.mjs`: getrennte lokale Demonstration mit eigener lokaler Datenbank und Testquelle, ohne Live-Datenbankzugriff.

## Prüfnachweise und ihre Aussagegrenzen

Gezielte automatische Prüfungen decken insbesondere ab:

- Bestehende Produkte ohne Modulprofil bleiben unverändert.
- Dasselbe native Edelstahlprodukt funktioniert mit freigegebenem Logo-Modul und mit ausgeschaltetem Logo-Modul; Quelle, Designs, Maße, Befestigungen und Preise bleiben erhalten.
- Fehlende/ungültige Flags, nicht freigegebene Funktionen sowie unvereinbare Foto-/Logo-/Pflichttextvorlagen werden abgelehnt.
- Originaldesigns werden auch in Familienformaten, skalierbaren Größen und Klingelprofilen geprüft und nicht stillschweigend entfernt.
- Ausgeschaltete Module werden in direkten Gestaltungseingaben und in der Preis-/Warenkorbstrecke kontrolliert.
- Mandanten- und Versionsgrenzen, fehlende Bestätigung, Änderungen nach Bestätigung sowie Änderungen unmittelbar vor dem Schreiben werden geprüft; ein Konflikt erzeugt keine Teilanlage.
- Die lokale HTTP-Strecke einschließlich CSRF-Abweisung, Profilanlage, Plan, Bestätigung, Entwurfsanlage und Wiederöffnung im gemeinsamen Konfigurator wurde getestet.

### Vollständiger Edelstahl-Formatnachweis

`app/workshop/module-profile-family.test.mjs` nutzt die eingecheckte Ausführungsquelle `scripts/fixtures/steel-shopify-options/family.json` und die vorhandene native Familienformat-Pipeline:

- **8 Formen**, **80 Größen**, **404 gültige Größen-/Befestigungskombinationen**.
- Varianten mit und ohne Logo verwenden dieselben vollständigen nativen Ausführungen.
- **808 Preisvergleiche** prüfen beide Modulvarianten gegen die ursprüngliche Quelle.
- Formen, Maße, Lochgeometrie, Designzuordnungen und Ressourcen bleiben erhalten.
- Zwei lokale Entwürfe werden nach ausdrücklicher Bestätigung angelegt, erneut aus der Datenbank gelesen und auf Vollständigkeit geprüft; Wiederholung legt keine Duplikate an.
- Die ursprüngliche Quelle bleibt unverändert; keine Shopify-Schreibzugriffe.

Dieser Nachweis verwendet bewusst eine technische Blanko-Design-Testquelle innerhalb der echten Format-Pipeline. Er belegt die Daten- und Funktionskette, **nicht** die gestalterische Abnahme der echten Türschild-Originale. Dafür bleiben die Design-Master-Prüfung und echte Konfi-Screenshots erforderlich.

### Noch keine Browser-Sichtabnahme

`browsergeprüft = false`: Die lokale Browserprüfung blieb offen. Der CUA-Zugriff auf die lokale Seite endete an einer Loopback-/Cross-Site-403-Sperre; der alternative native Browserzugriff wurde abgebrochen. Automatische Funktions- und HTTP-Prüfungen sind deshalb nicht als bestandene Sichtprüfung auf Handy oder PC zu lesen.

Der protokollierte gemeinsame Abschlusslauf enthält 212 Tests. Frühere und zusätzliche Unteragenten-Prüfläufe werden nicht dazuaddiert. Die Schlussprüfung erfasst auch direkte Designwechsel-Anfragen, V1-Rasterlogos bei „Foto aus, Logo an“, V2-SVG-Logos und weiterhin kostenpflichtige Originalmotive. Diese lokalen Warenkorbprüfungen sind keine neue Live-Warenkorbabnahme.

## Was dieses Paket noch nicht erledigt

1. Keine Veröffentlichung der neuen Verwaltung oder Modulprüfung auf dem Kundenserver.
2. Keine automatische Neubindung bereits veröffentlichter Produkte an ein neues Modulprofil.
3. Kein neuer Shopify-Synchronisationslauf und kein Shopify-Schreibzugriff. Der spätere Ablauf für bestehende Shop-Produkte muss Änderungen als konkreten Vergleich zeigen, bestätigen lassen und Produktrevisionen gezielt übertragen.
4. Keine neue Produktionsfreigabe für UV-Druck, LED-Glasbilder, Füße, Farben oder weitere Zubehörkombinationen allein aus Nutzerbeispielen.
5. Keine neue Abnahme der echten Originaldesigns und keine abgeschlossene Browser-Sichtprüfung.
6. Die in der früheren Edelstahl-Warenkorb-Übergabe dokumentierte Grenze bei vielen unterschiedlichen Warenkorbpositionen wird durch dieses Modulpaket nicht behoben.

## Nächster Schritt und Rückweg

Die Variantenübersicht ist automatisch geprüft. Als Nächstes die Verwaltung im Browser mit der getrennten lokalen Demo prüfen. Danach anhand einer gespeicherten echten Türschildquelle die Varianten „mit Logo“ und „ohne Logo“ vorzeigen und die Originaldesigns nach Design-Master abnehmen. Erst anschließend den konkreten Rollout sowie eine bestätigte Synchronisierung bereits bestehender Shopify-Produkte vorbereiten.

Vor einer Aktivierung ist der Code-Rückweg die dokumentierte Ausgangsbasis. Nach einer künftigen Aktivierung dürfen Modulprodukte nicht mit einer alten Runtime ausgeliefert werden, die Modulprüfungen nicht kennt. Für einen Rückweg müssten zuerst neu gebundene Produktrevisionen und veröffentlichte Zuordnungen auf zuvor geprüfte Stände zurückgestellt werden. Modulprofile, Historie und Datenbank werden dabei nicht gelöscht. Aktuell ist alles lokal; ein Live-Rollback ist deshalb nicht erforderlich.
