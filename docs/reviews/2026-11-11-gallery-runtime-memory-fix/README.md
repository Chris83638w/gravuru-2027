# Produktgebundene Galerie ohne globalen Kartenaufbau

Reviewkandidat gegen Runtime a038e1ae7e3de3954ea204f6925c60c7b4213d4f; Ausgangs-HEAD des Arbeitsbaums 477ff23587ac0b7e0b26a5a71c4caa71e53eb93b (danach nur Root-Dokumentationsfortschritte möglich). Exakte Datei- und Ausgangshashes im Manifest. Kein Commit, Serverlauf oder Datenbankeingriff durch diesen Patch.

## Änderung

`shop-design-gallery.mjs` überspringt ausschließlich Produkte mit `familyFormats.fixedSize` oder `isAllSizesFamily` im globalen Build. Pro Produktrevision wird weiterhin einmal das leichte Modell geladen, aber für deren weitere Bindungen kein ausgewähltes Profil, keine Geometrie und keine Designkarten erzeugt. Native Registryvalidierung aller Bindungen bleibt bestehen. Das vorhandene Produkt-/Revisionsscope schließt den Transfer dieser Karten in andere Produkte bereits aus.

Der öffentliche Pfad mit `sourceModel` bleibt unverändert. Normale globale Cachehits benötigen weiterhin keine Modellreads. Für interne Aufrufe ohne `sourceModel` gibt es bei fehlender Snapshotquelle einen gezielten Modelllookup; ausschließlich die beiden ausgelassenen Produkttypen gehen nach aktueller Bindungs-/Scope- und Modulprüfung in ihren direkten Pfad. Pausen, Preise, Designfreigaben, Suchfilter, Paging und signierte Ziele benutzen vorhandene Funktionen.

**Bewusste interne Vertragskorrektur, von Root bestätigt:** `list(context)` ohne Quellmodell lieferte bei All-Sizes bisher unter Umständen mehrere Größen derselben Produktrevision. Der Fallback liefert jetzt die aktuell gewählte Ausführung, genauso wie die echte öffentliche Route; `options` erlaubt weiterhin den bestehenden geprüften Größenwechsel. Der einzige Nicht-Test-Aufrufer ohne Quellmodell war der Benchmark. Dieser übergibt jetzt sein ohnehin geladenes `sourceModel` und misst damit den öffentlichen Pfad. Kundenseitiger Umfang bleibt unverändert.

Kein Cacheformatwechsel: ältere gültige v3-Snapshots bleiben lesbar und enthalten weiter gültige Karten. Der Speichergewinn dieses Patches betrifft den Neuaufbau. Der beabsichtigte v2→v3-Wechsel der vorherigen Suchimplementierung wird nicht zurückgenommen.

## Gezielte Prüfungen

1. `node --test app/workshop/shop-design-gallery.test.mjs app/workshop/shop-design-gallery-alle.test.mjs app/workshop/shop-design-gallery-variant.test.mjs`: 42/43 bestanden. Einziger Fehler war `mkdtemp C:\Windows\temp` nach einem falsch gesetzten lokalen TEMP-Pfad, kein Appfehler.
2. Mit TEMP/TMP auf existierenden Workspace-Ordner: `node --test --test-name-pattern='persisted SQLite snapshot survives reopening' app/workshop/shop-design-gallery.test.mjs`: 1/1 bestanden. Damit alle 43 relevanten Fälle geprüft; kein zweiter Vollsuitenlauf.
3. `node --test --test-name-pattern='benchmark' app/workshop/shop-product-binding-store.test.mjs`: 2/2 bestanden. Quelle readOnly, Hashgleichheit, getrennte Cachedatei, Reopen und Ablehnung derselben Quelldatei.

Neue Regressionen: fixed/allSizes beim Warmup exakt 0 globale Karten, Modell je Revision nur einmal, 85 Designs in 40/40/5 Seiten, Suche vor Paging, ausgeschlossene versteckte/zurückgezogene/unpassende Designs, aktuelle Bindung, reale Centpreise und Geometrie, Größen-/Farbwechsel, Restart, Pause, geänderte Bindung und ausgeschaltetes Designmodul. Bestehende Tests für Linien-/Funkklingel-/Materialscope, unerlaubte Größen/Ziele, Cachehits ohne Modellread und Revisionsänderungen bleiben grün.

Die Tests nutzen synthetische native Modelle bzw. die bestehenden Katalog-Testfixtures. Kein echter 808-Bindungen-Kopienlauf, keine gemessene LVE-Entlastung und keine Liveabnahme behauptet. Der separate Raw-Revisionsstempel-Fix liegt in Roots Zuständigkeit und ist nicht Bestandteil dieses Patches. Reale Cold-/Reopen-Speichermessung bleibt Operatoraufgabe; siehe `gallery-cache-offline-measurement.md`.
