Gravuru – isolierter Preis-/Anschlussprüfstand
Stand: 21.10.2026
Quellen: Chris83638w/gravuru-2027
Branch: dev/konfi-neu-20261019
Commit: bf5c059f13e0868d7c554616b7c35ff7a328ae62

Start
  In diesem Ordner ausführen: node run.mjs
  Benötigt: Node.js 24; keine npm-Installation, kein Server, kein Netzwerk.
  Ergebnisse: results.tap und report.json.

Ergebnis des ausgeführten Laufs
  28 Tests bestanden, 0 Fehler, 0 übersprungen.
  10 abgelegte Quellen werden vor jedem Lauf gegen ihre Git-Blob-SHA-1 geprüft.
  report.json enthält zusätzlich die SHA-256-Prüfsummen und direkten GitHub-Links.

Arbeitsweise
  Die Preisfunktionen werden aus den unveränderten GitHub-Dateien geladen.
  Nur die Modulverknüpfung wird für den isolierten Lauf ersetzt. Die Funktionskörper
  (quote, applyQuantityTier, uploadQuote, commercePrice, selectCommerceVariant und
  personalizationForSnapshot) bleiben original. Rendering, Fonts, Acryl-Geometrie
  und vollständige Produktvalidierung sind nicht Gegenstand dieses Prüflaufs.

Produktbeispiel
  Der echte Quelldatensatz Gedenktafel 30x20 Naturschiefer liefert den Grundpreis
  29,99 EUR und Bohrungsaufpreise 2,99/3,99 EUR. Er ist selbst ein GitHub-Muster
  mit lokalem Prüfstatus, kein Nachweis einer aktiven Shopify-Produktbindung.
  Zusätzliches Foto 8,99 EUR ist hier absichtlich ein synthetischer Testparameter;
  damit wird die Rechenreihenfolge geprüft, kein Preis für diese Familie festgelegt.
  Zusatzfeld und gestaltete Rückseite sind ebenfalls isolierte Testeingaben.

Gesonderter Fall: abgelesener Shopify-Editorstand vom 21.10.2026, 17:30 Berlin
  observed-product-20261021.json enthält die manuell durch den Koordinator
  gemeldeten Werte für cfg_b4fd3f0c-1d36-4708-b65a-2450134c4ef1, Revision 5,
  220x140 mm: Grundpreis 22,99 EUR, Foto 9,99 EUR, Motiv 1,69 EUR und neun
  Befestigungsaufschläge. Keine Shopify-API-Preisprüfung in diesem Prüfstand.
  observed-product.test.mjs verwendet dieselben originalen Preisfunktionen,
  kombiniert diese Beobachtung jedoch ausdrücklich mit dem GEWÜNSCHTEN
  GitHub-Staffelvertrag (6 % ab 2 / 10 % ab 3), NICHT mit einer live bestätigten
  Rabattfunktion. Die lokalen Optionskennungen sind keine Shopify-Varianten.
  Ein kostenpflichtiges Foto, ohne Befestigung:
    1 Stück: 32,98 EUR
    2 Stück: je 31,60 EUR, gesamt 63,20 EUR
    3 Stück: je 30,68 EUR, gesamt 92,04 EUR
    4 Stück: je 30,68 EUR, gesamt 122,72 EUR
  Die neun Befestigungen wurden bei Menge 2 und 3 vor Rabatt geprüft.
  Der Fall setzt genau ein kostenpflichtiges Foto voraus; er belegt keine
  zusätzliche Aussage über das Live-Kontingent kostenloser Fotos.

Bestätigte neue Staffelregeln
  Gedenk-/Tiergedenktafeln: ab 2 Stück 6 %, ab 3 Stück 10 %.
  Firmen-/Hinweisschilder, Brettchen, Schlüsselanhänger, Boxen-/Pferdeschilder:
    ab 5/10/25 Stück 5/10/15 %.
  Edelstahl-/Acryl-Türschilder und Hausnummern:
    ab 3/5/10 Stück 5/10/15 %.
  Eine ausdrückliche Unterkategorie-/Größen-/Familienregel hat Vorrang.
  Diese Staffel gilt auf den rabattfähigen Stückpreis jedes Exemplars der Menge.

Geprüfte Grenzen
  Grundpreis, Befestigung, Motive, sichtbare Zusatzfelder und Rückseite vor Rabatt;
  Foto-/Logoaufschläge danach. Centhalbwerte pro Stück aufrunden, dann x Menge.
  1, 2, 3, 4 und 99 Exemplare; Mengen 0, 100 und 1,5 abgewiesen.
  Offene optionale Staffel (percentOff null) deaktiviert die GANZE Staffel, blockiert
  jedoch den Kauf nicht. Das ist das tatsächliche Quellverhalten.
  Offener Fotoaufschlag bzw. offene gestaltete Rückseite werden abgewiesen.
  Fester Shopify-Listenpreis blockiert ab erster aktiver Rabattstufe.
  Der Personalisierungsvertrag stimmt bei Grundpreis/Befestigung/Motiv/Foto.
  Separat berechnete Zusatzfeld-/Rückseitenpreise fehlen diesem Vertrag noch:
  Der Test belegt die Abweisung, keine bereits gelöste Anbindung.

Für den echten Shopify-Preisabgleich benötigt
  - echte Produkt-ID und unveränderliche Produktrevision;
  - Linie, Thema, Familie, Größe und aufgelöste quantityTiers;
  - exakte Befestigungs-/Optionskombination und Shopify-Varianten-ID;
  - Basispreis sowie Motiv-/Fotoaufschläge und inklusive Fotoanzahl;
  - ausgefüllte Zusatzfelder, gestaltete Rückseite und deren Aufpreise;
  - Entwurfs-/Prüfstands-ID, Revision und Paketprüfsumme;
  - bestätigte Preisrevision/CartTransform-ID sowie wirksame Shopify-Preisquelle;
  - aus dem echten Warenkorb zurückgelesene Menge, Stück- und Gesamtpreis;
  - Testauftrag mit denselben Preis- und Revisionsangaben.

Nicht erfolgt
  Keine Änderungen am Konfigurator 8966 oder September-Original.
  Keine Datenbankzugriffe, keine Shopify-Anfragen, kein neuer Server, kein Deployment.
  Keine vollständige Produkt-, UI-, Konto- oder Bestellstreckenabnahme.

