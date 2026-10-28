# Funkklingeln: neuer Anschlussweg und Pilot-Rücknahme · 28.10.2026

Codex/Astra, Branch `dev/funkklingeln-anbindung-20261028-astra`. Basis `main f200509ea106445f4dc86238ac99404b9d0cbca2`; vorheriger Auditcommit `9ebb26d340a140c15a2e604c0870748d4567190e`.

## Auftrag und aktueller Stand

Chris erteilte mit „kannst du live stellen“ die Livefreigabe für die Reihenfolge ein Pilot → Warenkorb/Screenshot → übrige Produkte. Danach präzisierte er: „nein, wir haben doch jetzt was neues. Lies alles auf github. So muss es angeschlossen wrden“. Weitere Live-Schritte wurden ausgesetzt, aktuelle GitHub-Übergaben, Anschlussquellen, PR #41 und dessen Folgeauftrag gelesen. Keine erneute Freigabe für denselben bereits autorisierten Pilotablauf anfordern; die offene Voraussetzung ist eine technisch erfolgreiche Abnahme, keine fehlende Routinegenehmigung.

- Alle 126 Produkte / 15.120 Varianten sind weiter vorhanden, siehe vorigen Audit.
- Beim AOSU-Hochformat `16124413084028` wurden ausschließlich `custom.customization_id=cfg_c3ee3fcf-bf87-42e3-af2a-98b680cdb576` und Vorlage `funkklingeln-2027` gesetzt. Der bestehende globale Knopf erschien.
- Der echte Klick öffnete den neuen App-2027-Kundeneinstieg, der Editor brach mit „Importierte Designressource ist ungültig.“ ab.
- Deshalb **Pilot vollständig zurückgenommen**: nur das eben neu erzeugte Metafeld gelöscht, Vorlage auf Standard zurückgesetzt. API-Nachlesen bestätigt Metafeld null, Standardvorlage, weiterhin ACTIVE/veröffentlicht, alle 120 Varianten einschließlich Preis/SKU/Optionen bytegleich zum Vorher-Abzug.
- **0 weitere Produktänderungen, 0 Veröffentlichungen, 0 Themeänderungen, 0 neue Bindungen, 0 Webhookänderungen, 0 Warenkorbänderungen, 0 App-Deployments/Neustarts.**
- Der Warenkorbtest mit Screenshot ist noch nicht bestanden; deshalb die 84 noch unveröffentlichten Produkte nicht freischalten.

## Welches neue System

Gelesen wurden aktuelle Haupt- und Entwicklungsstände, die Funkklingel-Übergaben vom 27.10., `ops/shopify/SHOP-EINSTIEG.md`, `ops/shopify/theme-block/README.md`, `app/workshop/SHOP-ENTRY.txt`, der Katalogstand sowie die UX-Übergaben vom 28.10. Neuere datierte Aussagen gehen historischen Deploy-Anweisungen vor.

1. Produktseite mit `custom.customization_id` → bereits vorhandener globaler `shop-embed.mjs`-Einstieg „Jetzt personalisieren“.
2. Shopify-App-Proxy `/apps/konfigurator/start` (bzw. vorhandene vorab geladene Startkarte).
3. App-2027 `/konfigurator/shop/` → feste aktive Registry {Shopify-Produkt, Shopify-Variante} → internes cfg_-Produkt, Revision, Dokument-SHA und Optionen.
4. Neuer variant-m-Kundeneditor, private Gestaltung/Prüfstand → bestehender Theme-Warenkorb-Handoff und Rücklesen. Kein alter FPD-Checkout, kein zweiter Konfigurator, keine neue Datenbank oder Preislogik.

Der neuere UX-Stand liegt in [PR #41](https://github.com/Chris83638w/gravuru-2027/pull/41), beim Abgleich **Entwurf, offen, nicht gemergt**. Gelesene Stände `d0b948997ac746d5aaa6cd2001a1615b61196841` und `37b9e624271b72e52d61df463ed35d049565f00c`. Er wird parallel weiterbearbeitet. Seine Produktgalerie erweitert dieselbe Registry, ersetzt nicht die 15.120 Funkklingelbindungen. Keine pauschale Übernahme seiner neuen Preisregeln in vorhandene Funkklingelrevisionen; ursprüngliche Optionen, Positionen und Preise erhalten. Weder PR #41 noch Claudes iPhone-Branch werden durch diese Arbeit überschrieben oder veröffentlicht.

## Konkrete Ursache und Korrektur

Echte öffentliche API-Abfrage des AOSU-Modells (nur Lesen; Sitzung nur im Prozess, nicht gespeichert) und Abruf des tatsächlich ausgelieferten Pakets `editor-94b46d444695ff8a.mjs`:

- Produktdokument enthält unveränderte Grafikverweise `/api/workshop/design-assets/<sha>/preview.svg`.
- `acrylAssetText` schreibt im ausgelieferten JS-Paket den gleichlautenden Literalpfad in `artworkFragment` auf `/api/workshop/acryl/design-assets/…` um.
- `isArtworkResource` vergleicht exakt gegen diesen erzeugten Fragmenttext und lehnt dadurch gültige unveränderliche Produktdaten ab.
- **18/18 tatsächliche AOSU-Dekorressourcen** scheitern im ausgelieferten Modul; dieselben 18 bestehen unverändert mit der Korrektur.
- `artwork-resource.mjs` erzeugt den kanonischen Dokumentpfad nun aus festen Pfadsegmenten. Dieser Datenvertrag wird nicht mehr durch die generelle Transport-Umschreibung verändert. Die vorhandene authentifizierte Ressourcenauflösung im Elternfenster bleibt zuständig.
- Keine Lockerung von URL-/SHA-/Maß-/SVG-Prüfungen, keine neuen akzeptierten Fremdpfade, keine Dokumentmigration, keine Änderung von Gerät oder Montagegeometrie.

Die beiden betroffenen Quelldateien (`artwork-resource.mjs`, `acryl-employee-host.mjs`) sind in PR #41 Stand `37b9e624…` bytegleich zu main. Die Korrektur ist daher auch gegen diesen neueren Stand kompatibel; das beweist noch keinen vollständigen UX-/Warenkorbtest.

## Prüfung

- Neue Regression verwendet die **echte reine Host-Umschreibefunktion** aus der Quelldatei, ohne Host/DB zu starten. Einzelmodul und JSON-eingebettetes Bundle werden geprüft.
- Historisches Einheitsquadrat und echte Dezimalmaße erhalten; fremde URL, fremde Asset-ID, zusätzliche SVG-Attribute, geänderte Grenzen und falsches embeddedOnly bleiben abgewiesen.
- Authentifizierte Vorschauauflösung verändert die Originalbeschreibung nicht.
- `node --test app/configurator/variant-m/artwork-host-path.test.mjs app/configurator/variant-m/preview-resource.test.mjs`: **5/5 grün**, 0 übersprungen.
- 126 lokale ursprüngliche Importdokumente: **2.268 Grafikverweise, 0 ungültig**, Eingabedateien nicht verändert. Das ist eine Prüfung der vorhandenen Importkopien; kein neuer vollständiger DB-Audit.
- Produkt-Rücknahme per API nachgelesen. Keine Livefunktion aus den lokalen Tests ableiten.

## Nächster Schritt

Den kleinen Korrekturcommit im gewünschten aktuellen Konfiguratorstand aufnehmen und dessen Paket regulär neu bauen; unveränderte Produktdaten/Bindungen weiterverwenden. Danach installierten Quell-/Paketstand verifizieren und den bereits autorisierten Ein-Produkt-Pilot wiederholen: Knopf, alle drei Formate, Gegenposition einschließlich aufrechter Klingel/Bohrbilder, Farben/Rahmen/Befestigungen, Preis und echter Theme-Warenkorb mit Screenshot. Erst bei Erfolg die übrigen 125 Produkte, fehlende Marker und 84 Veröffentlichungen abschließen. Die dedizierte Funkklingelvorlage enthält noch die unerwünschte Variantenwahl auf der Produktseite; gezielt korrigieren, keine alte ganze Theme-Kopie veröffentlichen.
