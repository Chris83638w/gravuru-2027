Gravuru: Preisvertrag und vorhandene Shopify-Funktion
Stand 21.10.2026 – ausschließlich isolierte Proposal, nicht eingebaut oder veröffentlicht

Gelesener Stand
  Chris83638w/gravuru-2027, dev/konfi-neu-20261019
  bf5c059f13e0868d7c554616b7c35ff7a328ae62
  Der Branch wurde für diesen Auftrag erneut direkt auf GitHub geprüft.
  Die Beobachtung des Produkteditors (220x140, Revision5) ist gesondert in
  ../observed-product-20261021.json als manuell abgelesen dokumentiert.

Vorhandene Lösung und konkrete Lücke
  Bereits vorhanden: Function gravuru-personalization-price, cart.transform.run.
  Am 21.10.2026 hat der Koordinator den getrennten read-only Einmalhelfer über
  die bestehende App erfolgreich ausgeführt. Aktuell zurückgelesen:
    id: gid://shopify/CartTransform/172523900
    functionId: 01a0e45d-c47f-70b9-9d5a-a2c72120ae01
    blockOnFailure: true
  Beleg: ../live-preflight/observed-20261021.json. Shopify Plus und EUR wurden
  vom Koordinator ebenfalls live bestätigt. Keine Schreibmutation, keine
  Scope-Erweiterung. Der zuvor fehlende Connector-Scope wurde nicht geändert.
  Dieser Nachweis bestätigt Funktion und Sperrschalter, nicht die neue
  Preisimplementierung oder tatsächlich bestandene negative Checkout-Tests.

  Die Originalquelle liegt versioniert in gravuru-shopify, Commit
  b564422edadaf56a27a09f99e1140a546e5e7145:
  platform/sources/app/extensions/gravuru-personalization-price/src/
  cart_transform_run.js und cart_transform_run.graphql.
  original/ enthält beide unverändert und das vorhandene GraphQL-Schema.
  save-evidence.mjs prüft ihre exakten Git-Blob-Prüfsummen.

  Die alte Function berechnet Basis + Motive + Fotos. Ihre Input-Abfrage fragt
  keine Menge ab. Deshalb können dort neue Staffel, Zusatzfelder und Rückseite
  nicht korrekt entstehen. Der aktuelle Werkstattvertrag cart-personalization.mjs
  unterstützt schon Staffel für Basis/Motive und danach Fotos, aber noch nicht
  fieldCents/backCents. Die Frontend-Preisfunktion kann diese Bestandteile bereits.
  Der aktuelle Storefront-Abgleich verlangt echte Stück-/Gesamtbeträge; bloße
  Preisattribute ändern keinen Shopify-Preis.

Was diese Proposal konkret liefert
  proposed/cart_transform_run.js
    Erweiterung derselben Function. v1 bleibt als historische Route erhalten.
    Produkte mit app-eigener Schema-v2-Preisdefinition gelangen IMMER in v2.
    Fehlende Signatur, Menge/Variante/Revision/Prüfsumme abweichend: Fehler;
    kein Rückfall auf v1 und kein stilles operations[] für ungültige v2-Angebote.
  proposed/cart_transform_run.graphql
    Abfrage von Menge, Währung, öffentlichem Prüfschlüssel und Angebotsattributen.
    Gegen das versionierte vorhandene Function-Input-Schema geprüft.
  proposed/quantity-tiers.mjs
    Unveränderte Staffel-Funktionskörper aus dem aktuellen GitHub-Vertrag.
  proposed/price-contract.mjs
    Kompakter serialisierter Vertrag, Ed25519-Prüfung, Rechenabgleich und Prüfung
    der echten Shopify-Rückgabebeträge.
  proposed/server-price-quote.mjs
    Backend-Adapter für die ORIGINALEN commercePrice/quote-Funktionen.
    Darf nur mit serverseitig geladenem Produktstand und unveränderlichem,
    vollständig geprüftem Snapshot aufgerufen werden. Kein öffentlicher
    Endpunkt, der Kundenpreise oder beliebige Entwürfe signiert.
  proposed/legacy-cart-transform.js
    Originale v1-Funktion als unveränderter Kompatibilitätspfad.
  fixtures.mjs, contract.test.mjs, evidence/
    Lokale echte Function-Aufrufe, neutrale JS-Bündelung, reproduzierbare Eingaben.
    Alle Produkt-/Varianten-IDs sind absichtlich synthetisch, keine Livezuordnung.

Vertrauensgrenze
  Der Server rechnet aus gespeicherten Produktregeln und dem privaten Snapshot.
  Er signiert Produkt, Variante, Preisrevision, Menge, Motiv-/Uploadanzahl,
  Zusatzfeld-/Rückseitenbeträge, Stück-/Gesamtpreis, Snapshot-ID/Paketprüfsumme
  und Prüfsumme der app-eigenen Preisdefinition.
  In Shopify liegen NUR öffentliche Prüfschlüssel. Der private Ed25519-Schlüssel
  bleibt später im vorhandenen Server-Secret-Store; keine Metafelder/Browser/Git.
  Hier existiert ausschließlich ein öffentlich bekanntes Testschlüsselpaar.
  Den Testschlüssel NIEMALS in einem echten Shop einrichten.
  @noble/curves 2.0.1 und @noble/hashes 2.0.1 prüfen die Signatur synchron;
  node:crypto kommt ausschließlich im Serveradapter zum Einsatz.

  Ganze Feldinhalte, Texte und Bilder bleiben im bestehenden privaten Snapshot.
  Dessen Paketprüfsumme bindet sie an das Angebot. Für die Preisrechnung erhält
  die Function die signierten Zusatzfeld-/Rückseitenbeträge; Werte stammen nie
  aus unbestätigten Kundenattributen. Pflichtfelder, Geometrie, Datei-/Uploadrechte,
  Produkt-/Profilrevision, Eigentümer und Produktionsfreigabe müssen weiterhin
  durch die vorhandene vollständige Prüfung VOR dem Signieren geprüft werden.
  Diese Preisbibliothek ersetzt diese Prüfung nicht.

Preisregeln
  Gedenk-/Tiergedenktafeln: 6% ab2,10% ab3.
  Firmen-/Hinweisschilder, Brettchen, Schlüsselanhänger, Pferdeschilder:
  5/10/15% ab5/10/25.
  Edelstahl-/Acryl-Türschilder und Hausnummern: 5/10/15% ab3/5/10.
  Konkrete Unterkategorie/Größe/Familie hat Vorrang vor Defaults.
  Basis + Befestigung/Optionen + Motive + Zusatzfelder + Rückseite VOR Rabatt;
  kostenpflichtige Foto-/Logo-Uploads DANACH.
  Prozentstaffel gilt je Exemplar der gesamten Positionsmenge.
  Halbe Cent je Stück aufrunden, dann Menge multiplizieren.
  unitCents-Staffel ersetzt nur den Grundpreisanteil, nicht Optionen.
  [] ist ausdrücklich keine Staffel. Die neue veröffentlichbare Preisdefinition
  sperrt offene/null-Staffeln. Das ist absichtlich strenger als der Editor,
  der bei null die gesamte optionale Staffel ausblendet/deaktiviert.
  Preise EUR, Menge1..99, Beträge 0..100000000 Cent; kein Wechselkursversprechen.

Tatsächlich geprüft
  52 Tests bestehen insgesamt: 28 ursprüngliche Preisprüfungen +24 neue
  Vertrags-/Function-/GraphQL-Prüfungen. Siehe ../results.tap und ../report.json.
  Dazu fünf Aufrufe des neutral gebündelten JS mit identischen Ergebnissen.
  Grenze1/2/3/4/99, Befestigung, vier Feldarten (Text/Datum/Auswahl/Checkbox),
  bedingtes unsichtbares Feld, Rückseite, Motiv, Foto nach Rabatt, Centhalbwerte,
  fester Grundpreisstaffelwert, offene Preise, Signaturmanipulation, fehlende
  Attribute, andere Menge/Variante/Revision/Snapshot, fremde Währung,
  alte v1-Route und tatsächlich zurückgemeldete Shopify-Beträge.
  54 Kombinationen: neun Befestigungen x Mengen1/2/3/4/98/99.
  Reviewkorrekturen: fehlende/deaktivierte v2-Preisregeln und Downgrade werfen
  Fehler; sämtliche Signatur-/Quote-/Revisionsattribute werden nach Rückgabe
  exakt und ohne Duplikate geprüft; Legacy-Summen/Wechselkurse dürfen keine
  unsicheren Integer oder unendlichen Beträge erzeugen.

  Abgelesene Preise + GEWÜNSCHTE Staffel, mit einem kostenpflichtigen Foto:
  Menge2: 2299*.94 ->2161 Cent +999=3160 je Stück;6320 gesamt.
  Menge3: 2299*.90 ->2069 Cent +999=3068 je Stück;9204 gesamt.
  Diese Ergebnisse sind KEIN Nachweis eines derzeitigen Live-Warenkorbs.

Noch KEINE Freigabe
  Neutraler JavaScript-Build: erfolgt, ca.64KiB, ohne node:crypto im Functionpfad.
  Shopify-CLI/Javy-WASM-Build: nicht durchgeführt.
  Function-Runner/WASM-Lauf, maximale Instruktionen und Speicher: nicht geprüft.
  Die BigInt-/TextEncoder-Kompatibilität und Signaturkosten müssen im tatsächlichen
  Function-Runtime mit repräsentativer maximaler Warenkorbzeilenzahl geprüft werden.
  Falls die JS-Signaturprüfung das Budget überschreitet, dieselbe Signatur-/Preis-
  spezifikation mit etablierter nativer WASM-Kryptobibliothek umsetzen, nicht
  ungeprüft die Prüfung weglassen.
  Das abgelegte ältere Schema belegt Input-Kompatibilität, nicht aktuelle
  Output-Codegenerierung oder WASM-Kompatibilität für API2026-07.
  Kein Deployment, keine Live-Preisbindung, keine Bestellung oder Checkout-Abnahme.
  Weitere Rabatte/Gutscheine dürfen nicht still andere Endbeträge erzeugen:
  Der bestehende strenge Endpreisvergleich bleibt vorerst erhalten.

Kleinste notwendige Anschluss-/Shopänderung
  1. ERLEDIGT am 21.10.2026: vorhandene App/Funktion und blockOnFailure=true
     read-only bestätigt. Shopify Plus/EUR ebenfalls live bestätigt.
     Kein neuer Server und keine zweite CartTransform-Installation nötig.
  2. Vorhandene Function mit den vorgeschlagenen Query-/Logic-Dateien erweitern,
     Versions-/Schema-Codegen, WASM-Build und reale Runner-/Budgettests durchführen.
     Die bestehende UID/Handle/CartTransform-Zuordnung beibehalten.
  3. Einen eigenen privaten Signierschlüssel auf dem bestehenden Server halten;
     nur den öffentlichen Schlüssel als app-eigenes Shop-Metafeld
     $app.quote_verification veröffentlichen (schema gravuru-quote-public-keys/v1).
     Kein echter Schlüssel wurde in diesem Auftrag angelegt.
  4. Für GENAU das abgenommene Pilotprodukt die app-eigene Preisdefinition
     $app.personalization auf Schema gravuru-personalization-pricing/v2 ergänzen:
     echte Variantenpreise, echter Produkt-/Revisionsbezug, aufgelöste Staffel,
     Motiv-/Fotopreise und ursprünglicher Grundpreis.
  5. Bestehenden Backend-Angebotsweg um signierte Attribute ergänzen und
     fieldCents/backCents vollständig übernehmen. Vorher vollständigen Snapshot
     prüfen und originale Preisfunktionen einsetzen; keine separate Preisquelle.
     Die bestehende Warenkorb-/Auftragsprüfung der realen Beträge beibehalten.
  6. Menge/Variante/Gestaltung geändert -> neues geprüftes Angebot/Snapshot.
     Positive und negative Tests im Shopify-Testcheckout: abgewandelte Preise,
     fehlende Signatur und Mengenwechsel müssen Kauf tatsächlich blockieren.

  ZWINGEND: Throw in einer Function sperrt Checkout nur mit wirksamem
  blockOnFailure=true. Der Schalter ist am 21.10.2026 aktuell bestätigt;
  der negative Checkout-Test bleibt vor jeder v2-Aktivierung zwingend offen.
  Falls dieser Schalter nicht verlässlich
  eingesetzt werden kann, ist zusätzlich eine aktivierte Cart/Checkout
  Validation Function nötig. Eine Preisabweichung später im Auftrag zu merken
  ist kein ausreichender Ersatz.

Vorhandener read-only Plesk-Prüfweg
  ops/plesk/shopify-preflight.mjs: runPreflight(args), readPrivateFile(...).
  app/workshop/shopify-admin-readonly.mjs: createShopifyAdminReadonly({readSecret}).
  Exponiert nur checkInstallation(),inspectProductPricing(id),inspectVariants(ids).
  Kein DB-Start, aber auch KEINE cartTransforms/blockOnFailure-Abfrage.
  Der Connector hatte für letztere keinen Scope; keine Scopeänderung vorgenommen.
  scripts/check-native-cart.mjs ist ein privater DB-Test mit simuliertem Shopify,
  keine geeignete Live-Vorprüfung.
  Ergänzt wurde deshalb ../live-preflight/audit-cart-transform.mjs mit genau
  einer neuen festen inspectCartTransforms-Abfrage und vorheriger Prüfung der
  bestehenden Installation/Scopes. Der readPrivateFile-Body wurde unverändert
  übernommen. Keine App-/DB-Imports, keine beliebigen Queries, kein Tokengetter.
  Er liest die vorhandene private Händlerkonfiguration und deren Secret-Datei;
  die Ausgabe enthält ausschließlich id, functionId und blockOnFailure.
  20 lokale Tests bestanden. Am 21.10.2026 wurde er vom Koordinator privat
  ausgeführt; die SHA-256-Prüfsumme des ausgeführten Helfers wurde verifiziert:
  43eac0bb5e012516eed18720f2e7577c6ed5eff29c35a979dd228bbaa5e2e5ba
  Ausführung als vorhandener App-Benutzer:
    node audit-cart-transform.mjs --app-root <kanonischer App-Pfad> --config <absolut>/private/gravuru-2027-merchant-shopify.json
  Keine Runtimeänderung oder Shopify-Schreibmutation; keine Scope-Erweiterung.

Reproduzieren
  Node24. Im Ordner cart-contract:
    pnpm install --frozen-lockfile --ignore-scripts
  Dann im übergeordneten pricing:
    node run.mjs
  Optional cart-contract/node save-evidence.mjs für Originalhash-, Bündel- und
  Fixtureprüfung. Paket-Lock, Quellen und Dateiprüfsummen liegen vollständig hier.
  evidence/cart-transform.bundle.mjs ist nur ein JS-Prüfbündel, kein Deploy-WASM.

Direkte Quellen (unveränderliche Commits)
  Preis/Rundung/Staffel:
  https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/configurator/variant-m/contract.mjs#L39
  Foto nach Rabatt:
  https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/configurator/variant-m/commerce-model.mjs#L8
  Aktueller Backendvertrag:
  https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/app/workshop/cart-personalization.mjs
  Ursprüngliche vorhandene Function:
  https://github.com/Chris83638w/gravuru-shopify/blob/b564422edadaf56a27a09f99e1140a546e5e7145/platform/sources/app/extensions/gravuru-personalization-price/src/cart_transform_run.js#L1
  Historischer Release-/Binärnachweis:
  https://github.com/Chris83638w/gravuru-2027/blob/bf5c059f13e0868d7c554616b7c35ff7a328ae62/docs/releases/20261011/orders/shopify-extension-check.json

Offizielle API-Quellen, am21.10 gelesen
  https://shopify.dev/docs/api/storefront/2026-07/input-objects/CartLineInput
  https://shopify.dev/docs/api/functions/2026-07/cart-transform
  https://shopify.dev/docs/api/storefront/2026-07/objects/CartLineCost
  https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/cartTransformCreate
  https://shopify.dev/docs/apps/build/metafields
  https://github.com/paulmillr/noble-curves
  https://github.com/paulmillr/noble-hashes

