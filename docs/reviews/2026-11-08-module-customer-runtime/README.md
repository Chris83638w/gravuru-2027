# Geplanter R15-Anschluss der allgemeinen Modulregeln

08.11.2026, ausschließlich lesender Vergleich lokaler, zuvor gehashter Quellen. **Kein Quellcode geändert, kein Serverzugriff, kein Build oder Deployment.** Die private Verwaltung und der öffentliche Kundenkonfigurator sind getrennte Prozesse. Der Verwaltungsmount aktiviert diese Kundenregeln daher nicht automatisch.

## Befund und genaue Basis

Aktiver Kundenbuild laut letztem bestätigten Rollout: `editor-22ba7897da3f65ac.mjs`. Die aktive native `contract.mjs` (`071690831e3c53f8f40febbff15ed37d82434729fcdb8d7dde51829ece3f257e`) kennt noch kein `moduleProfile`. Die neue Profil-/Regellogik ist in PR201/202 und dem integrierten PR213 enthalten. Bestehende native Foto-/Logo-Schalter können zwar schon einzelne Funktionen verbergen; sie ersetzen nicht die allgemeinen Client-, Speicher- und Preisgrenzen.

Die verbindlichen Vergleichshashes stehen vollständig in [source-inventory.json](source-inventory.json). Grundlage sind `outputs/steel-design-bank-repair-20261108/live-runtime-manifest.json`, die Rolloutbelege von PR204, PR206 und PR209–211 sowie die vorhandenen PR213-Quelldateien. Diese historischen Pins vor jeder späteren Übernahme frisch gegen den Server bestätigen. Das Inventar ist **kein ausführbares Patchpaket**; seine PR213-Hashes bezeichnen die vollständigen Referenzdateien, nicht bereits geprüfte minimale Patchausgaben.

## Minimaler fachlicher Umfang: 12 Dateien

| Datei, relativ zum Repo | Ausschließlich notwendiges Moduldelta |
|---|---|
| `app/configurator/variant-m/module-profile.mjs` – neu | Vollständiger versionierter Vertrag, native Fähigkeiten als obere Grenze, unveränderte Altprodukte ohne Profil. |
| `app/configurator/variant-m/module-runtime.mjs` – neu | Reiterfreigaben sowie Prüfung manipulierter Texte, Motive, Uploads, Farben, Designs und Optionen. |
| `app/configurator/variant-m/contract.mjs` | Profil bei Vorbereitung anwenden; native Logo-, Entwurfs-, Validierungs- und Preisprüfung an denselben Vertrag binden. |
| `app/configurator/variant-m/customer-rights.mjs` | Rechtewächter auch für Modulprofile aktivieren; Modulrechte bei Normalisierung erhalten. Keine neue Hinweisbox für reine Modulprofile. |
| `app/configurator/variant-m/element-rights.mjs` | Neue Elemente, Inhalt, Ersetzen und Farben anhand des Profils erlauben; vorhandene Gestaltung und weiterhin erlaubtes Verschieben/Löschen erhalten. |
| `app/configurator/variant-m/logo-upload.mjs` | SVG-Upload benötigt zusätzlich ein freigegebenes Logomodul. |
| `app/configurator/variant-m/ux-model.mjs` | Gemeinsame Uploadfreigabe und Foto-/Logo-Reiter entsprechend ausblenden. |
| `app/configurator/variant-m/ux.mjs` | Vorhandene Reiter und Werkzeuge anhand der Module anbieten; Linkparameter/Designwahl dürfen ausgeschaltete Werkzeuge nicht reaktivieren. Bestehende PNG-Vorschau aus PR206 erhalten. |
| `app/workshop/cart-personalization.mjs` | Modulvertrag im unveränderlichen Preisstand behalten. Ausgeschaltete Uploads ablehnen, zulässige alte V2-Preisbindung bei Logo aus erhalten; ursprüngliche kostenpflichtige Vorlagenmotive sowie Foto-/Rasterlogo-Regeln korrekt behandeln. |
| `app/workshop/shop-entry.mjs` | Bei ausgeschalteter Designwahl bleibt das gebundene Startdesign verbindlich; direkte Designparameter sperren. Aktuellen R15-Bearbeiten-Rückweg erhalten. |
| `app/workshop/shop-design-gallery.mjs` | Direkte Galerie-, Ziel- und Vorschauzugriffe dürfen das ausgeschaltete Designmodul nicht umgehen. Den aktiven PR204-Performancefix erhalten. |
| `app/workshop/shop-preparation.mjs` | Aufpreisbedarf korrekt aus erlaubten Modulen ableiten; Vorlagenmotive bei `motifCharge: 'all'` und erlaubte Rasterlogos weiterhin berücksichtigen. |

**Wichtig für die Übernahme:** Nur diese Moduländerungen auf die exakt bestätigte aktive Basis übertragen. Keine vollständige Kopie des PR213-Verzeichnisses auf den Kundenserver. Insbesondere die vollständige PR213-Datei `shop-preparation.mjs` enthält zusätzlich `withProductResolutionSnapshot`/`withShopPreparationSnapshot`. Ihre vollständige Übernahme benötigt auch die geänderte `app/workshop/product-model.mjs` und zugehörige Performanceprüfungen. Diese zusätzliche Optimierung ist für den hier beschriebenen Minimalanschluss nicht erforderlich.

Keine Änderung an `mobile-demo/demo.mjs`, Styles, Navigation, Vorschaubutton, Preisen, Formen, Größen oder Befestigungen nötig. Die bestehende R15-Hülle übernimmt `hidden`/`disabled` der nativen Reiter bereits in `demo.mjs:69–71`, `151–152` und `258–264`. Der aktive PNG-Fix, Pointerfix, große Vorschau und der echte Shopify-Bearbeiten-Rückweg bleiben bestehen. `process-profiles.mjs`, die Abhängigkeit des neuen Modulvertrags, ist bereits Teil der nativen Laufzeit.

## Vorhandene passende Prüfungen für das spätere Patchpaket

Die folgenden Tests existieren im integrierten Baum. Sie wurden für diesen reinen Dokumentationsauftrag **nicht erneut ausgeführt**; frühere grüne Läufe ersetzen keine Prüfung des später konkret übertragenen Deltas.

1. `app/configurator/variant-m/module-profile.test.mjs` und `module-runtime.test.mjs`: Legacy unverändert, native Grenzen, derselbe Stahlkonfi mit/ohne Logo, 12,99 EUR nur bei erlaubtem Upload, gefälschte Entwürfe, alle sieben Modulgruppen, Originalmotive erhalten.
2. `app/workshop/cart-personalization.test.mjs`: V1/V2, gültige Logo-aus-Profile, alte Preisstände und Wiederöffnen, ursprüngliche kostenpflichtige Motive, Foto-/Rasterlogo-Zählung. Die einschlägigen Fälle beginnen derzeit bei Zeilen 57, 73, 86, 99 und 112.
3. `app/workshop/shop-entry.test.mjs`: deaktivierte Designwahl (Zeile 60), reale Modul-Abhängigkeitsliste (165), direkte Galerie-/Wechselaufrufe (360), R15-Opt-in und Cart-Rückweg. `shop-design-gallery.test.mjs`: deaktivierte Quellwahl (34), native Preis-/Varianten- und Frischeprüfung; `shop-design-gallery-variant.test.mjs` hält den behobenen Formatwechsel abgedeckt.
4. `app/workshop/module-profile-family.test.mjs`: alle acht Formen, 80 Größen und 404 Befestigungs-/Preiskombinationen mit Logo an/aus unverändert. Ergänzend `shop-preparation.test.mjs` und `slate-shop-preparation.test.mjs` für die gemeinsame Vorbereitung.
5. `app/configurator/mobile-demo/demo.test.mjs`: native ausgeblendete/deaktivierte Werkzeuge bleiben verbindlich (237), große Vorschau (280), Desktop/Mobil-Navigation und tatsächlicher Warenkorb. `native-overlay.test.mjs` kontrolliert den tatsächlichen Modulgraph und die Server-Allowlist. Bei Änderung gemeinsamer Rechte auch `ui-event-regressions.test.mjs` und `logo-upload.test.mjs` verwenden.

Danach isolierter Build und echte Browserprüfung auf Mobilgröße und Desktop: derselbe Stahlartikel einmal mit Logo, einmal ohne; alte r4-Gestaltung unverändert; 251 Designs/404 Kombinationen; deaktivierter Reiter fehlt, direkte Upload-/Entwurfs-/Preisaufrufe sind ebenfalls gesperrt. Logo-an-Fall mit korrektem Aufpreis, PNG und erneutem Bearbeiten aus dem Warenkorb prüfen. Bei Logo aus muss V2 weiterhin einen zulässigen Null-Logo-Warenkorb erlauben. Kein echter Checkout erforderlich.

## Reihenfolge und Rücknahme

1. Private Verwaltung zunächst nur lesen und Vorschauen erzeugen; beide Schreibschalter bleiben aus. Keine Modul-Produktrevision veröffentlichen, solange die Kunden-/Serverregeln fehlen.
2. Vor Patchübernahme aktuelle 10 Quelldateien, zwei noch nicht vorhandene Pfade, generierte R15-Dateien/Bundle, Startwrapper und relevante Datenbanken sichern. Hashmanifest und atomaren Rücknahmebefehl vorbereiten. Den jetzigen r4-Produkt-/Bindungsstand unverändert lassen.
3. Modulregeln auf der exakten aktiven Basis zusammen prüfen, bauen und kontrolliert übernehmen. **Zunächst weiterhin r4 ohne Modulprofil ausliefern.** So muss das bestätigte Kundenverhalten identisch bleiben. Erst anschließend einen konkreten bestätigten Profilplan in einer neuen nativen Revision aktivieren.
4. Solange kein Produkt/Entwurf mit neuem Modulprofil veröffentlicht wurde, ist eine reine Coderücknahme möglich: gesicherte Quelldateien und generierten Editor vollständig wiederherstellen, nur die zwei neu hinzugefügten Moduldateien entfernen, Cache-/Bundleverweis und Neustart kontrollieren. Keine Datenbank auf einen älteren Stand zurückkopieren.
5. Nach Veröffentlichung einer Modulrevision **keinen blinden Downgrade auf den alten profilunkundigen Server** ausführen: bereits gespeicherte Warenkörbe/Entwürfe benötigen weiterhin ihre Modul-/Preisstände. Fachliche Rücknahme dann als neue geprüfte Produktrevision/Bindung, alte Revisionen behalten; kompatible Leser/Preisregeln zunächst weiter betreiben. Vorher einen eigenen Rollbacknachweis einschließlich bestehender Warenkörbe führen.

Keine Aktivierung erfolgt durch dieses Dokument. Der nächste konkrete Arbeitsschritt ist ein getrenntes, gehashtes Minimalpatchpaket mit den zwölf genannten Dateien und den beschriebenen Prüfungen.
