# Schiefer: 48 Tafeln, Fotopreise und Entwürfe · Astra 1, zweiter Chat · 04.11.2026

## Ergebnis und Quellen

Fortsetzung ausschließlich nach Claudes zwei Aufträgen in #85: [Anschluss](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6618926268) und [Entscheidungen 4.59/4.60](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6618993147). Die frühere reine Zubehör-Vorbereitung dieses PR ist damit ersetzt.

Quelle ist Katalog-PR #169, Commit `ff1ea99ef92f3cce7069e7c9d41cdaa3e781e546`, Zubehör aus PR #162, Commit `86aa4bcec5c62e0c46cfc61ed30a42418841d1ff`. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt; keine neuen Designgrafiken oder Freigaben erfunden.

- Vier neue Katalogfamilien, exakt 48 Tafeln: Premium 6, geschnitten 9, Natur 24, Kordel 9. Maße, Konturen, Löcher, Rohlinge V2 und Preise aus der bestätigten Quelle. Keine alten Familienpreise übernommen.
- 186 Design-Metadatensätze und drei Linien auf identische Größen umgezogen; Freigaben und Originalgrafiken unverändert. 268 freigegebene Zuordnungen in drei passenden Produkten (104 Natur 22×14, 82 Natur 30×20, 82 Premium 30×20). Andere Tafeln starten als eigene Gestaltung. Hunde erscheinen als Filter in Naturschiefer.
- 48 neue Shopify-DRAFTs, 278 Varianten, 48 READY-Bilder. Alle IDs, Preise, Status und null Veröffentlichungen erneut gelesen. **0 bestehende Produkte überarbeitet, 0 veröffentlicht.**
- Alle 48 Leer-Kontaktbögen mit dem Renderer aus PR #163 erzeugt; Kordel zeigt die verbindliche Kordelbefestigung. Katalog-PDF/PNG-Übersicht neu gebaut.

## Code und fachlicher Vertrag

`scripts/build-slate-families.mjs` baut validierte Familien; `migrate-slate-targets.mjs` migriert nur Ziel-/Größenmetadaten; `audit-slate-migration.mjs` vergleicht Originale und Freigaben mit dem Quellcommit. `prepare-slate-products.mjs` erzeugt die vier lokalen Werkstattfamilien und 48 native Konfigurationen. Vorlagen werden nur für ihre identische Quellgröße übernommen. Wiederholung mit geändertem Inhalt wird über den Import-Fingerprint abgewiesen, nicht still überschrieben.

`photoDesignCents` ist optional je Größe. Ausschlaggebend ist die gewählte Originalvorlage: Fotofeld = Fotogrundpreis inklusive erstem Foto; ohne Fotofeld = Grundpreis und kein Inklusivfoto. Weitere Fotos je 999 Cent. Premium und die drei kleinen geschnittenen Größen bleiben ohne Foto. Dieselbe Preisfunktion gilt für Konfi und Warenkorbprüfung; eine reine Grundpreisbindung lehnt abweichende Fotopreise ab. Andere Materialfamilien behalten ihren Vertrag.

Das bestehende Master-Modul erhält Rohling-WebP, tatsächliche 5-mm-Schraubenköpfe/12-mm-Abstandshalter-Draufsichten, bedingte AH-Farben und drei unabhängige Zubehör-Checkboxen. Kundenfotos werden grau dargestellt. Nur die vier neuen Familien aktivieren den zuvor gesperrten Gedenktafel-Einstieg. Die separate Schiefer-Kontur-PDF enthält blaue echte Haarlinien (PDF-Breite 0); Gravur bleibt grau. Cache-Rezept v6 verhindert Wiederverwendung alter Konturdateien.

`scripts/slate-draft-plan.mjs` reproduziert die tatsächlich verwendeten 48 Shopify-Payloads aus der gemeinsamen Preislogik. Die beiden GraphQL-Dateien wurden gegen Shopify 2026-07 validiert. API-Aufrufe erfolgten gesammelt über den Shopify-Connector. Fotos/Zubehör sind Konfi-Aufpreise; Shop-Entwürfe besitzen die bestätigten Befestigungsvarianten.

## Reproduktion und Nachweise

```text
node scripts/build-slate-families.mjs --katalog <Katalogcheckout>
node scripts/migrate-slate-targets.mjs --katalog <Katalogcheckout>
node scripts/audit-slate-migration.mjs --katalog <Katalogcheckout>
node scripts/prepare-slate-products.mjs --katalog <Katalogcheckout> --out <neues-lokales-Datenverzeichnis>
node scripts/slate-draft-plan.mjs --plan <Datenverzeichnis>/shopify-plan.json --out <Payload-Datei>
node scripts/serve-slate-review.mjs --data <Datenverzeichnis> --port 8978
```

Browserprüfung: `SLATE_PLAN` auf die lokale `shopify-plan.json` setzen, dann `node scripts/check-slate-browser.cjs` mit Playwright. Prüft Zubehör, AH-Sichtbarkeit, Hunde-Filter, Designwechsel, Foto-Upload, Bildfehler und Konsolenfehler. Testfoto ist ein synthetischer Funktionsnachweis, kein freigegebenes Katalogdesign.

Katalogbranch `dev/astra1-schiefer-familien-20261104`, Ordner `auftraege/2026-11-04-schiefer-anschluss/`: Kontaktbögen aller Tafeln, Migrationsaudit, native Vorbereitungsdaten ohne Datenbanken, Shopify-Leseprüfung, Altbestand und Browserbilder. Testprotokolle und genaue Laufzahlen stehen dort unter `pruefungen/`.

## Grenzen und nächster Schritt

Eigene Branches, kein Merge nach main. Katalog-PR baut auf dem noch offenen PR #169 auf und enthält die benötigten Zubehördaten aus PR #162; beim gemeinsamen Merge diese Abhängigkeiten beachten. Ausschließlich Astra 1 in #139 übernimmt den Merge nach Chris' OK.

Die lokalen Konfigurationen wurden nicht auf den Live-Server importiert und nicht als bestellbare Shop-Konfigurationen gebunden. Kein realer Checkout-/Bestell-/Produktionsabnahmenachweis wird behauptet. Die Entwürfe bleiben unveröffentlicht. Für die spätere Aktivierung sind die vorhandene native Konfi-/Variantenbindung und anschließend Warenkorb, Re-Edit und Produktionsausgabe am freigegebenen Serverstand zu prüfen. Live nur nach Chris' ausdrücklichem Satz.

Die fünf im Altbestandsbericht erfassten ACTIVE-Produkte wurden nicht verändert. Vier sind Schiefer-Treffer; ein fünfter hat Schiefer-Titel, aber Edelstahl-URL/abweichende Größe und bleibt ausdrücklich ungeklärt. Eine direkte alte Familien-ID ist nicht bei allen hinterlegt. Alte Familien-Dateien bleiben erhalten, weil Live-Produkte noch nicht umgezogen sind.
