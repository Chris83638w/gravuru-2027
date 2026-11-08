# Gemeinsamer Modulanschluss, ein ausführbarer Backendstand

Stand: 08.11.2026. Branch `dev/mika-module-management-integration-20261108`.

## Ausgangspunkt und Abgrenzung

Die zuvor getrennten PRs 194/201/202/203/207/208 sind hier tatsächlich zusammengeführt. Basis vor Änderungen: `043846538d9177f933708dafa55392a58fb5036a`; lokale Sicherung `outputs/module-management-integration-20261108/backup/base-backend.zip`. Die aktuellen R15-/Warenkorbreparaturen aus 204/205/206/209/210/211/212 sind integriert. Keine zweite Test-Runtime und keine nachträglich angehängten Repository-Methoden mehr.

Der neue private Quellhost verwendet weiterhin seine bisherige Galerie `gallery-4`, dieselben Daten, Freigaben, Anmeldung und CSRF-Prüfung. Die vorbereitete Gesamtgalerie wird nicht aktiviert. Der Kundenhost wird durch dieses Paket nicht umgestellt. Shopify-Schreiben und Synchronisierungsausführung bleiben für die erste Sichtprüfung ausgeschaltet.

## Tatsächlich gemeinsamer Dienst

- `createWorkshop().repository` enthält beide notwendigen API-Gruppen: `moduleSources` und `importItems/head/cacheIdentity`. Import-Konfliktprüfungen und `beforeWrite` bleiben erhalten.
- Der bestehende Materialkatalog einschließlich Unterkategorie-Materialzuordnung bleibt erhalten.
- Der Plesk-Mount injiziert seine echte dynamische Galerie-Registry vor der ersten Anfrage über `configureModuleManagement`. `/originale/verwaltung` und `/werkstatt/module/` verwenden dasselbe Profil-/Produktgruppenobjekt und dieselbe Datenbank.
- Eine abweichende zweite Registry wird abgewiesen. Beim Schließen des Galerieconnectors bleibt der werkstatteigene Modulservice verfügbar.
- Produktentwürfe benötigen eine konkrete, versionsgebundene Optionsvorschau und ausdrückliche Bestätigung. Veraltete Quellen oder Profile und falsche Bestätigungen erzeugen keine Produkte.

## Reiner Profilwechsel ohne erfundenes Galerieoriginal

Serverseitiger Zielvertrag:

```json
{
  "id": "server-owned-target-id",
  "kind": "module-profile",
  "label": "Bestehende Edelstahl-Türschilder",
  "target": {"productId": "existing-native-product-id", "designId": "existing-start-design-id"},
  "shopifyProductId": "existing-shopify-product-gid",
  "shopifyVariantIds": ["all-existing-variant-gids"],
  "moduleUpdate": {"id": "stored-profile-id", "revision": 1, "sourceRevision": 4},
  "mediaRequired": false
}
```

Die Platzhalter sind ausschließlich die Vertragsbeschreibung, keine produktiven Zuordnungen. Die private Factory muss alle IDs aus den bestehenden Belegen beziehen.

Bei diesem Typ fehlen `source` und `designs` ausdrücklich. Medienübertragung ist ausgeschlossen. Die Vorschau zeigt die tatsächlichen Moduländerungen, Produkt-/Profilversion und unveränderte Gestaltung/Preise. Identische Vorher-/Nachhergrafiken werden nicht erzeugt. Dadurch benötigt die reine Lesevorschau keinen schreibenden zweiten Werkstatt-/Asset-Konstruktor. Der bisherige Design-Sync behält seine vollständige Originalfreigabe und seinen nativen Grafikweg.

Vor jedem Remote-Schreibversuch werden nach dem letzten asynchronen Lesen Registry, Profilquelle, Zielrevision/Dokumenthash und aktive Bindungen synchron erneut geprüft. Änderungen während des Lesens erzeugen einen Konflikt, bevor `transport.apply` aufgerufen wird. Vor atomarer Bindungsaktivierung wird die Quellbindung nochmals geprüft. Keine Frist wurde verlängert.

## Nachweise

- Echte Plesk-Routen aus diesem einen Checkout: gemeinsame Registry, Anmeldung/CSRF, Profilzuweisung, exakte Bestätigung, lokaler Entwurf, Wiederholung, Quellkonflikt und Lifecycle geprüft.
- Native r4-Prüfdatei SHA256: `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`.
- Alle 251 Designs, Ressourcen, Rechte und 80 Formate/8 Formen bleiben bei reinen Profilwechseln unverändert. Alle 404 Varianten-IDs, Optionen und Grundpreise bleiben erhalten. V2-Zusatzpreise und deren Historie werden geprüft übernommen.
- Fehler nach dem letzten Variantenblock rollt die gesamte Bindungsaktivierung zurück; erneute Ausführung und bereits erfolgreicher Replay bleiben idempotent. Frühere native Revisionen bleiben unverändert. Der bestehende Paid-Intake-Test prüft alte freigegebene Bestellstände nach einer neuen Produktrevision.
- Ein kurzer Freigabe-Batchcache gilt ausschließlich in einer synchronen SQLite-Lesetransaktion. Epoche: `total_changes`, `schema_version`, `data_version`. Eigene Änderungen, externe Änderungen beim nächsten Snapshot und Schemaersetzung werden erkannt; es gibt keinen Cache über einen Aufruf oder `await` hinaus.

Gezielt ausgeführt: Plesk/gemeinsamer Dienst plus reale Bank 2/2; Repository/Host/Mount 31 bestanden (ein optionaler Banktest in diesem Lauf übersprungen, separat ausgeführt); Modul-Sync einschließlich realer 251/404-Bank 10/10; Freigabe-/Cachetests 5/5; finale Profil-/Mapping-/Ziel-/Binding-Races und rein lesende Vorschau 7/7; Materialkatalog 3/3. Der abschließende große Wiederholungslauf bestand 1/1 in 114.847 ms (gesamter Fixtureaufbau plus Fehler/Rollback/Wiederholung und Replay, kein einzelner Schreibvorgang über der 60-Sekunden-Frist).

Unabhängiger Review von `module_contract`: keine weitere Blockade. Eigene Gegenproben für Schemaersetzung, Transaktionswechsel mit externer Änderung und Zieländerung im letzten Remote-Lesefenster bestanden; letzter Fall hat genau null Remote-Schreibaufrufe. Geprüfte Quellhashes: `catalog-live-orders.mjs` = `f645b0cdd8279f0a747e28023b3e43e2133367b5a68d18e36239ac26ca7affaf`; `gallery-shop-sync.mjs` = `54b7f517c0ef82069c1473b8f3e5000416d44bc59024a37bf1d11d4e571faaf7`; `gallery-module-sync.mjs` = `f47358538df97cc77aeff6a2664939094b0a2317d2795b1139d6503e2395f305`.

## Kundenstand erhalten

Alle Kunden-Stylesheets müssen im Paketmanifest mit der freigegebenen R15-/PR208-Basis `043846538d9177f933708dafa55392a58fb5036a` bytegleich sein. PR194 brachte zusätzlich eine allgemeine `katalog.prio`-Sortierung in die Kunden-Galerie. Diese wird nicht als unbeauftragte Änderung in den R15-Kundenstand übernommen: `design-gallery-model.mjs` bleibt exakt auf der Basis, SHA256 `dcbdb3623e3908abf71a47d24d48c15053ac319be202a3d53a5c686fb108fbf0`; zugehöriger Test SHA256 `9154ffc2242022d385f32e50e5cae3747a1aeedba009c6c01119dca7f69c6470`. Die übrigen notwendigen Galerieeditor-Ergänzungen sind ausdrücklich an `workbench.gallery` gebunden.

## Installation und Rückweg

1. Private Online-Sicherungen der bestehenden Quell-/Zielablagen prüfen: `workshop.sqlite`, `profiles.sqlite`, `design-assets.sqlite`; zusätzlich vorhandene Journale, Host-Startskripte/-konfigurationen, Galerie-Manifest/-Marker und `local-review-import.json`. Keine Datenbankkopie nach GitHub.
2. Das SHA-geprüfte Runtimearchiv in einen neuen privaten Ordner entpacken. `node verify-runtime.mjs` prüft jede enthaltene Datei. Keine Dateien des aktiven Kundenhosts überschreiben.
3. Die getrennt geprüfte Anschlussfactory mit dem echten readonly Zieladapter konfigurieren. `executionEnabled:false`, `writesEnabled:false`; Mutationsmethoden des Zieladapters müssen explizit ablehnen. Kein Scheinerfolg und keine zweite beschreibbare Kundenwerkstatt.
4. Den bestehenden privaten Galeriehost nur auf diesen Runtimepfad umstellen. Bestehende Galerie-, Daten-, Python-, Auth- und Katalogpfade bleiben identisch. Private Verwaltung und rein lesende Modulvorschau im Browser prüfen. Ein Neustart dieses Quellhosts lädt die neuen Module; Browserdaten/Kundencache müssen nicht gelöscht werden.
5. Rückweg: Quellhost-Startpfad auf den gesicherten bisherigen Runtimeordner zurückstellen und nur diesen Host neu starten. Additive neue Profil-/Plan-Tabellen müssen nicht gelöscht werden. Eine Datenbankwiederherstellung ist nur bei nachgewiesener Beschädigung nötig und darf spätere Händlerarbeit nicht überschreiben.

Produktiver Design-Vollabgleich bleibt getrennt gesperrt. Die zwölf offenen Original-/Zielprüfungen werden nicht durch einen Modulwechsel freigegeben.
