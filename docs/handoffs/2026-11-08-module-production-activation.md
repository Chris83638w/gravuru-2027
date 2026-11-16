# Produktives Modulprofil: gezielter Schreibadapter, noch nicht installiert

## Zweck und Grenze

Ein bestätigtes Profil soll am bestehenden Edelstahl-Türschild Module an- oder abschalten. Es entsteht kein neuer Konfigurator und kein neues Shopify-Produkt. Der Adapter verwendet dieselbe Modulbibliothek, Quellregistrierung, Änderungsvorschau, Bestätigung, Journalführung und native Bindungsfreigabe wie die bereits installierte private Verwaltung.

Basis: `df468325dc7480c5da10510ced62c5ef1cb080d1` aus PR213. Getrennter Branch `dev/mika-module-production-activation-20261108`. Die private v2-Verwaltung, der Kundenhost und Shopify wurden durch diese Arbeit nicht verändert. **`executionEnabled` und `writesEnabled` bleiben standardmäßig `false`.** Eine konkrete Profilzuordnung wurde nicht vorgenommen.

Fachliche Grundlage ist die Nutzerfreigabe vom 08.11.2026: ein universeller Konfigurator, schaltbare Module, bestehende Gestaltung unverändert, konkrete Optionen vor Produktanlage bestätigen. Edelstahl-Türschilder verwenden die bereits bestätigten acht Formen/80 Größen/404 Varianten; kein Foto, optionales SVG-Logo mit dem bestehenden Preisvertrag. Keine neue Preis-, Maß-, Design- oder Produktionsregel. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unverändert verbindlich; dieser Schritt bearbeitet keine Designs.

## Die vier geschlossenen Anschlusslücken

1. `openProductionModuleTarget` öffnet standardmäßig eine echte SQLite-Leseverbindung. Nur ausdrücklich aktivierter Betrieb verwendet die vorhandene native Repository-CAS-Anfügung sowie Bindungs-/Freigabefunktionen. Der schmale Writer akzeptiert ausschließlich eine vollständige Modulprojektion der fest gepinnten Fähigkeitsquelle. Grundplatte, Designs, Ressourcen, Rechte, Optionen und Preise können damit nicht bearbeitet werden. Es gibt keine Produktanlage- oder Bestellschreibmethode.
2. `createGalleryProductionShopifyRelease` lässt ausschließlich die vorhandene `GallerySyncRelease`-Mutation für genau das vorhandene Shopify-Produkt und dessen `gravuru.gallery_release`-Metafeld zu. Compare-Digest/CAS ist verpflichtend. Keine Produkt-, Varianten-, Preis-, Medien- oder allgemeine Metafeldmutation; dieselbe vorhandene App-Authentifizierung bleibt zuständig.
3. `createProductionModuleActivationConfig` setzt beide bestehenden Server-Schalter ausdrücklich und bindet die tatsächlichen, vom Operator benannten Profil-IDs an dieselbe Profilbibliothek/Registry. Browserparameter können weder Profile außerhalb dieser Liste noch Verbindungsdaten oder Schalter hinzufügen. Der vorhandene unveränderliche Plan muss weiterhin bestätigt werden.
4. Die freigegebene Fähigkeitsrevision bleibt r4. Aktueller Produktkopf und aktuelle gebundene Revision werden getrennt und frisch geprüft. Ein eigener, bereits journalisierter r5-Anhang nach verlorener Shopify-Antwort kann dadurch wieder aufgenommen werden. Fremde Änderungen bleiben Konflikte. Eine Rückkehr zum Logo-Profil nutzt dieselbe r4-Quelle und schreibt eine neue Revision, ohne die alten Stände zu überschreiben.

Der bestehende Sync-Dienst prüft Quelle, Profil, Registry, Zielkopf und Bindungen nochmals nach dem letzten Transport-Await. Der authentifizierte Anschluss ruft dieselbe synchrone Prüfung zusätzlich unmittelbar nach dem Token-Await und vor dem Request auf. Scheitert ein bereits journalisierter Schreibversuch an dieser letzten Prüfung, bleibt er konservativ zur erneuten Prüfung markiert; es erfolgt kein ungesicherter zweiter Schreibversuch.

## Gezielte Nachweise

Die tatsächliche normalisierte r4-Datei war Testeingabe, SHA256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`, 11.906.263 Bytes. Private Quelldatei lokal: `outputs/steel-design-bank-repair-20261108/live-runner/candidate-product-document.live-normalized.compact.json`. Sie wurde unverändert gelesen. Der Test erzeugt isolierte native Datenbanken und synthetische Shop-IDs; Shopify wird simuliert. Dies ist **kein Live-Aktivierungsnachweis**.

- Reale 251-Design-/80-Format-/404-Varianten-Bank: bestätigtes Logo-aus, fremde Bestätigung abgewiesen, Profiländerung nach Bestätigung abgewiesen, geänderter Remote-Preis abgewiesen.
- Shopify akzeptiert den Release, die Antwort geht verloren: neue native Revision liegt ungebunden vor, alte 404 Köpfe bleiben aktiv. Neustart verwendet denselben tatsächlichen Dienst und dasselbe Journal.
- Absichtlicher Fehler **nach allen 404 neuen Bindungen und der Freigabe**: vollständiger nativer Rollback; keine neuen Variantenbindungen bleiben bestehen.
- Wiederaufnahme liest den bereits akzeptierten Release, führt keinen zweiten Shopify-Schreibvorgang aus und aktiviert atomar. Erfolgreicher Wiederholungsaufruf bleibt idempotent.
- Zweiter bestätigter Plan aktiviert Logo wieder. 251 Designs, lokale Ressourcen, Elementrechte, 404 Varianten-IDs, Optionen, Grundpreise und alle vorherigen Zusatzpreisverträge bleiben erhalten. Alte native Revisionen und Bindungen unverändert. Eigenmächtige Designänderung wird vom Writer abgewiesen.
- Letztes Transport-Await: echte parallele Source-/Target-Revision führt zu **null Remote-Writes**. Token-Await: derselbe Schutz vor dem tatsächlichen Request.
- Bestehender historischer Bestell-/Prüfstandsfall weiterhin grün; alte Kundenmanifeste und Produktionspakete bytegleich.

Ergebnisse: drei neue eindeutige Tests grün (der Release-Test wurde beim engen Nachlauf erneut ausgeführt), elf vorhandene Anschluss-/Paginationstests grün, ein gezielter historischer Bestelltest grün. Der große isolierte Szenariolauf dauerte 247.705 ms; das ist die Gesamtdauer mehrerer Pläne, Konflikte, Neustart-, Fehler- und Wiederholungsfälle auf Windows, keine Server-Latenz. Unveränderte 60-Sekunden-Prüfbelegfrist und keine abgeschwächten Validierungen.

```powershell
$env:GRAVURU_PYTHON='<vorhandener Python-Pfad>'
$env:GRAVURU_MODULE_NATIVE_CANDIDATE='<absolute, oben gepinnte r4-Datei>'
node --test scripts/lib/gallery-production-activation.test.mjs
node --test app/workshop/gallery-shop-sync-pagination.test.mjs scripts/lib/gallery-production-connection.test.mjs
node --test --test-name-pattern='real repositories \+ binding registry' app/workshop/gallery-shop-sync.test.mjs
git diff --check
```

## Konkreter Anschluss und Rücknahme

Der neue Export ist eine **serverseitige Alternative** zum bisherigen rein lesenden `createProductionModuleLibraryConfig`, kein zweiter HTTP-Endpunkt. Der bestehende private Plesk-Loader bleibt unverändert. Eine gesonderte, geprüfte externe Konfiguration kann `createProductionModuleActivationConfig` mit der vorhandenen `targetFilename`, dem bestehenden gepinnten `expected`, demselben authentifizierten `shopify`-Leser, ausdrücklich gewählten `allowedProfileIds` und demselben privaten `journalFilename` erzeugen. Sie liefert dessen `connect(context)` an den vorhandenen Host; dieser gibt die tatsächliche gemeinsame Registry und Modulbibliothek weiter.

Die bisherigen privaten Modul-/Journaldateien bleiben außerhalb von Quelldaten und Kunden-Laufzeit. Beim Anschluss dürfen keine leeren Profile, erfundenen Originalanker oder neue Journaldateien als Ersatz für unterbrochene Vorgänge verwendet werden. Mounten mit beiden Schaltern `false` bleibt der erste Schritt. Auf `true` stellen erst nach unabhängiger Prüfung, frischem Backup, kompatiblem Kunden-/Server-Modulrollout und bestätigtem konkretem Plan.

Vor einer späteren Aktivierung sichern: vorhandene Ziel-SQLite mit konsistentem Online-Backup, private Profil- und Journaldatei sowie bisherige externe Anschlusskonfiguration. Die fünf produktiven Quelldateien sind im separaten Dateimanifest exakt vor/nach gepinnt. Kein Kundencode/CSS/Theme gehört zu diesem Delta. Den neuen privaten Laufzeitstand gesondert aufbauen, nicht in die aktive Laufzeit mischen.

Rücknahme des Anschlusses vor einer Ausführung: bisherige externe reine Lesekonfiguration wieder auswählen, nur privaten Verwaltungsprozess neu starten. Bereits ausgeführte oder unklare Vorgänge nicht durch Zurückkopieren einer Datenbank verdecken: vorhandenes Journal/Reconcile verwenden. Moduländerungen fachlich durch einen neuen bestätigten Profilplan rückgängig machen; historische Bestellungen bleiben unveränderlich.

## Offen vor echten Writes

1. Unabhängiger Schlussreview des schmalen Schreibadapters.
2. Die bereits gesondert vorbereiteten Kunden-/Server-Modulgates auf der tatsächlich aktiven R15-Basis abschließen. Der neue private Adapter allein schaltet noch keine Kundenmodule korrekt durch alle Wege.
3. Gesonderte private Konfiguration mit den **tatsächlich gespeicherten** erlaubten Profil-IDs auswählen und zunächst bei ausgeschalteten Gates mounten. Kein Produktionsprofil eigenmächtig wählen.
4. Echten lesenden Plan mit aktuellen Shopify-Verträgen und unveränderter 251/404-Zuordnung anzeigen. Nutzer bestätigt den konkreten Profilplan. Danach kontrollierte Operator-Aktivierung und Kunden-/Warenkorbprüfung mit beiden Modulzuständen.

Root besitzt Browser, Server, Shopify und die endgültige Veröffentlichung. Dieser Branch enthält ausschließlich lokale Vorbereitung und Nachweise.
